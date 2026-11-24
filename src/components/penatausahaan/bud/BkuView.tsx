"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Calendar,
  Building2,
  DollarSign,
  Printer,
  RefreshCw,
  Search,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  X,
  Save,
  RotateCcw,
  Lock,
  Landmark,
  FileSpreadsheet,
} from "lucide-react";

interface BkuItem {
  id: string;
  tanggal: string;
  no_bukti: string;
  no_bukti_penerimaan?: string;
  no_bukti_pengeluaran?: string;
  ref?: string;
  jenis: "PENERIMAAN" | "PENGELUARAN";
  uraian: string;
  skpd: string;
  debit: number;
  kredit: number;
  pengeluaran_up?: number;
  pengeluaran_tu?: number;
  pengeluaran_gu?: number;
  pengeluaran_ls_barjas?: number;
  pengeluaran_ls_gaji?: number;
  pengeluaran_ls_ppkd?: number;
  saldo: number;
  sumber_dana?: string | null;
  no_rek?: string | null;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
}

export default function BkuView() {
  const [items, setItems] = useState<BkuItem[]>([]);
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [totalPenerimaan, setTotalPenerimaan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [totalUp, setTotalUp] = useState(0);
  const [totalTu, setTotalTu] = useState(0);
  const [totalGu, setTotalGu] = useState(0);
  const [totalLsBarjas, setTotalLsBarjas] = useState(0);
  const [totalLsGaji, setTotalLsGaji] = useState(0);
  const [totalLsPpkd, setTotalLsPpkd] = useState(0);
  const [saldoAkhir, setSaldoAkhir] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [opdList, setOpdList] = useState<Array<{ id: string; kd_skpd: string; nm_skpd: string }>>([]);
  const [pejabatBud, setPejabatBud] = useState<PejabatBudItem | null>(null);

  // Modal Input Cepat Saldo Awal Kasda
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [saldoModalTahun, setSaldoModalTahun] = useState<number>(2026);
  const [saldoModalNilai, setSaldoModalNilai] = useState<string>("");
  const [saldoModalKet, setSaldoModalKet] = useState<string>("");
  const [savingSaldo, setSavingSaldo] = useState(false);

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
          setSaldoModalTahun(scopeJson.data.session.tahunAnggaran);
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

      const res = await fetch(`/api/penatausahaan/bud/bku?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSaldoAwal(json.data.saldoAwal || 0);
        setTotalPenerimaan(json.data.totalPenerimaan || 0);
        setTotalPengeluaran(json.data.totalPengeluaran || 0);
        setTotalUp(json.data.totalUp || 0);
        setTotalTu(json.data.totalTu || 0);
        setTotalGu(json.data.totalGu || 0);
        setTotalLsBarjas(json.data.totalLsBarjas || 0);
        setTotalLsGaji(json.data.totalLsGaji || 0);
        setTotalLsPpkd(json.data.totalLsPpkd || 0);
        setSaldoAkhir(json.data.saldoAkhir || 0);
      }
    } catch (e) {
      console.error("Gagal memuat BKU:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterOpd]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.no_bukti || "").toLowerCase().includes(q) ||
        (item.uraian || "").toLowerCase().includes(q) ||
        (item.skpd || "").toLowerCase().includes(q) ||
        (item.ref || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatAngkaBku = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatTanggalSlash = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

  const handlePrintAction = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const escapeHtml = (str: string) =>
      (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const periodeText =
      startDate && endDate
        ? `PERIODE ${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
        : startDate
          ? `PERIODE MULAI ${formatTanggalIndo(startDate)}`
          : endDate
            ? `PERIODE S/D ${formatTanggalIndo(endDate)}`
            : `TAHUN ANGGARAN ${new Date().getFullYear()}`;

    const selectedOpdObj = opdList.find((o) => o.id === filterOpd);
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
          <title>Buku Kas Umum BUD</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 7mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: "Times New Roman", Times, serif;
              color: #000;
              margin: 0;
              padding: 0;
              font-size: 7pt;
              line-height: 1.2;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .title-area {
              text-align: center;
              margin-bottom: 8px;
            }
            .gov-title {
              font-size: 9pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            .main-title {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 1px;
            }
            .sub-title {
              font-size: 8.5pt;
              font-weight: bold;
              margin-top: 1px;
            }
            .periode-title {
              font-size: 8pt;
              margin-top: 3px;
            }
            table.bku-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 1px solid #000;
              font-size: 6.5pt;
            }
            table.bku-table thead {
              display: table-header-group;
            }
            table.bku-table tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table.bku-table th,
            table.bku-table td {
              border: 1px solid #000;
              padding: 2px 2.5px;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: anywhere;
            }
            table.bku-table th {
              background: #e5e7eb;
              font-weight: bold;
              text-align: center;
            }
            .col-num th {
              background: #f3f4f6;
              font-size: 6pt;
              padding: 1px 2px;
            }
            .num {
              text-align: right;
              white-space: nowrap;
              font-family: "Times New Roman", Times, serif;
            }
            .bukti {
              text-align: center;
              font-size: 6pt;
              word-break: break-all;
              line-height: 1.15;
            }
            .row-total td {
              font-weight: bold;
              background: #f3f4f6;
              border-top: 1.5px solid #000;
            }
            .ttd-area {
              margin-top: 14px;
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
            .ttd-space { height: 46px; }
          </style>
        </head>
        <body>
          <div class="title-area">
            <div class="gov-title">KABUPATEN TAPANULI SELATAN</div>
            <div class="main-title">BUKU KAS UMUM</div>
            ${selectedOpdObj ? `<div class="sub-title">${escapeHtml(selectedOpdObj.nm_skpd)}</div>` : ""}
            <div class="periode-title">${escapeHtml(periodeText)}</div>
          </div>

          <table class="bku-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 4.5%;">TANGGAL</th>
                <th colspan="2" style="width: 17%;">NOMOR BUKTI</th>
                <th rowspan="2" style="width: 17%;">URAIAN</th>
                <th rowspan="2" style="width: 10.5%;">SKPD</th>
                <th rowspan="2" style="width: 8.5%;">REF.</th>
                <th rowspan="2" style="width: 6%;">PENERIMAAN</th>
                <th colspan="6" style="width: 29.5%;">PENGELUARAN</th>
                <th rowspan="2" style="width: 7%;">SALDO</th>
              </tr>
              <tr>
                <th style="width: 8.5%;">PENERIMAAN</th>
                <th style="width: 8.5%;">PENGELUARAN</th>
                <th style="width: 4.3%;">UP</th>
                <th style="width: 4.3%;">TU</th>
                <th style="width: 4.5%;">GU</th>
                <th style="width: 5.8%;">LS BARANG &amp;<br/>JASA</th>
                <th style="width: 5.6%;">LS GAJI/TPP</th>
                <th style="width: 5%;">LS<br/>PPKD</th>
              </tr>
              <tr class="col-num">
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th>6</th>
                <th>7</th>
                <th>8</th>
                <th>9</th>
                <th>10</th>
                <th>11</th>
                <th>12</th>
                <th>13</th>
                <th>14</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td style="font-weight: bold;">SALDO AWAL</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td class="num" style="font-weight: bold;">${formatAngkaBku(saldoAwal)}</td>
              </tr>
              ${items.length === 0
        ? `<tr><td colspan="14" style="text-align: center; padding: 14px; font-style: italic;">Tidak ada mutasi penerimaan atau pengeluaran pada rentang waktu ini.</td></tr>`
        : items
          .map(
            (item) => `
                <tr>
                  <td style="text-align: center; white-space: nowrap;">${formatTanggalSlash(item.tanggal)}</td>
                  <td class="bukti">${escapeHtml(item.no_bukti_penerimaan || (item.jenis === "PENERIMAAN" ? item.no_bukti : ""))}</td>
                  <td class="bukti">${escapeHtml(item.no_bukti_pengeluaran || (item.jenis === "PENGELUARAN" ? item.no_bukti : ""))}</td>
                  <td>${escapeHtml(item.uraian)}</td>
                  <td>${escapeHtml(item.skpd)}</td>
                  <td class="bukti">${escapeHtml(item.ref || item.no_bukti)}</td>
                  <td class="num">${formatAngkaBku(item.debit)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_up || 0)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_tu || 0)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_gu || 0)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_ls_barjas || 0)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_ls_gaji || 0)}</td>
                  <td class="num">${formatAngkaBku(item.pengeluaran_ls_ppkd || 0)}</td>
                  <td class="num">${formatAngkaBku(item.saldo)}</td>
                </tr>
              `
          )
          .join("")
      }
              <tr class="row-total">
                <td colspan="6" style="text-align: right;">JUMLAH</td>
                <td class="num">${formatAngkaBku(totalPenerimaan)}</td>
                <td class="num">${formatAngkaBku(totalUp)}</td>
                <td class="num">${formatAngkaBku(totalTu)}</td>
                <td class="num">${formatAngkaBku(totalGu)}</td>
                <td class="num">${formatAngkaBku(totalLsBarjas)}</td>
                <td class="num">${formatAngkaBku(totalLsGaji)}</td>
                <td class="num">${formatAngkaBku(totalLsPpkd)}</td>
                <td class="num">${formatAngkaBku(saldoAkhir)}</td>
              </tr>
            </tbody>
          </table>

          <div class="ttd-area">
            <div class="ttd-box">
              <div>Sipirok, ${escapeHtml(tglCetak)}</div>
              <div style="font-weight: bold; margin-top: 2px;">KUASA BENDAHARA UMUM DAERAH</div>
              <div class="ttd-space"></div>
              <div style="font-weight: bold; text-decoration: underline;">${escapeHtml(pejabatBud?.nama || "....................................")}</div>
              <div>${pejabatBud?.nip ? `NIP. ${escapeHtml(pejabatBud.nip)}` : "NIP. .............................."}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(printHtml);
    printWin.document.close();
  };

  const handleExportExcel = () => {
    const selectedOpdObj = opdList.find((o) => o.id === filterOpd);
    const periodeText =
      startDate && endDate
        ? `PERIODE ${formatTanggalIndo(startDate)} s/d ${formatTanggalIndo(endDate)}`
        : startDate
          ? `PERIODE MULAI ${formatTanggalIndo(startDate)}`
          : endDate
            ? `PERIODE S/D ${formatTanggalIndo(endDate)}`
            : `TAHUN ANGGARAN ${saldoModalTahun}`;

    const rowsData: (string | number)[][] = [
      ["KABUPATEN TAPANULI SELATAN"],
      ["BUKU KAS UMUM DAERAH (BKU BUD)"],
      [selectedOpdObj ? selectedOpdObj.nm_skpd : "SELURUH PERANGKAT DAERAH"],
      [periodeText],
      [],
      [
        "TANGGAL",
        "NOMOR BUKTI",
        "",
        "URAIAN",
        "SKPD",
        "REF.",
        "PENERIMAAN",
        "PENGELUARAN",
        "",
        "",
        "",
        "",
        "",
        "SALDO",
      ],
      [
        "",
        "PENERIMAAN",
        "PENGELUARAN",
        "",
        "",
        "",
        "",
        "UP",
        "TU",
        "GU",
        "LS BARANG & JASA",
        "LS GAJI/TPP",
        "LS PPKD",
        "",
      ],
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"],
      ["", "", "", "SALDO AWAL", "", "", "", "", "", "", "", "", "", saldoAwal],
    ];

    filteredItems.forEach((item) => {
      const noPenerimaan =
        item.no_bukti_penerimaan ||
        (item.jenis === "PENERIMAAN" ? item.no_bukti : "");
      const noPengeluaran =
        item.no_bukti_pengeluaran ||
        (item.jenis === "PENGELUARAN" ? item.no_bukti : "");
      rowsData.push([
        formatTanggalSlash(item.tanggal),
        noPenerimaan,
        noPengeluaran,
        item.uraian,
        item.skpd,
        item.ref || item.no_bukti,
        item.debit || 0,
        item.pengeluaran_up || 0,
        item.pengeluaran_tu || 0,
        item.pengeluaran_gu || 0,
        item.pengeluaran_ls_barjas || 0,
        item.pengeluaran_ls_gaji || 0,
        item.pengeluaran_ls_ppkd || 0,
        item.saldo || 0,
      ]);
    });

    rowsData.push([
      "JUMLAH",
      "",
      "",
      "",
      "",
      "",
      totalPenerimaan,
      totalUp,
      totalTu,
      totalGu,
      totalLsBarjas,
      totalLsGaji,
      totalLsPpkd,
      saldoAkhir,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rowsData);

    const lastRowIdx = rowsData.length - 1;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 13 } },
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
      { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } },
      { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },
      { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },
      { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } },
      { s: { r: 5, c: 6 }, e: { r: 6, c: 6 } },
      { s: { r: 5, c: 7 }, e: { r: 5, c: 12 } },
      { s: { r: 5, c: 13 }, e: { r: 6, c: 13 } },
      { s: { r: lastRowIdx, c: 0 }, e: { r: lastRowIdx, c: 5 } },
    ];

    ws["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 28 },
      { wch: 42 },
      { wch: 28 },
      { wch: 28 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
    ];

    // Format angka 2 desimal pada kolom 7..14 (index 6..13) mulai baris SALDO AWAL (row 8)
    for (let r = 8; r <= lastRowIdx; r++) {
      for (let c = 6; c <= 13; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (cell && typeof cell.v === "number") {
          cell.z = "#,##0.00";
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BKU BUD");
    const fileTag =
      startDate && endDate ? `${startDate}_sd_${endDate}` : `TA_${saldoModalTahun}`;
    XLSX.writeFile(wb, `BKU_BUD_${fileTag}.xlsx`);
  };

  const handleSaveSaldoAwal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedNilai = Number(saldoModalNilai.replace(/,/g, "."));
    if (Number.isNaN(parsedNilai) || parsedNilai < 0) {
      alert("Nilai saldo awal harus berupa angka >= 0.");
      return;
    }
    setSavingSaldo(true);
    try {
      const res = await fetch("/api/penatausahaan/bud/saldo-kasda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: saldoModalTahun,
          nilai: parsedNilai,
          keterangan: saldoModalKet,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSaldoModal(false);
        await fetchData();
      } else {
        alert(json.error || "Gagal menyimpan Saldo Awal Kasda.");
      }
    } catch {
      alert("Terjadi kesalahan saat menyimpan Saldo Awal Kasda.");
    } finally {
      setSavingSaldo(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Utama Modern */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Buku Kas Umum Daerah (BKU BUD)
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {saldoModalTahun}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Rekapitulasi kronologis arus kas masuk (STS/Penerimaan) dan kas keluar (SP2D Cair) pada Rekening Kas Umum Daerah
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSaldoModalNilai(saldoAwal > 0 ? String(saldoAwal) : "");
                setShowSaldoModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Input Saldo Awal</span>
            </button>
            <Link
              href="/penatausahaan/bud/saldo-kasda"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Tabel Saldo Kasda</span>
            </Link>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrintAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Buku Kas Umum</span>
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

      {/* 4 Cards Summary BKU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Saldo Awal Kasda
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(saldoAwal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 inline-block">
            {startDate ? `Posisi per sebelum ${formatTanggalSlash(startDate)}` : `Saldo Awal TA ${saldoModalTahun}`}
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Penerimaan (Debit)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-2.5 font-mono tabular-nums tracking-tight">
            + {formatRupiah(totalPenerimaan)}
          </div>
          <span className="text-[11px] text-emerald-700/80 mt-1.5 inline-block">
            Kas Masuk / Penyetoran Daerah
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-rose-200/80 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#88131A]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#88131A]">
              Pengeluaran (Kredit)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#88131A] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-[#88131A] mt-2.5 font-mono tabular-nums tracking-tight">
            - {formatRupiah(totalPengeluaran)}
          </div>
          <span className="text-[11px] text-rose-700/80 mt-1.5 inline-block">
            Kas Keluar / Pencairan SP2D
          </span>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/60 to-white rounded-2xl border border-blue-200/90 p-5 shadow-xs hover:shadow-sm transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-700" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Saldo Akhir Kasda
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-2.5 font-mono tabular-nums tracking-tight">
            {formatRupiah(saldoAkhir)}
          </div>
          <span className="text-[11px] text-blue-700 font-semibold mt-1.5 inline-block">
            Saldo Awal + Penerimaan - Pengeluaran
          </span>
        </div>
      </div>

      {/* Filter Bar Modern */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
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
                placeholder="Cari no bukti, uraian, SKPD..."
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

      {/* Tabel BKU Kas Daerah */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rincian Buku Kas Umum (Format Resmi 14 Kolom)
            </h3>
            <p className="text-[11px] text-slate-500">
              Menampilkan {filteredItems.length} dari {items.length} mutasi transaksi
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Penerimaan
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 font-semibold text-[#88131A] border border-rose-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-[#88131A]" /> Pengeluaran
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700 border-y border-slate-300 text-center">
              <tr>
                <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 whitespace-nowrap">
                  Tanggal
                </th>
                <th colSpan={2} className="border-r border-slate-300 px-2 py-1.5 border-b border-slate-300">
                  Nomor Bukti
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[220px]">
                  Uraian
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[150px]">
                  SKPD
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-2 py-2 min-w-[130px]">
                  Ref.
                </th>
                <th rowSpan={2} className="border-r border-slate-300 px-2.5 py-2 text-right whitespace-nowrap">
                  Penerimaan
                </th>
                <th colSpan={6} className="border-r border-slate-300 px-2 py-1.5 border-b border-slate-300">
                  Pengeluaran
                </th>
                <th rowSpan={2} className="px-2.5 py-2 text-right whitespace-nowrap">
                  Saldo
                </th>
              </tr>
              <tr className="bg-slate-50 text-[9.5px]">
                <th className="border-r border-slate-300 px-2 py-1.5 min-w-[120px]">Penerimaan</th>
                <th className="border-r border-slate-300 px-2 py-1.5 min-w-[120px]">Pengeluaran</th>
                <th className="border-r border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">UP</th>
                <th className="border-r border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">TU</th>
                <th className="border-r border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">GU</th>
                <th className="border-r border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">LS Barang &amp; Jasa</th>
                <th className="border-r border-slate-200 px-2 py-1.5 text-right whitespace-nowrap">LS Gaji/TPP</th>
                <th className="border-r border-slate-300 px-2 py-1.5 text-right whitespace-nowrap">LS PPKD</th>
              </tr>
              <tr className="bg-slate-100/80 text-[9px] font-mono text-slate-500 border-t border-slate-300">
                <th className="border-r border-slate-200 py-0.5">1</th>
                <th className="border-r border-slate-200 py-0.5">2</th>
                <th className="border-r border-slate-200 py-0.5">3</th>
                <th className="border-r border-slate-200 py-0.5">4</th>
                <th className="border-r border-slate-200 py-0.5">5</th>
                <th className="border-r border-slate-200 py-0.5">6</th>
                <th className="border-r border-slate-200 py-0.5">7</th>
                <th className="border-r border-slate-200 py-0.5">8</th>
                <th className="border-r border-slate-200 py-0.5">9</th>
                <th className="border-r border-slate-200 py-0.5">10</th>
                <th className="border-r border-slate-200 py-0.5">11</th>
                <th className="border-r border-slate-200 py-0.5">12</th>
                <th className="border-r border-slate-200 py-0.5">13</th>
                <th className="py-0.5">14</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Baris Saldo Awal */}
              <tr className="bg-slate-50/80 font-bold text-slate-800">
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-3 py-2">SALDO AWAL</td>
                <td className="border-r border-slate-200 px-3 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2.5 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="border-r border-slate-200 px-2 py-2"></td>
                <td className="px-2.5 py-2 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                  {formatAngkaBku(saldoAwal)}
                </td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data Buku Kas Umum...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-xs italic text-slate-400">
                    Tidak ada mutasi penerimaan atau pengeluaran yang cocok dengan filter/pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const noPenerimaan =
                    item.no_bukti_penerimaan ||
                    (item.jenis === "PENERIMAAN" ? item.no_bukti : "");
                  const noPengeluaran =
                    item.no_bukti_pengeluaran ||
                    (item.jenis === "PENGELUARAN" ? item.no_bukti : "");
                  const handleSaveSaldoAwal = async (e: React.FormEvent) => {
                    e.preventDefault();
                    const parsedNilai = Number(saldoModalNilai.replace(/,/g, "."));
                    if (Number.isNaN(parsedNilai) || parsedNilai < 0) {
                      alert("Nilai saldo awal harus berupa angka >= 0.");
                      return;
                    }
                    setSavingSaldo(true);
                    try {
                      const res = await fetch("/api/penatausahaan/bud/saldo-kasda", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          tahunAnggaran: saldoModalTahun,
                          nilai: parsedNilai,
                          keterangan: saldoModalKet,
                        }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        setShowSaldoModal(false);
                        await fetchData();
                      } else {
                        alert(json.error || "Gagal menyimpan Saldo Awal Kasda.");
                      }
                    } catch {
                      alert("Terjadi kesalahan saat menyimpan Saldo Awal Kasda.");
                    } finally {
                      setSavingSaldo(false);
                    }
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="border-r border-slate-200 px-2 py-2 text-center whitespace-nowrap">
                        {formatTanggalSlash(item.tanggal)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px] text-center break-all text-teal-800">
                        {noPenerimaan}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px] text-center break-all text-[#88131A]">
                        {noPengeluaran}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2 leading-snug">
                        {item.uraian}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-2 font-medium text-slate-800">
                        {item.skpd}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 font-mono text-[10px] text-center break-all text-slate-600">
                        {item.ref || item.no_bukti}
                      </td>
                      <td className="border-r border-slate-200 px-2.5 py-2 text-right font-mono whitespace-nowrap text-teal-700">
                        {formatAngkaBku(item.debit)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_up || 0)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_tu || 0)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_gu || 0)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_ls_barjas || 0)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_ls_gaji || 0)}
                      </td>
                      <td className="border-r border-slate-200 px-2 py-2 text-right font-mono whitespace-nowrap">
                        {formatAngkaBku(item.pengeluaran_ls_ppkd || 0)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatAngkaBku(item.saldo)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="border-r border-slate-300 px-3 py-2.5 text-right">
                  JUMLAH
                </td>
                <td className="border-r border-slate-300 px-2.5 py-2.5 text-right text-teal-700 font-mono whitespace-nowrap">
                  {formatAngkaBku(totalPenerimaan)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalUp)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalTu)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalGu)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalLsBarjas)}
                </td>
                <td className="border-r border-slate-200 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalLsGaji)}
                </td>
                <td className="border-r border-slate-300 px-2 py-2.5 text-right font-mono whitespace-nowrap">
                  {formatAngkaBku(totalLsPpkd)}
                </td>
                <td className="px-2.5 py-2.5 text-right text-blue-800 font-mono whitespace-nowrap">
                  {formatAngkaBku(saldoAkhir)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Input Cepat Saldo Awal BKU BUD */}
      {showSaldoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Input Saldo Awal BKU BUD
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nilai ini akan menjadi Saldo Awal pada pembukuan mulai awal tahun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaldoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSaldoAwal} className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Tahun Anggaran (Dikunci Sesuai Sesi Login)</span>
                </label>
                <input
                  type="number"
                  readOnly
                  disabled
                  value={saldoModalTahun}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nilai Saldo Awal Kasda (Rp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Contoh: 256144648034.85"
                  value={saldoModalNilai}
                  onChange={(e) => setSaldoModalNilai(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Saldo Awal Kasda per 1 Januari"
                  value={saldoModalKet}
                  onChange={(e) => setSaldoModalKet(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaldoModal(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSaldo}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] disabled:opacity-60 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSaldo ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

