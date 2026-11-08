"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Search,
  Building2,
  GitBranch,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  DollarSign,
  PieChart,
  WalletCards,
  Check,
  X,
  Loader2,
  FileText,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ActionBanner from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  unitCount?: number;
}

interface UnitItem {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

interface SubkegKasItem {
  id: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId: string | null;
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
  pptkUserId?: string | null;
  pptkNama: string | null;
  pptkNip: string | null;
  totalBelanjaMurni: number;
  totalBelanjaUbah: number;
  totalKasMurni: number;
  totalKasUbah: number;
  jumlahRekening: number;
  jumlahRekeningTerisi: number;
  statusKas: "BELUM_DIISI" | "BELUM_LENGKAP" | "LENGKAP" | "MELEBIHI";
  persenKas: number;
}

interface RekeningKasRow {
  id: string; // trdrkaId
  trskpdId: string;
  kd_rek6: string;
  nm_rek6: string;
  nilaiMurni: number;
  nilaiUbah: number;
  kasId: string | null;
  // 12 Bulan Form State
  b1: number;
  b2: number;
  b3: number;
  b4: number;
  b5: number;
  b6: number;
  b7: number;
  b8: number;
  b9: number;
  b10: number;
  b11: number;
  b12: number;
  isSaving?: boolean;
}

interface UserScope {
  session: any;
  opds: OpdItem[];
  units: UnitItem[];
}

export default function AnggaranKasBelanjaPage() {
  // Stepper: 1 = OPD, 2 = UNIT, 3 = SUB KEGIATAN, 4 = BELANJA & INPUT KAS
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Filter Utama
  const [tahun, setTahun] = useState<number>(2027);

  // User Scope & Selection
  const [scope, setScope] = useState<UserScope | null>(null);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [selectedSubkeg, setSelectedSubkeg] = useState<SubkegKasItem | null>(null);

  // References Data
  const [subkegList, setSubkegList] = useState<SubkegKasItem[]>([]);
  const [rekeningRows, setRekeningRows] = useState<RekeningKasRow[]>([]);

  // Search & Pagination State
  const [searchOpd, setSearchOpd] = useState("");
  const [searchUnit, setSearchUnit] = useState("");
  const [searchSubkeg, setSearchSubkeg] = useState("");
  const [subkegPage, setSubkegPage] = useState(1);
  const [subkegLimit, setSubkegLimit] = useState(10);

  // Loading States
  const [loadingOpd, setLoadingOpd] = useState(true);
  const [loadingSubkeg, setLoadingSubkeg] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Lock Anggaran Kas State
  const [opdLockMap, setOpdLockMap] = useState<Record<string, boolean>>({});
  const [isCurrentEntityLocked, setIsCurrentEntityLocked] = useState<boolean>(false);
  const [isTogglingLock, setIsTogglingLock] = useState<boolean>(false);

  // Banner
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // 1. Load User Access Scope (Persis RKA)
  useEffect(() => {
    async function fetchScope() {
      setLoadingOpd(true);
      try {
        const res = await fetch("/api/perencanaan/scope");
        const json = await res.json();
        if (json.success) {
          setScope(json.data);
          if (json.data.session?.tahunAnggaran) {
            setTahun(json.data.session.tahunAnggaran);
          }
          // Jika hanya punya 1 OPD (misal Level OPD atau Level UNIT), otomatis pilih
          if (json.data.opds.length === 1) {
            setSelectedOpd(json.data.opds[0]);
          }
          // Jika Level UNIT (hanya 1 unit), otomatis pilih unit
          if (json.data.units.length === 1) {
            setSelectedUnit(json.data.units[0]);
          }
        }
      } catch (e) {
        console.error("Gagal load scope:", e);
        setBanner({ type: "error", message: "Gagal memuat hak akses OPD & Unit" });
      } finally {
        setLoadingOpd(false);
      }
    }
    fetchScope();
  }, []);

  // 1b. Load Peta Status Kunci Anggaran Kas Seluruh OPD
  async function loadOpdLocks(targetTahun: number = tahun) {
    try {
      const res = await fetch(`/api/perencanaan/anggaran-kas?action=locks&tahun=${targetTahun}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOpdLockMap(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat status kunci Anggaran Kas:", e);
    }
  }

  useEffect(() => {
    if (scope) {
      loadOpdLocks(tahun);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, tahun, currentStep]);

  // 2. Load Sub Kegiatan saat OPD / Unit dipilih
  async function loadSubkegiatanList(unitOverride?: UnitItem | null) {
    if (!selectedOpd) return;
    setLoadingSubkeg(true);
    try {
      const activeUnit = unitOverride !== undefined ? unitOverride : selectedUnit;
      const params = new URLSearchParams({
        tahun: tahun.toString(),
        opdId: selectedOpd.id,
      });
      if (activeUnit) params.set("unitKerjaId", activeUnit.id);
      if (searchSubkeg.trim()) params.set("search", searchSubkeg.trim());

      const res = await fetch(`/api/perencanaan/anggaran-kas?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSubkegList(json.data || []);
        setIsCurrentEntityLocked(Boolean(json.isLocked));
      } else {
        setBanner({ type: "error", message: json.message || "Gagal memuat sub kegiatan" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat memuat sub kegiatan" });
    } finally {
      setLoadingSubkeg(false);
    }
  }

  useEffect(() => {
    if (currentStep === 3 && selectedOpd) {
      loadSubkegiatanList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedOpd, selectedUnit, tahun]);

  // 3. Load Detail Belanja & Kas 12 Bulan saat masuk Step 4
  async function loadDetailKas(trskpdId: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/perencanaan/anggaran-kas?trskpdId=${trskpdId}&tahun=${tahun}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (typeof json.data.isLocked === "boolean") {
          setIsCurrentEntityLocked(json.data.isLocked);
        }
        const rekList = json.data.rekeningKas || [];
        setRekeningRows(
          rekList.map((r: any) => ({
            id: r.id,
            trskpdId: r.trskpdId,
            kd_rek6: r.kd_rek6,
            nm_rek6: r.nm_rek6,
            nilaiMurni: r.nilaiMurni,
            nilaiUbah: r.nilaiUbah,
            kasId: r.kasId,
            b1: r.bulan1,
            b2: r.bulan2,
            b3: r.bulan3,
            b4: r.bulan4,
            b5: r.bulan5,
            b6: r.bulan6,
            b7: r.bulan7,
            b8: r.bulan8,
            b9: r.bulan9,
            b10: r.bulan10,
            b11: r.bulan11,
            b12: r.bulan12,
          }))
        );
      } else {
        setBanner({ type: "error", message: json.message || "Gagal memuat detail rekening belanja" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat memuat rincian kas" });
    } finally {
      setLoadingDetail(false);
    }
  }

  // Pilih OPD -> lanjut ke Step 2 (Persis RKA)
  function handleSelectAndNextOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setSelectedUnit(null);
    setBanner(null);
    setCurrentStep(2);
  }

  // Pilih Unit -> lanjut ke Step 3 (Persis RKA)
  function handleSelectAndNextUnit(unit: UnitItem | null) {
    setSelectedUnit(unit);
    setBanner(null);
    setSearchSubkeg("");
    setSubkegPage(1);
    setCurrentStep(3);
    loadSubkegiatanList(unit);
  }

  // Buka Sub Kegiatan -> lanjut ke Step 4
  function handleOpenSubkeg(subkeg: SubkegKasItem) {
    setSelectedSubkeg(subkeg);
    loadDetailKas(subkeg.id);
    setCurrentStep(4);
  }

  // State Hide / Collapse Rincian Kas per Rekening
  const [collapsedRekenings, setCollapsedRekenings] = useState<Record<string, boolean>>({});

  function toggleCollapseRekening(rekId: string) {
    setCollapsedRekenings((prev) => ({
      ...prev,
      [rekId]: !prev[rekId],
    }));
  }

  function toggleCollapseAll(collapse: boolean) {
    const next: Record<string, boolean> = {};
    rekeningRows.forEach((r) => {
      next[r.id] = collapse;
    });
    setCollapsedRekenings(next);
  }

  // Toggle Kunci / Buka Kunci Anggaran Kas untuk 1 OPD / Unit (Hanya Superadmin & Bidang Anggaran)
  async function handleToggleEntityLock(opdId: string, unitKerjaId: string | null | undefined, targetLocked: boolean) {
    setIsTogglingLock(true);
    try {
      const res = await fetch("/api/perencanaan/anggaran-kas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          opdId,
          unitKerjaId: unitKerjaId || null,
          isLocked: targetLocked,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Status Kunci Diperbarui", message: json.message });
        await loadOpdLocks(tahun);
        if (selectedOpd && selectedOpd.id === opdId) {
          setIsCurrentEntityLocked(targetLocked);
        }
      } else {
        setBanner({ type: "error", message: json.message || "Gagal mengubah status kunci Anggaran Kas" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat mengubah status kunci Anggaran Kas" });
    } finally {
      setIsTogglingLock(false);
    }
  }

  // Batch Kunci / Buka Kunci Anggaran Kas Seluruh OPD (Hanya Superadmin & Bidang Anggaran)
  async function handleBatchToggleAllLock(targetLocked: boolean) {
    setIsTogglingLock(true);
    try {
      const res = await fetch("/api/perencanaan/anggaran-kas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBatch: true,
          tahunAnggaran: tahun,
          isLocked: targetLocked,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: json.message });
        await loadOpdLocks(tahun);
        setIsCurrentEntityLocked(targetLocked);
      } else {
        setBanner({ type: "error", message: json.message || "Gagal mengubah status kunci masal" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat mengubah status kunci masal" });
    } finally {
      setIsTogglingLock(false);
    }
  }

  // Ubah Input Bulan per Rekening
  function handleMonthChange(trdrkaId: string, monthKey: `b${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`, val: number) {
    if (isCurrentEntityLocked) return;
    setRekeningRows((prev) =>
      prev.map((r) => {
        if (r.id !== trdrkaId) return r;
        return {
          ...r,
          [monthKey]: Math.max(0, val),
        };
      })
    );
  }

  // Auto Bagi Rata 12 Bulan untuk 1 Rekening
  function handleAutoDistributeRow(trdrkaId: string) {
    if (isCurrentEntityLocked) {
      setBanner({ type: "error", message: "Input Anggaran Kas sedang DIKUNCI. Perubahan tidak diperbolehkan." });
      return;
    }
    setRekeningRows((prev) =>
      prev.map((r) => {
        if (r.id !== trdrkaId) return r;
        const target = r.nilaiUbah;
        if (target <= 0) return r;

        const baseVal = Math.floor(target / 12);
        const remainder = target - baseVal * 11; // sisa ditempatkan di bulan 12 agar pas

        return {
          ...r,
          b1: baseVal,
          b2: baseVal,
          b3: baseVal,
          b4: baseVal,
          b5: baseVal,
          b6: baseVal,
          b7: baseVal,
          b8: baseVal,
          b9: baseVal,
          b10: baseVal,
          b11: baseVal,
          b12: remainder,
        };
      })
    );
  }

  // Reset Alokasi 1 Rekening ke 0
  function handleResetRow(trdrkaId: string) {
    if (isCurrentEntityLocked) {
      setBanner({ type: "error", message: "Input Anggaran Kas sedang DIKUNCI. Perubahan tidak diperbolehkan." });
      return;
    }
    setRekeningRows((prev) =>
      prev.map((r) => {
        if (r.id !== trdrkaId) return r;
        return {
          ...r,
          b1: 0,
          b2: 0,
          b3: 0,
          b4: 0,
          b5: 0,
          b6: 0,
          b7: 0,
          b8: 0,
          b9: 0,
          b10: 0,
          b11: 0,
          b12: 0,
        };
      })
    );
  }

  // Bagi Rata Seluruh Rekening Sekaligus
  function handleDistributeAll() {
    if (isCurrentEntityLocked) {
      setBanner({ type: "error", message: "Input Anggaran Kas sedang DIKUNCI. Perubahan tidak diperbolehkan." });
      return;
    }
    setRekeningRows((prev) =>
      prev.map((r) => {
        const target = r.nilaiUbah;
        if (target <= 0) return r;
        const baseVal = Math.floor(target / 12);
        const remainder = target - baseVal * 11;
        return {
          ...r,
          b1: baseVal,
          b2: baseVal,
          b3: baseVal,
          b4: baseVal,
          b5: baseVal,
          b6: baseVal,
          b7: baseVal,
          b8: baseVal,
          b9: baseVal,
          b10: baseVal,
          b11: baseVal,
          b12: remainder,
        };
      })
    );
    setBanner({
      type: "success",
      message: "Seluruh rekening belanja berhasil dibagi rata ke 12 bulan. Silakan klik 'Simpan Semua' untuk menyimpan permanen.",
    });
  }

  // Simpan Single Rekening
  async function handleSaveRow(row: RekeningKasRow) {
    if (isCurrentEntityLocked) {
      setBanner({ type: "error", message: "Input Anggaran Kas sedang DIKUNCI. Penyimpanan tidak diperbolehkan." });
      return;
    }
    setRekeningRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isSaving: true } : r)));
    try {
      const res = await fetch("/api/perencanaan/anggaran-kas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          trdrkaId: row.id,
          bulan1: row.b1,
          bulan2: row.b2,
          bulan3: row.b3,
          bulan4: row.b4,
          bulan5: row.b5,
          bulan6: row.b6,
          bulan7: row.b7,
          bulan8: row.b8,
          bulan9: row.b9,
          bulan10: row.b10,
          bulan11: row.b11,
          bulan12: row.b12,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: `Anggaran kas [${row.kd_rek6}] berhasil disimpan.` });
        if (selectedSubkeg) loadDetailKas(selectedSubkeg.id);
      } else {
        setBanner({ type: "error", message: json.message || "Gagal menyimpan anggaran kas rekening" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat menyimpan anggaran kas" });
    } finally {
      setRekeningRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isSaving: false } : r)));
    }
  }

  // Simpan Seluruh Rekening Belanja Sekaligus (Batch Save)
  async function handleSaveAll() {
    if (!selectedSubkeg) return;
    if (isCurrentEntityLocked) {
      setBanner({ type: "error", message: "Input Anggaran Kas sedang DIKUNCI. Penyimpanan tidak diperbolehkan." });
      return;
    }
    setIsSavingAll(true);
    setBanner(null);

    try {
      const items = rekeningRows.map((r) => ({
        trdrkaId: r.id,
        bulan1: r.b1,
        bulan2: r.b2,
        bulan3: r.b3,
        bulan4: r.b4,
        bulan5: r.b5,
        bulan6: r.b6,
        bulan7: r.b7,
        bulan8: r.b8,
        bulan9: r.b9,
        bulan10: r.b10,
        bulan11: r.b11,
        bulan12: r.b12,
      }));

      const res = await fetch("/api/perencanaan/anggaran-kas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch-save",
          tahunAnggaran: tahun,
          trskpdId: selectedSubkeg.id,
          items,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "Berhasil",
          message: `Seluruh anggaran kas rekening belanja sub kegiatan [${selectedSubkeg.kd_sub_kegiatan}] berhasil disimpan.`,
        });
        loadDetailKas(selectedSubkeg.id);
      } else {
        setBanner({ type: "error", message: json.message || "Gagal menyimpan seluruh anggaran kas" });
      }
    } catch {
      setBanner({ type: "error", message: "Kesalahan jaringan saat menyimpan data" });
    } finally {
      setIsSavingAll(false);
    }
  }

