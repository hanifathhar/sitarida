import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export type JenisJurnal =
  | "penetapan"
  | "penerimaan"
  | "sp2d"
  | "spj"
  | "setor-sisa-kas";

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

export async function listSumberJurnal(
  session: SessionPayload,
  params: {
    jenis: JenisJurnal;
    tahunAnggaran: number;
    kd_skpd: string;
    kd_unit?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }
) {
  const { jenis, tahunAnggaran, kd_skpd, kd_unit, startDate, endDate, search } = params;

  const isCross = isCrossOpdAkuntansi(session);
  let targetSkpd = kd_skpd;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    if (myOpd?.kd_skpd) targetSkpd = myOpd.kd_skpd;
  }

  let items: SumberJurnalItem[] = [];

  if (jenis === "penetapan") {
    const where: any = { tahunAnggaran, kd_skpd: targetSkpd };
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
    items = rows.map((r: any) => ({
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
  } else if (jenis === "penerimaan") {
    const where: any = {
      tahunAnggaran,
      kd_skpd: targetSkpd,
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
    items = rows.map((r: any) => ({
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
      statusSumber: r.status_validasi === "TERVALIDASI" ? "Tervalidasi" : r.verif === 1 ? "Sudah Posting" : "Draft",
      statusPosting: r.verif === 1 ? "SUDAH" : "BELUM",
    }));
  } else if (jenis === "sp2d") {
    const where: any = { tahunAnggaran, kd_skpd: targetSkpd };
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
    items = rows.map((r: any) => ({
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
      statusPosting: "BELUM",
    }));
  } else if (jenis === "spj") {
    const where: any = { tahunAnggaran, kd_skpd: targetSkpd };
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
    items = rows.map((r: any) => {
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
        statusPosting: "BELUM",
      };
    });
  } else if (jenis === "setor-sisa-kas") {
    const where: any = {
      tahunAnggaran,
      kd_skpd: targetSkpd,
      sumber_dana: { in: ["SISA_KAS_UP_GU_TU", "PENGEMBALIAN_BELANJA"] },
    };
    if (kd_unit) where.kd_unit = kd_unit;
    if (startDate || endDate) {
      where.tgl_bukti = {};
      if (startDate) where.tgl_bukti.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.tgl_bukti.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    const rows = await prisma.trhkasin.findMany({
      where,
      include: { rincianRekening: { take: 3 } },
      orderBy: [{ tgl_bukti: "desc" }, { no_bukti: "desc" }],
    });
    items = rows.map((r: any) => {
      const firstRek = r.rincianRekening?.[0];
      const rekText = firstRek
        ? `${firstRek.kd_rek6} - ${firstRek.nm_rek6}${r.rincianRekening.length > 1 ? ` (+${r.rincianRekening.length - 1})` : ""}`
        : "-";
      return {
        id: r.id,
        nomor: r.no_sts || r.no_bukti,
        tanggal: r.tgl_bukti.toISOString().split("T")[0],
        kd_skpd: r.kd_skpd,
        nm_skpd: r.nm_skpd,
        kd_unit: r.kd_unit || null,
        nm_unit: r.nm_unit || null,
        uraian: r.uraian,
        rekening: rekText,
        jenisLabel: (r.sumber_dana || "").replace(/_/g, " "),
        nilai: Number(r.nilai) || 0,
        statusSumber: r.status,
        statusPosting: "BELUM",
      };
    });
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.nomor.toLowerCase().includes(q) ||
        i.uraian.toLowerCase().includes(q) ||
        i.rekening.toLowerCase().includes(q) ||
        i.jenisLabel.toLowerCase().includes(q)
    );
  }

  const totalNilai = items.reduce((s, r) => s + r.nilai, 0);
  const totalSudahPosting = items.filter((r) => r.statusPosting === "SUDAH").length;
  const totalBelumPosting = items.length - totalSudahPosting;

  return {
    items,
    summary: {
      totalDokumen: items.length,
      totalBelumPosting,
      totalSudahPosting,
      totalNilai,
    },
  };
}

export async function postJurnalPenetapan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penetapan")) {
    throw new Error("Akses ditolak untuk Posting Jurnal Penetapan.");
  }

  const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim())));
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penetapan untuk diposting.");
  }

  const isCross = isCrossOpdAkuntansi(session);
  let restrictedSkpd: string | null = null;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    restrictedSkpd = myOpd?.kd_skpd || null;
  }

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

      // Hapus jurnal lama dengan no_voucher yang sama jika ada sisa data sebelumnya
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
          kd_unit: row.kd_unit,
          nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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

  const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim())));
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penetapan untuk dibatalkan postingnya.");
  }

  const isCross = isCrossOpdAkuntansi(session);
  let restrictedSkpd: string | null = null;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    restrictedSkpd = myOpd?.kd_skpd || null;
  }

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

