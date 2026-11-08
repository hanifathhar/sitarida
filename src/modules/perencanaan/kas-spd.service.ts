import { prisma } from "@/lib/prisma";

export async function listAnggaranKas(tahunAnggaran: number = 2027) {
  const opdList = await prisma.opd.findMany({
    where: { isActive: true },
    orderBy: { kd_skpd: "asc" },
  });

  const kasList = await prisma.anggaranKas.findMany({
    where: { tahunAnggaran },
  });
  const kasMap = new Map(kasList.map((k) => [k.opdId, k]));

  return opdList.map((opd) => {
    const kas = kasMap.get(opd.id);
    return {
      id: kas?.id || null,
      opdId: opd.id,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      triwulan1: Number(kas?.triwulan1 || 0),
      triwulan2: Number(kas?.triwulan2 || 0),
      triwulan3: Number(kas?.triwulan3 || 0),
      triwulan4: Number(kas?.triwulan4 || 0),
      totalKas: Number(kas?.totalKas || 0),
      status: kas?.status || "DRAFT",
    };
  });
}

export async function upsertAnggaranKas(data: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  triwulan1: number;
  triwulan2: number;
  triwulan3: number;
  triwulan4: number;
}) {
  const opd = await prisma.opd.findUnique({ where: { id: data.opdId } });
  if (!opd) throw new Error("OPD tidak valid");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (data.unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({ where: { id: data.unitKerjaId } });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  }

  const totalKas = data.triwulan1 + data.triwulan2 + data.triwulan3 + data.triwulan4;

  const existing = await prisma.anggaranKas.findFirst({
    where: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
    },
  });

  if (existing) {
    return await prisma.anggaranKas.update({
      where: { id: existing.id },
      data: {
        triwulan1: data.triwulan1,
        triwulan2: data.triwulan2,
        triwulan3: data.triwulan3,
        triwulan4: data.triwulan4,
        totalKas,
      },
    });
  }

  return await prisma.anggaranKas.create({
    data: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      kd_unit: kdUnit || null,
      nm_unit: nmUnit || null,
      triwulan1: data.triwulan1,
      triwulan2: data.triwulan2,
      triwulan3: data.triwulan3,
      triwulan4: data.triwulan4,
      totalKas,
      status: "DRAFT",
    },
  });
}

export async function listSpd(tahunAnggaran: number = 2027) {
  const items = await prisma.spd.findMany({
    where: { tahunAnggaran },
    orderBy: { tanggalSpd: "desc" },
    include: { opd: { select: { kd_skpd: true, nm_skpd: true } } },
  });
  return items.map((i) => ({
    ...i,
    jumlahSpd: Number(i.jumlahSpd),
  }));
}

export async function createSpd(data: {
  tahunAnggaran: number;
  nomorSpd: string;
  tanggalSpd?: Date;
  opdId: string;
  unitKerjaId?: string | null;
  periode: string;
  jumlahSpd: number;
  keterangan?: string | null;
}) {
  const opd = await prisma.opd.findUnique({ where: { id: data.opdId } });
  if (!opd) throw new Error("OPD tidak valid");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (data.unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({ where: { id: data.unitKerjaId } });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  }

  return await prisma.spd.create({
    data: {
      tahunAnggaran: data.tahunAnggaran,
      nomorSpd: data.nomorSpd,
      tanggalSpd: data.tanggalSpd || new Date(),
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      kd_unit: kdUnit,
      nm_unit: nmUnit,
      periode: data.periode,
      jumlahSpd: data.jumlahSpd,
      keterangan: data.keterangan || null,
      status: "AKTIF",
    },
  });
}
