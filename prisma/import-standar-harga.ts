import fs from "fs";
import path from "path";
import zlib from "zlib";
import { PrismaClient, JenisStandarHarga } from "@prisma/client";

const prisma = new PrismaClient();

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("File ZIP/XLSX tidak valid");

  const cdCount = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(pos + 10);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const fileNameLen = buffer.readUInt16LE(pos + 28);
    const extraLen = buffer.readUInt16LE(pos + 30);
    const commentLen = buffer.readUInt16LE(pos + 32);
    const localHeaderOffset = buffer.readUInt32LE(pos + 42);

    const fileName = buffer.toString("utf8", pos + 46, pos + 46 + fileNameLen);
    const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const fileDataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

    const rawData = buffer.subarray(fileDataOffset, fileDataOffset + compressedSize);
    let decompressed: Buffer;
    if (compressionMethod === 0) {
      decompressed = rawData;
    } else if (compressionMethod === 8) {
      decompressed = zlib.inflateRawSync(rawData);
    } else {
      throw new Error(`Kompresi tidak didukung: ${compressionMethod}`);
    }

    entries.set(fileName, decompressed);
    pos += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

function parseSharedStrings(xmlStr: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRegex.exec(xmlStr)) !== null) {
    const siContent = match[1];
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tMatch;
    let text = "";
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      text += tMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    strings.push(text);
  }
  return strings;
}

function parseSheetXmlAll(xmlStr: string, sharedStrings: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xmlStr)) !== null) {
    const rowContent = rowMatch[1];
    const rowData: Record<string, string> = {};

    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const content = cellMatch[2];

      const rMatch = /r="([A-Z]+)[0-9]+"/.exec(attrs);
      if (!rMatch) continue;
      const colLetter = rMatch[1];

      const isString = /t="s"/.test(attrs);
      const isInlineStr = /t="inlineStr"/.test(attrs);

      if (isString) {
        const vMatch = /<v>([0-9]+)<\/v>/.exec(content);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          rowData[colLetter] = sharedStrings[idx] ?? "";
        }
      } else if (isInlineStr) {
        const tMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(content);
        if (tMatch) {
          rowData[colLetter] = tMatch[1];
        }
      } else {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
        if (vMatch) {
          rowData[colLetter] = vMatch[1];
        }
      }
    }

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  }

  return rows;
}

function cleanPrice(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  const filePath = path.join(process.cwd(), "Draft Lampiran SHS 2027.xlsx");
  console.log(`Membaca file: ${filePath}`);
  const buf = fs.readFileSync(filePath);
  const entries = readZipEntries(buf);

  const sstBuf = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sstBuf ? parseSharedStrings(sstBuf.toString("utf8")) : [];

  const sheetsToProcess: { file: string; jenis: JenisStandarHarga; name: string }[] = [
    { file: "xl/worksheets/sheet1.xml", jenis: "SSH", name: "Standar Satuan Harga (SSH)" },
    { file: "xl/worksheets/sheet2.xml", jenis: "HSPK", name: "Harga Satuan Pokok Kegiatan (HSPK)" },
    { file: "xl/worksheets/sheet3.xml", jenis: "ASB", name: "Analisis Standar Belanja (ASB)" },
    { file: "xl/worksheets/sheet4.xml", jenis: "SBU", name: "Standar Biaya Umum (SBU)" },
  ];

  console.log("Menghapus data lama pada tabel ms_standar_harga...");
  await prisma.standarHarga.deleteMany({});

  let grandTotal = 0;

  for (const item of sheetsToProcess) {
    const sheetBuf = entries.get(item.file);
    if (!sheetBuf) {
      console.warn(`File ${item.file} tidak ditemukan dalam arsip.`);
      continue;
    }

    const rows = parseSheetXmlAll(sheetBuf.toString("utf8"), sharedStrings);
    // Filter data rows: Kolom A harus memiliki awalan angka kode (seperti 1.1... atau 8.1...)
    const validRows = rows.filter((r) => r.A && /^[0-9]/.test(r.A.trim()));

    console.log(`\nMemproses Sheet ${item.name}: Ditemukan ${validRows.length} baris data valid`);

    // Map untuk menghitung nomor urut per kd_kelompok
    const sequencePerKelompok: Record<string, number> = {};

    const batchData = validRows.map((r) => {
      const kdKelompok = String(r.A || "").trim();
      const uraianKelompok = r.B ? String(r.B).trim() : null;
      const uraianBarang = String(r.C || "").trim() || "-";
      const spesifikasi = r.D ? String(r.D).trim() : null;
      const satuan = String(r.E || "-").trim();
      const hargaSatuan = cleanPrice(r.F);

      const nextSeq = (sequencePerKelompok[kdKelompok] || 0) + 1;
      sequencePerKelompok[kdKelompok] = nextSeq;

      // kd_barang = kd_kelompok + '.' + no_urut (contoh: 1.1.12.01.01.0001.0001)
      const formattedSeq = String(nextSeq).padStart(4, "0");
      const kdBarang = `${kdKelompok}.${formattedSeq}`;

      return {
        tahunAnggaran: 2027,
        jenis: item.jenis,
        kd_kelompok: kdKelompok,
        kd_barang: kdBarang,
        no_urut: nextSeq,
        uraianKelompok: uraianKelompok || null,
        uraianBarang,
        spesifikasi: spesifikasi || null,
        satuan,
        hargaSatuan,
        sumberFile: "Draft Lampiran SHS 2027.xlsx",
        isActive: true,
      };
    });

    // Insert per batch (500 per batch)
    const chunkSize = 500;
    for (let i = 0; i < batchData.length; i += chunkSize) {
      const chunk = batchData.slice(i, i + chunkSize);
      await prisma.standarHarga.createMany({
        data: chunk,
      });
    }

    console.log(`Berhasil mengimpor ${batchData.length} baris untuk jenis ${item.jenis}`);
    grandTotal += batchData.length;
  }

  const dbCount = await prisma.standarHarga.count();
  console.log(`\n===========================================`);
  console.log(`TOTAL DATA BERHASIL DIIMPORT: ${grandTotal} baris`);
  console.log(`TOTAL DATA AKTIF DI ms_standar_harga: ${dbCount} baris`);
  console.log(`===========================================`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

