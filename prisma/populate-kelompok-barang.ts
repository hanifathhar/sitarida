import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Mengekstrak kelompok barang dari tabel ms_standar_harga...");

  const distinctKelompok = await prisma.standarHarga.groupBy({
    by: ["kd_kelompok", "uraianKelompok"],
    _count: { id: true },
    orderBy: { kd_kelompok: "asc" },
  });

  console.log(`Ditemukan ${distinctKelompok.length} kombinasi kelompok barang.`);

  let createdCount = 0;
  for (const item of distinctKelompok) {
    const kdKelompok = item.kd_kelompok.trim();
    const uraianKelompok = (item.uraianKelompok || item.kd_kelompok).trim();

    await prisma.kelompokBarang.upsert({
      where: { kd_kelompok: kdKelompok },
      update: {
        uraianKelompok,
      },
      create: {
        kd_kelompok: kdKelompok,
        uraianKelompok,
        isActive: true,
      },
    });
    createdCount++;
  }

  const totalInDb = await prisma.kelompokBarang.count();
  console.log(`=== BERHASIL: Total kelompok barang di ms_kelompok_barang = ${totalInDb} ===`);
}

main()
  .catch((e) => {
    console.error("Error populating kelompok barang:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

