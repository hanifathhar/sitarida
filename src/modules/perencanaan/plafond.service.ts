import { prisma } from "@/lib/prisma";

export interface ListPlafondParams {
  tahunAnggaran?: number;
  opdId?: string;
  unitKerjaId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listPlafondPaginated(params: ListPlafondParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.tahunAnggaran) where.tahunAnggaran = params.tahunAnggaran;
  if (params.opdId) where.opdId = params.opdId;
  if (params.unitKerjaId) where.unitKerjaId = params.unitKerjaId;
  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { kd_skpd: { contains: q, mode: "insensitive" } },
      { nm_skpd: { contains: q, mode: "insensitive" } },
      { kd_unit: { contains: q, mode: "insensitive" } },
      { nm_unit: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, data, aggregate] = await Promise.all([
    prisma.plafondAnggaran.count({ where }),
    prisma.plafondAnggaran.findMany({
      where,
      orderBy: [{ kd_skpd: "asc" }, { kd_unit: "asc" }],
      skip,
      take: limit,
      include: {
        opd: { select: { kd_skpd: true, nm_skpd: true } },
        unitKerja: { select: { kd_unit: true, nm_unit: true } },
      },
    }),
    prisma.plafondAnggaran.aggregate({
      where,
      _sum: { paguMurni: true, paguUbah: true },
    }),
  ]);

  return {
    data: data.map((d) => ({
      ...d,
      paguMurni: Number(d.paguMurni),
      paguUbah: Number(d.paguUbah),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    totalPaguMurni: Number(aggregate._sum.paguMurni || 0),
    totalPaguUbah: Number(aggregate._sum.paguUbah || 0),
  };
}

export async function upsertPlafond(data: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  paguMurni: number;
  paguUbah?: number;
  isLockedMurni?: boolean;
  isLockedUbah?: boolean;
  keterangan?: string | null;
}) {
  const opd = await prisma.opd.findUnique({ where: { id: data.opdId } });
  if (!opd) throw new Error("OPD tidak ditemukan.");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (data.unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({ where: { id: data.unitKerjaId } });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  }

  const existing = await prisma.plafondAnggaran.findFirst({
    where: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
    },
  });

  if (existing) {
    return await prisma.plafondAnggaran.update({
      where: { id: existing.id },
      data: {
        paguMurni: data.paguMurni,
        paguUbah: data.paguUbah !== undefined ? data.paguUbah : existing.paguUbah,
        isLockedMurni: data.isLockedMurni !== undefined ? data.isLockedMurni : existing.isLockedMurni,
        isLockedUbah: data.isLockedUbah !== undefined ? data.isLockedUbah : existing.isLockedUbah,
        keterangan: data.keterangan !== undefined ? data.keterangan : existing.keterangan,
      },
    });
  } else {
    return await prisma.plafondAnggaran.create({
      data: {
        tahunAnggaran: data.tahunAnggaran,
        opdId: data.opdId,
        unitKerjaId: data.unitKerjaId || null,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        kd_unit: kdUnit,
        nm_unit: nmUnit,
        paguMurni: data.paguMurni,
        paguUbah: data.paguUbah || 0,
        isLockedMurni: data.isLockedMurni ?? false,
        isLockedUbah: data.isLockedUbah ?? false,
        keterangan: data.keterangan || null,
      },
    });
  }
}

export async function togglePlafondLock(id: string, mode: "MURNI" | "PERUBAHAN", isLocked: boolean) {
  const existing = await prisma.plafondAnggaran.findUnique({ where: { id } });
  if (!existing) throw new Error("Plafond anggaran tidak ditemukan.");

  const updateData: any = {};
  if (mode === "MURNI") {
    updateData.isLockedMurni = isLocked;
  } else if (mode === "PERUBAHAN") {
    updateData.isLockedUbah = isLocked;
  }

  return await prisma.plafondAnggaran.update({
    where: { id },
    data: updateData,
  });
}

export async function batchTogglePlafondLock(tahunAnggaran: number, mode: "MURNI" | "PERUBAHAN", isLocked: boolean) {
  const updateData: any = {};
  if (mode === "MURNI") {
    updateData.isLockedMurni = isLocked;
  } else if (mode === "PERUBAHAN") {
    updateData.isLockedUbah = isLocked;
  }

  return await prisma.plafondAnggaran.updateMany({
    where: { tahunAnggaran },
    data: updateData,
  });
}

export async function deletePlafond(id: string) {
  return await prisma.plafondAnggaran.delete({ where: { id } });
}

