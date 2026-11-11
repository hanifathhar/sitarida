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
  FileCheck,
  Calendar,
  Search,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export default function PenyetoranPotonganView() {
  return (
    <BendaharaStepperWrapper
      title="Penyetoran Potongan Pajak"
      subtitle=""
      step3Label="Daftar Penyetoran Potongan"
    >
      {({ selectedOpd, selectedUnit }) => (
        <PenyetoranPotonganContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenyetoranPotonganContent({
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
  const [noTrmpot, setNoTrmpot] = useState("");
  const [tglBukti, setTglBukti] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [uraian, setUraian] = useState("");
  const [rincian, setRincian] = useState<
    Array<{
      kd_rek6: string;
      nm_rek6: string;
      id_billing: string;
      ntpn: string;
      nilai: number;
    }>
  >([
    {
      kd_rek6: "2.1.01.05.01.0001",
      nm_rek6: "Utang PPN Pusat",
      id_billing: "",
      ntpn: "",
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
      q.set("tipe", "PENYETORAN");
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
        const rincianMatch = item.rincian?.some(
          (r: any) =>
            r.id_billing?.toLowerCase().includes(q) ||
            r.ntpn?.toLowerCase().includes(q) ||
            r.nm_rek6?.toLowerCase().includes(q)
        );
        const match =
          item.no_bukti?.toLowerCase().includes(q) ||
          item.no_trmpot?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          rincianMatch;
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
        ntpn: "",
        nilai: 0,
      },
    ]);
  };

  const handleRemoveRincian = (idx: number) => {
    setRincian((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRincianChange = (
    idx: number,
    field: string,
    value: string | number
  ) => {
    setRincian((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const totalNilai = rincian.reduce((sum, r) => sum + (Number(r.nilai) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    if (totalNilai <= 0) {
      setFormError("Total nilai setoran pajak harus lebih dari 0.");
      return;
    }

    const hasEmptyNtpn = rincian.some((r) => !r.ntpn?.trim());
    if (hasEmptyNtpn) {
      setFormError(
        "Nomor Transaksi Penerimaan Negara (NTPN) wajib diisi untuk bukti setoran pajak."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/potongan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipe: "PENYETORAN",
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit || selectedOpd.kd_skpd,
            nm_unit: selectedUnit?.nm_unit || selectedOpd.nm_skpd,
            no_trmpot: noTrmpot || undefined,
            tgl_bukti: tglBukti,
            uraian:
              uraian ||
              `Penyetoran Potongan Pajak ${selectedOpd.nm_skpd}`,
            rincian: rincian.map((r) => ({
              ...r,
              nilai: Number(r.nilai) || 0,
            })),
          }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan penyetoran potongan");
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
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Rekapitulasi Penyetoran Potongan Pajak
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
              placeholder="Cari No. Bukti / NTPN / Billing..."
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
              setNoTrmpot("");
              setUraian("");
              setRincian([
                {
                  kd_rek6: "2.1.01.05.01.0001",
                  nm_rek6: "Utang PPN Pusat",
                  id_billing: "",
                  ntpn: "",
                  nilai: 0,
                },
              ]);
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Input Penyetoran Potongan
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
                <th className="px-3 py-3 font-semibold w-40">No. Bukti Setor</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-36">No. Penerimaan</th>
                <th className="px-3 py-3 font-semibold">Uraian / Keterangan</th>
                <th className="px-3 py-3 font-semibold">Rincian NTPN & Billing</th>
                <th className="px-3 py-3 font-semibold text-right w-36">
                  Total Setor (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data penyetoran potongan...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <FileCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada bukti penyetoran potongan pajak yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#5E0E14]">
                      {item.no_bukti}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(item.tgl_bukti).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-gray-700 font-mono text-[11px]">
                      {item.no_trmpot || "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-xs truncate">
                      {item.uraian}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <div className="space-y-1">
                        {(item.rincian || []).map((r: any, rIdx: number) => (
                          <div
                            key={r.id || rIdx}
                            className="bg-gray-50 p-1.5 rounded border border-gray-100 text-[11px]"
                          >
                            <span className="font-semibold text-gray-800">
                              {r.nm_rek6}
                            </span>
                            : {formatRupiah(Number(r.nilai) || 0)}
                            <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                              <span>NTPN: <strong className="text-emerald-700">{r.ntpn || "-"}</strong></span>
                              <span>Billing: <strong className="text-blue-700">{r.id_billing || "-"}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">
                      {formatRupiah(Number(item.total) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {item.status || "SETOR"}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  Input Penyetoran Potongan Pajak (trhstrpot)
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    No. Bukti Penerimaan Potongan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={noTrmpot}
                    onChange={(e) => setNoTrmpot(e.target.value)}
                    placeholder="Contoh: 00001/01.01/TRM-POT/2026"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Isi jika setoran ini bersumber dari bukti penerimaan potongan sebelumnya
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Penyetoran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglBukti}
                    onChange={(e) => setTglBukti(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uraian Penyetoran <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder="Contoh: Penyetoran PPN & PPh Pasal 21 ke Kas Negara atas belanja..."
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              {/* Rincian Potongan */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800">
                    Rincian Objek Pajak, Billing & Bukti NTPN
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddRincian}
                    className="text-xs text-[#5E0E14] hover:text-[#46090E] font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Pajak
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                      <tr>
                        <th className="px-3 py-2 w-48">Jenis Pajak</th>
                        <th className="px-3 py-2 w-36">ID Billing</th>
                        <th className="px-3 py-2 w-36">NTPN (Wajib)</th>
                        <th className="px-3 py-2 text-right w-36">Nilai Setoran (Rp)</th>
                        <th className="px-2 py-2 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rincian.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={item.kd_rek6}
                              onChange={(e) => {
                                const val = e.target.value;
                                const mapName: Record<string, string> = {
                                  "2.1.01.05.01.0001": "Utang PPN Pusat",
                                  "2.1.01.05.02.0001": "Utang PPh Pasal 21",
                                  "2.1.01.05.03.0001": "Utang PPh Pasal 22",
                                  "2.1.01.05.04.0001": "Utang PPh Pasal 23",
                                  "2.1.01.05.05.0001": "Utang PPh Final (Ps 4(2))",
                                  "2.1.01.06.01.0001": "Pajak Daerah / Lainnya",
                                };
                                handleRincianChange(idx, "kd_rek6", val);
                                handleRincianChange(
                                  idx,
                                  "nm_rek6",
                                  mapName[val] || "Potongan Pajak"
                                );
                              }}
                              className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                            >
                              <option value="2.1.01.05.01.0001">Utang PPN Pusat</option>
                              <option value="2.1.01.05.02.0001">Utang PPh Pasal 21</option>
                              <option value="2.1.01.05.03.0001">Utang PPh Pasal 22</option>
                              <option value="2.1.01.05.04.0001">Utang PPh Pasal 23</option>
                              <option value="2.1.01.05.05.0001">Utang PPh Final (Ps 4(2))</option>
                              <option value="2.1.01.06.01.0001">Pajak Daerah / Lainnya</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.id_billing}
                              onChange={(e) =>
                                handleRincianChange(idx, "id_billing", e.target.value)
                              }
                              placeholder="15 Digit Kode Billing"
                              className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={item.ntpn}
                              onChange={(e) =>
                                handleRincianChange(idx, "ntpn", e.target.value)
                              }
                              placeholder="16 Karakter NTPN"
                              className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono uppercase text-emerald-800 font-semibold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              value={item.nilai}
                              onChange={(e) =>
                                handleRincianChange(
                                  idx,
                                  "nilai",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-[#5E0E14] focus:outline-none text-right font-semibold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {rincian.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRincian(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t font-semibold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-gray-700">
                          Total Nilai Penyetoran:
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-bold">
                          {formatRupiah(totalNilai)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
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
                  Simpan Penyetoran Potongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

