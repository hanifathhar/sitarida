"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  CreditCard,
  Building2,
  Calendar,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  Receipt,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  Landmark,
  X,
  Lock,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";

interface SkpdUpItem {
  opdId: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan?: string | null;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
  paguBelanjaMurni: number;
  paguBelanjaUbah: number;
  paguBelanja: number;
  no_sk?: string | null;
  tgl_sk?: string | null;
  nominalUp: number;
  nominalKkpd: number;
  totalUp: number;
  persenUp: number;
  bankKkpd?: string | null;
  keterangan?: string | null;
  status: string;
  ditetapkanOleh?: string | null;
  updatedAt?: string | null;
}

interface SummaryData {
  totalSkpd: number;
  totalSkpdDitetapkan: number;
  totalPaguBelanja: number;
  totalNominalUp: number;
  totalNominalKkpd: number;
  totalSemuaUp: number;
  rasioUpTerhadapBelanja: number;
}

export default function PengaturanPenatausahaanPage() {
  const [loading, setLoading] = useState(true);
  const [tahunAnggaran, setTahunAnggaran] = useState(2026);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [items, setItems] = useState<SkpdUpItem[]>([]);
  const [canManage, setCanManage] = useState(false);

  // Navigasi Tab
  const [activeTab, setActiveTab] = useState<"UP_TUNAI" | "UP_KKPD">("UP_TUNAI");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "DITETAPKAN" | "BELUM">("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal Edit / Penetapan
  const [modalItem, setModalItem] = useState<SkpdUpItem | null>(null);
  const [formValues, setFormValues] = useState({
    no_sk: "",
    tgl_sk: "",
    nominalUp: 0,
    nominalKkpd: 0,
    bankKkpd: "Bank Sumut",
    keterangan: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal Bulk Set SK
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    no_sk: "",
    tgl_sk: new Date().toISOString().split("T")[0],
    bankKkpd: "Bank Sumut",
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/penatausahaan/pengaturan-up`);
      const json = await res.json();
      if (json.success && json.data) {
        setTahunAnggaran(json.data.tahunAnggaran || 2026);
        setSummary(json.data.summary || null);
        setItems(json.data.items || []);
        setCanManage(json.data.session?.canManage ?? false);
      }
    } catch (err) {
      console.error("Gagal memuat data pengaturan UP:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter daftar item
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.kd_skpd.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nm_skpd.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.no_sk && item.no_sk.toLowerCase().includes(searchQuery.toLowerCase()));

      const hasUp = item.nominalUp > 0 || item.nominalKkpd > 0 || !!item.no_sk;
      const matchStatus =
        filterStatus === "ALL"
          ? true
          : filterStatus === "DITETAPKAN"
            ? hasUp
            : !hasUp;

      return matchSearch && matchStatus;
    });
  }, [items, searchQuery, filterStatus]);

  // Reset page saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterStatus]);

  // Pagination
  const totalRows = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page, limit]);

  // Handler Buka Modal Single
  const openEditModal = (item: SkpdUpItem) => {
    setModalItem(item);
    setFormValues({
      no_sk: item.no_sk || "",
      tgl_sk: item.tgl_sk || new Date().toISOString().split("T")[0],
      nominalUp: item.nominalUp || 0,
      nominalKkpd: item.nominalKkpd || 0,
      bankKkpd: item.bankKkpd || "Bank Sumut",
      keterangan: item.keterangan || "",
    });
    setSaveError(null);
  };

  // Handler Simpan Single
  const handleSaveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/penatausahaan/pengaturan-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran,
          opdId: modalItem.opdId,
          no_sk: formValues.no_sk,
          tgl_sk: formValues.tgl_sk,
          nominalUp: Number(formValues.nominalUp) || 0,
          nominalKkpd: Number(formValues.nominalKkpd) || 0,
          bankKkpd: formValues.bankKkpd,
          keterangan: formValues.keterangan,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan penetapan UP");
      }
      setModalItem(null);
      await fetchData();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handler Simpan Bulk No SK
  const handleSaveBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSaving(true);
    try {
      const payloadItems = items.map((it) => ({
        opdId: it.opdId,
        nominalUp: it.nominalUp,
        nominalKkpd: it.nominalKkpd,
        keterangan: it.keterangan,
      }));

      const res = await fetch(`/api/penatausahaan/pengaturan-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          tahunAnggaran,
          no_sk: bulkForm.no_sk,
          tgl_sk: bulkForm.tgl_sk,
          bankKkpd: bulkForm.bankKkpd,
          items: payloadItems,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menerapkan nomor SK masal");
      }
      setBulkModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. HEADER HALAMAN */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-[#5E0E14] text-amber-300 shadow-xs">
              <Coins className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Besaran Uang Persediaan (UP)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Penetapan besaran <strong>Uang Persediaan (UP) Tunai</strong> dan{" "}
            <strong>Uang Persediaan Kartu Kredit Pemerintah Daerah (UP-KKPD)</strong>{" "}
            berdasarkan Keputusan Kepala Daerah / Pejabat Pengelola Keuangan Daerah (BUD).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Muat ulang data penetapan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-amber-300" />
              <span>Set SK Serentak</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI / METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pagu Belanja DPA */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Pagu Belanja DPA Daerah</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 truncate">
            {formatRupiah(summary?.totalPaguBelanja || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total belanja APBD TA. {tahunAnggaran}
          </div>
        </div>

        {/* Card 2: Total UP Tunai */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Besaran UP Tunai</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 truncate">
            {formatRupiah(summary?.totalNominalUp || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Dikelola Bendahara Pengeluaran SKPD
          </div>
        </div>

        {/* Card 3: Total UP-KKPD */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Besaran UP-KKPD</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-800 truncate">
            {formatRupiah(summary?.totalNominalKkpd || 0)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Porsi Kartu Kredit Pemerintah Daerah
          </div>
        </div>

        {/* Card 4: Status Penetapan SKPD */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Status SKPD Ditetapkan</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {summary?.totalSkpdDitetapkan || 0}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {summary?.totalSkpd || 0} SKPD
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rasio Alokasi UP:{" "}
            <strong>
              {(summary?.rasioUpTerhadapBelanja || 0).toFixed(2)}%
            </strong>{" "}
            dari belanja
          </div>
        </div>
      </div>

      {/* 3. NAVIGASI TAB & PENCARIAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tab Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("UP_TUNAI")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === "UP_TUNAI"
                  ? "bg-[#5E0E14] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Wallet className="w-4 h-4" />
              <span>1. Penetapan Besaran UP (Tunai)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UP_KKPD")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === "UP_KKPD"
                  ? "bg-[#5E0E14] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>2. Penetapan Besaran UP-KKPD</span>
            </button>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <option value="ALL">Semua SKPD</option>
              <option value="DITETAPKAN">Sudah Ditetapkan</option>
              <option value="BELUM">Belum Ditetapkan</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode, nama SKPD, nomor SK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#5E0E14] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* 4. KONTEN TABEL DATA */}
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
            <p className="text-xs font-semibold text-slate-500">
              Memuat data penetapan UP &amp; UP-KKPD...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#5E0E14] text-white">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3 w-40">Kode SKPD</th>
                  <th className="py-3 px-4">Nama Perangkat Daerah (SKPD)</th>
                  <th className="py-3 px-3 text-right w-44">Pagu Belanja DPA</th>

                  {activeTab === "UP_TUNAI" ? (
                    <>
                      <th className="py-3 px-3 w-48">Dasar SK Bupati</th>
                      <th className="py-3 px-3 text-right w-40">Besaran UP Tunai (Rp)</th>
                      <th className="py-3 px-3 text-center w-24">Rasio (%)</th>
                      <th className="py-3 px-3 text-center w-28">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-3 text-right w-36">Total UP (Rp)</th>
                      <th className="py-3 px-3 text-right w-40">Besaran UP-KKPD (Rp)</th>
                      <th className="py-3 px-3 text-center w-24">Porsi KKPD</th>
                      <th className="py-3 px-3 w-36">Bank Penerbit</th>
                      <th className="py-3 px-3 w-44">Dasar SK Bupati</th>
                    </>
                  )}

                  <th className="py-3 px-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "UP_TUNAI" ? 9 : 10}
                      className="py-12 text-center text-slate-400"
                    >
                      Tidak ada data perangkat daerah yang sesuai filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const isDitetapkan =
                      item.nominalUp > 0 || item.nominalKkpd > 0 || !!item.no_sk;
                    const porsiKkpd =
                      item.totalUp > 0 ? (item.nominalKkpd / item.totalUp) * 100 : 0;

                    return (
                      <tr
                        key={item.opdId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#5E0E14]">
                          {item.kd_skpd}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.nm_skpd}</div>
                          {item.kepalaNama && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Kepala: {item.kepalaNama}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          {formatRupiah(item.paguBelanja)}
                        </td>

                        {activeTab === "UP_TUNAI" ? (
                          <>
                            <td className="py-3 px-3 text-slate-700">
                              {item.no_sk ? (
                                <div>
                                  <div className="font-bold font-mono text-[11px]">
                                    {item.no_sk}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Tgl: {item.tgl_sk || "-"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">
                                  Belum diinput
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap text-sm">
                              {formatRupiah(item.nominalUp)}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                              {item.persenUp > 0
                                ? `${item.persenUp.toFixed(2)}%`
                                : "-"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isDitetapkan ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ditetapkan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                                  Draft
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                              {formatRupiah(item.totalUp)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-800 whitespace-nowrap text-sm">
                              {formatRupiah(item.nominalKkpd)}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-amber-900">
                              {porsiKkpd > 0 ? `${porsiKkpd.toFixed(1)}%` : "-"}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-700">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                                <Landmark className="w-3 h-3" />
                                {item.bankKkpd || "Bank Sumut"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {item.no_sk ? (
                                <div>
                                  <div className="font-bold font-mono text-[11px]">
                                    {item.no_sk}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Tgl: {item.tgl_sk || "-"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">
                                  Belum diinput
                                </span>
                              )}
                            </td>
                          </>
                        )}

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="Tetapkan Besaran UP & KKPD"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Ubah</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="Lihat Rincian Penetapan"
                            >
                              <span>Detail</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PAGINATION BAR */}
        {filteredItems.length > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={totalRows}
            limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* 6. MODAL FORM PENETAPAN UP / UP-KKPD */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#46090E] via-[#5E0E14] to-[#88131A] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white/15 text-amber-300">
                  <Coins className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    {canManage ? "Penetapan Besaran UP & UP-KKPD" : "Detail Penetapan UP"}
                  </h3>
                  <p className="text-xs text-amber-100/90 font-mono">
                    [{modalItem.kd_skpd}] {modalItem.nm_skpd}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSaveSingle} className="p-5 space-y-4 text-xs">
              {saveError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Info Card Pagu Belanja */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    Acuan Pagu Belanja DPA SKPD:
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {formatRupiah(modalItem.paguBelanja)}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                  TA. {tahunAnggaran}
                </span>
              </div>

              {/* Input Nomor & Tanggal SK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Nomor SK Penetapan Bupati
                  </label>
                  <input
                    type="text"
                    disabled={!canManage}
                    value={formValues.no_sk}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, no_sk: e.target.value }))
                    }
                    placeholder="Contoh: 900/123/BPKPAD/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Tanggal SK Penetapan
                  </label>
                  <input
                    type="date"
                    disabled={!canManage}
                    value={formValues.tgl_sk}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, tgl_sk: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Input Nominal UP Tunai & UP-KKPD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <label className="block text-[11px] font-extrabold text-emerald-950 mb-1 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Besaran UP Tunai (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    disabled={!canManage}
                    value={formValues.nominalUp}
                    onChange={(e) =>
                      setFormValues((v) => ({
                        ...v,
                        nominalUp: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono font-bold text-sm text-emerald-900 focus:ring-1 focus:ring-emerald-700 disabled:bg-slate-100"
                  />
                  <div className="text-[10px] text-emerald-700 mt-1">
                    Terbilang: {formatRupiah(formValues.nominalUp)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <label className="block text-[11px] font-extrabold text-amber-950 mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                    <span>Besaran UP-KKPD (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    disabled={!canManage}
                    value={formValues.nominalKkpd}
                    onChange={(e) =>
                      setFormValues((v) => ({
                        ...v,
                        nominalKkpd: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-sm text-amber-900 focus:ring-1 focus:ring-amber-700 disabled:bg-slate-100"
                  />
                  <div className="text-[10px] text-amber-700 mt-1">
                    Terbilang: {formatRupiah(formValues.nominalKkpd)}
                  </div>
                </div>
              </div>

              {/* Total UP & Porsi */}
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-600">Total Uang Persediaan (UP + KKPD):</span>
                <span className="text-sm font-mono text-[#5E0E14]">
                  {formatRupiah(
                    Number(formValues.nominalUp || 0) +
                    Number(formValues.nominalKkpd || 0)
                  )}
                </span>
              </div>

              {/* Bank Penerbit KKPD */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Bank Penerbit KKPD
                </label>
                <select
                  disabled={!canManage}
                  value={formValues.bankKkpd}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, bankKkpd: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-1 focus:ring-[#5E0E14] disabled:bg-slate-100"
                >
                  <option value="Bank Sumut">Bank Sumut (PT Bank Sumut)</option>
                  <option value="Bank Mandiri">Bank Mandiri (Persero) Tbk</option>
                  <option value="Bank BNI">Bank BNI (Persero) Tbk</option>
                  <option value="Bank BRI">Bank BRI (Persero) Tbk</option>
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Keterangan / Catatan Penetapan
                </label>
                <textarea
                  rows={2}
                  disabled={!canManage}
                  value={formValues.keterangan}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, keterangan: e.target.value }))
                  }
                  placeholder="Catatan ketentuan operasional UP..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-[#5E0E14] disabled:bg-slate-100"
                />
              </div>

              {/* Tombol Aksi Modal */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>
                {canManage && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4 text-amber-300" />
                        <span>Simpan Penetapan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL BULK SET NOMOR SK SERENTAK */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight">
                Terapkan Dasar SK Bupati Serentak
              </h3>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBulk} className="p-5 space-y-4 text-xs">
              <p className="text-slate-500">
                Fitur ini akan menyematkan <strong>Nomor SK Penetapan</strong>,{" "}
                <strong>Tanggal SK</strong>, dan <strong>Bank Penerbit</strong> secara
                serentak ke seluruh <strong>{items.length} SKPD</strong> tanpa mengubah
                nominal UP yang sudah ada.
              </p>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Nomor SK Bupati Penetapan UP
                </label>
                <input
                  type="text"
                  required
                  value={bulkForm.no_sk}
                  onChange={(e) =>
                    setBulkForm((v) => ({ ...v, no_sk: e.target.value }))
                  }
                  placeholder="Contoh: 900/18/K/2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-1 focus:ring-[#5E0E14]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Tanggal Penetapan SK
                </label>
                <input
                  type="date"
                  required
                  value={bulkForm.tgl_sk}
                  onChange={(e) =>
                    setBulkForm((v) => ({ ...v, tgl_sk: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-[#5E0E14]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  Bank Penerbit KKPD
                </label>
                <select
                  value={bulkForm.bankKkpd}
                  onChange={(e) =>
                    setBulkForm((v) => ({ ...v, bankKkpd: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:ring-1 focus:ring-[#5E0E14]"
                >
                  <option value="Bank Sumut">Bank Sumut (PT Bank Sumut)</option>
                  <option value="Bank Mandiri">Bank Mandiri (Persero) Tbk</option>
                  <option value="Bank BNI">Bank BNI (Persero) Tbk</option>
                  <option value="Bank BRI">Bank BRI (Persero) Tbk</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {bulkSaving ? "Menerapkan..." : "Terapkan ke Seluruh SKPD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