  // Sub Unit saja (mengecualikan unit induk berakhiran .00) - Persis RKA
  const availableUnits = useMemo(() => {
    return (scope?.units && Array.isArray(scope.units) ? scope.units : []).filter(
      (u) => !selectedOpd || u.opdId === selectedOpd.id
    );
  }, [scope, selectedOpd]);

  const availableSubUnits = useMemo(() => {
    return availableUnits.filter((u) => !u.kd_unit.endsWith(".00"));
  }, [availableUnits]);

  // Filtered OPDs for Step 1
  const filteredOpds = useMemo(() => {
    return (scope?.opds || []).filter((o) => {
      if (!searchOpd.trim()) return true;
      const q = searchOpd.toLowerCase();
      return o.kd_skpd.toLowerCase().includes(q) || o.nm_skpd.toLowerCase().includes(q);
    });
  }, [scope, searchOpd]);

  // Filtered Sub Units for Step 2
  const filteredSubUnits = useMemo(() => {
    return availableSubUnits.filter((u) => {
      if (!searchUnit.trim()) return true;
      const q = searchUnit.toLowerCase();
      return u.kd_unit.toLowerCase().includes(q) || u.nm_unit.toLowerCase().includes(q);
    });
  }, [availableSubUnits, searchUnit]);

  // Filtered Subkeg for Step 3
  const filteredSubkegs = useMemo(() => {
    return subkegList.filter((s) => {
      if (!searchSubkeg.trim()) return true;
      const q = searchSubkeg.toLowerCase();
      return (
        s.kd_sub_kegiatan.toLowerCase().includes(q) ||
        s.nm_sub_kegiatan.toLowerCase().includes(q) ||
        s.nm_kegiatan.toLowerCase().includes(q) ||
        s.nm_program.toLowerCase().includes(q) ||
        (s.pptkNama && s.pptkNama.toLowerCase().includes(q))
      );
    });
  }, [subkegList, searchSubkeg]);

