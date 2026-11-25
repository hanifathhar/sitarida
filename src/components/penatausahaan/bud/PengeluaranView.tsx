"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Search,
  RefreshCw,
  Printer,
  DollarSign,
  FileCheck2,
  Receipt,
  CreditCard,
  ArrowUpRight,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";

interface Sp2dCairItem {
  id: string;
  tahunAnggaran: number;
  no_sp2d: string;
  tgl_sp2d: string;
  tgl_cair: string | null;
  no_spm: string;
  no_spp: string;
  kd_skpd: string;
  nm_skpd: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  nama_penerima: string | null;
  bank_penerima: string | null;
  rek_penerima: string | null;
  nama_bank_pembayar: string | null;
  rek_bank_pembayar: string | null;
  no_transaksi_bank: string | null;
  status: string;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
}

export default function PengeluaranView() {
  const [dataList, setDataList] = useState<Sp2dCairItem[]>([]);
  const [summary, setSummary] = useState({
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
    totalSp2dCair: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [pejabatBud, setPejabatBud] = useState<PejabatBudItem | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [opdList, setOpdList] = useState<Array<{ id: string; kd_skpd: string; nm_skpd: string }>>([]);

  // Load Referensi OPD & Scope
  useEffect(() => {
    async function loadRef() {
      try {
        const [res, scopeRes] = await Promise.all([
          fetch("/api/penatausahaan/bud/referensi"),
          fetch("/api/penatausahaan/sp2d?scope=true"),
        ]);
        const json = await res.json();
        if (json.success) {
          setOpdList(json.data.opdList || []);
        }
        const scopeJson = await scopeRes.json();
        if (scopeJson.success && scopeJson.data?.session?.tahunAnggaran) {
          setTahunAnggaran(scopeJson.data.session.tahunAnggaran);
        }
        if (scopeJson.success && scopeJson.data?.pejabatBud?.length > 0) {
          setPejabatBud(scopeJson.data.pejabatBud[0]);
        }
      } catch (e) {
        console.error("Gagal memuat referensi:", e);
      }
    }
    loadRef();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterOpd !== "ALL") q.set("opdId", filterOpd);
      if (filterJenis !== "ALL") q.set("jenis_sp2d", filterJenis);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (search) q.set("q", search);

      const res = await fetch(`/api/penatausahaan/bud/pengeluaran?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        setSummary(
          json.summary || {
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
            totalSp2dCair: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat daftar pengeluaran:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchData();
  }, [filterOpd, filterJenis, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(dataList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return dataList.slice(start, start + pageSize);
  }, [dataList, currentPage, pageSize]);

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

  const handleExportExcel = () => {
    const rowsData: (string | number)[][] = [
      ["PENGELUARAN DAERAH (DAFTAR SP2D CAIR)"],
      [`TAHUN ANGGARAN ${tahunAnggaran}`],
      [],
      [
        "NO",
        "NO. SP2D",
        "NO. SPM",
        "TGL CAIR",
        "NO. REF BANK",
        "SKPD",
        "PENERIMA",
        "JENIS SP2D",
        "KEPERLUAN",
        "BRUTO (Rp)",
        "POTONGAN (Rp)",
        "NETTO (Rp)",
      ],
      ...dataList.map((item, idx) => [
        idx + 1,
        item.no_sp2d,
        item.no_spm,
        item.tgl_cair
          ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
          : new Date(item.tgl_sp2d).toLocaleDateString("id-ID"),
        item.no_transaksi_bank || "-",
        item.nm_skpd,
        item.nama_penerima || "-",
        item.jenis_sp2d.replace(/_/g, " "),
        item.keperluan,
        item.nilai,
        item.nilai_potongan,
        item.nilai_bersih,
      ]),
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        summary.totalBruto,
        summary.totalPotongan,
        summary.totalNetto,
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rowsData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 26 },
      { wch: 13 },
      { wch: 20 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 36 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SP2D Cair");
    XLSX.writeFile(wb, `Pengeluaran_SP2D_Cair_TA_${tahunAnggaran}.xlsx`);
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

    const html = `<!DOCTYPE html>
      <html><head><meta charset="utf-8" /><title>Daftar Pengeluaran SP2D Cair</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        * { box-sizing: border-box; }
        body { font-family: "Times New Roman", Times, serif; font-size: 7.5pt; color: #000; margin: 0; }
        .header { text-align: center; margin-bottom: 10px; }
        .gov { font-size: 9.5pt; font-weight: bold; }
        .title { font-size: 11pt; font-weight: bold; margin-top: 2px; }
        .periode { font-size: 8pt; font-style: italic; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7pt; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
        th { background: #f1f5f9; text-align: center; }
        .num { text-align: right; font-family: "Courier New", monospace; white-space: nowrap; }
        .row-total td { font-weight: bold; background: #f8fafc; border-top: 1.5px solid #000; }
        .ttd-area { margin-top: 16px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
        .ttd-box { width: 260px; text-align: center; font-size: 8pt; line-height: 1.35; }
        .ttd-space { height: 46px; }
      </style></head><body>
      <div class="header">
        <div class="gov">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
        <div class="title">DAFTAR PENGELUARAN DAERAH (SP2D CAIR)</div>
        <div class="periode">TAHUN ANGGARAN ${tahunAnggaran}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:3%">No</th>
            <th style="width:15%">No. SP2D / SPM</th>
            <th style="width:9%">Tgl Cair / Ref</th>
            <th style="width:16%">SKPD / Penerima</th>
            <th style="width:24%">Jenis / Keperluan</th>
            <th style="width:11%">Bruto (Rp)</th>
            <th style="width:11%">Potongan (Rp)</th>
            <th style="width:11%">Netto (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${dataList.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:12px;">Belum ada data SP2D cair.</td></tr>`
        : dataList
          .map(
            (item, idx) => `<tr>
                <td style="text-align:center">${idx + 1}</td>
                <td><div style="font-family:monospace;font-weight:bold">${escapeHtml(item.no_sp2d)}</div><div style="font-size:6.5pt">SPM: ${escapeHtml(item.no_spm)}</div></td>
                <td><div>${item.tgl_cair ? new Date(item.tgl_cair).toLocaleDateString("id-ID") : new Date(item.tgl_sp2d).toLocaleDateString("id-ID")}</div><div style="font-size:6.5pt">${escapeHtml(item.no_transaksi_bank || "-")}</div></td>
                <td><div><strong>${escapeHtml(item.nm_skpd)}</strong></div><div style="font-size:6.5pt">${escapeHtml(item.nama_penerima || "-")}</div></td>
                <td><div><strong>[${escapeHtml(item.jenis_sp2d.replace(/_/g, " "))}]</strong> ${escapeHtml(item.keperluan)}</div></td>
                <td class="num">${formatAngka(item.nilai)}</td>
                <td class="num">${formatAngka(item.nilai_potongan)}</td>
                <td class="num">${formatAngka(item.nilai_bersih)}</td>
              </tr>`
          )
          .join("")
      }
          <tr class="row-total">
            <td colspan="5" style="text-align:right">TOTAL PENGELUARAN SP2D CAIR</td>
            <td class="num">${formatAngka(summary.totalBruto)}</td>
            <td class="num">${formatAngka(summary.totalPotongan)}</td>
            <td class="num">${formatAngka(summary.totalNetto)}</td>
          </tr>
        </tbody>
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
                  Pengeluaran Daerah (Daftar SP2D Cair)
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Daftar Surat Perintah Pencairan Dana (SP2D) yang telah dicairkan melalui Bank Penyalur RKUD
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards Modern */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-teal-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total SP2D Cair
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tabular-nums">
            {summary.totalSp2dCair} <span className="text-sm font-bold text-slate-500">Dokumen</span>
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1.5 inline-block">
            Telah ditransfer ke rekening penerima
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Nilai Belanja (Bruto)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 inline-block">
            Beban APBD Tahun {tahunAnggaran}
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Potongan Pajak / Lainnya
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-700 mt-2.5 font-mono tabular-nums tracking-tight">
            - {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1.5 inline-block">
            Pemotongan e-Billing Pajak &amp; IWP
          </span>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Nilai Bersih Cair (Netto)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-block">
            Total Kas Keluar dari RKUD
          </span>
        </div>
      </div>

      {/* Filter Bar Modern */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="No. SP2D / SPM / Penerima / Ref Bank..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#5E0E14]"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Perangkat Daerah (SKPD)
            </label>
            <select
              value={filterOpd}
              onChange={(e) => setFilterOpd(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#5E0E14]"
            >
              <option value="ALL">-- Seluruh SKPD / OPD --</option>
              {opdList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kd_skpd} - {o.nm_skpd}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Jenis SP2D
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#5E0E14]"
            >
              <option value="ALL">-- Semua Jenis --</option>
              <option value="UP">SP2D - UP</option>
              <option value="GU">SP2D - GU</option>
              <option value="GU_NIHIL">SP2D - GU Nihil</option>
              <option value="TU">SP2D - TU</option>
              <option value="TU_NIHIL">SP2D - TU Nihil</option>
              <option value="LS_GAJI">SP2D - LS Gaji</option>
              <option value="LS_BARANG_JASA">SP2D - LS Barjas</option>
              <option value="UP_KKPD">SP2D - UP KKPD</option>
              <option value="GU_KKPD">SP2D - GU KKPD</option>
            </select>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Dari Tgl Cair
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sampai Tgl Cair
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterOpd("ALL");
                setFilterJenis("ALL");
                setStartDate("");
                setEndDate("");
              }}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Pengeluaran SP2D Cair */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Daftar Dokumen SP2D yang Telah Dicairkan (Kas Keluar)
            </h3>
            <p className="text-[11px] text-slate-500">
              Menampilkan {dataList.length} dokumen SP2D cair oleh Kuasa BUD
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 min-w-[180px]">No. SP2D / No. SPM</th>
                <th className="px-3.5 py-3 min-w-[140px]">Tgl. Cair / Ref Bank</th>
                <th className="px-3.5 py-3 min-w-[190px]">SKPD / Penerima</th>
                <th className="px-3.5 py-3 min-w-[230px]">Jenis / Keperluan</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Nilai Bruto (Rp)</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Potongan (Rp)</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Nilai Cair / Netto (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Memuat daftar SP2D yang cair...
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada data SP2D dengan status cair pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400 tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_sp2d}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SPM: {item.no_spm}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-emerald-800">
                        {item.tgl_cair
                          ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
                          : new Date(item.tgl_sp2d).toLocaleDateString("id-ID")}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Ref: {item.no_transaksi_bank || "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{item.nm_skpd}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Ke: {item.nama_penerima || "-"} ({item.bank_penerima || "Bank"})
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5E0E14]/10 text-[#5E0E14]">
                        {item.jenis_sp2d.replace(/_/g, " ")}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-snug" title={item.keperluan}>
                        {item.keperluan}
                      </p>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                      {formatAngka(item.nilai)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-amber-700 whitespace-nowrap tabular-nums">
                      {item.nilai_potongan > 0 ? `- ${formatAngka(item.nilai_potongan)}` : "0,00"}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatAngka(item.nilai_bersih)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {dataList.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right uppercase text-[11px] tracking-wider">
                    Total Pengeluaran SP2D Cair
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
        {dataList.length > 0 && (
          <div className="border-t border-slate-200 p-3">
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              total={dataList.length}
              limit={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              onLimitChange={(l) => {
                setPageSize(l);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
