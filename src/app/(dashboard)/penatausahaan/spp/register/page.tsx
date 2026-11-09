"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  Search,
  Printer,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Layers,
  X,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface RegisterItem {
  noUrut: number;
  id: string;
  no_spp: string;
  tgl_spp: string;
  kd_skpd: string;
  nm_skpd: string;
  jenis_spp: string;
  keperluan: string;
  nilai: number;
  no_spd: string;
  nama_penerima: string;
  bendaharaNama: string;
  status: string;
}

export default function RegisterSppPage() {
  const [loading, setLoading] = useState(false);
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [isCrossOpd, setIsCrossOpd] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);

  // Filters
  const [selectedOpdId, setSelectedOpdId] = useState<string>("ALL");
  const [selectedJenisSpp, setSelectedJenisSpp] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [tglMulai, setTglMulai] = useState<string>("");
  const [tglSelesai, setTglSelesai] = useState<string>("");
  const [search, setSearch] = useState("");

  // Data
  const [items, setItems] = useState<RegisterItem[]>([]);
  const [totalNilai, setTotalNilai] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  // Banner
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // Load Scope OPD
  useEffect(() => {
    async function initScope() {
      try {
        const res = await fetch("/api/penatausahaan/spp?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setOpdList(json.data.opds || []);
          setIsCrossOpd(json.data.session.isCrossOpd);
          if (
            !json.data.session.isCrossOpd &&
            json.data.session.opdId
          ) {
            setSelectedOpdId(json.data.session.opdId);
          }
        }
      } catch (err) {
        console.error("Gagal memuat scope OPD:", err);
      }
    }
    initScope();
  }, []);

  // Fetch Register Data
  useEffect(() => {
    fetchRegisterData();
  }, [selectedOpdId, selectedJenisSpp, selectedStatus]);

  async function fetchRegisterData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
      });
      if (selectedOpdId && selectedOpdId !== "ALL") {
        params.append("opdId", selectedOpdId);
      }
      if (selectedJenisSpp && selectedJenisSpp !== "ALL") {
        params.append("jenisSpp", selectedJenisSpp);
      }
      if (selectedStatus && selectedStatus !== "ALL") {
        params.append("status", selectedStatus);
      }
      if (tglMulai && tglSelesai) {
        params.append("tglMulai", tglMulai);
        params.append("tglSelesai", tglSelesai);
      }
      if (search.trim()) {
        params.append("q", search.trim());
      }

      const res = await fetch(
        `/api/penatausahaan/spp/register?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setTotalNilai(json.data.totalNilai || 0);
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat data register SPP.",
        });
      }
    } catch (err) {
      console.error("Error fetchRegisterData:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat memuat data register.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilter() {
    if (isCrossOpd) {
      setSelectedOpdId("ALL");
    }
    setSelectedJenisSpp("ALL");
    setSelectedStatus("ALL");
    setTglMulai("");
    setTglSelesai("");
    setSearch("");
  }

  function handlePrintRegister() {
    const iframe = reportIframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const selectedOpdObj = useMemo(() => {
    if (!selectedOpdId || selectedOpdId === "ALL") return null;
    return opdList.find((o) => o.id === selectedOpdId);
  }, [opdList, selectedOpdId]);

  return (
    <div className="space-y-6">
      {/* Action Banner Notification */}
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* Header Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border bg-slate-100 text-slate-800 border-slate-200">
                REGISTER SPP
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Tahun Anggaran {tahunAnggaran}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Buku Register Surat Permintaan Pembayaran (SPP)
            </h1>
            <p className="text-xs text-slate-500">
              Rekapitulasi dan penatausahaan dokumen penerbitan SPP seluruh jenis
              pembayaran (UP, GU, TU, LS)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Cetak Buku Register
            </button>
          </div>
        </div>

        {/* Ringkasan Angka */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[11px] font-medium text-slate-500">
              Total Dokumen Terdaftar
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {items.length}{" "}
              <span className="text-xs font-semibold text-slate-400">
                Dokumen
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-200/60">
            <div className="text-[11px] font-medium text-[#88131A]">
              Total Akumulasi Nilai SPP
            </div>
            <div className="text-lg font-black text-[#88131A] mt-1">
              {formatRupiah(totalNilai)}
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
            <div className="text-[11px] font-medium text-emerald-800">
              Status Terverifikasi
            </div>
            <div className="text-lg font-black text-emerald-900 mt-1">
              {items.filter((i) => i.status === "DIVERIFIKASI").length}{" "}
              <span className="text-xs font-semibold text-emerald-700">
                / {items.length} Berkas
              </span>
            </div>
          </div>
        </div>

        {/* Panel Filter */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Filter OPD */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Perangkat Daerah (OPD)
              </label>
              <select
                disabled={!isCrossOpd}
                value={selectedOpdId}
                onChange={(e) => setSelectedOpdId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] disabled:bg-slate-100"
              >
                {isCrossOpd && (
                  <option value="ALL">-- Seluruh SKPD / OPD --</option>
                )}
                {opdList.map((opd) => (
                  <option key={opd.id} value={opd.id}>
                    [{opd.kd_skpd}] {opd.nm_skpd}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jenis SPP */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Jenis SPP
              </label>
              <select
                value={selectedJenisSpp}
                onChange={(e) => setSelectedJenisSpp(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
              >
                <option value="ALL">-- Seluruh Jenis SPP --</option>
                <option value="UP">SPP-UP (Uang Persediaan)</option>
                <option value="GU">SPP-GU (Ganti Uang)</option>
                <option value="TU">SPP-TU (Tambah Uang)</option>
                <option value="LS_GAJI">SPP-LS Gaji & Tunjangan</option>
                <option value="LS_BARANG_JASA">SPP-LS Barang & Jasa</option>
                <option value="UP_KKPD">SPP-UP KKPD</option>
                <option value="GU_KKPD">SPP-GU KKPD</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Status Dokumen
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
              >
                <option value="ALL">-- Seluruh Status --</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DIAJUKAN">DIAJUKAN</option>
                <option value="DIVERIFIKASI">DIVERIFIKASI</option>
              </select>
            </div>

            {/* Filter Periode */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pencarian Cepat
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="No SPP, uraian, penerima..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRegisterData()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Register SPP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Memuat data register SPP...
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              Tidak ada data register SPP
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada dokumen yang sesuai dengan kriteria filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Nomor & Tanggal SPP</th>
                  <th className="py-3 px-3">SKPD / Unit</th>
                  <th className="py-3 px-3 text-center w-24">Jenis</th>
                  <th className="py-3 px-3">Keperluan Pembayaran</th>
                  <th className="py-3 px-3">Penerima & Dasar SPD</th>
                  <th className="py-3 px-3 text-right">Nilai SPP (Rp)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                      {item.noUrut}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 font-mono">
                        {item.no_spp}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.tgl_spp}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-[10px] font-bold text-slate-600">
                        {item.kd_skpd}
                      </div>
                      <div className="text-slate-800 line-clamp-1 font-medium">
                        {item.nm_skpd}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        {item.jenis_spp}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 line-clamp-2 max-w-xs font-medium">
                        {item.keperluan}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">
                        {item.nama_penerima}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        SPD: {item.no_spd}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-black font-mono text-slate-900">
                      {formatRupiah(item.nilai)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          item.status === "DIVERIFIKASI"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : item.status === "DIAJUKAN"
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <PaginationBar
            page={safeCurrentPage}
            totalPages={totalPages}
            total={items.length}
            limit={pageSize}
            onPageChange={setCurrentPage}
            onLimitChange={(l) => {
              setPageSize(l);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Modal Cetak Register */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#88131A]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Pratinjau Cetak Register SPP Tahun {tahunAnggaran}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintRegister}
                  className="px-3.5 py-1.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 bg-slate-200/50 overflow-y-auto flex justify-center">
              <div className="bg-white shadow-lg p-8 w-full max-w-[297mm] min-h-[210mm] text-slate-900 font-serif text-[11px] leading-relaxed">
                {/* Kop Register */}
                <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-1">
                  <div className="font-bold text-xs uppercase tracking-wider">
                    PEMERINTAH DAERAH TAHUN ANGGARAN {tahunAnggaran}
                  </div>
                  <div className="font-extrabold text-sm uppercase">
                    {selectedOpdObj
                      ? selectedOpdObj.nm_skpd
                      : "SELURUH ORGANISASI PERANGKAT DAERAH"}
                  </div>
                  <div className="text-xs font-bold font-sans">
                    BUKU REGISTER SURAT PERMINTAAN PEMBAYARAN (SPP)
                  </div>
                </div>

                {/* Tabel Register */}
                <table className="w-full border-collapse border border-black text-[10px] font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black p-1.5 w-8">No</th>
                      <th className="border border-black p-1.5">Nomor SPP</th>
                      <th className="border border-black p-1.5 w-20">Tanggal</th>
                      <th className="border border-black p-1.5 w-16">Jenis</th>
                      <th className="border border-black p-1.5">Keperluan</th>
                      <th className="border border-black p-1.5">Penerima</th>
                      <th className="border border-black p-1.5 w-28 text-right">
                        Jumlah (Rp)
                      </th>
                      <th className="border border-black p-1.5 w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="border border-black p-1 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="border border-black p-1 font-mono font-bold">
                          {item.no_spp}
                        </td>
                        <td className="border border-black p-1 text-center">
                          {item.tgl_spp}
                        </td>
                        <td className="border border-black p-1 text-center font-bold">
                          {item.jenis_spp}
                        </td>
                        <td className="border border-black p-1">
                          {item.keperluan}
                        </td>
                        <td className="border border-black p-1">
                          {item.nama_penerima}
                        </td>
                        <td className="border border-black p-1 text-right font-mono font-bold">
                          {formatRupiah(item.nilai)}
                        </td>
                        <td className="border border-black p-1 text-center">
                          {item.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-100">
                      <td
                        colSpan={6}
                        className="border border-black p-1.5 text-right font-bold"
                      >
                        TOTAL REGISTER:
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono font-black">
                        {formatRupiah(totalNilai)}
                      </td>
                      <td className="border border-black p-1.5"></td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-2 font-sans text-[10px] italic">
                  Terbilang: {terbilang(totalNilai)} rupiah
                </div>

                <iframe
                  ref={reportIframeRef}
                  className="hidden"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Cetak Register SPP - ${tahunAnggaran}</title>
                        <style>
                          @page { size: A4 landscape; margin: 15mm; }
                          body { font-family: serif; font-size: 11px; margin: 0; padding: 0; }
                          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: sans-serif; font-size: 10px; }
                          th, td { border: 1px solid black; padding: 5px; }
                          .text-center { text-align: center; }
                          .text-right { text-align: right; }
                          .font-mono { font-family: monospace; }
                          .font-bold { font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="text-center" style="border-bottom: 2px solid black; padding-bottom: 6px; margin-bottom: 10px;">
                          <div style="font-size: 12px; font-weight: bold;">PEMERINTAH DAERAH TAHUN ANGGARAN ${tahunAnggaran}</div>
                          <div style="font-size: 14px; font-weight: bold;">${selectedOpdObj ? selectedOpdObj.nm_skpd : "SELURUH ORGANISASI PERANGKAT DAERAH"}</div>
                          <div style="font-size: 11px; font-family: sans-serif;">BUKU REGISTER SURAT PERMINTAAN PEMBAYARAN (SPP)</div>
                        </div>

                        <table>
                          <thead>
                            <tr style="background-color: #f2f2f2;">
                              <th class="text-center" style="width: 25px;">No</th>
                              <th>Nomor SPP</th>
                              <th class="text-center" style="width: 70px;">Tanggal</th>
                              <th class="text-center" style="width: 60px;">Jenis</th>
                              <th>Keperluan</th>
                              <th>Penerima</th>
                              <th class="text-right" style="width: 110px;">Jumlah (Rp)</th>
                              <th class="text-center" style="width: 70px;">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${items
                              .map(
                                (r, i) => `
                              <tr>
                                <td class="text-center font-mono">${i + 1}</td>
                                <td class="font-mono font-bold">${r.no_spp}</td>
                                <td class="text-center">${r.tgl_spp}</td>
                                <td class="text-center font-bold">${r.jenis_spp}</td>
                                <td>${r.keperluan}</td>
                                <td>${r.nama_penerima}</td>
                                <td class="text-right font-mono font-bold">${formatRupiah(r.nilai)}</td>
                                <td class="text-center">${r.status}</td>
                              </tr>
                            `
                              )
                              .join("")}
                          </tbody>
                          <tfoot>
                            <tr style="font-weight: bold; background-color: #f9f9f9;">
                              <td colspan="6" class="text-right">TOTAL:</td>
                              <td class="text-right font-mono font-bold">${formatRupiah(totalNilai)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </body>
                    </html>
                  `}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