  const totalSubkegPages = Math.max(1, Math.ceil(filteredSubkegs.length / subkegLimit));
  const safeSubkegPage = Math.min(subkegPage, totalSubkegPages);
  const paginatedSubkegs = useMemo(() => {
    const start = (safeSubkegPage - 1) * subkegLimit;
    return filteredSubkegs.slice(start, start + subkegLimit);
  }, [filteredSubkegs, safeSubkegPage, subkegLimit]);

  // Klasifikasi Hak Akses Pengguna untuk Modul Anggaran Kas
  const accessRole = useMemo(() => {
    const sess = scope?.session;
    if (!sess) return "LOADING" as const;
    const kode = String(sess.roleKode || "").trim().toUpperCase();
    const nama = String(sess.roleNama || "").trim().toLowerCase();

    if (kode === "0" || kode === "SUPERADMIN" || nama.includes("superadmin")) {
      return "SUPERADMIN" as const;
    }
    if (
      kode === "2" ||
      kode === "BIDANG_ANGGARAN" ||
      kode === "ADMIN_BPKPAD" ||
      nama.includes("bidang anggaran")
    ) {
      return "BIDANG_ANGGARAN" as const;
    }
    if (
      kode === "14" ||
      kode === "KASUBAG_PERENCANAAN" ||
      kode === "ADMIN_OPD" ||
      nama.includes("kasubag perencanaan") ||
      nama.includes("perencanaan")
    ) {
      return "KASUBAG_PERENCANAAN" as const;
    }
    if (kode === "9" || kode === "PPTK" || nama.includes("pptk")) {
      return "PPTK" as const;
    }
    return "FORBIDDEN" as const;
  }, [scope]);

