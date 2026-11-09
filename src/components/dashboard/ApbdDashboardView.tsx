"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  ArrowDownToLine,
  ShieldCheck,
  ShoppingBag,
  Orbit,
  MinusCircle,
  FileText,
  X,
  Search,
  Building2,
} from "lucide-react";

export interface ApbdCategoryItem {
  key: "PENDAPATAN" | "BELANJA" | "PENERIMAAN" | "PENGELUARAN";
  shortLabel: string;
  fullLabel: string;
  anggaran: number;
  realisasiRiil: number;
  realisasiRencana: number;
}

export interface SkpdStatItem {
  opdId: string;
  kd_skpd: string;
  nm_skpd: string;
  pendapatan: number;
  belanja: number;
  penerimaan: number;
  pengeluaran: number;
}

interface ApbdDashboardViewProps {
  tahun: number;
  tahapNama: string;
  statusTa: string;
  mulaiTanggal: string;
  hariBerjalan: number;
  opdScopeLabel: string;
  categories: ApbdCategoryItem[];
  skpdStats: SkpdStatItem[];
}

/**
 * Format angka ke format Rupiah dengan 2 desimal seperti pada referensi gambar:
 * contoh: Rp 1.556.814.563.820,00 atau Rp0,00
 */
function formatRupiahDesimal(val: number, withSpace: boolean = true): string {
  const safeVal = Number(val) || 0;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
  return `${withSpace ? "Rp " : "Rp"}${formatted}`;
}

/**
 * Format angka singkat untuk label di atas batang grafik:
 * contoh: 1,56 T / 300 M / 14,13 Jt / 604,2 Rb / 0
 */