export async function postJurnalPenerimaan(
  session: SessionPayload,
  ids: string[]
) {
  if (!isAkuntansiAuthorized(session, "penerimaan")) {
    throw new Error("Akses ditolak untuk Posting Jurnal Penerimaan.");
  }

  const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim())));
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penerimaan untuk diposting.");
  }

  const isCross = isCrossOpdAkuntansi(session);
  let restrictedSkpd: string | null = null;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    restrictedSkpd = myOpd?.kd_skpd || null;
  }

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

      await tx.trhmaping.deleteMany({
        where: { no_voucher: noVoucher },
      });

      await tx.trhmaping.create({
        data: {
          tahunAnggaran: row.tahunAnggaran,
          no_voucher: noVoucher,
          tgl_voucher: row.tgl_terima,
          kd_skpd: row.kd_skpd,
          nm_skpd: row.nm_skpd,
          kd_unit: row.kd_unit,
          nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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
                kd_unit: row.kd_unit,
                nm_unit: row.nm_unit,
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

  const cleanIds = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim())));
  if (cleanIds.length === 0) {
    throw new Error("Pilih minimal satu data penerimaan untuk dibatalkan postingnya.");
  }

  const isCross = isCrossOpdAkuntansi(session);
  let restrictedSkpd: string | null = null;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    restrictedSkpd = myOpd?.kd_skpd || null;
  }

  return prisma.$transaction(async (tx) => {
    const where: any = { id: { in: cleanIds }, verif: 1 };
    if (restrictedSkpd) where.kd_skpd = restrictedSkpd;

    const rows = await tx.tblPenerimaan.findMany({ where });
    if (rows.length === 0) {
      throw new Error("Tidak ada data berstatus sudah posting yang dipilih.");
    }

    const noVouchers = rows.map((r) => `${r.no_terima.trim()}/4`);
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

export async function getDetailJurnal(
  session: SessionPayload,
  params: {
    jenis: JenisJurnal;
    nomor: string;
  }
) {
  if (!isAkuntansiAuthorized(session, params.jenis)) {
    throw new Error("Akses ditolak untuk melihat detail jurnal.");
  }

  const isCross = isCrossOpdAkuntansi(session);
  let restrictedSkpd: string | null = null;
  if (!isCross && session.opdId) {
    const myOpd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    restrictedSkpd = myOpd?.kd_skpd || null;
  }

  const noVoucher =
    params.jenis === "penetapan"
      ? `${params.nomor.trim()}/10`
      : params.jenis === "penerimaan"
        ? `${params.nomor.trim()}/4`
        : params.nomor.trim();

  const header = await prisma.trhmaping.findFirst({
    where: {
      no_voucher: noVoucher,
      ...(restrictedSkpd ? { kd_skpd: restrictedSkpd } : {}),
    },
    include: {
      details: {
        orderBy: [{ rk: "asc" }, { kd_rek6: "asc" }],
      },
    },
  });

  if (!header) {
    return null;
  }

  return {
    id: header.id,
    no_voucher: header.no_voucher,
    tgl_voucher: header.tgl_voucher.toISOString().split("T")[0],
    kd_skpd: header.kd_skpd,
    nm_skpd: header.nm_skpd || header.kd_skpd,
    kd_unit: header.kd_unit || null,
    nm_unit: header.nm_unit || null,
    keterangan: header.keterangan || "-",
    total_debet: Number(header.total_debet) || 0,
    total_kredit: Number(header.total_kredit) || 0,
    jns_transaksi: header.jns_transaksi || "-",
    tabel: header.tabel || "-",
    details: header.details.map((d) => ({
      id: d.id,
      kdsub_kegiatan: d.kdsub_kegiatan || "-",
      nm_sub_kegiatan: d.nm_sub_kegiatan || "-",
      kd_rek6: d.kd_rek6,
      nm_rek6: d.nm_rek6,
      rk: d.rk || "-",
      debet: Number(d.debet) || 0,
      kredit: Number(d.kredit) || 0,
      keterangan: d.keterangan || "-",
    })),
  };
}
