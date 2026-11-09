import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAnggaranKasLockStatus } from "./anggaran-kas.service";

export const TRIWULAN_META: Record<
  1 | 2 | 3 | 4,
  {
    triwulan: 1 | 2 | 3 | 4;
    label: string;
    shortLabel: string;
    periode: string;
    bulanAwal: number;
    bulanAkhir: number;
    namaBulan: [string, string, string];
  }
> = {
  1: {
    triwulan: 1,
    label: "Triwulan I (Januari – Maret)",
    shortLabel: "Triwulan I",
    periode: "Triwulan I",
    bulanAwal: 1,
    bulanAkhir: 3,
    namaBulan: ["Januari", "Februari", "Maret"],
  },
  2: {
    triwulan: 2,
    label: "Triwulan II (April – Juni)",
    shortLabel: "Triwulan II",
    periode: "Triwulan II",
    bulanAwal: 4,
    bulanAkhir: 6,
    namaBulan: ["April", "Mei", "Juni"],
  },
  3: {
    triwulan: 3,
    label: "Triwulan III (Juli – September)",
    shortLabel: "Triwulan III",
    periode: "Triwulan III",
    bulanAwal: 7,
    bulanAkhir: 9,
    namaBulan: ["Juli", "Agustus", "September"],
  },
  4: {
    triwulan: 4,
    label: "Triwulan IV (Oktober – Desember)",
    shortLabel: "Triwulan IV",
    periode: "Triwulan IV",
    bulanAwal: 10,
    bulanAkhir: 12,
    namaBulan: ["Oktober", "November", "Desember"],
  },
};

export async function listAnggaranKas(tahunAnggaran: number = 2027) {
  const opdList = await prisma.opd.findMany({
    where: { isActive: true },
    orderBy: { kd_skpd: "asc" },
  });

  const kasList = await prisma.anggaranKas.findMany({
    where: { tahunAnggaran },
  });
  const kasMap = new Map(kasList.map((k) => [k.opdId, k]));

  return opdList.map((opd) => {
    const kas = kasMap.get(opd.id);
    return {
      id: kas?.id || null,
      opdId: opd.id,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      triwulan1: Number(kas?.triwulan1 || 0),
      triwulan2: Number(kas?.triwulan2 || 0),
      triwulan3: Number(kas?.triwulan3 || 0),
      triwulan4: Number(kas?.triwulan4 || 0),
      totalKas: Number(kas?.totalKas || 0),
      status: kas?.status || "DRAFT",
    };
  });
}

export async function upsertAnggaranKas(data: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  triwulan1: number;
  triwulan2: number;
  triwulan3: number;
  triwulan4: number;
}) {
  const opd = await prisma.opd.findUnique({ where: { id: data.opdId } });
  if (!opd) throw new Error("OPD tidak valid");

  let kdUnit: string | null = null;
  let nmUnit: string | null = null;
  if (data.unitKerjaId) {
    const unit = await prisma.unitKerja.findUnique({
      where: { id: data.unitKerjaId },
    });
    if (unit) {
      kdUnit = unit.kd_unit;
      nmUnit = unit.nm_unit;
    }
  }

  const totalKas =
    data.triwulan1 + data.triwulan2 + data.triwulan3 + data.triwulan4;

  const existing = await prisma.anggaranKas.findFirst({
    where: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
    },
  });

  if (existing) {
    return await prisma.anggaranKas.update({
      where: { id: existing.id },
      data: {
        triwulan1: data.triwulan1,
        triwulan2: data.triwulan2,
        triwulan3: data.triwulan3,
        triwulan4: data.triwulan4,
        totalKas,
      },
    });
  }

  return await prisma.anggaranKas.create({
    data: {
      tahunAnggaran: data.tahunAnggaran,
      opdId: data.opdId,
      unitKerjaId: data.unitKerjaId || null,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      kd_unit: kdUnit || null,
      nm_unit: nmUnit || null,
      triwulan1: data.triwulan1,
      triwulan2: data.triwulan2,
      triwulan3: data.triwulan3,
      triwulan4: data.triwulan4,
      totalKas,
      status: "DRAFT",
    },
  });
}

