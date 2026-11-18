"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import {
  Receipt,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Calendar,
  Search,
  ArrowLeft,
  ArrowRight,
  FileText,
  Coins,
  DollarSign,
  Pencil,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface RincianSetorForm {
  kd_rek6: string;
  nm_rek6: string;
  id_billing: string;
  ntpn: string;
  nilai: number;
  keterangan: string;
}

interface UnsetorTrmpotItem {
  id: string;
  no_bukti: string;
  tgl_bukti: string;
  no_sp2d?: string | null;
  uraian: string;
  total: number;
  rincian: Array<{
    kd_rek6: string;
    nm_rek6: string;
    id_billing?: string | null;
    nilai: number;
    keterangan?: string | null;
  }>;
}

export default function PenyetoranPotonganView() {
  return (
    <BendaharaStepperWrapper
      title="Penyetoran Potongan Pajak"
      subtitle="Penyetoran potongan pajak (PPN/PPh) ke Kas Negara dari penerimaan potongan yang belum disetor"
      step3Label="Daftar Penyetoran Potongan"
      step4Label="Pengisian Penyetoran Potongan"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <PenyetoranPotonganContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenyetoranPotonganContent({
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
  const [dataList, setDataList] = useState<any[]>([]);
  const [unsetorList, setUnsetorList] = useState<UnsetorTrmpotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnsetor, setLoadingUnsetor] = useState(false);

  // Step 3 Filters & Pagination
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4: Pilih Penerimaan Belum Setor -> Form Penyetoran
  const [unsetorSearch, setUnsetorSearch] = useState("");
  const [selectedTrmpot, setSelectedTrmpot] = useState<UnsetorTrmpotItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State (trhstrpot + trdstrpot)
  const [noBukti, setNoBukti] = useState("");
  const [noTrmpot, setNoTrmpot] = useState("");
  const [tglBukti, setTglBukti] = useState(new Date().toISOString().split("T")[0]);
  const [uraian, setUraian] = useState("");
  const [rincian, setRincian] = useState<RincianSetorForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      q.set("tipe", "PENYETORAN");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOpd]);

  const fetchUnsetorTrmpot = useCallback(async () => {
    if (!selectedOpd) return;
    setLoadingUnsetor(true);
    try {
      const q = new URLSearchParams({
        action: "trmpot-belum-setor",
        opdId: selectedOpd.id,
      });
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setUnsetorList(Array.isArray(json.data) ? json.data : []);
      }
    } catch (e) {
      console.error("Gagal memuat penerimaan potongan belum setor:", e);
    } finally {
      setLoadingUnsetor(false);
    }
  }, [selectedOpd, selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchNextBkuNumber = async () => {
    if (!selectedOpd) return;
    try {
      const q = new URLSearchParams({
        action: "next-bku",
        opdId: selectedOpd.id,
      });
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.no_bukti) {
        setNoBukti(json.no_bukti);
      }
    } catch (e) {
      console.error("Gagal mengambil nomor BKU berikutnya:", e);
    }
  };

  const handleOpenNewForm = async () => {
    setEditingId(null);
    setSelectedTrmpot(null);
    setUnsetorSearch("");
    setNoTrmpot("");
    setTglBukti(new Date().toISOString().split("T")[0]);
    setUraian("");
    setRincian([]);
    setFormError(null);
    setSuccessMsg(null);
    setNoBukti("Memuat nomor BKU...");
    setCurrentStep(4);
    await Promise.all([fetchUnsetorTrmpot(), fetchNextBkuNumber()]);
  };

  const handleSelectTrmpot = async (trmpot: UnsetorTrmpotItem) => {
    setSelectedTrmpot(trmpot);
    setNoTrmpot(trmpot.no_bukti);
    setTglBukti(
      trmpot.tgl_bukti
        ? new Date(trmpot.tgl_bukti).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setUraian(`Penyetoran Potongan atas ${trmpot.uraian}`);
    setRincian(
      (trmpot.rincian || []).map((r) => ({
        kd_rek6: r.kd_rek6,
        nm_rek6: r.nm_rek6,
        id_billing: r.id_billing || "",
        ntpn: "",
        nilai: Number(r.nilai || 0),
        keterangan: r.keterangan || "",
      }))
    );
    setFormError(null);
    await fetchNextBkuNumber();
  };

  const handleOpenEditForm = (item: any) => {
    setEditingId(item.id);
    setSelectedTrmpot(null);
    setNoBukti(item.no_bukti || "");
    setNoTrmpot(item.no_trmpot || "");
    setTglBukti(
      item.tgl_bukti
        ? new Date(item.tgl_bukti).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setUraian(item.uraian || "");
    setRincian(
      Array.isArray(item.rincian)
        ? item.rincian.map((r: any) => ({
          kd_rek6: r.kd_rek6 || "",
          nm_rek6: r.nm_rek6 || "",
          id_billing: r.id_billing || "",
          ntpn: r.ntpn || "",
          nilai: Number(r.nilai || 0),
          keterangan: r.keterangan || "",
        }))
        : []
    );
    setFormError(null);
    setSuccessMsg(null);
    setCurrentStep(4);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?id=${encodeURIComponent(
          deleteTarget.id
        )}&tipe=PENYETORAN`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Penyetoran Potongan ${deleteTarget.no_bukti} berhasil dihapus.`
        );
        setDeleteTarget(null);
        await fetchData();
      } else {
        setDeleteError(json.error || "Gagal menghapus penyetoran potongan.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Pagination Step 3
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const rincianMatch = item.rincian?.some(
          (r: any) =>
            r.id_billing?.toLowerCase().includes(q) ||
            r.ntpn?.toLowerCase().includes(q) ||
            r.nm_rek6?.toLowerCase().includes(q)
        );
        const match =
          item.no_bukti?.toLowerCase().includes(q) ||
          item.no_trmpot?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          rincianMatch;
        if (!match) return false;
      }

      if (startDate || endDate) {
        const itemDateStr = item.tgl_bukti
          ? new Date(item.tgl_bukti).toISOString().split("T")[0]
          : "";
        if (startDate && itemDateStr && itemDateStr < startDate) return false;
        if (endDate && itemDateStr && itemDateStr > endDate) return false;
      }

      return true;
    });
  }, [dataList, search, startDate, endDate]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const filteredUnsetor = useMemo(() => {
    const q = unsetorSearch.trim().toLowerCase();
    if (!q) return unsetorList;
    return unsetorList.filter(
      (t) =>
        t.no_bukti.toLowerCase().includes(q) ||
        (t.no_sp2d || "").toLowerCase().includes(q) ||
        t.uraian.toLowerCase().includes(q)
    );
  }, [unsetorList, unsetorSearch]);

  const totalNilai = rincian.reduce((sum, r) => sum + (Number(r.nilai) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (!uraian.trim()) {
      setFormError("Uraian penyetoran wajib diisi.");
      return;
    }
    if (rincian.length === 0) {
      setFormError("Minimal 1 rincian potongan harus ada.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/potongan",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editingId ? { id: editingId } : {}),
            tipe: "PENYETORAN",
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit,
            nm_unit: selectedUnit?.nm_unit,
            no_bukti:
              noBukti && !noBukti.startsWith("Memuat") ? noBukti.trim() : undefined,
            tgl_bukti: tglBukti,
            no_trmpot: noTrmpot || undefined,
            uraian,
            rincian,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(
          editingId
            ? `Penyetoran Potongan ${json.data?.no_bukti || noBukti} berhasil diperbarui.`
            : `Penyetoran Potongan berhasil disimpan dengan No. Bukti BKU ${json.data?.no_bukti || noBukti
            }.`
        );
        setEditingId(null);
        setSelectedTrmpot(null);
        setCurrentStep(3);
        await fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan penyetoran potongan");
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // STEP 4: PILIH PENERIMAAN BELUM SETOR -> FORMULIR PENYETORAN POTONGAN
  // =========================================================================
  if (currentStep === 4) {
    // Sub-step 4A: Daftar Penerimaan Potongan Belum Disetor
    if (!editingId && !selectedTrmpot) {
      return (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#5E0E14] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-300" />
                  <span>
                    Input Penyetoran Potongan — Pilih Penerimaan Potongan Belum Setor
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={unsetorSearch}
                    onChange={(e) => setUnsetorSearch(e.target.value)}
                    placeholder="Cari No. Bukti Penerimaan, Kuitansi/SP2D, atau Uraian..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Belum Disetor:{" "}
                  <strong className="text-[#5E0E14]">
                    {filteredUnsetor.length} Dokumen Penerimaan
                  </strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">No. Bukti Penerimaan &amp; Tgl</th>
                        <th className="px-4 py-3">No. Kuitansi / SP2D</th>
                        <th className="px-4 py-3">Uraian &amp; Rincian Pajak</th>
                        <th className="px-4 py-3 text-right">Total Potongan</th>
                        <th className="px-4 py-3 text-center w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingUnsetor ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                            Memuat daftar penerimaan potongan belum setor...
                          </td>
                        </tr>
                      ) : filteredUnsetor.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-teal-400" />
                            Seluruh penerimaan potongan pajak sudah disetorkan!
                          </td>
                        </tr>
                      ) : (
                        filteredUnsetor.map((t, idx) => (
                          <tr
                            key={t.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono font-bold text-slate-900">
                                {t.no_bukti}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {t.tgl_bukti
                                  ? new Date(t.tgl_bukti).toLocaleDateString("id-ID")
                                  : "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top font-mono text-slate-700">
                              {t.no_sp2d || "-"}
                            </td>
                            <td className="px-4 py-3 align-top max-w-md">
                              <p className="text-slate-800 font-medium">{t.uraian}</p>
                              {t.rincian && t.rincian.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {t.rincian.map((r, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-900"
                                    >
                                      {r.nm_rek6} ({formatRupiah(Number(r.nilai || 0))})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                              {formatRupiah(Number(t.total || 0))}
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectTrmpot(t)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                <span>Pilih</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Sub-step 4B: Formulir Input / Edit Penyetoran Potongan
    return (
      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="p-1 hover:bg-black/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. RINGKASAN PENYETORAN POTONGAN (trhstrpot) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#88131A]" />
                <span>
                  {editingId
                    ? `Formulir Edit Penyetoran Potongan (${noBukti})`
                    : "Formulir Input Penyetoran Potongan Pajak"}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!editingId && (
                <button
                  type="button"
                  onClick={() => setSelectedTrmpot(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Ganti Penerimaan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setSelectedTrmpot(null);
                  setFormError(null);
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#88131A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Ringkasan Penyetoran Potongan (trhstrpot)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Bukti BKU (Otomatis) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noBukti}
                  onChange={(e) => setNoBukti(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#5E0E14] focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Format BKU berurut: [no_urut]/[kd_unit]/2026
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Bukti Penyetoran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tglBukti}
                  onChange={(e) => setTglBukti(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Bukti Penerimaan Sumber (trhtrmpot)
                </label>
                <input
                  type="text"
                  disabled
                  value={noTrmpot || "-"}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Uraian Penyetoran Pajak <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
              />
            </div>


          </div>
        </div>

        {/* 2. RINCIAN PENYETORAN POTONGAN PAJAK (trdstrpot) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Rincian Penyetoran Potongan Pajak (trdstrpot)
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Total Setor:</span>
              <div className="text-sm font-mono font-bold text-teal-700">
                {formatRupiah(totalNilai)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-2.5">Rekening Potongan</th>
                  <th className="px-3.5 py-2.5">ID Billing</th>
                  <th className="px-3.5 py-2.5 w-52">NTPN (Bukti Setor)</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai Setor (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rincian.map((pot, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2.5 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-mono text-xs font-bold text-rose-800">
                        {pot.kd_rek6}
                      </div>
                      <div className="text-xs font-semibold text-slate-800">
                        {pot.nm_rek6}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-xs text-indigo-700 font-semibold">
                      {pot.id_billing || "-"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={pot.ntpn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRincian((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, ntpn: val } : item
                            )
                          );
                        }}
                        placeholder="Input NTPN (16 digit)..."
                        className="w-full px-2.5 py-1.5 font-mono text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#5E0E14]"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(Number(pot.nilai || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Nomor bukti otomatis akan tercatat sesuai urutan BKU saat disimpan.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (editingId) {
                  setEditingId(null);
                  setCurrentStep(3);
                } else {
                  setSelectedTrmpot(null);
                }
              }}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {editingId ? "Batal" : "Pilih Penerimaan Lain"}
            </button>
            <button
              type="submit"
              disabled={submitting || rincian.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Simpan Penyetoran Potongan"}
              </span>
            </button>
          </div>
        </div>
      </form>
    );
  }

  // =========================================================================
  // STEP 3: DAFTAR PENYETORAN POTONGAN PAJAK
  // =========================================================================
  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action / Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Penyetoran Potongan Pajak (SSP / NTPN)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Periode Tanggal */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Sampai Tanggal"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Reset filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. Bukti / Billing / NTPN..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={handleOpenNewForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Penyetoran Potongan Baru</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-48">No. Bukti Setor / Tgl</th>
                <th className="px-3.5 py-3 w-44">No. Penerimaan Potongan</th>
                <th className="px-3.5 py-3">Uraian &amp; Rincian NTPN</th>
                <th className="px-3.5 py-3 text-right w-40">Total Setor (Rp)</th>
                <th className="px-3.5 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data penyetoran...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data penyetoran potongan yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        {item.no_bukti}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.tgl_bukti
                          ? new Date(item.tgl_bukti).toLocaleDateString("id-ID")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-700">
                      {item.no_trmpot || "-"}
                    </td>
                    <td className="px-3.5 py-3 max-w-md">
                      <p className="text-slate-800 font-medium line-clamp-2">
                        {item.uraian}
                      </p>
                      {item.rincian && item.rincian.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.rincian.map((r: any, i: number) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700"
                            >
                              {r.nm_rek6}
                              {r.ntpn ? ` (NTPN: ${r.ntpn})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(Number(item.total || 0))}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <Receipt className="w-3 h-3" />
                        <span>{item.status || "SETOR"}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(item)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Edit Penyetoran Potongan"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteError(null);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Hapus Penyetoran Potongan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          total={filteredList.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Penyetoran Potongan"
        entityName="Penyetoran Potongan Pajak"
        itemCode={deleteTarget?.no_bukti}
        itemLabel=""
        description=""
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
