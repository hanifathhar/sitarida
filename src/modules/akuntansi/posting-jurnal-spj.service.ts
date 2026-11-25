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

export async function listSumberJurnalSpj(
  params: ListSumberParams
): Promise<SumberJurnalItem[]> {
  const { tahunAnggaran, kd_skpd, kd_unit, startDate, endDate } = params;
  const where: any = {
    tahunAnggaran,
    kd_skpd,
    jenis_beban: { in: ["UP", "GU", "TU"] },
  };
  if (kd_unit) where.kd_unit = kd_unit;
  if (startDate || endDate) {
    where.tgl_bukti = {};
    if (startDate) where.tgl_bukti.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) where.tgl_bukti.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const rows = await prisma.trhtransout.findMany({
    where,
    include: { rincian: { take: 3 } },
    orderBy: [{ tgl_bukti: "desc" }, { no_bukti: "desc" }],
  });

  const ids = rows.map((r) => r.id);
  const verifRows =
    ids.length > 0
      ? await prisma.$queryRaw<{ id: string; verif: number }[]>`
          SELECT id, verif FROM trhtransout WHERE id = ANY(${ids}::text[])
        `
      : [];
  const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));

  return rows.map((r: any) => {
    const firstRek = r.rincian?.[0];
    const rekText = firstRek
      ? `${firstRek.kd_rek6} - ${firstRek.nm_rek6}${r.rincian.length > 1 ? ` (+${r.rincian.length - 1})` : ""}`
      : "-";
    return {
      id: r.id,
      nomor: r.no_bukti,
      tanggal: r.tgl_bukti.toISOString().split("T")[0],
      kd_skpd: r.kd_skpd,
      nm_skpd: r.nm_skpd,
      kd_unit: r.kd_unit || null,
      nm_unit: r.nm_unit || null,
      uraian: r.uraian,
      rekening: rekText,
      jenisLabel: r.jenis_beban || r.sumber_dana || "SPJ",
      nilai: Number(r.total) || 0,
      statusSumber: r.status,
      statusPosting: verifMap.get(r.id) === 1 ? "SUDAH" : "BELUM",
    };
  });
}

