"use client";

import React, { useEffect, useState } from "react";
import {
  WalletCards,
  Plus,
  Search,
  Building2,
  Trash2,
  Edit2,
  TrendingUp,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ActionBanner from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface PlafondItem {
  id: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  paguMurni: number;
  paguUbah: number;
  isLockedMurni?: boolean;
  isLockedUbah?: boolean;
  keterangan: string | null;
}

interface OpdOption {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface UnitOption {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

export default function PlafondPage() {
  const [data, setData] = useState<PlafondItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [tahun, setTahun] = useState(2027);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalMurni, setTotalMurni] = useState(0);
  const [totalUbah, setTotalUbah] = useState(0);

  // References
  const [opdList, setOpdList] = useState<OpdOption[]>([]);
  const [unitList, setUnitList] = useState<UnitOption[]>([]);

  // Banner
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // Form Modal
  const [showModal, setShowModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formOpdId, setFormOpdId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formPaguMurni, setFormPaguMurni] = useState("");
  const [formPaguUbah, setFormPaguUbah] = useState("");
  const [formLockedMurni, setFormLockedMurni] = useState(false);
  const [formLockedUbah, setFormLockedUbah] = useState(false);
  const [formKeterangan, setFormKeterangan] = useState("");

  // Lock action loading map
  const [lockingIds, setLockingIds] = useState<{ [key: string]: boolean }>({});

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PlafondItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: tahun.toString(),
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/perencanaan/plafond?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalRecords(json.pagination?.total || 0);
        setTotalMurni(json.totalPaguMurni || 0);
        setTotalUbah(json.totalPaguUbah || 0);
      } else {
        setBanner({ type: "error", message: json.message || "Gagal memuat plafond" });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal terhubung ke server" });
    } finally {
      setLoading(false);
    }
  }

  async function loadReferences() {
    try {
      const [resOpd, resUnit, resScope] = await Promise.all([
        fetch("/api/master/opd?limit=500"),
        fetch("/api/master/unit-kerja?limit=1000"),
        fetch("/api/perencanaan/scope"),
      ]);
      const jsonOpd = await resOpd.json();
      const jsonUnit = await resUnit.json();
      const jsonScope = await resScope.json();
      if (jsonOpd.success) setOpdList(jsonOpd.data || []);
      if (jsonUnit.success) setUnitList(jsonUnit.data || []);
      if (jsonScope.success && jsonScope.data?.session?.tahunAnggaran) {
        setTahun(jsonScope.data.session.tahunAnggaran);
      }
    } catch (e) {
      console.error("Gagal memuat referensi OPD/Unit/Scope:", e);
    }
  }

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, page, pageSize]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadData();
  }

  function openCreateModal() {
    setFormOpdId("");
    setFormUnitId("");
    setFormPaguMurni("");
    setFormPaguUbah("");
    setFormLockedMurni(false);
    setFormLockedUbah(false);
    setFormKeterangan("");
    setShowModal(true);
  }

  function openEditModal(item: PlafondItem) {
    setFormOpdId(item.opdId);
    setFormUnitId(item.unitKerjaId || "");
    setFormPaguMurni(item.paguMurni.toString());
    setFormPaguUbah(item.paguUbah ? item.paguUbah.toString() : "");
    setFormLockedMurni(Boolean(item.isLockedMurni));
    setFormLockedUbah(Boolean(item.isLockedUbah));
    setFormKeterangan(item.keterangan || "");
    setShowModal(true);
  }

  async function handleToggleLock(item: PlafondItem, mode: "MURNI" | "PERUBAHAN") {
    const key = `${item.id}-${mode}`;
    const nextLocked = mode === "MURNI" ? !item.isLockedMurni : !item.isLockedUbah;
    const modeLabel = mode === "PERUBAHAN" ? "RKA Perubahan" : "RKA Penyusunan (Murni)";

    setLockingIds((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/perencanaan/plafond", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          mode,
          isLocked: nextLocked,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          message: `${modeLabel} untuk [${item.kd_skpd}] berhasil di-${nextLocked ? "KUNCI" : "BUKA KUNCI"}.`,
        });
        loadData();
      } else {
        setBanner({ type: "error", message: json.message || "Gagal mengubah status kunci" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat mengubah status kunci" });
    } finally {
      setLockingIds((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleBatchToggleLock(mode: "MURNI" | "PERUBAHAN", isLocked: boolean) {
    const modeLabel = mode === "PERUBAHAN" ? "RKA Perubahan" : "RKA Penyusunan (Murni)";
    const actionLabel = isLocked ? "MENGUNCI" : "MEMBUKA KUNCI";
    const confirmMsg = `Apakah Anda yakin ingin ${actionLabel} SELURUH input ${modeLabel} untuk TA ${tahun}?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/perencanaan/plafond", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          mode,
          isLocked,
          isBatch: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: json.message });
        loadData();
      } else {
        setBanner({ type: "error", message: json.message || "Gagal mengubah status kunci masal" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan" });
    } finally {
      setLoading(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setBanner(null);

    try {
      const res = await fetch("/api/perencanaan/plafond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          opdId: formOpdId,
          unitKerjaId: formUnitId || null,
          paguMurni: parseFloat(formPaguMurni) || 0,
          paguUbah: formPaguUbah ? parseFloat(formPaguUbah) : undefined,
          isLockedMurni: formLockedMurni,
          isLockedUbah: formLockedUbah,
          keterangan: formKeterangan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: json.message });
        setShowModal(false);
        loadData();
      } else {
        setBanner({ type: "error", title: "Gagal", message: json.message || "Gagal menyimpan" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan" });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/perencanaan/plafond?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: json.message });
        setDeleteTarget(null);
        loadData();
      } else {
        setBanner({ type: "error", message: json.message || "Gagal menghapus" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan" });
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredUnits = unitList.filter((u) => !formOpdId || u.opdId === formOpdId);

  return (
    <div className="space-y-6">
      {banner && <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-[#5E0E14] text-white shadow-sm">
            <WalletCards className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Plafond Anggaran OPD / Unit Kerja
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Penetapan batas tertinggi Pagu Belanja Daerah Kabupaten Tapanuli Selatan TA {tahun}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[#5E0E14] text-xs font-extrabold shadow-xs">
            <Calendar className="w-4 h-4 text-[#991B1B]" />
            <span>TAHUN ANGGARAN {tahun}</span>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white text-xs font-bold shadow-md hover:from-[#46090E] hover:to-[#7F1D1D] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tetapkan Plafond</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Batch Lock Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Entitas</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totalRecords.toLocaleString("id-ID")}
            </div>
          </div>
          <Building2 className="w-8 h-8 text-slate-300" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Total Plafond Murni</span>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1 font-mono">
              {formatRupiah(totalMurni)}
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-200" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase">Total Plafond Perubahan</span>
            <div className="text-2xl font-extrabold text-amber-800 mt-1 font-mono">
              {formatRupiah(totalUbah)}
            </div>
          </div>
          <WalletCards className="w-8 h-8 text-amber-200" />
        </div>
      </div>

      {/* Kontrol Kunci Input RKA Masal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#5E0E14] text-white p-4 rounded-2xl shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
            <Lock className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wide flex items-center gap-2">
              <span>KONTROL PENGUNCIAN INPUT RKA DAERAH</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-900">
                TA {tahun}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Kunci akses input/edit penganggaran RKA per OPD atau secara serentak untuk seluruh perangkat daerah.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Murni */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/10 border border-white/10">
            <span className="text-[11px] font-bold px-2 text-emerald-200">RKA Murni:</span>
            <button
              type="button"
              onClick={() => handleBatchToggleLock("MURNI", true)}
              title="Kunci input RKA Penyusunan untuk seluruh OPD"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Kunci Semua</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchToggleLock("MURNI", false)}
              title="Buka kunci input RKA Penyusunan untuk seluruh OPD"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Unlock className="w-3 h-3" />
              <span>Buka Semua</span>
            </button>
          </div>

          {/* Batch Perubahan */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/10 border border-white/10">
            <span className="text-[11px] font-bold px-2 text-amber-200">RKA Perubahan:</span>
            <button
              type="button"
              onClick={() => handleBatchToggleLock("PERUBAHAN", true)}
              title="Kunci input RKA Perubahan untuk seluruh OPD"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Kunci Semua</span>
            </button>
            <button
              type="button"
              onClick={() => handleBatchToggleLock("PERUBAHAN", false)}
              title="Buka kunci input RKA Perubahan untuk seluruh OPD"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600/90 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Unlock className="w-3 h-3" />
              <span>Buka Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari kode atau nama OPD / Unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-24 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1.5 rounded-lg bg-[#5E0E14] text-white text-[11px] font-bold hover:bg-[#46090E]"
            >
              Cari
            </button>
          </form>
          <div className="text-xs text-slate-500">
            Total: <strong className="font-mono text-slate-900">{totalRecords}</strong> penetapan
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-12 text-center">No</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-36">Kode SKPD / Unit</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60 min-w-[220px]">Nama Perangkat Daerah & Unit</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-36">Pagu Murni (Rp)</th>
                <th className="py-3 px-3 border-r border-[#7B111A]/60 text-center w-28">Kunci Murni</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-36">Pagu Perubahan (Rp)</th>
                <th className="py-3 px-3 border-r border-[#7B111A]/60 text-center w-32">Kunci Perubahan</th>
                <th className="py-3 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data plafond...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Belum ada data penetapan plafond anggaran untuk TA {tahun}.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => {
                  const rowNum = (page - 1) * pageSize + idx + 1;
                  const isLockingMurni = Boolean(lockingIds[`${item.id}-MURNI`]);
                  const isLockingUbah = Boolean(lockingIds[`${item.id}-PERUBAHAN`]);

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 odd:bg-white even:bg-slate-50/50">
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">{rowNum}</td>
                      <td className="py-2.5 px-3.5 font-mono">
                        <div className="font-bold text-slate-900">{item.kd_unit || item.kd_skpd}</div>
                        {item.kd_unit && (
                          <div className="text-[10px] text-slate-400">Induk: {item.kd_skpd}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{item.nm_skpd}</div>
                        {item.nm_unit && (
                          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                            ↳ {item.nm_unit}
                          </div>
                        )}
                        {item.keterangan && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.keterangan}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap">
                        {formatRupiah(item.paguMurni)}
                      </td>

                      {/* Kolom Toggle Kunci Murni */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={isLockingMurni}
                          onClick={() => handleToggleLock(item, "MURNI")}
                          title={item.isLockedMurni ? "Klik untuk BUKA KUNCI RKA Murni" : "Klik untuk KUNCI RKA Murni"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                            item.isLockedMurni
                              ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-xs"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          } ${isLockingMurni ? "opacity-50 cursor-wait" : ""}`}
                        >
                          {item.isLockedMurni ? (
                            <>
                              <Lock className="w-3 h-3 text-red-600" />
                              <span>Terkunci</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              <span>Terbuka</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-amber-800 whitespace-nowrap">
                        {item.paguUbah ? formatRupiah(item.paguUbah) : "-"}
                      </td>

                      {/* Kolom Toggle Kunci Perubahan */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={isLockingUbah}
                          onClick={() => handleToggleLock(item, "PERUBAHAN")}
                          title={item.isLockedUbah ? "Klik untuk BUKA KUNCI RKA Perubahan" : "Klik untuk KUNCI RKA Perubahan"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                            item.isLockedUbah
                              ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100 shadow-xs"
                              : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                          } ${isLockingUbah ? "opacity-50 cursor-wait" : ""}`}
                        >
                          {item.isLockedUbah ? (
                            <>
                              <Lock className="w-3 h-3 text-red-600" />
                              <span>Terkunci</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-amber-600" />
                              <span>Terbuka</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit Plafond"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            title="Hapus Plafond"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          limit={pageSize}
          total={totalRecords}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>

      {/* Modal Form Plafond */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-[#991B1B] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Penetapan Plafond Anggaran</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Organisasi Perangkat Daerah (OPD) <span className="text-red-600">*</span>
                </label>
                <SearchableSelect
                  options={opdList.map((o) => ({
                    value: o.id,
                    label: `${o.kd_skpd} — ${o.nm_skpd}`,
                    badge: o.kd_skpd,
                    subLabel: o.nm_skpd,
                  }))}
                  value={formOpdId}
                  onChange={(val) => {
                    setFormOpdId(val);
                    setFormUnitId("");
                  }}
                  placeholder="-- Pilih OPD Induk --"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Unit Kerja / UPTD (Opsional - Kosongkan jika Pagu Induk)
                </label>
                <SearchableSelect
                  options={filteredUnits.map((u) => ({
                    value: u.id,
                    label: `${u.kd_unit} — ${u.nm_unit}`,
                    badge: u.kd_unit,
                    subLabel: u.nm_unit,
                  }))}
                  value={formUnitId}
                  onChange={(val) => setFormUnitId(val)}
                  placeholder="-- Pilih Unit Kerja (Opsional) --"
                  disabled={!formOpdId}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Pagu Murni (Rp) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="Contoh: 1500000000"
                    value={formPaguMurni}
                    onChange={(e) => setFormPaguMurni(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Pagu Perubahan (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Opsional"
                    value={formPaguUbah}
                    onChange={(e) => setFormPaguUbah(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
                  Status Penguncian Input RKA OPD
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="checkbox"
                      checked={formLockedMurni}
                      onChange={(e) => setFormLockedMurni(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-sm focus:ring-red-500 cursor-pointer"
                    />
                    <div className="text-[11px] font-bold text-slate-800">
                      Kunci RKA Murni
                      <span className="block text-[10px] font-normal text-slate-500">Nonaktifkan input Penyusunan</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-100/60">
                    <input
                      type="checkbox"
                      checked={formLockedUbah}
                      onChange={(e) => setFormLockedUbah(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded-sm focus:ring-red-500 cursor-pointer"
                    />
                    <div className="text-[11px] font-bold text-slate-800">
                      Kunci RKA Perubahan
                      <span className="block text-[10px] font-normal text-slate-500">Nonaktifkan input Perubahan</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Catatan / Keterangan Penetapan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SK Bupati Penetapan Pagu Indikatif TA 2027"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#7B111A] to-[#991B1B] rounded-xl shadow-md disabled:opacity-50"
                >
                  {formSubmitting ? "Menyimpan..." : "Simpan Plafond"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Penetapan Plafond?"
        entityName="Plafond Anggaran"
        itemCode={deleteTarget?.kd_unit || deleteTarget?.kd_skpd}
        itemLabel={deleteTarget?.nm_unit || deleteTarget?.nm_skpd}
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

