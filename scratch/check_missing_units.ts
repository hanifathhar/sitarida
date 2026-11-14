import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  const sheet = wb.Sheets['trskpd'];
  const rows = xlsx.utils.sheet_to_json(sheet) as any[];

  const existingUnits = await prisma.unitKerja.findMany({
    select: { kd_unit: true, opdId: true }
  });
  const unitMap = new Set(existingUnits.map(u => u.kd_unit));

  const missingUnits = new Map<string, { kd_unit: string; nm_unit: string; kd_skpd: string }>();

  for (const r of rows) {
    const kd_unit = r.kd_unit ? String(r.kd_unit).trim() : '';
    if (kd_unit && !unitMap.has(kd_unit)) {
      if (!missingUnits.has(kd_unit)) {
        missingUnits.set(kd_unit, {
          kd_unit,
          nm_unit: r.nm_unit ? String(r.nm_unit).trim() : '',
          kd_skpd: r.kd_skpd ? String(r.kd_skpd).trim() : ''
        });
      }
    }
  }

  console.log('Missing UnitKerja count:', missingUnits.size);
  console.log('Sample missing UnitKerja:', Array.from(missingUnits.values()).slice(0, 5));
}

main().catch(console.error).finally(() => prisma.$disconnect());

