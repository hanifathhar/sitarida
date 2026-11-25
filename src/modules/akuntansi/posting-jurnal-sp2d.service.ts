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

export async function listSumberJurnalSp2d(
  params: ListSumberParams
): Promise<SumberJurnalItem[]> {
  const { tahunAnggaran, kd_skpd, kd_unit, startDate, endDate } = params;
  const where: any = { tahunAnggaran, kd_skpd };
  if (kd_unit) where.kd_unit = kd_unit;
  if (startDate || endDate) {
    where.tgl_sp2d = {};
    if (startDate) where.tgl_sp2d.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) where.tgl_sp2d.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const rows = await prisma.trhsp2d.findMany({
    where,
    orderBy: [{ tgl_sp2d: "desc" }, { no_sp2d: "desc" }],
  });

  const sp2dIds = rows.map((r) => r.id);
  const verifRows =
    sp2dIds.length > 0
      ? await prisma.$queryRaw<{ id: string; verif: number }[]>`
          SELECT id, verif FROM trhsp2d WHERE id = ANY(${sp2dIds}::text[])
        `
      : [];
  const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));

  return rows.map((r: any) => ({
    id: r.id,
    nomor: r.no_sp2d,
    tanggal: r.tgl_sp2d.toISOString().split("T")[0],
    kd_skpd: r.kd_skpd,
    nm_skpd: r.nm_skpd,
    kd_unit: r.kd_unit || null,
    nm_unit: r.nm_unit || null,
    uraian: r.keperluan,
    rekening: r.no_spm ? `SPM: ${r.no_spm}` : "-",
    jenisLabel: `SP2D ${(r.jenis_sp2d || "").replace(/_/g, " ")}`,
    nilai: Number(r.nilai) || 0,
    statusSumber: r.status,
    statusPosting: verifMap.get(r.id) === 1 ? "SUDAH" : "BELUM",
  }));
}

