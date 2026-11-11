"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileCheck2,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface LpjViewProps {
  mode?: "REGULAR" | "KKPD";
}

export default function LpjView({ mode = "REGULAR" }: LpjViewProps) {
  const isKkpd = mode === "KKPD";
  const title = isKkpd
    ? "Laporan Pertanggungjawaban KKPD (LPJ-KKPD)"
    : "Laporan Pertanggungjawaban Bendahara (LPJ)";
  const subtitle = isKkpd
    ? "Pembuatan LPJ atas transaksi Kartu Kredit Pemerintah Daerah (KKPD)"
    : "Pembuatan Laporan Pertanggungjawaban Uang Persediaan (UP / GU / TU)";
  const step3Label = isKkpd ? "Daftar LPJ-KKPD" : "Daftar Dokumen LPJ (UP / GU / TU)";

  return (
    <BendaharaStepperWrapper
      title={title}
      subtitle={subtitle}
      step3Label={step3Label}
    >
      {({ selectedOpd, selectedUnit }) => (
        <LpjContent
          mode={mode}
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function LpjContent({
  mode,
  selectedOpd,
  selectedUnit,
}: {
  mode: "REGULAR" | "KKPD";
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const isKkpd = mode === "KKPD";
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [noLpj, setNoLpj] = useState("");
  const [tglLpj, setTglLpj] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tglAwal, setTglAwal] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [tglAkhir, setTglAkhir] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [jenisLpj, setJenisLpj] = useState<string>(isKkpd ? "KKPD" : "GU");
  const [keterangan, setKeterangan] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      q.set("jenis_lpj", isKkpd ? "KKPD" : "REGULAR");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?${q.toString()}`
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
  }, [selectedOpd, selectedUnit, mode]);

  // Filter & Pagination
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_lpj?.toLowerCase().includes(q) ||
          item.keterangan?.toLowerCase().includes(q) ||
          item.jenis_lpj?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal LPJ
      if (startDate || endDate) {
        const itemDateStr = item.tgl_lpj
          ? new Date(item.tgl_lpj).toISOString().split("T")[0]
          : item.tgl_awal
            ? new Date(item.tgl_awal).toISOString().split("T")[0]
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

    if (new Date(tglAwal) > new Date(tglAkhir)) {
      setFormError("Tanggal awal periode tidak boleh melebihi tanggal akhir.");
      return;
    }

    setSubmitting(true);
    try {
      const defaultKet =
        keterangan.trim() ||
        `Pertanggungjawaban Belanja ${jenisLpj} Periode ${new Date(
          tglAwal
        ).toLocaleDateString("id-ID")} s/d ${new Date(
          tglAkhir
        ).toLocaleDateString("id-ID")} - ${selectedOpd.nm_skpd}`;

      const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/lpj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opdId: selectedOpd.id,
          kd_unit: selectedUnit?.kd_unit || selectedOpd.kd_skpd,
          nm_unit: selectedUnit?.nm_unit || selectedOpd.nm_skpd,
          no_lpj: noLpj || undefined,
          tgl_lpj: tglLpj,
          tgl_awal: tglAwal,
          tgl_akhir: tglAkhir,
          jenis_lpj: jenisLpj,
          keterangan: defaultKet,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal membuat dokumen LPJ");
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
          <div
            className={`p-2.5 rounded-lg ${isKkpd
              ? "bg-purple-50 text-purple-700"
              : "bg-teal-50 text-teal-700"
              }`}
          >
            {isKkpd ? (
              <CreditCard className="w-5 h-5" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isKkpd
                ? "Rekapitulasi LPJ-KKPD"
                : "Rekapitulasi LPJ"}
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
              placeholder="Cari No. LPJ / Keterangan..."
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
              setNoLpj("");
              setKeterangan("");
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isKkpd ? "Buat LPJ-KKPD Baru" : "Buat LPJ Baru"}
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
                <th className="px-3 py-3 font-semibold w-48">Nomor LPJ</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-48">Rentang Periode Transaksi</th>
                <th className="px-3 py-3 font-semibold w-24 text-center">Jenis LPJ</th>
                <th className="px-3 py-3 font-semibold">Uraian / Keterangan</th>
                <th className="px-3 py-3 font-semibold text-right w-40">
                  Total Belanja (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-24">Status</th>
                <th className="px-3 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data dokumen LPJ...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada dokumen LPJ yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#5E0E14]">
                      {item.no_lpj}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(item.tgl_lpj).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-gray-700 font-medium">
                      {new Date(item.tgl_awal).toLocaleDateString("id-ID")} s/d{" "}
                      {new Date(item.tgl_akhir).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border">
                        {item.jenis_lpj}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-sm">
                      {item.keterangan}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">
                      {formatRupiah(Number(item.total_belanja) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {item.status || "DRAFT"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => window.print()}
                        className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak LPJ
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

      {/* Modal Buat LPJ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  {isKkpd
                    ? "Formulir Pembuatan LPJ-KKPD"
                    : "Formulir Pembuatan LPJ Pengeluaran"}
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
                    Jenis LPJ
                  </label>
                  {isKkpd ? (
                    <input
                      type="text"
                      disabled
                      value="KKPD (Kartu Kredit Pemerintah Daerah)"
                      className="w-full text-xs px-3 py-2 bg-gray-100 border rounded-lg text-gray-700 font-semibold"
                    />
                  ) : (
                    <select
                      value={jenisLpj}
                      onChange={(e) => setJenisLpj(e.target.value)}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                    >
                      <option value="GU">Ganti Uang (GU)</option>
                      <option value="TU">Tambahan Uang (TU)</option>
                      <option value="UP">Uang Persediaan (UP)</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Pengesahan LPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglLpj}
                    onChange={(e) => setTglLpj(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nomor LPJ
                </label>
                <input
                  type="text"
                  value={noLpj}
                  onChange={(e) => setNoLpj(e.target.value)}
                  placeholder="Kosongkan untuk penomoran otomatis sistem"
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rentang Transaksi Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglAwal}
                    onChange={(e) => setTglAwal(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sampai Dengan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglAkhir}
                    onChange={(e) => setTglAkhir(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan / Uraian LPJ
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Uraian pertanggungjawaban belanja..."
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
                  Simpan Dokumen LPJ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

