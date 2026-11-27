import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { getRestrictedSkpd, isCrossOpdAkuntansi } from "./posting-jurnal.shared";

export function isNeracaSaldoAuthorized(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  if (roleKode === "0" || roleKode === "SUPERADMIN") return true;

  const perms = session.permissions || [];
  return (
    perms.includes("akuntansi:read") ||
    perms.includes("akuntansi:post") ||
    perms.includes("menu:akuntansi:neraca-saldo")
  );
}

export async function getNeracaSaldoRefs(session: SessionPayload) {
  if (!isNeracaSaldoAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Neraca Saldo.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const opdWhere: any = { isActive: true };
  if (!isCrossOpd && session.opdId) {
    opdWhere.id = session.opdId;
  }

  const [opds, units] = await Promise.all([
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
  ]);

  return {
    isCrossOpd,
    tahunAnggaran: session.tahunAnggaran || 2026,
    opds,
    units,
  };
}

export interface NeracaSaldoRow {
  kd_rek6: string;
  nm_rek6: string;
  saldoAwalDebet: number;
  saldoAwalKredit: number;
  sebelumDebet: number;
  sebelumKredit: number;
  penyesuaianDebet: number;
  penyesuaianKredit: number;
  setelahDebet: number;
  setelahKredit: number;
  saldoAkhirDebet: number;
  saldoAkhirKredit: number;
}

export async function getNeracaSaldoData(
  session: SessionPayload,
  params: {
    tahunAnggaran: number;
    allKabupaten?: boolean;
    kd_skpd?: string;
    kd_unit?: string;
    rekLevel?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  if (!isNeracaSaldoAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Neraca Saldo.");
  }

  const isCrossOpd = isCrossOpdAkuntansi(session);
  const restrictedSkpd = await getRestrictedSkpd(session);

  let scopeSkpd: string | null = null;
  let scopeUnit: string | null = null;

  if (restrictedSkpd) {
    scopeSkpd = restrictedSkpd;
    if (params.kd_unit?.trim()) scopeUnit = params.kd_unit.trim();
  } else if (!(params.allKabupaten && isCrossOpd)) {
    if (!params.kd_skpd) {
      throw new Error("OPD wajib dipilih atau centang Tampilan Seluruh Kabupaten.");
    }
    scopeSkpd = params.kd_skpd;
    if (params.kd_unit?.trim()) scopeUnit = params.kd_unit.trim();
  }

  const parsedLevel = Number(params.rekLevel || "6");
  const levelNum = parsedLevel >= 1 && parsedLevel <= 6 ? parsedLevel : 6;

  const mapingWhere: any = {
    tahunAnggaran: params.tahunAnggaran,
    header: { isNot: null },
  };
  if (scopeSkpd) mapingWhere.kd_skpd = scopeSkpd;
  if (scopeUnit) mapingWhere.kd_unit = scopeUnit;
  if (params.startDate || params.endDate) {
    mapingWhere.tgl_voucher = {};
    if (params.startDate) {
      mapingWhere.tgl_voucher.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    }
    if (params.endDate) {
      mapingWhere.tgl_voucher.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  const [saldoAwalRows, mapingRows, levelNameRows] = await Promise.all([
    prisma.$queryRaw<
      { kd_rek6: string; nm_rek6: string; rk: string; nilai: unknown }[]
    >`
      SELECT kd_rek6, nm_rek6, rk::text AS rk, nilai
      FROM saldo_awal_akun
      WHERE "tahunAnggaran" = ${params.tahunAnggaran}
        AND (kd_rek6 LIKE '1%' OR kd_rek6 LIKE '2%' OR kd_rek6 LIKE '3%')
        AND (${scopeSkpd}::text IS NULL OR kd_skpd = ${scopeSkpd})
        AND (${scopeUnit}::text IS NULL OR kd_unit = ${scopeUnit})
    `,
    prisma.trdmaping.findMany({
      where: mapingWhere,
      select: {
        kd_rek6: true,
        nm_rek6: true,
        debet: true,
        kredit: true,
        jns_transaksi: true,
      },
    }),
    levelNum === 1
      ? prisma.msRek1.findMany({ select: { kd_rek1: true, nm_rek1: true } }).then((l) =>
          l.map((x) => [x.kd_rek1.trim(), x.nm_rek1] as const)
        )
      : levelNum === 2
        ? prisma.msRek2.findMany({ select: { kd_rek2: true, nm_rek2: true } }).then((l) =>
            l.map((x) => [x.kd_rek2.trim(), x.nm_rek2] as const)
          )
        : levelNum === 3
          ? prisma.msRek3.findMany({ select: { kd_rek3: true, nm_rek3: true } }).then((l) =>
              l.map((x) => [x.kd_rek3.trim(), x.nm_rek3] as const)
            )
          : levelNum === 4
            ? prisma.msRek4.findMany({ select: { kd_rek4: true, nm_rek4: true } }).then((l) =>
                l.map((x) => [x.kd_rek4.trim(), x.nm_rek4] as const)
              )
            : levelNum === 5
              ? prisma.msRek5.findMany({ select: { kd_rek5: true, nm_rek5: true } }).then((l) =>
                  l.map((x) => [x.kd_rek5.trim(), x.nm_rek5] as const)
                )
              : prisma.msRek6.findMany({ select: { kd_rek6: true, nm_rek6: true } }).then((l) =>
                  l.map((x) => [x.kd_rek6.trim(), x.nm_rek6] as const)
                ),
  ]);

  const levelNameMap = new Map<string, string>(levelNameRows);
  const accMap = new Map<string, NeracaSaldoRow>();

  const toGroupCode = (kd: string) => {
    const parts = kd.trim().split(".");
    return parts.slice(0, levelNum).join(".");
  };

  const ensureAcc = (kdRek6: string, fallbackNm: string) => {
    const groupCode = toGroupCode(kdRek6);
    let entry = accMap.get(groupCode);
    if (!entry) {
      entry = {
        kd_rek6: groupCode,
        nm_rek6: levelNameMap.get(groupCode) || fallbackNm,
        saldoAwalDebet: 0,
        saldoAwalKredit: 0,
        sebelumDebet: 0,
        sebelumKredit: 0,
        penyesuaianDebet: 0,
        penyesuaianKredit: 0,
        setelahDebet: 0,
        setelahKredit: 0,
        saldoAkhirDebet: 0,
        saldoAkhirKredit: 0,
      };
      accMap.set(groupCode, entry);
    }
    return entry;
  };

  for (const sa of saldoAwalRows) {
    const entry = ensureAcc(sa.kd_rek6, sa.nm_rek6);
    const val = Number(sa.nilai) || 0;
    if (sa.rk === "D") entry.saldoAwalDebet += val;
    else entry.saldoAwalKredit += val;
  }

  for (const m of mapingRows) {
    const entry = ensureAcc(m.kd_rek6, m.nm_rek6);
    const deb = Number(m.debet) || 0;
    const kre = Number(m.kredit) || 0;
    if ((m.jns_transaksi || "").toUpperCase() === "PENYESUAIAN") {
      entry.penyesuaianDebet += deb;
      entry.penyesuaianKredit += kre;
    } else {
      entry.sebelumDebet += deb;
      entry.sebelumKredit += kre;
    }
  }

  const rows: NeracaSaldoRow[] = [];
  const totals = {
    saldoAwalDebet: 0,
    saldoAwalKredit: 0,
    sebelumDebet: 0,
    sebelumKredit: 0,
    penyesuaianDebet: 0,
    penyesuaianKredit: 0,
    setelahDebet: 0,
    setelahKredit: 0,
    saldoAkhirDebet: 0,
    saldoAkhirKredit: 0,
  };

  const sortedKeys = Array.from(accMap.keys()).sort((a, b) => a.localeCompare(b));
  for (const k of sortedKeys) {
    const r = accMap.get(k)!;
    r.setelahDebet = r.saldoAwalDebet + r.sebelumDebet + r.penyesuaianDebet;
    r.setelahKredit = r.saldoAwalKredit + r.sebelumKredit + r.penyesuaianKredit;

    const net = r.setelahDebet - r.setelahKredit;
    if (net >= 0) {
      r.saldoAkhirDebet = net;
      r.saldoAkhirKredit = 0;
    } else {
      r.saldoAkhirDebet = 0;
      r.saldoAkhirKredit = Math.abs(net);
    }

    totals.saldoAwalDebet += r.saldoAwalDebet;
    totals.saldoAwalKredit += r.saldoAwalKredit;
    totals.sebelumDebet += r.sebelumDebet;
    totals.sebelumKredit += r.sebelumKredit;
    totals.penyesuaianDebet += r.penyesuaianDebet;
    totals.penyesuaianKredit += r.penyesuaianKredit;
    totals.setelahDebet += r.setelahDebet;
    totals.setelahKredit += r.setelahKredit;
    totals.saldoAkhirDebet += r.saldoAkhirDebet;
    totals.saldoAkhirKredit += r.saldoAkhirKredit;

    rows.push(r);
  }

  return { rows, totals };
}
