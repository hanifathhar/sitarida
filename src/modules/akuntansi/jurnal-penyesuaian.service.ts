import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { getRestrictedSkpd, resolveUnitInfo } from "./posting-jurnal.shared";

export function isJurnalPenyesuaianAuthorized(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  if (roleKode === "0" || roleKode === "SUPERADMIN") return true;

  const perms = session.permissions || [];
  return (
    perms.includes("akuntansi:read") ||
    perms.includes("akuntansi:post") ||
    perms.includes("menu:akuntansi:jurnal-penyesuaian")
  );
}

export interface JurnalPenyesuaianDetailInput {
  kdsub_kegiatan?: string;
  nm_sub_kegiatan?: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: "D" | "K";
  nilai: number;
  keterangan?: string;
}

export interface JurnalPenyesuaianInput {
  tahunAnggaran: number;
  no_voucher: string;
  tgl_voucher: string;
  kd_skpd: string;
  nm_skpd?: string;
  kd_unit?: string;
  nm_unit?: string;
  keterangan?: string;
  details: JurnalPenyesuaianDetailInput[];
}

export async function getJurnalPenyesuaianRefs(params: {
  tahunAnggaran: number;
  kd_skpd?: string;
  kd_unit?: string;
}) {
  const { tahunAnggaran, kd_skpd, kd_unit } = params;

  const rkaWhere: any = {
    tahunAnggaran,
    kd_rek6: { startsWith: "5" },
  };
  if (kd_skpd) rkaWhere.kd_skpd = kd_skpd;
  if (kd_unit) {
    rkaWhere.OR = [{ kd_unit }, { kd_unit: null }, { kd_unit: "" }];
  }

  const [rekenings, rkaItems] = await Promise.all([
    prisma.msRek6.findMany({
      where: { isActive: true },
      select: { kd_rek6: true, nm_rek6: true },
      orderBy: { kd_rek6: "asc" },
    }),
    kd_skpd
      ? prisma.trdrka.findMany({
          where: rkaWhere,
          select: {
            kd_sub_kegiatan: true,
            nm_sub_kegiatan: true,
            kd_rek6: true,
            nm_rek6: true,
          },
          orderBy: [{ kd_sub_kegiatan: "asc" }, { kd_rek6: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return { rekenings, rkaItems };
}

export async function listJurnalPenyesuaian(
  session: SessionPayload,
  params: {
    tahunAnggaran: number;
    kd_skpd: string;
    kd_unit?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
) {
  if (!isJurnalPenyesuaianAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Jurnal Penyesuaian.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const targetSkpd = restrictedSkpd || params.kd_skpd;

  const where: any = {
    tahunAnggaran: params.tahunAnggaran,
    kd_skpd: targetSkpd,
    jns_transaksi: "PENYESUAIAN",
  };
  if (params.kd_unit) where.kd_unit = params.kd_unit;
  if (params.startDate || params.endDate) {
    where.tgl_voucher = {};
    if (params.startDate) where.tgl_voucher.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    if (params.endDate) where.tgl_voucher.lte = new Date(`${params.endDate}T23:59:59.999Z`);
  }

  const rows = await prisma.trhmaping.findMany({
    where,
    include: {
      details: {
        orderBy: [{ rk: "asc" }, { kd_rek6: "asc" }],
      },
    },
    orderBy: [{ tgl_voucher: "desc" }, { no_voucher: "desc" }],
  });

  let items = rows.map((h) => ({
    id: h.id,
    no_voucher: h.no_voucher,
    tgl_voucher: h.tgl_voucher.toISOString().split("T")[0],
    kd_skpd: h.kd_skpd,
    nm_skpd: h.nm_skpd || h.kd_skpd,
    kd_unit: h.kd_unit || null,
    nm_unit: h.nm_unit || null,
    keterangan: h.keterangan || "-",
    total_debet: Number(h.total_debet) || 0,
    total_kredit: Number(h.total_kredit) || 0,
    jns_transaksi: h.jns_transaksi || "PENYESUAIAN",
    tabel: h.tabel || "1",
    details: h.details.map((d) => ({
      id: d.id,
      kdsub_kegiatan: d.kdsub_kegiatan || "",
      nm_sub_kegiatan: d.nm_sub_kegiatan || "",
      kd_rek6: d.kd_rek6,
      nm_rek6: d.nm_rek6,
      rk: (d.rk || "D") as "D" | "K",
      debet: Number(d.debet) || 0,
      kredit: Number(d.kredit) || 0,
      keterangan: d.keterangan || "",
    })),
  }));

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.no_voucher.toLowerCase().includes(q) ||
        i.keterangan.toLowerCase().includes(q) ||
        i.details.some(
          (d) =>
            d.kd_rek6.toLowerCase().includes(q) ||
            d.nm_rek6.toLowerCase().includes(q) ||
            d.nm_sub_kegiatan.toLowerCase().includes(q)
        )
    );
  }

  const totalDokumen = items.length;
  const totalBaris = items.reduce((s, r) => s + r.details.length, 0);
  const totalDebet = items.reduce((s, r) => s + r.total_debet, 0);
  const totalKredit = items.reduce((s, r) => s + r.total_kredit, 0);

  return {
    items,
    summary: {
      totalDokumen,
      totalBaris,
      totalDebet,
      totalKredit,
    },
  };
}

function validatePenyesuaianInput(input: JurnalPenyesuaianInput) {
  const noVoucher = (input.no_voucher || "").trim();
  if (!noVoucher) {
    throw new Error("Nomor voucher wajib diisi.");
  }
  if (!input.tgl_voucher) {
    throw new Error("Tanggal voucher wajib diisi.");
  }
  if (!input.kd_skpd) {
    throw new Error("Kode SKPD wajib diisi.");
  }
  if (!Array.isArray(input.details) || input.details.length < 2) {
    throw new Error("Minimal harus ada 2 baris rincian jurnal (Debet dan Kredit).");
  }

  let totalDebet = 0;
  let totalKredit = 0;

  for (const d of input.details) {
    if (!d.kd_rek6?.trim() || !d.nm_rek6?.trim()) {
      throw new Error("Rekening pada setiap baris rincian jurnal wajib dipilih.");
    }
    const nilai = Number(d.nilai) || 0;
    if (nilai <= 0) {
      throw new Error("Nilai pada setiap baris rincian jurnal harus lebih dari 0.");
    }
    if (d.rk === "D") totalDebet += nilai;
    else if (d.rk === "K") totalKredit += nilai;
    else throw new Error("Posisi RK harus D (Debet) atau K (Kredit).");
  }

  if (Math.abs(totalDebet - totalKredit) > 0.01) {
    throw new Error(
      `Jurnal belum balance. Total Debet (${totalDebet.toLocaleString("id-ID")}) harus sama dengan Total Kredit (${totalKredit.toLocaleString("id-ID")}).`
    );
  }

  return { noVoucher, totalDebet, totalKredit };
}

async function validateBelanjaRka(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tahunAnggaran: number,
  kd_skpd: string,
  details: JurnalPenyesuaianDetailInput[]
) {
  for (const d of details) {
    const kdRek = d.kd_rek6.trim();
    if (!kdRek.startsWith("5")) continue;

    const kdSub = (d.kdsub_kegiatan || "").trim();
    if (!kdSub) {
      throw new Error(
        `Jurnal belanja (${kdRek}) wajib memilih Sub Kegiatan sesuai RKA.`
      );
    }

    const rkaMatch = await tx.trdrka.findFirst({
      where: {
        tahunAnggaran,
        kd_skpd,
        kd_sub_kegiatan: kdSub,
        kd_rek6: kdRek,
      },
      select: { id: true },
    });
    if (!rkaMatch) {
      throw new Error(
        `Rekening belanja ${kdRek} pada Sub Kegiatan ${kdSub} tidak terdaftar di RKA OPD ${kd_skpd} TA ${tahunAnggaran}.`
      );
    }
  }
}

export async function createJurnalPenyesuaian(
  session: SessionPayload,
  input: JurnalPenyesuaianInput
) {
  if (!isJurnalPenyesuaianAuthorized(session)) {
    throw new Error("Akses ditolak untuk membuat Jurnal Penyesuaian.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const targetSkpd = restrictedSkpd || input.kd_skpd;
  const { noVoucher, totalDebet, totalKredit } = validatePenyesuaianInput({
    ...input,
    kd_skpd: targetSkpd,
  });

  return prisma.$transaction(async (tx) => {
    await validateBelanjaRka(tx, input.tahunAnggaran, targetSkpd, input.details);

    const duplicate = await tx.trhmaping.findUnique({
      where: { no_voucher: noVoucher },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error(`Nomor voucher "${noVoucher}" sudah digunakan.`);
    }

    const opd = await tx.opd.findUnique({
      where: { kd_skpd: targetSkpd },
      select: { nm_skpd: true },
    });
    const nmSkpd = input.nm_skpd?.trim() || opd?.nm_skpd || targetSkpd;
    const unitInfo = await resolveUnitInfo(tx, {
      kd_skpd: targetSkpd,
      nm_skpd: nmSkpd,
      kd_unit: input.kd_unit,
      nm_unit: input.nm_unit,
    });

    const tglVoucher = new Date(`${input.tgl_voucher}T00:00:00.000Z`);
    const keterangan = (input.keterangan || "").trim() || `Jurnal Penyesuaian ${noVoucher}`;

    return tx.trhmaping.create({
      data: {
        tahunAnggaran: input.tahunAnggaran,
        no_voucher: noVoucher,
        tgl_voucher: tglVoucher,
        kd_skpd: targetSkpd,
        nm_skpd: nmSkpd,
        kd_unit: unitInfo.kd_unit,
        nm_unit: unitInfo.nm_unit,
        keterangan,
        total_debet: totalDebet,
        total_kredit: totalKredit,
        jns_transaksi: "PENYESUAIAN",
        tabel: "1",
        details: {
          create: input.details.map((d) => {
            const nilai = Number(d.nilai) || 0;
            return {
              tahunAnggaran: input.tahunAnggaran,
              no_voucher: noVoucher,
              tgl_voucher: tglVoucher,
              kd_skpd: targetSkpd,
              nm_skpd: nmSkpd,
              kd_unit: unitInfo.kd_unit,
              nm_unit: unitInfo.nm_unit,
              keterangan: d.keterangan?.trim() || keterangan,
              kdsub_kegiatan: d.kdsub_kegiatan?.trim() || "",
              nm_sub_kegiatan: d.nm_sub_kegiatan?.trim() || "",
              kd_rek6: d.kd_rek6.trim(),
              nm_rek6: d.nm_rek6.trim(),
              rk: d.rk,
              debet: d.rk === "D" ? nilai : 0,
              kredit: d.rk === "K" ? nilai : 0,
              jns_transaksi: "PENYESUAIAN",
              tabel: "1",
            };
          }),
        },
      },
    });
  });
}

export async function updateJurnalPenyesuaian(
  session: SessionPayload,
  id: string,
  input: JurnalPenyesuaianInput
) {
  if (!isJurnalPenyesuaianAuthorized(session)) {
    throw new Error("Akses ditolak untuk mengubah Jurnal Penyesuaian.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const { noVoucher, totalDebet, totalKredit } = validatePenyesuaianInput(input);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.trhmaping.findUnique({
      where: { id },
      select: { id: true, kd_skpd: true, jns_transaksi: true },
    });
    if (!existing || existing.jns_transaksi !== "PENYESUAIAN") {
      throw new Error("Data Jurnal Penyesuaian tidak ditemukan.");
    }
    if (restrictedSkpd && existing.kd_skpd !== restrictedSkpd) {
      throw new Error("Akses ditolak untuk mengubah data OPD lain.");
    }

    const duplicate = await tx.trhmaping.findFirst({
      where: { no_voucher: noVoucher, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) {
      throw new Error(`Nomor voucher "${noVoucher}" sudah digunakan.`);
    }

    const targetSkpd = restrictedSkpd || input.kd_skpd || existing.kd_skpd;
    await validateBelanjaRka(tx, input.tahunAnggaran, targetSkpd, input.details);
    const opd = await tx.opd.findUnique({
      where: { kd_skpd: targetSkpd },
      select: { nm_skpd: true },
    });
    const nmSkpd = input.nm_skpd?.trim() || opd?.nm_skpd || targetSkpd;
    const unitInfo = await resolveUnitInfo(tx, {
      kd_skpd: targetSkpd,
      nm_skpd: nmSkpd,
      kd_unit: input.kd_unit,
      nm_unit: input.nm_unit,
    });

    const tglVoucher = new Date(`${input.tgl_voucher}T00:00:00.000Z`);
    const keterangan = (input.keterangan || "").trim() || `Jurnal Penyesuaian ${noVoucher}`;

    await tx.trdmaping.deleteMany({
      where: { headerId: id },
    });

    return tx.trhmaping.update({
      where: { id },
      data: {
        no_voucher: noVoucher,
        tgl_voucher: tglVoucher,
        kd_skpd: targetSkpd,
        nm_skpd: nmSkpd,
        kd_unit: unitInfo.kd_unit,
        nm_unit: unitInfo.nm_unit,
        keterangan,
        total_debet: totalDebet,
        total_kredit: totalKredit,
        details: {
          create: input.details.map((d) => {
            const nilai = Number(d.nilai) || 0;
            return {
              tahunAnggaran: input.tahunAnggaran,
              no_voucher: noVoucher,
              tgl_voucher: tglVoucher,
              kd_skpd: targetSkpd,
              nm_skpd: nmSkpd,
              kd_unit: unitInfo.kd_unit,
              nm_unit: unitInfo.nm_unit,
              keterangan: d.keterangan?.trim() || keterangan,
              kdsub_kegiatan: d.kdsub_kegiatan?.trim() || "",
              nm_sub_kegiatan: d.nm_sub_kegiatan?.trim() || "",
              kd_rek6: d.kd_rek6.trim(),
              nm_rek6: d.nm_rek6.trim(),
              rk: d.rk,
              debet: d.rk === "D" ? nilai : 0,
              kredit: d.rk === "K" ? nilai : 0,
              jns_transaksi: "PENYESUAIAN",
              tabel: "1",
            };
          }),
        },
      },
    });
  });
}

export async function deleteJurnalPenyesuaian(session: SessionPayload, id: string) {
  if (!isJurnalPenyesuaianAuthorized(session)) {
    throw new Error("Akses ditolak untuk menghapus Jurnal Penyesuaian.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const existing = await prisma.trhmaping.findUnique({
    where: { id },
    select: { id: true, kd_skpd: true, jns_transaksi: true },
  });
  if (!existing || existing.jns_transaksi !== "PENYESUAIAN") {
    throw new Error("Data Jurnal Penyesuaian tidak ditemukan.");
  }
  if (restrictedSkpd && existing.kd_skpd !== restrictedSkpd) {
    throw new Error("Akses ditolak untuk menghapus data OPD lain.");
  }

  await prisma.trhmaping.delete({ where: { id } });
  return { deleted: true };
}
