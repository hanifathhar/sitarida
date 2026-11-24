"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Building2,
  Printer,
  RefreshCw,
  Layers,
  TrendingUp,
  Search,
  RotateCcw,
  FileSpreadsheet,
  ArrowDownLeft,
} from "lucide-react";

interface RekapOpdItem {
  kd_skpd: string;
  nm_skpd: string;
  totalTransaksi: number;
  totalNilai: number;
}

interface RekapSumberItem {
  sumber_dana: string;
  totalTransaksi: number;
  totalNilai: number;
}

interface RekapRekeningItem {
  kd_rek6: string;
  nm_rek6: string;
  totalNilai: number;
  count: number;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
}

export default function RekapPenerimaanView() {
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [perOpd, setPerOpd] = useState<RekapOpdItem[]>([]);
  const [perSumber, setPerSumber] = useState<RekapSumberItem[]>([]);
  const [perRekening, setPerRekening] = useState<RekapRekeningItem[]>([]);
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

      const res = await fetch(`/api/penatausahaan/bud/rekap-penerimaan?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setGrandTotal(json.data.grandTotal || 0);
        setTotalTransaksi(json.data.totalTransaksi || 0);
        setPerOpd(json.data.perOpd || []);
        setPerSumber(json.data.perSumber || []);
        setPerRekening(json.data.perRekening || []);
      }
    } catch (e) {
      console.error("Gagal memuat rekap penerimaan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const filteredOpd = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return perOpd;
    return perOpd.filter(
      (o) =>
        o.nm_skpd.toLowerCase().includes(q) || o.kd_skpd.toLowerCase().includes(q)
    );
  }, [perOpd, searchQuery]);

  const filteredSumber = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return perSumber;
    return perSumber.filter((s) => s.sumber_dana.toLowerCase().includes(q));
  }, [perSumber, searchQuery]);

  const filteredRekening = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return perRekening;
    return perRekening.filter(
      (r) =>
        r.kd_rek6.toLowerCase().includes(q) || r.nm_rek6.toLowerCase().includes(q)
    );
  }, [perRekening, searchQuery]);

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
    if (!grandTotal || grandTotal <= 0) return 0;
    return Math.min(100, Math.round((val / grandTotal) * 1000) / 10);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const opdSheetData: (string | number)[][] = [
      ["REKAPITULASI PENERIMAAN PER SKPD / OPD"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      ["NO", "KODE SKPD", "NAMA SKPD / OPD", "TRANSAKSI", "NILAI PENERIMAAN (Rp)", "PORSI (%)"],
      ...filteredOpd.map((o, i) => [
        i + 1,
        o.kd_skpd,
        o.nm_skpd,
        o.totalTransaksi,
        o.totalNilai,
        calcShare(o.totalNilai),
      ]),
    ];
    const wsOpd = XLSX.utils.aoa_to_sheet(opdSheetData);
    wsOpd["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 22 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsOpd, "Per SKPD");

    const sumberSheetData: (string | number)[][] = [
      ["REKAPITULASI PENERIMAAN PER SUMBER DANA"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      ["NO", "SUMBER DANA", "TRANSAKSI", "TOTAL DISETOR (Rp)", "PORSI (%)"],
      ...filteredSumber.map((s, i) => [
        i + 1,
        s.sumber_dana,
        s.totalTransaksi,
        s.totalNilai,
        calcShare(s.totalNilai),
      ]),
    ];
    const wsSumber = XLSX.utils.aoa_to_sheet(sumberSheetData);
    wsSumber["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 12 }, { wch: 22 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSumber, "Per Sumber Dana");

    const rekSheetData: (string | number)[][] = [
      ["REKAPITULASI REALISASI PENDAPATAN PER KODE REKENING"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      ["NO", "KODE REKENING", "URAIAN REKENING PENDAPATAN", "FREKUENSI SETOR", "TOTAL REALISASI (Rp)"],
      ...filteredRekening.map((r, i) => [
        i + 1,
        r.kd_rek6,
        r.nm_rek6,
        r.count,
        r.totalNilai,
      ]),
    ];
    const wsRek = XLSX.utils.aoa_to_sheet(rekSheetData);
    wsRek["!cols"] = [{ wch: 6 }, { wch: 22 }, { wch: 45 }, { wch: 16 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsRek, "Per Rekening");

    XLSX.writeFile(wb, `Rekap_Penerimaan_BUD_TA_${tahunAnggaran}.xlsx`);
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
      <html><head><meta charset="utf-8" /><title>Rekapitulasi Penerimaan Daerah</title>
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
        <div class="title">REKAPITULASI PENERIMAAN KAS DAERAH</div>
        <div class="periode">${escapeHtml(periodeText)}</div>
      </div>
      <h4>1. Rekapitulasi Per SKPD / OPD</h4>
      <table>
        <thead><tr><th style="width:5%">No</th><th style="width:20%">Kode SKPD</th><th>Nama SKPD / OPD</th><th style="width:12%">Transaksi</th><th style="width:22%">Nilai Penerimaan (Rp)</th></tr></thead>
        <tbody>${filteredOpd.map((o, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${escapeHtml(o.kd_skpd)}</td><td>${escapeHtml(o.nm_skpd)}</td><td style="text-align:center">${o.totalTransaksi}</td><td class="num">${formatAngka(o.totalNilai)}</td></tr>`).join("")}</tbody>
      </table>
      <h4>2. Rekapitulasi Per Kode Rekening Pendapatan</h4>
      <table>
        <thead><tr><th style="width:5%">No</th><th style="width:20%">Kode Rekening</th><th>Uraian Rekening</th><th style="width:12%">Frekuensi</th><th style="width:22%">Total Realisasi (Rp)</th></tr></thead>
        <tbody>${filteredRekening.map((r, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${escapeHtml(r.kd_rek6)}</td><td>${escapeHtml(r.nm_rek6)}</td><td style="text-align:center">${r.count}</td><td class="num">${formatAngka(r.totalNilai)}</td></tr>`).join("")}
        <tr class="row-total"><td colspan="4" style="text-align:right">TOTAL REALISASI PENERIMAAN</td><td class="num">${formatAngka(grandTotal)}</td></tr></tbody>
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Rekapitulasi Penerimaan Daerah
                </h1>
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Akumulasi realisasi penerimaan kas daerah berdasarkan SKPD/OPD, sumber dana, dan kode rekening pendapatan
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

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/70 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Akumulasi Penerimaan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 font-mono tabular-nums mt-2.5 tracking-tight">
            {formatRupiah(grandTotal)}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium mt-1.5 inline-block">
            Kas Daerah Tahun Anggaran {tahunAnggaran}
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Total Dokumen Penerimaan
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tabular-nums">
            {totalTransaksi} <span className="text-sm font-bold text-slate-500">Transaksi</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 inline-block">
            Dari {perOpd.length} Perangkat Daerah &amp; {perSumber.length} Sumber Dana
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-rose-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#88131A]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#88131A]">
              Kontributor OPD Tertinggi
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#88131A] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div
            className="text-sm font-bold text-slate-900 truncate mt-2.5"
            title={perOpd[0]?.nm_skpd}
          >
            {perOpd[0]?.nm_skpd || "-"}
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 mt-1 inline-block tabular-nums">
            {perOpd[0] ? formatRupiah(perOpd[0].totalNilai) : "Rp 0,00"}
            {perOpd[0] ? ` (${calcShare(perOpd[0].totalNilai)}%)` : ""}
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
              Pencarian Cepat (SKPD, Sumber Dana, atau Rekening)
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama/kode SKPD, sumber dana, atau kode rekening..."
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

      {/* Grid: Rekap Per OPD & Rekap Per Sumber Dana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Rekap Per OPD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Penerimaan Per SKPD / OPD
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {filteredOpd.length} SKPD
            </span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3.5 py-2.5 text-center w-10">No</th>
                  <th className="px-3.5 py-2.5">SKPD / OPD</th>
                  <th className="px-3.5 py-2.5 text-center w-20">Tx</th>
                  <th className="px-3.5 py-2.5 text-right w-44">Nilai Penerimaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs italic text-slate-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredOpd.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs italic text-slate-400">
                      Belum ada data penerimaan OPD.
                    </td>
                  </tr>
                ) : (
                  filteredOpd.map((opd, idx) => {
                    const share = calcShare(opd.totalNilai);
                    return (
                      <tr key={opd.kd_skpd} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 text-center text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-slate-800">{opd.nm_skpd}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-slate-400">
                              {opd.kd_skpd}
                            </span>
                            <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
                        <td className="px-3.5 py-2.5 text-center tabular-nums">
                          {opd.totalTransaksi}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                          {formatAngka(opd.totalNilai)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekap Per Sumber Dana */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Penerimaan Per Sumber Dana
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              {filteredSumber.length} Sumber
            </span>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3.5 py-2.5 text-center w-10">No</th>
                  <th className="px-3.5 py-2.5">Sumber Dana</th>
                  <th className="px-3.5 py-2.5 text-center w-20">Tx</th>
                  <th className="px-3.5 py-2.5 text-right w-44">Total Disetor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs italic text-slate-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredSumber.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs italic text-slate-400">
                      Belum ada data sumber dana.
                    </td>
                  </tr>
                ) : (
                  filteredSumber.map((s, idx) => {
                    const share = calcShare(s.totalNilai);
                    return (
                      <tr key={s.sumber_dana} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5 text-center text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-slate-800">{s.sumber_dana}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-blue-700">
                              {share}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-center tabular-nums">
                          {s.totalTransaksi}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                          {formatAngka(s.totalNilai)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel Rekap Per Rekening Pendapatan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Realisasi Pendapatan Per Kode Rekening
            </h3>
            <p className="text-[11px] text-slate-500">
              Rincian realisasi kas masuk berdasarkan akun rekening pendapatan daerah
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredRekening.length} Rekening
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-14">No</th>
                <th className="px-3.5 py-3 w-44">Kode Akun Rekening</th>
                <th className="px-3.5 py-3">Uraian Rekening Pendapatan</th>
                <th className="px-3.5 py-3 text-center w-36">Frekuensi Setor</th>
                <th className="px-3.5 py-3 text-right w-48">Total Realisasi (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data rekening pendapatan...
                  </td>
                </tr>
              ) : filteredRekening.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data rekening pendapatan pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredRekening.map((rek, idx) => (
                  <tr key={rek.kd_rek6} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3.5 py-2.5 text-center text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {rek.kd_rek6}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                      {rek.nm_rek6}
                    </td>
                    <td className="px-3.5 py-2.5 text-center tabular-nums">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {rek.count} kali
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatAngka(rek.totalNilai)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRekening.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-800 uppercase text-[11px] tracking-wider">
                    Total Realisasi Penerimaan
                  </td>
                  <td className="px-3.5 py-3 text-right text-emerald-700 font-mono text-sm whitespace-nowrap tabular-nums">
                    {formatAngka(grandTotal)}
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
