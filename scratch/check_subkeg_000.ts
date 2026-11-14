import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');

  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];

  const matches = trdrkaRows.filter(r => 
    String(r.kd_skpd).includes('2.08.0.00.0.00.02') && 
    String(r.kd_kegiatan).includes('2.03')
  );
  console.log('Matches in trdrka:', matches.map(m => ({
    kd_sub_kegiatan: m.kd_sub_kegiatan,
    nm_sub_kegiatan: m.nm_sub_kegiatan,
    kd_rek6: m.kd_rek6,
    nm_rek6: m.nm_rek6
  })));
}

main().catch(console.error);

