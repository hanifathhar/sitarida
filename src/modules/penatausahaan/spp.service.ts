import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";

export interface SppFilterParams {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  jenisSpp?: string;
  search?: string;
  status?: string;
}

export interface SppRincianPayload {
  id?: string;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  sumberDana?: string | null;
}

export interface SaveSppPayload {
  id?: string;
  tahunAnggaran: number;
  no_spp: string;
  tgl_spp: string;
  opdId: string;
  unitKerjaId?: string | null;
  jenis_spp: string;
  bulan?: number | null;
  keperluan: string;
  no_spd?: string | null;
  tgl_spd?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  status?: string;
  keterangan?: string | null;
  rincian: SppRincianPayload[];
}

export async function getSppScopeData(session: SessionPayload) {
  const isSuperadmin =
    session.roleKode === "0" || session.roleKode === "SUPERADMIN";

  const isCrossOpd = isSuperadmin || session.isCrossOpd;

  const opds = await prisma.opd.findMany({
    where: {
      isActive: true,
      ...(isCrossOpd ? {} : { id: session.opdId || undefined }),
    },
    orderBy: { kd_skpd: "asc" },
    select: {
      id: true,
      kd_skpd: true,
      nm_skpd: true,
      singkatan: true,
      kepalaNama: true,
      kepalaNip: true,
      kepalaJabatan: true,
    },
  });

  const units = await prisma.unitKerja.findMany({
    where: {
      isActive: true,
      ...(isCrossOpd
        ? {}
        : {
            opdId: session.opdId || undefined,
            ...(session.unitKerjaId ? { id: session.unitKerjaId } : {}),
          }),
    },
    orderBy: { kd_unit: "asc" },
    select: {
      id: true,
      opdId: true,
      kd_unit: true,
      nm_unit: true,
      kepalaNama: true,
      kepalaNip: true,
    },
  });

  return {
    session: {
      userId: session.userId,
      username: session.username,
      namaLengkap: session.namaLengkap,
      roleKode: session.roleKode,
      roleNama: session.roleNama,
      isCrossOpd,
      opdId: session.opdId,
      unitKerjaId: session.unitKerjaId,
    },
    opds,
    units,
  };
}

