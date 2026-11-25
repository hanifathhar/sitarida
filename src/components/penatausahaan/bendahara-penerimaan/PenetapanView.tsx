"use client";

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "../bendahara-pengeluaran/BendaharaStepperWrapper";
import SearchableSelect from "@/components/ui/SearchableSelect";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldX,
  FileSpreadsheet,
  X,
  Save,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

interface PenetapanItem {
  id: string;
  tahunAnggaran: number;
  no_tetap: string;
  tgl_tetap: string;
  kd_skpd: string;
  nm_skpd?: string | null;
  kd_unit?: string | null;
  nm_unit?: string | null;
  kd_sub_kegiatan?: string | null;
  nm_sub_kegiatan?: string | null;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  keterangan?: string | null;
  company?: string | null;
  alamat?: string | null;
  verif: number;
  jns_pajak?: string | null;
}

interface RefData {
  isCrossOpd: boolean;
  tahunAnggaran: number;
  opds: Array<{ id: string; kd_skpd: string; nm_skpd: string }>;
  units: Array<{ id: string; opdId: string; kd_unit: string; nm_unit: string }>;
  subkegiatans: Array<{ id: string; kd_sub_kegiatan: string; nm_sub_kegiatan: string }>;
  rekenings: Array<{ id: string; kd_rek6: string; nm_rek6: string }>;
}

const JENIS_PAJAK_OPTIONS = [
  "RESTORAN",
  "RETRIBUSI",
  "REKLAME",
  "MINERAL",
  "PPJ",
  "AIR",
  "BPHTB",
  "HOTEL",
  "PARKIR",
  "WALET",
  "PBB",
];

