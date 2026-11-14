import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  const trdpoSheet = wb.Sheets['trdpo'];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];

  const missing = trdpoRows.filter(r => !r.kd_skpd);
  console.log('trdpo without kd_skpd count:', missing.length);
  if (missing.length > 0) {
    console.log('Sample row values:', missing[0]);
    // Cek apakah kd_skpd bisa di-derive dari kd_unit (misal kd_unit = '3.25.5.02.0.00.01.00', maka kd_skpd = '3.25.5.02.0.00.01')
    for (const r of missing) {
      if (r.kd_unit) {
        const derived = r.kd_unit.replace(/\.00$/, '');
        console.log(`Derived kd_skpd from kd_unit ${r.kd_unit} -> ${derived}`);
      }
    }
  }
}

main().catch(console.error);

