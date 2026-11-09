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
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Wallet,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";

export type JenisSppType =
  | "UP"
  | "GU"
  | "TU"
  | "LS_GAJI"
  | "LS_BARANG_JASA"
  | "UP_KKPD"
  | "GU_KKPD";

export interface SppManagementViewProps {
  jenisSpp: JenisSppType;
  title: string;
  subtitle: string;
  badgeLabel: string;
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

interface SppHeaderItem {
  id: string;
  tahunAnggaran: number;
  no_spp: string;
  tgl_spp: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  opdId: string;
  unitKerjaId: string | null;
  jenis_spp: string;
  bulan?: number | null;
  keperluan: string;
  nilai: number;
  no_spd?: string | null;
  tgl_spd?: string | null;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  status: string;
  keterangan?: string | null;
  rekeningCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SppRincianItem {
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

interface RekeningRef {
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  paguDpa: number;
  totalSpd: number;
  totalSppLalu: number;
  sisaSpd: number;
}

export default function SppManagementView({
  jenisSpp,
  title,
  subtitle,
  badgeLabel,
  badgeColor = "bg-rose-100 text-rose-800 border-rose-200",
}: SppManagementViewProps) {
  // Navigation Steps: 1: OPD -> 2: Unit -> 3: SPP List -> 4: SPP Form
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Scope & Selection
  const [scopeData, setScopeData] = useState<ScopeResponse | null>(null);
  const [loadingScope, setLoadingScope] = useState(true);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);

  // Step 1 Search OPD
  const [searchOpd, setSearchOpd] = useState("");
  // Step 2 Search Unit
  const [searchUnit, setSearchUnit] = useState("");

  // Step 3: SPP List
  const [sppList, setSppList] = useState<SppHeaderItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchSpp, setSearchSpp] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Step 4: SPP Form Data
  const [editingSppId, setEditingSppId] = useState<string | null>(null);
  const [formHeader, setFormHeader] = useState({
    no_spp: "",
    tgl_spp: new Date().toISOString().split("T")[0],
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
    pptkNama: "",
    pptkNip: "",
    paKpaNama: "",
    paKpaNip: "",
    status: "DRAFT",
    keterangan: "",
  });
  const [formRincian, setFormRincian] = useState<SppRincianItem[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [savingSpp, setSavingSpp] = useState(false);

  // Rekening Belanja Selector Modal
  const [showRekeningModal, setShowRekeningModal] = useState(false);
  const [loadingRekeningRef, setLoadingRekeningRef] = useState(false);
  const [rekeningRefList, setRekeningRefList] = useState<RekeningRef[]>([]);
  const [searchRekening, setSearchRekening] = useState("");

  // Modal Pilih SPD Terbit
  const [showSpdModal, setShowSpdModal] = useState(false);
  const [loadingSpdList, setLoadingSpdList] = useState(false);
  const [spdTerbitList, setSpdTerbitList] = useState<any[]>([]);
  const [searchSpdModal, setSearchSpdModal] = useState("");

  // Data Petugas Penandatangan per Role OPD
  const [petugasData, setPetugasData] = useState<{
    bendaharaList: { id: string; nama: string; nip: string; jabatan?: string }[];
    pptkList: { id: string; nama: string; nip: string; jabatan?: string }[];
    paKpaList: { id: string; nama: string; nip: string; jabatan?: string }[];
  }>({
    bendaharaList: [],
    pptkList: [],
    paKpaList: [],
  });
  const [loadingPetugas, setLoadingPetugas] = useState(false);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<SppHeaderItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Print Modal
  const [printTarget, setPrintTarget] = useState<any | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  // Notification Banner
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // 1. Load Scope Data (OPD & Unit)
  useEffect(() => {
    async function fetchScope() {
      setLoadingScope(true);
      try {
        const res = await fetch("/api/penatausahaan/spp?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setScopeData(json.data);
          // Set tahun login default
          if (json.data.session) {
            // Jika user bukan Lintas OPD dan hanya punya 1 OPD, auto pilih
            if (!json.data.session.isCrossOpd && json.data.opds.length === 1) {
              const defaultOpd = json.data.opds[0];
              setSelectedOpd(defaultOpd);
              // Cek unit kerja user jika ada
              if (json.data.session.unitKerjaId) {
                const defaultUnit = json.data.units.find(
                  (u: UnitItem) => u.id === json.data.session.unitKerjaId
                );
                if (defaultUnit) {
                  setSelectedUnit(defaultUnit);
                  setCurrentStep(3);
                } else {
                  setCurrentStep(3);
                }
              } else {
                // OPD tidak punya unit atau user level OPD
                const opdUnits = json.data.units.filter(
                  (u: UnitItem) => u.opdId === defaultOpd.id
                );
                if (opdUnits.length === 0) {
                  setCurrentStep(3);
                } else {
                  setCurrentStep(2);
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Gagal memuat data scope:", err);
        setBanner({
          type: "error",
          message: "Gagal memuat data perangkat daerah.",
        });
      } finally {
        setLoadingScope(false);
      }
    }
    fetchScope();
  }, []);

  // 2. Load SPP List saat step 3 aktif atau filter berubah
  useEffect(() => {
    if (currentStep === 3 && selectedOpd) {
      loadSppList();
    }
  }, [currentStep, selectedOpd, selectedUnit, filterStatus, tahunAnggaran]);

  async function loadSppList() {
    if (!selectedOpd) return;
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        opdId: selectedOpd.id,
        jenisSpp,
      });
      if (selectedUnit) {
        params.append("unitKerjaId", selectedUnit.id);
      }
      if (searchSpp.trim()) {
        params.append("q", searchSpp.trim());
      }
      if (filterStatus && filterStatus !== "ALL") {
        params.append("status", filterStatus);
      }

      const res = await fetch(`/api/penatausahaan/spp?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSppList(json.data.items || []);
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SPP.",
        });
      }
    } catch (err: any) {
      console.error("Error loadSppList:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat memuat daftar SPP.",
      });
    } finally {
      setLoadingList(false);
    }
  }

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

  // Available Units di Step 2
  const availableUnits = useMemo(() => {
    if (!scopeData?.units || !selectedOpd) return [];
    return scopeData.units.filter((u) => u.opdId === selectedOpd.id);
  }, [scopeData, selectedOpd]);

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

  // Handler Step Transitions (Samakan dengan alur RKA)
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

  // Ambil data Petugas Penandatangan dari OPD terkait
  async function loadPetugasOpd(opdId: string) {
    setLoadingPetugas(true);
    try {
      const res = await fetch(
        `/api/penatausahaan/spp/rekening-referensi?type=petugas&opdId=${opdId}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setPetugasData({
          bendaharaList: json.data.bendaharaList || [],
          pptkList: json.data.pptkList || [],
          paKpaList: json.data.paKpaList || [],
        });
        return json.data;
      }
    } catch (err) {
      console.error("Gagal load petugas OPD:", err);
    } finally {
      setLoadingPetugas(false);
    }
    return null;
  }

  // Tarik data nilai penetapan UP dari tabel tr_penetapan_up
  async function loadPenetapanUpForOpd(opdId: string) {
    try {
      const res = await fetch(
        `/api/penatausahaan/spp/rekening-referensi?type=penetapan-up&tahun=${tahunAnggaran}&opdId=${opdId}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        const nominal =
          jenisSpp === "UP_KKPD"
            ? json.data.nominalKkpd
            : json.data.nominalUp;
        return {
          nominal: Number(nominal) || 0,
          no_sk: json.data.no_sk,
          tgl_sk: json.data.tgl_sk,
          rekeningKas: {
            ...json.data.rekeningKas,
            nilai: Number(nominal) || 0,
          },
        };
      }
    } catch (err) {
      console.error("Gagal load penetapan UP:", err);
    }
    return null;
  }

  // Muat ulang nilai penetapan UP untuk form SPP-UP (kolom program/kegiatan dikosongkan)
  async function handleReloadPenetapanUp() {
    if (!selectedOpd) return;
    const upData = await loadPenetapanUpForOpd(selectedOpd.id);
    if (upData) {
      setFormRincian([
        {
          kd_program: "",
          nm_program: "",
          kd_kegiatan: "",
          nm_kegiatan: "",
          kd_sub_kegiatan: "",
          nm_sub_kegiatan: "",
          kd_rek6: "1.1.01.03.01.0001",
          nm_rek6: "Kas di Bendahara Pengeluaran",
          nilai: upData.nominal,
        },
      ]);
      setBanner({
        type: "success",
        title: "Berhasil",
        message: `Nilai UP berhasil dimuat ulang dari Penetapan UP sebesar ${formatRupiah(
          upData.nominal
        )}. Rekening diset ke 1.1.01.03.01.0001 - Kas di Bendahara Pengeluaran.`,
      });
    }
  }

  // Buka Modal Pilih SPD Terbit
  async function handleOpenSpdModal() {
    if (!selectedOpd) return;
    setShowSpdModal(true);
    setLoadingSpdList(true);
    try {
      const params = new URLSearchParams({
        type: "spd-terbit",
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
      });
      if (selectedUnit) {
        params.append("kd_unit", selectedUnit.kd_unit);
      }
      const res = await fetch(
        `/api/penatausahaan/spp/rekening-referensi?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setSpdTerbitList(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat daftar SPD terbit:", err);
    } finally {
      setLoadingSpdList(false);
    }
  }

  function handleSelectSpd(spd: any) {
    setFormHeader((prev) => ({
      ...prev,
      no_spd: spd.no_spd,
      tgl_spd: spd.tgl_spd || prev.tgl_spd,
    }));
    setShowSpdModal(false);
  }

  // Handler Masuk Form Baru (Create)
  async function handleCreateNewSpp() {
    if (!selectedOpd) return;

    // Ambil daftar petugas penandatangan OPD terlebih dahulu
    const petugas = await loadPetugasOpd(selectedOpd.id);
    const defaultBendahara = petugas?.bendaharaList?.[0];
    const defaultPptk = petugas?.pptkList?.[0];
    const defaultPa = petugas?.paKpaList?.[0];

    // Nomor urut perkiraan
    const count = sppList.length + 1;
    const padded = String(count).padStart(5, "0");
    const autoNo = `${padded}/SPP-${jenisSpp.replace("_", "-")}/${selectedOpd.kd_skpd
      }/${tahunAnggaran}`;

    setEditingSppId(null);
    setFormHeader({
      no_spp: autoNo,
      tgl_spp: new Date().toISOString().split("T")[0],
      bulan: new Date().getMonth() + 1,
      keperluan: `Pembayaran ${title} ${selectedOpd.nm_skpd} Tahun ${tahunAnggaran}`,
      no_spd: "",
      tgl_spd: "",
      nama_penerima:
        jenisSpp.startsWith("UP") || jenisSpp.startsWith("GU")
          ? defaultBendahara?.nama
            ? `Bendahara Pengeluaran (${defaultBendahara.nama})`
            : "Bendahara Pengeluaran " + selectedOpd.nm_skpd
          : "",
      bank_penerima: "BANK JATENG",
      rek_penerima: "",
      npwp_penerima: "",
      bendaharaNama: defaultBendahara?.nama || "",
      bendaharaNip: defaultBendahara?.nip || "",
      pptkNama: defaultPptk?.nama || "",
      pptkNip: defaultPptk?.nip || "",
      paKpaNama: defaultPa?.nama || selectedOpd.kepalaNama || "",
      paKpaNip: defaultPa?.nip || selectedOpd.kepalaNip || "",
      status: "DRAFT",
      keterangan: "",
    });

    // KHUSUS SPP-UP & SPP-UP KKPD: Otomatis tarik nilai UP dari tr_penetapan_up, set rekening 1.1.01.03.01.0001,
    // dan kosongkan program, kegiatan, serta sub kegiatan.
    if (jenisSpp === "UP" || jenisSpp === "UP_KKPD") {
      const upData = await loadPenetapanUpForOpd(selectedOpd.id);
      if (upData) {
        setFormRincian([
          {
            kd_program: "",
            nm_program: "",
            kd_kegiatan: "",
            nm_kegiatan: "",
            kd_sub_kegiatan: "",
            nm_sub_kegiatan: "",
            kd_rek6: "1.1.01.03.01.0001",
            nm_rek6: "Kas di Bendahara Pengeluaran",
            nilai: upData.nominal,
          },
        ]);
        if (upData.nominal <= 0) {
          setBanner({
            type: "error",
            title: "Perhatian",
            message: `Nilai penetapan UP pada OPD ${selectedOpd.nm_skpd} belum diatur pada menu Besaran UP atau masih bernilai Rp 0. Silakan atur di menu Besaran UP atau isi nilai secara manual.`,
          });
        }
      } else {
        setFormRincian([
          {
            kd_program: "",
            nm_program: "",
            kd_kegiatan: "",
            nm_kegiatan: "",
            kd_sub_kegiatan: "",
            nm_sub_kegiatan: "",
            kd_rek6: "1.1.01.03.01.0001",
            nm_rek6: "Kas di Bendahara Pengeluaran",
            nilai: 0,
          },
        ]);
      }
    } else {
      setFormRincian([]);
    }

    setCurrentStep(4);
  }

  // Handler Masuk Edit Form
  async function handleEditSpp(sppItem: SppHeaderItem) {
    setLoadingForm(true);
    try {
      if (selectedOpd) {
        await loadPetugasOpd(selectedOpd.id);
      }
      const res = await fetch(`/api/penatausahaan/spp/${sppItem.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setEditingSppId(d.id);
        setFormHeader({
          no_spp: d.no_spp,
          tgl_spp: d.tgl_spp,
          bulan: d.bulan || 1,
          keperluan: d.keperluan || "",
          no_spd: d.no_spd || "",
          tgl_spd: d.tgl_spd || "",
          nama_penerima: d.nama_penerima || "",
          bank_penerima: d.bank_penerima || "",
          rek_penerima: d.rek_penerima || "",
          npwp_penerima: d.npwp_penerima || "",
          bendaharaNama: d.bendaharaNama || "",
          bendaharaNip: d.bendaharaNip || "",
          pptkNama: d.pptkNama || "",
          pptkNip: d.pptkNip || "",
          paKpaNama: d.paKpaNama || "",
          paKpaNip: d.paKpaNip || "",
          status: d.status || "DRAFT",
          keterangan: d.keterangan || "",
        });
        setFormRincian(
          (d.rincian || []).map((r: any) => ({
            id: r.id,
            kd_program: r.kd_program,
            nm_program: r.nm_program,
            kd_kegiatan: r.kd_kegiatan,
            nm_kegiatan: r.nm_kegiatan,
            kd_sub_kegiatan: r.kd_sub_kegiatan,
            nm_sub_kegiatan: r.nm_sub_kegiatan,
            kd_rek6: r.kd_rek6,
            nm_rek6: r.nm_rek6,
            nilai: Number(r.nilai) || 0,
            sumberDana: r.sumberDana,
          }))
        );
        setCurrentStep(4);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal mengambil detail SPP.",
        });
      }
    } catch (err: any) {
      console.error("Error getSppDetail:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat memuat detail dokumen SPP.",
      });
    } finally {
      setLoadingForm(false);
    }
  }

  // Load Rekening Referensi DPA + Kontrol SPD
  async function handleOpenRekeningSelector() {
    if (!selectedOpd) return;
    setShowRekeningModal(true);
    setLoadingRekeningRef(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
      });
      if (selectedUnit) {
        params.append("kd_unit", selectedUnit.kd_unit);
      }
      if (editingSppId) {
        params.append("excludeSppId", editingSppId);
      }
      const res = await fetch(
        `/api/penatausahaan/spp/rekening-referensi?${params.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setRekeningRefList(json.data);
      }
    } catch (err: any) {
      console.error("Error getRekeningReferensi:", err);
    } finally {
      setLoadingRekeningRef(false);
    }
  }

  // Tambahkan Rekening ke Form Rincian
  function handleSelectRekening(ref: RekeningRef) {
    // Cek apakah sudah ada di tabel rincian
    const exists = formRincian.some(
      (r) =>
        r.kd_sub_kegiatan === ref.kd_sub_kegiatan && r.kd_rek6 === ref.kd_rek6
    );
    if (exists) {
      setBanner({
        type: "error",
        title: "Perhatian",
        message: `Rekening [${ref.kd_rek6}] ${ref.nm_rek6} sudah ada di daftar rincian.`,
      });
      return;
    }

    setFormRincian((prev) => [
      ...prev,
      {
        kd_program: ref.kd_program,
        nm_program: ref.nm_program,
        kd_kegiatan: ref.kd_kegiatan,
        nm_kegiatan: ref.nm_kegiatan,
        kd_sub_kegiatan: ref.kd_sub_kegiatan,
        nm_sub_kegiatan: ref.nm_sub_kegiatan,
        kd_rek6: ref.kd_rek6,
        nm_rek6: ref.nm_rek6,
        nilai: ref.sisaSpd > 0 ? ref.sisaSpd : 0,
      },
    ]);
    setShowRekeningModal(false);
  }

  // Ubah nilai rincian rekening
  function handleChangeRincianNilai(index: number, val: number) {
    setFormRincian((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], nilai: val };
      return next;
    });
  }

  // Hapus baris rincian
  function handleRemoveRincian(index: number) {
    setFormRincian((prev) => prev.filter((_, i) => i !== index));
  }

  // Total Nilai SPP yang sedang di-input
  const totalFormNilai = useMemo(() => {
    return formRincian.reduce(
      (acc, curr) => acc + (Number(curr.nilai) || 0),
      0
    );
  }, [formRincian]);

  // Simpan Dokumen SPP (Draft / Ajukan)
  async function handleSaveSpp(statusTarget: "DRAFT" | "DIAJUKAN") {
    if (!selectedOpd) return;

    if (!formHeader.no_spp.trim()) {
      setBanner({ type: "error", message: "Nomor SPP wajib diisi." });
      return;
    }
    if (!formHeader.tgl_spp) {
      setBanner({ type: "error", message: "Tanggal SPP wajib diisi." });
      return;
    }
    if (!formHeader.keperluan.trim()) {
      setBanner({
        type: "error",
        message: "Uraian keperluan pembayaran wajib diisi.",
      });
      return;
    }
    if (formRincian.length === 0) {
      setBanner({
        type: "error",
        message:
          "Rincian rekening belanja wajib ditambahkan minimal 1 rekening.",
      });
      return;
    }

    // Validasi nilai belanja
    const invalidNilai = formRincian.some(
      (r) => Number(r.nilai) <= 0 || isNaN(Number(r.nilai))
    );
    if (invalidNilai) {
      setBanner({
        type: "error",
        message: "Setiap rekening belanja harus memiliki nilai lebih dari 0.",
      });
      return;
    }

    setSavingSpp(true);
    try {
      const payload = {
        id: editingSppId || undefined,
        tahunAnggaran,
        no_spp: formHeader.no_spp.trim(),
        tgl_spp: formHeader.tgl_spp,
        opdId: selectedOpd.id,
        unitKerjaId: selectedUnit?.id || null,
        jenis_spp: jenisSpp,
        bulan: Number(formHeader.bulan) || null,
        keperluan: formHeader.keperluan.trim(),
        no_spd: formHeader.no_spd.trim() || null,
        tgl_spd: formHeader.tgl_spd || null,
        nama_penerima: formHeader.nama_penerima.trim() || null,
        bank_penerima: formHeader.bank_penerima.trim() || null,
        rek_penerima: formHeader.rek_penerima.trim() || null,
        npwp_penerima: formHeader.npwp_penerima.trim() || null,
        bendaharaNama: formHeader.bendaharaNama.trim() || null,
        bendaharaNip: formHeader.bendaharaNip.trim() || null,
        pptkNama: formHeader.pptkNama.trim() || null,
        pptkNip: formHeader.pptkNip.trim() || null,
        paKpaNama: formHeader.paKpaNama.trim() || null,
        paKpaNip: formHeader.paKpaNip.trim() || null,
        status: statusTarget,
        keterangan: formHeader.keterangan.trim() || null,
        rincian: formRincian,
      };

      const res = await fetch("/api/penatausahaan/spp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          message: `Dokumen SPP berhasil disimpan dengan status ${statusTarget}.`,
        });
        setCurrentStep(3);
        loadSppList();
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal menyimpan dokumen SPP.",
        });
      }
    } catch (err: any) {
      console.error("Error saveSpp:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan dokumen SPP.",
      });
    } finally {
      setSavingSpp(false);
    }
  }

