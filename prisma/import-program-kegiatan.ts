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
  const xlsxPath = path.resolve(process.cwd(), "program-kegiatan.xlsx");
  console.log(`Membaca file Excel: ${xlsxPath}`);
  const buffer = fs.readFileSync(xlsxPath);
  const entries = readZipEntries(buffer);

  const ssXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = parseSharedStrings(ssXml);

  // Sheet 1: ms_program (A=kd_program, B=nm_program, C=kd_urusan)
  const sh1Xml = entries.get("xl/worksheets/sheet1.xml")?.toString("utf8") ?? "";
  const rawProgRows = parseSheetRows(sh1Xml, sharedStrings);

  // Sheet 2: ms_kegiatan (A=kd_program, B=kd_kegiatan, C=nm_kegiatan)
  const sh2Xml = entries.get("xl/worksheets/sheet2.xml")?.toString("utf8") ?? "";
  const rawKegRows = parseSheetRows(sh2Xml, sharedStrings);

  // Sheet 3: ms_subkegiatan (A=kd_kegiatan, B=kd_sub_kegiatan, C=nm_sub_kegiatan)
  const sh3Xml = entries.get("xl/worksheets/sheet3.xml")?.toString("utf8") ?? "";
  const rawSubRows = parseSheetRows(sh3Xml, sharedStrings);

  // 1. Kumpulkan data Program (unik berdasarkan kd_program)
  const progMap = new Map<
    string,
    { kd_program: string; nm_program: string; kd_urusan: string | null }
  >();
  for (const r of rawProgRows.slice(1)) {
    const kd_program = (r.A ?? "").trim();
    const nm_program = (r.B ?? "").trim();
    const rawUrusan = (r.C ?? "").trim();
    const kd_urusan =
      !rawUrusan || rawUrusan === "\\N"
        ? kd_program.split(".").slice(0, 2).join(".") || null
        : rawUrusan;
    if (!kd_program || !nm_program) continue;
    progMap.set(kd_program, { kd_program, nm_program, kd_urusan });
  }

  // 2. Kumpulkan data Kegiatan (unik berdasarkan kd_kegiatan)
  const kegMap = new Map<
    string,
    { kd_program: string; kd_kegiatan: string; nm_kegiatan: string }
  >();
  for (const r of rawKegRows.slice(1)) {
    const kd_program = (r.A ?? "").trim();
    const kd_kegiatan = (r.B ?? "").trim();
    const nm_kegiatan = (r.C ?? "").trim();
    if (!kd_program || !kd_kegiatan || !nm_kegiatan) continue;

    // Jika kd_program belum ada di progMap, tambahkan otomatis agar relasi induk terjaga
    if (!progMap.has(kd_program)) {
      const kd_urusan = kd_program.split(".").slice(0, 2).join(".");
      progMap.set(kd_program, {
        kd_program,
        nm_program:
          kd_program.endsWith(".01")
            ? "PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA"
            : `PROGRAM (${kd_program})`,
        kd_urusan,
      });
    }

    kegMap.set(kd_kegiatan, { kd_program, kd_kegiatan, nm_kegiatan });
  }

  // 3. Kumpulkan data Subkegiatan (unik berdasarkan kd_sub_kegiatan)
  const subMap = new Map<
    string,
    { kd_kegiatan: string; kd_sub_kegiatan: string; nm_sub_kegiatan: string }
  >();
  for (const r of rawSubRows.slice(1)) {
    const kd_kegiatan = (r.A ?? "").trim();
    const kd_sub_kegiatan = (r.B ?? "").trim();
    const nm_sub_kegiatan = (r.C ?? "").trim();
    if (!kd_kegiatan || !kd_sub_kegiatan || !nm_sub_kegiatan) continue;

    // Jika kd_kegiatan belum ada di kegMap, tambahkan otomatis agar relasi induk terjaga
    if (!kegMap.has(kd_kegiatan)) {
      const kd_program = kd_kegiatan.split(".").slice(0, 3).join(".");
      if (!progMap.has(kd_program)) {
        const kd_urusan = kd_program.split(".").slice(0, 2).join(".");
        progMap.set(kd_program, {
          kd_program,
          nm_program:
            kd_program.endsWith(".01")
              ? "PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA"
              : `PROGRAM (${kd_program})`,
          kd_urusan,
        });
      }
      kegMap.set(kd_kegiatan, {
        kd_program,
        kd_kegiatan,
        nm_kegiatan: `Kegiatan (${kd_kegiatan})`,
      });
    }

    subMap.set(kd_sub_kegiatan, { kd_kegiatan, kd_sub_kegiatan, nm_sub_kegiatan });
  }

  console.log(
    `Ditemukan ${progMap.size} baris unik ms_program, ${kegMap.size} baris unik ms_kegiatan, dan ${subMap.size} baris unik ms_subkegiatan.`
  );

  // Hapus data lama sesuai urutan anak -> induk
  console.log("Menghapus data lama dari ms_subkegiatan, ms_kegiatan, dan ms_program...");
  await prisma.subkegiatan.deleteMany({});
  await prisma.kegiatan.deleteMany({});
  await prisma.program.deleteMany({});

  // Insert ms_program
  console.log("Mengimpor ms_program...");
  await prisma.program.createMany({
    data: Array.from(progMap.values()).map((p) => ({
      kd_program: p.kd_program,
      nm_program: p.nm_program,
      kd_urusan: p.kd_urusan,
      isActive: true,
    })),
  });

  const allPrograms = await prisma.program.findMany({
    select: { id: true, kd_program: true },
  });
  const progIdByKode = new Map(allPrograms.map((p) => [p.kd_program, p.id]));

  // Insert ms_kegiatan
  console.log("Mengimpor ms_kegiatan...");
  const kegData = Array.from(kegMap.values())
    .map((k) => {
      const programId = progIdByKode.get(k.kd_program);
      if (!programId) return null;
      return {
        programId,
        kd_kegiatan: k.kd_kegiatan,
        nm_kegiatan: k.nm_kegiatan,
        isActive: true,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.kegiatan.createMany({ data: kegData });

  const allKegiatans = await prisma.kegiatan.findMany({
    select: { id: true, kd_kegiatan: true },
  });
  const kegIdByKode = new Map(allKegiatans.map((k) => [k.kd_kegiatan, k.id]));

  // Insert ms_subkegiatan
  console.log("Mengimpor ms_subkegiatan...");
  const subData = Array.from(subMap.values())
    .map((s) => {
      const kegiatanId = kegIdByKode.get(s.kd_kegiatan);
      if (!kegiatanId) return null;
      return {
        kegiatanId,
        kd_sub_kegiatan: s.kd_sub_kegiatan,
        nm_sub_kegiatan: s.nm_sub_kegiatan,
        isActive: true,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  await prisma.subkegiatan.createMany({ data: subData });

  const [totalProg, totalKeg, totalSub] = await Promise.all([
    prisma.program.count(),
    prisma.kegiatan.count(),
    prisma.subkegiatan.count(),
  ]);

  console.log("=== HASIL IMPOR DATABASE (program-kegiatan.xlsx) ===");
  console.log(`ms_program     : ${totalProg} baris`);
  console.log(`ms_kegiatan    : ${totalKeg} baris`);
  console.log(`ms_subkegiatan : ${totalSub} baris`);
}

main()
  .catch((err) => {
    console.error("Gagal mengimpor program-kegiatan.xlsx:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
