"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  AlertCircle,
  Building2,
  Layers,
  ChevronRight,
  ArrowLeft,
  Save,
  Landmark,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface UnitItem {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

interface BankItem {
  id: string;
  kode: string;
  nama: string;
  jns_rekening: string;
}

interface PenerimaItem {
  id: string;
  nm_penerima: string;
  bank_penerima: string;
  rek_penerima: string;
  npwp?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
}

export default function DataPenerimaView() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(
    new Date().getFullYear()
  );

  // Reference data
  const [opds, setOpds] = useState<OpdItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Selections
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);

  // Search for Step 1 & 2
  const [opdSearch, setOpdSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");

  // List data (Step 3)
  const [items, setItems] = useState<PenerimaItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form state (Step 4)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nmPenerima, setNmPenerima] = useState("");
  const [bankPenerima, setBankPenerima] = useState("");
  const [rekPenerima, setRekPenerima] = useState("");
  const [npwp, setNpwp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Feedback & Delete dialog
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PenerimaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load initial OPD, Unit, and Bank options
  useEffect(() => {
    let active = true;
    async function loadInit() {
      setLoadingInit(true);
      try {
        const [scopeRes, bankRes] = await Promise.all([
          fetch("/api/penatausahaan/pengajuan/options?type=scope"),
          fetch("/api/penatausahaan/pengajuan/penerima?action=bank-options"),
        ]);
        const scopeJson = await scopeRes.json();
        const bankJson = await bankRes.json();

        if (!active) return;

        if (scopeJson.success && scopeJson.data) {
          const s = scopeJson.data.session;
          const opdList: OpdItem[] = scopeJson.data.opds || [];
          const unitList: UnitItem[] = scopeJson.data.units || [];

          if (s?.tahunAnggaran) {
            setTahunAnggaran(Number(s.tahunAnggaran));
          }
          setOpds(opdList);
          setUnits(unitList);

          // Auto-select jika bukan lintas OPD
          if (s && !s.isCrossOpd && opdList.length === 1) {
            const defaultOpd = opdList[0];
            setSelectedOpd(defaultOpd);

            if (s.unitKerjaId) {
              const defaultUnit = unitList.find((u) => u.id === s.unitKerjaId);
              if (defaultUnit) {
                setSelectedUnit(defaultUnit);
              }
              setCurrentStep(3);
            } else {
              const matchedUnits = unitList.filter(
                (u) => u.opdId === defaultOpd.id
              );
              if (matchedUnits.length === 0) {
                setCurrentStep(3);
              } else {
                setCurrentStep(2);
              }
            }
          }
        }

        if (bankJson.success) {
          setBanks(bankJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load init data:", err);
      } finally {
        if (active) setLoadingInit(false);
      }
    }
    loadInit();
    return () => {
      active = false;
    };
  }, []);

  // Load list of penerima when OPD / Unit is selected and step >= 3
  const fetchPenerimaList = async () => {
    if (!selectedOpd) return;
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ kd_skpd: selectedOpd.kd_skpd });
      if (selectedUnit) {
        params.set("kd_unit", selectedUnit.kd_unit);
      }
      const res = await fetch(
        `/api/penatausahaan/pengajuan/penerima?${params.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      }
    } catch (err) {
      console.error("Error loading penerima:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (selectedOpd && currentStep === 3) {
      fetchPenerimaList();
    }
  }, [selectedOpd, selectedUnit, currentStep]);

  const filteredOpds = useMemo(() => {
    const q = opdSearch.trim().toLowerCase();
    if (!q) return opds;
    return opds.filter(
      (o) =>
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q)
    );
  }, [opds, opdSearch]);

  const opdUnits = useMemo(() => {
    if (!selectedOpd) return [];
    return units.filter((u) => u.opdId === selectedOpd.id);
  }, [units, selectedOpd]);

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return opdUnits;
    return opdUnits.filter(
      (u) =>
        u.kd_unit.toLowerCase().includes(q) ||
        u.nm_unit.toLowerCase().includes(q)
    );
  }, [opdUnits, unitSearch]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.nm_penerima.toLowerCase().includes(q) ||
        item.bank_penerima.toLowerCase().includes(q) ||
        item.rek_penerima.toLowerCase().includes(q) ||
        (item.npwp && item.npwp.toLowerCase().includes(q)) ||
        (item.nm_unit && item.nm_unit.toLowerCase().includes(q))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const bankOptions = useMemo(
    () =>
      banks.map((b) => {
        const formatted = `${b.kode} ${b.nama}`.trim();
        return {
          value: formatted,
          label: formatted,
          sublabel: b.jns_rekening,
        };
      }),
    [banks]
  );

  const handleSelectOpd = (opd: OpdItem) => {
    setSelectedOpd(opd);
    setSelectedUnit(null);
    setUnitSearch("");
    setBanner(null);
    const matchedUnits = units.filter((u) => u.opdId === opd.id);
    if (matchedUnits.length === 1) {
      setSelectedUnit(matchedUnits[0]);
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const handleSelectUnit = (unit: UnitItem | null) => {
    setSelectedUnit(unit);
    setBanner(null);
    setCurrentStep(3);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setNmPenerima("");
    setBankPenerima("");
    setRekPenerima("");
    setNpwp("");
    setBanner(null);
    setCurrentStep(4);
  };

  const handleOpenEdit = (item: PenerimaItem) => {
    setEditingId(item.id);
    setNmPenerima(item.nm_penerima);
    const matchedBank = banks.find(
      (b) =>
        `${b.kode} ${b.nama}`.trim() === item.bank_penerima ||
        b.nama === item.bank_penerima
    );
    setBankPenerima(
      matchedBank
        ? `${matchedBank.kode} ${matchedBank.nama}`.trim()
        : item.bank_penerima
    );
    setRekPenerima(item.rek_penerima);
    setNpwp(item.npwp || "");
    setBanner(null);
    setCurrentStep(4);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const payload = {
        id: editingId || undefined,
        nm_penerima: nmPenerima.trim(),
        bank_penerima: bankPenerima.trim(),
        rek_penerima: rekPenerima.trim(),
        npwp: npwp.trim() || null,
        kd_skpd: selectedOpd.kd_skpd,
        nm_skpd: selectedOpd.nm_skpd,
        kd_unit: selectedUnit?.kd_unit || null,
        nm_unit: selectedUnit?.nm_unit || null,
      };

      const res = await fetch("/api/penatausahaan/pengajuan/penerima", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setBanner({
          type: "error",
          message: json.error || "Gagal menyimpan data penerima",
        });
        setSubmitting(false);
        return;
      }

      setBanner({
        type: "success",
        message: editingId
          ? "Data penerima berhasil diperbarui"
          : "Data penerima baru berhasil ditambahkan",
      });
      setCurrentStep(3);
      fetchPenerimaList();
    } catch {
      setBanner({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menyimpan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/pengajuan/penerima?id=${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) {
        setDeleteError(json.error || "Gagal menghapus data penerima");
        setDeleting(false);
        return;
      }
      setDeleteTarget(null);
      setBanner({
        type: "success",
        message: `Data penerima "${deleteTarget.nm_penerima}" berhasil dihapus`,
      });
      fetchPenerimaList();
    } catch {
      setDeleteError("Terjadi kesalahan jaringan");
    } finally {
      setDeleting(false);
    }
  };

  const steps = [
    {
      num: 1 as const,
      title: "1. Pilih OPD",
      desc: selectedOpd
        ? `${selectedOpd.kd_skpd} — ${selectedOpd.nm_skpd}`
        : "Pilih Perangkat Daerah",
      icon: Building2,
      done: Boolean(selectedOpd) && currentStep > 1,
    },
    {
      num: 2 as const,
      title: "2. Pilih Unit",
      desc: selectedUnit
        ? `${selectedUnit.kd_unit} — ${selectedUnit.nm_unit}`
        : currentStep > 2
          ? "Semua Unit / Induk"
          : "Pilih Sub Unit Kerja",
      icon: Layers,
      done: currentStep > 2,
    },
    {
      num: 3 as const,
      title: "3. Daftar Penerima",
      desc: `Daftar Penerima (${items.length} data)`,
      icon: Users,
      done: currentStep > 3,
    },
    {
      num: 4 as const,
      title: "4. Form Data Penerima",
      desc: editingId ? "Edit Data Penerima" : "Input Data Penerima",
      icon: FileText,
      done: false,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-[#88131A] border border-rose-200">
                PENGAJUAN DATA PENERIMA
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Tahun Anggaran {tahunAnggaran}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Data Penerima Belanja Daerah
            </h1>
          </div>

          {selectedOpd && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
              <div>
                <p className="text-slate-400 font-medium">OPD Terpilih</p>
                <p className="font-semibold text-slate-800">
                  {selectedOpd.kd_skpd} — {selectedOpd.nm_skpd}
                </p>
                {selectedUnit && (
                  <p className="text-slate-500 mt-0.5">
                    Unit: {selectedUnit.kd_unit} — {selectedUnit.nm_unit}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setSelectedOpd(null);
                  setSelectedUnit(null);
                  setItems([]);
                  setBanner(null);
                }}
                className="ml-3 text-[#88131A] hover:underline font-semibold cursor-pointer"
              >
                Ganti
              </button>
            </div>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.num;
            const isClickable =
              s.num === 1 ||
              (s.num === 2 && Boolean(selectedOpd)) ||
              (s.num === 3 && Boolean(selectedOpd)) ||
              (s.num === 4 && currentStep === 4);

            return (
              <button
                key={s.num}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentStep(s.num)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isActive
                  ? "bg-[#5E0E14] text-white border-[#5E0E14] shadow-md cursor-pointer"
                  : s.done
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100/70 cursor-pointer"
                    : isClickable
                      ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
                      : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-70"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive
                    ? "bg-white/20"
                    : s.done
                      ? "bg-emerald-200/70 text-emerald-800"
                      : "bg-slate-200/70"
                    }`}
                >
                  {s.done && !isActive ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{s.title}</p>
                  <p
                    className={`text-[11px] truncate ${isActive ? "text-rose-100" : "text-slate-500"
                      }`}
                  >
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${banner.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: PILIH OPD */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tahap 1: Pilih Perangkat Daerah (OPD)
              </h2>
              <p className="text-xs text-slate-500">
                Silakan pilih SKPD / OPD yang akan dikelola data penerimanya.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={opdSearch}
                onChange={(e) => setOpdSearch(e.target.value)}
                placeholder="Cari kode atau nama OPD..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
              />
            </div>
          </div>

          {loadingInit ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memuat daftar OPD...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[460px] overflow-y-auto p-1">
              {filteredOpds.map((opd) => {
                const isSelected = selectedOpd?.id === opd.id;
                return (
                  <div
                    key={opd.id}
                    onClick={() => handleSelectOpd(opd)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 cursor-pointer ${isSelected
                      ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-xs font-mono font-bold px-2 py-0.5 rounded-md border mb-1 ${isSelected
                          ? "bg-[#991B1B] text-white border-[#991B1B]"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                      >
                        {opd.kd_skpd}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {opd.nm_skpd}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOpd(opd);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white font-semibold rounded-xl text-xs shadow-sm hover:opacity-95 transition-opacity shrink-0 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PILIH UNIT */}
      {currentStep === 2 && selectedOpd && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tahap 2: Pilih Sub Unit Kerja
              </h2>
              <p className="text-xs text-slate-500">
                OPD terpilih:{" "}
                <span className="font-semibold text-slate-700">
                  {selectedOpd.kd_skpd} — {selectedOpd.nm_skpd}
                </span>
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Cari kode atau nama unit..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
              />
            </div>
          </div>

          {/* Option: Seluruh Unit Kerja / SKPD Induk */}
          <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Seluruh Unit Kerja / SKPD Induk
              </p>
              <p className="text-xs text-slate-500">
                Tampilkan seluruh data penerima pada SKPD atau input tanpa
                spesifikasi sub-unit tertentu
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectUnit(null)}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Pilih Induk
            </button>
          </div>

          {filteredUnits.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
              Tidak ada sub-unit kerja yang cocok untuk OPD ini. Silakan klik{" "}
              <span className="font-semibold text-slate-600">Pilih Induk</span>{" "}
              di atas untuk melanjutkan.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto p-1">
              {filteredUnits.map((unit) => {
                const isSelected = selectedUnit?.id === unit.id;
                return (
                  <div
                    key={unit.id}
                    onClick={() => handleSelectUnit(unit)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-4 cursor-pointer ${isSelected
                      ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-xs font-mono font-bold px-2 py-0.5 rounded-md border mb-1 ${isSelected
                          ? "bg-[#991B1B] text-white border-[#991B1B]"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                      >
                        {unit.kd_unit}
                      </span>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {unit.nm_unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectUnit(unit);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white font-semibold rounded-xl text-xs shadow-sm hover:opacity-95 transition-opacity shrink-0 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Tahap 1 (Ganti OPD)
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DAFTAR DATA PENERIMA */}
      {currentStep === 3 && selectedOpd && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tahap 3: Daftar Data Penerima
              </h2>
              <p className="text-xs text-slate-500">
                OPD: {selectedOpd.nm_skpd}
                {selectedUnit
                  ? ` • Unit: ${selectedUnit.nm_unit}`
                  : " • Semua Unit / Induk"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Ganti Unit
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Ganti OPD
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Data Penerima</span>
              </button>
            </div>
          </div>

          {/* Search & Refresh Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama penerima, bank, rekening, atau NPWP..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
              />
            </div>

            <button
              type="button"
              onClick={fetchPenerimaList}
              disabled={loadingList}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Penerima</th>
                  <th className="py-3 px-4">Bank Penerima</th>
                  <th className="py-3 px-4">No. Rekening</th>
                  <th className="py-3 px-4">NPWP</th>
                  <th className="py-3 px-4">Unit Kerja</th>
                  <th className="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingList ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Memuat daftar penerima...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">
                        Belum ada data penerima
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Klik tombol &quot;+ Tambah Data Penerima&quot; untuk
                        menambahkan data baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.nm_penerima}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          <Landmark className="w-3 h-3 text-[#88131A]" />
                          {item.bank_penerima}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.rek_penerima}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {item.npwp || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.nm_unit ? (
                          <span className="text-[11px]">
                            {item.kd_unit} - {item.nm_unit}
                          </span>
                        ) : (
                          <span className="text-[11px] italic text-slate-400">
                            SKPD Induk
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Edit Data Penerima"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus Data Penerima"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            total={filteredItems.length}
            limit={pageSize}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setPageSize(newLimit);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* STEP 4: FORM TAMBAH / EDIT DATA PENERIMA */}
      {currentStep === 4 && selectedOpd && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tahap 4:{" "}
                {editingId
                  ? "Edit Data Penerima"
                  : "Pengisian Data Penerima"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer self-start md:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Info SKPD & Unit Kerja */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-500">
                  SKPD / Organisasi
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {selectedOpd.kd_skpd} - {selectedOpd.nm_skpd}
                </div>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase text-slate-500">
                  Unit Kerja
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {selectedUnit
                    ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
                    : "Seluruh Unit / SKPD Induk"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penerima <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nmPenerima}
                  onChange={(e) => setNmPenerima(e.target.value)}
                  placeholder="Contoh: CV. Karya Mandiri / Nama Pegawai"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Penerima
                  <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={bankOptions}
                  value={bankPenerima}
                  onChange={(val) => setBankPenerima(val)}
                  placeholder="-- Pilih Bank Penerima --"
                  searchPlaceholder="Cari kode atau nama bank..."
                  clearLabel="-- Pilih Bank Penerima --"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Rekening Penerima{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rekPenerima}
                  onChange={(e) => setRekPenerima(e.target.value)}
                  placeholder="Contoh: 23301020001234"
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NPWP
                </label>
                <input
                  type="text"
                  value={npwp}
                  onChange={(e) => setNpwp(e.target.value)}
                  placeholder="Contoh: 00.116.987.9-118.000"
                  className="w-full px-3.5 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !bankPenerima}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md hover:opacity-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {submitting ? "Menyimpan..." : "Simpan Data Penerima"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Data Penerima"
        entityName="Data Penerima"
        itemCode={deleteTarget?.rek_penerima}
        itemLabel={deleteTarget?.nm_penerima}
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