export async function postJurnalSpj(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "spj")) {
    throw new Error("Akses ditolak untuk Posting Jurnal SPJ UP/GU/TU.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data SPJ untuk diposting.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = {
      id: { in: cleanIds },
      jenis_beban: { in: ["UP", "GU", "TU"] },
    };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.trhtransout.findMany({
      where,
      include: {
        rincian: {
          orderBy: { kd_rek6: "asc" },
        },
      },
      orderBy: [{ tgl_bukti: "asc" }, { no_bukti: "asc" }],
    });

    if (rows.length === 0) {
      throw new Error("Data SPJ tidak ditemukan.");
    }

    const rowIds = rows.map((r) => r.id);
    const verifRows = await tx.$queryRaw<{ id: string; verif: number }[]>`
      SELECT id, verif FROM trhtransout WHERE id = ANY(${rowIds}::text[])
    `;
    const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));

    const unpostedRows = rows.filter((r) => verifMap.get(r.id) !== 1);
    if (unpostedRows.length === 0) {
      throw new Error("Semua data SPJ yang dipilih sudah berstatus posting (verif = 1).");
    }

    const allDetails = unpostedRows.flatMap((r) => r.rincian);
    const rekPrefixes = Array.from(
      new Set(allDetails.map((d) => d.kd_rek6.slice(0, 17).trim()))
    );
    const sourceReks = await tx.msRek6.findMany({
      where: { kd_rek6: { in: rekPrefixes } },
      select: {
        kd_rek6: true,
        nm_rek6: true,
        map_lo: true,
        map_utang: true,
        map_aset: true,
      },
    });
    const sourceRekMap = new Map(sourceReks.map((r) => [r.kd_rek6.trim(), r]));

    const targetCodes = Array.from(
      new Set(
        sourceReks
          .flatMap((r) => [r.map_lo, r.map_utang, r.map_aset])
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
      if (row.rincian.length === 0) {
        throw new Error(
          `Rincian SPJ (trdtransout) untuk bukti ${row.no_bukti} tidak ditemukan.`
        );
      }

      const noVoucher = `${row.no_bukti.trim()}/6`;
      const keterangan = row.uraian || row.no_bukti;
      const unitInfo = await resolveUnitInfo(tx, row);

      const detailLines: Array<{
        tahunAnggaran: number;
        no_voucher: string;
        tgl_voucher: Date;
        kd_skpd: string;
        nm_skpd: string;
        kd_unit: string | null;
        nm_unit: string | null;
        keterangan: string;
        kdsub_kegiatan: string;
        nm_sub_kegiatan: string;
        kd_rek6: string;
        nm_rek6: string;
        rk: "D" | "K";
        debet: number;
        kredit: number;
        jns_transaksi: string;
        tabel: string;
      }> = [];

      for (const d of row.rincian) {
        const nilai = Number(d.nilai) || 0;
        const kdSub = d.kd_sub_kegiatan || "";
        const nmSub = d.nm_sub_kegiatan || "";
        const rekKey = d.kd_rek6.slice(0, 17).trim();
        const srcRek = sourceRekMap.get(rekKey);

        const isAset =
          d.kd_rek6.slice(0, 12) === "5.1.02.01.01" ||
          d.kd_rek6.slice(0, 12) === "5.1.02.01.02" ||
          d.kd_rek6 === "5.1.02.01.03.0001" ||
          d.kd_rek6.slice(0, 3) === "5.2";

        const kdDebet = isAset ? srcRek?.map_utang?.trim() : srcRek?.map_lo?.trim();
        const debetRek = kdDebet ? targetRekMap.get(kdDebet) : undefined;

        if (!debetRek) {
          throw new Error(
            `Mapping rekening (${isAset ? "map_utang" : "map_lo"}) untuk ${d.kd_rek6} (${d.nm_rek6}) belum lengkap di Master Rekening.`
          );
        }

        detailLines.push(
          {
            tahunAnggaran: row.tahunAnggaran,
            no_voucher: noVoucher,
            tgl_voucher: row.tgl_bukti,
            kd_skpd: row.kd_skpd,
            nm_skpd: row.nm_skpd,
            kd_unit: unitInfo.kd_unit,
            nm_unit: unitInfo.nm_unit,
            keterangan,
            kdsub_kegiatan: kdSub,
            nm_sub_kegiatan: nmSub,
            kd_rek6: debetRek.kd_rek6,
            nm_rek6: debetRek.nm_rek6,
            rk: "D",
            debet: nilai,
            kredit: 0,
            jns_transaksi: "SPJ",
            tabel: "6",
          },
          {
            tahunAnggaran: row.tahunAnggaran,
            no_voucher: noVoucher,
            tgl_voucher: row.tgl_bukti,
            kd_skpd: row.kd_skpd,
            nm_skpd: row.nm_skpd,
            kd_unit: unitInfo.kd_unit,
            nm_unit: unitInfo.nm_unit,
            keterangan,
            kdsub_kegiatan: "",
            nm_sub_kegiatan: "",
            kd_rek6: "1.1.01.03.01.0001",
            nm_rek6: "Kas di Bendahara Pengeluaran",
            rk: "K",
            debet: 0,
            kredit: nilai,
            jns_transaksi: "SPJ",
            tabel: "6",
          }
        );
      }

      const totalDebet = detailLines.reduce((s, l) => s + l.debet, 0);
      const totalKredit = detailLines.reduce((s, l) => s + l.kredit, 0);

      await tx.trhmaping.deleteMany({
        where: { no_voucher: noVoucher },
      });

      await tx.trhmaping.create({
        data: {
          tahunAnggaran: row.tahunAnggaran,
          no_voucher: noVoucher,
          tgl_voucher: row.tgl_bukti,
          kd_skpd: row.kd_skpd,
          nm_skpd: row.nm_skpd,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          keterangan,
          total_debet: totalDebet,
          total_kredit: totalKredit,
          jns_transaksi: "SPJ",
          tabel: "6",
          details: {
            create: detailLines,
          },
        },
      });

      await tx.$executeRaw`
        UPDATE trhtransout SET verif = 1 WHERE id = ${row.id}
      `;

      postedCount += 1;
    }

    return { postedCount };
  });
}

export async function unpostJurnalSpj(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "spj")) {
    throw new Error("Akses ditolak untuk Batal Posting Jurnal SPJ UP/GU/TU.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data SPJ untuk dibatalkan postingnya.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds } };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const allRows = await tx.trhtransout.findMany({ where });
    if (allRows.length === 0) {
      throw new Error("Data SPJ tidak ditemukan.");
    }

    const allIds = allRows.map((r) => r.id);
    const verifRows = await tx.$queryRaw<{ id: string; verif: number }[]>`
      SELECT id, verif FROM trhtransout WHERE id = ANY(${allIds}::text[])
    `;
    const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));
    const rows = allRows.filter((r) => verifMap.get(r.id) === 1);

    if (rows.length === 0) {
      throw new Error("Tidak ada data SPJ berstatus sudah posting yang dipilih.");
    }

    const noVouchers = rows.map((r) => `${r.no_bukti.trim()}/6`);
    await tx.trhmaping.deleteMany({
      where: { no_voucher: { in: noVouchers } },
    });

    const unpostIds = rows.map((r) => r.id);
    await tx.$executeRaw`
      UPDATE trhtransout SET verif = 0 WHERE id = ANY(${unpostIds}::text[])
    `;

    return { unpostedCount: rows.length };
  });
}
