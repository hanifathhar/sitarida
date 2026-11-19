"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BookOpenCheck,
  Receipt,
  Calendar,
  X,
  Scissors,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Coins,
  DollarSign,
} from "lucide-react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";

const formatRupiah = (val: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

interface PotonganItem {
  id?: string;
  kd_rek6: string;
  nm_rek6: string;
  id_billing?: string | null;
  ntpn?: string | null;
  keterangan?: string | null;
  nilai: number;
}

interface ReadyKwitansi {
  id: string;
  nomor: string;
  tanggal: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  jns_beban: string;
  uraian: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  status: string;
  cair: number;
  opd?: { kd_opd: string; nm_opd: string };
  unitKerja?: { kd_unit: string; nm_unit: string } | null;
  potonganList: PotonganItem[];
}

interface Sp2dOption {
  id: string;
  no_sp2d: string;
  tgl_sp2d: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
  no_terima?: string | null;
}

interface BookedSpjItem {
  id: string;
  no_bukti: string;
  tgl_bukti: string;
  no_sp2d: string;
  no_spj: string;
  tgl_spj: string;
  jenis_beban?: string;
  pay_type?: string;
  uraian: string;
  total: number;
  status: string;
  no_lpj?: string | null;
  status_lpj?: string | null;
  rincian?: {
    kd_sub_kegiatan: string;
    nm_sub_kegiatan?: string;
    kd_rek6: string;
    nm_rek6: string;
    keterangan?: string | null;
    nilai: number;
  }[];
}

interface SpjDetailData {
  transout: BookedSpjItem;
  kwitansi?: ReadyKwitansi | null;
  trmpot?: {
    no_bukti: string;
    tgl_bukti: string;
    total: number;
    rincian: PotonganItem[];
  } | null;
  strpot?: {
    no_bukti: string;
    tgl_bukti: string;
    total: number;
    rincian: PotonganItem[];
  } | null;
}

function PembukuanSpjContent({
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
  const [readyKwitansi, setReadyKwitansi] = useState<ReadyKwitansi[]>([]);
  const [bookedList, setBookedList] = useState<BookedSpjItem[]>([]);
  const [sp2dOptions, setSp2dOptions] = useState<Sp2dOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 3 filters & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4 state: create (pilih kuitansi cair=1) OR edit (editingItem != null)
  const [kwtSearch, setKwtSearch] = useState("");
  const [selectedKwitansi, setSelectedKwitansi] = useState<ReadyKwitansi | null>(null);
  const [editingItem, setEditingItem] = useState<BookedSpjItem | null>(null);
  const [editingDetail, setEditingDetail] = useState<SpjDetailData | null>(null);
  const [selectedNoSp2d, setSelectedNoSp2d] = useState("");
  const [tglBukti, setTglBukti] = useState("");
  const [editUraian, setEditUraian] = useState("");
  const [editPayType, setEditPayType] = useState<"BANK" | "TUNAI">("BANK");
  const [submitting, setSubmitting] = useState(false);

  // View Modal state
  const [viewDetail, setViewDetail] = useState<SpjDetailData | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  // Deleting id state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    noBuktiSpj?: string;
    noBuktiTrmPot?: string | null;
    noBuktiStrPot?: string | null;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedOpd?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ opdId: selectedOpd.id });
      if (selectedUnit?.kd_unit) {
        params.set("kd_unit", selectedUnit.kd_unit);
      }
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj?${params.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setBookedList(Array.isArray(json.data) ? json.data : []);
        setReadyKwitansi(Array.isArray(json.readyKwitansi) ? json.readyKwitansi : []);
        setSp2dOptions(Array.isArray(json.sp2dOptions) ? json.sp2dOptions : []);
      }
    } catch (e) {
      console.error("Failed to fetch pembukuan spj:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedOpd?.id, selectedUnit?.kd_unit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, startDate, endDate]);

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
    setEditingDetail(null);
    setKwtSearch("");
    setSelectedKwitansi(null);
    setSelectedNoSp2d("");
    setTglBukti("");
    setFeedback(null);
    setCurrentStep(4);
  };

  const handleOpenStep4Edit = async (item: BookedSpjItem) => {
    setEditingItem(item);
    setEditingDetail({ transout: item });
    setSelectedKwitansi(null);
    setSelectedNoSp2d(item.no_sp2d || "");
    setTglBukti(
      item.tgl_bukti ? new Date(item.tgl_bukti).toISOString().split("T")[0] : ""
    );
    setEditUraian(item.uraian || "");
    setEditPayType(item.pay_type === "TUNAI" ? "TUNAI" : "BANK");
    setFeedback(null);
    setCurrentStep(4);

    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj?id=${encodeURIComponent(
          item.id
        )}`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setEditingDetail(json.data);
      }
    } catch (err) {
      console.error("Failed to load edit detail:", err);
    }
  };

  const handleSelectKwitansi = (kwt: ReadyKwitansi) => {
    setSelectedKwitansi(kwt);
    setSelectedNoSp2d(sp2dOptions[0]?.no_sp2d || "");
    const defaultDate = kwt.tanggal
      ? new Date(kwt.tanggal).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setTglBukti(defaultDate);
  };

  const handleBukukanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd?.id) return;
    if (!selectedNoSp2d) {
      setFeedback({
        type: "error",
        message: "Silakan pilih No. SP2D terlebih dahulu.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingItem) {
        const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            no_sp2d: selectedNoSp2d,
            tgl_bukti: tglBukti || undefined,
            uraian: editUraian,
            pay_type: editPayType,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setFeedback({
            type: "success",
            message: `Pembukuan SPJ ${editingItem.no_bukti} berhasil diperbarui.`,
          });
          setEditingItem(null);
          setEditingDetail(null);
          setSelectedNoSp2d("");
          setTglBukti("");
          setCurrentStep(3);
          await fetchData();
        } else {
          setFeedback({
            type: "error",
            message: json.error || "Gagal memperbarui pembukuan SPJ.",
          });
        }
      } else if (selectedKwitansi) {
        const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kwitansiId: selectedKwitansi.id,
            no_sp2d: selectedNoSp2d,
            tgl_bukti: tglBukti || undefined,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setFeedback({
            type: "success",
            message: json.message || "Kuitansi berhasil dibukukan ke SPJ.",
            noBuktiSpj: json.data?.noBuktiSpj,
            noBuktiTrmPot: json.data?.noBuktiTrmPot,
            noBuktiStrPot: json.data?.noBuktiStrPot,
          });
          setSelectedKwitansi(null);
          setSelectedNoSp2d("");
          setTglBukti("");
          setCurrentStep(3);
          await fetchData();
        } else {
          setFeedback({
            type: "error",
            message: json.error || "Gagal membukukan SPJ.",
          });
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menyimpan pembukuan SPJ.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (item: BookedSpjItem) => {
    setLoadingView(true);
    setViewDetail({ transout: item });
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj?id=${encodeURIComponent(
          item.id
        )}`
      );
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setViewDetail(json.data);
      }
    } catch (err) {
      console.error("Failed to load detail:", err);
    } finally {
      setLoadingView(false);
    }
  };

  const handleDeleteItem = async (item: BookedSpjItem) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus pembukuan SPJ "${item.no_bukti}"?\n\nCatatan: Penerimaan & Penyetoran Potongan terkait (jika ada) juga akan dihapus dan kuitansi ${item.no_spj || ""
      } akan dikembalikan ke daftar siap dibukukan (Cair = 1).`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj?id=${encodeURIComponent(
          item.id
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message:
            json.message || `Pembukuan SPJ ${item.no_bukti} berhasil dihapus.`,
        });
        await fetchData();
      } else {
        setFeedback({
          type: "error",
          message: json.error || "Gagal menghapus pembukuan SPJ.",
        });
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menghapus pembukuan SPJ.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReady = useMemo(() => {
    const q = kwtSearch.trim().toLowerCase();
    return readyKwitansi.filter((item) => {
      if (!q) return true;
      return (
        item.nomor.toLowerCase().includes(q) ||
        item.uraian.toLowerCase().includes(q) ||
        item.kd_rek6.toLowerCase().includes(q) ||
        item.nm_rek6.toLowerCase().includes(q) ||
        item.kd_sub_kegiatan.toLowerCase().includes(q) ||
        item.nm_sub_kegiatan.toLowerCase().includes(q)
      );
    });
  }, [readyKwitansi, kwtSearch]);

  const filteredBooked = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return bookedList.filter((item) => {
      const itemDate = item.tgl_bukti
        ? new Date(item.tgl_bukti).toISOString().split("T")[0]
        : "";
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!q) return true;
      return (
        item.no_bukti.toLowerCase().includes(q) ||
        item.no_sp2d.toLowerCase().includes(q) ||
        item.no_spj.toLowerCase().includes(q) ||
        item.uraian.toLowerCase().includes(q)
      );
    });
  }, [bookedList, searchTerm, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredBooked.length / pageSize));
  const paginatedBooked = filteredBooked.slice((page - 1) * pageSize, page * pageSize);

  const totalReadyNilai = useMemo(
    () => readyKwitansi.reduce((acc, k) => acc + Number(k.nilai || 0), 0),
    [readyKwitansi]
  );
  const totalBookedNilai = useMemo(
    () => bookedList.reduce((acc, b) => acc + Number(b.total || 0), 0),
    [bookedList]
  );

  // =========================================================================
  // STEP 4: HALAMAN FORMULIR PEMBUKUAN SPJ (TERSTRUKTUR SEPERTI FORMULIR KUITANSI)
  // =========================================================================
  if (currentStep === 4) {
    // Sub-step 4A: Pilih Kuitansi Cair = 1 jika belum ada yang dipilih & bukan mode edit
    if (!editingItem && !selectedKwitansi) {
      return (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#5E0E14] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <BookOpenCheck className="w-5 h-5 text-emerald-300" />
                  <span>Input Pembukuan SPJ</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
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
                    value={kwtSearch}
                    onChange={(e) => setKwtSearch(e.target.value)}
                    placeholder="Cari nomor kuitansi, sub kegiatan, rekening, uraian..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">No. Kuitansi &amp; Tgl</th>
                        <th className="px-4 py-3">Sub Kegiatan &amp; Rekening</th>
                        <th className="px-4 py-3">Uraian</th>
                        <th className="px-4 py-3 text-right">Bruto</th>
                        <th className="px-4 py-3 text-right">Potongan</th>
                        <th className="px-4 py-3 text-right">Netto</th>
                        <th className="px-4 py-3 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReady.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            Tidak ada kuitansi berstatus Cair = 1 yang menunggu dibukukan.
                          </td>
                        </tr>
                      ) : (
                        filteredReady.map((kwt, idx) => (
                          <tr
                            key={kwt.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="font-mono font-bold text-slate-900">
                                {kwt.nomor}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(kwt.tanggal).toLocaleDateString("id-ID")}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top max-w-xs">
                              <div className="font-mono text-[11px] text-teal-700 font-semibold">
                                {kwt.kd_sub_kegiatan}
                              </div>
                              <div className="text-slate-600 line-clamp-1">
                                {kwt.nm_sub_kegiatan}
                              </div>
                              <div className="font-mono text-[11px] text-slate-800 font-semibold mt-1">
                                {kwt.kd_rek6}
                              </div>
                              <div className="text-slate-500 line-clamp-1">
                                {kwt.nm_rek6}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top max-w-xs">
                              <p className="text-slate-700 line-clamp-2">{kwt.uraian}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {formatRupiah(Number(kwt.nilai))}
                            </td>
                            <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                              {kwt.potonganList && kwt.potonganList.length > 0 ? (
                                <div className="inline-flex flex-col items-end">
                                  <span className="font-mono font-semibold text-amber-700">
                                    {formatRupiah(Number(kwt.nilai_potongan))}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                                    <Scissors className="w-2.5 h-2.5" />
                                    {kwt.potonganList.length} Potongan
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Rp 0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-right font-mono font-bold text-teal-700 whitespace-nowrap">
                              {formatRupiah(Number(kwt.nilai_bersih))}
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <button
                                type="button"
                                onClick={() => handleSelectKwitansi(kwt)}
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

    // Data terpadu untuk Card 1 (trhtransout), Card 2 (trdtransout), Card 3 (potongan pajak)
    const activeRincian = editingItem
      ? editingDetail?.transout.rincian || editingItem.rincian || []
      : selectedKwitansi
        ? [
          {
            kd_sub_kegiatan: selectedKwitansi.kd_sub_kegiatan,
            nm_sub_kegiatan: selectedKwitansi.nm_sub_kegiatan,
            kd_rek6: selectedKwitansi.kd_rek6,
            nm_rek6: selectedKwitansi.nm_rek6,
            keterangan: selectedKwitansi.uraian,
            nilai: Number(selectedKwitansi.nilai || 0),
          },
        ]
        : [];

    const activePotongan: PotonganItem[] = editingItem
      ? editingDetail?.trmpot?.rincian ||
      editingDetail?.kwitansi?.potonganList ||
      []
      : selectedKwitansi?.potonganList || [];

    const nilaiBruto = editingItem
      ? Number(editingItem.total || 0)
      : Number(selectedKwitansi?.nilai || 0);
    const totalPotongan = activePotongan.reduce(
      (sum, p) => sum + Number(p.nilai || 0),
      0
    );
    const nilaiNetto = nilaiBruto - totalPotongan;

    return (
      <form onSubmit={handleBukukanSubmit} className="space-y-6 animate-in fade-in">
        {feedback && feedback.type === "error" && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 hover:bg-black/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* BAGIAN 1 (ATAS): RINGKASAN TRHTRANSOUT & PENGISIAN HEADER BKU     */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Header Form */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#88131A]" />
                <span>
                  {editingItem
                    ? `Formulir Edit Pembukuan`
                    : "Formulir Pembukuan"}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {!editingItem && (
                <button
                  type="button"
                  onClick={() => setSelectedKwitansi(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  Ganti Kuitansi
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditingDetail(null);
                  setSelectedKwitansi(null);
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar Pembukuan
              </button>
            </div>
          </div>

          {/* 1. Ringkasan Header trhtransout */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#88131A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Ringkasan Transaksi
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
                      : "Otomatis"
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
                  value={tglBukti}
                  onChange={(e) => setTglBukti(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Kuitansi / SPJ
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    editingItem ? editingItem.no_spj : selectedKwitansi?.nomor || "-"
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Kuitansi &amp; Beban
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    editingItem
                      ? `${new Date(editingItem.tgl_spj).toLocaleDateString("id-ID")} • ${editingItem.jenis_beban || "SPJ"
                      }`
                      : selectedKwitansi
                        ? `${new Date(selectedKwitansi.tanggal).toLocaleDateString("id-ID")} • ${selectedKwitansi.jns_beban
                        }`
                        : "-"
                  }
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih No. SP2D <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={sp2dSelectOptions}
                  value={selectedNoSp2d}
                  onChange={setSelectedNoSp2d}
                  placeholder="Cari & pilih No. SP2D (UP/GU/TU Cair)..."
                />
                {sp2dOptions.length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Belum ada SP2D (UP/GU/TU) berstatus Cair untuk OPD ini.
                  </p>
                )}
              </div>


            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Keperluan
              </label>
              {editingItem ? (
                <textarea
                  rows={2}
                  value={editUraian}
                  onChange={(e) => setEditUraian(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              ) : (
                <div className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium">
                  {selectedKwitansi?.uraian || "-"}
                </div>
              )}
            </div>

            {/* Ringkasan Nilai Bruto, Potongan, Netto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Nilai Bruto Belanja
                </span>
                <div className="text-sm font-mono font-extrabold text-slate-900 mt-0.5">
                  {formatRupiah(nilaiBruto)}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-4 py-3">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">
                  Total Potongan Pajak
                </span>
                <div className="text-sm font-mono font-extrabold text-rose-700 mt-0.5">
                  {formatRupiah(totalPotongan)}
                </div>
              </div>
              <div className="rounded-xl bg-teal-50/70 border border-teal-200 px-4 py-3">
                <span className="text-[11px] font-semibold text-teal-800 uppercase">
                  Nilai Netto Dibayarkan
                </span>
                <div className="text-sm font-mono font-extrabold text-teal-800 mt-0.5">
                  {formatRupiah(nilaiNetto)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BAGIAN 2 (TENGAH): RINCIAN BELANJA (TRDTRANSOUT)                  */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Rincian Belanja
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Total Rincian Belanja:</span>
              <div className="text-sm font-mono font-bold text-slate-900">
                {formatRupiah(
                  activeRincian.reduce((s, r) => s + Number(r.nilai || 0), 0)
                )}
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
                  <th className="px-3.5 py-2.5">Keterangan</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai Belanja (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRincian.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs italic text-slate-400">
                      Tidak ada rincian belanja.
                    </td>
                  </tr>
                ) : (
                  activeRincian.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-mono text-xs font-bold text-teal-700">
                          {r.kd_sub_kegiatan}
                        </div>
                        {r.nm_sub_kegiatan && (
                          <div className="text-xs text-slate-700">{r.nm_sub_kegiatan}</div>
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
                      <td className="px-3.5 py-3 text-xs text-slate-600 max-w-xs">
                        {r.keterangan || "-"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(Number(r.nilai || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BAGIAN 3 (BAWAH): POTONGAN PAJAK & POTONGAN LAINNYA               */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Potongan Pajak &amp; Potongan Lainnya
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Total Potongan:</span>
              <div className="text-sm font-mono font-bold text-rose-600">
                {formatRupiah(totalPotongan)}
              </div>
            </div>
          </div>

          {editingItem && (editingDetail?.trmpot || editingDetail?.strpot) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {editingDetail.trmpot && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3.5 py-2.5">
                  <span className="text-[11px] text-amber-800 block">
                    No. BKU Penerimaan Potongan
                  </span>
                  <span className="font-mono font-bold text-amber-950">
                    {editingDetail.trmpot.no_bukti}
                  </span>
                </div>
              )}
              {editingDetail.strpot && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3.5 py-2.5">
                  <span className="text-[11px] text-amber-800 block">
                    No. BKU Penyetoran Potongan
                  </span>
                  <span className="font-mono font-bold text-amber-950">
                    {editingDetail.strpot.no_bukti}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-2.5">Rekening Potongan</th>
                  <th className="px-3.5 py-2.5">ID Billing / NTPN</th>
                  <th className="px-3.5 py-2.5">Keterangan</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai Potongan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePotongan.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs italic text-slate-400">
                      Tidak ada potongan pajak pada pembukuan SPJ ini (Nihil Potongan).
                    </td>
                  </tr>
                ) : (
                  activePotongan.map((pot, idx) => (
                    <tr key={pot.id || idx} className="hover:bg-slate-50 transition-colors">
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
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5 font-mono text-xs">
                          {pot.id_billing ? (
                            <div className="text-indigo-700 font-bold">
                              Billing: {pot.id_billing}
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Billing: -</div>
                          )}
                          {pot.ntpn ? (
                            <div className="text-emerald-700 font-bold">
                              NTPN: {pot.ntpn}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-600">
                        {pot.keterangan || "-"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                        {formatRupiah(Number(pot.nilai || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tombol Simpan / Batal di bagian paling bawah (persis Formulir Kuitansi) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Pastikan <strong className="text-slate-700">No. SP2D</strong> dan{" "}
            <strong className="text-slate-700">Tanggal Bukti BKU</strong> sudah sesuai sebelum
            menyimpan.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (editingItem) {
                  setEditingItem(null);
                  setEditingDetail(null);
                  setCurrentStep(3);
                } else {
                  setSelectedKwitansi(null);
                }
              }}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {editingItem ? "Batal" : "Pilih Kuitansi Lain"}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedNoSp2d}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-opacity cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {editingItem ? "Simpan Perubahan" : "Simpan Pembukuan SPJ"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  // =========================================================================
  // STEP 3: DAFTAR PEMBUKUAN SPJ (SUDAH DIBUKUKAN)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xl font-bold text-amber-800 mt-1">
            {readyKwitansi.length} Kuitansi
          </div>
          <span className="text-[11px] font-mono text-amber-900 mt-0.5 inline-block">
            {formatRupiah(totalReadyNilai)}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xl font-bold text-teal-700 mt-1">
            {bookedList.length} BKU SPJ
          </div>
          <span className="text-[11px] font-mono text-teal-800 font-bold mt-0.5 inline-block">
            {formatRupiah(totalBookedNilai)}
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${feedback.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold">{feedback.message}</p>
              {feedback.type === "success" && feedback.noBuktiSpj && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 font-mono font-semibold text-emerald-800">
                    BKU SPJ: {feedback.noBuktiSpj}
                  </span>
                  {feedback.noBuktiTrmPot && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 font-mono font-semibold text-emerald-800">
                        Penerimaan Potongan: {feedback.noBuktiTrmPot}
                      </span>
                    </>
                  )}
                  {feedback.noBuktiStrPot && (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 font-mono font-semibold text-emerald-800">
                        Penyetoran Potongan: {feedback.noBuktiStrPot}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Tutup notifikasi"
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
              Daftar Pembukuan Transaksi
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
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Sampai Tanggal"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No. Bukti / SP2D / SPJ..."
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
            onClick={handleOpenStep4Create}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Pembukuan SPJ</span>
          </button>
        </div>
      </div>

      {/* Tabel Daftar Pembukuan SPJ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">No. Bukti BKU</th>
                <th className="px-4 py-3">Tanggal Bukti</th>
                <th className="px-4 py-3">No. SPJ</th>
                <th className="px-4 py-3">Uraian &amp; Rincian</th>
                <th className="px-4 py-3 text-right">Total Nilai</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat daftar pembukuan SPJ...
                  </td>
                </tr>
              ) : paginatedBooked.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpenCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Belum ada data SPJ yang dibukukan. Klik &quot;Input Pembukuan SPJ&quot;
                    untuk membukukan kuitansi berstatus Cair = 1.
                  </td>
                </tr>
              ) : (
                paginatedBooked.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 align-top font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.no_bukti}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600 whitespace-nowrap">
                      {new Date(item.tgl_bukti).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-slate-600 whitespace-nowrap">
                      {item.no_spj}
                    </td>
                    <td className="px-4 py-3 align-top max-w-md">
                      <p className="text-slate-800 font-medium">{item.uraian}</p>
                      {item.rincian && item.rincian.length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-500 font-mono">
                          {item.rincian[0].kd_sub_kegiatan} • {item.rincian[0].kd_rek6} (
                          {item.rincian[0].nm_rek6})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(Number(item.total))}
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>{item.status}</span>
                        </span>
                        {(item.status_lpj === "SUDAH_LPJ" || item.no_lpj) && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold"
                            title={item.no_lpj ? `No. LPJ: ${item.no_lpj}` : "Telah di-LPJ-kan"}
                          >
                            Telah di-LPJ-kan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      {item.status_lpj === "SUDAH_LPJ" || item.no_lpj ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold"
                          title={`Terkunci karena sudah masuk LPJ (${item.no_lpj || "-"})`}
                        >
                          Terkunci (LPJ)
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenStep4Edit(item)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Pembukuan SPJ"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
                            title="Hapus Pembukuan SPJ"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={filteredBooked.length}
          limit={pageSize}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* Modal View Detail Pembukuan SPJ */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold">
                    Detail Pembukuan SPJ: {viewDetail.transout.no_bukti}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    No. Kuitansi: {viewDetail.transout.no_spj}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetail(null)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {loadingView && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5E0E14]" />
                  <span>Memuat rincian potongan...</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">No. Bukti BKU</span>
                  <span className="font-mono font-bold text-[#5E0E14]">
                    {viewDetail.transout.no_bukti}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Bukti</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(viewDetail.transout.tgl_bukti).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">No. SP2D</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewDetail.transout.no_sp2d}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Metode Pembayaran</span>
                  <span className="font-semibold text-slate-800">
                    {viewDetail.transout.pay_type || "BANK"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Uraian</span>
                  <span className="text-slate-800 font-medium">
                    {viewDetail.transout.uraian}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Total Belanja SPJ</span>
                  <span className="font-mono font-bold text-sm text-teal-700">
                    {formatRupiah(Number(viewDetail.transout.total))}
                  </span>
                </div>
              </div>

              {viewDetail.transout.rincian && viewDetail.transout.rincian.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-700">Rincian Rekening Belanja</h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {viewDetail.transout.rincian.map((r, i) => (
                      <div key={i} className="p-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-mono font-bold text-slate-800">
                            {r.kd_sub_kegiatan} • {r.kd_rek6}
                          </div>
                          <div className="text-slate-600">{r.nm_rek6}</div>
                        </div>
                        <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(Number(r.nilai))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(viewDetail.trmpot || viewDetail.strpot) && (
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Scissors className="w-4 h-4 text-amber-600" />
                    Potongan Pajak Otomatis
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewDetail.trmpot && (
                      <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200">
                        <span className="text-[11px] text-slate-500 block">
                          No. BKU Penerimaan Potongan
                        </span>
                        <span className="font-mono font-bold text-amber-900">
                          {viewDetail.trmpot.no_bukti}
                        </span>
                      </div>
                    )}
                    {viewDetail.strpot && (
                      <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200">
                        <span className="text-[11px] text-slate-500 block">
                          No. BKU Penyetoran Potongan
                        </span>
                        <span className="font-mono font-bold text-amber-900">
                          {viewDetail.strpot.no_bukti}
                        </span>
                      </div>
                    )}
                  </div>
                  {viewDetail.trmpot?.rincian && viewDetail.trmpot.rincian.length > 0 && (
                    <div className="space-y-1">
                      {viewDetail.trmpot.rincian.map((pt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200/70"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-700">
                              {pt.kd_rek6}
                            </span>{" "}
                            <span className="text-slate-700">{pt.nm_rek6}</span>
                            {pt.id_billing && (
                              <span className="ml-2 text-[11px] font-mono text-slate-500">
                                (Billing: {pt.id_billing})
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-amber-800">
                            {formatRupiah(Number(pt.nilai))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewDetail.transout;
                  setViewDetail(null);
                  handleOpenStep4Edit(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetail(null)}
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

export default function PembukuanSpjView() {
  return (
    <BendaharaStepperWrapper
      title="Pembukuan SPJ"
      subtitle=""
      step3Label="Daftar Pembukuan SPJ"
      step4Label="Pengisian Pembukuan SPJ"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <PembukuanSpjContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}
