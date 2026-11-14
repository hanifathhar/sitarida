import * as xlsx from 'xlsx';

function cleanNumber(val: any, defaultVal = 0): number {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const str = String(val).trim();
  if (str === '' || str === '\\N' || str === 'null' || str === 'NULL') return defaultVal;
  const num = Number(str);
  return isNaN(num) ? defaultVal : num;
}

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');

  const trdrkaRows = xlsx.utils.sheet_to_json(wb.Sheets['trdrka']) as any[];
  const trdpoRows = xlsx.utils.sheet_to_json(wb.Sheets['trdpo']) as any[];

  let sumRkaNilai = 0;
  let sumRkaUbah = 0;
  for (const r of trdrkaRows) {
    sumRkaNilai += cleanNumber(r.nilai);
    sumRkaUbah += cleanNumber(r.nilai_ubah);
  }

  let sumPoTotal = 0;
  let sumPoUbah = 0;
  for (const r of trdpoRows) {
    sumPoTotal += cleanNumber(r.total);
    sumPoUbah += cleanNumber(r.total_ubah);
  }

  console.log(`SUM trdrka nilai: ${sumRkaNilai.toLocaleString('id-ID')}, ubah: ${sumRkaUbah.toLocaleString('id-ID')}`);
  console.log(`SUM trdpo  total: ${sumPoTotal.toLocaleString('id-ID')}, ubah: ${sumPoUbah.toLocaleString('id-ID')}`);
  console.log(`Difference Murni : ${(sumRkaNilai - sumPoTotal).toLocaleString('id-ID')}`);
  console.log(`Difference Ubah  : ${(sumRkaUbah - sumPoUbah).toLocaleString('id-ID')}`);
}

main().catch(console.error);

