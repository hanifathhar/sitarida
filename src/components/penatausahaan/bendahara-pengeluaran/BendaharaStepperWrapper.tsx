"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  GitBranch,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  WalletCards,
} from "lucide-react";

export interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

export interface UnitItem {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

export interface ScopeData {
  session: {
    userId: string;
    namaLengkap: string;
    roleKode: string;
    isCrossOpd: boolean;
    opdId: string | null;
    unitKerjaId?: string | null;
  };
  opds: OpdItem[];
  units: UnitItem[];
}

interface BendaharaStepperWrapperProps {
  title: string;
  subtitle: string;
  step3Label?: string;
  step4Label?: string;
  children: (props: {
    selectedOpd: OpdItem | null;
    selectedUnit: UnitItem | null;
    scopeData: ScopeData | null;
    currentStep: 1 | 2 | 3 | 4;
    setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  }) => React.ReactNode;
}

export default function BendaharaStepperWrapper({
  title,
  subtitle,
  step3Label = "Daftar Dokumen",
  step4Label = "Formulir Transaksi",
  children,
}: BendaharaStepperWrapperProps) {
  const [scopeData, setScopeData] = useState<ScopeData | null>(null);
  const [loadingScope, setLoadingScope] = useState(true);

  // Stepper State: 1 (OPD) -> 2 (Unit) -> 3 (Daftar/Aksi) -> 4 (Detail/Form)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);

  // Search Filter
  const [searchOpd, setSearchOpd] = useState("");
  const [searchUnit, setSearchUnit] = useState("");

  useEffect(() => {
    async function loadScope() {
      try {
        const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/scope");
        const json = await res.json();
        if (json.success && json.data) {
          const data: ScopeData = json.data;
          setScopeData(data);

          // Jika user non-lintas OPD (misal Bendahara Pengeluaran OPD tertentu), kunci langsung
          if (!data.session.isCrossOpd && data.session.opdId) {
            const myOpd = data.opds.find((o) => o.id === data.session.opdId);
            if (myOpd) {
              setSelectedOpd(myOpd);
              if (data.session.unitKerjaId) {
                const myUnit = data.units.find(
                  (u) => u.id === data.session.unitKerjaId
                );
                if (myUnit) {
                  setSelectedUnit(myUnit);
                }
              }
              // Langsung loncat ke Langkah 3 (Daftar Dokumen / Pembukuan SKPD)
              setCurrentStep(3);
            }
          }
        }
      } catch (e) {
        console.error("Gagal memuat scope bendahara:", e);
      } finally {
        setLoadingScope(false);
      }
    }
    loadScope();
  }, []);

  const filteredOpds = (scopeData?.opds || []).filter(
    (o) =>
      o.kd_skpd.toLowerCase().includes(searchOpd.toLowerCase()) ||
      o.nm_skpd.toLowerCase().includes(searchOpd.toLowerCase())
  );

  const availableUnits = (scopeData?.units || []).filter(
    (u) => selectedOpd && u.opdId === selectedOpd.id
  );

  const filteredUnits = availableUnits.filter(
    (u) =>
      u.kd_unit.toLowerCase().includes(searchUnit.toLowerCase()) ||
      u.nm_unit.toLowerCase().includes(searchUnit.toLowerCase())
  );

  const handleSelectAndNextOpd = (opd: OpdItem) => {
    setSelectedOpd(opd);
    setSelectedUnit(null);
    setCurrentStep(2);
  };

  const handleSelectAndNextUnit = (unit: UnitItem | null) => {
    setSelectedUnit(unit);
    setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-[#88131A] border border-red-200">
                <WalletCards className="w-3.5 h-3.5" />
                Bendahara Pengeluaran
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs font-semibold text-slate-500">Tahun Anggaran 2026</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>

          {/* OPD & Unit Info Pill */}
          {selectedOpd && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 border border-slate-200">
              <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-[#88131A]" />
                <span className="text-xs font-bold text-slate-800 max-w-[200px] truncate" title={selectedOpd.nm_skpd}>
                  {selectedOpd.nm_skpd}
                </span>
              </div>
              {selectedUnit && (
                <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <GitBranch className="w-3.5 h-3.5 text-teal-700" />
                  <span className="text-xs font-semibold text-slate-700 max-w-[180px] truncate" title={selectedUnit.nm_unit}>
                    {selectedUnit.nm_unit}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stepper Progress Bar (Persis Format Menu Pembuatan SPM) */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: 1, label: "1. Pilih OPD", icon: Building2 },
              { step: 2, label: "2. Pilih Unit", icon: GitBranch },
              { step: 3, label: `3. ${step3Label}`, icon: FileText },
              { step: 4, label: `4. ${step4Label}`, icon: DollarSign },
            ].map((s) => {
              const isDone = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              const IconComp = s.icon;
              return (
                <button
                  key={s.step}
                  type="button"
                  disabled={
                    s.step > currentStep &&
                    (!selectedOpd || (s.step === 3 && currentStep < 3))
                  }
                  onClick={() => {
                    if (s.step < currentStep) {
                      if (s.step === 1 && !scopeData?.session.isCrossOpd) return;
                      setCurrentStep(s.step as any);
                    } else if (s.step === 3 && selectedOpd) {
                      setCurrentStep(3);
                    }
                  }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                    isCurrent
                      ? "bg-[#5E0E14] text-white border-[#5E0E14] shadow-md"
                      : isDone
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                      : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg ${
                      isCurrent
                        ? "bg-white/20 text-white"
                        : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold truncate">
                      {s.label}
                    </div>
                    <div className="text-[10px] opacity-80 truncate">
                      {s.step === 1 &&
                        (selectedOpd ? selectedOpd.kd_skpd : "Belum dipilih")}
                      {s.step === 2 &&
                        (selectedUnit ? selectedUnit.kd_unit : "Seluruh Unit")}
                      {s.step === 3 && step3Label}
                      {s.step === 4 && step4Label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAHAP 1: PILIH ORGANISASI PERANGKAT DAERAH (OPD)                */}
      {/* ============================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#991B1B]" />
                <span>Tahap 1: Pilih Perangkat Daerah (OPD)</span>
              </h2>
            </div>
          </div>

          {loadingScope ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Memeriksa hak akses OPD...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Fitur Pencarian OPD */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchOpd}
                  onChange={(e) => setSearchOpd(e.target.value)}
                  placeholder="Cari OPD / SKPD berdasarkan nama atau kode..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]/20 focus:border-[#991B1B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 max-h-[460px] overflow-y-auto p-1">
                {filteredOpds.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-500">
                    Tidak ada OPD yang sesuai dengan kata kunci pencarian &quot;{searchOpd}&quot;.
                  </div>
                ) : (
                  filteredOpds.map((opd) => {
                    const isSelected = selectedOpd?.id === opd.id;
                    return (
                      <div
                        key={opd.id}
                        onClick={() => setSelectedOpd(opd)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                            {opd.kd_skpd}
                          </span>
                          <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                            {opd.nm_skpd}
                          </div>
                        </div>

                        {/* Tombol Next diletakkan langsung pada kolom / card OPD */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndNextOpd(opd);
                          }}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                          title="Pilih OPD ini dan lanjut ke Tahap 2"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 2: PILIH SUB UNIT KERJA                                   */}
      {/* ============================================================== */}
      {currentStep === 2 && selectedOpd && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-[#991B1B]" />
                <span>Tahap 2: Pilih Sub Unit Kerja</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                OPD Induk: <strong className="text-[#88131A]">{selectedOpd?.kd_skpd} - {selectedOpd?.nm_skpd}</strong>
              </p>
            </div>
            {scopeData?.session.isCrossOpd && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ganti OPD</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Fitur Pencarian Sub Unit */}
            {availableUnits.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchUnit}
                  onChange={(e) => setSearchUnit(e.target.value)}
                  placeholder="Cari Sub Unit (Puskesmas, Kelurahan, Lab, dll)..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#991B1B]/20 focus:border-[#991B1B]"
                />
              </div>
            )}

            {availableUnits.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-100 text-[#991B1B] flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-slate-900">
                    OPD Tidak Memiliki Sub Unit Kerja
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Perangkat Daerah ini ({selectedOpd?.nm_skpd}) tidak memiliki Sub Unit (Puskesmas/Kelurahan). Seluruh anggaran dikelola langsung oleh Unit Induk SKPD.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAndNextUnit(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white text-xs font-bold shadow-md hover:from-[#46090E] hover:to-[#7F1D1D] transition-all cursor-pointer"
                >
                  <span>Lanjut Menggunakan Unit Induk SKPD</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Tidak ada Sub Unit yang sesuai dengan pencarian &quot;{searchUnit}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 max-h-[460px] overflow-y-auto p-1">
                {/* Opsi Gunakan Seluruh Unit / Induk SKPD */}
                <div
                  onClick={() => setSelectedUnit(null)}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                    selectedUnit === null
                      ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                      {selectedOpd.kd_skpd}
                    </span>
                    <div className="font-bold text-sm text-slate-900 leading-snug">
                      Gunakan Unit Induk SKPD (Seluruh Sub Unit)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAndNextUnit(null);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    title="Lanjut dengan Unit Induk"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filteredUnits.map((unit) => {
                  const isSelected = selectedUnit?.id === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit)}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded">
                          {unit.kd_unit}
                        </span>
                        <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                          {unit.nm_unit}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAndNextUnit(unit);
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                        title="Pilih Unit ini dan lanjut ke Tahap 3"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3 & STEP 4: KONTEN MODUL */}
      {(currentStep === 3 || currentStep === 4) && (
        <div>
          {children({
            selectedOpd,
            selectedUnit,
            scopeData,
            currentStep,
            setCurrentStep,
          })}
        </div>
      )}
    </div>
  );
}
