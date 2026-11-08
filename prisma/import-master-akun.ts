import fs from "fs";
import path from "path";
import zlib from "zlib";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Minimal ZIP reader for .xlsx files using Node built-in Buffer & zlib
function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Invalid ZIP/XLSX file");

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
    const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
    const rawData = buffer.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      entries.set(fileName, rawData);
    } else if (compressionMethod === 8) {
      entries.set(fileName, zlib.inflateRawSync(rawData));
    }

    pos += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseSharedStrings(xml: string): string[] {
  const result: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRegex.exec(xml)) !== null) {
    const inner = siMatch[1];
    let text = "";
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(inner)) !== null) {
      text += decodeXmlEntities(tMatch[1]);
    }
    result.push(text);
  }
  return result;
}

function parseSheetRows(xml: string, sharedStrings: string[]): Array<{ A: string; B: string }> {
  const rows: Array<{ A: string; B: string }> = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  const vRegex = /<v>([\s\S]*?)<\/v>/;
  const isRegex = /<is>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    let colA = "";
    let colB = "";

    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2];
      const refMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      if (!refMatch) continue;
      const col = refMatch[1];
      const cellType = typeMatch ? typeMatch[1] : "";

      let val = "";
      if (cellType === "inlineStr") {
        const m = isRegex.exec(cellBody);
        if (m) val = decodeXmlEntities(m[1]);
      } else {
        const m = vRegex.exec(cellBody);
        if (m) {
          const rawV = m[1];
          if (cellType === "s") {
            val = sharedStrings[Number(rawV)] ?? "";
          } else {
            val = decodeXmlEntities(rawV);
          }
        }
      }

      if (col === "A") colA = val.trim();
      if (col === "B") colB = val.trim();
    }

    if (colA || colB) {
      rows.push({ A: colA, B: colB });
    }
  }
  return rows;
}

function mapKategoriRek1(kode: string, uraian: string): string {
  const u = uraian.toUpperCase();
  if (kode === "1" || u.includes("ASET")) return "ASET";
  if (kode === "2" || u.includes("KEWAJIBAN")) return "KEWAJIBAN";
  if (kode === "3" || u.includes("EKUITAS")) return "EKUITAS";
  if (kode === "4") return "PENDAPATAN";
  if (kode === "5") return "BELANJA";
  if (kode === "6" || u.includes("PEMBIAYAAN")) return "PEMBIAYAAN";
  if (kode === "7" || u.includes("PENDAPATAN - LO") || u.includes("PENDAPATAN DAERAH-LO"))
    return "PENDAPATAN - LO";
  if (kode === "8" || u.includes("BEBAN")) return "BEBAN - LO";
  return "BELANJA";
}

function getParentCode(kode: string): string {
  const lastDot = kode.lastIndexOf(".");
  if (lastDot === -1) return "";
  return kode.substring(0, lastDot).trim();
}

