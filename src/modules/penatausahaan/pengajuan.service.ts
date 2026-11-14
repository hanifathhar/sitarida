import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { Prisma } from "@prisma/client";

export function isPengajuanAuthorized(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;

  // PPTK (kode 9 atau nama mengandung PPTK)
  if (
    session.roleKode === "9" ||
    session.roleKode?.toLowerCase() === "pptk" ||
    session.roleNama?.toLowerCase().includes("pptk")
  ) {
    return true;
  }

  // PA / KPA (kode 7 atau nama mengandung PA / KPA)
  if (
    session.roleKode === "7" ||
    session.roleKode?.toLowerCase() === "pa" ||
    session.roleKode?.toLowerCase() === "kpa" ||
    session.roleNama?.toLowerCase().includes("pa") ||
    session.roleNama?.toLowerCase().includes("kpa")
  ) {
    return true;
  }

  return false;
}

export function isPaKpa(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;
  return (
    session.roleKode === "7" ||
    session.roleKode?.toLowerCase() === "pa" ||
    session.roleKode?.toLowerCase() === "kpa" ||
    session.roleNama?.toLowerCase().includes("pa") ||
    session.roleNama?.toLowerCase().includes("kpa")
  );
}

export function isPptk(session: SessionPayload): boolean {
  return (
    session.roleKode === "9" ||
    session.roleKode?.toLowerCase() === "pptk" ||
    session.roleNama?.toLowerCase().includes("pptk")
  );
}

export interface KwitansiPenerimaInput {
  nm_penerima: string;
  alamat_penerima?: string | null;
  npwp_penerima?: string | null;
  nm_bank_penerima: string;
  no_rek_penerima: string;
  an_rekening?: string | null;
  nilai: number;
  keterangan?: string | null;
}

export interface KwitansiPotonganInput {
  kd_rek6?: string | null;
  nm_rek6?: string | null;
  id_billing?: string | null;
  ntpn?: string | null;
  nilai: number;
  keterangan?: string | null;
}

export interface CreateKwitansiInput {
  nomor?: string;
  tanggal: string | Date;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  kd_program?: string | null;
  nm_program?: string | null;
  kd_kegiatan?: string | null;
  nm_kegiatan?: string | null;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  jns_beban: string; // UP, GU, TU, LS
  uraian: string;
  nilai: number;
  penerima: KwitansiPenerimaInput[];
  potongan?: KwitansiPotonganInput[];
  pptkUserId?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaUserId?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  bendaharaUserId?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  catatan?: string | null;
}

function sanitizeOptionalUserId(id?: string | null): string | null {
  if (
    !id ||
    id === "kepala-opd" ||
    id.startsWith("rka-") ||
    id.startsWith("custom-")
  ) {
    return null;
  }
  return id;
}

