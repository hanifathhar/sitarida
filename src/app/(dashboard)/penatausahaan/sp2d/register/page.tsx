"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Printer,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  ChevronDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldAlert,
  X,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan?: string | null;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  roleNama: string;
}

interface RegisterSp2dRow {
  no_urut: number;
  id: string;
  tgl_sp2d: string;
  no_sp2d: string;
  no_spm: string;
  tgl_spm: string | null;
  kd_skpd: string;
  nm_skpd: string;
  uraian: string;
  nama_penerima: string | null;
  status: string;
  tgl_cair: string | null;
  // Sub-kolom Nomor SP2D
  no_sp2d_up: string | null;
  no_sp2d_gu: string | null;
  no_sp2d_tu: string | null;
  no_sp2d_ls_gaji: string | null;
  no_sp2d_ls_barjas: string | null;
  no_sp2d_ppkd: string | null;
  // Sub-kolom Nilai SP2D
  nilai_up: number;
  nilai_gu: number;
  nilai_tu: number;
  nilai_ls_gaji: number;
  nilai_ls_barjas: number;
  nilai_ppkd: number;
  nilai_total: number;
  nilai_potongan: number;
  nilai_bersih: number;
  isNihil?: boolean;
  isTuNihil?: boolean;
  isGuNihil?: boolean;
}

