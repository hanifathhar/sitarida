import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function cleanString(val: any): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  if (str === '' || str === '\\N' || str === 'null' || str === 'NULL') return null;
  return str;
}

function cleanNumber(val: any, defaultVal = 0): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  if (str === '' || str === '\\N' || str === 'null' || str === 'NULL') return defaultVal;
  const num = Number(str);
  return isNaN(num) ? defaultVal : num;
}

async function main() {
  console.log('=== MEMULAI IMPORT DATA PLAFOND ANGGARAN 2026 ===\n');

  // Cek nama file: plafon2026.xlsx atau plafont2026.xlsx
  let fileName = 'plafon2026.xlsx';
  if (!fs.existsSync(fileName)) {
    if (fs.existsSync('plafont2026.xlsx')) {
      fileName = 'plafont2026.xlsx';
    } else {
      throw new Error('File plafon2026.xlsx atau plafont2026.xlsx tidak ditemukan di root directory!');
    }
  }

  console.log(`Membaca file ${fileName}...`);
  const wb = xlsx.readFile(fileName);
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet) as any[];

  console.log(`Ditemukan ${rows.length} baris data pada sheet "${firstSheetName}".\n`);

  // 1. Ambil data OPD dan Unit Kerja
  console.log('Mengambil data referensi OPD & Unit Kerja...');
  const opds = await prisma.opd.findMany();
  const opdMap = new Map<string, string>(); // kd_skpd -> opd.id
  for (const o of opds) {
    opdMap.set(o.kd_skpd, o.id);
  }

  const units = await prisma.unitKerja.findMany();
  const unitMap = new Map<string, string>(); // kd_unit -> unitKerja.id
  for (const u of units) {
    unitMap.set(u.kd_unit, u.id);
  }

  // 2. Siapkan data insert
  const insertData: any[] = [];
  let skipped = 0;

  for (const r of rows) {
    const tahun = cleanNumber(r.tahunanggaran, 2026);
    const kd_skpd = cleanString(r.kd_skpd) || '';
    const nm_skpd = cleanString(r.nm_skpd) || '';
    const kd_unit = cleanString(r.kd_unit);
    const nm_unit = cleanString(r.nm_unit);

    const opdId = opdMap.get(kd_skpd);
    if (!opdId) {
      console.warn(`Peringatan: OPD untuk kd_skpd "${kd_skpd}" tidak ditemukan di database. Melewati baris ini.`);
      skipped++;
      continue;
    }

    const unitKerjaId = (kd_unit && unitMap.get(kd_unit)) || null;

    const paguMurni = cleanNumber(r.pagumurni, 0);
    const paguUbah = cleanNumber(r.paguubah, 0);

    insertData.push({
      id: randomUUID(),
      tahunAnggaran: tahun,
      opdId,
      unitKerjaId,
      kd_skpd,
      nm_skpd,
      kd_unit,
      nm_unit,
      paguMurni: new Prisma.Decimal(paguMurni),
      paguUbah: new Prisma.Decimal(paguUbah),
      isLockedMurni: false,
      isLockedUbah: false,
      keterangan: 'Import dari ' + fileName
    });
  }

  console.log(`Menyiapkan ${insertData.length} baris untuk disimpan ke tabel tr_plafond_anggaran.`);
  if (skipped > 0) {
    console.warn(`Ada ${skipped} baris dilewati.`);
  }

  // 3. Batch insert ke database
  const result = await prisma.plafondAnggaran.createMany({
    data: insertData,
    skipDuplicates: true
  });

  console.log(`Berhasil menyimpan ${result.count} data ke tabel tr_plafond_anggaran.\n`);

  // 4. Verifikasi data
  console.log('=== VERIFIKASI AKHIR DATABASE LOKAL ===');
  const countPlafond = await prisma.plafondAnggaran.count({
    where: { tahunAnggaran: 2026 }
  });

  const sumPlafond = await prisma.plafondAnggaran.aggregate({
    where: { tahunAnggaran: 2026 },
    _sum: { paguMurni: true, paguUbah: true }
  });

  console.log(`Total data tersimpan di tr_plafond_anggaran (2026): ${countPlafond} baris`);
  console.log(`Total Pagu Murni : Rp ${Number(sumPlafond._sum.paguMurni || 0).toLocaleString('id-ID')}`);
  console.log(`Total Pagu Ubah  : Rp ${Number(sumPlafond._sum.paguUbah || 0).toLocaleString('id-ID')}`);
  console.log('\n=== IMPORT DATA SELESAI DENGAN SUKSES! ===');
}

main()
  .catch((e) => {
    console.error('Error saat import data plafond:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

