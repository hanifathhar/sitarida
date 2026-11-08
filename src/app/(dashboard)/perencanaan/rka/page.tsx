"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Building2,
  GitBranch,
  Layers,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  FileText,
  UserCheck,
  CheckCircle2,
  Trash2,
  Package,
  Calendar,
  Sparkles,
  DollarSign,
  ChevronRight,
  Check,
  X,
  BookOpen,
  Pencil,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  SlidersHorizontal,
  AlertCircle,
  Lock,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ActionBanner from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface UserItem {
  id: string;
  namaLengkap: string;
  nip: string | null;
  jabatan?: string | null;
  opdId?: string | null;
  unitKerjaId?: string | null;
  role?: {
    id: string;
    kode: string;
    nama: string;
  } | null;
  opd?: {
    id: string;
    kd_skpd: string;
    nm_skpd: string;
  } | null;
  unitKerja?: {
    id: string;
    kd_unit: string;
    nm_unit: string;
  } | null;
}

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

interface ScopeData {
  session: {
    userId: string;
    username: string;
    namaLengkap: string;
    roleNama: string;
    isCrossOpd: boolean;
    levelAkses: "LINTAS_OPD" | "OPD" | "UNIT";
    opdId: string | null;
    unitKerjaId?: string | null;
  };
  opds: OpdItem[];
  units: UnitItem[];
}

interface TrskpdItem {
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
  sasaran_kegiatan: string | null;
  waktu_kegiatan: string | null;
  capaian_kegiatan: string | null;
  lokasi_kegiatan: string | null;
  pptkUserId: string | null;
  pptkNama: string | null;
  pptkNip: string | null;
  totalAnggaran: number;
  totalAnggaran_ubah?: number;
  rekeningCount: number;
}

interface TrdpoItem {
  id: string;
  kd_rek6?: string;
  kd_barang: string | null;
  uraian: string;
  satuan: string;
  satuan_ubah?: string | null;
  volume: number;
  volume_ubah?: number | null;
  harga: number;
  harga_ubah?: number | null;
  total: number;
  total_ubah?: number | null;
  kd_sumdan: string | null;
  catatan: string | null;
  catatan_ubah?: string | null;
}

interface TrdrkaItem {
  id: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  nilai_ubah: number;
  rincianObjek: TrdpoItem[];
}

export interface PlafondControlData {
  hasPlafond: boolean;
  paguMurni: number;
  paguUbah: number;
  totalRkaMurni: number;
  totalRkaUbah: number;
  sisaPaguMurni: number;
  sisaPaguUbah: number;
  persenMurni: number;
  persenUbah: number;
  isLockedMurni?: boolean;
  isLockedUbah?: boolean;
  kd_skpd?: string;
  nm_skpd?: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
}

interface TrskpdDetail extends TrskpdItem {
  totalAnggaran_ubah?: number;
  plafond?: {
    paguMurni: number;
    paguUbah: number;
  } | null;
  plafondControl?: PlafondControlData | null;
  rkaRekening: TrdrkaItem[];
}

