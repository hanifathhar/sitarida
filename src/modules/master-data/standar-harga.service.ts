import { prisma } from "@/lib/prisma";
import { JenisStandarHarga } from "@prisma/client";

export interface ListStandarHargaParams {
  tahun?: number;
  jenis?: JenisStandarHarga;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listStandarHargaPaginated(params: ListStandarHargaParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(5000, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.tahun) {
    where.tahunAnggaran = params.tahun;
  }
  if (params.jenis) {
    where.jenis = params.jenis;
  }
  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { kd_barang: { contains: q, mode: "insensitive" } },
      { kd_kelompok: { contains: q, mode: "insensitive" } },
      { uraianKelompok: { contains: q, mode: "insensitive" } },
      { uraianBarang: { contains: q, mode: "insensitive" } },
      { spesifikasi: { contains: q, mode: "insensitive" } },
      { satuan: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, data, stats] = await Promise.all([
    prisma.standarHarga.count({ where }),
    prisma.standarHarga.findMany({
      where,
      orderBy: [{ jenis: "asc" }, { kd_kelompok: "asc" }, { uraianBarang: "asc" }],
      skip,
      take: limit,
    }),
    prisma.standarHarga.groupBy({
      by: ["jenis"],
      _count: { id: true },
    }),
  ]);

  return {
    data: data.map((d) => ({
      ...d,
      hargaSatuan: Number(d.hargaSatuan),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    countsByJenis: stats.reduce(
      (acc, s) => {
        acc[s.jenis] = s._count.id;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

export async function getNextKodeBarang(kdKelompok: string): Promise<{ kd_barang: string; no_urut: number }> {
  const trimmed = kdKelompok.trim();
  
  // Ambil semua item yang berada pada kelompok ini atau yang kd_barang dimulai dengan kd_kelompok
  const items = await prisma.standarHarga.findMany({
    where: {
      OR: [
        { kd_kelompok: trimmed },
        { kd_barang: { startsWith: `${trimmed}.` } },
      ],
    },
    select: { kd_barang: true, no_urut: true },
  });

  // Hitung nomor urut tertinggi dari kolom no_urut maupun dari suffix kd_barang
  let maxNo = 0;
  for (const it of items) {
    if (it.no_urut && it.no_urut > maxNo) {
      maxNo = it.no_urut;
    }
    if (it.kd_barang && it.kd_barang.startsWith(`${trimmed}.`)) {
      const suffix = it.kd_barang.slice(trimmed.length + 1);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxNo) {
        maxNo = parsed;
      }
    }
  }

  let nextNoUrut = maxNo + 1;
  let nextKdBarang = `${trimmed}.${String(nextNoUrut).padStart(4, "0")}`;

  // Pastikan kode benar-benar belum dipakai secara global di database
  while (await prisma.standarHarga.findFirst({ where: { kd_barang: nextKdBarang } })) {
    nextNoUrut += 1;
    nextKdBarang = `${trimmed}.${String(nextNoUrut).padStart(4, "0")}`;
  }

  return { kd_barang: nextKdBarang, no_urut: nextNoUrut };
}

export async function createStandarHarga(data: {
  tahunAnggaran?: number;
  jenis: JenisStandarHarga;
  kd_kelompok: string;
  kd_barang?: string | null;
  no_urut?: number | null;
  uraianKelompok?: string | null;
  uraianBarang: string;
  spesifikasi?: string | null;
  satuan: string;
  hargaSatuan: number;
}) {
  const kdKelompok = data.kd_kelompok.trim();
  let kdBarang = data.kd_barang?.trim();
  let noUrut = data.no_urut;

  // Jika kd_barang belum diberikan atau kosong, hitung nomor urut dan kode berikutnya yang unik
  if (!kdBarang) {
    const next = await getNextKodeBarang(kdKelompok);
    noUrut = next.no_urut;
    kdBarang = next.kd_barang;
  } else {
    // Validasi keunikan kd_barang jika diinput manual
    const existing = await prisma.standarHarga.findFirst({
      where: { kd_barang: kdBarang },
    });
    if (existing) {
      throw new Error(
        `Kode Barang [${kdBarang}] sudah terdaftar untuk barang "${existing.uraianBarang}". Kode barang harus unik!`
      );
    }

    // Jika noUrut belum ada, extract dari suffix kdBarang
    if (!noUrut && kdBarang.startsWith(`${kdKelompok}.`)) {
      const suffix = kdBarang.slice(kdKelompok.length + 1);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) noUrut = parsed;
    }
  }

  return await prisma.standarHarga.create({
    data: {
      tahunAnggaran: data.tahunAnggaran || 2027,
      jenis: data.jenis,
      kd_kelompok: kdKelompok,
      kd_barang: kdBarang,
      no_urut: noUrut,
      uraianKelompok: data.uraianKelompok?.trim() || null,
      uraianBarang: data.uraianBarang.trim(),
      spesifikasi: data.spesifikasi?.trim() || null,
      satuan: data.satuan.trim(),
      hargaSatuan: data.hargaSatuan,
      sumberFile: "Input Manual",
      isActive: true,
    },
  });
}

export async function updateStandarHarga(
  id: string,
  data: {
    jenis?: JenisStandarHarga;
    kd_kelompok?: string;
    kd_barang?: string | null;
    no_urut?: number | null;
    uraianKelompok?: string | null;
    uraianBarang?: string;
    spesifikasi?: string | null;
    satuan?: string;
    hargaSatuan?: number;
    isActive?: boolean;
  }
) {
  // Validasi keunikan kd_barang jika diubah
  if (data.kd_barang && data.kd_barang.trim()) {
    const trimmed = data.kd_barang.trim();
    const existing = await prisma.standarHarga.findFirst({
      where: {
        kd_barang: trimmed,
        id: { not: id },
      },
    });
    if (existing) {
      throw new Error(
        `Kode Barang [${trimmed}] sudah digunakan oleh barang "${existing.uraianBarang}". Kode barang harus unik!`
      );
    }
  }

  return await prisma.standarHarga.update({
    where: { id },
    data: {
      ...(data.jenis && { jenis: data.jenis }),
      ...(data.kd_kelompok && { kd_kelompok: data.kd_kelompok.trim() }),
      ...(data.kd_barang !== undefined && { kd_barang: data.kd_barang?.trim() || null }),
      ...(data.no_urut !== undefined && { no_urut: data.no_urut }),
      ...(data.uraianKelompok !== undefined && { uraianKelompok: data.uraianKelompok?.trim() || null }),
      ...(data.uraianBarang && { uraianBarang: data.uraianBarang.trim() }),
      ...(data.spesifikasi !== undefined && { spesifikasi: data.spesifikasi?.trim() || null }),
      ...(data.satuan && { satuan: data.satuan.trim() }),
      ...(data.hargaSatuan !== undefined && { hargaSatuan: data.hargaSatuan }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function deleteStandarHarga(id: string) {
  return await prisma.standarHarga.delete({
    where: { id },
  });
}

