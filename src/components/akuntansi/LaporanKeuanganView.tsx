"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import MappingLaporanModal from "./MappingLaporanModal";
import type { JenisLaporanKeuangan } from "@/modules/akuntansi/laporan-keuangan.templates";
import {
  FileText,
  Printer,
  Home,
  Search,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  FileSpreadsheet,
  Settings2,
} from "lucide-react";

interface OpdOption {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface UnitOption {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

interface LaporanRow {
  id: string;
  urutan: number;
  kodeBaris: string;
  uraian: string;
  tipeBaris: string;
  level: number;
  kodeRekening: string | null;
  posisiNormal: string;
  formula: string | null;
  isBold: boolean;
  col1: number;
  col2: number;
  col3: number;
  col4: number;
}

const REPORT_META: Record<
  JenisLaporanKeuangan,
  {
    shortTitle: string;
    fullTitle: string;
  }
> = {
  LRA: {
    shortTitle: "Laporan Realisasi Anggaran (LRA)",
    fullTitle: "LAPORAN REALISASI ANGGARAN PENDAPATAN DAN BELANJA",
  },
  LO: {
    shortTitle: "Laporan Operasional (LO)",
    fullTitle: "LAPORAN OPERASIONAL",
  },
  NERACA: {
    shortTitle: "Neraca",
    fullTitle: "NERACA",
  },
};

function formatAngkaAkuntansi(val: number): string {
  const num = Number(val || 0);
  const absFormatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  return num < 0 ? `( ${absFormatted} )` : absFormatted;
}

function formatPersen(val: number): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function LaporanKeuanganView({ jenis }: { jenis: JenisLaporanKeuangan }) {
  const router = useRouter();
  const meta = REPORT_META[jenis];

  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isCrossOpd, setIsCrossOpd] = useState(false);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);
  const [opds, setOpds] = useState<OpdOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [allKabupaten, setAllKabupaten] = useState(false);
  const [selectedSkpd, setSelectedSkpd] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(() => getTodayDateStr());
  const [exportExcel, setExportExcel] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<LaporanRow[]>([]);
  const [tahunIni, setTahunIni] = useState(2026);
  const [tahunLalu, setTahunLalu] = useState(2025);

  const [mappingModalOpen, setMappingModalOpen] = useState(false);

  useEffect(() => {
    async function loadRefs() {
      setLoadingRefs(true);
      try {
        const res = await fetch("/api/akuntansi/laporan-keuangan?ref=1");
        const json = await res.json();
        if (json.success && json.data) {
          setIsSuperadmin(Boolean(json.data.isSuperadmin));
          setIsCrossOpd(Boolean(json.data.isCrossOpd));
          const ta = json.data.tahunAnggaran || 2026;
          setTahunAnggaran(ta);
          setTahunIni(ta);
          setTahunLalu(ta - 1);
          setStartDate(`${ta}-01-01`);
          setEndDate(getTodayDateStr());
          const listOpd: OpdOption[] = json.data.opds || [];
          setOpds(listOpd);
          setUnits(json.data.units || []);
          if (listOpd.length > 0) {
            setSelectedSkpd(listOpd[0].kd_skpd);
          }
        }
      } catch (e) {
        console.error("Gagal memuat referensi Laporan Keuangan:", e);
      } finally {
        setLoadingRefs(false);
      }
    }
    loadRefs();
  }, []);

  const skpdOptions: SelectOption[] = useMemo(
    () =>
      opds.map((o) => ({
        value: o.kd_skpd,
        label: `${o.kd_skpd} | ${o.nm_skpd}`,
      })),
    [opds]
  );

  const unitOptions: SelectOption[] = useMemo(() => {
    if (allKabupaten || !selectedSkpd) return [];
    const opd = opds.find((o) => o.kd_skpd === selectedSkpd);
    if (!opd) return [];
    return units
      .filter((u) => u.opdId === opd.id)
      .map((u) => ({
        value: u.kd_unit,
        label: `${u.kd_unit} | ${u.nm_unit}`,
      }));
  }, [allKabupaten, selectedSkpd, opds, units]);