export default function PenetapanView() {
  return (
    <BendaharaStepperWrapper
      title="Daftar Penetapan Pajak/Retribusi"
      subtitle=""
      step3Label="Daftar Penetapan"
      step4Label="Formulir Penetapan"
      scopeUrl="/api/penatausahaan/bendahara-penerimaan/referensi"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <PenetapanContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenetapanContent({
  selectedOpd,
  selectedUnit,
  currentStep,
  setCurrentStep,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
}) {
  const [items, setItems] = useState<PenetapanItem[]>([]);
  const [summary, setSummary] = useState({
    totalDokumen: 0,
    totalVerif: 0,
    totalBelumVerif: 0,
    totalNilai: 0,
  });
  const [refData, setRefData] = useState<RefData>({
    isCrossOpd: false,
    tahunAnggaran: 2026,
    opds: [],
    units: [],
    subkegiatans: [],
    rekenings: [],
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Filters & Pagination
  const [filterSkpd, setFilterSkpd] = useState("ALL");
  const [filterVerif, setFilterVerif] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [noTetap, setNoTetap] = useState("");
  const [tglTetap, setTglTetap] = useState(new Date().toISOString().split("T")[0]);
  const [kdSkpd, setKdSkpd] = useState("");
  const [kdUnit, setKdUnit] = useState("");
  const [kdSubKegiatan, setKdSubKegiatan] = useState("");
  const [kdRek6, setKdRek6] = useState("");
  const [nilai, setNilai] = useState("");
  const [jnsPajak, setJnsPajak] = useState("RESTORAN");
  const [company, setCompany] = useState("");
  const [alamat, setAlamat] = useState("");
  const [keterangan, setKeterangan] = useState("");

  useEffect(() => {
    async function loadRef() {
      try {
        const res = await fetch("/api/penatausahaan/bendahara-penerimaan/referensi");
        const json = await res.json();
        if (json.success && json.data) {
          setRefData(json.data);
          if (json.data.opds?.length === 1) {
            setKdSkpd(json.data.opds[0].kd_skpd);
          }
        }
      } catch (e) {
        console.error("Gagal memuat referensi:", e);
      }
    }
    loadRef();
  }, []);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      if (filterVerif !== "ALL") q.set("verif", filterVerif);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/penatausahaan/bendahara-penerimaan/penetapan?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSummary(
          json.data.summary || {
            totalDokumen: 0,
            totalVerif: 0,
            totalBelumVerif: 0,
            totalNilai: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat penetapan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit, filterVerif, startDate, endDate]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.no_tetap.toLowerCase().includes(q) ||
        (r.nm_skpd || r.kd_skpd).toLowerCase().includes(q) ||
        r.kd_rek6.toLowerCase().includes(q) ||
        r.nm_rek6.toLowerCase().includes(q) ||
        (r.company || "").toLowerCase().includes(q) ||
        (r.jns_pajak || "").toLowerCase().includes(q) ||
        (r.keterangan || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOpd, selectedUnit, filterVerif, startDate, endDate, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const availableUnits = useMemo(() => {
    const selectedOpd = refData.opds.find((o) => o.kd_skpd === kdSkpd);
    if (!selectedOpd) return refData.units;
    return refData.units.filter((u) => u.opdId === selectedOpd.id);
  }, [refData, kdSkpd]);

  const openCreateForm = () => {
    setEditingId(null);
    setNoTetap("");
    setTglTetap(new Date().toISOString().split("T")[0]);
    setKdSkpd(selectedOpd?.kd_skpd || (refData.opds.length > 0 ? refData.opds[0].kd_skpd : ""));
    setKdUnit(selectedUnit?.kd_unit || "");
    setKdSubKegiatan("");
    setKdRek6("");
    setNilai("");
    setJnsPajak("RESTORAN");
    setCompany("");
    setAlamat("");
    setKeterangan("");
    setCurrentStep(4);
  };

  const openEditForm = (item: PenetapanItem) => {
    if (item.verif === 1) {
      setFeedback({
        type: "error",
        text: "Data yang sudah diposting jurnal tidak dapat diedit.",
      });
      return;
    }
    setEditingId(item.id);
    setNoTetap(item.no_tetap);
    setTglTetap(item.tgl_tetap);
    setKdSkpd(item.kd_skpd);
    setKdUnit(item.kd_unit || "");
    setKdSubKegiatan(item.kd_sub_kegiatan || "");
    setKdRek6(item.kd_rek6);
    setNilai(String(item.nilai));
    setJnsPajak(item.jns_pajak || "RESTORAN");
    setCompany(item.company || "");
    setAlamat(item.alamat || "");
    setKeterangan(item.keterangan || "");
    setCurrentStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const opdObj = refData.opds.find((o) => o.kd_skpd === kdSkpd);
    const unitObj = refData.units.find((u) => u.kd_unit === kdUnit);
    const autoSub =
      refData.subkegiatans.find((s) =>
        s.nm_sub_kegiatan.toLowerCase().includes("pendapatan")
      ) || null;
    const rekObj = refData.rekenings.find((r) => r.kd_rek6 === kdRek6);

    if (!rekObj) {
      setFeedback({ type: "error", text: "Silakan pilih Rekening Pendapatan." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        no_tetap: noTetap,
        tgl_tetap: tglTetap,
        kd_skpd: kdSkpd,
        nm_skpd: opdObj?.nm_skpd || "",
        kd_unit: kdUnit || "",
        nm_unit: unitObj?.nm_unit || "",
        kd_sub_kegiatan: autoSub?.kd_sub_kegiatan || "PENDAPATAN",
        nm_sub_kegiatan: autoSub?.nm_sub_kegiatan || "Sub Kegiatan Pendapatan",
        kd_rek6: rekObj.kd_rek6,
        nm_rek6: rekObj.nm_rek6,
        nilai: Number(nilai),
        jns_pajak: jnsPajak,
        company,
        alamat,
        keterangan,
      };

      const res = await fetch("/api/penatausahaan/bendahara-penerimaan/penetapan", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentStep(3);
        setFeedback({ type: "success", text: json.message || "Berhasil disimpan." });
        await fetchData();
      } else {
        setFeedback({ type: "error", text: json.error || "Gagal menyimpan data." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerif = async (item: PenetapanItem) => {
    const nextVerif = item.verif === 1 ? 0 : 1;
    try {
      const res = await fetch("/api/penatausahaan/bendahara-penerimaan/penetapan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, verif: nextVerif }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: json.message });
        await fetchData();
      } else {
        setFeedback({ type: "error", text: json.error || "Gagal memproses verifikasi." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat verifikasi." });
    }
  };

  const handleDelete = async (item: PenetapanItem) => {
    if (item.verif === 1) {
      setFeedback({
        type: "error",
        text: "Data yang sudah diposting jurnal tidak dapat dihapus.",
      });
      return;
    }
    if (!confirm(`Hapus data Penetapan ${item.no_tetap}?`)) return;
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-penerimaan/penetapan?id=${item.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: json.message });
        await fetchData();
      } else {
        setFeedback({ type: "error", text: json.error || "Gagal menghapus data." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menghapus." });
    }
  };

  const handleExportExcel = () => {
    const rowsData: (string | number)[][] = [
      ["DAFTAR PENETAPAN BENDAHARA PENERIMAAN"],
      [`TAHUN ANGGARAN ${refData.tahunAnggaran}`],
      [],
      [
        "NO",
        "NO. PENETAPAN",
        "TGL PENETAPAN",
        "KD SKPD",
        "KD UNIT",
        "NM UNIT",
        "KD SUB KEGIATAN",
        "NM SUB KEGIATAN",
        "KD REK6",
        "NM REK6",
        "JENIS PAJAK",
        "COMPANY / WAJIB PAJAK",
        "ALAMAT",
        "NILAI (Rp)",
        "KETERANGAN",
        "STATUS VERIF",
      ],
      ...filteredItems.map((r, i) => [
        i + 1,
        r.no_tetap,
        r.tgl_tetap,
        r.kd_skpd,
        r.kd_unit || "-",
        r.nm_unit || "-",
        r.kd_sub_kegiatan || "-",
        r.nm_sub_kegiatan || "-",
        r.kd_rek6,
        r.nm_rek6,
        r.jns_pajak || "-",
        r.company || "-",
        r.alamat || "-",
        r.nilai,
        r.keterangan || "-",
        r.verif === 1 ? "TERVERIFIKASI" : "BELUM VERIFIKASI",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rowsData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 30 },
      { wch: 18 },
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 28 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penetapan");
    XLSX.writeFile(wb, `Penetapan_Bendahara_Penerimaan_TA_${refData.tahunAnggaran}.xlsx`);
  };

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

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${feedback.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Modern */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Penetapan
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {refData.tahunAnggaran}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentStep === 4 ? (
              <button
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar</span>
              </button>
            ) : (
              <>
                <button
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Penetapan</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {currentStep === 4 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {editingId ? "Edit Data Penetapan" : "Formulir Input Penetapan Baru"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sub kegiatan otomatis diarahkan ke Sub Kegiatan Pendapatan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">OPD / SKPD Terpilih</span>
                <span className="font-semibold text-slate-800">
                  {selectedOpd ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}` : kdSkpd}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">Unit Kerja Terpilih</span>
                <span className="font-semibold text-slate-800">
                  {selectedUnit ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}` : "Semua / Induk SKPD"}
                </span>
              </div>
            </div>

            {/* 1. Nomor & 2. Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor Penetapan *
                </label>
                <input
                  type="text"
                  required
                  value={noTetap}
                  onChange={(e) => setNoTetap(e.target.value)}
                  placeholder="Contoh: 001/SKP/2026"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanggal Penetapan *
                </label>
                <input
                  type="date"
                  required
                  value={tglTetap}
                  onChange={(e) => setTglTetap(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Keterangan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Keterangan / Uraian
              </label>
              <textarea
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Uraian / keterangan penetapan"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#5E0E14] focus:outline-none"
              />
            </div>

            {/* 4. Rekening & 5. Jenis Pajak */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rekening Pendapatan *
                </label>
                <SearchableSelect
                  options={refData.rekenings.map((r) => ({
                    value: r.kd_rek6,
                    label: `${r.kd_rek6} - ${r.nm_rek6}`,
                  }))}
                  value={kdRek6}
                  onChange={(val) => setKdRek6(val)}
                  placeholder="-- Pilih Rekening Pendapatan (4.x) --"
                  searchPlaceholder="Ketik kode atau nama rekening pendapatan..."
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jenis Pajak
                </label>
                <select
                  value={jnsPajak}
                  onChange={(e) => setJnsPajak(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs focus:border-[#5E0E14] focus:outline-none"
                >
                  {JENIS_PAJAK_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6. Wajib Pajak (Card) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  6. Data Wajib Pajak / Perusahaan
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Identitas Wajib Pajak
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Wajib Pajak / Perusahaan (company)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nama perusahaan / wajib pajak"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alamat Wajib Pajak / Objek
                  </label>
                  <input
                    type="text"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Alamat wajib pajak / objek"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 7. Nilai */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nilai Penetapan (Rp) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                placeholder="0.00"
                className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:border-[#5E0E14] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] disabled:opacity-60 px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Menyimpan..." : "Simpan Penetapan"}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-slate-500" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Dokumen Penetapan
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                {summary.totalDokumen} <span className="text-xs font-bold text-slate-500">Dokumen</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Sudah Diverifikasi
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2 tabular-nums">
                {summary.totalVerif} <span className="text-xs font-bold text-emerald-600">Dokumen</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Menunggu Verifikasi
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2 tabular-nums">
                {summary.totalBelumVerif} <span className="text-xs font-bold text-amber-600">Dokumen</span>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/60 to-white rounded-2xl border border-blue-200/90 p-5 shadow-xs">
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Total Nilai Penetapan
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-900 mt-2 font-mono tabular-nums">
                {formatRupiah(summary.totalNilai)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Verif</label>
                <select
                  value={filterVerif}
                  onChange={(e) => setFilterVerif(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="1">Terverifikasi</option>
                  <option value="0">Belum Verifikasi</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian Cepat</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="No tetap, wajib pajak, rekening..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    setFilterSkpd("ALL");
                    setFilterVerif("ALL");
                    setStartDate("");
                    setEndDate("");
                    setSearchQuery("");
                  }}
                  className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Reset Filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabel Data Penetapan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 text-center w-12">No</th>
                    <th className="px-3.5 py-3 min-w-[170px]">No. &amp; Tgl Penetapan</th>
                    <th className="px-3.5 py-3 min-w-[180px]">SKPD / Unit</th>
                    <th className="px-3.5 py-3 min-w-[200px]">Sub Kegiatan &amp; Rekening</th>
                    <th className="px-3.5 py-3 min-w-[170px]">Wajib Pajak (Company) / Jenis</th>
                    <th className="px-3.5 py-3 min-w-[200px]">Uraian / Keterangan</th>
                    <th className="px-3.5 py-3 text-right whitespace-nowrap">Nilai (Rp)</th>
                    <th className="px-3.5 py-3 text-center w-32">Status Verif</th>
                    <th className="px-3.5 py-3 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs italic text-slate-400">
                        Memuat data Penetapan...
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs italic text-slate-400">
                        Belum ada data Penetapan pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                        <td className="px-3.5 py-3 text-center text-slate-400 tabular-nums">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-mono font-bold text-slate-900">{item.no_tetap}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.tgl_tetap}</div>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{item.nm_skpd || item.kd_skpd}</div>
                          {item.nm_unit && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Unit: {item.nm_unit}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          {item.nm_sub_kegiatan && (
                            <div className="text-[10px] text-slate-500 mb-0.5">
                              {item.kd_sub_kegiatan} - {item.nm_sub_kegiatan}
                            </div>
                          )}
                          <div className="font-mono text-[10px] font-bold text-[#5E0E14]">{item.kd_rek6}</div>
                          <div className="font-semibold text-slate-800">{item.nm_rek6}</div>
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-800">{item.company || "-"}</div>
                          {item.jns_pajak && (
                            <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {item.jns_pajak}
                            </span>
                          )}
                          {item.alamat && (
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.alamat}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 max-w-xs leading-snug text-slate-700">
                          {item.keterangan || <span className="italic text-slate-400">-</span>}
                        </td>
                        <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {formatAngka(item.nilai)}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {item.verif === 1 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                              <Clock className="w-3 h-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditForm(item)}
                              disabled={item.verif === 1}
                              className={`p-1.5 rounded-lg border ${item.verif === 1
                                  ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                }`}
                              title={
                                item.verif === 1
                                  ? "Sudah diposting jurnal — tidak dapat diedit"
                                  : "Edit"
                              }
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={item.verif === 1}
                              className={`p-1.5 rounded-lg border ${item.verif === 1
                                  ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                                  : "border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                                }`}
                              title={
                                item.verif === 1
                                  ? "Sudah diposting jurnal — tidak dapat dihapus"
                                  : "Hapus"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 0 && (
              <div className="border-t border-slate-200 p-3">
                <PaginationBar
                  page={currentPage}
                  totalPages={totalPages}
                  total={filteredItems.length}
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
        </>
      )}
    </div>
  );
}
