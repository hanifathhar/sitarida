import { prisma } from "@/lib/prisma";

export interface DokumenAnggaranParams {
  tahun: number;
  opdId?: string | null;
  tahap?: "MURNI" | "PERUBAHAN";
}

export interface PejabatDaerahInfo {
  namaDaerah: string;
  ibuKota: string;
  bupatiNama: string;
  bupatiJabatan: string;
  sekdaNama: string;
  sekdaNip: string;
  sekdaPangkat: string;
  kepalaBpkpadNama: string;
  kepalaBpkpadNip: string;
  kepalaBpkpadPangkat: string;
  nomorPerda: string;
  tanggalPerda: string;
  nomorPerbup: string;
  tanggalPerbup: string;
}

export interface PenandatanganInfo {
  nama: string;
  nip: string;
  jabatan: string;
  pangkat?: string;
  role?: string;
}

export async function getDokumenAnggaranData(params: DokumenAnggaranParams) {
  const { tahun, opdId } = params;

  // 1. Ambil seluruh OPD
  const opds = await prisma.opd.findMany({
    where: { isActive: true },
    orderBy: { kd_skpd: "asc" },
    select: {
      id: true,
      kd_skpd: true,
      nm_skpd: true,
      singkatan: true,
      kd_urusan: true,
      nm_urusan: true,
      kepalaNama: true,
      kepalaNip: true,
      kepalaJabatan: true,
    },
  });

  const selectedOpd = opdId ? opds.find((o) => o.id === opdId) : null;

  // 2. Ambil master urusan
  const urusanList = await prisma.msUrusan.findMany({
    orderBy: { kd_urusan2: "asc" },
  });

  // 3. Ambil data trdrka (Rekening Belanja RKA)
  const drkaWhere: any = {
    tahunAnggaran: tahun,
  };
  if (selectedOpd) {
    drkaWhere.kd_skpd = selectedOpd.kd_skpd;
  }

  const [drkaRows, dpoRows, trskpdRows] = await Promise.all([
    prisma.trdrka.findMany({
      where: drkaWhere,
      orderBy: [
        { kd_skpd: "asc" },
        { kd_sub_kegiatan: "asc" },
        { kd_rek6: "asc" },
      ],
      select: {
        id: true,
        tahunAnggaran: true,
        trskpdId: true,
        kd_skpd: true,
        nm_skpd: true,
        kd_program: true,
        nm_program: true,
        kd_kegiatan: true,
        nm_kegiatan: true,
        kd_sub_kegiatan: true,
        nm_sub_kegiatan: true,
        kd_rek6: true,
        nm_rek6: true,
        nilai: true,
        nilai_ubah: true,
      },
    }),
    prisma.trdpo.findMany({
      where: drkaWhere,
      orderBy: [
        { kd_skpd: "asc" },
        { kd_sub_kegiatan: "asc" },
        { kd_rek6: "asc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.trskpd.findMany({
      where: drkaWhere,
      orderBy: [
        { kd_skpd: "asc" },
        { kd_sub_kegiatan: "asc" },
      ],
    }),
  ]);

  // Pejabat Pemkab Tapanuli Selatan
  const bpkpadOpd = opds.find(
    (o) =>
      o.kd_skpd.startsWith("5.02") ||
      o.nm_skpd.toLowerCase().includes("keuangan") ||
      o.nm_skpd.toLowerCase().includes("bpkpad")
  );

  // 4. Ambil User dengan Role BUD & PA/KPA
  const [budRole, paRole] = await Promise.all([
    prisma.role.findFirst({
      where: {
        OR: [{ kode: "1" }, { nama: "BUD" }],
      },
      select: { id: true, kode: true, nama: true },
    }),
    prisma.role.findFirst({
      where: {
        OR: [
          { kode: "7" },
          { nama: "PA/KPA" },
          { nama: { contains: "PA/KPA" } },
        ],
      },
      select: { id: true, kode: true, nama: true },
    }),
  ]);

  // Ambil user role BUD (Pejabat Pengelola Keuangan Daerah)
  let budUser: PenandatanganInfo | null = null;
  if (budRole) {
    const rawBudUser = await prisma.user.findFirst({
      where: {
        OR: [
          { roleId: budRole.id },
          { roleAssignments: { some: { roleId: budRole.id } } },
        ],
      },
      select: {
        namaLengkap: true,
        nip: true,
        jabatan: true,
      },
    });

    if (rawBudUser) {
      budUser = {
        nama: rawBudUser.namaLengkap,
        nip: rawBudUser.nip || "-",
        jabatan:
          rawBudUser.jabatan ||
          "PEJABAT PENGELOLA KEUANGAN DAERAH SELAKU BENDAHARA UMUM DAERAH",
        pangkat: "PEMBINA UTAMA MUDA",
        role: "BUD",
      };
    }
  }

  // Fallback BUD jika belum ada user role BUD eksplisit
  const budInfo: PenandatanganInfo = budUser || {
    nama:
      bpkpadOpd?.kepalaNama && bpkpadOpd.kepalaNama !== "-"
        ? bpkpadOpd.kepalaNama
        : "M. FRANANDA, S.E, M.M",
    nip:
      bpkpadOpd?.kepalaNip && bpkpadOpd.kepalaNip !== "-"
        ? bpkpadOpd.kepalaNip
        : "19800723 200312 1 002",
    jabatan: "PEJABAT PENGELOLA KEUANGAN DAERAH SELAKU BENDAHARA UMUM DAERAH",
    pangkat: "PEMBINA UTAMA MUDA",
    role: "BUD",
  };

  // Ambil seluruh user yang memiliki role PA/KPA
  const rawPaUsers = paRole
    ? await prisma.user.findMany({
        where: {
          OR: [
            { roleId: paRole.id },
            { roleAssignments: { some: { roleId: paRole.id } } },
          ],
        },
        select: {
          id: true,
          namaLengkap: true,
          nip: true,
          jabatan: true,
          opdId: true,
          opd: { select: { id: true, kd_skpd: true } },
          roleAssignments: {
            where: { roleId: paRole.id },
            select: { opdId: true, opd: { select: { id: true, kd_skpd: true } } },
          },
        },
      })
    : [];

  // Hubungkan masing-masing OPD dengan penandatangan PA/KPA
  const opdsWithPaKpa = opds.map((opd) => {
    const matchedUser = rawPaUsers.find(
      (u) =>
        u.opdId === opd.id ||
        u.opd?.kd_skpd === opd.kd_skpd ||
        u.roleAssignments.some(
          (ra) => ra.opdId === opd.id || ra.opd?.kd_skpd === opd.kd_skpd
        )
    );

    const paKpaInfo: PenandatanganInfo = matchedUser
      ? {
          nama: matchedUser.namaLengkap,
          nip: matchedUser.nip || "-",
          jabatan:
            matchedUser.jabatan ||
            opd.kepalaJabatan ||
            `Pengguna Anggaran`,
          role: "PA/KPA",
        }
      : {
          nama:
            opd.kepalaNama && opd.kepalaNama !== "-"
              ? opd.kepalaNama
              : `Kepala ${opd.nm_skpd}`,
          nip: opd.kepalaNip && opd.kepalaNip !== "-" ? opd.kepalaNip : "-",
          jabatan: opd.kepalaJabatan || `Pengguna Anggaran`,
          role: "PA/KPA",
        };

    return {
      ...opd,
      paKpaInfo,
    };
  });

  const selectedOpdWithPaKpa = selectedOpd
    ? opdsWithPaKpa.find((o) => o.id === selectedOpd.id) || null
    : null;

  const pejabatInfo: PejabatDaerahInfo = {
    namaDaerah: "KABUPATEN TAPANULI SELATAN",
    ibuKota: "Sipirok",
    bupatiNama: "DOLLY PASARIBU",
    bupatiJabatan: "BUPATI TAPANULI SELATAN",
    sekdaNama: "SOFYAN ADIL, S.Sos, M.A.P",
    sekdaPangkat: "PEMBINA UTAMA MADYA",
    sekdaNip: "19730509 199303 1 002",
    kepalaBpkpadNama: budInfo.nama,
    kepalaBpkpadPangkat: budInfo.pangkat || "PEMBINA UTAMA MUDA",
    kepalaBpkpadNip: budInfo.nip,
    nomorPerda: `2 TAHUN ${tahun === 2025 ? 2024 : tahun}`,
    tanggalPerda: `31 Desember ${tahun === 2025 ? 2024 : tahun - 1}`,
    nomorPerbup: `29 TAHUN ${tahun === 2025 ? 2024 : tahun}`,
    tanggalPerbup: `31 Desember ${tahun === 2025 ? 2024 : tahun - 1}`,
  };

  return {
    tahun,
    opds: opdsWithPaKpa,
    selectedOpd: selectedOpdWithPaKpa,
    budInfo,
    pejabatInfo,
    drkaRows: drkaRows.map((r) => ({
      ...r,
      nilai: Number(r.nilai) || 0,
      nilai_ubah:
        r.nilai_ubah !== null && r.nilai_ubah !== undefined
          ? Number(r.nilai_ubah)
          : Number(r.nilai) || 0,
    })),
    dpoRows: dpoRows.map((d) => ({
      ...d,
      volume: Number(d.volume) || 0,
      volume_ubah:
        d.volume_ubah !== null && d.volume_ubah !== undefined
          ? Number(d.volume_ubah)
          : Number(d.volume) || 0,
      harga: Number(d.harga) || 0,
      harga_ubah:
        d.harga_ubah !== null && d.harga_ubah !== undefined
          ? Number(d.harga_ubah)
          : Number(d.harga) || 0,
      total: Number(d.total) || 0,
      total_ubah:
        d.total_ubah !== null && d.total_ubah !== undefined
          ? Number(d.total_ubah)
          : Number(d.total) || 0,
    })),
    trskpdRows: trskpdRows.map((t) => ({
      ...t,
      totalAnggaran: Number(t.totalAnggaran) || 0,
      totalAnggaran_ubah:
        t.totalAnggaran_ubah !== null && t.totalAnggaran_ubah !== undefined
          ? Number(t.totalAnggaran_ubah)
          : Number(t.totalAnggaran) || 0,
    })),
    urusanList,
  };
}

