"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  RotateCcw,
  Eye,
  Printer,
  Calendar,
  AlertCircle,
  Check,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import Sp2dPrintModal, { Sp2dPrintData } from "@/components/penatausahaan/Sp2dPrintModal";

interface Sp2dItem {
  id: string;
  no_sp2d: string;
  tgl_sp2d: string;
  no_spm: string;
  tgl_spm?: string | null;
  no_spp?: string | null;
  tgl_spp?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  status: string;
  catatan_verifikasi?: string | null;
  verifikatorNama?: string | null;
  tgl_verifikasi?: string | null;
}

export default function VerifikasiSp2dPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [sp2dList, setSp2dList] = useState<Sp2dItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Verifikasi / Detail
  const [selectedSp2d, setSelectedSp2d] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [catatanVerifikasi, setCatatanVerifikasi] = useState("");
  const [processing, setProcessing] = useState(false);

  // Modal Cetak
  const [printData, setPrintData] = useState<Sp2dPrintData | null>(null);

  // Feedback
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  useEffect(() => {
    loadList();
  }, [filterStatus]);

  async function loadList() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: "2026",
      });
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (search.trim()) params.append("q", search.trim());

      const res = await fetch(`/api/penatausahaan/sp2d?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setIsAuthorized(true);
        setSp2dList(json.data.items || []);
        setCurrentPage(1);
      } else {
        if (res.status === 403) {
          setIsAuthorized(false);
        }
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SP2D untuk verifikasi.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Koneksi ke server bermasalah.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function openVerifikasiModal(item: Sp2dItem) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/penatausahaan/sp2d/${item.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedSp2d(json.data);
        setCatatanVerifikasi(json.data.catatan_verifikasi || "");
      }
    } catch {
      setBanner({
        type: "error",
        message: "Gagal memuat rincian verifikasi SP2D.",
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleAction(statusTarget: "DIVERIFIKASI" | "DISETUJUI" | "DITOLAK") {
    if (!selectedSp2d) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/penatausahaan/sp2d/verifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSp2d.id,
          status: statusTarget,
          catatan_verifikasi: catatanVerifikasi.trim() || null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setBanner({
          type: "success",
          title: "Verifikasi Berhasil",
          message: `Dokumen SP2D ${selectedSp2d.no_sp2d} berhasil diubah statusnya menjadi ${statusTarget}.`,
        });
        setSelectedSp2d(null);
        loadList();
      } else {
        setBanner({
          type: "error",
          title: "Verifikasi Gagal",
          message: json.error || "Gagal memproses status verifikasi SP2D.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat memproses verifikasi.",
      });
    } finally {
      setProcessing(false);
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
        s.keperluan.toLowerCase().includes(q) ||
        (s.nama_penerima || "").toLowerCase().includes(q)
    );
  }, [sp2dList, search]);

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
            Halaman Verifikasi SP2D hanya dapat diakses oleh peran BUD, Bidang Perbendaharaan, dan Superadmin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* Header Halaman */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Verifikasi & Pengesahan Surat Perintah Pencairan Dana (SP2D)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemeriksaan kesesuaian dokumen SPM dengan SPP (trdspp) serta potongan pajak (trspmpot) sebelum pengesahan oleh Kuasa BUD.
            </p>
          </div>
          <button
            onClick={loadList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no SP2D, SKPD, SPM, penerima..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="DRAFT">DRAFT (Perlu Verifikasi)</option>
              <option value="DIVERIFIKASI">DIVERIFIKASI</option>
              <option value="DISETUJUI">DISETUJUI (Siap Cair)</option>
              <option value="CAIR">CAIR (Telah Dibayar Bank)</option>
              <option value="DITOLAK">DITOLAK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Verifikasi SP2D */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">No. SP2D & Tanggal</th>
                <th className="px-4 py-3">SKPD / Unit</th>
                <th className="px-4 py-3">No. SPM</th>
                <th className="px-4 py-3 text-right">Nilai Bruto</th>
                <th className="px-4 py-3 text-right">Nilai Bersih</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                    <p className="mt-2 text-xs">Memuat berkas SP2D...</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Tidak ada dokumen SP2D pada kriteria ini.
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((sp2d) => (
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
                      <div className="text-[10px] font-mono text-slate-400">{sp2d.kd_skpd}</div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-rose-800 font-semibold">
                      {sp2d.no_spm}
                    </td>

                    <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                      {formatRupiah(sp2d.nilai)}
                    </td>

                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                      {formatRupiah(sp2d.nilai_bersih)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sp2d.status === "CAIR"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : sp2d.status === "DISETUJUI"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : sp2d.status === "DIVERIFIKASI"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : sp2d.status === "DITOLAK"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200"
                        }`}
                      >
                        {sp2d.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openVerifikasiModal(sp2d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5E0E14] text-white hover:bg-[#46090E] text-[11px] font-bold shadow cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa</span>
                        </button>
                        <button
                          onClick={() => setPrintData(sp2d as any)}
                          className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Cetak SP2D"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Modal Review & Aksi Verifikasi */}
      {selectedSp2d && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Verifikasi Berkas SP2D: {selectedSp2d.no_sp2d}
                </h3>
                <p className="text-xs text-slate-500">
                  SKPD: {selectedSp2d.nm_skpd} | Jenis: {selectedSp2d.jenis_sp2d}
                </p>
              </div>
              <button
                onClick={() => setSelectedSp2d(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Ringkasan Dokumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Dokumen SPM Sumber</span>
                  <div className="font-mono font-bold text-slate-900">{selectedSp2d.no_spm}</div>
                  <p className="text-slate-600 mt-1 line-clamp-2">{selectedSp2d.keperluan}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Rekening Penerima Dana</span>
                  <div className="font-bold text-slate-800">{selectedSp2d.nama_penerima}</div>
                  <div className="font-mono text-slate-600">{selectedSp2d.rek_penerima} ({selectedSp2d.bank_penerima})</div>
                </div>
              </div>

              {/* Rincian Belanja trdspp */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Pembebanan Rekening Belanja (trdspp)
                  </h4>
                  <span className="font-bold text-blue-700 text-xs font-mono">
                    Total: {formatRupiah(selectedSp2d.nilai)}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                      <tr>
                        <th className="p-2">Kode Rekening</th>
                        <th className="p-2">Uraian Akun</th>
                        <th className="p-2 text-right">Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedSp2d.rincianBelanja || []).map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-700">{r.kd_rek6}</td>
                          <td className="p-2 text-slate-800">{r.nm_rek6}</td>
                          <td className="p-2 text-right font-mono font-bold">{formatRupiah(r.nilai)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Potongan Pajak trspmpot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Potongan Pajak & Potongan Lainnya (trspmpot)
                  </h4>
                  <span className="font-bold text-amber-700 text-xs font-mono">
                    Total Potongan: {formatRupiah(selectedSp2d.nilai_potongan)}
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                      <tr>
                        <th className="p-2">Kode Rekening</th>
                        <th className="p-2">Uraian Potongan</th>
                        <th className="p-2">ID Billing</th>
                        <th className="p-2 text-right">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!selectedSp2d.potongan || selectedSp2d.potongan.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="p-3 text-center italic text-slate-400">
                            Nihil Potongan Pajak
                          </td>
                        </tr>
                      ) : (
                        selectedSp2d.potongan.map((p: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono">{p.kd_rek6}</td>
                            <td className="p-2">{p.nm_rek6}</td>
                            <td className="p-2 font-mono font-bold text-blue-800">{p.id_billing || "-"}</td>
                            <td className="p-2 text-right font-mono font-bold text-amber-700">{formatRupiah(p.nilai)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Nilai Bersih Dibayarkan */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Jumlah Bersih Yang Dicairkan (Netto)</span>
                  <div className="text-lg font-black font-mono text-emerald-900 mt-0.5">
                    {formatRupiah(selectedSp2d.nilai_bersih)}
                  </div>
                </div>
                <div className="text-right text-xs italic text-emerald-700 max-w-xs">
                  {terbilang(selectedSp2d.nilai_bersih)} Rupiah
                </div>
              </div>

              {/* Catatan Verifikasi */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Catatan Verifikasi / Alasan Penolakan
                </label>
                <textarea
                  rows={2}
                  value={catatanVerifikasi}
                  onChange={(e) => setCatatanVerifikasi(e.target.value)}
                  placeholder="Ketik catatan hasil verifikasi..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
            </div>

            {/* Tombol Keputusan Verifikasi */}
            <div className="flex items-center justify-between border-t border-slate-200 p-4 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedSp2d(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAction("DITOLAK")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak SP2D</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAction("DIVERIFIKASI")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Diverifikasi</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAction("DISETUJUI")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui & Sahkan (Kuasa BUD)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Format SP2D */}
      {printData && (
        <Sp2dPrintModal data={printData} onClose={() => setPrintData(null)} />
      )}
    </div>
  );
}

