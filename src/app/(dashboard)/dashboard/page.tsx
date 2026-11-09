import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession, getSelectedTahunAnggaranId } from "@/lib/session";
import { getActiveTahunAnggaran } from "@/modules/master-data/master-data.service";
import ApbdDashboardView, {
  ApbdCategoryItem,
  SkpdStatItem,
} from "@/components/dashboard/ApbdDashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const cookieTahunId = await getSelectedTahunAnggaranId();
  const activeTa = await getActiveTahunAnggaran(
    cookieTahunId || session?.tahunAnggaranId
  );

  if (!session || !activeTa) return null;

  const tahunLogin = activeTa.tahun;
  const isCrossOpd = Boolean(session.isCrossOpd);

  // Ambil seluruh daftar OPD aktif & rincian Rekening RKA (trdrka) sesuai Tahun Anggaran Login
  const [opdList, rkaRekeningList] = await Promise.all([
    prisma.opd.findMany({
      where: isCrossOpd
        ? { isActive: true }
        : session.opdId
          ? { id: session.opdId }
          : { isActive: true },
      orderBy: { kd_skpd: "asc" },
      select: {
        id: true,
        kd_skpd: true,
        nm_skpd: true,
      },
    }),
    prisma.trdrka.findMany({
      where: {
        tahunAnggaran: tahunLogin,
        ...(!isCrossOpd && session.opdKode
          ? { kd_skpd: session.opdKode }
          : !isCrossOpd && session.opdId
            ? { trskpd: { opdId: session.opdId } }
            : {}),
      },
      select: {
        kd_skpd: true,
        nm_skpd: true,
        kd_rek6: true,
        nilai: true,
        nilai_ubah: true,
      },
    }),
  ]);

  let totalPendapatan = 0;
  let totalBelanja = 0;
  let totalPenerimaanPembiayaan = 0;
  let totalPengeluaranPembiayaan = 0;

  const skpdMap = new Map<string, SkpdStatItem>();
  for (const o of opdList) {
    skpdMap.set(o.kd_skpd, {
      opdId: o.id,
      kd_skpd: o.kd_skpd,
      nm_skpd: o.nm_skpd,
      pendapatan: 0,
      belanja: 0,
      penerimaan: 0,
      pengeluaran: 0,
    });
  }

  for (const rek of rkaRekeningList) {
    // Gunakan nilai_ubah (Nilai Perubahan) sebagai acuan anggaran sesuai instruksi
    const nilaiPerubahan =
      rek.nilai_ubah !== null && rek.nilai_ubah !== undefined
        ? Number(rek.nilai_ubah)
        : Number(rek.nilai) || 0;

    const kode = (rek.kd_rek6 || "").trim();
    const stat = skpdMap.get(rek.kd_skpd);

    if (kode.startsWith("4")) {
      totalPendapatan += nilaiPerubahan;
      if (stat) stat.pendapatan += nilaiPerubahan;
    } else if (kode.startsWith("5")) {
      totalBelanja += nilaiPerubahan;
      if (stat) stat.belanja += nilaiPerubahan;
    } else if (kode.startsWith("6.2")) {
      totalPengeluaranPembiayaan += nilaiPerubahan;
      if (stat) stat.pengeluaran += nilaiPerubahan;
    } else if (kode.startsWith("6")) {
      totalPenerimaanPembiayaan += nilaiPerubahan;
      if (stat) stat.penerimaan += nilaiPerubahan;
    }
  }

  // Realisasi sementara di-default 0 karena belum terdapat tabel realisasi
  const categories: ApbdCategoryItem[] = [
    {
      key: "PENDAPATAN",
      shortLabel: "Pendapatan",
      fullLabel: "Pendapatan Daerah",
      anggaran: totalPendapatan,
      realisasiRiil: 0,
      realisasiRencana: 0,
    },
    {
      key: "BELANJA",
      shortLabel: "Belanja",
      fullLabel: "Belanja Daerah",
      anggaran: totalBelanja,
      realisasiRiil: 0,
      realisasiRencana: 0,
    },
    {
      key: "PENERIMAAN",
      shortLabel: "Penerimaan",
      fullLabel: "Penerimaan Pembiayaan",
      anggaran: totalPenerimaanPembiayaan,
      realisasiRiil: 0,
      realisasiRencana: 0,
    },
    {
      key: "PENGELUARAN",
      shortLabel: "Pengeluaran",
      fullLabel: "Pengeluaran Pembiayaan",
      anggaran: totalPengeluaranPembiayaan,
      realisasiRiil: 0,
      realisasiRencana: 0,
    },
  ];

  // Hitung informasi Kartu JADWAL dari TahunAnggaran aktif
  const createdAtDate = activeTa.createdAt
    ? new Date(activeTa.createdAt)
    : new Date();
  const diffMs = Math.max(0, Date.now() - createdAtDate.getTime());
  const hariBerjalan = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const mulaiTanggal = createdAtDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const opdScopeLabel =
    !isCrossOpd && session.opdNama
      ? `${session.opdKode ? `[${session.opdKode}] ` : ""}${session.opdNama}`
      : "";

  return (
    <ApbdDashboardView
      tahun={tahunLogin}
      tahapNama={activeTa.tahapAktif || "PERUBAHAN"}
      statusTa={activeTa.status || "AKTIF"}
      mulaiTanggal={mulaiTanggal}
      hariBerjalan={hariBerjalan}
      opdScopeLabel={opdScopeLabel}
      categories={categories}
      skpdStats={Array.from(skpdMap.values())}
    />
  );
}
