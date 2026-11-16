"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Check,
  X,
  AlertCircle,
  Calendar,
  Wallet,
  ClipboardCheck,
  RotateCcw,
  Lock,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface KwitansiPenerima {
  id?: string;
  no_urut?: string | null;
  nm_penerima: string;
  alamat_penerima?: string | null;
  npwp_penerima?: string | null;
  nm_bank_penerima: string;
  no_rek_penerima: string;
  an_rekening?: string | null;
  nilai: number;
  uraian?: string | null;
  cair?: number;
  keterangan?: string | null;
}

interface KwitansiPotongan {
  id?: string;
  kd_rek6?: string | null;
  nm_rek6?: string | null;
  id_billing?: string | null;
  ntpn?: string | null;
  nilai: number;
  keterangan?: string | null;
}

interface KwitansiItem {
  id: string;
  nomor: string;
  tanggal: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  jns_beban: string;
  uraian: string;
  nilai: number | string;
  nilai_potongan: number | string;
  nilai_bersih: number | string;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  cair?: number;
  status: "DRAFT" | "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBUKUKAN";
  tgl_persetujuan?: string | null;
  catatan?: string | null;
  penerimaList: KwitansiPenerima[];
  potonganList: KwitansiPotongan[];
}

function terbilang(n: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  if (n < 12) return bilangan[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100)
    return (
      terbilang(Math.floor(n / 10)) +
      " Puluh" +
      (n % 10 > 0 ? " " + terbilang(n % 10) : "")
    );
  if (n < 200) return "Seratus" + (n - 100 > 0 ? " " + terbilang(n - 100) : "");
  if (n < 1000)
    return (
      terbilang(Math.floor(n / 100)) +
      " Ratus" +
      (n % 100 > 0 ? " " + terbilang(n % 100) : "")
    );
  if (n < 2000)
    return "Seribu" + (n - 1000 > 0 ? " " + terbilang(n - 1000) : "");
  if (n < 1000000)
    return (
      terbilang(Math.floor(n / 1000)) +
      " Ribu" +
      (n % 1000 > 0 ? " " + terbilang(n % 1000) : "")
    );
  if (n < 1000000000)
    return (
      terbilang(Math.floor(n / 1000000)) +
      " Juta" +
      (n % 1000000 > 0 ? " " + terbilang(n % 1000000) : "")
    );
  if (n < 1000000000000)
    return (
      terbilang(Math.floor(n / 1000000000)) +
      " Miliar" +
      (n % 1000000000 > 0 ? " " + terbilang(n % 1000000000) : "")
    );
  return (
    terbilang(Math.floor(n / 1000000000000)) +
    " Triliun" +
    (n % 1000000000000 > 0 ? " " + terbilang(n % 1000000000000) : "")
  );
}

export default function ValidasiSpjView() {
  return (
    <BendaharaStepperWrapper
      title="Validasi SPJ / Kuitansi (UP / GU / TU)"
      subtitle=""
      step3Label="Daftar Kuitansi SPJ"
    >
      {({ selectedOpd, selectedUnit }) => (
        <ValidasiSpjContent selectedOpd={selectedOpd} selectedUnit={selectedUnit} />
      )}
    </BendaharaStepperWrapper>
  );
}

function ValidasiSpjContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [dataList, setDataList] = useState<KwitansiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBeban, setSelectedBeban] = useState("SEMUA");
  const [selectedStatus, setSelectedStatus] = useState("SEMUA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Feedback message
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Multi-select Checklist State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Detail, Print & Reject
  const [selectedKwitansi, setSelectedKwitansi] = useState<KwitansiItem | null>(null);
  const [showModalDetail, setShowModalDetail] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectingBulk, setRejectingBulk] = useState(false);
  const [rejectCatatan, setRejectCatatan] = useState("");

  const fetchData = async (silent = false) => {
    if (!selectedOpd) return;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      if (selectedBeban !== "SEMUA") q.set("jns_beban", selectedBeban);
      if (selectedStatus !== "SEMUA") q.set("status", selectedStatus);

      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/validasi-spj?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        const list: KwitansiItem[] = json.data || [];
        setDataList(list);
        setSelectedKwitansi((prev) =>
          prev ? list.find((item) => item.id === prev.id) || prev : null
        );
      }
    } catch (e) {
      if (!silent) console.error("Gagal memuat data kuitansi SPJ:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
    fetchData(false);
  }, [selectedOpd, selectedUnit, selectedBeban, selectedStatus]);

  // Real-time background polling setiap 5 detik untuk sinkronisasi Cair & Uraian dari CMS_WEB
  useEffect(() => {
    if (!selectedOpd) return;
    const timer = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedOpd, selectedUnit, selectedBeban, selectedStatus]);

  const handleAction = async (
    target: string | string[],
    action: "DISETUJUI" | "DITOLAK" | "BATAL_VALIDASI",
    catatan?: string
  ) => {
    const ids = Array.isArray(target) ? target : [target];
    if (ids.length === 0) return;

    if (Array.isArray(target)) {
      setBulkProcessing(true);
    } else {
      setProcessingId(target);
    }
    setMessage(null);
    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/validasi-spj",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action, catatan }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memproses validasi kuitansi");
      }

      const syncedInfo =
        action === "DISETUJUI" && json.data?.syncedCmsRows !== undefined
          ? ``
          : "";

      setMessage({
        type: "success",
        text:
          action === "DISETUJUI"
            ? `${ids.length} Kuitansi SPJ berhasil divalidasi / disetujui${syncedInfo}.`
            : action === "DITOLAK"
              ? `${ids.length} Kuitansi SPJ telah ditolak / dikembalikan.`
              : `Validasi ${ids.length} kuitansi SPJ berhasil dibatalkan.`,
      });

      if (showRejectModal) {
        setShowRejectModal(false);
        setRejectCatatan("");
        setRejectingId(null);
        setRejectingBulk(false);
      }
      if (showModalDetail) {
        setShowModalDetail(false);
      }

      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      await fetchData();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Gagal memproses validasi kuitansi",
      });
    } finally {
      setProcessingId(null);
      setBulkProcessing(false);
    }
  };

  // Filter & Pagination
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.nomor?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          item.kd_sub_kegiatan?.toLowerCase().includes(q) ||
          item.nm_sub_kegiatan?.toLowerCase().includes(q) ||
          item.kd_rek6?.toLowerCase().includes(q) ||
          item.nm_rek6?.toLowerCase().includes(q) ||
          item.pptkNama?.toLowerCase().includes(q) ||
          item.pptkNip?.toLowerCase().includes(q) ||
          item.penerimaList?.some(
            (p) =>
              p.nm_penerima?.toLowerCase().includes(q) ||
              p.uraian?.toLowerCase().includes(q)
          );
        if (!match) return false;
      }

      // 2. Tanggal Kuitansi
      if (startDate || endDate) {
        const itemDateStr = item.tanggal
          ? new Date(item.tanggal).toISOString().split("T")[0]
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

  const pageItemIds = useMemo(
    () => paginatedList.map((item) => item.id),
    [paginatedList]
  );

  const isAllPageSelected =
    pageItemIds.length > 0 &&
    pageItemIds.every((id) => selectedIds.includes(id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageItemIds.includes(id)));
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...pageItemIds]))
      );
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isItemCairLocked = (item: KwitansiItem) => {
    return (
      item.cair === 1 ||
      item.cair === 9 ||
      Boolean(item.penerimaList?.some((p) => p.cair === 1 || p.cair === 9))
    );
  };

  const selectedItemsSummary = useMemo(() => {
    const items = dataList.filter((d) => selectedIds.includes(d.id));
    const totalBruto = items.reduce((acc, i) => acc + Number(i.nilai || 0), 0);
    const totalNetto = items.reduce(
      (acc, i) => acc + Number(i.nilai_bersih || 0),
      0
    );
    const hasLocked = items.some((i) => isItemCairLocked(i));
    return { count: items.length, totalBruto, totalNetto, hasLocked };
  }, [dataList, selectedIds]);

  const getCairBadgeStyle = (cairVal: number) => {
    switch (Number(cairVal)) {
      case 1:
        return "bg-emerald-100 text-emerald-800 border-emerald-300"; // 1 = Hijau
      case 2:
        return "bg-rose-100 text-rose-800 border-rose-300"; // 2 = Merah
      case 9:
        return "bg-blue-100 text-blue-800 border-blue-300"; // 9 = Biru
      case 0:
      default:
        return "bg-amber-100 text-amber-800 border-amber-300"; // 0 = Kuning
    }
  };

  const renderStatusBadge = (status: string, item?: KwitansiItem) => {
    const cairVal =
      item?.penerimaList?.find((p) => p.cair === 1)?.cair ??
      item?.penerimaList?.find((p) => p.cair === 9)?.cair ??
      item?.penerimaList?.find((p) => p.cair === 2)?.cair ??
      item?.cair ??
      0;

    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Clock className="w-3 h-3 text-gray-500" /> Draft
          </span>
        );
      case "DIAJUKAN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Send className="w-3 h-3 text-amber-500" /> Menunggu Validasi
          </span>
        );
      case "DISETUJUI":
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Tervalidasi</span>
            </span>
            {cairVal === 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Lock className="w-2.5 h-2.5" /> Cair (1)
              </span>
            )}
            {cairVal === 2 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                Cair (2)
              </span>
            )}
            {cairVal === 9 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                <Lock className="w-2.5 h-2.5" /> Terkunci CMS (9)
              </span>
            )}
          </div>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Ditolak
          </span>
        );
      case "DIBUKUKAN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Dibukukan BKU
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action / Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Daftar SPJ / Kuitansi Pengajuan (UP / GU / TU)
            </h3>
            <p className="text-[11px] text-slate-500">
              Menampilkan dokumen kuitansi belanja UP, GU, dan TU dari menu Pengajuan Kuitansi
            </p>
          </div>

          <button
            onClick={() => fetchData(false)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 cursor-pointer transition-colors w-fit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Filter Jenis Beban */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <Wallet className="w-3 h-3 text-rose-500" />
              Jenis Beban
            </label>
            <select
              value={selectedBeban}
              onChange={(e) => {
                setSelectedBeban(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A] cursor-pointer"
            >
              <option value="SEMUA">Semua Beban (UP / GU / TU)</option>
              <option value="UP">UP - Uang Persediaan</option>
              <option value="GU">GU - Ganti Uang</option>
              <option value="TU">TU - Tambah Uang</option>
            </select>
          </div>

          {/* Filter Status */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <ClipboardCheck className="w-3 h-3 text-rose-500" />
              Status Validasi
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A] cursor-pointer"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="DIAJUKAN">Menunggu Validasi (Diajukan)</option>
              <option value="DISETUJUI">Tervalidasi (Disetujui)</option>
              <option value="DITOLAK">Ditolak</option>
              <option value="DIBUKUKAN">Dibukukan</option>
            </select>
          </div>

          {/* Filter Periode Tanggal */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-rose-500" />
              Periode Tanggal
            </label>
            <div className="flex items-center gap-1.5 h-9 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 rounded-xl">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer w-full"
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
                className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer w-full"
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
          </div>

          {/* Search Bar */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <Search className="w-3 h-3 text-rose-500" />
              Pencarian
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="No. kuitansi, uraian, penerima..."
                className="w-full h-9 pl-8 pr-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
              />
            </div>
          </div>
        </div>

        {/* Legenda Warna Status Cair */}

      </div>

      {/* Bulk Checklist Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-white/20 text-xs font-extrabold">
              {selectedIds.length} Kuitansi Dipilih
            </span>
            <div className="text-xs">
              <span className="opacity-80">Total Netto Terpilih: </span>
              <strong className="font-mono font-extrabold">
                {formatRupiah(selectedItemsSummary.totalNetto)}
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkProcessing}
              onClick={() => handleAction(selectedIds, "DISETUJUI")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {bulkProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Validasi Terpilih ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              disabled={bulkProcessing || selectedItemsSummary.hasLocked}
              onClick={() => {
                setRejectingBulk(true);
                setRejectingId(null);
                setShowRejectModal(true);
              }}
              title={
                selectedItemsSummary.hasLocked
                  ? "Terdapat kuitansi dengan status Cair = 1 atau 9 yang terkunci"
                  : "Tolak kuitansi terpilih"
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tolak Terpilih</span>
            </button>

            <button
              type="button"
              disabled={bulkProcessing || selectedItemsSummary.hasLocked}
              onClick={() => handleAction(selectedIds, "BATAL_VALIDASI")}
              title={
                selectedItemsSummary.hasLocked
                  ? "Terdapat kuitansi dengan status Cair = 1 atau 9 yang terkunci"
                  : "Batalkan validasi kuitansi terpilih"
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedItemsSummary.hasLocked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Batal Validasi</span>
            </button>

            <button
              type="button"
              disabled={bulkProcessing}
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer"
            >
              Reset Pilihan
            </button>
          </div>
        </div>
      )}

      {/* Tabel Kuitansi SPJ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded border-white/40 text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-600"
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>
                <th className="px-3 py-3 text-center w-10">No</th>
                <th className="px-3 py-3 min-w-[160px]">No. Kuitansi & Tgl</th>
                <th className="px-3 py-3 min-w-[260px]">Sub Kegiatan, Rekening & Uraian</th>
                <th className="px-3 py-3 min-w-[160px]">Nama PPTK</th>
                <th className="px-3 py-3 text-right min-w-[115px]">Nilai Bruto</th>
                <th className="px-3 py-3 text-right min-w-[105px]">Potongan</th>
                <th className="px-3 py-3 text-right min-w-[115px]">Nilai Netto</th>
                <th className="px-3 py-3 text-center min-w-[120px]">Status Validasi</th>
                <th className="px-3 py-3 min-w-[160px]">Uraian</th>
                <th className="px-3 py-3 text-center min-w-[125px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-xs italic text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data kuitansi SPJ...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada dokumen kuitansi (UP/GU/TU) yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${isChecked ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-slate-50"
                        }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#88131A] focus:ring-[#88131A] cursor-pointer accent-[#88131A]"
                        />
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-slate-900">{item.nomor}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.tanggal
                            ? new Date(item.tanggal).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                            : "-"}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 mt-1">
                          Beban {item.jns_beban}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-slate-900 font-medium leading-tight">
                          <span className="font-mono text-rose-700 text-[11px]">
                            {item.kd_sub_kegiatan}
                          </span>
                          <div className="line-clamp-2">{item.nm_sub_kegiatan}</div>
                        </div>
                        <div className="text-slate-600 text-[11px] mt-1 pt-1 border-t border-slate-100">
                          <span className="font-mono text-slate-500">{item.kd_rek6}</span> -{" "}
                          {item.nm_rek6}
                        </div>
                        {item.uraian && (
                          <div className="text-slate-700 text-[11px] mt-1.5 pt-1.5 border-t border-dashed border-slate-200 leading-snug">
                            <span className="font-semibold text-slate-500">Uraian: </span>
                            <span>{item.uraian}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {item.pptkNama ? (
                          <div className="leading-tight">
                            <div className="font-semibold text-slate-800">{item.pptkNama}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(Number(item.nilai))}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-medium text-rose-600">
                        {formatRupiah(Number(item.nilai_potongan))}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(Number(item.nilai_bersih))}
                      </td>
                      <td className="px-3 py-3 text-center">{item.status}</td>
                      <td className="px-3 py-3 text-left">
                        {Number(item.cair) === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            MENUNGGU
                          </span>
                        ) : Number(item.cair) === 2 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            GAGAL
                          </span>
                        ) : Number(item.cair) === 9 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" />
                            SUCCESS IMPORT
                          </span>
                        ) : Number(item.cair) === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            CAIR
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">TIDAK DIKETAHUI</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedKwitansi(item);
                              setShowModalDetail(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Kuitansi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {item.status !== "DISETUJUI" && item.status !== "DIBUKUKAN" && (
                            <button
                              disabled={processingId === item.id}
                              onClick={() => handleAction(item.id, "DISETUJUI")}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Validasi / Setujui Kuitansi"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {item.status !== "DITOLAK" &&
                            item.status !== "DIBUKUKAN" &&
                            !isItemCairLocked(item) && (
                              <button
                                disabled={processingId === item.id || bulkProcessing}
                                onClick={() => {
                                  setRejectingBulk(false);
                                  setRejectingId(item.id);
                                  setShowRejectModal(true);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Tolak / Kembalikan Kuitansi"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                          {item.status === "DISETUJUI" && (
                            isItemCairLocked(item) ? (
                              <button
                                type="button"
                                disabled
                                className="p-1.5 text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed"
                                title="Terkunci: Status Cair pada CMS_WEB = 1 atau 9 (Tidak dapat dibatalkan)"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                disabled={processingId === item.id || bulkProcessing}
                                onClick={() => handleAction(item.id, "BATAL_VALIDASI")}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Batalkan Validasi"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
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

      {/* ============================================================== */}
      {/* MODAL DETAIL KUITANSI                                          */}
      {/* ============================================================== */}
      {showModalDetail && selectedKwitansi && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Rincian Dokumen Kuitansi
                </h3>
              </div>
              <button
                onClick={() => setShowModalDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-gray-500 font-medium">Nomor Kuitansi</span>
                  <p className="font-mono font-bold text-gray-900 text-sm">
                    {selectedKwitansi.nomor}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Tanggal Kuitansi</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedKwitansi.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Jenis Beban</span>
                  <p className="font-bold text-rose-700">Beban {selectedKwitansi.jns_beban}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Pejabat PPTK</span>
                  <p className="font-semibold text-gray-900">
                    {selectedKwitansi.pptkNama || "-"}
                  </p>
                  {selectedKwitansi.pptkNip && (
                    <p className="text-[10px] font-mono text-gray-500">
                      NIP. {selectedKwitansi.pptkNip}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Status Validasi</span>
                  <div className="mt-0.5">
                    {selectedKwitansi.status}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Status Cair</span>
                  <div className="mt-0.5">
                    {Number(selectedKwitansi.cair) === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        MENUNGGU
                      </span>
                    ) : Number(selectedKwitansi.cair) === 2 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        GAGAL
                      </span>
                    ) : Number(selectedKwitansi.cair) === 9 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3" />
                        SUCCESS IMPORT
                      </span>
                    ) : Number(selectedKwitansi.cair) === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        CAIR
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">TIDAK DIKETAHUI</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-1">Sub Kegiatan & Rekening Belanja</h4>
                <div className="p-3 rounded-lg border border-gray-200 space-y-1.5">
                  <div>
                    <strong className="text-gray-900">
                      {selectedKwitansi.kd_sub_kegiatan} - {selectedKwitansi.nm_sub_kegiatan}
                    </strong>
                  </div>
                  <div>
                    <strong className="text-gray-900">
                      {selectedKwitansi.kd_rek6} - {selectedKwitansi.nm_rek6}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-1">Uraian Belanja</h4>
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
                  {selectedKwitansi.uraian}
                </div>
              </div>

              {/* Rincian Penerima beserta Status Cair & Uraian CMS */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-gray-800">
                    Rincian Penerima
                  </h4>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3">Nama Penerima</th>
                        <th className="py-2 px-3">Bank & No. Rekening</th>
                        <th className="py-2 px-3 text-center">Status Cair & Uraian</th>
                        <th className="py-2 px-3 text-right">Nilai Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedKwitansi.penerimaList.map((p, idx) => {
                        const cairVal = Number(p.cair ?? selectedKwitansi.cair ?? 0);
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-gray-900">{p.nm_penerima}</div>
                              {p.npwp_penerima && (
                                <div className="text-[10px] text-gray-500 font-normal">
                                  NPWP: {p.npwp_penerima}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-700">
                              <div>{p.nm_bank_penerima}</div>
                              <div className="font-mono text-gray-800">{p.no_rek_penerima}</div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {(() => {
                                const cair = Number(p.cair);

                                const badgeCls =
                                  cair === 0
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : cair === 2
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : cair === 9
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : cair === 1
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-50 text-slate-500 border-slate-200";

                                const label =
                                  cair === 0
                                    ? "MENUNGGU"
                                    : cair === 1
                                      ? "CAIR"
                                      : p.uraian || "";

                                return label ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeCls}`}
                                  >
                                    {label}
                                  </span>
                                ) : null;
                              })()}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-gray-900">
                              {formatRupiah(Number(p.nilai))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rincian Potongan */}
              {selectedKwitansi.potonganList.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">
                    Rincian Potongan / Pajak ({selectedKwitansi.potonganList.length})
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="py-2 px-3">Jenis Potongan</th>
                          <th className="py-2 px-3">ID Billing</th>
                          <th className="py-2 px-3">NTPN</th>
                          <th className="py-2 px-3 text-right">Nilai Potongan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedKwitansi.potonganList.map((pot, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-gray-800">
                              {pot.nm_rek6 || "Potongan"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                              {pot.id_billing || "-"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                              {pot.ntpn || "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-rose-600">
                              {formatRupiah(Number(pot.nilai))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rekapitulasi Nominal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-gray-500 font-medium">Total Bruto</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Total Potongan</span>
                  <div className="text-sm font-bold text-rose-600 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai_potongan))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Total Netto</span>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai_bersih))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setShowModalDetail(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2">
                {selectedKwitansi.status !== "DISETUJUI" &&
                  selectedKwitansi.status !== "DIBUKUKAN" && (
                    <button
                      disabled={processingId === selectedKwitansi.id}
                      onClick={() => handleAction(selectedKwitansi.id, "DISETUJUI")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Validasi / Setujui
                    </button>
                  )}
                {selectedKwitansi.status !== "DITOLAK" &&
                  selectedKwitansi.status !== "DIBUKUKAN" &&
                  !isItemCairLocked(selectedKwitansi) && (
                    <button
                      disabled={processingId === selectedKwitansi.id}
                      onClick={() => {
                        setShowModalDetail(false);
                        setRejectingBulk(false);
                        setRejectingId(selectedKwitansi.id);
                        setShowRejectModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Tolak
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CETAK BUKTI KUITANSI RESMI                               */}
      {/* ============================================================== */}
      {showPrintModal && selectedKwitansi && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Pratinjau Dokumen Kuitansi Pengajuan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Sekarang
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content Area */}
            <div className="p-8 overflow-y-auto print:p-0 font-serif text-[12px] leading-snug text-black bg-white">
              <div>
                <div className="text-sm font-bold tracking-wide">
                  NOMOR : {selectedKwitansi.nomor}
                </div>
                <div className="text-sm font-bold uppercase tracking-wide mt-0.5">
                  KWITANSI (TANDA PEMBAYARAN)
                </div>
              </div>

              <div className="flex justify-end mt-1 mb-2">
                <table className="text-[12px] w-[48%]">
                  <tbody>
                    <tr>
                      <td className="w-28 py-0.5">Tanggal</td>
                      <td className="w-4 text-center">:</td>
                      <td>
                        {selectedKwitansi.tanggal
                          ? new Date(selectedKwitansi.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">No BKU</td>
                      <td className="text-center">:</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Sub Kegiatan</td>
                      <td className="text-center">:</td>
                      <td>{selectedKwitansi.kd_sub_kegiatan}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Rekening</td>
                      <td className="text-center">:</td>
                      <td>{selectedKwitansi.kd_rek6}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="font-bold uppercase text-[12px] mt-2 mb-2 leading-snug">
                SUDAH TERIMA DARI BENDAHARA PENGELUARAN {selectedKwitansi.nm_skpd}
              </div>

              <div className="text-[12px] mb-1">BANYAKNYA :</div>
              <div className="flex items-baseline gap-4 mb-2">
                <div className="w-[23%] shrink-0 text-base font-bold whitespace-nowrap">
                  Rp.{" "}
                  {Number(selectedKwitansi.nilai).toLocaleString("id-ID", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="w-[77%] italic text-[12px]">
                  ( {terbilang(Math.round(Number(selectedKwitansi.nilai)))} Rupiah )
                </div>
              </div>

              <div className="flex items-start gap-4 mt-2">
                <div className="w-[23%] shrink-0 font-bold text-[12px]">
                  Yaitu untuk :
                </div>
                <div className="w-[77%] border-b border-black pb-2 text-[12px] leading-relaxed">
                  {selectedKwitansi.uraian}
                </div>
              </div>

              <div className="w-[36%] ml-auto mt-1 text-[12px]">
                <div className="font-bold mb-1">Informasi Potongan :</div>
                {selectedKwitansi.potonganList.length === 0 ? (
                  <div className="text-right pb-1">(Nihil)</div>
                ) : (
                  <div className="space-y-0.5 pb-1">
                    {selectedKwitansi.potonganList.map((p, idx) => (
                      <div key={idx} className="flex justify-between gap-2 text-[11px]">
                        <span className="truncate">{p.nm_rek6}</span>
                        <span className="whitespace-nowrap">
                          Rp.{" "}
                          {Number(p.nilai).toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-black pt-1 flex justify-between items-center font-bold">
                  <span>Jumlah :</span>
                  <span>
                    {selectedKwitansi.potonganList.length > 0
                      ? `Rp. ${Number(selectedKwitansi.nilai_potongan).toLocaleString("id-ID", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                      : "(Nihil)"}
                  </span>
                </div>
              </div>

              <div className="border-b-2 border-black my-3" />

              <div className="grid grid-cols-4 gap-4 mt-4 text-[11px] leading-snug text-left">
                <div className="flex flex-col justify-between">
                  <div>
                    <div>Setuju dibayar,</div>
                    <div className="uppercase mt-2">
                      KEPALA {selectedKwitansi.nm_skpd}, SELAKU PENGGUNA ANGGARAN
                    </div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.paKpaNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.paKpaNip || "-"}</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div>Diketahui Oleh :</div>
                    <div className="uppercase mt-2">
                      PEJABAT PELAKSANA TEKNIS KEGIATAN
                    </div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.pptkNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.pptkNip || "-"}</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div>Dibayar Oleh :</div>
                    <div className="uppercase mt-2">BENDAHARA PENGELUARAN</div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.bendaharaNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.bendaharaNip || "-"}</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div>,</div>
                    <div className="mt-2">Yang Menerima :</div>
                  </div>
                  <div className="mt-16">
                    <table className="w-full text-[11px]">
                      <tbody>
                        <tr>
                          <td className="w-16 align-top">Nama</td>
                          <td className="w-3 align-top">:</td>
                          <td className="uppercase">
                            {selectedKwitansi.penerimaList[0]?.nm_penerima || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="align-top">Pekerjaan</td>
                          <td className="align-top">:</td>
                          <td>
                            {selectedKwitansi.penerimaList[0]?.keterangan || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="align-top">Alamat</td>
                          <td className="align-top">:</td>
                          <td>
                            {selectedKwitansi.penerimaList[0]?.alamat_penerima || "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TOLAK KUITANSI                                           */}
      {/* ============================================================== */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-gray-900">
                Kembalikan / Tolak Kuitansi SPJ
              </h3>
            </div>
            <p className="text-xs text-gray-600">
              Berikan catatan perbaikan / alasan penolakan kuitansi ini:
            </p>
            <textarea
              rows={4}
              required
              placeholder="Contoh: Lampiran bukti nota belum lengkap, nilai rincian belum sesuai..."
              value={rejectCatatan}
              onChange={(e) => setRejectCatatan(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectCatatan("");
                  setRejectingId(null);
                  setRejectingBulk(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rejectCatatan.trim() || !!processingId || bulkProcessing}
                onClick={() => {
                  if (rejectingBulk && selectedIds.length > 0) {
                    handleAction(selectedIds, "DITOLAK", rejectCatatan);
                  } else if (rejectingId) {
                    handleAction(rejectingId, "DITOLAK", rejectCatatan);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
