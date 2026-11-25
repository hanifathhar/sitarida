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

export async function listSumberJurnalPenerimaan(
  params: ListSumberParams
): Promise<SumberJurnalItem[]> {
  const { tahunAnggaran, kd_skpd, kd_unit, startDate, endDate } = params;
  const where: any = {
    tahunAnggaran,
    kd_skpd,
    status_validasi: "TERVALIDASI",
  };
  if (kd_unit) where.kd_unit = kd_unit;
  if (startDate || endDate) {
    where.tgl_terima = {};
    if (startDate) where.tgl_terima.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) where.tgl_terima.lte = new Date(`${endDate}T23:59:59.999Z`);
  }

  const rows = await prisma.tblPenerimaan.findMany({
    where,
    orderBy: [{ tgl_terima: "desc" }, { no_terima: "desc" }],
  });

  return rows.map((r: any) => ({
    id: r.id,
    nomor: r.no_terima,
    tanggal: r.tgl_terima.toISOString().split("T")[0],
    kd_skpd: r.kd_skpd,
    nm_skpd: r.nm_skpd || r.kd_skpd,
    kd_unit: r.kd_unit || null,
    nm_unit: r.nm_unit || null,
    uraian: r.keterangan || r.company || r.nm_rek6,
    rekening: `${r.kd_rek6} - ${r.nm_rek6}`,
    jenisLabel: r.jns_pajak || "Penerimaan",
    nilai: Number(r.nilai) || 0,
    statusSumber:
      r.status_validasi === "TERVALIDASI"
        ? "Tervalidasi"
        : r.verif === 1
          ? "Sudah Posting"
          : "Draft",
    statusPosting: r.verif === 1 ? "SUDAH" : "BELUM",
  }));
}

