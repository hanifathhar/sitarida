import { prisma } from "@/lib/prisma";

export interface PenetapanUpItemPayload {
  opdId: string;
  kd_skpd: string;
  nm_skpd: string;
  no_sk?: string | null;
  tgl_sk?: string | null;
  nominalUp: number;
  nominalKkpd: number;
  bankKkpd?: string | null;
  keterangan?: string | null;
  status?: string;
}

export interface PengaturanUpFilter {
  tahunAnggaran: number;
  search?: string;
}

export async function getPengaturanUpData(filter: PengaturanUpFilter) {
  const { tahunAnggaran, search } = filter;

  // 1. Ambil seluruh OPD aktif
  const opds = await prisma.opd.findMany({
    where: { isActive: true },
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

  // 2. Ambil data penetapan UP & UP-KKPD yang sudah tersimpan
  const penetapanList = await prisma.penetapanUp.findMany({
    where: { tahunAnggaran },
  });
  const penetapanMap = new Map<string, (typeof penetapanList)[0]>();
  penetapanList.forEach((p) => {
    penetapanMap.set(p.opdId, p);
  });

  // 3. Ambil data Pagu Belanja (Akun 5) dari tabel trdrka per OPD
  const belanjaRows = await prisma.trdrka.findMany({
    where: {
      tahunAnggaran,
      kd_rek6: { startsWith: "5" },
    },
    select: {
      kd_skpd: true,
      nilai: true,
      nilai_ubah: true,
    },
  });

  const belanjaMap = new Map<
    string,
    { paguMurni: number; paguUbah: number }
  >();
  belanjaRows.forEach((r) => {
    const cur = belanjaMap.get(r.kd_skpd) || { paguMurni: 0, paguUbah: 0 };
    cur.paguMurni += Number(r.nilai) || 0;
    cur.paguUbah +=
      r.nilai_ubah !== null && r.nilai_ubah !== undefined
        ? Number(r.nilai_ubah)
        : Number(r.nilai) || 0;
    belanjaMap.set(r.kd_skpd, cur);
  });

  // 4. Susun daftar lengkap per SKPD
  let totalPaguBelanja = 0;
  let totalNominalUp = 0;
  let totalNominalKkpd = 0;
  let totalSkpdDitetapkan = 0;

  const items = opds.map((opd) => {
    const belanja = belanjaMap.get(opd.kd_skpd) || {
      paguMurni: 0,
      paguUbah: 0,
    };
    const penetapan = penetapanMap.get(opd.id);

    const paguBelanja = belanja.paguUbah > 0 ? belanja.paguUbah : belanja.paguMurni;
    const nominalUp = penetapan ? Number(penetapan.nominalUp) || 0 : 0;
    const nominalKkpd = penetapan ? Number(penetapan.nominalKkpd) || 0 : 0;
    const totalUpSkpd = nominalUp + nominalKkpd;

    totalPaguBelanja += paguBelanja;
    totalNominalUp += nominalUp;
    totalNominalKkpd += nominalKkpd;
    if (nominalUp > 0 || nominalKkpd > 0 || penetapan?.no_sk) {
      totalSkpdDitetapkan += 1;
    }

    const persenUp =
      paguBelanja > 0 ? (totalUpSkpd / paguBelanja) * 100 : 0;

    return {
      opdId: opd.id,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      singkatan: opd.singkatan,
      kepalaNama: opd.kepalaNama,
      kepalaNip: opd.kepalaNip,
      paguBelanjaMurni: belanja.paguMurni,
      paguBelanjaUbah: belanja.paguUbah,
      paguBelanja,
      no_sk: penetapan?.no_sk || null,
      tgl_sk: penetapan?.tgl_sk ? penetapan.tgl_sk.toISOString().split("T")[0] : null,
      nominalUp,
      nominalKkpd,
      totalUp: totalUpSkpd,
      persenUp,
      bankKkpd: penetapan?.bankKkpd || "Bank Sumut",
      keterangan: penetapan?.keterangan || null,
      status: penetapan?.status || "BELUM_DITETAPKAN",
      ditetapkanOleh: penetapan?.ditetapkanOleh || null,
      updatedAt: penetapan?.updatedAt || null,
    };
  });

  // Filter pencarian jika ada
  let filteredItems = items;
  if (search && search.trim()) {
    const q = search.toLowerCase();
    filteredItems = items.filter(
      (it) =>
        it.kd_skpd.toLowerCase().includes(q) ||
        it.nm_skpd.toLowerCase().includes(q) ||
        (it.no_sk && it.no_sk.toLowerCase().includes(q))
    );
  }

  return {
    tahunAnggaran,
    summary: {
      totalSkpd: opds.length,
      totalSkpdDitetapkan,
      totalPaguBelanja,
      totalNominalUp,
      totalNominalKkpd,
      totalSemuaUp: totalNominalUp + totalNominalKkpd,
      rasioUpTerhadapBelanja:
        totalPaguBelanja > 0
          ? ((totalNominalUp + totalNominalKkpd) / totalPaguBelanja) * 100
          : 0,
    },
    items: filteredItems,
  };
}

export async function saveSinglePenetapanUp(data: {
  tahunAnggaran: number;
  opdId: string;
  no_sk?: string | null;
  tgl_sk?: string | null;
  nominalUp: number;
  nominalKkpd: number;
  bankKkpd?: string | null;
  keterangan?: string | null;
  status?: string;
  userNama?: string;
}) {
  const {
    tahunAnggaran,
    opdId,
    no_sk,
    tgl_sk,
    nominalUp,
    nominalKkpd,
    bankKkpd,
    keterangan,
    status = "DITETAPKAN",
    userNama,
  } = data;

  const opd = await prisma.opd.findUnique({
    where: { id: opdId },
    select: { kd_skpd: true, nm_skpd: true },
  });
  if (!opd) {
    throw new Error("Perangkat Daerah (OPD) tidak ditemukan");
  }

  const parsedDate = tgl_sk ? new Date(tgl_sk) : null;

  const result = await prisma.penetapanUp.upsert({
    where: {
      tahunAnggaran_opdId: {
        tahunAnggaran,
        opdId,
      },
    },
    create: {
      tahunAnggaran,
      opdId,
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      no_sk: no_sk || null,
      tgl_sk: parsedDate,
      nominalUp,
      nominalKkpd,
      bankKkpd: bankKkpd || "Bank Sumut",
      keterangan: keterangan || null,
      status,
      ditetapkanOleh: userNama || "BUD",
    },
    update: {
      kd_skpd: opd.kd_skpd,
      nm_skpd: opd.nm_skpd,
      no_sk: no_sk || null,
      tgl_sk: parsedDate,
      nominalUp,
      nominalKkpd,
      bankKkpd: bankKkpd || "Bank Sumut",
      keterangan: keterangan || null,
      status,
      ditetapkanOleh: userNama || "BUD",
    },
  });

  return result;
}

export async function bulkSavePenetapanUp(data: {
  tahunAnggaran: number;
  no_sk?: string | null;
  tgl_sk?: string | null;
  bankKkpd?: string | null;
  items: Array<{
    opdId: string;
    nominalUp: number;
    nominalKkpd: number;
    keterangan?: string | null;
  }>;
  userNama?: string;
}) {
  const { tahunAnggaran, no_sk, tgl_sk, bankKkpd, items, userNama } = data;
  const parsedDate = tgl_sk ? new Date(tgl_sk) : null;

  const results = await prisma.$transaction(async (tx) => {
    const saved = [];
    for (const item of items) {
      const opd = await tx.opd.findUnique({
        where: { id: item.opdId },
        select: { kd_skpd: true, nm_skpd: true },
      });
      if (!opd) continue;

      const row = await tx.penetapanUp.upsert({
        where: {
          tahunAnggaran_opdId: {
            tahunAnggaran,
            opdId: item.opdId,
          },
        },
        create: {
          tahunAnggaran,
          opdId: item.opdId,
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          no_sk: no_sk || null,
          tgl_sk: parsedDate,
          nominalUp: item.nominalUp,
          nominalKkpd: item.nominalKkpd,
          bankKkpd: bankKkpd || "Bank Sumut",
          keterangan: item.keterangan || null,
          status: "DITETAPKAN",
          ditetapkanOleh: userNama || "BUD",
        },
        update: {
          kd_skpd: opd.kd_skpd,
          nm_skpd: opd.nm_skpd,
          no_sk: no_sk || null,
          tgl_sk: parsedDate,
          nominalUp: item.nominalUp,
          nominalKkpd: item.nominalKkpd,
          bankKkpd: bankKkpd || "Bank Sumut",
          keterangan: item.keterangan || null,
          status: "DITETAPKAN",
          ditetapkanOleh: userNama || "BUD",
        },
      });
      saved.push(row);
    }
    return saved;
  });

  return results;
}

