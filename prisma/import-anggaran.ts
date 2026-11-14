import * as xlsx from 'xlsx';
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

async function chunkInsert<T>(
  items: T[],
  chunkSize: number,
  insertFn: (chunk: T[]) => Promise<any>,
  label: string
) {
  const total = items.length;
  console.log(`Menyimpan ${total} data ${label} ke database...`);
  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await insertFn(chunk);
    process.stdout.write(`\rProgress ${label}: ${Math.min(i + chunkSize, total)}/${total} (${Math.round((Math.min(i + chunkSize, total) / total) * 100)}%)`);
  }
  console.log(`\nBerhasil menyimpan ${total} baris ${label}.\n`);
}

async function main() {
  console.log('=== MEMULAI IMPORT DATA ANGGARAN 2026 ===\n');

  console.log('Membaca file anggaran2026.xlsx...');
  const wb = xlsx.readFile('anggaran2026.xlsx');

  const trskpdSheet = wb.Sheets['trskpd'];
  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdpoSheet = wb.Sheets['trdpo'];

  const trskpdRows = xlsx.utils.sheet_to_json(trskpdSheet) as any[];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];

  console.log(`Baris Excel ditemukan:`);
  console.log(`- Sheet trskpd: ${trskpdRows.length} baris`);
  console.log(`- Sheet trdrka: ${trdrkaRows.length} baris`);
  console.log(`- Sheet trdpo : ${trdpoRows.length} baris\n`);

  // ==========================================
  // 1. SINKRONISASI OPD & UNIT KERJA
  // ==========================================
  console.log('--- 1. Sinkronisasi Data OPD & Unit Kerja ---');
  const existingOpds = await prisma.opd.findMany();
  const opdMap = new Map<string, string>(); // kd_skpd -> opd.id
  for (const o of existingOpds) {
    opdMap.set(o.kd_skpd, o.id);
  }

  const existingUnits = await prisma.unitKerja.findMany();
  const unitMap = new Map<string, string>(); // kd_unit -> unitKerja.id
  for (const u of existingUnits) {
    unitMap.set(u.kd_unit, u.id);
  }

  // Cari OPD yang ada di sheet trskpd tapi belum ada di DB
  const missingOpds = new Map<string, { kd_skpd: string; nm_skpd: string }>();
  const missingUnits = new Map<string, { kd_unit: string; nm_unit: string; kd_skpd: string }>();

  for (const r of trskpdRows) {
    const kd_skpd = cleanString(r.kd_skpd);
    const nm_skpd = cleanString(r.nm_skpd);
    const kd_unit = cleanString(r.kd_unit);
    const nm_unit = cleanString(r.nm_unit);

    if (kd_skpd && !opdMap.has(kd_skpd)) {
      if (!missingOpds.has(kd_skpd)) {
        missingOpds.set(kd_skpd, { kd_skpd, nm_skpd: nm_skpd || kd_skpd });
      }
    }

    if (kd_unit && !unitMap.has(kd_unit)) {
      if (!missingUnits.has(kd_unit)) {
        missingUnits.set(kd_unit, {
          kd_unit,
          nm_unit: nm_unit || kd_unit,
          kd_skpd: kd_skpd || ''
        });
      }
    }
  }

  if (missingOpds.size > 0) {
    console.log(`Menambahkan ${missingOpds.size} OPD baru ke ms_opd...`);
    for (const item of Array.from(missingOpds.values())) {
      const created = await prisma.opd.create({
        data: {
          id: randomUUID(),
          kd_skpd: item.kd_skpd,
          nm_skpd: item.nm_skpd,
          isActive: true
        }
      });
      opdMap.set(created.kd_skpd, created.id);
    }
  }

  if (missingUnits.size > 0) {
    console.log(`Menambahkan ${missingUnits.size} Unit Kerja baru ke ms_unit_kerja...`);
    for (const item of Array.from(missingUnits.values())) {
      const opdId = opdMap.get(item.kd_skpd);
      if (opdId) {
        const created = await prisma.unitKerja.create({
          data: {
            id: randomUUID(),
            opdId: opdId,
            kd_unit: item.kd_unit,
            nm_unit: item.nm_unit,
            isActive: true
          }
        });
        unitMap.set(created.kd_unit, created.id);
      }
    }
  }
  console.log(`Sinkronisasi OPD & Unit Kerja selesai.\n`);

  // ==========================================
  // 2. HITUNG AGREGASI NILAI SUB KEGIATAN
  // ==========================================
  console.log('--- 2. Menghitung Total Anggaran per Sub Kegiatan dari trdrka ---');
  // key: ${tahun}_${kd_skpd}_${kd_sub_kegiatan} -> { nilai, nilai_ubah }
  const subkegTotalMap = new Map<string, { nilai: number; nilai_ubah: number }>();
  for (const r of trdrkaRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2026);
    const kd_skpd = cleanString(r.kd_skpd) || '';
    const kd_sub = cleanString(r.kd_sub_kegiatan) || '';
    const key = `${tahun}_${kd_skpd}_${kd_sub}`;

    const prev = subkegTotalMap.get(key) || { nilai: 0, nilai_ubah: 0 };
    prev.nilai += cleanNumber(r.nilai, 0);
    prev.nilai_ubah += cleanNumber(r.nilai_ubah, 0);
    subkegTotalMap.set(key, prev);
  }

  // ==========================================
  // 3. PREPARE & INSERT TRSKPD
  // ==========================================
  console.log('--- 3. Mempersiapkan Data trskpd ---');
  const trskpdIdMap = new Map<string, string>(); // key -> trskpd.id
  const trskpdInsertData: any[] = [];

  for (const r of trskpdRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2026);
    const kd_skpd = cleanString(r.kd_skpd) || '';
    const nm_skpd = cleanString(r.nm_skpd) || '';
    const kd_unit = cleanString(r.kd_unit);
    const nm_unit = cleanString(r.nm_unit);
    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    const kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';

    const opdId = opdMap.get(kd_skpd);
    if (!opdId) {
      console.warn(`Peringatan: OPD untuk kd_skpd ${kd_skpd} tidak ditemukan!`);
      continue;
    }

    const key = `${tahun}_${kd_skpd}_${kd_sub_kegiatan}`;
    const id = randomUUID();
    trskpdIdMap.set(key, id);

    const totals = subkegTotalMap.get(key) || { nilai: 0, nilai_ubah: 0 };

    trskpdInsertData.push({
      id,
      tahunAnggaran: tahun,
      opdId,
      unitKerjaId: (kd_unit && unitMap.get(kd_unit)) || null,
      kd_skpd,
      nm_skpd,
      kd_unit,
      nm_unit,
      kd_program,
      nm_program,
      kd_kegiatan,
      nm_kegiatan,
      kd_sub_kegiatan,
      nm_sub_kegiatan,
      sasaran_kegiatan: cleanString(r.sasaran_giat),
      waktu_kegiatan: cleanString(r.waktu_giat),
      capaian_kegiatan: cleanString(r.tu_capai),
      totalAnggaran: new Prisma.Decimal(totals.nilai),
      totalAnggaran_ubah: new Prisma.Decimal(totals.nilai_ubah)
    });
  }

  await chunkInsert(
    trskpdInsertData,
    500,
    chunk => prisma.trskpd.createMany({ data: chunk, skipDuplicates: true }),
    'trskpd'
  );

  // ==========================================
  // 4. PREPARE & INSERT TRDRKA
  // ==========================================
  console.log('--- 4. Mempersiapkan Data trdrka ---');
  const trdrkaIdMap = new Map<string, string>(); // key -> trdrka.id
  const trdrkaInsertData: any[] = [];

  for (const r of trdrkaRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2026);
    const kd_skpd = cleanString(r.kd_skpd) || '';
    const nm_skpd = cleanString(r.nm_skpd) || '';
    const kd_unit = cleanString(r.kd_unit);
    const nm_unit = cleanString(r.nm_unit);
    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    const kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';
    const kd_rek6 = cleanString(r.kd_rek6) || '';
    const nm_rek6 = cleanString(r.nm_rek6) || '';

    const skpdKey = `${tahun}_${kd_skpd}_${kd_sub_kegiatan}`;
    const trskpdId = trskpdIdMap.get(skpdKey);

    if (!trskpdId) {
      console.warn(`Peringatan: trskpdId tidak ditemukan untuk ${skpdKey}!`);
      continue;
    }

    const id = randomUUID();
    const rkaKey = `${tahun}_${kd_skpd}_${kd_sub_kegiatan}_${kd_rek6}`;
    trdrkaIdMap.set(rkaKey, id);

    trdrkaInsertData.push({
      id,
      tahunAnggaran: tahun,
      trskpdId,
      kd_skpd,
      nm_skpd,
      kd_unit,
      nm_unit,
      kd_program,
      nm_program,
      kd_kegiatan,
      nm_kegiatan,
      kd_sub_kegiatan,
      nm_sub_kegiatan,
      kd_rek6,
      nm_rek6,
      nilai: new Prisma.Decimal(cleanNumber(r.nilai, 0)),
      nilai_ubah: new Prisma.Decimal(cleanNumber(r.nilai_ubah, 0))
    });
  }

  await chunkInsert(
    trdrkaInsertData,
    1000,
    chunk => prisma.trdrka.createMany({ data: chunk, skipDuplicates: true }),
    'trdrka'
  );

  // ==========================================
  // 5. PREPARE & INSERT TRDPO
  // ==========================================
  console.log('--- 5. Mempersiapkan Data trdpo ---');
  const trdpoInsertData: any[] = [];
  let trdpoSkipped = 0;

  for (const r of trdpoRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2026);
    let kd_skpd = cleanString(r.kd_skpd) || '';
    const kd_unit = cleanString(r.kd_unit);
    // Fallback jika kd_skpd kosong di sheet trdpo
    if (!kd_skpd && kd_unit) {
      kd_skpd = kd_unit.replace(/\.00$/, '');
    }

    const nm_skpd = cleanString(r.nm_skpd) || '';
    const nm_unit = cleanString(r.nm_unit);
    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    let kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';
    const kd_rek6 = cleanString(r.kd_rek6) || '';
    const nm_rek6 = cleanString(r.nm_rek6) || '';

    let rkaKey = `${tahun}_${kd_skpd}_${kd_sub_kegiatan}_${kd_rek6}`;
    let trdrkaId = trdrkaIdMap.get(rkaKey);

    // Fallback khusus typo sub kegiatan .000 -> .08 pada OPD 2.08.0.00.0.00.02
    if (!trdrkaId && kd_sub_kegiatan.endsWith('.000')) {
      const fixedSub = kd_sub_kegiatan.replace(/\.000$/, '.08');
      const testKey = `${tahun}_${kd_skpd}_${fixedSub}_${kd_rek6}`;
      if (trdrkaIdMap.has(testKey)) {
        kd_sub_kegiatan = fixedSub;
        trdrkaId = trdrkaIdMap.get(testKey);
      }
    }

    if (!trdrkaId) {
      console.warn(`Peringatan: trdrkaId tidak ditemukan untuk key ${rkaKey}!`);
      trdpoSkipped++;
      continue;
    }

    const uraian = cleanString(r.uraian)?.trim() || '-';
    const satuan = cleanString(r.satuan1) || cleanString(r.satuan_ubah1) || '-';
    const satuan_ubah = cleanString(r.satuan_ubah1);
    const volume = cleanNumber(r.tvolume, 0);
    const volume_ubah = r.tvolume_ubah !== undefined && r.tvolume_ubah !== null && r.tvolume_ubah !== '\\N'
      ? cleanNumber(r.tvolume_ubah, 0)
      : null;
    const harga = cleanNumber(r.harga1, 0);
    const harga_ubah = r.harga_ubah1 !== undefined && r.harga_ubah1 !== null && r.harga_ubah1 !== '\\N'
      ? cleanNumber(r.harga_ubah1, 0)
      : null;
    const total = cleanNumber(r.total, 0);
    const total_ubah = r.total_ubah !== undefined && r.total_ubah !== null && r.total_ubah !== '\\N'
      ? cleanNumber(r.total_ubah, 0)
      : null;

    trdpoInsertData.push({
      id: randomUUID(),
      tahunAnggaran: tahun,
      trdrkaId,
      kd_skpd,
      nm_skpd,
      kd_unit,
      nm_unit,
      kd_program,
      nm_program,
      kd_kegiatan,
      nm_kegiatan,
      kd_sub_kegiatan,
      nm_sub_kegiatan,
      kd_rek6,
      nm_rek6,
      kd_barang: cleanString(r.no_po),
      uraian,
      satuan,
      satuan_ubah,
      volume: new Prisma.Decimal(volume),
      volume_ubah: volume_ubah !== null ? new Prisma.Decimal(volume_ubah) : null,
      harga: new Prisma.Decimal(harga),
      harga_ubah: harga_ubah !== null ? new Prisma.Decimal(harga_ubah) : null,
      total: new Prisma.Decimal(total),
      total_ubah: total_ubah !== null ? new Prisma.Decimal(total_ubah) : null,
      kd_sumdan: cleanString(r.kd_sumdan)
    });
  }

  if (trdpoSkipped > 0) {
    console.warn(`Peringatan: ${trdpoSkipped} baris trdpo dilewati karena tidak cocok dengan trdrka.`);
  }

  await chunkInsert(
    trdpoInsertData,
    2000,
    chunk => prisma.trdpo.createMany({ data: chunk, skipDuplicates: true }),
    'trdpo'
  );

  // ==========================================
  // 6. VERIFIKASI HASIL IMPORT
  // ==========================================
  console.log('=== VERIFIKASI AKHIR DATABASE LOKAL ===');
  const countTrskpd = await prisma.trskpd.count();
  const countTrdrka = await prisma.trdrka.count();
  const countTrdpo = await prisma.trdpo.count();

  const sumTrskpd = await prisma.trskpd.aggregate({
    _sum: { totalAnggaran: true, totalAnggaran_ubah: true }
  });
  const sumTrdrka = await prisma.trdrka.aggregate({
    _sum: { nilai: true, nilai_ubah: true }
  });
  const sumTrdpo = await prisma.trdpo.aggregate({
    _sum: { total: true, total_ubah: true }
  });

  console.log(`Jumlah Baris Terimpor:`);
  console.log(`- trskpd : ${countTrskpd.toLocaleString('id-ID')} baris`);
  console.log(`- trdrka : ${countTrdrka.toLocaleString('id-ID')} baris`);
  console.log(`- trdpo  : ${countTrdpo.toLocaleString('id-ID')} baris\n`);

  console.log(`Total Anggaran Murni:`);
  console.log(`- trskpd : Rp ${Number(sumTrskpd._sum.totalAnggaran || 0).toLocaleString('id-ID')}`);
  console.log(`- trdrka : Rp ${Number(sumTrdrka._sum.nilai || 0).toLocaleString('id-ID')}`);
  console.log(`- trdpo  : Rp ${Number(sumTrdpo._sum.total || 0).toLocaleString('id-ID')}\n`);

  console.log(`Total Anggaran Perubahan:`);
  console.log(`- trskpd : Rp ${Number(sumTrskpd._sum.totalAnggaran_ubah || 0).toLocaleString('id-ID')}`);
  console.log(`- trdrka : Rp ${Number(sumTrdrka._sum.nilai_ubah || 0).toLocaleString('id-ID')}`);
  console.log(`- trdpo  : Rp ${Number(sumTrdpo._sum.total_ubah || 0).toLocaleString('id-ID')}\n`);

  console.log('=== IMPORT DATA ANGGARAN 2026 SELESAI DENGAN SUKSES! ===');
}

main()
  .catch((e) => {
    console.error('Error saat import data anggaran:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

