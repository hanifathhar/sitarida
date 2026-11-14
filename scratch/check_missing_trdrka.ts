import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');

  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];

  const trdpoSheet = wb.Sheets['trdpo'];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];

  const trdrkaKeys = new Set<string>();
  for (const r of trdrkaRows) {
    const key = `${r.tahunanggaran || 2026}_${String(r.kd_skpd).trim()}_${String(r.kd_sub_kegiatan).trim()}_${String(r.kd_rek6).trim()}`;
    trdrkaKeys.add(key);
  }

  const missingRows: any[] = [];
  for (const r of trdpoRows) {
    const key = `${r.tahunanggaran || 2026}_${String(r.kd_skpd).trim()}_${String(r.kd_sub_kegiatan).trim()}_${String(r.kd_rek6).trim()}`;
    if (!trdrkaKeys.has(key)) {
      missingRows.push(r);
    }
  }

  console.log('Total missing in trdrka:', missingRows.length);
  console.log('Sample missing row:', missingRows.slice(0, 3));
}

main().catch(console.error);

