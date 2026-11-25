import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export function isBendaharaPenerimaanAuthorized(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  const roleNama = (session.roleNama || "").toUpperCase();
  const perms = session.permissions || [];

  if (
    roleKode === "0" ||
    roleKode === "SUPERADMIN" ||
    roleKode === "1" ||
    roleKode === "2" ||
    roleNama.includes("PENERIMAAN") ||
    roleNama.includes("OPD")
  ) {
    return true;
  }

  return (
    perms.includes("bendahara-penerimaan:read") ||
    perms.includes("bendahara-penerimaan:write") ||
    perms.includes("menu:penatausahaan:bendahara-penerimaan-penetapan") ||
    perms.includes("menu:penatausahaan:bendahara-penerimaan-penerimaan")
  );
}

export function isCrossOpdPenerimaan(session: SessionPayload): boolean {
  const roleKode = (session.roleKode || "").toUpperCase();
  return roleKode === "0" || roleKode === "SUPERADMIN" || roleKode === "1";
}

export async function getAllowedSkpdFilter(session: SessionPayload): Promise<string[] | null> {
  if (isCrossOpdPenerimaan(session)) return null;
  if (session.opdId) {
    const opd = await prisma.opd.findUnique({
      where: { id: session.opdId },
      select: { kd_skpd: true },
    });
    if (opd?.kd_skpd) return [opd.kd_skpd];
  }
  return [];
}

