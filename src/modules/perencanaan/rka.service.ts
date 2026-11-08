import { prisma } from "@/lib/prisma";

export interface ListTrskpdParams {
  tahunAnggaran?: number;
  opdId?: string;
  unitKerjaId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OpdPlafondControlData {
  hasPlafond: boolean;
  paguMurni: number;
  paguUbah: number;
  totalRkaMurni: number;
  totalRkaUbah: number;
  sisaPaguMurni: number;
  sisaPaguUbah: number;
  persenMurni: number;
  persenUbah: number;
  isLockedMurni: boolean;
  isLockedUbah: boolean;
  kd_skpd?: string;
  nm_skpd?: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
}

export async function getOpdPlafondAndUsage(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
}): Promise<OpdPlafondControlData> {
  const { tahunAnggaran, opdId, unitKerjaId } = params;

  // 1. Ambil Plafond Anggaran
  let plafond = await prisma.plafondAnggaran.findFirst({
    where: {
      tahunAnggaran,
      opdId,
      unitKerjaId: unitKerjaId || null,
    },
  });

  // Jika unit dipilih namun tidak ada plafond unit, fallback ke plafond induk OPD
  if (!plafond && unitKerjaId) {
    plafond = await prisma.plafondAnggaran.findFirst({
      where: {
        tahunAnggaran,
        opdId,
        unitKerjaId: null,
      },
    });
  }

  // Jika di tingkat OPD dan belum ada record induk, cek akumulasi unit
  if (!plafond && !unitKerjaId) {
    const unitPlafonds = await prisma.plafondAnggaran.findMany({
      where: {
        tahunAnggaran,
        opdId,
      },
    });
    if (unitPlafonds.length > 0) {
      const sumM = unitPlafonds.reduce((acc, p) => acc + Number(p.paguMurni), 0);
      const sumU = unitPlafonds.reduce((acc, p) => acc + Number(p.paguUbah), 0);
      plafond = {
        id: "aggregated",
        tahunAnggaran,
        opdId,
        unitKerjaId: null,
        kd_skpd: unitPlafonds[0].kd_skpd,
        nm_skpd: unitPlafonds[0].nm_skpd,
        kd_unit: null,
        nm_unit: null,
        paguMurni: sumM as any,
        paguUbah: sumU as any,
        isLockedMurni: unitPlafonds.some((p) => p.isLockedMurni),
        isLockedUbah: unitPlafonds.some((p) => p.isLockedUbah),
        keterangan: "Akumulasi Plafond Unit",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  // 2. Hitung penggunaan anggaran dari seluruh Sub Kegiatan OPD/Unit ini
  // Plafond hanya mengikat pada belanja saja (akun diawali '5')
  const allSubkeg = await prisma.trskpd.findMany({
    where: {
      tahunAnggaran,
      opdId,
      ...(unitKerjaId ? { unitKerjaId } : {}),
    },
    include: {
      rkaRekening: {
        select: {
          kd_rek6: true,
          nilai: true,
          nilai_ubah: true,
        },
      },
    },
  });

  let totalRkaMurni = 0;
  let totalRkaUbah = 0;

  for (const s of allSubkeg) {
    for (const r of s.rkaRekening) {
      // Plafond HANYA mengikat pada belanja saja (akun diawali dengan '5')
      // Pendapatan ('4') dan Pembiayaan ('6') bebas tanpa ikatan plafond
      const isBelanja = r.kd_rek6 ? r.kd_rek6.trim().startsWith("5") : true;
      if (!isBelanja) continue;

      const valMurni = Number(r.nilai) || 0;
      const valUbah = r.nilai_ubah !== null && r.nilai_ubah !== undefined ? Number(r.nilai_ubah) : valMurni;
      totalRkaMurni += valMurni;
      totalRkaUbah += valUbah;
    }
  }

  const paguMurni = plafond ? Number(plafond.paguMurni) : 0;
  const paguUbah = plafond ? Number(plafond.paguUbah) : 0;

  const sisaPaguMurni = paguMurni - totalRkaMurni;
  const sisaPaguUbah = paguUbah - totalRkaUbah;

  return {
    hasPlafond: Boolean(plafond),
    paguMurni,
    paguUbah,
    totalRkaMurni,
    totalRkaUbah,
    sisaPaguMurni,
    sisaPaguUbah,
    persenMurni: paguMurni > 0 ? (totalRkaMurni / paguMurni) * 100 : 0,
    persenUbah: paguUbah > 0 ? (totalRkaUbah / paguUbah) * 100 : 0,
    isLockedMurni: Boolean(plafond?.isLockedMurni),
    isLockedUbah: Boolean(plafond?.isLockedUbah),
    kd_skpd: plafond?.kd_skpd,
    nm_skpd: plafond?.nm_skpd,
    kd_unit: plafond?.kd_unit,
    nm_unit: plafond?.nm_unit,
  };
}

export async function checkRkaLock(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  mode?: "MURNI" | "PERUBAHAN" | string;
}) {
  const isPerubahan = params.mode === "PERUBAHAN";
  // Cari plafond spesifik unit atau induk
  let plafond = await prisma.plafondAnggaran.findFirst({
    where: {
      tahunAnggaran: params.tahunAnggaran,
      opdId: params.opdId,
      unitKerjaId: params.unitKerjaId || null,
    },
  });

  if (!plafond && params.unitKerjaId) {
    plafond = await prisma.plafondAnggaran.findFirst({
      where: {
        tahunAnggaran: params.tahunAnggaran,
        opdId: params.opdId,
        unitKerjaId: null,
      },
    });
  }

  if (plafond) {
    if (isPerubahan && plafond.isLockedUbah) {
      throw new Error(
        `Input RKA Perubahan OPD [${plafond.kd_skpd}] TA ${params.tahunAnggaran} sedang DIKUNCI melalui menu Plafond Anggaran. Penambahan, pengubahan, atau penghapusan data tidak diperbolehkan.`
      );
    }
    if (!isPerubahan && plafond.isLockedMurni) {
      throw new Error(
        `Input RKA Penyusunan (Murni) OPD [${plafond.kd_skpd}] TA ${params.tahunAnggaran} sedang DIKUNCI melalui menu Plafond Anggaran. Penambahan, pengubahan, atau penghapusan data tidak diperbolehkan.`
      );
    }
  }
}

export async function listTrskpdPaginated(params: ListTrskpdParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(1000, Math.max(1, params.limit || 100));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.tahunAnggaran) where.tahunAnggaran = params.tahunAnggaran;
  if (params.opdId) where.opdId = params.opdId;
  if (params.unitKerjaId) where.unitKerjaId = params.unitKerjaId;
  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { kd_program: { contains: q, mode: "insensitive" } },
      { nm_program: { contains: q, mode: "insensitive" } },
      { kd_kegiatan: { contains: q, mode: "insensitive" } },
      { nm_kegiatan: { contains: q, mode: "insensitive" } },
      { kd_sub_kegiatan: { contains: q, mode: "insensitive" } },
      { nm_sub_kegiatan: { contains: q, mode: "insensitive" } },
      { pptkNama: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, data, aggregate] = await Promise.all([
    prisma.trskpd.count({ where }),
    prisma.trskpd.findMany({
      where,
      orderBy: [{ kd_program: "asc" }, { kd_kegiatan: "asc" }, { kd_sub_kegiatan: "asc" }],
      skip,
      take: limit,
      include: {
        pptk: { select: { id: true, namaLengkap: true, nip: true, username: true } },
        _count: { select: { rkaRekening: true } },
        rkaRekening: {
          select: {
            nilai: true,
            nilai_ubah: true,
          },
        },
      },
    }),
    prisma.trskpd.aggregate({
      where,
      _sum: { totalAnggaran: true },
    }),
  ]);

  const plafondControl = params.opdId
    ? await getOpdPlafondAndUsage({
        tahunAnggaran: params.tahunAnggaran || 2026,
        opdId: params.opdId,
        unitKerjaId: params.unitKerjaId,
      })
    : null;

  return {
    data: data.map((d) => {
      const totMurni = Number(d.totalAnggaran || 0);
      const totUbah = d.rkaRekening.reduce(
        (acc, r) => acc + Number(r.nilai_ubah !== null && r.nilai_ubah !== undefined ? r.nilai_ubah : r.nilai),
        0
      );
      return {
        ...d,
        totalAnggaran: totMurni,
        totalAnggaran_ubah: totUbah,
        rekeningCount: d._count.rkaRekening,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    totalNilaiRka: Number(aggregate._sum.totalAnggaran || 0),
    plafondControl,
  };
}

export async function getTrskpdDetail(id: string) {
  const item = await prisma.trskpd.findUnique({
    where: { id },
    include: {
      pptk: { select: { id: true, namaLengkap: true, nip: true, username: true } },
      rkaRekening: {
        orderBy: { kd_rek6: "asc" },
        include: {
          rincianObjek: {
            orderBy: [{ kd_barang: "asc" }, { uraian: "asc" }],
          },
        },
      },
    },
  });

  if (!item) return null;

  // Ambil Pagu Plafond OPD / Unit untuk perbandingan pagu vs RKA
  const plafondControl = await getOpdPlafondAndUsage({
    tahunAnggaran: item.tahunAnggaran,
    opdId: item.opdId,
    unitKerjaId: item.unitKerjaId,
  });

  const totalAnggaran_ubah = item.rkaRekening.reduce(
    (acc, rek) => acc + Number(rek.nilai_ubah !== null && rek.nilai_ubah !== undefined ? rek.nilai_ubah : rek.nilai),
    0
  );

  return {
    ...item,
    totalAnggaran: Number(item.totalAnggaran),
    totalAnggaran_ubah,
    plafond: plafondControl.hasPlafond
      ? {
          paguMurni: plafondControl.paguMurni,
          paguUbah: plafondControl.paguUbah,
        }
      : null,
    plafondControl,
    rkaRekening: item.rkaRekening.map((rek) => ({
      ...rek,
      nilai: Number(rek.nilai),
      nilai_ubah: Number(rek.nilai_ubah),
      rincianObjek: rek.rincianObjek.map((obj) => ({
        ...obj,
        volume: Number(obj.volume),
        volume_ubah: obj.volume_ubah !== null && obj.volume_ubah !== undefined ? Number(obj.volume_ubah) : Number(obj.volume),
        harga: Number(obj.harga),
        harga_ubah: obj.harga_ubah !== null && obj.harga_ubah !== undefined ? Number(obj.harga_ubah) : Number(obj.harga),
        total: Number(obj.total),
        total_ubah: obj.total_ubah !== null && obj.total_ubah !== undefined ? Number(obj.total_ubah) : Number(obj.total),
      })),
    })),
  };
}

export async function upsertTrskpd(data: {
  id?: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  sasaran_kegiatan?: string | null;
  waktu_kegiatan?: string | null;
  capaian_kegiatan?: string | null;
  lokasi_kegiatan?: string | null;
  pptkUserId?: string | null;
  mode?: "MURNI" | "PERUBAHAN";
}) {
  await checkRkaLock({
    tahunAnggaran: data.tahunAnggaran,
    opdId: data.opdId,
    unitKerjaId: data.unitKerjaId,
    mode: data.mode,
  });

  const opd = await prisma.opd.findUnique({ where: { id: data.opdId } });
  if (!opd) throw new Error("OPD tidak valid");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (data.unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({ where: { id: data.unitKerjaId } });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  } else {
    const unitInduk = await prisma.unitKerja.findFirst({
      where: { opdId: data.opdId, kd_unit: { endsWith: ".00" } },
    });
    if (unitInduk) {
      kdUnit = unitInduk.kd_unit;
      nmUnit = unitInduk.nm_unit;
    } else {
      kdUnit = `${opd.kd_skpd}.00`;
      nmUnit = opd.nm_skpd;
    }
  }

  // Kombinasikan struktur kd_program, kd_kegiatan, dan kd_sub_kegiatan
  const kd_sub_kegiatan1 = data.kd_sub_kegiatan;
  const kd_kegiatan1 = data.kd_kegiatan;
  const kd_program1 = data.kd_program;

  let final_kd_program = kd_program1;
  let final_kd_kegiatan = kd_kegiatan1;
  let final_kd_sub_kegiatan = kd_sub_kegiatan1;

  // Hanya kombinasikan jika belum dikombinasikan (yaitu masih format master 0.00.xx atau panjang <= 16)
  if (kd_sub_kegiatan1.length <= 16) {
    const urusan = opd.kd_skpd.substring(0, 4);
    const unit = kdUnit || `${opd.kd_skpd}.00`;

    if (kd_kegiatan1.substring(0, 4) === "0.00") {
      final_kd_sub_kegiatan = `${urusan}.${unit}.${kd_sub_kegiatan1.substring(5, 15)}`;
      final_kd_kegiatan = `${urusan}.${unit}.${kd_sub_kegiatan1.substring(5, 12)}`;
      final_kd_program = `${urusan}.${unit}.${kd_sub_kegiatan1.substring(5, 7)}`;
    } else {
      final_kd_sub_kegiatan = `${kd_sub_kegiatan1.substring(0, 4)}.${unit}.${kd_sub_kegiatan1.substring(5, 15)}`;
      final_kd_kegiatan = `${kd_sub_kegiatan1.substring(0, 4)}.${unit}.${kd_sub_kegiatan1.substring(5, 12)}`;
      final_kd_program = `${kd_sub_kegiatan1.substring(0, 4)}.${unit}.${kd_sub_kegiatan1.substring(5, 7)}`;
    }
  }

  let pptkNama: string | null = null;
  let pptkNip: string | null = null;
  if (data.pptkUserId) {
    const user = await prisma.user.findUnique({ where: { id: data.pptkUserId } });
    if (user) {
      pptkNama = user.namaLengkap;
      pptkNip = user.nip;
    }
  }

  if (data.id) {
    return await prisma.trskpd.update({
      where: { id: data.id },
      data: {
        sasaran_kegiatan: data.sasaran_kegiatan,
        waktu_kegiatan: data.waktu_kegiatan,
        capaian_kegiatan: data.capaian_kegiatan,
        lokasi_kegiatan: data.lokasi_kegiatan,
        pptkUserId: data.pptkUserId || null,
        pptkNama,
        pptkNip,
      },
    });
  }

  return await prisma.trskpd.upsert({
    where: {
      tahunAnggaran_kd_skpd_kd_sub_kegiatan: {
        tahunAnggaran: data.tahunAnggaran,
        kd_skpd: opd.kd_skpd,
        kd_sub_kegiatan: final_kd_sub_kegiatan,
      },
    },
    update: {
      sasaran_kegiatan: data.sasaran_kegiatan,
      waktu_kegiatan: data.waktu_kegiatan,
      capaian_kegiatan: data.capaian_kegiatan,
      lokasi_kegiatan: data.lokasi_kegiatan,
      pptkUserId: data.pptkUserId || null,
      pptkNama,
      pptkNip,
    },
    create: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      kd_unit: kdUnit,
      nm_unit: nmUnit,
      kd_program: final_kd_program,
      nm_program: data.nm_program,
      kd_kegiatan: final_kd_kegiatan,
      nm_kegiatan: data.nm_kegiatan,
      kd_sub_kegiatan: final_kd_sub_kegiatan,
      nm_sub_kegiatan: data.nm_sub_kegiatan,
      sasaran_kegiatan: data.sasaran_kegiatan || null,
      waktu_kegiatan: data.waktu_kegiatan || null,
      capaian_kegiatan: data.capaian_kegiatan || null,
      lokasi_kegiatan: data.lokasi_kegiatan || null,
      pptkUserId: data.pptkUserId || null,
      pptkNama,
      pptkNip,
      totalAnggaran: 0,
    },
  });
}

export async function updateTrskpdMetadata(
  id: string,
  data: {
    sasaran_kegiatan?: string | null;
    waktu_kegiatan?: string | null;
    capaian_kegiatan?: string | null;
    lokasi_kegiatan?: string | null;
    pptkUserId?: string | null;
    mode?: "MURNI" | "PERUBAHAN";
  }
) {
  const existing = await prisma.trskpd.findUnique({ where: { id } });
  if (!existing) throw new Error("Sub kegiatan tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: existing.tahunAnggaran,
    opdId: existing.opdId,
    unitKerjaId: existing.unitKerjaId,
    mode: data.mode,
  });

  let pptkNama: string | null = null;
  let pptkNip: string | null = null;
  if (data.pptkUserId) {
    const user = await prisma.user.findUnique({ where: { id: data.pptkUserId } });
    if (user) {
      pptkNama = user.namaLengkap;
      pptkNip = user.nip;
    }
  }

  return await prisma.trskpd.update({
    where: { id },
    data: {
      sasaran_kegiatan: data.sasaran_kegiatan !== undefined ? data.sasaran_kegiatan : undefined,
      waktu_kegiatan: data.waktu_kegiatan !== undefined ? data.waktu_kegiatan : undefined,
      capaian_kegiatan: data.capaian_kegiatan !== undefined ? data.capaian_kegiatan : undefined,
      lokasi_kegiatan: data.lokasi_kegiatan !== undefined ? data.lokasi_kegiatan : undefined,
      pptkUserId: data.pptkUserId !== undefined ? (data.pptkUserId || null) : undefined,
      ...(data.pptkUserId !== undefined ? { pptkNama, pptkNip } : {}),
    },
  });
}

export async function recalculateTrskpdTotal(trskpdId: string) {
  const sum = await prisma.trdrka.aggregate({
    where: { trskpdId },
    _sum: { nilai: true, nilai_ubah: true },
  });
  await prisma.trskpd.update({
    where: { id: trskpdId },
    data: {
      totalAnggaran: sum._sum.nilai || 0,
      totalAnggaran_ubah: sum._sum.nilai_ubah || 0,
    },
  });
}

export async function recalculateTrdrkaTotal(trdrkaId: string) {
  const sum = await prisma.trdpo.aggregate({
    where: { trdrkaId },
    _sum: { total: true, total_ubah: true },
  });
  const updatedRek = await prisma.trdrka.update({
    where: { id: trdrkaId },
    data: {
      nilai: sum._sum.total || 0,
      nilai_ubah: sum._sum.total_ubah || 0,
    },
  });
  await recalculateTrskpdTotal(updatedRek.trskpdId);
}

export async function addTrdrka(data: {
  trskpdId: string;
  kd_rek6: string;
  nm_rek6: string;
  mode?: "MURNI" | "PERUBAHAN";
}) {
  const trskpd = await prisma.trskpd.findUnique({ where: { id: data.trskpdId } });
  if (!trskpd) throw new Error("Sub Kegiatan (Trskpd) tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: trskpd.tahunAnggaran,
    opdId: trskpd.opdId,
    unitKerjaId: trskpd.unitKerjaId,
    mode: data.mode,
  });

  const existing = await prisma.trdrka.findFirst({
    where: {
      trskpdId: data.trskpdId,
      kd_rek6: data.kd_rek6,
    },
  });
  if (existing) {
    throw new Error(`Rekening [${data.kd_rek6}] ${data.nm_rek6} sudah terdaftar pada Sub Kegiatan ini.`);
  }

  const created = await prisma.trdrka.create({
    data: {
      trskpdId: data.trskpdId,
      tahunAnggaran: trskpd.tahunAnggaran,
      kd_skpd: trskpd.kd_skpd,
      nm_skpd: trskpd.nm_skpd,
      kd_unit: trskpd.kd_unit,
      nm_unit: trskpd.nm_unit,
      kd_program: trskpd.kd_program,
      nm_program: trskpd.nm_program,
      kd_kegiatan: trskpd.kd_kegiatan,
      nm_kegiatan: trskpd.nm_kegiatan,
      kd_sub_kegiatan: trskpd.kd_sub_kegiatan,
      nm_sub_kegiatan: trskpd.nm_sub_kegiatan,
      kd_rek6: data.kd_rek6,
      nm_rek6: data.nm_rek6,
      nilai: 0,
      nilai_ubah: 0,
    },
  });
  return created;
}

export async function addTrdpo(data: {
  trdrkaId: string;
  kd_barang?: string | null;
  uraian: string;
  satuan: string;
  satuan_ubah?: string | null;
  volume: number;
  volume_ubah?: number | null;
  harga: number;
  harga_ubah?: number | null;
  kd_sumdan?: string | null;
  catatan?: string | null;
  catatan_ubah?: string | null;
  mode?: "MURNI" | "PERUBAHAN";
}) {
  const trdrka = await prisma.trdrka.findUnique({
    where: { id: data.trdrkaId },
    include: { trskpd: true },
  });
  if (!trdrka) throw new Error("Rekening Belanja (Trdrka) tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: trdrka.tahunAnggaran || trdrka.trskpd.tahunAnggaran,
    opdId: trdrka.trskpd.opdId,
    unitKerjaId: trdrka.trskpd.unitKerjaId,
    mode: data.mode,
  });

  // Validasi keunikan kd_barang: tidak boleh ada barang dengan kd_barang yang sama pada rekening ini
  if (data.kd_barang && data.kd_barang.trim()) {
    const trimmedKd = data.kd_barang.trim();
    const existing = await prisma.trdpo.findFirst({
      where: {
        trdrkaId: data.trdrkaId,
        kd_barang: trimmedKd,
      },
    });
    if (existing) {
      throw new Error(
        `Barang dengan kode [${trimmedKd}] ("${existing.uraian}") sudah terdaftar pada rekening belanja ini. Kode barang harus unik!`
      );
    }
  }

  const isPerubahan = data.mode === "PERUBAHAN";

  // Jika input pada tahap Perubahan: Murni = 0, Perubahan = input user
  // Jika input pada tahap Penyusunan (Murni): Murni = input user, Perubahan diselaraskan
  const volume = isPerubahan ? 0 : data.volume;
  const harga = isPerubahan ? 0 : data.harga;
  const total = volume * harga;

  const volume_ubah = isPerubahan
    ? (data.volume_ubah !== undefined && data.volume_ubah !== null ? data.volume_ubah : data.volume)
    : (data.volume_ubah !== undefined && data.volume_ubah !== null ? data.volume_ubah : data.volume);
  const satuan_ubah = data.satuan_ubah || data.satuan;
  const harga_ubah = isPerubahan
    ? (data.harga_ubah !== undefined && data.harga_ubah !== null ? data.harga_ubah : data.harga)
    : (data.harga_ubah !== undefined && data.harga_ubah !== null ? data.harga_ubah : data.harga);
  const total_ubah = volume_ubah * harga_ubah;

  // Validasi Kontrol Plafond OPD: Plafond HANYA mengikat Belanja (akun '5').
  // Rekening Pendapatan ('4') dan Pembiayaan ('6') bebas dari batas plafond.
  const isBelanja = trdrka.kd_rek6 ? trdrka.kd_rek6.trim().startsWith("5") : true;

  if (isBelanja) {
    const plafondCtrl = await getOpdPlafondAndUsage({
      tahunAnggaran: trdrka.trskpd.tahunAnggaran,
      opdId: trdrka.trskpd.opdId,
      unitKerjaId: trdrka.trskpd.unitKerjaId,
    });

    if (plafondCtrl.hasPlafond) {
      if (!isPerubahan && plafondCtrl.paguMurni > 0) {
        const addedCost = total;
        if (plafondCtrl.totalRkaMurni + addedCost > plafondCtrl.paguMurni) {
          const kelebihan = (plafondCtrl.totalRkaMurni + addedCost) - plafondCtrl.paguMurni;
          throw new Error(
            `Penganggaran Belanja Murni Ditolak: Total Belanja RKA Murni OPD akan menjadi Rp ${(plafondCtrl.totalRkaMurni + addedCost).toLocaleString("id-ID")}, melebihi Pagu Plafond Belanja Murni (Rp ${plafondCtrl.paguMurni.toLocaleString("id-ID")}) sebesar Rp ${kelebihan.toLocaleString("id-ID")}. Sisa pagu belanja murni hanya Rp ${Math.max(0, plafondCtrl.sisaPaguMurni).toLocaleString("id-ID")}.`
          );
        }
      } else if (isPerubahan && plafondCtrl.paguUbah > 0) {
        const addedCostUbah = total_ubah;
        if (plafondCtrl.totalRkaUbah + addedCostUbah > plafondCtrl.paguUbah) {
          const kelebihan = (plafondCtrl.totalRkaUbah + addedCostUbah) - plafondCtrl.paguUbah;
          throw new Error(
            `Penganggaran Belanja Perubahan Ditolak: Total Belanja RKA Perubahan OPD akan menjadi Rp ${(plafondCtrl.totalRkaUbah + addedCostUbah).toLocaleString("id-ID")}, melebihi Pagu Plafond Belanja Perubahan (Rp ${plafondCtrl.paguUbah.toLocaleString("id-ID")}) sebesar Rp ${kelebihan.toLocaleString("id-ID")}. Sisa pagu belanja perubahan hanya Rp ${Math.max(0, plafondCtrl.sisaPaguUbah).toLocaleString("id-ID")}.`
          );
        }
      }
    }
  }

  const item = await prisma.trdpo.create({
    data: {
      trdrkaId: data.trdrkaId,
      tahunAnggaran: trdrka.tahunAnggaran || trdrka.trskpd.tahunAnggaran,
      kd_skpd: trdrka.kd_skpd,
      nm_skpd: trdrka.nm_skpd,
      kd_unit: trdrka.kd_unit,
      nm_unit: trdrka.nm_unit,
      kd_program: trdrka.kd_program,
      nm_program: trdrka.nm_program,
      kd_kegiatan: trdrka.kd_kegiatan,
      nm_kegiatan: trdrka.nm_kegiatan,
      kd_sub_kegiatan: trdrka.kd_sub_kegiatan,
      nm_sub_kegiatan: trdrka.nm_sub_kegiatan,
      kd_rek6: trdrka.kd_rek6,
      nm_rek6: trdrka.nm_rek6,
      kd_barang: data.kd_barang || null,
      uraian: data.uraian,
      satuan: data.satuan,
      satuan_ubah: satuan_ubah || data.satuan,
      volume: data.volume,
      volume_ubah,
      harga: data.harga,
      harga_ubah,
      total,
      total_ubah,
      kd_sumdan: data.kd_sumdan || null,
      catatan: data.catatan || null,
      catatan_ubah: data.catatan_ubah || null,
    },
  });

  await recalculateTrdrkaTotal(data.trdrkaId);
  return item;
}

