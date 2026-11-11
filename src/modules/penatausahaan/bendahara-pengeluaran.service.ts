import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SessionPayload } from "@/lib/session";

/**
 * Validasi otorisasi untuk Modul Bendahara Pengeluaran
 * Peran: BUD (kode 1), Bendahara Pengeluaran (kode 10), dan Superadmin (kode 0 / SUPERADMIN)
 */
export function isBendaharaAuthorized(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;
  if (session.roleKode === "1") return true; // BUD
  if (session.roleKode === "10") return true; // Bendahara Pengeluaran

  const perms = session.permissions || [];
  if (
    perms.includes("bendahara:read") ||
    perms.includes("bendahara:write") ||
    perms.includes("sp2d:read") ||
    perms.includes("spm:read") ||
    perms.includes("spp:read")
  ) {
    return true;
  }
  return false;
}

export const bendaharaPengeluaranService = {
  // ---------------------------------------------------------------------------
  // SCOPE DATA OPD & UNIT KERJA
  // ---------------------------------------------------------------------------
  async getScopeData(session: SessionPayload) {
    const isCrossOpd =
      session.roleKode === "0" ||
      session.roleKode === "1" ||
      session.roleKode === "SUPERADMIN";

    let opds: Array<{ id: string; kd_skpd: string; nm_skpd: string }> = [];
    let units: Array<{
      id: string;
      opdId: string;
      kd_unit: string;
      nm_unit: string;
    }> = [];

    if (isCrossOpd) {
      opds = await prisma.opd.findMany({
        where: { isActive: true },
        select: { id: true, kd_skpd: true, nm_skpd: true },
        orderBy: { kd_skpd: "asc" },
      });

      units = await prisma.unitKerja.findMany({
        where: { isActive: true },
        select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
        orderBy: { kd_unit: "asc" },
      });
    } else if (session.opdId) {
      opds = await prisma.opd.findMany({
        where: { id: session.opdId },
        select: { id: true, kd_skpd: true, nm_skpd: true },
      });

      units = await prisma.unitKerja.findMany({
        where: { opdId: session.opdId, isActive: true },
        select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
        orderBy: { kd_unit: "asc" },
      });
    }

    return {
      session: {
        userId: session.userId,
        namaLengkap: session.namaLengkap,
        roleKode: session.roleKode,
        isCrossOpd,
        opdId: session.opdId,
        unitKerjaId: session.unitKerjaId,
      },
      opds,
      units,
    };
  },

  // Helper: Dapatkan Nomor BKU Berikutnya yang Berurut dari trhsp2d & trhtransout
  async getNextBkuNumber(params: {
    tahunAnggaran: number;
    opdId: string;
    kdUnitOrSkpd?: string;
  }) {
    const { tahunAnggaran, opdId, kdUnitOrSkpd = "1.01.2.22.0.00.01.0000" } = params;

    // 1. Ambil semua no_terima dari trhsp2d pada tahun dan OPD ini
    const sp2dList = await prisma.trhsp2d.findMany({
      where: {
        tahunAnggaran,
        opdId,
        no_terima: { not: null },
      },
      select: { no_terima: true },
    });

    // 2. Ambil semua no_bukti dari trhtransout pada tahun dan OPD ini
    const transoutList = await prisma.trhtransout.findMany({
      where: {
        tahunAnggaran,
        opdId,
        no_bukti: { not: "" },
      },
      select: { no_bukti: true },
    });

    let maxSeq = 0;

    for (const item of sp2dList) {
      if (!item.no_terima) continue;
      const parts = item.no_terima.split("/");
      const num = parseInt(parts[0], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    for (const item of transoutList) {
      if (!item.no_bukti) continue;
      const parts = item.no_bukti.split("/");
      const num = parseInt(parts[0], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    const nextSeq = maxSeq + 1;
    const urut = String(nextSeq).padStart(5, "0");
    const unitPart = kdUnitOrSkpd.replace(/[^a-zA-Z0-9.-]/g, "");
    const generatedNoBku = `${urut}/${unitPart}/BKU/${tahunAnggaran}`;

    return { nextSeq, generatedNoBku };
  },

  // ---------------------------------------------------------------------------
  // 1. PEMBUKUAN SP2D (trhtransout & trdtransout)
  // ---------------------------------------------------------------------------
  async getPembukuanSp2dList(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
    statusPembukuan?: "SEMUA" | "SUDAH" | "BELUM";
    search?: string;
  }) {
    const andConditions: Prisma.Trhsp2dWhereInput[] = [
      { tahunAnggaran: params.tahunAnggaran },
      { status: "CAIR" },
    ];

    if (params.opdId && params.opdId !== "ALL") {
      andConditions.push({ opdId: params.opdId });
    }

    if (params.kd_unit && params.kd_unit !== "ALL") {
      andConditions.push({
        OR: [
          { kd_unit: params.kd_unit },
          { kd_unit: null },
          { kd_unit: "" },
        ],
      });
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      andConditions.push({
        OR: [
          { no_sp2d: { contains: q, mode: "insensitive" } },
          { no_spm: { contains: q, mode: "insensitive" } },
          { keperluan: { contains: q, mode: "insensitive" } },
          { nm_skpd: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const sp2dList = await prisma.trhsp2d.findMany({
      where: { AND: andConditions },
      include: {
        opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
        spp: {
          select: {
            rincian: true,
          },
        },
      },
      orderBy: [{ tgl_cair: "desc" }, { no_sp2d: "desc" }],
    });

    // Ambil daftar nomor SP2D yang sudah dibukukan di trhtransout (khusus LS)
    const transoutList = await prisma.trhtransout.findMany({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        no_sp2d: { in: sp2dList.map((s) => s.no_sp2d) },
      },
      select: {
        id: true,
        no_bukti: true,
        tgl_bukti: true,
        no_sp2d: true,
        total: true,
      },
    });

    const bookedMap = new Map<string, (typeof transoutList)[0]>();
    transoutList.forEach((t) => {
      if (t.no_sp2d) bookedMap.set(t.no_sp2d, t);
    });

    const result = sp2dList.map((s) => {
      const booked = bookedMap.get(s.no_sp2d);
      const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
        (s.jenis_sp2d || "").toUpperCase()
      );

      // Untuk UP, GU, TU: status dibukukan dilihat dari status_pembukuan pada trhsp2d atau no_terima
      // Untuk LS: dilihat dari keberadaan di trhtransout atau status_pembukuan
      const isDibukukan = isUpTuGu
        ? Boolean(s.status_pembukuan === "SUDAH_DIBUKUKAN" || s.no_terima)
        : Boolean(booked || s.status_pembukuan === "SUDAH_DIBUKUKAN" || s.no_terima);

      const pembukuanData = isUpTuGu
        ? (isDibukukan
            ? {
                id: s.id, // ID SP2D untuk pembatalan
                no_bukti: s.no_terima || "-",
                tgl_bukti: s.tgl_terima || s.tgl_cair || s.tgl_sp2d,
                total: Number(s.nilai) || 0,
              }
            : null)
        : (booked
            ? {
                id: booked.id,
                no_bukti: booked.no_bukti,
                tgl_bukti: booked.tgl_bukti,
                total: Number(booked.total) || 0,
              }
            : (isDibukukan
                ? {
                    id: s.id,
                    no_bukti: s.no_terima || "-",
                    tgl_bukti: s.tgl_terima || s.tgl_cair || s.tgl_sp2d,
                    total: Number(s.nilai) || 0,
                  }
                : null));

      return {
        id: s.id,
        no_sp2d: s.no_sp2d,
        tgl_sp2d: s.tgl_sp2d,
        tgl_cair: s.tgl_cair,
        tgl_terima: s.tgl_terima,
        no_terima: s.no_terima,
        status_pembukuan: s.status_pembukuan || (isDibukukan ? "SUDAH_DIBUKUKAN" : "BELUM_DIBUKUKAN"),
        no_spm: s.no_spm,
        kd_skpd: s.kd_skpd,
        nm_skpd: s.nm_skpd,
        opdId: s.opdId,
        kd_unit: s.kd_unit,
        nm_unit: s.nm_unit,
        jenis_sp2d: s.jenis_sp2d,
        keperluan: s.keperluan,
        nilai: Number(s.nilai) || 0,
        nilai_potongan: Number(s.nilai_potongan) || 0,
        nilai_bersih: Number(s.nilai_bersih) || 0,
        isDibukukan,
        isUpTuGu,
        pembukuan: pembukuanData,
        rincian: (s.spp?.rincian || []).map((r) => ({
          kd_sub_kegiatan: r.kd_sub_kegiatan,
          nm_sub_kegiatan: r.nm_sub_kegiatan,
          kd_rek6: r.kd_rek6,
          nm_rek6: r.nm_rek6,
          nilai: Number(r.nilai) || 0,
        })),
      };
    });

    if (params.statusPembukuan === "SUDAH") {
      return result.filter((r) => r.isDibukukan);
    }
    if (params.statusPembukuan === "BELUM") {
      return result.filter((r) => !r.isDibukukan);
    }

    return result;
  },

  async postPembukuanSp2d(payload: {
    sp2dId: string;
    no_bukti?: string;
    tgl_bukti?: string | Date;
    pay_type?: string;
    uraian?: string;
  }) {
    const sp2d = await prisma.trhsp2d.findUnique({
      where: { id: payload.sp2dId },
      include: {
        opd: true,
        spp: {
          include: {
            rincian: true,
          },
        },
      },
    });

    if (!sp2d) {
      throw new Error("Dokumen SP2D tidak ditemukan.");
    }

    const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
      (sp2d.jenis_sp2d || "").toUpperCase()
    );

    // Cek apakah sudah pernah dibukukan
    if (isUpTuGu) {
      if (sp2d.status_pembukuan === "SUDAH_DIBUKUKAN" || sp2d.no_terima) {
        throw new Error(
          `SP2D ${sp2d.no_sp2d} (${sp2d.jenis_sp2d}) sudah pernah dibukukan dengan No. BKU ${sp2d.no_terima}.`
        );
      }
    } else {
      const existing = await prisma.trhtransout.findFirst({
        where: {
          tahunAnggaran: sp2d.tahunAnggaran,
          no_sp2d: sp2d.no_sp2d,
        },
      });

      if (existing) {
        throw new Error(
          `SP2D ${sp2d.no_sp2d} sudah pernah dibukukan dengan No. Bukti ${existing.no_bukti}.`
        );
      }
    }

    // HITUNG NOMOR BKU BERIKUTNYA SECARA BERURUT DARI NO PENERIMAAN TRHSP2D & NO BUKTI TRHTRANSOUT
    let noBukti = payload.no_bukti?.trim();
    if (!noBukti) {
      const { generatedNoBku } = await this.getNextBkuNumber({
        tahunAnggaran: sp2d.tahunAnggaran,
        opdId: sp2d.opdId,
        kdUnitOrSkpd: sp2d.kd_unit || sp2d.kd_skpd,
      });
      noBukti = generatedNoBku;
    }

    const tglBukti = payload.tgl_bukti
      ? new Date(payload.tgl_bukti)
      : sp2d.tgl_cair || sp2d.tgl_sp2d;

    // ATURAN BARU:
    // Jika SP2D jenis UP, TU, GU: TIDAK LAGI DI-INSERT KE TABEL trhtransout & trdtransout!
    // Hanya dicatat dan diupdate ke tabel trhsp2d (tgl_terima, no_terima, status_pembukuan)
    if (isUpTuGu) {
      const updatedSp2d = await prisma.trhsp2d.update({
        where: { id: sp2d.id },
        data: {
          tgl_terima: tglBukti,
          no_terima: noBukti,
          status_pembukuan: "SUDAH_DIBUKUKAN",
        },
      });

      return {
        id: updatedSp2d.id,
        no_bukti: noBukti,
        tgl_bukti: tglBukti,
        isUpTuGu: true,
        message: `SP2D ${sp2d.jenis_sp2d} berhasil dibukukan sebagai Penerimaan BKU dengan No. ${noBukti}.`,
      };
    }

    // SELEBIHNYA (LS_GAJI, LS_BARJAS, dsb): TETAP DI-INSERT KE TABEL trhtransout & trdtransout
    const rincianList = sp2d.spp?.rincian || [];
    const totalNilai = rincianList.reduce(
      (sum, r) => sum + (Number(r.nilai) || 0),
      0
    );

    const transout = await prisma.trhtransout.create({
      data: {
        tahunAnggaran: sp2d.tahunAnggaran,
        no_bukti: noBukti,
        tgl_bukti: tglBukti,
        no_sp2d: sp2d.no_sp2d,
        tgl_sp2d: sp2d.tgl_sp2d,
        sp2dId: sp2d.id,
        kd_skpd: sp2d.kd_skpd,
        nm_skpd: sp2d.nm_skpd,
        opdId: sp2d.opdId,
        kd_unit: sp2d.kd_unit,
        nm_unit: sp2d.nm_unit,
        unitKerjaId: sp2d.unitKerjaId,
        sumber_dana: sp2d.jenis_sp2d,
        jenis_beban: sp2d.jenis_sp2d,
        pay_type: payload.pay_type || "BANK",
        uraian: payload.uraian || sp2d.keperluan,
        total: new Prisma.Decimal(totalNilai > 0 ? totalNilai : Number(sp2d.nilai)),
        status: "POSTING",
        rincian: {
          create:
            rincianList.length > 0
              ? rincianList.map((r) => ({
                  no_bukti: noBukti,
                  kd_sub_kegiatan: r.kd_sub_kegiatan,
                  nm_sub_kegiatan: r.nm_sub_kegiatan,
                  kd_rek6: r.kd_rek6,
                  nm_rek6: r.nm_rek6,
                  nilai: new Prisma.Decimal(Number(r.nilai) || 0),
                  sumber_dana: sp2d.jenis_sp2d,
                  keterangan: r.nm_rek6,
                }))
              : [
                  {
                    no_bukti: noBukti,
                    kd_sub_kegiatan: null,
                    nm_sub_kegiatan: null,
                    kd_rek6: "5.1.02.99.99.9999",
                    nm_rek6: sp2d.keperluan,
                    nilai: sp2d.nilai,
                    sumber_dana: sp2d.jenis_sp2d,
                    keterangan: sp2d.keperluan,
                  },
                ],
        },
      },
      include: {
        rincian: true,
      },
    });

    // Update status pembukuan & tanggal penerimaan pada tabel trhsp2d
    await prisma.trhsp2d.update({
      where: { id: sp2d.id },
      data: {
        tgl_terima: tglBukti,
        no_terima: noBukti,
        status_pembukuan: "SUDAH_DIBUKUKAN",
      },
    });

    return transout;
  },

  async deletePembukuan(targetId: string) {
    // 1. Cek apakah targetId adalah ID dari trhtransout (untuk LS)
    const transout = await prisma.trhtransout.findUnique({
      where: { id: targetId },
      select: { id: true, sp2dId: true, no_sp2d: true },
    });

    if (transout) {
      if (transout.sp2dId) {
        await prisma.trhsp2d.update({
          where: { id: transout.sp2dId },
          data: {
            tgl_terima: null,
            no_terima: null,
            status_pembukuan: "BELUM_DIBUKUKAN",
          },
        });
      } else if (transout.no_sp2d) {
        await prisma.trhsp2d.updateMany({
          where: { no_sp2d: transout.no_sp2d },
          data: {
            tgl_terima: null,
            no_terima: null,
            status_pembukuan: "BELUM_DIBUKUKAN",
          },
        });
      }

      return await prisma.trhtransout.delete({
        where: { id: targetId },
      });
    }

    // 2. Jika bukan di trhtransout, cek apakah targetId adalah ID dari trhsp2d (untuk UP/GU/TU)
    const sp2d = await prisma.trhsp2d.findUnique({
      where: { id: targetId },
      select: { id: true, no_sp2d: true },
    });

    if (sp2d) {
      await prisma.trhtransout.deleteMany({
        where: {
          OR: [{ sp2dId: sp2d.id }, { no_sp2d: sp2d.no_sp2d }],
        },
      });

      return await prisma.trhsp2d.update({
        where: { id: sp2d.id },
        data: {
          tgl_terima: null,
          no_terima: null,
          status_pembukuan: "BELUM_DIBUKUKAN",
        },
      });
    }

    throw new Error("Dokumen pembukuan tidak ditemukan.");
  },

  // ---------------------------------------------------------------------------
  // 2 & 3. VALIDASI & PEMBUKUAN SPJ
  // ---------------------------------------------------------------------------
  async getSpjList(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
    status?: string;
  }) {
    // Ambil data SPJ dari tabel transout atau LPJ
    const where: Prisma.TrhtransoutWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      no_spj: { not: null },
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }

    const data = await prisma.trhtransout.findMany({
      where,
      include: {
        rincian: true,
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_bukti: "desc" },
    });

    return data;
  },

  async savePembukuanSpj(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_spj: string;
    tgl_spj: string | Date;
    uraian: string;
    total: number;
    rincian: Array<{
      kd_sub_kegiatan?: string;
      nm_sub_kegiatan?: string;
      kd_rek6: string;
      nm_rek6: string;
      nilai: number;
      keterangan?: string;
    }>;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    const count = await prisma.trhtransout.count({
      where: { tahunAnggaran: payload.tahunAnggaran, opdId: opd.id },
    });
    const urut = String(count + 1).padStart(5, "0");
    const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
    const noBukti = `${urut}/${unitPart}/SPJ-BUKU/${payload.tahunAnggaran}`;

    return await prisma.trhtransout.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_bukti: noBukti,
        tgl_bukti: new Date(payload.tgl_spj),
        no_spj: payload.no_spj,
        tgl_spj: new Date(payload.tgl_spj),
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        sumber_dana: "SPJ",
        jenis_beban: "GU",
        pay_type: "BANK",
        uraian: payload.uraian,
        total: new Prisma.Decimal(payload.total),
        status: "POSTING",
        rincian: {
          create: payload.rincian.map((r) => ({
            no_bukti: noBukti,
            kd_sub_kegiatan: r.kd_sub_kegiatan,
            nm_sub_kegiatan: r.nm_sub_kegiatan,
            kd_rek6: r.kd_rek6,
            nm_rek6: r.nm_rek6,
            nilai: new Prisma.Decimal(r.nilai),
            keterangan: r.keterangan || payload.uraian,
          })),
        },
      },
    });
  },

  // ---------------------------------------------------------------------------
  // 4. PENERIMAAN POTONGAN (trhtrmpot & trdtrmpot)
  // ---------------------------------------------------------------------------
  async getPenerimaanPotonganList(params: {
    tahunAnggaran: number;
    opdId?: string;
  }) {
    const where: Prisma.TrhtrmpotWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }

    return await prisma.trhtrmpot.findMany({
      where,
      include: {
        rincian: true,
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_bukti: "desc" },
    });
  },

  async savePenerimaanPotongan(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_bukti?: string;
    tgl_bukti: string | Date;
    no_sp2d?: string;
    uraian: string;
    rincian: Array<{
      kd_rek6: string;
      nm_rek6: string;
      id_billing?: string;
      nilai: number;
      keterangan?: string;
    }>;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    let noBukti = payload.no_bukti?.trim();
    if (!noBukti) {
      const count = await prisma.trhtrmpot.count({
        where: { tahunAnggaran: payload.tahunAnggaran, opdId: opd.id },
      });
      const urut = String(count + 1).padStart(5, "0");
      const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
      noBukti = `${urut}/${unitPart}/TRM-POT/${payload.tahunAnggaran}`;
    }

    const total = payload.rincian.reduce(
      (sum, r) => sum + (Number(r.nilai) || 0),
      0
    );

    return await prisma.trhtrmpot.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_bukti: noBukti,
        tgl_bukti: new Date(payload.tgl_bukti),
        no_sp2d: payload.no_sp2d,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        uraian: payload.uraian,
        total: new Prisma.Decimal(total),
        status: "TERIMA",
        rincian: {
          create: payload.rincian.map((r) => ({
            no_bukti: noBukti,
            kd_rek6: r.kd_rek6,
            nm_rek6: r.nm_rek6,
            id_billing: r.id_billing,
            nilai: new Prisma.Decimal(r.nilai),
            keterangan: r.keterangan,
          })),
        },
      },
      include: { rincian: true },
    });
  },

  // ---------------------------------------------------------------------------
  // 5. PENYETORAN POTONGAN (trhstrpot & trdstrpot)
  // ---------------------------------------------------------------------------
  async getPenyetoranPotonganList(params: {
    tahunAnggaran: number;
    opdId?: string;
  }) {
    const where: Prisma.TrhstrpotWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }

    return await prisma.trhstrpot.findMany({
      where,
      include: {
        rincian: true,
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_bukti: "desc" },
    });
  },

  async savePenyetoranPotongan(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_bukti?: string;
    tgl_bukti: string | Date;
    no_trmpot?: string;
    uraian: string;
    rincian: Array<{
      kd_rek6: string;
      nm_rek6: string;
      id_billing?: string;
      ntpn?: string;
      nilai: number;
      keterangan?: string;
    }>;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    let noBukti = payload.no_bukti?.trim();
    if (!noBukti) {
      const count = await prisma.trhstrpot.count({
        where: { tahunAnggaran: payload.tahunAnggaran, opdId: opd.id },
      });
      const urut = String(count + 1).padStart(5, "0");
      const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
      noBukti = `${urut}/${unitPart}/STR-POT/${payload.tahunAnggaran}`;
    }

    const total = payload.rincian.reduce(
      (sum, r) => sum + (Number(r.nilai) || 0),
      0
    );

    return await prisma.trhstrpot.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_bukti: noBukti,
        tgl_bukti: new Date(payload.tgl_bukti),
        no_trmpot: payload.no_trmpot,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        uraian: payload.uraian,
        total: new Prisma.Decimal(total),
        status: "SETOR",
        rincian: {
          create: payload.rincian.map((r) => ({
            no_bukti: noBukti,
            kd_rek6: r.kd_rek6,
            nm_rek6: r.nm_rek6,
            id_billing: r.id_billing,
            ntpn: r.ntpn,
            nilai: new Prisma.Decimal(r.nilai),
            keterangan: r.keterangan,
          })),
        },
      },
      include: { rincian: true },
    });
  },

  // ---------------------------------------------------------------------------
  // 6 & 7. SETOR SISA KAS (UP/GU/TU) & PENGEMBALIAN
  // ---------------------------------------------------------------------------
  async getSetorSisaList(params: {
    tahunAnggaran: number;
    opdId?: string;
    tipe?: "SISA_KAS" | "PENGEMBALIAN";
  }) {
    const where: Prisma.TrhkasinWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }
    if (params.tipe === "SISA_KAS") {
      where.sumber_dana = "SISA_KAS_UP_GU_TU";
    } else if (params.tipe === "PENGEMBALIAN") {
      where.sumber_dana = "PENGEMBALIAN_BELANJA";
    }

    return await prisma.trhkasin.findMany({
      where,
      include: {
        rincianRekening: true,
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_kas: "desc" },
    });
  },

  async saveSetorSisaKas(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_sts?: string;
    tgl_sts: string | Date;
    tipe: "SISA_KAS" | "PENGEMBALIAN";
    uraian: string;
    nilai: number;
    nama_bank?: string;
    rek_bank?: string;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    const count = await prisma.trhkasin.count({
      where: { tahunAnggaran: payload.tahunAnggaran },
    });
    const urut = String(count + 1).padStart(5, "0");
    const prefix = payload.tipe === "SISA_KAS" ? "SETOR-SISA" : "PENGEMBALIAN";
    const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
    const noKas = `${urut}/${unitPart}/${prefix}/${payload.tahunAnggaran}`;

    const sumberDana =
      payload.tipe === "SISA_KAS"
        ? "SISA_KAS_UP_GU_TU"
        : "PENGEMBALIAN_BELANJA";

    return await prisma.trhkasin.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_kas: noKas,
        tgl_kas: new Date(payload.tgl_sts),
        no_sts: payload.no_sts,
        tgl_sts: new Date(payload.tgl_sts),
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        sumber_dana: sumberDana,
        uraian: payload.uraian,
        nama_penyetor: "Bendahara Pengeluaran",
        nama_bank: payload.nama_bank || "PT. Bank Sumut",
        rek_bank: payload.rek_bank || "100.01.04.00001-9",
        nilai: new Prisma.Decimal(payload.nilai),
        status: "TERIMA",
        rincianRekening: {
          create: [
            {
              no_kas: noKas,
              kd_rek6:
                payload.tipe === "SISA_KAS"
                  ? "1.1.01.03.01.0001"
                  : "5.1.02.01.01.0001",
              nm_rek6: payload.uraian,
              nilai: new Prisma.Decimal(payload.nilai),
              keterangan: payload.uraian,
            },
          ],
        },
      },
    });
  },

  // ---------------------------------------------------------------------------
  // 8. REKAL TRANSAKSI (trhrekal & trdrekal)
  // ---------------------------------------------------------------------------
  async getRekalList(params: {
    tahunAnggaran: number;
    opdId?: string;
  }) {
    const where: Prisma.TrhrekalWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }

    return await prisma.trhrekal.findMany({
      where,
      include: {
        rincian: true,
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_rekal: "desc" },
    });
  },

  async postRekalTransaksi(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    bulan: number;
    keterangan?: string;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    const count = await prisma.trhrekal.count({
      where: { tahunAnggaran: payload.tahunAnggaran, opdId: opd.id },
    });
    const urut = String(count + 1).padStart(5, "0");
    const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
    const noRekal = `${urut}/${unitPart}/REKAL/${payload.tahunAnggaran}`;

    // Hitung akumulasi dari trdtransout
    const transoutItems = await prisma.trdtransout.findMany({
      where: {
        header: {
          tahunAnggaran: payload.tahunAnggaran,
          opdId: opd.id,
        },
      },
    });

    const sumMap = new Map<string, { nm_rek6: string; total: number }>();
    transoutItems.forEach((t) => {
      const existing = sumMap.get(t.kd_rek6) || {
        nm_rek6: t.nm_rek6,
        total: 0,
      };
      existing.total += Number(t.nilai) || 0;
      sumMap.set(t.kd_rek6, existing);
    });

    const totalMutasi = Array.from(sumMap.values()).reduce(
      (acc, c) => acc + c.total,
      0
    );

    return await prisma.trhrekal.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_rekal: noRekal,
        tgl_rekal: new Date(),
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        bulan: payload.bulan,
        keterangan: payload.keterangan || `Rekal Transaksi Bulan ke-${payload.bulan}`,
        total_mutasi: new Prisma.Decimal(totalMutasi),
        status: "SELESAI",
        rincian: {
          create: Array.from(sumMap.entries()).map(([kd, val]) => ({
            no_rekal: noRekal,
            kd_rek6: kd,
            nm_rek6: val.nm_rek6,
            nilai_lalu: new Prisma.Decimal(0),
            nilai_ini: new Prisma.Decimal(val.total),
            nilai_total: new Prisma.Decimal(val.total),
          })),
        },
      },
      include: { rincian: true },
    });
  },

  // ---------------------------------------------------------------------------
  // 9 & 10. LPJ & LPJ-KKPD (trlpj)
  // ---------------------------------------------------------------------------
  async getLpjList(params: {
    tahunAnggaran: number;
    opdId?: string;
    jenis_lpj?: string; // "UP", "GU", "TU", "KKPD"
  }) {
    const where: Prisma.TrlpjWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }
    if (params.jenis_lpj && params.jenis_lpj !== "ALL") {
      where.jenis_lpj = params.jenis_lpj;
    }

    return await prisma.trlpj.findMany({
      where,
      include: {
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: { tgl_lpj: "desc" },
    });
  },

  async saveLpj(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_lpj?: string;
    tgl_lpj: string | Date;
    tgl_awal: string | Date;
    tgl_akhir: string | Date;
    jenis_lpj: string;
    keterangan: string;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    let noLpj = payload.no_lpj?.trim();
    if (!noLpj) {
      const count = await prisma.trlpj.count({
        where: { tahunAnggaran: payload.tahunAnggaran, opdId: opd.id },
      });
      const urut = String(count + 1).padStart(5, "0");
      const unitPart = (payload.kd_unit || opd.kd_skpd).replace(/[^a-zA-Z0-9.-]/g, "");
      noLpj = `${urut}/${unitPart}/LPJ-${payload.jenis_lpj}/${payload.tahunAnggaran}`;
    }

    // Ambil transaksi pengeluaran pada rentang tanggal tersebut
    const trans = await prisma.trhtransout.aggregate({
      where: {
        tahunAnggaran: payload.tahunAnggaran,
        opdId: opd.id,
        tgl_bukti: {
          gte: new Date(payload.tgl_awal),
          lte: new Date(payload.tgl_akhir),
        },
      },
      _sum: { total: true },
    });

    const totalBelanja = trans._sum.total ? Number(trans._sum.total) : 0;

    return await prisma.trlpj.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_lpj: noLpj,
        tgl_lpj: new Date(payload.tgl_lpj),
        tgl_awal: new Date(payload.tgl_awal),
        tgl_akhir: new Date(payload.tgl_akhir),
        jenis_lpj: payload.jenis_lpj,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit,
        nm_unit: payload.nm_unit,
        keterangan: payload.keterangan,
        total_belanja: new Prisma.Decimal(totalBelanja),
        total_potongan: new Prisma.Decimal(0),
        total_bersih: new Prisma.Decimal(totalBelanja),
        status: "DRAFT",
      },
    });
  },
};

