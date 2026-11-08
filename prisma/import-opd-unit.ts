import fs from "fs";
import path from "path";
import zlib from "zlib";
import { PrismaClient } from "@prisma/client";

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

function parseSheetRows(xml: string, sharedStrings: string[]): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  const vRegex = /<v>([\s\S]*?)<\/v>/;
  const isRegex = /<is>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    const rowContent = rowMatch[1];
    const rowObj: Record<string, string> = {};

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

      rowObj[col] = val.trim();
    }

    if (Object.keys(rowObj).length > 0) {
      rows.push(rowObj);
    }
  }
  return rows;
}

async function main() {
  const xlsxPath = path.resolve(process.cwd(), "opd-unit.xlsx");
  console.log(`Membaca file Excel: ${xlsxPath}`);
  const buffer = fs.readFileSync(xlsxPath);
  const entries = readZipEntries(buffer);

  const ssXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = parseSharedStrings(ssXml);

  // Sheet 1: ms_opd (A=kd_opd, B=nm_opd, C=kd_urusan)
  const sh1Xml = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8") ?? "";
  const rawOpdRows = parseSheetRows(sh1Xml, sharedStrings);

  // Sheet 2: ms_unit (A=kd_opd, B=kd_unit, C=nm_unit, D=skpdbank, E=bank_penerima, F=rek_penerima, G=nama_penerima)
  const sh2Xml = entries.get("xl/worksheets/sheet2.xml")?.toString("utf8") ?? "";
  const rawUnitRows = parseSheetRows(sh2Xml, sharedStrings);

  // Ambil peta ms_urusan untuk mengisi urusanNama otomatis
  const urusanList = await prisma.msUrusan.findMany();
  const urusanMap = new Map(urusanList.map((u) => [u.kd_urusan2, u.nm_urusan2]));

  // Olah data OPD (skip header row pertama)
  const opdMap = new Map<
    string,
    { kode: string; nama: string; urusanKode: string | null; urusanNama: string | null }
  >();
  for (const r of rawOpdRows.slice(1)) {
    const kode = (r.A ?? "").trim();
    const nama = (r.B ?? "").trim();
    const urusanKode = (r.C ?? "").trim() || null;
    if (!kode || !nama) continue;
    opdMap.set(kode, {
      kode,
      nama,
      urusanKode,
      urusanNama: urusanKode ? urusanMap.get(urusanKode) ?? null : null,
    });
  }

  // Olah data Unit (skip header row pertama)
  const unitMap = new Map<
    string,
    {
      kd_opd: string;
      kode: string;
      nama: string;
      skpdbank: string | null;
      bank_penerima: string | null;
      rek_penerima: string | null;
      nama_penerima: string | null;
    }
  >();
  for (const r of rawUnitRows.slice(1)) {
    const kd_opd = (r.A ?? "").trim();
    const kode = (r.B ?? "").trim();
    const nama = (r.C ?? "").trim();
    if (!kd_opd || !kode || !nama) continue;

    // Pastikan jika ada kd_opd di ms_unit yang belum ada di ms_opd, otomatis ditambahkan
    if (!opdMap.has(kd_opd)) {
      const urusanKode = kd_opd.split(".").slice(0, 2).join(".");
      opdMap.set(kd_opd, {
        kode: kd_opd,
        nama,
        urusanKode,
        urusanNama: urusanMap.get(urusanKode) ?? null,
      });
    }

    unitMap.set(kode, {
      kd_opd,
      kode,
      nama,
      skpdbank: (r.D ?? "").trim() || null,
      bank_penerima: (r.E ?? "").trim() || null,
      rek_penerima: (r.F ?? "").trim() || null,
      nama_penerima: (r.G ?? "").trim() || null,
    });
  }

  console.log(
    `Ditemukan ${opdMap.size} baris unik ms_opd dan ${unitMap.size} baris unik ms_unit.`
  );

  // Lepaskan relasi sebelum menghapus ms_unit dan ms_opd
  console.log("Membersihkan relasi & menghapus data lama pada ms_unit dan ms_opd...");
  await prisma.user.updateMany({ data: { opdId: null, unitKerjaId: null } });

  await prisma.unitKerja.deleteMany({});
  await prisma.opd.deleteMany({});

  // Insert ms_opd
  const opdData = Array.from(opdMap.values());
  await prisma.opd.createMany({
    data: opdData.map((o) => ({
      kd_skpd: o.kode,
      nm_skpd: o.nama,
      kd_urusan: o.urusanKode,
      nm_urusan: o.urusanNama,
      isActive: true,
    })),
  });

  const allOpds = await prisma.opd.findMany({ select: { id: true, kd_skpd: true, nm_skpd: true } });
  const opdIdByKode = new Map(allOpds.map((o) => [o.kd_skpd, o.id]));

  // Insert ms_unit
  const unitData = Array.from(unitMap.values())
    .map((u) => {
      const opdId = opdIdByKode.get(u.kd_opd);
      if (!opdId) return null;
      return {
        opdId,
        kd_unit: u.kode,
        nm_unit: u.nama,
        skpdbank: u.skpdbank,
        bank_penerima: u.bank_penerima,
        rek_penerima: u.rek_penerima,
        nama_penerima: u.nama_penerima,
        isActive: true,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.unitKerja.createMany({ data: unitData });

  // Hubungkan kembali akun demo (Disdik, BPKPAD, Inspektorat) ke OPD & Unit yang baru
  const disdik = allOpds.find((o) => o.nm_skpd.toLowerCase().includes("pendidikan"));
  const bpkpad = allOpds.find((o) => o.nm_skpd.toLowerCase().includes("keuangan"));
  const inspektorat = allOpds.find((o) => o.nm_skpd.toLowerCase().includes("inspektorat"));

  if (bpkpad) {
    await prisma.user.updateMany({
      where: { username: { in: ["admin.bpkpad", "ketua.tapd"] } },
      data: { opdId: bpkpad.id },
    });
  }
  if (disdik) {
    const disdikUnit = await prisma.unitKerja.findFirst({ where: { opdId: disdik.id } });
    await prisma.user.updateMany({
      where: { username: { in: ["admin.disdik", "pptk.disdik"] } },
      data: { opdId: disdik.id, unitKerjaId: disdikUnit?.id ?? null },
    });
  }
  if (inspektorat) {
    await prisma.user.updateMany({
      where: { username: "auditor.inspektorat" },
      data: { opdId: inspektorat.id },
    });
  }

  const [totalOpd, totalUnit] = await Promise.all([
    prisma.opd.count(),
    prisma.unitKerja.count(),
  ]);

  console.log("=== HASIL IMPOR DATABASE (opd-unit.xlsx) ===");
  console.log(`ms_opd  : ${totalOpd} baris`);
  console.log(`ms_unit : ${totalUnit} baris`);
}

main()
  .catch((err) => {
    console.error("Gagal mengimpor opd-unit.xlsx:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

