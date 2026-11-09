"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileCheck2,
  Building2,
  Calendar,
  Search,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Wallet,
  Eye,
  Edit3,
} from "lucide-react";
import ActionBanner from "@/components/ui/ActionBanner";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface UserScope {
  session: {
    userId: string;
    username: string;
    namaLengkap: string;
    roleKode?: string;
    roleNama: string;
    isCrossOpd: boolean;
    levelAkses: string;
    opdId: string | null;
    unitKerjaId?: string | null;
    tahunAnggaran?: number;
  };
  opds: OpdItem[];
}

interface SpdPreviewItem {
  trskpdId: string;
  trdrkaId: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  paguRka: number;
  b1: number;
  b2: number;
  b3: number;
  nilai: number;
}

interface TriwulanSummary {
  triwulan: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  periode: string;
  bulanAwal: number;
  bulanAkhir: number;
  namaBulan: [string, string, string];
  totalKasTriwulan: number;
  jumlahRekening: number;
  items: SpdPreviewItem[];
}

interface SpdDocSummary {
  no_spd: string;
  tgl_spd: string;
  triwulan: number;
  periode: string;
  bulan_awal: number;
  bulan_akhir: number;
  keterangan: string | null;
  status: string;
  jumlahBaris: number;
  totalNilaiSpd: number;
}

interface SpdNomorSummary {
  no_spd: string;
  tgl_spd: string;
  triwulan: number;
  periode: string;
  bulan_awal: number;
  bulan_akhir: number;
  kd_skpd: string;
  nm_skpd: string;
  keterangan: string | null;
  status: string;
  jumlahSubKegiatan: number;
  jumlahBaris: number;
  totalNilaiSpd: number;
}

interface SpdRow {
  id: string;
  tahunAnggaran: number;
  no_spd: string;
  tgl_spd: string;
  opdId: string;
  unitKerjaId: string | null;
  trskpdId: string | null;
  trdrkaId: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  triwulan: number;
  periode: string;
  bulan_awal: number;
  bulan_akhir: number;
  keterangan: string | null;
  status: string;
}

interface UnitSpdResponse {
  isAnggaranKasLocked: boolean;
  anggaranKasStatus: string;
  totalPaguRka: number;
  totalAnggaranKasSetahun: number;
  triwulanSummaries: Record<1 | 2 | 3 | 4, TriwulanSummary>;
  spdByTriwulan: Record<number, SpdDocSummary>;
  spdSummaryByNomor?: SpdNomorSummary[];
  spdRows: SpdRow[];
}

function formatRupiah(val: number) {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}