export default function RkaWizardPage() {
  // Step state: 1 (OPD) -> 2 (UNIT) -> 3 (SUB KEGIATAN) -> 4 (DETAIL RKA)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // User scope & references
  const [scope, setScope] = useState<ScopeData | null>(null);
  const [loadingScope, setLoadingScope] = useState(true);

  // Selected State
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [tahun, setTahun] = useState(2027);

  // Plafond Control State for active OPD / Unit
  const [opdPlafondControl, setOpdPlafondControl] = useState<PlafondControlData | null>(null);

  // Search State for Step 1 (OPD) and Step 2 (Sub Unit)
  const [searchOpd, setSearchOpd] = useState("");
  const [searchUnit, setSearchUnit] = useState("");

  // Sub Kegiatan List, Search & Pagination (Step 3)
  const [subkegiatanList, setSubkegiatanList] = useState<TrskpdItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchSubkeg, setSearchSubkeg] = useState("");
  const [subkegPage, setSubkegPage] = useState(1);
  const [subkegLimit, setSubkegLimit] = useState(10);
  const [selectedRka, setSelectedRka] = useState<TrskpdDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Master References
  const [programList, setProgramList] = useState<{ id: string; kd_program: string; nm_program: string; kd_urusan?: string }[]>([]);
  const [kegiatanList, setKegiatanList] = useState<{ id: string; programId: string; kd_kegiatan: string; nm_kegiatan: string }[]>([]);
  const [allSubkegiatan, setAllSubkegiatan] = useState<{ id: string; kegiatanId: string; kd_sub_kegiatan: string; nm_sub_kegiatan: string }[]>([]);
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [rek6List, setRek6List] = useState<{ id: string; kd_rek6: string; nm_rek6: string }[]>([]);
  const [rekCategoryFilter, setRekCategoryFilter] = useState<"ALL" | "5" | "4" | "6">("ALL");
  const [sumdanList, setSumdanList] = useState<{ id: string; kd_sumdan: string; nm_sumdan: string }[]>([]);
  const [shsList, setShsList] = useState<{
    id: string;
    jenis: string;
    kd_barang: string | null;
    uraianBarang: string;
    spesifikasi: string | null;
    satuan: string;
    hargaSatuan: number;
  }[]>([]);
  const [shsKlasifikasi, setShsKlasifikasi] = useState<"ALL" | "SSH" | "SBU" | "HSPK" | "ASB">("SSH");

  // Banner
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // Form Modals
  const [showAddSubkegModal, setShowAddSubkegModal] = useState(false);
  const [showAddRekeningModal, setShowAddRekeningModal] = useState(false);
  const [showAddRincianModal, setShowAddRincianModal] = useState(false);
  const [targetRekeningId, setTargetRekeningId] = useState<string | null>(null);

  // Form Fields: Tambah Sub Kegiatan
  const [formProgId, setFormProgId] = useState("");
  const [formKegId, setFormKegId] = useState("");
  const [formSubId, setFormSubId] = useState("");
  const [formPptkId, setFormPptkId] = useState("");
  const [formSasaran, setFormSasaran] = useState("");
  const [formWaktu, setFormWaktu] = useState("");
  const [formCapaian, setFormCapaian] = useState("");
  const [formLokasi, setFormLokasi] = useState("");

  // Form Fields: Edit Sub Kegiatan
  const [showEditSubkegModal, setShowEditSubkegModal] = useState(false);
  const [editingSubkeg, setEditingSubkeg] = useState<TrskpdItem | null>(null);
  const [editFormCapaian, setEditFormCapaian] = useState("");
  const [editFormPptkId, setEditFormPptkId] = useState("");
  const [editFormSasaran, setEditFormSasaran] = useState("");
  const [editFormWaktu, setEditFormWaktu] = useState("");
  const [editFormLokasi, setEditFormLokasi] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Form Fields: Rekening Belanja
  const [formRek6Id, setFormRek6Id] = useState("");
  const [rekSearchQuery, setRekSearchQuery] = useState("");

  // Form Fields: Rincian Obyek SSH
  const [formKdBarang, setFormKdBarang] = useState("");
  const [formUraian, setFormUraian] = useState("");
  const [formSatuan, setFormSatuan] = useState("");
  const [formVolume, setFormVolume] = useState("1");
  const [formHarga, setFormHarga] = useState("");
  const [formSumdan, setFormSumdan] = useState("");
  const [formCatatan, setFormCatatan] = useState("");

  // Mode RKA: Murni (Penyusunan) vs Perubahan vs Komparasi
  const [rkaMode, setRkaMode] = useState<"MURNI" | "PERUBAHAN" | "KOMPARASI">("MURNI");

  // State Hide / Collapse Rincian per Rekening
  const [collapsedRekenings, setCollapsedRekenings] = useState<Record<string, boolean>>({});

  function toggleCollapseRekening(rekId: string) {
    setCollapsedRekenings((prev) => ({
      ...prev,
      [rekId]: !prev[rekId],
    }));
  }

  function toggleCollapseAll(collapse: boolean) {
    if (!selectedRka) return;
    const next: Record<string, boolean> = {};
    selectedRka.rkaRekening.forEach((r) => {
      next[r.id] = collapse;
    });
    setCollapsedRekenings(next);
  }

  // State Modal Edit Nilai Perubahan Rincian
  const [editingRincian, setEditingRincian] = useState<TrdpoItem | null>(null);
  const [editRincianVolUbah, setEditRincianVolUbah] = useState("");
  const [editRincianSatuanUbah, setEditRincianSatuanUbah] = useState("");
  const [editRincianHargaUbah, setEditRincianHargaUbah] = useState("");
  const [editRincianCatatanUbah, setEditRincianCatatanUbah] = useState("");
  const [isSubmittingEditRincian, setIsSubmittingEditRincian] = useState(false);

  function handleOpenEditRincian(item: TrdpoItem) {
    setEditingRincian(item);
    setEditRincianVolUbah(
      item.volume_ubah !== null && item.volume_ubah !== undefined
        ? item.volume_ubah.toString()
        : item.volume.toString()
    );
    setEditRincianSatuanUbah(item.satuan_ubah || item.satuan || "");
    setEditRincianHargaUbah(
      item.harga_ubah !== null && item.harga_ubah !== undefined
        ? item.harga_ubah.toString()
        : item.harga.toString()
    );
    setEditRincianCatatanUbah(item.catatan_ubah || item.catatan || "");
  }

  async function handleEditRincianSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRincian || !selectedRka) return;
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      return;
    }
    setIsSubmittingEditRincian(true);
    try {
      const volUbah = parseFloat(editRincianVolUbah) || 0;
      const hrgUbah = parseFloat(editRincianHargaUbah) || 0;
      const res = await fetch("/api/perencanaan/rka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-rincian",
          id: editingRincian.id,
          volume_ubah: volUbah,
          satuan_ubah: editRincianSatuanUbah,
          harga_ubah: hrgUbah,
          catatan_ubah: editRincianCatatanUbah,
          mode: rkaMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: "Nilai RKA Perubahan berhasil diperbarui." });
        setEditingRincian(null);
        loadRkaDetail(selectedRka.id);
        loadTrskpdList();
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal memperbarui nilai rincian RKA." });
    } finally {
      setIsSubmittingEditRincian(false);
    }
  }

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    type: "subkeg" | "rekening" | "rincian";
    id: string;
    title: string;
    label: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load User Access Scope
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
      } finally {
        setLoadingScope(false);
      }
    }
    fetchScope();
  }, []);

  // Load Global References
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [resP, resK, resS, resU, resR, resSd, resSh] = await Promise.all([
          fetch("/api/master/program?all=true"),
          fetch("/api/master/kegiatan?all=true"),
          fetch("/api/master/subkegiatan?all=true"),
          fetch("/api/users"),
          fetch("/api/master/rekening?level=6&rkaOnly=true&limit=4000"),
          fetch("/api/master/sumber-dana?limit=500"),
          fetch("/api/master/standar-harga?limit=5000"),
        ]);
        const [jP, jK, jS, jU, jR, jSd, jSh] = await Promise.all([
          resP.json(),
          resK.json(),
          resS.json(),
          resU.json(),
          resR.json(),
          resSd.json(),
          resSh.json(),
        ]);

        const extractArray = (res: any): any[] => {
          if (!res || !res.success) return [];
          if (Array.isArray(res.data)) return res.data;
          if (Array.isArray(res.data?.items)) return res.data.items;
          if (Array.isArray(res.items)) return res.items;
          return [];
        };

        setProgramList(extractArray(jP));
        setKegiatanList(extractArray(jK));
        setAllSubkegiatan(extractArray(jS));
        setUserList(extractArray(jU));
        setRek6List(extractArray(jR));
        setSumdanList(extractArray(jSd));
        setShsList(extractArray(jSh));
      } catch (e) {
        console.error("Gagal load referensi master:", e);
      }
    }
    loadMasterData();
  }, []);

  // Load Subkegiatan saat masuk ke Step 3
  async function loadTrskpdList(unitOverride?: UnitItem | null) {
    if (!selectedOpd) return;
    setLoadingList(true);
    try {
      const activeUnit = unitOverride !== undefined ? unitOverride : selectedUnit;
      const params = new URLSearchParams({
        tahun: tahun.toString(),
        opdId: selectedOpd.id,
        limit: "1000",
      });
      if (activeUnit) params.set("unitKerjaId", activeUnit.id);

      const res = await fetch(`/api/perencanaan/rka?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const items = Array.isArray(json.data) ? json.data : (Array.isArray(json.items) ? json.items : []);
        setSubkegiatanList(items);
        if (json.plafondControl) {
          setOpdPlafondControl(json.plafondControl);
        }
      }
    } catch {
      setBanner({ type: "error", message: "Gagal memuat daftar sub kegiatan" });
    } finally {
      setLoadingList(false);
    }
  }

  // Load Detail RKA saat masuk ke Step 4
  async function loadRkaDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/perencanaan/rka?id=${id}`);
      const json = await res.json();
      if (json.success) {
        setSelectedRka(json.data);
        if (json.data?.plafondControl) {
          setOpdPlafondControl(json.data.plafondControl);
        }
      }
    } catch {
      setBanner({ type: "error", message: "Gagal memuat rincian RKA" });
    } finally {
      setLoadingDetail(false);
    }
  }

  // Cascading Filter Program -> Kegiatan -> Sub Kegiatan
  const safePrograms = Array.isArray(programList) ? programList : [];
  const safeKegiatan = Array.isArray(kegiatanList) ? kegiatanList : [];
  const safeSubkegiatan = Array.isArray(allSubkegiatan) ? allSubkegiatan : [];

  const filteredKegiatan = safeKegiatan.filter(
    (k) => k && (!formProgId || k.programId === formProgId)
  );
  const filteredSubkegiatan = safeSubkegiatan.filter(
    (s) => s && (!formKegId || s.kegiatanId === formKegId)
  );

  // Logika pembuatan struktur kd_program, kd_kegiatan, dan kd_sub_kegiatan
  function buildCombinedCodes(
    opdKd: string,
    unitKd: string | null | undefined,
    progKd: string,
    kegKd: string,
    subKd: string
  ) {
    // Jika sudah terkombinasi, jangan kombinasikan lagi
    if (subKd.length > 16) {
      return { kd_program: progKd, kd_kegiatan: kegKd, kd_sub_kegiatan: subKd };
    }

    const urusan = opdKd.substring(0, 4);
    const unit = unitKd || `${opdKd}.00`;

    let kd_program = progKd;
    let kd_kegiatan = kegKd;
    let kd_sub_kegiatan = subKd;

    if (kegKd.substring(0, 4) === "0.00") {
      kd_sub_kegiatan = `${urusan}.${unit}.${subKd.substring(5, 15)}`;
      kd_kegiatan = `${urusan}.${unit}.${subKd.substring(5, 12)}`;
      kd_program = `${urusan}.${unit}.${subKd.substring(5, 7)}`;
    } else {
      kd_sub_kegiatan = `${subKd.substring(0, 4)}.${unit}.${subKd.substring(5, 15)}`;
      kd_kegiatan = `${subKd.substring(0, 4)}.${unit}.${subKd.substring(5, 12)}`;
      kd_program = `${subKd.substring(0, 4)}.${unit}.${subKd.substring(5, 7)}`;
    }

    return { kd_program, kd_kegiatan, kd_sub_kegiatan };
  }

  // Live Combined Code Preview for Tambah Sub Kegiatan Form
  const combinedPreview = useMemo(() => {
    if (!selectedOpd || !formSubId) return null;
    const selProg = safePrograms.find((p) => p.id === formProgId);
    const selKeg = safeKegiatan.find((k) => k.id === formKegId);
    const selSub = safeSubkegiatan.find((s) => s.id === formSubId);
    if (!selSub) return null;
    return buildCombinedCodes(
      selectedOpd.kd_skpd,
      selectedUnit?.kd_unit,
      selProg?.kd_program || "",
      selKeg?.kd_kegiatan || "",
      selSub.kd_sub_kegiatan
    );
  }, [selectedOpd, selectedUnit, formProgId, formKegId, formSubId, safePrograms, safeKegiatan, safeSubkegiatan]);

  // Available units under selected OPD
  const availableUnits = (scope?.units && Array.isArray(scope.units) ? scope.units : []).filter(
    (u) => !selectedOpd || u.opdId === selectedOpd.id
  );

  // Sub Unit saja (mengecualikan unit induk berakhiran .00)
  const availableSubUnits = availableUnits.filter((u) => !u.kd_unit.endsWith(".00"));

  // Filtered OPDs by search
  const filteredOpds = (scope?.opds || []).filter((opd) => {
    if (!searchOpd.trim()) return true;
    const q = searchOpd.toLowerCase();
    return opd.kd_skpd.toLowerCase().includes(q) || opd.nm_skpd.toLowerCase().includes(q);
  });

  // Filtered Sub Units by search
  const filteredSubUnits = availableSubUnits.filter((u) => {
    if (!searchUnit.trim()) return true;
    const q = searchUnit.toLowerCase();
    return u.kd_unit.toLowerCase().includes(q) || u.nm_unit.toLowerCase().includes(q);
  });

  // Filtered & Paginated Sub Kegiatan for Step 3
  const filteredSubkegiatanList = useMemo(() => {
    const list = Array.isArray(subkegiatanList) ? subkegiatanList : [];
    if (!searchSubkeg.trim()) return list;
    const q = searchSubkeg.toLowerCase().trim();
    return list.filter((item) => {
      const matchKode = item.kd_sub_kegiatan?.toLowerCase().includes(q);
      const matchNama = item.nm_sub_kegiatan?.toLowerCase().includes(q);
      const matchPptk = item.pptkNama?.toLowerCase().includes(q);
      const matchCapaian = item.capaian_kegiatan?.toLowerCase().includes(q);
      const matchProg = item.nm_program?.toLowerCase().includes(q);
      const matchKeg = item.nm_kegiatan?.toLowerCase().includes(q);
      return matchKode || matchNama || matchPptk || matchCapaian || matchProg || matchKeg;
    });
  }, [subkegiatanList, searchSubkeg]);

  const totalSubkegPages = Math.max(1, Math.ceil(filteredSubkegiatanList.length / subkegLimit));
  const safeSubkegPage = Math.min(Math.max(1, subkegPage), totalSubkegPages);

  const paginatedSubkegiatanList = useMemo(() => {
    const start = (safeSubkegPage - 1) * subkegLimit;
    return filteredSubkegiatanList.slice(start, start + subkegLimit);
  }, [filteredSubkegiatanList, safeSubkegPage, subkegLimit]);

  // Filtered Rekening by Akun Category (Pendapatan 4, Belanja 5, Pembiayaan 6)
  const displayedRek6List = React.useMemo(() => {
    const list = Array.isArray(rek6List) ? rek6List : [];
    const baseList = list.filter((r) => ["4", "5", "6"].includes(r.kd_rek6?.[0]));
    if (rekCategoryFilter === "ALL") return baseList;
    return baseList.filter((r) => r.kd_rek6?.startsWith(rekCategoryFilter));
  }, [rek6List, rekCategoryFilter]);

  const filteredRek6List = React.useMemo(() => {
    const q = rekSearchQuery.trim().toLowerCase();
    if (!q) return displayedRek6List;
    return displayedRek6List.filter(
      (r) =>
        r.kd_rek6.toLowerCase().includes(q) ||
        r.nm_rek6.toLowerCase().includes(q)
    );
  }, [displayedRek6List, rekSearchQuery]);

  const rek6Options = React.useMemo(() => {
    return displayedRek6List.map((r) => {
      const isPendapatan = r.kd_rek6.startsWith("4");
      const isBelanja = r.kd_rek6.startsWith("5");
      const isPembiayaan = r.kd_rek6.startsWith("6");

      let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
      let subLabel = "Rekening";
      if (isPendapatan) {
        badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300";
        subLabel = "Akun 4 — Pendapatan Daerah";
      } else if (isBelanja) {
        badgeColor = "bg-rose-50 text-[#991B1B] border-rose-300";
        subLabel = "Akun 5 — Belanja Daerah";
      } else if (isPembiayaan) {
        badgeColor = "bg-sky-50 text-sky-800 border-sky-300";
        subLabel = "Akun 6 — Pembiayaan Daerah";
      }

      return {
        value: r.id,
        label: r.nm_rek6,
        badge: r.kd_rek6,
        badgeColor,
        subLabel,
      };
    });
  }, [displayedRek6List]);

  const selectedRekeningObj = React.useMemo(() => {
    if (!formRek6Id) return null;
    return (Array.isArray(rek6List) ? rek6List : []).find((r) => r.id === formRek6Id) || null;
  }, [rek6List, formRek6Id]);

  // Set kode rekening yang sudah terdaftar pada Sub Kegiatan saat ini
  const existingRekKodes = React.useMemo(() => {
    if (!selectedRka?.rkaRekening) return new Set<string>();
    return new Set(selectedRka.rkaRekening.map((r) => r.kd_rek6));
  }, [selectedRka]);

  // Filtered Standar Harga by Klasifikasi (SSH, SBU/HSB, HSPK, ASB)
  const filteredShsList = React.useMemo(() => {
    const list = Array.isArray(shsList) ? shsList : [];
    if (shsKlasifikasi === "ALL") return list;
    return list.filter((s) => s.jenis === shsKlasifikasi);
  }, [shsList, shsKlasifikasi]);

  // Live total calculation for Rincian Barang form
  const rincianVolumeNum = parseFloat(formVolume) || 0;
  const rincianHargaNum = parseFloat(formHarga) || 0;
  const calculatedRincianTotal = rincianVolumeNum * rincianHargaNum;

  // Target Rekening Object for Modal 3
  const targetRekeningObj = React.useMemo(() => {
    if (!targetRekeningId || !selectedRka) return null;
    return selectedRka.rkaRekening?.find((r) => r.id === targetRekeningId) || null;
  }, [selectedRka, targetRekeningId]);

  // Check whether formKdBarang already exists in targetRekeningObj
  const isDuplicateRincianKdBarang = React.useMemo(() => {
    if (!formKdBarang || !targetRekeningObj?.rincianObjek) return false;
    const targetKd = formKdBarang.trim().toLowerCase();
    return targetRekeningObj.rincianObjek.some(
      (obj) => obj.kd_barang && obj.kd_barang.trim().toLowerCase() === targetKd
    );
  }, [formKdBarang, targetRekeningObj]);

  const shsOptions = React.useMemo(() => {
    const existingKodes = new Set(
      (targetRekeningObj?.rincianObjek || [])
        .map((o) => o.kd_barang?.trim().toLowerCase())
        .filter(Boolean)
    );

    return filteredShsList.map((s) => {
      let badgeColor = "bg-amber-50 text-amber-800 border-amber-300";
      if (s.jenis === "SBU") badgeColor = "bg-indigo-50 text-indigo-800 border-indigo-300";
      if (s.jenis === "HSPK") badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300";
      if (s.jenis === "ASB") badgeColor = "bg-purple-50 text-purple-800 border-purple-300";

      const isAlreadyAdded = s.kd_barang ? existingKodes.has(s.kd_barang.trim().toLowerCase()) : false;

      return {
        value: s.id,
        label: `${s.uraianBarang}${isAlreadyAdded ? " (Sudah Ditambahkan)" : ""}`,
        badge: isAlreadyAdded ? "Terdaftar" : s.kd_barang || s.satuan,
        badgeColor: isAlreadyAdded ? "bg-red-100 text-red-800 border-red-300 font-bold" : badgeColor,
        subLabel: `[${s.jenis === "SBU" ? "SBU / HSB" : s.jenis}] Satuan: ${s.satuan} • Rp ${Number(s.hargaSatuan).toLocaleString("id-ID")}${s.spesifikasi ? ` • ${s.spesifikasi}` : ""
          }${isAlreadyAdded ? " • [PERINGATAN: Barang ini sudah ada di rekening]" : ""}`,
      };
    });
  }, [filteredShsList, targetRekeningObj]);

  const targetSubTotalMurni = React.useMemo(() => {
    if (!targetRekeningObj) return 0;
    return (
      targetRekeningObj.rincianObjek?.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0) ||
      Number(targetRekeningObj.nilai) ||
      0
    );
  }, [targetRekeningObj]);

  const targetSubTotalUbah = React.useMemo(() => {
    if (!targetRekeningObj) return 0;
    return (
      targetRekeningObj.rincianObjek?.reduce((acc, curr) => acc + (Number(curr.total_ubah ?? curr.total) || 0), 0) ||
      Number(targetRekeningObj.nilai_ubah ?? targetRekeningObj.nilai) ||
      0
    );
  }, [targetRekeningObj]);

  const editingRekeningObj = React.useMemo(() => {
    if (!editingRincian || !selectedRka) return null;
    return selectedRka.rkaRekening?.find((r) => r.rincianObjek?.some((o) => o.id === editingRincian.id)) || null;
  }, [editingRincian, selectedRka]);

  // Plafond Lock State: Kontrol Penguncian Input RKA dari Plafond Anggaran
  const isCurrentModeLocked = React.useMemo(() => {
    if (!opdPlafondControl) return false;
    return rkaMode === "PERUBAHAN"
      ? Boolean(opdPlafondControl.isLockedUbah)
      : Boolean(opdPlafondControl.isLockedMurni);
  }, [opdPlafondControl, rkaMode]);

  const currentLockMessage = React.useMemo(() => {
    if (!isCurrentModeLocked) return "";
    const label = rkaMode === "PERUBAHAN" ? "RKA Perubahan" : "RKA Penyusunan (Murni)";
    return `Penginputan & pengubahan ${label} untuk OPD ini telah DIKUNCI.`;
  }, [isCurrentModeLocked, rkaMode]);

  // Active Plafond Limits for active OPD / Unit
  const activeSisaPlafond = React.useMemo(() => {
    if (!opdPlafondControl || !opdPlafondControl.hasPlafond) return Infinity;
    return rkaMode === "PERUBAHAN" ? opdPlafondControl.sisaPaguUbah : opdPlafondControl.sisaPaguMurni;
  }, [opdPlafondControl, rkaMode]);

  const activePaguPlafond = React.useMemo(() => {
    if (!opdPlafondControl || !opdPlafondControl.hasPlafond) return 0;
    return rkaMode === "PERUBAHAN" ? opdPlafondControl.paguUbah : opdPlafondControl.paguMurni;
  }, [opdPlafondControl, rkaMode]);

  // Rekening Belanja Check: Plafond hanya mengikat pada belanja (akun diawali dengan '5')
  // Rekening Pendapatan ('4') dan Pembiayaan ('6') bebas dari batasan plafond
  const isTargetRekeningBelanja = React.useMemo(() => {
    if (!targetRekeningObj || !targetRekeningObj.kd_rek6) return true;
    return targetRekeningObj.kd_rek6.trim().startsWith("5");
  }, [targetRekeningObj]);

  const isEditingRekeningBelanja = React.useMemo(() => {
    const kd = editingRekeningObj?.kd_rek6 || editingRincian?.kd_rek6;
    if (!kd) return true;
    return kd.trim().startsWith("5");
  }, [editingRekeningObj, editingRincian]);

  // Check whether adding rincian item exceeds Plafond (Hanya berlaku untuk Belanja)
  const isRincianExceedingPlafond = React.useMemo(() => {
    if (!isTargetRekeningBelanja) return false;
    if (!opdPlafondControl || !opdPlafondControl.hasPlafond) return false;
    if (rkaMode === "PERUBAHAN") {
      if (opdPlafondControl.paguUbah <= 0) return false;
      return calculatedRincianTotal > opdPlafondControl.sisaPaguUbah;
    } else {
      if (opdPlafondControl.paguMurni <= 0) return false;
      return calculatedRincianTotal > opdPlafondControl.sisaPaguMurni;
    }
  }, [isTargetRekeningBelanja, opdPlafondControl, rkaMode, calculatedRincianTotal]);

  // Delta Ubah when editing rincian in RKA Perubahan
  const editDeltaUbah = React.useMemo(() => {
    if (!editingRincian) return 0;
    const volU = parseFloat(editRincianVolUbah) || 0;
    const hrgU = parseFloat(editRincianHargaUbah) || 0;
    const totU = volU * hrgU;
    const oldTotUbah = editingRincian.total_ubah ?? editingRincian.total ?? 0;
    return totU - oldTotUbah;
  }, [editingRincian, editRincianVolUbah, editRincianHargaUbah]);

  // Check whether editing rincian item exceeds Plafond Ubah (Hanya berlaku untuk Belanja)
  const isEditRincianExceedingPlafond = React.useMemo(() => {
    if (!isEditingRekeningBelanja) return false;
    if (!opdPlafondControl || !opdPlafondControl.hasPlafond) return false;
    if (opdPlafondControl.paguUbah <= 0) return false;
    return editDeltaUbah > opdPlafondControl.sisaPaguUbah;
  }, [isEditingRekeningBelanja, opdPlafondControl, editDeltaUbah]);

  // -------------------------------------------------------------
  // Filter Pilihan PPTK sesuai OPD & Unit terkait dengan Role PPTK
  // -------------------------------------------------------------
  const availablePptkForForm = React.useMemo(() => {
    if (!selectedOpd) return [];

    const filtered = (Array.isArray(userList) ? userList : []).filter((u) => {
      // 1. Role harus PPTK (kode === "9" atau nama role / jabatan mengandung "PPTK")
      const isPptkRole =
        u.role?.kode === "9" ||
        u.role?.nama?.trim().toUpperCase() === "PPTK" ||
        u.role?.nama?.toUpperCase().includes("PPTK") ||
        u.jabatan?.toUpperCase().includes("PPTK");

      if (!isPptkRole) return false;

      // 2. OPD harus sesuai dengan selectedOpd.id
      if (u.opdId && u.opdId !== selectedOpd.id) return false;

      // 3. Jika unit kerja dipilih, hanya tampilkan user pada unit tersebut atau induk SKPD (unitKerjaId null)
      if (selectedUnit && u.unitKerjaId && u.unitKerjaId !== selectedUnit.id) {
        return false;
      }

      return true;
    });

    // Pastikan jika formPptkId sudah terpilih sebelumnya tetap muncul di list
    if (formPptkId && !filtered.some((u) => u.id === formPptkId)) {
      const existing = userList.find((u) => u.id === formPptkId);
      if (existing) return [existing, ...filtered];
    }

    return filtered;
  }, [userList, selectedOpd, selectedUnit, formPptkId]);

  const availablePptkForEdit = React.useMemo(() => {
    const targetOpdId = editingSubkeg?.opdId || selectedOpd?.id;
    const targetUnitId = editingSubkeg?.unitKerjaId || selectedUnit?.id;

    if (!targetOpdId) return [];

    const filtered = (Array.isArray(userList) ? userList : []).filter((u) => {
      // 1. Role harus PPTK
      const isPptkRole =
        u.role?.kode === "9" ||
        u.role?.nama?.trim().toUpperCase() === "PPTK" ||
        u.role?.nama?.toUpperCase().includes("PPTK") ||
        u.jabatan?.toUpperCase().includes("PPTK");

      if (!isPptkRole) return false;

      // 2. OPD harus sesuai
      if (u.opdId && u.opdId !== targetOpdId) return false;

      // 3. Unit filter jika ada
      if (targetUnitId && u.unitKerjaId && u.unitKerjaId !== targetUnitId) {
        return false;
      }

      return true;
    });

    if (editFormPptkId && !filtered.some((u) => u.id === editFormPptkId)) {
      const existing = userList.find((u) => u.id === editFormPptkId);
      if (existing) return [existing, ...filtered];
    }

    return filtered;
  }, [userList, editingSubkeg, selectedOpd, selectedUnit, editFormPptkId]);

  // Handler Step Transitions
  function handleSelectAndNextOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setBanner(null);
    setCurrentStep(2);
  }

  function handleSelectAndNextUnit(unit: UnitItem | null) {
    setSelectedUnit(unit);
    setBanner(null);
    setSearchSubkeg("");
    setSubkegPage(1);
    setCurrentStep(3);
    loadTrskpdList(unit);
  }

  function handleNextFromOpd() {
    if (!selectedOpd) {
      setBanner({ type: "error", message: "Silakan pilih salah satu OPD terlebih dahulu." });
      return;
    }
    setBanner(null);
    setCurrentStep(2);
  }

  function handleNextFromUnit() {
    // Unit boleh dipilih atau boleh unit induk utama
    setBanner(null);
    setSearchSubkeg("");
    setSubkegPage(1);
    setCurrentStep(3);
    loadTrskpdList();
  }

  function handleOpenRkaDetail(item: TrskpdItem) {
    setBanner(null);
    loadRkaDetail(item.id);
    setCurrentStep(4);
  }

  // Submit Tambah Sub Kegiatan
  async function handleAddSubkegiatanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      return;
    }
    if (!selectedOpd || !formProgId || !formKegId || !formSubId) {
      setBanner({ type: "error", message: "Lengkapi pilihan program, kegiatan, dan sub kegiatan." });
      return;
    }

    const selProg = safePrograms.find((p) => p.id === formProgId);
    const selKeg = safeKegiatan.find((k) => k.id === formKegId);
    const selSub = safeSubkegiatan.find((s) => s.id === formSubId);

    if (!selProg || !selKeg || !selSub) return;

    const combined = buildCombinedCodes(
      selectedOpd.kd_skpd,
      selectedUnit?.kd_unit,
      selProg.kd_program,
      selKeg.kd_kegiatan,
      selSub.kd_sub_kegiatan
    );

    try {
      const res = await fetch("/api/perencanaan/rka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran: tahun,
          opdId: selectedOpd.id,
          unitKerjaId: selectedUnit ? selectedUnit.id : null,
          kd_program: combined.kd_program,
          nm_program: selProg.nm_program,
          kd_kegiatan: combined.kd_kegiatan,
          nm_kegiatan: selKeg.nm_kegiatan,
          kd_sub_kegiatan: combined.kd_sub_kegiatan,
          nm_sub_kegiatan: selSub.nm_sub_kegiatan,
          sasaran_kegiatan: formSasaran,
          waktu_kegiatan: formWaktu,
          capaian_kegiatan: formCapaian,
          lokasi_kegiatan: formLokasi,
          pptkUserId: formPptkId || null,
          mode: rkaMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: json.message });
        setShowAddSubkegModal(false);
        setFormSasaran("");
        setFormWaktu("");
        setFormCapaian("");
        setFormLokasi("");
        loadTrskpdList();
        // Langsung masuk ke detail pengisian RKA
        if (json.data?.id) {
          handleOpenRkaDetail(json.data);
        }
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal menyimpan Sub Kegiatan" });
    }
  }

  // Buka Modal Edit Sub Kegiatan
  function handleOpenEditSubkeg(item: TrskpdItem) {
    setEditingSubkeg(item);
    setEditFormCapaian(item.capaian_kegiatan || "");
    setEditFormPptkId(item.pptkUserId || "");
    setEditFormSasaran(item.sasaran_kegiatan || "");
    setEditFormWaktu(item.waktu_kegiatan || "");
    setEditFormLokasi(item.lokasi_kegiatan || "");
    setShowEditSubkegModal(true);
  }

  // Submit Edit Sub Kegiatan (Capaian Target & PPTK)
  async function handleEditSubkegSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSubkeg) return;
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      return;
    }
    setIsSubmittingEdit(true);

    try {
      const res = await fetch("/api/perencanaan/rka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-subkeg",
          id: editingSubkeg.id,
          capaian_kegiatan: editFormCapaian || null,
          pptkUserId: editFormPptkId || null,
          sasaran_kegiatan: editFormSasaran || null,
          waktu_kegiatan: editFormWaktu || null,
          lokasi_kegiatan: editFormLokasi || null,
          mode: rkaMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: json.message });
        setShowEditSubkegModal(false);
        setEditingSubkeg(null);
        loadTrskpdList();
        if (selectedRka?.id === editingSubkeg.id) {
          loadRkaDetail(editingSubkeg.id);
        }
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal memperbarui Sub Kegiatan" });
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  // Submit Tambah Rekening Belanja
  async function handleAddRekeningSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedRka || !formRek6Id) return;
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      return;
    }
    const selRek = rek6List.find((r) => r.id === formRek6Id);
    if (!selRek) return;

    // Validasi duplikasi rekening dalam 1 sub kegiatan
    if (existingRekKodes.has(selRek.kd_rek6)) {
      setBanner({
        type: "error",
        message: `Rekening [${selRek.kd_rek6}] ${selRek.nm_rek6} sudah terdaftar pada Sub Kegiatan ini.`,
      });
      return;
    }

    try {
      const res = await fetch("/api/perencanaan/rka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-rekening",
          trskpdId: selectedRka.id,
          kd_rek6: selRek.kd_rek6,
          nm_rek6: selRek.nm_rek6,
          mode: rkaMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: json.message });
        setShowAddRekeningModal(false);
        setFormRek6Id("");
        setRekSearchQuery("");
        loadRkaDetail(selectedRka.id);
        loadTrskpdList();
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal menambahkan rekening" });
    }
  }

  // Submit Tambah Rincian Barang
  async function handleAddRincianSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetRekeningId || !selectedRka) return;
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      return;
    }

    try {
      const res = await fetch("/api/perencanaan/rka", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-rincian",
          trdrkaId: targetRekeningId,
          kd_barang: formKdBarang || null,
          uraian: formUraian,
          satuan: formSatuan,
          volume: parseFloat(formVolume) || 1,
          harga: parseFloat(formHarga) || 0,
          kd_sumdan: formSumdan || null,
          catatan: formCatatan || null,
          mode: rkaMode,
          rkaMode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: json.message });
        setShowAddRincianModal(false);
        setFormKdBarang("");
        setFormUraian("");
        setFormSatuan("");
        setFormVolume("1");
        setFormHarga("");
        setFormSumdan("");
        setFormCatatan("");
        loadRkaDetail(selectedRka.id);
        loadTrskpdList();
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal menambahkan rincian" });
    }
  }

  // Delete Execution
  async function handleDeleteConfirm() {
    if (!deleteDialog) return;
    if (isCurrentModeLocked) {
      setBanner({ type: "error", message: currentLockMessage });
      setDeleteDialog(null);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/perencanaan/rka?type=${deleteDialog.type}&id=${deleteDialog.id}&mode=${rkaMode}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", message: json.message });
        setDeleteDialog(null);
        if (deleteDialog.type === "subkeg") {
          loadTrskpdList();
          if (selectedRka?.id === deleteDialog.id) {
            setSelectedRka(null);
            setCurrentStep(3);
          }
        } else if (selectedRka) {
          loadRkaDetail(selectedRka.id);
          loadTrskpdList();
        }
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal menghapus data" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {banner && <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />}

      {/* Header Wizard & Progress Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#5E0E14] text-white">
                <FileText className="w-5 h-5" />
              </span>
              <span>Rencana Kerja & Anggaran (RKA-SKPD)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Alur perencanaan bertahap: Pilih OPD ➔ Pilih Unit ➔ Sub Kegiatan & PPTK ➔ Rincian Belanja (SSH)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#5E0E14] text-xs font-extrabold shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-[#991B1B]" />
              <span>TAHUN ANGGARAN {tahun}</span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            { step: 1, label: "1. Pilih OPD", icon: Building2 },
            { step: 2, label: "2. Pilih Unit", icon: GitBranch },
            { step: 3, label: "3. Sub Kegiatan & PPTK", icon: Layers },
            { step: 4, label: "4. Pengisian RKA (SSH)", icon: DollarSign },
          ].map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            const IconComponent = s.icon;
            return (
              <button
                key={s.step}
                type="button"
                disabled={s.step > currentStep && (!selectedOpd || (s.step === 3 && !selectedUnit))}
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
                    {s.step === 3 && `${subkegiatanList.length} Kegiatan`}
                    {s.step === 4 && (selectedRka ? selectedRka.kd_sub_kegiatan : "Belum aktif")}
                  </div>
                </div>
              </button>
            );
          })}
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
            <div className="py-12 text-center text-xs text-slate-400">Memeriksa hak akses OPD...</div>
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
                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected
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
      {currentStep === 2 && (
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
      {/* TAHAP 3: TAMBAH & KELOLA SUB KEGIATAN & PPTK (TRSKPD)          */}
      {/* ============================================================== */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Bar Info Entitas Aktif */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#5E0E14] text-white">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Entitas Perencanaan Terpilih:
                </span>
                <div className="text-sm font-extrabold text-slate-900">
                  [{selectedOpd?.kd_skpd}] {selectedOpd?.nm_skpd}
                  {selectedUnit && (
                    <span className="text-emerald-700 ml-2">↳ [{selectedUnit.kd_unit}] {selectedUnit.nm_unit}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ganti Unit / OPD</span>
              </button>
              <button
                type="button"
                disabled={isCurrentModeLocked}
                onClick={() => {
                  if (isCurrentModeLocked) return;
                  setShowAddSubkegModal(true);
                }}
                title={isCurrentModeLocked ? currentLockMessage : "Tambah Sub Kegiatan"}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${isCurrentModeLocked
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                  : "bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white hover:from-[#46090E] hover:to-[#7F1D1D] cursor-pointer"
                  }`}
              >
                {isCurrentModeLocked ? <Lock className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4" />}
                <span>Tambah Sub Kegiatan</span>
              </button>
            </div>
          </div>

          {/* Banner Peringatan Jika Mode RKA Saat Ini Sedang Terkunci */}
          {isCurrentModeLocked && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 flex items-start sm:items-center gap-3 shadow-xs">
              <span className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5 sm:mt-0">
                <Lock className="w-5 h-5" />
              </span>
              <div className="flex-1 text-xs">
                <div className="font-extrabold uppercase tracking-wide text-red-950 flex items-center gap-2">
                  <span>{rkaMode === "PERUBAHAN" ? "RKA PERUBAHAN" : "RKA PENYUSUNAN (MURNI)"} TELAH DIKUNCI</span>
                </div>
                <p className="mt-0.5 text-red-800">
                  {currentLockMessage}
                </p>
              </div>
            </div>
          )}

          {/* Kontrol Plafond Anggaran OPD TA Terpilih */}
          {opdPlafondControl && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-700/80 gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-2">
                      <span>Plafond Belanja TA {tahun}</span>
                    </h3>
                  </div>
                </div>
                {/* Tombol Pemilih Mode RKA */}
                <div className="flex items-center bg-slate-900/95 p-1 rounded-xl border border-slate-700/80 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setRkaMode("MURNI")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${rkaMode === "MURNI"
                      ? "bg-[#991B1B] text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                      }`}
                  >
                    <span>RKA Penyusunan (Murni)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRkaMode("PERUBAHAN")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${rkaMode === "PERUBAHAN"
                      ? "bg-[#991B1B] text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                      }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>RKA Perubahan</span>
                  </button>
                </div>
              </div>

              {opdPlafondControl.hasPlafond ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Kolom 1: Pagu Plafond Murni (Penyusunan) */}
                  <div
                    className={`p-4 rounded-xl border transition ${rkaMode === "MURNI"
                      ? "bg-slate-800/90 border-[#991B1B]/70 ring-2 ring-[#991B1B]/40"
                      : "bg-slate-800/40 border-slate-700/60"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Pagu Plafond Belanja Murni (Penyusunan)
                        </span>
                      </div>
                      {rkaMode === "MURNI" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#991B1B] text-white">
                          Mode Aktif
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Plafond Belanja</span>
                        <span className="text-xs font-bold text-white font-mono">
                          {formatRupiah(opdPlafondControl.paguMurni)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Terpakai (Belanja)</span>
                        <span className="text-xs font-bold text-amber-300 font-mono">
                          {formatRupiah(opdPlafondControl.totalRkaMurni)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sisa Plafond</span>
                        <span
                          className={`text-xs font-bold font-mono ${opdPlafondControl.sisaPaguMurni < 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                            }`}
                        >
                          {formatRupiah(opdPlafondControl.sisaPaguMurni)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Murni */}
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${opdPlafondControl.persenMurni > 100
                            ? "bg-rose-500"
                            : opdPlafondControl.persenMurni > 90
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, opdPlafondControl.persenMurni))}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Realisasi Plafond Belanja: {opdPlafondControl.persenMurni.toFixed(1)}%</span>
                        <span>
                          {opdPlafondControl.sisaPaguMurni < 0 ? (
                            <strong className="text-rose-400">⚠️ Melebihi Plafond!</strong>
                          ) : (
                            <span className="text-emerald-400">Tersedia Aman</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kolom 2: Pagu Plafond Perubahan */}
                  <div
                    className={`p-4 rounded-xl border transition ${rkaMode === "PERUBAHAN"
                      ? "bg-slate-800/90 border-amber-500/70 ring-2 ring-amber-500/40"
                      : "bg-slate-800/40 border-slate-700/60"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Pagu Plafond Belanja Perubahan
                        </span>
                      </div>
                      {rkaMode === "PERUBAHAN" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white">
                          Mode Aktif
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Plafond Belanja</span>
                        <span className="text-xs font-bold text-white font-mono">
                          {formatRupiah(opdPlafondControl.paguUbah)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Terpakai (Belanja)</span>
                        <span className="text-xs font-bold text-amber-300 font-mono">
                          {formatRupiah(opdPlafondControl.totalRkaUbah)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Sisa Plafond</span>
                        <span
                          className={`text-xs font-bold font-mono ${opdPlafondControl.sisaPaguUbah < 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                            }`}
                        >
                          {formatRupiah(opdPlafondControl.sisaPaguUbah)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Perubahan */}
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${opdPlafondControl.persenUbah > 100
                            ? "bg-rose-500"
                            : opdPlafondControl.persenUbah > 90
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, opdPlafondControl.persenUbah))}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Realisasi Plafond Belanja: {opdPlafondControl.persenUbah.toFixed(1)}%</span>
                        <span>
                          {opdPlafondControl.sisaPaguUbah < 0 ? (
                            <strong className="text-rose-400">⚠️ Melebihi Plafond!</strong>
                          ) : (
                            <span className="text-emerald-400">Tersedia Aman</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-center justify-between">
                  <span>Plafond Anggaran untuk OPD ini belum diset pada menu Pengaturan Plafond Anggaran.</span>
                  <span className="text-amber-400 font-semibold text-[11px]">Tidak Ada Batasan Pagu</span>
                </div>
              )}
            </div>
          )}

          {/* Tabel Sub Kegiatan RKA */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Daftar Sub Kegiatan
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih salah satu sub kegiatan untuk masuk ke lembar pengisian rekening &amp; rincian barang (SSH)
                </p>
              </div>

              {/* Toolbar: Mode RKA (Penyusunan / Perubahan / Komparasi) & Fitur Pencarian */}
              <div className="flex flex-wrap items-center gap-2.5">


                {/* Input Pencarian */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchSubkeg}
                    onChange={(e) => {
                      setSearchSubkeg(e.target.value);
                      setSubkegPage(1);
                    }}
                    placeholder="Cari kode, nama, PPTK..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 bg-white transition shadow-xs"
                  />
                  {searchSubkeg && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchSubkeg("");
                        setSubkegPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 border-r border-[#7B111A]/60 w-10 text-center">No</th>
                    <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-36">Kode Sub Kegiatan</th>
                    <th className="py-3 px-4 border-r border-[#7B111A]/60 min-w-[220px]">Nomenklatur Sub Kegiatan</th>
                    <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-36">Nama PPTK</th>
                    <th
                      className={`py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-36 transition ${rkaMode === "MURNI" ? "bg-[#7B111A] text-amber-300" : ""
                        }`}
                    >
                      RKA Penyusunan
                    </th>
                    <th
                      className={`py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-36 transition ${rkaMode === "PERUBAHAN" ? "bg-[#7B111A] text-amber-300" : ""
                        }`}
                    >
                      RKA Perubahan
                    </th>
                    <th
                      className={`py-3 px-3.5 border-r border-[#7B111A]/60 text-right w-32 transition ${rkaMode === "KOMPARASI" ? "bg-[#7B111A] text-amber-300" : ""
                        }`}
                    >
                      Selisih (+/-)
                    </th>
                    <th className="py-3 px-3 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingList ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Memuat daftar sub kegiatan...
                      </td>
                    </tr>
                  ) : subkegiatanList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Belum ada sub kegiatan RKA pada entitas ini. Klik tombol "Tambah Sub Kegiatan" di atas.
                      </td>
                    </tr>
                  ) : filteredSubkegiatanList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="space-y-2">
                          <p>
                            Tidak ada sub kegiatan yang sesuai dengan kata kunci &ldquo;<b className="text-slate-800">{searchSubkeg}</b>&rdquo;.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchSubkeg("");
                              setSubkegPage(1);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                          >
                            <X className="w-3.5 h-3.5 text-slate-400" />
                            <span>Reset Pencarian</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSubkegiatanList.map((item, idx) => {
                      const rowNum = (safeSubkegPage - 1) * subkegLimit + idx + 1;
                      const murni = Number(item.totalAnggaran || 0);
                      const ubah = Number(item.totalAnggaran_ubah ?? murni);
                      const selisih = ubah - murni;

                      return (
                        <tr key={item.id} className="hover:bg-amber-50/30 odd:bg-white even:bg-slate-50/50">
                          <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">{rowNum}</td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-[#88131A] whitespace-nowrap">
                            {item.kd_sub_kegiatan}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 leading-snug">{item.nm_sub_kegiatan}</div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {item.pptkNama ? (
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{item.pptkNama}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Belum ditunjuk</span>
                            )}
                          </td>

                          {/* Nilai Penyusunan (Murni) */}
                          <td
                            className={`py-2.5 px-3.5 text-right font-mono whitespace-nowrap ${rkaMode === "MURNI"
                              ? "bg-amber-50/70 font-black text-slate-900"
                              : "font-semibold text-slate-700"
                              }`}
                          >
                            {formatRupiah(murni)}
                          </td>

                          {/* Nilai Perubahan */}
                          <td
                            className={`py-2.5 px-3.5 text-right font-mono whitespace-nowrap ${rkaMode === "PERUBAHAN"
                              ? "bg-amber-50/70 font-black text-amber-900"
                              : "font-semibold text-slate-800"
                              }`}
                          >
                            {formatRupiah(ubah)}
                          </td>

                          {/* Selisih */}
                          <td className="py-2.5 px-3.5 text-right font-mono whitespace-nowrap">
                            {selisih === 0 ? (
                              <span className="text-slate-400 font-medium">Rp 0</span>
                            ) : selisih > 0 ? (
                              <span className="text-emerald-700 font-bold">+{formatRupiah(selisih)}</span>
                            ) : (
                              <span className="text-rose-700 font-bold">{formatRupiah(selisih)}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenRkaDetail(item)}
                                title="Buka Pengisian RKA (Rekening & SSH)"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#5E0E14] text-white text-[11px] font-bold hover:bg-[#46090E] transition cursor-pointer shadow-xs"
                              >
                                <span>Detail</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isCurrentModeLocked}
                                onClick={() => {
                                  if (isCurrentModeLocked) return;
                                  handleOpenEditSubkeg(item);
                                }}
                                title={isCurrentModeLocked ? currentLockMessage : "Edit Target Capaian & PPTK"}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition ${isCurrentModeLocked
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                                  : "bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                                  }`}
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              {isCurrentModeLocked ? (
                                <span
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                  title={currentLockMessage}
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                </span>
                              ) : rkaMode === "PERUBAHAN" && Number(item.totalAnggaran) > 0 ? (
                                <span
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                  title="Sub kegiatan dari tahap Penyusunan (Murni) terkunci dan tidak boleh dihapus pada RKA Perubahan."
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteDialog({
                                      type: "subkeg",
                                      id: item.id,
                                      title: "Hapus Sub Kegiatan RKA",
                                      label: item.nm_sub_kegiatan,
                                    })
                                  }
                                  title="Hapus Sub Kegiatan"
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-xs cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {!loadingList && filteredSubkegiatanList.length > 0 && (
              <PaginationBar
                page={safeSubkegPage}
                totalPages={totalSubkegPages}
                total={filteredSubkegiatanList.length}
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
      {/* TAHAP 4: PENGISIAN RKA (REKENING BELANJA & RINCIAN BARANG SSH) */}
      {/* ============================================================== */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-in fade-in">
          {/* Header Sub Kegiatan Aktif (Berjenjang: Program -> Kegiatan -> Sub Kegiatan, Info Kinerja & Pagu) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
            {/* Top Toolbar: Kembali & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold cursor-pointer transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar Sub Kegiatan</span>
              </button>
            </div>

            {/* Main Content: Hierarki Berjenjang (Kiri) & Pagu / Total Anggaran (Kanan) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Kiri: Hierarki Program -> Kegiatan -> Sub Kegiatan Berjenjang */}
              <div className="lg:col-span-8 space-y-3">
                <div className="space-y-2 relative pl-2.5 border-l-2 border-amber-500/30">
                  {/* Level 1: Program */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800/80 shrink-0">
                      PROGRAM
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-amber-300 mr-2">
                        {selectedRka?.kd_program}
                      </span>
                      <span className="text-xs text-slate-300 font-medium leading-relaxed">
                        {selectedRka?.nm_program}
                      </span>
                    </div>
                  </div>

                  {/* Level 2: Kegiatan */}
                  <div className="flex items-start gap-2.5 pl-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-sky-950/80 text-sky-300 border border-sky-800/80 shrink-0">
                      KEGIATAN
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-amber-300 mr-2">
                        {selectedRka?.kd_kegiatan}
                      </span>
                      <span className="text-xs text-slate-300 font-medium leading-relaxed">
                        {selectedRka?.nm_kegiatan}
                      </span>
                    </div>
                  </div>

                  {/* Level 3: Sub Kegiatan */}
                  <div className="flex items-start gap-2.5 pl-6 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shrink-0">
                      SUB KEGIATAN
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs sm:text-sm font-bold text-amber-300">
                        {selectedRka?.kd_sub_kegiatan}
                      </div>
                      <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">
                        {selectedRka?.nm_sub_kegiatan}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Info Metadata Bar: Sasaran, Capaian, PPTK */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Sasaran:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedRka?.sasaran_kegiatan || "-"}
                    </span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Target Capaian:</span>
                    <span className="font-semibold text-emerald-300">
                      {selectedRka?.capaian_kegiatan || "-"}
                    </span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">PPTK:</span>
                    <span className="font-semibold text-amber-200">
                      {selectedRka?.pptkNama || "Belum ditunjuk"}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isCurrentModeLocked}
                    onClick={() => {
                      if (isCurrentModeLocked) return;
                      selectedRka && handleOpenEditSubkeg(selectedRka);
                    }}
                    title={isCurrentModeLocked ? currentLockMessage : "Edit Capaian & PPTK"}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition ml-auto ${isCurrentModeLocked
                      ? "bg-white/5 text-slate-500 cursor-not-allowed"
                      : "text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                      }`}
                  >
                    {isCurrentModeLocked ? <Lock className="w-3 h-3 text-slate-400" /> : <Pencil className="w-3 h-3" />}
                    <span>Edit Capaian & PPTK</span>
                  </button>
                </div>
              </div>

              {/* Kanan: Ringkasan Jumlah Pagu & Total Anggaran RKA */}
              <div className="lg:col-span-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    {rkaMode === "PERUBAHAN"
                      ? "Total Anggaran RKA (Perubahan)"
                      : "Total Anggaran RKA (Murni)"}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5">
                    {rkaMode === "PERUBAHAN"
                      ? formatRupiah(selectedRka?.totalAnggaran_ubah ?? selectedRka?.totalAnggaran)
                      : formatRupiah(selectedRka?.totalAnggaran)}
                  </div>
                  {rkaMode !== "MURNI" && (
                    <div className="text-[11px] text-slate-400 mt-1 font-mono flex flex-wrap items-center gap-x-2">
                      <span>Murni: {formatRupiah(selectedRka?.totalAnggaran)}</span>
                      <span>•</span>
                      <span>
                        Selisih:{" "}
                        <strong
                          className={
                            ((selectedRka?.totalAnggaran_ubah ?? selectedRka?.totalAnggaran ?? 0) -
                              (selectedRka?.totalAnggaran ?? 0)) >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }
                        >
                          {((selectedRka?.totalAnggaran_ubah ?? selectedRka?.totalAnggaran ?? 0) -
                            (selectedRka?.totalAnggaran ?? 0)) >= 0
                            ? "+"
                            : ""}
                          {formatRupiah(
                            (selectedRka?.totalAnggaran_ubah ?? selectedRka?.totalAnggaran ?? 0) -
                            (selectedRka?.totalAnggaran ?? 0)
                          )}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Plafond Anggaran OPD / Unit */}
                <div className="pt-2.5 border-t border-slate-700/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">
                      Plafond Belanja OPD ({rkaMode === "PERUBAHAN" ? "Ubah" : "Murni"}):
                    </span>
                    <span className="font-mono font-bold text-white">
                      {opdPlafondControl?.hasPlafond
                        ? formatRupiah(
                          rkaMode === "PERUBAHAN"
                            ? opdPlafondControl.paguUbah
                            : opdPlafondControl.paguMurni
                        )
                        : selectedRka?.plafond?.paguMurni !== undefined
                          ? formatRupiah(selectedRka.plafond.paguMurni)
                          : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Total Belanja Terpakai OPD:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {opdPlafondControl?.hasPlafond
                        ? formatRupiah(
                          rkaMode === "PERUBAHAN"
                            ? opdPlafondControl.totalRkaUbah
                            : opdPlafondControl.totalRkaMurni
                        )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sisa Plafond Belanja OPD:</span>
                    <span
                      className={`font-mono font-bold ${(opdPlafondControl?.hasPlafond
                        ? rkaMode === "PERUBAHAN"
                          ? opdPlafondControl.sisaPaguUbah
                          : opdPlafondControl.sisaPaguMurni
                        : 0) < 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                        }`}
                    >
                      {opdPlafondControl?.hasPlafond
                        ? formatRupiah(
                          rkaMode === "PERUBAHAN"
                            ? opdPlafondControl.sisaPaguUbah
                            : opdPlafondControl.sisaPaguMurni
                        )
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Peringatan Lock di Step 4 */}
          {isCurrentModeLocked && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-300 text-red-900 flex items-start sm:items-center gap-3 shadow-xs">
              <span className="p-2 rounded-xl bg-red-600 text-white shrink-0 mt-0.5 sm:mt-0">
                <Lock className="w-5 h-5" />
              </span>
              <div className="flex-1 text-xs">
                <div className="font-extrabold uppercase tracking-wide text-red-950 flex items-center gap-2">
                  <span>{rkaMode === "PERUBAHAN" ? "RKA PERUBAHAN" : "RKA PENYUSUNAN (MURNI)"} TELAH DIKUNCI</span>
                </div>
                <p className="mt-0.5 text-red-800">
                  {currentLockMessage}
                </p>
              </div>
            </div>
          )}

          {/* Toolbar Tambah Rekening Belanja & Global Hide Rincian */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">
                Rekening Sub Rincian Objek              </span>
              {/* Tombol Global Hide / Show All */}
              {(selectedRka?.rkaRekening || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const hasOpen = (selectedRka?.rkaRekening || []).some(
                      (r) => !collapsedRekenings[r.id]
                    );
                    toggleCollapseAll(hasOpen);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
                >
                  {(selectedRka?.rkaRekening || []).some((r) => !collapsedRekenings[r.id]) ? (
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

            <div className="flex flex-wrap items-center gap-2.5">


              <button
                type="button"
                disabled={isCurrentModeLocked}
                onClick={() => {
                  if (isCurrentModeLocked) return;
                  setShowAddRekeningModal(true);
                }}
                title={isCurrentModeLocked ? currentLockMessage : "Tambah Rekening"}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition ${isCurrentModeLocked
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  : "bg-[#5E0E14] text-white hover:bg-[#46090E] cursor-pointer"
                  }`}
              >
                {isCurrentModeLocked ? <Lock className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4" />}
                <span>Tambah Rekening</span>
              </button>
            </div>
          </div>

          {/* Daftar Rekening dan Rincian Barang (SSH) */}
          <div className="space-y-4">
            {loadingDetail ? (
              <div className="bg-white p-12 rounded-2xl border text-center text-xs text-slate-400">
                Memuat rincian RKA...
              </div>
            ) : (selectedRka?.rkaRekening || []).length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-dashed text-center text-xs text-slate-500">
                Belum ada rekening belanja. Klik tombol "Tambah Rekening Belanja" di atas untuk mulai mengisi RKA.
              </div>
            ) : (
              (selectedRka?.rkaRekening || []).map((rek) => {
                const isCollapsed = Boolean(collapsedRekenings[rek.id]);
                const subTotalMurni = rek.rincianObjek.reduce((sum, obj) => sum + obj.total, 0);
                const subTotalUbah = rek.rincianObjek.reduce((sum, obj) => {
                  const totUbah = obj.total_ubah !== null && obj.total_ubah !== undefined ? obj.total_ubah : obj.total;
                  return sum + totUbah;
                }, 0);
                const diffNilai = subTotalUbah - subTotalMurni;

                return (
                  <div
                    key={rek.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition"
                  >
                    {/* Baris Header Rekening */}
                    <div className="p-3.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Tombol Toggle Hide Rincian per Rekening */}
                        <button
                          type="button"
                          onClick={() => toggleCollapseRekening(rek.id)}
                          className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shrink-0"
                          title={isCollapsed ? "Tampilkan Rincian Barang" : "Sembunyikan Rincian Barang"}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-extrabold text-slate-900 break-words">
                            {rek.kd_rek6} — {rek.nm_rek6}
                          </div>
                          {/* Jumlah Total per Rekening */}
                          <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              Total Murni:{" "}
                              <strong className="font-mono font-bold text-emerald-800">
                                {formatRupiah(subTotalMurni)}
                              </strong>
                            </span>
                            {rkaMode !== "MURNI" && (
                              <>
                                <span>•</span>
                                <span>
                                  Total Perubahan:{" "}
                                  <strong className="font-mono font-bold text-amber-800">
                                    {formatRupiah(subTotalUbah)}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Selisih:{" "}
                                  <strong
                                    className={`font-mono font-bold ${diffNilai >= 0 ? "text-emerald-700" : "text-rose-700"
                                      }`}
                                  >
                                    {diffNilai >= 0 ? "+" : ""}
                                    {formatRupiah(diffNilai)}
                                  </strong>
                                </span>
                              </>
                            )}
                            <span className="text-slate-400 text-[10px]">
                              ({rek.rincianObjek.length} item rincian)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isCurrentModeLocked}
                          onClick={() => {
                            if (isCurrentModeLocked) return;
                            setTargetRekeningId(rek.id);
                            setShowAddRincianModal(true);
                          }}
                          title={isCurrentModeLocked ? currentLockMessage : "Tambah Uraian"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${isCurrentModeLocked
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                            : "bg-[#991B1B] text-white hover:bg-[#7F1D1D] cursor-pointer"
                            }`}
                        >
                          {isCurrentModeLocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Tambah Uraian</span>
                        </button>
                        {isCurrentModeLocked ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed select-none"
                            title={currentLockMessage}
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Terkunci</span>
                          </span>
                        ) : rkaMode === "PERUBAHAN" && (subTotalMurni > 0 || (rek.rincianObjek || []).some((o) => Number(o.volume) > 0)) ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed select-none"
                            title="Rekening belanja dari tahap Penyusunan (Murni) terkunci dan tidak boleh dihapus pada RKA Perubahan."
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteDialog({
                                type: "rekening",
                                id: rek.id,
                                title: "Hapus Rekening Belanja",
                                label: `${rek.kd_rek6} ${rek.nm_rek6}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 text-xs font-bold transition shadow-xs cursor-pointer"
                            title="Hapus Rekening Belanja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabel Rincian Objek Belanja (Trdpo) - Disembunyikan saat isCollapsed */}
                    {!isCollapsed && (
                      rek.rincianObjek.length === 0 ? (
                        <div className="p-5 text-center text-xs text-slate-400 italic bg-slate-50/50">
                          Belum ada rincian barang. Klik "Tambah Uraian" untuk memilih dari Standar Satuan Harga (SSH).
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          {/* 1. Mode MURNI */}
                          {rkaMode === "MURNI" && (
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase">
                                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                                  <th className="py-2.5 px-3 w-48">Kode SSH</th>
                                  <th className="py-2.5 px-4">Uraian Komponen Barang / Jasa</th>
                                  <th className="py-2.5 px-3 text-center w-24">Volume</th>
                                  <th className="py-2.5 px-3 text-center w-24">Satuan</th>
                                  <th className="py-2.5 px-4 text-right w-36">Harga Satuan (Rp)</th>
                                  <th className="py-2.5 px-4 text-right w-40">Total (Rp)</th>
                                  <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {rek.rincianObjek.map((obj, i) => (
                                  <tr key={obj.id} className="hover:bg-slate-50/70">
                                    <td className="py-2 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-[#88131A] whitespace-nowrap">
                                      {obj.kd_barang || "-"}
                                    </td>
                                    <td className="py-2 px-4">
                                      <div className="font-bold text-slate-900">{obj.uraian}</div>
                                      {obj.catatan && (
                                        <div className="text-[10px] text-slate-400 mt-0.5">{obj.catatan}</div>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold">{obj.volume}</td>
                                    <td className="py-2 px-3 text-center">{obj.satuan}</td>
                                    <td className="py-2 px-4 text-right font-mono">{formatRupiah(obj.harga)}</td>
                                    <td className="py-2 px-4 text-right font-mono font-extrabold text-slate-900">
                                      {formatRupiah(obj.total)}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {isCurrentModeLocked ? (
                                        <span
                                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                          title={currentLockMessage}
                                        >
                                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteDialog({
                                              type: "rincian",
                                              id: obj.id,
                                              title: "Hapus Rincian Barang",
                                              label: obj.uraian,
                                            })
                                          }
                                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-xs cursor-pointer"
                                          title="Hapus Rincian"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800">
                                <tr>
                                  <td colSpan={3} className="py-3 px-4 text-left">
                                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                      Sub Total
                                    </div>
                                  </td>
                                  <td colSpan={4} className="py-3 px-4 text-right font-mono bg-emerald-50/80 border-l border-r border-emerald-200">
                                    <div className="text-[10px] uppercase font-bold text-emerald-800">Sub Total Murni:</div>
                                    <div className="text-sm font-black text-emerald-900">{formatRupiah(subTotalMurni)}</div>
                                  </td>
                                  <td className="py-3 px-3 bg-slate-100/95"></td>
                                </tr>
                              </tfoot>
                            </table>
                          )}

                          {/* 2. Mode PERUBAHAN */}
                          {rkaMode === "PERUBAHAN" && (
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase">
                                  <th className="py-2.5 px-3 w-10 text-center" rowSpan={2}>No</th>
                                  <th className="py-2.5 px-3 w-40" rowSpan={2}>Kode SSH</th>
                                  <th className="py-2.5 px-4" rowSpan={2}>Uraian Komponen Barang</th>
                                  <th className="py-1 px-3 text-center bg-slate-100/80 border-r border-slate-200" colSpan={3}>
                                    Sebelum Perubahan (Murni)
                                  </th>
                                  <th className="py-1 px-3 text-center bg-amber-50/80 border-r border-amber-200 text-amber-900" colSpan={3}>
                                    Setelah Perubahan
                                  </th>
                                  <th className="py-2.5 px-3 text-right w-32" rowSpan={2}>Selisih (+/-)</th>
                                  <th className="py-2.5 px-3 text-center w-20" rowSpan={2}>Aksi</th>
                                </tr>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                                  <th className="py-1.5 px-2 text-center w-16 bg-slate-100/60">Vol</th>
                                  <th className="py-1.5 px-2 text-center w-16 bg-slate-100/60">Sat</th>
                                  <th className="py-1.5 px-3 text-right w-28 bg-slate-100/60 border-r border-slate-200">Total</th>
                                  <th className="py-1.5 px-2 text-center w-16 bg-amber-50/60 text-amber-900">Vol Ubah</th>
                                  <th className="py-1.5 px-2 text-center w-16 bg-amber-50/60 text-amber-900">Sat Ubah</th>
                                  <th className="py-1.5 px-3 text-right w-28 bg-amber-50/60 border-r border-amber-200 text-amber-900">Total Ubah</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {rek.rincianObjek.map((obj, i) => {
                                  const volUbah = obj.volume_ubah !== null && obj.volume_ubah !== undefined ? obj.volume_ubah : obj.volume;
                                  const satUbah = obj.satuan_ubah || obj.satuan;
                                  const totUbah = obj.total_ubah !== null && obj.total_ubah !== undefined ? obj.total_ubah : obj.total;
                                  const diff = totUbah - obj.total;

                                  return (
                                    <tr key={obj.id} className="hover:bg-slate-50/70">
                                      <td className="py-2 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                                      <td className="py-2 px-3 font-mono font-bold text-[#88131A] whitespace-nowrap">
                                        {obj.kd_barang || "-"}
                                      </td>
                                      <td className="py-2 px-4">
                                        <div className="font-bold text-slate-900">{obj.uraian}</div>
                                        {obj.catatan && (
                                          <div className="text-[10px] text-slate-400 mt-0.5">{obj.catatan}</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono bg-slate-50/40">{obj.volume}</td>
                                      <td className="py-2 px-2 text-center bg-slate-50/40 text-[11px]">{obj.satuan}</td>
                                      <td className="py-2 px-3 text-right font-mono bg-slate-50/40 border-r border-slate-200">
                                        {formatRupiah(obj.total)}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold bg-amber-50/30 text-amber-950">
                                        {volUbah}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-amber-50/30 text-[11px] font-medium">
                                        {satUbah}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold bg-amber-50/30 border-r border-amber-200 text-amber-950">
                                        {formatRupiah(totUbah)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">
                                        <span className={diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-700" : "text-slate-500"}>
                                          {diff > 0 ? "+" : ""}{formatRupiah(diff)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1">
                                          {isCurrentModeLocked ? (
                                            <span
                                              className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                              title={currentLockMessage}
                                            >
                                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                                            </span>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditRincian(obj)}
                                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:text-white hover:bg-amber-600 hover:border-amber-600 transition shadow-xs cursor-pointer"
                                                title="Ubah Nilai Perubahan (Volume / Satuan)"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              {Number(obj.volume) > 0 ? (
                                                <span
                                                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                                  title="Item belanja dari tahap Penyusunan (Murni) tidak boleh dihapus pada RKA Perubahan. Silakan ubah Volume Ubah menjadi 0 jika ingin meniadakan anggaran."
                                                >
                                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setDeleteDialog({
                                                      type: "rincian",
                                                      id: obj.id,
                                                      title: "Hapus Rincian Barang",
                                                      label: obj.uraian,
                                                    })
                                                  }
                                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-xs cursor-pointer"
                                                  title="Hapus Rincian (Item Tambahan Perubahan)"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800">
                                <tr>
                                  <td colSpan={3} className="py-3 px-4 text-left">
                                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                      Sub Total
                                    </div>
                                  </td>
                                  <td colSpan={2} className="py-3 px-2 bg-slate-100/70 text-right text-[10px] uppercase font-bold text-slate-500">
                                    Total Murni:
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/80 border-r border-slate-300 text-xs">
                                    {formatRupiah(subTotalMurni)}
                                  </td>
                                  <td colSpan={2} className="py-3 px-2 bg-amber-50/50 text-right text-[10px] uppercase font-bold text-amber-800">
                                    Total Ubah:
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-950 bg-amber-100/70 border-r border-amber-300 text-xs">
                                    {formatRupiah(subTotalUbah)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-black text-xs">
                                    <span className={diffNilai > 0 ? "text-emerald-700" : diffNilai < 0 ? "text-rose-700" : "text-slate-600"}>
                                      {diffNilai > 0 ? "+" : ""}{formatRupiah(diffNilai)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3"></td>
                                </tr>
                              </tfoot>
                            </table>
                          )}

                          {/* 3. Mode KOMPARASI LENGKAP */}
                          {rkaMode === "KOMPARASI" && (
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-bold uppercase">
                                  <th className="py-2.5 px-3 w-10 text-center" rowSpan={2}>No</th>
                                  <th className="py-2.5 px-3 w-40" rowSpan={2}>Kode SSH</th>
                                  <th className="py-2.5 px-4" rowSpan={2}>Uraian Barang</th>
                                  <th className="py-1 px-3 text-center bg-slate-100/80 border-r border-slate-200" colSpan={4}>
                                    Penyusunan (Murni)
                                  </th>
                                  <th className="py-1 px-3 text-center bg-amber-50/80 border-r border-amber-200 text-amber-900" colSpan={4}>
                                    Perubahan
                                  </th>
                                  <th className="py-2.5 px-3 text-right w-32" rowSpan={2}>Selisih (Rp)</th>
                                  <th className="py-2.5 px-3 text-center w-16" rowSpan={2}>Aksi</th>
                                </tr>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                                  <th className="py-1.5 px-2 text-center w-14 bg-slate-100/60">Vol</th>
                                  <th className="py-1.5 px-2 text-center w-14 bg-slate-100/60">Sat</th>
                                  <th className="py-1.5 px-2 text-right w-24 bg-slate-100/60">Tarif</th>
                                  <th className="py-1.5 px-3 text-right w-28 bg-slate-100/60 border-r border-slate-200">Total Murni</th>
                                  <th className="py-1.5 px-2 text-center w-14 bg-amber-50/60 text-amber-900">Vol</th>
                                  <th className="py-1.5 px-2 text-center w-14 bg-amber-50/60 text-amber-900">Sat</th>
                                  <th className="py-1.5 px-2 text-right w-24 bg-amber-50/60 text-amber-900">Tarif Ubah</th>
                                  <th className="py-1.5 px-3 text-right w-28 bg-amber-50/60 border-r border-amber-200 text-amber-900">Total Ubah</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {rek.rincianObjek.map((obj, i) => {
                                  const volUbah = obj.volume_ubah !== null && obj.volume_ubah !== undefined ? obj.volume_ubah : obj.volume;
                                  const satUbah = obj.satuan_ubah || obj.satuan;
                                  const hrgUbah = obj.harga_ubah !== null && obj.harga_ubah !== undefined ? obj.harga_ubah : obj.harga;
                                  const totUbah = obj.total_ubah !== null && obj.total_ubah !== undefined ? obj.total_ubah : obj.total;
                                  const diff = totUbah - obj.total;

                                  return (
                                    <tr key={obj.id} className="hover:bg-slate-50/70">
                                      <td className="py-2 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                                      <td className="py-2 px-3 font-mono font-bold text-[#88131A] whitespace-nowrap">
                                        {obj.kd_barang || "-"}
                                      </td>
                                      <td className="py-2 px-4">
                                        <div className="font-bold text-slate-900">{obj.uraian}</div>
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono bg-slate-50/40">{obj.volume}</td>
                                      <td className="py-2 px-2 text-center bg-slate-50/40 text-[11px]">{obj.satuan}</td>
                                      <td className="py-2 px-2 text-right font-mono bg-slate-50/40 text-[11px]">{formatRupiah(obj.harga)}</td>
                                      <td className="py-2 px-3 text-right font-mono bg-slate-50/40 border-r border-slate-200">
                                        {formatRupiah(obj.total)}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-bold bg-amber-50/30 text-amber-950">
                                        {volUbah}
                                      </td>
                                      <td className="py-2 px-2 text-center bg-amber-50/30 text-[11px] font-medium">
                                        {satUbah}
                                      </td>
                                      <td className="py-2 px-2 text-right font-mono bg-amber-50/30 text-[11px] text-amber-950">
                                        {formatRupiah(hrgUbah)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold bg-amber-50/30 border-r border-amber-200 text-amber-950">
                                        {formatRupiah(totUbah)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">
                                        <span className={diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-700" : "text-slate-500"}>
                                          {diff > 0 ? "+" : ""}{formatRupiah(diff)}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1">
                                          {isCurrentModeLocked ? (
                                            <span
                                              className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                              title={currentLockMessage}
                                            >
                                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                                            </span>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditRincian(obj)}
                                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:text-white hover:bg-amber-600 hover:border-amber-600 transition shadow-xs cursor-pointer"
                                                title="Ubah Nilai Perubahan"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              {Number(obj.volume) > 0 ? (
                                                <span
                                                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center justify-center"
                                                  title="Item belanja dari tahap Penyusunan (Murni) tidak boleh dihapus pada RKA Perubahan. Silakan ubah Volume Ubah menjadi 0 jika ingin meniadakan anggaran."
                                                >
                                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                </span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setDeleteDialog({
                                                      type: "rincian",
                                                      id: obj.id,
                                                      title: "Hapus Rincian Barang",
                                                      label: obj.uraian,
                                                    })
                                                  }
                                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition shadow-xs cursor-pointer"
                                                  title="Hapus Rincian (Item Tambahan Perubahan)"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800">
                                <tr>
                                  <td colSpan={3} className="py-3 px-4 text-left">
                                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                      Sub Total Rekening: <span className="font-mono text-[#5E0E14]">{rek.kd_rek6}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-normal">
                                      {rek.nm_rek6} ({rek.rincianObjek.length} item rincian)
                                    </div>
                                  </td>
                                  <td colSpan={3} className="py-3 px-2 bg-slate-100/70 text-right text-[10px] uppercase font-bold text-slate-500">
                                    Sub Total Murni:
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/80 border-r border-slate-300 text-xs">
                                    {formatRupiah(subTotalMurni)}
                                  </td>
                                  <td colSpan={3} className="py-3 px-2 bg-amber-50/50 text-right text-[10px] uppercase font-bold text-amber-800">
                                    Sub Total Ubah:
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-950 bg-amber-100/70 border-r border-amber-300 text-xs">
                                    {formatRupiah(subTotalUbah)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-black text-xs">
                                    <span className={diffNilai > 0 ? "text-emerald-700" : diffNilai < 0 ? "text-rose-700" : "text-slate-600"}>
                                      {diffNilai > 0 ? "+" : ""}{formatRupiah(diffNilai)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3"></td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: Tambah Sub Kegiatan & PPTK (Enlarged max-w-5xl)       */}
      {/* ============================================================== */}
      {showAddSubkegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl xl:max-w-6xl w-full max-h-[94vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5E0E14] via-[#7B131A] to-[#991B1B] text-white px-6 sm:px-8 py-5 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-xl bg-white/10 text-white">
                  <BookOpen className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Tambah Sub Kegiatan RKA</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubkegModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body (Scrollable, 2 Columns) */}
            <form onSubmit={handleAddSubkegiatanSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Kolom 1: Nomenklatur & Kodefikasi */}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-red-100 text-[#991B1B] text-xs sm:text-sm font-bold flex items-center justify-center">
                          1
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Nomenklatur & Kodefikasi
                        </h4>
                      </div>
                    </div>

                    {/* 1. Pilih Program */}
                    <div className="relative z-30">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span>1. Pilih Program</span>
                          <span className="text-red-600">*</span>
                        </label>
                        {formProgId ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Program Terpilih
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500">
                            {safePrograms.length} Program
                          </span>
                        )}
                      </div>
                      <SearchableSelect
                        options={safePrograms.map((p) => ({
                          value: p.id,
                          label: p.nm_program,
                          badge: p.kd_program,
                          subLabel: p.kd_urusan ? `Urusan: ${p.kd_urusan}` : undefined,
                        }))}
                        value={formProgId}
                        onChange={(val) => {
                          setFormProgId(val);
                          setFormKegId("");
                          setFormSubId("");
                        }}
                        placeholder="-- Pilih Program Perencanaan --"
                        searchPlaceholder="Ketik kode (misal 5.02) atau nama program..."
                        required
                      />
                    </div>

                    {/* 2. Pilih Kegiatan */}
                    <div className="relative z-20">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span>2. Pilih Kegiatan</span>
                          <span className="text-red-600">*</span>
                        </label>
                        {!formProgId ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Pilih program dahulu
                          </span>
                        ) : formKegId ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Kegiatan Terpilih
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {filteredKegiatan.length} Kegiatan Tersedia
                          </span>
                        )}
                      </div>
                      <SearchableSelect
                        options={filteredKegiatan.map((k) => ({
                          value: k.id,
                          label: k.nm_kegiatan,
                          badge: k.kd_kegiatan,
                        }))}
                        value={formKegId}
                        onChange={(val) => {
                          setFormKegId(val);
                          setFormSubId("");
                        }}
                        placeholder={formProgId ? "-- Pilih Kegiatan --" : "-- Pilih Program Terlebih Dahulu --"}
                        searchPlaceholder="Ketik kode atau nama kegiatan..."
                        disabled={!formProgId}
                        required
                      />
                    </div>

                    {/* 3. Pilih Sub Kegiatan */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <span>3. Pilih Sub Kegiatan</span>
                          <span className="text-red-600">*</span>
                        </label>
                        {!formKegId ? (
                          <span className="text-[10px] text-slate-400 italic">
                            Pilih kegiatan dahulu
                          </span>
                        ) : formSubId ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Sub Kegiatan Terpilih
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {filteredSubkegiatan.length} Sub Kegiatan Tersedia
                          </span>
                        )}
                      </div>
                      <SearchableSelect
                        options={filteredSubkegiatan.map((s) => ({
                          value: s.id,
                          label: s.nm_sub_kegiatan,
                          badge: s.kd_sub_kegiatan,
                        }))}
                        value={formSubId}
                        onChange={(val) => setFormSubId(val)}
                        placeholder={formKegId ? "-- Pilih Sub Kegiatan --" : "-- Pilih Kegiatan Terlebih Dahulu --"}
                        searchPlaceholder="Ketik kode atau nama sub kegiatan..."
                        disabled={!formKegId}
                        required
                      />
                    </div>
                  </div>


                  {/* Kolom 2: Target Capaian Kinerja, PPTK & Pelaksanaan */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <span className="w-7 h-7 rounded-full bg-red-100 text-[#991B1B] text-xs sm:text-sm font-bold flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        Indikator Kinerja, PPTK & Pelaksanaan
                      </h4>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                        Capaian Target Kinerja (Output / Hasil)
                      </label>
                      <textarea
                        rows={3}
                        value={formCapaian}
                        onChange={(e) => setFormCapaian(e.target.value)}
                        placeholder="Contoh: Tersusunnya Dokumen RKA-SKPD Tepat Waktu (1 Dokumen)"
                        className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition resize-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Target kinerja kegiatan yang akan dicapai dalam tahun anggaran.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs sm:text-sm font-bold text-slate-800">
                          Pejabat Pelaksana Teknis Kegiatan (PPTK)
                        </label>
                        <span className="text-[10px] font-bold text-slate-500">
                          {availablePptkForForm.length} Pegawai PPTK
                        </span>
                      </div>
                      <SearchableSelect
                        options={availablePptkForForm.map((u) => ({
                          value: u.id,
                          label: u.namaLengkap,
                          subLabel: `${u.unitKerja ? "" : u.jabatan}`,
                        }))}
                        value={formPptkId}
                        onChange={(val) => setFormPptkId(val)}
                        placeholder={
                          availablePptkForForm.length > 0
                            ? "-- Pilih PPTK (Khusus Role PPTK & OPD Terkait) --"
                            : "-- Belum ada user dengan role PPTK pada OPD ini --"
                        }
                        searchPlaceholder="Ketik nama atau NIP PPTK..."
                      />
                      {availablePptkForForm.length === 0 ? (
                        <div className="mt-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold">Belum ada pegawai dengan peran PPTK pada OPD ini</div>
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              Silahkan Lapor ke Admin BPKPAD untuk menambahkan user dengan role PPTK.
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Hanya menampilkan pegawai pada <b>{selectedOpd?.nm_skpd}</b> yang memiliki hak akses <b>Role: PPTK</b>.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                        Sasaran Kegiatan
                      </label>
                      <input
                        type="text"
                        value={formSasaran}
                        onChange={(e) => setFormSasaran(e.target.value)}
                        placeholder="Contoh: Tercapainya tertib administrasi perencanaan keuangan OPD"
                        className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                          Waktu Pelaksanaan
                        </label>
                        <input
                          type="text"
                          value={formWaktu}
                          onChange={(e) => setFormWaktu(e.target.value)}
                          placeholder="Contoh: 12 Bulan (Jan - Des)"
                          className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                          Lokasi Pelaksanaan
                        </label>
                        <input
                          type="text"
                          value={formLokasi}
                          onChange={(e) => setFormLokasi(e.target.value)}
                          placeholder="Contoh: Kab. Tapanuli Selatan"
                          className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-500">
                  * Nomenklatur Program & Kegiatan disesuaikan dengan OPD dan Unit Kerja terpilih.
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddSubkegModal(false)}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!formSubId || isCurrentModeLocked}
                    className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#7B111A] to-[#991B1B] rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Simpan & Lanjut Isi RKA
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT: Edit Sub Kegiatan (Capaian Target, PPTK, Sasaran)  */}
      {/* ============================================================== */}
      {showEditSubkegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5E0E14] via-[#7B131A] to-[#991B1B] text-white px-6 py-4 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white/10 text-white">
                  <Pencil className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Edit Kinerja & PPTK Sub Kegiatan</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditSubkegModal(false);
                  setEditingSubkeg(null);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Info Banner */}
            <div className="px-6 py-3 bg-red-50/60 border-b border-red-100 text-xs text-slate-800 space-y-2 shrink-0">
              {/* Program */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Program
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {editingSubkeg?.nm_program}
                  </span>
                </div>
              </div>

              {/* Kegiatan */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Kegiatan
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">
                    {editingSubkeg?.nm_kegiatan}
                  </span>
                </div>
              </div>

              {/* Sub Kegiatan */}
              <div className="pt-1 border-t border-red-100">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#991B1B] mb-1">
                  Sub Kegiatan
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {editingSubkeg?.nm_sub_kegiatan}
                  </span>
                </div>
              </div>
            </div>
            {/* Form Body */}
            <form onSubmit={handleEditSubkegSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Capaian Target Kinerja (Output / Hasil)
                  </label>
                  <textarea
                    rows={2}
                    value={editFormCapaian}
                    onChange={(e) => setEditFormCapaian(e.target.value)}
                    placeholder="Contoh: Tersusunnya Dokumen RKA-SKPD Tepat Waktu (1 Dokumen)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition resize-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Target indikator keluaran atau hasil dari sub kegiatan ini.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Pejabat Pelaksana Teknis Kegiatan (PPTK)
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {availablePptkForEdit.length} Pegawai PPTK
                    </span>
                  </div>
                  <SearchableSelect
                    options={availablePptkForEdit.map((u) => ({
                      value: u.id,
                      label: u.namaLengkap,
                      badge: u.nip ? `NIP: ${u.nip}` : "PPTK",
                      subLabel: `Role: ${u.role?.nama || "PPTK"}${u.unitKerja ? ` • ${u.unitKerja.nm_unit}` : selectedOpd ? ` • ${selectedOpd.nm_skpd}` : ""}`,
                    }))}
                    value={editFormPptkId}
                    onChange={(val) => setEditFormPptkId(val)}
                    placeholder={
                      availablePptkForEdit.length > 0
                        ? "-- Pilih PPTK (Khusus Role PPTK & OPD Terkait) --"
                        : "-- Belum ada user dengan role PPTK pada OPD ini --"
                    }
                    searchPlaceholder="Ketik nama atau NIP PPTK..."
                  />
                  {availablePptkForEdit.length === 0 ? (
                    <div className="mt-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Belum ada pegawai dengan peran PPTK pada OPD ini</div>
                        <div className="text-[11px] text-amber-700 mt-0.5">
                          Tambahkan pegawai dengan <b>Role: PPTK</b> melalui menu <b>Pengaturan &gt; Data Pegawai / User</b>.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Hanya menampilkan pegawai pada OPD ini yang memiliki hak akses <b>Role: PPTK</b>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sasaran Kegiatan
                  </label>
                  <input
                    type="text"
                    value={editFormSasaran}
                    onChange={(e) => setEditFormSasaran(e.target.value)}
                    placeholder="Contoh: Tercapainya tertib administrasi perencanaan keuangan OPD"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Waktu Pelaksanaan
                    </label>
                    <input
                      type="text"
                      value={editFormWaktu}
                      onChange={(e) => setEditFormWaktu(e.target.value)}
                      placeholder="Contoh: 12 Bulan (Jan - Des)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Lokasi Pelaksanaan
                    </label>
                    <input
                      type="text"
                      value={editFormLokasi}
                      onChange={(e) => setEditFormLokasi(e.target.value)}
                      placeholder="Contoh: Kab. Tapanuli Selatan"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubkegModal(false);
                    setEditingSubkeg(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit || isCurrentModeLocked}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#7B111A] to-[#991B1B] rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: Tambah Rekening Sub Rincian Objek                     */}
      {/* ============================================================== */}
      {showAddRekeningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* 1. Header (fixed at top of modal) */}
            <div className="bg-gradient-to-r from-[#5E0E14] via-[#7B131A] to-[#991B1B] text-white px-6 py-4 flex items-start justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-white/10 text-white">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold">Pilih Rekening Sub Rincian Objek</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddRekeningModal(false);
                  setFormRek6Id("");
                  setRekSearchQuery("");
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Target Sub Kegiatan Info Banner (shrink-0) */}


            {/* 3. Filter Controls: Category Tabs & Search Input (shrink-0) */}
            <div className="p-5 pb-3 border-b border-slate-200 bg-white space-y-3 shrink-0">
              {/* Category Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRekCategoryFilter("ALL")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${rekCategoryFilter === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <span>Keseluruhan</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    {rek6List.filter((r) => ["4", "5", "6"].includes(r.kd_rek6?.[0])).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRekCategoryFilter("5")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${rekCategoryFilter === "5"
                    ? "bg-[#991B1B] text-white border-[#991B1B] shadow-sm"
                    : "bg-rose-50/60 text-[#991B1B] border-rose-200 hover:bg-rose-100/60"
                    }`}
                >
                  <span>Belanja</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    {rek6List.filter((r) => r.kd_rek6?.startsWith("5")).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRekCategoryFilter("4")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${rekCategoryFilter === "4"
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                >
                  <span>Pendapatan</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    {rek6List.filter((r) => r.kd_rek6?.startsWith("4")).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRekCategoryFilter("6")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${rekCategoryFilter === "6"
                    ? "bg-sky-700 text-white border-sky-700 shadow-sm"
                    : "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                    }`}
                >
                  <span>Pembiayaan</span>
                  <span className="text-[11px] opacity-80 font-mono">
                    {rek6List.filter((r) => r.kd_rek6?.startsWith("6")).length}
                  </span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rekSearchQuery}
                  onChange={(e) => setRekSearchQuery(e.target.value)}
                  placeholder="Ketik kode rekening (misal: 5.1.02) atau kata kunci uraian belanja..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20 transition shadow-inner"
                  autoFocus
                />
                {rekSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRekSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 4. Scrollable Rekening List (never clipped, scrolls cleanly) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-[240px] max-h-[380px] divide-y divide-slate-100 bg-slate-50/50">
              {filteredRek6List.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {rekSearchQuery
                    ? `Tidak ada rekening yang sesuai dengan kata kunci "${rekSearchQuery}".`
                    : "Tidak ada data rekening."}
                </div>
              ) : (
                filteredRek6List.slice(0, 150).map((r) => {
                  const isSelected = formRek6Id === r.id;
                  const isAlreadyAdded = existingRekKodes.has(r.kd_rek6);
                  const isPendapatan = r.kd_rek6.startsWith("4");
                  const isBelanja = r.kd_rek6.startsWith("5");
                  const isPembiayaan = r.kd_rek6.startsWith("6");

                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  let categoryLabel = "Rekening";
                  if (isPendapatan) {
                    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300";
                    categoryLabel = "Akun 4 — Pendapatan";
                  } else if (isBelanja) {
                    badgeColor = "bg-rose-50 text-[#991B1B] border-rose-300";
                    categoryLabel = "Akun 5 — Belanja";
                  } else if (isPembiayaan) {
                    badgeColor = "bg-sky-50 text-sky-800 border-sky-300";
                    categoryLabel = "Akun 6 — Pembiayaan";
                  }

                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        if (!isAlreadyAdded) {
                          setFormRek6Id(r.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition flex items-start justify-between gap-3 ${isAlreadyAdded
                        ? "bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none"
                        : isSelected
                          ? "bg-red-50/90 border-[#991B1B] ring-2 ring-[#991B1B]/20 shadow-xs cursor-pointer"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-white cursor-pointer"
                        }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold shrink-0 border ${isSelected
                            ? "bg-[#991B1B] text-white border-[#991B1B]"
                            : isAlreadyAdded
                              ? "bg-slate-200 text-slate-600 border-slate-300"
                              : badgeColor
                            }`}
                        >
                          {r.kd_rek6}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs sm:text-sm font-semibold leading-snug break-words ${isAlreadyAdded
                              ? "text-slate-500 line-through decoration-slate-400"
                              : isSelected
                                ? "text-[#991B1B]"
                                : "text-slate-800"
                              }`}
                          >
                            {r.nm_rek6}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-500">
                              {categoryLabel}
                            </span>
                            {isAlreadyAdded && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Sudah Terdaftar di Sub Kegiatan Ini
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isAlreadyAdded ? (
                          <span className="px-2 py-1 rounded-md bg-slate-200 text-slate-500 text-[10px] font-bold">
                            Terkunci
                          </span>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${isSelected
                              ? "bg-[#991B1B] border-[#991B1B] text-white shadow-xs"
                              : "border-slate-300 bg-white"
                              }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 5. Selected Rekening Preview Banner (shrink-0) */}
            {selectedRekeningObj && (
              <div className="px-6 py-3 bg-red-50/80 border-t border-red-200 flex items-center justify-between text-xs shrink-0 animate-in fade-in duration-150">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-bold text-[#991B1B] uppercase tracking-wider text-[10px] shrink-0">
                    Rekening Dipilih:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[#991B1B] border border-red-300 font-mono text-xs font-bold shrink-0">
                    {selectedRekeningObj.kd_rek6}
                  </span>
                  <span className="text-slate-800 font-semibold truncate text-xs">
                    {selectedRekeningObj.nm_rek6}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold shrink-0 ml-2">
                  ✓ Siap Disimpan
                </span>
              </div>
            )}

            {/* 6. Action Footer (shrink-0, always visible) */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Menampilkan <b>{Math.min(150, filteredRek6List.length)}</b> dari <b>{filteredRek6List.length}</b> rekening
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRekeningModal(false);
                    setFormRek6Id("");
                    setRekSearchQuery("");
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRekeningSubmit()}
                  disabled={!formRek6Id || isCurrentModeLocked}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:opacity-95 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Tambahkan Rekening ke RKA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: Tambah Rincian Barang (SSH)                          */}
      {/* ============================================================== */}
      {showAddRincianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5E0E14] via-[#7B131A] to-[#991B1B] text-white px-6 py-4 flex items-start justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/10 text-white shrink-0">
                    <Package className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold leading-tight">Tambah Rincian Barang</h3>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRincianModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Rekening Context Banner */}
            {targetRekeningObj && (
              <div className="bg-gradient-to-r from-red-50/80 via-amber-50/50 to-slate-50 border-b border-slate-200 px-6 py-3.5 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {rkaMode === "PERUBAHAN" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          RKA Perubahan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Penyusunan (Murni)
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">
                      {targetRekeningObj.kd_rek6} - {targetRekeningObj.nm_rek6}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      <span className="font-semibold text-slate-800">{selectedRka?.kd_sub_kegiatan} - {selectedRka?.nm_sub_kegiatan}</span>
                    </div>
                  </div>

                  {/* Info Plafond & Sisa Plafond OPD */}
                  {isTargetRekeningBelanja ? (
                    opdPlafondControl && opdPlafondControl.hasPlafond && (
                      <div className="shrink-0 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col items-start sm:items-end text-xs">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Sisa Plafond Belanja ({rkaMode === "PERUBAHAN" ? "Ubah" : "Murni"}):
                        </span>
                        <span
                          className={`font-mono font-bold text-sm ${activeSisaPlafond < 0 ? "text-rose-600" : "text-emerald-700"
                            }`}
                        >
                          {formatRupiah(activeSisaPlafond)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          dari Plafond {formatRupiah(activePaguPlafond)}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="shrink-0 p-2.5 rounded-xl bg-blue-50 border border-blue-200 shadow-xs flex flex-col items-start sm:items-end text-xs">
                      <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                        {targetRekeningObj.kd_rek6.startsWith("4") ? "Rekening Pendapatan" : "Rekening Pembiayaan"}
                      </span>
                      <span className="font-bold text-xs text-blue-900 mt-0.5">
                        Bebas Batasan Plafond
                      </span>
                      <span className="text-[10px] text-blue-600">
                        Plafond hanya mengikat Belanja
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Scrollable Form Content */}
            <form onSubmit={handleAddRincianSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Klasifikasi Standar Harga Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Klasifikasi Standar Harga:
                  </label>
                  <span className="text-xs text-slate-500">
                    Tersedia: <b>{filteredShsList.length}</b> item
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setShsKlasifikasi("SSH")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${shsKlasifikasi === "SSH"
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      }`}
                  >
                    <span>SSH</span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {shsList.filter((s) => s.jenis === "SSH").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShsKlasifikasi("SBU")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${shsKlasifikasi === "SBU"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                      }`}
                  >
                    <span>SBU / HSB</span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {shsList.filter((s) => s.jenis === "SBU").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShsKlasifikasi("HSPK")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${shsKlasifikasi === "HSPK"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                      }`}
                  >
                    <span>HSPK</span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {shsList.filter((s) => s.jenis === "HSPK").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShsKlasifikasi("ASB")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer ${shsKlasifikasi === "ASB"
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                      }`}
                  >
                    <span>ASB</span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {shsList.filter((s) => s.jenis === "ASB").length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShsKlasifikasi("ALL")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-between cursor-pointer col-span-2 sm:col-span-1 ${shsKlasifikasi === "ALL"
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <span>Semua</span>
                    <span className="text-[11px] opacity-80 font-mono">
                      {shsList.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Standar Harga Dropdown Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Pilih Data Standar Harga ({shsKlasifikasi === "ALL" ? "Semua Klasifikasi" : shsKlasifikasi === "SBU" ? "SBU / HSB" : shsKlasifikasi})
                </label>
                <SearchableSelect
                  options={shsOptions}
                  value={formKdBarang}
                  onChange={(val) => {
                    const found = (Array.isArray(shsList) ? shsList : []).find(
                      (s) => s.id === val || (s.kd_barang && s.kd_barang === val)
                    );
                    if (found) {
                      setFormKdBarang(found.kd_barang || found.id);
                      setFormUraian(found.uraianBarang);
                      setFormSatuan(found.satuan);
                      setFormHarga(found.hargaSatuan.toString());
                      if (found.spesifikasi && !formCatatan) {
                        setFormCatatan(found.spesifikasi);
                      }
                    } else {
                      setFormKdBarang(val);
                    }
                  }}
                  placeholder={`-- Pilih Data ${shsKlasifikasi === "ALL" ? "Standar Harga" : shsKlasifikasi} --`}
                  searchPlaceholder="Ketik kode barang atau kata kunci uraian barang..."
                />
              </div>

              {/* Peringatan jika kd_barang sudah ada pada rekening ini */}
              {isDuplicateRincianKdBarang && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-900">Barang Sudah Terdaftar pada Rekening Ini!</div>
                    <div className="mt-0.5 text-red-700 leading-relaxed">
                      Barang dengan kode <strong className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-900">{formKdBarang}</strong> sudah pernah diinput ke rekening belanja ini. Kode barang harus unik dan tidak boleh diinput berulang. Silakan pilih barang lain atau ubah volume pada rincian yang sudah ada.
                    </div>
                  </div>
                </div>
              )}

              {/* Peringatan jika nilai rincian melebihi Plafond OPD */}
              {isRincianExceedingPlafond && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900">
                      Total Anggaran Melebihi Plafond Pagu OPD!
                    </div>
                    <div className="mt-0.5 text-rose-700 leading-relaxed">
                      Nilai rincian sebesar{" "}
                      <strong className="font-mono text-rose-950">
                        {formatRupiah(calculatedRincianTotal)}
                      </strong>{" "}
                      melebihi sisa Plafond OPD yang tersedia sebesar{" "}
                      <strong className="font-mono text-rose-950">
                        {formatRupiah(activeSisaPlafond)}
                      </strong>
                      . Total penganggaran {rkaMode === "PERUBAHAN" ? "Perubahan" : "Murni"} OPD tidak
                      boleh melebihi Plafond OPD ({formatRupiah(activePaguPlafond)}).
                    </div>
                  </div>
                </div>
              )}

              {/* Uraian Rincian Barang */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Uraian Rincian Barang <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  placeholder="Contoh: Kertas HVS A4 80gr Sinar Dunia"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                />
              </div>

              {/* Volume, Satuan, Harga Satuan Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Volume <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min={0.01}
                    value={formVolume}
                    onChange={(e) => setFormVolume(e.target.value)}
                    placeholder="1"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Satuan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="Contoh: Rim, Buah, Orang/Bulan"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Harga Satuan (Rp) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formHarga}
                    onChange={(e) => setFormHarga(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              {/* Perhitungan Total Otomatis (Live Real-time Banner) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Perhitungan Total Otomatis:
                  </span>
                  <div className="text-xs text-slate-300 font-mono">
                    {rincianVolumeNum.toLocaleString("id-ID")} {formSatuan || "Satuan"} × {formatRupiah(rincianHargaNum)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Anggaran:</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatRupiah(calculatedRincianTotal)}
                  </span>
                </div>
              </div>

              {/* Sumber Dana & Spesifikasi Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Sumber Dana</label>
                  <select
                    value={formSumdan}
                    onChange={(e) => setFormSumdan(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                  >
                    <option value="">-- Pilih Sumber Dana --</option>
                    {(Array.isArray(sumdanList) ? sumdanList : []).map((s) => (
                      <option key={s.id} value={s.kd_sumdan}>
                        {s.kd_sumdan} — {s.nm_sumdan}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">Catatan / Spesifikasi</label>
                  <input
                    type="text"
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    placeholder="Contoh: Merk PaperOne 80gr warna putih"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#991B1B] focus:ring-1 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddRincianModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    calculatedRincianTotal <= 0 ||
                    isDuplicateRincianKdBarang ||
                    isRincianExceedingPlafond ||
                    isCurrentModeLocked
                  }
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:opacity-95 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Simpan Rincian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT: Update Nilai RKA Perubahan (Volume & Satuan Ubah)  */}
      {/* ============================================================== */}
      {editingRincian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#5E0E14] via-[#7B131A] to-[#991B1B] text-white px-6 py-4 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white/10 text-white">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">Update RKA Perubahan</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Perbarui Nilai Volume, Satuan, dan Tarif Perubahan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRincian(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Item Banner */}
            <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200 text-xs space-y-1.5 shrink-0">
              {editingRekeningObj && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {editingRekeningObj.kd_rek6}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {editingRekeningObj.nm_rek6}
                  </span>
                </div>
              )}
              <div className="font-bold text-slate-900 text-sm">
                {editingRincian && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {editingRincian.kd_barang}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {editingRincian.uraian}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Nilai Murni :{" "}
                  <strong className="font-mono">
                    {editingRincian.volume} {editingRincian.satuan} × {formatRupiah(editingRincian.harga)} ={" "}
                    {formatRupiah(editingRincian.total)}
                  </strong>
                </span>
                {isEditingRekeningBelanja ? (
                  opdPlafondControl && opdPlafondControl.hasPlafond && (
                    <span className="text-[11px] text-slate-600">
                      Sisa Plafond Belanja (Ubah):{" "}
                      <strong
                        className={`font-mono ${opdPlafondControl.sisaPaguUbah < 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                      >
                        {formatRupiah(opdPlafondControl.sisaPaguUbah)}
                      </strong>
                    </span>
                  )
                ) : (
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    Bebas Plafond (Non-Belanja)
                  </span>
                )}
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditRincianSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Volume Perubahan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editRincianVolUbah}
                    onChange={(e) => setEditRincianVolUbah(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20"
                    placeholder="Contoh: 15"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Semula Murni: <b>{editingRincian.volume}</b>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Satuan Perubahan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRincianSatuanUbah}
                    onChange={(e) => setEditRincianSatuanUbah(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20"
                    placeholder="Contoh: Rim, Buah, Orang/Bulan"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Semula Murni: <b>{editingRincian.satuan}</b>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Harga Satuan / Tarif Perubahan (Rp) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editRincianHargaUbah}
                  onChange={(e) => setEditRincianHargaUbah(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20"
                  placeholder="Contoh: 50000"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Semula Murni: <b>{formatRupiah(editingRincian.harga)}</b>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan / Keterangan Perubahan
                </label>
                <input
                  type="text"
                  value={editRincianCatatanUbah}
                  onChange={(e) => setEditRincianCatatanUbah(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/20"
                  placeholder="Contoh: Penyesuaian kebutuhan semester II"
                />
              </div>

              {/* Live Preview Kalkulasi Total Perubahan & Selisih */}
              {(() => {
                const volU = parseFloat(editRincianVolUbah) || 0;
                const hrgU = parseFloat(editRincianHargaUbah) || 0;
                const totU = volU * hrgU;
                const selisih = totU - editingRincian.total;

                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Total Perubahan:</span>
                      <span className="font-mono font-bold text-base text-slate-900">
                        {formatRupiah(totU)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                      <span className="text-slate-600">Selisih (+ / - Bertambah/Berkurang):</span>
                      <span
                        className={`font-mono font-bold text-sm ${selisih > 0
                          ? "text-emerald-700"
                          : selisih < 0
                            ? "text-rose-700"
                            : "text-slate-600"
                          }`}
                      >
                        {selisih > 0 ? "+" : ""}
                        {formatRupiah(selisih)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Peringatan jika Perubahan melebihi Plafond OPD */}
              {isEditRincianExceedingPlafond && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-900">
                      Total Penambahan Melebihi Plafond Pagu Perubahan OPD!
                    </div>
                    <div className="mt-0.5 text-rose-700 leading-relaxed">
                      Penambahan anggaran sebesar{" "}
                      <strong className="font-mono text-rose-950">
                        +{formatRupiah(editDeltaUbah)}
                      </strong>{" "}
                      melebihi sisa Plafond Perubahan OPD yang tersedia sebesar{" "}
                      <strong className="font-mono text-rose-950">
                        {formatRupiah(opdPlafondControl?.sisaPaguUbah ?? 0)}
                      </strong>
                      . Total penganggaran Perubahan OPD tidak boleh melebihi Plafond (
                      {formatRupiah(opdPlafondControl?.paguUbah ?? 0)}).
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRincian(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditRincian || isEditRincianExceedingPlafond || isCurrentModeLocked}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:opacity-95 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingEditRincian ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDeleteDialog
        open={!!deleteDialog}
        title={deleteDialog?.title || "Konfirmasi Hapus"}
        entityName={deleteDialog?.label || "Data"}
        itemLabel={deleteDialog?.label}
        loading={isDeleting}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
