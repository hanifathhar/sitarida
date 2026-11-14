import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const SKPD_MAP: Record<string, { kd_skpd: string; nm_skpd: string }> = {
  '5.03.5.04.5.02.04': { kd_skpd: '5.03.5.04.0.00.04', nm_skpd: 'Badan Kepegawaian Daerah' },
  '5.01.5.05.5.02.02': { kd_skpd: '5.01.5.05.0.00.02', nm_skpd: 'Badan Perencanaan Pembangunan Daerah' },
  '2.09.5.02.0.00.03': { kd_skpd: '2.09.0.00.0.00.03', nm_skpd: 'Dinas Ketahanan Pangan Daerah' },
  '2.07.3.32.5.02.01': { kd_skpd: '2.07.3.32.0.00.01', nm_skpd: 'Dinas Ketenagakerjaan Daerah' },
  '2.11.3.28.5.02.05': { kd_skpd: '2.11.3.28.0.00.05', nm_skpd: 'Dinas Lingkungan Hidup Daerah' },
  '2.18.5.02.4.01.12': { kd_skpd: '2.18.0.00.0.00.12', nm_skpd: 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu Daerah' },
  '2.14.5.02.4.01.08': { kd_skpd: '2.14.0.00.0.00.08', nm_skpd: 'Dinas Pengendalian Penduduk dan Keluarga Berencana Daerah' },
  '2.15.5.02.0.00.09': { kd_skpd: '2.15.0.00.0.00.09', nm_skpd: 'Dinas Perhubungan Daerah' },
  '3.25.5.02.0.00.01': { kd_skpd: '3.25.0.00.0.00.01', nm_skpd: 'Dinas Perikanan Daerah' },
  '1.05.5.02.0.00.05': { kd_skpd: '1.05.0.00.0.00.05', nm_skpd: 'Satuan Polisi Pamong Praja' },
  '4.01.1.01.5.02.01': { kd_skpd: '4.01.0.00.0.00.01', nm_skpd: 'Sekretariat Daerah Kabupaten' },
  '7.01.2.13.2.19.01': { kd_skpd: '7.01.2.13.0.00.01', nm_skpd: 'Kecamatan Aek Bilah' },
  '7.01.2.13.2.19.02': { kd_skpd: '7.01.2.13.0.00.02', nm_skpd: 'Kecamatan Angkola Barat' },
  '7.01.2.13.2.19.03': { kd_skpd: '7.01.2.13.0.00.03', nm_skpd: 'Kecamatan Angkola Sangkunur' },
  '7.01.2.13.2.19.04': { kd_skpd: '7.01.2.13.0.00.04', nm_skpd: 'Kecamatan Angkola Selatan' },
  '7.01.2.13.2.19.05': { kd_skpd: '7.01.2.13.0.00.05', nm_skpd: 'Kecamatan Angkola Timur' },
  '7.01.2.13.2.19.06': { kd_skpd: '7.01.2.13.0.00.06', nm_skpd: 'Kecamatan Arse' },
  '7.01.2.13.2.19.07': { kd_skpd: '7.01.2.13.0.00.07', nm_skpd: 'Kecamatan Batang Angkola' },
  '7.01.2.13.2.19.08': { kd_skpd: '7.01.2.13.0.00.08', nm_skpd: 'Kecamatan Batang Toru' },
  '7.01.2.13.2.19.09': { kd_skpd: '7.01.2.13.0.00.09', nm_skpd: 'Kecamatan Marancar' },
  '7.01.2.13.2.19.10': { kd_skpd: '7.01.2.13.0.00.10', nm_skpd: 'Kecamatan Muara Batang Toru' },
  '7.01.2.13.2.19.11': { kd_skpd: '7.01.2.13.0.00.11', nm_skpd: 'Kecamatan Saipar Dolok Hole' },
  '7.01.2.13.2.19.12': { kd_skpd: '7.01.2.13.0.00.12', nm_skpd: 'Kecamatan Sayur Matinggi' },
  '7.01.2.13.2.19.13': { kd_skpd: '7.01.2.13.0.00.13', nm_skpd: 'Kecamatan Sipirok' },
  '7.01.2.13.2.19.14': { kd_skpd: '7.01.2.13.0.00.14', nm_skpd: 'Kecamatan Tano Tombangan Angkola' },
  '7.01.2.13.2.19.15': { kd_skpd: '7.01.2.13.0.00.15', nm_skpd: 'Kecamatan Angkola Muaratais' },
};

function mapSkpd(rawKdSkpd?: string | null, rawNmSkpd?: string | null) {
  const clean = String(rawKdSkpd || '').trim();
  if (SKPD_MAP[clean]) {
    return SKPD_MAP[clean];
  }
  return { kd_skpd: clean, nm_skpd: String(rawNmSkpd || '').trim() };
}

function mapUnit(rawKdUnit: string | undefined | null, mappedKdSkpd: string, mappedNmSkpd: string, defaultNm = '') {
  if (!rawKdUnit) return { kd_unit: null, nm_unit: null };
  const str = String(rawKdUnit).trim();
  if (str === '' || str === '\\N') return { kd_unit: null, nm_unit: null };

  if (str.startsWith('7.01.2.13.2.19.')) {
    const mapped = str.replace('7.01.2.13.2.19.', '7.01.2.13.0.00.');
    return { kd_unit: mapped, nm_unit: defaultNm };
  }
  if (str.endsWith('.00')) {
    return { kd_unit: `${mappedKdSkpd}.00`, nm_unit: mappedNmSkpd || defaultNm };
  }
  return { kd_unit: str, nm_unit: defaultNm };
}

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
  console.log('=== MEMULAI IMPORT DATA ANGGARAN & PLAFOND 2025 (MENGIKUTI MASTER 2026) ===\n');

  const fileName = 'anggaran2025.xlsx';
  if (!fs.existsSync(fileName)) {
    throw new Error(`File ${fileName} tidak ditemukan!`);
  }

  console.log(`Membaca file ${fileName}...`);
  const wb = xlsx.readFile(fileName);

  const trskpdSheet = wb.Sheets['trskpd'];
  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdpoSheet = wb.Sheets['trdpo'];
  const plafontSheet = wb.Sheets['plafont'];

  const trskpdRows = xlsx.utils.sheet_to_json(trskpdSheet) as any[];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];
  const plafontRows = xlsx.utils.sheet_to_json(plafontSheet) as any[];

  console.log('Baris Excel 2025 ditemukan:');
  console.log(`- Sheet trskpd : ${trskpdRows.length} baris`);
  console.log(`- Sheet trdrka : ${trdrkaRows.length} baris`);
  console.log(`- Sheet trdpo  : ${trdpoRows.length} baris`);
  console.log(`- Sheet plafont: ${plafontRows.length} baris\n`);

  // 1. Ambil data master OPD dan Unit Kerja
  console.log('Mengambil data referensi Master OPD & Unit Kerja 2026...');
  const opds = await prisma.opd.findMany();
  const opdMap = new Map<string, string>(); // kd_skpd -> opd.id
  for (const o of opds) {
    opdMap.set(o.kd_skpd, o.id);
  }

  const units = await prisma.unitKerja.findMany();
  const unitMap = new Map<string, { id: string; nm_unit: string }>(); // kd_unit -> { id, nm_unit }
  for (const u of units) {
    unitMap.set(u.kd_unit, { id: u.id, nm_unit: u.nm_unit });
  }

  // 2. Hitung agregasi nilai per sub kegiatan dari trdrka
  console.log('--- 1. Menghitung Total Anggaran per Sub Kegiatan dari trdrka ---');
  const subkegTotalMap = new Map<string, { nilai: number; nilai_ubah: number }>();
  for (const r of trdrkaRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2025);
    const skpd = mapSkpd(r.kd_skpd, r.nm_skpd);
    const kd_sub = cleanString(r.kd_sub_kegiatan) || '';
    const key = `${tahun}_${skpd.kd_skpd}_${kd_sub}`;

    const prev = subkegTotalMap.get(key) || { nilai: 0, nilai_ubah: 0 };
    prev.nilai += cleanNumber(r.nilai, 0);
    prev.nilai_ubah += cleanNumber(r.nilai_ubah, 0);
    subkegTotalMap.set(key, prev);
  }

  // 3. Prepare & insert trskpd
  console.log('--- 2. Mempersiapkan Data trskpd (Tahun 2025) ---');
  const trskpdIdMap = new Map<string, string>(); // key -> trskpd.id
  const trskpdInsertData: any[] = [];

  for (const r of trskpdRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2025);
    const skpd = mapSkpd(r.kd_skpd, r.nm_skpd);
    const unit = mapUnit(r.kd_unit, skpd.kd_skpd, skpd.nm_skpd, r.nm_unit);

    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    const kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';

    const opdId = opdMap.get(skpd.kd_skpd);
    if (!opdId) {
      console.warn(`Peringatan: OPD untuk kd_skpd ${skpd.kd_skpd} tidak ditemukan!`);
      continue;
    }

    const unitInfo = unit.kd_unit ? unitMap.get(unit.kd_unit) : null;
    const unitKerjaId = unitInfo ? unitInfo.id : null;
    const finalNmUnit = unitInfo ? unitInfo.nm_unit : unit.nm_unit;

    const key = `${tahun}_${skpd.kd_skpd}_${kd_sub_kegiatan}`;
    const id = randomUUID();
    trskpdIdMap.set(key, id);

    const totals = subkegTotalMap.get(key) || { nilai: 0, nilai_ubah: 0 };

    trskpdInsertData.push({
      id,
      tahunAnggaran: tahun,
      opdId,
      unitKerjaId,
      kd_skpd: skpd.kd_skpd,
      nm_skpd: skpd.nm_skpd,
      kd_unit: unit.kd_unit,
      nm_unit: finalNmUnit,
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

  // 4. Prepare & insert trdrka (Merge Duplikasi Rekening)
  console.log('--- 3. Mempersiapkan Data trdrka (Merge Duplikasi Rekening) ---');
  const trdrkaMergedMap = new Map<string, any>(); // rkaKey -> record
  const trdrkaIdMap = new Map<string, string>(); // rkaKey -> trdrka.id

  for (const r of trdrkaRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2025);
    const skpd = mapSkpd(r.kd_skpd, r.nm_skpd);
    const unit = mapUnit(r.kd_unit, skpd.kd_skpd, skpd.nm_skpd, r.nm_unit);

    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    const kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';
    const kd_rek6 = cleanString(r.kd_rek6) || '';
    const nm_rek6 = cleanString(r.nm_rek6) || '';

    const skpdKey = `${tahun}_${skpd.kd_skpd}_${kd_sub_kegiatan}`;
    const trskpdId = trskpdIdMap.get(skpdKey);

    if (!trskpdId) {
      console.warn(`Peringatan: trskpdId tidak ditemukan untuk ${skpdKey}!`);
      continue;
    }

    const rkaKey = `${tahun}_${skpd.kd_skpd}_${kd_sub_kegiatan}_${kd_rek6}`;
    const nilai = cleanNumber(r.nilai, 0);
    const nilai_ubah = cleanNumber(r.nilai_ubah, 0);

    const unitInfo = unit.kd_unit ? unitMap.get(unit.kd_unit) : null;
    const finalNmUnit = unitInfo ? unitInfo.nm_unit : unit.nm_unit;

    if (trdrkaMergedMap.has(rkaKey)) {
      const existing = trdrkaMergedMap.get(rkaKey);
      existing.nilai = existing.nilai.plus(new Prisma.Decimal(nilai));
      existing.nilai_ubah = existing.nilai_ubah.plus(new Prisma.Decimal(nilai_ubah));
    } else {
      const id = randomUUID();
      trdrkaIdMap.set(rkaKey, id);
      trdrkaMergedMap.set(rkaKey, {
        id,
        tahunAnggaran: tahun,
        trskpdId,
        kd_skpd: skpd.kd_skpd,
        nm_skpd: skpd.nm_skpd,
        kd_unit: unit.kd_unit,
        nm_unit: finalNmUnit,
        kd_program,
        nm_program,
        kd_kegiatan,
        nm_kegiatan,
        kd_sub_kegiatan,
        nm_sub_kegiatan,
        kd_rek6,
        nm_rek6,
        nilai: new Prisma.Decimal(nilai),
        nilai_ubah: new Prisma.Decimal(nilai_ubah)
      });
    }
  }

  const trdrkaInsertData = Array.from(trdrkaMergedMap.values());
  await chunkInsert(
    trdrkaInsertData,
    1000,
    chunk => prisma.trdrka.createMany({ data: chunk, skipDuplicates: true }),
    'trdrka'
  );

  // 5. Prepare & insert trdpo
  console.log('--- 4. Mempersiapkan Data trdpo ---');
  const trdpoInsertData: any[] = [];
  let trdpoSkipped = 0;

  for (const r of trdpoRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2025);
    let rawKdSkpd = cleanString(r.kd_skpd);
    const rawKdUnit = cleanString(r.kd_unit);
    if (!rawKdSkpd && rawKdUnit) {
      rawKdSkpd = rawKdUnit.replace(/\.00$/, '');
    }

    const skpd = mapSkpd(rawKdSkpd, r.nm_skpd);
    const unit = mapUnit(rawKdUnit, skpd.kd_skpd, skpd.nm_skpd, r.nm_unit);

    const kd_program = cleanString(r.kd_program) || '';
    const nm_program = cleanString(r.nm_program) || '';
    const kd_kegiatan = cleanString(r.kd_kegiatan) || '';
    const nm_kegiatan = cleanString(r.nm_kegiatan) || '';
    let kd_sub_kegiatan = cleanString(r.kd_sub_kegiatan) || '';
    const nm_sub_kegiatan = cleanString(r.nm_sub_kegiatan) || '';
    const kd_rek6 = cleanString(r.kd_rek6) || '';
    const nm_rek6 = cleanString(r.nm_rek6) || '';

    let rkaKey = `${tahun}_${skpd.kd_skpd}_${kd_sub_kegiatan}_${kd_rek6}`;
    let trdrkaId = trdrkaIdMap.get(rkaKey);

    if (!trdrkaId && kd_sub_kegiatan.endsWith('.000')) {
      const fixedSub = kd_sub_kegiatan.replace(/\.000$/, '.08');
      const testKey = `${tahun}_${skpd.kd_skpd}_${fixedSub}_${kd_rek6}`;
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

    const unitInfo = unit.kd_unit ? unitMap.get(unit.kd_unit) : null;
    const finalNmUnit = unitInfo ? unitInfo.nm_unit : unit.nm_unit;

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
      kd_skpd: skpd.kd_skpd,
      nm_skpd: skpd.nm_skpd,
      kd_unit: unit.kd_unit,
      nm_unit: finalNmUnit,
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

  // 6. Prepare & insert tr_plafond_anggaran (Merge Duplikasi Unit)
  console.log('--- 5. Mempersiapkan Data tr_plafond_anggaran (Merge Duplikasi Unit) ---');
  const plafondMergedMap = new Map<string, any>(); // key -> record

  for (const r of plafontRows) {
    const tahun = cleanNumber(r.tahunanggaran, 2025);
    const skpd = mapSkpd(r.kd_skpd, r.nm_skpd);
    const unit = mapUnit(r.kd_unit, skpd.kd_skpd, skpd.nm_skpd, r.nm_unit);

    const opdId = opdMap.get(skpd.kd_skpd);
    if (!opdId) {
      console.warn(`Peringatan: OPD untuk kd_skpd ${skpd.kd_skpd} tidak ditemukan!`);
      continue;
    }

    const unitInfo = unit.kd_unit ? unitMap.get(unit.kd_unit) : null;
    const unitKerjaId = unitInfo ? unitInfo.id : null;
    const finalNmUnit = unitInfo ? unitInfo.nm_unit : unit.nm_unit;

    const paguMurni = cleanNumber(r.pagumurni, 0);
    const paguUbah = cleanNumber(r.paguubah, 0);

    const key = `${tahun}_${opdId}_${unitKerjaId || 'null'}`;
    if (plafondMergedMap.has(key)) {
      const existing = plafondMergedMap.get(key);
      existing.paguMurni = existing.paguMurni.plus(new Prisma.Decimal(paguMurni));
      existing.paguUbah = existing.paguUbah.plus(new Prisma.Decimal(paguUbah));
    } else {
      plafondMergedMap.set(key, {
        id: randomUUID(),
        tahunAnggaran: tahun,
        opdId,
        unitKerjaId,
        kd_skpd: skpd.kd_skpd,
        nm_skpd: skpd.nm_skpd,
        kd_unit: unit.kd_unit,
        nm_unit: finalNmUnit,
        paguMurni: new Prisma.Decimal(paguMurni),
        paguUbah: new Prisma.Decimal(paguUbah),
        isLockedMurni: false,
        isLockedUbah: false,
        keterangan: 'Import dari ' + fileName
      });
    }
  }

  const plafondInsertData = Array.from(plafondMergedMap.values());
  await chunkInsert(
    plafondInsertData,
    100,
    chunk => prisma.plafondAnggaran.createMany({ data: chunk, skipDuplicates: true }),
    'tr_plafond_anggaran'
  );

  // 7. Verifikasi akhir
  console.log('=== VERIFIKASI AKHIR DATABASE LOKAL (TAHUN 2025) ===');
  const countTrskpd = await prisma.trskpd.count({ where: { tahunAnggaran: 2025 } });
  const countTrdrka = await prisma.trdrka.count({ where: { tahunAnggaran: 2025 } });
  const countTrdpo = await prisma.trdpo.count({ where: { tahunAnggaran: 2025 } });
  const countPlafond = await prisma.plafondAnggaran.count({ where: { tahunAnggaran: 2025 } });

  const sumTrskpd = await prisma.trskpd.aggregate({
    where: { tahunAnggaran: 2025 },
    _sum: { totalAnggaran: true, totalAnggaran_ubah: true }
  });
  const sumTrdrka = await prisma.trdrka.aggregate({
    where: { tahunAnggaran: 2025 },
    _sum: { nilai: true, nilai_ubah: true }
  });
  const sumTrdpo = await prisma.trdpo.aggregate({
    where: { tahunAnggaran: 2025 },
    _sum: { total: true, total_ubah: true }
  });
  const sumPlafond = await prisma.plafondAnggaran.aggregate({
    where: { tahunAnggaran: 2025 },
    _sum: { paguMurni: true, paguUbah: true }
  });

  console.log('Jumlah Baris Terimpor (2025):');
  console.log(`- trskpd              : ${countTrskpd.toLocaleString('id-ID')} baris`);
  console.log(`- trdrka              : ${countTrdrka.toLocaleString('id-ID')} baris`);
  console.log(`- trdpo               : ${countTrdpo.toLocaleString('id-ID')} baris`);
  console.log(`- tr_plafond_anggaran : ${countPlafond.toLocaleString('id-ID')} baris\n`);

  console.log('Total Anggaran Murni:');
  console.log(`- trskpd  : Rp ${Number(sumTrskpd._sum.totalAnggaran || 0).toLocaleString('id-ID')}`);
  console.log(`- trdrka  : Rp ${Number(sumTrdrka._sum.nilai || 0).toLocaleString('id-ID')}`);
  console.log(`- trdpo   : Rp ${Number(sumTrdpo._sum.total || 0).toLocaleString('id-ID')}`);
  console.log(`- Plafond : Rp ${Number(sumPlafond._sum.paguMurni || 0).toLocaleString('id-ID')}\n`);

  console.log('Total Anggaran Perubahan:');
  console.log(`- trskpd  : Rp ${Number(sumTrskpd._sum.totalAnggaran_ubah || 0).toLocaleString('id-ID')}`);
  console.log(`- trdrka  : Rp ${Number(sumTrdrka._sum.nilai_ubah || 0).toLocaleString('id-ID')}`);
  console.log(`- trdpo   : Rp ${Number(sumTrdpo._sum.total_ubah || 0).toLocaleString('id-ID')}`);
  console.log(`- Plafond : Rp ${Number(sumPlafond._sum.paguUbah || 0).toLocaleString('id-ID')}\n`);

  // Cek apakah ada SKPD atau Unit di 2025 yang tidak sesuai master
  const distinctSkpd25 = await prisma.trskpd.findMany({
    where: { tahunAnggaran: 2025 },
    select: { kd_skpd: true, nm_skpd: true },
    distinct: ['kd_skpd']
  });
  console.log(`Total SKPD unik 2025 setelah mapping: ${distinctSkpd25.length} SKPD.`);

  console.log('=== IMPORT DATA ANGGARAN & PLAFOND 2025 SELESAI DENGAN SUKSES! ===');
}

main()
  .catch((e) => {
    console.error('Error saat import data anggaran 2025:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