  async function requestReportData() {
    const params = new URLSearchParams();
    params.set("jenis", jenis);
    params.set("tahun", String(tahunAnggaran));
    if (allKabupaten && isCrossOpd) {
      params.set("allKabupaten", "1");
    } else if (selectedSkpd) {
      params.set("kd_skpd", selectedSkpd);
      if (selectedUnit) params.set("kd_unit", selectedUnit);
    }
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const res = await fetch(`/api/akuntansi/laporan-keuangan?${params.toString()}`);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || `Gagal mengambil data ${jenis}.`);
    }
    return json.data as {
      tahunIni: number;
      tahunLalu: number;
      rows: LaporanRow[];
    };
  }

  async function fetchReport() {
    setErrorMsg(null);
    setHasSearched(true);
    setLoadingData(true);
    try {
      const data = await requestReportData();
      setTahunIni(data.tahunIni);
      setTahunLalu(data.tahunLalu);
      setRows(data.rows || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat laporan.");
    } finally {
      setLoadingData(false);
    }
  }

  const selectedSkpdLabel = useMemo(() => {
    if (allKabupaten && isCrossOpd) return "PEMERINTAH KABUPATEN TAPANULI SELATAN";
    const o = opds.find((x) => x.kd_skpd === selectedSkpd);
    return o ? `${o.kd_skpd} - ${o.nm_skpd}` : selectedSkpd || "-";
  }, [allKabupaten, isCrossOpd, opds, selectedSkpd]);

  const selectedUnitOnlyLabel = useMemo(() => {
    if (allKabupaten || !selectedUnit) return "";
    const u = units.find((x) => x.kd_unit === selectedUnit);
    return u ? `${u.kd_unit} - ${u.nm_unit}` : selectedUnit;
  }, [allKabupaten, units, selectedUnit]);

  const periodeLabel = useMemo(() => {
    const fmt = (d: string) => {
      if (!d) return "";
      return new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    };
    if (startDate && endDate) return `${fmt(startDate)} s.d. ${fmt(endDate)}`;
    if (endDate) return `SAMPAI DENGAN ${fmt(endDate).toUpperCase()}`;
    return `UNTUK TAHUN YANG BERAKHIR SAMPAI DENGAN 31 DESEMBER ${tahunIni} DAN 31 DESEMBER ${tahunLalu}`;
  }, [startDate, endDate, tahunIni, tahunLalu]);

  async function handleCetak() {
    setErrorMsg(null);
    setLoadingData(true);
    let data: { tahunIni: number; tahunLalu: number; rows: LaporanRow[] };
    try {
      data = await requestReportData();
      setTahunIni(data.tahunIni);
      setTahunLalu(data.tahunLalu);
      setRows(data.rows || []);
      setHasSearched(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data untuk dicetak.");
      setLoadingData(false);
      return;
    } finally {
      setLoadingData(false);
    }

    if (exportExcel) {
      let headers: string[] = [];
      let body: (string | number)[][] = [];

      if (jenis === "LRA") {
        headers = [
          "NO URUT",
          "URAIAN",
          `ANGGARAN ${data.tahunIni}`,
          `REALISASI ${data.tahunIni}`,
          "(%)",
          `REALISASI ${data.tahunLalu}`,
        ];
        body = data.rows.map((r) => [
          r.kodeBaris || "",
          r.uraian,
          r.col1,
          r.col2,
          Number(r.col3.toFixed(2)),
          r.col4,
        ]);
      } else if (jenis === "LO") {
        headers = [
          "NO URUT",
          "URAIAN",
          `${data.tahunIni}`,
          `${data.tahunLalu}`,
          "KENAIKAN /(PENURUNAN)",
          "(%)",
        ];
        body = data.rows.map((r) => [
          r.kodeBaris || "",
          r.uraian,
          r.col1,
          r.col2,
          r.col3,
          Number(r.col4.toFixed(2)),
        ]);
      } else {
        headers = ["URAIAN", `TAHUN ${data.tahunIni}`, `TAHUN ${data.tahunLalu}`];
        body = data.rows.map((r) => [r.uraian, r.col1, r.col2]);
      }

      const sheetData = [
        ["KABUPATEN TAPANULI SELATAN"],
        [meta.fullTitle],
        [selectedSkpdLabel],
        ...(selectedUnitOnlyLabel ? [[`Unit: ${selectedUnitOnlyLabel}`]] : []),
        [periodeLabel],
        [],
        headers,
        ...body,
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, jenis);
      XLSX.writeFile(wb, `${jenis}_${data.tahunIni}.xlsx`);
      return;
    }

    const esc = (s: string) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let theadHtml = "";
    let tbodyHtml = "";

    if (jenis === "LRA") {
      theadHtml = `
        <tr>
          <th style="width:72px;">NO<br/>URUT</th>
          <th>URAIAN</th>
          <th style="width:130px;">ANGGARAN<br/>${data.tahunIni}</th>
          <th style="width:130px;">REALISASI<br/>${data.tahunIni}</th>
          <th style="width:65px;">(%)</th>
          <th style="width:130px;">REALISASI<br/>${data.tahunLalu}</th>
        </tr>
        <tr class="colnum">
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th>
        </tr>`;
      tbodyHtml = data.rows
        .map((r) => {
          const isHeaderOrTotal = r.isBold || r.tipeBaris !== "DETAIL";
          const hideZeroHeader = r.tipeBaris === "HEADER" && !r.formula;
          return `
            <tr class="${isHeaderOrTotal ? "bold" : ""}">
              <td class="mono">${esc(r.kodeBaris)}</td>
              <td>${esc(r.uraian)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col1)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col2)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatPersen(r.col3)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col4)}</td>
            </tr>`;
        })
        .join("");
    } else if (jenis === "LO") {
      theadHtml = `
        <tr>
          <th style="width:72px;">NO<br/>URUT</th>
          <th>URAIAN</th>
          <th style="width:130px;">${data.tahunIni}</th>
          <th style="width:130px;">${data.tahunLalu}</th>
          <th style="width:135px;">KENAIKAN<br/>/(PENURUNAN)</th>
          <th style="width:65px;">(%)</th>
        </tr>
        <tr class="colnum">
          <th>1</th><th>2</th><th>3</th><th>4</th><th>6</th><th>5</th>
        </tr>`;
      tbodyHtml = data.rows
        .map((r) => {
          const isHeaderOrTotal = r.isBold || r.tipeBaris !== "DETAIL";
          const hideZeroHeader = r.tipeBaris === "HEADER" && !r.formula;
          return `
            <tr class="${isHeaderOrTotal ? "bold" : ""}">
              <td class="mono">${esc(r.kodeBaris)}</td>
              <td>${esc(r.uraian)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col1)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col2)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col3)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatPersen(r.col4)}</td>
            </tr>`;
        })
        .join("");
    } else {
      theadHtml = `
        <tr>
          <th>URAIAN</th>
          <th style="width:165px;">TAHUN<br/>${data.tahunIni}</th>
          <th style="width:165px;">TAHUN<br/>${data.tahunLalu}</th>
        </tr>`;
      tbodyHtml = data.rows
        .map((r) => {
          const isHeaderOrTotal = r.isBold || r.tipeBaris !== "DETAIL";
          const hideZeroHeader = r.tipeBaris === "HEADER" && !r.formula;
          const indent = r.level >= 3 ? "padding-left:18px;" : "";
          return `
            <tr class="${isHeaderOrTotal ? "bold" : ""}">
              <td style="${indent}">${esc(r.uraian)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col1)}</td>
              <td class="r mono">${hideZeroHeader ? "" : formatAngkaAkuntansi(r.col2)}</td>
            </tr>`;
        })
        .join("");
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${esc(meta.shortTitle)} TA ${data.tahunIni}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Georgia, serif; color: #0f172a; margin: 0; padding: 0; font-size: 9.5pt; }
    .kop { text-align: center; margin-bottom: 10px; }
    .kop .pemda { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
    .kop .judul { font-size: 11pt; font-weight: 700; text-transform: uppercase; margin: 2px 0; }
    .kop .sub { font-size: 9pt; }
    .meta { font-size: 8.5pt; margin-bottom: 8px; }
    table.rep { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    table.rep thead { display: table-header-group; }
    table.rep th, table.rep td { border: 1px solid #0f172a; padding: 3px 6px; vertical-align: top; }
    table.rep th { text-align: center; font-weight: 700; background: #f8fafc; }
    table.rep tr.colnum th { font-size: 8pt; padding: 2px 4px; }
    table.rep tr.bold td { font-weight: 700; }
    .r { text-align: right; }
    .mono { font-variant-numeric: tabular-nums; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="kop">
    <div class="pemda">KABUPATEN TAPANULI SELATAN</div>
    <div class="judul">${esc(meta.fullTitle)}</div>
    <div class="sub">${esc(periodeLabel)}</div>
  </div>
  <div class="meta">
    <div><strong>OPD :</strong> ${esc(selectedSkpdLabel)}</div>
    ${selectedUnitOnlyLabel ? `<div><strong>Unit :</strong> ${esc(selectedUnitOnlyLabel)}</div>` : ""}
  </div>
  <table class="rep">
    <thead>${theadHtml}</thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="space-y-5">
      {/* Header Utama */}
      <div className="print:hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {meta.shortTitle}
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Format standar Permen 90 dengan tabel mapping rekening yang dapat dikonfigurasi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSuperadmin && (
              <button
                type="button"
                onClick={() => setMappingModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Atur Mapping Rekening</span>
              </button>
            )}
            <button
              type="button"
              disabled={loadingData}
              onClick={fetchReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {loadingData ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Tampilkan</span>
            </button>
            <button
              type="button"
              disabled={loadingData}
              onClick={handleCetak}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {exportExcel ? (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{exportExcel ? "Export Excel" : "Cetak"}</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="print:hidden rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar Card (sama seperti Buku Besar) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Parameter Filter {jenis}
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {isCrossOpd && (
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={allKabupaten}
                  onChange={(e) => setAllKabupaten(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#5E0E14] focus:ring-[#5E0E14] cursor-pointer"
                />
                <span>Tampilan Seluruh Kabupaten</span>
              </label>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={exportExcel}
                onChange={(e) => setExportExcel(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 cursor-pointer"
              />
              <span>Output Excel (.xlsx)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end text-xs">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">SKPD</label>
            <SearchableSelect
              options={skpdOptions}
              value={selectedSkpd}
              onChange={(val) => {
                setSelectedSkpd(val);
                setSelectedUnit("");
              }}
              placeholder={loadingRefs ? "Memuat SKPD..." : "-- Pilih SKPD --"}
              disabled={allKabupaten || !isCrossOpd}
              allowClear={false}
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Kerja</label>
            <SearchableSelect
              options={unitOptions}
              value={selectedUnit}
              onChange={(val) => setSelectedUnit(val)}
              placeholder={allKabupaten ? "Nonaktif (Seluruh Kabupaten)" : "Semua Unit Kerja"}
              clearLabel="Semua Unit Kerja"
              disabled={allKabupaten || !selectedSkpd}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Sampai Dengan
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAllKabupaten(false);
                setSelectedUnit("");
                setStartDate(`${tahunAnggaran}-01-01`);
                setEndDate(getTodayDateStr());
                setExportExcel(false);
                setHasSearched(false);
                setRows([]);
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 text-center space-y-0.5 bg-slate-50/40">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-700">
            KABUPATEN TAPANULI SELATAN
          </div>
          <div className="text-sm sm:text-base font-extrabold uppercase text-slate-900">
            {meta.fullTitle}
          </div>
          <div className="text-[11px] text-slate-600">{periodeLabel}</div>
          <div className="text-[11px] text-slate-500 pt-1">
            OPD: <span className="font-semibold text-slate-700">{selectedSkpdLabel}</span>
            {selectedUnitOnlyLabel && (
              <>
                {" "}
                | Unit: <span className="font-semibold text-slate-700">{selectedUnitOnlyLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {!hasSearched ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Pilih filter lalu klik <span className="font-bold text-slate-600">Tampilkan</span>{" "}
              untuk memuat {meta.shortTitle}.
            </div>
          ) : loadingData ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5E0E14]" />
              Menghitung {meta.shortTitle}...
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                {jenis === "LRA" && (
                  <>
                    <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                      <th className="border border-slate-300 px-2.5 py-2 w-24">NO URUT</th>
                      <th className="border border-slate-300 px-3 py-2">URAIAN</th>
                      <th className="border border-slate-300 px-3 py-2 w-40">
                        ANGGARAN {tahunIni}
                      </th>
                      <th className="border border-slate-300 px-3 py-2 w-40">
                        REALISASI {tahunIni}
                      </th>
                      <th className="border border-slate-300 px-2.5 py-2 w-20">(%)</th>
                      <th className="border border-slate-300 px-3 py-2 w-40">
                        REALISASI {tahunLalu}
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 font-bold text-center text-[11px]">
                      <th className="border border-slate-300 py-1">1</th>
                      <th className="border border-slate-300 py-1">2</th>
                      <th className="border border-slate-300 py-1">3</th>
                      <th className="border border-slate-300 py-1">4</th>
                      <th className="border border-slate-300 py-1">5</th>
                      <th className="border border-slate-300 py-1">6</th>
                    </tr>
                  </>
                )}

                {jenis === "LO" && (
                  <>
                    <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                      <th className="border border-slate-300 px-2.5 py-2 w-24">NO URUT</th>
                      <th className="border border-slate-300 px-3 py-2">URAIAN</th>
                      <th className="border border-slate-300 px-3 py-2 w-40">{tahunIni}</th>
                      <th className="border border-slate-300 px-3 py-2 w-40">{tahunLalu}</th>
                      <th className="border border-slate-300 px-3 py-2 w-40">
                        KENAIKAN /(PENURUNAN)
                      </th>
                      <th className="border border-slate-300 px-2.5 py-2 w-20">(%)</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 font-bold text-center text-[11px]">
                      <th className="border border-slate-300 py-1">1</th>
                      <th className="border border-slate-300 py-1">2</th>
                      <th className="border border-slate-300 py-1">3</th>
                      <th className="border border-slate-300 py-1">4</th>
                      <th className="border border-slate-300 py-1">6</th>
                      <th className="border border-slate-300 py-1">5</th>
                    </tr>
                  </>
                )}

                {jenis === "NERACA" && (
                  <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                    <th className="border border-slate-300 px-3 py-2">URAIAN</th>
                    <th className="border border-slate-300 px-3 py-2 w-48">TAHUN {tahunIni}</th>
                    <th className="border border-slate-300 px-3 py-2 w-48">TAHUN {tahunLalu}</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {rows.map((r) => {
                  const isHighlight = r.isBold || r.tipeBaris !== "DETAIL";
                  const hideHeaderNumbers = r.tipeBaris === "HEADER" && !r.formula;
                  const rowBg =
                    r.tipeBaris === "TOTAL"
                      ? "bg-amber-50/70 font-bold"
                      : r.tipeBaris === "SUBTOTAL"
                        ? "bg-slate-100/80 font-bold"
                        : isHighlight
                          ? "bg-slate-50/60 font-bold"
                          : "hover:bg-slate-50";

                  if (jenis === "NERACA") {
                    return (
                      <tr key={r.id} className={rowBg}>
                        <td
                          className={`border border-slate-300 px-3 py-1.5 ${
                            r.level >= 3 ? "pl-7" : ""
                          }`}
                        >
                          {r.uraian}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                          {hideHeaderNumbers ? "" : formatAngkaAkuntansi(r.col1)}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                          {hideHeaderNumbers ? "" : formatAngkaAkuntansi(r.col2)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.id} className={rowBg}>
                      <td className="border border-slate-300 px-2.5 py-1.5 font-mono">
                        {r.kodeBaris}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5">{r.uraian}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                        {hideHeaderNumbers ? "" : formatAngkaAkuntansi(r.col1)}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                        {hideHeaderNumbers ? "" : formatAngkaAkuntansi(r.col2)}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                        {hideHeaderNumbers
                          ? ""
                          : jenis === "LRA"
                            ? formatPersen(r.col3)
                            : formatAngkaAkuntansi(r.col3)}
                      </td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right font-mono">
                        {hideHeaderNumbers
                          ? ""
                          : jenis === "LRA"
                            ? formatAngkaAkuntansi(r.col4)
                            : formatPersen(r.col4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isSuperadmin && (
        <MappingLaporanModal
          open={mappingModalOpen}
          jenis={jenis}
          onClose={() => setMappingModalOpen(false)}
          onSaved={() => {
            if (hasSearched) fetchReport();
          }}
        />
      )}
    </div>
  );
}