export async function postJurnalPenerimaan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penerimaan")) {
    throw new Error("Akses ditolak untuk Posting Jurnal Penerimaan.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penerimaan untuk diposting.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds } };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.tblPenerimaan.findMany({
      where,
      orderBy: [{ tgl_terima: "asc" }, { no_terima: "asc" }],
    });

    if (rows.length === 0) {
      throw new Error("Data penerimaan tidak ditemukan.");
    }

    const unvalidated = rows.filter((r) => r.status_validasi !== "TERVALIDASI");
    if (unvalidated.length > 0) {
      throw new Error(
        `Terdapat ${unvalidated.length} data penerimaan yang belum divalidasi. Hanya data penerimaan berstatus TERVALIDASI yang dapat diposting.`
      );
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
      const isPiutangGroup =
        row.kd_rek6.startsWith("4.1.01") || row.kd_rek6.startsWith("4.1.02");

      let kreditLoRek: { kd_rek6: string; nm_rek6: string } | undefined;
      if (isPiutangGroup) {
        const kdPiutang = srcRek?.map_utang?.trim();
        kreditLoRek = kdPiutang ? targetRekMap.get(kdPiutang) : undefined;
        if (!kreditLoRek) {
          throw new Error(
            `Mapping rekening piutang (map_utang) untuk ${row.kd_rek6} (${row.nm_rek6}) belum lengkap di Master Rekening.`
          );
        }
      } else {
        const kdLo = srcRek?.map_lo?.trim();
        kreditLoRek = kdLo ? targetRekMap.get(kdLo) : undefined;
        if (!kreditLoRek) {
          throw new Error(
            `Mapping rekening Pendapatan-LO (map_lo) untuk ${row.kd_rek6} (${row.nm_rek6}) belum lengkap di Master Rekening.`
          );
        }
      }

      const noVoucher = `${row.no_terima.trim()}/4`;
      const keterangan = row.keterangan || row.company || row.nm_rek6;
      const kdSub = row.kd_sub_kegiatan || "";
      const nmSub = row.nm_sub_kegiatan || "";
      const totalPair = Number(row.nilai) * 2;
      const unitInfo = await resolveUnitInfo(tx, row);

      await tx.trhmaping.deleteMany({
        where: { no_voucher: { in: [noVoucher, `${(row.no_bukti_kasin || row.no_terima).trim()}/5`] } },
      });

      await tx.trhmaping.create({
        data: {
          tahunAnggaran: row.tahunAnggaran,
          no_voucher: noVoucher,
          tgl_voucher: row.tgl_terima,
          kd_skpd: row.kd_skpd,
          nm_skpd: row.nm_skpd,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          keterangan,
          total_debet: totalPair,
          total_kredit: totalPair,
          jns_transaksi: "PENERIMAAN",
          tabel: "4",
          details: {
            create: [
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_terima,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: "1.1.01.02.01.0001",
                nm_rek6: "Kas di Bendahara Penerimaan",
                rk: "D",
                debet: row.nilai,
                kredit: 0,
                jns_transaksi: "PENERIMAAN",
                tabel: "4",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_terima,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: kreditLoRek.kd_rek6,
                nm_rek6: kreditLoRek.nm_rek6,
                rk: "K",
                debet: 0,
                kredit: row.nilai,
                jns_transaksi: "PENERIMAAN",
                tabel: "4",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_terima,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: "3.1.02.05.01.0001",
                nm_rek6: "Estimasi Perubahan SAL",
                rk: "D",
                debet: row.nilai,
                kredit: 0,
                jns_transaksi: "PENERIMAAN",
                tabel: "4",
              },
              {
                tahunAnggaran: row.tahunAnggaran,
                no_voucher: noVoucher,
                tgl_voucher: row.tgl_terima,
                kd_skpd: row.kd_skpd,
                nm_skpd: row.nm_skpd,
                kd_unit: unitInfo.kd_unit,
                nm_unit: unitInfo.nm_unit,
                keterangan,
                kdsub_kegiatan: kdSub,
                nm_sub_kegiatan: nmSub,
                kd_rek6: row.kd_rek6,
                nm_rek6: row.nm_rek6,
                rk: "K",
                debet: 0,
                kredit: row.nilai,
                jns_transaksi: "PENERIMAAN",
                tabel: "4",
              },
            ],
          },
        },
      });

      // Jurnal Penyetoran dari trhkasin & trdkasin sesuai nomor STS
      const stsNo = (row.no_bukti_kasin || row.no_terima).trim();
      const kasin = await tx.trhkasin.findFirst({
        where: {
          tahunAnggaran: row.tahunAnggaran,
          OR: [{ no_sts: stsNo }, { no_bukti: stsNo }],
        },
        include: { rincianRekening: true },
      });

      if (kasin) {
        const noVoucherSetor = `${(kasin.no_sts || kasin.no_bukti).trim()}/5`;
        const tglSetor = kasin.tgl_sts || kasin.tgl_bukti;
        const ketSetor = kasin.uraian || kasin.keterangan || keterangan;
        const unitSetor = await resolveUnitInfo(tx, kasin);

        const rincianSetor =
          kasin.rincianRekening.length > 0
            ? kasin.rincianRekening
            : [
                {
                  kd_sub_kegiatan: kdSub,
                  nm_sub_kegiatan: nmSub,
                  nilai: kasin.nilai,
                },
              ];

        const detailSetor = rincianSetor.flatMap((d) => [
          {
            tahunAnggaran: kasin.tahunAnggaran,
            no_voucher: noVoucherSetor,
            tgl_voucher: tglSetor,
            kd_skpd: kasin.kd_skpd,
            nm_skpd: kasin.nm_skpd,
            kd_unit: unitSetor.kd_unit,
            nm_unit: unitSetor.nm_unit,
            keterangan: ketSetor,
            kdsub_kegiatan: d.kd_sub_kegiatan || "",
            nm_sub_kegiatan: d.nm_sub_kegiatan || "",
            kd_rek6: "3.1.03.01.01.0001",
            nm_rek6: "RK PPKD",
            rk: "D" as const,
            debet: d.nilai,
            kredit: 0,
            jns_transaksi: "PENYETORAN",
            tabel: "5",
          },
          {
            tahunAnggaran: kasin.tahunAnggaran,
            no_voucher: noVoucherSetor,
            tgl_voucher: tglSetor,
            kd_skpd: kasin.kd_skpd,
            nm_skpd: kasin.nm_skpd,
            kd_unit: unitSetor.kd_unit,
            nm_unit: unitSetor.nm_unit,
            keterangan: ketSetor,
            kdsub_kegiatan: d.kd_sub_kegiatan || "",
            nm_sub_kegiatan: d.nm_sub_kegiatan || "",
            kd_rek6: "1.1.01.02.01.0001",
            nm_rek6: "Kas di Bendahara Penerimaan",
            rk: "K" as const,
            debet: 0,
            kredit: d.nilai,
            jns_transaksi: "PENYETORAN",
            tabel: "5",
          },
        ]);

        const totalSetor = rincianSetor.reduce((s, d) => s + Number(d.nilai || 0), 0);

        await tx.trhmaping.deleteMany({
          where: { no_voucher: noVoucherSetor },
        });

        await tx.trhmaping.create({
          data: {
            tahunAnggaran: kasin.tahunAnggaran,
            no_voucher: noVoucherSetor,
            tgl_voucher: tglSetor,
            kd_skpd: kasin.kd_skpd,
            nm_skpd: kasin.nm_skpd,
            kd_unit: unitSetor.kd_unit,
            nm_unit: unitSetor.nm_unit,
            keterangan: ketSetor,
            total_debet: totalSetor,
            total_kredit: totalSetor,
            jns_transaksi: "PENYETORAN",
            tabel: "5",
            details: {
              create: detailSetor,
            },
          },
        });
      }

      await tx.tblPenerimaan.update({
        where: { id: row.id },
        data: { verif: 1 },
      });

      postedCount += 1;
    }

    return { postedCount };
  });
}

export async function unpostJurnalPenerimaan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penerimaan")) {
    throw new Error("Akses ditolak untuk Batal Posting Jurnal Penerimaan.");
  }

  const cleanIds = sanitizeIds(ids);
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penerimaan untuk dibatalkan postingnya.");
  }

  const restrictedSkpd = await getRestrictedSkpd(session);

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds }, verif: 1 };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.tblPenerimaan.findMany({ where });
    if (rows.length === 0) {
      throw new Error("Tidak ada data berstatus sudah posting yang dipilih.");
    }

    const noVouchers = rows.flatMap((r) => {
      const stsNo = (r.no_bukti_kasin || r.no_terima).trim();
      return [`${r.no_terima.trim()}/4`, `${stsNo}/5`];
    });
    await tx.trhmaping.deleteMany({
      where: { no_voucher: { in: noVouchers } },
    });

    await tx.tblPenerimaan.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { verif: 0 },
    });

    return { unpostedCount: rows.length };
  });
}
