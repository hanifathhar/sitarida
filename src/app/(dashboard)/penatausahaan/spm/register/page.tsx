"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  Search,
  Printer,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Layers,
  X,
  MapPin,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
  kepalaJabatan?: string | null;
}

interface RegisterSpmItem {
  noUrut: number;
  id: string;
  tgl_spm: string;
  tglDisplay: string;
  no_spm: string;
  no_spp: string;
  tgl_spp?: string | null;
  jenis_spm: string;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  no_spm_up: string;
  no_spm_gu: string;
  no_spm_tu: string;
  no_spm_ls_gaji: string;
  no_spm_ls_barjas: string;
  no_spm_ppkd: string;
  nilai_up: number;
  nilai_gu: number;
  nilai_tu: number;
  nilai_ls_gaji: number;
  nilai_ls_barjas: number;
  nilai_ppkd: number;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  bendaharaNama?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  paKpaJabatan?: string | null;
  status: string;
}

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatRupiahKoma(val: number | string | null | undefined): string {
  if (val === null || val === undefined || Number(val) === 0) return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatRupiahTotal(val: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export default function RegisterSpmPage() {
  const [loading, setLoading] = useState(false);
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [isCrossOpd, setIsCrossOpd] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);

  // Filters
  const [selectedOpdId, setSelectedOpdId] = useState<string>("ALL");
  const [selectedJenisSpm, setSelectedJenisSpm] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [tglMulai, setTglMulai] = useState<string>("");
  const [tglSelesai, setTglSelesai] = useState<string>("");
  const [search, setSearch] = useState("");

  // Data
  const [items, setItems] = useState<RegisterSpmItem[]>([]);
  const [totals, setTotals] = useState({
    totalUp: 0,
    totalGu: 0,
    totalTu: 0,
    totalLsGaji: 0,
    totalLsBarjas: 0,
    totalPpkd: 0,
    grandTotal: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [tempatCetak, setTempatCetak] = useState<string>("Sipirok");
  const [tanggalCetak, setTanggalCetak] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  // Banner
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // 1. Load Scope OPD
  useEffect(() => {
    async function initScope() {
      try {
        const res = await fetch("/api/penatausahaan/spm?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setOpdList(json.data.opds || []);
          setIsCrossOpd(json.data.session.isCrossOpd);
          if (!json.data.session.isCrossOpd && json.data.session.opdId) {
            setSelectedOpdId(json.data.session.opdId);
          }
        }
      } catch (err) {
        console.error("Gagal memuat scope OPD:", err);
      }
    }
    initScope();
  }, []);

  // 2. Fetch Register Data
  useEffect(() => {
    fetchRegisterData();
  }, [selectedOpdId, selectedJenisSpm, selectedStatus]);

  async function fetchRegisterData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
      });
      if (selectedOpdId && selectedOpdId !== "ALL") {
        params.append("opdId", selectedOpdId);
      }
      if (selectedJenisSpm && selectedJenisSpm !== "ALL") {
        params.append("jenisSpm", selectedJenisSpm);
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params.append("status", selectedStatus);
      }
      if (tglMulai) params.append("tglMulai", tglMulai);
      if (tglSelesai) params.append("tglSelesai", tglSelesai);
      if (search.trim()) params.append("q", search.trim());

      const res = await fetch(
        `/api/penatausahaan/spm/register?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setTotals(
          json.data.totals || {
            totalUp: 0,
            totalGu: 0,
            totalTu: 0,
            totalLsGaji: 0,
            totalLsBarjas: 0,
            totalPpkd: 0,
            grandTotal: 0,
          }
        );
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal mengambil data register SPM.",
        });
      }
    } catch (err: any) {
      console.error("Error fetch register SPM:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan sistem saat memuat data register SPM.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilter() {
    setSelectedJenisSpm("ALL");
    setSelectedStatus("ALL");
    setTglMulai("");
    setTglSelesai("");
    setSearch("");
  }

  // Active OPD Detail
  const activeOpd = useMemo(() => {
    if (selectedOpdId === "ALL") return null;
    return opdList.find((o) => o.id === selectedOpdId) || null;
  }, [selectedOpdId, opdList]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  // Cetak Dokumen Register SPM (Format Landscape A4 Resmi)
  function handlePrintAction() {
    const iframe = printIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const opdTitle = activeOpd
      ? activeOpd.nm_skpd
      : "PEMERINTAH KABUPATEN TAPANULI SELATAN";

    const periodeText =
      tglMulai && tglSelesai
        ? `PERIODE ${formatTanggalIndo(tglMulai).toUpperCase()} S/D. ${formatTanggalIndo(tglSelesai).toUpperCase()}`
        : tglMulai
          ? `MULAI ${formatTanggalIndo(tglMulai).toUpperCase()}`
          : tglSelesai
            ? `S/D. ${formatTanggalIndo(tglSelesai).toUpperCase()}`
            : `TAHUN ANGGARAN ${tahunAnggaran}`;

    const printHtml = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Register SPM - ${opdTitle}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 10mm 8mm 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 8pt;
              line-height: 1.25;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .title-area {
              text-align: center;
              margin-bottom: 8px;
            }
            .main-title {
              font-size: 11pt;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 9.5pt;
              font-weight: bold;
              margin-top: 1px;
              text-transform: uppercase;
            }
            .periode-title {
              font-size: 8pt;
              font-weight: bold;
              margin-top: 2px;
            }
            table.reg-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
              font-size: 7.5pt;
            }
            table.reg-table th, table.reg-table td {
              border: 1px solid #000;
              padding: 2.5px 3px;
              vertical-align: middle;
            }
            table.reg-table th {
              background: #fff;
              font-weight: bold;
              text-align: center;
            }
            .col-number {
              font-size: 7pt;
              font-style: italic;
              background: #fcfcfc;
            }
            .font-mono {
              font-family: 'Courier New', Courier, monospace;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .row-total td {
              font-weight: bold;
              background: #fcfcfc;
            }
            .ttd-area {
              margin-top: 16px;
              display: flex;
              justify-content: flex-end;
              page-break-inside: avoid;
            }
            .ttd-box {
              width: 320px;
              text-align: center;
              font-size: 8pt;
              line-height: 1.3;
            }
            .ttd-space {
              height: 48px;
            }
          </style>
        </head>
        <body>
          <div class="title-area">
            <div class="main-title">REGISTER SPM</div>
            <div class="sub-title">${opdTitle}</div>
            <div class="periode-title">${periodeText}</div>
          </div>

          <table class="reg-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 25px;">No.<br/>Urut</th>
                <th rowspan="2" style="width: 55px;">Tanggal</th>
                <th colspan="6">Nomor SPM</th>
                <th rowspan="2" style="width: 22%;">Uraian</th>
                <th colspan="6">Jumlah SPM<br/>(Rp)</th>
              </tr>
              <tr>
                <th style="width: 7%;">UP</th>
                <th style="width: 7%;">GU</th>
                <th style="width: 7%;">TU</th>
                <th style="width: 8%;">Gaji</th>
                <th style="width: 8%;">Barang &amp;<br/>Jasa</th>
                <th style="width: 6%;">PPKD</th>
                <th style="width: 7%;">UP</th>
                <th style="width: 7%;">GU</th>
                <th style="width: 7%;">TU</th>
                <th style="width: 7%;">Gaji</th>
                <th style="width: 7%;">Barang &amp;<br/>Jasa</th>
                <th style="width: 6%;">PPKD</th>
              </tr>
              <tr class="col-number">
                <th>1</th>
                <th>2</th>
                <th colspan="6">3</th>
                <th>4</th>
                <th colspan="6">5</th>
              </tr>
            </thead>
            <tbody>
              ${
                items.length === 0
                  ? `
                <tr>
                  <td colspan="15" class="text-center" style="padding: 16px; color: #666; font-style: italic;">
                    Tidak ada data dokumen SPM pada periode / filter yang dipilih.
                  </td>
                </tr>
              `
                  : items
                      .map(
                        (item, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center">${item.tglDisplay}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_up}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_gu}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_tu}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_ls_gaji}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_ls_barjas}</td>
                  <td class="font-mono text-center font-bold" style="font-size: 6.5pt;">${item.no_spm_ppkd}</td>
                  <td style="font-size: 7pt; line-height: 1.2;">${item.keperluan}</td>
                  <td class="text-right font-mono" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_up)}</td>
                  <td class="text-right font-mono" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_gu)}</td>
                  <td class="text-right font-mono" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_tu)}</td>
                  <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_ls_gaji)}</td>
                  <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_ls_barjas)}</td>
                  <td class="text-right font-mono" style="font-size: 7pt;">${formatRupiahKoma(item.nilai_ppkd)}</td>
                </tr>
              `
                      )
                      .join("")
              }
              <tr class="row-total">
                <td colspan="9" class="text-center font-bold">TOTAL KESELURUHAN</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalUp)}</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalGu)}</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalTu)}</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalLsGaji)}</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalLsBarjas)}</td>
                <td class="text-right font-mono font-bold" style="font-size: 7pt;">${formatRupiahKoma(totals.totalPpkd)}</td>
              </tr>
            </tbody>
          </table>

          <div class="ttd-area">
            <div class="ttd-box">
              <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak)}</div>
              <div class="font-bold" style="margin-top: 2px;">
                ${activeOpd?.kepalaJabatan || (activeOpd ? `KEPALA ${activeOpd.nm_skpd}` : "PENGGUNA ANGGARAN")}
              </div>
              <div class="ttd-space"></div>
              <div class="font-bold" style="text-decoration: underline;">
                ${activeOpd?.kepalaNama || "(..............................................)"}
              </div>
              <div style="font-size: 7.5pt; margin-top: 1px;">
                NIP. ${activeOpd?.kepalaNip || ".............................................."}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }

  return (
    <div className="space-y-6">
      {/* Action Banner Notification */}
      <ActionBanner
        feedback={banner}
        onDismiss={() => setBanner(null)}
      />

      {/* HEADER UTAMA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-red-100 text-[#88131A] text-xs font-bold tracking-wide">
                BUKU REGISTER RESMI
              </span>
              <span className="text-xs text-slate-400 font-semibold">•</span>
              <span className="text-xs font-mono font-semibold text-slate-600">
                TAHUN ANGGARAN {tahunAnggaran}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Buku Register Surat Perintah Membayar (SPM)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi dan penatausahaan dokumen SPM berdasarkan jenis UP, GU, TU, LS Gaji, LS Barang dan Jasa.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || items.length === 0}
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Register SPM</span>
            </button>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* 1. OPD */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Perangkat Daerah (OPD)
            </label>
            <select
              value={selectedOpdId}
              disabled={!isCrossOpd && opdList.length <= 1}
              onChange={(e) => setSelectedOpdId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-white font-medium disabled:bg-slate-50 disabled:text-slate-500"
            >
              {isCrossOpd && <option value="ALL">-- Seluruh OPD (Semua) --</option>}
              {opdList.map((opd) => (
                <option key={opd.id} value={opd.id}>
                  [{opd.kd_skpd}] {opd.nm_skpd}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Tanggal Mulai */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Periode Mulai
            </label>
            <input
              type="date"
              value={tglMulai}
              onChange={(e) => setTglMulai(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-white"
            />
          </div>

          {/* 3. Tanggal Selesai */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Periode Selesai
            </label>
            <input
              type="date"
              value={tglSelesai}
              onChange={(e) => setTglSelesai(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-white"
            />
          </div>

          {/* 4. Filter Jenis SPM */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Jenis SPM
            </label>
            <select
              value={selectedJenisSpm}
              onChange={(e) => setSelectedJenisSpm(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-white font-medium"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="UP">SPM-UP</option>
              <option value="GU">SPM-GU</option>
              <option value="TU">SPM-TU</option>
              <option value="LS_GAJI">SPM-LS Gaji</option>
              <option value="LS_BARANG_JASA">SPM-LS Barang & Jasa</option>
              <option value="UP_KKPD">SPM-UP KKPD</option>
              <option value="GU_KKPD">SPM-GU KKPD</option>
            </select>
          </div>

          {/* 5. Filter Status & Actions */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-white font-medium"
              >
                <option value="ALL">Semua</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DIAJUKAN">DIAJUKAN</option>
                <option value="DIVERIFIKASI">DIVERIFIKASI</option>
              </select>
            </div>
            <button
              type="button"
              onClick={fetchRegisterData}
              title="Terapkan Filter"
              className="p-2.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              title="Reset Filter"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2 border-t border-slate-100">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 translate-y-0.5" />
          <input
            type="text"
            placeholder="Cari nomor SPM, keperluan, nama penerima, atau nomor SPP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchRegisterData()}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
          />
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SPM-UP
          </span>
          <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
            {formatRupiah(totals.totalUp)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SPM-GU
          </span>
          <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
            {formatRupiah(totals.totalGu)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SPM-TU
          </span>
          <span className="text-xs font-black font-mono text-slate-900 mt-1 block">
            {formatRupiah(totals.totalTu)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SPM-LS GAJI
          </span>
          <span className="text-xs font-black font-mono text-emerald-700 mt-1 block">
            {formatRupiah(totals.totalLsGaji)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SPM-LS BARJAS
          </span>
          <span className="text-xs font-black font-mono text-blue-700 mt-1 block">
            {formatRupiah(totals.totalLsBarjas)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-[#88131A] uppercase tracking-wider block">
            GRAND TOTAL SPM
          </span>
          <span className="text-xs font-black font-mono text-[#88131A] mt-1 block">
            {formatRupiah(totals.grandTotal)}
          </span>
        </div>
      </div>

      {/* TABEL WEB REGISTER SPM (SESUAI FORMAT DOKUMEN RESMI) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent mb-2" />
            <p>Memuat data Buku Register SPM...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              Belum ada data dokumen Register SPM
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan data dokumen SPM yang sesuai dengan kriteria filter atau periode yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* HEADER TINGKAT 1 */}
              <thead className="bg-slate-100/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th
                    rowSpan={2}
                    className="py-3 px-2 text-center w-12 border-r border-slate-200"
                  >
                    No.<br />Urut
                  </th>
                  <th
                    rowSpan={2}
                    className="py-3 px-3 text-center w-24 border-r border-slate-200"
                  >
                    Tanggal
                  </th>
                  <th
                    colSpan={6}
                    className="py-2 px-3 text-center border-r border-slate-200 bg-slate-200/50"
                  >
                    Nomor SPM
                  </th>
                  <th
                    rowSpan={2}
                    className="py-3 px-4 min-w-[220px] border-r border-slate-200"
                  >
                    Uraian Keperluan Pembayaran
                  </th>
                  <th
                    colSpan={6}
                    className="py-2 px-3 text-center bg-slate-200/50"
                  >
                    Jumlah SPM (Rp)
                  </th>
                </tr>
                {/* HEADER TINGKAT 2 (SUB-KOLOM JENIS SPM) */}
                <tr className="border-t border-slate-200 text-[9px] bg-slate-50">
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">UP</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">GU</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">TU</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-32">Gaji</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-32">Barang & Jasa</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-20">PPKD</th>

                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">UP</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">GU</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-24">TU</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-28">Gaji</th>
                  <th className="py-2 px-2 text-center border-r border-slate-200 w-28">Barang & Jasa</th>
                  <th className="py-2 px-2 text-center w-20">PPKD</th>
                </tr>
                {/* NOMOR KOLOM RESMI */}
                <tr className="bg-slate-100 text-slate-400 text-[9px] font-mono text-center border-t border-slate-200">
                  <th className="py-1 px-1 border-r border-slate-200">1</th>
                  <th className="py-1 px-1 border-r border-slate-200">2</th>
                  <th colSpan={6} className="py-1 px-1 border-r border-slate-200">3</th>
                  <th className="py-1 px-1 border-r border-slate-200">4</th>
                  <th colSpan={6} className="py-1 px-1">5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {paginatedItems.map((item, index) => {
                  const noUrut = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400 border-r border-slate-100">
                        {noUrut}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 whitespace-nowrap border-r border-slate-100">
                        {item.tglDisplay}
                      </td>
                      {/* Sub-kolom Nomor SPM */}
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-slate-800 border-r border-slate-100">
                        {item.no_spm_up || "-"}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-slate-800 border-r border-slate-100">
                        {item.no_spm_gu || "-"}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-slate-800 border-r border-slate-100">
                        {item.no_spm_tu || "-"}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-emerald-800 border-r border-slate-100">
                        {item.no_spm_ls_gaji || "-"}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-blue-800 border-r border-slate-100">
                        {item.no_spm_ls_barjas || "-"}
                      </td>
                      <td className="py-2 px-2 font-mono text-[10px] text-center font-bold text-slate-800 border-r border-slate-100">
                        {item.no_spm_ppkd || "-"}
                      </td>

                      {/* Uraian Keperluan */}
                      <td className="py-2.5 px-4 text-slate-800 border-r border-slate-100">
                        <div className="line-clamp-2 max-w-md font-medium text-[11px] leading-relaxed">
                          {item.keperluan}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          SKPD: {item.nm_skpd}
                        </div>
                      </td>

                      {/* Sub-kolom Jumlah SPM */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                        {item.nilai_up > 0 ? formatRupiahKoma(item.nilai_up) : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                        {item.nilai_gu > 0 ? formatRupiahKoma(item.nilai_gu) : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                        {item.nilai_tu > 0 ? formatRupiahKoma(item.nilai_tu) : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 border-r border-slate-100">
                        {item.nilai_ls_gaji > 0 ? formatRupiahKoma(item.nilai_ls_gaji) : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-blue-700 border-r border-slate-100">
                        {item.nilai_ls_barjas > 0 ? formatRupiahKoma(item.nilai_ls_barjas) : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                        {item.nilai_ppkd > 0 ? formatRupiahKoma(item.nilai_ppkd) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* FOOTER TOTAL */}
              <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-[11px]">
                <tr>
                  <td colSpan={9} className="py-3 px-4 text-center tracking-wider text-slate-800 uppercase font-black">
                    Total Keseluruhan (Grand Total)
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold border-r border-slate-200">
                    {formatRupiahTotal(totals.totalUp)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold border-r border-slate-200">
                    {formatRupiahTotal(totals.totalGu)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold border-r border-slate-200">
                    {formatRupiahTotal(totals.totalTu)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                    {formatRupiahTotal(totals.totalLsGaji)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-blue-800 border-r border-slate-200">
                    {formatRupiahTotal(totals.totalLsBarjas)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-slate-800">
                    {formatRupiahTotal(totals.totalPpkd)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* PAGINATION BAR */}
        {items.length > 0 && (
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            total={items.length}
            limit={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onLimitChange={(l) => {
              setPageSize(l);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL CETAK REGISTER SPM (LANDSCAPE A4 RESMI)                 */}
      {/* ============================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-[#88131A] rounded-xl shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Cetak Buku Register SPM
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeOpd ? activeOpd.nm_skpd : "Semua Perangkat Daerah (OPD)"} • Format Cetak Landscape A4 Resmi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAction}
                  className="px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Parameter Tanggal & Tempat TTD */}
            <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span>Total Dokumen: <strong>{items.length}</strong></span>
                <span>•</span>
                <span>Total Nilai: <strong className="text-[#88131A]">{formatRupiah(totals.grandTotal)}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tempatCetak}
                    onChange={(e) => setTempatCetak(e.target.value)}
                    placeholder="Tempat"
                    className="w-24 text-xs font-medium bg-transparent focus:outline-none text-slate-800"
                    title="Tempat Penandatanganan"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={tanggalCetak}
                    onChange={(e) => setTanggalCetak(e.target.value)}
                    className="text-xs font-medium bg-transparent focus:outline-none text-slate-800"
                    title="Tanggal Penandatanganan"
                  />
                </div>
              </div>
            </div>

            {/* Canvas Preview Kertas Landscape */}
            <div className="flex-1 p-4 sm:p-6 bg-slate-200/70 overflow-auto flex justify-center items-start">
              <div className="w-full max-w-[285mm] min-w-[270mm] bg-white shadow-xl p-8 text-black font-sans relative border border-slate-300 rounded-sm">
                <div className="text-center mb-4">
                  <div className="text-base font-bold tracking-wider">REGISTER SPM</div>
                  <div className="text-sm font-bold uppercase mt-0.5">
                    {activeOpd ? activeOpd.nm_skpd : "PEMERINTAH KABUPATEN TAPANULI SELATAN"}
                  </div>
                  <div className="text-xs font-bold mt-1">
                    {tglMulai && tglSelesai
                      ? `PERIODE ${formatTanggalIndo(tglMulai).toUpperCase()} S/D. ${formatTanggalIndo(tglSelesai).toUpperCase()}`
                      : `TAHUN ANGGARAN ${tahunAnggaran}`}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-[9px] leading-tight">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="border border-black p-1 text-center w-8">No.<br />Urut</th>
                        <th rowSpan={2} className="border border-black p-1 text-center w-16">Tanggal</th>
                        <th colSpan={6} className="border border-black p-1 text-center">Nomor SPM</th>
                        <th rowSpan={2} className="border border-black p-1 text-center">Uraian</th>
                        <th colSpan={6} className="border border-black p-1 text-center">Jumlah SPM (Rp)</th>
                      </tr>
                      <tr>
                        <th className="border border-black p-1 text-center">UP</th>
                        <th className="border border-black p-1 text-center">GU</th>
                        <th className="border border-black p-1 text-center">TU</th>
                        <th className="border border-black p-1 text-center">Gaji</th>
                        <th className="border border-black p-1 text-center">Barang &amp; Jasa</th>
                        <th className="border border-black p-1 text-center">PPKD</th>

                        <th className="border border-black p-1 text-center">UP</th>
                        <th className="border border-black p-1 text-center">GU</th>
                        <th className="border border-black p-1 text-center">TU</th>
                        <th className="border border-black p-1 text-center">Gaji</th>
                        <th className="border border-black p-1 text-center">Barang &amp; Jasa</th>
                        <th className="border border-black p-1 text-center">PPKD</th>
                      </tr>
                      <tr className="bg-slate-50 text-[8px] font-mono text-center">
                        <th className="border border-black p-0.5">1</th>
                        <th className="border border-black p-0.5">2</th>
                        <th colSpan={6} className="border border-black p-0.5">3</th>
                        <th className="border border-black p-0.5">4</th>
                        <th colSpan={6} className="border border-black p-0.5">5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-black p-1 text-center">{idx + 1}</td>
                          <td className="border border-black p-1 text-center whitespace-nowrap">{item.tglDisplay}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_up}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_gu}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_tu}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_ls_gaji}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_ls_barjas}</td>
                          <td className="border border-black p-1 font-mono text-center font-bold text-[8px]">{item.no_spm_ppkd}</td>
                          <td className="border border-black p-1 text-[8.5px] leading-tight">{item.keperluan}</td>
                          <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(item.nilai_up)}</td>
                          <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(item.nilai_gu)}</td>
                          <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(item.nilai_tu)}</td>
                          <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiahKoma(item.nilai_ls_gaji)}</td>
                          <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiahKoma(item.nilai_ls_barjas)}</td>
                          <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(item.nilai_ppkd)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={9} className="border border-black p-1 text-center font-bold">TOTAL KESELURUHAN</td>
                        <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(totals.totalUp)}</td>
                        <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(totals.totalGu)}</td>
                        <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(totals.totalTu)}</td>
                        <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiahKoma(totals.totalLsGaji)}</td>
                        <td className="border border-black p-1 text-right font-mono font-bold">{formatRupiahKoma(totals.totalLsBarjas)}</td>
                        <td className="border border-black p-1 text-right font-mono">{formatRupiahKoma(totals.totalPpkd)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 flex justify-end">
                  <div className="w-72 text-center text-xs leading-relaxed">
                    <div>{tempatCetak}, {formatTanggalIndo(tanggalCetak)}</div>
                    <div className="font-bold mt-1">
                      {activeOpd?.kepalaJabatan || (activeOpd ? `KEPALA ${activeOpd.nm_skpd}` : "PENGGUNA ANGGARAN")}
                    </div>
                    <div className="h-14"></div>
                    <div className="font-bold underline">
                      {activeOpd?.kepalaNama || "(..............................................)"}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      NIP. {activeOpd?.kepalaNip || ".............................................."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden Iframe */}
            <iframe ref={printIframeRef} className="hidden" title="Print Register SPM" />
          </div>
        </div>
      )}
    </div>
  );
}

