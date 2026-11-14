import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  
  console.log('Sheets:', wb.SheetNames);
  
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    console.log(`\nSheet: ${name}`);
    console.log('Total rows:', data.length);
    console.log('Header:', data[0]);
    console.log('Sample row 1:', data[1]);
  }

  const opds = await prisma.opd.findMany({ select: { id: true, kd_skpd: true, nm_skpd: true } });
  console.log('\nTotal OPD in DB:', opds.length);

  const units = await prisma.unitKerja.findMany({ select: { id: true, kd_unit: true, opdId: true } });
  console.log('Total UnitKerja in DB:', units.length);

  // Check unique kd_skpd in sheet trskpd
  const trskpdSheet = wb.Sheets['trskpd'];
  const trskpdRows = xlsx.utils.sheet_to_json(trskpdSheet) as any[];
  const excelSkpdCodes = new Set(trskpdRows.map((r: any) => String(r.kd_skpd || '').trim()));
  console.log('Unique kd_skpd in Excel trskpd:', excelSkpdCodes.size);

  const dbSkpdMap = new Map(opds.map(o => [o.kd_skpd, o]));
  const missingInDb: string[] = [];
  for (const code of excelSkpdCodes) {
    if (!dbSkpdMap.has(code)) {
      missingInDb.push(code);
    }
  }
  console.log('Missing kd_skpd in DB ms_opd:', missingInDb);
}

main().catch(console.error).finally(() => prisma.$disconnect());