function getKasTriwulanBreakdown(
  kas: {
    bulan1?: any;
    bulan2?: any;
    bulan3?: any;
    bulan4?: any;
    bulan5?: any;
    bulan6?: any;
    bulan7?: any;
    bulan8?: any;
    bulan9?: any;
    bulan10?: any;
    bulan11?: any;
    bulan12?: any;
    bulan1_ubah?: any;
    bulan2_ubah?: any;
    bulan3_ubah?: any;
    bulan4_ubah?: any;
    bulan5_ubah?: any;
    bulan6_ubah?: any;
    bulan7_ubah?: any;
    bulan8_ubah?: any;
    bulan9_ubah?: any;
    bulan10_ubah?: any;
    bulan11_ubah?: any;
    bulan12_ubah?: any;
  } | null | undefined,
  triwulan: 1 | 2 | 3 | 4
) {
  if (!kas) {
    return { b1: 0, b2: 0, b3: 0, nilai: 0 };
  }
  const val = (murni: any, ubah: any) =>
    Number(murni) || Number(ubah) || 0;

  if (triwulan === 1) {
    const b1 = val(kas.bulan1, kas.bulan1_ubah);
    const b2 = val(kas.bulan2, kas.bulan2_ubah);
    const b3 = val(kas.bulan3, kas.bulan3_ubah);
    return { b1, b2, b3, nilai: b1 + b2 + b3 };
  }
  if (triwulan === 2) {
    const b1 = val(kas.bulan4, kas.bulan4_ubah);
    const b2 = val(kas.bulan5, kas.bulan5_ubah);
    const b3 = val(kas.bulan6, kas.bulan6_ubah);
    return { b1, b2, b3, nilai: b1 + b2 + b3 };
  }
  if (triwulan === 3) {
    const b1 = val(kas.bulan7, kas.bulan7_ubah);
    const b2 = val(kas.bulan8, kas.bulan8_ubah);
    const b3 = val(kas.bulan9, kas.bulan9_ubah);
    return { b1, b2, b3, nilai: b1 + b2 + b3 };
  }
  const b1 = val(kas.bulan10, kas.bulan10_ubah);
  const b2 = val(kas.bulan11, kas.bulan11_ubah);
  const b3 = val(kas.bulan12, kas.bulan12_ubah);
  return { b1, b2, b3, nilai: b1 + b2 + b3 };
}

/**
 * Mengambil data lengkap SPD & acuan Anggaran Kas per 3 bulan untuk 1 OPD / Unit Kerja
 */
