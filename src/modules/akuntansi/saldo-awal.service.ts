import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { getRestrictedSkpd, resolveUnitInfo } from "./posting-jurnal.shared";

export function isSaldoAwalAuthorized(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  if (roleKode === "0" || roleKode === "SUPERADMIN") return true;

  const perms = session.permissions || [];
  return (
    perms.includes("akuntansi:read") ||
    perms.includes("akuntansi:post") ||
    perms.includes("menu:akuntansi:saldo-awal")
  );
}

export interface SaldoAwalItem {
  id: string;
  tahunAnggaran: number;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string;
  nm_unit: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: "D" | "K";
  nilai: number;
  keterangan: string;
}

export async function getSaldoAwalRefs() {
  const rekenings = await prisma.msRek6.findMany({
    where: { isActive: true },
    select: { kd_rek6: true, nm_rek6: true },
    orderBy: { kd_rek6: "asc" },
  });
  return { rekenings };
}

export async function listSaldoAwal(
  session: SessionPayload,
  params: {
    tahunAnggaran: number;
    kd_skpd: string;
    kd_unit?: string;
    search?: string;
  }
) {
  if (!isSaldoAwalAuthorized(session)) {
    throw new Error("Akses ditolak ke menu Input Saldo Awal.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const targetSkpd = restrictedSkpd || params.kd_skpd;
  const targetUnit = (params.kd_unit || "").trim();

  const rawRows = targetUnit
    ? await prisma.$queryRaw<any[]>`
        SELECT id, "tahunAnggaran", kd_skpd, nm_skpd, kd_unit, nm_unit, kd_rek6, nm_rek6, rk::text AS rk, nilai, keterangan
        FROM saldo_awal_akun
        WHERE "tahunAnggaran" = ${params.tahunAnggaran}
          AND kd_skpd = ${targetSkpd}
          AND kd_unit = ${targetUnit}
        ORDER BY kd_rek6 ASC
      `
    : await prisma.$queryRaw<any[]>`
        SELECT id, "tahunAnggaran", kd_skpd, nm_skpd, kd_unit, nm_unit, kd_rek6, nm_rek6, rk::text AS rk, nilai, keterangan
        FROM saldo_awal_akun
        WHERE "tahunAnggaran" = ${params.tahunAnggaran}
          AND kd_skpd = ${targetSkpd}
        ORDER BY kd_rek6 ASC
      `;

  let items: SaldoAwalItem[] = rawRows.map((r) => ({
    id: r.id,
    tahunAnggaran: Number(r.tahunAnggaran),
    kd_skpd: r.kd_skpd,
    nm_skpd: r.nm_skpd || r.kd_skpd,
    kd_unit: r.kd_unit || "",
    nm_unit: r.nm_unit || "",
    kd_rek6: r.kd_rek6,
    nm_rek6: r.nm_rek6,
    rk: (r.rk === "K" ? "K" : "D") as "D" | "K",
    nilai: Number(r.nilai) || 0,
    keterangan: r.keterangan || "",
  }));

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.kd_rek6.toLowerCase().includes(q) ||
        i.nm_rek6.toLowerCase().includes(q) ||
        i.keterangan.toLowerCase().includes(q)
    );
  }

  const totalDebet = items
    .filter((i) => i.rk === "D")
    .reduce((s, i) => s + i.nilai, 0);
  const totalKredit = items
    .filter((i) => i.rk === "K")
    .reduce((s, i) => s + i.nilai, 0);

  return {
    items,
    summary: {
      totalAkun: items.length,
      totalDebet,
      totalKredit,
      selisih: Math.abs(totalDebet - totalKredit),
    },
  };
}