function formatShortId(val: number): string {
  const n = Number(val) || 0;
  if (n <= 0) return "0";
  if (n >= 1_000_000_000_000) {
    return (
      (n / 1_000_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " T"
    );
  }
  if (n >= 1_000_000_000) {
    return (
      (n / 1_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " M"
    );
  }
  if (n >= 1_000_000) {
    return (
      (n / 1_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " Jt"
    );
  }
  if (n >= 1_000) {
    return (
      (n / 1_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }) + " Rb"
    );
  }
  return n.toLocaleString("id-ID");
}

export default function ApbdDashboardView({
  tahun,
  tahapNama,
  statusTa,
  mulaiTanggal,
  hariBerjalan,
  opdScopeLabel,
  categories,
  skpdStats,
}: ApbdDashboardViewProps) {
  const [selectedKey, setSelectedKey] = useState<
    "PENDAPATAN" | "BELANJA" | "PENERIMAAN" | "PENGELUARAN"
  >("BELANJA");
  const [showSkpdModal, setShowSkpdModal] = useState(false);
  const [searchSkpd, setSearchSkpd] = useState("");

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const selectedCategory = useMemo(() => {
    return (
      categories.find((c) => c.key === selectedKey) ||
      categories[0] || {
        key: "PENGELUARAN",
        shortLabel: "Pengeluaran",
        fullLabel: "Pengeluaran Pembiayaan",
        anggaran: 0,
        realisasiRiil: 0,
        realisasiRencana: 0,
      }
    );
  }, [categories, selectedKey]);

  // Hitung skala sumbu Y untuk Grafik APBD secara dinamis berdasarkan nilai maksimum
  const chartScale = useMemo(() => {
    const allValues = categories.flatMap((c) => [
      c.anggaran,
      c.realisasiRiil,
      c.realisasiRencana,
    ]);
    const maxVal = Math.max(...allValues, 0);

    if (maxVal === 0) {
      return {
        maxAxis: 2_000_000_000_000,
        ticks: [
          { value: 2_000_000_000_000, label: "2 T" },
          { value: 1_500_000_000_000, label: "1,5 T" },
          { value: 1_000_000_000_000, label: "1 T" },
          { value: 500_000_000_000, label: "500 M" },
          { value: 0, label: "0" },
        ],
      };
    }

    // Bulatkan ke atas agar rapi menjadi 4 interval
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / magnitude;
    let niceTop = 2;
    if (normalized <= 1) niceTop = 1;
    else if (normalized <= 2) niceTop = 2;
    else if (normalized <= 4) niceTop = 4;
    else if (normalized <= 5) niceTop = 5;
    else if (normalized <= 8) niceTop = 8;
    else niceTop = 10;

    const maxAxis = niceTop * magnitude;
    const step = maxAxis / 4;

    return {
      maxAxis,
      ticks: [
        { value: maxAxis, label: formatShortId(maxAxis) },
        { value: step * 3, label: formatShortId(step * 3) },
        { value: step * 2, label: formatShortId(step * 2) },
        { value: step * 1, label: formatShortId(step * 1) },
        { value: 0, label: "0" },
      ],
    };
  }, [categories]);

  const filteredSkpdStats = useMemo(() => {
    if (!searchSkpd.trim()) return skpdStats;
    const q = searchSkpd.toLowerCase();
    return skpdStats.filter(
      (s) =>
        s.kd_skpd.toLowerCase().includes(q) ||
        s.nm_skpd.toLowerCase().includes(q)
    );
  }, [skpdStats, searchSkpd]);

  const cardConfigs = {
    PENDAPATAN: {
      border: "border-blue-300/90 hover:border-blue-500",
      activeRing: "ring-2 ring-blue-500/30 border-blue-500",
      bgGradient:
        "bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30",
      iconBg: "bg-blue-600 text-white shadow-sm shadow-blue-600/30",
      barColor: "bg-blue-500",
      dotColor: "bg-blue-600",
      Icon: ShieldCheck,
    },
    BELANJA: {
      border: "border-sky-300/90 hover:border-sky-500",
      activeRing: "ring-2 ring-sky-500/30 border-sky-500",
      bgGradient: "bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30",
      iconBg: "bg-sky-500 text-white shadow-sm shadow-sky-500/30",
      barColor: "bg-sky-500",
      dotColor: "bg-sky-500",
      Icon: ShoppingBag,
    },
    PENERIMAAN: {
      border: "border-indigo-300/90 hover:border-indigo-500",
      activeRing: "ring-2 ring-indigo-500/30 border-indigo-500",
      bgGradient:
        "bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30",
      iconBg: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30",
      barColor: "bg-indigo-500",
      dotColor: "bg-indigo-600",
      Icon: Orbit,
    },
    PENGELUARAN: {
      border: "border-teal-300/90 hover:border-teal-500",
      activeRing: "ring-2 ring-teal-500/30 border-teal-500",
      bgGradient: "bg-gradient-to-br from-teal-50/70 via-white to-teal-50/30",
      iconBg: "bg-teal-600 text-white shadow-sm shadow-teal-600/30",
      barColor: "bg-teal-500",
      dotColor: "bg-teal-600",
      Icon: MinusCircle,
    },
  };

  const sisaSelected =
    selectedCategory.anggaran - selectedCategory.realisasiRiil;

  return (
    <div className="space-y-5 pb-6">
      {/* =================================================================
          HEADER DASHBOARD (Sesuai Gambar Referensi)
          ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Ringkasan APBD Kab. Tapanuli Selatan •{" "}
            <span className="font-bold text-slate-700">
              Tahun Anggaran {tahun} ({tahapNama})
            </span>
            {opdScopeLabel ? ` • ${opdScopeLabel}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pill Tanggal Hari Ini */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{todayFormatted}</span>
          </div>

          {/* Tombol Statistik SKPD */}
          <button
            type="button"
            onClick={() => setShowSkpdModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Statistik SKPD</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          BARIS 1: 4 KARTU RINGKASAN APBD (Pendapatan, Belanja, Penerimaan, Pengeluaran)
          ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const cfg = cardConfigs[cat.key];
          const IconComponent = cfg.Icon;
          const pct =
            cat.anggaran > 0
              ? Math.min(100, (cat.realisasiRiil / cat.anggaran) * 100)
              : 0;
          const isSelected = selectedKey === cat.key;

          return (
            <div
              key={cat.key}
              onClick={() => setSelectedKey(cat.key)}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all cursor-pointer ${
                cfg.bgGradient
              } ${isSelected ? cfg.activeRing : cfg.border} shadow-xs`}
            >
              {/* Subtle dotted pattern */}
              <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "radial-gradient(#94a3b8 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                }}
              />

              <div className="relative z-10 space-y-4">
                {/* Baris Atas: Icon & Persentase */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.iconBg}`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-white/90 border border-slate-200/80 text-xs font-extrabold text-slate-800 shadow-2xs">
                    {pct.toFixed(2)}%
                  </span>
                </div>

                {/* Label & Nilai Anggaran (Nilai Perubahan) */}
                <div>
                  <div className="text-xs font-semibold text-slate-500">
                    {cat.fullLabel}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-1 break-words">
                    {formatRupiahDesimal(cat.anggaran, true)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                  />
                </div>

                {/* Realisasi Riil & Realisasi Rencana (Default 0) */}
                <div className="pt-1 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-medium">
                      Realisasi Riil
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono">
                      {formatRupiahDesimal(cat.realisasiRiil, false)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-medium">
                      Realisasi Rencana
                    </span>
                    <span className="font-semibold text-slate-400 font-mono">
                      {formatRupiahDesimal(cat.realisasiRencana, false)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================================
          BARIS 2: GRAFIK APBD (FULL WIDTH / LEBAR PENUH)
          ================================================================= */}
      <div className="w-full">
        <div className="w-full bg-white rounded-3xl border border-blue-200/80 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Header Grafik & Legenda Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Grafik APBD
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>Anggaran</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Realisasi Riil</span>
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span>Realisasi Rencana</span>
              </span>
            </div>
          </div>

          {/* Area Bar Chart */}
          <div className="relative pt-4 pb-2">
            <div className="flex">
              {/* Sumbu Y Labels */}
              <div className="w-16 shrink-0 flex flex-col justify-between text-[11px] font-semibold text-slate-400 pr-3 h-72 select-none">
                {chartScale.ticks.map((t, i) => (
                  <div key={i} className="leading-none">
                    {t.label}
                  </div>
                ))}
              </div>

              {/* Plot Area dengan Grid & 4 Kelompok Batang */}
              <div className="flex-1 relative h-72">
                {/* Garis Horizontal Grid */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {chartScale.ticks.map((_, i) => (
                    <div
                      key={i}
                      className={`w-full border-b ${
                        i === chartScale.ticks.length - 1
                          ? "border-slate-200"
                          : "border-dashed border-slate-100"
                      }`}
                    />
                  ))}
                </div>

                {/* 4 Kelompok Kategori */}
                <div className="relative z-10 h-full grid grid-cols-4 gap-3 sm:gap-6 items-end px-2 sm:px-6">
                  {categories.map((cat) => {
                    const isActive = selectedKey === cat.key;
                    const bars = [
                      {
                        id: "anggaran",
                        label: "Anggaran",
                        val: cat.anggaran,
                        textColor: "text-indigo-900",
                        barClass:
                          "bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-700 shadow-sm shadow-indigo-500/20",
                      },
                      {
                        id: "riil",
                        label: "Realisasi Riil",
                        val: cat.realisasiRiil,
                        textColor: "text-emerald-800",
                        barClass:
                          "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-700 shadow-sm shadow-emerald-500/20",
                      },
                      {
                        id: "rencana",
                        label: "Realisasi Rencana",
                        val: cat.realisasiRencana,
                        textColor: "text-amber-700",
                        barClass:
                          "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700 shadow-sm shadow-amber-500/20",
                      },
                    ];

                    return (
                      <div
                        key={cat.key}
                        onClick={() => setSelectedKey(cat.key)}
                        className="h-full flex flex-col justify-end items-center cursor-pointer group border-r last:border-r-0 border-dashed border-slate-100 px-2"
                      >
                        <div className="w-full h-full flex items-end justify-center gap-2 sm:gap-4">
                          {bars.map((b) => {
                            const rawPct =
                              chartScale.maxAxis > 0
                                ? (b.val / chartScale.maxAxis) * 100
                                : 0;
                            const heightPct =
                              b.val > 0 ? Math.max(rawPct, 10) : 2;

                            return (
                              <div
                                key={b.id}
                                className="flex-1 max-w-[52px] h-full flex flex-col justify-end items-center"
                                title={`${cat.fullLabel} — ${b.label}: ${formatRupiahDesimal(
                                  b.val
                                )}`}
                              >
                                <span
                                  className={`text-[10px] sm:text-[11px] font-extrabold mb-1 whitespace-nowrap ${b.textColor}`}
                                >
                                  {formatShortId(b.val)}
                                </span>
                                <div
                                  className={`w-full rounded-t-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
                                    b.barClass
                                  } ${
                                    isActive
                                      ? "opacity-100"
                                      : "opacity-90 group-hover:opacity-100"
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                >
                                  {heightPct >= 22 && (
                                    <span
                                      className="text-[10px] font-bold text-white/95 whitespace-nowrap select-none tracking-wide"
                                      style={{
                                        writingMode: "vertical-rl",
                                        transform: "rotate(180deg)",
                                      }}
                                    >
                                      {b.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Label Sumbu X (Pendapatan, Belanja, Penerimaan, Pengeluaran) */}
            <div className="flex mt-3">
              <div className="w-16 shrink-0" />
              <div className="flex-1 grid grid-cols-4 gap-2 sm:gap-4 text-center">
                {categories.map((cat) => {
                  const isActive = selectedKey === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedKey(cat.key)}
                      className={`text-xs font-bold py-1 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? "text-slate-900 bg-slate-100"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {cat.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Box Ringkasan Kategori Terpilih di Bawah Grafik */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  cardConfigs[selectedCategory.key].dotColor
                }`}
              />
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Kategori terpilih
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {selectedCategory.fullLabel}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Anggaran
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                  {formatRupiahDesimal(selectedCategory.anggaran, false)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Realisasi Riil
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                  {formatRupiahDesimal(selectedCategory.realisasiRiil, false)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-400">
                  Sisa
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono mt-0.5">
                  {formatRupiahDesimal(sisaSelected, false)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================
          MODAL STATISTIK SKPD (Ketika Tombol "Statistik SKPD" Diklik)
          ================================================================= */}
      {showSkpdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold">
                    Statistik Anggaran APBD Per SKPD — TA {tahun}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Nilai Anggaran mengacu pada Nilai Perubahan (nilai_ubah) RKA-SKPD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSkpdModal(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchSkpd}
                  onChange={(e) => setSearchSkpd(e.target.value)}
                  placeholder="Cari kode atau nama SKPD / OPD..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Kode SKPD</th>
                      <th className="py-2.5 px-3">Nama Perangkat Daerah (SKPD)</th>
                      <th className="py-2.5 px-3 text-right">Pendapatan (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Belanja (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Pembiayaan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSkpdStats.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-400"
                        >
                          Tidak ada data SKPD yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredSkpdStats.map((s, idx) => (
                        <tr key={s.opdId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {s.kd_skpd}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {s.nm_skpd}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-bold whitespace-nowrap">
                            {formatRupiahDesimal(s.pendapatan, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-700 font-bold whitespace-nowrap">
                            {formatRupiahDesimal(s.belanja, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-bold whitespace-nowrap">
                            {formatRupiahDesimal(
                              s.penerimaan + s.pengeluaran,
                              false
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSkpdModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

