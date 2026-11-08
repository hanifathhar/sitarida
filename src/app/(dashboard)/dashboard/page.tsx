import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getSelectedTahunAnggaranId } from "@/lib/session";
import { getActiveTahunAnggaran } from "@/modules/master-data/master-data.service";
import { formatTanggal } from "@/lib/utils";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import {
  Building2,
  GitBranch,
  BookOpen,
  Layers,
  FolderKanban,
  ListChecks,
  Wallet,
  History,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const cookieTahunId = await getSelectedTahunAnggaranId();
  const activeTa = await getActiveTahunAnggaran(
    cookieTahunId || session?.tahunAnggaranId
  );

  if (!session || !activeTa) return null;

  const [
    opdCount,
    unitKerjaCount,
    rek1Count,
    rek2Count,
    rek3Count,
    rek4Count,
    rek5Count,
    rek6Count,
    programCount,
    kegiatanCount,
    subkegiatanCount,
    sumberDanaCount,
    recentAudits,
  ] = await Promise.all([
    prisma.opd.count({
      where: session.isCrossOpd ? {} : { id: session.opdId || "" },
    }),
    prisma.unitKerja.count({
      where: session.isCrossOpd ? {} : { opdId: session.opdId || "" },
    }),
    prisma.msRek1.count(),
    prisma.msRek2.count(),
    prisma.msRek3.count(),
    prisma.msRek4.count(),
    prisma.msRek5.count(),
    prisma.msRek6.count(),
    prisma.program.count(),
    prisma.kegiatan.count(),
    prisma.subkegiatan.count(),
    prisma.sumberDana.count(),
    prisma.auditLog.findMany({
      where: session.isCrossOpd ? {} : { opdId: session.opdId || undefined },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const totalRekeningAllLevels =
    rek1Count + rek2Count + rek3Count + rek4Count + rek5Count + rek6Count;

  // 4 Kartu Utama di dalam Kontainer Putih (Persis gaya referensi eSPJ CAKRA namun Merah & Putih)
  const topCards = [
    {
      title: `Total Pagu Indikatif (TA ${activeTa.tahun})`,
      mainValue: "214.717.000",
      percent: "24%",
      subPill: "Pagu: 879.105.402",
      href: "/master/tahun-anggaran",
    },
    {
      title: "Realisasi / Usulan Tahap 1 (Murni)",
      mainValue: "184.817.000",
      percent: "21%",
      subPill: "RKA: 236.217.000 (78%)",
      href: "/master/rekening",
    },
    {
      title: "Usulan Tahap 2 (Pergeseran)",
      mainValue: "29.900.000",
      percent: "3%",
      subPill: "RKA: 88.490.000 (34%)",
      href: "/master/program",
    },
    {
      title: "Usulan Tahap 3 (Perubahan)",
      mainValue: "0",
      percent: "0%",
      subPill: "RKA: 30.750.000 (0%)",
      href: "/master/subkegiatan",
    },
  ];

  const masterModules = [
    {
      label: "1. Master Rekening (ms_rek1..6)",
      count: `${totalRekeningAllLevels} Kode (${rek6Count} Sub Rincian)`,
      href: "/master/rekening",
      icon: BookOpen,
    },
    {
      label: "2. Master OPD (ms_opd)",
      count: `${opdCount} Perangkat Daerah`,
      href: "/master/opd",
      icon: Building2,
    },
    {
      label: "3. Master Unit (ms_unit)",
      count: `${unitKerjaCount} Unit Kerja / UPT`,
      href: "/master/unit",
      icon: GitBranch,
    },
    {
      label: `4. Master Program (TA ${activeTa.tahun})`,
      count: `${programCount} Program Terdaftar`,
      href: "/master/program",
      icon: Layers,
    },
    {
      label: `5. Master Kegiatan (TA ${activeTa.tahun})`,
      count: `${kegiatanCount} Kegiatan Terdaftar`,
      href: "/master/kegiatan",
      icon: FolderKanban,
    },
    {
      label: `6. Sub Kegiatan & 7. Sumber Dana`,
      count: `${subkegiatanCount} Subkegiatan • ${sumberDanaCount} Sumber Dana`,
      href: "/master/subkegiatan",
      icon: ListChecks,
    },
  ];

  return (
    <div className="space-y-4">
      {/* BARIS 1: KONTAINER PUTIH BERISI 4 KARTU MERAH SOLID */}
      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-[#88131A] hover:bg-[#991B1B] text-white rounded-xl p-4 shadow-cakra-kpi transition-all flex flex-col justify-between"
            >
              <div className="text-xs font-medium text-red-100">
                {card.title}
              </div>

              <div className="my-3 flex items-center justify-between gap-2">
                <div className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white">
                  {card.mainValue}
                </div>
                <div className="w-11 h-11 rounded-full bg-[#4C0A0E] border border-red-400/25 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-inner">
                  {card.percent}
                </div>
              </div>

              <div className="bg-[#A8242C] rounded-md px-3 py-1.5 text-xs font-bold text-white">
                {card.subPill}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* BARIS 2: DUA GRAFIK SIDE-BY-SIDE */}
      <DashboardCharts />

      {/* BARIS 3: PINTASAN 7 MODUL MASTER DATA & LOG AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white rounded-xl p-5 shadow-cakra-card border border-gray-200/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-[#5E0E14]">
              7 Modul Master Data Utama (CRUD Lengkap + Filter + Pagination)
            </h3>
            <Link
              href="/master/sumber-dana"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-50 text-[#991B1B] border border-red-200 text-[11px] font-bold hover:bg-red-100"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>7. Sumber Dana ({sumberDanaCount})</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {masterModules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.label}
                  href={m.href}
                  className="p-3 rounded-lg border border-gray-200 hover:border-[#991B1B] hover:bg-red-50/40 transition-all flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-[#991B1B] text-white shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      {m.label}
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                      {m.count}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Log Audit Terbaru */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 shadow-cakra-card border border-gray-200/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-[#5E0E14] flex items-center gap-2">
              <History className="w-4 h-4 text-[#991B1B]" />
              <span>Aktivitas Audit Terbaru</span>
            </h3>
            <Link
              href="/admin/audit-log"
              className="text-xs font-bold text-[#991B1B] hover:underline"
            >
              Semua Log →
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {recentAudits.map((log) => (
              <div
                key={log.id}
                className="py-2 flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-red-50 text-[#991B1B] border border-red-200 font-mono text-[10px] font-bold">
                      {log.aksi}
                    </span>
                    <span className="font-bold text-gray-800 truncate">
                      {log.username}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 truncate mt-0.5">
                    {log.deskripsi}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {formatTanggal(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
