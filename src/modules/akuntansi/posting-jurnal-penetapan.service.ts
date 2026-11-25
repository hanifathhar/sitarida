import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import {
  getRestrictedSkpd,
  isAkuntansiAuthorized,
  ListSumberParams,
  resolveUnitInfo,
  sanitizeIds,
  SumberJurnalItem,
} from "./posting-jurnal.shared";

export async function listSumberJurnalPenetapan(
  params: ListSumberParams
): Promise<SumberJurnalItem[]> {
  const { tahunAnggaran, kd_skpd, kd_unit, startDate, endDate } = params;
  const where: any = { tahunAnggaran, kd_skpd };
  if (kd_unit) where.kd_unit = kd_unit;
  if (startDate || endDate) {
    where.tgl_tetap = {};
    if (startDate) where.tgl_tetap.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) where.tgl_tetap.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const rows = await prisma.tblPenetapan.findMany({
    where,
    orderBy: [{ tgl_tetap: "desc" }, { no_tetap: "desc" }],
  });

  return rows.map((r: any) => ({
    id: r.id,
    nomor: r.no_tetap,
    tanggal: r.tgl_tetap.toISOString().split("T")[0],
    kd_skpd: r.kd_skpd,
    nm_skpd: r.nm_skpd || r.kd_skpd,
    kd_unit: r.kd_unit || null,
    nm_unit: r.nm_unit || null,
    uraian: r.keterangan || r.company || r.nm_rek6,
    rekening: `${r.kd_rek6} - ${r.nm_rek6}`,
    jenisLabel: r.jns_pajak || "Penetapan",
    nilai: Number(r.nilai) || 0,
    statusSumber: r.verif === 1 ? "Sudah Posting" : "Belum Posting",
    statusPosting: r.verif === 1 ? "SUDAH" : "BELUM",
  }));
}

export async function postJurnalPenetapan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penetapan")) {
    throw new Error("Akses ditolak untuk Posting Jurnal Penetapan.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penetapan untuk diposting.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds } };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.tblPenetapan.findMany({
      where,
      orderBy: [{ tgl_tetap: "asc" }, { no_tetap: "asc" }],
    });

    if (rows.length === 0) {
      throw new Error("Data penetapan tidak ditemukan.");
    }

    const unpostedRows = rows.filter((r) => r.verif !== 1);
    if (unpostedRows.length === 0) {
      throw new Error("Semua data yang dipilih sudah berstatus posting (verif = 1).");
    }

    const rekCodes = Array.from(new Set(unpostedRows.map((r) => r.kd_rek6)));
    const sourceReks = await tx.msRek6.findMany({
      where: { kd_rek6: { in: rekCodes } },
      select: {
        kd_rek6: true,
        nm_rek6: true,
        map_lo: true,
        map_utang: true,
      },
    });
    const sourceRekMap = new Map(sourceReks.map((r) => [r.kd_rek6, r]));

    const targetCodes = Array.from(
      new Set(
        sourceReks
          .flatMap((r) => [r.map_lo, r.map_utang])
          .filter((c): c is string => Boolean(c && c.trim()))
      )
    );
    const targetReks = await tx.msRek6.findMany({
      where: { kd_rek6: { in: targetCodes } },
      select: { kd_rek6: true, nm_rek6: true },
    });
    const targetRekMap = new Map(targetReks.map((r) => [r.kd_rek6, r]));

    let postedCount = 0;

    for (const row of unpostedRows) {
      const srcRek = sourceRekMap.get(row.kd_rek6);
      const kdPiutang = srcRek?.map_utang?.trim();
      const kdLo = srcRek?.map_lo?.trim();

      const piutangRek = kdPiutang ? targetRekMap.get(kdPiutang) : undefined;
      const loRek = kdLo ? targetRekMap.get(kdLo) : undefined;

      if (!piutangRek || !loRek) {
        throw new Error(
          `Mapping rekening untuk ${row.kd_rek6} (${row.nm_rek6}) belum lengkap di Master Rekening (map_utang / map_lo tidak ditemukan).`
        );
      }

      const noVoucher = `${row.no_tetap.trim()}/10`;
      const keterangan = row.keterangan || row.company || row.nm_rek6;
      const unitInfo = await resolveUnitInfo(tx, row);

      await tx.trhmaping.deleteMany({
        where: { no_voucher: noVoucher },
      });

      await tx.trhmaping.create({
        data: {
          tahunAnggaran: row.tahunAnggaran,
          no_voucher: noVoucher,
          tgl_voucher: row.tgl_tetap,
          kd_skpd: row.kd_skpd,
          nm_skpd: row.nm_skpd,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          keterangan,
          total_debet: row.nilai,
          total_kredit: row.nilai,
          jns_transaksi: "PENETAPAN",
          tabel: "10",
          details: {
            create: [
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_tetap,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: "",
                nm_sub_kegiatan: "",
                kd_rek6: piutangRek.kd_rek6,
                nm_rek6: piutangRek.nm_rek6,
                rk: "D",
                debet: row.nilai,
                kredit: 0,
                jns_transaksi: "PENETAPAN",
                tabel: "10",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_tetap,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: "",
                nm_sub_kegiatan: "",
                kd_rek6: loRek.kd_rek6,
                nm_rek6: loRek.nm_rek6,
                rk: "K",
                debet: 0,
                kredit: row.nilai,
                jns_transaksi: "PENETAPAN",
                tabel: "10",
              },
            ],
          },
        },
      });

      await tx.tblPenetapan.update({
        where: { id: row.id },
        data: { verif: 1 },
      });

      postedCount += 1;
    }

    return { postedCount };
  });
}

export async function unpostJurnalPenetapan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penetapan")) {
    throw new Error("Akses ditolak untuk Batal Posting Jurnal Penetapan.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penetapan untuk dibatalkan postingnya.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds }, verif: 1 };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.tblPenetapan.findMany({ where });
    if (rows.length === 0) {
      throw new Error("Tidak ada data berstatus sudah posting yang dipilih.");
    }

    const noVouchers = rows.map((r) => `${r.no_tetap.trim()}/10`);
    await tx.trhmaping.deleteMany({
      where: { no_voucher: { in: noVouchers } },
    });

    await tx.tblPenetapan.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { verif: 0 },
    });

    return { unpostedCount: rows.length };
  });
}