export async function updateTrdpo(id: string, data: {
  volume?: number;
  satuan?: string;
  harga?: number;
  volume_ubah?: number | null;
  satuan_ubah?: string | null;
  harga_ubah?: number | null;
  catatan?: string | null;
  catatan_ubah?: string | null;
  mode?: "MURNI" | "PERUBAHAN";
}) {
  const existing = await prisma.trdpo.findUnique({ where: { id } });
  if (!existing) throw new Error("Rincian belanja tidak ditemukan");

  const trdrka = await prisma.trdrka.findUnique({
    where: { id: existing.trdrkaId },
    include: { trskpd: true },
  });
  if (!trdrka) throw new Error("Rekening belanja tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: trdrka.tahunAnggaran || trdrka.trskpd.tahunAnggaran,
    opdId: trdrka.trskpd.opdId,
    unitKerjaId: trdrka.trskpd.unitKerjaId,
    mode: data.mode,
  });

  const volume = data.volume !== undefined ? data.volume : Number(existing.volume);
  const harga = data.harga !== undefined ? data.harga : Number(existing.harga);
  const total = volume * harga;

  const volume_ubah =
    data.volume_ubah !== undefined && data.volume_ubah !== null
      ? data.volume_ubah
      : existing.volume_ubah !== null
        ? Number(existing.volume_ubah)
        : volume;
  const harga_ubah =
    data.harga_ubah !== undefined && data.harga_ubah !== null
      ? data.harga_ubah
      : existing.harga_ubah !== null
        ? Number(existing.harga_ubah)
        : harga;
  const satuan_ubah =
    data.satuan_ubah !== undefined && data.satuan_ubah !== null
      ? data.satuan_ubah
      : existing.satuan_ubah || existing.satuan;
  const total_ubah = volume_ubah * harga_ubah;

  // Validasi Kontrol Plafond OPD
  const oldTotal = Number(existing.total) || 0;
  const oldTotalUbah = Number(existing.total_ubah ?? existing.total) || 0;
  const deltaMurni = total - oldTotal;
  const deltaUbah = total_ubah - oldTotalUbah;

  // Validasi Kontrol Plafond OPD: Plafond HANYA mengikat Belanja (akun '5').
  // Rekening Pendapatan ('4') dan Pembiayaan ('6') bebas dari batas plafond.
  const isBelanja = (trdrka?.kd_rek6 || existing.kd_rek6)
    ? (trdrka?.kd_rek6 || existing.kd_rek6).trim().startsWith("5")
    : true;

  if (isBelanja && trdrka) {
    const plafondCtrl = await getOpdPlafondAndUsage({
      tahunAnggaran: trdrka.trskpd.tahunAnggaran,
      opdId: trdrka.trskpd.opdId,
      unitKerjaId: trdrka.trskpd.unitKerjaId,
    });

    if (plafondCtrl.hasPlafond) {
      if (deltaMurni > 0 && plafondCtrl.paguMurni > 0) {
        if (plafondCtrl.totalRkaMurni + deltaMurni > plafondCtrl.paguMurni) {
          const kelebihan = plafondCtrl.totalRkaMurni + deltaMurni - plafondCtrl.paguMurni;
          throw new Error(
            `Penganggaran Belanja Murni Ditolak: Penambahan nilai anggaran belanja (+Rp ${deltaMurni.toLocaleString("id-ID")}) menyebabkan Total Belanja RKA Murni OPD melebihi Pagu Plafond Belanja sebesar Rp ${kelebihan.toLocaleString("id-ID")}. Sisa pagu belanja yang tersedia hanya Rp ${Math.max(0, plafondCtrl.sisaPaguMurni).toLocaleString("id-ID")}.`
          );
        }
      }
      if (deltaUbah > 0 && plafondCtrl.paguUbah > 0) {
        if (plafondCtrl.totalRkaUbah + deltaUbah > plafondCtrl.paguUbah) {
          const kelebihan = plafondCtrl.totalRkaUbah + deltaUbah - plafondCtrl.paguUbah;
          throw new Error(
            `Penganggaran Belanja Perubahan Ditolak: Penambahan nilai anggaran belanja perubahan (+Rp ${deltaUbah.toLocaleString("id-ID")}) menyebabkan Total Belanja RKA Perubahan OPD melebihi Pagu Plafond Belanja Perubahan sebesar Rp ${kelebihan.toLocaleString("id-ID")}. Sisa pagu belanja perubahan yang tersedia hanya Rp ${Math.max(0, plafondCtrl.sisaPaguUbah).toLocaleString("id-ID")}.`
          );
        }
      }
    }
  }

  const updated = await prisma.trdpo.update({
    where: { id },
    data: {
      volume: data.volume !== undefined ? data.volume : undefined,
      satuan: data.satuan !== undefined ? data.satuan : undefined,
      harga: data.harga !== undefined ? data.harga : undefined,
      total,
      volume_ubah,
      satuan_ubah,
      harga_ubah,
      total_ubah,
      catatan: data.catatan !== undefined ? data.catatan : undefined,
      catatan_ubah: data.catatan_ubah !== undefined ? data.catatan_ubah : undefined,
    },
  });

  await recalculateTrdrkaTotal(existing.trdrkaId);
  return updated;
}