function formatTanggal(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SpdPage() {
  // Stepper 2 Tahap (Cukup sampai level OPD):
  // 1 = Pilih Perangkat Daerah (OPD)
  // 2 = Daftar & Buat SPD (Ringkasan Berdasarkan Nomor SPD Terbit)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [tahun, setTahun] = useState<number>(2027);

  // Scope & Selection (Hanya Level OPD)
  const [scope, setScope] = useState<UserScope | null>(null);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [opdLockMap, setOpdLockMap] = useState<Record<string, boolean>>({});

  // Data SPD pada Tahap 2
  const [spdData, setSpdData] = useState<UnitSpdResponse | null>(null);
  const [loadingScope, setLoadingScope] = useState(true);
  const [loadingSpd, setLoadingSpd] = useState(false);
  const [lockingKas, setLockingKas] = useState(false);

  // Filter & Pagination Daftar Nomor SPD Terbit
  const [searchOpd, setSearchOpd] = useState("");
  const [searchSpd, setSearchSpd] = useState("");
  const [filterTriwulan, setFilterTriwulan] = useState<number | "ALL">("ALL");
  const [spdPage, setSpdPage] = useState(1);
  const [spdLimit, setSpdLimit] = useState(10);

  // Modal Lihat Rincian Baris tr_spd untuk 1 Nomor SPD Terbit
  const [detailNomorSpd, setDetailNomorSpd] = useState<SpdNomorSummary | null>(
    null
  );
  const [searchDetailRek, setSearchDetailRek] = useState("");

  // Modal Input / Terbitkan SPD per 3 Bulan
  const [showModal, setShowModal] = useState(false);
  const [modalTriwulan, setModalTriwulan] = useState<1 | 2 | 3 | 4>(1);
  const [formNoSpd, setFormNoSpd] = useState("");
  const [formTglSpd, setFormTglSpd] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formKeterangan, setFormKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Dialog Hapus SPD Berdasarkan Nomor SPD / Triwulan
  const [deleteTarget, setDeleteTarget] = useState<{
    no_spd: string;
    triwulan: number;
    periode: string;
    jumlahBaris: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // 1. Load Scope OPD
  useEffect(() => {
    async function fetchScope() {
      setLoadingScope(true);
      try {
        const res = await fetch("/api/perencanaan/scope");
        const json = await res.json();
        if (json.success) {
          setScope(json.data);
          if (json.data.session?.tahunAnggaran) {
            setTahun(json.data.session.tahunAnggaran);
          }
          if (json.data.opds.length === 1) {
            setSelectedOpd(json.data.opds[0]);
          }
        }
      } catch {
        setBanner({
          type: "error",
          message: "Gagal memuat cakupan Perangkat Daerah (OPD)",
        });
      } finally {
        setLoadingScope(false);
      }
    }
    fetchScope();
  }, []);

  // 2. Load Peta Status Kunci Anggaran Kas Seluruh OPD
  const loadOpdLocks = useCallback(
    async (targetTahun: number = tahun) => {
      try {
        const res = await fetch(
          `/api/perencanaan/anggaran-kas?action=locks&tahun=${targetTahun}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setOpdLockMap(json.data);
        }
      } catch (e) {
        console.error("Gagal memuat status kunci Anggaran Kas:", e);
      }
    },
    [tahun]
  );

  useEffect(() => {
    if (scope) {
      loadOpdLocks(tahun);
    }
  }, [scope, tahun, currentStep, loadOpdLocks]);

  // 3. Load Data SPD untuk OPD terpilih pada Tahap 2
  const loadOpdSpdData = useCallback(
    async (opdOverride?: OpdItem | null) => {
      const targetOpd = opdOverride !== undefined ? opdOverride : selectedOpd;
      if (!targetOpd) return;

      setLoadingSpd(true);
      try {
        const params = new URLSearchParams({
          type: "spd",
          tahun: String(tahun),
          opdId: targetOpd.id,
        });
        const res = await fetch(
          `/api/perencanaan/kas-spd?${params.toString()}`
        );
        const json = await res.json();
        if (json.success) {
          setSpdData(json.data);
        } else {
          setBanner({
            type: "error",
            message: json.message || "Gagal memuat data SPD",
          });
        }
      } catch {
        setBanner({
          type: "error",
          message: "Kesalahan jaringan saat memuat data SPD",
        });
      } finally {
        setLoadingSpd(false);
      }
    },
    [selectedOpd, tahun]
  );

  useEffect(() => {
    if (currentStep === 2 && selectedOpd) {
      loadOpdSpdData();
    }
  }, [currentStep, selectedOpd, tahun, loadOpdSpdData]);

  const filteredOpds = useMemo(() => {
    return (scope?.opds || []).filter((o) => {
      if (!searchOpd.trim()) return true;
      const q = searchOpd.toLowerCase();
      return (
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q)
      );
    });
  }, [scope, searchOpd]);

  // Daftar Ringkasan SPD Berdasarkan Nomor SPD Terbit
  const spdNomorSummaries: SpdNomorSummary[] = useMemo(() => {
    if (spdData?.spdSummaryByNomor && Array.isArray(spdData.spdSummaryByNomor)) {
      return spdData.spdSummaryByNomor;
    }
    // Fallback jika dikalkulasi dari spdRows
    const rows = spdData?.spdRows || [];
    const map = new Map<
      string,
      SpdNomorSummary & { subSet: Set<string> }
    >();
    for (const r of rows) {
      const ex = map.get(r.no_spd);
      if (!ex) {
        map.set(r.no_spd, {
          no_spd: r.no_spd,
          tgl_spd: r.tgl_spd,
          triwulan: r.triwulan,
          periode: r.periode,
          bulan_awal: r.bulan_awal,
          bulan_akhir: r.bulan_akhir,
          kd_skpd: r.kd_skpd,
          nm_skpd: r.nm_skpd,
          keterangan: r.keterangan,
          status: r.status,
          subSet: new Set([r.kd_sub_kegiatan]),
          jumlahSubKegiatan: 1,
          jumlahBaris: 1,
          totalNilaiSpd: r.nilai,
        });
      } else {
        ex.subSet.add(r.kd_sub_kegiatan);
        ex.jumlahSubKegiatan = ex.subSet.size;
        ex.jumlahBaris += 1;
        ex.totalNilaiSpd += r.nilai;
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.triwulan - b.triwulan || a.no_spd.localeCompare(b.no_spd))
      .map(({ subSet, ...rest }) => rest);
  }, [spdData]);

  const filteredNomorSummaries = useMemo(() => {
    return spdNomorSummaries.filter((doc) => {
      if (filterTriwulan !== "ALL" && doc.triwulan !== filterTriwulan) {
        return false;
      }
      if (!searchSpd.trim()) return true;
      const q = searchSpd.toLowerCase();
      return (
        doc.no_spd.toLowerCase().includes(q) ||
        doc.periode.toLowerCase().includes(q) ||
        doc.kd_skpd.toLowerCase().includes(q) ||
        doc.nm_skpd.toLowerCase().includes(q) ||
        (doc.keterangan || "").toLowerCase().includes(q)
      );
    });
  }, [spdNomorSummaries, filterTriwulan, searchSpd]);

  const totalSpdPages = Math.max(
    1,
    Math.ceil(filteredNomorSummaries.length / spdLimit)
  );
  const safeSpdPage = Math.min(spdPage, totalSpdPages);
  const paginatedNomorSummaries = useMemo(() => {
    const start = (safeSpdPage - 1) * spdLimit;
    return filteredNomorSummaries.slice(start, start + spdLimit);
  }, [filteredNomorSummaries, safeSpdPage, spdLimit]);

  const totalNilaiFilteredSpd = useMemo(
    () =>
      filteredNomorSummaries.reduce((acc, doc) => acc + doc.totalNilaiSpd, 0),
    [filteredNomorSummaries]
  );

  // Rincian baris tr_spd untuk Nomor SPD yang sedang dilihat pada Modal Detail
  const detailRowsForNomor = useMemo(() => {
    if (!detailNomorSpd) return [];
    const rows = (spdData?.spdRows || []).filter(
      (r) => r.no_spd === detailNomorSpd.no_spd
    );
    if (!searchDetailRek.trim()) return rows;
    const q = searchDetailRek.toLowerCase();
    return rows.filter(
      (r) =>
        r.kd_sub_kegiatan.toLowerCase().includes(q) ||
        r.nm_sub_kegiatan.toLowerCase().includes(q) ||
        r.kd_rek6.toLowerCase().includes(q) ||
        r.nm_rek6.toLowerCase().includes(q) ||
        r.kd_program.toLowerCase().includes(q) ||
        r.nm_program.toLowerCase().includes(q) ||
        r.kd_kegiatan.toLowerCase().includes(q) ||
        r.nm_kegiatan.toLowerCase().includes(q)
    );
  }, [detailNomorSpd, spdData, searchDetailRek]);

  const canLockAnggaranKas = useMemo(() => {
    const sess = scope?.session;
    if (!sess) return false;
    const kode = String(sess.roleKode || "").trim().toUpperCase();
    const nama = String(sess.roleNama || "").trim().toLowerCase();
    return (
      kode === "0" ||
      kode === "SUPERADMIN" ||
      kode === "2" ||
      kode === "BIDANG_ANGGARAN" ||
      nama.includes("superadmin") ||
      nama.includes("bidang anggaran")
    );
  }, [scope]);

  // Handler Pilih OPD -> Langsung ke Tahap 2 (Daftar & Buat SPD)
  function handleSelectAndNextOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setSearchSpd("");
    setFilterTriwulan("ALL");
    setSpdPage(1);
    setCurrentStep(2);
  }

  // Buka Modal Buat / Terbitkan SPD Baru (atau per Triwulan)
  function openCreateSpdModal(preferredTw?: 1 | 2 | 3 | 4) {
    let targetTw: 1 | 2 | 3 | 4 = preferredTw || 1;
    if (!preferredTw && spdData?.spdByTriwulan) {
      for (const candidate of [1, 2, 3, 4] as const) {
        if (!spdData.spdByTriwulan[candidate]) {
          targetTw = candidate;
          break;
        }
      }
    }

    const existingDoc = spdData?.spdByTriwulan?.[targetTw];
    const kodeSkpd = selectedOpd?.kd_skpd || "SKPD";
    const defaultNoSpd =
      existingDoc?.no_spd || `900/SPD-TW${targetTw}/${kodeSkpd}/${tahun}`;
    const defaultTgl = existingDoc?.tgl_spd
      ? new Date(existingDoc.tgl_spd).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    setModalTriwulan(targetTw);
    setFormNoSpd(defaultNoSpd);
    setFormTglSpd(defaultTgl);
    setFormKeterangan(
      existingDoc?.keterangan ||
      `Penyediaan Dana Belanja Triwulan ${targetTw} Berdasarkan Anggaran Kas Terkunci TA ${tahun}`
    );
    setModalError(null);
    setShowModal(true);
  }

  async function handleQuickLockAnggaranKas() {
    if (!selectedOpd) return;
    setLockingKas(true);
    setModalError(null);
    try {
      const res = await fetch("/api/perencanaan/anggaran-kas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          opdId: selectedOpd.id,
          unitKerjaId: null,
          isLocked: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunci Anggaran Kas");
      }
      setBanner({
        type: "success",
        title: "Anggaran Kas Dikunci",
        message: json.message,
      });
      await Promise.all([loadOpdLocks(tahun), loadOpdSpdData()]);
    } catch (err: any) {
      setModalError(err.message);
      setBanner({
        type: "error",
        title: "Gagal Mengunci Anggaran Kas",
        message: err.message,
      });
    } finally {
      setLockingKas(false);
    }
  }

  async function handleGenerateSpdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpd) return;
    setSubmitting(true);
    setBanner(null);
    setModalError(null);
    try {
      const res = await fetch("/api/perencanaan/kas-spd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spd",
          tahunAnggaran: tahun,
          opdId: selectedOpd.id,
          unitKerjaId: null,
          triwulan: modalTriwulan,
          no_spd: formNoSpd,
          tgl_spd: formTglSpd,
          keterangan: formKeterangan,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menerbitkan dokumen SPD");
      }

      setShowModal(false);
      setBanner({
        type: "success",
        title: "SPD Berhasil Diterbitkan",
        message: json.message,
      });
      await loadOpdSpdData();
    } catch (err: any) {
      setModalError(err.message);
      setBanner({
        type: "error",
        title: "Gagal Menerbitkan SPD",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteSpd() {
    if (!deleteTarget || !selectedOpd) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const params = new URLSearchParams({
        tahun: String(tahun),
        opdId: selectedOpd.id,
        no_spd: deleteTarget.no_spd,
        triwulan: String(deleteTarget.triwulan),
      });
      const res = await fetch(
        `/api/perencanaan/kas-spd?${params.toString()}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menghapus dokumen SPD");
      }
      setDeleteTarget(null);
      setBanner({
        type: "success",
        title: "SPD Dihapus",
        message: json.message,
      });
      await loadOpdSpdData();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const FALLBACK_TW_META: Record<1 | 2 | 3 | 4, TriwulanSummary> = {
    1: {
      triwulan: 1,
      label: "Triwulan I (Januari – Maret)",
      shortLabel: "Triwulan I",
      periode: "Triwulan I",
      bulanAwal: 1,
      bulanAkhir: 3,
      namaBulan: ["Januari", "Februari", "Maret"],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    2: {
      triwulan: 2,
      label: "Triwulan II (April – Juni)",
      shortLabel: "Triwulan II",
      periode: "Triwulan II",
      bulanAwal: 4,
      bulanAkhir: 6,
      namaBulan: ["April", "Mei", "Juni"],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    3: {
      triwulan: 3,
      label: "Triwulan III (Juli – September)",
      shortLabel: "Triwulan III",
      periode: "Triwulan III",
      bulanAwal: 7,
      bulanAkhir: 9,
      namaBulan: ["Juli", "Agustus", "September"],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
    4: {
      triwulan: 4,
      label: "Triwulan IV (Oktober – Desember)",
      shortLabel: "Triwulan IV",
      periode: "Triwulan IV",
      bulanAwal: 10,
      bulanAkhir: 12,
      namaBulan: ["Oktober", "November", "Desember"],
      totalKasTriwulan: 0,
      jumlahRekening: 0,
      items: [],
    },
  };

  const activeModalTwSummary: TriwulanSummary =
    spdData?.triwulanSummaries?.[modalTriwulan] ||
    FALLBACK_TW_META[modalTriwulan];

  return (
    <div className="space-y-6">
      {banner && (
        <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />
      )}

      {/* Header Wizard & Progress Stepper (2 Tahap: Pilih OPD -> Daftar & Buat SPD) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#5E0E14] text-white shadow-xs">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <span>Surat Penyediaan Dana (SPD)</span>
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#5E0E14] text-xs font-extrabold">
            <Calendar className="w-4 h-4 text-[#991B1B]" />
            <span>TAHUN {tahun}</span>
          </div>
        </div>

        {/* Stepper Bar 2 Tahap: 1. Pilih OPD -> 2. Daftar & Buat SPD */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          {[
            {
              step: 1,
              label: "1. Pilih Perangkat Daerah (OPD)",
              icon: Building2,
            },
            {
              step: 2,
              label: "2. Daftar & Buat SPD (Berdasarkan Nomor SPD Terbit)",
              icon: FileCheck2,
            },
          ].map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            const IconComponent = s.icon;
            return (
              <button
                key={s.step}
                type="button"
                disabled={!isDone && !isCurrent}
                onClick={() => {
                  if (s.step < currentStep) setCurrentStep(s.step as 1 | 2);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${isCurrent
                  ? "bg-[#5E0E14] text-white border-[#5E0E14] shadow-sm cursor-default"
                  : isDone
                    ? "bg-red-50/70 text-[#5E0E14] border-red-200 hover:bg-red-100/70 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200/80 cursor-not-allowed"
                  }`}
              >
                <span
                  className={`p-1.5 rounded-lg ${isCurrent
                    ? "bg-white/15 text-white"
                    : isDone
                      ? "bg-[#5E0E14] text-white"
                      : "bg-slate-200 text-slate-500"
                    }`}
                >
                  <IconComponent className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{s.label}</div>
                  {s.step === 1 && selectedOpd && (
                    <div
                      className={`text-[10px] truncate ${isCurrent ? "text-amber-200" : "text-slate-600"
                        }`}
                    >
                      [{selectedOpd.kd_skpd}] {selectedOpd.nm_skpd}
                    </div>
                  )}
                  {s.step === 2 && (
                    <div
                      className={`text-[10px] truncate ${isCurrent ? "text-amber-200" : "text-slate-600"
                        }`}
                    >
                      {spdNomorSummaries.length} Nomor SPD Terbit
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================
          TAHAP 1: PILIH PERANGKAT DAERAH (OPD)
          ================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#991B1B]" />
                <span>Tahap 1: Pilih Perangkat Daerah (OPD)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih OPD dan klik tombol Next untuk melihat daftar Nomor SPD terbit atau membuat SPD baru per 3 bulan.
              </p>
            </div>
          </div>

          {loadingScope ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Memeriksa daftar Perangkat Daerah (OPD)...
            </div>
          ) : (
            <div className="space-y-4">
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

              <div className="grid grid-cols-1 gap-3 max-h-[480px] overflow-y-auto p-1">
                {filteredOpds.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Tidak ada OPD yang sesuai dengan kata kunci pencarian &quot;{searchOpd}&quot;.
                  </div>
                ) : (
                  filteredOpds.map((opd) => {
                    const isSelected = selectedOpd?.id === opd.id;
                    const isLocked = Boolean(opdLockMap[opd.id]);
                    return (
                      <div
                        key={opd.id}
                        onClick={() => setSelectedOpd(opd)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer ${isSelected
                          ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                              {opd.kd_skpd}
                            </span>
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Lock className="w-3 h-3" />
                                Anggaran Kas Dikunci (Siap SPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Unlock className="w-3 h-3" />
                                Anggaran Kas Belum Dikunci
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                            {opd.nm_skpd}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAndNextOpd(opd);
                          }}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                          title="Pilih OPD ini dan buka Daftar SPD"
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

      {/* =================================================================
          TAHAP 2: DAFTAR RINGKASAN NOMOR SPD TERBIT & BUAT SPD PER 3 BULAN
          ================================================================= */}
      {currentStep === 2 && selectedOpd && (
        <div className="space-y-4">
          {/* Bar Info OPD Aktif & Tombol Utama "+ Buat SPD Baru" */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#5E0E14] text-white">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Perangkat Daerah (OPD) Terpilih:
                </span>
                <div className="text-sm font-extrabold text-slate-900">
                  [{selectedOpd.kd_skpd}] {selectedOpd.nm_skpd}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ganti OPD</span>
              </button>

              <button
                type="button"
                onClick={() => loadOpdSpdData()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>

            </div>
          </div>

          {/* Banner Status Kunci Anggaran Kas */}
          {spdData && (
            <div
              className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${spdData.isAnggaranKasLocked
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : "bg-amber-50 border-amber-300 text-amber-950"
                }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`p-2 rounded-xl shrink-0 ${spdData.isAnggaranKasLocked
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                    }`}
                >
                  {spdData.isAnggaranKasLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wide">
                    {spdData.isAnggaranKasLocked
                      ? "Acuan Anggaran Kas Telah Dikunci — Siap Menerbitkan SPD"
                      : "Perhatian: Anggaran Kas OPD Ini Belum Dikunci"}
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">
                    {spdData.isAnggaranKasLocked
                      ? "Nilai SPD per 3 bulan (Triwulan I s/d IV) ditarik otomatis dari alokasi Anggaran Kas yang telah dikunci pada seluruh Sub Kegiatan & Rekening Belanja OPD ini."
                      : "Sesuai ketentuan, dokumen SPD hanya dapat disimpan apabila Anggaran Kas OPD telah berstatus DIKUNCI."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="text-right text-xs font-mono">
                  <div className="text-slate-600">
                    Total Pagu Belanja RKA:{" "}
                    <strong className="text-slate-900">
                      {formatRupiah(spdData.totalPaguRka)}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    Total Anggaran Kas 12 Bln:{" "}
                    <strong className="text-[#5E0E14]">
                      {formatRupiah(spdData.totalAnggaranKasSetahun)}
                    </strong>
                  </div>
                </div>

                {!spdData.isAnggaranKasLocked && canLockAnggaranKas && (
                  <button
                    type="button"
                    disabled={lockingKas}
                    onClick={handleQuickLockAnggaranKas}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {lockingKas
                        ? "Mengunci..."
                        : "Kunci Anggaran Kas Sekarang"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Kartu Kontrol Penerbitan SPD Per 3 Bulan (Triwulan 1 - 4) */}
          {loadingSpd || !spdData ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              Memuat ringkasan Anggaran Kas &amp; Dokumen SPD...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {([1, 2, 3, 4] as const).map((tw) => {
                const summary = spdData.triwulanSummaries[tw];
                const issuedDoc = spdData.spdByTriwulan[tw];

                return (
                  <div
                    key={tw}
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${issuedDoc
                      ? "bg-white border-emerald-300 shadow-xs"
                      : "bg-white border-slate-200"
                      }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#5E0E14] text-white text-xs font-extrabold">
                          {summary.shortLabel}
                        </span>
                        {issuedDoc ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            SPD Terbit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Belum Terbit
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {summary.namaBulan.join(" • ")}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Bulan {summary.bulanAwal} s/d Bulan {summary.bulanAkhir} ({summary.jumlahRekening} Rekening)
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Acuan Anggaran Kas 3 Bulan
                        </div>
                        <div className="text-sm font-extrabold font-mono text-[#5E0E14]">
                          {formatRupiah(summary.totalKasTriwulan)}
                        </div>
                      </div>

                      {issuedDoc && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] space-y-0.5">
                          <div className="font-mono font-bold text-emerald-950 truncate">
                            No: {issuedDoc.no_spd}
                          </div>
                          <div className="text-emerald-800">
                            Tgl: {formatTanggal(issuedDoc.tgl_spd)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCreateSpdModal(tw)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-all bg-[#5E0E14] hover:bg-[#7A141C] text-white shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {issuedDoc
                            ? `Perbarui SPD TW ${tw}`
                            : `Buat SPD TW ${tw}`}
                        </span>
                      </button>

                      {issuedDoc && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              no_spd: issuedDoc.no_spd,
                              triwulan: issuedDoc.triwulan,
                              periode: issuedDoc.periode,
                              jumlahBaris: issuedDoc.jumlahBaris,
                            })
                          }
                          title="Hapus SPD Triwulan ini"
                          className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===============================================================
              TABEL RINGKASAN DAFTAR SPD BERDASARKAN NOMOR SPD TERBIT
              =============================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#991B1B]" />
                  <span>Daftar SPD</span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">


                {/* Pencarian Nomor SPD */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchSpd}
                    onChange={(e) => {
                      setSearchSpd(e.target.value);
                      setSpdPage(1);
                    }}
                    placeholder="Cari Nomor SPD, periode, keterangan..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                {/* Tombol Buat SPD Baru di Header Tabel */}
                <button
                  type="button"
                  onClick={() => openCreateSpdModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat SPD Baru</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white">
                    <th className="py-3 px-3 font-bold w-12 text-center">No</th>
                    <th className="py-3 px-3 font-bold">Nomor SPD</th>
                    <th className="py-3 px-3 font-bold">Tanggal SPD</th>
                    <th className="py-3 px-3 font-bold">Periode</th>
                    <th className="py-3 px-3 font-bold">SKPD</th>
                    <th className="py-3 px-3 font-bold text-center">Cakupan Rincian</th>
                    <th className="py-3 px-3 font-bold">Keterangan</th>
                    <th className="py-3 px-3 font-bold text-right">Total Nilai SPD (Rp)</th>
                    <th className="py-3 px-3 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedNomorSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="text-xs text-slate-500">
                            Belum ada Nomor SPD yang diterbitkan untuk OPD ini (atau sesuai filter pencarian).
                          </div>
                          <button
                            type="button"
                            onClick={() => openCreateSpdModal()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] text-white text-xs font-extrabold shadow-xs cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Buat SPD Baru Sekarang</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedNomorSummaries.map((doc, idx) => (
                      <tr
                        key={doc.no_spd}
                        className="hover:bg-amber-50/40 transition-colors align-middle"
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {(safeSpdPage - 1) * spdLimit + idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-extrabold text-[#5E0E14] text-xs">
                            {doc.no_spd}
                          </div>
                          <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {doc.status || "AKTIF"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {formatTanggal(doc.tgl_spd)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[#88131A] border border-red-200 font-extrabold text-[11px]">
                            {doc.periode} (TW {doc.triwulan})
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Bulan {doc.bulan_awal} s/d Bulan {doc.bulan_akhir}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {doc.kd_skpd}
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-2">
                            {doc.nm_skpd}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px]">
                            <span className="font-extrabold text-slate-900">
                              {doc.jumlahSubKegiatan} Sub Kegiatan
                            </span>
                            <span className="text-[10px] text-slate-600">
                              {doc.jumlahBaris} Rekening Belanja
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs">
                          {doc.keterangan || "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap text-xs">
                          {formatRupiah(doc.totalNilaiSpd)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchDetailRek("");
                                setDetailNomorSpd(doc);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#5E0E14] border border-amber-300 text-[11px] font-bold cursor-pointer"
                              title="Lihat rincian Sub Kegiatan & Rekening pada Nomor SPD ini"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openCreateSpdModal(
                                  doc.triwulan as 1 | 2 | 3 | 4
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                              title="Perbarui Nomor / Tanggal SPD"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  no_spd: doc.no_spd,
                                  triwulan: doc.triwulan,
                                  periode: doc.periode,
                                  jumlahBaris: doc.jumlahBaris,
                                })
                              }
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                              title="Hapus Nomor SPD ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredNomorSummaries.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={7} className="py-3 px-3 text-right">
                        TOTAL NILAI DOKUMEN SPD TERBIT ({filteredNomorSummaries.length} NOMOR SPD)
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#5E0E14]">
                        {formatRupiah(totalNilaiFilteredSpd)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <PaginationBar
              page={safeSpdPage}
              totalPages={totalSpdPages}
              total={filteredNomorSummaries.length}
              limit={spdLimit}
              onPageChange={setSpdPage}
              onLimitChange={(l) => {
                setSpdLimit(l);
                setSpdPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* =================================================================
          MODAL RINCIAN BARIS tr_spd UNTUK NOMOR SPD TERPILIH
          ================================================================= */}
      {detailNomorSpd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-200 my-8 max-h-[92vh] flex flex-col">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-300" />
                  <span>Rincian Dokumen SPD — Nomor: {detailNomorSpd.no_spd}</span>
                </h3>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  Tanggal: {formatTanggal(detailNomorSpd.tgl_spd)} •{" "}
                  {detailNomorSpd.periode} (Bulan {detailNomorSpd.bulan_awal} s/d{" "}
                  {detailNomorSpd.bulan_akhir}) • [{detailNomorSpd.kd_skpd}]{" "}
                  {detailNomorSpd.nm_skpd}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailNomorSpd(null)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-700">
                  Menampilkan {detailRowsForNomor.length} baris rincian tabel{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[#991B1B]">
                    tr_spd
                  </code>{" "}
                  • Total Nilai:{" "}
                  <span className="font-mono font-extrabold text-emerald-800">
                    {formatRupiah(detailNomorSpd.totalNilaiSpd)}
                  </span>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchDetailRek}
                    onChange={(e) => setSearchDetailRek(e.target.value)}
                    placeholder="Cari sub kegiatan / rekening (kd_rek6)..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#5E0E14] text-white sticky top-0">
                    <tr>
                      <th className="py-2.5 px-2.5 text-center w-10">No</th>
                      <th className="py-2.5 px-2.5">no_spd &amp; tgl_spd</th>
                      <th className="py-2.5 px-2.5">SKPD &amp; Unit</th>
                      <th className="py-2.5 px-2.5">Program &amp; Kegiatan</th>
                      <th className="py-2.5 px-2.5">Sub Kegiatan</th>
                      <th className="py-2.5 px-2.5">Rekening (kd_rek6 &amp; nm_rek6)</th>
                      <th className="py-2.5 px-2.5 text-right">Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailRowsForNomor.map((row, i) => (
                      <tr key={row.id} className="hover:bg-slate-50 align-top">
                        <td className="py-2 px-2.5 text-center font-mono text-slate-500">
                          {i + 1}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="font-mono font-bold text-[#5E0E14]">
                            {row.no_spd}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {formatTanggal(row.tgl_spd)}
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-mono font-bold text-slate-800">
                            {row.kd_skpd}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            {row.nm_skpd}
                          </div>
                          <div className="font-mono text-[10px] text-emerald-800 mt-0.5">
                            Unit: [{row.kd_unit || "-"}] {row.nm_unit || "-"}
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div>
                            <span className="font-mono font-bold text-slate-700 mr-1">
                              [{row.kd_program}]
                            </span>
                            <span>{row.nm_program}</span>
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            <span className="font-mono font-bold text-slate-700 mr-1">
                              [{row.kd_kegiatan}]
                            </span>
                            <span>{row.nm_kegiatan}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-mono font-bold text-[#991B1B]">
                            {row.kd_sub_kegiatan}
                          </div>
                          <div className="font-medium text-slate-800">
                            {row.nm_sub_kegiatan}
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-mono font-bold text-slate-900">
                            {row.kd_rek6}
                          </div>
                          <div className="text-slate-700">{row.nm_rek6}</div>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-extrabold text-emerald-800 whitespace-nowrap">
                          {formatRupiah(row.nilai)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailNomorSpd(null)}
                className="px-4 py-2 rounded-xl bg-[#5E0E14] text-white text-xs font-bold cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          MODAL BUAT / TERBITKAN SPD PER 3 BULAN (TRIWULAN)
          ================================================================= */}
      {showModal && selectedOpd && activeModalTwSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8 max-h-[92vh] flex flex-col">
            <div className="bg-[#991B1B] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold">
                  Buat / Terbitkan SPD Per 3 Bulan — {activeModalTwSummary.label}
                </h3>
                <p className="text-[11px] text-red-100 mt-0.5">
                  OPD: [{selectedOpd.kd_skpd}] {selectedOpd.nm_skpd} • Nilai ditarik otomatis dari 3 bulan ({activeModalTwSummary.namaBulan.join(", ")}) Anggaran Kas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleGenerateSpdSubmit}
              className="p-6 space-y-5 overflow-y-auto flex-1"
            >
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-2.5 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Gagal Menerbitkan SPD</div>
                    <div className="mt-0.5">{modalError}</div>
                  </div>
                </div>
              )}

              {/* Peringatan di dalam Modal jika Anggaran Kas belum dikunci */}
              {!spdData?.isAnggaranKasLocked && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        Anggaran Kas OPD ini belum dikunci.
                      </span>{" "}
                      SPD hanya dapat disimpan setelah Anggaran Kas berstatus DIKUNCI.
                    </div>
                  </div>
                  {canLockAnggaranKas && (
                    <button
                      type="button"
                      disabled={lockingKas}
                      onClick={handleQuickLockAnggaranKas}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#991B1B] text-white font-bold text-xs cursor-pointer"
                    >
                      {lockingKas
                        ? "Mengunci..."
                        : "Kunci Anggaran Kas Sekarang"}
                    </button>
                  )}
                </div>
              )}

              {/* Input Header Dokumen SPD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Periode Triwulan (3 Bulan) *
                  </label>
                  <select
                    value={modalTriwulan}
                    onChange={(e) => {
                      const nextTw = Number(e.target.value) as 1 | 2 | 3 | 4;
                      setModalTriwulan(nextTw);
                      const existingDoc = spdData?.spdByTriwulan?.[nextTw];
                      const kodeSkpd = selectedOpd?.kd_skpd || "SKPD";
                      setFormNoSpd(
                        existingDoc?.no_spd ||
                        `900/SPD-TW${nextTw}/${kodeSkpd}/${tahun}`
                      );
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-[#5E0E14]"
                  >
                    <option value={1}>Triwulan I (Januari - Maret)</option>
                    <option value={2}>Triwulan II (April - Juni)</option>
                    <option value={3}>Triwulan III (Juli - September)</option>
                    <option value={4}>Triwulan IV (Oktober - Desember)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nomor SPD (no_spd) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNoSpd}
                    onChange={(e) => setFormNoSpd(e.target.value)}
                    placeholder="Masukkan Nomor SPD"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tanggal SPD (tgl_spd) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTglSpd}
                    onChange={(e) => setFormTglSpd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Keterangan / Uraian SPD
                  </label>
                  <input
                    type="text"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Keterangan penerbitan SPD..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Preview Rincian Rekening dari Anggaran Kas 3 Bulan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5E0E14]">
                    Preview Rincian Sub Kegiatan &amp; Rekening Belanja ({activeModalTwSummary.items.length} Rekening)
                  </h4>
                  <span className="text-xs font-extrabold text-emerald-800 font-mono">
                    Total SPD {activeModalTwSummary.shortLabel}:{" "}
                    {formatRupiah(activeModalTwSummary.totalKasTriwulan)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-[#5E0E14] text-white sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Sub Kegiatan</th>
                        <th className="py-2 px-3">Rekening (kd_rek6)</th>
                        <th className="py-2 px-2.5 text-right">
                          {activeModalTwSummary.namaBulan[0]}
                        </th>
                        <th className="py-2 px-2.5 text-right">
                          {activeModalTwSummary.namaBulan[1]}
                        </th>
                        <th className="py-2 px-2.5 text-right">
                          {activeModalTwSummary.namaBulan[2]}
                        </th>
                        <th className="py-2 px-3 text-right">
                          Nilai SPD (3 Bln)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeModalTwSummary.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-slate-400"
                          >
                            Belum ada rekening belanja RKA / Anggaran Kas pada OPD ini.
                          </td>
                        </tr>
                      ) : (
                        activeModalTwSummary.items.map((it) => (
                          <tr key={it.trdrkaId} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-[#991B1B] mr-1">
                                [{it.kd_sub_kegiatan}]
                              </span>
                              <span>{it.nm_sub_kegiatan}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold mr-1">
                                [{it.kd_rek6}]
                              </span>
                              <span>{it.nm_rek6}</span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                              {formatRupiah(it.b1)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                              {formatRupiah(it.b2)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                              {formatRupiah(it.b3)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-800">
                              {formatRupiah(it.nilai)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !spdData?.isAnggaranKasLocked ||
                    activeModalTwSummary.items.length === 0
                  }
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Menyimpan SPD..."
                    : `Terbitkan & Simpan SPD ${activeModalTwSummary.shortLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus SPD */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Hapus Dokumen SPD"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus dokumen SPD Nomor [${deleteTarget.no_spd}] (${deleteTarget.periode} — ${deleteTarget.jumlahBaris} rekening belanja)?`
            : ""
        }
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDeleteSpd}
      />
    </div>
  );
}
