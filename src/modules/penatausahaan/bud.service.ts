import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SessionPayload } from "@/lib/session";

export function isBudAuthorized(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;
  if (session.roleKode === "1") return true; // BUD
  if (session.roleKode === "3") return true; // Bidang Perbendaharaan

  const perms = session.permissions || [];
  if (
    perms.includes("bud:read") ||
    perms.includes("bud:write") ||
    perms.includes("sp2d:read") ||
    perms.includes("sp2d:write")
  ) {
    return true;
  }
  return false;
}

export interface PenerimaanFilter {
  tahunAnggaran: number;
  opdId?: string;
  kd_skpd?: string;
  startDate?: string;
  endDate?: string;
  sumber_dana?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PenerimaanInput {
  id?: string;
  tahunAnggaran: number;
  no_kas: string;
  tgl_kas: string | Date;
  no_sts?: string | null;
  tgl_sts?: string | Date | null;
  opdId: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  unitKerjaId?: string | null;
  uraian: string;
  sumber_dana?: string | null;
  nama_penyetor?: string | null;
  alamat_penyetor?: string | null;
  nama_bank?: string | null;
  rek_bank?: string | null;
  nilai?: number;
  status?: string;
  keterangan?: string | null;
  rincianRekening?: Array<{
    id?: string;
    kd_rek6: string;
    nm_rek6: string;
    kd_sub_kegiatan?: string | null;
    nm_sub_kegiatan?: string | null;
    nilai: number;
    keterangan?: string | null;
  }>;
}

/**
 * Service untuk Modul Bendahara Umum Daerah (BUD)
 */
export const budService = {
  // ---------------------------------------------------------------------------
  // 1. PENERIMAAN DAERAH (trhkasin & trdkasin)
  // ---------------------------------------------------------------------------
  async getPenerimaanList(filter: PenerimaanFilter) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TrhkasinWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
    };

    if (filter.opdId && filter.opdId !== "ALL") {
      where.opdId = filter.opdId;
    }
    if (filter.kd_skpd && filter.kd_skpd !== "ALL") {
      where.kd_skpd = filter.kd_skpd;
    }
    if (filter.sumber_dana && filter.sumber_dana !== "ALL") {
      where.sumber_dana = filter.sumber_dana;
    }

