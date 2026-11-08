import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { getAnggaranKasAccessRole, canLockAnggaranKas } from "@/lib/rbac";

/**
 * Mengambil status kunci Anggaran Kas untuk OPD / Unit Kerja pada Tahun Anggaran tertentu
 */
export async function getAnggaranKasLockStatus(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
}) {
  const { tahunAnggaran, opdId, unitKerjaId } = params;

  const kasRow = await prisma.anggaranKas.findFirst({
    where: {
      tahunAnggaran,
      opdId,
      unitKerjaId: unitKerjaId || null,
    },
  });

  if (kasRow && kasRow.status === "DIKUNCI") {
    return { isLocked: true, status: "DIKUNCI", id: kasRow.id };
  }

  // Jika memeriksa sub-unit, periksa juga apakah level induk OPD dikunci
  if (unitKerjaId) {
    const parentRow = await prisma.anggaranKas.findFirst({
      where: {
        tahunAnggaran,
        opdId,
        unitKerjaId: null,
      },
    });
    if (parentRow && parentRow.status === "DIKUNCI") {
      return { isLocked: true, status: "DIKUNCI", id: parentRow.id };
    }
  }

  return {
    isLocked: false,
    status: kasRow?.status || "DRAFT",
    id: kasRow?.id || null,
  };
}

/**
 * Mengambil peta status kunci Anggaran Kas seluruh OPD pada Tahun Anggaran tertentu
 */
export async function getAllOpdAnggaranKasLocks(tahunAnggaran: number) {
  const rows = await prisma.anggaranKas.findMany({
    where: { tahunAnggaran },
    select: {
      id: true,
      opdId: true,
      unitKerjaId: true,
      kd_skpd: true,
      nm_skpd: true,
      status: true,
    },
  });

  const lockMap: Record<string, boolean> = {};
  for (const r of rows) {
    const isLocked = r.status === "DIKUNCI";
    if (!r.unitKerjaId) {
      lockMap[r.opdId] = isLocked;
    } else {
      lockMap[`${r.opdId}:${r.unitKerjaId}`] = isLocked;
      if (isLocked && lockMap[r.opdId] === undefined) {
        lockMap[r.opdId] = true;
      }
    }
  }

  return lockMap;
}

/**
 * Memastikan Anggaran Kas pada OPD / Unit tidak sedang dikunci sebelum melakukan penyimpanan
 */
export async function checkAnggaranKasLock(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
}) {
  const lockInfo = await getAnggaranKasLockStatus(params);
  if (lockInfo.isLocked) {
    throw new Error(
      `Input Anggaran Kas untuk perangkat daerah ini pada TA ${params.tahunAnggaran} sedang DIKUNCI oleh Bidang Anggaran / Administrator. Pengisian atau perubahan alokasi kas tidak diperbolehkan.`
    );
  }
}

/**
 * Mengubah status kunci Anggaran Kas untuk 1 OPD / Unit Kerja (Hanya Superadmin & Bidang Anggaran)
 */
export async function toggleAnggaranKasLock(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  isLocked: boolean;
  session?: SessionPayload | null;
}) {
  const { tahunAnggaran, opdId, unitKerjaId, isLocked, session } = params;

  if (!canLockAnggaranKas(session)) {
    throw new Error(
      "Akses ditolak: Penguncian Anggaran Kas hanya dapat dilakukan oleh Superadmin atau Bidang Anggaran."
    );
  }

  const opd = await prisma.opd.findUnique({ where: { id: opdId } });
  if (!opd) throw new Error("OPD tidak ditemukan.");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  }

  const targetStatus = isLocked ? "DIKUNCI" : "DRAFT";

  const existing = await prisma.anggaranKas.findFirst({
    where: {
      tahunAnggaran,
      opdId,
      unitKerjaId: unitKerjaId || null,
    },
  });

  let updated;
  if (existing) {
    updated = await prisma.anggaranKas.update({
      where: { id: existing.id },
      data: { status: targetStatus },
    });
  } else {
    updated = await prisma.anggaranKas.create({
      data: {
        tahunAnggaran,
        opdId,
        unitKerjaId: unitKerjaId || null,
        kd_skpd: opd.kd_skpd,
        nm_skpd: opd.nm_skpd,
        kd_unit: kdUnit,
        nm_unit: nmUnit,
        status: targetStatus,
      },
    });
  }

  // Jika mengunci/membuka di tingkat induk OPD, seragamkan juga baris unit di bawah OPD tersebut
  if (!unitKerjaId) {
    await prisma.anggaranKas.updateMany({
      where: { tahunAnggaran, opdId },
      data: { status: targetStatus },
    });
  }

  return {
    ...updated,
    isLocked: updated.status === "DIKUNCI",
  };
}