export async function upsertSaldoAwal(
  session: SessionPayload,
  input: {
    id?: string;
    tahunAnggaran: number;
    kd_skpd: string;
    nm_skpd?: string;
    kd_unit?: string;
    nm_unit?: string;
    kd_rek6: string;
    nm_rek6?: string;
    rk: "D" | "K";
    nilai: number;
    keterangan?: string;
  }
) {
  if (!isSaldoAwalAuthorized(session)) {
    throw new Error("Akses ditolak untuk menyimpan Saldo Awal.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const targetSkpd = restrictedSkpd || input.kd_skpd;
  const kdRek6 = (input.kd_rek6 || "").trim();
  if (!targetSkpd) throw new Error("Kode SKPD wajib diisi.");
  if (!kdRek6) throw new Error("Rekening wajib dipilih.");
  if (input.rk !== "D" && input.rk !== "K") {
    throw new Error("Posisi RK harus D (Debet) atau K (Kredit).");
  }
  const nilai = Number(input.nilai) || 0;
  if (nilai < 0) throw new Error("Nilai saldo awal tidak boleh negatif.");

  const rek = await prisma.msRek6.findUnique({
    where: { kd_rek6: kdRek6 },
    select: { kd_rek6: true, nm_rek6: true },
  });
  if (!rek) {
    throw new Error(`Rekening ${kdRek6} tidak ditemukan di Master Rekening.`);
  }

  const opd = await prisma.opd.findUnique({
    where: { kd_skpd: targetSkpd },
    select: { nm_skpd: true },
  });
  const nmSkpd = input.nm_skpd?.trim() || opd?.nm_skpd || targetSkpd;
  const unitInfo = await resolveUnitInfo(prisma, {
    kd_skpd: targetSkpd,
    nm_skpd: nmSkpd,
    kd_unit: input.kd_unit,
    nm_unit: input.nm_unit,
  });

  const keterangan = (input.keterangan || "").trim() || null;

  if (input.id) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id, kd_skpd FROM saldo_awal_akun WHERE id = ${input.id} LIMIT 1
    `;
    if (existing.length === 0) {
      throw new Error("Data saldo awal tidak ditemukan.");
    }
    if (restrictedSkpd && existing[0].kd_skpd !== restrictedSkpd) {
      throw new Error("Akses ditolak untuk mengubah data OPD lain.");
    }

    await prisma.$executeRaw`
      UPDATE saldo_awal_akun
      SET kd_rek6 = ${rek.kd_rek6},
          nm_rek6 = ${rek.nm_rek6},
          rk = ${input.rk}::"RkType",
          nilai = ${nilai},
          keterangan = ${keterangan},
          nm_skpd = ${nmSkpd},
          kd_unit = ${unitInfo.kd_unit},
          nm_unit = ${unitInfo.nm_unit},
          "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return { id: input.id };
  }

  const newId = crypto.randomUUID();
  await prisma.$executeRaw`
    INSERT INTO saldo_awal_akun (
      id, "tahunAnggaran", kd_skpd, nm_skpd, kd_unit, nm_unit,
      kd_rek6, nm_rek6, rk, nilai, keterangan, "createdAt", "updatedAt"
    )
    VALUES (
      ${newId}, ${input.tahunAnggaran}, ${targetSkpd}, ${nmSkpd}, ${unitInfo.kd_unit}, ${unitInfo.nm_unit},
      ${rek.kd_rek6}, ${rek.nm_rek6}, ${input.rk}::"RkType", ${nilai}, ${keterangan}, NOW(), NOW()
    )
    ON CONFLICT ("tahunAnggaran", kd_skpd, kd_unit, kd_rek6)
    DO UPDATE SET
      nm_rek6 = EXCLUDED.nm_rek6,
      rk = EXCLUDED.rk,
      nilai = EXCLUDED.nilai,
      keterangan = EXCLUDED.keterangan,
      nm_skpd = EXCLUDED.nm_skpd,
      nm_unit = EXCLUDED.nm_unit,
      "updatedAt" = NOW()
  `;

  return { id: newId };
}

export async function deleteSaldoAwal(session: SessionPayload, id: string) {
  if (!isSaldoAwalAuthorized(session)) {
    throw new Error("Akses ditolak untuk menghapus Saldo Awal.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);
  const existing = await prisma.$queryRaw<any[]>`
    SELECT id, kd_skpd FROM saldo_awal_akun WHERE id = ${id} LIMIT 1
  `;
  if (existing.length === 0) {
    throw new Error("Data saldo awal tidak ditemukan.");
  }
  if (restrictedSkpd && existing[0].kd_skpd !== restrictedSkpd) {
    throw new Error("Akses ditolak untuk menghapus data OPD lain.");
  }

  await prisma.$executeRaw`
    DELETE FROM saldo_awal_akun WHERE id = ${id}
  `;
  return { deleted: true };
}
