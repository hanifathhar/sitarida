"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  DollarSign,
  Printer,
  RefreshCw,
  FileCheck2,
  Receipt,
  CreditCard,
  Search,
  RotateCcw,
  FileSpreadsheet,
  ArrowUpRight,
} from "lucide-react";

interface RekapJenisItem {
  jenis_sp2d: string;
  totalSp2d: number;
  totalBruto: number;
  totalPotongan: number;
  totalNetto: number;
}

interface RekapOpdItem {
  kd_skpd: string;
  nm_skpd: string;
  totalSp2d: number;
  totalBruto: number;
  totalPotongan: number;
  totalNetto: number;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
}

export default function RekapPengeluaranView() {
  const [summary, setSummary] = useState({
    totalSp2d: 0,
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
  });
  const [perJenis, setPerJenis] = useState<RekapJenisItem[]>([]);
  const [perOpd, setPerOpd] = useState<RekapOpdItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [pejabatBud, setPejabatBud] = useState<PejabatBudItem | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadScope() {
      try {
        const res = await fetch("/api/penatausahaan/sp2d?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.session?.tahunAnggaran) {
            setTahunAnggaran(json.data.session.tahunAnggaran);
          }
          if (json.data.pejabatBud?.length > 0) {
            setPejabatBud(json.data.pejabatBud[0]);
          }
        }
      } catch (e) {
        console.error("Gagal memuat scope:", e);
      }
    }
    loadScope();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/penatausahaan/bud/rekap-pengeluaran?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(
          json.data.summary || {
            totalSp2d: 0,
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
          }
        );
        setPerJenis(json.data.perJenis || []);
        setPerOpd(json.data.perOpd || []);
      }
    } catch (e) {
      console.error("Gagal memuat rekap pengeluaran:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const filteredJenis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return perJenis;
    return perJenis.filter((j) =>
      j.jenis_sp2d.replace(/_/g, " ").toLowerCase().includes(q)
    );
  }, [perJenis, searchQuery]);

  const filteredOpd = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return perOpd;
    return perOpd.filter(
      (o) =>
        o.nm_skpd.toLowerCase().includes(q) || o.kd_skpd.toLowerCase().includes(q)
    );
  }, [perOpd, searchQuery]);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  const formatAngka = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  const calcShare = (val: number) => {
    if (!summary.totalNetto || summary.totalNetto <= 0) return 0;
    return Math.min(100, Math.round((val / summary.totalNetto) * 1000) / 10);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const jenisData: (string | number)[][] = [
      ["REKAPITULASI PENGELUARAN KAS DAERAH BERDASARKAN JENIS SP2D"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      ["NO", "JENIS SP2D", "JUMLAH SP2D", "BRUTO (Rp)", "POTONGAN (Rp)", "NETTO (Rp)", "PORSI (%)"],
      ...filteredJenis.map((j, i) => [
        i + 1,
        `SP2D ${j.jenis_sp2d.replace(/_/g, " ")}`,
        j.totalSp2d,
        j.totalBruto,
        j.totalPotongan,
        j.totalNetto,
        calcShare(j.totalNetto),
      ]),
    ];
    const wsJenis = XLSX.utils.aoa_to_sheet(jenisData);
    wsJenis["!cols"] = [{ wch: 6 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsJenis, "Per Jenis SP2D");

    const opdData: (string | number)[][] = [
      ["REKAPITULASI PENGELUARAN KAS DAERAH BERDASARKAN SKPD / OPD"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      ["NO", "KODE SKPD", "NAMA SKPD / OPD", "JUMLAH SP2D", "BRUTO (Rp)", "POTONGAN (Rp)", "NETTO (Rp)", "PORSI (%)"],
      ...filteredOpd.map((o, i) => [
        i + 1,
        o.kd_skpd,
        o.nm_skpd,
        o.totalSp2d,
        o.totalBruto,
        o.totalPotongan,
        o.totalNetto,
        calcShare(o.totalNetto),
      ]),
    ];
    const wsOpd = XLSX.utils.aoa_to_sheet(opdData);
    wsOpd["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsOpd, "Per SKPD");

    XLSX.writeFile(wb, `Rekap_Pengeluaran_BUD_TA_${tahunAnggaran}.xlsx`);
  };

  const handlePrintAction = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const escapeHtml = (str: string) =>
      (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const tglCetak = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const periodeText =
      startDate && endDate
        ? `PERIODE ${startDate} s/d ${endDate}`
        : `TAHUN ANGGARAN ${tahunAnggaran}`;

    const html = `<!DOCTYPE html>
      <html><head><meta charset="utf-8" /><title>Rekapitulasi Pengeluaran Daerah</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        body { font-family: "Times New Roman", Times, serif; font-size: 8pt; color: #000; margin: 0; }
        .header { text-align: center; margin-bottom: 10px; }
        .gov { font-size: 9.5pt; font-weight: bold; }
        .title { font-size: 11pt; font-weight: bold; margin-top: 2px; }
        .periode { font-size: 8pt; font-style: italic; margin-top: 2px; }
        h4 { margin: 12px 0 4px; font-size: 8.5pt; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 8px; }
        th, td { border: 1px solid #000; padding: 3px 5px; }
        th { background: #f1f5f9; text-align: center; }
        .num { text-align: right; font-family: "Courier New", monospace; white-space: nowrap; }
        .row-total td { font-weight: bold; background: #f8fafc; }
        .ttd-area { margin-top: 16px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .ttd-box { width: 260px; text-align: center; font-size: 8pt; line-height: 1.35; }
        .ttd-space { height: 46px; }
      </style></head><body>
      <div class="header">
        <div class="gov">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
        <div class="title">REKAPITULASI PENGELUARAN KAS DAERAH</div>
        <div class="periode">${escapeHtml(periodeText)}</div>
      </div>
      <h4>1. Rekapitulasi Berdasarkan Jenis SP2D</h4>
      <table>
        <thead><tr><th style="width:5%">No</th><th>Jenis Dokumen SP2D</th><th style="width:12%">Jumlah SP2D</th><th style="width:18%">Nilai Bruto (Rp)</th><th style="width:18%">Potongan (Rp)</th><th style="width:18%">Nilai Bersih (Rp)</th></tr></thead>
        <tbody>${filteredJenis.map((j, i) => `<tr><td style="text-align:center">${i + 1}</td><td>SP2D ${escapeHtml(j.jenis_sp2d.replace(/_/g, " "))}</td><td style="text-align:center">${j.totalSp2d}</td><td class="num">${formatAngka(j.totalBruto)}</td><td class="num">${formatAngka(j.totalPotongan)}</td><td class="num">${formatAngka(j.totalNetto)}</td></tr>`).join("")}
        <tr class="row-total"><td colspan="3" style="text-align:right">TOTAL</td><td class="num">${formatAngka(summary.totalBruto)}</td><td class="num">${formatAngka(summary.totalPotongan)}</td><td class="num">${formatAngka(summary.totalNetto)}</td></tr></tbody>
      </table>
      <h4>2. Rekapitulasi Berdasarkan SKPD / OPD</h4>
      <table>
        <thead><tr><th style="width:5%">No</th><th style="width:18%">Kode SKPD</th><th>Nama SKPD / OPD</th><th style="width:10%">SP2D</th><th style="width:16%">Bruto (Rp)</th><th style="width:16%">Potongan (Rp)</th><th style="width:16%">Netto (Rp)</th></tr></thead>
        <tbody>${filteredOpd.map((o, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${escapeHtml(o.kd_skpd)}</td><td>${escapeHtml(o.nm_skpd)}</td><td style="text-align:center">${o.totalSp2d}</td><td class="num">${formatAngka(o.totalBruto)}</td><td class="num">${formatAngka(o.totalPotongan)}</td><td class="num">${formatAngka(o.totalNetto)}</td></tr>`).join("")}
        <tr class="row-total"><td colspan="4" style="text-align:right">TOTAL SELURUH OPD</td><td class="num">${formatAngka(summary.totalBruto)}</td><td class="num">${formatAngka(summary.totalPotongan)}</td><td class="num">${formatAngka(summary.totalNetto)}</td></tr></tbody>
      </table>
      <div class="ttd-area"><div class="ttd-box">
        <div>Sipirok, ${escapeHtml(tglCetak)}</div>
        <div style="font-weight:bold;margin-top:2px;">KUASA BENDAHARA UMUM DAERAH</div>
        <div class="ttd-space"></div>
        <div style="font-weight:bold;text-decoration:underline;">${escapeHtml(pejabatBud?.nama || "....................................")}</div>
        <div>${pejabatBud?.nip ? `NIP. ${escapeHtml(pejabatBud.nip)}` : "NIP. .............................."}</div>
      </div></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
      </body></html>`;
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Header Utama Modern */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Rekapitulasi Pengeluaran Daerah
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Akumulasi realisasi pencairan dana SP2D berdasarkan jenis dokumen (UP, GU, TU, LS) dan Perangkat Daerah
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards Summary Modern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-teal-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Jumlah SP2D Dicairkan
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tabular-nums">
            {summary.totalSp2d} <span className="text-sm font-bold text-slate-500">Dokumen</span>
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1.5 inline-block">
            Dari {perOpd.length} Perangkat Daerah
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Total Belanja (Bruto)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 inline-block">
            Realisasi Belanja Daerah
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Total Potongan Pajak
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700 mt-2.5 font-mono tabular-nums tracking-tight">
            - {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1.5 inline-block">
            Dipungut &amp; Diteruskan ke Kas Negara
          </span>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Bersih Ditransfer
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-block">
            Kas Keluar dari RKUD (Netto)
          </span>
        </div>
      </div>

      {/* Filter & Pencarian Cepat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#5E0E14] focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#5E0E14] focus:outline-none"
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pencarian Cepat (Jenis SP2D atau Nama/Kode SKPD)
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik jenis SP2D (UP/GU/TU/LS) atau nama/kode SKPD..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#5E0E14] focus:outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSearchQuery("");
              }}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel 1: Rekap Per Jenis SP2D */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Pengeluaran Kas Daerah Berdasarkan Jenis SP2D
            </h3>
            <p className="text-[11px] text-slate-500">
              Rincian realisasi belanja Uang Persediaan (UP), Ganti Uang (GU), Tambah Uang (TU), dan Langsung (LS)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredJenis.length} Jenis
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-14">No</th>
                <th className="px-3.5 py-3">Jenis Dokumen SP2D</th>
                <th className="px-3.5 py-3 text-center w-36">Jumlah SP2D Cair</th>
                <th className="px-3.5 py-3 text-right w-44">Nilai Bruto (Rp)</th>
                <th className="px-3.5 py-3 text-right w-44">Potongan Pajak (Rp)</th>
                <th className="px-3.5 py-3 text-right w-48">Nilai Bersih / Netto (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data rekap jenis SP2D...
                  </td>
                </tr>
              ) : filteredJenis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada pengeluaran SP2D cair.
                  </td>
                </tr>
              ) : (
                filteredJenis.map((item, idx) => {
                  const share = calcShare(item.totalNetto);
                  return (
                    <tr key={item.jenis_sp2d} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <td className="px-3.5 py-3 text-center text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-lg bg-[#5E0E14]/10 px-2.5 py-1 text-[11px] font-bold text-[#5E0E14]">
                            SP2D {item.jenis_sp2d.replace(/_/g, " ")}
                          </span>
                          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[140px]">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-[#88131A] rounded-full"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {share}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-center font-medium tabular-nums">
                        {item.totalSp2d} Dokumen
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                        {formatAngka(item.totalBruto)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-amber-700 whitespace-nowrap tabular-nums">
                        {item.totalPotongan > 0 ? `- ${formatAngka(item.totalPotongan)}` : "0,00"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                        {formatAngka(item.totalNetto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredJenis.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-800 uppercase text-[11px] tracking-wider">
                    Total Keseluruhan
                  </td>
                  <td className="px-3.5 py-3 text-right text-slate-900 font-mono whitespace-nowrap tabular-nums">
                    {formatAngka(summary.totalBruto)}
                  </td>
                  <td className="px-3.5 py-3 text-right text-amber-700 font-mono whitespace-nowrap tabular-nums">
                    - {formatAngka(summary.totalPotongan)}
                  </td>
                  <td className="px-3.5 py-3 text-right text-emerald-700 font-mono text-sm whitespace-nowrap tabular-nums">
                    {formatAngka(summary.totalNetto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tabel 2: Rekap Per OPD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Pengeluaran Kas Daerah Berdasarkan SKPD / OPD
            </h3>
            <p className="text-[11px] text-slate-500">
              Total realisasi pencairan dana per Organisasi Perangkat Daerah
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredOpd.length} Perangkat Daerah
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-14">No</th>
                <th className="px-3.5 py-3">Nama SKPD / Perangkat Daerah</th>
                <th className="px-3.5 py-3 text-center w-28">Jumlah SP2D</th>
                <th className="px-3.5 py-3 text-right w-44">Nilai Bruto (Rp)</th>
                <th className="px-3.5 py-3 text-right w-44">Potongan Pajak (Rp)</th>
                <th className="px-3.5 py-3 text-right w-48">Nilai Bersih Cair (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data rekap SKPD...
                  </td>
                </tr>
              ) : filteredOpd.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada pengeluaran SP2D.
                  </td>
                </tr>
              ) : (
                filteredOpd.map((opd, idx) => {
                  const share = calcShare(opd.totalNetto);
                  return (
                    <tr key={opd.kd_skpd} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <td className="px-3.5 py-2.5 text-center text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900">{opd.nm_skpd}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-400">
                            {opd.kd_skpd}
                          </span>
                          <div className="flex-1 max-w-[110px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700">
                            {share}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-medium tabular-nums">
                        {opd.totalSp2d}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                        {formatAngka(opd.totalBruto)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-amber-700 whitespace-nowrap tabular-nums">
                        {opd.totalPotongan > 0 ? `- ${formatAngka(opd.totalPotongan)}` : "0,00"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                        {formatAngka(opd.totalNetto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredOpd.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-800 uppercase text-[11px] tracking-wider">
                    Total Pengeluaran Seluruh OPD
                  </td>
                  <td className="px-3.5 py-3 text-right text-slate-900 font-mono whitespace-nowrap tabular-nums">
                    {formatAngka(summary.totalBruto)}
                  </td>
                  <td className="px-3.5 py-3 text-right text-amber-700 font-mono whitespace-nowrap tabular-nums">
                    - {formatAngka(summary.totalPotongan)}
                  </td>
                  <td className="px-3.5 py-3 text-right text-emerald-700 font-mono text-sm whitespace-nowrap tabular-nums">
                    {formatAngka(summary.totalNetto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
