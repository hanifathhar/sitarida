import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";

export interface SaveSp2dPayload {
  id?: string;
  tahunAnggaran: number;
  no_sp2d: string;
  tgl_sp2d: string;
  spmId: string;
  no_spm: string;
  tgl_spm?: string | null;
  sppId?: string | null;
  no_spp?: string | null;
  tgl_spp?: string | null;
  opdId: string;
  unitKerjaId?: string | null;
  jenis_sp2d: string; // UP, GU, TU, LS_GAJI, LS_BARANG_JASA, UP_KKPD, GU_KKPD
  bulan?: number | null;
  keperluan: string;
  nilai: number;
  nilai_potongan?: number;
  nilai_bersih?: number;
  no_spd?: string | null;
  tgl_spd?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  nama_bank_pembayar?: string | null;
  rek_bank_pembayar?: string | null;
  kuasaBudNama?: string | null;
  kuasaBudNip?: string | null;
  kuasaBudJabatan?: string | null;
  verifikatorNama?: string | null;
  verifikatorNip?: string | null;
  status?: string;
  keterangan?: string | null;
}

/**
 * Cek apakah session berhak mengakses modul SP2D
 * Hanya diizinkan untuk:
 * - Superadmin (kode: "0" atau isSuperadmin)
 * - BUD (kode: "1")
 * - Bidang Perbendaharaan (kode: "3")
 */
export function isSp2dAuthorized(session: SessionPayload): boolean {
  if (session.roleKode === "0" || session.roleKode === "SUPERADMIN") return true;
  if (session.roleKode === "1") return true; // BUD
  if (session.roleKode === "3") return true; // Bidang Perbendaharaan

  const perms = session.permissions || [];
  if (
    perms.includes("sp2d:read") ||
    perms.includes("sp2d:write") ||
    perms.includes("menu:penatausahaan:sp2d-pembuatan")
  ) {
    return true;
  }

  return false;
}

/**
 * Mengambil data scope OPD & Unit untuk SP2D
 * Karena BUD dan Bidang Perbendaharaan bertindak di tingkat Daerah/Kabupaten,
 * mereka otomatis memiliki hak akses lintas OPD (isCrossOpd = true).
 */
export async function getSp2dScopeData(session: SessionPayload) {
  const authorized = isSp2dAuthorized(session);
  if (!authorized) {
    throw new Error("Anda tidak memiliki hak akses untuk modul SP2D (khusus BUD, Perbendaharaan, dan Superadmin).");
  }

  const opds = await prisma.opd.findMany({
    where: { isActive: true },
    select: {
      id: true,
      kd_skpd: true,
      nm_skpd: true,
      singkatan: true,
      kepalaNama: true,
      kepalaNip: true,
      kepalaJabatan: true,
      unitKerjas: {
        where: { isActive: true },
        select: {
          id: true,
          kd_unit: true,
          nm_unit: true,
          bank_penerima: true,
          rek_penerima: true,
          nama_penerima: true,
          kepalaNama: true,
          kepalaNip: true,
        },
      },
    },
    orderBy: { kd_skpd: "asc" },
  });

  const units = opds.flatMap((o) =>
    o.unitKerjas.map((u) => ({
      ...u,
      opdId: o.id,
      kd_skpd: o.kd_skpd,
      nm_skpd: o.nm_skpd,
    }))
  );

  const pejabatBud = await getPejabatBudList();

  return {
    session: {
      userId: session.userId,
      username: session.username,
      namaLengkap: session.namaLengkap,
      roleKode: session.roleKode,
      roleNama: session.roleNama,
      isCrossOpd: true,
      opdId: session.opdId,
      unitKerjaId: session.unitKerjaId,
    },
    opds,
    units,
    pejabatBud,
  };
}

/**
 * Mengambil daftar pengguna/pejabat dengan role/peran BUD
 */
export async function getPejabatBudList() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { role: { kode: "1" } },
        { role: { nama: { contains: "BUD", mode: "insensitive" } } },
        { roleAssignments: { some: { role: { kode: "1" } } } },
        { roleAssignments: { some: { role: { nama: { contains: "BUD", mode: "insensitive" } } } } },
      ],
    },
    select: {
      id: true,
      username: true,
      namaLengkap: true,
      nip: true,
      jabatan: true,
      role: {
        select: {
          id: true,
          kode: true,
          nama: true,
        },
      },
    },
    orderBy: { namaLengkap: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    nama: u.namaLengkap,
    nip: u.nip || "",
    jabatan: u.jabatan || "Kuasa Bendahara Umum Daerah (BUD)",
    roleNama: u.role.nama,
  }));
}

