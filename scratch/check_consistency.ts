import * as xlsx from 'xlsx';

async function main() {
  const wb = xlsx.readFile('anggaran2026.xlsx');
  
  const trskpdSheet = wb.Sheets['trskpd'];
  const trskpdRows = xlsx.utils.sheet_to_json(trskpdSheet) as any[];

  const trdrkaSheet = wb.Sheets['trdrka'];
  const trdrkaRows = xlsx.utils.sheet_to_json(trdrkaSheet) as any[];

  const trdpoSheet = wb.Sheets['trdpo'];
  const trdpoRows = xlsx.utils.sheet_to_json(trdpoSheet) as any[];

  console.log(`trskpd rows: ${trskpdRows.length}`);
  console.log(`trdrka rows: ${trdrkaRows.length}`);
  console.log(`trdpo rows: ${trdpoRows.length}`);

  // Cek duplikasi trskpd
  const trskpdKeys = new Set<string>();
  let dupTrskpd = 0;
  for (const r of trskpdRows) {
    const key = `${r.tahunanggaran || 2026}_${r.kd_skpd}_${r.kd_sub_kegiatan}`;
    if (trskpdKeys.has(key)) {
      dupTrskpd++;
    } else {
      trskpdKeys.add(key);
    }
  }
  console.log(`Unique trskpd keys: ${trskpdKeys.size}, Duplicates: ${dupTrskpd}`);

  // Cek trdrka -> trskpd
  let missingTrskpdInTrdrka = 0;
  const trdrkaKeys = new Set<string>();
  let dupTrdrka = 0;
  for (const r of trdrkaRows) {
    const skpdKey = `${r.tahunanggaran || 2026}_${r.kd_skpd}_${r.kd_sub_kegiatan}`;
    if (!trskpdKeys.has(skpdKey)) {
      missingTrskpdInTrdrka++;
    }
    const rkaKey = `${skpdKey}_${r.kd_rek6}`;
    if (trdrkaKeys.has(rkaKey)) {
      dupTrdrka++;
    } else {
      trdrkaKeys.add(rkaKey);
    }
  }
  console.log(`trdrka with missing trskpd: ${missingTrskpdInTrdrka}`);
  console.log(`Unique trdrka keys: ${trdrkaKeys.size}, Duplicates: ${dupTrdrka}`);

  // Cek trdpo -> trdrka
  let missingTrdrkaInTrdpo = 0;
  for (const r of trdpoRows) {
    const rkaKey = `${r.tahunanggaran || 2026}_${r.kd_skpd}_${r.kd_sub_kegiatan}_${r.kd_rek6}`;
    if (!trdrkaKeys.has(rkaKey)) {
      missingTrdrkaInTrdpo++;
    }
  }
  console.log(`trdpo with missing trdrka: ${missingTrdrkaInTrdpo}`);
}

main().catch(console.error);

