"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  FileText,
  Plus,
  RefreshCw,
  Printer,
  CheckCircle2,
  Trash2,
  X,
  DollarSign,
  AlertCircle,
  Building2,
  Calendar,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function PembukuanSpjView() {
  return (
    <BendaharaStepperWrapper
      title="Pembukuan SPJ"
      subtitle=""
      step3Label="Daftar Pembukuan SPJ"
    >
      {({ selectedOpd, selectedUnit }) => (
        <PembukuanSpjContent selectedOpd={selectedOpd} selectedUnit={selectedUnit} />
      )}
    </BendaharaStepperWrapper>
  );
}

function PembukuanSpjContent({
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
  const [noSpj, setNoSpj] = useState("");
  const [tglSpj, setTglSpj] = useState(new Date().toISOString().split("T")[0]);
  const [uraian, setUraian] = useState("");
  const [rincian, setRincian] = useState<
    Array<{ kd_rek6: string; nm_rek6: string; nilai: number }>
  >([
    {
      kd_rek6: "5.1.02.01.01.0024",
      nm_rek6: "Belanja Alat Tulis Kantor",
      nilai: 0,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj?${q.toString()}`
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
          item.no_bukti?.toLowerCase().includes(q) ||
          item.no_spj?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal Bukti / SPJ
      if (startDate || endDate) {
        const itemDateStr = item.tgl_bukti
          ? new Date(item.tgl_bukti).toISOString().split("T")[0]
          : item.tgl_spj
            ? new Date(item.tgl_spj).toISOString().split("T")[0]
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

  const handleAddRincian = () => {
    setRincian((prev) => [
      ...prev,
      { kd_rek6: "5.1.02.01.01.0001", nm_rek6: "Belanja Bahan Pakai Habis", nilai: 0 },
    ]);
  };

  const handleRemoveRincian = (idx: number) => {
    setRincian((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalNilai = rincian.reduce((sum, r) => sum + (Number(r.nilai) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (!noSpj.trim()) {
      setFormError("Nomor SPJ wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/pembukuan-spj",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit,
            nm_unit: selectedUnit?.nm_unit,
            no_spj: noSpj,
            tgl_spj: tglSpj,
            uraian,
            total: totalNilai,
            rincian,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan pembukuan SPJ");
      }
    } catch (e) {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action / Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Pembayaran Transaksi
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
              placeholder="Cari No. BKK / SPJ / Uraian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Pembukuan SPJ Baru</span>
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
                <th className="px-3.5 py-3 w-44">No. Bukti Kas (BKK)</th>
                <th className="px-3.5 py-3 w-52">No. SPJ / Tanggal</th>
                <th className="px-3.5 py-3">Uraian Pembukuan</th>
                <th className="px-3.5 py-3 text-right w-40">Total Nilai (Rp)</th>
                <th className="px-3.5 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data pembukuan SPJ...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data pembukuan SPJ yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                      {item.no_bukti}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{item.no_spj}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.tgl_spj ? new Date(item.tgl_spj).toLocaleDateString("id-ID") : "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 max-w-sm truncate" title={item.uraian}>
                      {item.uraian}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.total)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        POSTING
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Cetak Bukti Pembukuan SPJ"
                      >
                        <Printer className="w-4 h-4" />
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

      {/* Modal Input Pembukuan SPJ Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Input Pembukuan SPJ Belanja Baru
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Nomor SPJ</label>
                  <input
                    type="text"
                    required
                    value={noSpj}
                    onChange={(e) => setNoSpj(e.target.value)}
                    placeholder="Contoh: 900/01/SPJ-GU/2026"
                    className="mt-1 w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tanggal SPJ</label>
                  <input
                    type="date"
                    required
                    value={tglSpj}
                    onChange={(e) => setTglSpj(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Uraian Belanja SPJ</label>
                <textarea
                  rows={2}
                  required
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder="Uraian pertanggungjawaban belanja..."
                  className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              {/* Rincian Rekening */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Rincian Rekening Belanja (trdtransout)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRincian}
                    className="text-xs font-bold text-[#88131A] hover:underline"
                  >
                    + Tambah Rekening
                  </button>
                </div>
                <div className="space-y-2">
                  {rincian.map((r, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={r.kd_rek6}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRincian((prev) => {
                            const u = [...prev];
                            u[i].kd_rek6 = val;
                            return u;
                          });
                        }}
                        placeholder="Kode Rekening"
                        className="w-1/3 px-2 py-1.5 text-xs font-mono border rounded-lg"
                      />
                      <input
                        type="text"
                        value={r.nm_rek6}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRincian((prev) => {
                            const u = [...prev];
                            u[i].nm_rek6 = val;
                            return u;
                          });
                        }}
                        placeholder="Nama Rekening Belanja"
                        className="w-1/2 px-2 py-1.5 text-xs border rounded-lg"
                      />
                      <input
                        type="number"
                        min="0"
                        value={r.nilai || ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRincian((prev) => {
                            const u = [...prev];
                            u[i].nilai = val;
                            return u;
                          });
                        }}
                        placeholder="Nilai (Rp)"
                        className="w-32 px-2 py-1.5 text-right font-mono text-xs border rounded-lg"
                      />
                      {rincian.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRincian(i)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-right text-xs font-bold text-teal-800 mt-2 font-mono">
                  Total Nilai: {formatRupiah(totalNilai)}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pembukuan SPJ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

