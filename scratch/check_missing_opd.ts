import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  const sheet = wb.Sheets['trskpd'];
  const rows = xlsx.utils.sheet_to_json(sheet) as any[];

  const opds = await prisma.opd.findMany({ select: { id: true, kd_skpd: true, nm_skpd: true } });
  const dbSkpdMap = new Map(opds.map(o => [o.kd_skpd, o]));

  const missingMap = new Map();
  for (const r of rows) {
    const code = String(r.kd_skpd || '').trim();
    if (code && !dbSkpdMap.has(code)) {
      if (!missingMap.has(code)) {
        missingMap.set(code, {
          kd_skpd: code,
          nm_skpd: String(r.nm_skpd || '').trim(),
          kd_unit: String(r.kd_unit || '').trim(),
          nm_unit: String(r.nm_unit || '').trim()
        });
      }
    }
  }

  console.log('Missing OPDs count:', missingMap.size);
  console.log('Details:', Array.from(missingMap.values()));
}

main().catch(console.error).finally(() => prisma.$disconnect());

