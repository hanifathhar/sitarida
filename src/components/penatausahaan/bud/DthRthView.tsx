"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  FileText,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  DollarSign,
  RotateCcw,
  FileSpreadsheet,
  ClipboardList,
} from "lucide-react";

interface DthItem {
  noUrut: number;
  id: string;
  tgl_cair: string | null;
  no_sp2d: string;
  no_spm: string;
  kd_skpd: string;
  nm_skpd: string;
  nama_penerima: string | null;
  npwp_penerima: string | null;
  keperluan: string;
  nilai_bruto: number;
  nilai_potongan: number;
  nilai_netto: number;
  no_transaksi_bank: string | null;
  potongan: Array<{
    kd_rek6: string;
    nm_rek6: string;
    id_billing?: string | null;
    nilai: number;
  }>;
}

interface RthItem {
  kd_rek6: string;
  nm_rek6: string;
  jumlahTransaksi: number;
  totalNilai: number;
  billingCount: number;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
}

export default function DthRthView() {
  const [activeTab, setActiveTab] = useState<"DTH" | "RTH">("DTH");
  const [dthList, setDthList] = useState<DthItem[]>([]);
  const [rthList, setRthList] = useState<RthItem[]>([]);
  const [summary, setSummary] = useState({
    totalTransaksiSp2d: 0,
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [opdList, setOpdList] = useState<Array<{ id: string; kd_skpd: string; nm_skpd: string }>>([]);
  const [pejabatBud, setPejabatBud] = useState<PejabatBudItem | null>(null);

  useEffect(() => {
    async function loadRef() {
      try {
        const [refRes, scopeRes] = await Promise.all([
          fetch("/api/penatausahaan/bud/referensi"),
          fetch("/api/penatausahaan/sp2d?scope=true"),
        ]);
        const json = await refRes.json();
        if (json.success) {
          setOpdList(json.data.opdList || []);
        }
        const scopeJson = await scopeRes.json();
        if (scopeJson.success && scopeJson.data?.pejabatBud?.length > 0) {
          setPejabatBud(scopeJson.data.pejabatBud[0]);
        }
        if (scopeJson.success && scopeJson.data?.session?.tahunAnggaran) {
          setTahunAnggaran(scopeJson.data.session.tahunAnggaran);
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
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (filterOpd !== "ALL") q.set("opdId", filterOpd);

      const res = await fetch(`/api/penatausahaan/bud/dth-rth?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDthList(json.data.dth || []);
        setRthList(json.data.rth || []);
        setSummary(
          json.data.summary || {
            totalTransaksiSp2d: 0,
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat DTH dan RTH:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterOpd]);

  const filteredDth = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dthList;
    return dthList.filter(
      (item) =>
        (item.no_sp2d || "").toLowerCase().includes(q) ||
        (item.no_spm || "").toLowerCase().includes(q) ||
        (item.nm_skpd || "").toLowerCase().includes(q) ||
        (item.nama_penerima || "").toLowerCase().includes(q) ||
        (item.npwp_penerima || "").toLowerCase().includes(q) ||
        (item.keperluan || "").toLowerCase().includes(q) ||
        item.potongan.some(
          (p) =>
            (p.nm_rek6 || "").toLowerCase().includes(q) ||
            (p.id_billing || "").toLowerCase().includes(q)
        )
    );
  }, [dthList, searchQuery]);

  const filteredRth = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rthList;
    return rthList.filter(
      (item) =>
        (item.kd_rek6 || "").toLowerCase().includes(q) ||
        (item.nm_rek6 || "").toLowerCase().includes(q)
    );
  }, [rthList, searchQuery]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatAngka = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatTanggalIndo = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleExportExcel = () => {
    const selectedOpdObj = opdList.find((o) => o.id === filterOpd);
    const periodeText =
      startDate && endDate
        ? `PERIODE ${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
        : `TAHUN ANGGARAN ${tahunAnggaran}`;

    if (activeTab === "DTH") {
      const rowsData: (string | number)[][] = [
        ["PEMERINTAH KABUPATEN TAPANULI SELATAN"],
        ["DAFTAR TRANSAKSI HARIAN (DTH) BELANJA SP2D"],
        [selectedOpdObj ? selectedOpdObj.nm_skpd : "SELURUH PERANGKAT DAERAH"],
        [periodeText],
        [],
        [
          "NO",
          "TGL CAIR",
          "NO. SP2D",
          "SKPD",
          "PENERIMA",
          "NPWP",
          "KEPERLUAN",
          "BRUTO (Rp)",
          "POTONGAN (Rp)",
          "NETTO (Rp)",
          "RINCIAN POTONGAN & ID BILLING",
        ],
      ];

      filteredDth.forEach((item, idx) => {
        const potText =
          item.potongan.length === 0
            ? "Nihil"
            : item.potongan
              .map(
                (p) =>
                  `${p.nm_rek6} (${formatAngka(p.nilai)})${p.id_billing ? ` [Billing: ${p.id_billing}]` : ""}`
              )
              .join("; ");
        rowsData.push([
          idx + 1,
          item.tgl_cair ? new Date(item.tgl_cair).toLocaleDateString("id-ID") : "-",
          item.no_sp2d,
          item.nm_skpd,
          item.nama_penerima || "-",
          item.npwp_penerima || "-",
          item.keperluan,
          item.nilai_bruto,
          item.nilai_potongan,
          item.nilai_netto,
          potText,
        ]);
      });

      const totBruto = filteredDth.reduce((s, r) => s + r.nilai_bruto, 0);
      const totPot = filteredDth.reduce((s, r) => s + r.nilai_potongan, 0);
      const totNet = filteredDth.reduce((s, r) => s + r.nilai_netto, 0);
      rowsData.push(["TOTAL", "", "", "", "", "", "", totBruto, totPot, totNet, ""]);

      const ws = XLSX.utils.aoa_to_sheet(rowsData);
      const lastRow = rowsData.length - 1;
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
        { s: { r: lastRow, c: 0 }, e: { r: lastRow, c: 6 } },
      ];
      ws["!cols"] = [
        { wch: 6 },
        { wch: 13 },
        { wch: 28 },
        { wch: 26 },
        { wch: 22 },
        { wch: 18 },
        { wch: 36 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 42 },
      ];
      for (let r = 6; r <= lastRow; r++) {
        for (let c = 7; c <= 9; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.v === "number") cell.z = "#,##0.00";
        }
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DTH");
      XLSX.writeFile(wb, `DTH_BUD_TA_${tahunAnggaran}.xlsx`);
    } else {
      const rowsData: (string | number)[][] = [
        ["PEMERINTAH KABUPATEN TAPANULI SELATAN"],
        ["REKAPITULASI TRANSAKSI HARIAN (RTH) PEMOTONGAN PAJAK"],
        [selectedOpdObj ? selectedOpdObj.nm_skpd : "SELURUH PERANGKAT DAERAH"],
        [periodeText],
        [],
        [
          "NO",
          "KODE REKENING",
          "URAIAN JENIS PAJAK / POTONGAN",
          "JUMLAH SP2D",
          "ID BILLING TERISI",
          "TOTAL POTONGAN (Rp)",
        ],
      ];

      filteredRth.forEach((item, idx) => {
        rowsData.push([
          idx + 1,
          item.kd_rek6,
          item.nm_rek6,
          item.jumlahTransaksi,
          `${item.billingCount} / ${item.jumlahTransaksi}`,
          item.totalNilai,
        ]);
      });

      const totPot = filteredRth.reduce((s, r) => s + r.totalNilai, 0);
      rowsData.push(["TOTAL", "", "", "", "", totPot]);

      const ws = XLSX.utils.aoa_to_sheet(rowsData);
      const lastRow = rowsData.length - 1;
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
        { s: { r: lastRow, c: 0 }, e: { r: lastRow, c: 4 } },
      ];
      ws["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 42 },
        { wch: 16 },
        { wch: 18 },
        { wch: 22 },
      ];
      for (let r = 6; r <= lastRow; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: 5 })];
        if (cell && typeof cell.v === "number") cell.z = "#,##0.00";
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "RTH");
      XLSX.writeFile(wb, `RTH_BUD_TA_${tahunAnggaran}.xlsx`);
    }
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

    const selectedOpdObj = opdList.find((o) => o.id === filterOpd);
    const periodeText =
      startDate && endDate
        ? `PERIODE ${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
        : `TAHUN ANGGARAN ${tahunAnggaran}`;
    const tglCetak = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const isDth = activeTab === "DTH";
    const totBruto = filteredDth.reduce((s, r) => s + r.nilai_bruto, 0);
    const totPotDth = filteredDth.reduce((s, r) => s + r.nilai_potongan, 0);
    const totNet = filteredDth.reduce((s, r) => s + r.nilai_netto, 0);
    const totPotRth = filteredRth.reduce((s, r) => s + r.totalNilai, 0);

    const tableHtml = isDth
      ? `
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">No</th>
              <th style="width: 14%;">Tgl Cair / No. SP2D</th>
              <th style="width: 16%;">SKPD / Penerima</th>
              <th style="width: 21%;">Keperluan Pembayaran</th>
              <th style="width: 10%;">Bruto (Rp)</th>
              <th style="width: 10%;">Potongan (Rp)</th>
              <th style="width: 10%;">Netto (Rp)</th>
              <th style="width: 16%;">Rincian Potongan &amp; ID Billing</th>
            </tr>
          </thead>
          <tbody>
            ${filteredDth.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:14px;font-style:italic;">Tidak ada data transaksi DTH.</td></tr>`
        : filteredDth
          .map(
            (item, idx) => `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>
                  <div>${item.tgl_cair ? new Date(item.tgl_cair).toLocaleDateString("id-ID") : "-"}</div>
                  <div style="font-family:monospace;font-weight:bold;word-break:break-all;">${escapeHtml(item.no_sp2d)}</div>
                </td>
                <td>
                  <div><strong>${escapeHtml(item.nm_skpd)}</strong></div>
                  <div>${escapeHtml(item.nama_penerima || "-")}</div>
                  ${item.npwp_penerima ? `<div style="font-size:6.5pt;">NPWP: ${escapeHtml(item.npwp_penerima)}</div>` : ""}
                </td>
                <td>${escapeHtml(item.keperluan)}</td>
                <td class="num">${formatAngka(item.nilai_bruto)}</td>
                <td class="num">${formatAngka(item.nilai_potongan)}</td>
                <td class="num">${formatAngka(item.nilai_netto)}</td>
                <td style="font-size:6.5pt;">
                  ${item.potongan.length === 0
                ? "Nihil"
                : item.potongan
                  .map(
                    (p) =>
                      `<div>• ${escapeHtml(p.nm_rek6)} (${formatAngka(p.nilai)})${p.id_billing ? ` — Billing: <b>${escapeHtml(p.id_billing)}</b>` : ""}</div>`
                  )
                  .join("")
              }
                </td>
              </tr>
            `
          )
          .join("")
      }
            <tr class="row-total">
              <td colspan="4" style="text-align:right;">TOTAL KESELURUHAN</td>
              <td class="num">${formatAngka(totBruto)}</td>
              <td class="num">${formatAngka(totPotDth)}</td>
              <td class="num">${formatAngka(totNet)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `
      : `
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">No</th>
              <th style="width: 16%;">Kode Akun Rekening</th>
              <th style="width: 39%;">Uraian Jenis Pajak / Potongan</th>
              <th style="width: 12%;">Jumlah SP2D</th>
              <th style="width: 12%;">ID Billing Terisi</th>
              <th style="width: 16%;">Total Potongan (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRth.length === 0
        ? `<tr><td colspan="6" style="text-align:center;padding:14px;font-style:italic;">Tidak ada data pemotongan pajak RTH.</td></tr>`
        : filteredRth
          .map(
            (item, idx) => `
              <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td style="font-family:monospace;font-weight:bold;">${escapeHtml(item.kd_rek6)}</td>
                <td>${escapeHtml(item.nm_rek6)}</td>
                <td style="text-align:center;">${item.jumlahTransaksi} Transaksi</td>
                <td style="text-align:center;">${item.billingCount} / ${item.jumlahTransaksi}</td>
                <td class="num">${formatAngka(item.totalNilai)}</td>
              </tr>
            `
          )
          .join("")
      }
            <tr class="row-total">
              <td colspan="5" style="text-align:right;">TOTAL PEMOTONGAN PAJAK (RTH)</td>
              <td class="num">${formatAngka(totPotRth)}</td>
            </tr>
          </tbody>
        </table>
      `;

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${isDth ? "DTH" : "RTH"} - BUD</title>
          <style>
            @page { size: A4 landscape; margin: 10mm 8mm; }
            * { box-sizing: border-box; }
            body { font-family: "Times New Roman", Times, serif; font-size: 8pt; color: #000; margin: 0; }
            .header { text-align: center; margin-bottom: 10px; }
            .gov { font-size: 9.5pt; font-weight: bold; }
            .title { font-size: 11pt; font-weight: bold; margin-top: 2px; }
            .sub { font-size: 8.5pt; font-weight: bold; margin-top: 2px; }
            .periode { font-size: 8pt; font-style: italic; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.2pt; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
            th { background: #f1f5f9; text-align: center; font-weight: bold; }
            .num { text-align: right; white-space: nowrap; font-family: "Courier New", monospace; }
            .row-total td { font-weight: bold; background: #f8fafc; border-top: 1.5px solid #000; }
            .ttd-area { margin-top: 16px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
            .ttd-box { width: 260px; text-align: center; font-size: 8pt; line-height: 1.35; }
            .ttd-space { height: 46px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gov">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
            <div class="title">${isDth ? "DAFTAR TRANSAKSI HARIAN (DTH) BELANJA SP2D" : "REKAPITULASI TRANSAKSI HARIAN (RTH) PEMOTONGAN PAJAK"}</div>
            <div class="sub">${escapeHtml(selectedOpdObj ? selectedOpdObj.nm_skpd : "SELURUH PERANGKAT DAERAH")}</div>
            <div class="periode">${escapeHtml(periodeText)}</div>
          </div>
          ${tableHtml}
          <div class="ttd-area">
            <div class="ttd-box">
              <div>Sipirok, ${escapeHtml(tglCetak)}</div>
              <div style="font-weight:bold;margin-top:2px;">KUASA BENDAHARA UMUM DAERAH</div>
              <div class="ttd-space"></div>
              <div style="font-weight:bold;text-decoration:underline;">${escapeHtml(pejabatBud?.nama || "....................................")}</div>
              <div>${pejabatBud?.nip ? `NIP. ${escapeHtml(pejabatBud.nip)}` : "NIP. .............................."}</div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  const filteredBrutoTotal = useMemo(
    () => filteredDth.reduce((s, r) => s + r.nilai_bruto, 0),
    [filteredDth]
  );
  const filteredPotonganTotal = useMemo(
    () => filteredDth.reduce((s, r) => s + r.nilai_potongan, 0),
    [filteredDth]
  );
  const filteredNettoTotal = useMemo(
    () => filteredDth.reduce((s, r) => s + r.nilai_netto, 0),
    [filteredDth]
  );
  const filteredRthTotal = useMemo(
    () => filteredRth.reduce((s, r) => s + r.totalNilai, 0),
    [filteredRth]
  );

  return (
    <div className="space-y-5">
      {/* Header Utama Modern */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  DTH dan RTH (Daftar &amp; Rekapitulasi Transaksi Harian)
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Monitoring pencairan SP2D belanja daerah serta rekonsiliasi pemotongan pajak KPPN / e-Billing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel ({activeTab})</span>
            </button>
            <button
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak {activeTab}</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              title="Segarkan Data"
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
              Jumlah Transaksi DTH
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tabular-nums">
            {summary.totalTransaksiSp2d} <span className="text-sm font-bold text-slate-500">Transaksi</span>
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1.5 inline-block">
            SP2D Belanja yang Dicairkan
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Total Belanja Bruto
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 inline-block">
            Nilai Pengeluaran Rekening Kasda
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
            {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold mt-1.5 inline-block">
            {rthList.length} Akun Pemotongan Pajak
          </span>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Bersih / Netto
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1.5 inline-block">
            Diterima Rekening Rekanan / Pegawai
          </span>
        </div>
      </div>

      {/* Tabs & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveTab("DTH")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "DTH"
                  ? "bg-white text-[#88131A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Daftar Transaksi Harian (DTH)</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "DTH"
                    ? "bg-[#88131A]/10 text-[#88131A]"
                    : "bg-slate-200/80 text-slate-600"
                  }`}
              >
                {filteredDth.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("RTH")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "RTH"
                  ? "bg-white text-[#88131A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Rekapitulasi Transaksi Harian (RTH)</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${activeTab === "RTH"
                    ? "bg-[#88131A]/10 text-[#88131A]"
                    : "bg-slate-200/80 text-slate-600"
                  }`}
              >
                {filteredRth.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            {activeTab === "DTH"
              ? "Rincian SP2D cair beserta potongan pajak & ID Billing"
              : "Akumulasi potongan pajak per kode rekening untuk rekonsiliasi"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
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
          <div className="md:col-span-2">
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
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Perangkat Daerah (SKPD)
            </label>
            <select
              value={filterOpd}
              onChange={(e) => setFilterOpd(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#5E0E14] focus:outline-none"
            >
              <option value="ALL">-- Seluruh SKPD / Kabupaten --</option>
              {opdList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kd_skpd} - {o.nm_skpd}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "DTH"
                    ? "Cari SP2D, SKPD, penerima, ID billing..."
                    : "Cari kode atau nama pajak..."
                }
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
                setFilterOpd("ALL");
                setSearchQuery("");
              }}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="md:hidden">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Tab DTH */}
      {activeTab === "DTH" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Daftar Transaksi Harian (DTH) Pengeluaran SP2D &amp; Potongan Pajak
              </h3>
              <p className="text-[11px] text-slate-500">
                Menampilkan {filteredDth.length} dari {dthList.length} dokumen SP2D cair beserta ID Billing e-Pajak
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3 text-center w-12">No</th>
                  <th className="px-3.5 py-3 min-w-[180px]">Tgl. Cair / No. SP2D</th>
                  <th className="px-3.5 py-3 min-w-[200px]">SKPD / Penerima / NPWP</th>
                  <th className="px-3.5 py-3 min-w-[220px]">Keperluan Pembayaran</th>
                  <th className="px-3.5 py-3 text-right whitespace-nowrap">Bruto (Rp)</th>
                  <th className="px-3.5 py-3 text-right whitespace-nowrap">Potongan (Rp)</th>
                  <th className="px-3.5 py-3 text-right whitespace-nowrap">Netto (Rp)</th>
                  <th className="px-3.5 py-3 min-w-[230px]">Rincian Potongan &amp; ID Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                      Memuat data Daftar Transaksi Harian (DTH)...
                    </td>
                  </tr>
                ) : filteredDth.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                      Tidak ada data transaksi DTH pada periode/pencarian ini.
                    </td>
                  </tr>
                ) : (
                  filteredDth.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="text-[11px] font-semibold text-slate-500">
                          {item.tgl_cair
                            ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
                            : "-"}
                        </div>
                        <div className="font-mono text-[11px] font-bold text-slate-900 mt-0.5 break-all">
                          {item.no_sp2d}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">{item.nm_skpd}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {item.nama_penerima || "-"}
                        </div>
                        {item.npwp_penerima && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            NPWP: {item.npwp_penerima}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 max-w-xs leading-snug text-slate-700">
                        {item.keperluan}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                        {formatAngka(item.nilai_bruto)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-amber-700 whitespace-nowrap tabular-nums">
                        {item.nilai_potongan > 0 ? `- ${formatAngka(item.nilai_potongan)}` : "0,00"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                        {formatAngka(item.nilai_netto)}
                      </td>
                      <td className="px-3.5 py-3">
                        {item.potongan.length === 0 ? (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Nihil
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {item.potongan.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="text-[11px] bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200/70"
                              >
                                <div className="flex items-center justify-between gap-2 font-semibold text-slate-700">
                                  <span>{p.nm_rek6}</span>
                                  <span className="font-mono text-amber-700 whitespace-nowrap">
                                    {formatAngka(p.nilai)}
                                  </span>
                                </div>
                                {p.id_billing ? (
                                  <div className="inline-flex items-center gap-1 font-mono text-[10px] text-teal-700 font-bold mt-0.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Billing: {p.id_billing}</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 text-[10px] text-rose-600 italic mt-0.5">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Belum ada ID Billing</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredDth.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right uppercase text-[11px] tracking-wider">
                      Total DTH
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                      {formatAngka(filteredBrutoTotal)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-amber-700 whitespace-nowrap tabular-nums">
                      {formatAngka(filteredPotonganTotal)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatAngka(filteredNettoTotal)}
                    </td>
                    <td className="px-3.5 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Konten Tab RTH */}
      {activeTab === "RTH" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Rekapitulasi Transaksi Harian (RTH) Pemotongan Pajak
              </h3>
              <p className="text-[11px] text-slate-500">
                Akumulasi seluruh pemotongan pajak (PPN, PPh, IWP, Pajak Daerah) untuk rekonsiliasi KPPN / Bapenda
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {filteredRth.length} Akun Rekening
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3 text-center w-14">No</th>
                  <th className="px-3.5 py-3 w-44">Kode Akun Rekening</th>
                  <th className="px-3.5 py-3">Uraian Jenis Pajak / Potongan</th>
                  <th className="px-3.5 py-3 text-center w-40">Jumlah SP2D Pemungut</th>
                  <th className="px-3.5 py-3 text-center w-48">Ketersediaan ID Billing</th>
                  <th className="px-3.5 py-3 text-right w-48">Total Potongan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs italic text-slate-400">
                      Memuat data Rekapitulasi Transaksi Harian (RTH)...
                    </td>
                  </tr>
                ) : filteredRth.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs italic text-slate-400">
                      Tidak ada pemotongan pajak pada periode/pencarian yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredRth.map((item, idx) => {
                    const isAllFilled =
                      item.jumlahTransaksi > 0 && item.billingCount === item.jumlahTransaksi;
                    return (
                      <tr
                        key={item.kd_rek6}
                        className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors"
                      >
                        <td className="px-3.5 py-3 text-center font-medium text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                          {item.kd_rek6}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-800">
                          {item.nm_rek6}
                        </td>
                        <td className="px-3.5 py-3 text-center font-medium tabular-nums">
                          {item.jumlahTransaksi} Transaksi
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isAllFilled
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                          >
                            {isAllFilled ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                            )}
                            <span>
                              {item.billingCount} / {item.jumlahTransaksi} Terisi
                            </span>
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap tabular-nums">
                          {formatAngka(item.totalNilai)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRth.length > 0 && (
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right uppercase text-[11px] tracking-wider">
                      Total Seluruh Pemotongan Pajak (RTH)
                    </td>
                    <td className="px-3.5 py-3 text-right text-amber-700 font-mono text-sm whitespace-nowrap tabular-nums">
                      {formatAngka(filteredRthTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
