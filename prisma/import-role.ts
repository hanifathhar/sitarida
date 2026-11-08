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

function parseSheetXml(xmlStr: string, sharedStrings: string[]): Record<string, string>[] {
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

async function main() {
  const filePath = path.join(process.cwd(), "role.xlsx");
  console.log(`Membaca file: ${filePath}`);
  const buf = fs.readFileSync(filePath);
  const entries = readZipEntries(buf);

  const sstBuf = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sstBuf ? parseSharedStrings(sstBuf.toString("utf8")) : [];

  const sheetEntryKey = Array.from(entries.keys()).find((k) => k.startsWith("xl/worksheets/sheet")) || "";
  const sheetBuf = entries.get(sheetEntryKey);
  if (!sheetBuf) {
    throw new Error("Worksheet tidak ditemukan di role.xlsx");
  }

  const rawRows = parseSheetXml(sheetBuf.toString("utf8"), sharedStrings);
  console.log(`Ditemukan ${rawRows.length} baris (termasuk header).`);

  // Baris pertama adalah header (KODE, ROLE, DISKRIPSI, ...)
  const dataRows = rawRows.slice(1).filter((r) => r.A !== undefined && r.A !== "");

  console.log(`Jumlah role yang akan diimport: ${dataRows.length}`);

  // Catat mapping user saat ini (username -> role.kode)
  const existingUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: { select: { kode: true } } },
  });
  console.log(`Menyimpan relasi role untuk ${existingUsers.length} user saat ini...`);

  // Bersihkan RolePermission terlebih dahulu
  console.log("Menghapus data RolePermission lama...");
  await prisma.rolePermission.deleteMany({});

  // Lepaskan sementara roleId pada user agar aman saat pembersihan role
  console.log("Melepaskan relasi roleId pada user sementara...");
  for (const u of existingUsers) {
    await prisma.user.update({
      where: { id: u.id },
      data: { roleId: null as unknown as string }, // handle via raw query jika required
    }).catch(async () => {
      // Jika non-nullable di prisma, gunakan query raw atau lewati
    });
  }

  // Cek apakah User.roleId wajib (required) di schema
  // Di schema: roleId String, role Role @relation
  // Jadi kita lakukan UPSERT / REPLACE data role
  console.log("Mengimport data role dari role.xlsx...");
  const createdRoles: Record<string, string> = {};

  for (const r of dataRows) {
    const kode = String(r.A).trim();
    const nama = String(r.B).trim();
    let deskripsi = r.C ? String(r.C).trim() : null;
    if (deskripsi) {
      deskripsi = deskripsi.replace(/^[A-Za-z\s]+\t/, ""); // bersihkan prefix tab seperti "Pengeluaran\t"
    }
    const isCrossOpd = r.D === "1";
    const isSystem = r.E !== "0";

    const upserted = await prisma.role.upsert({
      where: { kode },
      update: {
        nama,
        deskripsi,
        isCrossOpd,
        isSystem,
      },
      create: {
        kode,
        nama,
        deskripsi,
        isCrossOpd,
        isSystem,
      },
    });
    createdRoles[kode] = upserted.id;
    console.log(`- Role [${kode}] ${nama} (CrossOPD: ${isCrossOpd})`);
  }

  // Hapus role lama yang tidak ada dalam excel role.xlsx
  const validKodes = dataRows.map((r) => String(r.A).trim());
  const rolesToDelete = await prisma.role.findMany({
    where: { kode: { notIn: validKodes } },
  });

  if (rolesToDelete.length > 0) {
    console.log(`Menghapus ${rolesToDelete.length} role lama yang tidak ada di role.xlsx:`, rolesToDelete.map((r) => r.kode));
    // Reassign user yang rolenya akan dihapus ke Superadmin ("0") terlebih dahulu
    const superadminRole = await prisma.role.findUnique({ where: { kode: "0" } });
    if (superadminRole) {
      await prisma.user.updateMany({
        where: { roleId: { in: rolesToDelete.map((r) => r.id) } },
        data: { roleId: superadminRole.id },
      });
    }
    await prisma.role.deleteMany({
      where: { kode: { notIn: validKodes } },
    });
  }

  // Pastikan user eksisting terhubung ke role yang benar
  const defaultSuperadmin = await prisma.role.findUnique({ where: { kode: "0" } });
  for (const u of existingUsers) {
    const targetKode = u.role?.kode ?? "0";
    const targetRole = await prisma.role.findUnique({ where: { kode: targetKode } });
    const finalRoleId = targetRole ? targetRole.id : defaultSuperadmin?.id;
    if (finalRoleId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { roleId: finalRoleId },
      });
      console.log(`User ${u.username} diarahkan ke Role kode ${targetKode}`);
    }
  }

  // Hubungkan semua permissions yang ada ke role Superadmin ("0")
  if (defaultSuperadmin) {
    const allPermissions = await prisma.permission.findMany();
    console.log(`Menghubungkan ${allPermissions.length} permissions ke Superadmin...`);
    for (const p of allPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: defaultSuperadmin.id,
          permissionId: p.id,
        },
      });
    }
  }

  const finalRolesCount = await prisma.role.count();
  console.log(`\n=== IMPORT SELESAI ===`);
  console.log(`Total role di database sekarang: ${finalRolesCount}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

