"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Search,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Clock,
  Landmark,
  ShieldAlert,
  Edit3,
  X,
  Check,
  CreditCard,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface Sp2dItem {
  id: string;
  no_sp2d: string;
  tgl_sp2d: string;
  no_spm: string;
  kd_skpd: string;
  nm_skpd: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai_bersih: number;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  status: string;
  tgl_cair?: string | null;
  no_transaksi_bank?: string | null;
}

export default function MonitoringPencairanPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [sp2dList, setSp2dList] = useState<Sp2dItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterPencairan, setFilterPencairan] = useState<string>("ALL"); // ALL, CAIR, BELUM_CAIR
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Update Pencairan
  const [selectedSp2d, setSelectedSp2d] = useState<Sp2dItem | null>(null);
  const [tglCair, setTglCair] = useState(new Date().toISOString().split("T")[0]);
  const [noTransaksiBank, setNoTransaksiBank] = useState("");
  const [isCairState, setIsCairState] = useState(true);
  const [saving, setSaving] = useState(false);

  // Feedback
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  useEffect(() => {
    loadMonitoring();
  }, [filterPencairan]);

  async function loadMonitoring() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: "2026",
        statusPencairan: filterPencairan,
      });
      if (search.trim()) params.append("q", search.trim());

      const res = await fetch(`/api/penatausahaan/sp2d/monitoring?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setIsAuthorized(true);
        setSp2dList(json.data.items || []);
        setCurrentPage(1);
      } else {
        if (res.status === 403) setIsAuthorized(false);
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat data monitoring pencairan SP2D.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Koneksi bermasalah saat memuat monitoring pencairan.",
      });
    } finally {
      setLoading(false);
    }
  }

  function openUpdateModal(item: Sp2dItem) {
    setSelectedSp2d(item);
    setTglCair(item.tgl_cair || new Date().toISOString().split("T")[0]);
    setNoTransaksiBank(item.no_transaksi_bank || "");
    setIsCairState(item.status === "CAIR" ? true : true);
  }

  async function handleSavePencairan() {
    if (!selectedSp2d) return;

    setSaving(true);
    try {
      const res = await fetch("/api/penatausahaan/sp2d/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSp2d.id,
          isCair: isCairState,
          tgl_cair: tglCair,
          no_transaksi_bank: noTransaksiBank.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "Status Pencairan Diperbarui",
          message: json.message,
        });
        setSelectedSp2d(null);
        loadMonitoring();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Update Pencairan",
          message: json.error || "Gagal memperbarui data pencairan.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan data pencairan.",
      });
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return sp2dList;
    const q = search.toLowerCase();
    return sp2dList.filter(
      (s) =>
        s.no_sp2d.toLowerCase().includes(q) ||
        s.no_spm.toLowerCase().includes(q) ||
        s.nm_skpd.toLowerCase().includes(q) ||
        (s.nama_penerima || "").toLowerCase().includes(q) ||
        (s.no_transaksi_bank || "").toLowerCase().includes(q)
    );
  }, [sp2dList, search]);

  // Statistik Realtime
  const totalDanaCair = useMemo(() => {
    return sp2dList
      .filter((s) => s.status === "CAIR")
      .reduce((sum, item) => sum + item.nilai_bersih, 0);
  }, [sp2dList]);

  const totalDanaMenunggu = useMemo(() => {
    return sp2dList
      .filter((s) => s.status === "DISETUJUI" || s.status === "DIVERIFIKASI")
      .reduce((sum, item) => sum + item.nilai_bersih, 0);
  }, [sp2dList]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#88131A]" />
          <h2 className="text-base font-bold text-slate-900">
            Akses Ditolak — Khusus Otoritas BUD & Perbendaharaan
          </h2>
          <p className="text-xs text-slate-600">
            Monitoring Pencairan SP2D hanya dapat diakses oleh BUD, Bidang Perbendaharaan, dan Superadmin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* Header Halaman */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Monitoring Pencairan SP2D Kas Daerah (RKUD)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan dan pencatatan status pemindahbukuan / pencairan dana oleh Bank RKUD (PT. Bank Sumut).
            </p>
          </div>
          <button
            onClick={loadMonitoring}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Ringkasan Finansial Pencairan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase">
                Telah Dicairkan (Bank RKUD)
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-900 mt-2">
              {formatRupiah(totalDanaCair)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              {sp2dList.filter((s) => s.status === "CAIR").length} dokumen SP2D
            </p>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase">
                Menunggu Pencairan Bank
              </span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-xl font-black font-mono text-blue-900 mt-2">
              {formatRupiah(totalDanaMenunggu)}
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              {sp2dList.filter((s) => s.status === "DISETUJUI").length} dokumen siap cair
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase">
                Total SP2D Dipantau
              </span>
              <Landmark className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900 mt-2">
              {sp2dList.length} <span className="text-xs font-semibold text-slate-400">Berkas</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tahun Anggaran 2026</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no SP2D, SKPD, no transaksi bank..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterPencairan}
              onChange={(e) => setFilterPencairan(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
            >
              <option value="ALL">Semua Dokumen</option>
              <option value="CAIR">Hanya yang Telah Cair</option>
              <option value="BELUM_CAIR">Menunggu Pencairan (Belum Cair)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Monitoring */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">No. SP2D & Tanggal</th>
                <th className="px-4 py-3">SKPD / Unit</th>
                <th className="px-4 py-3">Penerima & Rekening</th>
                <th className="px-4 py-3 text-right">Nilai Bersih (Netto)</th>
                <th className="px-4 py-3 text-center">Status Pencairan</th>
                <th className="px-4 py-3">Tgl Cair & Ref Bank</th>
                <th className="px-4 py-3 text-center">Aksi Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                    <p className="mt-2 text-xs">Memuat data pencairan...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-medium text-slate-500">
                      Tidak ada data SP2D untuk filter ini.
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((sp2d) => {
                  const isCair = sp2d.status === "CAIR";
                  return (
                    <tr key={sp2d.id} className="transition hover:bg-slate-50/75">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-900">
                            {sp2d.no_sp2d}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {sp2d.jenis_sp2d?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span>{sp2d.tgl_sp2d}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{sp2d.nm_skpd}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{sp2d.keperluan}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{sp2d.nama_penerima || "-"}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {sp2d.rek_penerima} ({sp2d.bank_penerima})
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-black font-mono text-emerald-800">
                        {formatRupiah(sp2d.nilai_bersih)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isCair
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isCair ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>SUDAH CAIR</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>MENUNGGU CAIR</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {isCair ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              Cair: {sp2d.tgl_cair || "-"}
                            </div>
                            {sp2d.no_transaksi_bank && (
                              <div className="font-mono text-[11px] text-slate-500">
                                Ref: {sp2d.no_transaksi_bank}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-slate-400 text-[11px]">- Belum dicairkan -</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => openUpdateModal(sp2d)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#88131A]" />
                          <span>Update Pencairan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-slate-200">
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
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

      {/* Modal Update Pencairan Bank */}
      {selectedSp2d && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pencatatan Pencairan Dana SP2D
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedSp2d.no_sp2d}
                </p>
              </div>
              <button
                onClick={() => setSelectedSp2d(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>SKPD: <strong>{selectedSp2d.nm_skpd}</strong></div>
                <div>Penerima: <strong>{selectedSp2d.nama_penerima}</strong></div>
                <div>Rekening: <strong>{selectedSp2d.rek_penerima}</strong> ({selectedSp2d.bank_penerima})</div>
                <div className="pt-1 text-emerald-800 font-bold font-mono text-sm">
                  Jumlah: {formatRupiah(selectedSp2d.nilai_bersih)}
                </div>
              </div>

              {/* Status Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Status Pencairan Bank RKUD
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCairState(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      isCairState
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Sudah Cair (Selesai)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCairState(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      !isCairState
                        ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Belum Cair</span>
                  </button>
                </div>
              </div>

              {isCairState && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal Pemindahbukuan / Pencairan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={tglCair}
                      onChange={(e) => setTglCair(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor Transaksi / Referensi Bank (Opsional)
                    </label>
                    <input
                      type="text"
                      value={noTransaksiBank}
                      onChange={(e) => setNoTransaksiBank(e.target.value)}
                      placeholder="Contoh: TRX-20261111-9982"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedSp2d(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePencairan}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "Menyimpan..." : "Simpan Status Pencairan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