export async function listSppByScope(params: SppFilterParams) {
  const { tahunAnggaran, opdId, unitKerjaId, jenisSpp, search, status } =
    params;

  const where: any = {
    tahunAnggaran,
    opdId,
  };

  if (unitKerjaId) {
    where.unitKerjaId = unitKerjaId;
  }

  if (jenisSpp && jenisSpp !== "ALL") {
    where.jenis_spp = jenisSpp;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { no_spp: { contains: q, mode: "insensitive" } },
      { keperluan: { contains: q, mode: "insensitive" } },
      { no_spd: { contains: q, mode: "insensitive" } },
      { nama_penerima: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.trhspp.findMany({
    where,
    orderBy: [{ tgl_spp: "desc" }, { no_spp: "desc" }],
    include: {
      _count: {
        select: { rincian: true },
      },
    },
  });

  let totalNilai = 0;
  const items = rows.map((r) => {
    const val = Number(r.nilai) || 0;
    totalNilai += val;
    return {
      id: r.id,
      tahunAnggaran: r.tahunAnggaran,
      no_spp: r.no_spp,
      tgl_spp: r.tgl_spp.toISOString().split("T")[0],
      kd_skpd: r.kd_skpd,
      nm_skpd: r.nm_skpd,
      kd_unit: r.kd_unit,
      nm_unit: r.nm_unit,
      opdId: r.opdId,
      unitKerjaId: r.unitKerjaId,
      jenis_spp: r.jenis_spp,
      bulan: r.bulan,
      keperluan: r.keperluan,
      nilai: val,
      no_spd: r.no_spd,
      tgl_spd: r.tgl_spd ? r.tgl_spd.toISOString().split("T")[0] : null,
      nama_penerima: r.nama_penerima,
      bank_penerima: r.bank_penerima,
      rek_penerima: r.rek_penerima,
      npwp_penerima: r.npwp_penerima,
      bendaharaNama: r.bendaharaNama,
      bendaharaNip: r.bendaharaNip,
      pptkNama: r.pptkNama,
      pptkNip: r.pptkNip,
      paKpaNama: r.paKpaNama,
      paKpaNip: r.paKpaNip,
      status: r.status,
      keterangan: r.keterangan,
      rekeningCount: r._count.rincian,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  return {
    totalItems: items.length,
    totalNilai,
    items,
  };
}

export async function getSppDetail(id: string) {
  const spp = await prisma.trhspp.findUnique({
    where: { id },
    include: {
      rincian: {
        orderBy: [
          { kd_sub_kegiatan: "asc" },
          { kd_rek6: "asc" },
        ],
      },
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
  });

  if (!spp) return null;

  return {
    ...spp,
    tgl_spp: spp.tgl_spp.toISOString().split("T")[0],
    tgl_spd: spp.tgl_spd ? spp.tgl_spd.toISOString().split("T")[0] : null,
    nilai: Number(spp.nilai) || 0,
    rincian: spp.rincian.map((d) => ({
      ...d,
      nilai: Number(d.nilai) || 0,
    })),
  };
}

export async function saveSpp(data: SaveSppPayload, userNama?: string) {
  const {
    id,
    tahunAnggaran,
    no_spp,
    tgl_spp,
    opdId,
    unitKerjaId,
    jenis_spp,
    bulan,
    keperluan,
    no_spd,
    tgl_spd,
    nama_penerima,
    bank_penerima,
    rek_penerima,
    npwp_penerima,
    bendaharaNama,
    bendaharaNip,
    pptkNama,
    pptkNip,
    paKpaNama,
    paKpaNip,
    status = "DRAFT",
    keterangan,
    rincian,
  } = data;

  const opd = await prisma.opd.findUnique({
    where: { id: opdId },
    select: { kd_skpd: true, nm_skpd: true },
  });
  if (!opd) {
    throw new Error("Perangkat Daerah (OPD) tidak valid");
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

  // Cek duplikasi nomor SPP pada tahun yang sama
  const existingNo = await prisma.trhspp.findFirst({
    where: {
      tahunAnggaran,
      no_spp,
      ...(id ? { NOT: { id } } : {}),
    },
  });
  if (existingNo) {
    throw new Error(`Nomor SPP "${no_spp}" sudah digunakan pada Tahun Anggaran ${tahunAnggaran}`);
  }

  const parsedTglSpp = new Date(tgl_spp);
  const parsedTglSpd = tgl_spd ? new Date(tgl_spd) : null;

  // Hitung total nilai dari rincian
  const totalNilai = rincian.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0);

  const result = await prisma.$transaction(async (tx) => {
    let header;
    if (id) {
      // Update Header
      header = await tx.trhspp.update({
        where: { id },
        data: {
          tahunAnggaran,
          no_spp,
          tgl_spp: parsedTglSpp,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_spp,
          bulan: bulan || null,
          keperluan,
          nilai: totalNilai,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          bendaharaNama: bendaharaNama || null,
          bendaharaNip: bendaharaNip || null,
          pptkNama: pptkNama || null,
          pptkNip: pptkNip || null,
          paKpaNama: paKpaNama || null,
          paKpaNip: paKpaNip || null,
          status,
          keterangan: keterangan || null,
        },
      });

      // Hapus rincian lama
      await tx.trdspp.deleteMany({
        where: { sppId: id },
      });
    } else {
      // Create Header
      header = await tx.trhspp.create({
        data: {
          tahunAnggaran,
          no_spp,
          tgl_spp: parsedTglSpp,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_spp,
          bulan: bulan || null,
          keperluan,
          nilai: totalNilai,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          bendaharaNama: bendaharaNama || null,
          bendaharaNip: bendaharaNip || null,
          pptkNama: pptkNama || null,
          pptkNip: pptkNip || null,
          paKpaNama: paKpaNama || null,
          paKpaNip: paKpaNip || null,
          status,
          keterangan: keterangan || null,
        },
      });
    }

    // Insert rincian trdspp
    if (rincian && rincian.length > 0) {
      const isUp = jenis_spp === "UP";
      await tx.trdspp.createMany({
        data: rincian.map((r) => ({
          sppId: header.id,
          tahunAnggaran,
          kd_skpd: opd.kd_skpd,
          kd_unit: unitInfo.kd_unit,
          kd_program: isUp ? "" : (r.kd_program || ""),
          nm_program: isUp ? "" : (r.nm_program || ""),
          kd_kegiatan: isUp ? "" : (r.kd_kegiatan || ""),
          nm_kegiatan: isUp ? "" : (r.nm_kegiatan || ""),
          kd_sub_kegiatan: isUp ? "" : (r.kd_sub_kegiatan || ""),
          nm_sub_kegiatan: isUp ? "" : (r.nm_sub_kegiatan || ""),
          kd_rek6: r.kd_rek6,
          nm_rek6: r.nm_rek6,
          nilai: Number(r.nilai) || 0,
          sumberDana: r.sumberDana || null,
        })),
      });
    }

    return header;
  });

  return result;
}

export async function deleteSpp(id: string) {
  const spp = await prisma.trhspp.findUnique({
    where: { id },
  });
  if (!spp) {
    throw new Error("Dokumen SPP tidak ditemukan");
  }
  if (spp.status === "DIVERIFIKASI") {
    throw new Error("Dokumen SPP yang sudah diverifikasi / diterbitkan SPM tidak dapat dihapus");
  }

  await prisma.trhspp.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * Mengambil daftar Rekening Belanja DPA (trdrka) dan dikontrol terhadap akumulasi batas SPD terbit (tr_spd)
 * serta akumulasi SPP sebelumnya
 */
export async function getRekeningReferensiForSpp(params: {
  tahunAnggaran: number;
  kd_skpd: string;
  kd_unit?: string | null;
  excludeSppId?: string | null;
}) {
  const { tahunAnggaran, kd_skpd, kd_unit, excludeSppId } = params;

  // 1. Ambil seluruh rekening belanja akun 5 dari trdrka
  const drkaRows = await prisma.trdrka.findMany({
    where: {
      tahunAnggaran,
      kd_skpd,
      kd_rek6: { startsWith: "5" },
    },
    orderBy: [
      { kd_sub_kegiatan: "asc" },
      { kd_rek6: "asc" },
    ],
  });

  // 2. Ambil total batas SPD yang sudah diterbitkan pada tr_spd
  const spdRows = await prisma.spd.findMany({
    where: {
      tahunAnggaran,
      kd_skpd,
    },
  });

  const spdMap = new Map<string, number>();
  spdRows.forEach((s) => {
    const key = `${s.kd_sub_kegiatan}_${s.kd_rek6}`;
    const cur = spdMap.get(key) || 0;
    spdMap.set(key, cur + (Number(s.nilai) || 0));
  });

  // 3. Ambil akumulasi SPP yang sudah diterbitkan sebelumnya pada trdspp
  const sppLaluRows = await prisma.trdspp.findMany({
    where: {
      tahunAnggaran,
      kd_skpd,
      ...(excludeSppId ? { sppId: { not: excludeSppId } } : {}),
      spp: {
        status: { in: ["DRAFT", "DIAJUKAN", "DIVERIFIKASI"] },
      },
    },
    select: {
      kd_sub_kegiatan: true,
      kd_rek6: true,
      nilai: true,
    },
  });

  const sppLaluMap = new Map<string, number>();
  sppLaluRows.forEach((r) => {
    const key = `${r.kd_sub_kegiatan}_${r.kd_rek6}`;
    const cur = sppLaluMap.get(key) || 0;
    sppLaluMap.set(key, cur + (Number(r.nilai) || 0));
  });

  // Susun data per rekening
  const rekeningList = drkaRows.map((r) => {
    const pagu =
      r.nilai_ubah !== null && r.nilai_ubah !== undefined
        ? Number(r.nilai_ubah)
        : Number(r.nilai) || 0;

    const key = `${r.kd_sub_kegiatan}_${r.kd_rek6}`;
    const totalSpd = spdMap.get(key) || 0;
    const totalSppLalu = sppLaluMap.get(key) || 0;
    const sisaSpd = Math.max(0, totalSpd - totalSppLalu);

    return {
      kd_program: r.kd_program,
      nm_program: r.nm_program,
      kd_kegiatan: r.kd_kegiatan,
      nm_kegiatan: r.nm_kegiatan,
      kd_sub_kegiatan: r.kd_sub_kegiatan,
      nm_sub_kegiatan: r.nm_sub_kegiatan,
      kd_rek6: r.kd_rek6,
      nm_rek6: r.nm_rek6,
      paguDpa: pagu,
      totalSpd,
      totalSppLalu,
      sisaSpd,
    };
  });

  return rekeningList;
}

/**
 * Mengambil data penetapan UP dari tabel tr_penetapan_up untuk SPP-UP
 * beserta rekening default 1.1.01.03.01.0001 - Kas di Bendahara Pengeluaran
 */
export async function getPenetapanUpForSpp(params: {
  tahunAnggaran: number;
  opdId: string;
}) {
  const { tahunAnggaran, opdId } = params;

  const penetapan = await prisma.penetapanUp.findUnique({
    where: {
      tahunAnggaran_opdId: {
        tahunAnggaran,
        opdId,
      },
    },
    include: {
      opd: {
        select: {
          kd_skpd: true,
          nm_skpd: true,
          kepalaNama: true,
          kepalaNip: true,
        },
      },
    },
  });

  const nominalUp = penetapan ? Number(penetapan.nominalUp) || 0 : 0;
  const nominalKkpd = penetapan ? Number(penetapan.nominalKkpd) || 0 : 0;

  return {
    penetapanId: penetapan?.id || null,
    tahunAnggaran,
    opdId,
    no_sk: penetapan?.no_sk || null,
    tgl_sk: penetapan?.tgl_sk
      ? penetapan.tgl_sk.toISOString().split("T")[0]
      : null,
    nominalUp,
    nominalKkpd,
    status: penetapan?.status || "BELUM_DITETAPKAN",
    rekeningKas: {
      kd_rek6: "1.1.01.03.01.0001",
      nm_rek6: "Kas di Bendahara Pengeluaran",
      kd_program: "",
      nm_program: "",
      kd_kegiatan: "",
      nm_kegiatan: "",
      kd_sub_kegiatan: "",
      nm_sub_kegiatan: "",
      nilai: nominalUp,
    },
  };
}

/**
 * Mengambil daftar SPD unik yang telah terbit (tr_spd) untuk dipilih dalam modal SPP
 */
export async function getSpdTerbitList(params: {
  tahunAnggaran: number;
  kd_skpd: string;
  kd_unit?: string | null;
}) {
  const { tahunAnggaran, kd_skpd, kd_unit } = params;

  const spdRows = await prisma.spd.findMany({
    where: {
      tahunAnggaran,
      kd_skpd,
      status: "AKTIF",
      ...(kd_unit ? { kd_unit } : {}),
    },
    orderBy: [{ tgl_spd: "desc" }, { no_spd: "desc" }],
  });

  const spdGroupMap = new Map<
    string,
    {
      no_spd: string;
      tgl_spd: string;
      triwulan: number;
      periode: string;
      totalNilai: number;
      keterangan: string | null;
      kd_skpd: string;
      nm_skpd: string;
      kd_unit: string | null;
      nm_unit: string | null;
      countRekening: number;
    }
  >();

  for (const s of spdRows) {
    const key = s.no_spd;
    const existing = spdGroupMap.get(key);
    const val = Number(s.nilai) || 0;
    if (existing) {
      existing.totalNilai += val;
      existing.countRekening += 1;
    } else {
      spdGroupMap.set(key, {
        no_spd: s.no_spd,
        tgl_spd: s.tgl_spd ? s.tgl_spd.toISOString().split("T")[0] : "",
        triwulan: s.triwulan,
        periode: s.periode,
        totalNilai: val,
        keterangan: s.keterangan || null,
        kd_skpd: s.kd_skpd,
        nm_skpd: s.nm_skpd,
        kd_unit: s.kd_unit,
        nm_unit: s.nm_unit,
        countRekening: 1,
      });
    }
  }

  return Array.from(spdGroupMap.values());
}

/**
 * Mengambil data Petugas Penandatangan berdasarkan role dan OPD terkait
 * - Bendahara Pengeluaran (Role Kode: 10 / nama mengandung Bendahara)
 * - PPTK (Role Kode: 9 / nama mengandung PPTK)
 * - PA / KPA (Role Kode: 7 / kepala OPD)
 */
export async function getPetugasPenandatanganByOpd(opdId: string) {
  const users = await prisma.user.findMany({
    where: {
      opdId,
      isActive: true,
    },
    include: {
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

  const opd = await prisma.opd.findUnique({
    where: { id: opdId },
    select: {
      kepalaNama: true,
      kepalaNip: true,
      kepalaJabatan: true,
    },
  });

  // Bendahara Pengeluaran: role kode 10 atau nama role mengandung bendahara
  const bendaharaList = users
    .filter(
      (u) =>
        u.role.kode === "10" ||
        u.role.nama.toLowerCase().includes("bendahara")
    )
    .map((u) => ({
      id: u.id,
      nama: u.namaLengkap,
      nip: u.nip || "",
      jabatan: u.jabatan || u.role.nama,
    }));

  // PPTK: role kode 9 atau nama role mengandung pptk
  const pptkList = users
    .filter(
      (u) =>
        u.role.kode === "9" ||
        u.role.nama.toLowerCase().includes("pptk")
    )
    .map((u) => ({
      id: u.id,
      nama: u.namaLengkap,
      nip: u.nip || "",
      jabatan: u.jabatan || u.role.nama,
    }));

  // PA / KPA: role kode 7 atau nama role mengandung PA / KPA
  const paKpaList = users
    .filter(
      (u) =>
        u.role.kode === "7" ||
        u.role.nama.toLowerCase().includes("pa") ||
        u.role.nama.toLowerCase().includes("kpa")
    )
    .map((u) => ({
      id: u.id,
      nama: u.namaLengkap,
      nip: u.nip || "",
      jabatan: u.jabatan || u.role.nama,
    }));

  // Tambahkan kepala OPD ke opsi PA jika belum terdaftar
  if (opd?.kepalaNama) {
    const exists = paKpaList.some(
      (p) => p.nama.toLowerCase() === opd.kepalaNama?.toLowerCase()
    );
    if (!exists) {
      paKpaList.unshift({
        id: "kepala-opd",
        nama: opd.kepalaNama,
        nip: opd.kepalaNip || "",
        jabatan: opd.kepalaJabatan || "Pengguna Anggaran (Kepala SKPD)",
      });
    }
  }

  return {
    bendaharaList,
    pptkList,
    paKpaList,
  };
}

/**
 * Mengambil data Register SPP lintas jenis dengan filter
 */
export async function getRegisterSppData(params: {
  tahunAnggaran: number;
  opdId?: string | null;
  jenisSpp?: string | null;
  tglMulai?: string | null;
  tglSelesai?: string | null;
  status?: string | null;
  search?: string | null;
}) {
  const { tahunAnggaran, opdId, jenisSpp, tglMulai, tglSelesai, status, search } =
    params;

  const where: any = {
    tahunAnggaran,
  };

  if (opdId && opdId !== "ALL") {
    where.opdId = opdId;
  }

  if (jenisSpp && jenisSpp !== "ALL") {
    where.jenis_spp = jenisSpp;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (tglMulai && tglSelesai) {
    where.tgl_spp = {
      gte: new Date(tglMulai),
      lte: new Date(tglSelesai),
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { no_spp: { contains: q, mode: "insensitive" } },
      { keperluan: { contains: q, mode: "insensitive" } },
      { nm_skpd: { contains: q, mode: "insensitive" } },
      { no_spd: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.trhspp.findMany({
    where,
    orderBy: [{ tgl_spp: "asc" }, { no_spp: "asc" }],
    include: {
      _count: {
        select: { rincian: true },
      },
    },
  });

  let totalNilai = 0;
  const items = rows.map((r, idx) => {
    const val = Number(r.nilai) || 0;
    totalNilai += val;
    return {
      noUrut: idx + 1,
      id: r.id,
      no_spp: r.no_spp,
      tgl_spp: r.tgl_spp.toISOString().split("T")[0],
      kd_skpd: r.kd_skpd,
      nm_skpd: r.nm_skpd,
      jenis_spp: r.jenis_spp,
      keperluan: r.keperluan,
      nilai: val,
      no_spd: r.no_spd || "-",
      nama_penerima: r.nama_penerima || "-",
      bendaharaNama: r.bendaharaNama || "-",
      status: r.status,
    };
  });

  return {
    tahunAnggaran,
    totalItems: items.length,
    totalNilai,
    items,
  };
}

