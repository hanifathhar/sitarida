"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Receipt,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function PenerimaanPotonganView() {
  return (
    <BendaharaStepperWrapper
      title="Penerimaan Potongan Pajak"
      subtitle=""
      step3Label="Daftar Penerimaan Potongan"
    >
      {({ selectedOpd, selectedUnit }) => (
        <PenerimaanPotonganContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenerimaanPotonganContent({
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
  const [noSp2d, setNoSp2d] = useState("");
  const [tglBukti, setTglBukti] = useState(new Date().toISOString().split("T")[0]);
  const [uraian, setUraian] = useState("");
  const [rincian, setRincian] = useState<
    Array<{ kd_rek6: string; nm_rek6: string; id_billing: string; nilai: number }>
  >([
    {
      kd_rek6: "2.1.01.05.01.0001",
      nm_rek6: "Utang PPN Pusat",
      id_billing: "",
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
      q.set("tipe", "PENERIMAAN");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
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
          item.no_sp2d?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal Bukti
      if (startDate || endDate) {
        const itemDateStr = item.tgl_bukti
          ? new Date(item.tgl_bukti).toISOString().split("T")[0]
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
      {
        kd_rek6: "2.1.01.05.02.0001",
        nm_rek6: "Utang PPh Pasal 21",
        id_billing: "",
        nilai: 0,
      },
    ]);
  };

  const handleRemoveRincian = (i: number) => {
    setRincian((prev) => prev.filter((_, idx) => idx !== i));
  };

  const totalNilai = rincian.reduce((sum, r) => sum + (Number(r.nilai) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (!uraian.trim()) {
      setFormError("Uraian potongan wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/potongan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipe: "PENERIMAAN",
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit,
            nm_unit: selectedUnit?.nm_unit,
            tgl_bukti: tglBukti,
            no_sp2d: noSp2d,
            uraian,
            rincian,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan penerimaan potongan");
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
            Daftar Penerimaan Potongan Pajak
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
              placeholder="Cari No. Bukti / SP2D / Uraian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Penerimaan Potongan Baru</span>
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
                <th className="px-3.5 py-3 w-48">No. Bukti / Tanggal</th>
                <th className="px-3.5 py-3 w-44">No. SP2D</th>
                <th className="px-3.5 py-3">Uraian Pemotongan</th>
                <th className="px-3.5 py-3 text-right w-40">Total Potongan (Rp)</th>
                <th className="px-3.5 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data potongan...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data penerimaan potongan yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_bukti}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.tgl_bukti ? new Date(item.tgl_bukti).toLocaleDateString("id-ID") : "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono">{item.no_sp2d || "-"}</td>
                    <td className="px-3.5 py-3 max-w-sm truncate" title={item.uraian}>
                      {item.uraian}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-700">
                      {formatRupiah(item.total)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Cetak Bukti Penerimaan Potongan"
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

      {/* Modal Input Penerimaan Potongan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Input Penerimaan Potongan Pajak Baru
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
                  <label className="block text-xs font-bold text-slate-700">No. Referensi SP2D</label>
                  <input
                    type="text"
                    value={noSp2d}
                    onChange={(e) => setNoSp2d(e.target.value)}
                    placeholder="Contoh: 00001/01.0/SP2D/LS/2026"
                    className="mt-1 w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tanggal Potongan</label>
                  <input
                    type="date"
                    required
                    value={tglBukti}
                    onChange={(e) => setTglBukti(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Uraian Pemotongan</label>
                <textarea
                  rows={2}
                  required
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder="Contoh: Pemotongan Pajak PPN/PPh atas belanja..."
                  className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              {/* Rincian Potongan */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Rincian Akun Pajak (trdtrmpot)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRincian}
                    className="text-xs font-bold text-[#88131A] hover:underline"
                  >
                    + Tambah Pajak
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
                        placeholder="Kode Akun Pajak"
                        className="w-1/4 px-2 py-1.5 text-xs font-mono border rounded-lg"
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
                        placeholder="Nama Akun Pajak"
                        className="w-1/3 px-2 py-1.5 text-xs border rounded-lg"
                      />
                      <input
                        type="text"
                        value={r.id_billing}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRincian((prev) => {
                            const u = [...prev];
                            u[i].id_billing = val;
                            return u;
                          });
                        }}
                        placeholder="ID Billing e-Pajak"
                        className="w-1/4 px-2 py-1.5 text-xs font-mono border rounded-lg"
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
                        className="w-28 px-2 py-1.5 text-right font-mono text-xs border rounded-lg"
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
                <div className="text-right text-xs font-bold text-amber-700 mt-2 font-mono">
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
                  {submitting ? "Menyimpan..." : "Simpan Penerimaan Potongan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