    if (filter.startDate || filter.endDate) {
      where.tgl_kas = {};
      if (filter.startDate) {
        where.tgl_kas.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_kas.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { no_kas: { contains: q, mode: "insensitive" } },
        { no_sts: { contains: q, mode: "insensitive" } },
        { uraian: { contains: q, mode: "insensitive" } },
        { nm_skpd: { contains: q, mode: "insensitive" } },
        { nama_penyetor: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, data, stats] = await Promise.all([
      prisma.trhkasin.count({ where }),
      prisma.trhkasin.findMany({
        where,
        include: {
          rincianRekening: true,
          opd: {
            select: { id: true, kd_skpd: true, nm_skpd: true },
          },
        },
        orderBy: [{ tgl_kas: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.trhkasin.aggregate({
        where,
        _sum: { nilai: true },
        _count: { id: true },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalNilai: stats._sum.nilai ? Number(stats._sum.nilai) : 0,
        totalTransaksi: stats._count.id || 0,
      },
    };
  },

  async getPenerimaanDetail(id: string) {
    const data = await prisma.trhkasin.findUnique({
      where: { id },
      include: {
        rincianRekening: true,
        opd: true,
      },
    });

    if (!data) {
      throw new Error("Data Penerimaan Daerah tidak ditemukan");
    }

    return data;
  },

  async generateNoKas(tahun: number, kd_unit: string = "BUD") {
    const cleanUnit = (kd_unit || "BUD").replace(/[^a-zA-Z0-9.-]/g, "");
    const count = await prisma.trhkasin.count({
      where: { tahunAnggaran: tahun },
    });
    const urut = String(count + 1).padStart(5, "0");
    return `${urut}/${cleanUnit}/KAS-IN/${tahun}`;
  },

  async savePenerimaan(input: PenerimaanInput) {
    const { id, rincianRekening = [], ...payload } = input;

    // Ambil data OPD
    const opd = await prisma.opd.findUnique({
      where: { id: payload.opdId },
      select: { id: true, kd_skpd: true, nm_skpd: true },
    });

    if (!opd) {
      throw new Error("OPD tidak valid atau tidak ditemukan");
    }

    const totalNilai = rincianRekening.reduce(
      (sum, item) => sum + (Number(item.nilai) || 0),
      0
    );

    const tglKas = new Date(payload.tgl_kas);
    const tglSts = payload.tgl_sts ? new Date(payload.tgl_sts) : null;

    if (id) {
      // Update
      const result = await prisma.$transaction(async (tx) => {
        // Hapus rincian lama
        await tx.trdkasin.deleteMany({
          where: { kasinId: id },
        });

        const updated = await tx.trhkasin.update({
          where: { id },
          data: {
            tahunAnggaran: payload.tahunAnggaran,
            no_kas: payload.no_kas,
            tgl_kas: tglKas,
            no_sts: payload.no_sts,
            tgl_sts: tglSts,
            kd_skpd: opd.kd_skpd,
            nm_skpd: opd.nm_skpd,
            opdId: opd.id,
            kd_unit: payload.kd_unit,
            nm_unit: payload.nm_unit,
            unitKerjaId: payload.unitKerjaId,
            uraian: payload.uraian,
            sumber_dana: payload.sumber_dana || "PAD",
            nama_penyetor: payload.nama_penyetor,
            alamat_penyetor: payload.alamat_penyetor,
            nama_bank: payload.nama_bank,
            rek_bank: payload.rek_bank,
            nilai: new Prisma.Decimal(totalNilai),
            status: payload.status || "TERIMA",
            keterangan: payload.keterangan,
            rincianRekening: {
              create: rincianRekening.map((r) => ({
                no_kas: payload.no_kas,
                kd_rek6: r.kd_rek6,
                nm_rek6: r.nm_rek6,
                kd_sub_kegiatan: r.kd_sub_kegiatan,
                nm_sub_kegiatan: r.nm_sub_kegiatan,
                nilai: new Prisma.Decimal(r.nilai || 0),
                keterangan: r.keterangan,
              })),
            },
          },
          include: {
            rincianRekening: true,
          },
        });

        return updated;
      });

      return result;
    } else {
      // Create New
      const noKas =
        payload.no_kas && payload.no_kas.trim()
          ? payload.no_kas.trim()
          : await this.generateNoKas(payload.tahunAnggaran, payload.kd_unit || opd.kd_skpd);

      const created = await prisma.trhkasin.create({
        data: {
          tahunAnggaran: payload.tahunAnggaran,
          no_kas: noKas,
          tgl_kas: tglKas,
          no_sts: payload.no_sts,
          tgl_sts: tglSts,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId: opd.id,
          kd_unit: payload.kd_unit,
          nm_unit: payload.nm_unit,
          unitKerjaId: payload.unitKerjaId,
          uraian: payload.uraian,
          sumber_dana: payload.sumber_dana || "PAD",
          nama_penyetor: payload.nama_penyetor,
          alamat_penyetor: payload.alamat_penyetor,
          nama_bank: payload.nama_bank,
          rek_bank: payload.rek_bank,
          nilai: new Prisma.Decimal(totalNilai),
          status: payload.status || "TERIMA",
          keterangan: payload.keterangan,
          rincianRekening: {
            create: rincianRekening.map((r) => ({
              no_kas: noKas,
              kd_rek6: r.kd_rek6,
              nm_rek6: r.nm_rek6,
              kd_sub_kegiatan: r.kd_sub_kegiatan,
              nm_sub_kegiatan: r.nm_sub_kegiatan,
              nilai: new Prisma.Decimal(r.nilai || 0),
              keterangan: r.keterangan,
            })),
          },
        },
        include: {
          rincianRekening: true,
        },
      });

      return created;
    }
  },

  async deletePenerimaan(id: string) {
    const existing = await prisma.trhkasin.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error("Data Penerimaan Daerah tidak ditemukan");
    }

    return await prisma.trhkasin.delete({
      where: { id },
    });
  },

  // ---------------------------------------------------------------------------
  // 2. PENGELUARAN DAERAH (Daftar SP2D yang Cair)
  // ---------------------------------------------------------------------------
  async getPengeluaranList(filter: {
    tahunAnggaran: number;
    opdId?: string;
    startDate?: string;
    endDate?: string;
    jenis_sp2d?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: "CAIR", // Khusus daftar SP2D yang telah cair
    };

    if (filter.opdId && filter.opdId !== "ALL") {
      where.opdId = filter.opdId;
    }
    if (filter.jenis_sp2d && filter.jenis_sp2d !== "ALL") {
      where.jenis_sp2d = filter.jenis_sp2d;
    }

    if (filter.startDate || filter.endDate) {
      where.tgl_cair = {};
      if (filter.startDate) {
        where.tgl_cair.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_cair.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { no_sp2d: { contains: q, mode: "insensitive" } },
        { no_spm: { contains: q, mode: "insensitive" } },
        { no_spp: { contains: q, mode: "insensitive" } },
        { no_transaksi_bank: { contains: q, mode: "insensitive" } },
        { keperluan: { contains: q, mode: "insensitive" } },
        { nm_skpd: { contains: q, mode: "insensitive" } },
        { nama_penerima: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, data, stats] = await Promise.all([
      prisma.trhsp2d.count({ where }),
      prisma.trhsp2d.findMany({
        where,
        include: {
          opd: {
            select: { id: true, kd_skpd: true, nm_skpd: true },
          },
          spm: {
            select: {
              id: true,
              potongan: true,
            },
          },
          spp: {
            select: {
              id: true,
              rincian: true,
            },
          },
        },
        orderBy: [{ tgl_cair: "desc" }, { no_sp2d: "desc" }],
        skip,
        take: limit,
      }),
      prisma.trhsp2d.aggregate({
        where,
        _sum: {
          nilai: true,
          nilai_potongan: true,
          nilai_bersih: true,
        },
        _count: { id: true },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalBruto: stats._sum.nilai ? Number(stats._sum.nilai) : 0,
        totalPotongan: stats._sum.nilai_potongan
          ? Number(stats._sum.nilai_potongan)
          : 0,
        totalNetto: stats._sum.nilai_bersih
          ? Number(stats._sum.nilai_bersih)
          : 0,
        totalSp2dCair: stats._count.id || 0,
      },
    };
  },

  // ---------------------------------------------------------------------------
  // 3. BUKU KAS UMUM DAERAH (BKU BUD)
  // Menyatukan seluruh mutasi Penerimaan (Kas Masuk) & Pengeluaran SP2D (Kas Keluar)
  // ---------------------------------------------------------------------------
  async getBkuBud(filter: {
    tahunAnggaran: number;
    startDate?: string;
    endDate?: string;
    opdId?: string;
  }) {
    // 1. Saldo Awal (Transaksi sebelum startDate)
    let saldoAwalPenerimaan = 0;
    let saldoAwalPengeluaran = 0;

    if (filter.startDate) {
      const prevDate = new Date(`${filter.startDate}T00:00:00.000Z`);

      const [prevIn, prevOut] = await Promise.all([
        prisma.trhkasin.aggregate({
          where: {
            tahunAnggaran: filter.tahunAnggaran,
            status: { not: "BATAL" },
            tgl_kas: { lt: prevDate },
            ...(filter.opdId && filter.opdId !== "ALL"
              ? { opdId: filter.opdId }
              : {}),
          },
          _sum: { nilai: true },
        }),
        prisma.trhsp2d.aggregate({
          where: {
            tahunAnggaran: filter.tahunAnggaran,
            status: "CAIR",
            tgl_cair: { lt: prevDate },
            ...(filter.opdId && filter.opdId !== "ALL"
              ? { opdId: filter.opdId }
              : {}),
          },
          _sum: { nilai_bersih: true },
        }),
      ]);

      saldoAwalPenerimaan = prevIn._sum.nilai ? Number(prevIn._sum.nilai) : 0;
      saldoAwalPengeluaran = prevOut._sum.nilai_bersih
        ? Number(prevOut._sum.nilai_bersih)
        : 0;
    }

    const saldoAwal = saldoAwalPenerimaan - saldoAwalPengeluaran;

    // 2. Transaksi Penerimaan dalam periode
    const whereIn: Prisma.TrhkasinWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: { not: "BATAL" },
    };
    if (filter.opdId && filter.opdId !== "ALL") {
      whereIn.opdId = filter.opdId;
    }
    if (filter.startDate || filter.endDate) {
      whereIn.tgl_kas = {};
      if (filter.startDate) {
        whereIn.tgl_kas.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        whereIn.tgl_kas.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    // 3. Transaksi Pengeluaran (SP2D Cair) dalam periode
    const whereOut: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: "CAIR",
    };
    if (filter.opdId && filter.opdId !== "ALL") {
      whereOut.opdId = filter.opdId;
    }
    if (filter.startDate || filter.endDate) {
      whereOut.tgl_cair = {};
      if (filter.startDate) {
        whereOut.tgl_cair.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        whereOut.tgl_cair.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    const [listIn, listOut] = await Promise.all([
      prisma.trhkasin.findMany({
        where: whereIn,
        include: {
          opd: { select: { kd_skpd: true, nm_skpd: true } },
          rincianRekening: true,
        },
        orderBy: { tgl_kas: "asc" },
      }),
      prisma.trhsp2d.findMany({
        where: whereOut,
        include: {
          opd: { select: { kd_skpd: true, nm_skpd: true } },
        },
        orderBy: { tgl_cair: "asc" },
      }),
    ]);

    // Format mutasi
    interface BkuItem {
      id: string;
      tanggal: Date;
      no_bukti: string;
      jenis: "PENERIMAAN" | "PENGELUARAN";
      uraian: string;
      skpd: string;
      debit: number; // Masuk
      kredit: number; // Keluar
      saldo: number;
      sumber_dana?: string | null;
      no_rek?: string | null;
    }

    const combined: Array<Omit<BkuItem, "saldo">> = [];

    listIn.forEach((item) => {
      combined.push({
        id: `IN-${item.id}`,
        tanggal: item.tgl_kas,
        no_bukti: item.no_kas,
        jenis: "PENERIMAAN",
        uraian: item.uraian,
        skpd: item.nm_skpd,
        debit: Number(item.nilai) || 0,
        kredit: 0,
        sumber_dana: item.sumber_dana,
        no_rek: item.rek_bank,
      });
    });

    listOut.forEach((item) => {
      combined.push({
        id: `OUT-${item.id}`,
        tanggal: item.tgl_cair || item.tgl_sp2d,
        no_bukti: item.no_sp2d,
        jenis: "PENGELUARAN",
        uraian: item.keperluan,
        skpd: item.nm_skpd,
        debit: 0,
        kredit: Number(item.nilai_bersih) || 0,
        sumber_dana: item.jenis_sp2d,
        no_rek: item.rek_bank_pembayar,
      });
    });

    // Urutkan berdasarkan tanggal ascending
    combined.sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    // Hitung running balance
    let runningSaldo = saldoAwal;
    let totalPenerimaan = 0;
    let totalPengeluaran = 0;

    const bkuItems: BkuItem[] = combined.map((item) => {
      totalPenerimaan += item.debit;
      totalPengeluaran += item.kredit;
      runningSaldo = runningSaldo + item.debit - item.kredit;
      return {
        ...item,
        saldo: runningSaldo,
      };
    });

    return {
      saldoAwal,
      totalPenerimaan,
      totalPengeluaran,
      saldoAkhir: runningSaldo,
      items: bkuItems,
    };
  },

  // ---------------------------------------------------------------------------
  // 4. DTH DAN RTH (Daftar & Rekapitulasi Transaksi Harian Belanja & Potongan Pajak)
  // ---------------------------------------------------------------------------
  async getDthRth(filter: {
    tahunAnggaran: number;
    startDate?: string;
    endDate?: string;
    opdId?: string;
  }) {
    const where: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: "CAIR",
    };

    if (filter.opdId && filter.opdId !== "ALL") {
      where.opdId = filter.opdId;
    }
    if (filter.startDate || filter.endDate) {
      where.tgl_cair = {};
      if (filter.startDate) {
        where.tgl_cair.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_cair.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    const sp2dList = await prisma.trhsp2d.findMany({
      where,
      include: {
        opd: { select: { kd_skpd: true, nm_skpd: true } },
        spm: {
          select: {
            id: true,
            potongan: true,
          },
        },
      },
      orderBy: { tgl_cair: "asc" },
    });

    // DTH: Daftar Transaksi Harian Belanja SP2D Cair
    const dthItems = sp2dList.map((s, idx) => ({
      noUrut: idx + 1,
      id: s.id,
      tgl_cair: s.tgl_cair,
      no_sp2d: s.no_sp2d,
      no_spm: s.no_spm,
      kd_skpd: s.kd_skpd,
      nm_skpd: s.nm_skpd,
      nama_penerima: s.nama_penerima,
      npwp_penerima: s.npwp_penerima,
      keperluan: s.keperluan,
      nilai_bruto: Number(s.nilai) || 0,
      nilai_potongan: Number(s.nilai_potongan) || 0,
      nilai_netto: Number(s.nilai_bersih) || 0,
      no_transaksi_bank: s.no_transaksi_bank,
      potongan: ((s as any).spm?.potongan || []).map((p: any) => ({
        kd_rek6: p.kd_rek6,
        nm_rek6: p.nm_rek6,
        id_billing: p.id_billing,
        nilai: Number(p.nilai) || 0,
      })),
    }));

    // RTH: Rekapitulasi Pemotongan Pajak / Potongan Lainnya
    const rthMap = new Map<
      string,
      {
        kd_rek6: string;
        nm_rek6: string;
        jumlahTransaksi: number;
        totalNilai: number;
        billingCount: number;
      }
    >();

    sp2dList.forEach((s) => {
      const pots = (s as any).spm?.potongan || [];
      pots.forEach((p: any) => {
        const existing = rthMap.get(p.kd_rek6) || {
          kd_rek6: p.kd_rek6,
          nm_rek6: p.nm_rek6,
          jumlahTransaksi: 0,
          totalNilai: 0,
          billingCount: 0,
        };
        existing.jumlahTransaksi += 1;
        existing.totalNilai += Number(p.nilai) || 0;
        if (p.id_billing && p.id_billing.trim()) {
          existing.billingCount += 1;
        }
        rthMap.set(p.kd_rek6, existing);
      });
    });

    const rthItems = Array.from(rthMap.values()).sort(
      (a, b) => b.totalNilai - a.totalNilai
    );

    const summary = {
      totalTransaksiSp2d: dthItems.length,
      totalBruto: dthItems.reduce((acc, c) => acc + c.nilai_bruto, 0),
      totalPotongan: dthItems.reduce((acc, c) => acc + c.nilai_potongan, 0),
      totalNetto: dthItems.reduce((acc, c) => acc + c.nilai_netto, 0),
    };

    return {
      dth: dthItems,
      rth: rthItems,
      summary,
    };
  },

  // ---------------------------------------------------------------------------
  // 5. REKAPITULASI PENERIMAAN DAERAH
  // ---------------------------------------------------------------------------
  async getRekapPenerimaan(filter: {
    tahunAnggaran: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Prisma.TrhkasinWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: { not: "BATAL" },
    };

    if (filter.startDate || filter.endDate) {
      where.tgl_kas = {};
      if (filter.startDate) {
        where.tgl_kas.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_kas.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    const kasList = await prisma.trhkasin.findMany({
      where,
      include: {
        rincianRekening: true,
      },
    });

    // 1. Rekap Per OPD
    const opdMap = new Map<
      string,
      {
        kd_skpd: string;
        nm_skpd: string;
        totalTransaksi: number;
        totalNilai: number;
      }
    >();

    // 2. Rekap Per Sumber Dana
    const sumberMap = new Map<
      string,
      {
        sumber_dana: string;
        totalTransaksi: number;
        totalNilai: number;
      }
    >();

    // 3. Rekap Per Rekening Pendapatan
    const rekMap = new Map<
      string,
      {
        kd_rek6: string;
        nm_rek6: string;
        totalNilai: number;
        count: number;
      }
    >();

    kasList.forEach((k) => {
      const val = Number(k.nilai) || 0;

      // OPD
      const opdExisting = opdMap.get(k.kd_skpd) || {
        kd_skpd: k.kd_skpd,
        nm_skpd: k.nm_skpd,
        totalTransaksi: 0,
        totalNilai: 0,
      };
      opdExisting.totalTransaksi += 1;
      opdExisting.totalNilai += val;
      opdMap.set(k.kd_skpd, opdExisting);

      // Sumber Dana
      const sd = k.sumber_dana || "LAINNYA";
      const sdExisting = sumberMap.get(sd) || {
        sumber_dana: sd,
        totalTransaksi: 0,
        totalNilai: 0,
      };
      sdExisting.totalTransaksi += 1;
      sdExisting.totalNilai += val;
      sumberMap.set(sd, sdExisting);

      // Rekening
      k.rincianRekening.forEach((r) => {
        const rekVal = Number(r.nilai) || 0;
        const rekExisting = rekMap.get(r.kd_rek6) || {
          kd_rek6: r.kd_rek6,
          nm_rek6: r.nm_rek6,
          totalNilai: 0,
          count: 0,
        };
        rekExisting.totalNilai += rekVal;
        rekExisting.count += 1;
        rekMap.set(r.kd_rek6, rekExisting);
      });
    });

    const perOpd = Array.from(opdMap.values()).sort(
      (a, b) => b.totalNilai - a.totalNilai
    );
    const perSumber = Array.from(sumberMap.values()).sort(
      (a, b) => b.totalNilai - a.totalNilai
    );
    const perRekening = Array.from(rekMap.values()).sort(
      (a, b) => b.totalNilai - a.totalNilai
    );

    const grandTotal = kasList.reduce(
      (acc, c) => acc + (Number(c.nilai) || 0),
      0
    );

    return {
      grandTotal,
      totalTransaksi: kasList.length,
      perOpd,
      perSumber,
      perRekening,
    };
  },

  // ---------------------------------------------------------------------------
  // 6. REKAPITULASI PENGELUARAN DAERAH
  // ---------------------------------------------------------------------------
  async getRekapPengeluaran(filter: {
    tahunAnggaran: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Prisma.Trhsp2dWhereInput = {
      tahunAnggaran: filter.tahunAnggaran,
      status: "CAIR",
    };

    if (filter.startDate || filter.endDate) {
      where.tgl_cair = {};
      if (filter.startDate) {
        where.tgl_cair.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_cair.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    const sp2dList = await prisma.trhsp2d.findMany({
      where,
      select: {
        id: true,
        jenis_sp2d: true,
        kd_skpd: true,
        nm_skpd: true,
        nilai: true,
        nilai_potongan: true,
        nilai_bersih: true,
      },
    });

    // 1. Rekap Per Jenis SP2D
    const jenisMap = new Map<
      string,
      {
        jenis_sp2d: string;
        totalSp2d: number;
        totalBruto: number;
        totalPotongan: number;
        totalNetto: number;
      }
    >();

    // 2. Rekap Per OPD
    const opdMap = new Map<
      string,
      {
        kd_skpd: string;
        nm_skpd: string;
        totalSp2d: number;
        totalBruto: number;
        totalPotongan: number;
        totalNetto: number;
      }
    >();

    sp2dList.forEach((s) => {
      const bruto = Number(s.nilai) || 0;
      const pot = Number(s.nilai_potongan) || 0;
      const netto = Number(s.nilai_bersih) || 0;

      // Jenis
      const jExisting = jenisMap.get(s.jenis_sp2d) || {
        jenis_sp2d: s.jenis_sp2d,
        totalSp2d: 0,
        totalBruto: 0,
        totalPotongan: 0,
        totalNetto: 0,
      };
      jExisting.totalSp2d += 1;
      jExisting.totalBruto += bruto;
      jExisting.totalPotongan += pot;
      jExisting.totalNetto += netto;
      jenisMap.set(s.jenis_sp2d, jExisting);

      // OPD
      const opdExisting = opdMap.get(s.kd_skpd) || {
        kd_skpd: s.kd_skpd,
        nm_skpd: s.nm_skpd,
        totalSp2d: 0,
        totalBruto: 0,
        totalPotongan: 0,
        totalNetto: 0,
      };
      opdExisting.totalSp2d += 1;
      opdExisting.totalBruto += bruto;
      opdExisting.totalPotongan += pot;
      opdExisting.totalNetto += netto;
      opdMap.set(s.kd_skpd, opdExisting);
    });

    const perJenis = Array.from(jenisMap.values()).sort(
      (a, b) => b.totalNetto - a.totalNetto
    );
    const perOpd = Array.from(opdMap.values()).sort(
      (a, b) => b.totalNetto - a.totalNetto
    );

    const summary = {
      totalSp2d: sp2dList.length,
      totalBruto: sp2dList.reduce((acc, c) => acc + (Number(c.nilai) || 0), 0),
      totalPotongan: sp2dList.reduce(
        (acc, c) => acc + (Number(c.nilai_potongan) || 0),
        0
      ),
      totalNetto: sp2dList.reduce(
        (acc, c) => acc + (Number(c.nilai_bersih) || 0),
        0
      ),
    };

    return {
      summary,
      perJenis,
      perOpd,
    };
  },

  // ---------------------------------------------------------------------------
  // 7. REFERENSI PENERIMAAN KAS DAERAH
  // ---------------------------------------------------------------------------
  async getReferensi() {
    const [opdList, rekeningPendapatan] = await Promise.all([
      prisma.opd.findMany({
        where: { isActive: true },
        select: {
          id: true,
          kd_skpd: true,
          nm_skpd: true,
          unitKerjas: {
            where: { isActive: true },
            select: {
              id: true,
              kd_unit: true,
              nm_unit: true,
            },
          },
        },
        orderBy: { kd_skpd: "asc" },
      }),
      prisma.msRek6.findMany({
        where: {
          OR: [
            { kd_rek6: { startsWith: "4" } }, // Akun 4: Pendapatan Daerah
            { kd_rek6: { startsWith: "6" } }, // Akun 6: Penerimaan Pembiayaan
          ],
        },
        select: {
          kd_rek6: true,
          nm_rek6: true,
        },
        orderBy: { kd_rek6: "asc" },
        take: 200,
      }),
    ]);

    // Default Bank Kas Daerah
    const bankKasda = [
      { nama: "PT. Bank Sumut", rekening: "100.01.04.00001-9", cabang: "Cabang Utama Sipirok" },
      { nama: "PT. Bank Mandiri (Persero) Tbk", rekening: "106-00-1234567-8", cabang: "KCP Padang Sidempuan" },
      { nama: "PT. Bank Rakyat Indonesia (Persero) Tbk", rekening: "0134-01-000001-30-1", cabang: "Cabang Sipirok" },
    ];

    const sumberDanaList = [
      { kode: "PAD", nama: "Pendapatan Asli Daerah (PAD)" },
      { kode: "TRANSFER", nama: "Pendapatan Transfer / Dana Bagi Hasil" },
      { kode: "DAU", nama: "Dana Alokasi Umum (DAU)" },
      { kode: "DAK", nama: "Dana Alokasi Khusus (DAK)" },
      { kode: "BAGI_HASIL", nama: "Bagi Hasil Pajak Provinsi & Daerah" },
      { kode: "LAIN_PAD_SAH", nama: "Lain-lain Pendapatan Daerah yang Sah" },
    ];

    return {
      opdList,
      rekeningPendapatan,
      bankKasda,
      sumberDanaList,
    };
  },
};
