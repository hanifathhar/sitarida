import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export type JenisJurnal =
  | "penetapan"
  | "penerimaan"
  | "sp2d"
  | "spj"
  | "setor-sisa-kas";

export interface SumberJurnalItem {
  id: string;
  nomor: string;
  tanggal: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  uraian: string;
  rekening: string;
  jenisLabel: string;
  nilai: number;
  statusSumber: string;
  statusPosting: "BELUM" | "SUDAH";
}

export interface ListSumberParams {
  tahunAnggaran: number;
  kd_skpd: string;
  kd_unit?: string;
  startDate?: string;
  endDate?: string;
}

const JENIS_TO_PERM: Record<JenisJurnal, string> = {
  penetapan: "menu:akuntansi:jurnal-penetapan",
  penerimaan: "menu:akuntansi:jurnal-penerimaan",
  sp2d: "menu:akuntansi:jurnal-sp2d",
  spj: "menu:akuntansi:jurnal-spj",
  "setor-sisa-kas": "menu:akuntansi:jurnal-setor-sisa",
};

export function isAkuntansiAuthorized(
  session: SessionPayload,
  jenis?: JenisJurnal
): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  if (roleKode === "0" || roleKode === "SUPERADMIN") return true;

  const perms = session.permissions || [];
  if (perms.includes("akuntansi:read") || perms.includes("akuntansi:post")) {
    return true;
  }

  if (jenis) {
    return perms.includes(JENIS_TO_PERM[jenis]);
  }

  return Object.values(JENIS_TO_PERM).some((p) => perms.includes(p));
}

export function isCrossOpdAkuntansi(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  return (
    roleKode === "0" ||
    roleKode === "SUPERADMIN" ||
    roleKode === "1" ||
    !session.opdId
  );
}

export async function getRestrictedSkpd(session: SessionPayload): Promise<string | null> {
  if (isCrossOpdAkuntansi(session) || !session.opdId) {
    return null;
  }
  const myOpd = await prisma.opd.findUnique({
    where: { id: session.opdId },
    select: { kd_skpd: true },
  });
  return myOpd?.kd_skpd || null;
}

export async function getAkuntansiScope(session: SessionPayload) {
  const isCross = isCrossOpdAkuntansi(session);
  const opdWhere: any = { isActive: true };
  if (!isCross && session.opdId) {
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
        ...(!isCross && session.opdId ? { opdId: session.opdId } : {}),
      },
      select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      orderBy: { kd_unit: "asc" },
    }),
  ]);

  return {
    session: {
      userId: session.userId,
      namaLengkap: session.namaLengkap || session.username,
      roleKode: session.roleKode,
      isCrossOpd: isCross,
      opdId: session.opdId || null,
      unitKerjaId: session.unitKerjaId || null,
      tahunAnggaran: session.tahunAnggaran || 2026,
    },
    opds,
    units,
  };
}

export function sanitizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim())));
}

export async function resolveUnitInfo(
  tx: { unitKerja: typeof prisma.unitKerja },
  row: {
    kd_skpd: string;
    nm_skpd?: string | null;
    kd_unit?: string | null;
    nm_unit?: string | null;
  }
): Promise<{ kd_unit: string; nm_unit: string }> {
  const existingKd = row.kd_unit?.trim() || "";
  const existingNm = row.nm_unit?.trim() || "";

  if (existingNm) {
    return {
      kd_unit: existingKd || row.kd_skpd,
      nm_unit: existingNm,
    };
  }

  if (existingKd) {
    const unit = await tx.unitKerja.findFirst({
      where: { kd_unit: existingKd },
      select: { kd_unit: true, nm_unit: true },
    });
    if (unit?.nm_unit) {
      return { kd_unit: unit.kd_unit, nm_unit: unit.nm_unit };
    }
  }

  const fallbackUnit = await tx.unitKerja.findFirst({
    where: { opd: { kd_skpd: row.kd_skpd } },
    orderBy: { kd_unit: "asc" },
    select: { kd_unit: true, nm_unit: true },
  });
  if (fallbackUnit?.nm_unit) {
    return {
      kd_unit: existingKd || fallbackUnit.kd_unit,
      nm_unit: fallbackUnit.nm_unit,
    };
  }

  return {
    kd_unit: existingKd || row.kd_skpd,
    nm_unit: row.nm_skpd?.trim() || row.kd_skpd,
  };
}
