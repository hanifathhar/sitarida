"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Calendar,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function PengembalianView() {
  return (
    <BendaharaStepperWrapper
      title="Pengembalian Belanja"
      subtitle=""
      step3Label="Daftar STS Pengembalian Belanja"
    >
      {({ selectedOpd, selectedUnit }) => (
        <PengembalianContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PengembalianContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [noSts, setNoSts] = useState("");
  const [tglSts, setTglSts] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [uraian, setUraian] = useState("");
  const [nilai, setNilai] = useState<number>(0);
  const [namaBank, setNamaBank] = useState("PT. Bank Sumut");
  const [rekBank, setRekBank] = useState("100.01.04.00001-9");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      q.set("tipe", "PENGEMBALIAN");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/setor-sisa?${q.toString()}`
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
          item.no_kas?.toLowerCase().includes(q) ||
          item.no_sts?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          item.nama_bank?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal Bukti
      if (startDate || endDate) {
        const itemDateStr = item.tgl_kas
          ? new Date(item.tgl_kas).toISOString().split("T")[0]
          : item.tgl_sts
            ? new Date(item.tgl_sts).toISOString().split("T")[0]
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

    if (nilai <= 0) {
      setFormError("Nilai pengembalian belanja harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const defaultUraian =
        uraian.trim() ||
        `Pengembalian Belanja Tahun Anggaran Berjalan ${selectedOpd.nm_skpd}`;

      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/setor-sisa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipe: "PENGEMBALIAN",
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit || selectedOpd.kd_skpd,
            nm_unit: selectedUnit?.nm_unit || selectedOpd.nm_skpd,
            no_sts: noSts || undefined,
            tgl_sts: tglSts,
            uraian: defaultUraian,
            nilai: Number(nilai),
            nama_bank: namaBank,
            rek_bank: rekBank,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan pengembalian belanja");
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
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Rekapitulasi Pengembalian Belanja
            </h3>
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
              placeholder="Cari No. Kas / STS / Uraian..."
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
              setNoSts("");
              setNilai(0);
              setUraian("");
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Input STS Pengembalian
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
                <th className="px-3 py-3 font-semibold w-44">No. Kas / Bukti</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-36">No. STS</th>
                <th className="px-3 py-3 font-semibold">Uraian / Keterangan</th>
                <th className="px-3 py-3 font-semibold w-48">Bank Kasda</th>
                <th className="px-3 py-3 font-semibold text-right w-36">
                  Nilai Pengembalian (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data STS pengembalian belanja...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada rekaman STS pengembalian belanja yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#5E0E14]">
                      {item.no_kas}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(item.tgl_kas).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-gray-700 font-mono text-[11px]">
                      {item.no_sts || "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-sm">
                      {item.uraian}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <div className="font-semibold text-gray-800">
                        {item.nama_bank || "Bank Sumut"}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {item.rek_bank || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-amber-700">
                      {formatRupiah(Number(item.nilai) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {item.status || "TERIMA"}
                      </span>
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

      {/* Modal Input */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  Formulir STS Pengembalian Belanja
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nomor STS Pengembalian
                  </label>
                  <input
                    type="text"
                    value={noSts}
                    onChange={(e) => setNoSts(e.target.value)}
                    placeholder="Kosongkan untuk otomatis"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal STS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglSts}
                    onChange={(e) => setTglSts(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nilai Pengembalian Belanja (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={nilai}
                  onChange={(e) => setNilai(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-bold text-amber-700 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uraian / Keterangan Pengembalian Belanja
                </label>
                <textarea
                  rows={2}
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder="Pengembalian sisa kelebihan belanja atas pelaksanaan kegiatan..."
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Bank Kasda
                  </label>
                  <input
                    type="text"
                    value={namaBank}
                    onChange={(e) => setNamaBank(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rekening Kasda Tujuan
                  </label>
                  <input
                    type="text"
                    value={rekBank}
                    onChange={(e) => setRekBank(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                  />
                </div>
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
                  Simpan STS Pengembalian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

