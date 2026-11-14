import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  const trdpoSheet = wb.Sheets['trdpo'];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];

  let nanCount = 0;
  for (const r of trdpoRows) {
    if (isNaN(Number(r.total))) {
      nanCount++;
      if (nanCount <= 5) {
        console.log('Sample NaN row in trdpo total:', {
          uraian: r.uraian,
          tvolume: r.tvolume,
          harga1: r.harga1,
          total: r.total,
          total_ubah: r.total_ubah
        });
      }
    }
  }
  console.log('Total NaN rows in trdpo total:', nanCount);
}

main().catch(console.error);