export async function postJurnalSp2d(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "sp2d")) {
    throw new Error("Akses ditolak untuk Posting Jurnal SP2D.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data SP2D untuk diposting.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds } };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.trhsp2d.findMany({
      where,
      orderBy: [{ tgl_sp2d: "asc" }, { no_sp2d: "asc" }],
    });

    if (rows.length === 0) {
      throw new Error("Data SP2D tidak ditemukan.");
    }

    const rowIds = rows.map((r) => r.id);
    const verifRows = await tx.$queryRaw<{ id: string; verif: number }[]>`
      SELECT id, verif FROM trhsp2d WHERE id = ANY(${rowIds}::text[])
    `;
    const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));

    const unpostedRows = rows.filter((r) => verifMap.get(r.id) !== 1);
    if (unpostedRows.length === 0) {
      throw new Error("Semua data SP2D yang dipilih sudah berstatus posting (verif = 1).");
    }

    let postedCount = 0;

    for (const row of unpostedRows) {
      const noVoucher = `${(row.no_terima || row.no_sp2d).trim()}/2`;
      const tglVoucher = row.tgl_terima || row.tgl_sp2d;
      const jenisSp2d = (row.jenis_sp2d || "").toUpperCase();
      const keterangan = row.no_sp2d;
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

      if (jenisSp2d === "UP" || jenisSp2d === "TU" || jenisSp2d === "UP_KKPD") {
        const nilai = Number(row.nilai) || 0;
        detailLines.push(
          {
            tahunAnggaran: row.tahunAnggaran,
            no_voucher: noVoucher,
            tgl_voucher: tglVoucher,
            kd_skpd: row.kd_skpd,
            nm_skpd: row.nm_skpd,
            kd_unit: unitInfo.kd_unit,
            nm_unit: unitInfo.nm_unit,
            keterangan,
            kdsub_kegiatan: "",
            nm_sub_kegiatan: "",
            kd_rek6: "1.1.01.03.01.0001",
            nm_rek6: "Kas di Bendahara Pengeluaran",
            rk: "D",
            debet: nilai,
            kredit: 0,
            jns_transaksi: "SP2D",
            tabel: "2",
          },
          {
            tahunAnggaran: row.tahunAnggaran,
            no_voucher: noVoucher,
            tgl_voucher: tglVoucher,
            kd_skpd: row.kd_skpd,
            nm_skpd: row.nm_skpd,
            kd_unit: unitInfo.kd_unit,
            nm_unit: unitInfo.nm_unit,
            keterangan,
            kdsub_kegiatan: "",
            nm_sub_kegiatan: "",
            kd_rek6: "3.1.03.01.01.0001",
            nm_rek6: "RK PPKD",
            rk: "K",
            debet: 0,
            kredit: nilai,
            jns_transaksi: "SP2D",
            tabel: "2",
          }
        );
      } else {
        let sppId = row.sppId;
        if (!sppId && row.no_spp) {
          const spp = await tx.trhspp.findFirst({
            where: { tahunAnggaran: row.tahunAnggaran, no_spp: row.no_spp },
            select: { id: true },
          });
          sppId = spp?.id || null;
        }

        const sppDetails = sppId
          ? await tx.trdspp.findMany({
              where: { sppId },
              orderBy: { kd_rek6: "asc" },
            })
          : [];

        if (sppDetails.length === 0) {
          throw new Error(
            `Rincian SPP (trdspp) untuk SP2D ${row.no_sp2d} tidak ditemukan.`
          );
        }

        const rekPrefixes = Array.from(
          new Set(sppDetails.map((d) => d.kd_rek6.slice(0, 17).trim()))
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

        for (const d of sppDetails) {
          const nilaiSpp = Number(d.nilai) || 0;
          const kdSub = d.kd_sub_kegiatan || "";
          const nmSub = d.nm_sub_kegiatan || "";

          if (jenisSp2d === "LS_GAJI" || jenisSp2d === "LS_BARANG_JASA") {
            const rekKey = d.kd_rek6.slice(0, 17).trim();
            const srcRek = sourceRekMap.get(rekKey);
            const isAset =
              d.kd_rek6.slice(0, 12) === "5.1.02.01.01" ||
              d.kd_rek6.slice(0, 12) === "5.1.02.01.02" ||
              d.kd_rek6 === "5.1.02.01.03.0001" ||
              d.kd_rek6.slice(0, 3) === "5.2";

            const kdLoOrUtang = isAset ? srcRek?.map_utang?.trim() : srcRek?.map_lo?.trim();
            const loOrUtangRek = kdLoOrUtang ? targetRekMap.get(kdLoOrUtang) : undefined;

            if (!loOrUtangRek) {
              throw new Error(
                `Mapping rekening (${isAset ? "map_utang" : "map_lo"}) untuk ${d.kd_rek6} (${d.nm_rek6}) belum lengkap di Master Rekening.`
              );
            }

            // Jurnal LO: D (Utang/Beban), K (RK PPKD)
            detailLines.push(
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: loOrUtangRek.kd_rek6,
                nm_rek6: loOrUtangRek.nm_rek6,
                rk: "D",
                debet: nilaiSpp,
                kredit: 0,
                jns_transaksi: "SP2D",
                tabel: "2",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: "3.1.03.01.01.0001",
                nm_rek6: "RK PPKD",
                rk: "K",
                debet: 0,
                kredit: nilaiSpp,
                jns_transaksi: "SP2D",
                tabel: "2",
              }
            );

            // Jurnal LRA: D (Belanja), K (Estimasi Perubahan SAL)
            detailLines.push(
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: d.kd_rek6,
                nm_rek6: d.nm_rek6,
                rk: "D",
                debet: nilaiSpp,
                kredit: 0,
                jns_transaksi: "SP2D",
                tabel: "2",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: "3.1.02.05.01.0001",
                nm_rek6: "Estimasi Perubahan SAL",
                rk: "K",
                debet: 0,
                kredit: nilaiSpp,
                jns_transaksi: "SP2D",
                tabel: "2",
              }
            );
          } else {
            // GU, GU_KKPD, TU_NIHIL, GU_NIHIL -> LRA: D (Belanja), K (Estimasi Perubahan SAL)
            detailLines.push(
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: d.kd_rek6,
                nm_rek6: d.nm_rek6,
                rk: "D",
                debet: nilaiSpp,
                kredit: 0,
                jns_transaksi: "SP2D",
                tabel: "2",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: tglVoucher,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: "3.1.02.05.01.0001",
                nm_rek6: "Estimasi Perubahan SAL",
                rk: "K",
                debet: 0,
                kredit: nilaiSpp,
                jns_transaksi: "SP2D",
                tabel: "2",
              }
            );
          }
        }
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
          tgl_voucher: tglVoucher,
          kd_skpd: row.kd_skpd,
          nm_skpd: row.nm_skpd,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          keterangan,
          total_debet: totalDebet,
          total_kredit: totalKredit,
          jns_transaksi: "SP2D",
          tabel: "2",
          details: {
            create: detailLines,
          },
        },
      });

      await tx.$executeRaw`
        UPDATE trhsp2d SET verif = 1 WHERE id = ${row.id}
      `;

      postedCount += 1;
    }

    return { postedCount };
  });
}

export async function unpostJurnalSp2d(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "sp2d")) {
    throw new Error("Akses ditolak untuk Batal Posting Jurnal SP2D.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data SP2D untuk dibatalkan postingnya.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds } };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const allRows = await tx.trhsp2d.findMany({ where });
    if (allRows.length === 0) {
      throw new Error("Data SP2D tidak ditemukan.");
    }
    const allIds = allRows.map((r) => r.id);
    const verifRows = await tx.$queryRaw<{ id: string; verif: number }[]>`
      SELECT id, verif FROM trhsp2d WHERE id = ANY(${allIds}::text[])
    `;
    const verifMap = new Map(verifRows.map((v) => [v.id, Number(v.verif) || 0]));
    const rows = allRows.filter((r) => verifMap.get(r.id) === 1);

    if (rows.length === 0) {
      throw new Error("Tidak ada data SP2D berstatus sudah posting yang dipilih.");
    }

    const noVouchers = rows.map((r) => `${(r.no_terima || r.no_sp2d).trim()}/2`);
    await tx.trhmaping.deleteMany({
      where: { no_voucher: { in: noVouchers } },
    });

    const unpostIds = rows.map((r) => r.id);
    await tx.$executeRaw`
      UPDATE trhsp2d SET verif = 0 WHERE id = ANY(${unpostIds}::text[])
    `;

    return { unpostedCount: rows.length };
  });
}
