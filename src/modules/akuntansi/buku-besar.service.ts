import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { getRestrictedSkpd, isCrossOpdAkuntansi } from "./posting-jurnal.shared";

export function isBukuBesarAuthorized(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  if (roleKode === "0" || roleKode === "SUPERADMIN") return true;

  const perms = session.permissions || [];
  return (
    perms.includes("akuntansi:read") ||
    perms.includes("akuntansi:post") ||
    perms.includes("menu:akuntansi:buku-besar")
  );
}

export async function getBukuBesarRefs(session: SessionPayload) {
  if (!isBukuBesarAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Buku Besar.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const opdWhere: any = { isActive: true };
  if (!isCrossOpd && session.opdId) {
    opdWhere.id = session.opdId;
  }

  const [opds, units, r1, r2, r3, r4, r5, r6] = await Promise.all([
    prisma.opd.findMany({
      where: opdWhere,
      select: { id: true, kd_skpd: true, nm_skpd: true },
      orderBy: { kd_skpd: "asc" },
    }),
    prisma.unitKerja.findMany({
      where: {
        isActive: true,
        ...(!isCrossOpd && session.opdId ? { opdId: session.opdId } : {}),
      },
      select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      orderBy: { kd_unit: "asc" },
    }),
    prisma.msRek1.findMany({
      where: { isActive: true },
      select: { kd_rek1: true, nm_rek1: true },
      orderBy: { kd_rek1: "asc" },
    }),
    prisma.msRek2.findMany({
      where: { isActive: true },
      select: { kd_rek2: true, nm_rek2: true },
      orderBy: { kd_rek2: "asc" },
    }),
    prisma.msRek3.findMany({
      where: { isActive: true },
      select: { kd_rek3: true, nm_rek3: true },
      orderBy: { kd_rek3: "asc" },
    }),
    prisma.msRek4.findMany({
      where: { isActive: true },
      select: { kd_rek4: true, nm_rek4: true },
      orderBy: { kd_rek4: "asc" },
    }),
    prisma.msRek5.findMany({
      where: { isActive: true },
      select: { kd_rek5: true, nm_rek5: true },
      orderBy: { kd_rek5: "asc" },
    }),
    prisma.msRek6.findMany({
      where: { isActive: true },
      select: { kd_rek6: true, nm_rek6: true },
      orderBy: { kd_rek6: "asc" },
    }),
  ]);

  return {
    isCrossOpd,
    tahunAnggaran: session.tahunAnggaran || 2026,
    opds,
    units,
    rekByLevel: {
      "1": r1.map((r) => ({ kode: r.kd_rek1, nama: r.nm_rek1 })),
      "2": r2.map((r) => ({ kode: r.kd_rek2, nama: r.nm_rek2 })),
      "3": r3.map((r) => ({ kode: r.kd_rek3, nama: r.nm_rek3 })),
      "4": r4.map((r) => ({ kode: r.kd_rek4, nama: r.nm_rek4 })),
      "5": r5.map((r) => ({ kode: r.kd_rek5, nama: r.nm_rek5 })),
      "6": r6.map((r) => ({ kode: r.kd_rek6, nama: r.nm_rek6 })),
    },
  };
}

function isNormalDebitAccount(kdRek6: string): boolean {
  const kode = kdRek6.trim();
  return (
    kode.startsWith("1") ||
    kode.startsWith("5") ||
    kode.startsWith("6.2") ||
    kode.startsWith("8") ||
    kode.startsWith("9")
  );
}

export async function getBukuBesarData(
  session: SessionPayload,
  params: {
    tahunAnggaran: number;
    allKabupaten?: boolean;
    kd_skpd?: string;
    kd_unit?: string;
    rekLevel?: string;
    kd_rek?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  if (!isBukuBesarAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Buku Besar.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const restrictedSkpd = await getRestrictedSkpd(session);

  const where: any = {
    tahunAnggaran: params.tahunAnggaran,
    header: { isNot: null },
  };

  if (restrictedSkpd) {
    where.kd_skpd = restrictedSkpd;
    if (params.kd_unit?.trim()) where.kd_unit = params.kd_unit.trim();
  } else if (!(params.allKabupaten && isCrossOpd)) {
    if (!params.kd_skpd) {
      throw new Error("SKPD wajib dipilih atau centang Tampilan Seluruh Kabupaten.");
    }
    where.kd_skpd = params.kd_skpd;
    if (params.kd_unit?.trim()) where.kd_unit = params.kd_unit.trim();
  }

  const selectedKode = params.kd_rek?.trim() || "";
  if (selectedKode) {
    if (params.rekLevel === "6" || !params.rekLevel) {
      where.kd_rek6 = selectedKode;
    } else {
      where.OR = [
        { kd_rek6: selectedKode },
        { kd_rek6: { startsWith: `${selectedKode}.` } },
      ];
    }
  }

  if (params.endDate) {
    where.tgl_voucher = {
      lte: new Date(`${params.endDate}T23:59:59.999Z`),
    };
  }

  const allEntries = await prisma.trdmaping.findMany({
    where,
    orderBy: [{ tgl_voucher: "asc" }, { no_voucher: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      no_voucher: true,
      tgl_voucher: true,
      kd_skpd: true,
      nm_skpd: true,
      kd_unit: true,
      nm_unit: true,
      keterangan: true,
      kdsub_kegiatan: true,
      nm_sub_kegiatan: true,
      kd_rek6: true,
      nm_rek6: true,
      rk: true,
      debet: true,
      kredit: true,
      jns_transaksi: true,
    },
  });

  const startBound = params.startDate
    ? new Date(`${params.startDate}T00:00:00.000Z`)
    : null;

  const normalDebit = selectedKode
    ? isNormalDebitAccount(selectedKode)
    : true;

  let saldoAwal = 0;
  const periodEntries: typeof allEntries = [];

  for (const e of allEntries) {
    const debet = Number(e.debet) || 0;
    const kredit = Number(e.kredit) || 0;
    if (startBound && e.tgl_voucher < startBound) {
      saldoAwal += normalDebit ? debet - kredit : kredit - debet;
    } else {
      periodEntries.push(e);
    }
  }

  let runningSaldo = saldoAwal;
  let totalDebet = 0;
  let totalKredit = 0;

  const rows = periodEntries.map((e) => {
    const debet = Number(e.debet) || 0;
    const kredit = Number(e.kredit) || 0;
    totalDebet += debet;
    totalKredit += kredit;
    runningSaldo += normalDebit ? debet - kredit : kredit - debet;

    return {
      id: e.id,
      tanggal: e.tgl_voucher.toISOString().split("T")[0],
      no_voucher: e.no_voucher,
      kd_skpd: e.kd_skpd,
      nm_skpd: e.nm_skpd || e.kd_skpd,
      nm_unit: e.nm_unit || "",
      keterangan: e.keterangan || "-",
      kdsub_kegiatan: e.kdsub_kegiatan || "",
      nm_sub_kegiatan: e.nm_sub_kegiatan || "",
      kd_rek6: e.kd_rek6,
      nm_rek6: e.nm_rek6,
      rk: e.rk || "-",
      debet,
      kredit,
      saldo: runningSaldo,
      jns_transaksi: e.jns_transaksi || "-",
    };
  });

  return {
    normalPosisi: normalDebit ? "D" : "K",
    saldoAwal,
    totalDebet,
    totalKredit,
    saldoAkhir: runningSaldo,
    rows,
  };
}
