"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  BookOpen,
  Printer,
  Home,
  Search,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  FileSpreadsheet,
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

interface RekOption {
  kode: string;
  nama: string;
}

type RekByLevel = Record<"1" | "2" | "3" | "4" | "5" | "6", RekOption[]>;

interface BukuBesarRow {
  id: string;
  tanggal: string;
  no_voucher: string;
  kd_skpd: string;
  nm_skpd: string;
  nm_unit: string;
  keterangan: string;
  kdsub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: string;
  debet: number;
  kredit: number;
  saldo: number;
  jns_transaksi: string;
}

export default function BukuBesarView() {
  const router = useRouter();

  const [isCrossOpd, setIsCrossOpd] = useState(false);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);
  const [opds, setOpds] = useState<OpdOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [rekByLevel, setRekByLevel] = useState<RekByLevel>({
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
  });
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [allKabupaten, setAllKabupaten] = useState(false);
  const [selectedSkpd, setSelectedSkpd] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [filterLevel, setFilterLevel] = useState<"1" | "2" | "3" | "4" | "5" | "6">("6");
  const [selectedRek, setSelectedRek] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportExcel, setExportExcel] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<BukuBesarRow[]>([]);
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [totalDebet, setTotalDebet] = useState(0);
  const [totalKredit, setTotalKredit] = useState(0);
  const [saldoAkhir, setSaldoAkhir] = useState(0);
  const [normalPosisi, setNormalPosisi] = useState<"D" | "K">("D");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    async function loadRefs() {
      setLoadingRefs(true);
      try {
        const res = await fetch("/api/akuntansi/buku-besar?ref=1");
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
          if (json.data.rekByLevel) {
            setRekByLevel(json.data.rekByLevel);
          }
        }
      } catch (e) {
        console.error("Gagal memuat referensi Buku Besar:", e);
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

  const rekOptions: SelectOption[] = useMemo(() => {
    const list = rekByLevel[filterLevel] || [];
    return list.map((r) => ({
      value: r.kode,
      label: `${r.kode} - ${r.nama}`,
    }));
  }, [rekByLevel, filterLevel]);

  const fetchBukuBesar = async () => {
    setErrorMsg(null);
    if (!allKabupaten && !selectedSkpd) {
      setErrorMsg("Silakan pilih SKPD atau centang Tampilan Seluruh Kabupaten.");
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
      if (selectedRek) q.set("kd_rek", selectedRek);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/akuntansi/buku-besar?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Gagal memuat data Buku Besar.");
        return null;
      }

      const d = json.data;
      setRows(d.rows || []);
      setSaldoAwal(d.saldoAwal || 0);
      setTotalDebet(d.totalDebet || 0);
      setTotalKredit(d.totalKredit || 0);
      setSaldoAkhir(d.saldoAkhir || 0);
      setNormalPosisi(d.normalPosisi || "D");
      setHasSearched(true);
      setCurrentPage(1);
      return d as {
        normalPosisi?: "D" | "K";
        rows: BukuBesarRow[];
        saldoAwal: number;
        totalDebet: number;
        totalKredit: number;
        saldoAkhir: number;
      };
    } catch (e: any) {
      setErrorMsg(e?.message || "Terjadi kesalahan jaringan.");
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  const handleCetak = async () => {
    const data = await fetchBukuBesar();
    if (!data) return;

    if (exportExcel) {
      const sheetData: any[][] = [
        ["BUKU BESAR"],
        [`OPD: ${selectedOpdOnlyLabel}`],
        ...(selectedUnitOnlyLabel ? [[`Unit: ${selectedUnitOnlyLabel}`]] : []),
        [`Tahun Anggaran: ${tahunAnggaran}`],
        [`Periode: ${startDate || "Awal Tahun"} s/d ${endDate || "Sekarang"}`],
        [],
        [
          "No",
          "Tanggal",
          "No. Voucher",
          "Kode Rekening",
          "Nama Rekening",
          "Sub Kegiatan",
          "Uraian / Keterangan",
          "Debet (Rp)",
          "Kredit (Rp)",
          "Saldo (Rp)",
        ],
        ["", "", "", "", "", "", "Saldo Awal", 0, 0, data.saldoAwal],
        ...data.rows.map((r, i) => [
          i + 1,
          r.tanggal,
          r.no_voucher,
          r.kd_rek6,
          r.nm_rek6,
          r.nm_sub_kegiatan || "-",
          r.keterangan,
          r.debet,
          r.kredit,
          r.saldo,
        ]),
        [
          "",
          "",
          "",
          "",
          "",
          "",
          "TOTAL MUTASI / SALDO AKHIR",
          data.totalDebet,
          data.totalKredit,
          data.saldoAkhir,
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 13 },
        { wch: 28 },
        { wch: 20 },
        { wch: 34 },
        { wch: 30 },
        { wch: 40 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Buku Besar");
      XLSX.writeFile(wb, `Buku_Besar_${tahunAnggaran}.xlsx`);
    } else {
      const esc = (s: string) =>
        String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      const posisi = data.normalPosisi || normalPosisi;
      const rowsHtml =
        data.rows.length === 0
          ? `<tr><td colspan="8" style="text-align:center;font-style:italic;padding:18px;color:#64748b;">Tidak ada mutasi jurnal pada filter dan periode ini.</td></tr>`
          : data.rows
            .map(
              (r, idx) => `
              <tr>
                <td class="c">${idx + 1}</td>
                <td class="nowrap">${esc(r.tanggal)}</td>
                <td class="mono">${esc(r.no_voucher)}</td>
                <td>
                  <div class="mono bold">${esc(r.kd_rek6)}</div>
                  <div>${esc(r.nm_rek6)}</div>
                </td>
                <td>
                  <div>${esc(r.keterangan)}</div>
                  ${r.nm_sub_kegiatan ? `<div class="sub">Sub Keg: ${esc(r.nm_sub_kegiatan)}</div>` : ""}
                </td>
                <td class="r mono">${formatAngka(r.debet)}</td>
                <td class="r mono">${formatAngka(r.kredit)}</td>
                <td class="r mono bold">${formatAngka(r.saldo)}</td>
              </tr>`
            )
            .join("");

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Buku Besar TA ${tahunAnggaran}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 10pt; }
    .kop { text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .kop .pemda { font-size: 10pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    .kop .judul { font-size: 14pt; font-weight: 800; text-transform: uppercase; margin: 2px 0; }
    .kop .ta { font-size: 9.5pt; font-weight: 600; }
    .meta { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9pt; }
    .meta td { padding: 2px 4px; vertical-align: top; }
    .meta td.lbl { width: 95px; font-weight: 700; }
    .meta td.sep { width: 10px; }
    table.ledger { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    table.ledger thead { display: table-header-group; }
    table.ledger th, table.ledger td { border: 1px solid #334155; padding: 5px 6px; vertical-align: top; }
    table.ledger th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.3px; }
    table.ledger tr { break-inside: avoid; }
    table.ledger tr.saldo-awal td { background: #fffbeb; font-weight: 700; }
    table.ledger tfoot td { background: #f1f5f9; font-weight: 700; }
    .c { text-align: center; }
    .r { text-align: right; }
    .mono { font-family: Consolas, "Courier New", monospace; }
    .bold { font-weight: 700; }
    .nowrap { white-space: nowrap; }
    .sub { font-size: 7.5pt; color: #475569; margin-top: 2px; }
    .ttd { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 26px; font-size: 9pt; break-inside: avoid; }
    .ttd-box { text-align: center; }
    .ttd-space { height: 58px; }
    .ttd-name { font-weight: 700; text-decoration: underline; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="kop">
    <div class="pemda">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
    <div class="judul">BUKU BESAR</div>
    <div class="ta">TAHUN ANGGARAN ${tahunAnggaran}</div>
  </div>

  <table class="meta">
    <tr><td class="lbl">OPD</td><td class="sep">:</td><td>${esc(selectedOpdOnlyLabel)}</td></tr>
    ${selectedUnitOnlyLabel ? `<tr><td class="lbl">Unit</td><td class="sep">:</td><td>${esc(selectedUnitOnlyLabel)}</td></tr>` : ""}
    <tr><td class="lbl">Rekening</td><td class="sep">:</td><td>${esc(selectedRekLabel)}</td></tr>
    <tr><td class="lbl">Periode</td><td class="sep">:</td><td>${esc(startDate || "Awal Tahun")} s/d ${esc(endDate || "Sekarang")} (Saldo Normal: ${posisi === "D" ? "Debet" : "Kredit"})</td></tr>
  </table>

  <table class="ledger">
    <thead>
      <tr>
        <th class="c" style="width:28px;">No</th>
        <th class="c" style="width:72px;">Tanggal</th>
        <th style="width:140px;">No. Voucher</th>
        <th style="width:170px;">Rekening</th>
        <th>Uraian / Keterangan</th>
        <th class="r" style="width:95px;">Debet (Rp)</th>
        <th class="r" style="width:95px;">Kredit (Rp)</th>
        <th class="r" style="width:105px;">Saldo (Rp)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="saldo-awal">
        <td colspan="5" class="r">Saldo Awal Periode</td>
        <td class="r mono">-</td>
        <td class="r mono">-</td>
        <td class="r mono">${formatAngka(data.saldoAwal)}</td>
      </tr>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="r">TOTAL MUTASI &amp; SALDO AKHIR</td>
        <td class="r mono">${formatAngka(data.totalDebet)}</td>
        <td class="r mono">${formatAngka(data.totalKredit)}</td>
        <td class="r mono">${formatAngka(data.saldoAkhir)}</td>
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

      const printWin = window.open("", "_blank", "width=1150,height=780");
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

  const selectedRekLabel = useMemo(() => {
    if (!selectedRek) return "Semua Rekening";
    const found = (rekByLevel[filterLevel] || []).find((r) => r.kode === selectedRek);
    return found ? `${found.kode} - ${found.nama}` : selectedRek;
  }, [rekByLevel, filterLevel, selectedRek]);

  const printedDateStr = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    []
  );

  return (
    <div className="space-y-5">
      {/* Header Utama (seragam dengan menu Akuntansi / BUD lainnya) */}
      <div className="print:hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Buku Besar
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
              onClick={fetchBukuBesar}
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

      {/* Filter Bar Card */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Parameter Filter Buku Besar
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
                setSelectedRek("");
              }}
              placeholder="-- Pilih Level Rekening --"
              allowClear={false}
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Rekening</label>
            <SearchableSelect
              options={rekOptions}
              value={selectedRek}
              onChange={(val) => setSelectedRek(val)}
              placeholder="Semua Rekening"
              clearLabel="Semua Rekening"
            />
          </div>

          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
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

          <div className="md:col-span-12 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAllKabupaten(false);
                setSelectedUnit("");
                setFilterLevel("6");
                setSelectedRek("");
                setStartDate("");
                setEndDate("");
                setExportExcel(false);
                setHasSearched(false);
                setRows([]);
                setSaldoAwal(0);
                setTotalDebet(0);
                setTotalKredit(0);
                setSaldoAkhir(0);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards (On Screen) */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Saldo Awal Periode
            </span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-800 mt-2 font-mono tabular-nums">
            {formatRupiah(saldoAwal)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Total Mutasi Debet
            </span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(totalDebet)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Total Mutasi Kredit
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {formatRupiah(totalKredit)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50/70 to-white rounded-2xl border border-[#5E0E14]/25 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#5E0E14]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E0E14]">
              Saldo Akhir ({normalPosisi})
            </span>
            <Scale className="w-4 h-4 text-[#5E0E14]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#5E0E14] mt-2 font-mono tabular-nums">
            {formatRupiah(saldoAkhir)}
          </div>
        </div>
      </div>

      {/* Tabel Preview On-Screen */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-500">
            Menampilkan <span className="font-bold text-slate-800">{rows.length}</span> mutasi jurnal
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-10">No</th>
                <th className="px-3.5 py-3 w-24">Tanggal</th>
                <th className="px-3.5 py-3 min-w-[165px]">No. Voucher</th>
                <th className="px-3.5 py-3 min-w-[200px]">Rekening</th>
                <th className="px-3.5 py-3 min-w-[220px]">Uraian / Keterangan</th>
                <th className="px-3.5 py-3 text-right w-32">Debet (Rp)</th>
                <th className="px-3.5 py-3 text-right w-32">Kredit (Rp)</th>
                <th className="px-3.5 py-3 text-right w-36">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-amber-50/50 font-semibold text-slate-800">
                <td colSpan={5} className="px-3.5 py-2.5 text-right">
                  Saldo Awal Periode
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">-</td>
                <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">-</td>
                <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums">
                  {formatAngka(saldoAwal)}
                </td>
              </tr>

              {!hasSearched ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Silakan pilih filter terlebih dahulu, lalu klik tombol <span className="font-semibold text-slate-600">Tampilkan</span> untuk melihat data Buku Besar.
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Tidak ada mutasi jurnal pada filter dan periode ini.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3.5 py-2.5 text-center text-slate-400 tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{r.tanggal}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] font-bold text-slate-900">
                      {r.no_voucher}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-mono text-[11px] font-semibold text-[#5E0E14]">
                        {r.kd_rek6}
                      </div>
                      <div className="text-[11px] text-slate-700 leading-snug">{r.nm_rek6}</div>
                    </td>
                    <td className="px-3.5 py-2.5 leading-snug">
                      <div>{r.keterangan}</div>
                      {r.nm_sub_kegiatan && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Sub Keg: {r.nm_sub_kegiatan}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                      {formatAngka(r.debet)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                      {formatAngka(r.kredit)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                      {formatAngka(r.saldo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t border-slate-200 font-bold text-slate-900">
              <tr>
                <td colSpan={5} className="px-3.5 py-3 text-right uppercase text-[11px]">
                  Total Mutasi &amp; Saldo Akhir
                </td>
                <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                  {formatAngka(totalDebet)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                  {formatAngka(totalKredit)}
                </td>
                <td className="px-3.5 py-3 text-right font-mono tabular-nums text-[#5E0E14]">
                  {formatAngka(saldoAkhir)}
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
