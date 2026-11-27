"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
  ScopeData,
} from "@/components/penatausahaan/bendahara-pengeluaran/BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import {
  Wallet,
  RefreshCw,
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
} from "lucide-react";

interface SaldoAwalItem {
  id: string;
  tahunAnggaran: number;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string;
  nm_unit: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: "D" | "K";
  nilai: number;
  keterangan: string;
}

export default function SaldoAwalView() {
  return (
    <BendaharaStepperWrapper
      title="Input Saldo Awal"
      subtitle=""
      step3Label="Daftar Saldo Awal Akun"
      scopeUrl="/api/akuntansi/scope"
    >
      {({ selectedOpd, selectedUnit, scopeData }) => (
        <SaldoAwalContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          scopeData={scopeData}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function SaldoAwalContent({
  selectedOpd,
  selectedUnit,
  scopeData,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  scopeData: ScopeData | null;
}) {
  const [items, setItems] = useState<SaldoAwalItem[]>([]);
  const [summary, setSummary] = useState({
    totalAkun: 0,
    totalDebet: 0,
    totalKredit: 0,
    selisih: 0,
  });
  const [rekenings, setRekenings] = useState<{ kd_rek6: string; nm_rek6: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterRk, setFilterRk] = useState<"ALL" | "D" | "K">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // FormDialog Create/Edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kdRek6, setKdRek6] = useState("");
  const [rk, setRk] = useState<"D" | "K">("D");
  const [nilai, setNilai] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<SaldoAwalItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tahunAnggaran = (scopeData?.session as any)?.tahunAnggaran || 2026;

  const fetchRefs = async () => {
    try {
      const res = await fetch("/api/akuntansi/saldo-awal?ref=1");
      const json = await res.json();
      if (json.success && json.data) {
        setRekenings(json.data.rekenings || []);
      }
    } catch (e) {
      console.error("Gagal memuat referensi rekening:", e);
    }
  };

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);

      const res = await fetch(`/api/akuntansi/saldo-awal?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSummary(
          json.data.summary || {
            totalAkun: 0,
            totalDebet: 0,
            totalKredit: 0,
            selisih: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat Saldo Awal:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (filterRk !== "ALL" && i.rk !== filterRk) return false;
      if (!q) return true;
      return (
        i.kd_rek6.toLowerCase().includes(q) ||
        i.nm_rek6.toLowerCase().includes(q) ||
        i.keterangan.toLowerCase().includes(q)
      );
    });
  }, [items, filterRk, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOpd, selectedUnit, filterRk, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const rekOptions: SelectOption[] = useMemo(
    () =>
      rekenings.map((r) => ({
        value: r.kd_rek6,
        label: `${r.kd_rek6} - ${r.nm_rek6}`,
      })),
    [rekenings]
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setKdRek6("");
    setRk("D");
    setNilai("");
    setKeterangan("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (item: SaldoAwalItem) => {
    setEditingId(item.id);
    setKdRek6(item.kd_rek6);
    setRk(item.rk);
    setNilai(String(item.nilai));
    setKeterangan(item.keterangan || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    if (!kdRek6.trim()) {
      setFormError("Rekening (ms_rek6) wajib dipilih.");
      return;
    }
    const nilaiNum = Number(nilai);
    if (Number.isNaN(nilaiNum) || nilaiNum < 0) {
      setFormError("Nilai saldo awal harus berupa angka >= 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        tahunAnggaran,
        kd_skpd: selectedOpd.kd_skpd,
        nm_skpd: selectedOpd.nm_skpd,
        kd_unit: selectedUnit?.kd_unit || undefined,
        nm_unit: selectedUnit?.nm_unit || undefined,
        kd_rek6: kdRek6,
        rk,
        nilai: nilaiNum,
        keterangan: keterangan.trim(),
      };

      const res = await fetch("/api/akuntansi/saldo-awal", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Gagal menyimpan Saldo Awal.");
        return;
      }

      setDialogOpen(false);
      setFeedback({ type: "success", text: json.message || "Saldo awal tersimpan." });
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/akuntansi/saldo-awal?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error || "Gagal menghapus Saldo Awal." });
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setFeedback({ type: "success", text: json.message || "Saldo awal dihapus." });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Terjadi kesalahan jaringan." });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
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
      {/* Header Utama */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Input Saldo Awal
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
              onClick={openCreateDialog}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Saldo Awal</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs font-medium ${feedback.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Akun Saldo Awal
            </span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
            {summary.totalAkun} <span className="text-xs font-bold text-slate-500">Akun</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Total Saldo Debet
            </span>
            <ArrowDownLeft className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(summary.totalDebet)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Total Saldo Kredit
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {formatRupiah(summary.totalKredit)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50/70 to-white rounded-2xl border border-[#5E0E14]/25 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#5E0E14]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E0E14]">
              Selisih (D vs K)
            </span>
            <Scale className="w-4 h-4 text-[#5E0E14]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#5E0E14] mt-2 font-mono tabular-nums">
            {formatRupiah(summary.selisih)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Posisi (RK)</label>
            <select
              value={filterRk}
              onChange={(e) => setFilterRk(e.target.value as "ALL" | "D" | "K")}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Posisi</option>
              <option value="D">D (Debet)</option>
              <option value="K">K (Kredit)</option>
            </select>
          </div>
          <div className="md:col-span-8">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian Cepat</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode rekening, nama rekening, atau keterangan..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setFilterRk("ALL");
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

      {/* Tabel Daftar Saldo Awal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-48">Kode Rekening</th>
                <th className="px-3.5 py-3 min-w-[240px]">Nama Rekening</th>
                <th className="px-3.5 py-3 text-center w-20">Posisi</th>
                <th className="px-3.5 py-3 text-right w-36">Debet (Rp)</th>
                <th className="px-3.5 py-3 text-right w-36">Kredit (Rp)</th>
                <th className="px-3.5 py-3 min-w-[160px]">Keterangan</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Memuat data Saldo Awal...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada data Saldo Awal pada OPD/Unit ini. Klik &quot;Tambah Saldo Awal&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold text-[#5E0E14]">
                      {item.kd_rek6}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-slate-800">{item.nm_rek6}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-6 rounded-md text-[10px] font-bold ${item.rk === "D"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                      >
                        {item.rk}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatAngka(item.rk === "D" ? item.nilai : 0)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatAngka(item.rk === "K" ? item.nilai : 0)}
                    </td>
                    <td className="px-3.5 py-3 text-slate-600">{item.keterangan || "-"}</td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Hapus"
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

      {/* FormDialog Input / Edit Saldo Awal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-visible"
          >
            <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white">
              <div>
                <h3 className="text-base font-bold">
                  {editingId ? "Edit Saldo Awal Akun" : "Tambah Saldo Awal Akun"}
                </h3>
                <p className="text-xs text-rose-100">
                  Nilai saldo awal otomatis masuk ke perhitungan Saldo Awal di Buku Besar
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rekening Sub Rincian Objek *
                </label>
                <SearchableSelect
                  options={rekOptions}
                  value={kdRek6}
                  onChange={(val) => setKdRek6(val)}
                  placeholder="-- Pilih Rekening --"
                  allowClear={false}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Posisi (RK) *
                  </label>
                  <select
                    value={rk}
                    onChange={(e) => setRk(e.target.value as "D" | "K")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold cursor-pointer"
                  >
                    <option value="D">D (Debet)</option>
                    <option value="K">K (Kredit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nilai Saldo Awal (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={nilai}
                    onChange={(e) => setNilai(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-right font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan saldo awal akun..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 rounded-b-2xl bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] disabled:opacity-45 text-xs font-bold text-white cursor-pointer"
              >
                {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Saldo Awal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Saldo Awal Akun</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Hapus saldo awal untuk rekening{" "}
                  <span className="font-mono font-bold">{deleteTarget.kd_rek6}</span> (
                  {deleteTarget.nm_rek6})?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