export async function deleteTrdpo(id: string, mode?: string) {
  const existing = await prisma.trdpo.findUnique({
    where: { id },
    include: { trdrka: { include: { trskpd: true } } },
  });
  if (!existing) throw new Error("Rincian belanja tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: existing.trdrka.tahunAnggaran || existing.trdrka.trskpd.tahunAnggaran,
    opdId: existing.trdrka.trskpd.opdId,
    unitKerjaId: existing.trdrka.trskpd.unitKerjaId,
    mode,
  });

  if (mode === "PERUBAHAN" && Number(existing.volume) > 0) {
    throw new Error(
      "Rincian belanja dari tahap Penyusunan (Murni) tidak boleh dihapus pada RKA Perubahan. Silakan ubah Volume Ubah menjadi 0 untuk meniadakan anggaran."
    );
  }

  const item = await prisma.trdpo.delete({ where: { id } });
  await recalculateTrdrkaTotal(item.trdrkaId);
  return item;
}

export async function deleteTrdrka(id: string, mode?: string) {
  const existing = await prisma.trdrka.findUnique({
    where: { id },
    include: { rincianObjek: true, trskpd: true },
  });
  if (!existing) throw new Error("Rekening belanja tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: existing.tahunAnggaran || existing.trskpd.tahunAnggaran,
    opdId: existing.trskpd.opdId,
    unitKerjaId: existing.trskpd.unitKerjaId,
    mode,
  });

  if (mode === "PERUBAHAN") {
    const hasMurniItem =
      existing.rincianObjek.some((o) => Number(o.volume) > 0) || Number(existing.nilai) > 0;
    if (hasMurniItem) {
      throw new Error(
        "Rekening belanja yang diinput pada tahap Penyusunan (Murni) tidak boleh dihapus pada RKA Perubahan."
      );
    }
  }

  const rek = await prisma.trdrka.delete({ where: { id } });
  await recalculateTrskpdTotal(rek.trskpdId);
  return rek;
}

export async function deleteTrskpd(id: string, mode?: "MURNI" | "PERUBAHAN") {
  const existing = await prisma.trskpd.findUnique({
    where: { id },
    include: {
      rkaRekening: {
        include: {
          rincianObjek: true,
        },
      },
    },
  });
  if (!existing) throw new Error("Sub kegiatan tidak ditemukan");

  await checkRkaLock({
    tahunAnggaran: existing.tahunAnggaran,
    opdId: existing.opdId,
    unitKerjaId: existing.unitKerjaId,
    mode,
  });

  if (mode === "PERUBAHAN") {
    const hasMurniAlloc =
      Number(existing.totalAnggaran) > 0 ||
      existing.rkaRekening.some(
        (rek) =>
          Number(rek.nilai) > 0 ||
          rek.rincianObjek.some((r) => Number(r.volume) > 0)
      );
    if (hasMurniAlloc) {
      throw new Error(
        "Sub kegiatan dari tahap Penyusunan (Murni) tidak boleh dihapus pada tahap RKA Perubahan."
      );
    }
  }
  return await prisma.trskpd.delete({ where: { id } });
}