/**
 * Generate Nomor Urut SP2D Berikutnya (Running Global se-Kabupaten/Daerah)
 * Format Baru: [NOMOR_URUT]/[KD_UNIT]/SP2D/[JENIS]/[TAHUN]
 * Contoh: 00001/1.01.2.22.0.00.01.0000/SP2D/LS-GAJI/2026
 */
export async function getNextSp2dSequence(params: {
  tahunAnggaran: number;
  jenisSp2d?: string;
  kd_unit?: string;
  kd_skpd?: string;
}) {
  const { tahunAnggaran, jenisSp2d = "UP", kd_unit, kd_skpd } = params;

  // Hitung jumlah SP2D yang sudah pernah terbit di tahun anggaran ini
  const totalCount = await prisma.trhsp2d.count({
    where: { tahunAnggaran },
  });

  // Cari nomor urut terbesar dari no_sp2d
  const existingSp2dList = await prisma.trhsp2d.findMany({
    where: { tahunAnggaran },
    select: { no_sp2d: true },
  });

  let maxSeq = totalCount;
  for (const item of existingSp2dList) {
    const parts = item.no_sp2d.split("/");
    // Format Baru: [NOMOR_URUT]/[KD_UNIT]/SP2D/... -> index 0 adalah nomor urut
    if (parts.length >= 4) {
      const numFirst = parseInt(parts[0], 10);
      if (!isNaN(numFirst) && numFirst > maxSeq) {
        maxSeq = numFirst;
      }
      // Format Lama: 900/00001/SP2D/... -> index 1 adalah nomor urut
      if (parts[0] === "900") {
        const numSecond = parseInt(parts[1], 10);
        if (!isNaN(numSecond) && numSecond > maxSeq) {
          maxSeq = numSecond;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedNoUrut = String(nextSeq).padStart(5, "0");
  const jnsCode = jenisSp2d.replace(/_/g, "-").toUpperCase();
  const targetKodeUnit = kd_unit || kd_skpd || "1.01.2.22.0.00.01.0000";
  const generatedNo = `${paddedNoUrut}/${targetKodeUnit}/SP2D/${jnsCode}/${tahunAnggaran}`;

  return {
    nextSeq,
    generatedNo,
  };
}

/**
 * Mengambil daftar SPM Terbit yang siap diterbitkan SP2D
 * Hanya SPM yang berstatus "DISETUJUI" / "DIVERIFIKASI" dan belum memiliki SP2D aktif
 */
export async function getSpmTerbitForSp2d(params: {
  tahunAnggaran: number;
  kd_skpd?: string;
  jenisSp2d?: string;
  excludeSp2dId?: string;
}) {
  const { tahunAnggaran, kd_skpd, jenisSp2d, excludeSp2dId } = params;

  // Ambil spmId yang sudah pernah dibuatkan SP2D
  const existingSp2d = await prisma.trhsp2d.findMany({
    where: {
      tahunAnggaran,
      status: { notIn: ["BATAL", "DITOLAK"] },
      ...(excludeSp2dId ? { id: { not: excludeSp2dId } } : {}),
    },
    select: { spmId: true, no_spm: true },
  });

  const usedSpmIds = existingSp2d
    .map((s) => s.spmId)
    .filter((id): id is string => Boolean(id));
  const usedSpmNos = existingSp2d.map((s) => s.no_spm);

  const where: any = {
    tahunAnggaran,
    status: { in: ["DIAJUKAN", "DISETUJUI", "DIVERIFIKASI"] },
  };

  if (kd_skpd && kd_skpd !== "ALL") {
    where.kd_skpd = kd_skpd;
  }

  if (jenisSp2d && jenisSp2d !== "ALL") {
    const variants = [
      jenisSp2d,
      jenisSp2d.replace(/_/g, "-"),
      jenisSp2d.replace(/-/g, "_"),
    ];
    where.jenis_spm = { in: Array.from(new Set(variants)) };
  }

  // Jika pembuatan baru, kecualikan yang sudah dipakai
  if (!excludeSp2dId) {
    if (usedSpmIds.length > 0) {
      where.id = { notIn: usedSpmIds };
    }
    if (usedSpmNos.length > 0) {
      where.no_spm = { notIn: usedSpmNos };
    }
    where.sp2dList = { none: {} };
  } else {
    where.sp2dList = { none: { id: { not: excludeSp2dId } } };
  }

  const spmList = await prisma.trhspm.findMany({
    where,
    include: {
      opd: {
        select: { id: true, kd_skpd: true, nm_skpd: true },
      },
      spp: {
        include: {
          rincian: {
            orderBy: [{ kd_sub_kegiatan: "asc" }, { kd_rek6: "asc" }],
          },
        },
      },
      potongan: {
        orderBy: { kd_rek6: "asc" },
      },
      sp2dList: {
        where: excludeSp2dId ? { id: { not: excludeSp2dId } } : {},
        select: { id: true, no_sp2d: true, tgl_sp2d: true, status: true },
      },
    },
    orderBy: [{ tgl_spm: "desc" }, { createdAt: "desc" }],
  });

  return spmList.map((spm) => ({
    id: spm.id,
    no_spm: spm.no_spm,
    tgl_spm: spm.tgl_spm.toISOString().split("T")[0],
    sppId: spm.sppId,
    no_spp: spm.no_spp,
    tgl_spp: spm.tgl_spp ? spm.tgl_spp.toISOString().split("T")[0] : null,
    kd_skpd: spm.kd_skpd,
    nm_skpd: spm.nm_skpd,
    opdId: spm.opdId,
    kd_unit: spm.kd_unit,
    nm_unit: spm.nm_unit,
    unitKerjaId: spm.unitKerjaId,
    jenis_spm: spm.jenis_spm,
    bulan: spm.bulan,
    keperluan: spm.keperluan,
    nilai: Number(spm.nilai) || 0,
    nilai_potongan: Number(spm.nilai_potongan) || 0,
    nilai_bersih: Number(spm.nilai_bersih) || 0,
    no_spd: spm.no_spd,
    tgl_spd: spm.tgl_spd ? spm.tgl_spd.toISOString().split("T")[0] : null,
    nama_penerima: spm.nama_penerima,
    bank_penerima: spm.bank_penerima,
    rek_penerima: spm.rek_penerima,
    npwp_penerima: spm.npwp_penerima,
    bendaharaNama: spm.bendaharaNama,
    bendaharaNip: spm.bendaharaNip,
    status: spm.status,
    isUsedBySp2d: spm.sp2dList.length > 0,
    usedSp2dNo: spm.sp2dList[0]?.no_sp2d || null,
    // Rincian belanja diambil dari trdspp via relasi spp
    rincianBelanja: (spm.spp?.rincian || []).map((r) => ({
      id: r.id,
      kd_program: r.kd_program,
      nm_program: r.nm_program,
      kd_kegiatan: r.kd_kegiatan,
      nm_kegiatan: r.nm_kegiatan,
      kd_sub_kegiatan: r.kd_sub_kegiatan,
      nm_sub_kegiatan: r.nm_sub_kegiatan,
      kd_rek6: r.kd_rek6,
      nm_rek6: r.nm_rek6,
      nilai: Number(r.nilai) || 0,
      sumberDana: r.sumberDana,
    })),
    // Potongan pajak diambil dari trspmpot
    potongan: spm.potongan.map((p) => ({
      id: p.id,
      kd_rek6: p.kd_rek6,
      nm_rek6: p.nm_rek6,
      nilai: Number(p.nilai) || 0,
      id_billing: p.id_billing,
      keterangan: p.keterangan,
    })),
  }));
}

/**
 * Daftar Dokumen SP2D dengan Filtering
 */
export async function getSp2dList(params: {
  tahunAnggaran: number;
  kd_skpd?: string;
  jenis_sp2d?: string;
  status?: string;
  q?: string;
}) {
  const { tahunAnggaran, kd_skpd, jenis_sp2d, status, q } = params;

  const where: any = { tahunAnggaran };

  if (kd_skpd && kd_skpd !== "ALL") {
    where.kd_skpd = kd_skpd;
  }

  if (jenis_sp2d && jenis_sp2d !== "ALL") {
    const variants = [
      jenis_sp2d,
      jenis_sp2d.replace(/_/g, "-"),
      jenis_sp2d.replace(/-/g, "_"),
    ];
    where.jenis_sp2d = { in: Array.from(new Set(variants)) };
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (q && q.trim()) {
    const query = q.trim();
    where.OR = [
      { no_sp2d: { contains: query, mode: "insensitive" } },
      { no_spm: { contains: query, mode: "insensitive" } },
      { no_spp: { contains: query, mode: "insensitive" } },
      { keperluan: { contains: query, mode: "insensitive" } },
      { nama_penerima: { contains: query, mode: "insensitive" } },
      { nm_skpd: { contains: query, mode: "insensitive" } },
    ];
  }

  const items = await prisma.trhsp2d.findMany({
    where,
    orderBy: [{ tgl_sp2d: "desc" }, { createdAt: "desc" }],
  });

  return {
    items: items.map((s) => ({
      ...s,
      tgl_sp2d: s.tgl_sp2d.toISOString().split("T")[0],
      tgl_spm: s.tgl_spm ? s.tgl_spm.toISOString().split("T")[0] : null,
      tgl_spp: s.tgl_spp ? s.tgl_spp.toISOString().split("T")[0] : null,
      tgl_spd: s.tgl_spd ? s.tgl_spd.toISOString().split("T")[0] : null,
      tgl_verifikasi: s.tgl_verifikasi
        ? s.tgl_verifikasi.toISOString().split("T")[0]
        : null,
      tgl_cair: s.tgl_cair ? s.tgl_cair.toISOString().split("T")[0] : null,
      nilai: Number(s.nilai) || 0,
      nilai_potongan: Number(s.nilai_potongan) || 0,
      nilai_bersih: Number(s.nilai_bersih) || 0,
    })),
    total: items.length,
  };
}

/**
 * Detail Dokumen SP2D beserta Detail Belanja (trdspp) & Potongan (trspmpot)
 */
export async function getSp2dDetail(id: string) {
  const sp2d = await prisma.trhsp2d.findUnique({
    where: { id },
    include: {
      opd: true,
      spm: {
        include: {
          potongan: true,
          spp: {
            include: {
              rincian: {
                orderBy: [{ kd_sub_kegiatan: "asc" }, { kd_rek6: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!sp2d) return null;

  const rincianBelanja = (sp2d.spm?.spp?.rincian || []).map((r) => ({
    id: r.id,
    kd_program: r.kd_program,
    nm_program: r.nm_program,
    kd_kegiatan: r.kd_kegiatan,
    nm_kegiatan: r.nm_kegiatan,
    kd_sub_kegiatan: r.kd_sub_kegiatan,
    nm_sub_kegiatan: r.nm_sub_kegiatan,
    kd_rek6: r.kd_rek6,
    nm_rek6: r.nm_rek6,
    nilai: Number(r.nilai) || 0,
    sumberDana: r.sumberDana,
  }));

  const potongan = (sp2d.spm?.potongan || []).map((p) => ({
    id: p.id,
    kd_rek6: p.kd_rek6,
    nm_rek6: p.nm_rek6,
    nilai: Number(p.nilai) || 0,
    id_billing: p.id_billing,
    keterangan: p.keterangan,
  }));

  return {
    ...sp2d,
    tgl_sp2d: sp2d.tgl_sp2d.toISOString().split("T")[0],
    tgl_spm: sp2d.tgl_spm ? sp2d.tgl_spm.toISOString().split("T")[0] : null,
    tgl_spp: sp2d.tgl_spp ? sp2d.tgl_spp.toISOString().split("T")[0] : null,
    tgl_spd: sp2d.tgl_spd ? sp2d.tgl_spd.toISOString().split("T")[0] : null,
    tgl_verifikasi: sp2d.tgl_verifikasi
      ? sp2d.tgl_verifikasi.toISOString().split("T")[0]
      : null,
    tgl_cair: sp2d.tgl_cair ? sp2d.tgl_cair.toISOString().split("T")[0] : null,
    nilai: Number(sp2d.nilai) || 0,
    nilai_potongan: Number(sp2d.nilai_potongan) || 0,
    nilai_bersih: Number(sp2d.nilai_bersih) || 0,
    rincianBelanja,
    potongan,
  };
}

/**
 * Simpan / Update Dokumen SP2D
 */
export async function saveSp2d(data: SaveSp2dPayload, userNama?: string) {
  const {
    id,
    tahunAnggaran,
    no_sp2d,
    tgl_sp2d,
    spmId,
    no_spm,
    tgl_spm,
    sppId,
    no_spp,
    tgl_spp,
    opdId,
    unitKerjaId,
    jenis_sp2d,
    bulan,
    keperluan,
    nilai,
    nilai_potongan = 0,
    nilai_bersih = 0,
    no_spd,
    tgl_spd,
    nama_penerima,
    bank_penerima,
    rek_penerima,
    npwp_penerima,
    nama_bank_pembayar = "Bank Sumut (RKUD)",
    rek_bank_pembayar,
    kuasaBudNama,
    kuasaBudNip,
    kuasaBudJabatan = "Kuasa Bendahara Umum Daerah (BUD)",
    verifikatorNama,
    verifikatorNip,
    status = "DRAFT",
    keterangan,
  } = data;

  const opd = await prisma.opd.findUnique({
    where: { id: opdId },
    select: { kd_skpd: true, nm_skpd: true },
  });
  if (!opd) {
    throw new Error("Perangkat Daerah (OPD) tidak valid.");
  }

  let unitInfo = { kd_unit: null as string | null, nm_unit: null as string | null };
  if (unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({
      where: { id: unitKerjaId },
      select: { kd_unit: true, nm_unit: true },
    });
    if (unit) {
      unitInfo = { kd_unit: unit.kd_unit, nm_unit: unit.nm_unit };
    }
  }

  // Cek duplikasi nomor SP2D pada tahun yang sama
  const existingNo = await prisma.trhsp2d.findFirst({
    where: {
      tahunAnggaran,
      no_sp2d: no_sp2d.trim(),
      ...(id ? { id: { not: id } } : {}),
    },
  });
  if (existingNo) {
    throw new Error(`Nomor SP2D "${no_sp2d}" sudah terdaftar pada Tahun Anggaran ${tahunAnggaran}.`);
  }

  // Cek apakah SPM ini sudah dibuatkan SP2D oleh dokumen lain
  if (spmId) {
    const existingSpmUsage = await prisma.trhsp2d.findFirst({
      where: {
        tahunAnggaran,
        spmId,
        status: { notIn: ["BATAL", "DITOLAK"] },
        ...(id ? { id: { not: id } } : {}),
      },
    });
    if (existingSpmUsage) {
      throw new Error(`Dokumen SPM "${no_spm}" sudah pernah diterbitkan SP2D (${existingSpmUsage.no_sp2d}).`);
    }
  }

  const parsedTglSp2d = new Date(tgl_sp2d);
  const parsedTglSpm = tgl_spm ? new Date(tgl_spm) : null;
  const parsedTglSpp = tgl_spp ? new Date(tgl_spp) : null;
  const parsedTglSpd = tgl_spd ? new Date(tgl_spd) : null;

  return await prisma.$transaction(async (tx) => {
    let header;

    if (id) {
      header = await tx.trhsp2d.update({
        where: { id },
        data: {
          no_sp2d: no_sp2d.trim(),
          tgl_sp2d: parsedTglSp2d,
          no_spm: no_spm.trim(),
          tgl_spm: parsedTglSpm,
          spmId: spmId || null,
          no_spp: no_spp ? no_spp.trim() : "",
          tgl_spp: parsedTglSpp,
          sppId: sppId || null,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_sp2d,
          bulan: bulan || null,
          keperluan,
          nilai,
          nilai_potongan,
          nilai_bersih,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          nama_bank_pembayar,
          rek_bank_pembayar,
          kuasaBudNama,
          kuasaBudNip,
          kuasaBudJabatan,
          verifikatorNama,
          verifikatorNip,
          status,
          keterangan,
        },
      });
    } else {
      header = await tx.trhsp2d.create({
        data: {
          tahunAnggaran,
          no_sp2d: no_sp2d.trim(),
          tgl_sp2d: parsedTglSp2d,
          no_spm: no_spm.trim(),
          tgl_spm: parsedTglSpm,
          spmId: spmId || null,
          no_spp: no_spp ? no_spp.trim() : "",
          tgl_spp: parsedTglSpp,
          sppId: sppId || null,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_sp2d,
          bulan: bulan || null,
          keperluan,
          nilai,
          nilai_potongan,
          nilai_bersih,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          nama_bank_pembayar,
          rek_bank_pembayar,
          kuasaBudNama,
          kuasaBudNip,
          kuasaBudJabatan,
          verifikatorNama,
          verifikatorNip,
          status,
          keterangan,
        },
      });
    }

    // Update status dokumen SPM asal menjadi "TELAH DIBUAT SP2D"
    if (spmId) {
      await tx.trhspm.update({
        where: { id: spmId },
        data: { status: "TELAH DIBUAT SP2D" },
      });
    }

    return header;
  });
}

/**
 * Verifikasi & Persetujuan SP2D (Kuasa BUD / Staf Verifikator)
 * Mendukung pembatalan kembali ke status "DRAFT"
 */
export async function verifySp2d(params: {
  id: string;
  status: "DIVERIFIKASI" | "DISETUJUI" | "DITOLAK" | "DRAFT";
  catatan_verifikasi?: string;
  verifikatorNama?: string;
  verifikatorNip?: string;
}) {
  const { id, status, catatan_verifikasi, verifikatorNama, verifikatorNip } = params;

  return await prisma.trhsp2d.update({
    where: { id },
    data: {
      status,
      catatan_verifikasi: catatan_verifikasi || null,
      verifikatorNama: verifikatorNama || null,
      verifikatorNip: verifikatorNip || null,
      tgl_verifikasi: status === "DRAFT" ? null : new Date(),
    },
  });
}

/**
 * Update Status Pencairan Bank RKUD (Monitoring Pencairan)
 */
export async function updatePencairanSp2d(params: {
  id: string;
  tgl_cair: string;
  no_transaksi_bank?: string;
  isCair: boolean;
  keterangan?: string;
}) {
  const { id, tgl_cair, no_transaksi_bank, isCair, keterangan } = params;

  return await prisma.trhsp2d.update({
    where: { id },
    data: {
      status: isCair ? "CAIR" : "DISETUJUI",
      tgl_cair: isCair ? new Date(tgl_cair) : null,
      no_transaksi_bank: no_transaksi_bank || null,
      keterangan: keterangan || undefined,
    },
  });
}

/**
 * Hapus Dokumen SP2D (Hanya bisa jika status DRAFT / DITOLAK)
 */
export async function deleteSp2d(id: string) {
  const sp2d = await prisma.trhsp2d.findUnique({
    where: { id },
    select: { id: true, spmId: true, status: true },
  });

  if (!sp2d) throw new Error("Dokumen SP2D tidak ditemukan.");
  if (sp2d.status === "CAIR" || sp2d.status === "DISETUJUI") {
    throw new Error("Dokumen SP2D yang sudah disetujui atau dicairkan tidak dapat dihapus.");
  }

  return await prisma.$transaction(async (tx) => {
    // Kembalikan status SPM menjadi DIAJUKAN jika tidak ada SP2D lain
    if (sp2d.spmId) {
      await tx.trhspm.update({
        where: { id: sp2d.spmId },
        data: { status: "DIAJUKAN" },
      });
    }

    return await tx.trhsp2d.delete({
      where: { id },
    });
  });
}

/**
 * Mengambil Data Rekapitulasi Register SP2D
 */
export async function getRegisterSp2dData(params: {
  tahunAnggaran: number;
  opdId?: string;
  jenisSp2d?: string;
  tglMulai?: string;
  tglSelesai?: string;
  status?: string;
  search?: string;
}) {
  const {
    tahunAnggaran,
    opdId,
    jenisSp2d,
    tglMulai,
    tglSelesai,
    status,
    search,
  } = params;

  const where: any = { tahunAnggaran };

  if (opdId && opdId !== "ALL") {
    where.opdId = opdId;
  }

  if (jenisSp2d && jenisSp2d !== "ALL") {
    const variants = [
      jenisSp2d,
      jenisSp2d.replace(/_/g, "-"),
      jenisSp2d.replace(/-/g, "_"),
    ];
    where.jenis_sp2d = { in: Array.from(new Set(variants)) };
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (tglMulai && tglSelesai) {
    where.tgl_sp2d = {
      gte: new Date(`${tglMulai}T00:00:00.000Z`),
      lte: new Date(`${tglSelesai}T23:59:59.999Z`),
    };
  } else if (tglMulai) {
    where.tgl_sp2d = {
      gte: new Date(`${tglMulai}T00:00:00.000Z`),
    };
  } else if (tglSelesai) {
    where.tgl_sp2d = {
      lte: new Date(`${tglSelesai}T23:59:59.999Z`),
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { no_sp2d: { contains: q, mode: "insensitive" } },
      { no_spm: { contains: q, mode: "insensitive" } },
      { keperluan: { contains: q, mode: "insensitive" } },
      { nama_penerima: { contains: q, mode: "insensitive" } },
    ];
  }

  const sp2dRows = await prisma.trhsp2d.findMany({
    where,
    include: {
      opd: {
        select: {
          id: true,
          kd_skpd: true,
          nm_skpd: true,
          kepalaNama: true,
          kepalaNip: true,
          kepalaJabatan: true,
        },
      },
    },
    orderBy: [{ tgl_sp2d: "asc" }, { no_sp2d: "asc" }],
  });

  let totalUp = 0;
  let totalGu = 0;
  let totalTu = 0;
  let totalLsGaji = 0;
  let totalLsBarjas = 0;
  let totalPpkd = 0;
  let grandTotal = 0;
  let totalPotonganAll = 0;
  let totalNettoAll = 0;

  const items = sp2dRows.map((row, index) => {
    const jns = (row.jenis_sp2d || "").toUpperCase().replace(/-/g, "_");
    const val = Number(row.nilai) || 0;
    const pot = Number(row.nilai_potongan) || 0;
    const net = Number(row.nilai_bersih) || 0;

    let no_up: string | null = null;
    let no_gu: string | null = null;
    let no_tu: string | null = null;
    let no_ls_gaji: string | null = null;
    let no_ls_barjas: string | null = null;
    let no_ppkd: string | null = null;

    let nilai_up = 0;
    let nilai_gu = 0;
    let nilai_tu = 0;
    let nilai_ls_gaji = 0;
    let nilai_ls_barjas = 0;
    let nilai_ppkd = 0;

    if (jns === "UP" || jns === "UP_KKPD") {
      no_up = row.no_sp2d;
      nilai_up = val;
      totalUp += val;
    } else if (jns === "GU" || jns === "GU_KKPD") {
      no_gu = row.no_sp2d;
      nilai_gu = val;
      totalGu += val;
    } else if (jns === "TU") {
      no_tu = row.no_sp2d;
      nilai_tu = val;
      totalTu += val;
    } else if (jns === "LS_GAJI") {
      no_ls_gaji = row.no_sp2d;
      nilai_ls_gaji = val;
      totalLsGaji += val;
    } else if (jns === "LS_BARANG_JASA" || jns === "LS_BARJAS") {
      no_ls_barjas = row.no_sp2d;
      nilai_ls_barjas = val;
      totalLsBarjas += val;
    } else {
      no_ppkd = row.no_sp2d;
      nilai_ppkd = val;
      totalPpkd += val;
    }

    grandTotal += val;
    totalPotonganAll += pot;
    totalNettoAll += net;

    return {
      no_urut: index + 1,
      id: row.id,
      tgl_sp2d: row.tgl_sp2d.toISOString().split("T")[0],
      no_sp2d: row.no_sp2d,
      no_spm: row.no_spm,
      tgl_spm: row.tgl_spm ? row.tgl_spm.toISOString().split("T")[0] : null,
      kd_skpd: row.kd_skpd,
      nm_skpd: row.nm_skpd,
      uraian: row.keperluan,
      nama_penerima: row.nama_penerima,
      status: row.status,
      tgl_cair: row.tgl_cair ? row.tgl_cair.toISOString().split("T")[0] : null,
      // Nomor SP2D per kolom
      no_sp2d_up: no_up,
      no_sp2d_gu: no_gu,
      no_sp2d_tu: no_tu,
      no_sp2d_ls_gaji: no_ls_gaji,
      no_sp2d_ls_barjas: no_ls_barjas,
      no_sp2d_ppkd: no_ppkd,
      // Nilai rupiah per kolom
      nilai_up,
      nilai_gu,
      nilai_tu,
      nilai_ls_gaji,
      nilai_ls_barjas,
      nilai_ppkd,
      nilai_total: val,
      nilai_potongan: pot,
      nilai_bersih: net,
    };
  });

  return {
    items,
    totals: {
      totalUp,
      totalGu,
      totalTu,
      totalLsGaji,
      totalLsBarjas,
      totalPpkd,
      grandTotal,
      totalPotonganAll,
      totalNettoAll,
    },
  };
}

