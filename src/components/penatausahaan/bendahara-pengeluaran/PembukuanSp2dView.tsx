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
  DollarSign,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  Trash2,
  X,
  CreditCard,
  Building2,
  AlertCircle,
  Plus,
  Receipt,
  FileText,
  BadgeCheck,
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
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  isDibukukan: boolean;
  isUpTuGu?: boolean;
  pembukuan: {
    id: string;
    no_bukti: string;
    tgl_bukti: string;
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
      subtitle=""
      step3Label="Daftar Pembukuan SP2D"
    >
      {({ selectedOpd, selectedUnit }) => (
        <PembukuanSp2dContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PembukuanSp2dContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [dataList, setDataList] = useState<Sp2dRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"SEMUA" | "SUDAH" | "BELUM">("SEMUA");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Input Pembukuan: Step 1 (Pilih SP2D Cair) -> Step 2 (Form Pembukuan BKU)
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputSearch, setInputSearch] = useState("");
  const [selectedSp2d, setSelectedSp2d] = useState<Sp2dRow | null>(null);

  // Form Pembukuan State
  const [bukuPayType, setBukuPayType] = useState<"BANK" | "TUNAI">("BANK");
  const [bukuNoBukti, setBukuNoBukti] = useState("");
  const [bukuTgl, setBukuTgl] = useState(new Date().toISOString().split("T")[0]);
  const [bukuUraian, setBukuUraian] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      q.set("statusPembukuan", "SEMUA");
      if (search) q.set("q", search);

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

  // Filter daftar tampilan di tabel utama berdasarkan tab status, search, dan tanggal
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Status Filter
      if (statusFilter === "SUDAH" && !item.isDibukukan) return false;
      if (statusFilter === "BELUM" && item.isDibukukan) return false;

      // 2. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_sp2d?.toLowerCase().includes(q) ||
          item.no_spm?.toLowerCase().includes(q) ||
          item.keperluan?.toLowerCase().includes(q) ||
          item.pembukuan?.no_bukti?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 3. Tanggal Filter
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
  }, [dataList, statusFilter, search, startDate, endDate]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Daftar SP2D cair yang belum dibukukan (untuk modal input pembukuan)
  const availableSp2dCair = dataList.filter(
    (d) =>
      !d.isDibukukan &&
      (d.no_sp2d.toLowerCase().includes(inputSearch.toLowerCase()) ||
        d.no_spm.toLowerCase().includes(inputSearch.toLowerCase()) ||
        d.keperluan.toLowerCase().includes(inputSearch.toLowerCase()))
  );

  const handleOpenInputPembukuan = () => {
    setInputSearch("");
    setSelectedSp2d(null);
    setModalError(null);
    setShowInputModal(true);
  };

  const handleSelectSp2dForBuku = async (sp2d: Sp2dRow) => {
    setSelectedSp2d(sp2d);
    setBukuPayType("BANK");

    const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
      (sp2d.jenis_sp2d || "").toUpperCase()
    );

    // Ambil nomor BKU berurut otomatis dari server (menggabungkan urutan penerimaan trhsp2d & pengeluaran trhtransout)
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
      } else {
        const bookedCount = dataList.filter((d) => d.isDibukukan).length;
        const urut = String(bookedCount + 1).padStart(5, "0");
        setBukuNoBukti(`${urut}/${unitPart}/BKU/2026`);
      }
    } catch (e) {
      const bookedCount = dataList.filter((d) => d.isDibukukan).length;
      const urut = String(bookedCount + 1).padStart(5, "0");
      setBukuNoBukti(`${urut}/${unitPart}/BKU/2026`);
    }

    // Tanggal penerimaan SP2D default tanggal cair atau hari ini
    setBukuTgl(
      sp2d.tgl_cair
        ? new Date(sp2d.tgl_cair).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );

    setBukuUraian(
      isUpTuGu
        ? `Penerimaan Kas BKU atas SP2D ${sp2d.jenis_sp2d} No. ${sp2d.no_sp2d} (${sp2d.keperluan})`
        : `Pembukuan Kas Pengeluaran atas SP2D No. ${sp2d.no_sp2d} (${sp2d.keperluan})`
    );
    setModalError(null);
  };

  const handleExecutePembukuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSp2d) return;

    setSubmitting(true);
    setModalError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d",
        {
          method: "POST",
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
        setSelectedSp2d(null);
        setShowInputModal(false);
        fetchData();
      } else {
        setModalError(json.error || "Gagal membukukan SP2D");
      }
    } catch (e: any) {
      setModalError("Terjadi kesalahan koneksi.");
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
        fetchData();
      } else {
        alert(json.error || "Gagal membatalkan pembukuan");
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const totalNilai = dataList.reduce((acc, c) => acc + c.nilai, 0);
  const totalDibukukan = dataList
    .filter((d) => d.isDibukukan)
    .reduce((acc, c) => acc + c.nilai, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total SP2D Cair Siap Dibukukan
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
            Sudah Dibukukan ke BKU (trhtransout)
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
            Belum Dibukukan
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {dataList.filter((d) => !d.isDibukukan).length} Dokumen
          </div>
          <span className="text-[11px] font-mono text-amber-800 font-medium mt-0.5 inline-block">
            {formatRupiah(totalNilai - totalDibukukan)}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Toggle Status Pembukuan */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              setStatusFilter("SEMUA");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "SEMUA"
              ? "bg-white text-[#88131A] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Semua SP2D ({dataList.length})
          </button>
          <button
            onClick={() => {
              setStatusFilter("SUDAH");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "SUDAH"
              ? "bg-white text-[#88131A] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Sudah Dibukukan ({dataList.filter((d) => d.isDibukukan).length})
          </button>
          <button
            onClick={() => {
              setStatusFilter("BELUM");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${statusFilter === "BELUM"
              ? "bg-white text-[#88131A] shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Belum Dibukukan ({dataList.filter((d) => !d.isDibukukan).length})
          </button>
        </div>

        {/* Filter Tanggal, Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
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

          {/* Tombol Input Pembukuan */}
          <button
            onClick={handleOpenInputPembukuan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Input Pembukuan SP2D</span>
          </button>
        </div>
      </div>

      {/* Tabel Daftar Pembukuan SP2D */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-44">No. BKU (Bukti Kas)</th>
                <th className="px-3.5 py-3 w-32">Tgl. Penerimaan</th>
                <th className="px-3.5 py-3 w-52">No. SP2D & SPM</th>
                <th className="px-3.5 py-3">Keperluan Belanja</th>
                <th className="px-3.5 py-3 text-right w-36">Nilai Belanja</th>
                <th className="px-3.5 py-3 text-center w-36">Status Pembukuan</th>
                <th className="px-3.5 py-3 text-center w-28">Aksi</th>
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
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Tidak ada dokumen SP2D pada OPD/Unit ini yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* No. BKU */}
                    <td className="px-3.5 py-3">
                      {item.pembukuan ? (
                        <div>
                          <div className="font-mono font-bold text-slate-900">
                            {item.pembukuan.no_bukti}
                          </div>
                          <div className="mt-0.5">
                            {item.isUpTuGu ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                Penerimaan
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                                Pengeluaran
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-700 italic font-medium text-[11px]">
                          Belum dibukukan
                        </span>
                      )}
                    </td>

                    {/* Tgl. Penerimaan / Pembukuan */}
                    <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                      {item.pembukuan?.tgl_bukti ? (
                        <div>
                          <div className="font-semibold">
                            {new Date(item.pembukuan.tgl_bukti).toLocaleDateString("id-ID")}
                          </div>
                          <div className="text-[10px] text-teal-700 font-bold">
                            Tgl. Terima SP2D
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500">
                          {item.tgl_cair
                            ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
                            : new Date(item.tgl_sp2d).toLocaleDateString("id-ID")}
                          <div className="text-[10px] text-slate-400">Tgl. Cair</div>
                        </div>
                      )}
                    </td>

                    {/* No SP2D & SPM */}
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_sp2d}</div>
                      <div className="text-[11px] text-slate-500">SPM: {item.no_spm}</div>
                    </td>

                    {/* Keperluan */}
                    <td className="px-3.5 py-3 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                        SP2D {item.jenis_sp2d.replace(/_/g, " ")}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2" title={item.keperluan}>
                        {item.keperluan}
                      </p>
                    </td>

                    {/* Nilai */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.nilai)}
                    </td>

                    {/* Status Pembukuan */}
                    <td className="px-3.5 py-3 text-center">
                      {item.isDibukukan ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Sudah Dibukukan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Belum Dibukukan</span>
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-3.5 py-3 text-center">
                      {!item.isDibukukan ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowInputModal(true);
                            handleSelectSp2dForBuku(item);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Bukukan</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="Cetak Bukti Kas BKU"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              item.pembukuan && handleBatalPembukuan(item.pembukuan.id)
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Batalkan Pembukuan"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ========================================================================= */}
      {/* MODAL INPUT PEMBUKUAN (Tampil Daftar SP2D Cair -> Form Pembukuan BKU)    */}
      {/* ========================================================================= */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-300" />
                  {selectedSp2d
                    ? `Formulir Pembukuan BKU: SP2D ${selectedSp2d.no_sp2d}`
                    : "Pilih SP2D Cair Siap Dibukukan"}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {selectedSp2d
                    ? "Lengkapi tanggal penerimaan, nomor BKU otomatis, dan metode pembayaran kas pengeluaran"
                    : "Daftar seluruh SP2D yang berstatus CAIR dan belum masuk ke buku kas umum (trhtransout)"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInputModal(false);
                  setSelectedSp2d(null);
                }}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {!selectedSp2d ? (
              /* ================= STEP 1: PILIH SP2D CAIR ================= */
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
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
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-12">No</th>
                        <th className="px-3.5 py-2.5 w-44">No. SP2D</th>
                        <th className="px-3.5 py-2.5 w-28">Tgl. Cair</th>
                        <th className="px-3.5 py-2.5 w-40">No. SPM</th>
                        <th className="px-3.5 py-2.5">Keperluan Belanja</th>
                        <th className="px-3.5 py-2.5 text-right w-36">Nilai SP2D</th>
                        <th className="px-3.5 py-2.5 text-center w-28">Aksi</th>
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
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                              {s.no_sp2d}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                              {s.tgl_cair
                                ? new Date(s.tgl_cair).toLocaleDateString("id-ID")
                                : "-"}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 font-mono text-[11px]">
                              {s.no_spm}
                            </td>
                            <td className="px-3.5 py-3 max-w-xs text-slate-700 truncate" title={s.keperluan}>
                              {s.keperluan}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
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
            ) : (
              /* ================= STEP 2: FORM PEMBUKUAN BKU ================= */
              <form onSubmit={handleExecutePembukuan} className="p-6 space-y-4 flex-1 overflow-y-auto">
                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Ringkasan SP2D Terpilih */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#5E0E14] text-sm">
                        {selectedSp2d.no_sp2d}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Status Cair
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSp2d(null)}
                      className="text-xs text-slate-600 hover:text-[#5E0E14] font-semibold underline cursor-pointer"
                    >
                      Ganti Dokumen SP2D
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500">Nomor SPM:</span>
                      <div className="font-semibold text-slate-800">{selectedSp2d.no_spm}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal Cair SP2D:</span>
                      <div className="font-semibold text-slate-800">
                        {selectedSp2d.tgl_cair
                          ? new Date(selectedSp2d.tgl_cair).toLocaleDateString("id-ID")
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Nilai Bruto SP2D:</span>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatRupiah(selectedSp2d.nilai)}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 italic border-t border-slate-200 pt-1">
                    Keperluan: {selectedSp2d.keperluan}
                  </div>
                </div>

                {/* Informasi Khusus Jenis SP2D */}
                {(() => {
                  const isUpTuGu = ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
                    (selectedSp2d.jenis_sp2d || "").toUpperCase()
                  );
                  if (isUpTuGu) {
                    return (
                      <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-teal-900">
                          <Receipt className="w-4 h-4 text-teal-700" />
                          Penerimaan Kas BKU (SP2D {selectedSp2d.jenis_sp2d})
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Sesuai standar penatausahaan kas, SP2D jenis{" "}
                          <strong>{selectedSp2d.jenis_sp2d}</strong> merupakan penambahan
                          uang kas bendahara, sehingga{" "}
                          <strong className="text-teal-900 underline">
                            TIDAK dimasukkan ke tabel pengeluaran (trhtransout & trdtransout)
                          </strong>
                          . Nomor BKU tetap running berurut dan dicatat sebagai tanggal &
                          nomor bukti penerimaan kas pada tabel <strong>trhsp2d</strong>.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-[#88131A] space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Pengeluaran Kas BKU Langsung (SP2D {selectedSp2d.jenis_sp2d})
                      </div>
                    </div>
                  );
                })()}

                {/* Form Input Pembukuan BKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      {["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
                        (selectedSp2d.jenis_sp2d || "").toUpperCase()
                      )
                        ? "Nomor BKU (Bukti Penerimaan Kas)"
                        : "Nomor BKU (Bukti Kas Keluar / Pengeluaran)"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bukuNoBukti}
                      onChange={(e) => setBukuNoBukti(e.target.value)}
                      placeholder="Nomor BKU otomatis"
                      className="mt-1 w-full px-3 py-2 text-xs font-mono font-bold text-[#5E0E14] bg-rose-50/40 border border-rose-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Penerimaan / Pembukuan SP2D <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bukuTgl}
                      onChange={(e) => setBukuTgl(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Metode Pembayaran (Pay Type)
                  </label>
                  <div className="mt-1 flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="pay_type"
                        checked={bukuPayType === "BANK"}
                        onChange={() => setBukuPayType("BANK")}
                        className="text-[#88131A] focus:ring-[#88131A]"
                      />
                      <span className="font-semibold text-slate-800">
                        Transfer Bank (Rekening Kas Daerah / Non-Tunai)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="pay_type"
                        checked={bukuPayType === "TUNAI"}
                        onChange={() => setBukuPayType("TUNAI")}
                        className="text-[#88131A] focus:ring-[#88131A]"
                      />
                      <span className="font-semibold text-slate-800">Kas Tunai</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Uraian Pembukuan Kas Umum
                  </label>
                  <textarea
                    rows={2}
                    value={bukuUraian}
                    onChange={(e) => setBukuUraian(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>

                {/* Rincian Rekening (khusus SP2D selain UP/GU/TU yang masuk ke trdtransout) */}
                {!["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
                  (selectedSp2d.jenis_sp2d || "").toUpperCase()
                ) && (
                    <div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-[11px]">
                        {selectedSp2d.rincian.map((r, rIdx) => (
                          <div key={rIdx} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                            <div>
                              <div className="font-mono font-bold text-slate-800">{r.kd_rek6}</div>
                              <div className="text-slate-600">{r.nm_rek6}</div>
                              {r.nm_sub_kegiatan && (
                                <div className="text-[10px] text-slate-400">
                                  Sub Kegiatan: {r.nm_sub_kegiatan}
                                </div>
                              )}
                            </div>
                            <div className="font-mono font-bold text-slate-900">
                              {formatRupiah(r.nilai)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSp2d(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {submitting
                        ? "Menyimpan ke BKU..."
                        : ["UP", "GU", "TU", "UP_KKPD", "GU_KKPD"].includes(
                          (selectedSp2d.jenis_sp2d || "").toUpperCase()
                        )
                          ? "Konfirmasi Penerimaan Kas BKU"
                          : "Konfirmasi & Bukukan SP2D"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
