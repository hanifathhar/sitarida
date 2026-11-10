"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  GitBranch,
  FileText,
  DollarSign,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  Trash2,
  Pencil,
  Printer,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Check,
  RotateCcw,
  Sparkles,
  CreditCard,
  Wallet,
  Scissors,
  HelpCircle,
  BadgePercent,
  Receipt,
  FileCheck,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import SpmPrintModal from "@/components/penatausahaan/SpmPrintModal";

export type JenisSpmType =
  | "UP"
  | "GU"
  | "TU"
  | "LS_GAJI"
  | "LS_BARANG_JASA"
  | "UP_KKPD"
  | "GU_KKPD";

export interface SpmManagementViewProps {
  jenisSpm?: JenisSpmType | "ALL";
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: string;
}

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan?: string | null;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
  kepalaJabatan?: string | null;
}

interface UnitItem {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
}

interface ScopeResponse {
  session: {
    userId: string;
    username: string;
    namaLengkap: string;
    roleKode?: string;
    roleNama?: string;
    isCrossOpd: boolean;
    opdId?: string | null;
    unitKerjaId?: string | null;
  };
  opds: OpdItem[];
  units: UnitItem[];
}

interface SpmHeaderItem {
  id: string;
  tahunAnggaran: number;
  no_spm: string;
  tgl_spm: string;
  no_spp: string;
  tgl_spp?: string | null;
  sppId?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  opdId: string;
  unitKerjaId: string | null;
  jenis_spm: string;
  bulan?: number | null;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  no_spd?: string | null;
  tgl_spd?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  kasubagNama?: string | null;
  kasubagNip?: string | null;
  kasubagJabatan?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  status: string;
  keterangan?: string | null;
  rekeningCount: number;
  potonganCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SpmRincianItem {
  id?: string;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  sumberDana?: string | null;
}

interface SpmPotonganItem {
  id?: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  id_billing?: string | null;
  keterangan?: string | null;
}

interface PotonganRef {
  kd_rek6: string;
  nm_rek6: string;
  kategori: string;
  tarifPersen?: number;
}

export default function SpmManagementView({
  jenisSpm = "ALL",
  title = "Pembuatan Surat Perintah Membayar (SPM)",
  subtitle = "Penerbitan dokumen SPM atas beban pengeluaran (UP, GU, TU, LS Gaji, LS Barang dan Jasa) berdasarkan dokumen SPP yang telah diterbitkan",
  badgeLabel = "SPM",
  badgeColor = "bg-rose-100 text-[#88131A] border-rose-200",
}: SpmManagementViewProps) {
  // Navigation Steps: 1: OPD -> 2: Unit -> 3: SPM List -> 4: SPM Form
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Scope & Selection
  const [scopeData, setScopeData] = useState<ScopeResponse | null>(null);
  const [loadingScope, setLoadingScope] = useState(true);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);

  // Search Step 1 & 2
  const [searchOpd, setSearchOpd] = useState("");
  const [searchUnit, setSearchUnit] = useState("");