export async function getUnitSpdData(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
}) {
  const { tahunAnggaran, opdId, unitKerjaId } = params;

  const [opd, unit, lockInfo, bpkpadOpd] = await Promise.all([
    prisma.opd.findUnique({ where: { id: opdId } }),
    unitKerjaId
      ? prisma.unitKerja.findUnique({ where: { id: unitKerjaId } })
      : Promise.resolve(null),
    getAnggaranKasLockStatus({ tahunAnggaran, opdId, unitKerjaId }),
    prisma.opd.findFirst({
      where: { kd_skpd: { startsWith: "5.02" } },
      select: { kepalaNama: true, kepalaNip: true, kepalaJabatan: true },
    }),
  ]);

  if (!opd) throw new Error("OPD tidak ditemukan.");

  const isIndukUnit = Boolean(unit && unit.kd_unit.endsWith(".00"));
  const effectiveUnitId = unit && !isIndukUnit ? unit.id : null;

  let trskpdUnitFilter: any = {};
  if (unit) {
    if (isIndukUnit) {
      trskpdUnitFilter = {
        OR: [
          { unitKerjaId: unit.id },
          { unitKerjaId: null },
          { kd_unit: unit.kd_unit },
        ],
      };
    } else {
      trskpdUnitFilter = {
        OR: [{ unitKerjaId: unit.id }, { kd_unit: unit.kd_unit }],
      };
    }
  }

  // Ambil seluruh Sub Kegiatan & Rekening Belanja (Akun 5) beserta Anggaran Kas-nya
  const subkegList = await prisma.trskpd.findMany({
    where: {
      tahunAnggaran,
      opdId,
      ...trskpdUnitFilter,
      NOT: { kd_sub_kegiatan: { endsWith: ".00.0.00.00" } },
    },
    orderBy: [{ kd_sub_kegiatan: "asc" }],
    include: {
      rkaRekening: {
        where: { kd_rek6: { startsWith: "5" } },
        orderBy: [{ kd_rek6: "asc" }],
        include: {
          anggaranKasRekening: {
            where: { tahunAnggaran },
          },
        },
      },
    },
  });

  // Susun preview rincian Anggaran Kas per Triwulan (1..4)
  const triwulanSummaries: Record<
    1 | 2 | 3 | 4,
    {
      triwulan: 1 | 2 | 3 | 4;
      label: string;
      shortLabel: string;
      periode: string;
      bulanAwal: number;
      bulanAkhir: number;
      namaBulan: [string, string, string];
      totalKasTriwulan: number;
      jumlahRekening: number;
      items: Array<{
        trskpdId: string;
        trdrkaId: string;
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
        kd_rek6: string;
        nm_rek6: string;
        paguRka: number;
        b1: number;
        b2: number;
        b3: number;
        nilai: number;
      }>;
    }
  > = {
    1: {
      ...TRIWULAN_META[1],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    2: {
      ...TRIWULAN_META[2],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    3: {
      ...TRIWULAN_META[3],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    4: {
      ...TRIWULAN_META[4],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
  };

  let totalPaguRka = 0;
  let totalAnggaranKasSetahun = 0;

  for (const sk of subkegList) {
    for (const rek of sk.rkaRekening) {
      const pagu =
        rek.nilai_ubah !== null && rek.nilai_ubah !== undefined
          ? Number(rek.nilai_ubah)
          : Number(rek.nilai) || 0;
      totalPaguRka += pagu;

      const kas = rek.anggaranKasRekening?.[0];
      const kdUnit =
        unit?.kd_unit || rek.kd_unit || sk.kd_unit || `${opd.kd_skpd}.00`;
      const nmUnit = unit?.nm_unit || rek.nm_unit || sk.nm_unit || opd.nm_skpd;

      for (const tw of [1, 2, 3, 4] as const) {
        const { b1, b2, b3, nilai } = getKasTriwulanBreakdown(kas, tw);
        triwulanSummaries[tw].totalKasTriwulan += nilai;
        triwulanSummaries[tw].jumlahRekening += 1;
        totalAnggaranKasSetahun += nilai;

        triwulanSummaries[tw].items.push({
          trskpdId: sk.id,
          trdrkaId: rek.id,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          kd_unit: kdUnit,
          nm_unit: nmUnit,
          kd_program: sk.kd_program || rek.kd_program,
          nm_program: sk.nm_program || rek.nm_program,
          kd_kegiatan: sk.kd_kegiatan || rek.kd_kegiatan,
          nm_kegiatan: sk.nm_kegiatan || rek.nm_kegiatan,
          kd_sub_kegiatan: sk.kd_sub_kegiatan,
          nm_sub_kegiatan: sk.nm_sub_kegiatan,
          kd_rek6: rek.kd_rek6,
          nm_rek6: rek.nm_rek6,
          paguRka: pagu,
          b1,
          b2,
          b3,
          nilai,
        });
      }
    }
  }

  // Ambil daftar baris SPD yang sudah diterbitkan di tabel tr_spd (menggunakan raw SQL agar tahan terhadap cache DMMF server dev)
  const spdRowsRaw: any[] = effectiveUnitId
    ? await prisma.$queryRaw`
        SELECT
          "id", "tahunAnggaran", "no_spd", "tgl_spd", "opdId", "unitKerjaId",
          "trskpdId", "trdrkaId", "kd_skpd", "nm_skpd", "kd_unit", "nm_unit",
          "kd_program", "nm_program", "kd_kegiatan", "nm_kegiatan",
          "kd_sub_kegiatan", "nm_sub_kegiatan", "kd_rek6", "nm_rek6",
          "nilai", "triwulan", "periode", "bulan_awal", "bulan_akhir",
          "keterangan", "status"
        FROM "tr_spd"
        WHERE "tahunAnggaran" = ${tahunAnggaran}
          AND "opdId" = ${opdId}
          AND ("unitKerjaId" = ${effectiveUnitId} OR "kd_unit" = ${unit?.kd_unit || ""})
        ORDER BY "triwulan" ASC, "kd_sub_kegiatan" ASC, "kd_rek6" ASC
      `
    : await prisma.$queryRaw`
        SELECT
          "id", "tahunAnggaran", "no_spd", "tgl_spd", "opdId", "unitKerjaId",
          "trskpdId", "trdrkaId", "kd_skpd", "nm_skpd", "kd_unit", "nm_unit",
          "kd_program", "nm_program", "kd_kegiatan", "nm_kegiatan",
          "kd_sub_kegiatan", "nm_sub_kegiatan", "kd_rek6", "nm_rek6",
          "nilai", "triwulan", "periode", "bulan_awal", "bulan_akhir",
          "keterangan", "status"
        FROM "tr_spd"
        WHERE "tahunAnggaran" = ${tahunAnggaran}
          AND "opdId" = ${opdId}
        ORDER BY "triwulan" ASC, "kd_sub_kegiatan" ASC, "kd_rek6" ASC
      `;

  const spdRows = spdRowsRaw.map((r) => ({
    id: r.id,
    tahunAnggaran: Number(r.tahunAnggaran),
    no_spd: r.no_spd,
    tgl_spd: r.tgl_spd,
    opdId: r.opdId,
    unitKerjaId: r.unitKerjaId,
    trskpdId: r.trskpdId,
    trdrkaId: r.trdrkaId,
    kd_skpd: r.kd_skpd,
    nm_skpd: r.nm_skpd,
    kd_unit: r.kd_unit,
    nm_unit: r.nm_unit,
    kd_program: r.kd_program,
    nm_program: r.nm_program,
    kd_kegiatan: r.kd_kegiatan,
    nm_kegiatan: r.nm_kegiatan,
    kd_sub_kegiatan: r.kd_sub_kegiatan,
    nm_sub_kegiatan: r.nm_sub_kegiatan,
    kd_rek6: r.kd_rek6,
    nm_rek6: r.nm_rek6,
    nilai: Number(r.nilai) || 0,
    triwulan: Number(r.triwulan) || 1,
    periode: r.periode,
    bulan_awal: Number(r.bulan_awal) || 1,
    bulan_akhir: Number(r.bulan_akhir) || 3,
    keterangan: r.keterangan,
    status: r.status,
  }));

  // Ringkasan Dokumen SPD per Triwulan
  const spdByTriwulan: Record<
    number,
    {
      no_spd: string;
      tgl_spd: Date;
      triwulan: number;
      periode: string;
      bulan_awal: number;
      bulan_akhir: number;
      keterangan: string | null;
      status: string;
      jumlahBaris: number;
      totalNilaiSpd: number;
    }
  > = {};

  // Ringkasan Dokumen SPD berdasarkan Nomor SPD (no_spd) Terbit
  const nomorMap = new Map<
    string,
    {
      no_spd: string;
      tgl_spd: Date;
      triwulan: number;
      periode: string;
      bulan_awal: number;
      bulan_akhir: number;
      kd_skpd: string;
      nm_skpd: string;
      keterangan: string | null;
      status: string;
      subkegSet: Set<string>;
      jumlahSubKegiatan: number;
      jumlahBaris: number;
      totalNilaiSpd: number;
    }
  >();

  for (const row of spdRows) {
    if (!spdByTriwulan[row.triwulan]) {
      spdByTriwulan[row.triwulan] = {
        no_spd: row.no_spd,
        tgl_spd: row.tgl_spd,
        triwulan: row.triwulan,
        periode: row.periode,
        bulan_awal: row.bulan_awal,
        bulan_akhir: row.bulan_akhir,
        keterangan: row.keterangan,
        status: row.status,
        jumlahBaris: 0,
        totalNilaiSpd: 0,
      };
    }
    spdByTriwulan[row.triwulan].jumlahBaris += 1;
    spdByTriwulan[row.triwulan].totalNilaiSpd += row.nilai;

    const existingNomor = nomorMap.get(row.no_spd);
    if (!existingNomor) {
      const subkegSet = new Set<string>([row.kd_sub_kegiatan]);
      nomorMap.set(row.no_spd, {
        no_spd: row.no_spd,
        tgl_spd: row.tgl_spd,
        triwulan: row.triwulan,
        periode: row.periode,
        bulan_awal: row.bulan_awal,
        bulan_akhir: row.bulan_akhir,
        kd_skpd: row.kd_skpd,
        nm_skpd: row.nm_skpd,
        keterangan: row.keterangan,
        status: row.status,
        subkegSet,
        jumlahSubKegiatan: 1,
        jumlahBaris: 1,
        totalNilaiSpd: row.nilai,
      });
    } else {
      existingNomor.subkegSet.add(row.kd_sub_kegiatan);
      existingNomor.jumlahSubKegiatan = existingNomor.subkegSet.size;
      existingNomor.jumlahBaris += 1;
      existingNomor.totalNilaiSpd += row.nilai;
    }
  }

  const spdSummaryByNomor = Array.from(nomorMap.values())
    .sort((a, b) => a.triwulan - b.triwulan || a.no_spd.localeCompare(b.no_spd))
    .map(({ subkegSet, ...rest }) => rest);

  return {
    opdInfo: {
      id: opd.id,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      kepalaNama: opd.kepalaNama || "-",
      kepalaNip: opd.kepalaNip || "-",
      kepalaJabatan: opd.kepalaJabatan || `Kepala ${opd.nm_skpd}`,
    },
    ppkdInfo: {
      nama: bpkpadOpd?.kepalaNama || "M. FRANANDA, S.E, M.M",
      pangkat: "PEMBINA UTAMA MUDA",
      nip: bpkpadOpd?.kepalaNip || "19800723 200312 1 002",
    },
    isAnggaranKasLocked: lockInfo.isLocked,
    anggaranKasStatus: lockInfo.status,
    totalPaguRka,
    totalAnggaranKasSetahun,
    triwulanSummaries,
    spdByTriwulan,
    spdSummaryByNomor,
    spdRows,
  };
}

/**
 * Menerbitkan / Menyimpan Dokumen SPD per 3 Bulan (Triwulan) berdasarkan Anggaran Kas yang sudah DIKUNCI
 */
export async function generateSpdTriwulan(data: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  triwulan: 1 | 2 | 3 | 4;
  no_spd: string;
  tgl_spd?: Date;
  keterangan?: string | null;
}) {
  const { tahunAnggaran, opdId, unitKerjaId, triwulan, no_spd, tgl_spd, keterangan } =
    data;

  if (![1, 2, 3, 4].includes(triwulan)) {
    throw new Error("Periode Triwulan tidak valid (harus 1, 2, 3, atau 4).");
  }
  if (!no_spd || !no_spd.trim()) {
    throw new Error("Nomor SPD (no_spd) wajib diisi.");
  }

  // Syarat wajib: Anggaran Kas OPD/Unit harus sudah berstatus DIKUNCI
  const lockInfo = await getAnggaranKasLockStatus({
    tahunAnggaran,
    opdId,
    unitKerjaId,
  });

  if (!lockInfo.isLocked) {
    throw new Error(
      `Anggaran Kas untuk Perangkat Daerah ini pada TA ${tahunAnggaran} belum DIKUNCI. Silakan kunci Anggaran Kas terlebih dahulu sebelum menerbitkan SPD.`
    );
  }

  const unit = unitKerjaId
    ? await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } })
    : null;
  const isIndukUnit = Boolean(unit && unit.kd_unit.endsWith(".00"));
  const effectiveUnitId = unit && !isIndukUnit ? unit.id : null;

  const unitSpdData = await getUnitSpdData({
    tahunAnggaran,
    opdId,
    unitKerjaId,
  });

  const twData = unitSpdData.triwulanSummaries[triwulan];
  if (!twData || twData.items.length === 0) {
    throw new Error(
      `Tidak ditemukan rekening belanja RKA (Akun 5) pada Unit Kerja ini untuk TA ${tahunAnggaran}. Pastikan Sub Kegiatan & Rekening Belanja RKA telah diinput.`
    );
  }

  const meta = TRIWULAN_META[triwulan];
  const tanggalDokumen = tgl_spd || new Date();
  const cleanNoSpd = no_spd.trim();
  const cleanKeterangan = keterangan?.trim() || null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Hapus baris SPD lama pada triwulan & unit yang sama agar tidak duplikat saat diperbarui
    if (effectiveUnitId) {
      await tx.$executeRaw`
        DELETE FROM "tr_spd"
        WHERE "tahunAnggaran" = ${tahunAnggaran}
          AND "opdId" = ${opdId}
          AND "unitKerjaId" = ${effectiveUnitId}
          AND "triwulan" = ${triwulan}
      `;
    } else {
      await tx.$executeRaw`
        DELETE FROM "tr_spd"
        WHERE "tahunAnggaran" = ${tahunAnggaran}
          AND "opdId" = ${opdId}
          AND "triwulan" = ${triwulan}
      `;
    }

    for (const item of twData.items) {
      const id = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "tr_spd" (
          "id", "tahunAnggaran", "no_spd", "tgl_spd", "opdId", "unitKerjaId",
          "trskpdId", "trdrkaId", "kd_skpd", "nm_skpd", "kd_unit", "nm_unit",
          "kd_program", "nm_program", "kd_kegiatan", "nm_kegiatan",
          "kd_sub_kegiatan", "nm_sub_kegiatan", "kd_rek6", "nm_rek6",
          "nilai", "triwulan", "periode", "bulan_awal", "bulan_akhir",
          "keterangan", "status", "createdAt", "updatedAt"
        ) VALUES (
          ${id}, ${tahunAnggaran}, ${cleanNoSpd}, ${tanggalDokumen}, ${opdId}, ${effectiveUnitId},
          ${item.trskpdId}, ${item.trdrkaId}, ${item.kd_skpd}, ${item.nm_skpd}, ${item.kd_unit}, ${item.nm_unit},
          ${item.kd_program}, ${item.nm_program}, ${item.kd_kegiatan}, ${item.nm_kegiatan},
          ${item.kd_sub_kegiatan}, ${item.nm_sub_kegiatan}, ${item.kd_rek6}, ${item.nm_rek6},
          ${item.nilai}, ${triwulan}, ${meta.periode}, ${meta.bulanAwal}, ${meta.bulanAkhir},
          ${cleanKeterangan}, 'AKTIF', ${now}, ${now}
        )
      `;
    }
  });

  return {
    no_spd: cleanNoSpd,
    triwulan,
    periode: meta.periode,
    jumlahRekening: twData.items.length,
    totalNilai: twData.totalKasTriwulan,
  };
}

/**
 * Menghapus dokumen SPD untuk Triwulan / Nomor SPD tertentu pada Unit Kerja
 */
export async function deleteSpdTriwulan(params: {
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  triwulan?: number;
  no_spd?: string;
}) {
  const { tahunAnggaran, opdId, unitKerjaId, triwulan, no_spd } = params;

  const unit = unitKerjaId
    ? await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } })
    : null;
  const isIndukUnit = Boolean(unit && unit.kd_unit.endsWith(".00"));
  const effectiveUnitId = unit && !isIndukUnit ? unit.id : null;

  let deletedCount = 0;
  if (triwulan && effectiveUnitId) {
    deletedCount = await prisma.$executeRaw`
      DELETE FROM "tr_spd"
      WHERE "tahunAnggaran" = ${tahunAnggaran}
        AND "opdId" = ${opdId}
        AND "unitKerjaId" = ${effectiveUnitId}
        AND "triwulan" = ${triwulan}
    `;
  } else if (triwulan) {
    deletedCount = await prisma.$executeRaw`
      DELETE FROM "tr_spd"
      WHERE "tahunAnggaran" = ${tahunAnggaran}
        AND "opdId" = ${opdId}
        AND "triwulan" = ${triwulan}
    `;
  } else if (no_spd) {
    deletedCount = await prisma.$executeRaw`
      DELETE FROM "tr_spd"
      WHERE "tahunAnggaran" = ${tahunAnggaran}
        AND "opdId" = ${opdId}
        AND "no_spd" = ${no_spd}
    `;
  } else {
    deletedCount = await prisma.$executeRaw`
      DELETE FROM "tr_spd"
      WHERE "tahunAnggaran" = ${tahunAnggaran}
        AND "opdId" = ${opdId}
    `;
  }

  return { deletedCount: Number(deletedCount) || 0 };
}
