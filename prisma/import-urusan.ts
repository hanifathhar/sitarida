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

function parseSheetRows(
  xml: string,
  sharedStrings: string[]
): Array<Record<string, string>> {
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
  const xlsxPath = path.resolve(process.cwd(), "urusan.xlsx");
  console.log(`Membaca file Excel: ${xlsxPath}`);
  const buffer = fs.readFileSync(xlsxPath);
  const entries = readZipEntries(buffer);

  const ssXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = parseSharedStrings(ssXml);

  // Cari worksheet pertama
  const sheetKey =
    Array.from(entries.keys()).find((k) => k.startsWith("xl/worksheets/sheet")) ??
    "xl/worksheets/sheet1.xml";
  const shXml = entries.get(sheetKey)?.toString("utf8") ?? "";
  const rawRows = parseSheetRows(shXml, sharedStrings);

  console.log(`Total baris di ${sheetKey}: ${rawRows.length}`);
  console.log("5 baris pertama:", rawRows.slice(0, 5));

  // Skip baris pertama jika merupakan header (misal mengandung kd_urusan / kode)
  const firstRow = rawRows[0] ?? {};
  const isHeader =
    (firstRow.A ?? "").toLowerCase().includes("kd") ||
    (firstRow.A ?? "").toLowerCase().includes("kode") ||
    (firstRow.B ?? "").toLowerCase().includes("nm") ||
    (firstRow.B ?? "").toLowerCase().includes("nama") ||
    (firstRow.B ?? "").toLowerCase().includes("urusan");

  const dataRows = (isHeader ? rawRows.slice(1) : rawRows)
    .filter((r) => r.A || r.B || r.C || r.D)
    .map((r) => ({
      kd_urusan1: (r.A ?? "").trim(),
      nm_urusan1: (r.B ?? "").trim(),
      kd_urusan2: (r.C ?? "").trim(),
      nm_urusan2: (r.D ?? "").trim(),
    }))
    .filter((r) => r.kd_urusan1 && r.kd_urusan2);

  // Deduplikasi berdasarkan kd_urusan2
  const uniqueMap = new Map<string, (typeof dataRows)[0]>();
  for (const row of dataRows) {
    uniqueMap.set(row.kd_urusan2, row);
  }
  const finalRows = Array.from(uniqueMap.values());

  console.log(`Menghapus data lama pada tabel ms_urusan...`);
  await prisma.msUrusan.deleteMany({});

  console.log(`Mengimpor ${finalRows.length} baris ke tabel ms_urusan...`);
  await prisma.msUrusan.createMany({
    data: finalRows,
  });

  const totalInDb = await prisma.msUrusan.count();
  console.log(`=== BERHASIL: Total data pada ms_urusan = ${totalInDb} baris ===`);
}

main()
  .catch((err) => {
    console.error("Gagal mengimpor urusan.xlsx:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

