"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Calculator,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function RekalTransaksiView() {
  return (
    <BendaharaStepperWrapper
      title="Rekal Transaksi Bendahara"
      subtitle=""
      step3Label="Riwayat Rekal Transaksi"
    >
      {({ selectedOpd, selectedUnit }) => (
        <RekalTransaksiContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function RekalTransaksiContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const NAMA_BULAN = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/rekal?${q.toString()}`
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
  };

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit]);

  // Filter & Pagination
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_rekal?.toLowerCase().includes(q) ||
          item.keterangan?.toLowerCase().includes(q) ||
          (NAMA_BULAN[item.bulan - 1] || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal Rekal
      if (startDate || endDate) {
        const itemDateStr = item.tgl_rekal
          ? new Date(item.tgl_rekal).toISOString().split("T")[0]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/rekal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opdId: selectedOpd.id,
          kd_unit: selectedUnit?.kd_unit || selectedOpd.kd_skpd,
          nm_unit: selectedUnit?.nm_unit || selectedOpd.nm_skpd,
          bulan: Number(bulan),
          keterangan:
            keterangan ||
            `Rekal Transaksi Kas Bulan ${NAMA_BULAN[bulan - 1]} - ${selectedOpd.nm_skpd}`,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal melakukan rekal transaksi");
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Daftar Rekal & Sinkronisasi Kas
            </h3>
            <p className="text-xs text-gray-500">
              Total {filteredList.length} riwayat posting rekal transaksi
            </p>
          </div>
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
              placeholder="Cari No. Rekal / Keterangan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </button>
          <button
            onClick={() => {
              setKeterangan("");
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Rekal Transaksi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#5E0E14] text-white">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                <th className="px-3 py-3 font-semibold w-48">No. Rekal</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-32">Bulan Transaksi</th>
                <th className="px-3 py-3 font-semibold">Keterangan / Uraian</th>
                <th className="px-3 py-3 font-semibold text-right w-40">
                  Total Mutasi (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-24">Status</th>
                <th className="px-3 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data rekal transaksi...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Calculator className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada riwayat rekal transaksi yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#5E0E14]">
                      {item.no_rekal}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(item.tgl_rekal).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-800">
                      {NAMA_BULAN[item.bulan - 1] || `Bulan ${item.bulan}`}
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-sm">
                      {item.keterangan}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-indigo-700">
                      {formatRupiah(Number(item.total_mutasi) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                        {item.status || "SELESAI"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelectedDetail(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Detail Rekening
                      </button>
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

      {/* Modal Input Rekal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">
                  Posting Rekal Transaksi Kas Bendahara
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold mb-1">Informasi Posting Rekal:</p>
                <p>
                  Proses ini akan mengagregasi seluruh mutasi belanja dari
                  tabel <strong>trdtransout</strong> pada periode bulan yang
                  dipilih dan memperbarui rekapitulasi buku kas secara otomatis.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pilih Bulan Transaksi <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                >
                  {NAMA_BULAN.map((nm, i) => (
                    <option key={i + 1} value={i + 1}>
                      Bulan {i + 1} - {nm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan Rekal
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder={`Rekal Transaksi Kas Bulan ${NAMA_BULAN[bulan - 1]}...`}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Eksekusi Rekal Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Rekening */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Detail Rekening Rekal: {selectedDetail.no_rekal}
                </h3>
                <p className="text-[11px] text-gray-200">
                  {NAMA_BULAN[selectedDetail.bulan - 1]} - {selectedDetail.keterangan}
                </p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-700 font-semibold">
                  <tr>
                    <th className="px-3 py-2 w-12 text-center">No</th>
                    <th className="px-3 py-2 w-36">Kode Rekening</th>
                    <th className="px-3 py-2">Nama Rekening Belanja</th>
                    <th className="px-3 py-2 text-right w-36">Nilai Ini (Rp)</th>
                    <th className="px-3 py-2 text-right w-36">Nilai Total (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(selectedDetail.rincian || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        Tidak ada rincian rekening untuk rekal ini.
                      </td>
                    </tr>
                  ) : (
                    selectedDetail.rincian.map((r: any, rIdx: number) => (
                      <tr key={r.id || rIdx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-center font-mono text-gray-500">
                          {rIdx + 1}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-800">
                          {r.kd_rek6}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{r.nm_rek6}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          {formatRupiah(Number(r.nilai_ini) || 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-indigo-700">
                          {formatRupiah(Number(r.nilai_total) || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2.5 text-right text-gray-700">
                      Total Mutasi Rekal:
                    </td>
                    <td className="px-3 py-2.5 text-right text-indigo-700 font-bold">
                      {formatRupiah(Number(selectedDetail.total_mutasi) || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-3 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
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

