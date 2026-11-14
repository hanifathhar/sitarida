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
    let kdSkpd = r.kd_skpd ? String(r.kd_skpd).trim() : '';
    if (!kdSkpd && r.kd_unit) {
      kdSkpd = String(r.kd_unit).trim().replace(/\.00$/, '');
    }
    const key = `${r.tahunanggaran || 2026}_${kdSkpd}_${String(r.kd_sub_kegiatan).trim()}_${String(r.kd_rek6).trim()}`;
    if (!trdrkaKeys.has(key)) {
      missingRows.push({ ...r, derived_kd_skpd: kdSkpd, key });
    }
  }

  console.log('Still missing after fallback:', missingRows.length);
  if (missingRows.length > 0) {
    console.log('Missing items:', missingRows);
  }
}

main().catch(console.error);