  // Step 3: SPM List
  const [spmList, setSpmList] = useState<SpmHeaderItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchSpm, setSearchSpm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterJenisSpm, setFilterJenisSpm] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4: SPM Form Data
  const [editingSpmId, setEditingSpmId] = useState<string | null>(null);
  const [activeFormJenisSpm, setActiveFormJenisSpm] = useState<string>("UP");
  const [formHeader, setFormHeader] = useState({
    no_spm: "",
    tgl_spm: new Date().toISOString().split("T")[0],
    no_spp: "",
    tgl_spp: "",
    sppId: "" as string | null,
    bulan: new Date().getMonth() + 1,
    keperluan: "",
    no_spd: "",
    tgl_spd: "",
    nama_penerima: "",
    bank_penerima: "",
    rek_penerima: "",
    npwp_penerima: "",
    bendaharaNama: "",
    bendaharaNip: "",
    kasubagNama: "",
    kasubagNip: "",
    kasubagJabatan: "Kasubag Keuangan",
    pptkNama: "",
    pptkNip: "",
    paKpaNama: "",
    paKpaNip: "",
    status: "DRAFT",
    keterangan: "",
  });
  const [formRincianBelanja, setFormRincianBelanja] = useState<SpmRincianItem[]>([]);
  const [formPotongan, setFormPotongan] = useState<SpmPotonganItem[]>([]);
  const [billingErrors, setBillingErrors] = useState<Record<number, string>>({});
  const [checkingBilling, setCheckingBilling] = useState<Record<number, boolean>>({});
  const [loadingForm, setLoadingForm] = useState(false);
  const [savingSpm, setSavingSpm] = useState(false);

  // Modal Pilih SPP Terbit
  const [showSppModal, setShowSppModal] = useState(false);
  const [loadingSppModal, setLoadingSppModal] = useState(false);
  const [sppTerbitList, setSppTerbitList] = useState<any[]>([]);
  const [searchSppModal, setSearchSppModal] = useState("");

  // Master Potongan Referensi
  const [potonganRefList, setPotonganRefList] = useState<PotonganRef[]>([]);
  const [loadingPotonganRef, setLoadingPotonganRef] = useState(false);

  // Data Petugas Penandatangan per Role OPD
  const [petugasData, setPetugasData] = useState<{
    bendaharaList: { id: string; nama: string; nip: string; jabatan?: string }[];
    kasubagList: { id: string; nama: string; nip: string; jabatan?: string }[];
    pptkList: { id: string; nama: string; nip: string; jabatan?: string }[];
    paKpaList: { id: string; nama: string; nip: string; jabatan?: string }[];
  }>({
    bendaharaList: [],
    kasubagList: [],
    pptkList: [],
    paKpaList: [],
  });
  const [loadingPetugas, setLoadingPetugas] = useState(false);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<SpmHeaderItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Feedback Banner
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // 1. Initial Load: Ambil Scope User & OPD
  useEffect(() => {
    async function initScope() {
      setLoadingScope(true);
      try {
        const res = await fetch("/api/penatausahaan/spm?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setScopeData(json.data);
          const currentYear =
            json.data.session?.tahunAnggaran || new Date().getFullYear();
          setTahunAnggaran(currentYear);

          // Auto select jika user adalah OPD spesifik
          if (
            !json.data.session.isCrossOpd &&
            json.data.session.opdId &&
            json.data.opds.length === 1
          ) {
            const defaultOpd = json.data.opds[0];
            setSelectedOpd(defaultOpd);

            // Cek unit kerja
            const opdUnits = json.data.units.filter(
              (u: UnitItem) => u.opdId === defaultOpd.id
            );
            if (opdUnits.length === 1) {
              setSelectedUnit(opdUnits[0]);
              setCurrentStep(3);
            } else if (opdUnits.length > 1) {
              setCurrentStep(2);
            } else {
              setCurrentStep(3);
            }
          }
        } else {
          setBanner({
            type: "error",
            message: json.error || "Gagal memuat profil otoritas OPD.",
          });
        }
      } catch (err: any) {
        console.error("Error initScope SPM:", err);
        setBanner({
          type: "error",
          message: "Koneksi ke server gagal saat inisialisasi menu SPM.",
        });
      } finally {
        setLoadingScope(false);
      }
    }

    initScope();
    loadPotonganRef();
  }, []);

  // Ambil referensi kode potongan standar (PPN, PPh, BPJS)
  async function loadPotonganRef() {
    setLoadingPotonganRef(true);
    try {
      const res = await fetch("/api/penatausahaan/spm/referensi?type=potongan-ref");
      const json = await res.json();
      if (json.success && json.data) {
        setPotonganRefList(json.data);
      }
    } catch (e) {
      console.error("Gagal load referensi potongan:", e);
    } finally {
      setLoadingPotonganRef(false);
    }
  }

  // Ambil daftar petugas penandatangan saat OPD terpilih
  useEffect(() => {
    if (!selectedOpd) return;

    async function fetchPetugas(opdId: string) {
      setLoadingPetugas(true);
      try {
        const res = await fetch(
          `/api/penatausahaan/spm/referensi?type=petugas&opdId=${opdId}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setPetugasData(json.data);
        }
      } catch (e) {
        console.error("Gagal load petugas penandatangan:", e);
      } finally {
        setLoadingPetugas(false);
      }
    }

    fetchPetugas(selectedOpd.id);
  }, [selectedOpd]);

  // Load SPM List saat Step 3 aktif
  useEffect(() => {
    if (currentStep === 3 && selectedOpd) {
      loadSpmList();
    }
  }, [currentStep, selectedOpd, selectedUnit, filterStatus, filterJenisSpm]);

  async function loadSpmList() {
    if (!selectedOpd) return;
    setLoadingList(true);
    try {
      const activeJenis = jenisSpm === "ALL" ? filterJenisSpm : jenisSpm;
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
        jenis_spm: activeJenis,
        jenisSpm: activeJenis,
      });

      if (selectedUnit) {
        params.append("kd_unit", selectedUnit.kd_unit);
      }
      if (filterStatus && filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }
      if (searchSpm.trim()) {
        params.append("q", searchSpm.trim());
      }

      const res = await fetch(`/api/penatausahaan/spm?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSpmList(json.data.items || []);
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SPM.",
        });
      }
    } catch (err: any) {
      console.error("Error loadSpmList:", err);
      setBanner({
        type: "error",
        message: "Koneksi ke server bermasalah saat memuat daftar SPM.",
      });
    } finally {
      setLoadingList(false);
    }
  }

  // Filter Units untuk OPD terpilih
  const availableUnits = useMemo(() => {
    if (!scopeData || !selectedOpd) return [];
    return scopeData.units.filter((u) => u.opdId === selectedOpd.id);
  }, [scopeData, selectedOpd]);

  // Filtered OPDs di Step 1
  const filteredOpds = useMemo(() => {
    if (!scopeData?.opds) return [];
    if (!searchOpd.trim()) return scopeData.opds;
    const q = searchOpd.toLowerCase();
    return scopeData.opds.filter(
      (o) =>
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q) ||
        (o.singkatan && o.singkatan.toLowerCase().includes(q))
    );
  }, [scopeData, searchOpd]);

  // Filtered Sub Units di Step 2
  const filteredSubUnits = useMemo(() => {
    if (!availableUnits) return [];
    if (!searchUnit.trim()) return availableUnits;
    const q = searchUnit.toLowerCase();
    return availableUnits.filter(
      (u) =>
        u.kd_unit.toLowerCase().includes(q) ||
        u.nm_unit.toLowerCase().includes(q)
    );
  }, [availableUnits, searchUnit]);

  // Handler Step Transitions (Samakan persis dengan alur SPP & RKA)
  function handleSelectAndNextOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setSelectedUnit(null);
    setSearchUnit("");
    setBanner(null);
    setCurrentStep(2);
  }

  function handleSelectAndNextUnit(unit: UnitItem | null) {
    setSelectedUnit(unit);
    setBanner(null);
    setCurrentStep(3);
  }

  // Generate nomor urut SPM berikutnya
  async function fetchNextSpmNumber(
    opd: OpdItem,
    unit?: UnitItem | null,
    targetJenis: string = "UP"
  ) {
    try {
      const res = await fetch(
        `/api/penatausahaan/spm/referensi?type=next-no&tahun=${tahunAnggaran}&kd_skpd=${opd.kd_skpd}`
      );
      const json = await res.json();
      const seq = json?.data?.nextSeq || 1;
      const paddedNoUrut = String(seq).padStart(5, "0");
      const kdUnitTarget =
        unit?.kd_unit || availableUnits[0]?.kd_unit || opd.kd_skpd;
      const jnsSpmCode = (targetJenis !== "ALL" ? targetJenis : "UP").replace(/_/g, "-");
      return `900/${paddedNoUrut}/${kdUnitTarget}/SPM/${jnsSpmCode}/${tahunAnggaran}`;
    } catch {
      return `900/00001/${opd.kd_skpd}/SPM/${targetJenis}/${tahunAnggaran}`;
    }
  }

  // Buat SPM Baru
  async function handleCreateNewSpm() {
    if (!selectedOpd) return;

    const defaultBendahara = petugasData.bendaharaList[0];
    const defaultKasubag = petugasData.kasubagList[0];
    const defaultPptk = petugasData.pptkList[0];
    const defaultPa = petugasData.paKpaList[0];

    const initialJenis = jenisSpm !== "ALL" ? jenisSpm : "UP";
    setActiveFormJenisSpm(initialJenis);
    const nextNo = await fetchNextSpmNumber(selectedOpd, selectedUnit, initialJenis);

    setEditingSpmId(null);
    setFormHeader({
      no_spm: nextNo,
      tgl_spm: new Date().toISOString().split("T")[0],
      no_spp: "",
      tgl_spp: "",
      sppId: null,
      bulan: new Date().getMonth() + 1,
      keperluan: `Pembayaran SPM ${selectedOpd.nm_skpd} Tahun ${tahunAnggaran}`,
      no_spd: "",
      tgl_spd: "",
      nama_penerima: "",
      bank_penerima: "",
      rek_penerima: "",
      npwp_penerima: "",
      bendaharaNama: defaultBendahara?.nama || "",
      bendaharaNip: defaultBendahara?.nip || "",
      kasubagNama: defaultKasubag?.nama || "",
      kasubagNip: defaultKasubag?.nip || "",
      kasubagJabatan: defaultKasubag?.jabatan || "Kasubag Keuangan",
      pptkNama: defaultPptk?.nama || "",
      pptkNip: defaultPptk?.nip || "",
      paKpaNama: defaultPa?.nama || selectedOpd.kepalaNama || "",
      paKpaNip: defaultPa?.nip || selectedOpd.kepalaNip || "",
      status: "DRAFT",
      keterangan: "",
    });
    setFormRincianBelanja([]);
    setFormPotongan([]);
    setBillingErrors({});
    setCheckingBilling({});

    setCurrentStep(4);

    // Langsung buka modal pilih SPP agar user nyaman memilih dokumen SPP asal
    handleOpenSppModal();
  }

  // Edit / Buka Detail SPM
  async function handleEditSpm(spmItem: SpmHeaderItem) {
    setLoadingForm(true);
    setEditingSpmId(spmItem.id);
    setActiveFormJenisSpm(spmItem.jenis_spm || "UP");
    setBillingErrors({});
    setCheckingBilling({});
    try {
      const res = await fetch(`/api/penatausahaan/spm/${spmItem.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.jenis_spm) {
          setActiveFormJenisSpm(d.jenis_spm);
        }
        setFormHeader({
          no_spm: d.no_spm || "",
          tgl_spm: d.tgl_spm || new Date().toISOString().split("T")[0],
          no_spp: d.no_spp || "",
          tgl_spp: d.tgl_spp || "",
          sppId: d.sppId || null,
          bulan: d.bulan || new Date().getMonth() + 1,
          keperluan: d.keperluan || "",
          no_spd: d.no_spd || "",
          tgl_spd: d.tgl_spd || "",
          nama_penerima: d.nama_penerima || "",
          bank_penerima: d.bank_penerima || "",
          rek_penerima: d.rek_penerima || "",
          npwp_penerima: d.npwp_penerima || "",
          bendaharaNama: d.bendaharaNama || "",
          bendaharaNip: d.bendaharaNip || "",
          kasubagNama: d.kasubagNama || "",
          kasubagNip: d.kasubagNip || "",
          kasubagJabatan: d.kasubagJabatan || "Kasubag Keuangan",
          pptkNama: d.pptkNama || "",
          pptkNip: d.pptkNip || "",
          paKpaNama: d.paKpaNama || "",
          paKpaNip: d.paKpaNip || "",
          status: d.status || "DRAFT",
          keterangan: d.keterangan || "",
        });
        setFormRincianBelanja(d.rincian || []);
        setFormPotongan(
          (d.potongan || []).map((p: any) => ({
            id: p.id,
            kd_rek6: p.kd_rek6,
            nm_rek6: p.nm_rek6,
            nilai: Number(p.nilai) || 0,
            id_billing: p.id_billing || "",
            keterangan: p.keterangan || "",
          }))
        );

        setCurrentStep(4);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal mengambil rincian data SPM.",
        });
      }
    } catch (err: any) {
      console.error("Error getSpmDetail:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat mengambil data SPM dari server.",
      });
    } finally {
      setLoadingForm(false);
    }
  }

  // Buka Modal Pilih SPP
  async function handleOpenSppModal() {
    if (!selectedOpd) return;
    setShowSppModal(true);
    setLoadingSppModal(true);
    try {
      const activeJenis = jenisSpm === "ALL" ? "ALL" : jenisSpm;
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
        jenis_spm: activeJenis,
        jenisSpm: activeJenis,
      });
      if (selectedUnit) {
        params.append("kd_unit", selectedUnit.kd_unit);
      }
      if (editingSpmId) {
        params.append("excludeSpmId", editingSpmId);
      }

      const res = await fetch(`/api/penatausahaan/spm/referensi?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSppTerbitList(json.data);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SPP pilihan.",
        });
      }
    } catch (err) {
      console.error("Error load SPP Pilihan:", err);
    } finally {
      setLoadingSppModal(false);
    }
  }

  // Pilih SPP & Tarik Datanya
  function handleSelectSpp(spp: any) {
    const derivedJenis = (spp.jenis_spp || spp.jenis_spm || "UP")
      .toUpperCase()
      .replace(/-/g, "_");
    setActiveFormJenisSpm(derivedJenis);
    const jnsSpmCode = derivedJenis.replace(/_/g, "-");

    // Ubah redaksi keperluan dari SPP ke SPM jika default
    let kep = spp.keperluan || "";
    if (kep.includes("Surat Permintaan Pembayaran")) {
      kep = kep.replace("Surat Permintaan Pembayaran", "Surat Perintah Membayar");
    }
    if (kep.includes("SPP")) {
      kep = kep.replace("SPP", "SPM");
    }

    setFormHeader((prev) => {
      let updatedNo = prev.no_spm;
      if (updatedNo.includes("/SPM/")) {
        const parts = updatedNo.split("/SPM/");
        const afterParts = parts[1]?.split("/") || [];
        if (afterParts.length >= 2) {
          // Ganti kode jenis di dalam no_spm: 900/00001/kd_skpd/SPM/JENIS/2026
          updatedNo = `${parts[0]}/SPM/${jnsSpmCode}/${afterParts[afterParts.length - 1]}`;
        }
      }

      return {
        ...prev,
        no_spm: updatedNo,
        sppId: spp.id,
        no_spp: spp.no_spp,
        tgl_spp: spp.tgl_spp,
        keperluan: kep,
        no_spd: spp.no_spd || prev.no_spd,
        tgl_spd: spp.tgl_spd || prev.tgl_spd,
        nama_penerima: spp.nama_penerima || prev.nama_penerima,
        bank_penerima: spp.bank_penerima || prev.bank_penerima,
        rek_penerima: spp.rek_penerima || prev.rek_penerima,
        npwp_penerima: spp.npwp_penerima || prev.npwp_penerima,
        bendaharaNama: spp.bendaharaNama || prev.bendaharaNama,
        bendaharaNip: spp.bendaharaNip || prev.bendaharaNip,
        kasubagNama: spp.kasubagNama || prev.kasubagNama,
        kasubagNip: spp.kasubagNip || prev.kasubagNip,
        kasubagJabatan: spp.kasubagJabatan || prev.kasubagJabatan,
        pptkNama: spp.pptkNama || prev.pptkNama,
        pptkNip: spp.pptkNip || prev.pptkNip,
        paKpaNama: spp.paKpaNama || prev.paKpaNama,
        paKpaNip: spp.paKpaNip || prev.paKpaNip,
      };
    });

    // Tarik rincian belanja dari trdspp
    const rincianTransformed: SpmRincianItem[] = (spp.rincian || []).map((r: any) => ({
      id: r.id,
      kd_program: r.kd_program || "",
      nm_program: r.nm_program || "",
      kd_kegiatan: r.kd_kegiatan || "",
      nm_kegiatan: r.nm_kegiatan || "",
      kd_sub_kegiatan: r.kd_sub_kegiatan || "",
      nm_sub_kegiatan: r.nm_sub_kegiatan || "",
      kd_rek6: r.kd_rek6,
      nm_rek6: r.nm_rek6,
      nilai: Number(r.nilai) || 0,
      sumberDana: r.sumberDana || null,
    }));

    setFormRincianBelanja(rincianTransformed);
    setShowSppModal(false);

    setBanner({
      type: "success",
      title: "Data SPP Berhasil Ditarik",
      message: `Berhasil menarik data dari Dokumen ${spp.no_spp} dengan total belanja ${formatRupiah(
        spp.nilai
      )}. Rincian belanja siap diterbitkan menjadi SPM.`,
    });
  }

  // Tambah baris Potongan baru
  function handleAddPotongan() {
    const defaultRef = potonganRefList[0] || {
      kd_rek6: "2.1.01.05.01.0001",
      nm_rek6: "Utang Pajak Pertambahan Nilai (PPN)",
    };

    setFormPotongan((prev) => [
      ...prev,
      {
        kd_rek6: defaultRef.kd_rek6,
        nm_rek6: defaultRef.nm_rek6,
        nilai: 0,
        id_billing: "",
        keterangan: "",
      },
    ]);
  }

  // Validasi ID Billing (Mencegah Duplikasi Internal & Database)
  async function validateIdBilling(index: number, idBillingValue: string) {
    const trimmed = idBillingValue.trim();
    if (!trimmed) {
      setBillingErrors((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
      return true;
    }

    // 1. Cek duplikasi di form potongan yang sama
    const duplicateInForm = formPotongan.find(
      (p, i) => i !== index && p.id_billing?.trim().toUpperCase() === trimmed.toUpperCase()
    );

    if (duplicateInForm) {
      const errorMsg = `ID Billing "${trimmed}" sudah pernah digunakan. Silahkan periksa kembali ID Billing anda.`;
      setBillingErrors((prev) => ({ ...prev, [index]: errorMsg }));
      setBanner({
        type: "error",
        title: "ID Billing Duplikat",
        message: errorMsg,
      });
      return false;
    }

    // 2. Cek ke database apakah ID Billing sudah pernah digunakan pada SPM lain
    setCheckingBilling((prev) => ({ ...prev, [index]: true }));
    try {
      const params = new URLSearchParams({
        type: "check-id-billing",
        idBilling: trimmed,
      });
      if (editingSpmId) {
        params.append("excludeSpmId", editingSpmId);
      }
      const res = await fetch(`/api/penatausahaan/spm/referensi?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data?.isUsed) {
        const errorMsg =
          json.data.message ||
          `ID Billing "${trimmed}" sudah pernah diinput pada Dokumen SPM lain.`;
        setBillingErrors((prev) => ({ ...prev, [index]: errorMsg }));
        setBanner({
          type: "error",
          title: "ID Billing Sudah Pernah Diinput",
          message: errorMsg,
        });
        return false;
      } else {
        setBillingErrors((prev) => {
          const copy = { ...prev };
          delete copy[index];
          return copy;
        });
        return true;
      }
    } catch (err) {
      console.error("Error check id billing:", err);
      return true;
    } finally {
      setCheckingBilling((prev) => ({ ...prev, [index]: false }));
    }
  }

  // Update data baris potongan
  function handleUpdatePotongan(index: number, field: keyof SpmPotonganItem, value: any) {
    setFormPotongan((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Jika field kd_rek6 diganti, otomatis cocokkan nm_rek6 jika ada di daftar ref
      if (field === "kd_rek6") {
        const found = potonganRefList.find((r) => r.kd_rek6 === value);
        if (found) {
          next[index].nm_rek6 = found.nm_rek6;
        }
      }
      return next;
    });

    // Jika user mengedit ID Billing, bersihkan error sementara agar user leluasa mengetik
    if (field === "id_billing" && billingErrors[index]) {
      setBillingErrors((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }
  }

  // Hapus baris potongan
  function handleRemovePotongan(index: number) {
    setFormPotongan((prev) => prev.filter((_, i) => i !== index));
    setBillingErrors((prev) => {
      const nextErrors: Record<number, string> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index) nextErrors[k] = val;
        else if (k > index) nextErrors[k - 1] = val;
      });
      return nextErrors;
    });
    setCheckingBilling((prev) => {
      const nextCheck: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = Number(key);
        if (k < index) nextCheck[k] = val;
        else if (k > index) nextCheck[k - 1] = val;
      });
      return nextCheck;
    });
  }

  // Hitung Nilai Bruto, Total Potongan, dan Nilai Bersih
  const totalNilaiBruto = useMemo(() => {
    return formRincianBelanja.reduce(
      (sum, item) => sum + (Number(item.nilai) || 0),
      0
    );
  }, [formRincianBelanja]);

  const totalNilaiPotongan = useMemo(() => {
    return formPotongan.reduce(
      (sum, item) => sum + (Number(item.nilai) || 0),
      0
    );
  }, [formPotongan]);

  const totalNilaiBersih = useMemo(() => {
    return Math.max(0, totalNilaiBruto - totalNilaiPotongan);
  }, [totalNilaiBruto, totalNilaiPotongan]);

  // Simpan Dokumen SPM
  async function handleSaveSpm(statusTarget: "DRAFT" | "DIAJUKAN") {
    if (!selectedOpd) return;

    if (!formHeader.no_spm.trim()) {
      setBanner({ type: "error", message: "Nomor SPM wajib diisi." });
      return;
    }
    if (!formHeader.tgl_spm) {
      setBanner({ type: "error", message: "Tanggal SPM wajib diisi." });
      return;
    }
    if (!formHeader.no_spp.trim()) {
      setBanner({
        type: "error",
        message:
          "Dokumen SPP belum dipilih. Silakan klik tombol 'Pilih Dokumen SPP' terlebih dahulu.",
      });
      return;
    }
    if (!formHeader.keperluan.trim()) {
      setBanner({
        type: "error",
        message: "Uraian keperluan pembayaran SPM wajib diisi.",
      });
      return;
    }
    if (formRincianBelanja.length === 0) {
      setBanner({
        type: "error",
        message:
          "Rincian belanja kosong. Pastikan SPP yang dipilih memiliki rincian belanja.",
      });
      return;
    }
    if (totalNilaiPotongan > totalNilaiBruto) {
      setBanner({
        type: "error",
        title: "Total Potongan Tidak Valid",
        message: "Total nilai potongan tidak boleh melebihi nilai total bruto belanja.",
      });
      return;
    }

    // 1. Cek error ID Billing yang masih aktif
    const activeErrorIndices = Object.keys(billingErrors);
    if (activeErrorIndices.length > 0) {
      const firstIdx = Number(activeErrorIndices[0]);
      setBanner({
        type: "error",
        title: "ID Billing Tidak Valid",
        message:
          billingErrors[firstIdx] ||
          "Terdapat ID Billing yang duplikat atau sudah pernah digunakan. Mohon periksa kembali tabel potongan.",
      });
      return;
    }

    // 2. Validasi kelengkapan & keunikan ID Billing pada seluruh baris potongan
    const billingMap = new Map<string, number>();
    for (let i = 0; i < formPotongan.length; i++) {
      const rawBilling = formPotongan[i].id_billing?.trim();
      if (rawBilling) {
        const upper = rawBilling.toUpperCase();
        if (billingMap.has(upper)) {
          const firstI = billingMap.get(upper)!;
          const msg = `ID Billing "${rawBilling}" diinput ganda pada baris ke-${firstI + 1} dan baris ke-${i + 1}. Setiap potongan harus menggunakan ID Billing unik.`;
          setBillingErrors((prev) => ({ ...prev, [i]: msg }));
          setBanner({
            type: "error",
            title: "ID Billing Duplikat",
            message: msg,
          });
          return;
        }
        billingMap.set(upper, i);

        // Validasi ke database untuk memastikan
        const isValid = await validateIdBilling(i, rawBilling);
        if (!isValid) return;
      }
    }

    setSavingSpm(true);
    try {
      const payload = {
        id: editingSpmId || undefined,
        tahunAnggaran,
        no_spm: formHeader.no_spm.trim(),
        tgl_spm: formHeader.tgl_spm,
        no_spp: formHeader.no_spp.trim(),
        tgl_spp: formHeader.tgl_spp || null,
        sppId: formHeader.sppId || null,
        opdId: selectedOpd.id,
        unitKerjaId: selectedUnit?.id || null,
        jenis_spm: activeFormJenisSpm || (jenisSpm !== "ALL" ? jenisSpm : "UP"),
        bulan: formHeader.bulan ? Number(formHeader.bulan) : null,
        keperluan: formHeader.keperluan.trim(),
        nilai: totalNilaiBruto,
        no_spd: formHeader.no_spd.trim() || null,
        tgl_spd: formHeader.tgl_spd || null,
        nama_penerima: formHeader.nama_penerima?.trim() || null,
        bank_penerima: formHeader.bank_penerima?.trim() || null,
        rek_penerima: formHeader.rek_penerima?.trim() || null,
        npwp_penerima: formHeader.npwp_penerima?.trim() || null,
        bendaharaNama: formHeader.bendaharaNama?.trim() || null,
        bendaharaNip: formHeader.bendaharaNip?.trim() || null,
        kasubagNama: formHeader.kasubagNama?.trim() || null,
        kasubagNip: formHeader.kasubagNip?.trim() || null,
        kasubagJabatan: formHeader.kasubagJabatan?.trim() || null,
        pptkNama: formHeader.pptkNama?.trim() || null,
        pptkNip: formHeader.pptkNip?.trim() || null,
        paKpaNama: formHeader.paKpaNama?.trim() || null,
        paKpaNip: formHeader.paKpaNip?.trim() || null,
        status: statusTarget,
        keterangan: formHeader.keterangan?.trim() || null,
        potongan: formPotongan.map((p) => ({
          id: p.id,
          kd_rek6: p.kd_rek6,
          nm_rek6: p.nm_rek6,
          nilai: Number(p.nilai) || 0,
          id_billing: p.id_billing?.trim() || null,
          keterangan: p.keterangan?.trim() || null,
        })),
      };

      const res = await fetch("/api/penatausahaan/spm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "Berhasil",
          message: `Dokumen ${formHeader.no_spm} berhasil disimpan dengan status ${statusTarget}.`,
        });
        setCurrentStep(3);
        loadSpmList();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menyimpan SPM",
          message: json.error || "Gagal menyimpan dokumen SPM ke basis data.",
        });
      }
    } catch (err: any) {
      console.error("Error save SPM:", err);
      setBanner({
        type: "error",
        title: "Kesalahan Jaringan",
        message: err.message || "Gagal menghubungi server saat menyimpan SPM.",
      });
    } finally {
      setSavingSpm(false);
    }
  }

  // Hapus SPM
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/penatausahaan/spm/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "Berhasil Dihapus",
          message: `Dokumen SPM ${deleteTarget.no_spm} telah berhasil dihapus.`,
        });
        setDeleteTarget(null);
        loadSpmList();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menghapus SPM",
          message: json.error || "Gagal menghapus dokumen SPM.",
        });
      }
    } catch (err: any) {
      console.error("Error delete SPM:", err);
      setBanner({
        type: "error",
        message: "Terjadi gangguan saat menghapus dokumen SPM.",
      });
    } finally {
      setDeleting(false);
    }
  }

  // Cetak SPM
  async function handleOpenPrint(spmItem: SpmHeaderItem) {
    setLoadingPrint(true);
    setShowPrintModal(true);
    try {
      const res = await fetch(`/api/penatausahaan/spm/${spmItem.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPrintData(json.data);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat format cetak SPM.",
        });
        setShowPrintModal(false);
      }
    } catch (err) {
      console.error("Error cetak SPM:", err);
      setShowPrintModal(false);
    } finally {
      setLoadingPrint(false);
    }
  }

  // Paginated SPM List di Step 3
  const totalPages = Math.ceil(spmList.length / pageSize) || 1;
  const paginatedSpmList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return spmList.slice(start, start + pageSize);
  }, [spmList, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Action Banner Notification */}
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* Header Halaman Utama */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${badgeColor}`}
              >
                {badgeLabel}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Tahun Anggaran {tahunAnggaran}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>

          {/* OPD Selector Info jika sudah terpilih */}
          {selectedOpd && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <Building2 className="w-5 h-5 text-[#88131A] shrink-0" />
              <div className="text-left">
                <div className="text-[11px] font-extrabold text-slate-900 line-clamp-1">
                  [{selectedOpd.kd_skpd}] {selectedOpd.nm_skpd}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedUnit
                    ? `Unit: [${selectedUnit.kd_unit}] ${selectedUnit.nm_unit}`
                    : "Seluruh Unit Kerja / SKPD Induk"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="ml-2 px-2.5 py-1 text-[10px] font-bold text-[#88131A] hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
              >
                Ganti
              </button>
            </div>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            { step: 1, label: "1. Pilih OPD", icon: Building2 },
            { step: 2, label: "2. Pilih Unit", icon: GitBranch },
            { step: 3, label: `3. Daftar ${badgeLabel}`, icon: FileText },
            { step: 4, label: "4. Pengisian SPM", icon: DollarSign },
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
                    {s.step === 3 && `${spmList.length} Dokumen`}
                    {s.step === 4 &&
                      (formHeader.no_spm ? formHeader.no_spm : "Formulir SPM")}
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
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti OPD</span>
            </button>
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
            ) : filteredSubUnits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Tidak ada Sub Unit yang sesuai dengan pencarian &quot;{searchUnit}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 max-h-[460px] overflow-y-auto p-1">
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
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 3: DAFTAR DOKUMEN SPM                                    */}
      {/* ============================================================== */}
      {currentStep === 3 && selectedOpd && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar Summary & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#88131A]" />
                  <span>Daftar Dokumen {title}</span>
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCreateNewSpm}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Buat {badgeLabel} Baru
                </button>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">
                  Total Dokumen SPM
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {spmList.length}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    Berkas
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200/60">
                <div className="text-[11px] font-medium text-blue-800">
                  Total Bruto Belanja
                </div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  {formatRupiah(
                    spmList.reduce((acc, curr) => acc + curr.nilai, 0)
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/60">
                <div className="text-[11px] font-medium text-amber-800">
                  Total Potongan Pajak
                </div>
                <div className="text-lg font-black text-amber-900 mt-1">
                  {formatRupiah(
                    spmList.reduce((acc, curr) => acc + curr.nilai_potongan, 0)
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
                <div className="text-[11px] font-medium text-emerald-800">
                  Total Bersih (Netto)
                </div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  {formatRupiah(
                    spmList.reduce((acc, curr) => acc + curr.nilai_bersih, 0)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchSpm}
                onChange={(e) => setSearchSpm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadSpmList();
                }}
                placeholder="Cari no SPM, no SPP, uraian..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
              />
            </div>

            <div className="flex items-center gap-2">
              {jenisSpm === "ALL" && (
                <select
                  value={filterJenisSpm}
                  onChange={(e) => setFilterJenisSpm(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                >
                  <option value="ALL">Semua Jenis SPM</option>
                  <option value="UP">SPM-UP</option>
                  <option value="GU">SPM-GU</option>
                  <option value="TU">SPM-TU</option>
                  <option value="LS_GAJI">SPM-LS Gaji</option>
                  <option value="LS_BARANG_JASA">SPM-LS Barjas</option>
                  <option value="UP_KKPD">SPM-UP KKPD</option>
                  <option value="GU_KKPD">SPM-GU KKPD</option>
                </select>
              )}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DIAJUKAN">DIAJUKAN</option>
                <option value="DIVERIFIKASI">DIVERIFIKASI</option>
                <option value="DISETUJUI">DISETUJUI</option>
                <option value="DITOLAK">DITOLAK</option>
              </select>
              <button
                onClick={loadSpmList}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer"
                title="Refresh Daftar"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabel SPM */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">No. SPM & Tanggal</th>
                    <th className="px-4 py-3">No. SPP (Sumber)</th>
                    <th className="px-4 py-3">Keperluan / Penerima</th>
                    <th className="px-4 py-3 text-right">Nilai Bruto</th>
                    <th className="px-4 py-3 text-right">Potongan</th>
                    <th className="px-4 py-3 text-right">Nilai Bersih</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingList ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                        <p className="mt-2 text-xs">Memuat daftar SPM...</p>
                      </td>
                    </tr>
                  ) : paginatedSpmList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Belum ada dokumen {badgeLabel} yang terdaftar.
                        </p>
                        <button
                          onClick={handleCreateNewSpm}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5E0E14] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#88131A]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Buat SPM Pertama</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedSpmList.map((spm) => {
                      return (
                        <tr
                          key={spm.id}
                          className="transition hover:bg-slate-50/75"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-900">
                                {spm.no_spm}
                              </span>
                              {spm.jenis_spm && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                                  {spm.jenis_spm.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Calendar className="h-3 w-3" />
                              <span>{spm.tgl_spm}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-semibold text-rose-800">
                              {spm.no_spp}
                            </span>
                            {spm.tgl_spp && (
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {spm.tgl_spp}
                              </div>
                            )}
                          </td>

                          <td className="max-w-xs px-4 py-3.5">
                            <p className="line-clamp-2 text-xs text-slate-700">
                              {spm.keperluan}
                            </p>
                            {spm.nama_penerima && (
                              <p className="mt-1 text-[11px] font-medium text-slate-500">
                                Penerima: {spm.nama_penerima}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                            {formatRupiah(spm.nilai)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-amber-700">
                            {formatRupiah(spm.nilai_potongan)}
                            {spm.potonganCount > 0 && (
                              <div className="text-[10px] text-slate-400">
                                {spm.potonganCount} item
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                            {formatRupiah(spm.nilai_bersih)}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${spm.status === "DISETUJUI"
                                ? "bg-emerald-100 text-emerald-800"
                                : spm.status === "DIAJUKAN"
                                  ? "bg-blue-100 text-blue-800"
                                  : spm.status === "DIVERIFIKASI"
                                    ? "bg-purple-100 text-purple-800"
                                    : spm.status === "DITOLAK"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-slate-100 text-slate-700"
                                }`}
                            >
                              {spm.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditSpm(spm)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                title="Lihat / Edit Dokumen SPM"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenPrint(spm)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                                title="Cetak Format Resmi SPM"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(spm)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-700"
                                title="Hapus Dokumen SPM"
                              >
                                <Trash2 className="h-4 w-4" />
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

            {/* Pagination Bar */}
            {spmList.length > 0 && (
              <div className="border-t border-slate-200">
                <PaginationBar
                  page={currentPage}
                  totalPages={totalPages}
                  total={spmList.length}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: FORMULIR SPM */}
      {/* ========================================================================= */}
      {currentStep === 4 && selectedOpd && (
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Breadcrumb Back */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Daftar SPM</span>
            </button>
            <div className="flex items-center gap-2">
              {editingSpmId && (
                <button
                  type="button"
                  onClick={() => handleOpenPrint({ id: editingSpmId } as any)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#88131A] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Format SPM</span>
                </button>
              )}
              <span className="text-xs text-slate-500">
                {editingSpmId ? "Mode Edit Dokumen" : "Dokumen Baru"}
              </span>
            </div>
          </div>



          <div className="space-y-6">
            {/* 1. Header Informasi SPM & Penarikan SPP */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Informasi Dokumen SPM
                    </h3>
                    {activeFormJenisSpm && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                        {activeFormJenisSpm.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Nomor, tanggal dan relasi dengan dokumen SPP sumber.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSppModal}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:opacity-95"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>
                    {formHeader.no_spp ? "Ganti Dokumen SPP" : "Pilih Dokumen SPP"}
                  </span>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor SPM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formHeader.no_spm}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, no_spm: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
                    placeholder="900/00001/.../SPM/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal SPM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formHeader.tgl_spm}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, tgl_spm: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Bulan Anggaran
                  </label>
                  <select
                    value={formHeader.bulan || 1}
                    onChange={(e) =>
                      setFormHeader((p) => ({
                        ...p,
                        bulan: parseInt(e.target.value, 10),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  >
                    {[
                      "Januari",
                      "Februari",
                      "Maret",
                      "April",
                      "Mei",
                      "Juni",
                      "Juli",
                      "Agustus",
                      "September",
                      "Oktober",
                      "November",
                      "Desember",
                    ].map((bln, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Bulan {idx + 1} - {bln}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Box SPP Terpilih */}
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                      Dokumen SPP
                    </span>
                    {formHeader.no_spp ? (
                      <div className="mt-1">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {formHeader.no_spp}
                        </span>
                        {formHeader.tgl_spp && (
                          <span className="ml-2 text-xs text-slate-600">
                            (Tanggal: {formHeader.tgl_spp})
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs italic text-rose-600">
                        Belum ada dokumen SPP yang dipilih. Silakan klik tombol &apos;Pilih Dokumen SPP&apos;.
                      </p>
                    )}
                  </div>

                  {formHeader.no_spd && (
                    <div className="rounded-lg bg-white px-3 py-1.5 border border-rose-100 text-xs">
                      <span className="text-slate-500 font-medium">Dasar SPD:</span>{" "}
                      <span className="font-mono font-bold text-slate-800">
                        {formHeader.no_spd}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Uraian Keperluan */}
              <div className="mt-5">
                <label className="block text-xs font-bold text-slate-700">
                  Uraian Keperluan Pembayaran SPM <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formHeader.keperluan}
                  onChange={(e) =>
                    setFormHeader((p) => ({ ...p, keperluan: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  placeholder="Contoh: Pembayaran Surat Perintah Membayar - Uang Persediaan (SPM-UP)..."
                />
              </div>

              {/* Data Penerima */}
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Data Penerima / Rekening Tujuan Pembayaran
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Nama Penerima
                    </label>
                    <input
                      type="text"
                      value={formHeader.nama_penerima || ""}
                      onChange={(e) =>
                        setFormHeader((p) => ({
                          ...p,
                          nama_penerima: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Bank Penerima
                    </label>
                    <input
                      type="text"
                      value={formHeader.bank_penerima || ""}
                      onChange={(e) =>
                        setFormHeader((p) => ({
                          ...p,
                          bank_penerima: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={formHeader.rek_penerima || ""}
                      onChange={(e) =>
                        setFormHeader((p) => ({
                          ...p,
                          rek_penerima: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      NPWP Penerima
                    </label>
                    <input
                      type="text"
                      value={formHeader.npwp_penerima || ""}
                      onChange={(e) =>
                        setFormHeader((p) => ({
                          ...p,
                          npwp_penerima: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Rincian Belanja (Otomatis dari Dokumen SPP via trdspp) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Rincian Belanja
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Total Nilai Bruto:</span>
                  <div className="text-base font-bold text-blue-700">
                    {formatRupiah(totalNilaiBruto)}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Kode Rekening</th>
                      <th className="px-3 py-2.5">Uraian Rekening</th>
                      <th className="px-3 py-2.5">Sub Kegiatan</th>
                      <th className="px-3 py-2.5 text-right">Nilai Belanja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formRincianBelanja.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-xs italic text-slate-400"
                        >
                          Belum ada rincian belanja. Silakan pilih dokumen SPP terlebih dahulu.
                        </td>
                      </tr>
                    ) : (
                      formRincianBelanja.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {r.kd_rek6}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            {r.nm_rek6}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-slate-500">
                            {r.kd_sub_kegiatan ? (
                              <span>
                                [{r.kd_sub_kegiatan}] {r.nm_sub_kegiatan}
                              </span>
                            ) : (
                              <span className="italic text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                            {formatRupiah(r.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {formRincianBelanja.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={4} className="px-4 py-2.5 text-right">
                          Jumlah Belanja (Bruto):
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-700">
                          {formatRupiah(totalNilaiBruto)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 3. Potongan SPM (Tabel trspmpot) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Potongan Pajak & Potongan Lainnya (SPM)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Total Potongan:</span>
                    <div className="text-base font-bold text-amber-700">
                      {formatRupiah(totalNilaiPotongan)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPotongan}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Potongan</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Rekening Potongan</th>
                      <th className="px-3 py-2.5">ID Billing / NTPN</th>
                      <th className="px-3 py-2.5">Keterangan</th>
                      <th className="px-3 py-2.5 text-right">Nilai Potongan (Rp)</th>
                      <th className="px-3 py-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formPotongan.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs italic text-slate-400"
                        >
                          Tidak ada potongan pajak pada SPM ini (Nihil Potongan).
                          Klik tombol &apos;+ Tambah Potongan&apos; jika ada potongan yang harus dipungut.
                        </td>
                      </tr>
                    ) : (
                      formPotongan.map((pot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={pot.kd_rek6}
                              onChange={(e) =>
                                handleUpdatePotongan(idx, "kd_rek6", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                            >
                              {potonganRefList.map((ref) => (
                                <option key={ref.kd_rek6} value={ref.kd_rek6}>
                                  {ref.kd_rek6} - {ref.nm_rek6}
                                </option>
                              ))}
                            </select>
                            <input
                              type="hidden"
                              value={pot.nm_rek6}
                              onChange={(e) =>
                                handleUpdatePotongan(idx, "nm_rek6", e.target.value)
                              }
                              placeholder="Nama Rekening Potongan"
                              className="mt-1 w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 focus:border-[#5E0E14] focus:bg-white focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2.5 align-top min-w-[200px]">
                            <div className="relative">
                              <input
                                type="text"
                                value={pot.id_billing || ""}
                                onChange={(e) =>
                                  handleUpdatePotongan(
                                    idx,
                                    "id_billing",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  validateIdBilling(idx, pot.id_billing || "")
                                }
                                placeholder="ID Billing e-Pajak"
                                className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors focus:outline-none ${billingErrors[idx]
                                  ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-500"
                                  : "border-slate-200 bg-white text-slate-900 focus:border-[#5E0E14]"
                                  }`}
                              />
                              {checkingBilling[idx] && (
                                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 italic">
                                  Memeriksa...
                                </span>
                              )}
                            </div>
                            {billingErrors[idx] && (
                              <div className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-rose-600 leading-tight">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                                <span>{billingErrors[idx]}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={pot.keterangan || ""}
                              onChange={(e) =>
                                handleUpdatePotongan(
                                  idx,
                                  "keterangan",
                                  e.target.value
                                )
                              }
                              placeholder="Catatan / Uraian potongan"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={pot.nilai === 0 ? "" : pot.nilai}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdatePotongan(idx, "nilai", val);
                              }}
                              placeholder="0"
                              className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right font-mono text-xs font-bold text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                            />
                          </td>

                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePotongan(idx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Hapus baris potongan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {formPotongan.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td colSpan={4} className="px-4 py-2.5 text-right">
                          Total Potongan SPM:
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-700">
                          {formatRupiah(totalNilaiPotongan)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 4. Ringkasan Finansial (Bruto, Potongan, Bersih / Netto) */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-md">
              <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
                Ringkasan Nilai Surat Perintah Membayar (SPM)
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3 border-b border-slate-700 pb-5">
                <div>
                  <span className="text-xs text-slate-400">1. Nilai Belanja (Bruto)</span>
                  <div className="mt-1 text-xl font-bold text-slate-100">
                    {formatRupiah(totalNilaiBruto)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-amber-400">2. Total Potongan Pajak / Lainnya</span>
                  <div className="mt-1 text-xl font-bold text-amber-400">
                    - {formatRupiah(totalNilaiPotongan)}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-emerald-400">
                    3. Nilai Bersih yang Dibayarkan (Netto)
                  </span>
                  <div className="mt-1 text-2xl font-black text-emerald-400">
                    {formatRupiah(totalNilaiBersih)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold text-slate-400">
                  Terbilang Nilai Bersih:
                </span>
                <p className="mt-0.5 text-sm font-medium italic text-slate-200">
                  {totalNilaiBersih > 0
                    ? `${terbilang(totalNilaiBersih)} Rupiah`
                    : "Nol Rupiah"}
                </p>
              </div>
            </div>

            {/* 5. Pejabat Penandatangan SPM */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">
                Pejabat Penandatangan SPM
              </h3>

              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
                {/* Bendahara Pengeluaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Bendahara Pengeluaran
                  </label>
                  <select
                    value={formHeader.bendaharaNama || ""}
                    onChange={(e) => {
                      const sel = petugasData.bendaharaList.find(
                        (p) => p.nama === e.target.value
                      );
                      setFormHeader((prev) => ({
                        ...prev,
                        bendaharaNama: sel ? sel.nama : e.target.value,
                        bendaharaNip: sel ? sel.nip : prev.bendaharaNip,
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  >
                    <option value="">-- Pilih Bendahara --</option>
                    {petugasData.bendaharaList.map((p) => (
                      <option key={p.id} value={p.nama}>
                        {p.nama} ({p.nip})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formHeader.bendaharaNip || ""}
                    onChange={(e) =>
                      setFormHeader((p) => ({
                        ...p,
                        bendaharaNip: e.target.value,
                      }))
                    }
                    placeholder="NIP Bendahara"
                    className="mt-1.5 w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600 focus:border-[#5E0E14] focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Kasubag Keuangan / PPK */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Kasubag Keuangan / PPK SKPD
                  </label>
                  <select
                    value={formHeader.kasubagNama || ""}
                    onChange={(e) => {
                      const sel = petugasData.kasubagList.find(
                        (p) => p.nama === e.target.value
                      );
                      setFormHeader((prev) => ({
                        ...prev,
                        kasubagNama: sel ? sel.nama : e.target.value,
                        kasubagNip: sel ? sel.nip : prev.kasubagNip,
                        kasubagJabatan: sel?.jabatan || "Kasubag Keuangan",
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  >
                    <option value="">-- Pilih Kasubag Keuangan --</option>
                    {petugasData.kasubagList.map((p) => (
                      <option key={p.id} value={p.nama}>
                        {p.nama} ({p.nip})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formHeader.kasubagNip || ""}
                    onChange={(e) =>
                      setFormHeader((p) => ({
                        ...p,
                        kasubagNip: e.target.value,
                      }))
                    }
                    placeholder="NIP Kasubag Keuangan"
                    className="mt-1.5 w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600 focus:border-[#5E0E14] focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Pengguna Anggaran (PA / KPA) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Pengguna Anggaran (PA / KPA)
                  </label>
                  <select
                    value={formHeader.paKpaNama || ""}
                    onChange={(e) => {
                      const sel = petugasData.paKpaList.find(
                        (p) => p.nama === e.target.value
                      );
                      setFormHeader((prev) => ({
                        ...prev,
                        paKpaNama: sel ? sel.nama : e.target.value,
                        paKpaNip: sel ? sel.nip : prev.paKpaNip,
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  >
                    <option value="">-- Pilih PA / KPA --</option>
                    {petugasData.paKpaList.map((p) => (
                      <option key={p.id} value={p.nama}>
                        {p.nama} ({p.nip})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formHeader.paKpaNip || ""}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, paKpaNip: e.target.value }))
                    }
                    placeholder="NIP PA / KPA"
                    className="mt-1.5 w-full rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600 focus:border-[#5E0E14] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 6. Status & Catatan Keterangan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Status Dokumen SPM
                  </label>
                  <select
                    value={formHeader.status}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, status: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  >
                    <option value="DRAFT">DRAFT (Penyusunan)</option>
                    <option value="DIAJUKAN">DIAJUKAN (Kirim ke BUD / Kuasa BUD)</option>
                    <option value="DIVERIFIKASI">DIVERIFIKASI (Verifikasi Bendahara Umum)</option>
                    <option value="DISETUJUI">DISETUJUI (Siap Terbit SP2D)</option>
                    <option value="DITOLAK">DITOLAK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Catatan / Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    value={formHeader.keterangan || ""}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, keterangan: e.target.value }))
                    }
                    placeholder="Catatan tambahan (opsional)"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={savingSpm}
                  onClick={() => handleSaveSpm("DRAFT")}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {savingSpm ? "Menyimpan..." : "Simpan DRAFT"}
                </button>

                <button
                  type="button"
                  disabled={savingSpm}
                  onClick={() => handleSaveSpm("DIAJUKAN")}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{savingSpm ? "Menyimpan..." : "Simpan & Ajukan SPM"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PILIH DOKUMEN SPP TERBIT */}
      {/* ========================================================================= */}
      {showSppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pilih Dokumen SPP yang Diterbitkan
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih dokumen SPP {badgeLabel} yang akan diterbitkan menjadi SPM.
                </p>
              </div>
              <button
                onClick={() => setShowSppModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchSppModal}
                  onChange={(e) => setSearchSppModal(e.target.value)}
                  placeholder="Cari berdasarkan nomor SPP, keperluan, atau penerima..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingSppModal ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                  <p className="mt-2 text-xs">Memuat daftar dokumen SPP...</p>
                </div>
              ) : sppTerbitList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Tidak ditemukan dokumen SPP {badgeLabel} yang terbit pada OPD ini.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pastikan dokumen SPP telah dibuat dan diterbitkan terlebih dahulu pada sub-menu SPP.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sppTerbitList
                    .filter((spp) => {
                      // Jangan munculkan SPP yang sudah dibuat SPM jika dalam pembuatan SPM baru
                      if (!editingSpmId && (spp.isUsedBySpm || spp.status === "TELAH DIBUAT SPM")) {
                        return false;
                      }
                      return (
                        spp.no_spp
                          .toLowerCase()
                          .includes(searchSppModal.toLowerCase()) ||
                        (spp.keperluan || "")
                          .toLowerCase()
                          .includes(searchSppModal.toLowerCase()) ||
                        (spp.nama_penerima || "")
                          .toLowerCase()
                          .includes(searchSppModal.toLowerCase())
                      );
                    })
                    .map((spp) => {
                      const isUsed = spp.isUsedBySpm;

                      return (
                        <div
                          key={spp.id}
                          className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center ${isUsed
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-slate-200 bg-white hover:border-[#5E0E14] hover:shadow-sm"
                            }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {spp.no_spp}
                              </span>
                              {spp.jenis_spp && (
                                <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-[#88131A]">
                                  {spp.jenis_spp.replace(/_/g, " ")}
                                </span>
                              )}
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {spp.tgl_spp}
                              </span>
                              {isUsed && (
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  Sudah ada SPM: {spp.usedSpmNo}
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-2 text-xs text-slate-600">
                              {spp.keperluan}
                            </p>
                            <div className="flex items-center gap-4 text-[11px] text-slate-500">
                              {spp.no_spd && (
                                <span>SPD: <strong className="text-slate-700">{spp.no_spd}</strong></span>
                              )}
                              {spp.nama_penerima && (
                                <span>Penerima: <strong className="text-slate-700">{spp.nama_penerima}</strong></span>
                              )}
                              <span>Rincian: <strong className="text-slate-700">{spp.rincian?.length || 0} akun</strong></span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400">Total Nilai:</span>
                              <div className="text-sm font-bold text-blue-700">
                                {formatRupiah(spp.nilai)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectSpp(spp)}
                              className="flex items-center gap-1 rounded-lg bg-[#5E0E14] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#88131A]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Pilih Dokumen</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 text-right">
              <button
                type="button"
                onClick={() => setShowSppModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINT SPM RESMI */}
      {/* ========================================================================= */}
      <SpmPrintModal
        isOpen={showPrintModal}
        onClose={() => {
          setShowPrintModal(false);
          setPrintData(null);
        }}
        spmData={printData}
        loading={loadingPrint}
      />

      {/* ========================================================================= */}
      {/* DIALOG KONFIRMASI HAPUS */}
      {/* ========================================================================= */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Hapus Dokumen SPM"
        entityName="Dokumen SPM"
        itemCode={deleteTarget?.no_spm}
        itemLabel={deleteTarget?.keperluan}
        description={`Apakah Anda yakin ingin menghapus dokumen SPM "${deleteTarget?.no_spm}" senilai ${formatRupiah(
          deleteTarget?.nilai || 0
        )}? Data yang dihapus tidak dapat dipulihkan.`}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
