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
      status: r.status,
      keterangan: r.keterangan,
      rekeningCount: r.spp?._count.rincian || 0,
      potonganCount: r._count.potongan || 0,
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

  if (existing.status === "DIVERIFIKASI" || existing.status === "DISETUJUI") {
    throw new Error(
      "Dokumen SPM yang telah diverifikasi atau disetujui tidak dapat dihapus"
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