export const pengajuanService = {
  /**
   * Mengambil daftar kuitansi sesuai role & filter
   */
  async getKwitansiList(
    session: SessionPayload,
    params: {
      tahunAnggaran?: number;
      opdId?: string;
      unitKerjaId?: string;
      status?: string;
      jns_beban?: string;
      search?: string;
      tglMulai?: string;
      tglSelesai?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = params.page || 1;
    const limit = params.limit || 15;
    const skip = (page - 1) * limit;

    const where: Prisma.TblKwitansiWhereInput = {};

    if (params.tahunAnggaran) {
      where.tahunAnggaran = params.tahunAnggaran;
    }

    // Role-based OPD restriction
    if (session.roleKode !== "0" && session.roleKode !== "SUPERADMIN") {
      if (session.opdId) {
        where.opdId = session.opdId;
      }
    } else if (params.opdId) {
      where.opdId = params.opdId;
    }

    if (params.unitKerjaId && params.unitKerjaId !== "ALL") {
      where.unitKerjaId = params.unitKerjaId;
    }

    // Role-based PPTK filtering:
    // Jika user PPTK, batasi pada kuitansi miliknya atau yang ditugaskan ke dia
    if (isPptk(session) && !isPaKpa(session)) {
      where.OR = [
        { pptkUserId: session.userId },
        // Atau jika pptkUserId null tapi dibuat di OPD-nya
        { AND: [{ pptkUserId: null }, { opdId: session.opdId || undefined }] }
      ];
    }

    if (params.status && params.status !== "SEMUA") {
      where.status = params.status;
    }

    if (params.jns_beban && params.jns_beban !== "SEMUA") {
      where.jns_beban = params.jns_beban;
    }

    if (params.tglMulai || params.tglSelesai) {
      where.tanggal = {};
      if (params.tglMulai) {
        where.tanggal.gte = new Date(params.tglMulai);
      }
      if (params.tglSelesai) {
        const endDate = new Date(params.tglSelesai);
        endDate.setHours(23, 59, 59, 999);
        where.tanggal.lte = endDate;
      }
    }

    if (params.search) {
      const q = params.search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { nomor: { contains: q, mode: "insensitive" } },
            { uraian: { contains: q, mode: "insensitive" } },
            { nm_sub_kegiatan: { contains: q, mode: "insensitive" } },
            { nm_rek6: { contains: q, mode: "insensitive" } },
            {
              penerimaList: {
                some: { nm_penerima: { contains: q, mode: "insensitive" } },
              },
            },
          ],
        },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.tblKwitansi.count({ where }),
      prisma.tblKwitansi.findMany({
        where,
        include: {
          penerimaList: true,
          potonganList: true,
          opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
          unitKerja: { select: { id: true, kd_unit: true, nm_unit: true } },
        },
        orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
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
    };
  },

  /**
   * Detail kuitansi
   */
  async getKwitansiById(id: string) {
    const kwitansi = await prisma.tblKwitansi.findUnique({
      where: { id },
      include: {
        penerimaList: true,
        potonganList: true,
        opd: { select: { id: true, kd_skpd: true, nm_skpd: true, alamat: true, kepalaNama: true, kepalaNip: true } },
        unitKerja: { select: { id: true, kd_unit: true, nm_unit: true } },
        pptk: { select: { id: true, namaLengkap: true, nip: true, jabatan: true } },
        paKpa: { select: { id: true, namaLengkap: true, nip: true, jabatan: true } },
      },
    });

    return kwitansi;
  },

  /**
   * Generate nomor kuitansi otomatis
   */
  async getNextKwitansiNumber(tahunAnggaran: number, kd_skpd?: string): Promise<string> {
    const safeKode = kd_skpd || "";
    const count = await prisma.tblKwitansi.count({
      where: {
        tahunAnggaran,
        ...(safeKode ? { kd_skpd: safeKode } : {}),
      },
    });
    const nextSeq = String(count + 1).padStart(4, "0");
    const cleanKode = safeKode.replace(/\./g, "") || "00";
    return `KWIT/${cleanKode}/${nextSeq}/${tahunAnggaran}`;
  },

  /**
   * Buat kuitansi baru
   */
  async createKwitansi(session: SessionPayload, input: CreateKwitansiInput) {
    // Validasi hak akses
    if (!isPengajuanAuthorized(session)) {
      throw new Error("Anda tidak memiliki hak akses untuk membuat pengajuan kuitansi.");
    }

    // Resolusi data OPD & Unit Kerja jika belum lengkap di payload
    let kd_skpd = input.kd_skpd;
    let nm_skpd = input.nm_skpd;
    let kd_unit = input.kd_unit;
    let nm_unit = input.nm_unit;

    if (!kd_skpd || !nm_skpd) {
      const opd = await prisma.opd.findUnique({
        where: { id: input.opdId },
        select: { kd_skpd: true, nm_skpd: true },
      });
      if (opd) {
        kd_skpd = opd.kd_skpd;
        nm_skpd = opd.nm_skpd;
      }
    }

    if (input.unitKerjaId && (!kd_unit || !nm_unit)) {
      const unit = await prisma.unitKerja.findUnique({
        where: { id: input.unitKerjaId },
        select: { kd_unit: true, nm_unit: true },
      });
      if (unit) {
        kd_unit = unit.kd_unit;
        nm_unit = unit.nm_unit;
      }
    }

    if (!kd_skpd || !nm_skpd) {
      throw new Error("Data Perangkat Daerah (SKPD) tidak valid atau tidak ditemukan.");
    }

    const nomor =
      input.nomor?.trim() ||
      (await this.getNextKwitansiNumber(input.tahunAnggaran, kd_skpd));

    // Periksa keunikan nomor
    const existing = await prisma.tblKwitansi.findUnique({
      where: { nomor },
    });
    if (existing) {
      throw new Error(`Nomor kuitansi "${nomor}" sudah digunakan.`);
    }

    // Hitung total potongan dan nilai bersih
    const nilaiBruto = Number(input.nilai || 0);
    const potonganItems = input.potongan || [];
    const totalPotongan = potonganItems.reduce(
      (acc, p) => acc + Number(p.nilai || 0),
      0
    );
    const nilaiBersih = nilaiBruto - totalPotongan;

    // Tentukan PPTK: prioritaskan pilihan dari form, jika kosong gunakan penugasan RKA (Trskpd) atau session
    let pptkUserId: string | null = sanitizeOptionalUserId(input.pptkUserId) || session.userId;
    let pptkNama: string | null = input.pptkNama || session.namaLengkap;
    let pptkNip: string | null = input.pptkNip || (session as any).nip || null;

    if (!input.pptkNama) {
      const trskpd = await prisma.trskpd.findFirst({
        where: {
          tahunAnggaran: input.tahunAnggaran,
          kd_skpd,
          kd_sub_kegiatan: input.kd_sub_kegiatan,
        },
        select: { pptkUserId: true, pptkNama: true, pptkNip: true },
      });

      if (trskpd?.pptkUserId && isPaKpa(session)) {
        pptkUserId = trskpd.pptkUserId;
        pptkNama = trskpd.pptkNama || pptkNama;
        pptkNip = trskpd.pptkNip || pptkNip;
      } else if (trskpd?.pptkNama && isPaKpa(session)) {
        pptkNama = trskpd.pptkNama;
        pptkNip = trskpd.pptkNip || pptkNip;
      }
    }

    const created = await prisma.tblKwitansi.create({
      data: {
        nomor,
        tanggal: new Date(input.tanggal),
        tahunAnggaran: input.tahunAnggaran,
        opdId: input.opdId,
        unitKerjaId: input.unitKerjaId || null,
        kd_skpd,
        nm_skpd,
        kd_unit: kd_unit || null,
        nm_unit: nm_unit || null,
        kd_program: input.kd_program || null,
        nm_program: input.nm_program || null,
        kd_kegiatan: input.kd_kegiatan || null,
        nm_kegiatan: input.nm_kegiatan || null,
        kd_sub_kegiatan: input.kd_sub_kegiatan,
        nm_sub_kegiatan: input.nm_sub_kegiatan,
        kd_rek6: input.kd_rek6,
        nm_rek6: input.nm_rek6,
        jns_beban: input.jns_beban,
        uraian: input.uraian,
        nilai: new Prisma.Decimal(nilaiBruto),
        nilai_potongan: new Prisma.Decimal(totalPotongan),
        nilai_bersih: new Prisma.Decimal(nilaiBersih),
        pptkUserId,
        pptkNama,
        pptkNip,
        paKpaUserId: sanitizeOptionalUserId(input.paKpaUserId),
        paKpaNama: input.paKpaNama || null,
        paKpaNip: input.paKpaNip || null,
        bendaharaUserId: sanitizeOptionalUserId(input.bendaharaUserId),
        bendaharaNama: input.bendaharaNama || null,
        bendaharaNip: input.bendaharaNip || null,
        status: "DRAFT",
        catatan: input.catatan || null,
        penerimaList: {
          create: input.penerima.map((p) => ({
            nm_penerima: p.nm_penerima,
            alamat_penerima: p.alamat_penerima || null,
            npwp_penerima: p.npwp_penerima || null,
            nm_bank_penerima: p.nm_bank_penerima,
            no_rek_penerima: p.no_rek_penerima,
            an_rekening: p.an_rekening || p.nm_penerima,
            nilai: new Prisma.Decimal(Number(p.nilai || 0)),
            keterangan: p.keterangan || null,
          })),
        },
        potonganList: {
          create: potonganItems.map((pt) => ({
            kd_rek6: pt.kd_rek6 || null,
            nm_rek6: pt.nm_rek6 || null,
            id_billing: pt.id_billing || null,
            ntpn: pt.ntpn || null,
            nilai: new Prisma.Decimal(Number(pt.nilai || 0)),
            keterangan: pt.keterangan || null,
          })),
        },
      },
      include: {
        penerimaList: true,
        potonganList: true,
      },
    });

    return created;
  },

  /**
   * Update kuitansi (hanya jika DRAFT atau DITOLAK)
   */
  async updateKwitansi(
    id: string,
    session: SessionPayload,
    input: Partial<CreateKwitansiInput>
  ) {
    const existing = await prisma.tblKwitansi.findUnique({
      where: { id },
      include: { penerimaList: true, potonganList: true },
    });

    if (!existing) {
      throw new Error("Kuitansi tidak ditemukan.");
    }

    if (existing.status !== "DRAFT" && existing.status !== "DITOLAK") {
      throw new Error(`Kuitansi dengan status ${existing.status} tidak dapat diedit.`);
    }

    // Role check: jika PPTK, pastikan pemiliknya
    if (isPptk(session) && !isPaKpa(session)) {
      if (existing.pptkUserId && existing.pptkUserId !== session.userId) {
        throw new Error("Anda hanya dapat mengedit kuitansi yang Anda buat.");
      }
    }

    const nilaiBruto = input.nilai !== undefined ? Number(input.nilai) : Number(existing.nilai);
    const potonganItems = input.potongan !== undefined ? input.potongan : existing.potonganList;
    const totalPotongan = potonganItems.reduce(
      (acc, p: any) => acc + Number(p.nilai || 0),
      0
    );
    const nilaiBersih = nilaiBruto - totalPotongan;

    // Gunakan transaction untuk update data pokok dan relasi penerima/potongan
    return prisma.$transaction(async (tx) => {
      // Hapus penerima dan potongan lama jika ada input baru
      if (input.penerima) {
        await tx.tblKwitansiPenerima.deleteMany({ where: { kwitansiId: id } });
        await tx.tblKwitansiPenerima.createMany({
          data: input.penerima.map((p) => ({
            kwitansiId: id,
            nm_penerima: p.nm_penerima,
            alamat_penerima: p.alamat_penerima || null,
            npwp_penerima: p.npwp_penerima || null,
            nm_bank_penerima: p.nm_bank_penerima,
            no_rek_penerima: p.no_rek_penerima,
            an_rekening: p.an_rekening || p.nm_penerima,
            nilai: new Prisma.Decimal(Number(p.nilai || 0)),
            keterangan: p.keterangan || null,
          })),
        });
      }

      if (input.potongan) {
        await tx.tblKwitansiPotongan.deleteMany({ where: { kwitansiId: id } });
        await tx.tblKwitansiPotongan.createMany({
          data: input.potongan.map((pt) => ({
            kwitansiId: id,
            kd_rek6: pt.kd_rek6 || null,
            nm_rek6: pt.nm_rek6 || null,
            id_billing: pt.id_billing || null,
            ntpn: pt.ntpn || null,
            nilai: new Prisma.Decimal(Number(pt.nilai || 0)),
            keterangan: pt.keterangan || null,
          })),
        });
      }

      const updated = await tx.tblKwitansi.update({
        where: { id },
        data: {
          tanggal: input.tanggal ? new Date(input.tanggal) : undefined,
          uraian: input.uraian !== undefined ? input.uraian : undefined,
          jns_beban: input.jns_beban !== undefined ? input.jns_beban : undefined,
          kd_sub_kegiatan: input.kd_sub_kegiatan !== undefined ? input.kd_sub_kegiatan : undefined,
          nm_sub_kegiatan: input.nm_sub_kegiatan !== undefined ? input.nm_sub_kegiatan : undefined,
          kd_rek6: input.kd_rek6 !== undefined ? input.kd_rek6 : undefined,
          nm_rek6: input.nm_rek6 !== undefined ? input.nm_rek6 : undefined,
          nilai: new Prisma.Decimal(nilaiBruto),
          nilai_potongan: new Prisma.Decimal(totalPotongan),
          nilai_bersih: new Prisma.Decimal(nilaiBersih),
          pptkUserId: input.pptkUserId !== undefined ? sanitizeOptionalUserId(input.pptkUserId) : undefined,
          pptkNama: input.pptkNama !== undefined ? input.pptkNama : undefined,
          pptkNip: input.pptkNip !== undefined ? input.pptkNip : undefined,
          paKpaUserId: input.paKpaUserId !== undefined ? sanitizeOptionalUserId(input.paKpaUserId) : undefined,
          paKpaNama: input.paKpaNama !== undefined ? input.paKpaNama : undefined,
          paKpaNip: input.paKpaNip !== undefined ? input.paKpaNip : undefined,
          bendaharaUserId: input.bendaharaUserId !== undefined ? sanitizeOptionalUserId(input.bendaharaUserId) : undefined,
          bendaharaNama: input.bendaharaNama !== undefined ? input.bendaharaNama : undefined,
          bendaharaNip: input.bendaharaNip !== undefined ? input.bendaharaNip : undefined,
          catatan: input.catatan !== undefined ? input.catatan : undefined,
          status: "DRAFT", // reset ke DRAFT jika sebelumnya DITOLAK
        },
        include: {
          penerimaList: true,
          potonganList: true,
        },
      });

      return updated;
    });
  },

  /**
   * Hapus kuitansi (hanya jika DRAFT)
   */
  async deleteKwitansi(id: string, session: SessionPayload) {
    const existing = await prisma.tblKwitansi.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Kuitansi tidak ditemukan.");
    }

    if (existing.status !== "DRAFT") {
      throw new Error(`Kuitansi dengan status ${existing.status} tidak dapat dihapus.`);
    }

    if (isPptk(session) && !isPaKpa(session)) {
      if (existing.pptkUserId && existing.pptkUserId !== session.userId) {
        throw new Error("Anda hanya dapat menghapus kuitansi yang Anda buat.");
      }
    }

    await prisma.tblKwitansi.delete({ where: { id } });
    return { success: true };
  },

  /**
   * Update Status Kuitansi: DIAJUKAN, DISETUJUI, DITOLAK, DIBATALKAN
   */
  async updateStatusKwitansi(
    id: string,
    session: SessionPayload,
    statusTarget: "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN",
    catatan?: string
  ) {
    const existing = await prisma.tblKwitansi.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Kuitansi tidak ditemukan.");
    }

    if (statusTarget === "DIAJUKAN") {
      if (existing.status !== "DRAFT" && existing.status !== "DITOLAK") {
        throw new Error(`Kuitansi berstatus ${existing.status} tidak dapat diajukan.`);
      }

      return prisma.tblKwitansi.update({
        where: { id },
        data: {
          status: "DIAJUKAN",
          catatan: catatan || null,
        },
      });
    }

    if (statusTarget === "DISETUJUI") {
      if (!isPaKpa(session)) {
        throw new Error("Hanya Pengguna Anggaran (PA/KPA) atau Superadmin yang dapat menyetujui kuitansi.");
      }

      return prisma.tblKwitansi.update({
        where: { id },
        data: {
          status: "DISETUJUI",
          paKpaUserId: existing.paKpaUserId || session.userId,
          paKpaNama: existing.paKpaNama || session.namaLengkap,
          paKpaNip: existing.paKpaNip || (session as any).nip || null,
          tgl_persetujuan: new Date(),
          catatan: catatan || null,
        },
      });
    }

    if (statusTarget === "DITOLAK") {
      if (!isPaKpa(session)) {
        throw new Error("Hanya Pengguna Anggaran (PA/KPA) atau Superadmin yang dapat menolak kuitansi.");
      }

      return prisma.tblKwitansi.update({
        where: { id },
        data: {
          status: "DITOLAK",
          paKpaUserId: session.userId,
          paKpaNama: session.namaLengkap,
          paKpaNip: (session as any).nip || null,
          catatan: catatan || "Kuitansi dikembalikan/ditolak oleh PA/KPA",
        },
      });
    }

    if (statusTarget === "DIBATALKAN") {
      return prisma.tblKwitansi.update({
        where: { id },
        data: {
          status: "DRAFT",
          catatan: catatan || "Pengajuan dibatalkan",
        },
      });
    }

    throw new Error(`Aksi status ${statusTarget} tidak didukung.`);
  },

  /**
   * Mengambil opsi sub kegiatan yang tersedia sesuai penugasan PPTK atau kewenangan OPD
   */
  async getAvailableSubKegiatan(
    session: SessionPayload,
    params: { tahunAnggaran?: number; opdId?: string; kd_skpd?: string }
  ) {
    const tahunAnggaran = params.tahunAnggaran || session.tahunAnggaran || 2026;

    let targetKdSkpd = params.kd_skpd;
    if (!targetKdSkpd && params.opdId) {
      const opd = await prisma.opd.findUnique({
        where: { id: params.opdId },
        select: { kd_skpd: true },
      });
      targetKdSkpd = opd?.kd_skpd;
    }

    // Jika bukan superadmin, kunci ke OPD milik user
    if (session.roleKode !== "0" && session.roleKode !== "SUPERADMIN") {
      targetKdSkpd = session.opdKode || targetKdSkpd;
    }

    const where: Prisma.TrskpdWhereInput = {
      tahunAnggaran,
    };

    if (targetKdSkpd) {
      where.kd_skpd = targetKdSkpd;
    }

    // Aturan penugasan PPTK:
    // Jika user adalah PPTK (dan bukan PA/KPA atau Superadmin)
    if (isPptk(session) && !isPaKpa(session)) {
      // Cek apakah user memiliki sub kegiatan yang spesifik ditugaskan ke dia
      const assignedCount = await prisma.trskpd.count({
        where: {
          tahunAnggaran,
          kd_skpd: targetKdSkpd,
          pptkUserId: session.userId,
        },
      });

      if (assignedCount > 0) {
        where.pptkUserId = session.userId;
      }
      // Jika belum ada yang di-assign secara spesifik di database (misal data baru diimport),
      // tetap izinkan memilih sub kegiatan di OPD-nya
    }

    const list = await prisma.trskpd.findMany({
      where,
      select: {
        id: true,
        tahunAnggaran: true,
        opdId: true,
        unitKerjaId: true,
        kd_skpd: true,
        nm_skpd: true,
        kd_unit: true,
        nm_unit: true,
        kd_program: true,
        nm_program: true,
        kd_kegiatan: true,
        nm_kegiatan: true,
        kd_sub_kegiatan: true,
        nm_sub_kegiatan: true,
        totalAnggaran: true,
        totalAnggaran_ubah: true,
        pptkUserId: true,
        pptkNama: true,
        pptkNip: true,
      },
      orderBy: [{ kd_sub_kegiatan: "asc" }],
    });

    return list;
  },

  /**
   * Mengambil rekening belanja (Trdrka) untuk sub kegiatan terpilih
   */
  async getAvailableRekening(params: {
    tahunAnggaran: number;
    kd_skpd: string;
    kd_sub_kegiatan: string;
  }) {
    const list = await prisma.trdrka.findMany({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        kd_skpd: params.kd_skpd,
        kd_sub_kegiatan: params.kd_sub_kegiatan,
      },
      select: {
        id: true,
        kd_rek6: true,
        nm_rek6: true,
        nilai: true,
        nilai_ubah: true,
      },
      orderBy: { kd_rek6: "asc" },
    });

    return list;
  },

  /**
   * Menghitung sisa penyediaan dana (Jumlah nilai SPD terbit - Nilai kuitansi perkegiatan per rekening)
   */
  async getSisaPenyediaanDana(params: {
    tahunAnggaran: number;
    kd_skpd: string;
    kd_sub_kegiatan: string;
    kd_rek6: string;
    excludeKwitansiId?: string;
  }) {
    // 1. Total Nilai SPD Terbit untuk sub kegiatan dan rekening ini
    const spdSum = await prisma.spd.aggregate({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        kd_skpd: params.kd_skpd,
        kd_sub_kegiatan: params.kd_sub_kegiatan,
        kd_rek6: params.kd_rek6,
        status: "AKTIF",
      },
      _sum: { nilai: true },
    });
    const totalSpd = Number(spdSum._sum.nilai || 0);

    // 2. Akumulasi Kuitansi yang sudah diajukan/disetujui/dibukukan (kecuali yang ditolak)
    const kwitansiSum = await prisma.tblKwitansi.aggregate({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        kd_skpd: params.kd_skpd,
        kd_sub_kegiatan: params.kd_sub_kegiatan,
        kd_rek6: params.kd_rek6,
        status: { notIn: ["DITOLAK"] },
        ...(params.excludeKwitansiId ? { id: { not: params.excludeKwitansiId } } : {}),
      },
      _sum: { nilai: true },
    });
    const totalKuitansi = Number(kwitansiSum._sum.nilai || 0);

    // 3. Pagu DPA Anggaran
    const trdrka = await prisma.trdrka.findFirst({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        kd_skpd: params.kd_skpd,
        kd_sub_kegiatan: params.kd_sub_kegiatan,
        kd_rek6: params.kd_rek6,
      },
      select: {
        nilai: true,
        nilai_ubah: true,
      },
    });
    const paguDpa = Number(trdrka?.nilai_ubah || trdrka?.nilai || 0);

    const sisaPenyediaanDana = totalSpd - totalKuitansi;

    return {
      paguDpa,
      totalSpd,
      totalKuitansi,
      sisaPenyediaanDana,
    };
  },

  /**
   * Laporan Register Kuitansi
   */
  async getRegisterKwitansi(
    session: SessionPayload,
    params: {
      tahunAnggaran?: number;
      opdId?: string;
      unitKerjaId?: string;
      kd_unit?: string;
      status?: string;
      jns_beban?: string;
      tglMulai?: string;
      tglSelesai?: string;
    }
  ) {
    const where: Prisma.TblKwitansiWhereInput = {};

    if (params.tahunAnggaran) {
      where.tahunAnggaran = params.tahunAnggaran;
    }

    if (session.roleKode !== "0" && session.roleKode !== "SUPERADMIN") {
      if (session.opdId) {
        where.opdId = session.opdId;
      }
    } else if (params.opdId) {
      where.opdId = params.opdId;
    }

    if (params.unitKerjaId && params.unitKerjaId !== "ALL") {
      where.unitKerjaId = params.unitKerjaId;
    }

    if (params.kd_unit) {
      where.kd_unit = params.kd_unit;
    }

    if (params.status && params.status !== "SEMUA") {
      where.status = params.status;
    }

    if (params.jns_beban && params.jns_beban !== "SEMUA") {
      where.jns_beban = params.jns_beban;
    }

    if (params.tglMulai || params.tglSelesai) {
      where.tanggal = {};
      if (params.tglMulai) {
        where.tanggal.gte = new Date(params.tglMulai);
      }
      if (params.tglSelesai) {
        const endDate = new Date(params.tglSelesai);
        endDate.setHours(23, 59, 59, 999);
        where.tanggal.lte = endDate;
      }
    }

    const items = await prisma.tblKwitansi.findMany({
      where,
      include: {
        penerimaList: true,
        potonganList: true,
        opd: { select: { id: true, kd_skpd: true, nm_skpd: true } },
        unitKerja: { select: { id: true, kd_unit: true, nm_unit: true } },
      },
      orderBy: [{ tanggal: "asc" }, { nomor: "asc" }],
    });

    // Hitung ringkasan
    let totalKuitansi = items.length;
    let totalNilaiBruto = 0;
    let totalNilaiPotongan = 0;
    let totalNilaiBersih = 0;

    for (const item of items) {
      totalNilaiBruto += Number(item.nilai || 0);
      totalNilaiPotongan += Number(item.nilai_potongan || 0);
      totalNilaiBersih += Number(item.nilai_bersih || 0);
    }

    return {
      summary: {
        totalKuitansi,
        totalNilaiBruto,
        totalNilaiPotongan,
        totalNilaiBersih,
      },
      items,
    };
  },
};

