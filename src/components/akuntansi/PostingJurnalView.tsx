"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
  ScopeData,
} from "@/components/penatausahaan/bendahara-pengeluaran/BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  FileText,
  RefreshCw,
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  DollarSign,
  Layers,
  Send,
  XCircle,
  AlertCircle,
  X,
  Eye,
} from "lucide-react";
import type { JenisJurnal, SumberJurnalItem } from "@/modules/akuntansi/posting-jurnal.service";

interface DetailJurnalData {
  id: string;
  no_voucher: string;
  tgl_voucher: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  keterangan: string;
  total_debet: number;
  total_kredit: number;
  jns_transaksi: string;
  tabel: string;
  details: {
    id: string;
    kdsub_kegiatan: string;
    nm_sub_kegiatan: string;
    kd_rek6: string;
    nm_rek6: string;
    rk: string;
    debet: number;
    kredit: number;
    keterangan: string;
  }[];
}

interface PostingJurnalViewProps {
  jenis: JenisJurnal;
  title: string;
  subtitle: string;
  sourceLabel: string;
}

export default function PostingJurnalView({
  jenis,
  title,
  subtitle,
  sourceLabel,
}: PostingJurnalViewProps) {
  return (
    <BendaharaStepperWrapper
      title={title}
      subtitle={subtitle}
      step3Label={`Daftar ${title}`}
      scopeUrl="/api/akuntansi/scope"
    >
      {({ selectedOpd, selectedUnit, scopeData }) => (
        <PostingJurnalContent
          jenis={jenis}
          title={title}
          sourceLabel={sourceLabel}
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          scopeData={scopeData}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PostingJurnalContent({
  jenis,
  title,
  sourceLabel,
  selectedOpd,
  selectedUnit,
  scopeData,
}: {
  jenis: JenisJurnal;
  title: string;
  sourceLabel: string;
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  scopeData: ScopeData | null;
}) {
  const [items, setItems] = useState<SumberJurnalItem[]>([]);
  const [summary, setSummary] = useState({
    totalDokumen: 0,
    totalBelumPosting: 0,
    totalSudahPosting: 0,
    totalNilai: 0,
  });
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"BELUM" | "SUDAH" | "ALL">("BELUM");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"post" | "unpost" | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<DetailJurnalData | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const canPost = jenis === "penetapan" || jenis === "penerimaan";

  const tahunAnggaran = (scopeData?.session as any)?.tahunAnggaran || 2026;

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("jenis", jenis);
      q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/akuntansi/posting-jurnal?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSummary(
          json.data.summary || {
            totalDokumen: 0,
            totalBelumPosting: 0,
            totalSudahPosting: 0,
            totalNilai: 0,
          }
        );
        setSelectedIds([]);
      }
    } catch (e) {
      console.error("Gagal memuat sumber jurnal:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jenis, selectedOpd, selectedUnit, startDate, endDate]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "ALL" && i.statusPosting !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        i.nomor.toLowerCase().includes(q) ||
        i.uraian.toLowerCase().includes(q) ||
        i.rekening.toLowerCase().includes(q) ||
        i.jenisLabel.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [selectedOpd, selectedUnit, startDate, endDate, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const selectedUnpostedIds = useMemo(
    () => selectedItems.filter((i) => i.statusPosting === "BELUM").map((i) => i.id),
    [selectedItems]
  );
  const selectedPostedIds = useMemo(
    () => selectedItems.filter((i) => i.statusPosting === "SUDAH").map((i) => i.id),
    [selectedItems]
  );

  const allPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAllPage = () => {
    if (allPageSelected) {
      const pageIds = new Set(paginatedItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...paginatedItems.map((i) => i.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleOpenDetail = async (item: SumberJurnalItem) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    setDetailError(null);
    try {
      const q = new URLSearchParams({
        jenis,
        detail: "1",
        nomor: item.nomor,
      });
      const res = await fetch(`/api/akuntansi/posting-jurnal?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDetailError(json.error || "Gagal memuat detail jurnal.");
        return;
      }
      setDetailData(json.data);
    } catch (err: any) {
      setDetailError(err?.message || "Terjadi kesalahan jaringan saat memuat detail jurnal.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExecutePosting = async (action: "post" | "unpost") => {
    const targetIds = action === "post" ? selectedUnpostedIds : selectedPostedIds;
    if (targetIds.length === 0) return;
    setConfirmAction(null);
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/akuntansi/posting-jurnal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenis, action, ids: targetIds }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({
          type: "error",
          text: json.error || "Gagal memproses posting jurnal.",
        });
        return;
      }
      setFeedback({
        type: "success",
        text: json.message || "Posting jurnal berhasil.",
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Terjadi kesalahan jaringan saat posting jurnal.",
      });
    } finally {
      setSubmitting(false);
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
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canPost && (
              <>
                <button
                  type="button"
                  disabled={submitting || selectedUnpostedIds.length === 0}
                  onClick={() => setConfirmAction("post")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 disabled:opacity-45 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Posting Jurnal{selectedUnpostedIds.length > 0 ? ` (${selectedUnpostedIds.length})` : ""}
                  </span>
                </button>
                {selectedPostedIds.length > 0 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setConfirmAction("unpost")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs font-bold text-amber-800 transition cursor-pointer disabled:opacity-45"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Batal Posting ({selectedPostedIds.length})</span>
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading || submitting}
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
              Total Dokumen Sumber
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
            {summary.totalDokumen} <span className="text-xs font-bold text-slate-500">Dokumen</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Belum Diposting
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 tabular-nums">
            {summary.totalBelumPosting} <span className="text-xs font-bold text-amber-600">Dokumen</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Sudah Diposting
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 tabular-nums">
            {summary.totalSudahPosting} <span className="text-xs font-bold text-emerald-600">Dokumen</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/60 to-white rounded-2xl border border-blue-200/90 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Total Nilai Transaksi
            </span>
            <DollarSign className="w-4 h-4 text-blue-600" />
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Posting</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "BELUM" | "SUDAH" | "ALL")}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="BELUM">Belum Diposting</option>
              <option value="SUDAH">Sudah Diposting</option>
              <option value="ALL">Semua Status</option>
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
                placeholder="Cari nomor dokumen, uraian, atau rekening..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setStatusFilter("BELUM");
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

      {/* Tabel Data Sumber Jurnal */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                {canPost && (
                  <th className="px-3.5 py-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                      aria-label="Pilih semua di halaman ini"
                      className="h-4 w-4 rounded border-slate-300 text-[#5E0E14] focus:ring-[#5E0E14] cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 min-w-[180px]">Nomor &amp; Tanggal</th>
                <th className="px-3.5 py-3 min-w-[240px]">Uraian / Keterangan</th>
                <th className="px-3.5 py-3 min-w-[200px]">Rekening / Referensi</th>
                <th className="px-3.5 py-3 w-36">Jenis / Sumber</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Nilai (Rp)</th>
                <th className="px-3.5 py-3 text-center w-32">Status Sumber</th>
                <th className="px-3.5 py-3 text-center w-36">Status Posting</th>
                {canPost && <th className="px-3.5 py-3 text-center w-32">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={canPost ? 10 : 8} className="py-10 text-center text-xs italic text-slate-400">
                    Memuat data sumber jurnal...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={canPost ? 10 : 8} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada data dokumen pada OPD/Unit dan periode ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors ${selectedIds.includes(item.id) ? "bg-rose-50/40" : ""
                      }`}
                  >
                    {canPost && (
                      <td className="px-3.5 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          aria-label={`Pilih ${item.nomor}`}
                          className="h-4 w-4 rounded border-slate-300 text-[#5E0E14] focus:ring-[#5E0E14] cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3.5 py-3 text-center text-slate-400 tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.nomor}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.tanggal}</div>
                    </td>
                    <td className="px-3.5 py-3 max-w-sm leading-snug text-slate-700">
                      {item.uraian}
                    </td>
                    <td className="px-3.5 py-3 text-[11px] font-mono text-slate-700">
                      {item.rekening}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.jenisLabel}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatAngka(item.nilai)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {item.statusSumber}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {item.statusPosting === "SUDAH" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Sudah Diposting
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock className="w-3 h-3" /> Belum Diposting
                        </span>
                      )}
                    </td>
                    {canPost && (
                      <td className="px-3.5 py-3 text-center">
                        {item.statusPosting === "SUDAH" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-[#5E0E14] hover:text-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
                            title="Lihat Detail Jurnal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300">-</span>
                        )}
                      </td>
                    )}
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

      {/* Modal Konfirmasi Posting / Batal Posting */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmAction === "post"
                  ? "bg-[#5E0E14]/10 text-[#5E0E14]"
                  : "bg-amber-100 text-amber-700"
                  }`}
              >
                {confirmAction === "post" ? (
                  <Send className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmAction === "post"
                    ? `Konfirmasi ${title}`
                    : "Konfirmasi Batal Posting"}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {confirmAction === "post"
                    ? `Anda akan memposting ${selectedUnpostedIds.length} dokumen ${jenis} ke jurnal.`
                    : `Anda akan membatalkan posting ${selectedPostedIds.length} dokumen ${jenis}, menghapus data jurnal terkait.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecutePosting(confirmAction)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${confirmAction === "post"
                  ? "bg-[#5E0E14] hover:bg-[#7A141C]"
                  : "bg-amber-600 hover:bg-amber-700"
                  }`}
              >
                {confirmAction === "post" ? "Ya, Posting Sekarang" : "Ya, Batalkan Posting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Jurnal (trhmaping & trdmaping) */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Detail Jurnal</h3>
                  <p className="text-[11px] text-rose-100">Rincian ayat jurnal Debet dan Kredit hasil posting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {detailLoading ? (
                <div className="py-12 text-center text-xs italic text-slate-400">
                  Memuat detail jurnal...
                </div>
              ) : detailError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : detailData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">No. Voucher</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">{detailData.no_voucher}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Tanggal Voucher</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{detailData.tgl_voucher}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Jenis / Tabel</div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {detailData.jns_transaksi} (Tabel {detailData.tabel})
                      </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400">OPD / Unit</div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {detailData.kd_skpd} - {detailData.nm_skpd}
                        {detailData.nm_unit ? ` (${detailData.nm_unit})` : ""}
                      </div>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Keterangan</div>
                      <div className="text-slate-700 mt-0.5">{detailData.keterangan}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700 border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5 text-center w-10">No</th>
                            <th className="px-3.5 py-2.5 w-44">Kode Rekening</th>
                            <th className="px-3.5 py-2.5">Nama Rekening</th>
                            <th className="px-3.5 py-2.5 text-center w-16">RK</th>
                            <th className="px-3.5 py-2.5 text-right w-40">Debet (Rp)</th>
                            <th className="px-3.5 py-2.5 text-right w-40">Kredit (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.details.map((d, i) => (
                            <tr key={d.id} className="hover:bg-slate-50/70">
                              <td className="px-3.5 py-2.5 text-center text-slate-400">{i + 1}</td>
                              <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">
                                {d.kd_rek6}
                              </td>
                              <td className={`px-3.5 py-2.5 ${d.rk === "K" ? "pl-8" : ""}`}>
                                {d.nm_rek6}
                              </td>
                              <td className="px-3.5 py-2.5 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${d.rk === "D"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                >
                                  {d.rk}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                                {formatAngka(d.debet)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                                {formatAngka(d.kredit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                          <tr>
                            <td colSpan={4} className="px-3.5 py-2.5 text-right text-[11px] uppercase tracking-wider text-slate-600">
                              Total
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                              {formatAngka(detailData.total_debet)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                              {formatAngka(detailData.total_kredit)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
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