export async function importMasterAkunFromExcel() {
  const xlsxPath = path.resolve(process.cwd(), "Master-akun.xlsx");
  console.log(`Membaca file Excel: ${xlsxPath}`);
  const buffer = fs.readFileSync(xlsxPath);
  const entries = readZipEntries(buffer);

  const ssXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = parseSharedStrings(ssXml);

  const sheetsMaps: Array<Map<string, { kode: string; uraian: string }>> = [];
  for (let i = 1; i <= 6; i++) {
    const shXml = entries.get(`xl/worksheets/sheet${i}.xml`)?.toString("utf8") ?? "";
    const rawRows = parseSheetRows(shXml, sharedStrings);
    const dataRows = rawRows
      .slice(1)
      .filter((r) => r.A && r.B)
      .map((r) => ({
        kode: r.A.replace(/\s+/g, ""),
        uraian: r.B.trim(),
      }));

    const uniqueMap = new Map<string, { kode: string; uraian: string }>();
    for (const row of dataRows) {
      if (!uniqueMap.has(row.kode)) {
        uniqueMap.set(row.kode, row);
      }
    }
    sheetsMaps.push(uniqueMap);
    console.log(
      `Sheet MS_REK${i}: ${rawRows.length - 1} baris mentah -> ${uniqueMap.size} kode unik`
    );
  }

  // Pastikan setiap kode di level N memiliki induk di level N-1 (jika ada induk yang terlewat di sheet Excel, lengkapi otomatis dari hierarki di atasnya)
  for (let lv = 5; lv >= 1; lv--) {
    const childMap = sheetsMaps[lv]; // index 5 = MS_REK6
    const parentMap = sheetsMaps[lv - 1]; // index 4 = MS_REK5
    for (const child of childMap.values()) {
      const parentKode = getParentCode(child.kode);
      if (parentKode && !parentMap.has(parentKode)) {
        parentMap.set(parentKode, {
          kode: parentKode,
          uraian: child.uraian,
        });
      }
    }
  }

  const sheetsData = sheetsMaps.map((m) =>
    Array.from(m.values()).sort((a, b) => a.kode.localeCompare(b.kode))
  );

  console.log("Menghapus seluruh data lama pada ms_rek6 s/d ms_rek1...");
  await prisma.msRek6.deleteMany({});
  await prisma.msRek5.deleteMany({});
  await prisma.msRek4.deleteMany({});
  await prisma.msRek3.deleteMany({});
  await prisma.msRek2.deleteMany({});
  await prisma.msRek1.deleteMany({});

  // 1. Insert ms_rek1
  await prisma.msRek1.createMany({
    data: sheetsData[0].map((r) => ({
      kd_rek1: r.kode,
      nm_rek1: r.uraian,
      kategori: mapKategoriRek1(r.kode, r.uraian),
      isActive: true,
    })),
  });
  const rek1All = await prisma.msRek1.findMany({ select: { id: true, kd_rek1: true } });
  const rek1Map = new Map(rek1All.map((r) => [r.kd_rek1, r.id]));

  // 2. Insert ms_rek2
  const rek2Data = sheetsData[1]
    .map((r) => {
      const rek1Id = rek1Map.get(getParentCode(r.kode));
      return rek1Id ? { rek1Id, kd_rek2: r.kode, nm_rek2: r.uraian, isActive: true } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await prisma.msRek2.createMany({ data: rek2Data });
  const rek2All = await prisma.msRek2.findMany({ select: { id: true, kd_rek2: true } });
  const rek2Map = new Map(rek2All.map((r) => [r.kd_rek2, r.id]));

  // 3. Insert ms_rek3
  const rek3Data = sheetsData[2]
    .map((r) => {
      const rek2Id = rek2Map.get(getParentCode(r.kode));
      return rek2Id ? { rek2Id, kd_rek3: r.kode, nm_rek3: r.uraian, isActive: true } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await prisma.msRek3.createMany({ data: rek3Data });
  const rek3All = await prisma.msRek3.findMany({ select: { id: true, kd_rek3: true } });
  const rek3Map = new Map(rek3All.map((r) => [r.kd_rek3, r.id]));

  // 4. Insert ms_rek4
  const rek4Data = sheetsData[3]
    .map((r) => {
      const rek3Id = rek3Map.get(getParentCode(r.kode));
      return rek3Id ? { rek3Id, kd_rek4: r.kode, nm_rek4: r.uraian, isActive: true } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await prisma.msRek4.createMany({ data: rek4Data });
  const rek4All = await prisma.msRek4.findMany({ select: { id: true, kd_rek4: true } });
  const rek4Map = new Map(rek4All.map((r) => [r.kd_rek4, r.id]));

  // 5. Insert ms_rek5
  const rek5Data = sheetsData[4]
    .map((r) => {
      const rek4Id = rek4Map.get(getParentCode(r.kode));
      return rek4Id ? { rek4Id, kd_rek5: r.kode, nm_rek5: r.uraian, isActive: true } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  await prisma.msRek5.createMany({ data: rek5Data });
  const rek5All = await prisma.msRek5.findMany({ select: { id: true, kd_rek5: true } });
  const rek5Map = new Map(rek5All.map((r) => [r.kd_rek5, r.id]));

  // 6. Insert ms_rek6 in batches of 2500
  const rek6Data = sheetsData[5]
    .map((r) => {
      const rek5Id = rek5Map.get(getParentCode(r.kode));
      return rek5Id
        ? {
            rek5Id,
            kd_rek6: r.kode,
            nm_rek6: r.uraian,
            sumberReferensi: "Master-akun.xlsx (Permendagri 90/2019 & Kepmendagri 050)",
            isActive: true,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const batchSize = 2500;
  for (let i = 0; i < rek6Data.length; i += batchSize) {
    const batch = rek6Data.slice(i, i + batchSize);
    await prisma.msRek6.createMany({ data: batch });
  }

  const counts = await Promise.all([
    prisma.msRek1.count(),
    prisma.msRek2.count(),
    prisma.msRek3.count(),
    prisma.msRek4.count(),
    prisma.msRek5.count(),
    prisma.msRek6.count(),
  ]);

  console.log("=== HASIL IMPOR DATABASE ===");
  console.log(`ms_rek1: ${counts[0]} baris`);
  console.log(`ms_rek2: ${counts[1]} baris`);
  console.log(`ms_rek3: ${counts[2]} baris`);
  console.log(`ms_rek4: ${counts[3]} baris`);
  console.log(`ms_rek5: ${counts[4]} baris`);
  console.log(`ms_rek6: ${counts[5]} baris`);
}

if (require.main === module) {
  importMasterAkunFromExcel()
    .catch((err) => {
      console.error("Gagal mengimpor Master-akun.xlsx:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