  // Hanya Superadmin & Bidang Anggaran yang berhak melakukan Lock / Unlock Anggaran Kas
  const canManageLock = accessRole === "SUPERADMIN" || accessRole === "BIDANG_ANGGARAN";

  // Step 4 Grand Totals
  const summaryTotals = useMemo(() => {
    let targetTotal = 0;
    let kasTotal = 0;

    for (const r of rekeningRows) {
      const target = r.nilaiUbah;
      const sumKas =
        r.b1 + r.b2 + r.b3 + r.b4 + r.b5 + r.b6 + r.b7 + r.b8 + r.b9 + r.b10 + r.b11 + r.b12;
      targetTotal += target;
      kasTotal += sumKas;
    }

    const sisa = targetTotal - kasTotal;
    const persen = targetTotal > 0 ? (kasTotal / targetTotal) * 100 : 0;

    return {
      targetTotal,
      kasTotal,
      sisa,
      persen,
    };
  }, [rekeningRows]);

  return (
    <div className="space-y-6">
      {banner && <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />}

      {/* Header Wizard & Progress Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#5E0E14] text-white shadow-xs">
                <CalendarDays className="w-5 h-5" />
              </span>
              <span>Anggaran Kas</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Penyusunan Rencana Penarikan Dana Belanja Daerah dibagi 12 Bulan berdasarkan Rekening RKA TA {tahun}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#5E0E14] text-xs font-extrabold">
              <Calendar className="w-4 h-4 text-[#991B1B]" />
              <span>TAHUN {tahun}</span>
            </div>
          </div>
        </div>

        {/* Progress Stepper Bar (Persis RKA) */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            { step: 1, label: "1. Pilih OPD", icon: Building2 },
            { step: 2, label: "2. Pilih Unit", icon: GitBranch },
            { step: 3, label: "3. Sub Kegiatan Belanja", icon: Layers },
            { step: 4, label: "4. Anggaran Kas 12 Bln", icon: DollarSign },
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
                  if (s.step < currentStep) setCurrentStep(s.step as any);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${isCurrent
                  ? "bg-[#5E0E14] text-white border-[#5E0E14] shadow-md"
                  : isDone
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                  }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${isCurrent
                    ? "bg-white/20 text-white"
                    : isDone
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                    }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold truncate">{s.label}</div>
                  <div className="text-[10px] opacity-80 truncate">
                    {s.step === 1 && (selectedOpd ? selectedOpd.kd_skpd : "Belum dipilih")}
                    {s.step === 2 && (selectedUnit ? selectedUnit.kd_unit : "Seluruh Unit")}
                    {s.step === 3 && `${subkegList.length} Kegiatan`}
                    {s.step === 4 && (selectedSubkeg ? selectedSubkeg.kd_sub_kegiatan : "Belum aktif")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Proteksi Hak Akses: Hanya Superadmin, Bidang Anggaran, Kasubag Perencanaan OPD, dan PPTK */}
      {!loadingOpd && accessRole === "FORBIDDEN" ? (
        <div className="bg-white rounded-2xl border-2 border-rose-200 p-8 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">
            Akses Terbatas pada Modul Anggaran Kas
          </h2>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Role Anda saat ini (<strong>{scope?.session?.roleNama || "Pengguna"}</strong>) tidak memiliki kewenangan untuk mengakses halaman ini. Modul Anggaran Kas hanya dapat diakses oleh{" "}
            <strong>Superadmin</strong>, <strong>Bidang Anggaran</strong>, <strong>Kasubag Perencanaan OPD</strong>, serta{" "}
            <strong>PPTK</strong> yang ditunjuk pada Sub Kegiatan yang ditanganinya.
          </p>
        </div>
      ) : (
        <>
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

              {loadingOpd ? (
                <div className="py-12 text-center text-xs text-slate-400">Memeriksa hak akses OPD...</div>
              ) : (
                <div className="space-y-4">
                  {/* Kontrol Penguncian Anggaran Kas Daerah (Khusus Superadmin & Bidang Anggaran) */}
                  {canManageLock && (
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#5E0E14] text-white p-4 rounded-2xl shadow-md border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                          <Lock className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold tracking-wide flex items-center gap-2">
                            <span>KONTROL PENGUNCIAN INPUT ANGGARAN KAS DAERAH</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-900">
                              TA {tahun}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Kunci akses input/edit rencana anggaran kas per OPD atau secara serentak untuk seluruh perangkat daerah.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/10 border border-white/10">
                          <span className="text-[11px] font-bold px-2 text-amber-200">Anggaran Kas:</span>
                          <button
                            type="button"
                            disabled={isTogglingLock}
                            onClick={() => handleBatchToggleAllLock(true)}
                            title="Kunci input Anggaran Kas untuk seluruh OPD"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600/90 hover:bg-red-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Kunci Semua OPD</span>
                          </button>
                          <button
                            type="button"
                            disabled={isTogglingLock}
                            onClick={() => handleBatchToggleAllLock(false)}
                            title="Buka kunci input Anggaran Kas untuk seluruh OPD"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Buka Semua OPD</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                        const isOpdLocked = Boolean(opdLockMap[opd.id]);
                        return (
                          <div
                            key={opd.id}
                            onClick={() => setSelectedOpd(opd)}
                            className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected
                              ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                                  {opd.kd_skpd}
                                </span>
                                {isOpdLocked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    <Lock className="w-2.5 h-2.5 text-rose-600" />
                                    <span>Terkunci</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Terbuka</span>
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                                {opd.nm_skpd}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Tombol Lock / Unlock per OPD (Khusus Superadmin & Bidang Anggaran) */}
                              {canManageLock && (
                                <button
                                  type="button"
                                  disabled={isTogglingLock}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEntityLock(opd.id, null, !isOpdLocked);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shadow-xs transition-all cursor-pointer disabled:opacity-50 ${isOpdLocked
                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                    }`}
                                  title={
                                    isOpdLocked
                                      ? "Klik untuk membuka kunci Anggaran Kas OPD ini"
                                      : "Klik untuk mengunci Anggaran Kas OPD ini"
                                  }
                                >
                                  {isOpdLocked ? (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Buka Kunci</span>
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Kunci</span>
                                    </>
                                  )}
                                </button>
                              )}

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
                <button
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti OPD</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Fitur Pencarian Sub Unit */}
                {availableSubUnits.length > 0 && (
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

                {availableSubUnits.length === 0 ? (
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
                ) : filteredSubUnits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Tidak ada Sub Unit yang sesuai dengan pencarian &quot;{searchUnit}&quot;.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto p-1">
                    {filteredSubUnits.map((unit) => {
                      const isSelected = selectedUnit?.id === unit.id;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => setSelectedUnit(unit)}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected
                            ? "bg-amber-50/70 border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                              {unit.kd_unit}
                            </span>
                            <div className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                              {unit.nm_unit}
                            </div>
                          </div>

                          {/* Tombol Next diletakkan langsung pada kolom / card Sub Unit */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAndNextUnit(unit);
                            }}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                            title="Pilih Sub Unit ini dan lanjut ke Tahap 3"
                          >
                            <span>Next</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: DAFTAR SUB KEGIATAN RKA                                */}
          {/* ============================================================== */}
          {currentStep === 3 && selectedOpd && (
            <div className="space-y-4 animate-in fade-in">
              {/* Bar Info Entitas Aktif (Persis RKA) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-[#5E0E14] text-white">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Entitas Perencanaan Terpilih:
                    </span>
                    <div className="text-sm font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>
                        [{selectedOpd?.kd_skpd}] {selectedOpd?.nm_skpd}
                        {selectedUnit && (
                          <span className="text-emerald-700 ml-2">↳ [{selectedUnit.kd_unit}] {selectedUnit.nm_unit}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Tombol Lock / Unlock Entitas Aktif (Khusus Superadmin & Bidang Anggaran) */}
                  {canManageLock && selectedOpd && (
                    <button
                      type="button"
                      disabled={isTogglingLock}
                      onClick={() =>
                        handleToggleEntityLock(selectedOpd.id, selectedUnit?.id || null, !isCurrentEntityLocked)
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer shadow-xs transition disabled:opacity-50 ${isCurrentEntityLocked
                        ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
                        }`}
                    >
                      {isCurrentEntityLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Kunci Anggaran Kas</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Kunci Anggaran Kas</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ganti Unit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ganti OPD</span>
                  </button>
                </div>
              </div>

              {/* Banner Peringatan jika Anggaran Kas Terkunci */}
              {isCurrentEntityLocked && (
                <div className="p-4 rounded-2xl border-2 border-red-300 bg-red-50/90 text-red-900 flex items-center gap-3 shadow-xs">
                  <span className="p-2 rounded-xl bg-red-600 text-white shrink-0">
                    <Lock className="w-5 h-5" />
                  </span>
                  <div className="flex-1 text-xs">
                    <div className="font-extrabold uppercase tracking-wide text-red-950 flex items-center gap-2">
                      <span>INPUT ANGGARAN KAS TELAH DIKUNCI</span>
                    </div>
                    <p className="mt-0.5 text-red-800">
                      Pengisian dan perubahan alokasi anggaran kas 12 bulan pada perangkat daerah ini sedang dikunci oleh Bidang Anggaran / Administrator.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                      title="Ganti Unit / OPD"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex flex-wrap items-center gap-2">
                        <span>Daftar Sub Kegiatan</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {accessRole === "PPTK"
                          ? "Menampilkan sub kegiatan yang ditugaskan kepada Anda sebagai PPTK untuk pengisian rencana anggaran kas"
                          : "Pilih salah satu sub kegiatan untuk mengisi rencana anggaran kas per rekening"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchSubkeg}
                        onChange={(e) => {
                          setSearchSubkeg(e.target.value);
                          setSubkegPage(1);
                        }}
                        placeholder="Cari kode, nama sub kegiatan, PPTK..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#991B1B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-12 text-center">No</th>
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-44">Kode Sub Kegiatan</th>
                        <th className="py-3 px-4 border-r border-[#7B111A]/60 min-w-[240px]">Nomenklatur Sub Kegiatan</th>
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-44">Nama PPTK</th>
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-40">
                          Pagu Anggaran
                        </th>
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-40">Kas Teralokasi</th>
                        <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-center w-36">Status Kas</th>
                        <th className="py-3 px-3 text-center w-32">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loadingSubkeg ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            Memuat daftar sub kegiatan belanja...
                          </td>
                        </tr>
                      ) : filteredSubkegs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            {accessRole === "PPTK"
                              ? `Belum ada sub kegiatan RKA yang ditugaskan kepada Anda (${scope?.session?.namaLengkap}) sebagai PPTK pada entitas ini.`
                              : "Belum ada sub kegiatan RKA yang memiliki rekening belanja pada entitas ini."}
                          </td>
                        </tr>
                      ) : (
                        paginatedSubkegs.map((item, idx) => {
                          const rowNumber = (safeSubkegPage - 1) * subkegLimit + idx + 1;
                          const targetBelanja = item.totalBelanjaUbah;
                          const kasTerisi = item.totalKasUbah;
                          const isMatched = targetBelanja > 0 && kasTerisi === targetBelanja;
                          const isOver = kasTerisi > targetBelanja;

                          return (
                            <tr key={item.id} className="hover:bg-amber-50/30 odd:bg-white even:bg-slate-50/50">
                              <td className="py-3 px-3.5 text-center font-mono text-slate-500">{rowNumber}</td>
                              <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{item.kd_sub_kegiatan}</td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{item.nm_sub_kegiatan}</div>
                              </td>
                              <td className="py-3 px-3.5">
                                {item.pptkNama ? (
                                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    {item.pptkNama}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Belum ditunjuk</span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900">
                                {formatRupiah(targetBelanja)}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-extrabold text-emerald-800">
                                {formatRupiah(kasTerisi)}
                              </td>
                              <td className="py-3 px-3.5 text-center">
                                {isMatched ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Lengkap (100%)</span>
                                  </span>
                                ) : isOver ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span>Melebihi</span>
                                  </span>
                                ) : kasTerisi > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>Belum Lengkap ({item.persenKas.toFixed(0)}%)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                    <span>Belum Diisi</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubkeg(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E0E14] text-white text-xs font-bold hover:bg-[#46090E] transition shadow-xs cursor-pointer"
                                >
                                  <span>Detail</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                {!loadingSubkeg && filteredSubkegs.length > 0 && (
                  <PaginationBar
                    page={safeSubkegPage}
                    totalPages={totalSubkegPages}
                    total={filteredSubkegs.length}
                    limit={subkegLimit}
                    onPageChange={(p) => setSubkegPage(p)}
                    onLimitChange={(l) => {
                      setSubkegLimit(l);
                      setSubkegPage(1);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: BELANJA & INPUT ANGGARAN KAS 12 BULAN PER REKENING      */}
          {/* ============================================================== */}
          {currentStep === 4 && selectedSubkeg && (
            <div className="space-y-6">
              {/* Banner Peringatan jika Anggaran Kas Terkunci */}
              {isCurrentEntityLocked && (
                <div className="p-4 rounded-2xl border-2 border-red-300 bg-red-50/90 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-red-600 text-white shrink-0">
                      <Lock className="w-5 h-5" />
                    </span>
                    <div className="flex-1 text-xs">
                      <div className="font-extrabold uppercase tracking-wide text-red-950 flex items-center gap-2">
                        <span>INPUT ANGGARAN KAS TELAH DIKUNCI</span>
                      </div>
                      <p className="mt-0.5 text-red-800">
                        Pengisian, pembagian rata, maupun penyimpanan alokasi anggaran kas 12 bulan sedang dikunci oleh Bidang Anggaran / Administrator.
                      </p>
                    </div>
                  </div>
                  {canManageLock && selectedOpd && (
                    <button
                      type="button"
                      disabled={isTogglingLock}
                      onClick={() =>
                        handleToggleEntityLock(selectedOpd.id, selectedUnit?.id || null, false)
                      }
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Sekarang</span>
                    </button>
                  )}
                </div>
              )}

              {/* Header Sub Kegiatan Terpilih */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-700/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/80 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(3);
                      loadSubkegiatanList();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold cursor-pointer transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Daftar Sub Kegiatan</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {canManageLock && selectedOpd && (
                      <button
                        type="button"
                        disabled={isTogglingLock}
                        onClick={() =>
                          handleToggleEntityLock(selectedOpd.id, selectedUnit?.id || null, !isCurrentEntityLocked)
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition disabled:opacity-50 ${isCurrentEntityLocked
                          ? "bg-rose-600/90 hover:bg-rose-600 text-white border-rose-400/50"
                          : "bg-emerald-600/90 hover:bg-emerald-600 text-white border-emerald-400/50"
                          }`}
                      >
                        {isCurrentEntityLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Terkunci (Klik Buka)</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Terbuka (Klik Kunci)</span>
                          </>
                        )}
                      </button>
                    )}
                    <span className="text-xs text-slate-400">PPTK:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#5E0E14] text-white border border-red-500/40">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedSubkeg.pptkNama || "Belum ditunjuk"}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-4">
                  <div className="lg:col-span-8 space-y-2">
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {selectedSubkeg.kd_sub_kegiatan}
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                      {selectedSubkeg.nm_sub_kegiatan}
                    </h2>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <span>Program: <b>{selectedSubkeg.nm_program}</b></span>
                      <span>•</span>
                      <span>Kegiatan: <b>{selectedSubkeg.nm_kegiatan}</b></span>
                    </div>
                  </div>

                  {/* Ringkasan Pagu & Kas Sub Kegiatan */}
                  <div className="lg:col-span-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Target Belanja RKA:</span>
                      <span className="font-mono font-extrabold text-white text-sm">
                        {formatRupiah(summaryTotals.targetTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Total Kas 12 Bulan:</span>
                      <span className="font-mono font-extrabold text-emerald-400 text-sm">
                        {formatRupiah(summaryTotals.kasTotal)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Sisa Belum Dialokasikan:</span>
                      <span
                        className={`font-mono font-extrabold text-sm ${summaryTotals.sisa === 0
                          ? "text-emerald-400"
                          : summaryTotals.sisa < 0
                            ? "text-rose-400"
                            : "text-amber-400"
                          }`}
                      >
                        {summaryTotals.sisa === 0
                          ? "Rp 0 (Pas 100%)"
                          : summaryTotals.sisa < 0
                            ? `+${formatRupiah(Math.abs(summaryTotals.sisa))} (Melebihi)`
                            : `${formatRupiah(summaryTotals.sisa)}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar Cepat: Bagi Rata Semua & Simpan Semua */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Rekening Rincian Objek
                  </span>

                  {/* Tombol Global Hide / Show All (Persis RKA) */}
                  {rekeningRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const hasOpen = rekeningRows.some((r) => !collapsedRekenings[r.id]);
                        toggleCollapseAll(hasOpen);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                    >
                      {rekeningRows.some((r) => !collapsedRekenings[r.id]) ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sembunyikan Semua Rincian</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Tampilkan Semua Rincian</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isCurrentEntityLocked}
                    onClick={handleDistributeAll}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition shadow-xs ${isCurrentEntityLocked
                      ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                      : "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer"
                      }`}
                    title={
                      isCurrentEntityLocked
                        ? "Input Anggaran Kas sedang dikunci"
                        : "Bagi rata anggaran belanja ke 12 bulan untuk semua rekening"
                    }
                  >
                    {isCurrentEntityLocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    )}
                    <span>Bagi Rata Semua Rekening</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAll || isCurrentEntityLocked}
                    onClick={handleSaveAll}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${isCurrentEntityLocked
                      ? "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed"
                      : "bg-[#5E0E14] text-white hover:bg-[#46090E] cursor-pointer disabled:opacity-50"
                      }`}
                  >
                    {isCurrentEntityLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Terkunci</span>
                      </>
                    ) : isSavingAll ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan Semua...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Semua Rekening</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Daftar Rekening Belanja & Input 12 Bulan */}
              <div className="space-y-5">
                {loadingDetail ? (
                  <div className="bg-white p-16 rounded-2xl border text-center text-xs text-slate-400">
                    Memuat rincian rekening belanja...
                  </div>
                ) : rekeningRows.length === 0 ? (
                  <div className="bg-white p-16 rounded-2xl border border-dashed text-center text-xs text-slate-500">
                    Belum ada rekening belanja (Akun 5) yang terdaftar pada Sub Kegiatan ini. Silakan input RKA terlebih dahulu.
                  </div>
                ) : (
                  rekeningRows.map((rek) => {
                    const targetNilai = rek.nilaiUbah;
                    const tw1 = rek.b1 + rek.b2 + rek.b3;
                    const tw2 = rek.b4 + rek.b5 + rek.b6;
                    const tw3 = rek.b7 + rek.b8 + rek.b9;
                    const tw4 = rek.b10 + rek.b11 + rek.b12;
                    const totalKasRow = tw1 + tw2 + tw3 + tw4;
                    const selisihRow = targetNilai - totalKasRow;
                    const isMatched = targetNilai > 0 && totalKasRow === targetNilai;
                    const isOver = totalKasRow > targetNilai;
                    const isCollapsed = Boolean(collapsedRekenings[rek.id]);

                    return (
                      <div
                        key={rek.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition"
                      >
                        {/* Header Rekening */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Tombol Toggle Hide Rincian per Rekening */}
                            <button
                              type="button"
                              onClick={() => toggleCollapseRekening(rek.id)}
                              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0"
                              title={isCollapsed ? "Tampilkan Rincian Kas 12 Bulan" : "Sembunyikan Rincian Kas 12 Bulan"}
                            >
                              {isCollapsed ? (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronUp className="w-4 h-4 text-slate-600" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#991B1B] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  {rek.kd_rek6}
                                </span>
                                <span className="text-xs font-extrabold text-slate-900">{rek.nm_rek6}</span>
                              </div>
                              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3">
                                <span>
                                  Target Anggaran Belanja:{" "}
                                  <strong className="font-mono font-extrabold text-slate-900">
                                    {formatRupiah(targetNilai)}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Total Kas 12 Bln:{" "}
                                  <strong
                                    className={`font-mono font-extrabold ${isMatched ? "text-emerald-700" : isOver ? "text-rose-700" : "text-amber-800"
                                      }`}
                                  >
                                    {formatRupiah(totalKasRow)}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Status:{" "}
                                  {isMatched ? (
                                    <strong className="text-emerald-700 font-bold">✓ Sesuai (100%)</strong>
                                  ) : isOver ? (
                                    <strong className="text-rose-700 font-bold">⚠️ Melebihi Anggaran (+{formatRupiah(Math.abs(selisihRow))})</strong>
                                  ) : (
                                    <strong className="text-amber-700 font-bold">Belum Lengkap (Sisa {formatRupiah(selisihRow)})</strong>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Tombol Aksi per Rekening */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={isCurrentEntityLocked}
                              onClick={() => handleAutoDistributeRow(rek.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition ${isCurrentEntityLocked
                                ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 cursor-pointer"
                                }`}
                              title={isCurrentEntityLocked ? "Anggaran Kas sedang dikunci" : "Bagi rata ke 12 bulan"}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Bagi Rata</span>
                            </button>

                            <button
                              type="button"
                              disabled={isCurrentEntityLocked}
                              onClick={() => handleResetRow(rek.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${isCurrentEntityLocked
                                ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer"
                                }`}
                              title={isCurrentEntityLocked ? "Anggaran Kas sedang dikunci" : "Kosongkan nilai kas"}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>

                            <button
                              type="button"
                              disabled={rek.isSaving || isCurrentEntityLocked}
                              onClick={() => handleSaveRow(rek)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${isCurrentEntityLocked
                                ? "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed"
                                : "bg-[#5E0E14] text-white hover:bg-[#46090E] cursor-pointer disabled:opacity-50"
                                }`}
                            >
                              {isCurrentEntityLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : rek.isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>{isCurrentEntityLocked ? "Terkunci" : "Simpan"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Grid Alokasi 12 Bulan (dikelompokkan per Triwulan) - Disembunyikan saat isCollapsed */}
                        {!isCollapsed && (
                          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white animate-in fade-in">
                            {/* Triwulan I */}
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                <span className="text-[11px] font-extrabold text-slate-800 uppercase">Triwulan I</span>
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {formatRupiah(tw1)}
                                </span>
                              </div>
                              {[
                                { key: "b1" as const, name: "Januari" },
                                { key: "b2" as const, name: "Februari" },
                                { key: "b3" as const, name: "Maret" },
                              ].map((m) => (
                                <div key={m.key} className="space-y-1">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                    {m.name}
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={isCurrentEntityLocked}
                                    value={rek[m.key] || ""}
                                    onChange={(e) =>
                                      handleMonthChange(rek.id, m.key, parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:border-[#991B1B] bg-white shadow-inner disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Triwulan II */}
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                <span className="text-[11px] font-extrabold text-slate-800 uppercase">Triwulan II</span>
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {formatRupiah(tw2)}
                                </span>
                              </div>
                              {[
                                { key: "b4" as const, name: "April" },
                                { key: "b5" as const, name: "Mei" },
                                { key: "b6" as const, name: "Juni" },
                              ].map((m) => (
                                <div key={m.key} className="space-y-1">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                    {m.name}
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={isCurrentEntityLocked}
                                    value={rek[m.key] || ""}
                                    onChange={(e) =>
                                      handleMonthChange(rek.id, m.key, parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:border-[#991B1B] bg-white shadow-inner disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Triwulan III */}
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                <span className="text-[11px] font-extrabold text-slate-800 uppercase">Triwulan III</span>
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {formatRupiah(tw3)}
                                </span>
                              </div>
                              {[
                                { key: "b7" as const, name: "Juli" },
                                { key: "b8" as const, name: "Agustus" },
                                { key: "b9" as const, name: "September" },
                              ].map((m) => (
                                <div key={m.key} className="space-y-1">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                    {m.name}
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={isCurrentEntityLocked}
                                    value={rek[m.key] || ""}
                                    onChange={(e) =>
                                      handleMonthChange(rek.id, m.key, parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:border-[#991B1B] bg-white shadow-inner disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Triwulan IV */}
                            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2.5">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                <span className="text-[11px] font-extrabold text-slate-800 uppercase">Triwulan IV</span>
                                <span className="text-[11px] font-mono font-bold text-slate-700">
                                  {formatRupiah(tw4)}
                                </span>
                              </div>
                              {[
                                { key: "b10" as const, name: "Oktober" },
                                { key: "b11" as const, name: "November" },
                                { key: "b12" as const, name: "Desember" },
                              ].map((m) => (
                                <div key={m.key} className="space-y-1">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                    {m.name}
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    disabled={isCurrentEntityLocked}
                                    value={rek[m.key] || ""}
                                    onChange={(e) =>
                                      handleMonthChange(rek.id, m.key, parseFloat(e.target.value) || 0)
                                    }
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:border-[#991B1B] bg-white shadow-inner disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
