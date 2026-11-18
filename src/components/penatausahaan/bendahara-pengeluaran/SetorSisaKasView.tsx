"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import {
  Banknote,
  Plus,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft,
  ArrowRight,
  FileText,
  Receipt,
  Eye,
  Pencil,
  DollarSign,
  FileCheck2,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface ReadyStsItem {
  id: string;
  no_tetap: string;
  tgl_tetap: string;
  no_sts: string | null;
  tgl_sts: string | null;
  tgl_bayar: string | null;
  jenis_pengembalian: string;
  kd_rek6: string | null;
  nm_rek6: string | null;
  nama_penyetor: string | null;
  alamat_penyetor: string | null;
  uraian: string;
  nilai: number;
  status: string;
  verif: number;
}

interface Sp2dOption {
  id: string;
  no_sp2d: string;
  tgl_sp2d: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
}

interface BookedKasinItem {
  id: string;
  no_bukti: string;
  tgl_bukti: string;
  no_sts: string | null;
  tgl_sts: string | null;
  nama_penyetor: string | null;
  nama_bank: string | null;
  rek_bank: string | null;
  uraian: string;
  nilai: number;
  status: string;
  rincianRekening?: Array<{
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
    keterangan?: string | null;
  }>;
}

export default function SetorSisaKasView() {
  return (
    <BendaharaStepperWrapper
      title="Setor Sisa Kas (UP / GU / TU)"
      subtitle=""
      step3Label="Daftar Setor Sisa Kas"
      step4Label="Pengisian Setor Sisa Kas"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <SetorSisaKasContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function SetorSisaKasContent({
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
  const [bookedList, setBookedList] = useState<BookedKasinItem[]>([]);
  const [readyStsList, setReadyStsList] = useState<ReadyStsItem[]>([]);
  const [sp2dOptions, setSp2dOptions] = useState<Sp2dOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 3 Filters & Pagination
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4 State: create (pilih STS verif=1) OR edit
  const [stsSearch, setStsSearch] = useState("");
  const [selectedSts, setSelectedSts] = useState<ReadyStsItem | null>(null);
  const [editingItem, setEditingItem] = useState<BookedKasinItem | null>(null);

  const [tglKas, setTglKas] = useState(new Date().toISOString().split("T")[0]);
  const [jenisKas, setJenisKas] = useState<"UP" | "GU" | "TU">("UP");
  const [selectedNoSp2d, setSelectedNoSp2d] = useState("");
  const [uraian, setUraian] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View & Delete modal
  const [viewItem, setViewItem] = useState<BookedKasinItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookedKasinItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      q.set("tipe", "SISA_KAS");
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/setor-sisa?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setBookedList(Array.isArray(json.data) ? json.data : []);
        setReadyStsList(Array.isArray(json.readyStsList) ? json.readyStsList : []);
        setSp2dOptions(Array.isArray(json.sp2dOptions) ? json.sp2dOptions : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOpd, selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sp2dSelectOptions: SelectOption[] = useMemo(
    () =>
      sp2dOptions.map((s) => ({
        value: s.no_sp2d,
        label: s.no_sp2d,
        badge: s.jenis_sp2d,
        subLabel: `${new Date(s.tgl_sp2d).toLocaleDateString("id-ID")} • ${formatRupiah(
          Number(s.nilai)
        )} • ${s.keperluan}`,
      })),
    [sp2dOptions]
  );

  const handleOpenStep4Create = () => {
    setEditingItem(null);
    setSelectedSts(null);
    setStsSearch("");
    setTglKas(new Date().toISOString().split("T")[0]);
    setJenisKas("UP");
    setSelectedNoSp2d("");
    setUraian("");
    setFormError(null);
    setSuccessMsg(null);
    setCurrentStep(4);
  };

  const handleSelectSts = (sts: ReadyStsItem) => {
    setSelectedSts(sts);
    const defaultDate = sts.tgl_bayar
      ? new Date(sts.tgl_bayar).toISOString().split("T")[0]
      : sts.tgl_sts
        ? new Date(sts.tgl_sts).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
    setTglKas(defaultDate);
    setJenisKas("UP");
    setSelectedNoSp2d("");
    setUraian(sts.uraian || "");
    setFormError(null);
  };

  const handleOpenStep4Edit = (item: BookedKasinItem) => {
    setEditingItem(item);
    setSelectedSts(null);
    setTglKas(
      item.tgl_bukti
        ? new Date(item.tgl_bukti).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setJenisKas(
      item.nama_bank === "GU" || item.nama_bank === "TU" ? item.nama_bank : "UP"
    );
    setSelectedNoSp2d(item.rek_bank || "");
    setUraian(item.uraian || "");
    setFormError(null);
    setSuccessMsg(null);
    setCurrentStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (!uraian.trim()) {
      setFormError("Uraian penyetoran wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingItem) {
        const res = await fetch(
          "/api/penatausahaan/bendahara-pengeluaran/setor-sisa",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingItem.id,
              tgl_bukti: tglKas,
              jenis_kas: jenisKas,
              no_sp2d: selectedNoSp2d || undefined,
              uraian: uraian.trim(),
            }),
          }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setSuccessMsg(
            json.message || `Setor Sisa Kas ${editingItem.no_bukti} berhasil diperbarui.`
          );
          setEditingItem(null);
          setCurrentStep(3);
          await fetchData();
        } else {
          setFormError(json.error || "Gagal memperbarui Setor Sisa Kas");
        }
      } else if (selectedSts) {
        const res = await fetch(
          "/api/penatausahaan/bendahara-pengeluaran/setor-sisa",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tahunAnggaran: 2026,
              opdId: selectedOpd.id,
              pengembalianId: selectedSts.id,
              tgl_bukti: tglKas,
              jenis_kas: jenisKas,
              no_sp2d: selectedNoSp2d || undefined,
              uraian: uraian.trim(),
            }),
          }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setSuccessMsg(
            json.message ||
            `STS ${selectedSts.no_sts || selectedSts.no_tetap
            } berhasil dibukukan dengan No. BKU ${json.data?.no_bukti}.`
          );
          setSelectedSts(null);
          setCurrentStep(3);
          await fetchData();
        } else {
          setFormError(json.error || "Gagal membukukan STS Sisa Kas");
        }
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/setor-sisa?id=${encodeURIComponent(
          deleteTarget.id
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message || `Setor Sisa Kas ${deleteTarget.no_bukti} berhasil dihapus.`
        );
        setDeleteTarget(null);
        await fetchData();
      } else {
        setDeleteError(json.error || "Gagal menghapus Setor Sisa Kas.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Pagination Step 3
  const filteredBooked = useMemo(() => {
    return bookedList.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_bukti?.toLowerCase().includes(q) ||
          item.no_sts?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          item.nama_penyetor?.toLowerCase().includes(q);
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
  }, [bookedList, search, startDate, endDate]);

  const totalPages = Math.ceil(filteredBooked.length / pageSize) || 1;
  const paginatedBooked = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooked.slice(start, start + pageSize);
  }, [filteredBooked, currentPage, pageSize]);

  const filteredReadySts = useMemo(() => {
    const q = stsSearch.trim().toLowerCase();
    if (!q) return readyStsList;
    return readyStsList.filter(
      (s) =>
        (s.no_sts || "").toLowerCase().includes(q) ||
        s.no_tetap.toLowerCase().includes(q) ||
        s.uraian.toLowerCase().includes(q) ||
        (s.nama_penyetor || "").toLowerCase().includes(q)
    );
  }, [readyStsList, stsSearch]);

  const totalReadyNilai = useMemo(
    () => readyStsList.reduce((acc, s) => acc + Number(s.nilai || 0), 0),
    [readyStsList]
  );
  const totalBookedNilai = useMemo(
    () => bookedList.reduce((acc, b) => acc + Number(b.nilai || 0), 0),
    [bookedList]
  );

  // =========================================================================
  // STEP 4: DAFTAR STS SISA_KAS TERBAYAR -> FORM INPUT SETOR SISA KAS
  // =========================================================================
  if (currentStep === 4) {
    // Sub-step 4A: Daftar STS jenis SISA_KAS yang sudah berstatus bayar (verif = 1)
    if (!editingItem && !selectedSts) {
      return (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#5E0E14] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-300" />
                  <span>
                    Input Setor Sisa Kas — Pilih STS Sisa Kas Sudah Bayar
                  </span>
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Daftar STS jenis Sisa Kas dari menu Penerbitan STS yang sudah berstatus
                  terbayar dan belum dibukukan
                </p>
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
                    value={stsSearch}
                    onChange={(e) => setStsSearch(e.target.value)}
                    placeholder="Cari No. STS, No. Tetap, penyetor, atau uraian..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Siap Dibukukan:{" "}
                  <strong className="text-[#5E0E14]">
                    {filteredReadySts.length} STS Sisa Kas Terbayar
                  </strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">No. STS &amp; Tgl Bayar</th>
                        <th className="px-4 py-3">Rekening</th>
                        <th className="px-4 py-3">Penyetor &amp; Uraian</th>
                        <th className="px-4 py-3 text-right">Nilai STS (Rp)</th>
                        <th className="px-4 py-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReadySts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            Tidak ada STS Sisa Kas berstatus Terbayar yang
                            menunggu dibukukan.
                          </td>
                        </tr>
                      ) : (
                        filteredReadySts.map((sts, idx) => (
                          <tr
                            key={sts.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono font-bold text-slate-900">
                                {sts.no_sts || sts.no_tetap}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Bayar:{" "}
                                {sts.tgl_bayar
                                  ? new Date(sts.tgl_bayar).toLocaleDateString("id-ID")
                                  : "-"}{" "}
                                •{" "}
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                                  Terbayar
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono text-[11px] font-bold text-slate-800">
                                {sts.kd_rek6 || "-"}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                {sts.nm_rek6 || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top max-w-md">
                              <div className="font-semibold text-slate-800">
                                {sts.nama_penyetor || "-"}
                              </div>
                              <p className="text-slate-600 line-clamp-2">{sts.uraian}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                              {formatRupiah(Number(sts.nilai || 0))}
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectSts(sts)}
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

    // Sub-step 4B: Formulir Input / Edit Setor Sisa Kas (sama seperti Pembukuan SPJ)
    const activeNilai = editingItem
      ? Number(editingItem.nilai || 0)
      : Number(selectedSts?.nilai || 0);
    const activeKdRek = editingItem
      ? editingItem.rincianRekening?.[0]?.kd_rek6 || "1.1.01.03.01.0001"
      : selectedSts?.kd_rek6 || "1.1.01.03.01.0001";
    const activeNmRek = editingItem
      ? editingItem.rincianRekening?.[0]?.nm_rek6 || "Kas di Bendahara Pengeluaran"
      : selectedSts?.nm_rek6 || "Kas di Bendahara Pengeluaran";

    return (
      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

        {/* BAGIAN 1: RINGKASAN SETOR SISA KAS (trhkasin) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#88131A]" />
                <span>
                  {editingItem
                    ? `Formulir Edit Setor Sisa Kas (${editingItem.no_bukti})`
                    : "Formulir Input Setor Sisa Kas (BKU Penerimaan Sisa Kas)"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingItem
                  ? "Perbarui tanggal BKU, jenis sisa kas, SP2D referensi, atau uraian"
                  : "Setelah disimpan, status STS sumber akan otomatis terkunci sebagai DIBUKUKAN"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!editingItem && (
                <button
                  type="button"
                  onClick={() => setSelectedSts(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  Ganti STS
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setSelectedSts(null);
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#88131A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Ringkasan Setor Sisa Kas (trhkasin)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Bukti BKU
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    editingItem
                      ? editingItem.no_bukti
                      : "Otomatis: [no_urut]/[kd_unit]/2026"
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Bukti BKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tglKas}
                  onChange={(e) => setTglKas(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. STS Sumber
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    editingItem
                      ? editingItem.no_sts || "-"
                      : selectedSts?.no_sts || selectedSts?.no_tetap || "-"
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Sisa Kas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={jenisKas}
                  onChange={(e) => setJenisKas(e.target.value as "UP" | "GU" | "TU")}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-[#88131A]"
                >
                  <option value="UP">Sisa Uang Persediaan (UP)</option>
                  <option value="GU">Sisa Ganti Uang (GU)</option>
                  <option value="TU">Sisa Tambahan Uang (TU)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Penyetor STS
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    editingItem
                      ? editingItem.nama_penyetor || "-"
                      : `${selectedSts?.nama_penyetor || "-"} (${selectedSts?.alamat_penyetor || "-"
                      })`
                  }
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Uraian Pembukuan Setor Sisa Kas <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
              />
            </div>

            <div className="rounded-xl bg-teal-50/70 border border-teal-200 px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-teal-800 uppercase">
                Total Nilai Setor Sisa Kas
              </span>
              <span className="text-base font-mono font-extrabold text-teal-800">
                {formatRupiah(activeNilai)}
              </span>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: RINCIAN REKENING (trdkasin) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Rincian Rekening Sisa Kas (trdkasin)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rekening kas bendahara pengeluaran sesuai STS sumber
                </p>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              {formatRupiah(activeNilai)}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-2.5">Kode Rekening</th>
                  <th className="px-3.5 py-2.5">Nama Rekening</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3.5 py-3 text-center text-slate-400 font-medium">
                    1
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                    {activeKdRek}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-slate-700">
                    {activeNmRek}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(activeNilai)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (editingItem) {
                setEditingItem(null);
                setCurrentStep(3);
              } else {
                setSelectedSts(null);
              }
            }}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            {editingItem ? "Batal" : "Pilih STS Lain"}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 shadow-md cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {submitting
                ? "Menyimpan..."
                : editingItem
                  ? "Simpan Perubahan"
                  : "Simpan Setor Sisa Kas"}
            </span>
          </button>
        </div>
      </form>
    );
  }

  // =========================================================================
  // STEP 3: DAFTAR SETOR SISA KAS (SUDAH DIBUKUKAN)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">
            STS Sisa Kas Terbayar (Siap Dibukukan)
          </span>
          <div className="text-xl font-bold text-amber-800 mt-1">
            {readyStsList.length} STS
          </div>
          <span className="text-[11px] font-mono text-amber-900 mt-0.5 inline-block">
            {formatRupiah(totalReadyNilai)}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-teal-700 uppercase">
            Sudah Dibukukan (Setor Sisa Kas)
          </span>
          <div className="text-xl font-bold text-teal-700 mt-1">
            {bookedList.length} BKU
          </div>
          <span className="text-[11px] font-mono text-teal-800 font-bold mt-0.5 inline-block">
            {formatRupiah(totalBookedNilai)}
          </span>
        </div>
      </div>

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

      {/* Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#88131A]" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Daftar Setor Sisa Kas (UP / GU / TU)
            </h2>
            <p className="text-[11px] text-slate-500">
              Klik &quot;Input Setor Sisa Kas&quot; untuk membukukan STS Sisa Kas yang
              sudah terbayar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-end">
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
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. Kas / STS / Uraian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenStep4Create}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-xl shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Setor Sisa Kas</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-48">No. BKU &amp; Tgl</th>
                <th className="px-3.5 py-3 w-48">No. STS Sumber</th>
                <th className="px-3.5 py-3 w-24">Jenis</th>
                <th className="px-3.5 py-3">Uraian / Keterangan</th>
                <th className="px-3.5 py-3 text-right w-36">Nilai (Rp)</th>
                <th className="px-3.5 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data setoran sisa kas...
                  </td>
                </tr>
              ) : filteredBooked.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada Setor Sisa Kas yang dibukukan. Klik &quot;Input Setor Sisa
                    Kas&quot; untuk membukukan STS Sisa Kas terbayar.
                  </td>
                </tr>
              ) : (
                paginatedBooked.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-[#5E0E14]">
                        {item.no_bukti}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(item.tgl_bukti).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-slate-700">
                      {item.no_sts || "-"}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10px]">
                        {item.nama_bank || "UP"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-slate-700 max-w-md">
                      <p className="line-clamp-2">{item.uraian}</p>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                      {formatRupiah(Number(item.nilai) || 0)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>{item.status || "TERIMA"}</span>
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewItem(item)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStep4Edit(item)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Edit Setor Sisa Kas"
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
                          title="Hapus Setor Sisa Kas"
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
          total={filteredBooked.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal View Detail */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold">
                    Detail Setor Sisa Kas: {viewItem.no_bukti}
                  </h3>
                  <p className="text-[11px] text-white/80 font-mono">
                    No. STS: {viewItem.no_sts || "-"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">No. Bukti BKU</span>
                  <span className="font-mono font-bold text-[#5E0E14]">
                    {viewItem.no_bukti}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal BKU</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(viewItem.tgl_bukti).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No. STS Sumber</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewItem.no_sts || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jenis Kas</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.nama_bank || "UP"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Uraian</span>
                  <span className="text-slate-800 font-medium">{viewItem.uraian}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-semibold">Nilai Setoran</span>
                  <span className="font-mono font-bold text-sm text-teal-700">
                    {formatRupiah(Number(viewItem.nilai || 0))}
                  </span>
                </div>
              </div>

              {viewItem.rincianRekening && viewItem.rincianRekening.length > 0 && (
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {viewItem.rincianRekening.map((r, i) => (
                    <div key={i} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="font-mono font-bold text-slate-800">
                          {r.kd_rek6}
                        </div>
                        <div className="text-slate-600">{r.nm_rek6}</div>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(Number(r.nilai || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Setor Sisa Kas"
        entityName="Setor Sisa Kas"
        itemCode={deleteTarget?.no_bukti}
        itemLabel={deleteTarget?.uraian}
        description="Data Setor Sisa Kas ini akan dihapus dan STS sumber akan dikembalikan ke daftar siap dibukukan."
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