  // Hapus SPP
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/penatausahaan/spp/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          message: `Dokumen SPP No. ${deleteTarget.no_spp} berhasil dihapus.`,
        });
        setDeleteTarget(null);
        loadSppList();
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal menghapus dokumen SPP.",
        });
      }
    } catch (err: any) {
      console.error("Error deleteSpp:", err);
      setBanner({
        type: "error",
        message: "Terjadi kesalahan saat menghapus dokumen SPP.",
      });
    } finally {
      setDeleting(false);
    }
  }

  // Cetak Dokumen SPP (Load Detail + Open Print Modal)
  async function handleOpenPrintModal(sppItem: SppHeaderItem) {
    setLoadingPrint(true);
    try {
      const res = await fetch(`/api/penatausahaan/spp/${sppItem.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPrintTarget(json.data);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat format cetak SPP.",
        });
      }
    } catch (err: any) {
      console.error("Error open print modal:", err);
    } finally {
      setLoadingPrint(false);
    }
  }

  // Print via iframe
  function handlePrintAction() {
    const iframe = reportIframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  // Filter Rekening Modal List
  const filteredRekeningRef = useMemo(() => {
    if (!searchRekening.trim()) return rekeningRefList;
    const q = searchRekening.toLowerCase();
    return rekeningRefList.filter(
      (r) =>
        r.kd_sub_kegiatan.toLowerCase().includes(q) ||
        r.nm_sub_kegiatan.toLowerCase().includes(q) ||
        r.kd_rek6.toLowerCase().includes(q) ||
        r.nm_rek6.toLowerCase().includes(q)
    );
  }, [rekeningRefList, searchRekening]);

  // Filter SPD Terbit Modal List
  const filteredSpdTerbit = useMemo(() => {
    if (!searchSpdModal.trim()) return spdTerbitList;
    const q = searchSpdModal.toLowerCase();
    return spdTerbitList.filter(
      (s) =>
        s.no_spd.toLowerCase().includes(q) ||
        (s.keterangan && s.keterangan.toLowerCase().includes(q)) ||
        (s.periode && s.periode.toLowerCase().includes(q))
    );
  }, [spdTerbitList, searchSpdModal]);

  // Pagination di Step 3
  const totalPagesSpp = Math.max(1, Math.ceil(sppList.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPagesSpp);

  const paginatedSpp = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sppList.slice(start, start + pageSize);
  }, [sppList, safeCurrentPage, pageSize]);

  const totalNilaiSpp = useMemo(() => {
    return sppList.reduce((acc, curr) => acc + (Number(curr.nilai) || 0), 0);
  }, [sppList]);

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
                className="ml-2 px-2.5 py-1 text-[10px] font-bold text-[#88131A] hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
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
            { step: 4, label: "4. Pengisian SPP", icon: DollarSign },
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
                    {s.step === 3 && `${sppList.length} Dokumen`}
                    {s.step === 4 &&
                      (formHeader.no_spp ? formHeader.no_spp : "Formulir SPP")}
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
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 3: DAFTAR DOKUMEN SPP                                    */}
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
                  onClick={handleCreateNewSpp}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Buat {badgeLabel} Baru
                </button>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">
                  Total Dokumen SPP
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {sppList.length}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    Berkas
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-200/60">
                <div className="text-[11px] font-medium text-[#88131A]">
                  Total Nilai SPP Terbit
                </div>
                <div className="text-lg font-black text-[#88131A] mt-1">
                  {formatRupiah(totalNilaiSpp)}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
                <div className="text-[11px] font-medium text-emerald-800">
                  SPP Terverifikasi / Diajukan
                </div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  {
                    sppList.filter(
                      (s) =>
                        s.status === "DIAJUKAN" || s.status === "DIVERIFIKASI"
                    ).length
                  }{" "}
                  <span className="text-xs font-semibold text-emerald-700">
                    / {sppList.length} Dokumen
                  </span>
                </div>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Status:
                </span>
                {["ALL", "DRAFT", "DIAJUKAN", "DIVERIFIKASI"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterStatus === st
                      ? "bg-[#5E0E14] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    {st === "ALL" ? "Semua" : st}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor, keperluan, penerima..."
                  value={searchSpp}
                  onChange={(e) => setSearchSpp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadSppList()}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>
            </div>
          </div>

          {/* Tabel Dokumen SPP */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingList ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Memuat data dokumen SPP...
              </div>
            ) : sppList.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">
                  Belum ada dokumen {badgeLabel}
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Silakan klik tombol "Buat {badgeLabel} Baru" di atas untuk
                  membuat usulan pembayaran.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewSpp}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5E0E14] text-white rounded-lg text-xs font-bold hover:bg-[#46090E] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Mulai Buat Dokumen
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">No</th>
                      <th className="py-3.5 px-4">Nomor & Tanggal SPP</th>
                      <th className="py-3.5 px-4">Keperluan Pembayaran</th>
                      <th className="py-3.5 px-4">Penerima & Rekening</th>
                      <th className="py-3.5 px-4 text-right">Nilai SPP (Rp)</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center w-36">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSpp.map((item, index) => {
                      const noUrut = (safeCurrentPage - 1) * pageSize + index + 1;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                            {noUrut}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 font-mono">
                              {item.no_spp}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{item.tgl_spp}</span>
                              {item.no_spd && (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                                  SPD: {item.no_spd}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 line-clamp-2 max-w-md font-medium">
                              {item.keperluan}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.rekeningCount} Rekening Belanja
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">
                              {item.nama_penerima || "-"}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.bank_penerima
                                ? `${item.bank_penerima} - ${item.rek_penerima || "-"
                                }`
                                : "-"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900 text-sm">
                            {formatRupiah(item.nilai)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${item.status === "DIVERIFIKASI"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : item.status === "DIAJUKAN"
                                  ? "bg-sky-100 text-sky-800 border border-sky-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Preview / Cetak */}
                              <button
                                type="button"
                                title="Cetak SPP"
                                onClick={() => handleOpenPrintModal(item)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                title="Edit Dokumen SPP"
                                onClick={() => handleEditSpp(item)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Hapus */}
                              <button
                                type="button"
                                title="Hapus Dokumen SPP"
                                disabled={item.status === "DIVERIFIKASI"}
                                onClick={() => setDeleteTarget(item)}
                                className={`p-1.5 rounded-lg transition-colors ${item.status === "DIVERIFIKASI"
                                  ? "text-slate-300 cursor-not-allowed"
                                  : "text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                  }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            {sppList.length > 0 && (
              <PaginationBar
                page={safeCurrentPage}
                totalPages={totalPagesSpp}
                total={sppList.length}
                limit={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onLimitChange={(l) => {
                  setPageSize(l);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 4: PENGISIAN / EDIT FORM SPP (HEADER & RINCIAN)          */}
      {/* ============================================================== */}
      {currentStep === 4 && selectedOpd && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Bar Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#88131A]" />
                  <span>
                    {editingSppId ? "Ubah Dokumen" : "Formulir Pembuatan"}{" "}
                    {title}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKPD: [{selectedOpd.kd_skpd}] {selectedOpd.nm_skpd}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Daftar SPP
              </button>
            </div>

            {/* Form Fields: Header SPP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor SPP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formHeader.no_spp}
                  onChange={(e) =>
                    setFormHeader({ ...formHeader, no_spp: e.target.value })
                  }
                  placeholder="Contoh: 00001/SPP-UP/1.01.01/2026"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal SPP <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formHeader.tgl_spp}
                  onChange={(e) =>
                    setFormHeader({ ...formHeader, tgl_spp: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bulan Anggaran
                </label>
                <select
                  value={formHeader.bulan}
                  onChange={(e) =>
                    setFormHeader({
                      ...formHeader,
                      bulan: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
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

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian / Keperluan Pembayaran{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formHeader.keperluan}
                  onChange={(e) =>
                    setFormHeader({ ...formHeader, keperluan: e.target.value })
                  }
                  placeholder="Tuliskan uraian keperluan pembayaran secara jelas dan lengkap..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              {/* Dasar SPD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Dasar SPD (Nomor)
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenSpdModal}
                    className="text-[11px] font-bold text-[#88131A] hover:text-[#5E0E14] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Pilih SPD Terbit</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={formHeader.no_spd}
                    onChange={(e) =>
                      setFormHeader({ ...formHeader, no_spd: e.target.value })
                    }
                    placeholder="Pilih nomor SPD dari daftar terbit..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                  <button
                    type="button"
                    onClick={handleOpenSpdModal}
                    className="px-3 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    title="Buka dialog pilih SPD terbit"
                  >
                    Pilih SPD
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal SPD
                </label>
                <input
                  type="date"
                  value={formHeader.tgl_spd}
                  onChange={(e) =>
                    setFormHeader({ ...formHeader, tgl_spd: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penerima / Pihak Ketiga
                </label>
                <input
                  type="text"
                  value={formHeader.nama_penerima}
                  onChange={(e) =>
                    setFormHeader({
                      ...formHeader,
                      nama_penerima: e.target.value,
                    })
                  }
                  placeholder="Nama Bendahara atau Rekanan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              {/* Data Rekening Penerima */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Penerima
                </label>
                <input
                  type="text"
                  value={formHeader.bank_penerima}
                  onChange={(e) =>
                    setFormHeader({
                      ...formHeader,
                      bank_penerima: e.target.value,
                    })
                  }
                  placeholder="Contoh: BANK JATENG"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Rekening Penerima
                </label>
                <input
                  type="text"
                  value={formHeader.rek_penerima}
                  onChange={(e) =>
                    setFormHeader({
                      ...formHeader,
                      rek_penerima: e.target.value,
                    })
                  }
                  placeholder="Nomor Rekening Bank"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NPWP Penerima
                </label>
                <input
                  type="text"
                  value={formHeader.npwp_penerima}
                  onChange={(e) =>
                    setFormHeader({
                      ...formHeader,
                      npwp_penerima: e.target.value,
                    })
                  }
                  placeholder="NPWP"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              {/* Pejabat Penandatangan */}
              <div className="pt-2 md:col-span-3 border-t border-slate-100">
                <div className="text-xs font-extrabold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Pejabat Penandatangan</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Pilih pejabat dari daftar petugas OPD sesuai rolenya
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Bendahara Pengeluaran */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#88131A]">
                        Bendahara Pengeluaran
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Role: Bendahara</span>
                    </div>

                    {petugasData.bendaharaList.length > 0 ? (
                      <select
                        value={formHeader.bendaharaNama}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = petugasData.bendaharaList.find((b) => b.nama === val);
                          setFormHeader((prev) => ({
                            ...prev,
                            bendaharaNama: val,
                            bendaharaNip: found?.nip || prev.bendaharaNip,
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="">-- Pilih Bendahara Pengeluaran --</option>
                        {petugasData.bendaharaList.map((b) => (
                          <option key={b.id} value={b.nama}>
                            {b.nama} {b.nip ? `(NIP. ${b.nip})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Nama Bendahara"
                        value={formHeader.bendaharaNama}
                        onChange={(e) =>
                          setFormHeader({
                            ...formHeader,
                            bendaharaNama: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="NIP Bendahara"
                      value={formHeader.bendaharaNip}
                      onChange={(e) =>
                        setFormHeader({
                          ...formHeader,
                          bendaharaNip: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  {/* PPTK */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#88131A]">
                        Pejabat Pelaksana Teknis (PPTK)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Role: PPTK</span>
                    </div>

                    {petugasData.pptkList.length > 0 ? (
                      <select
                        value={formHeader.pptkNama}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = petugasData.pptkList.find((x) => x.nama === val);
                          setFormHeader((prev) => ({
                            ...prev,
                            pptkNama: val,
                            pptkNip: found?.nip || prev.pptkNip,
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="">-- Pilih Petugas PPTK --</option>
                        {petugasData.pptkList.map((x) => (
                          <option key={x.id} value={x.nama}>
                            {x.nama} {x.nip ? `(NIP. ${x.nip})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Nama PPTK"
                        value={formHeader.pptkNama}
                        onChange={(e) =>
                          setFormHeader({
                            ...formHeader,
                            pptkNama: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="NIP PPTK"
                      value={formHeader.pptkNip}
                      onChange={(e) =>
                        setFormHeader({
                          ...formHeader,
                          pptkNip: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                    />
                  </div>

                  {/* PA / KPA */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#88131A]">
                        Pengguna Anggaran (PA / KPA)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Role: PA/KPA</span>
                    </div>

                    {petugasData.paKpaList.length > 0 ? (
                      <select
                        value={formHeader.paKpaNama}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = petugasData.paKpaList.find((x) => x.nama === val);
                          setFormHeader((prev) => ({
                            ...prev,
                            paKpaNama: val,
                            paKpaNip: found?.nip || prev.paKpaNip,
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="">-- Pilih PA / KPA --</option>
                        {petugasData.paKpaList.map((x) => (
                          <option key={x.id} value={x.nama}>
                            {x.nama} {x.nip ? `(NIP. ${x.nip})` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Nama PA/KPA"
                        value={formHeader.paKpaNama}
                        onChange={(e) =>
                          setFormHeader({
                            ...formHeader,
                            paKpaNama: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="NIP PA/KPA"
                      value={formHeader.paKpaNip}
                      onChange={(e) =>
                        setFormHeader({
                          ...formHeader,
                          paKpaNip: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Rekening Belanja SPP */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#88131A]" />
                  <span>Rincian Rekening {jenisSpp === "UP" || jenisSpp === "UP_KKPD" ? "Uang Persediaan" : "Belanja"}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {jenisSpp === "UP" || jenisSpp === "UP_KKPD"
                    ? "Nilai Uang Persediaan ditarik otomatis dari Penetapan UP SKPD"
                    : "Pilih rekening belanja dari DPA yang telah tersedia alokasi dana pada SPD"}
                </p>
              </div>

              {jenisSpp === "UP" || jenisSpp === "UP_KKPD" ? (
                <button
                  type="button"
                  onClick={handleReloadPenetapanUp}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Tarik Ulang Nilai UP SKPD
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenRekeningSelector}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Rekening Belanja
                </button>
              )}
            </div>

            {/* Banner Penjelasan Khusus SPP-UP */}
            {(jenisSpp === "UP" || jenisSpp === "UP_KKPD") && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-950">
                      Penetapan Nilai Uang Persediaan ({badgeLabel})
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Nilai otomatis ditarik dari tabel penetapan UP SKPD dengan kode rekening{" "}
                      <strong className="font-mono text-amber-950">1.1.01.03.01.0001 - Kas di Bendahara Pengeluaran</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formRincian.length === 0 ? (
              <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-600">
                  Belum ada rekening belanja yang ditambahkan
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Klik tombol "Tambah Rekening Belanja" untuk memilih sub
                  kegiatan dan kode rekening belanja yang akan dibayarkan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3">Sub Kegiatan</th>
                      <th className="py-3 px-3">Kode & Uraian Rekening</th>
                      <th className="py-3 px-3 w-48 text-right">
                        Nilai SPP (Rp)
                      </th>
                      <th className="py-3 px-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formRincian.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          {item.kd_sub_kegiatan ? (
                            <>
                              <div className="font-bold text-slate-900 font-mono text-[11px]">
                                {item.kd_sub_kegiatan}
                              </div>
                              <div className="text-slate-600 text-[11px] line-clamp-1">
                                {item.nm_sub_kegiatan}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {item.kd_rek6}
                          </div>
                          <div className="text-slate-600 text-[11px] line-clamp-1">
                            {item.nm_rek6}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.nilai || ""}
                            onChange={(e) =>
                              handleChangeRincianNilai(
                                idx,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-1.5 text-xs text-right font-black font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRincian(idx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td colSpan={3} className="py-3 px-4 text-right">
                        TOTAL NILAI SPP:
                      </td>
                      <td className="py-3 px-3 text-right text-base font-black font-mono text-[#88131A]">
                        {formatRupiah(totalFormNilai)}
                      </td>
                      <td></td>
                    </tr>
                    {totalFormNilai > 0 && (
                      <tr className="bg-red-50/30">
                        <td
                          colSpan={5}
                          className="py-2 px-4 text-xs italic text-slate-600 font-medium"
                        >
                          Terbilang: {terbilang(totalFormNilai)} rupiah
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Actions Form */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              disabled={savingSpp}
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal & Kembali
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={savingSpp}
                onClick={() => handleSaveSpp("DRAFT")}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingSpp ? "Menyimpan..." : "Simpan sebagai Draft"}
              </button>

              <button
                type="button"
                disabled={savingSpp}
                onClick={() => handleSaveSpp("DIAJUKAN")}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {savingSpp ? "Memproses..." : "Simpan & Ajukan SPP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PILIH REKENING BELANJA (KONTROL PAGU DPA & SPD)          */}
      {/* ============================================================== */}
      {showRekeningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pilih Rekening Belanja DPA
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar rekening belanja yang memiliki batas pagu SPD terbit
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRekeningModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kegiatan, sub kegiatan, atau rekening belanja..."
                  value={searchRekening}
                  onChange={(e) => setSearchRekening(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>
            </div>

            {/* List Rekening */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingRekeningRef ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Memeriksa pagu DPA dan akumulasi SPD...
                </div>
              ) : filteredRekeningRef.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ada rekening belanja yang ditemukan untuk OPD ini.
                </div>
              ) : (
                filteredRekeningRef.map((ref, idx) => {
                  const sisaSpd = ref.sisaSpd;
                  const isAvailable = sisaSpd > 0;
                  return (
                    <div
                      key={idx}
                      className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {ref.kd_sub_kegiatan}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {ref.nm_sub_kegiatan}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-extrabold text-[#88131A]">
                            {ref.kd_rek6}
                          </span>
                          <span className="text-xs text-slate-700 font-medium truncate">
                            {ref.nm_rek6}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                          <span>Pagu DPA: {formatRupiah(ref.paguDpa)}</span>
                          <span>Batas SPD: {formatRupiah(ref.totalSpd)}</span>
                          <span>
                            SPP Lalu: {formatRupiah(ref.totalSppLalu)}
                          </span>
                          <span
                            className={`font-bold ${isAvailable ? "text-emerald-700" : "text-red-600"
                              }`}
                          >
                            Sisa SPD: {formatRupiah(sisaSpd)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleSelectRekening(ref)}
                          className="px-3 py-1.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Pilih Rekening
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PILIH SPD TERBIT                                         */}
      {/* ============================================================== */}
      {showSpdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#88131A]" />
                  <span>Pilih Surat Penyediaan Dana (SPD) Terbit</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  [{selectedOpd?.kd_skpd}] {selectedOpd?.nm_skpd} - Dokumen SPD yang telah diterbitkan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSpdModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Search SPD */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor SPD, triwulan, atau uraian..."
                  value={searchSpdModal}
                  onChange={(e) => setSearchSpdModal(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>
            </div>

            {/* List SPD Terbit */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingSpdList ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Memuat daftar dokumen SPD terbit...
                </div>
              ) : filteredSpdTerbit.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-slate-600">
                    Tidak ada dokumen SPD terbit yang ditemukan
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Pastikan Surat Penyediaan Dana (SPD) untuk SKPD ini telah diterbitkan pada menu Surat Penyediaan Dana (SPD).
                  </p>
                </div>
              ) : (
                filteredSpdTerbit.map((spd, idx) => (
                  <div
                    key={idx}
                    className="py-3 px-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#88131A]">
                          {spd.no_spd}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {spd.periode || `Triwulan ${spd.triwulan}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Tanggal SPD: <strong>{spd.tgl_spd || "-"}</strong></span>
                        {spd.countRekening && (
                          <span>• {spd.countRekening} Rekening</span>
                        )}
                      </div>
                      {spd.keterangan && (
                        <div className="text-xs text-slate-700 font-medium line-clamp-1">
                          {spd.keterangan}
                        </div>
                      )}
                      <div className="text-xs font-black font-mono text-slate-900 pt-0.5">
                        Total Pagu SPD: {formatRupiah(spd.totalNilai)}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleSelectSpd(spd)}
                        className="px-3.5 py-1.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Pilih SPD Ini
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PREVIEW & CETAK DOKUMEN SPP                              */}
      {/* ============================================================== */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#88131A]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Pratinjau Cetak {printTarget.no_spp}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAction}
                  className="px-3 py-1.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe Document Paper */}
            <div className="flex-1 p-6 bg-slate-200/50 overflow-y-auto flex justify-center">
              <div className="bg-white shadow-lg p-8 w-full max-w-[210mm] min-h-[297mm] text-slate-900 font-serif text-[12px] leading-relaxed">
                {/* Kop Surat SKPD */}
                <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-1">
                  <div className="font-bold text-sm tracking-wider uppercase">
                    PEMERINTAH KABUPATEN / KOTA
                  </div>
                  <div className="font-extrabold text-base uppercase">
                    {printTarget.nm_skpd}
                  </div>
                  <div className="text-[11px] font-sans">
                    SURAT PERMINTAAN PEMBAYARAN ({printTarget.jenis_spp})
                  </div>
                  <div className="text-xs font-bold font-mono">
                    NOMOR: {printTarget.no_spp}
                  </div>
                </div>

                {/* Ringkasan Header */}
                <div className="space-y-1 mb-4 font-sans text-xs">
                  <div className="grid grid-cols-4 gap-1">
                    <div className="font-bold">Tanggal SPP</div>
                    <div className="col-span-3">: {printTarget.tgl_spp}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="font-bold">SKPD</div>
                    <div className="col-span-3">
                      : [{printTarget.kd_skpd}] {printTarget.nm_skpd}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="font-bold">Keperluan</div>
                    <div className="col-span-3">
                      : {printTarget.keperluan}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="font-bold">Dasar SPD</div>
                    <div className="col-span-3">
                      : {printTarget.no_spd || "-"}{" "}
                      {printTarget.tgl_spd
                        ? `(Tgl: ${printTarget.tgl_spd})`
                        : ""}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="font-bold">Penerima</div>
                    <div className="col-span-3">
                      : {printTarget.nama_penerima || "-"} / Bank:{" "}
                      {printTarget.bank_penerima || "-"} (Rek:{" "}
                      {printTarget.rek_penerima || "-"})
                    </div>
                  </div>
                </div>

                {/* Tabel Rincian Belanja */}
                <table className="w-full border-collapse border border-black text-xs font-sans mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black p-1.5 w-8">No</th>
                      <th className="border border-black p-1.5">
                        Kode Sub Kegiatan & Rekening
                      </th>
                      <th className="border border-black p-1.5">Uraian</th>
                      <th className="border border-black p-1.5 w-32 text-right">
                        Jumlah (Rp)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printTarget.rincian || []).map((r: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-black p-1.5 text-center">
                          {i + 1}
                        </td>
                        <td className="border border-black p-1.5 font-mono text-[11px]">
                          {r.kd_sub_kegiatan ? (
                            <>
                              {r.kd_sub_kegiatan} <br />
                            </>
                          ) : null}
                          {r.kd_rek6}
                        </td>
                        <td className="border border-black p-1.5">
                          {r.nm_sub_kegiatan ? (
                            <>
                              {r.nm_sub_kegiatan} <br />
                            </>
                          ) : null}
                          <span className="font-semibold">{r.nm_rek6}</span>
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          {formatRupiah(r.nilai)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50">
                      <td
                        colSpan={3}
                        className="border border-black p-1.5 text-right"
                      >
                        JUMLAH
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono font-black">
                        {formatRupiah(printTarget.nilai)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mb-6 font-sans text-xs italic">
                  Terbilang: {terbilang(printTarget.nilai)} rupiah
                </div>

                {/* Lembar Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 text-center font-sans text-xs pt-4">
                  <div>
                    <div className="text-slate-600">Mengetahui / Menyetujui,</div>
                    <div className="font-bold">
                      Pengguna Anggaran / Kuasa PA
                    </div>
                    <div className="h-16"></div>
                    <div className="font-bold underline">
                      {printTarget.paKpaNama || "(....................................)"}
                    </div>
                    <div>NIP. {printTarget.paKpaNip || "...................................."}</div>
                  </div>

                  <div>
                    <div className="text-slate-600">
                      Tanggal: {printTarget.tgl_spp}
                    </div>
                    <div className="font-bold">Bendahara Pengeluaran</div>
                    <div className="h-16"></div>
                    <div className="font-bold underline">
                      {printTarget.bendaharaNama || "(....................................)"}
                    </div>
                    <div>
                      NIP. {printTarget.bendaharaNip || "...................................."}
                    </div>
                  </div>
                </div>

                <iframe
                  ref={reportIframeRef}
                  className="hidden"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Cetak SPP - ${printTarget.no_spp}</title>
                        <style>
                          @page { size: A4; margin: 15mm; }
                          body { font-family: serif; font-size: 12px; margin: 0; padding: 0; }
                          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: sans-serif; font-size: 11px; }
                          th, td { border: 1px solid black; padding: 6px; }
                          .text-center { text-align: center; }
                          .text-right { text-align: right; }
                          .font-mono { font-family: monospace; }
                          .font-bold { font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="text-center" style="border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 12px;">
                          <div style="font-size: 14px; font-weight: bold;">PEMERINTAH KABUPATEN / KOTA</div>
                          <div style="font-size: 16px; font-weight: bold;">${printTarget.nm_skpd}</div>
                          <div style="font-size: 12px;">SURAT PERMINTAAN PEMBAYARAN (${printTarget.jenis_spp})</div>
                          <div style="font-size: 12px; font-weight: bold; font-family: monospace;">NOMOR: ${printTarget.no_spp}</div>
                        </div>

                        <div style="font-family: sans-serif; font-size: 11px; line-height: 1.6; margin-bottom: 12px;">
                          <div><strong>Tanggal SPP:</strong> ${printTarget.tgl_spp}</div>
                          <div><strong>SKPD:</strong> [${printTarget.kd_skpd}] ${printTarget.nm_skpd}</div>
                          <div><strong>Keperluan:</strong> ${printTarget.keperluan}</div>
                          <div><strong>Dasar SPD:</strong> ${printTarget.no_spd || "-"}</div>
                          <div><strong>Penerima:</strong> ${printTarget.nama_penerima || "-"} / Bank: ${printTarget.bank_penerima || "-"}</div>
                        </div>

                        <table>
                          <thead>
                            <tr style="background-color: #f2f2f2;">
                              <th class="text-center" style="width: 30px;">No</th>
                              <th>Kode Sub Kegiatan & Rekening</th>
                              <th>Uraian</th>
                              <th class="text-right" style="width: 140px;">Jumlah (Rp)</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${(printTarget.rincian || [])
                      .map(
                        (r: any, idx: number) => `
                              <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td class="font-mono">${r.kd_sub_kegiatan ? r.kd_sub_kegiatan + '<br/>' : ''}${r.kd_rek6}</td>
                                <td>${r.nm_sub_kegiatan ? r.nm_sub_kegiatan + '<br/>' : ''}<strong>${r.nm_rek6}</strong></td>
                                <td class="text-right font-mono font-bold">${formatRupiah(r.nilai)}</td>
                              </tr>
                            `
                      )
                      .join("")}
                          </tbody>
                          <tfoot>
                            <tr style="font-weight: bold; background-color: #f9f9f9;">
                              <td colspan="3" class="text-right">JUMLAH</td>
                              <td class="text-right font-mono font-bold">${formatRupiah(printTarget.nilai)}</td>
                            </tr>
                          </tfoot>
                        </table>

                        <div style="margin-top: 8px; font-style: italic; font-size: 11px; font-family: sans-serif;">
                          Terbilang: ${terbilang(printTarget.nilai)} rupiah
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-top: 35px; font-family: sans-serif; font-size: 11px; text-align: center;">
                          <div style="width: 45%;">
                            <div>Mengetahui / Menyetujui,</div>
                            <div style="font-weight: bold;">Pengguna Anggaran / Kuasa PA</div>
                            <div style="height: 60px;"></div>
                            <div style="font-weight: bold; text-decoration: underline;">${printTarget.paKpaNama || "(....................................)"}</div>
                            <div>NIP. ${printTarget.paKpaNip || "...................................."}</div>
                          </div>
                          <div style="width: 45%;">
                            <div>Tanggal: ${printTarget.tgl_spp}</div>
                            <div style="font-weight: bold;">Bendahara Pengeluaran</div>
                            <div style="height: 60px;"></div>
                            <div style="font-weight: bold; text-decoration: underline;">${printTarget.bendaharaNama || "(....................................)"}</div>
                            <div>NIP. ${printTarget.bendaharaNip || "...................................."}</div>
                          </div>
                        </div>
                      </body>
                    </html>
                  `}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Hapus Dokumen SPP"
        entityName="Dokumen SPP"
        itemCode={deleteTarget?.no_spp}
        itemLabel={deleteTarget?.keperluan}
        description={`Apakah Anda yakin ingin menghapus dokumen SPP "${deleteTarget?.no_spp}" senilai ${formatRupiah(deleteTarget?.nilai || 0)}? Data yang dihapus tidak dapat dipulihkan.`}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