export default function RegisterSp2dPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [pejabatBudList, setPejabatBudList] = useState<PejabatBudItem[]>([]);
  const [selectedBudId, setSelectedBudId] = useState<string>("");
  const [selectedOpdId, setSelectedOpdId] = useState<string>("ALL");
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);

  // Filter Periode
  const [tglMulai, setTglMulai] = useState<string>("2026-01-01");
  const [tglSelesai, setTglSelesai] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filterJenis, setFilterJenis] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Data
  const [rows, setRows] = useState<RegisterSp2dRow[]>([]);
  const [totals, setTotals] = useState({
    totalUp: 0,
    totalGu: 0,
    totalTu: 0,
    totalLsGaji: 0,
    totalLsBarjas: 0,
    totalPpkd: 0,
    grandTotal: 0,
    totalPotonganAll: 0,
    totalNettoAll: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal Cetak Register
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Feedback
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // 1. Inisialisasi Scope Data OPD
  useEffect(() => {
    async function initScope() {
      try {
        const res = await fetch("/api/penatausahaan/sp2d?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setIsAuthorized(true);
          setOpdList(json.data.opds || []);
          const budList: PejabatBudItem[] = json.data.pejabatBud || [];
          setPejabatBudList(budList);
          if (budList.length > 0) {
            setSelectedBudId(budList[0].id);
          }
          if (json.data.session?.tahunAnggaran) {
            setTahunAnggaran(json.data.session.tahunAnggaran);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      }
    }
    initScope();
  }, []);

  // 2. Load Data Register SP2D
  useEffect(() => {
    if (isAuthorized) {
      loadRegisterData();
    }
  }, [selectedOpdId, filterJenis, filterStatus, tglMulai, tglSelesai, isAuthorized]);

  async function loadRegisterData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        opdId: selectedOpdId,
        jenisSp2d: filterJenis,
        status: filterStatus,
        tglMulai,
        tglSelesai,
      });
      if (search.trim()) params.append("q", search.trim());

      const res = await fetch(`/api/penatausahaan/sp2d/register?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setRows(json.data.items || []);
        setTotals(
          json.data.totals || {
            totalUp: 0,
            totalGu: 0,
            totalTu: 0,
            totalLsGaji: 0,
            totalLsBarjas: 0,
            totalPpkd: 0,
            grandTotal: 0,
            totalPotonganAll: 0,
            totalNettoAll: 0,
          }
        );
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat data buku register SP2D.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat memuat data dari server.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter Lokal Berdasarkan Search
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.no_sp2d.toLowerCase().includes(q) ||
        r.no_spm.toLowerCase().includes(q) ||
        r.nm_skpd.toLowerCase().includes(q) ||
        r.uraian.toLowerCase().includes(q) ||
        (r.nama_penerima || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const selectedOpdName = useMemo(() => {
    if (selectedOpdId === "ALL") return "Seluruh Perangkat Daerah (Kabupaten)";
    const found = opdList.find((o) => o.id === selectedOpdId);
    return found ? `${found.kd_skpd} - ${found.nm_skpd}` : "Pemerintah Kabupaten Tapanuli Selatan";
  }, [selectedOpdId, opdList]);

  const selectedBud = useMemo(() => {
    if (pejabatBudList.length === 0) return null;
    return pejabatBudList.find((b) => b.id === selectedBudId) || pejabatBudList[0];
  }, [pejabatBudList, selectedBudId]);

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

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Buku Register SP2D - ${escapeHtml(selectedOpdName)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm 8mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: "Times New Roman", Times, serif;
              color: #000;
              margin: 0;
              padding: 0;
              font-size: 7.5pt;
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .title-area {
              text-align: center;
              margin-bottom: 10px;
            }
            .gov-title {
              font-size: 9.5pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            .main-title {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .sub-title {
              font-size: 9pt;
              font-weight: bold;
              margin-top: 2px;
              text-transform: uppercase;
            }
            .periode-title {
              font-size: 8pt;
              font-style: italic;
              margin-top: 2px;
            }
            table.reg-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 1px solid #000;
              font-size: 7pt;
            }
            table.reg-table thead {
              display: table-header-group;
            }
            table.reg-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table.reg-table th,
            table.reg-table td {
              border: 1px solid #000;
              padding: 2.5px 3px;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: anywhere;
            }
            table.reg-table th {
              background: #f8fafc;
              font-weight: bold;
              text-align: center;
            }
            .col-number th {
              font-size: 6.5pt;
              font-style: italic;
              background: #f1f5f9;
              padding: 1.5px 2px;
            }
            .font-mono {
              font-family: "Courier New", Courier, monospace;
            }
            .no-sp2d-cell {
              font-family: "Courier New", Courier, monospace;
              font-size: 6pt;
              text-align: center;
              line-height: 1.15;
            }
            .num-cell {
              font-family: "Courier New", Courier, monospace;
              font-size: 6.5pt;
              text-align: right;
              white-space: nowrap;
            }
            .nihil-text {
              font-style: italic;
              font-weight: bold;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .row-total td {
              font-weight: bold;
              background: #f8fafc;
              border-top: 1.5px solid #000;
            }
            .ttd-area {
              margin-top: 16px;
              display: flex;
              justify-content: flex-end;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .ttd-box {
              width: 260px;
              text-align: center;
              font-size: 8pt;
              line-height: 1.35;
            }
            .ttd-space {
              height: 48px;
            }
          </style>
        </head>
        <body>
          <div class="title-area">
            <div class="gov-title">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
            <div class="main-title">REGISTER SURAT PERINTAH PENCAIRAN DANA (SP2D)</div>
            <div class="sub-title">${escapeHtml(selectedOpdName)}</div>
            <div class="periode-title">PERIODE ${escapeHtml(tglMulai)} S/D ${escapeHtml(tglSelesai)} — TAHUN ANGGARAN ${tahunAnggaran}</div>
          </div>

          <table class="reg-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 2.5%;">No.<br/>Urut</th>
                <th rowspan="2" style="width: 5.5%;">Tanggal</th>
                <th colspan="6" style="width: 30%;">Nomor SP2D</th>
                <th rowspan="2" style="width: 17%;">Uraian / SKPD</th>
                <th colspan="6" style="width: 32%;">Jumlah SP2D (Rp)</th>
                <th rowspan="2" style="width: 6.5%;">Potongan<br/>(Rp)</th>
                <th rowspan="2" style="width: 6.5%;">Netto<br/>(Rp)</th>
              </tr>
              <tr>
                <th style="width: 5%;">UP</th>
                <th style="width: 5%;">GU</th>
                <th style="width: 5%;">TU</th>
                <th style="width: 5%;">Gaji</th>
                <th style="width: 5.5%;">Barang &amp;<br/>Jasa</th>
                <th style="width: 4.5%;">PPKD</th>

                <th style="width: 5.2%;">UP</th>
                <th style="width: 5.2%;">GU</th>
                <th style="width: 5.2%;">TU</th>
                <th style="width: 5.5%;">Gaji</th>
                <th style="width: 5.9%;">Barang &amp;<br/>Jasa</th>
                <th style="width: 5%;">PPKD</th>
              </tr>
              <tr class="col-number">
                <th>1</th>
                <th>2</th>
                <th colspan="6">3</th>
                <th>4</th>
                <th colspan="6">5</th>
                <th>6</th>
                <th>7</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows.length === 0
        ? `<tr><td colspan="17" class="text-center" style="padding: 16px; font-style: italic;">Tidak ada data register SP2D pada periode/filter ini.</td></tr>`
        : filteredRows
          .map(
            (r, i) => `
                  <tr>
                    <td class="text-center">${i + 1}</td>
                    <td class="text-center" style="white-space: nowrap;">${escapeHtml(r.tgl_sp2d)}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_up || "")}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_gu || "")}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_tu || "")}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_ls_gaji || "")}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_ls_barjas || "")}</td>
                    <td class="no-sp2d-cell">${escapeHtml(r.no_sp2d_ppkd || "")}</td>
                    <td style="text-align: left;"><strong>${escapeHtml(r.nm_skpd)}:</strong> ${escapeHtml(r.uraian)}</td>
                    <td class="num-cell">${r.nilai_up > 0 ? formatRupiah(r.nilai_up) : ""}</td>
                    <td class="num-cell">${r.isGuNihil ? '<span class="nihil-text">Nihil</span>' : r.nilai_gu > 0 ? formatRupiah(r.nilai_gu) : ""}</td>
                    <td class="num-cell">${r.isTuNihil ? '<span class="nihil-text">Nihil</span>' : r.nilai_tu > 0 ? formatRupiah(r.nilai_tu) : ""}</td>
                    <td class="num-cell">${r.nilai_ls_gaji > 0 ? formatRupiah(r.nilai_ls_gaji) : ""}</td>
                    <td class="num-cell">${r.nilai_ls_barjas > 0 ? formatRupiah(r.nilai_ls_barjas) : ""}</td>
                    <td class="num-cell">${r.nilai_ppkd > 0 ? formatRupiah(r.nilai_ppkd) : ""}</td>
                    <td class="num-cell">${r.nilai_potongan > 0 ? formatRupiah(r.nilai_potongan) : ""}</td>
                    <td class="num-cell">${r.isNihil ? '<span class="nihil-text">Nihil</span>' : r.nilai_bersih > 0 ? formatRupiah(r.nilai_bersih) : ""}</td>
                  </tr>
                `
          )
          .join("")
      }
            </tbody>
            <tfoot>
              <tr class="row-total">
                <td colspan="8" class="text-right">TOTAL:</td>
                <td class="num-cell">${formatRupiah(totals.grandTotal)}</td>
                <td class="num-cell">${formatRupiah(totals.totalUp)}</td>
                <td class="num-cell">${formatRupiah(totals.totalGu)}</td>
                <td class="num-cell">${formatRupiah(totals.totalTu)}</td>
                <td class="num-cell">${formatRupiah(totals.totalLsGaji)}</td>
                <td class="num-cell">${formatRupiah(totals.totalLsBarjas)}</td>
                <td class="num-cell">${formatRupiah(totals.totalPpkd)}</td>
                <td class="num-cell">${formatRupiah(totals.totalPotonganAll)}</td>
                <td class="num-cell">${formatRupiah(totals.totalNettoAll)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="ttd-area">
            <div class="ttd-box">
              <div>Sipirok, ${escapeHtml(tglCetak)}</div>
              <div style="font-weight: bold; margin-top: 2px;">KUASA BENDAHARA UMUM DAERAH</div>
              <div class="ttd-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(selectedBud?.nama || "....................................")}</div>
              <div>${selectedBud?.nip ? `NIP. ${escapeHtml(selectedBud.nip)}` : "NIP. .............................."}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#88131A]" />
          <h2 className="text-base font-bold text-slate-900">
            Akses Ditolak — Khusus Otoritas BUD & Perbendaharaan
          </h2>
          <p className="text-xs text-slate-600">
            Buku Register SP2D hanya dapat diakses oleh peran BUD, Bidang Perbendaharaan, dan Superadmin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* Header Utama & Filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Buku Register Surat Perintah Pencairan Dana (Register SP2D)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi resmi seluruh penerbitan SP2D berdasarkan format standar penatausahaan daerah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Buku Register</span>
            </button>
            <button
              onClick={loadRegisterData}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer"
              title="Refresh Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Filter SKPD */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Perangkat Daerah (SKPD)
            </label>
            <select
              value={selectedOpdId}
              onChange={(e) => setSelectedOpdId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            >
              <option value="ALL">-- Seluruh SKPD (Kabupaten) --</option>
              {opdList.map((opd) => (
                <option key={opd.id} value={opd.id}>
                  {opd.kd_skpd} - {opd.singkatan || opd.nm_skpd}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Periode Tanggal */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Periode Mulai
            </label>
            <input
              type="date"
              value={tglMulai}
              onChange={(e) => setTglMulai(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Periode Sampai
            </label>
            <input
              type="date"
              value={tglSelesai}
              onChange={(e) => setTglSelesai(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            />
          </div>

          {/* Filter Jenis & Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Status & Jenis
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="UP">SP2D-UP</option>
                <option value="GU">SP2D-GU</option>
                <option value="GU_NIHIL">SP2D-GU Nihil</option>
                <option value="TU">SP2D-TU</option>
                <option value="TU_NIHIL">SP2D-TU Nihil</option>
                <option value="LS_GAJI">LS Gaji</option>
                <option value="LS_BARANG_JASA">LS Barjas</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="DISETUJUI">DISETUJUI</option>
                <option value="CAIR">CAIR</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Search */}
        <div className="pt-2 border-t border-slate-100">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nomor SP2D, nomor SPM, nama SKPD, atau uraian pembayaran..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
            />
          </div>
        </div>

        {/* Summary Card Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total UP</span>
            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
              {formatRupiah(totals.totalUp)}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total GU</span>
            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
              {formatRupiah(totals.totalGu)}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total TU</span>
            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
              {formatRupiah(totals.totalTu)}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total LS Gaji</span>
            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
              {formatRupiah(totals.totalLsGaji)}
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total LS Barjas</span>
            <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
              {formatRupiah(totals.totalLsBarjas)}
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-800 font-bold uppercase">Grand Total SP2D</span>
            <div className="text-xs font-black font-mono text-emerald-900 mt-0.5">
              {formatRupiah(totals.grandTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Register SP2D Sesuai Format Resmi */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header Baris 1 */}
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-300 text-center">
                <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 w-12">
                  No. Urut<br /><span className="text-[9px] text-slate-400 font-normal">(1)</span>
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 w-24">
                  Tanggal<br /><span className="text-[9px] text-slate-400 font-normal">(2)</span>
                </th>
                <th colSpan={6} className="border-r border-slate-300 px-3 py-1.5 bg-slate-200/70">
                  Nomor SP2D (3)
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-4 py-2 min-w-[240px]">
                  Uraian / SKPD<br /><span className="text-[9px] text-slate-400 font-normal">(4)</span>
                </th>
                <th colSpan={6} className="border-r border-slate-300 px-3 py-1.5 bg-amber-100/60 text-amber-950">
                  Jumlah SP2D (Rp) (5)
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 text-right w-28">
                  Potongan (Rp)<br /><span className="text-[9px] text-slate-400 font-normal">(6)</span>
                </th>
                <th rowSpan={2} className="px-2 py-2 text-right w-28">
                  Netto (Rp)<br /><span className="text-[9px] text-slate-400 font-normal">(7)</span>
                </th>
              </tr>
              {/* Header Baris 2 Sub-kolom Jenis */}
              <tr className="bg-slate-50 text-[10px] font-bold border-b border-slate-300 text-center">
                {/* 6 Sub-kolom Nomor SP2D */}
                <th className="border-r border-slate-200 px-2 py-1 w-24">UP</th>
                <th className="border-r border-slate-200 px-2 py-1 w-24">GU</th>
                <th className="border-r border-slate-200 px-2 py-1 w-24">TU</th>
                <th className="border-r border-slate-200 px-2 py-1 w-28">Gaji</th>
                <th className="border-r border-slate-200 px-2 py-1 w-28">Barang & Jasa</th>
                <th className="border-r border-slate-300 px-2 py-1 w-24">PPKD</th>

                {/* 6 Sub-kolom Nilai Rupiah */}
                <th className="border-r border-slate-200 px-2 py-1 text-right w-24">UP</th>
                <th className="border-r border-slate-200 px-2 py-1 text-right w-24">GU</th>
                <th className="border-r border-slate-200 px-2 py-1 text-right w-24">TU</th>
                <th className="border-r border-slate-200 px-2 py-1 text-right w-28">Gaji</th>
                <th className="border-r border-slate-200 px-2 py-1 text-right w-28">Barang & Jasa</th>
                <th className="border-r border-slate-300 px-2 py-1 text-right w-24">PPKD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                    <p className="mt-2 text-xs">Menyiapkan buku register SP2D...</p>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-slate-400">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Tidak ada data register SP2D pada periode/filter ini.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="border-r border-slate-200 px-2 py-2 text-center font-mono">
                      {row.no_urut}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-center whitespace-nowrap">
                      {row.tgl_sp2d}
                    </td>

                    {/* 6 Kolom Nomor SP2D */}
                    <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_up || ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_gu || ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_tu || ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_ls_gaji || ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_ls_barjas || ""}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 font-mono text-[10px]">
                      {row.no_sp2d_ppkd || ""}
                    </td>

                    {/* Uraian & Nama SKPD */}
                    <td className="border-r border-slate-300 px-3 py-2">
                      <div className="font-semibold text-slate-800 line-clamp-2">
                        {row.uraian}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        SKPD: <span className="font-medium">{row.nm_skpd}</span>
                      </div>
                    </td>

                    {/* 6 Kolom Nilai Rupiah SP2D */}
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.nilai_up > 0 ? formatRupiah(row.nilai_up) : ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.isGuNihil ? (
                        <span className="italic font-semibold text-amber-700">Nihil</span>
                      ) : row.nilai_gu > 0 ? (
                        formatRupiah(row.nilai_gu)
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.isTuNihil ? (
                        <span className="italic font-semibold text-amber-700">Nihil</span>
                      ) : row.nilai_tu > 0 ? (
                        formatRupiah(row.nilai_tu)
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.nilai_ls_gaji > 0 ? formatRupiah(row.nilai_ls_gaji) : ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.nilai_ls_barjas > 0 ? formatRupiah(row.nilai_ls_barjas) : ""}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right font-mono">
                      {row.nilai_ppkd > 0 ? formatRupiah(row.nilai_ppkd) : ""}
                    </td>
                    <td className="border-r border-slate-200 px-2 py-2 text-right font-mono">
                      {row.nilai_potongan > 0 ? formatRupiah(row.nilai_potongan) : ""}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800">
                      {row.isNihil ? (
                        <span className="italic font-semibold text-amber-700">Nihil</span>
                      ) : row.nilai_bersih > 0 ? (
                        formatRupiah(row.nilai_bersih)
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Baris Total Keseluruhan */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 text-[11px]">
              <tr>
                <td colSpan={8} className="border-r border-slate-300 px-4 py-2.5 text-right">
                  TOTAL KESELURUHAN (Rp):
                </td>
                <td className="border-r border-slate-300 px-3 py-2.5 text-slate-500 text-[10px] italic">
                  Rekapitulasi Periode Terpilih
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalUp)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalGu)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalTu)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalLsGaji)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalLsBarjas)}
                </td>
                <td className="border-r border-slate-300 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalPpkd)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalPotonganAll)}
                </td>
                <td className="px-2 py-2.5 text-right font-mono">
                  {formatRupiah(totals.totalNettoAll)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div className="border-t border-slate-200 p-3">
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              total={filteredRows.length}
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

      {/* MODAL CETAK BUKU REGISTER SP2D (A4 LANDSCAPE) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 print:hidden">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Cetak Buku Register SP2D (Format Resmi)
                </h3>
                <p className="text-xs text-slate-500">
                  Standar lembar register A4 Landscape untuk Kuasa BUD Pemerintah Kabupaten Tapanuli Selatan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pejabatBudList.length > 1 && (
                  <select
                    value={selectedBudId}
                    onChange={(e) => setSelectedBudId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#5E0E14] focus:outline-none"
                    title="Pilih Penandatangan Kuasa BUD"
                  >
                    {pejabatBudList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}{b.nip ? ` (${b.nip})` : ""}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handlePrintAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
              <div className="mx-auto w-full max-w-[297mm] bg-white text-black text-[9px] font-serif p-6 border border-slate-300 shadow-sm">
                {/* Header Kop Lembar Register */}
                <div className="text-center pb-3 mb-2">
                  <h1 className="text-sm font-bold uppercase tracking-wider">
                    PEMERINTAH KABUPATEN TAPANULI SELATAN
                  </h1>
                  <h2 className="text-base font-black uppercase tracking-wider mt-0.5">
                    REGISTER SURAT PERINTAH PENCAIRAN DANA (SP2D)
                  </h2>
                  <div className="text-xs font-semibold mt-1">
                    {selectedOpdName}
                  </div>
                  <div className="text-[11px] font-medium italic mt-0.5 text-slate-700">
                    PERIODE {tglMulai} S/D {tglSelesai} — TAHUN ANGGARAN {tahunAnggaran}
                  </div>
                </div>

                {/* Tabel Register Cetak */}
                <table className="w-full table-fixed text-left text-[8px] border-collapse border border-black">
                  <thead>
                    <tr className="border-b border-black text-center font-bold bg-slate-50">
                      <th rowSpan={2} className="border-r border-black p-1 w-[2.8%]">No.<br />Urut</th>
                      <th rowSpan={2} className="border-r border-black p-1 w-[5.5%]">Tanggal</th>
                      <th colSpan={6} className="border-r border-black p-1 w-[30%]">Nomor SP2D</th>
                      <th rowSpan={2} className="border-r border-black p-1 w-[16.7%]">Uraian / SKPD</th>
                      <th colSpan={6} className="border-r border-black p-1 w-[32%]">Jumlah SP2D (Rp)</th>
                      <th rowSpan={2} className="border-r border-black p-1 text-center w-[6.5%]">Potongan<br />(Rp)</th>
                      <th rowSpan={2} className="p-1 text-center w-[6.5%]">Netto<br />(Rp)</th>
                    </tr>
                    <tr className="border-b border-black text-center font-bold bg-slate-50">
                      <th className="border-r border-black p-1 w-[5%]">UP</th>
                      <th className="border-r border-black p-1 w-[5%]">GU</th>
                      <th className="border-r border-black p-1 w-[5%]">TU</th>
                      <th className="border-r border-black p-1 w-[5%]">Gaji</th>
                      <th className="border-r border-black p-1 w-[5.5%]">Barang &amp;<br />Jasa</th>
                      <th className="border-r border-black p-1 w-[4.5%]">PPKD</th>

                      <th className="border-r border-black p-1 text-right w-[5.2%]">UP</th>
                      <th className="border-r border-black p-1 text-right w-[5.2%]">GU</th>
                      <th className="border-r border-black p-1 text-right w-[5.2%]">TU</th>
                      <th className="border-r border-black p-1 text-right w-[5.5%]">Gaji</th>
                      <th className="border-r border-black p-1 text-right w-[5.9%]">Barang &amp;<br />Jasa</th>
                      <th className="border-r border-black p-1 text-right w-[5%]">PPKD</th>
                    </tr>
                    <tr className="border-b border-black bg-slate-100 text-[7px] italic text-center font-bold">
                      <th className="border-r border-black p-0.5">1</th>
                      <th className="border-r border-black p-0.5">2</th>
                      <th colSpan={6} className="border-r border-black p-0.5">3</th>
                      <th className="border-r border-black p-0.5">4</th>
                      <th colSpan={6} className="border-r border-black p-0.5">5</th>
                      <th className="border-r border-black p-0.5">6</th>
                      <th className="p-0.5">7</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, i) => (
                      <tr key={r.id} className="border-b border-black">
                        <td className="border-r border-black p-1 text-center font-mono">{i + 1}</td>
                        <td className="border-r border-black p-1 text-center whitespace-nowrap">{r.tgl_sp2d}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_up || ""}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_gu || ""}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_tu || ""}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_ls_gaji || ""}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_ls_barjas || ""}</td>
                        <td className="border-r border-black p-1 font-mono text-[7px] text-center break-all">{r.no_sp2d_ppkd || ""}</td>
                        <td className="border-r border-black p-1 leading-snug break-words">
                          <strong>{r.nm_skpd}:</strong> {r.uraian}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.nilai_up > 0 ? formatRupiah(r.nilai_up) : ""}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.isGuNihil ? (
                            <span className="italic font-semibold">Nihil</span>
                          ) : r.nilai_gu > 0 ? (
                            formatRupiah(r.nilai_gu)
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.isTuNihil ? (
                            <span className="italic font-semibold">Nihil</span>
                          ) : r.nilai_tu > 0 ? (
                            formatRupiah(r.nilai_tu)
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.nilai_ls_gaji > 0 ? formatRupiah(r.nilai_ls_gaji) : ""}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.nilai_ls_barjas > 0 ? formatRupiah(r.nilai_ls_barjas) : ""}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.nilai_ppkd > 0 ? formatRupiah(r.nilai_ppkd) : ""}
                        </td>
                        <td className="border-r border-black p-1 text-right font-mono">
                          {r.nilai_potongan > 0 ? formatRupiah(r.nilai_potongan) : ""}
                        </td>
                        <td className="p-1 text-right font-mono">
                          {r.isNihil ? (
                            <span className="italic font-semibold">Nihil</span>
                          ) : r.nilai_bersih > 0 ? (
                            formatRupiah(r.nilai_bersih)
                          ) : (
                            ""
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-bold">
                      <td colSpan={8} className="border-r border-black p-1 text-right">TOTAL:</td>
                      <td className="border-r border-black p-1 font-mono text-right">{formatRupiah(totals.grandTotal)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalUp)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalGu)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalTu)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalLsGaji)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalLsBarjas)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalPpkd)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{formatRupiah(totals.totalPotonganAll)}</td>
                      <td className="p-1 text-right font-mono">{formatRupiah(totals.totalNettoAll)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Lembar Tanda Tangan Kuasa BUD */}
                <div className="mt-8 flex justify-end text-center text-[10px]">
                  <div className="min-w-[240px]">
                    <div>Sipirok, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                    <div className="font-bold mt-0.5">KUASA BENDAHARA UMUM DAERAH</div>
                    <div className="h-16 flex items-center justify-center italic text-slate-300">
                      ( Tanda Tangan & Cap Stempel )
                    </div>
                    <div className="font-bold underline">
                      {selectedBud?.nama || "...................................."}
                    </div>
                    <div>
                      {selectedBud?.nip ? `NIP. ${selectedBud.nip}` : "NIP. .............................."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

