import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { getPetugasPenandatanganByOpd } from "./spp.service";

export interface SpmPotonganPayload {
  id?: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  id_billing?: string | null;
  keterangan?: string | null;
}

export interface SaveSpmPayload {
  id?: string;
  tahunAnggaran: number;
  no_spm: string;
  tgl_spm: string;
  no_spp: string;
  tgl_spp?: string | null;
  sppId?: string | null;
  opdId: string;
  unitKerjaId?: string | null;
  jenis_spm: string; // UP, GU, TU, LS_GAJI, LS_BARANG_JASA, UP_KKPD, GU_KKPD
  bulan?: number | null;
  keperluan: string;
  nilai: number;
  no_spd?: string | null;
  tgl_spd?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  kasubagNama?: string | null;
  kasubagNip?: string | null;
  kasubagJabatan?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  status?: string;
  keterangan?: string | null;
  potongan: SpmPotonganPayload[];
}

export async function getSpmScopeData(session: SessionPayload) {
  const isSuperadmin =
    session.roleKode === "0" || session.roleKode === "SUPERADMIN";

  const isCrossOpd = isSuperadmin || session.isCrossOpd;

  const opds = await prisma.opd.findMany({
    where: {
      isActive: true,
      ...(isCrossOpd ? {} : { id: session.opdId || undefined }),
    },
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
        orderBy: { kd_unit: "asc" },
      },
    },
    orderBy: { kd_skpd: "asc" },
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

export async function getSpmList(params: {
  tahunAnggaran: number;
  kd_skpd?: string;
  kd_unit?: string;
  jenis_spm?: string;
  q?: string;
  status?: string;
}) {
  const { tahunAnggaran, kd_skpd, kd_unit, jenis_spm, q, status } = params;

  const where: any = {
    tahunAnggaran,
  };

  if (kd_skpd) where.kd_skpd = kd_skpd;
  if (kd_unit) where.kd_unit = kd_unit;
  if (jenis_spm && jenis_spm !== "ALL") {
    const variants = [
      jenis_spm,
      jenis_spm.replace(/_/g, "-"),
      jenis_spm.replace(/-/g, "_"),
    ];
    where.jenis_spm = { in: Array.from(new Set(variants)) };
  }
  if (status && status !== "ALL") where.status = status;

  if (q && q.trim()) {
    const query = q.trim();
    where.OR = [
      { no_spm: { contains: query, mode: "insensitive" } },
      { no_spp: { contains: query, mode: "insensitive" } },
      { keperluan: { contains: query, mode: "insensitive" } },
      { nama_penerima: { contains: query, mode: "insensitive" } },
      { no_spd: { contains: query, mode: "insensitive" } },
    ];
  }

  const rawList = await prisma.trhspm.findMany({
    where,
    include: {
      spp: {
        select: {
          id: true,
          no_spp: true,
          tgl_spp: true,
          nilai: true,
          _count: {
            select: { rincian: true },
          },
        },
      },
      _count: {
        select: { potongan: true },
      },
      sp2dList: {
        where: { status: { notIn: ["BATAL", "DITOLAK"] } },
        select: { id: true, no_sp2d: true, tgl_sp2d: true, status: true },
      },
    },
    orderBy: [{ tgl_spm: "desc" }, { createdAt: "desc" }],
  });

  let totalNilaiBruto = 0;
  let totalPotongan = 0;
  let totalNilaiBersih = 0;

  const items = rawList.map((r) => {
    const valBruto = Number(r.nilai) || 0;
    const valPot = Number(r.nilai_potongan) || 0;
    const valBersih = Number(r.nilai_bersih) || Math.max(0, valBruto - valPot);

    totalNilaiBruto += valBruto;
    totalPotongan += valPot;
    totalNilaiBersih += valBersih;

    const activeSp2d = r.sp2dList?.[0];
    const isLockedBySp2d = r.status === "TELAH DIBUAT SP2D" || Boolean(activeSp2d);

    return {
      id: r.id,
      tahunAnggaran: r.tahunAnggaran,
      no_spm: r.no_spm,
      tgl_spm: r.tgl_spm.toISOString().split("T")[0],
      no_spp: r.no_spp,
      tgl_spp: r.tgl_spp ? r.tgl_spp.toISOString().split("T")[0] : null,
      sppId: r.sppId,
      kd_skpd: r.kd_skpd,
      nm_skpd: r.nm_skpd,
      kd_unit: r.kd_unit,
      nm_unit: r.nm_unit,
      opdId: r.opdId,
      unitKerjaId: r.unitKerjaId,
      jenis_spm: r.jenis_spm,
      bulan: r.bulan,
      keperluan: r.keperluan,
      nilai: valBruto,
      nilai_potongan: valPot,
      nilai_bersih: valBersih,
      no_spd: r.no_spd,
      tgl_spd: r.tgl_spd ? r.tgl_spd.toISOString().split("T")[0] : null,
      nama_penerima: r.nama_penerima,
      bank_penerima: r.bank_penerima,
      rek_penerima: r.rek_penerima,
      npwp_penerima: r.npwp_penerima,
      bendaharaNama: r.bendaharaNama,
      bendaharaNip: r.bendaharaNip,
      kasubagNama: r.kasubagNama,
      kasubagNip: r.kasubagNip,
      kasubagJabatan: r.kasubagJabatan,
      pptkNama: r.pptkNama,
      pptkNip: r.pptkNip,
      paKpaNama: r.paKpaNama,
      paKpaNip: r.paKpaNip,
      status: isLockedBySp2d ? "TELAH DIBUAT SP2D" : r.status,
      keterangan: r.keterangan,
      rekeningCount: r.spp?._count.rincian || 0,
      potonganCount: r._count.potongan || 0,
      isUsedBySp2d: isLockedBySp2d,
      usedSp2dNo: activeSp2d?.no_sp2d || null,
      usedSp2dDate: activeSp2d?.tgl_sp2d
        ? activeSp2d.tgl_sp2d.toISOString().split("T")[0]
        : null,
      usedSp2dStatus: activeSp2d?.status || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });

  return {
    totalItems: items.length,
    totalNilaiBruto,
    totalPotongan,
    totalNilaiBersih,
    items,
  };
}

export async function getSpmDetail(id: string) {
  const spm = await prisma.trhspm.findUnique({
    where: { id },
    include: {
      opd: {
        select: {
          id: true,
          kd_skpd: true,
          nm_skpd: true,
          kd_urusan: true,
          nm_urusan: true,
          kepalaNama: true,
          kepalaNip: true,
          kepalaJabatan: true,
        },
      },
      spp: {
        include: {
          rincian: {
            orderBy: [
              { kd_sub_kegiatan: "asc" },
              { kd_rek6: "asc" },
            ],
          },
        },
      },
      potongan: {
        orderBy: [{ kd_rek6: "asc" }],
      },
      sp2dList: {
        where: { status: { notIn: ["BATAL", "DITOLAK"] } },
        select: { id: true, no_sp2d: true, tgl_sp2d: true, status: true },
      },
    },
  });

  if (!spm) return null;

  // Kasubag Keuangan OPD: utamakan kasubagNama, jika kosong cari user dengan Role Kasubag Keuangan (Role 12) di OPD terkait
  let kasubagNama = spm.kasubagNama || null;
  let kasubagNip = spm.kasubagNip || null;
  let kasubagJabatan = spm.kasubagJabatan || null;

  if (!kasubagNama && spm.opdId) {
    try {
      const kasubagUser = await prisma.user.findFirst({
        where: {
          opdId: spm.opdId,
          isActive: true,
          OR: [
            { role: { kode: "12" } },
            { role: { nama: { contains: "kasubag keuangan", mode: "insensitive" } } },
            { role: { nama: { contains: "keuangan", mode: "insensitive" } } },
          ],
        },
        include: { role: true },
        orderBy: { namaLengkap: "asc" },
      });
      if (kasubagUser) {
        kasubagNama = kasubagUser.namaLengkap;
        kasubagNip = kasubagUser.nip || "";
        kasubagJabatan = kasubagUser.jabatan || kasubagUser.role.nama || "Kasubag Keuangan";
      }
    } catch (e) {
      console.error("Gagal cari kasubag default SPM:", e);
    }
  }

  if (!kasubagNama) {
    kasubagNama = spm.pptkNama || null;
    kasubagNip = spm.pptkNip || null;
  }
  if (!kasubagJabatan) {
    kasubagJabatan = "Kasubag Keuangan";
  }

  const valBruto = Number(spm.nilai) || 0;
  const valPot = Number(spm.nilai_potongan) || 0;
  const valBersih = Number(spm.nilai_bersih) || Math.max(0, valBruto - valPot);

  // Rincian belanja diambil dari tabel trdspp yang terhubung melalui SPP
  const rincianBelanja = (spm.spp?.rincian || []).map((d) => ({
    ...d,
    nilai: Number(d.nilai) || 0,
  }));

  const potonganList = (spm.potongan || []).map((p) => ({
    ...p,
    nilai: Number(p.nilai) || 0,
  }));

  const activeSp2d = spm.sp2dList?.[0];
  const isLockedBySp2d = spm.status === "TELAH DIBUAT SP2D" || Boolean(activeSp2d);

  return {
    ...spm,
    tgl_spm: spm.tgl_spm.toISOString().split("T")[0],
    tgl_spp: spm.tgl_spp ? spm.tgl_spp.toISOString().split("T")[0] : null,
    tgl_spd: spm.tgl_spd ? spm.tgl_spd.toISOString().split("T")[0] : null,
    nilai: valBruto,
    nilai_potongan: valPot,
    nilai_bersih: valBersih,
    kasubagNama,
    kasubagNip,
    kasubagJabatan,
    status: isLockedBySp2d ? "TELAH DIBUAT SP2D" : spm.status,
    isUsedBySp2d: isLockedBySp2d,
    usedSp2dNo: activeSp2d?.no_sp2d || null,
    usedSp2dDate: activeSp2d?.tgl_sp2d
      ? activeSp2d.tgl_sp2d.toISOString().split("T")[0]
      : null,
    usedSp2dStatus: activeSp2d?.status || null,
    rincian: rincianBelanja,
    potongan: potonganList,
  };
}

export async function getNextSpmSequence(params: {
  tahunAnggaran: number;
  kd_skpd: string;
}) {
  const { tahunAnggaran, kd_skpd } = params;

  const spmList = await prisma.trhspm.findMany({
    where: {
      tahunAnggaran,
      kd_skpd,
    },
    select: { no_spm: true },
  });

  let maxSeq = 0;
  for (const item of spmList) {
    const parts = item.no_spm.split("/");
    if (parts.length >= 2 && parts[0] === "900") {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  return maxSeq + 1;
}

/**
 * Mengambil daftar SPP yang siap ditarik ke SPM
 * Menampilkan SPP sesuai jenis_spm pada OPD/Unit terkait
 */
export async function getSppTerbitForSpm(params: {
  tahunAnggaran: number;
  kd_skpd: string;
  kd_unit?: string;
  jenis_spm?: string;
  excludeSpmId?: string;
}) {
  const { tahunAnggaran, kd_skpd, kd_unit, jenis_spm, excludeSpmId } = params;

  // 1. Kumpulkan seluruh no_spp dan sppId yang telah digunakan oleh SPM lain
  const activeSpmWhere: any = {
    tahunAnggaran,
    kd_skpd,
  };
  if (excludeSpmId) {
    activeSpmWhere.id = { not: excludeSpmId };
  }

  const existingSpms = await prisma.trhspm.findMany({
    where: activeSpmWhere,
    select: { no_spp: true, sppId: true },
  });

  const usedSppNos = existingSpms
    .map((s) => s.no_spp?.trim())
    .filter((n): n is string => Boolean(n));
  const usedSppIds = existingSpms
    .map((s) => s.sppId)
    .filter((id): id is string => Boolean(id));

  const where: any = {
    tahunAnggaran,
    kd_skpd,
  };

  if (kd_unit) {
    where.kd_unit = kd_unit;
  }

  if (jenis_spm && jenis_spm !== "ALL") {
    const variants = [
      jenis_spm,
      jenis_spm.replace(/_/g, "-"),
      jenis_spm.replace(/-/g, "_"),
    ];
    where.jenis_spp = { in: Array.from(new Set(variants)) };
  }

  // 2. Filter agar SPP yang telah diterbitkan SPM lain TIDAK MUNCUL
  if (!excludeSpmId) {
    // Mode Pembuatan SPM Baru:
    // Hanya ambil SPP yang belum pernah dibuat SPM dan statusnya siap diajukan (bukan DRAFT, bukan TELAH DIBUAT SPM, bukan BATAL/DITOLAK)
    where.status = {
      notIn: ["TELAH DIBUAT SPM", "DRAFT", "BATAL", "DITOLAK"],
    };
    where.spmList = { none: {} };
    if (usedSppNos.length > 0) {
      where.no_spp = { notIn: usedSppNos };
    }
    if (usedSppIds.length > 0) {
      where.id = { notIn: usedSppIds };
    }
  } else {
    // Mode Edit SPM:
    // Boleh tampil jika SPP tersebut adalah milik SPM ini sendiri, ATAU SPP belum dipakai oleh SPM manapun
    where.spmList = { none: { id: { not: excludeSpmId } } };
    if (usedSppNos.length > 0) {
      where.no_spp = { notIn: usedSppNos };
    }
    if (usedSppIds.length > 0) {
      where.id = { notIn: usedSppIds };
    }
    where.OR = [
      {
        status: { notIn: ["TELAH DIBUAT SPM", "DRAFT", "BATAL", "DITOLAK"] },
        spmList: { none: {} },
      },
      {
        spmList: { some: { id: excludeSpmId } },
      },
    ];
  }

  const sppList = await prisma.trhspp.findMany({
    where,
    include: {
      rincian: {
        orderBy: [{ kd_sub_kegiatan: "asc" }, { kd_rek6: "asc" }],
      },
      spmList: {
        where: excludeSpmId ? { id: { not: excludeSpmId } } : {},
        select: {
          id: true,
          no_spm: true,
          tgl_spm: true,
          status: true,
        },
      },
    },
    orderBy: [{ tgl_spp: "desc" }, { createdAt: "desc" }],
  });

  return sppList.map((s) => ({
    id: s.id,
    no_spp: s.no_spp,
    tgl_spp: s.tgl_spp.toISOString().split("T")[0],
    jenis_spp: s.jenis_spp,
    nilai: Number(s.nilai) || 0,
    keperluan: s.keperluan,
    no_spd: s.no_spd,
    tgl_spd: s.tgl_spd ? s.tgl_spd.toISOString().split("T")[0] : null,
    nama_penerima: s.nama_penerima,
    bank_penerima: s.bank_penerima,
    rek_penerima: s.rek_penerima,
    npwp_penerima: s.npwp_penerima,
    bendaharaNama: s.bendaharaNama,
    bendaharaNip: s.bendaharaNip,
    kasubagNama: s.kasubagNama,
    kasubagNip: s.kasubagNip,
    kasubagJabatan: s.kasubagJabatan,
    pptkNama: s.pptkNama,
    pptkNip: s.pptkNip,
    paKpaNama: s.paKpaNama,
    paKpaNip: s.paKpaNip,
    status: s.status,
    isUsedBySpm: s.spmList.length > 0,
    usedSpmNo: s.spmList[0]?.no_spm || null,
    rincian: s.rincian.map((r) => ({
      ...r,
      nilai: Number(r.nilai) || 0,
    })),
  }));
}

/**
 * Daftar Referensi Kode Akun Potongan Pajak & Potongan Lainnya
 */
export function getRekeningPotonganRef() {
  return [
    {
      kd_rek6: "2.1.01.05.01.0001",
      nm_rek6: "Utang Pajak Penghasilan (PPh 21)",
      kategori: "Pajak Pusat",
    },
    {
      kd_rek6: "2.1.01.05.02.0001",
      nm_rek6: "Utang Pajak Penghasilan (PPh 22)",
      kategori: "Pajak Pusat",
    },
    {
      kd_rek6: "2.1.01.05.03.0001",
      nm_rek6: "Utang Pajak Penghasilan (PPh 23)",
      kategori: "Pajak Pusat",
    },
    {
      kd_rek6: "2.1.01.05.04.0001",
      nm_rek6: "Utang Pajak Penghasilan (PPh Final)",
      kategori: "Pajak Pusat",
    },
    {
      kd_rek6: "2.1.01.06.01.0001",
      nm_rek6: "Utang Pajak Pertambahan Nilai (PPN)",
      kategori: "Pajak Pusat",
    },
    {
      kd_rek6: "2.1.01.07.01.0001",
      nm_rek6: "Iuran Wajib Pegawai (IWP 1%)",
      kategori: "Iuran Pegawai",
    },
    {
      kd_rek6: "2.1.01.07.02.0001",
      nm_rek6: "Iuran Wajib Pegawai (IWP 8%)",
      kategori: "Iuran Pegawai",
    },
    {
      kd_rek6: "2.1.01.08.01.0001",
      nm_rek6: "Tabungan Perumahan Rakyat (Taperum)",
      kategori: "Iuran Pegawai",
    },
    {
      kd_rek6: "2.1.01.09.01.0001",
      nm_rek6: "BPJS Kesehatan",
      kategori: "Jaminan Sosial",
    },
    {
      kd_rek6: "2.1.01.09.02.0001",
      nm_rek6: "BPJS Ketenagakerjaan",
      kategori: "Jaminan Sosial",
    },
    {
      kd_rek6: "2.1.01.99.99.9999",
      nm_rek6: "Potongan Lainnya / Pengembalian",
      kategori: "Lainnya",
    },
  ];
}

/**
 * Validasi Ketersediaan ID Billing (Cek apakah ID Billing pernah digunakan pada SPM lain)
 */
export async function checkIdBillingAvailability(
  idBilling: string,
  excludeSpmId?: string
) {
  const trimmed = idBilling.trim();
  if (!trimmed) {
    return { isUsed: false };
  }

  const existing = await prisma.trspmpot.findFirst({
    where: {
      id_billing: { equals: trimmed, mode: "insensitive" },
      ...(excludeSpmId ? { spmId: { not: excludeSpmId } } : {}),
    },
    include: {
      spm: {
        select: {
          id: true,
          no_spm: true,
          tgl_spm: true,
          nm_skpd: true,
          status: true,
        },
      },
    },
  });

  if (existing) {
    const tglFormatted = existing.spm.tgl_spm
      ? existing.spm.tgl_spm.toISOString().split("T")[0]
      : "-";
    return {
      isUsed: true,
      existing: {
        idBilling: existing.id_billing,
        noSpm: existing.spm.no_spm,
        tglSpm: tglFormatted,
        nmSkpd: existing.spm.nm_skpd,
        status: existing.spm.status,
      },
      message: `ID Billing "${existing.id_billing}" sudah pernah digunakan pada Dokumen SPM ${existing.spm.no_spm} (${existing.spm.nm_skpd}) tanggal ${tglFormatted}. Setiap ID Billing pajak hanya boleh digunakan satu kali.`,
    };
  }

  return { isUsed: false };
}

export async function saveSpm(data: SaveSpmPayload, userNama?: string) {
  const {
    id,
    tahunAnggaran,
    no_spm,
    tgl_spm,
    no_spp,
    tgl_spp,
    sppId,
    opdId,
    unitKerjaId,
    jenis_spm,
    bulan,
    keperluan,
    nilai,
    no_spd,
    tgl_spd,
    nama_penerima,
    bank_penerima,
    rek_penerima,
    npwp_penerima,
    bendaharaNama,
    bendaharaNip,
    kasubagNama,
    kasubagNip,
    kasubagJabatan,
    pptkNama,
    pptkNip,
    paKpaNama,
    paKpaNip,
    status = "DRAFT",
    keterangan,
    potongan = [],
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

  // Cek jika dokumen sedang diedit namun sudah terkunci oleh SP2D
  if (id) {
    const existing = await prisma.trhspm.findUnique({
      where: { id },
      include: {
        sp2dList: {
          where: { status: { notIn: ["BATAL", "DITOLAK"] } },
          select: { id: true, no_sp2d: true },
        },
      },
    });

    if (existing) {
      if (
        existing.status === "TELAH DIBUAT SP2D" ||
        existing.sp2dList.length > 0
      ) {
        const noSp2d = existing.sp2dList[0]?.no_sp2d || "";
        throw new Error(
          `Dokumen SPM ini telah diterbitkan SP2D ${noSp2d ? `(${noSp2d}) ` : ""}dan terkunci sehingga tidak dapat diubah.`
        );
      }
    }
  }

  // Cek duplikasi nomor SPM pada tahun yang sama
  const existingNo = await prisma.trhspm.findFirst({
    where: {
      tahunAnggaran,
      no_spm,
      ...(id ? { id: { not: id } } : {}),
    },
  });
  if (existingNo) {
    throw new Error(`Nomor SPM "${no_spm}" sudah terdaftar pada Tahun Anggaran ${tahunAnggaran}.`);
  }

  // Hitung total potongan dan nilai bersih
  const totalPotongan = (potongan || []).reduce(
    (acc, p) => acc + (Number(p.nilai) || 0),
    0
  );
  const totalNilaiBruto = Number(nilai) || 0;
  const nilaiBersih = Math.max(0, totalNilaiBruto - totalPotongan);

  // Validasi ID Billing unik: tidak boleh ganda di form & tidak boleh duplikat dengan database
  if (potongan && potongan.length > 0) {
    const billingMap = new Map<string, number>();
    for (let i = 0; i < potongan.length; i++) {
      const raw = potongan[i].id_billing?.trim();
      if (raw) {
        const key = raw.toUpperCase();
        if (billingMap.has(key)) {
          const firstIndex = billingMap.get(key)!;
          throw new Error(
            `ID Billing "${raw}" dimasukkan ganda pada form potongan (baris ke-${firstIndex + 1} dan baris ke-${i + 1}). Setiap potongan harus memiliki ID Billing yang berbeda.`
          );
        }
        billingMap.set(key, i);
      }
    }

    const billingValues = Array.from(billingMap.keys());
    if (billingValues.length > 0) {
      const duplicateInDb = await prisma.trspmpot.findFirst({
        where: {
          id_billing: { in: billingValues, mode: "insensitive" },
          ...(id ? { spmId: { not: id } } : {}),
        },
        include: {
          spm: {
            select: {
              no_spm: true,
              nm_skpd: true,
              tgl_spm: true,
            },
          },
        },
      });

      if (duplicateInDb) {
        const tglStr = duplicateInDb.spm.tgl_spm
          ? duplicateInDb.spm.tgl_spm.toISOString().split("T")[0]
          : "-";
        throw new Error(
          `ID Billing "${duplicateInDb.id_billing}" sudah pernah digunakan pada Dokumen SPM ${duplicateInDb.spm.no_spm} (${duplicateInDb.spm.nm_skpd}) tanggal ${tglStr}. ID Billing tidak boleh digunakan kembali.`
        );
      }
    }
  }

  const parsedTglSpm = new Date(tgl_spm);
  const parsedTglSpp = tgl_spp ? new Date(tgl_spp) : null;
  const parsedTglSpd = tgl_spd ? new Date(tgl_spd) : null;

  return await prisma.$transaction(async (tx) => {
    let header;

    if (id) {
      // Update Header
      header = await tx.trhspm.update({
        where: { id },
        data: {
          no_spm,
          tgl_spm: parsedTglSpm,
          no_spp,
          tgl_spp: parsedTglSpp,
          sppId: sppId || null,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_spm,
          bulan: bulan || null,
          keperluan,
          nilai: totalNilaiBruto,
          nilai_potongan: totalPotongan,
          nilai_bersih: nilaiBersih,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          bendaharaNama: bendaharaNama || null,
          bendaharaNip: bendaharaNip || null,
          kasubagNama: kasubagNama || pptkNama || null,
          kasubagNip: kasubagNip || pptkNip || null,
          kasubagJabatan: kasubagJabatan || null,
          pptkNama: pptkNama || kasubagNama || null,
          pptkNip: pptkNip || kasubagNip || null,
          paKpaNama: paKpaNama || null,
          paKpaNip: paKpaNip || null,
          status,
          keterangan: keterangan || null,
        },
      });

      // Hapus potongan lama
      await tx.trspmpot.deleteMany({
        where: { spmId: id },
      });
    } else {
      // Create Header
      header = await tx.trhspm.create({
        data: {
          tahunAnggaran,
          no_spm,
          tgl_spm: parsedTglSpm,
          no_spp,
          tgl_spp: parsedTglSpp,
          sppId: sppId || null,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          opdId,
          kd_unit: unitInfo.kd_unit,
          nm_unit: unitInfo.nm_unit,
          unitKerjaId: unitKerjaId || null,
          jenis_spm,
          bulan: bulan || null,
          keperluan,
          nilai: totalNilaiBruto,
          nilai_potongan: totalPotongan,
          nilai_bersih: nilaiBersih,
          no_spd: no_spd || null,
          tgl_spd: parsedTglSpd,
          nama_penerima: nama_penerima || null,
          bank_penerima: bank_penerima || null,
          rek_penerima: rek_penerima || null,
          npwp_penerima: npwp_penerima || null,
          bendaharaNama: bendaharaNama || null,
          bendaharaNip: bendaharaNip || null,
          kasubagNama: kasubagNama || pptkNama || null,
          kasubagNip: kasubagNip || pptkNip || null,
          kasubagJabatan: kasubagJabatan || null,
          pptkNama: pptkNama || kasubagNama || null,
          pptkNip: pptkNip || kasubagNip || null,
          paKpaNama: paKpaNama || null,
          paKpaNip: paKpaNip || null,
          status,
          keterangan: keterangan || null,
        },
      });
    }

    // Insert potongan trspmpot
    if (potongan && potongan.length > 0) {
      await tx.trspmpot.createMany({
        data: potongan.map((p) => ({
          spmId: header.id,
          tahunAnggaran,
          kd_skpd: opd.kd_skpd,
          kd_rek6: p.kd_rek6,
          nm_rek6: p.nm_rek6,
          nilai: Number(p.nilai) || 0,
          id_billing: p.id_billing || null,
          keterangan: p.keterangan || null,
        })),
      });
    }

    // Update status SPP menjadi "TELAH DIBUAT SPM" dan kunci dokumen
    let targetSppId = sppId;
    if (!targetSppId && no_spp) {
      const foundSpp = await tx.trhspp.findFirst({
        where: { tahunAnggaran, no_spp },
        select: { id: true },
      });
      targetSppId = foundSpp?.id || null;
    }

    if (targetSppId) {
      await tx.trhspp.update({
        where: { id: targetSppId },
        data: { status: "TELAH DIBUAT SPM" },
      });
    }

    // Jika edit SPM dan mengganti SPP asal, lepas kunci SPP lama jika tidak digunakan lagi
    if (id) {
      const oldSpm = await tx.trhspm.findUnique({
        where: { id },
        select: { sppId: true },
      });
      if (oldSpm?.sppId && oldSpm.sppId !== targetSppId) {
        const remainingCount = await tx.trhspm.count({
          where: { sppId: oldSpm.sppId, id: { not: id } },
        });
        if (remainingCount === 0) {
          await tx.trhspp.update({
            where: { id: oldSpm.sppId },
            data: { status: "DIAJUKAN" },
          });
        }
      }
    }

    return header;
  });
}

export async function deleteSpm(id: string) {
  const existing = await prisma.trhspm.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      sppId: true,
      no_spp: true,
      tahunAnggaran: true,
    },
  });

  if (!existing) {
    throw new Error("Dokumen SPM tidak ditemukan");
  }

  if (
    existing.status === "DIVERIFIKASI" ||
    existing.status === "DISETUJUI" ||
    existing.status === "TELAH DIBUAT SP2D"
  ) {
    throw new Error(
      existing.status === "TELAH DIBUAT SP2D"
        ? "Dokumen SPM yang telah diterbitkan SP2D terkunci dan tidak dapat dihapus."
        : "Dokumen SPM yang telah diverifikasi atau disetujui tidak dapat dihapus."
    );
  }

  const checkSp2d = await prisma.trhsp2d.findFirst({
    where: { spmId: id, status: { notIn: ["BATAL", "DITOLAK"] } },
  });
  if (checkSp2d) {
    throw new Error(
      `Dokumen SPM terkunci karena telah diterbitkan SP2D (${checkSp2d.no_sp2d}).`
    );
  }

  return await prisma.$transaction(async (tx) => {
    const res = await tx.trhspm.delete({
      where: { id },
    });

    // Revert status SPP kembali ke "DIAJUKAN" jika tidak ada SPM lain yang mengikatnya
    let targetSppId = existing.sppId;
    if (!targetSppId && existing.no_spp) {
      const foundSpp = await tx.trhspp.findFirst({
        where: {
          tahunAnggaran: existing.tahunAnggaran,
          no_spp: existing.no_spp,
        },
        select: { id: true },
      });
      targetSppId = foundSpp?.id || null;
    }

    if (targetSppId) {
      const remainingCount = await tx.trhspm.count({
        where: { sppId: targetSppId },
      });
      if (remainingCount === 0) {
        await tx.trhspp.update({
          where: { id: targetSppId },
          data: { status: "DIAJUKAN" },
        });
      }
    }

    return res;
  });
}

/**
 * Mengambil data Buku Register SPM dengan format kolom terpisah per jenis SPM (UP, GU, TU, LS Gaji, LS Barjas, PPKD)
 */
export async function getRegisterSpmData(params: {
  tahunAnggaran: number;
  opdId?: string | null;
  jenisSpm?: string | null;
  tglMulai?: string | null;
  tglSelesai?: string | null;
  status?: string | null;
  search?: string | null;
}) {
  const {
    tahunAnggaran,
    opdId,
    jenisSpm,
    tglMulai,
    tglSelesai,
    status,
    search,
  } = params;

  const where: any = {
    tahunAnggaran,
  };

  if (opdId && opdId !== "ALL") {
    where.opdId = opdId;
  }

  if (jenisSpm && jenisSpm !== "ALL") {
    const variants = [
      jenisSpm,
      jenisSpm.replace(/_/g, "-"),
      jenisSpm.replace(/-/g, "_"),
    ];
    where.jenis_spm = { in: Array.from(new Set(variants)) };
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (tglMulai && tglSelesai) {
    where.tgl_spm = {
      gte: new Date(tglMulai),
      lte: new Date(tglSelesai),
    };
  } else if (tglMulai) {
    where.tgl_spm = {
      gte: new Date(tglMulai),
    };
  } else if (tglSelesai) {
    where.tgl_spm = {
      lte: new Date(tglSelesai),
    };
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { no_spm: { contains: q, mode: "insensitive" } },
      { no_spp: { contains: q, mode: "insensitive" } },
      { keperluan: { contains: q, mode: "insensitive" } },
      { nm_skpd: { contains: q, mode: "insensitive" } },
      { nama_penerima: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.trhspm.findMany({
    where,
    orderBy: [{ tgl_spm: "asc" }, { no_spm: "asc" }],
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
  });

  let totalUp = 0;
  let totalGu = 0;
  let totalTu = 0;
  let totalLsGaji = 0;
  let totalLsBarjas = 0;
  let totalPpkd = 0;
  let grandTotal = 0;

  const items = rows.map((r, idx) => {
    const val = Number(r.nilai) || 0;
    const jns = (r.jenis_spm || "").toUpperCase().replace(/-/g, "_");

    let isUp = false;
    let isGu = false;
    let isTu = false;
    let isLsGaji = false;
    let isLsBarjas = false;
    let isPpkd = false;

    if (jns === "UP" || jns === "UP_KKPD") {
      isUp = true;
      totalUp += val;
    } else if (jns === "GU" || jns === "GU_KKPD") {
      isGu = true;
      totalGu += val;
    } else if (jns === "TU") {
      isTu = true;
      totalTu += val;
    } else if (jns === "LS_GAJI" || jns.includes("GAJI")) {
      isLsGaji = true;
      totalLsGaji += val;
    } else if (jns === "PPKD") {
      isPpkd = true;
      totalPpkd += val;
    } else {
      // Default ke LS Barang & Jasa
      isLsBarjas = true;
      totalLsBarjas += val;
    }

    grandTotal += val;

    const d = new Date(r.tgl_spm);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const tglDisplay = `${day}-${month}-${year}`;

    return {
      noUrut: idx + 1,
      id: r.id,
      tgl_spm: r.tgl_spm.toISOString().split("T")[0],
      tglDisplay,
      no_spm: r.no_spm,
      no_spp: r.no_spp,
      tgl_spp: r.tgl_spp ? r.tgl_spp.toISOString().split("T")[0] : null,
      jenis_spm: r.jenis_spm,
      keperluan: r.keperluan,
      nilai: val,
      nilai_potongan: Number(r.nilai_potongan) || 0,
      nilai_bersih: Number(r.nilai_bersih) || val,
      // Kolom Nomor SPM
      no_spm_up: isUp ? r.no_spm : "",
      no_spm_gu: isGu ? r.no_spm : "",
      no_spm_tu: isTu ? r.no_spm : "",
      no_spm_ls_gaji: isLsGaji ? r.no_spm : "",
      no_spm_ls_barjas: isLsBarjas ? r.no_spm : "",
      no_spm_ppkd: isPpkd ? r.no_spm : "",
      // Kolom Nilai Rupiah
      nilai_up: isUp ? val : 0,
      nilai_gu: isGu ? val : 0,
      nilai_tu: isTu ? val : 0,
      nilai_ls_gaji: isLsGaji ? val : 0,
      nilai_ls_barjas: isLsBarjas ? val : 0,
      nilai_ppkd: isPpkd ? val : 0,
      // Instansi & Penerima
      kd_skpd: r.kd_skpd,
      nm_skpd: r.nm_skpd,
      kd_unit: r.kd_unit,
      nm_unit: r.nm_unit,
      nama_penerima: r.nama_penerima,
      bank_penerima: r.bank_penerima,
      rek_penerima: r.rek_penerima,
      bendaharaNama: r.bendaharaNama,
      paKpaNama: r.paKpaNama || r.opd?.kepalaNama || "",
      paKpaNip: r.paKpaNip || r.opd?.kepalaNip || "",
      paKpaJabatan: r.opd?.kepalaJabatan || "Kepala SKPD",
      status: r.status,
    };
  });

  return {
    tahunAnggaran,
    totalItems: items.length,
    totals: {
      totalUp,
      totalGu,
      totalTu,
      totalLsGaji,
      totalLsBarjas,
      totalPpkd,
      grandTotal,
    },
    items,
  };
}