/**
 * Mengunci atau membuka kunci Anggaran Kas seluruh OPD secara masal pada Tahun Anggaran tertentu
 */
export async function batchToggleAllAnggaranKasLock(params: {
  tahunAnggaran: number;
  isLocked: boolean;
  session?: SessionPayload | null;
}) {
  const { tahunAnggaran, isLocked, session } = params;

  if (!canLockAnggaranKas(session)) {
    throw new Error(
      "Akses ditolak: Penguncian Anggaran Kas hanya dapat dilakukan oleh Superadmin atau Bidang Anggaran."
    );
  }

  const targetStatus = isLocked ? "DIKUNCI" : "DRAFT";
  const allOpds = await prisma.opd.findMany({
    where: { isActive: true },
    select: { id: true, kd_skpd: true, nm_skpd: true },
  });

  const existingRows = await prisma.anggaranKas.findMany({
    where: { tahunAnggaran, unitKerjaId: null },
    select: { opdId: true },
  });
  const existingOpdIds = new Set(existingRows.map((r) => r.opdId));

  const missingOpds = allOpds.filter((o) => !existingOpdIds.has(o.id));
  if (missingOpds.length > 0) {
    await prisma.anggaranKas.createMany({
      data: missingOpds.map((o) => ({
        tahunAnggaran,
        opdId: o.id,
        unitKerjaId: null,
        kd_skpd: o.kd_skpd,
        nm_skpd: o.nm_skpd,
        status: targetStatus,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.anggaranKas.updateMany({
    where: { tahunAnggaran },
    data: { status: targetStatus },
  });

  return {
    count: allOpds.length,
    isLocked,
  };
}

export interface SubkegiatanKasItem {
  id: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  pptkUserId: string | null;
  pptkNama: string | null;
  pptkNip: string | null;
  totalBelanjaMurni: number;
  totalBelanjaUbah: number;
  totalKasMurni: number;
  totalKasUbah: number;
  jumlahRekening: number;
  jumlahRekeningTerisi: number;
  statusKas: "BELUM_DIISI" | "BELUM_LENGKAP" | "LENGKAP" | "MELEBIHI";
  persenKas: number;
}

export interface RekeningKasDetail {
  id: string; // trdrkaId
  trskpdId: string;
  kd_rek6: string;
  nm_rek6: string;
  nilaiMurni: number;
  nilaiUbah: number;
  kasId: string | null;
  // 12 Bulan Murni
  bulan1: number;
  bulan2: number;
  bulan3: number;
  bulan4: number;
  bulan5: number;
  bulan6: number;
  bulan7: number;
  bulan8: number;
  bulan9: number;
  bulan10: number;
  bulan11: number;
  bulan12: number;
  totalKasMurni: number;
  // 12 Bulan Perubahan
  bulan1_ubah: number;
  bulan2_ubah: number;
  bulan3_ubah: number;
  bulan4_ubah: number;
  bulan5_ubah: number;
  bulan6_ubah: number;
  bulan7_ubah: number;
  bulan8_ubah: number;
  bulan9_ubah: number;
  bulan10_ubah: number;
  bulan11_ubah: number;
  bulan12_ubah: number;
  totalKasUbah: number;
  // Status
  isCompleteMurni: boolean;
  selisihMurni: number;
  isCompleteUbah: boolean;
  selisihUbah: number;
}

/**
 * Validasi hak akses pengguna terhadap suatu Sub Kegiatan pada modul Anggaran Kas
 */
export function verifySubkegAccessForSession(
  subkeg: {
    opdId: string;
    unitKerjaId?: string | null;
    pptkUserId?: string | null;
    pptkNama?: string | null;
    pptkNip?: string | null;
  },
  session?: SessionPayload | null
) {
  if (!session) return;
  const accessRole = getAnggaranKasAccessRole(session);

  if (accessRole === "FORBIDDEN") {
    throw new Error(
      "Akses ditolak: Menu Anggaran Kas hanya dapat diakses oleh Superadmin, Bidang Anggaran, Kasubag Perencanaan OPD, dan PPTK."
    );
  }

  if (accessRole === "SUPERADMIN" || accessRole === "BIDANG_ANGGARAN") {
    return;
  }

  if (accessRole === "KASUBAG_PERENCANAAN") {
    if (session.opdId && subkeg.opdId !== session.opdId) {
      throw new Error("Akses ditolak: Anda hanya dapat mengelola Anggaran Kas pada OPD Anda sendiri.");
    }
    if (session.unitKerjaId && subkeg.unitKerjaId !== session.unitKerjaId) {
      throw new Error("Akses ditolak: Anda hanya dapat mengelola Anggaran Kas pada Unit Kerja Anda sendiri.");
    }
    return;
  }

  if (accessRole === "PPTK") {
    const isMatchedUserId = Boolean(session.userId && subkeg.pptkUserId === session.userId);
    const isMatchedNip = Boolean(
      session.username && subkeg.pptkNip && subkeg.pptkNip.trim() === session.username.trim()
    );
    const isMatchedNama = Boolean(
      session.namaLengkap &&
        subkeg.pptkNama &&
        subkeg.pptkNama.trim().toLowerCase() === session.namaLengkap.trim().toLowerCase()
    );

    if (!isMatchedUserId && !isMatchedNip && !isMatchedNama) {
      throw new Error(
        "Akses ditolak: Anda hanya dapat mengakses dan mengelola Anggaran Kas pada Sub Kegiatan yang ditugaskan kepada Anda sebagai PPTK."
      );
    }
  }
}

/**
 * List Sub Kegiatan yang memiliki rekening belanja (akun 5) beserta ringkasan status anggaran kas
 */
export async function listSubkegiatanAnggaranKas(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  search?: string;
  session?: SessionPayload | null;
}) {
  const { tahunAnggaran, opdId, unitKerjaId, search, session } = params;

  const andConditions: any[] = [
    { NOT: { kd_sub_kegiatan: { endsWith: ".00.0.00.00" } } },
  ];

  if (session) {
    const accessRole = getAnggaranKasAccessRole(session);
    if (accessRole === "FORBIDDEN") {
      throw new Error(
        "Akses ditolak: Menu Anggaran Kas hanya dapat diakses oleh Superadmin, Bidang Anggaran, Kasubag Perencanaan OPD, dan PPTK."
      );
    }
    if (accessRole === "KASUBAG_PERENCANAAN") {
      if (session.opdId && opdId !== session.opdId) {
        throw new Error("Akses ditolak: Anda hanya dapat melihat Sub Kegiatan pada OPD Anda sendiri.");
      }
    }
    if (accessRole === "PPTK") {
      const pptkOr: any[] = [{ pptkUserId: session.userId }];
      if (session.username) {
        pptkOr.push({ pptkNip: session.username });
      }
      if (session.namaLengkap) {
        pptkOr.push({ pptkNama: { equals: session.namaLengkap, mode: "insensitive" } });
      }
      andConditions.push({ OR: pptkOr });
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    andConditions.push({
      OR: [
        { kd_program: { contains: q, mode: "insensitive" } },
        { nm_program: { contains: q, mode: "insensitive" } },
        { kd_kegiatan: { contains: q, mode: "insensitive" } },
        { nm_kegiatan: { contains: q, mode: "insensitive" } },
        { kd_sub_kegiatan: { contains: q, mode: "insensitive" } },
        { nm_sub_kegiatan: { contains: q, mode: "insensitive" } },
        { pptkNama: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: any = {
    tahunAnggaran,
    opdId,
    ...(unitKerjaId ? { unitKerjaId } : {}),
    AND: andConditions,
  };

  const subkegList = await prisma.trskpd.findMany({
    where,
    orderBy: [{ kd_sub_kegiatan: "asc" }],
    include: {
      pptk: true,
      rkaRekening: {
        where: {
          kd_rek6: { startsWith: "5" }, // HANYA REKENING BELANJA (AKUN 5)
        },
        include: {
          anggaranKasRekening: {
            where: { tahunAnggaran },
          },
        },
      },
    },
  });

  return subkegList.map((s): SubkegiatanKasItem => {
    let totalBelanjaMurni = 0;
    let totalBelanjaUbah = 0;
    let totalKasMurni = 0;
    let totalKasUbah = 0;
    let jumlahRekeningTerisi = 0;

    for (const rek of s.rkaRekening) {
      const valM = Number(rek.nilai) || 0;
      const valU = rek.nilai_ubah !== null && rek.nilai_ubah !== undefined ? Number(rek.nilai_ubah) : valM;
      totalBelanjaMurni += valM;
      totalBelanjaUbah += valU;

      const kas = rek.anggaranKasRekening?.[0];
      if (kas) {
        const kVal = Number(kas.totalKas) || Number(kas.totalKas_ubah) || 0;
        totalKasMurni += kVal;
        totalKasUbah += kVal;
        if (kVal > 0) {
          jumlahRekeningTerisi += 1;
        }
      }
    }

    // Rujukan pagu selalu mengacu pada nilai_ubah (totalBelanjaUbah)
    let statusKas: SubkegiatanKasItem["statusKas"] = "BELUM_DIISI";
    if (totalKasUbah === 0) {
      statusKas = "BELUM_DIISI";
    } else if (totalKasUbah === totalBelanjaUbah && totalBelanjaUbah > 0) {
      statusKas = "LENGKAP";
    } else if (totalKasUbah > totalBelanjaUbah) {
      statusKas = "MELEBIHI";
    } else {
      statusKas = "BELUM_LENGKAP";
    }

    const persenKas = totalBelanjaUbah > 0 ? (totalKasUbah / totalBelanjaUbah) * 100 : 0;

    return {
      id: s.id,
      tahunAnggaran: s.tahunAnggaran,
      opdId: s.opdId,
      unitKerjaId: s.unitKerjaId,
      kd_skpd: s.kd_skpd,
      nm_skpd: s.nm_skpd,
      kd_unit: s.kd_unit,
      nm_unit: s.nm_unit,
      kd_program: s.kd_program,
      nm_program: s.nm_program,
      kd_kegiatan: s.kd_kegiatan,
      nm_kegiatan: s.nm_kegiatan,
      kd_sub_kegiatan: s.kd_sub_kegiatan,
      nm_sub_kegiatan: s.nm_sub_kegiatan,
      pptkUserId: s.pptkUserId || null,
      pptkNama: s.pptkNama || s.pptk?.namaLengkap || null,
      pptkNip: s.pptkNip || s.pptk?.nip || null,
      totalBelanjaMurni,
      totalBelanjaUbah,
      totalKasMurni,
      totalKasUbah,
      jumlahRekening: s.rkaRekening.length,
      jumlahRekeningTerisi,
      statusKas,
      persenKas,
    };
  });
}

/**
 * Mengambil detail Sub Kegiatan beserta seluruh Rekening Belanja dan alokasi 12 bulan
 */
export async function getDetailAnggaranKasSubkeg(
  trskpdId: string,
  tahunAnggaran: number = 2027,
  session?: SessionPayload | null
) {
  const subkeg = await prisma.trskpd.findUnique({
    where: { id: trskpdId },
    include: {
      pptk: true,
      rkaRekening: {
        where: {
          kd_rek6: { startsWith: "5" }, // HANYA REKENING BELANJA
        },
        orderBy: { kd_rek6: "asc" },
        include: {
          anggaranKasRekening: {
            where: { tahunAnggaran },
          },
        },
      },
    },
  });

  if (!subkeg) {
    throw new Error("Sub Kegiatan tidak ditemukan");
  }

  verifySubkegAccessForSession(subkeg, session);

  const rekeningKas: RekeningKasDetail[] = subkeg.rkaRekening.map((rek) => {
    const nilaiMurni = Number(rek.nilai) || 0;
    const nilaiUbah = rek.nilai_ubah !== null && rek.nilai_ubah !== undefined ? Number(rek.nilai_ubah) : nilaiMurni;

    const kas = rek.anggaranKasRekening?.[0];

    const bulan1 = kas ? Number(kas.bulan1) || Number(kas.bulan1_ubah) || 0 : 0;
    const bulan2 = kas ? Number(kas.bulan2) || Number(kas.bulan2_ubah) || 0 : 0;
    const bulan3 = kas ? Number(kas.bulan3) || Number(kas.bulan3_ubah) || 0 : 0;
    const bulan4 = kas ? Number(kas.bulan4) || Number(kas.bulan4_ubah) || 0 : 0;
    const bulan5 = kas ? Number(kas.bulan5) || Number(kas.bulan5_ubah) || 0 : 0;
    const bulan6 = kas ? Number(kas.bulan6) || Number(kas.bulan6_ubah) || 0 : 0;
    const bulan7 = kas ? Number(kas.bulan7) || Number(kas.bulan7_ubah) || 0 : 0;
    const bulan8 = kas ? Number(kas.bulan8) || Number(kas.bulan8_ubah) || 0 : 0;
    const bulan9 = kas ? Number(kas.bulan9) || Number(kas.bulan9_ubah) || 0 : 0;
    const bulan10 = kas ? Number(kas.bulan10) || Number(kas.bulan10_ubah) || 0 : 0;
    const bulan11 = kas ? Number(kas.bulan11) || Number(kas.bulan11_ubah) || 0 : 0;
    const bulan12 = kas ? Number(kas.bulan12) || Number(kas.bulan12_ubah) || 0 : 0;
    const totalKas =
      bulan1 + bulan2 + bulan3 + bulan4 + bulan5 + bulan6 + bulan7 + bulan8 + bulan9 + bulan10 + bulan11 + bulan12;

    const selisihUbah = nilaiUbah - totalKas;
    const isCompleteUbah = totalKas === nilaiUbah && nilaiUbah > 0;

    return {
      id: rek.id,
      trskpdId: subkeg.id,
      kd_rek6: rek.kd_rek6,
      nm_rek6: rek.nm_rek6,
      nilaiMurni,
      nilaiUbah,
      kasId: kas?.id || null,
      bulan1,
      bulan2,
      bulan3,
      bulan4,
      bulan5,
      bulan6,
      bulan7,
      bulan8,
      bulan9,
      bulan10,
      bulan11,
      bulan12,
      totalKasMurni: totalKas,
      bulan1_ubah: bulan1,
      bulan2_ubah: bulan2,
      bulan3_ubah: bulan3,
      bulan4_ubah: bulan4,
      bulan5_ubah: bulan5,
      bulan6_ubah: bulan6,
      bulan7_ubah: bulan7,
      bulan8_ubah: bulan8,
      bulan9_ubah: bulan9,
      bulan10_ubah: bulan10,
      bulan11_ubah: bulan11,
      bulan12_ubah: bulan12,
      totalKasUbah: totalKas,
      isCompleteMurni: isCompleteUbah,
      selisihMurni: selisihUbah,
      isCompleteUbah,
      selisihUbah,
    };
  });

  const totalBelanjaMurni = rekeningKas.reduce((acc, r) => acc + r.nilaiMurni, 0);
  const totalBelanjaUbah = rekeningKas.reduce((acc, r) => acc + r.nilaiUbah, 0);
  const totalKasMurni = rekeningKas.reduce((acc, r) => acc + r.totalKasMurni, 0);
  const totalKasUbah = rekeningKas.reduce((acc, r) => acc + r.totalKasUbah, 0);

  const lockInfo = await getAnggaranKasLockStatus({
    tahunAnggaran,
    opdId: subkeg.opdId,
    unitKerjaId: subkeg.unitKerjaId,
  });

  return {
    isLocked: lockInfo.isLocked,
    subkeg: {
      id: subkeg.id,
      tahunAnggaran: subkeg.tahunAnggaran,
      opdId: subkeg.opdId,
      unitKerjaId: subkeg.unitKerjaId,
      kd_skpd: subkeg.kd_skpd,
      nm_skpd: subkeg.nm_skpd,
      kd_unit: subkeg.kd_unit,
      nm_unit: subkeg.nm_unit,
      kd_program: subkeg.kd_program,
      nm_program: subkeg.nm_program,
      kd_kegiatan: subkeg.kd_kegiatan,
      nm_kegiatan: subkeg.nm_kegiatan,
      kd_sub_kegiatan: subkeg.kd_sub_kegiatan,
      nm_sub_kegiatan: subkeg.nm_sub_kegiatan,
      pptkUserId: subkeg.pptkUserId || null,
      pptkNama: subkeg.pptkNama || subkeg.pptk?.namaLengkap || null,
      pptkNip: subkeg.pptkNip || subkeg.pptk?.nip || null,
      totalAnggaranRka: Number(subkeg.totalAnggaran),
      totalAnggaranRka_ubah: Number(subkeg.totalAnggaran_ubah || subkeg.totalAnggaran),
    },
    rekeningKas,
    totals: {
      totalBelanjaMurni,
      totalBelanjaUbah,
      totalKasMurni,
      totalKasUbah,
      sisaBelumTeralokasiMurni: totalBelanjaUbah - totalKasUbah,
      sisaBelumTeralokasiUbah: totalBelanjaUbah - totalKasUbah,
    },
  };
}

/**
 * Menyimpan alokasi kas 12 bulan untuk 1 rekening belanja (selalu merujuk pada nilai_ubah RKA)
 */
export async function saveAnggaranKasRekening(data: {
  tahunAnggaran: number;
  trdrkaId: string;
  mode?: "MURNI" | "PERUBAHAN";
  bulan1: number;
  bulan2: number;
  bulan3: number;
  bulan4: number;
  bulan5: number;
  bulan6: number;
  bulan7: number;
  bulan8: number;
  bulan9: number;
  bulan10: number;
  bulan11: number;
  bulan12: number;
  session?: SessionPayload | null;
}) {
  const { tahunAnggaran, trdrkaId, session } = data;

  const rek = await prisma.trdrka.findUnique({
    where: { id: trdrkaId },
    include: { trskpd: true },
  });

  if (!rek) throw new Error("Rekening Belanja RKA tidak ditemukan");

  verifySubkegAccessForSession(rek.trskpd, session);

  await checkAnggaranKasLock({
    tahunAnggaran,
    opdId: rek.trskpd.opdId,
    unitKerjaId: rek.trskpd.unitKerjaId,
  });

  const total =
    Number(data.bulan1 || 0) +
    Number(data.bulan2 || 0) +
    Number(data.bulan3 || 0) +
    Number(data.bulan4 || 0) +
    Number(data.bulan5 || 0) +
    Number(data.bulan6 || 0) +
    Number(data.bulan7 || 0) +
    Number(data.bulan8 || 0) +
    Number(data.bulan9 || 0) +
    Number(data.bulan10 || 0) +
    Number(data.bulan11 || 0) +
    Number(data.bulan12 || 0);

  const existing = await prisma.anggaranKasRekening.findUnique({
    where: {
      tahunAnggaran_trdrkaId: {
        tahunAnggaran,
        trdrkaId,
      },
    },
  });

  let saved;
  if (existing) {
    saved = await prisma.anggaranKasRekening.update({
      where: { id: existing.id },
      data: {
        bulan1: data.bulan1,
        bulan2: data.bulan2,
        bulan3: data.bulan3,
        bulan4: data.bulan4,
        bulan5: data.bulan5,
        bulan6: data.bulan6,
        bulan7: data.bulan7,
        bulan8: data.bulan8,
        bulan9: data.bulan9,
        bulan10: data.bulan10,
        bulan11: data.bulan11,
        bulan12: data.bulan12,
        totalKas: total,
        bulan1_ubah: data.bulan1,
        bulan2_ubah: data.bulan2,
        bulan3_ubah: data.bulan3,
        bulan4_ubah: data.bulan4,
        bulan5_ubah: data.bulan5,
        bulan6_ubah: data.bulan6,
        bulan7_ubah: data.bulan7,
        bulan8_ubah: data.bulan8,
        bulan9_ubah: data.bulan9,
        bulan10_ubah: data.bulan10,
        bulan11_ubah: data.bulan11,
        bulan12_ubah: data.bulan12,
        totalKas_ubah: total,
      },
    });
  } else {
    saved = await prisma.anggaranKasRekening.create({
      data: {
        tahunAnggaran,
        trdrkaId,
        trskpdId: rek.trskpdId,
        opdId: rek.trskpd.opdId,
        unitKerjaId: rek.trskpd.unitKerjaId,
        kd_skpd: rek.kd_skpd,
        nm_skpd: rek.nm_skpd,
        kd_unit: rek.kd_unit,
        nm_unit: rek.nm_unit,
        kd_sub_kegiatan: rek.kd_sub_kegiatan,
        nm_sub_kegiatan: rek.nm_sub_kegiatan,
        kd_rek6: rek.kd_rek6,
        nm_rek6: rek.nm_rek6,
        bulan1: data.bulan1,
        bulan2: data.bulan2,
        bulan3: data.bulan3,
        bulan4: data.bulan4,
        bulan5: data.bulan5,
        bulan6: data.bulan6,
        bulan7: data.bulan7,
        bulan8: data.bulan8,
        bulan9: data.bulan9,
        bulan10: data.bulan10,
        bulan11: data.bulan11,
        bulan12: data.bulan12,
        totalKas: total,
        bulan1_ubah: data.bulan1,
        bulan2_ubah: data.bulan2,
        bulan3_ubah: data.bulan3,
        bulan4_ubah: data.bulan4,
        bulan5_ubah: data.bulan5,
        bulan6_ubah: data.bulan6,
        bulan7_ubah: data.bulan7,
        bulan8_ubah: data.bulan8,
        bulan9_ubah: data.bulan9,
        bulan10_ubah: data.bulan10,
        bulan11_ubah: data.bulan11,
        bulan12_ubah: data.bulan12,
        totalKas_ubah: total,
      },
    });
  }

  // Sinkronkan akumulasi ke tabel agregat OPD (tr_anggaran_kas)
  await syncOpdAnggaranKas(rek.trskpd.opdId, rek.trskpd.unitKerjaId, tahunAnggaran);

  return saved;
}

/**
 * Batch simpan seluruh rekening dalam 1 sub kegiatan
 */
export async function batchSaveAnggaranKasSubkeg(data: {
  tahunAnggaran: number;
  trskpdId: string;
  mode?: "MURNI" | "PERUBAHAN";
  session?: SessionPayload | null;
  items: Array<{
    trdrkaId: string;
    bulan1: number;
    bulan2: number;
    bulan3: number;
    bulan4: number;
    bulan5: number;
    bulan6: number;
    bulan7: number;
    bulan8: number;
    bulan9: number;
    bulan10: number;
    bulan11: number;
    bulan12: number;
  }>;
}) {
  const { tahunAnggaran, trskpdId, mode = "MURNI", items, session } = data;

  const subkeg = await prisma.trskpd.findUnique({
    where: { id: trskpdId },
  });
  if (!subkeg) throw new Error("Sub Kegiatan tidak ditemukan");

  verifySubkegAccessForSession(subkeg, session);

  await checkAnggaranKasLock({
    tahunAnggaran,
    opdId: subkeg.opdId,
    unitKerjaId: subkeg.unitKerjaId,
  });

  const results = [];
  for (const item of items) {
    const res = await saveAnggaranKasRekening({
      tahunAnggaran,
      trdrkaId: item.trdrkaId,
      mode,
      session,
      bulan1: item.bulan1,
      bulan2: item.bulan2,
      bulan3: item.bulan3,
      bulan4: item.bulan4,
      bulan5: item.bulan5,
      bulan6: item.bulan6,
      bulan7: item.bulan7,
      bulan8: item.bulan8,
      bulan9: item.bulan9,
      bulan10: item.bulan10,
      bulan11: item.bulan11,
      bulan12: item.bulan12,
    });
    results.push(res);
  }

  return results;
}

/**
 * Sinkronisasi akumulasi total triwulanan dari tabel detail ke tabel agregat tr_anggaran_kas
 */
async function syncOpdAnggaranKas(opdId: string, unitKerjaId: string | null | undefined, tahunAnggaran: number) {
  try {
    const allKas = await prisma.anggaranKasRekening.findMany({
      where: {
        tahunAnggaran,
        opdId,
        unitKerjaId: unitKerjaId || null,
      },
    });

    let tw1 = 0;
    let tw2 = 0;
    let tw3 = 0;
    let tw4 = 0;

    for (const k of allKas) {
      tw1 += Number(k.bulan1) + Number(k.bulan2) + Number(k.bulan3);
      tw2 += Number(k.bulan4) + Number(k.bulan5) + Number(k.bulan6);
      tw3 += Number(k.bulan7) + Number(k.bulan8) + Number(k.bulan9);
      tw4 += Number(k.bulan10) + Number(k.bulan11) + Number(k.bulan12);
    }

    const totalKas = tw1 + tw2 + tw3 + tw4;

    const opd = await prisma.opd.findUnique({ where: { id: opdId } });
    if (!opd) return;

    let kdUnit: string | null = null;
    let nmUnit: string | null = null;
    if (unitKerjaId) {
      const u = await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } });
      if (u) {
        kdUnit = u.kd_unit;
        nmUnit = u.nm_unit;
      }
    }

    const existingKas = await prisma.anggaranKas.findFirst({
      where: {
        tahunAnggaran,
        opdId,
        unitKerjaId: unitKerjaId || null,
      },
    });

    if (existingKas) {
      await prisma.anggaranKas.update({
        where: { id: existingKas.id },
        data: {
          triwulan1: tw1,
          triwulan2: tw2,
          triwulan3: tw3,
          triwulan4: tw4,
          totalKas,
        },
      });
    } else {
      await prisma.anggaranKas.create({
        data: {
          tahunAnggaran,
          opdId,
          unitKerjaId: unitKerjaId || null,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          kd_unit: kdUnit,
          nm_unit: nmUnit,
          triwulan1: tw1,
          triwulan2: tw2,
          triwulan3: tw3,
          triwulan4: tw4,
          totalKas,
          status: "DRAFT",
        },
      });
    }
  } catch (err) {
    console.error("syncOpdAnggaranKas error:", err);
  }
}
