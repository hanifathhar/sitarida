"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Scale,
  Printer,
  Home,
  Search,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  FileSpreadsheet,
  Wallet,
  Layers,
  CheckCircle2,
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

interface NeracaSaldoRow {
  kd_rek6: string;
  nm_rek6: string;
  saldoAwalDebet: number;
  saldoAwalKredit: number;
  sebelumDebet: number;
  sebelumKredit: number;
  penyesuaianDebet: number;
  penyesuaianKredit: number;
  setelahDebet: number;
  setelahKredit: number;
  saldoAkhirDebet: number;
  saldoAkhirKredit: number;
}

const EMPTY_TOTALS = {
  saldoAwalDebet: 0,
  saldoAwalKredit: 0,
  sebelumDebet: 0,
  sebelumKredit: 0,
  penyesuaianDebet: 0,
  penyesuaianKredit: 0,
  setelahDebet: 0,
  setelahKredit: 0,
  saldoAkhirDebet: 0,
  saldoAkhirKredit: 0,
};

export default function NeracaSaldoView() {
  const router = useRouter();

  const [isCrossOpd, setIsCrossOpd] = useState(false);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);
  const [opds, setOpds] = useState<OpdOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [allKabupaten, setAllKabupaten] = useState(false);
  const [selectedSkpd, setSelectedSkpd] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [filterLevel, setFilterLevel] = useState<"1" | "2" | "3" | "4" | "5" | "6">("6");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportExcel, setExportExcel] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<NeracaSaldoRow[]>([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    async function loadRefs() {
      setLoadingRefs(true);
      try {
        const res = await fetch("/api/akuntansi/neraca-saldo?ref=1");
        const json = await res.json();
        if (json.success && json.data) {
          setIsCrossOpd(Boolean(json.data.isCrossOpd));
          setTahunAnggaran(json.data.tahunAnggaran || 2026);
          const listOpd: OpdOption[] = json.data.opds || [];
          setOpds(listOpd);
          setUnits(json.data.units || []);
          if (listOpd.length > 0) {
            setSelectedSkpd(listOpd[0].kd_skpd);
          }
        }
      } catch (e) {
        console.error("Gagal memuat referensi Neraca Saldo:", e);
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

  const fetchNeracaSaldo = async () => {
    setErrorMsg(null);
    if (!allKabupaten && !selectedSkpd) {
      setErrorMsg("Silakan pilih OPD atau centang Tampilan Seluruh Kabupaten.");
      return null;
    }

    setLoadingData(true);
    try {
      const q = new URLSearchParams();
      q.set("tahun", String(tahunAnggaran));
      if (allKabupaten && isCrossOpd) {
        q.set("allKabupaten", "1");
      } else if (selectedSkpd) {
        q.set("kd_skpd", selectedSkpd);
        if (selectedUnit) q.set("kd_unit", selectedUnit);
      }
      if (filterLevel) q.set("rekLevel", filterLevel);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/akuntansi/neraca-saldo?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Gagal memuat data Neraca Saldo.");
        return null;
      }

      const d = json.data;
      setRows(d.rows || []);
      setTotals(d.totals || EMPTY_TOTALS);
      setHasSearched(true);
      setCurrentPage(1);
      return d as { rows: NeracaSaldoRow[]; totals: typeof EMPTY_TOTALS };
    } catch (e: any) {
      setErrorMsg(e?.message || "Terjadi kesalahan jaringan.");
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  const selectedOpdOnlyLabel = useMemo(() => {
    if (allKabupaten && isCrossOpd) return "Seluruh Kabupaten";
    const o = opds.find((x) => x.kd_skpd === selectedSkpd);
    return o ? `${o.kd_skpd} - ${o.nm_skpd}` : selectedSkpd || "-";
  }, [allKabupaten, isCrossOpd, opds, selectedSkpd]);

  const selectedUnitOnlyLabel = useMemo(() => {
    if (allKabupaten || !selectedUnit) return "";
    const u = units.find((x) => x.kd_unit === selectedUnit);
    return u ? `${u.kd_unit} - ${u.nm_unit}` : selectedUnit;
  }, [allKabupaten, units, selectedUnit]);

  const filterLevelLabel = useMemo(() => {
    const map: Record<string, string> = {
      "1": "1 | Akun",
      "2": "2 | Kelompok",
      "3": "3 | Jenis",
      "4": "4 | Objek",
      "5": "5 | Rincian Objek",
      "6": "6 | Sub Rincian Objek",
    };
    return map[filterLevel] || "6 | Sub Rincian Objek";
  }, [filterLevel]);

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

  const printedDateStr = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const handleCetak = async () => {
    const data = await fetchNeracaSaldo();
    if (!data) return;

    if (exportExcel) {
      const sheetData: any[][] = [
        ["NERACA SALDO"],
        [`OPD: ${selectedOpdOnlyLabel}`],
        ...(selectedUnitOnlyLabel ? [[`Unit: ${selectedUnitOnlyLabel}`]] : []),
        [`Filter Rekening: ${filterLevelLabel}`],
        [`Tahun Anggaran: ${tahunAnggaran}`],
        [`Periode: ${startDate || "Awal Tahun"} s/d ${endDate || "Sekarang"}`],
        [],
        [
          "Kode Rekening",
          "Nama Rekening",
          "Saldo Awal Debit",
          "Saldo Awal Kredit",
          "Sebelum Penyesuaian Debit",
          "Sebelum Penyesuaian Kredit",
          "Penyesuaian Debit",
          "Penyesuaian Kredit",
          "Setelah Penyesuaian Debit",
          "Setelah Penyesuaian Kredit",
          "Saldo Akhir Debit",
          "Saldo Akhir Kredit",
        ],
        ...data.rows.map((r) => [
          r.kd_rek6,
          r.nm_rek6,
          r.saldoAwalDebet,
          r.saldoAwalKredit,
          r.sebelumDebet,
          r.sebelumKredit,
          r.penyesuaianDebet,
          r.penyesuaianKredit,
          r.setelahDebet,
          r.setelahKredit,
          r.saldoAkhirDebet,
          r.saldoAkhirKredit,
        ]),
        [
          "",
          "TOTAL",
          data.totals.saldoAwalDebet,
          data.totals.saldoAwalKredit,
          data.totals.sebelumDebet,
          data.totals.sebelumKredit,
          data.totals.penyesuaianDebet,
          data.totals.penyesuaianKredit,
          data.totals.setelahDebet,
          data.totals.setelahKredit,
          data.totals.saldoAkhirDebet,
          data.totals.saldoAkhirKredit,
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 36 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Neraca Saldo");
      XLSX.writeFile(wb, `Neraca_Saldo_${tahunAnggaran}.xlsx`);
    } else {
      const esc = (s: string) =>
        String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      const rowsHtml =
        data.rows.length === 0
          ? `<tr><td colspan="12" style="text-align:center;font-style:italic;padding:18px;color:#64748b;">Tidak ada data neraca saldo pada filter dan periode ini.</td></tr>`
          : data.rows
            .map(
              (r) => `
              <tr>
                <td class="mono">${esc(r.kd_rek6)}</td>
                <td>${esc(r.nm_rek6)}</td>
                <td class="r mono">${formatAngka(r.saldoAwalDebet)}</td>
                <td class="r mono">${formatAngka(r.saldoAwalKredit)}</td>
                <td class="r mono">${formatAngka(r.sebelumDebet)}</td>
                <td class="r mono">${formatAngka(r.sebelumKredit)}</td>
                <td class="r mono">${formatAngka(r.penyesuaianDebet)}</td>
                <td class="r mono">${formatAngka(r.penyesuaianKredit)}</td>
                <td class="r mono">${formatAngka(r.setelahDebet)}</td>
                <td class="r mono">${formatAngka(r.setelahKredit)}</td>
                <td class="r mono bold">${formatAngka(r.saldoAkhirDebet)}</td>
                <td class="r mono bold">${formatAngka(r.saldoAkhirKredit)}</td>
              </tr>`
            )
            .join("");

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Neraca Saldo TA ${tahunAnggaran}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 9pt; }
    .kop { text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 10px; }
    .kop .pemda { font-size: 9.5pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .kop .judul { font-size: 13pt; font-weight: 800; text-transform: uppercase; margin: 2px 0; }
    .kop .ta { font-size: 9pt; font-weight: 600; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; }
    .meta td { padding: 1.5px 4px; vertical-align: top; }
    .meta td.lbl { width: 90px; font-weight: 700; }
    .meta td.sep { width: 10px; }
    table.ns { width: 100%; border-collapse: collapse; font-size: 7.2pt; }
    table.ns thead { display: table-header-group; }
    table.ns th, table.ns td { border: 1px solid #334155; padding: 3.5px 4px; vertical-align: top; }
    table.ns th { background: #f1f5f9; font-weight: 700; text-align: center; }
    table.ns tr { break-inside: avoid; }
    table.ns tfoot td { background: #f1f5f9; font-weight: 700; }
    .r { text-align: right; white-space: nowrap; }
    .mono { font-family: Consolas, "Courier New", monospace; }
    .bold { font-weight: 700; }
    .ttd { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 22px; font-size: 8.5pt; break-inside: avoid; }
    .ttd-box { text-align: center; }
    .ttd-space { height: 52px; }
    .ttd-name { font-weight: 700; text-decoration: underline; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="kop">
    <div class="pemda">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
    <div class="judul">NERACA SALDO</div>
    <div class="ta">TAHUN ANGGARAN ${tahunAnggaran}</div>
  </div>
  <table class="meta">
    <tr><td class="lbl">OPD</td><td class="sep">:</td><td>${esc(selectedOpdOnlyLabel)}</td></tr>
    ${selectedUnitOnlyLabel ? `<tr><td class="lbl">Unit</td><td class="sep">:</td><td>${esc(selectedUnitOnlyLabel)}</td></tr>` : ""}
    <tr><td class="lbl">Filter Rekening</td><td class="sep">:</td><td>${esc(filterLevelLabel)}</td></tr>
    <tr><td class="lbl">Periode</td><td class="sep">:</td><td>${esc(startDate || "Awal Tahun")} s/d ${esc(endDate || "Sekarang")}</td></tr>
  </table>
  <table class="ns">
    <thead>
      <tr>
        <th rowspan="2" style="width:92px;">Kode Rekening</th>
        <th rowspan="2">Nama Rekening</th>
        <th colspan="2">Saldo Awal</th>
        <th colspan="2">Sebelum Penyesuaian</th>
        <th colspan="2">Penyesuaian</th>
        <th colspan="2">Setelah Penyesuaian</th>
        <th colspan="2">Saldo Akhir</th>
      </tr>
      <tr>
        <th>Debit</th><th>Kredit</th>
        <th>Debit</th><th>Kredit</th>
        <th>Debit</th><th>Kredit</th>
        <th>Debit</th><th>Kredit</th>
        <th>Debit</th><th>Kredit</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" class="r">TOTAL</td>
        <td class="r mono">${formatAngka(data.totals.saldoAwalDebet)}</td>
        <td class="r mono">${formatAngka(data.totals.saldoAwalKredit)}</td>
        <td class="r mono">${formatAngka(data.totals.sebelumDebet)}</td>
        <td class="r mono">${formatAngka(data.totals.sebelumKredit)}</td>
        <td class="r mono">${formatAngka(data.totals.penyesuaianDebet)}</td>
        <td class="r mono">${formatAngka(data.totals.penyesuaianKredit)}</td>
        <td class="r mono">${formatAngka(data.totals.setelahDebet)}</td>
        <td class="r mono">${formatAngka(data.totals.setelahKredit)}</td>
        <td class="r mono">${formatAngka(data.totals.saldoAkhirDebet)}</td>
        <td class="r mono">${formatAngka(data.totals.saldoAkhirKredit)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="ttd">
    <div class="ttd-box">
      <div>Mengetahui,</div>
      <div class="bold">Pejabat Penatausahaan Keuangan (PPK-SKPD)</div>
      <div class="ttd-space"></div>
      <div class="ttd-name">..................................................</div>
      <div>NIP. ........................................</div>
    </div>
    <div class="ttd-box">
      <div>Dicetak tanggal ${esc(printedDateStr)}</div>
      <div class="bold">Petugas Akuntansi / Pelaporan</div>
      <div class="ttd-space"></div>
      <div class="ttd-name">..................................................</div>
      <div>NIP. ........................................</div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

      const printWin = window.open("", "_blank", "width=1200,height=780");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
      } else {
        setErrorMsg("Popup cetak diblokir browser. Izinkan popup untuk mencetak.");
      }
    }
  };

  const totalPages = Math.ceil(rows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const isBalanced =
    Math.abs(totals.saldoAkhirDebet - totals.saldoAkhirKredit) < 0.01;

  return (
    <div className="space-y-5">
      {/* Header Utama */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Neraca Saldo
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loadingData}
              onClick={fetchNeracaSaldo}
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Parameter Filter Neraca Saldo
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {isCrossOpd && (
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={allKabupaten}
                  onChange={(e) => {
                    setAllKabupaten(e.target.checked);
                    if (e.target.checked) setSelectedUnit("");
                  }}
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">OPD</label>
            <SearchableSelect
              options={skpdOptions}
              value={selectedSkpd}
              onChange={(val) => {
                setSelectedSkpd(val);
                setSelectedUnit("");
              }}
              placeholder={loadingRefs ? "Memuat OPD..." : "-- Pilih OPD --"}
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

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Filter Rekening
            </label>
            <SearchableSelect
              options={[
                { value: "1", label: "1 | Akun" },
                { value: "2", label: "2 | Kelompok" },
                { value: "3", label: "3 | Jenis" },
                { value: "4", label: "4 | Objek" },
                { value: "5", label: "5 | Rincian Objek" },
                { value: "6", label: "6 | Sub Rincian Objek" },
              ]}
              value={filterLevel}
              onChange={(val) => {
                setFilterLevel((val || "6") as "1" | "2" | "3" | "4" | "5" | "6");
              }}
              placeholder="-- Pilih Level Rekening --"
              allowClear={false}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Dengan</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setAllKabupaten(false);
                setSelectedUnit("");
                setFilterLevel("6");
                setStartDate("");
                setEndDate("");
                setExportExcel(false);
                setHasSearched(false);
                setRows([]);
                setTotals(EMPTY_TOTALS);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Jumlah Akun
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
            {rows.length} <span className="text-xs font-bold text-slate-500">Akun</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Saldo Akhir (Debit)
            </span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(totals.saldoAkhirDebet)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Saldo Akhir (Kredit)
            </span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {formatRupiah(totals.saldoAkhirKredit)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50/70 to-white rounded-2xl border border-[#5E0E14]/25 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#5E0E14]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E0E14]">
              Status Keseimbangan
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#5E0E14]" />
          </div>
          <div className="text-base font-black mt-2 text-[#5E0E14]">
            {!hasSearched ? "Belum Ditampilkan" : isBalanced ? "Balance (Seimbang)" : "Tidak Balance"}
          </div>
        </div>
      </div>

      {/* Tabel Neraca Saldo (Format 12 Kolom sesuai gambar + Saldo Akhir) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{rows.length}</span> akun
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200">
              <tr>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 min-w-[130px] text-center">
                  Kode Rekening
                </th>
                <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 min-w-[220px] text-center">
                  Nama Rekening
                </th>
                <th colSpan={2} className="px-3 py-2 border-b border-r border-slate-200 text-center">
                  Saldo Awal
                </th>
                <th colSpan={2} className="px-3 py-2 border-b border-r border-slate-200 text-center">
                  Sebelum Penyesuaian
                </th>
                <th colSpan={2} className="px-3 py-2 border-b border-r border-slate-200 text-center">
                  Penyesuaian
                </th>
                <th colSpan={2} className="px-3 py-2 border-b border-r border-slate-200 text-center">
                  Setelah Penyesuaian
                </th>
                <th colSpan={2} className="px-3 py-2 border-b border-slate-200 text-center bg-rose-50/70 text-[#5E0E14]">
                  Saldo Akhir
                </th>
              </tr>
              <tr>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Debit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Kredit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Debit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Kredit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Debit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Kredit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Debit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px]">Kredit</th>
                <th className="px-2.5 py-2 border-r border-slate-200 text-center min-w-[110px] bg-rose-50/70 text-[#5E0E14]">Debit</th>
                <th className="px-2.5 py-2 text-center min-w-[110px] bg-rose-50/70 text-[#5E0E14]">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hasSearched ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-xs italic text-slate-400">
                    Silakan pilih filter terlebih dahulu, lalu klik tombol <span className="font-semibold text-slate-600">Tampilkan</span> untuk melihat data Neraca Saldo.
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-xs italic text-slate-400">
                    Tidak ada data Neraca Saldo pada filter dan periode ini.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.kd_rek6} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3 py-2 border-r border-slate-100 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {r.kd_rek6}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-100 leading-snug text-slate-800">
                      {r.nm_rek6}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.saldoAwalDebet)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.saldoAwalKredit)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.sebelumDebet)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.sebelumKredit)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.penyesuaianDebet)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.penyesuaianKredit)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.setelahDebet)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngka(r.setelahKredit)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-100 text-right font-mono font-bold tabular-nums whitespace-nowrap bg-rose-50/30 text-[#5E0E14]">
                      {formatAngka(r.saldoAkhirDebet)}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono font-bold tabular-nums whitespace-nowrap bg-rose-50/30 text-[#5E0E14]">
                      {formatAngka(r.saldoAkhirKredit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-900">
              <tr>
                <td colSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase text-[10px]">
                  Total
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.saldoAwalDebet)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.saldoAwalKredit)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.sebelumDebet)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.sebelumKredit)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.penyesuaianDebet)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.penyesuaianKredit)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.setelahDebet)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngka(totals.setelahKredit)}
                </td>
                <td className="px-2.5 py-2.5 border-r border-slate-200 text-right font-mono tabular-nums whitespace-nowrap bg-rose-50/70 text-[#5E0E14]">
                  {formatAngka(totals.saldoAkhirDebet)}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap bg-rose-50/70 text-[#5E0E14]">
                  {formatAngka(totals.saldoAkhirKredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="border-t border-slate-200 p-3">
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              total={rows.length}
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
