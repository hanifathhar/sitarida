import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SessionPayload } from "@/lib/session";
import { getCmsDbPool } from "@/lib/cms-db";

function formatSqlDate(dateVal: Date | string): string {
  const d = new Date(dateVal);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatSqlDateTime(dateVal: Date = new Date()): string {
  const yyyy = dateVal.getFullYear();
  const mm = String(dateVal.getMonth() + 1).padStart(2, "0");
  const dd = String(dateVal.getDate()).padStart(2, "0");
  const hh = String(dateVal.getHours()).padStart(2, "0");
  const mi = String(dateVal.getMinutes()).padStart(2, "0");
  const ss = String(dateVal.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Validasi otorisasi untuk Modul Bendahara Pengeluaran
 * Peran: BUD (kode 1), Bendahara Pengeluaran (kode 10), dan Superadmin (kode 0 / SUPERADMIN)
 */
export function isBendaharaAuthorized(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;
  if (session.roleKode === "1") return true; // BUD
  if (session.roleKode === "7") return true; // PA / KPA
  if (session.roleKode === "9") return true; // PPTK
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

  // Helper: Dapatkan Nomor Urut BKU Berikutnya secara berurutan dari trhsp2d, trhtransout, trhtrmpot & trhstrpot
  async getNextBkuSeq(
    params: {
      tahunAnggaran: number;
      opdId: string;
    },
    db: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<number> {
    const { tahunAnggaran, opdId } = params;

    const [sp2dList, transoutList, trmpotList, strpotList, kasinList] =
      await Promise.all([
        db.trhsp2d.findMany({
          where: { tahunAnggaran, opdId, no_terima: { not: null } },
          select: { no_terima: true },
        }),
        db.trhtransout.findMany({
          where: { tahunAnggaran, opdId, no_bukti: { not: "" } },
          select: { no_bukti: true },
        }),
        db.trhtrmpot.findMany({
          where: { tahunAnggaran, opdId, no_bukti: { not: "" } },
          select: { no_bukti: true },
        }),
        db.trhstrpot.findMany({
          where: { tahunAnggaran, opdId, no_bukti: { not: "" } },
          select: { no_bukti: true },
        }),
        db.trhkasin.findMany({
          where: { tahunAnggaran, opdId, no_bukti: { not: "" } },
          select: { no_bukti: true },
        }),
      ]);

    let maxSeq = 0;
    const checkCode = (code?: string | null) => {
      if (!code) return;
      const parts = code.split("/");
      const num = parseInt(parts[0], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    };

    for (const item of sp2dList) checkCode(item.no_terima);
    for (const item of transoutList) checkCode(item.no_bukti);
    for (const item of trmpotList) checkCode(item.no_bukti);
    for (const item of strpotList) checkCode(item.no_bukti);
    for (const item of kasinList) checkCode(item.no_bukti);

    return maxSeq + 1;
  },

  // Helper: Dapatkan Nomor BKU Berikutnya yang Berurut dari trhsp2d & trhtransout
  async getNextBkuNumber(params: {
    tahunAnggaran: number;
    opdId: string;
    kdUnitOrSkpd?: string;
  }) {
    const { tahunAnggaran, opdId, kdUnitOrSkpd = "1.01.2.22.0.00.01.0000" } = params;

    const nextSeq = await this.getNextBkuSeq({ tahunAnggaran, opdId });
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
        opd: {
          select: {
            id: true,
            kd_skpd: true,
            nm_skpd: true,
            unitKerjas: {
              where: { isActive: true },
              orderBy: { kd_unit: "asc" },
              select: {
                id: true,
                kd_unit: true,
                nama_penerima: true,
                bank_penerima: true,
                rek_penerima: true,
              },
            },
          },
        },
        spm: {
          select: {
            nama_penerima: true,
            bank_penerima: true,
            rek_penerima: true,
            npwp_penerima: true,
          },
        },
        spp: {
          select: {
            nama_penerima: true,
            bank_penerima: true,
            rek_penerima: true,
            npwp_penerima: true,
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
        pay_type: true,
        uraian: true,
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
                pay_type: booked.pay_type,
                uraian: booked.uraian,
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
        nama_penerima: (() => {
          const unitMatch =
            s.opd?.unitKerjas?.find(
              (u) =>
                (s.unitKerjaId && u.id === s.unitKerjaId) ||
                (s.kd_unit && u.kd_unit === s.kd_unit)
            ) || s.opd?.unitKerjas?.[0];
          return (
            s.nama_penerima ||
            s.spm?.nama_penerima ||
            s.spp?.nama_penerima ||
            unitMatch?.nama_penerima ||
            null
          );
        })(),
        bank_penerima: (() => {
          const unitMatch =
            s.opd?.unitKerjas?.find(
              (u) =>
                (s.unitKerjaId && u.id === s.unitKerjaId) ||
                (s.kd_unit && u.kd_unit === s.kd_unit)
            ) || s.opd?.unitKerjas?.[0];
          return (
            s.bank_penerima ||
            s.spm?.bank_penerima ||
            s.spp?.bank_penerima ||
            unitMatch?.bank_penerima ||
            null
          );
        })(),
        rek_penerima: (() => {
          const unitMatch =
            s.opd?.unitKerjas?.find(
              (u) =>
                (s.unitKerjaId && u.id === s.unitKerjaId) ||
                (s.kd_unit && u.kd_unit === s.kd_unit)
            ) || s.opd?.unitKerjas?.[0];
          return (
            s.rek_penerima ||
            s.spm?.rek_penerima ||
            s.spp?.rek_penerima ||
            unitMatch?.rek_penerima ||
            null
          );
        })(),
        npwp_penerima:
          s.npwp_penerima || s.spm?.npwp_penerima || s.spp?.npwp_penerima || null,
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

  async updatePembukuanSp2d(payload: {
    sp2dId: string;
    no_bukti?: string;
    tgl_bukti?: string | Date;
    pay_type?: string;
    uraian?: string;
  }) {
    const sp2d = await prisma.trhsp2d.findUnique({
      where: { id: payload.sp2dId },
    });
    if (!sp2d) {
      throw new Error("Dokumen SP2D tidak ditemukan.");
    }

    const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
      (sp2d.jenis_sp2d || "").toUpperCase()
    );
    const noBukti = payload.no_bukti?.trim() || sp2d.no_terima || undefined;
    const tglBukti = payload.tgl_bukti
      ? new Date(payload.tgl_bukti)
      : sp2d.tgl_terima || sp2d.tgl_cair || sp2d.tgl_sp2d;

    return await prisma.$transaction(async (tx) => {
      await tx.trhsp2d.update({
        where: { id: sp2d.id },
        data: {
          ...(noBukti ? { no_terima: noBukti } : {}),
          tgl_terima: tglBukti,
        },
      });

      if (!isUpTuGu) {
        const transout = await tx.trhtransout.findFirst({
          where: {
            tahunAnggaran: sp2d.tahunAnggaran,
            OR: [{ sp2dId: sp2d.id }, { no_sp2d: sp2d.no_sp2d }],
          },
        });
        if (transout) {
          await tx.trhtransout.update({
            where: { id: transout.id },
            data: {
              ...(noBukti ? { no_bukti: noBukti } : {}),
              tgl_bukti: tglBukti,
              ...(payload.pay_type ? { pay_type: payload.pay_type } : {}),
              ...(payload.uraian !== undefined ? { uraian: payload.uraian } : {}),
            },
          });
          if (noBukti && noBukti !== transout.no_bukti) {
            await tx.trdtransout.updateMany({
              where: { transoutId: transout.id },
              data: { no_bukti: noBukti },
            });
          }
        }
      }

      return {
        id: sp2d.id,
        no_bukti: noBukti || sp2d.no_terima,
        tgl_bukti: tglBukti,
        isUpTuGu,
      };
    });
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
  async getValidasiSpjKwitansiList(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
    status?: string;
    jns_beban?: string;
  }) {
    const andConditions: Prisma.TblKwitansiWhereInput[] = [
      { tahunAnggaran: params.tahunAnggaran },
    ];

    // Hanya kuitansi dengan jenis beban UP / GU / TU
    if (
      params.jns_beban &&
      params.jns_beban !== "SEMUA" &&
      ["UP", "GU", "TU"].includes(params.jns_beban.toUpperCase())
    ) {
      andConditions.push({ jns_beban: params.jns_beban.toUpperCase() });
    } else {
      andConditions.push({ jns_beban: { in: ["UP", "GU", "TU"] } });
    }

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

    if (params.status && params.status !== "SEMUA") {
      andConditions.push({ status: params.status });
    }

    const list = await prisma.tblKwitansi.findMany({
      where: { AND: andConditions },
      include: {
        penerimaList: true,
        potonganList: true,
        opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
        unitKerja: { select: { id: true, kd_unit: true, nm_unit: true } },
      },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    });

    // Sinkronisasi real-time kolom Cair & Uraian dari CMS_WEB.trxspj ke tbl_kwitansi_penerima & tbl_kwitansi
    try {
      await this.pullCmsWebStatusToLocal(list);
    } catch (err) {
      console.warn("Gagal sinkronisasi real-time dari CMS_WEB:", err);
    }

    return list;
  },

  /**
   * Sinkronisasi real-time nilai kolom Cair dan Uraian dari CMS_WEB (tabel trxspj)
   * ke tabel lokal tbl_kwitansi_penerima dan tbl_kwitansi
   */
  async pullCmsWebStatusToLocal(kwitansiList: any[]) {
    if (!kwitansiList || kwitansiList.length === 0) return;

    const noBuktiSet = new Set<string>();
    for (const doc of kwitansiList) {
      if (!Array.isArray(doc.penerimaList)) continue;
      doc.penerimaList.forEach((p: any, idx: number) => {
        const noBukti = (p.no_bukti || `${doc.nomor}-${idx + 1}`).trim();
        if (noBukti) noBuktiSet.add(noBukti);
      });
    }

    const noBuktiList = Array.from(noBuktiSet);
    if (noBuktiList.length === 0) return;

    const cmsPool = getCmsDbPool();
    const placeholders = noBuktiList.map(() => "?").join(", ");
    const [rows] = await cmsPool.query<any[]>(
      `SELECT No_Bukti, Tahun, Cair, Uraian FROM trxspj WHERE No_Bukti IN (${placeholders})`,
      noBuktiList
    );

    if (!Array.isArray(rows) || rows.length === 0) return;

    const cmsMap = new Map<string, { cair: number; uraian: string | null }>();
    for (const r of rows) {
      const key = String(r.No_Bukti || "").trim();
      if (!key) continue;
      const rawCair = Number(r.Cair ?? 0);
      const cair = isNaN(rawCair) ? 0 : rawCair;
      const uraian =
        r.Uraian !== null && r.Uraian !== undefined && String(r.Uraian).trim() !== ""
          ? String(r.Uraian).trim()
          : null;
      cmsMap.set(key, { cair, uraian });
    }

    for (const doc of kwitansiList) {
      if (!Array.isArray(doc.penerimaList)) continue;

      let docTargetCair = Number(doc.cair || 0);
      const penerimaCairValues: number[] = [];

      for (let idx = 0; idx < doc.penerimaList.length; idx++) {
        const p = doc.penerimaList[idx];
        const noBukti = (p.no_bukti || `${doc.nomor}-${idx + 1}`).trim();
        const cmsItem = cmsMap.get(noBukti);

        if (cmsItem) {
          const currentCair = Number(p.cair ?? 0);
          const currentUraian = p.uraian ?? null;

          // Jika sudah cair = 1 secara lokal (baik dari CMS maupun Bypass Superadmin), jangan ubah kembali
          if (currentCair === 1) {
            penerimaCairValues.push(1);
            continue;
          }

          if (currentCair !== cmsItem.cair || currentUraian !== cmsItem.uraian || !p.no_bukti) {
            await prisma.$executeRaw`
              UPDATE tbl_kwitansi_penerima
              SET no_bukti = ${noBukti}, cair = ${cmsItem.cair}, uraian = ${cmsItem.uraian}
              WHERE id = ${p.id}
            `;
            p.no_bukti = noBukti;
            p.cair = cmsItem.cair;
            p.uraian = cmsItem.uraian;
          }
          penerimaCairValues.push(cmsItem.cair);
        } else {
          penerimaCairValues.push(Number(p.cair ?? 0));
        }
      }

      if (penerimaCairValues.includes(1)) {
        docTargetCair = 1;
      } else if (penerimaCairValues.includes(9)) {
        docTargetCair = 9;
      } else if (penerimaCairValues.length > 0) {
        docTargetCair = penerimaCairValues[0];
      }

      if (Number(doc.cair ?? 0) !== docTargetCair) {
        await prisma.tblKwitansi.update({
          where: { id: doc.id },
          data: { cair: docTargetCair },
        });
        doc.cair = docTargetCair;
      }
    }
  },

  /**
   * Query 1 -> Query 2: Mengirim data kuitansi yang divalidasi ke tabel trxspj pada database CMS_WEB
   */
  async syncKwitansiToCmsWeb(kwitansiIds: string[], validationDate?: Date) {
    if (!kwitansiIds || kwitansiIds.length === 0) {
      return { syncedRows: 0 };
    }

    // Pastikan setiap penerima memiliki no_bukti dan setiap potongan memiliki no_bukti dari penerima pertama
    const kwitansiDocs = await prisma.tblKwitansi.findMany({
      where: { id: { in: kwitansiIds } },
      include: {
        penerimaList: { orderBy: { createdAt: "asc" } },
        potonganList: { orderBy: { createdAt: "asc" } },
      },
    });

    for (const doc of kwitansiDocs) {
      let firstNoBukti = `${doc.nomor}-1`;
      for (let idx = 0; idx < doc.penerimaList.length; idx++) {
        const p = doc.penerimaList[idx] as any;
        const noBuktiVal = p.no_bukti || `${doc.nomor}-${idx + 1}`;
        if (idx === 0) firstNoBukti = noBuktiVal;
        await prisma.$executeRaw`
          UPDATE tbl_kwitansi_penerima SET no_bukti = ${noBuktiVal} WHERE id = ${p.id} AND (no_bukti IS NULL OR no_bukti = '')
        `;
      }
      if (doc.potonganList.length > 0) {
        await prisma.$executeRaw`
          UPDATE tbl_kwitansi_potongan SET no_bukti = ${firstNoBukti} WHERE "kwitansiId" = ${doc.id} AND (no_bukti IS NULL OR no_bukti = '')
        `;
      }
    }

    // Query 1 (Data Sumber dari PostgreSQL lokal)
    interface Query1Row {
      no_bukti: string;
      tanggal: Date;
      uraian: string;
      kd_skpd: string;
      nm_skpd: string;
      kd_unit_full: string | null;
      nm_unit: string | null;
      kd_urusan: string | null;
      kd_bidang: string | null;
      kd_unit: string | null;
      kd_sub: string | null;
      tahun: number;
      bank_giro: string;
      nm_giro: string | null;
      rek_giro: string | null;
      nm_penerima: string;
      nm_bank_penerima: string;
      no_rek_penerima: string;
      npwp_penerima: string | null;
      nilai: Prisma.Decimal | number | string;
    }

    const sourceRows = await prisma.$queryRaw<Query1Row[]>`
      SELECT
        b.no_bukti,
        a.tanggal,
        a.uraian,
        a.kd_skpd,
        a.nm_skpd,
        COALESCE(a.kd_unit, x.kd_unit) AS kd_unit_full,
        COALESCE(a.nm_unit, x.nm_unit, a.nm_skpd) AS nm_unit,
        LEFT(x.skpdbank, 1) AS kd_urusan,
        SUBSTR(x.skpdbank, 2, 2) AS kd_bidang,
        SUBSTR(x.skpdbank, 4, 2) AS kd_unit,
        SUBSTR(x.skpdbank, 6, 2) AS kd_sub,
        a."tahunAnggaran" AS tahun,
        '117 Bank Sumut' AS bank_giro,
        x.nama_penerima AS nm_giro,
        x.rek_penerima AS rek_giro,
        b.nm_penerima,
        b.nm_bank_penerima,
        b.no_rek_penerima,
        b.npwp_penerima,
        b.nilai
      FROM tbl_kwitansi a
      INNER JOIN tbl_kwitansi_penerima b ON a.id = b."kwitansiId"
      LEFT JOIN LATERAL (
        SELECT u.kd_unit, u.nm_unit, u.skpdbank, u.nama_penerima, u.rek_penerima
        FROM ms_unit u
        WHERE u.kd_unit = a.kd_unit
           OR (a.kd_unit IS NULL AND u."opdId" = a."opdId")
        ORDER BY (CASE WHEN u.kd_unit = a.kd_unit THEN 0 ELSE 1 END), u.kd_unit ASC
        LIMIT 1
      ) x ON true
      WHERE a.id IN (${Prisma.join(kwitansiIds)})
    `;

    if (sourceRows.length === 0) {
      return { syncedRows: 0, syncedPotonganRows: 0 };
    }

    // Query 1 Potongan (Data Sumber dari PostgreSQL lokal)
    interface Query1PotonganRow {
      tahun: number;
      no_bukti: string;
      id_billing: string | null;
      kd_rek_1: string | null;
      kd_rek_2: string | null;
      kd_rek_3: string | null;
      kd_rek_4: string | null;
      kd_rek_5: string | null;
      nm_rek6: string | null;
      nilai: Prisma.Decimal | number | string;
    }

    const potonganRows = await prisma.$queryRaw<Query1PotonganRow[]>`
      SELECT
        a."tahunAnggaran" AS tahun,
        b.no_bukti,
        b.id_billing,
        SUBSTR(c.map_potongan, 1, 1) AS kd_rek_1,
        SUBSTR(c.map_potongan, 2, 1) AS kd_rek_2,
        SUBSTR(c.map_potongan, 3, 1) AS kd_rek_3,
        SUBSTR(c.map_potongan, 4, 2) AS kd_rek_4,
        SUBSTR(c.map_potongan, 6, 2) AS kd_rek_5,
        b.nm_rek6,
        b.nilai
      FROM tbl_kwitansi a
      INNER JOIN tbl_kwitansi_potongan b ON a.id = b."kwitansiId"
      LEFT JOIN ms_rek6 c ON b.kd_rek6 = c.kd_rek6
      WHERE a.id IN (${Prisma.join(kwitansiIds)})
    `;

    // Query 2 (Insert ke database tujuan CMS_WEB tabel trxspj & trxspj_potongan)
    const cmsPool = getCmsDbPool();
    const conn = await cmsPool.getConnection();
    const effectiveDate = validationDate || new Date();
    const nowStr = formatSqlDateTime(effectiveDate);

    try {
      await conn.beginTransaction();

      for (const row of sourceRows) {
        const tahun = String(row.tahun);
        const bukti = row.no_bukti || "";
        const urusan = row.kd_urusan || "";
        const bidang = row.kd_bidang || "";
        const kdunit = row.kd_unit || "";
        const sub = row.kd_sub || "";
        const tanggal = formatSqlDate(validationDate || row.tanggal);
        const penerima = row.nm_penerima || "";
        const bank_penerima = row.nm_bank_penerima || "";
        const rek_penerima = row.no_rek_penerima || "";
        const npwp = row.npwp_penerima || "";
        const keperluan = row.uraian || "";
        const bank = row.bank_giro || "117 Bank Sumut";
        const rekening = row.rek_giro || "";
        const jumlah = Number(row.nilai || 0);
        const nmunit = row.nm_skpd || "";
        const nmsub = row.nm_unit || row.nm_skpd || "";

        // Hapus terlebih dahulu jika No_Bukti yang sama sudah ada agar tidak duplikat
        await conn.execute(
          `DELETE FROM trxspj WHERE No_Bukti = ? AND Tahun = ?`,
          [bukti, tahun]
        );

        await conn.execute(
          `INSERT INTO trxspj (
            Tahun, No_Bukti, Jns_Dok, Kd_Urusan, Kd_Bidang, Kd_Unit, Kd_Sub, Tgl_Bukti,
            Nm_Penerima, Bank_Penerima, Rek_Penerima, NPWP, Keterangan,
            Nm_Bank, No_Rekening, Nilai, DateCreate, Cair, TglCair, Nm_Unit, Nm_Sub_Unit, Uraian
          ) VALUES (
            ?, ?, '1', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, '0', NULL, ?, ?, ''
          )`,
          [
            tahun,
            bukti,
            urusan,
            bidang,
            kdunit,
            sub,
            tanggal,
            penerima,
            bank_penerima,
            rek_penerima,
            npwp,
            keperluan,
            bank,
            rekening,
            jumlah,
            nowStr,
            nmunit,
            nmsub,
          ]
        );
      }

      // Sinkronkan potongan pajak ke trxspj_potongan jika ada
      if (potonganRows.length > 0) {
        const deletedPairs = new Set<string>();
        for (const pot of potonganRows) {
          const tahun = String(pot.tahun);
          const bukti = pot.no_bukti || "";
          const pairKey = `${tahun}::${bukti}`;
          if (!deletedPairs.has(pairKey)) {
            await conn.execute(
              `DELETE FROM trxspj_potongan WHERE No_Bukti = ? AND tahun = ?`,
              [bukti, tahun]
            );
            deletedPairs.add(pairKey);
          }
        }

        for (const pot of potonganRows) {
          const tahun = String(pot.tahun);
          const bukti = pot.no_bukti || "";
          const rek1 = pot.kd_rek_1 || "";
          const rek2 = pot.kd_rek_2 || "";
          const rek3 = pot.kd_rek_3 || "";
          const rek4 = pot.kd_rek_4 || "";
          const rek5 = pot.kd_rek_5 || "";
          const nama = pot.nm_rek6 || "";
          const nilai = Number(pot.nilai || 0);
          const billing = pot.id_billing || "";

          await conn.execute(
            `INSERT INTO trxspj_potongan (
              tahun, No_Bukti, Jns_Dok, kd_rek_1, kd_rek_2, kd_rek_3, kd_rek_4, kd_rek_5,
              nm_rekening, nilai, kd_billing
            ) VALUES (?, ?, '1', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tahun, bukti, rek1, rek2, rek3, rek4, rek5, nama, nilai, billing]
          );
        }
      }

      await conn.commit();
      return {
        syncedRows: sourceRows.length,
        syncedPotonganRows: potonganRows.length,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Hapus data dari trxspj pada CMS_WEB saat validasi dibatalkan / ditolak
   */
  async removeKwitansiFromCmsWeb(kwitansiIds: string[]) {
    if (!kwitansiIds || kwitansiIds.length === 0) {
      return { deletedRows: 0 };
    }

    const docs = await prisma.tblKwitansi.findMany({
      where: { id: { in: kwitansiIds } },
      select: {
        id: true,
        nomor: true,
        tahunAnggaran: true,
        penerimaList: {
          select: { id: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const rawPenerima = await prisma.$queryRaw<Array<{ id: string; no_bukti: string | null }>>`
      SELECT id, no_bukti FROM tbl_kwitansi_penerima WHERE "kwitansiId" IN (${Prisma.join(kwitansiIds)})
    `;
    const noBuktiById = new Map(rawPenerima.map((r) => [r.id, r.no_bukti]));

    const targets: Array<{ no_bukti: string; tahun: string }> = [];
    for (const doc of docs) {
      doc.penerimaList.forEach((p, idx) => {
        targets.push({
          no_bukti: noBuktiById.get(p.id) || `${doc.nomor}-${idx + 1}`,
          tahun: String(doc.tahunAnggaran),
        });
      });
    }

    if (targets.length === 0) {
      return { deletedRows: 0 };
    }

    const cmsPool = getCmsDbPool();
    const conn = await cmsPool.getConnection();
    try {
      await conn.beginTransaction();
      for (const t of targets) {
        await conn.execute(
          `DELETE FROM trxspj_potongan WHERE No_Bukti = ? AND tahun = ?`,
          [t.no_bukti, t.tahun]
        );
        await conn.execute(
          `DELETE FROM trxspj WHERE No_Bukti = ? AND Tahun = ?`,
          [t.no_bukti, t.tahun]
        );
      }
      await conn.commit();
      return { deletedRows: targets.length };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async updateValidasiSpjKwitansi(params: {
    id?: string;
    ids?: string[];
    action: "DISETUJUI" | "DITOLAK" | "BATAL_VALIDASI" | "BYPASS_CAIR";
    catatan?: string;
    session: SessionPayload;
  }) {
    const targetIds = Array.from(
      new Set([
        ...(params.ids || []),
        ...(params.id ? [params.id] : []),
      ].filter(Boolean))
    );

    if (targetIds.length === 0) {
      throw new Error("Pilih minimal 1 dokumen kuitansi untuk diproses.");
    }

    const existingList = await prisma.tblKwitansi.findMany({
      where: { id: { in: targetIds } },
      include: { penerimaList: true },
    });

    if (existingList.length === 0) {
      throw new Error("Dokumen kuitansi tidak ditemukan.");
    }

    // Sinkronkan status Cair & Uraian terbaru dari CMS_WEB sebelum memproses
    try {
      await this.pullCmsWebStatusToLocal(existingList);
    } catch (err) {
      console.warn("Gagal cek status real-time CMS_WEB:", err);
    }

    const validIds = existingList.map((item) => item.id);

    // Jika aksi adalah BATAL_VALIDASI atau DITOLAK, pastikan tidak ada kuitansi yang status Cair = 1 atau 9
    if (params.action === "BATAL_VALIDASI" || params.action === "DITOLAK") {
      const lockedDocs = existingList.filter(
        (doc) =>
          doc.cair === 1 ||
          doc.cair === 9 ||
          doc.penerimaList.some((p) => p.cair === 1 || p.cair === 9)
      );

      if (lockedDocs.length > 0) {
        const lockedNomor = lockedDocs.map((d) => d.nomor).join(", ");
        throw new Error(
          `Kuitansi [${lockedNomor}] telah terkunci karena status Cair pada CMS_WEB bernilai 1 atau 9 dan tidak dapat dibatalkan.`
        );
      }
    }

    if (params.action === "BYPASS_CAIR") {
      const isSuperadmin =
        params.session.roleKode === "0" ||
        params.session.roleKode === "SUPERADMIN";
      if (!isSuperadmin) {
        throw new Error(
          "Akses ditolak. Fitur Bypass Pencairan hanya dapat diakses oleh Superadmin."
        );
      }

      const alasanBypass = params.catatan?.trim();
      if (!alasanBypass) {
        throw new Error(
          "Catatan / uraian kendala teknis wajib diisi untuk Bypass Pencairan."
        );
      }

      const now = new Date();
      // Hanya update di database lokal saja (tidak mengirim ke CMS_WEB)
      await prisma.$transaction(async (tx) => {
        await tx.tblKwitansiPenerima.updateMany({
          where: { kwitansiId: { in: validIds } },
          data: {
            cair: 1,
            uraian: alasanBypass,
          },
        });

        for (const doc of existingList) {
          await tx.tblKwitansi.update({
            where: { id: doc.id },
            data: {
              status: "DISETUJUI",
              cair: 1,
              tgl_persetujuan: doc.tgl_persetujuan || now,
              catatan: alasanBypass,
            },
          });
        }
      });

      return {
        processedCount: validIds.length,
      };
    }

    if (params.action === "DISETUJUI") {
      const validationDate = new Date();

      // 1. Kirim data Query 1 -> Query 2 (CMS_WEB.trxspj) menggunakan tanggal validasi
      const cmsResult = await this.syncKwitansiToCmsWeb(validIds, validationDate);

      // 2. Update status & tanggal di database lokal (tbl_kwitansi & tbl_kwitansi_penerima)
      await prisma.$transaction(async (tx) => {
        await tx.tblKwitansiPenerima.updateMany({
          where: { kwitansiId: { in: validIds } },
          data: { cair: 0 },
        });

        await tx.tblKwitansi.updateMany({
          where: { id: { in: validIds } },
          data: {
            status: "DISETUJUI",
            tanggal: validationDate,
            tgl_persetujuan: validationDate,
            ...(params.catatan ? { catatan: params.catatan } : {}),
          },
        });
      });

      return {
        processedCount: validIds.length,
        syncedCmsRows: cmsResult.syncedRows,
        syncedPotonganRows: cmsResult.syncedPotonganRows,
      };
    }

    if (params.action === "DITOLAK") {
      // Hapus dari CMS_WEB jika sebelumnya sudah pernah masuk
      try {
        await this.removeKwitansiFromCmsWeb(validIds);
      } catch (e) {
        console.warn("Peringatan saat menghapus dari CMS_WEB pada penolakan:", e);
      }

      await prisma.$transaction(async (tx) => {
        await tx.tblKwitansiPenerima.updateMany({
          where: { kwitansiId: { in: validIds } },
          data: { cair: 0 },
        });

        await tx.tblKwitansi.updateMany({
          where: { id: { in: validIds } },
          data: {
            status: "DITOLAK",
            cair: 0,
            catatan: params.catatan || "Kuitansi ditolak pada Validasi SPJ",
          },
        });
      });

      return {
        processedCount: validIds.length,
      };
    }

    if (params.action === "BATAL_VALIDASI") {
      // Hapus baris terkait di trxspj (CMS_WEB)
      await this.removeKwitansiFromCmsWeb(validIds);

      await prisma.$transaction(async (tx) => {
        await tx.tblKwitansiPenerima.updateMany({
          where: { kwitansiId: { in: validIds } },
          data: { cair: 0 },
        });

        await tx.tblKwitansi.updateMany({
          where: { id: { in: validIds } },
          data: {
            status: "DIAJUKAN",
            cair: 0,
            tgl_persetujuan: null,
          },
        });
      });

      return {
        processedCount: validIds.length,
      };
    }

    throw new Error(`Aksi ${params.action} tidak didukung.`);
  },

  async getPembukuanSpjData(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
  }) {
    const transoutWhere: Prisma.TrhtransoutWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      no_spj: { not: null },
    };
    if (params.opdId && params.opdId !== "ALL") {
      transoutWhere.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      transoutWhere.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    const kwitansiWhere: Prisma.TblKwitansiWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      cair: 1,
      status: { not: "DIBUKUKAN" },
    };
    if (params.opdId && params.opdId !== "ALL") {
      kwitansiWhere.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      kwitansiWhere.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    const sp2dWhere: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      status: "CAIR",
      jenis_sp2d: { in: ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"] },
    };
    if (params.opdId && params.opdId !== "ALL") {
      sp2dWhere.opdId = params.opdId;
    }

    const [bookedList, readyKwitansi, sp2dOptions] = await Promise.all([
      prisma.trhtransout.findMany({
        where: transoutWhere,
        include: {
          rincian: true,
          opd: { select: { kd_skpd: true, nm_skpd: true } },
        },
        orderBy: [{ tgl_bukti: "desc" }, { createdAt: "desc" }],
      }),
      prisma.tblKwitansi.findMany({
        where: kwitansiWhere,
        include: {
          penerimaList: true,
          potonganList: true,
          opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
          unitKerja: { select: { id: true, kd_unit: true, nm_unit: true } },
        },
        orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      }),
      prisma.trhsp2d.findMany({
        where: sp2dWhere,
        select: {
          id: true,
          no_sp2d: true,
          tgl_sp2d: true,
          jenis_sp2d: true,
          keperluan: true,
          nilai: true,
          no_terima: true,
        },
        orderBy: [{ tgl_sp2d: "desc" }, { no_sp2d: "desc" }],
      }),
    ]);

    return {
      bookedList,
      readyKwitansi,
      sp2dOptions: sp2dOptions.map((s) => ({
        ...s,
        nilai: Number(s.nilai || 0),
      })),
    };
  },

  async savePembukuanSpjFromKwitansi(payload: {
    tahunAnggaran: number;
    opdId: string;
    kwitansiId: string;
    no_sp2d: string;
    tgl_bukti?: string | Date;
  }) {
    if (!payload.kwitansiId) throw new Error("Kuitansi wajib dipilih.");
    if (!payload.no_sp2d?.trim()) throw new Error("Nomor SP2D wajib dipilih.");

    return await prisma.$transaction(async (tx) => {
      const kwitansi = await tx.tblKwitansi.findUnique({
        where: { id: payload.kwitansiId },
        include: {
          penerimaList: { orderBy: { createdAt: "asc" } },
          potonganList: { orderBy: { createdAt: "asc" } },
          opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
        },
      });

      if (!kwitansi) {
        throw new Error("Dokumen kuitansi tidak ditemukan.");
      }
      if (kwitansi.cair !== 1) {
        throw new Error("Kuitansi belum berstatus Cair = 1.");
      }
      if (kwitansi.status === "DIBUKUKAN") {
        throw new Error(`Kuitansi ${kwitansi.nomor} sudah pernah dibukukan.`);
      }

      const sp2d = await tx.trhsp2d.findFirst({
        where: {
          tahunAnggaran: kwitansi.tahunAnggaran,
          opdId: kwitansi.opdId,
          no_sp2d: payload.no_sp2d.trim(),
        },
      });

      if (!sp2d) {
        throw new Error(`Dokumen SP2D ${payload.no_sp2d} tidak ditemukan.`);
      }

      let kodeUnit = (kwitansi.kd_unit || "").trim();
      if (!kodeUnit) {
        const defaultUnit = await tx.unitKerja.findFirst({
          where: { opdId: kwitansi.opdId, isActive: true },
          orderBy: { kd_unit: "asc" },
          select: { kd_unit: true },
        });
        kodeUnit = defaultUnit?.kd_unit || kwitansi.kd_skpd;
      }
      const unitPart = kodeUnit.replace(/[^a-zA-Z0-9.-]/g, "");
      const tahun = kwitansi.tahunAnggaran;
      const tglBukti = payload.tgl_bukti
        ? new Date(payload.tgl_bukti)
        : kwitansi.tanggal;

      // Dapatkan nomor urut BKU berikutnya
      let seq = await this.getNextBkuSeq({ tahunAnggaran: tahun, opdId: kwitansi.opdId }, tx);
      const formatNoBukti = (n: number) =>
        `${String(n).padStart(5, "0")}/${unitPart}/${tahun}`;

      const noBuktiSpj = formatNoBukti(seq);

      const transout = await tx.trhtransout.create({
        data: {
          tahunAnggaran: tahun,
          no_bukti: noBuktiSpj,
          tgl_bukti: tglBukti,
          no_sp2d: sp2d.no_sp2d,
          tgl_sp2d: sp2d.tgl_sp2d,
          sp2dId: sp2d.id,
          no_spj: kwitansi.nomor,
          tgl_spj: kwitansi.tanggal,
          kd_skpd: kwitansi.kd_skpd,
          nm_skpd: kwitansi.nm_skpd,
          opdId: kwitansi.opdId,
          kd_unit: kwitansi.kd_unit || kodeUnit,
          nm_unit: kwitansi.nm_unit,
          unitKerjaId: kwitansi.unitKerjaId,
          sumber_dana: "SPJ",
          jenis_beban: kwitansi.jns_beban,
          pay_type: "BANK",
          uraian: kwitansi.uraian,
          total: kwitansi.nilai,
          status: "POSTING",
          rincian: {
            create: [
              {
                no_bukti: noBuktiSpj,
                kd_sub_kegiatan: kwitansi.kd_sub_kegiatan,
                nm_sub_kegiatan: kwitansi.nm_sub_kegiatan,
                kd_rek6: kwitansi.kd_rek6,
                nm_rek6: kwitansi.nm_rek6,
                nilai: kwitansi.nilai,
                sumber_dana: kwitansi.jns_beban,
                keterangan: kwitansi.uraian,
              },
            ],
          },
        },
        include: { rincian: true },
      });

      let noBuktiTrmPot: string | null = null;
      let noBuktiStrPot: string | null = null;

      // Jika kuitansi memiliki potongan, otomatis masuk ke Penerimaan Potongan & Penyetoran Potongan dengan no BKU berurutan
      if (kwitansi.potonganList.length > 0) {
        const totalPotongan = kwitansi.potonganList.reduce(
          (sum, pt) => sum + Number(pt.nilai || 0),
          0
        );

        seq += 1;
        noBuktiTrmPot = formatNoBukti(seq);

        await tx.trhtrmpot.create({
          data: {
            tahunAnggaran: tahun,
            no_bukti: noBuktiTrmPot,
            tgl_bukti: tglBukti,
            no_sp2d: sp2d.no_sp2d,
            kd_skpd: kwitansi.kd_skpd,
            nm_skpd: kwitansi.nm_skpd,
            opdId: kwitansi.opdId,
            kd_unit: kwitansi.kd_unit || kodeUnit,
            nm_unit: kwitansi.nm_unit,
            unitKerjaId: kwitansi.unitKerjaId,
            uraian: `Penerimaan Potongan SPJ ${kwitansi.nomor} - ${kwitansi.uraian}`,
            total: new Prisma.Decimal(totalPotongan),
            status: "TERIMA",
            rincian: {
              create: kwitansi.potonganList.map((pt) => ({
                no_bukti: noBuktiTrmPot!,
                kd_rek6: pt.kd_rek6 || "-",
                nm_rek6: pt.nm_rek6 || "Potongan Pajak",
                id_billing: pt.id_billing || null,
                nilai: pt.nilai,
                keterangan: pt.keterangan || kwitansi.uraian,
              })),
            },
          },
        });

        seq += 1;
        noBuktiStrPot = formatNoBukti(seq);

        await tx.trhstrpot.create({
          data: {
            tahunAnggaran: tahun,
            no_bukti: noBuktiStrPot,
            tgl_bukti: tglBukti,
            no_trmpot: noBuktiTrmPot,
            kd_skpd: kwitansi.kd_skpd,
            nm_skpd: kwitansi.nm_skpd,
            opdId: kwitansi.opdId,
            kd_unit: kwitansi.kd_unit || kodeUnit,
            nm_unit: kwitansi.nm_unit,
            unitKerjaId: kwitansi.unitKerjaId,
            uraian: `Penyetoran Potongan SPJ ${kwitansi.nomor} - ${kwitansi.uraian}`,
            total: new Prisma.Decimal(totalPotongan),
            status: "SETOR",
            rincian: {
              create: kwitansi.potonganList.map((pt) => ({
                no_bukti: noBuktiStrPot!,
                kd_rek6: pt.kd_rek6 || "-",
                nm_rek6: pt.nm_rek6 || "Potongan Pajak",
                id_billing: pt.id_billing || null,
                ntpn: pt.ntpn || null,
                nilai: pt.nilai,
                keterangan: pt.keterangan || kwitansi.uraian,
              })),
            },
          },
        });
      }

      // Tandai kuitansi sebagai DIBUKUKAN
      await tx.tblKwitansi.update({
        where: { id: kwitansi.id },
        data: { status: "DIBUKUKAN" },
      });

      return {
        transout,
        noBuktiSpj,
        noBuktiTrmPot,
        noBuktiStrPot,
      };
    });
  },

  async getPembukuanSpjDetail(id: string) {
    const transout = await prisma.trhtransout.findUnique({
      where: { id },
      include: {
        rincian: true,
        opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
      },
    });
    if (!transout) {
      throw new Error("Data pembukuan SPJ tidak ditemukan.");
    }

    const kwitansi = transout.no_spj
      ? await prisma.tblKwitansi.findFirst({
          where: {
            opdId: transout.opdId,
            nomor: transout.no_spj,
          },
          include: {
            potonganList: { orderBy: { createdAt: "asc" } },
          },
        })
      : null;

    const trmpot = transout.no_spj
      ? await prisma.trhtrmpot.findFirst({
          where: {
            tahunAnggaran: transout.tahunAnggaran,
            opdId: transout.opdId,
            uraian: { startsWith: `Penerimaan Potongan SPJ ${transout.no_spj}` },
          },
          include: { rincian: true },
        })
      : null;

    const strpot = trmpot
      ? await prisma.trhstrpot.findFirst({
          where: {
            tahunAnggaran: transout.tahunAnggaran,
            opdId: transout.opdId,
            no_trmpot: trmpot.no_bukti,
          },
          include: { rincian: true },
        })
      : null;

    return {
      transout,
      kwitansi,
      trmpot,
      strpot,
    };
  },

  async updatePembukuanSpj(
    id: string,
    payload: {
      no_sp2d?: string;
      tgl_bukti?: string;
      uraian?: string;
      pay_type?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhtransout.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new Error("Data pembukuan SPJ tidak ditemukan.");
      }

      let nextSp2dNo = existing.no_sp2d;
      let nextSp2dTgl = existing.tgl_sp2d;
      let nextSp2dId = existing.sp2dId;

      if (payload.no_sp2d && payload.no_sp2d.trim() !== existing.no_sp2d) {
        const sp2d = await tx.trhsp2d.findFirst({
          where: {
            tahunAnggaran: existing.tahunAnggaran,
            opdId: existing.opdId,
            no_sp2d: payload.no_sp2d.trim(),
          },
        });
        if (!sp2d) {
          throw new Error(`Dokumen SP2D ${payload.no_sp2d} tidak ditemukan.`);
        }
        nextSp2dNo = sp2d.no_sp2d;
        nextSp2dTgl = sp2d.tgl_sp2d;
        nextSp2dId = sp2d.id;
      }

      const nextTglBukti = payload.tgl_bukti
        ? new Date(payload.tgl_bukti)
        : existing.tgl_bukti;

      const updated = await tx.trhtransout.update({
        where: { id },
        data: {
          no_sp2d: nextSp2dNo,
          tgl_sp2d: nextSp2dTgl,
          sp2dId: nextSp2dId,
          tgl_bukti: nextTglBukti,
          uraian: payload.uraian !== undefined ? payload.uraian : existing.uraian,
          pay_type: payload.pay_type || existing.pay_type,
        },
        include: { rincian: true },
      });

      // Sinkronkan tanggal & no_sp2d pada penerimaan & penyetoran potongan terkait (jika ada)
      if (existing.no_spj) {
        const linkedTrmpots = await tx.trhtrmpot.findMany({
          where: {
            tahunAnggaran: existing.tahunAnggaran,
            opdId: existing.opdId,
            uraian: { startsWith: `Penerimaan Potongan SPJ ${existing.no_spj}` },
          },
          select: { id: true, no_bukti: true },
        });

        for (const tp of linkedTrmpots) {
          await tx.trhtrmpot.update({
            where: { id: tp.id },
            data: {
              tgl_bukti: nextTglBukti,
              no_sp2d: nextSp2dNo || existing.no_sp2d,
            },
          });

          await tx.trhstrpot.updateMany({
            where: {
              tahunAnggaran: existing.tahunAnggaran,
              opdId: existing.opdId,
              no_trmpot: tp.no_bukti,
            },
            data: {
              tgl_bukti: nextTglBukti,
            },
          });
        }
      }

      return updated;
    });
  },

  async deletePembukuanSpj(id: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhtransout.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new Error("Data pembukuan SPJ tidak ditemukan.");
      }

      // Hapus penerimaan & penyetoran potongan otomatis terkait kuitansi ini (jika ada)
      if (existing.no_spj) {
        const linkedTrmpots = await tx.trhtrmpot.findMany({
          where: {
            tahunAnggaran: existing.tahunAnggaran,
            opdId: existing.opdId,
            uraian: { startsWith: `Penerimaan Potongan SPJ ${existing.no_spj}` },
          },
          select: { id: true, no_bukti: true },
        });

        for (const tp of linkedTrmpots) {
          const linkedStrpots = await tx.trhstrpot.findMany({
            where: {
              tahunAnggaran: existing.tahunAnggaran,
              opdId: existing.opdId,
              no_trmpot: tp.no_bukti,
            },
            select: { id: true },
          });
          if (linkedStrpots.length > 0) {
            const strIds = linkedStrpots.map((s) => s.id);
            await tx.trdstrpot.deleteMany({
              where: { strpotId: { in: strIds } },
            });
            await tx.trhstrpot.deleteMany({
              where: { id: { in: strIds } },
            });
          }

          await tx.trdtrmpot.deleteMany({
            where: { trmpotId: tp.id },
          });
          await tx.trhtrmpot.delete({
            where: { id: tp.id },
          });
        }

        // Kembalikan status kuitansi agar siap dibukukan kembali
        await tx.tblKwitansi.updateMany({
          where: {
            opdId: existing.opdId,
            nomor: existing.no_spj,
            status: "DIBUKUKAN",
          },
          data: { status: "TERVALIDASI" },
        });
      }

      await tx.trdtransout.deleteMany({
        where: { transoutId: id },
      });
      await tx.trhtransout.delete({
        where: { id },
      });

      return { deletedId: id, no_bukti: existing.no_bukti };
    });
  },

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

    const strpotWhere: Prisma.TrhstrpotWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      no_trmpot: { not: null },
    };
    if (params.opdId && params.opdId !== "ALL") {
      strpotWhere.opdId = params.opdId;
    }

    const [trmpots, strpots] = await Promise.all([
      prisma.trhtrmpot.findMany({
        where,
        include: {
          rincian: true,
          opd: { select: { kd_skpd: true, nm_skpd: true } },
        },
        orderBy: { tgl_bukti: "desc" },
      }),
      prisma.trhstrpot.findMany({
        where: strpotWhere,
        select: { no_trmpot: true, no_bukti: true },
      }),
    ]);

    const strpotMap = new Map<string, string>();
    for (const s of strpots) {
      if (s.no_trmpot) strpotMap.set(s.no_trmpot, s.no_bukti);
    }

    return trmpots.map((t) => {
      const strpotNoBukti = strpotMap.get(t.no_bukti) || null;
      return {
        ...t,
        isLocked: Boolean(strpotNoBukti),
        strpotNoBukti,
      };
    });
  },

  async getKwitansiCairOptions(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
  }) {
    const where: Prisma.TblKwitansiWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      cair: 1,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      where.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    return await prisma.tblKwitansi.findMany({
      where,
      select: {
        id: true,
        nomor: true,
        tanggal: true,
        uraian: true,
        nilai: true,
        status: true,
        potonganList: {
          select: {
            kd_rek6: true,
            nm_rek6: true,
            id_billing: true,
            nilai: true,
            keterangan: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
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
      const seq = await this.getNextBkuSeq({
        tahunAnggaran: payload.tahunAnggaran,
        opdId: opd.id,
      });
      let kodeUnit = (payload.kd_unit || "").trim();
      if (!kodeUnit) {
        const defaultUnit = await prisma.unitKerja.findFirst({
          where: { opdId: opd.id, isActive: true },
          orderBy: { kd_unit: "asc" },
          select: { kd_unit: true },
        });
        kodeUnit = defaultUnit?.kd_unit || opd.kd_skpd;
      }
      const unitPart = kodeUnit.replace(/[^a-zA-Z0-9.-]/g, "");
      noBukti = `${String(seq).padStart(5, "0")}/${unitPart}/${payload.tahunAnggaran}`;
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

  async updatePenerimaanPotongan(
    id: string,
    payload: {
      no_bukti?: string;
      tgl_bukti?: string | Date;
      no_sp2d?: string;
      uraian: string;
      rincian: Array<{
        kd_rek6: string;
        nm_rek6: string;
        id_billing?: string;
        nilai: number;
        keterangan?: string;
      }>;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhtrmpot.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Data penerimaan potongan tidak ditemukan.");
      }

      const linkedStrpot = await tx.trhstrpot.findFirst({
        where: {
          tahunAnggaran: existing.tahunAnggaran,
          opdId: existing.opdId,
          no_trmpot: existing.no_bukti,
        },
        select: { no_bukti: true },
      });
      if (linkedStrpot) {
        throw new Error(
          `Penerimaan potongan ini sudah disetorkan (No. BKU ${linkedStrpot.no_bukti}) dan terkunci. Hapus data Penyetoran Potongan terlebih dahulu.`
        );
      }

      const nextNoBukti = payload.no_bukti?.trim() || existing.no_bukti;
      const total = payload.rincian.reduce(
        (sum, r) => sum + (Number(r.nilai) || 0),
        0
      );

      await tx.trdtrmpot.deleteMany({
        where: { trmpotId: id },
      });

      const updated = await tx.trhtrmpot.update({
        where: { id },
        data: {
          no_bukti: nextNoBukti,
          tgl_bukti: payload.tgl_bukti
            ? new Date(payload.tgl_bukti)
            : existing.tgl_bukti,
          no_sp2d: payload.no_sp2d !== undefined ? payload.no_sp2d || null : existing.no_sp2d,
          uraian: payload.uraian,
          total: new Prisma.Decimal(total),
          rincian: {
            create: payload.rincian.map((r) => ({
              no_bukti: nextNoBukti,
              kd_rek6: r.kd_rek6,
              nm_rek6: r.nm_rek6,
              id_billing: r.id_billing || null,
              nilai: new Prisma.Decimal(Number(r.nilai) || 0),
              keterangan: r.keterangan || null,
            })),
          },
        },
        include: { rincian: true },
      });

      if (nextNoBukti !== existing.no_bukti) {
        await tx.trhstrpot.updateMany({
          where: {
            tahunAnggaran: existing.tahunAnggaran,
            opdId: existing.opdId,
            no_trmpot: existing.no_bukti,
          },
          data: { no_trmpot: nextNoBukti },
        });
      }

      return updated;
    });
  },

  async deletePenerimaanPotongan(id: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhtrmpot.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Data penerimaan potongan tidak ditemukan.");
      }

      const linkedStrpot = await tx.trhstrpot.findFirst({
        where: {
          tahunAnggaran: existing.tahunAnggaran,
          opdId: existing.opdId,
          no_trmpot: existing.no_bukti,
        },
        select: { no_bukti: true },
      });
      if (linkedStrpot) {
        throw new Error(
          `Penerimaan potongan ini sudah disetorkan (No. BKU ${linkedStrpot.no_bukti}) dan terkunci. Hapus data Penyetoran Potongan terlebih dahulu.`
        );
      }

      await tx.trdtrmpot.deleteMany({ where: { trmpotId: id } });
      await tx.trhtrmpot.delete({ where: { id } });

      return { deletedId: id, no_bukti: existing.no_bukti };
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

  async getUnsetorTrmpotList(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
  }) {
    const trmpotWhere: Prisma.TrhtrmpotWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      trmpotWhere.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      trmpotWhere.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    const strpotWhere: Prisma.TrhstrpotWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      no_trmpot: { not: null },
    };
    if (params.opdId && params.opdId !== "ALL") {
      strpotWhere.opdId = params.opdId;
    }

    const [trmpots, strpots] = await Promise.all([
      prisma.trhtrmpot.findMany({
        where: trmpotWhere,
        include: { rincian: true },
        orderBy: [{ tgl_bukti: "desc" }, { createdAt: "desc" }],
      }),
      prisma.trhstrpot.findMany({
        where: strpotWhere,
        select: { no_trmpot: true },
      }),
    ]);

    const setoredSet = new Set(
      strpots.map((s) => s.no_trmpot).filter((v): v is string => Boolean(v))
    );

    return trmpots.filter((t) => !setoredSet.has(t.no_bukti));
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
      const seq = await this.getNextBkuSeq({
        tahunAnggaran: payload.tahunAnggaran,
        opdId: opd.id,
      });
      let kodeUnit = (payload.kd_unit || "").trim();
      if (!kodeUnit) {
        const defaultUnit = await prisma.unitKerja.findFirst({
          where: { opdId: opd.id, isActive: true },
          orderBy: { kd_unit: "asc" },
          select: { kd_unit: true },
        });
        kodeUnit = defaultUnit?.kd_unit || opd.kd_skpd;
      }
      const unitPart = kodeUnit.replace(/[^a-zA-Z0-9.-]/g, "");
      noBukti = `${String(seq).padStart(5, "0")}/${unitPart}/${payload.tahunAnggaran}`;
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

  async updatePenyetoranPotongan(
    id: string,
    payload: {
      no_bukti?: string;
      tgl_bukti?: string | Date;
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
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhstrpot.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Data penyetoran potongan tidak ditemukan.");
      }

      const nextNoBukti = payload.no_bukti?.trim() || existing.no_bukti;
      const total = payload.rincian.reduce(
        (sum, r) => sum + (Number(r.nilai) || 0),
        0
      );

      await tx.trdstrpot.deleteMany({
        where: { strpotId: id },
      });

      return await tx.trhstrpot.update({
        where: { id },
        data: {
          no_bukti: nextNoBukti,
          tgl_bukti: payload.tgl_bukti
            ? new Date(payload.tgl_bukti)
            : existing.tgl_bukti,
          no_trmpot:
            payload.no_trmpot !== undefined
              ? payload.no_trmpot || null
              : existing.no_trmpot,
          uraian: payload.uraian,
          total: new Prisma.Decimal(total),
          rincian: {
            create: payload.rincian.map((r) => ({
              no_bukti: nextNoBukti,
              kd_rek6: r.kd_rek6,
              nm_rek6: r.nm_rek6,
              id_billing: r.id_billing || null,
              ntpn: r.ntpn || null,
              nilai: new Prisma.Decimal(Number(r.nilai) || 0),
              keterangan: r.keterangan || null,
            })),
          },
        },
        include: { rincian: true },
      });
    });
  },

  async deletePenyetoranPotongan(id: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhstrpot.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Data penyetoran potongan tidak ditemukan.");
      }

      await tx.trdstrpot.deleteMany({ where: { strpotId: id } });
      await tx.trhstrpot.delete({ where: { id } });

      return { deletedId: id, no_bukti: existing.no_bukti };
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
      orderBy: { tgl_bukti: "desc" },
    });
  },

  async getSetorSisaData(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
    tipe?: "SISA_KAS" | "PENGEMBALIAN";
  }) {
    const bookedList = await this.getSetorSisaList({
      tahunAnggaran: params.tahunAnggaran,
      opdId: params.opdId,
      tipe: params.tipe,
    });

    const targetJenis =
      params.tipe === "PENGEMBALIAN" ? "BELANJA" : "SISA_KAS";

    const stsWhere: Prisma.TblPengembalianWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      jenis_pengembalian: targetJenis,
      verif: 1,
      status: { not: "DIBUKUKAN" },
    };
    if (params.opdId && params.opdId !== "ALL") {
      stsWhere.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      stsWhere.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    const sp2dWhere: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
      status: "CAIR",
      ...(params.tipe === "PENGEMBALIAN"
        ? {}
        : { jenis_sp2d: { in: ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"] } }),
    };
    if (params.opdId && params.opdId !== "ALL") {
      sp2dWhere.opdId = params.opdId;
    }

    const [readyStsList, sp2dOptions] = await Promise.all([
      prisma.tblPengembalian.findMany({
        where: stsWhere,
        include: {
          opd: { select: { kd_skpd: true, nm_skpd: true } },
        },
        orderBy: [{ tgl_bayar: "desc" }, { tgl_tetap: "desc" }],
      }),
      prisma.trhsp2d.findMany({
        where: sp2dWhere,
        select: {
          id: true,
          no_sp2d: true,
          tgl_sp2d: true,
          jenis_sp2d: true,
          keperluan: true,
          nilai: true,
        },
        orderBy: [{ tgl_sp2d: "desc" }, { no_sp2d: "desc" }],
      }),
    ]);

    return {
      bookedList,
      readyStsList,
      sp2dOptions: sp2dOptions.map((s) => ({
        ...s,
        nilai: Number(s.nilai || 0),
      })),
    };
  },

  async saveSetorSisaFromSts(payload: {
    tahunAnggaran: number;
    opdId: string;
    pengembalianId: string;
    tipe?: "SISA_KAS" | "PENGEMBALIAN";
    tgl_bukti?: string | Date;
    jenis_kas?: string;
    no_sp2d?: string;
    uraian?: string;
  }) {
    if (!payload.pengembalianId) {
      throw new Error("STS wajib dipilih.");
    }

    const isPengembalian = payload.tipe === "PENGEMBALIAN";
    const expectedJenis = isPengembalian ? "BELANJA" : "SISA_KAS";
    const sumberDana = isPengembalian
      ? "PENGEMBALIAN_BELANJA"
      : "SISA_KAS_UP_GU_TU";

    return await prisma.$transaction(async (tx) => {
      const sts = await tx.tblPengembalian.findUnique({
        where: { id: payload.pengembalianId },
        include: {
          opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
        },
      });

      if (!sts) {
        throw new Error("Dokumen STS tidak ditemukan.");
      }
      if (sts.jenis_pengembalian !== expectedJenis) {
        throw new Error(
          isPengembalian
            ? "Hanya STS dengan jenis Belanja yang dapat dibukukan di menu Pengembalian Belanja."
            : "Hanya STS dengan jenis Sisa Kas yang dapat dibukukan di menu Setor Sisa Kas."
        );
      }
      if (sts.verif !== 1) {
        throw new Error("STS belum berstatus Terbayar (verif = 1).");
      }
      if (sts.status === "DIBUKUKAN") {
        throw new Error(`STS ${sts.no_sts || sts.no_tetap} sudah pernah dibukukan.`);
      }

      let kodeUnit = (sts.kd_unit || "").trim();
      if (!kodeUnit) {
        const defaultUnit = await tx.unitKerja.findFirst({
          where: { opdId: sts.opdId, isActive: true },
          orderBy: { kd_unit: "asc" },
          select: { kd_unit: true },
        });
        kodeUnit = defaultUnit?.kd_unit || sts.kd_skpd;
      }
      const unitPart = kodeUnit.replace(/[^a-zA-Z0-9.-]/g, "");
      const tahun = sts.tahunAnggaran;

      let seq = await this.getNextBkuSeq({ tahunAnggaran: tahun, opdId: sts.opdId }, tx);
      let noKas = `${String(seq).padStart(5, "0")}/${unitPart}/${tahun}`;
      while (
        await tx.trhkasin.findFirst({
          where: { tahunAnggaran: tahun, no_bukti: noKas },
          select: { id: true },
        })
      ) {
        seq += 1;
        noKas = `${String(seq).padStart(5, "0")}/${unitPart}/${tahun}`;
      }
      const tglKas = payload.tgl_bukti
        ? new Date(payload.tgl_bukti)
        : sts.tgl_bayar || sts.tgl_sts || sts.tgl_tetap;

      const kasin = await tx.trhkasin.create({
        data: {
          tahunAnggaran: tahun,
          no_bukti: noKas,
          tgl_bukti: tglKas,
          no_sts: sts.no_sts || sts.no_tetap,
          tgl_sts: sts.tgl_sts || sts.tgl_tetap,
          kd_skpd: sts.kd_skpd,
          nm_skpd: sts.nm_skpd,
          opdId: sts.opdId,
          kd_unit: sts.kd_unit || kodeUnit,
          nm_unit: sts.nm_unit,
          sumber_dana: sumberDana,
          uraian: payload.uraian?.trim() || sts.uraian,
          nama_penyetor: sts.nama_penyetor || "Bendahara Pengeluaran",
          nama_bank: payload.jenis_kas || (isPengembalian ? "BELANJA" : "UP"),
          rek_bank: payload.no_sp2d || sts.kd_cabang || null,
          nilai: sts.nilai,
          status: "TERIMA",
          rincianRekening: {
            create: [
              {
                no_bukti: noKas,
                kd_sub_kegiatan: sts.kd_sub_kegiatan || null,
                nm_sub_kegiatan: sts.nm_sub_kegiatan || null,
                kd_rek6:
                  sts.kd_rek6 ||
                  (isPengembalian ? "5.1.02.01.01.0001" : "1.1.01.03.01.0001"),
                nm_rek6:
                  sts.nm_rek6 ||
                  (isPengembalian
                    ? "Pengembalian Belanja"
                    : "Kas di Bendahara Pengeluaran"),
                nilai: sts.nilai,
                keterangan: payload.uraian?.trim() || sts.uraian,
              },
            ],
          },
        },
        include: { rincianRekening: true },
      });

      await tx.tblPengembalian.update({
        where: { id: sts.id },
        data: { status: "DIBUKUKAN" },
      });

      return { kasin, no_bukti: noKas };
    });
  },

  async updateSetorSisaKas(
    id: string,
    payload: {
      tgl_bukti?: string | Date;
      jenis_kas?: string;
      no_sp2d?: string;
      uraian?: string;
    }
  ) {
    const existing = await prisma.trhkasin.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Data Setor Sisa Kas tidak ditemukan.");
    }

    const tglKas = payload.tgl_bukti ? new Date(payload.tgl_bukti) : existing.tgl_bukti;

    return await prisma.trhkasin.update({
      where: { id },
      data: {
        tgl_bukti: tglKas,
        tgl_sts: tglKas,
        nama_bank: payload.jenis_kas !== undefined ? payload.jenis_kas : existing.nama_bank,
        rek_bank: payload.no_sp2d !== undefined ? payload.no_sp2d || null : existing.rek_bank,
        uraian: payload.uraian !== undefined ? payload.uraian : existing.uraian,
      },
      include: { rincianRekening: true },
    });
  },

  async deleteSetorSisaKas(id: string) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.trhkasin.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Data Setor Sisa Kas tidak ditemukan.");
      }

      if (existing.no_sts) {
        await tx.tblPengembalian.updateMany({
          where: {
            tahunAnggaran: existing.tahunAnggaran,
            opdId: existing.opdId,
            no_sts: existing.no_sts,
            status: "DIBUKUKAN",
          },
          data: { status: "TERBAYAR" },
        });
      }

      await tx.trdkasin.deleteMany({ where: { kasinId: id } });
      await tx.trhkasin.delete({ where: { id } });

      return { deletedId: id, no_bukti: existing.no_bukti };
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
        no_bukti: noKas,
        tgl_bukti: new Date(payload.tgl_sts),
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
              no_bukti: noKas,
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

  // ---------------------------------------------------------------------------
  // 8. PENERBITAN STS (tbl_pengembalian)
  // ---------------------------------------------------------------------------
  async getPenerbitanStsList(params: {
    tahunAnggaran: number;
    opdId?: string;
    kd_unit?: string;
  }) {
    const where: Prisma.TblPengembalianWhereInput = {
      tahunAnggaran: params.tahunAnggaran,
    };
    if (params.opdId && params.opdId !== "ALL") {
      where.opdId = params.opdId;
    }
    if (params.kd_unit && params.kd_unit !== "ALL") {
      where.OR = [
        { kd_unit: params.kd_unit },
        { kd_unit: null },
        { kd_unit: "" },
      ];
    }

    return await prisma.tblPengembalian.findMany({
      where,
      include: {
        opd: { select: { kd_skpd: true, nm_skpd: true } },
      },
      orderBy: [{ tgl_tetap: "desc" }, { createdAt: "desc" }],
    });
  },

  async getPenerbitanStsOptions(params: {
    tahunAnggaran: number;
    opdId?: string;
  }) {
    const [kasBendaharaRek, pendapatanLainnyaRek, trdrkaRows] = await Promise.all([
      prisma.msRek6.findMany({
        where: {
          OR: [
            {
              nm_rek6: {
                contains: "Kas di Bendahara Pengeluaran",
                mode: "insensitive",
              },
            },
            { kd_rek6: { startsWith: "1.1.01.03" } },
          ],
        },
        select: { kd_rek6: true, nm_rek6: true },
        orderBy: { kd_rek6: "asc" },
      }),
      prisma.msRek6.findMany({
        where: {
          OR: [
            { kd_rek6: { startsWith: "4.1.04" } },
            { kd_rek6: { startsWith: "4.3" } },
          ],
        },
        select: { kd_rek6: true, nm_rek6: true },
        orderBy: { kd_rek6: "asc" },
      }),
      params.opdId && params.opdId !== "ALL"
        ? prisma.trdrka.findMany({
            where: {
              tahunAnggaran: params.tahunAnggaran,
              trskpd: { opdId: params.opdId },
            },
            select: {
              kd_sub_kegiatan: true,
              nm_sub_kegiatan: true,
              kd_rek6: true,
              nm_rek6: true,
              nilai: true,
            },
            orderBy: [{ kd_sub_kegiatan: "asc" }, { kd_rek6: "asc" }],
          })
        : Promise.resolve([]),
    ]);

    const subKegiatanMap = new Map<string, string>();
    for (const r of trdrkaRows) {
      if (r.kd_sub_kegiatan && !subKegiatanMap.has(r.kd_sub_kegiatan)) {
        subKegiatanMap.set(r.kd_sub_kegiatan, r.nm_sub_kegiatan || "");
      }
    }

    const subKegiatanOptions = Array.from(subKegiatanMap.entries()).map(
      ([kd_sub_kegiatan, nm_sub_kegiatan]) => ({
        kd_sub_kegiatan,
        nm_sub_kegiatan,
      })
    );

    const nextSeq = await this.getNextStsSeq(params.tahunAnggaran);

    return {
      nextSeq,
      kasBendaharaRek,
      pendapatanLainnyaRek,
      subKegiatanOptions,
      belanjaOptions: trdrkaRows.map((r) => ({
        kd_sub_kegiatan: r.kd_sub_kegiatan,
        nm_sub_kegiatan: r.nm_sub_kegiatan,
        kd_rek6: r.kd_rek6,
        nm_rek6: r.nm_rek6,
        nilai: Number(r.nilai || 0),
      })),
    };
  },

  async getNextStsSeq(tahunAnggaran: number): Promise<number> {
    const rows = await prisma.tblPengembalian.findMany({
      where: { tahunAnggaran },
      select: { no_tetap: true },
    });
    let maxSeq = 0;
    for (const r of rows) {
      const m = /^7(\d+)\//.exec((r.no_tetap || "").trim());
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
    return maxSeq + 1;
  },

  async savePenerbitanSts(payload: {
    tahunAnggaran: number;
    opdId: string;
    kd_unit?: string;
    nm_unit?: string;
    no_sts?: string;
    tgl_sts: string | Date;
    jenis_pengembalian: "SISA_KAS" | "BELANJA" | "LAINNYA";
    kd_sub_kegiatan?: string;
    nm_sub_kegiatan?: string;
    kd_rek6?: string;
    nm_rek6?: string;
    nama_penyetor?: string;
    alamat_penyetor?: string;
    uraian: string;
    nilai: number;
  }) {
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });
    if (!opd) throw new Error("OPD tidak valid");

    const nextSeq = await this.getNextStsSeq(payload.tahunAnggaran);
    const urut = String(nextSeq).padStart(5, "0");
    const rekClean = (payload.kd_rek6 || "").replace(/\./g, "").trim().slice(0, 7);
    const noTetap = `7${urut}/${payload.tahunAnggaran}`;
    const autoNoSts = `1296${rekClean}${payload.tahunAnggaran}7${urut}`;
    const noSts = payload.no_sts?.trim() || autoNoSts;
    const tglSts = new Date(payload.tgl_sts);

    return await prisma.tblPengembalian.create({
      data: {
        tahunAnggaran: payload.tahunAnggaran,
        no_tetap: noTetap,
        tgl_tetap: tglSts,
        no_sts: noSts,
        tgl_sts: tglSts,
        jenis_pengembalian: payload.jenis_pengembalian,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        opdId: opd.id,
        kd_unit: payload.kd_unit || null,
        nm_unit: payload.nm_unit || null,
        kd_sub_kegiatan: payload.kd_sub_kegiatan || null,
        nm_sub_kegiatan: payload.nm_sub_kegiatan || null,
        kd_rek6: payload.kd_rek6 || null,
        nm_rek6: payload.nm_rek6 || null,
        nama_penyetor: payload.nama_penyetor || null,
        alamat_penyetor: payload.alamat_penyetor || null,
        uraian: payload.uraian,
        nilai: new Prisma.Decimal(Number(payload.nilai) || 0),
        status: "TERBIT",
      },
    });
  },

  async updatePenerbitanSts(
    id: string,
    payload: {
      no_sts?: string;
      tgl_sts?: string | Date;
      jenis_pengembalian: "SISA_KAS" | "BELANJA" | "LAINNYA";
      kd_sub_kegiatan?: string;
      nm_sub_kegiatan?: string;
      kd_rek6?: string;
      nm_rek6?: string;
      nama_penyetor?: string;
      alamat_penyetor?: string;
      uraian: string;
      nilai: number;
    }
  ) {
    const existing = await prisma.tblPengembalian.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Data Penerbitan STS tidak ditemukan.");
    }
    if (existing.status === "DIBUKUKAN") {
      throw new Error(
        "STS ini sudah dibukukan pada menu Setor Sisa Kas. Hapus pembukuan Setor Sisa Kas terlebih dahulu."
      );
    }
    if (existing.verif === 1) {
      throw new Error(
        "STS ini sudah berstatus terbayar (verif = 1) dan terkunci. Batalkan status pembayaran terlebih dahulu untuk mengubah data."
      );
    }

    const tglSts = payload.tgl_sts ? new Date(payload.tgl_sts) : existing.tgl_tetap;

    return await prisma.tblPengembalian.update({
      where: { id },
      data: {
        no_sts: payload.no_sts?.trim() || existing.no_sts,
        tgl_tetap: tglSts,
        tgl_sts: tglSts,
        jenis_pengembalian: payload.jenis_pengembalian,
        kd_sub_kegiatan: payload.kd_sub_kegiatan || null,
        nm_sub_kegiatan: payload.nm_sub_kegiatan || null,
        kd_rek6: payload.kd_rek6 || null,
        nm_rek6: payload.nm_rek6 || null,
        nama_penyetor: payload.nama_penyetor || null,
        alamat_penyetor: payload.alamat_penyetor || null,
        uraian: payload.uraian,
        nilai: new Prisma.Decimal(Number(payload.nilai) || 0),
      },
    });
  },

  async deletePenerbitanSts(id: string) {
    const existing = await prisma.tblPengembalian.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Data Penerbitan STS tidak ditemukan.");
    }
    if (existing.status === "DIBUKUKAN") {
      throw new Error(
        "STS ini sudah dibukukan pada menu Setor Sisa Kas. Hapus pembukuan Setor Sisa Kas terlebih dahulu."
      );
    }
    if (existing.verif === 1) {
      throw new Error(
        "STS ini sudah berstatus terbayar (verif = 1) dan terkunci. Batalkan status pembayaran terlebih dahulu untuk menghapus data."
      );
    }
    await prisma.tblPengembalian.delete({ where: { id } });
    return { deletedId: id, no_sts: existing.no_sts || existing.no_tetap };
  },

  async updateStsPaymentStatus(
    id: string,
    payload: {
      kd_cabang: string;
      kd_pengesahan: string;
      tgl_bayar: string | Date;
      nm_channel: string;
      kd_terminal: string;
    }
  ) {
    const existing = await prisma.tblPengembalian.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Data Penerbitan STS tidak ditemukan.");
    }
    if (existing.status === "DIBUKUKAN") {
      throw new Error(
        "STS ini sudah dibukukan pada menu Setor Sisa Kas. Hapus pembukuan Setor Sisa Kas terlebih dahulu."
      );
    }

    return await prisma.tblPengembalian.update({
      where: { id },
      data: {
        kd_cabang: payload.kd_cabang?.trim() || null,
        kd_pengesahan: payload.kd_pengesahan?.trim() || null,
        tgl_bayar: payload.tgl_bayar ? new Date(payload.tgl_bayar) : new Date(),
        nm_channel: payload.nm_channel?.trim() || null,
        kd_terminal: payload.kd_terminal?.trim() || null,
        verif: 1,
        status: "TERBAYAR",
      },
    });
  },

  async cancelStsPaymentStatus(id: string) {
    const existing = await prisma.tblPengembalian.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Data Penerbitan STS tidak ditemukan.");
    }
    if (existing.status === "DIBUKUKAN") {
      throw new Error(
        "STS ini sudah dibukukan pada menu Setor Sisa Kas. Hapus pembukuan Setor Sisa Kas terlebih dahulu."
      );
    }

    return await prisma.tblPengembalian.update({
      where: { id },
      data: {
        kd_cabang: null,
        kd_pengesahan: null,
        tgl_bayar: null,
        nm_channel: null,
        kd_terminal: null,
        verif: 0,
        status: "TERBIT",
      },
    });
  },
};

