import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');

  const trskpdSheet = wb.Sheets['trskpd'];
  const trskpdRows = xlsx.utils.sheet_to_json(trskpdSheet) as any[];

  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];

  let totalRkaNilai = 0;
  let totalRkaUbah = 0;
  for (const r of trdrkaRows) {
    totalRkaNilai += Number(r.nilai || 0);
    totalRkaUbah += Number(r.nilai_ubah || 0);
  }

  const trdpoSheet = wb.Sheets['trdpo'];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];
  let totalPoNilai = 0;
  let totalPoUbah = 0;
  for (const r of trdpoRows) {
    totalPoNilai += Number(r.total || 0);
    totalPoUbah += Number(r.total_ubah || 0);
  }

  console.log(`Total RKA Nilai: ${totalRkaNilai.toLocaleString('id-ID')}, Ubah: ${totalRkaUbah.toLocaleString('id-ID')}`);
  console.log(`Total PO  Total: ${totalPoNilai.toLocaleString('id-ID')}, Ubah: ${totalPoUbah.toLocaleString('id-ID')}`);
}

main().catch(console.error);

