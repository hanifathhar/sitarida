"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  FileCheck2,
  Calendar,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Trash2,
  X,
  AlertCircle,
  Plus,
  Receipt,
  FileText,
  BadgeCheck,
  FileCheck,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Sp2dRow {
  id: string;
  no_sp2d: string;
  tgl_sp2d: string;
  tgl_cair: string | null;
  tgl_terima: string | null;
  no_terima: string | null;
  status_pembukuan: string | null;
  no_spm: string;
  kd_skpd: string;
  nm_skpd: string;
  opdId: string;
  kd_unit: string | null;
  nm_unit: string | null;
  jenis_sp2d: string;
  keperluan: string;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  isDibukukan: boolean;
  isUpTuGu?: boolean;
  pembukuan: {
    id: string;
    no_bukti: string;
    no_bukti_out?: string | null;
    tgl_bukti: string;
    pay_type?: string | null;
    uraian?: string | null;
    total: number;
  } | null;
  rincian: Array<{
    kd_sub_kegiatan: string | null;
    nm_sub_kegiatan: string | null;
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
  }>;
}

export default function PembukuanSp2dView() {
  return (
    <BendaharaStepperWrapper
      title="Pembukuan SP2D"
      subtitle="Pembukuan penerimaan dan pengeluaran kas SP2D cair ke Buku Kas Umum (BKU)"
      step3Label="Daftar Pembukuan SP2D"
      step4Label="Pengisian Pembukuan SP2D"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <PembukuanSp2dContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PembukuanSp2dContent({
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
  const [dataList, setDataList] = useState<Sp2dRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4: Form Pembukuan SP2D (sama seperti Pembuatan SPM -> Pilih Dokumen SP2D via modal)
  const [showSp2dModal, setShowSp2dModal] = useState(false);
  const [inputSearch, setInputSearch] = useState("");
  const [selectedSp2d, setSelectedSp2d] = useState<Sp2dRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Pembukuan State
  const [bukuPayType, setBukuPayType] = useState<"BANK" | "TUNAI">("BANK");
  const [bukuNoBukti, setBukuNoBukti] = useState("");
  const [bukuNoBuktiOut, setBukuNoBuktiOut] = useState("");
  const [bukuTgl, setBukuTgl] = useState(new Date().toISOString().split("T")[0]);
  const [bukuUraian, setBukuUraian] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<Sp2dRow | null>(null);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      q.set("statusPembukuan", "SEMUA");

      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
      }
    } catch (e) {
      console.error("Gagal memuat SP2D pembukuan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit]);

  // Step 3 hanya menampilkan daftar SP2D yang SUDAH dibukukan
  const bookedList = useMemo(() => {
    return dataList.filter((item) => {
      if (!item.isDibukukan) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_sp2d?.toLowerCase().includes(q) ||
          item.no_spm?.toLowerCase().includes(q) ||
          item.keperluan?.toLowerCase().includes(q) ||
          item.pembukuan?.no_bukti?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (startDate || endDate) {
        const itemDateStr = item.pembukuan?.tgl_bukti
          ? new Date(item.pembukuan.tgl_bukti).toISOString().split("T")[0]
          : item.tgl_cair
            ? new Date(item.tgl_cair).toISOString().split("T")[0]
            : item.tgl_sp2d
              ? new Date(item.tgl_sp2d).toISOString().split("T")[0]
              : "";

        if (startDate && itemDateStr && itemDateStr < startDate) return false;
        if (endDate && itemDateStr && itemDateStr > endDate) return false;
      }

      return true;
    });
  }, [dataList, search, startDate, endDate]);

  const totalPages = Math.ceil(bookedList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return bookedList.slice(start, start + pageSize);
  }, [bookedList, currentPage, pageSize]);

  // Daftar SP2D cair yang belum dibukukan (untuk Modal Pilih Dokumen SP2D di Step 4)
  const availableSp2dCair = useMemo(() => {
    const q = inputSearch.trim().toLowerCase();
    return dataList.filter(
      (d) =>
        !d.isDibukukan &&
        (!q ||
          d.no_sp2d.toLowerCase().includes(q) ||
          d.no_spm.toLowerCase().includes(q) ||
          d.keperluan.toLowerCase().includes(q))
    );
  }, [dataList, inputSearch]);

  const handleOpenInputPembukuan = () => {
    setIsEditing(false);
    setInputSearch("");
    setSelectedSp2d(null);
    setBukuNoBukti("");
    setBukuNoBuktiOut("");
    setBukuTgl(new Date().toISOString().split("T")[0]);
    setBukuUraian("");
    setBukuPayType("BANK");
    setFormError(null);
    setSuccessMsg(null);
    setShowSp2dModal(false);
    setCurrentStep(4);
  };

  const handleOpenEditPembukuan = (item: Sp2dRow) => {
    setIsEditing(true);
    setSelectedSp2d(item);
    setBukuNoBukti(item.pembukuan?.no_bukti || item.no_terima || "");
    setBukuNoBuktiOut(item.pembukuan?.no_bukti_out || "");
    const tglVal = item.pembukuan?.tgl_bukti || item.tgl_terima || item.tgl_cair || item.tgl_sp2d;
    setBukuTgl(tglVal ? new Date(tglVal).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setBukuPayType(item.pembukuan?.pay_type === "TUNAI" ? "TUNAI" : "BANK");
    setBukuUraian(item.pembukuan?.uraian || item.keperluan || "");
    setFormError(null);
    setSuccessMsg(null);
    setShowSp2dModal(false);
    setCurrentStep(4);
  };

  const handleSelectSp2dForBuku = async (sp2d: Sp2dRow) => {
    setSelectedSp2d(sp2d);
    setShowSp2dModal(false);
    setBukuPayType("BANK");

    const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
      (sp2d.jenis_sp2d || "").toUpperCase()
    );

    const unitPart = (
      sp2d.kd_unit ||
      selectedUnit?.kd_unit ||
      sp2d.kd_skpd
    ).replace(/[^a-zA-Z0-9.-]/g, "");

    try {
      const q = new URLSearchParams();
      q.set("action", "next-bku");
      q.set("opdId", sp2d.opdId || selectedOpd?.id || "");
      q.set("kdUnitOrSkpd", unitPart);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.generatedNoBku) {
        setBukuNoBukti(json.generatedNoBku);
        setBukuNoBuktiOut(!isUpTuGu ? json.generatedNoBkuOut || "" : "");
      } else {
        const bookedCount = dataList.filter((d) => d.isDibukukan).length;
        const urut = String(bookedCount + 1).padStart(5, "0");
        const urutOut = String(bookedCount + 2).padStart(5, "0");
        setBukuNoBukti(`${urut}/${unitPart}/2026`);
        setBukuNoBuktiOut(!isUpTuGu ? `${urutOut}/${unitPart}/2026` : "");
      }
    } catch {
      const bookedCount = dataList.filter((d) => d.isDibukukan).length;
      const urut = String(bookedCount + 1).padStart(5, "0");
      const urutOut = String(bookedCount + 2).padStart(5, "0");
      setBukuNoBukti(`${urut}/${unitPart}/2026`);
      setBukuNoBuktiOut(!isUpTuGu ? `${urutOut}/${unitPart}/2026` : "");
    }

    setBukuTgl(
      sp2d.tgl_cair
        ? new Date(sp2d.tgl_cair).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );

    setBukuUraian(
      isUpTuGu
        ? `${sp2d.keperluan}`
        : `${sp2d.keperluan}`
    );
    setFormError(null);
  };

  const handleExecutePembukuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSp2d) {
      setFormError("Silakan pilih dokumen SP2D Cair terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sp2dId: selectedSp2d.id,
            no_bukti: bukuNoBukti.trim() || undefined,
            tgl_bukti: bukuTgl,
            pay_type: bukuPayType,
            uraian: bukuUraian,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(
          isEditing
            ? `Pembukuan SP2D ${selectedSp2d.no_sp2d} berhasil diperbarui (No. BKU ${json.data?.no_bukti || bukuNoBukti
            }).`
            : json.data?.message ||
            `SP2D ${selectedSp2d.no_sp2d} berhasil dibukukan dengan No. BKU ${json.data?.no_bukti || bukuNoBukti
            }.`
        );
        setSelectedSp2d(null);
        setBukuNoBuktiOut("");
        setIsEditing(false);
        setCurrentStep(3);
        await fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan pembukuan SP2D");
      }
    } catch {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatalPembukuan = async (targetId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin membatalkan pembukuan SP2D ini? Status pembukuan SP2D akan dikembalikan menjadi belum dibukukan."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d?id=${targetId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Pembukuan SP2D berhasil dibatalkan.");
        await fetchData();
      } else {
        alert(json.error || "Gagal membatalkan pembukuan");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const totalNilai = dataList.reduce((acc, c) => acc + c.nilai, 0);
  const totalDibukukan = dataList
    .filter((d) => d.isDibukukan)
    .reduce((acc, c) => acc + c.nilai, 0);
  const belumDibukukanCount = dataList.filter((d) => !d.isDibukukan).length;

  // =========================================================================
  // STEP 4: FORMULIR PEMBUKUAN SP2D (SAMA PERSIS DENGAN FORM PEMBUATAN SPM)
  // =========================================================================
  if (currentStep === 4) {
    const isUpTuGu = selectedSp2d
      ? ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
        (selectedSp2d.jenis_sp2d || "").toUpperCase()
      )
      : false;

    return (
      <div className="space-y-6">
        {/* Breadcrumb Back (persis SpmManagementView) */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedSp2d(null);
              setFormError(null);
              setCurrentStep(3);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Pembukuan SP2D</span>
          </button>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleExecutePembukuan} className="space-y-6">
          {/* 1. Card Informasi Dokumen Pembukuan SP2D (persis Card 1 Informasi Dokumen SPM) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Informasi Dokumen Pembukuan SP2D
                  </h3>
                  {selectedSp2d && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                      SP2D {selectedSp2d.jenis_sp2d.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>

              {!isEditing && selectedSp2d && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSp2d(null);
                    setBukuNoBukti("");
                    setBukuNoBuktiOut("");
                    setFormError(null);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Ganti Dokumen SP2D</span>
                </button>
              )}
            </div>

            {!selectedSp2d ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={inputSearch}
                      onChange={(e) => setInputSearch(e.target.value)}
                      placeholder="Cari nomor SP2D cair, SPM, atau uraian keperluan..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Siap Dibukukan:{" "}
                    <strong className="text-[#5E0E14]">
                      {availableSp2dCair.length} SP2D Cair
                    </strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 text-center w-12">No</th>
                          <th className="px-3.5 py-2.5 w-48">No. SP2D</th>
                          <th className="px-3.5 py-2.5 w-28">Tgl. Cair</th>
                          <th className="px-3.5 py-2.5 w-44">No. SPM</th>
                          <th className="px-3.5 py-2.5">Keperluan Belanja</th>
                          <th className="px-3.5 py-2.5 text-right w-36">Nilai SP2D</th>
                          <th className="px-3.5 py-2.5 text-center w-32">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableSp2dCair.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-12 text-center text-xs text-slate-400"
                            >
                              <BadgeCheck className="w-10 h-10 mx-auto mb-2 text-teal-400" />
                              Seluruh SP2D yang berstatus CAIR telah dibukukan!
                            </td>
                          </tr>
                        ) : (
                          availableSp2dCair.map((s, idx) => (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-3.5 py-3 text-center text-slate-400 font-mono">
                                {idx + 1}
                              </td>
                              <td className="px-3.5 py-3">
                                <div className="font-mono font-bold text-slate-900">
                                  {s.no_sp2d}
                                </div>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                                  SP2D {s.jenis_sp2d.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                                {s.tgl_cair
                                  ? new Date(s.tgl_cair).toLocaleDateString("id-ID")
                                  : "-"}
                              </td>
                              <td className="px-3.5 py-3 text-slate-700 font-mono text-[11px]">
                                {s.no_spm}
                              </td>
                              <td
                                className="px-3.5 py-3 max-w-xs text-slate-700 line-clamp-2"
                                title={s.keperluan}
                              >
                                {s.keperluan}
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {formatRupiah(s.nilai)}
                              </td>
                              <td className="px-3.5 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectSp2dForBuku(s)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <span>Pilih &amp; Bukukan</span>
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
            ) : (
              <div className="mt-5 space-y-5">
                {/* Grid 3 Kolom: Nomor BKU, Tanggal Pembukuan, Nomor SP2D Sumber */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor BKU Penerimaan{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bukuNoBukti}
                      onChange={(e) => setBukuNoBukti(e.target.value)}
                      placeholder="00001/..."
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Penerimaan / Pembukuan SP2D{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bukuTgl}
                      onChange={(e) => setBukuTgl(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor SP2D
                    </label>
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                      <div className="font-mono text-xs font-bold text-[#5E0E14]">
                        {selectedSp2d.no_sp2d}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informasi Penerima / Rekening Tujuan */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nama Penerima
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedSp2d.nama_penerima || "-"}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Bank Penerima
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedSp2d.bank_penerima || "-"}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      No. Rekening Penerima
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedSp2d.rek_penerima || "-"}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Uraian */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Uraian Pembukuan Kas Umum <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={bukuUraian}
                    onChange={(e) => setBukuUraian(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
                  />
                </div>

                {/* Ringkasan Nilai SP2D */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">
                      Nilai Bruto SP2D
                    </span>
                    <div className="text-sm font-mono font-extrabold text-slate-900 mt-0.5">
                      {formatRupiah(selectedSp2d.nilai)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-4 py-3">
                    <span className="text-[11px] font-semibold text-amber-800 uppercase">
                      Potongan SP2D
                    </span>
                    <div className="text-sm font-mono font-extrabold text-rose-700 mt-0.5">
                      {formatRupiah(selectedSp2d.nilai_potongan || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-teal-50/70 border border-teal-200 px-4 py-3">
                    <span className="text-[11px] font-semibold text-teal-800 uppercase">
                      Nilai Netto SP2D
                    </span>
                    <div className="text-sm font-mono font-extrabold text-teal-800 mt-0.5">
                      {formatRupiah(
                        selectedSp2d.nilai_bersih ||
                        selectedSp2d.nilai - (selectedSp2d.nilai_potongan || 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Card Rincian Rekening Belanja SP2D (persis Card Rincian Belanja di SPM) */}
          {selectedSp2d && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Rincian Rekening SP2D
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Total Rincian:</span>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    {formatRupiah(selectedSp2d.nilai)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                      <th className="px-3.5 py-2.5">Sub Kegiatan</th>
                      <th className="px-3.5 py-2.5">Kode &amp; Nama Rekening</th>
                      <th className="px-3.5 py-2.5 text-right">Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!selectedSp2d.rincian || selectedSp2d.rincian.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-xs italic text-slate-400"
                        >
                          Tidak ada rincian rekening terlampir pada SP2D ini.
                        </td>
                      </tr>
                    ) : (
                      selectedSp2d.rincian.map((r, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3.5 py-3 text-center text-slate-400 font-medium">
                            {rIdx + 1}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-mono text-xs font-bold text-teal-700">
                              {r.kd_sub_kegiatan || "-"}
                            </div>
                            {r.nm_sub_kegiatan && (
                              <div className="text-xs text-slate-700">
                                {r.nm_sub_kegiatan}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {r.kd_rek6}
                            </div>
                            <div className="text-xs font-semibold text-slate-700">
                              {r.nm_rek6}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(r.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Footer Actions (persis footer form Pembuatan SPM) */}
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setSelectedSp2d(null);
                setFormError(null);
                setCurrentStep(3);
              }}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSp2d}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "Menyimpan ke BKU..."
                  : isEditing
                    ? "Simpan Perubahan Pembukuan"
                    : isUpTuGu
                      ? "Konfirmasi Penerimaan Kas BKU"
                      : "Konfirmasi & Bukukan SP2D"}
              </span>
            </button>
          </div>
        </form>

        {/* Modal Pilih Dokumen SP2D Cair (persis Modal Pilih Dokumen SPP di SPM) */}
        {showSp2dModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="bg-[#5E0E14] text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-300" />
                    <span>Pilih Dokumen SP2D Cair Siap Dibukukan</span>
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Daftar seluruh SP2D berstatus CAIR yang belum masuk ke Buku Kas Umum (BKU)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSp2dModal(false)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={inputSearch}
                      onChange={(e) => setInputSearch(e.target.value)}
                      placeholder="Cari nomor SP2D cair, SPM, atau uraian keperluan..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Tersedia:{" "}
                    <strong className="text-[#5E0E14]">
                      {availableSp2dCair.length} Dokumen Cair
                    </strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 text-center w-12">No</th>
                          <th className="px-3.5 py-2.5 w-48">No. SP2D</th>
                          <th className="px-3.5 py-2.5 w-28">Tgl. Cair</th>
                          <th className="px-3.5 py-2.5 w-44">No. SPM</th>
                          <th className="px-3.5 py-2.5">Keperluan Belanja</th>
                          <th className="px-3.5 py-2.5 text-right w-36">Nilai SP2D</th>
                          <th className="px-3.5 py-2.5 text-center w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availableSp2dCair.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-12 text-center text-xs text-slate-400"
                            >
                              <BadgeCheck className="w-10 h-10 mx-auto mb-2 text-teal-400" />
                              Seluruh SP2D yang berstatus cair telah berhasil dibukukan!
                            </td>
                          </tr>
                        ) : (
                          availableSp2dCair.map((s, idx) => (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-3.5 py-3 text-center text-slate-400 font-mono">
                                {idx + 1}
                              </td>
                              <td className="px-3.5 py-3">
                                <div className="font-mono font-bold text-slate-900">
                                  {s.no_sp2d}
                                </div>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                                  SP2D {s.jenis_sp2d.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                                {s.tgl_cair
                                  ? new Date(s.tgl_cair).toLocaleDateString("id-ID")
                                  : "-"}
                              </td>
                              <td className="px-3.5 py-3 text-slate-700 font-mono text-[11px]">
                                {s.no_spm}
                              </td>
                              <td
                                className="px-3.5 py-3 max-w-xs text-slate-700 line-clamp-2"
                                title={s.keperluan}
                              >
                                {s.keperluan}
                              </td>
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {formatRupiah(s.nilai)}
                              </td>
                              <td className="px-3.5 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectSp2dForBuku(s)}
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
        )}
      </div>
    );
  }

  // =========================================================================
  // STEP 3: DAFTAR PEMBUKUAN SP2D (SUDAH DIBUKUKAN)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total SP2D Cair
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {dataList.length} Dokumen
          </div>
          <span className="text-[11px] font-mono text-slate-600 mt-0.5 inline-block">
            {formatRupiah(totalNilai)}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-teal-700 uppercase">
            Sudah Dibukukan ke BKU
          </span>
          <div className="text-xl font-bold text-teal-700 mt-1">
            {dataList.filter((d) => d.isDibukukan).length} Dokumen
          </div>
          <span className="text-[11px] font-mono text-teal-800 font-bold mt-0.5 inline-block">
            {formatRupiah(totalDibukukan)}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">
            Siap Dibukukan (Belum Masuk BKU)
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {belumDibukukanCount} Dokumen
          </div>
          <span className="text-[11px] font-mono text-amber-800 font-medium mt-0.5 inline-block">
            {formatRupiah(totalNilai - totalDibukukan)}
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
              Daftar SP2D Sudah Dibukukan
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
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

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. SP2D / SPM / BKU..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenInputPembukuan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Pembukuan SP2D</span>
          </button>
        </div>
      </div>

      {/* Tabel Daftar Pembukuan SP2D (Sudah Dibukukan) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-48">No. BKU (Bukti Kas)</th>
                <th className="px-3.5 py-3 w-32">Tgl. Pembukuan</th>
                <th className="px-3.5 py-3 w-52">No. SP2D &amp; SPM</th>
                <th className="px-3.5 py-3">Keperluan Belanja</th>
                <th className="px-3.5 py-3 text-right w-36">Nilai Belanja</th>
                <th className="px-3.5 py-3 text-center w-36">Status</th>
                <th className="px-3.5 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat daftar pembukuan SP2D...
                  </td>
                </tr>
              ) : bookedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada SP2D yang dibukukan pada OPD/Unit ini. Klik &quot;Input
                    Pembukuan SP2D&quot; untuk mulai membukukan SP2D cair.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        {item.pembukuan?.no_bukti || "-"}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          Trans In
                        </span>
                        {!item.isUpTuGu && item.pembukuan?.no_bukti_out && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-[#88131A] border border-rose-200 font-mono">
                            Out: {item.pembukuan.no_bukti_out}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                      {item.pembukuan?.tgl_bukti ? (
                        <div>
                          <div className="font-semibold">
                            {new Date(item.pembukuan.tgl_bukti).toLocaleDateString(
                              "id-ID"
                            )}
                          </div>
                          <div className="text-[10px] text-teal-700 font-bold">
                            Tgl. BKU
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        {item.no_sp2d}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        SPM: {item.no_spm}
                      </div>
                    </td>

                    <td className="px-3.5 py-3 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                        SP2D {item.jenis_sp2d.replace(/_/g, " ")}
                      </span>
                      <p
                        className="mt-0.5 text-[11px] text-slate-600 line-clamp-2"
                        title={item.keperluan}
                      >
                        {item.keperluan}
                      </p>
                    </td>

                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.nilai)}
                    </td>

                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Sudah Dibukukan</span>
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPembukuan(item)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Edit Pembukuan SP2D"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            item.pembukuan && handleBatalPembukuan(item.pembukuan.id)
                          }
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Batalkan Pembukuan"
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
          total={bookedList.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal Lihat Detail Pembukuan SP2D */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold">
                    Detail Pembukuan SP2D: {viewItem.pembukuan?.no_bukti || "-"}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    No. SP2D: {viewItem.no_sp2d} • SPM: {viewItem.no_spm}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewItem(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">No. BKU (Bukti Kas)</span>
                  <span className="font-mono font-bold text-[#5E0E14]">
                    {viewItem.pembukuan?.no_bukti || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Pembukuan BKU</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.pembukuan?.tgl_bukti
                      ? new Date(viewItem.pembukuan.tgl_bukti).toLocaleDateString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No. SP2D &amp; Jenis</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewItem.no_sp2d} ({viewItem.jenis_sp2d.replace(/_/g, " ")})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No. SPM &amp; Tgl. Cair</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewItem.no_spm} •{" "}
                    {viewItem.tgl_cair
                      ? new Date(viewItem.tgl_cair).toLocaleDateString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block">Keperluan</span>
                  <span className="text-slate-800 font-medium">{viewItem.keperluan}</span>
                </div>
              </div>

              {/* Informasi Penerima */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block">Nama Penerima</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.nama_penerima || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank Penerima</span>
                  <span className="font-semibold text-slate-800">
                    {viewItem.bank_penerima || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No. Rekening Penerima</span>
                  <span className="font-mono font-bold text-slate-800">
                    {viewItem.rek_penerima || "-"}
                  </span>
                </div>
              </div>

              {/* Ringkasan Nilai */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
                  <span className="text-[11px] text-slate-500 block">Nilai Bruto</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatRupiah(viewItem.nilai)}
                  </span>
                </div>
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3.5 py-2.5">
                  <span className="text-[11px] text-amber-800 block">Potongan</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatRupiah(viewItem.nilai_potongan || 0)}
                  </span>
                </div>
                <div className="rounded-xl bg-teal-50/70 border border-teal-200 px-3.5 py-2.5">
                  <span className="text-[11px] text-teal-800 block">Nilai Netto</span>
                  <span className="font-mono font-bold text-teal-800">
                    {formatRupiah(
                      viewItem.nilai_bersih ||
                      viewItem.nilai - (viewItem.nilai_potongan || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Rincian Rekening SP2D */}
              {viewItem.rincian && viewItem.rincian.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-700">Rincian Rekening SP2D</h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {viewItem.rincian.map((r, i) => (
                      <div key={i} className="p-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-slate-800">
                            {r.kd_sub_kegiatan || "-"} • {r.kd_rek6}
                          </div>
                          <div className="text-slate-600">{r.nm_rek6}</div>
                        </div>
                        <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(r.nilai)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewItem;
                  setViewItem(null);
                  handleOpenEditPembukuan(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
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
    </div>
  );
}