export const bendaharaPenerimaanService = {
  async getReferensi(session: SessionPayload) {
    const isCross = isCrossOpdPenerimaan(session);
    const opdWhere: any = { isActive: true };
    if (!isCross && session.opdId) {
      opdWhere.id = session.opdId;
    }

    const [opds, units, subkegiatans, rekenings] = await Promise.all([
      prisma.opd.findMany({
        where: opdWhere,
        select: {
          id: true,
          kd_skpd: true,
          nm_skpd: true,
          singkatan: true,
        },
        orderBy: { kd_skpd: "asc" },
      }),
      prisma.unitKerja.findMany({
        where: {
          isActive: true,
          ...(!isCross && session.opdId ? { opdId: session.opdId } : {}),
        },
        select: {
          id: true,
          opdId: true,
          kd_unit: true,
          nm_unit: true,
        },
        orderBy: { kd_unit: "asc" },
      }),
      prisma.subkegiatan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          kd_sub_kegiatan: true,
          nm_sub_kegiatan: true,
        },
        orderBy: { kd_sub_kegiatan: "asc" },
      }),
      prisma.msRek6.findMany({
        where: {
          isActive: true,
          kd_rek6: { startsWith: "4." },
        },
        select: {
          id: true,
          kd_rek6: true,
          nm_rek6: true,
        },
        orderBy: { kd_rek6: "asc" },
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
      },
      isCrossOpd: isCross,
      tahunAnggaran: session.tahunAnggaran || 2026,
      opds,
      units,
      subkegiatans,
      rekenings,
    };
  },

  // =========================================================================
  // PENETAPAN (tbl_penetapan)
  // =========================================================================
  async listPenetapan(
    session: SessionPayload,
    filter: {
      tahunAnggaran: number;
      kd_skpd?: string;
      kd_unit?: string;
      verif?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ) {
    const where: any = {
      tahunAnggaran: filter.tahunAnggaran,
    };

    const allowedSkpd = await getAllowedSkpdFilter(session);
    if (allowedSkpd !== null) {
      where.kd_skpd = { in: allowedSkpd };
    } else if (filter.kd_skpd && filter.kd_skpd !== "ALL") {
      where.kd_skpd = filter.kd_skpd;
    }

    if (filter.kd_unit && filter.kd_unit !== "ALL") {
      where.kd_unit = filter.kd_unit;
    }

    if (filter.verif === "1" || filter.verif === "0") {
      where.verif = Number(filter.verif);
    }

    if (filter.startDate || filter.endDate) {
      where.tgl_tetap = {};
      if (filter.startDate) {
        where.tgl_tetap.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_tetap.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { no_tetap: { contains: q, mode: "insensitive" } },
        { kd_skpd: { contains: q, mode: "insensitive" } },
        { nm_skpd: { contains: q, mode: "insensitive" } },
        { kd_rek6: { contains: q, mode: "insensitive" } },
        { nm_rek6: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { keterangan: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.tblPenetapan.findMany({
      where,
      orderBy: [{ tgl_tetap: "desc" }, { no_tetap: "desc" }],
    });

    const items = rows.map((r: any) => ({
      ...r,
      tgl_tetap: r.tgl_tetap.toISOString().split("T")[0],
      nilai: Number(r.nilai) || 0,
    }));

    const totalNilai = items.reduce((s: number, r: any) => s + r.nilai, 0);
    const totalVerif = items.filter((r: any) => r.verif === 1).length;
    const totalBelumVerif = items.filter((r: any) => r.verif === 0).length;

    return {
      items,
      summary: {
        totalDokumen: items.length,
        totalVerif,
        totalBelumVerif,
        totalNilai,
      },
    };
  },

  async createPenetapan(data: {
    tahunAnggaran: number;
    no_tetap: string;
    tgl_tetap: string;
    kd_skpd: string;
    nm_skpd?: string;
    kd_unit?: string;
    nm_unit?: string;
    kd_sub_kegiatan?: string;
    nm_sub_kegiatan?: string;
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
    keterangan?: string;
    company?: string;
    alamat?: string;
    jns_pajak?: string;
  }) {
    const row = await prisma.tblPenetapan.create({
      data: {
        tahunAnggaran: data.tahunAnggaran,
        no_tetap: data.no_tetap.trim(),
        tgl_tetap: new Date(`${data.tgl_tetap}T00:00:00.000Z`),
        kd_skpd: data.kd_skpd,
        nm_skpd: data.nm_skpd || null,
        kd_unit: data.kd_unit || null,
        nm_unit: data.nm_unit || null,
        kd_sub_kegiatan: data.kd_sub_kegiatan || null,
        nm_sub_kegiatan: data.nm_sub_kegiatan || null,
        kd_rek6: data.kd_rek6,
        nm_rek6: data.nm_rek6,
        nilai: data.nilai,
        keterangan: data.keterangan || null,
        company: data.company || null,
        alamat: data.alamat || null,
        jns_pajak: data.jns_pajak || null,
        verif: 0,
      },
    });
    return {
      ...row,
      tgl_tetap: row.tgl_tetap.toISOString().split("T")[0],
      nilai: Number(row.nilai) || 0,
    };
  },

  async updatePenetapan(
    id: string,
    data: {
      no_tetap: string;
      tgl_tetap: string;
      kd_skpd: string;
      nm_skpd?: string;
      kd_unit?: string;
      nm_unit?: string;
      kd_sub_kegiatan?: string;
      nm_sub_kegiatan?: string;
      kd_rek6: string;
      nm_rek6: string;
      nilai: number;
      keterangan?: string;
      company?: string;
      alamat?: string;
      jns_pajak?: string;
    }
  ) {
    const existing = await prisma.tblPenetapan.findUnique({
      where: { id },
      select: { id: true, no_tetap: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penetapan tidak ditemukan.");
    }
    const postedJournal = await prisma.trhmaping.findFirst({
      where: { no_voucher: `${existing.no_tetap.trim()}/10` },
      select: { id: true },
    });
    if (existing.verif === 1 || postedJournal) {
      throw new Error(
        "Data penetapan yang sudah diposting jurnal tidak dapat diedit. Batalkan posting jurnal terlebih dahulu jika ingin mengubah."
      );
    }

    const row = await prisma.tblPenetapan.update({
      where: { id },
      data: {
        no_tetap: data.no_tetap.trim(),
        tgl_tetap: new Date(`${data.tgl_tetap}T00:00:00.000Z`),
        kd_skpd: data.kd_skpd,
        nm_skpd: data.nm_skpd || null,
        kd_unit: data.kd_unit || null,
        nm_unit: data.nm_unit || null,
        kd_sub_kegiatan: data.kd_sub_kegiatan || null,
        nm_sub_kegiatan: data.nm_sub_kegiatan || null,
        kd_rek6: data.kd_rek6,
        nm_rek6: data.nm_rek6,
        nilai: data.nilai,
        keterangan: data.keterangan || null,
        company: data.company || null,
        alamat: data.alamat || null,
        jns_pajak: data.jns_pajak || null,
      },
    });
    return {
      ...row,
      tgl_tetap: row.tgl_tetap.toISOString().split("T")[0],
      nilai: Number(row.nilai) || 0,
    };
  },

  async toggleVerifyPenetapan(id: string, verif: number) {
    const existing = await prisma.tblPenetapan.findUnique({
      where: { id },
      select: { id: true, no_tetap: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penetapan tidak ditemukan.");
    }
    if (verif === 0) {
      const postedJournal = await prisma.trhmaping.findFirst({
        where: { no_voucher: `${existing.no_tetap.trim()}/10` },
        select: { id: true },
      });
      if (postedJournal) {
        throw new Error(
          "Data penetapan sudah diposting ke jurnal. Gunakan Batal Posting di menu Posting Jurnal Penetapan."
        );
      }
    }
    return prisma.tblPenetapan.update({
      where: { id },
      data: { verif: verif === 1 ? 1 : 0 },
    });
  },

  async deletePenetapan(id: string) {
    const existing = await prisma.tblPenetapan.findUnique({
      where: { id },
      select: { id: true, no_tetap: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penetapan tidak ditemukan.");
    }
    const postedJournal = await prisma.trhmaping.findFirst({
      where: { no_voucher: `${existing.no_tetap.trim()}/10` },
      select: { id: true },
    });
    if (existing.verif === 1 || postedJournal) {
      throw new Error(
        "Data penetapan yang sudah diposting jurnal tidak dapat dihapus. Batalkan posting jurnal terlebih dahulu jika ingin menghapus."
      );
    }
    return prisma.tblPenetapan.delete({ where: { id } });
  },

  // =========================================================================
  // PENERIMAAN (tbl_penerimaan)
  // =========================================================================
  async listPenerimaan(
    session: SessionPayload,
    filter: {
      tahunAnggaran: number;
      kd_skpd?: string;
      kd_unit?: string;
      verif?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ) {
    const where: any = {
      tahunAnggaran: filter.tahunAnggaran,
    };

    const allowedSkpd = await getAllowedSkpdFilter(session);
    if (allowedSkpd !== null) {
      where.kd_skpd = { in: allowedSkpd };
    } else if (filter.kd_skpd && filter.kd_skpd !== "ALL") {
      where.kd_skpd = filter.kd_skpd;
    }

    if (filter.kd_unit && filter.kd_unit !== "ALL") {
      where.kd_unit = filter.kd_unit;
    }

    if (filter.verif === "1" || filter.verif === "0") {
      where.verif = Number(filter.verif);
    }

    if (filter.startDate || filter.endDate) {
      where.tgl_terima = {};
      if (filter.startDate) {
        where.tgl_terima.gte = new Date(`${filter.startDate}T00:00:00.000Z`);
      }
      if (filter.endDate) {
        where.tgl_terima.lte = new Date(`${filter.endDate}T23:59:59.999Z`);
      }
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { no_terima: { contains: q, mode: "insensitive" } },
        { no_tetap: { contains: q, mode: "insensitive" } },
        { kd_skpd: { contains: q, mode: "insensitive" } },
        { nm_skpd: { contains: q, mode: "insensitive" } },
        { kd_rek6: { contains: q, mode: "insensitive" } },
        { nm_rek6: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { keterangan: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.tblPenerimaan.findMany({
      where,
      orderBy: [{ tgl_terima: "desc" }, { no_terima: "desc" }],
    });

    const items = rows.map((r: any) => ({
      ...r,
      tgl_terima: r.tgl_terima.toISOString().split("T")[0],
      tgl_tetap: r.tgl_tetap ? r.tgl_tetap.toISOString().split("T")[0] : null,
      nilai: Number(r.nilai) || 0,
    }));

    const totalNilai = items.reduce((s: number, r: any) => s + r.nilai, 0);
    const totalVerif = items.filter((r: any) => r.verif === 1).length;
    const totalBelumVerif = items.filter((r: any) => r.verif === 0).length;

    return {
      items,
      summary: {
        totalDokumen: items.length,
        totalVerif,
        totalBelumVerif,
        totalNilai,
      },
    };
  },

  async createPenerimaan(data: {
    tahunAnggaran: number;
    no_terima: string;
    tgl_terima: string;
    no_tetap?: string;
    tgl_tetap?: string;
    kd_skpd: string;
    nm_skpd?: string;
    kd_unit?: string;
    nm_unit?: string;
    kd_sub_kegiatan?: string;
    nm_sub_kegiatan?: string;
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
    keterangan?: string;
    company?: string;
    alamat?: string;
    jns_pajak?: string;
  }) {
    const row = await prisma.tblPenerimaan.create({
      data: {
        tahunAnggaran: data.tahunAnggaran,
        no_terima: data.no_terima.trim(),
        tgl_terima: new Date(`${data.tgl_terima}T00:00:00.000Z`),
        no_tetap: data.no_tetap?.trim() || null,
        tgl_tetap: data.tgl_tetap ? new Date(`${data.tgl_tetap}T00:00:00.000Z`) : null,
        kd_skpd: data.kd_skpd,
        nm_skpd: data.nm_skpd || null,
        kd_unit: data.kd_unit || null,
        nm_unit: data.nm_unit || null,
        kd_sub_kegiatan: data.kd_sub_kegiatan || null,
        nm_sub_kegiatan: data.nm_sub_kegiatan || null,
        kd_rek6: data.kd_rek6,
        nm_rek6: data.nm_rek6,
        nilai: data.nilai,
        keterangan: data.keterangan || null,
        company: data.company || null,
        alamat: data.alamat || null,
        jns_pajak: data.jns_pajak || null,
        verif: 0,
      },
    });
    return {
      ...row,
      tgl_terima: row.tgl_terima.toISOString().split("T")[0],
      tgl_tetap: row.tgl_tetap ? row.tgl_tetap.toISOString().split("T")[0] : null,
      nilai: Number(row.nilai) || 0,
    };
  },

  async updatePenerimaan(
    id: string,
    data: {
      no_terima: string;
      tgl_terima: string;
      no_tetap?: string;
      tgl_tetap?: string;
      kd_skpd: string;
      nm_skpd?: string;
      kd_unit?: string;
      nm_unit?: string;
      kd_sub_kegiatan?: string;
      nm_sub_kegiatan?: string;
      kd_rek6: string;
      nm_rek6: string;
      nilai: number;
      keterangan?: string;
      company?: string;
      alamat?: string;
      jns_pajak?: string;
    }
  ) {
    const existing = await prisma.tblPenerimaan.findUnique({
      where: { id },
      select: { id: true, no_terima: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penerimaan tidak ditemukan.");
    }
    const postedJournal = await prisma.trhmaping.findFirst({
      where: { no_voucher: `${existing.no_terima.trim()}/4` },
      select: { id: true },
    });
    if (existing.verif === 1 || postedJournal) {
      throw new Error(
        "Data penerimaan yang sudah diposting jurnal tidak dapat diedit. Batalkan posting jurnal terlebih dahulu jika ingin mengubah."
      );
    }

    const row = await prisma.tblPenerimaan.update({
      where: { id },
      data: {
        no_terima: data.no_terima.trim(),
        tgl_terima: new Date(`${data.tgl_terima}T00:00:00.000Z`),
        no_tetap: data.no_tetap?.trim() || null,
        tgl_tetap: data.tgl_tetap ? new Date(`${data.tgl_tetap}T00:00:00.000Z`) : null,
        kd_skpd: data.kd_skpd,
        nm_skpd: data.nm_skpd || null,
        kd_unit: data.kd_unit || null,
        nm_unit: data.nm_unit || null,
        kd_sub_kegiatan: data.kd_sub_kegiatan || null,
        nm_sub_kegiatan: data.nm_sub_kegiatan || null,
        kd_rek6: data.kd_rek6,
        nm_rek6: data.nm_rek6,
        nilai: data.nilai,
        keterangan: data.keterangan || null,
        company: data.company || null,
        alamat: data.alamat || null,
        jns_pajak: data.jns_pajak || null,
      },
    });
    return {
      ...row,
      tgl_terima: row.tgl_terima.toISOString().split("T")[0],
      tgl_tetap: row.tgl_tetap ? row.tgl_tetap.toISOString().split("T")[0] : null,
      nilai: Number(row.nilai) || 0,
    };
  },

  async toggleVerifyPenerimaan(id: string, verif: number) {
    const existing = await prisma.tblPenerimaan.findUnique({
      where: { id },
      select: { id: true, no_terima: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penerimaan tidak ditemukan.");
    }
    if (verif === 0) {
      const postedJournal = await prisma.trhmaping.findFirst({
        where: { no_voucher: `${existing.no_terima.trim()}/4` },
        select: { id: true },
      });
      if (postedJournal) {
        throw new Error(
          "Data penerimaan sudah diposting ke jurnal. Gunakan Batal Posting di menu Posting Jurnal Penerimaan."
        );
      }
    }
    return prisma.tblPenerimaan.update({
      where: { id },
      data: { verif: verif === 1 ? 1 : 0 },
    });
  },

  async deletePenerimaan(id: string) {
    const existing = await prisma.tblPenerimaan.findUnique({
      where: { id },
      select: { id: true, no_terima: true, verif: true },
    });
    if (!existing) {
      throw new Error("Data penerimaan tidak ditemukan.");
    }
    const postedJournal = await prisma.trhmaping.findFirst({
      where: { no_voucher: `${existing.no_terima.trim()}/4` },
      select: { id: true },
    });
    if (existing.verif === 1 || postedJournal) {
      throw new Error(
        "Data penerimaan yang sudah diposting jurnal tidak dapat dihapus. Batalkan posting jurnal terlebih dahulu jika ingin menghapus."
      );
    }
    return prisma.tblPenerimaan.delete({ where: { id } });
  },

  async validasiPenerimaanBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new Error("Pilih minimal satu transaksi penerimaan untuk divalidasi.");
    }

    const rows = await prisma.tblPenerimaan.findMany({
      where: {
        id: { in: ids },
        status_validasi: { not: "TERVALIDASI" },
      },
      orderBy: [{ tgl_terima: "asc" }, { no_terima: "asc" }],
    });

    if (rows.length === 0) {
      throw new Error("Semua transaksi yang dipilih sudah berstatus TERVALIDASI.");
    }

    const validatedCount = await prisma.$transaction(async (tx: any) => {
      let count = 0;
      const now = new Date();

      for (const item of rows) {
        const opd = await tx.opd.findUnique({
          where: { kd_skpd: item.kd_skpd },
          select: { id: true, nm_skpd: true },
        });
        if (!opd) {
          throw new Error(`OPD dengan kode ${item.kd_skpd} tidak ditemukan.`);
        }

        let unitKerjaId: string | null = null;
        if (item.kd_unit) {
          const unit = await tx.unitKerja.findUnique({
            where: { kd_unit: item.kd_unit },
            select: { id: true },
          });
          unitKerjaId = unit?.id || null;
        }

        const existingKasin = await tx.trhkasin.findUnique({
          where: {
            tahunAnggaran_no_bukti: {
              tahunAnggaran: item.tahunAnggaran,
              no_bukti: item.no_terima,
            },
          },
        });

        if (existingKasin) {
          throw new Error(
            `Nomor bukti ${item.no_terima} sudah ada di Kas Masuk (trhkasin) TA ${item.tahunAnggaran}.`
          );
        }

        await tx.trhkasin.create({
          data: {
            tahunAnggaran: item.tahunAnggaran,
            no_bukti: item.no_terima,
            tgl_bukti: item.tgl_terima,
            no_sts: item.no_terima,
            tgl_sts: item.tgl_terima,
            kd_skpd: item.kd_skpd,
            nm_skpd: item.nm_skpd || opd.nm_skpd,
            opdId: opd.id,
            kd_unit: item.kd_unit || null,
            nm_unit: item.nm_unit || null,
            unitKerjaId,
            uraian: item.keterangan || item.nm_rek6,
            sumber_dana: "PAD",
            nama_penyetor: item.company || null,
            alamat_penyetor: item.alamat || null,
            jns_transaksi: "PENDAPATAN",
            nilai: item.nilai,
            status: "TERIMA",
            keterangan: item.jns_pajak
              ? `Validasi Penerimaan (${item.jns_pajak})`
              : "Validasi Penerimaan Pendapatan Daerah",
            rincianRekening: {
              create: [
                {
                  no_bukti: item.no_terima,
                  kd_rek6: item.kd_rek6,
                  nm_rek6: item.nm_rek6,
                  kd_sub_kegiatan: item.kd_sub_kegiatan || null,
                  nm_sub_kegiatan: item.nm_sub_kegiatan || null,
                  nilai: item.nilai,
                  keterangan: item.keterangan || null,
                },
              ],
            },
          },
        });

        await tx.tblPenerimaan.update({
          where: { id: item.id },
          data: {
            status_validasi: "TERVALIDASI",
            tgl_validasi: now,
            no_bukti_kasin: item.no_terima,
          },
        });

        count += 1;
      }

      return count;
    });

    return { validatedCount };
  },

  async batalValidasiPenerimaan(id: string) {
    const item = await prisma.tblPenerimaan.findUnique({ where: { id } });
    if (!item) {
      throw new Error("Data penerimaan tidak ditemukan.");
    }
    if (item.status_validasi !== "TERVALIDASI") {
      throw new Error("Data penerimaan belum divalidasi.");
    }
    const postedJournal = await prisma.trhmaping.findFirst({
      where: { no_voucher: `${item.no_terima.trim()}/4` },
      select: { id: true },
    });
    if (item.verif === 1 || postedJournal) {
      throw new Error(
        "Data penerimaan yang sudah diposting jurnal tidak dapat dibatalkan validasinya. Batalkan posting jurnal terlebih dahulu."
      );
    }

    await prisma.$transaction(async (tx: any) => {
      if (item.no_bukti_kasin) {
        await tx.trhkasin.deleteMany({
          where: {
            tahunAnggaran: item.tahunAnggaran,
            no_bukti: item.no_bukti_kasin,
            jns_transaksi: "PENDAPATAN",
          },
        });
      }

      await tx.tblPenerimaan.update({
        where: { id: item.id },
        data: {
          status_validasi: "BELUM",
          tgl_validasi: null,
          no_bukti_kasin: null,
        },
      });
    });

    return { success: true };
  },
};
