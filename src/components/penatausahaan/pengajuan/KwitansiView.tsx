"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Trash2,
  Edit,
  Eye,
  AlertCircle,
  Building2,
  Coins,
  ChevronDown,
  ShieldCheck,
  ClipboardList,
  UserRound,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  X,
  CreditCard,
  UserCheck,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  Check,
  Save,
  DollarSign,
  Layers,
  Calendar,
  Wallet,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";

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

interface KwitansiPenerima {
  id?: string;
  nm_penerima: string;
  alamat_penerima?: string | null;
  npwp_penerima?: string | null;
  nm_bank_penerima: string;
  no_rek_penerima: string;
  an_rekening?: string | null;
  nilai: number;
  keterangan?: string | null;
}

interface KwitansiPotongan {
  id?: string;
  kd_rek6: string;
  nm_rek6: string;
  id_billing?: string | null;
  ntpn?: string | null;
  nilai: number;
  keterangan?: string | null;
}

interface PotonganRef {
  kd_rek6: string;
  nm_rek6: string;
  kategori: string;
  tarifPersen?: number;
}

interface SisaDanaInfo {
  paguDpa: number;
  totalSpd: number;
  totalKuitansi: number;
  sisaPenyediaanDana: number;
}

interface KwitansiItem {
  id: string;
  nomor: string;
  tanggal: string;
  tahunAnggaran: number;
  opdId: string;
  unitKerjaId?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  jns_beban: string;
  uraian: string;
  nilai: number | string;
  nilai_potongan: number | string;
  nilai_bersih: number | string;
  pptkUserId?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  paKpaUserId?: string | null;
  paKpaNama?: string | null;
  paKpaNip?: string | null;
  bendaharaUserId?: string | null;
  bendaharaNama?: string | null;
  bendaharaNip?: string | null;
  status: "DRAFT" | "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBUKUKAN";
  tgl_persetujuan?: string | null;
  catatan?: string | null;
  penerimaList: KwitansiPenerima[];
  potonganList: KwitansiPotongan[];
  opd?: { id: string; kd_skpd: string; nm_skpd: string; alamat?: string | null };
  unitKerja?: { id: string; kd_unit: string; nm_unit: string };
}

// Terbilang Rupiah Helper
function terbilang(n: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  if (n < 12) return bilangan[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100)
    return (
      terbilang(Math.floor(n / 10)) +
      " Puluh" +
      (n % 10 > 0 ? " " + terbilang(n % 10) : "")
    );
  if (n < 200) return "Seratus" + (n - 100 > 0 ? " " + terbilang(n - 100) : "");
  if (n < 1000)
    return (
      terbilang(Math.floor(n / 100)) +
      " Ratus" +
      (n % 100 > 0 ? " " + terbilang(n % 100) : "")
    );
  if (n < 2000)
    return "Seribu" + (n - 1000 > 0 ? " " + terbilang(n - 1000) : "");
  if (n < 1000000)
    return (
      terbilang(Math.floor(n / 1000)) +
      " Ribu" +
      (n % 1000 > 0 ? " " + terbilang(n % 1000) : "")
    );
  if (n < 1000000000)
    return (
      terbilang(Math.floor(n / 1000000)) +
      " Juta" +
      (n % 1000000 > 0 ? " " + terbilang(n % 1000000) : "")
    );
  if (n < 1000000000000)
    return (
      terbilang(Math.floor(n / 1000000000)) +
      " Miliar" +
      (n % 1000000000 > 0 ? " " + terbilang(n % 1000000000) : "")
    );
  return (
    terbilang(Math.floor(n / 1000000000000)) +
    " Triliun" +
    (n % 1000000000000 > 0 ? " " + terbilang(n % 1000000000000) : "")
  );
}

export default function KwitansiView() {
  // Navigation Steps: 1: Pilih OPD -> 2: Pilih Unit -> 3: Daftar Kuitansi -> 4: Form Input Kuitansi
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Scope & Selection
  const [session, setSession] = useState<any>(null);
  const [loadingScope, setLoadingScope] = useState(true);
  const [opds, setOpds] = useState<OpdItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);

  // Master Potongan Referensi (Sama seperti SPM)
  const [potonganRefList, setPotonganRefList] = useState<PotonganRef[]>([]);

  // Search Step 1 & 2
  const [searchOpd, setSearchOpd] = useState("");
  const [searchUnit, setSearchUnit] = useState("");

  // Step 3: Kuitansi List & Filters
  const [dataList, setDataList] = useState<KwitansiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("SEMUA");
  const [selectedBeban, setSelectedBeban] = useState("SEMUA");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal Detail / Print / Reject
  const [showModalDetail, setShowModalDetail] = useState(false);
  const [selectedKwitansi, setSelectedKwitansi] = useState<KwitansiItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectCatatan, setRejectCatatan] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Step 4: Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNomor, setFormNomor] = useState("");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formTahun, setFormTahun] = useState(2026);
  const [formOpdId, setFormOpdId] = useState("");
  const [formUnitId, setFormUnitId] = useState("");
  const [formSubKegiatanList, setFormSubKegiatanList] = useState<any[]>([]);
  const [selectedSubKegiatan, setSelectedSubKegiatan] = useState<any>(null);
  const [formRekeningList, setFormRekeningList] = useState<any[]>([]);
  const [selectedRekening, setSelectedRekening] = useState<any>(null);
  const [formJnsBeban, setFormJnsBeban] = useState("UP");
  const [formUraian, setFormUraian] = useState("");
  const [formNilaiBruto, setFormNilaiBruto] = useState<number | string>("");

  // Sisa Penyediaan Dana Info (SPD terbit - Kuitansi keluar)
  const [sisaDanaInfo, setSisaDanaInfo] = useState<SisaDanaInfo | null>(null);
  const [loadingSisaDana, setLoadingSisaDana] = useState(false);

  // Penerima List
  const [formPenerimaList, setFormPenerimaList] = useState<KwitansiPenerima[]>([]);
  // Modal Input Penerima State
  const [showModalPenerima, setShowModalPenerima] = useState(false);
  const [editingPenerimaIndex, setEditingPenerimaIndex] = useState<number | null>(null);
  const [penerimaFormState, setPenerimaFormState] = useState<KwitansiPenerima>({
    nm_penerima: "",
    nm_bank_penerima: "Bank Sumut",
    no_rek_penerima: "",
    npwp_penerima: "",
    an_rekening: "",
    nilai: 0,
    keterangan: "",
  });

  // Potongan List
  const [formPotonganList, setFormPotonganList] = useState<KwitansiPotongan[]>([]);
  // Modal Input Potongan State
  const [showModalPotongan, setShowModalPotongan] = useState(false);
  const [editingPotonganIndex, setEditingPotonganIndex] = useState<number | null>(null);
  const [potonganFormState, setPotonganFormState] = useState<KwitansiPotongan>({
    kd_rek6: "2.1.01.06.01.0001",
    nm_rek6: "Utang Pajak Pertambahan Nilai (PPN)",
    id_billing: "",
    ntpn: "",
    nilai: 0,
    keterangan: "",
  });

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pejabat Penandatangan per OPD
  const [petugasData, setPetugasData] = useState<{
    paKpaList: { id: string; nama: string; nip: string; jabatan: string }[];
    pptkList: { id: string; nama: string; nip: string; jabatan: string }[];
    bendaharaList: { id: string; nama: string; nip: string; jabatan: string }[];
  }>({
    paKpaList: [],
    pptkList: [],
    bendaharaList: [],
  });
  const [formPaKpa, setFormPaKpa] = useState<{ userId: string; nama: string; nip: string }>({
    userId: "",
    nama: "",
    nip: "",
  });
  const [formPptk, setFormPptk] = useState<{ userId: string; nama: string; nip: string }>({
    userId: "",
    nama: "",
    nip: "",
  });
  const [formBendahara, setFormBendahara] = useState<{ userId: string; nama: string; nip: string }>({
    userId: "",
    nama: "",
    nip: "",
  });

  // Hitung total potongan dan netto
  const totalFormPotongan = useMemo(() => {
    return formPotonganList.reduce((acc, p) => acc + Number(p.nilai || 0), 0);
  }, [formPotonganList]);

  const totalFormNetto = useMemo(() => {
    const bruto = Number(formNilaiBruto || 0);
    return Math.max(0, bruto - totalFormPotongan);
  }, [formNilaiBruto, totalFormPotongan]);

  // Select2 / SearchableSelect options
  const jnsBebanOptions: SelectOption[] = useMemo(
    () => [
      {
        value: "UP",
        label: "UP - Uang Persediaan",
        badge: "UP",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
      },
      {
        value: "GU",
        label: "GU - Ganti Uang",
        badge: "GU",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200 font-bold",
      },
      {
        value: "TU",
        label: "TU - Tambah Uang",
        badge: "TU",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200 font-bold",
      },
      {
        value: "LS",
        label: "LS - Pembayaran Langsung",
        badge: "LS",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
      },
    ],
    []
  );

  const subKegiatanOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = formSubKegiatanList.map((sk) => ({
      value: sk.kd_sub_kegiatan,
      label: sk.nm_sub_kegiatan,
      badge: sk.kd_sub_kegiatan,
      badgeColor: "bg-rose-50 text-[#88131A] border-rose-200 font-mono font-bold",
      subLabel: sk.nm_program ? `Program: ${sk.nm_program}` : undefined,
    }));
    // Jika sedang edit kuitansi dan sub kegiatan belum masuk ke list
    if (
      selectedSubKegiatan?.kd_sub_kegiatan &&
      !list.some((opt) => opt.value === selectedSubKegiatan.kd_sub_kegiatan)
    ) {
      list.unshift({
        value: selectedSubKegiatan.kd_sub_kegiatan,
        label: selectedSubKegiatan.nm_sub_kegiatan,
        badge: selectedSubKegiatan.kd_sub_kegiatan,
        badgeColor: "bg-rose-50 text-[#88131A] border-rose-200 font-mono font-bold",
      });
    }
    return list;
  }, [formSubKegiatanList, selectedSubKegiatan]);

  const rekeningOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = formRekeningList.map((rek) => ({
      value: rek.kd_rek6,
      label: rek.nm_rek6,
      badge: rek.kd_rek6,
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200 font-mono font-bold",
      subLabel: `Pagu DPA: ${formatRupiah(Number(rek.nilai_ubah || rek.nilai || 0))}`,
    }));
    // Jika sedang edit kuitansi dan rekening belum masuk ke list
    if (
      selectedRekening?.kd_rek6 &&
      !list.some((opt) => opt.value === selectedRekening.kd_rek6)
    ) {
      list.unshift({
        value: selectedRekening.kd_rek6,
        label: selectedRekening.nm_rek6,
        badge: selectedRekening.kd_rek6,
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200 font-mono font-bold",
      });
    }
    return list;
  }, [formRekeningList, selectedRekening]);

  const potonganRefOptions: SelectOption[] = useMemo(() => {
    return potonganRefList.map((ref) => ({
      value: ref.kd_rek6,
      label: ref.nm_rek6,
      badge: ref.kd_rek6,
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200 font-mono font-bold",
    }));
  }, [potonganRefList]);

  const paKpaOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = petugasData.paKpaList.map((p) => ({
      value: p.id,
      label: p.nama,
      badge: "",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
      subLabel: p.nip ? `NIP. ${p.nip}` : "NIP. -",
    }));
    if (
      formPaKpa.nama &&
      !list.some(
        (opt) =>
          opt.value === formPaKpa.userId ||
          opt.label.toLowerCase() === formPaKpa.nama.toLowerCase()
      )
    ) {
      list.unshift({
        value: formPaKpa.userId || `custom-pa-${formPaKpa.nama}`,
        label: formPaKpa.nama,
        badge: "PA/KPA",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold",
        subLabel: formPaKpa.nip ? `NIP. ${formPaKpa.nip}` : "NIP. -",
      });
    }
    return list;
  }, [petugasData.paKpaList, formPaKpa]);

  const activeRkaSubKegiatan = useMemo(() => {
    if (!selectedSubKegiatan?.kd_sub_kegiatan) return null;
    return (
      formSubKegiatanList.find(
        (item) => item.kd_sub_kegiatan === selectedSubKegiatan.kd_sub_kegiatan
      ) || selectedSubKegiatan
    );
  }, [formSubKegiatanList, selectedSubKegiatan]);

  const pptkOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [];
    // Hanya tampilkan PPTK yang ditugaskan di RKA (Trskpd) untuk sub kegiatan terpilih
    if (activeRkaSubKegiatan?.pptkNama) {
      const rkaId =
        activeRkaSubKegiatan.pptkUserId || `rka-${activeRkaSubKegiatan.kd_sub_kegiatan}`;
      list.push({
        value: rkaId,
        label: activeRkaSubKegiatan.pptkNama,
        badge: "PPTK RKA",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
        subLabel: activeRkaSubKegiatan.pptkNip
          ? `Penugasan RKA • NIP. ${activeRkaSubKegiatan.pptkNip}`
          : "Penugasan RKA",
      });
    }

    if (
      formPptk.nama &&
      !list.some(
        (opt) =>
          opt.value === formPptk.userId ||
          opt.label.toLowerCase() === formPptk.nama.toLowerCase()
      )
    ) {
      list.unshift({
        value: formPptk.userId || `custom-pptk-${formPptk.nama}`,
        label: formPptk.nama,
        badge: "PPTK",
        badgeColor: "bg-rose-50 text-[#88131A] border-rose-200 font-semibold",
        subLabel: formPptk.nip ? `NIP. ${formPptk.nip}` : "NIP. -",
      });
    }

    return list;
  }, [activeRkaSubKegiatan, formPptk]);

  const bendaharaOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = petugasData.bendaharaList.map((p) => ({
      value: p.id,
      label: p.nama,
      badge: "",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
      subLabel: p.nip ? `NIP. ${p.nip}` : "NIP. -",
    }));
    if (
      formBendahara.nama &&
      !list.some(
        (opt) =>
          opt.value === formBendahara.userId ||
          opt.label.toLowerCase() === formBendahara.nama.toLowerCase()
      )
    ) {
      list.unshift({
        value: formBendahara.userId || `custom-bend-${formBendahara.nama}`,
        label: formBendahara.nama,
        badge: "Bendahara",
        badgeColor: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
        subLabel: formBendahara.nip ? `NIP. ${formBendahara.nip}` : "NIP. -",
      });
    }
    return list;
  }, [petugasData.bendaharaList, formBendahara]);

  // 1. Load Scope Data (OPD & Unit) & Master Potongan
  useEffect(() => {
    async function fetchScope() {
      setLoadingScope(true);
      try {
        const res = await fetch("/api/penatausahaan/pengajuan/options?type=scope");
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data.session;
          const opdList = json.data.opds || [];
          const unitList = json.data.units || [];

          setSession(s);
          setOpds(opdList);
          setUnits(unitList);
          if (s?.tahunAnggaran) {
            setTahunAnggaran(s.tahunAnggaran);
            setFormTahun(s.tahunAnggaran);
          }

          // Auto-select jika bukan lintas OPD
          if (s && !s.isCrossOpd && opdList.length === 1) {
            const defaultOpd = opdList[0];
            setSelectedOpd(defaultOpd);
            setFormOpdId(defaultOpd.id);

            if (s.unitKerjaId) {
              const defaultUnit = unitList.find((u: UnitItem) => u.id === s.unitKerjaId);
              if (defaultUnit) {
                setSelectedUnit(defaultUnit);
                setFormUnitId(defaultUnit.id);
                setCurrentStep(3);
              } else {
                setCurrentStep(3);
              }
            } else {
              const opdUnits = unitList.filter((u: UnitItem) => u.opdId === defaultOpd.id);
              if (opdUnits.length === 0) {
                setCurrentStep(3);
              } else {
                setCurrentStep(2);
              }
            }
          }
        }
      } catch (e) {
        console.error("Gagal load scope data:", e);
      } finally {
        setLoadingScope(false);
      }
    }

    async function loadPotonganRef() {
      try {
        const res = await fetch("/api/penatausahaan/pengajuan/options?type=potongan-ref");
        const json = await res.json();
        if (json.success && json.data) {
          setPotonganRefList(json.data);
        }
      } catch (e) {
        console.error("Gagal load referensi potongan:", e);
      }
    }

    fetchScope();
    loadPotonganRef();
  }, []);

  // Filter OPDs by search term
  const filteredOpds = useMemo(() => {
    if (!searchOpd) return opds;
    const q = searchOpd.toLowerCase();
    return opds.filter(
      (o) =>
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q) ||
        (o.singkatan && o.singkatan.toLowerCase().includes(q))
    );
  }, [opds, searchOpd]);

  // Sub Units of selected OPD
  const availableUnits = useMemo(() => {
    if (!selectedOpd) return [];
    return units.filter((u) => u.opdId === selectedOpd.id);
  }, [units, selectedOpd]);

  // Filter Sub Units by search term
  const filteredSubUnits = useMemo(() => {
    if (!searchUnit) return availableUnits;
    const q = searchUnit.toLowerCase();
    return availableUnits.filter(
      (u) =>
        u.kd_unit.toLowerCase().includes(q) ||
        u.nm_unit.toLowerCase().includes(q)
    );
  }, [availableUnits, searchUnit]);

  // Handlers Step 1 & 2
  function handleSelectAndNextOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setSelectedUnit(null);
    setFormOpdId(opd.id);
    setSearchUnit("");
    setCurrentStep(2);
  }

  function handleSelectAndNextUnit(unit: UnitItem | null) {
    setSelectedUnit(unit);
    setFormUnitId(unit?.id || "");
    setCurrentStep(3);
    setCurrentPage(1);
  }

  // Fetch Sub Kegiatan when Form OPD / Session changed
  useEffect(() => {
    const targetOpdId = selectedOpd?.id || formOpdId;
    if (!targetOpdId) return;

    async function fetchSubKegiatan() {
      try {
        const res = await fetch(
          `/api/penatausahaan/pengajuan/options?type=sub-kegiatan&opdId=${targetOpdId}&tahun=${tahunAnggaran}`
        );
        const json = await res.json();
        if (json.data) {
          setFormSubKegiatanList(json.data);
        }
      } catch (e) {
        console.error("Gagal load sub kegiatan:", e);
      }
    }
    fetchSubKegiatan();
  }, [selectedOpd, formOpdId, tahunAnggaran]);

  // Fetch Pejabat Penandatangan per OPD
  useEffect(() => {
    const targetOpdId = selectedOpd?.id || formOpdId;
    if (!targetOpdId) return;

    async function fetchPetugas() {
      try {
        const res = await fetch(
          `/api/penatausahaan/pengajuan/options?type=petugas&opdId=${targetOpdId}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          setPetugasData({
            paKpaList: json.data.paKpaList || [],
            pptkList: json.data.pptkList || [],
            bendaharaList: json.data.bendaharaList || [],
          });
        }
      } catch (e) {
        console.error("Gagal load pejabat penandatangan:", e);
      }
    }
    fetchPetugas();
  }, [selectedOpd, formOpdId]);

  // Fetch Rekening when Sub Kegiatan changed
  useEffect(() => {
    if (!selectedSubKegiatan || (!selectedOpd && !formOpdId)) {
      setFormRekeningList([]);
      setSelectedRekening(null);
      setSisaDanaInfo(null);
      return;
    }
    async function fetchRekening() {
      try {
        const targetOpd = selectedOpd || opds.find((o) => o.id === formOpdId);
        const kd_skpd = targetOpd ? targetOpd.kd_skpd : selectedSubKegiatan.kd_skpd;
        const res = await fetch(
          `/api/penatausahaan/pengajuan/options?type=rekening&kd_skpd=${kd_skpd}&kd_sub_kegiatan=${selectedSubKegiatan.kd_sub_kegiatan}&tahun=${tahunAnggaran}`
        );
        const json = await res.json();
        if (json.data) {
          setFormRekeningList(json.data);
        }
      } catch (e) {
        console.error("Gagal load rekening:", e);
      }
    }
    fetchRekening();
  }, [selectedSubKegiatan, selectedOpd, formOpdId, tahunAnggaran, opds]);

  // Fetch Sisa Penyediaan Dana saat Rekening & Sub Kegiatan dipilih
  useEffect(() => {
    if (!selectedSubKegiatan || !selectedRekening || !selectedOpd) {
      setSisaDanaInfo(null);
      return;
    }

    async function fetchSisaDana() {
      setLoadingSisaDana(true);
      try {
        const params = new URLSearchParams({
          type: "sisa-dana",
          tahun: String(tahunAnggaran),
          kd_skpd: selectedOpd?.kd_skpd || "",
          kd_sub_kegiatan: selectedSubKegiatan.kd_sub_kegiatan,
          kd_rek6: selectedRekening.kd_rek6,
        });
        if (editingId) {
          params.append("excludeKwitansiId", editingId);
        }

        const res = await fetch(`/api/penatausahaan/pengajuan/options?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setSisaDanaInfo(json.data);
        }
      } catch (e) {
        console.error("Gagal load sisa penyediaan dana:", e);
      } finally {
        setLoadingSisaDana(false);
      }
    }

    fetchSisaDana();
  }, [selectedSubKegiatan, selectedRekening, selectedOpd, tahunAnggaran, editingId]);

  // Fetch Data List (Step 3)
  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("tahun", String(tahunAnggaran));
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) {
        q.set("unitKerjaId", selectedUnit.id);
      }
      if (selectedStatus && selectedStatus !== "SEMUA") q.set("status", selectedStatus);
      if (selectedBeban && selectedBeban !== "SEMUA") q.set("jns_beban", selectedBeban);
      if (search) q.set("q", search);
      if (startDate) q.set("tglMulai", startDate);
      if (endDate) q.set("tglSelesai", endDate);
      q.set("page", String(currentPage));
      q.set("limit", String(pageSize));

      const res = await fetch(`/api/penatausahaan/pengajuan/kuitansi?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        if (json.pagination) {
          setTotalItems(json.pagination.total);
        }
      }
    } catch (e) {
      console.error("Gagal load kuitansi list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 3 && selectedOpd) {
      fetchData();
    }
  }, [
    currentStep,
    selectedOpd,
    selectedUnit,
    selectedStatus,
    selectedBeban,
    currentPage,
    pageSize,
    tahunAnggaran,
  ]);

  // Role permissions check
  const isSuperadmin = session?.roleKode === "0" || session?.roleKode === "SUPERADMIN";
  const isPaKpaUser =
    isSuperadmin ||
    session?.roleKode === "7" ||
    session?.roleKode?.toLowerCase() === "pa" ||
    session?.roleKode?.toLowerCase() === "kpa" ||
    session?.roleNama?.toLowerCase().includes("pa") ||
    session?.roleNama?.toLowerCase().includes("kpa");

  // Open Form Create (Step 4)
  const handleOpenCreate = () => {
    if (!selectedOpd) return;
    setIsEditing(false);
    setEditingId(null);
    setFormOpdId(selectedOpd.id);
    setFormUnitId(selectedUnit?.id || "");
    setFormNomor("");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setSelectedSubKegiatan(null);
    setSelectedRekening(null);
    setSisaDanaInfo(null);
    setFormJnsBeban("UP");
    setFormUraian("");
    setFormNilaiBruto("");
    setFormPenerimaList([]);
    setFormPotonganList([]);
    setFormPaKpa(
      petugasData.paKpaList[0]
        ? {
          userId: petugasData.paKpaList[0].id,
          nama: petugasData.paKpaList[0].nama,
          nip: petugasData.paKpaList[0].nip || "",
        }
        : { userId: "", nama: "", nip: "" }
    );
    setFormPptk({ userId: "", nama: "", nip: "" });
    setFormBendahara(
      petugasData.bendaharaList[0]
        ? {
          userId: petugasData.bendaharaList[0].id,
          nama: petugasData.bendaharaList[0].nama,
          nip: petugasData.bendaharaList[0].nip || "",
        }
        : { userId: "", nama: "", nip: "" }
    );
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Open Form Edit (Step 4)
  const handleOpenEdit = (item: KwitansiItem) => {
    if (item.status !== "DRAFT" && item.status !== "DITOLAK") {
      alert(`Kuitansi dengan status ${item.status} tidak dapat diubah.`);
      return;
    }
    setIsEditing(true);
    setEditingId(item.id);
    setFormNomor(item.nomor);
    setFormTanggal(new Date(item.tanggal).toISOString().split("T")[0]);
    setFormTahun(item.tahunAnggaran);
    setFormOpdId(item.opdId);
    setFormUnitId(item.unitKerjaId || "");
    setSelectedSubKegiatan({
      kd_sub_kegiatan: item.kd_sub_kegiatan,
      nm_sub_kegiatan: item.nm_sub_kegiatan,
    });
    setSelectedRekening({
      kd_rek6: item.kd_rek6,
      nm_rek6: item.nm_rek6,
    });
    setFormJnsBeban(item.jns_beban);
    setFormUraian(item.uraian);
    setFormNilaiBruto(Number(item.nilai));

    setFormPenerimaList(
      item.penerimaList.map((p) => ({
        id: p.id,
        nm_penerima: p.nm_penerima,
        alamat_penerima: p.alamat_penerima || "",
        npwp_penerima: p.npwp_penerima || "",
        nm_bank_penerima: p.nm_bank_penerima || "Bank Sumut",
        no_rek_penerima: p.no_rek_penerima,
        an_rekening: p.an_rekening || "",
        nilai: Number(p.nilai),
        keterangan: p.keterangan || "",
      }))
    );

    setFormPotonganList(
      item.potonganList.map((pot) => ({
        id: pot.id,
        kd_rek6: pot.kd_rek6 || "",
        nm_rek6: pot.nm_rek6 || "",
        id_billing: pot.id_billing || "",
        ntpn: pot.ntpn || "",
        nilai: Number(pot.nilai),
        keterangan: pot.keterangan || "",
      }))
    );

    setFormPaKpa({
      userId: item.paKpaUserId || (item.paKpaNama ? `custom-pa-${item.paKpaNama}` : ""),
      nama: item.paKpaNama || "",
      nip: item.paKpaNip || "",
    });
    setFormPptk({
      userId: item.pptkUserId || (item.pptkNama ? `custom-pptk-${item.pptkNama}` : ""),
      nama: item.pptkNama || "",
      nip: item.pptkNip || "",
    });
    setFormBendahara({
      userId: item.bendaharaUserId || (item.bendaharaNama ? `custom-bend-${item.bendaharaNama}` : ""),
      nama: item.bendaharaNama || "",
      nip: item.bendaharaNip || "",
    });

    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Save Kuitansi
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubKegiatan) {
      alert("Pilih Sub Kegiatan terlebih dahulu.");
      return;
    }
    if (!selectedRekening) {
      alert("Pilih Kode Rekening Belanja terlebih dahulu.");
      return;
    }
    if (!formUraian.trim()) {
      alert("Uraian kuitansi belanja wajib diisi.");
      return;
    }
    const bruto = Number(formNilaiBruto);
    if (!bruto || bruto <= 0) {
      alert("Nilai bruto kuitansi harus lebih dari 0.");
      return;
    }

    // Validasi sisa penyediaan dana
    if (sisaDanaInfo && sisaDanaInfo.totalSpd > 0 && bruto > sisaDanaInfo.sisaPenyediaanDana) {
      const confirmExceed = confirm(
        `Perhatian: Nilai kuitansi (${formatRupiah(bruto)}) melebihi Sisa Penyediaan Dana (${formatRupiah(
          sisaDanaInfo.sisaPenyediaanDana
        )}).\n\nApakah Anda yakin ingin tetap menyimpan dokumen pengajuan ini?`
      );
      if (!confirmExceed) return;
    }

    if (formPenerimaList.length === 0) {
      alert("Tambahkan minimal 1 data rekanan / penerima pembayaran melalui tombol '+ Tambah Penerima'.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const targetOpd = selectedOpd || opds.find((o: OpdItem) => o.id === formOpdId);
      const targetUnit = selectedUnit || units.find((u: UnitItem) => u.id === formUnitId);

      const payload = {
        nomor: formNomor || undefined,
        tanggal: formTanggal,
        tahunAnggaran: formTahun,
        opdId: targetOpd?.id || formOpdId,
        unitKerjaId: targetUnit?.id || formUnitId || undefined,
        kd_skpd: targetOpd?.kd_skpd,
        nm_skpd: targetOpd?.nm_skpd,
        kd_unit: targetUnit?.kd_unit || null,
        nm_unit: targetUnit?.nm_unit || null,
        kd_program: selectedSubKegiatan.kd_program || null,
        nm_program: selectedSubKegiatan.nm_program || null,
        kd_kegiatan: selectedSubKegiatan.kd_kegiatan || null,
        nm_kegiatan: selectedSubKegiatan.nm_kegiatan || null,
        kd_sub_kegiatan: selectedSubKegiatan.kd_sub_kegiatan,
        nm_sub_kegiatan: selectedSubKegiatan.nm_sub_kegiatan,
        kd_rek6: selectedRekening.kd_rek6,
        nm_rek6: selectedRekening.nm_rek6,
        jns_beban: formJnsBeban,
        uraian: formUraian,
        nilai: bruto,
        paKpaUserId: formPaKpa.userId || null,
        paKpaNama: formPaKpa.nama || null,
        paKpaNip: formPaKpa.nip || null,
        pptkUserId: formPptk.userId || null,
        pptkNama: formPptk.nama || null,
        pptkNip: formPptk.nip || null,
        bendaharaUserId: formBendahara.userId || null,
        bendaharaNama: formBendahara.nama || null,
        bendaharaNip: formBendahara.nip || null,
        penerima: formPenerimaList.map((p) => ({
          nm_penerima: p.nm_penerima,
          alamat_penerima: p.alamat_penerima || null,
          npwp_penerima: p.npwp_penerima || null,
          nm_bank_penerima: p.nm_bank_penerima || "Bank Sumut",
          no_rek_penerima: p.no_rek_penerima,
          an_rekening: p.an_rekening || p.nm_penerima,
          nilai: Number(p.nilai || bruto),
          keterangan: p.keterangan || null,
        })),
        potongan: formPotonganList.map((pot) => ({
          jenis_potongan: pot.nm_rek6 || "Potongan Pajak",
          kd_rek6: pot.kd_rek6 || null,
          nm_rek6: pot.nm_rek6 || null,
          id_billing: pot.id_billing || null,
          ntpn: pot.ntpn || null,
          nilai: Number(pot.nilai || 0),
          keterangan: pot.keterangan || null,
        })),
      };

      const url = isEditing
        ? `/api/penatausahaan/pengajuan/kuitansi/${editingId}`
        : `/api/penatausahaan/pengajuan/kuitansi`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan kuitansi");
      }

      setMessage({
        type: "success",
        text: isEditing
          ? "Kuitansi berhasil diperbarui."
          : `Kuitansi baru dengan nomor ${json.data.nomor} berhasil disimpan.`,
      });
      setCurrentStep(3);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Terjadi kesalahan" });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Kuitansi
  const handleDelete = async (item: KwitansiItem) => {
    if (item.status !== "DRAFT") {
      alert(`Kuitansi dengan status ${item.status} tidak dapat dihapus.`);
      return;
    }
    if (!confirm(`Hapus kuitansi ${item.nomor}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/penatausahaan/pengajuan/kuitansi/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus kuitansi");
      }
      setMessage({ type: "success", text: `Kuitansi ${item.nomor} berhasil dihapus.` });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus kuitansi");
    }
  };

  // Status Action (Ajukan, Setujui, Tolak, Batalkan)
  const handleUpdateStatus = async (
    id: string,
    action: "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN",
    catatan?: string
  ) => {
    try {
      const res = await fetch(`/api/penatausahaan/pengajuan/kuitansi/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, catatan }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memproses status kuitansi");
      }
      setMessage({
        type: "success",
        text: `Status kuitansi berhasil diperbarui menjadi ${action}.`,
      });
      if (showRejectModal) {
        setShowRejectModal(false);
        setRejectCatatan("");
        setRejectingId(null);
      }
      if (showModalDetail) {
        setShowModalDetail(false);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal memproses status");
    }
  };

  // Modal Handlers: Penerima
  const handleOpenAddPenerima = () => {
    setEditingPenerimaIndex(null);
    const sisaNilai = Math.max(
      0,
      Number(formNilaiBruto || 0) -
      formPenerimaList.reduce((acc, curr) => acc + Number(curr.nilai || 0), 0)
    );
    setPenerimaFormState({
      nm_penerima: "",
      nm_bank_penerima: "Bank Sumut",
      no_rek_penerima: "",
      npwp_penerima: "",
      an_rekening: "",
      nilai: sisaNilai > 0 ? sisaNilai : Number(formNilaiBruto || 0),
      keterangan: "",
    });
    setShowModalPenerima(true);
  };

  const handleOpenEditPenerima = (idx: number) => {
    setEditingPenerimaIndex(idx);
    setPenerimaFormState({ ...formPenerimaList[idx] });
    setShowModalPenerima(true);
  };

  const handleSavePenerimaModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!penerimaFormState.nm_penerima.trim()) {
      alert("Nama penerima / rekanan wajib diisi.");
      return;
    }
    if (!penerimaFormState.nm_bank_penerima.trim()) {
      alert("Nama bank penyalur wajib diisi.");
      return;
    }
    if (!penerimaFormState.no_rek_penerima.trim()) {
      alert("Nomor rekening wajib diisi.");
      return;
    }

    const payload = {
      ...penerimaFormState,
      nilai: Number(penerimaFormState.nilai || 0),
      an_rekening: penerimaFormState.an_rekening?.trim() || penerimaFormState.nm_penerima,
    };

    if (editingPenerimaIndex !== null) {
      const updated = [...formPenerimaList];
      updated[editingPenerimaIndex] = payload;
      setFormPenerimaList(updated);
    } else {
      setFormPenerimaList([...formPenerimaList, payload]);
    }

    setShowModalPenerima(false);
  };

  const handleRemovePenerima = (idx: number) => {
    const updated = [...formPenerimaList];
    updated.splice(idx, 1);
    setFormPenerimaList(updated);
  };

  // Modal Handlers: Potongan
  const handleOpenAddPotongan = () => {
    setEditingPotonganIndex(null);
    const defaultRef = potonganRefList[0] || {
      kd_rek6: "2.1.01.06.01.0001",
      nm_rek6: "Utang Pajak Pertambahan Nilai (PPN)",
    };
    setPotonganFormState({
      kd_rek6: defaultRef.kd_rek6,
      nm_rek6: defaultRef.nm_rek6,
      id_billing: "",
      ntpn: "",
      nilai: 0,
      keterangan: "",
    });
    setShowModalPotongan(true);
  };

  const handleOpenEditPotongan = (idx: number) => {
    setEditingPotonganIndex(idx);
    setPotonganFormState({ ...formPotonganList[idx] });
    setShowModalPotongan(true);
  };

  const handleSavePotonganModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!potonganFormState.kd_rek6) {
      alert("Pilih rekening potongan terlebih dahulu.");
      return;
    }
    const val = Number(potonganFormState.nilai || 0);
    if (val <= 0) {
      alert("Nilai potongan harus lebih besar dari 0.");
      return;
    }

    const selectedRef = potonganRefList.find((r) => r.kd_rek6 === potonganFormState.kd_rek6);
    const payload = {
      ...potonganFormState,
      nm_rek6: selectedRef?.nm_rek6 || potonganFormState.nm_rek6,
      nilai: val,
    };

    if (editingPotonganIndex !== null) {
      const updated = [...formPotonganList];
      updated[editingPotonganIndex] = payload;
      setFormPotonganList(updated);
    } else {
      setFormPotonganList([...formPotonganList, payload]);
    }

    setShowModalPotongan(false);
  };

  const handleRemovePotongan = (idx: number) => {
    const updated = [...formPotonganList];
    updated.splice(idx, 1);
    setFormPotonganList(updated);
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Clock className="w-3 h-3 text-gray-500" /> Draft
          </span>
        );
      case "DIAJUKAN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Send className="w-3 h-3 text-amber-500" /> Diajukan (Menunggu PA/KPA)
          </span>
        );
      case "DISETUJUI":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetujui
          </span>
        );
      case "DITOLAK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> Ditolak
          </span>
        );
      case "DIBUKUKAN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Dibukukan BKU
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* HEADER CARD & STEPPER PROGRESS BAR (IDENTIK SEPERTI MENU SPP) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-rose-100 text-[#88131A] border-rose-200">
                PENGAJUAN KUITANSI
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Tahun Anggaran {tahunAnggaran}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Kuitansi Pengajuan Belanja Daerah
            </h1>
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
            { step: 3, label: "3. Daftar Kuitansi", icon: Receipt },
            { step: 4, label: "4. Pengisian Kuitansi", icon: FileText },
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
                  (!selectedOpd || (s.step === 3 && currentStep < 3) || (s.step === 4 && currentStep < 4))
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
                  <div className="text-[11px] font-extrabold truncate">{s.label}</div>
                  <div className="text-[10px] opacity-80 truncate">
                    {s.step === 1 && (selectedOpd ? selectedOpd.kd_skpd : "Belum dipilih")}
                    {s.step === 2 && (selectedUnit ? selectedUnit.kd_unit : "Seluruh Unit")}
                    {s.step === 3 && `${totalItems} Dokumen`}
                    {s.step === 4 && (formNomor ? formNomor : "Formulir Baru")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih Organisasi Perangkat Daerah yang akan mengelola pengajuan kuitansi
              </p>
            </div>
          </div>

          {loadingScope ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
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
                  <div className="py-8 text-center text-xs text-slate-500">
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

                        {/* Tombol Next */}
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
                OPD Induk:{" "}
                <strong className="text-[#88131A]">
                  {selectedOpd?.kd_skpd} - {selectedOpd?.nm_skpd}
                </strong>
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
                    Perangkat Daerah ini ({selectedOpd?.nm_skpd}) tidak memiliki Sub Unit
                    (Puskesmas/Kelurahan). Seluruh anggaran dikelola langsung oleh Unit Induk SKPD.
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
                {/* Opsi seluruh unit / unit induk */}
                <div
                  onClick={() => handleSelectAndNextUnit(null)}
                  className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#991B1B] hover:bg-slate-50 transition-all flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-[#88131A] bg-red-100/60 px-2 py-0.5 rounded">
                      {selectedOpd?.kd_skpd}
                    </span>
                    <div className="font-bold text-sm text-slate-900 mt-1">
                      Seluruh Unit Kerja / SKPD Induk
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tampilkan seluruh kuitansi pengajuan belanja di bawah OPD induk
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAndNextUnit(null);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <span>Pilih Induk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

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
                <span>Kembali ke Tahap 1 (Ganti OPD)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 3: DAFTAR DOKUMEN KUITANSI                                */}
      {/* ============================================================== */}
      {currentStep === 3 && selectedOpd && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar Summary & Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#88131A]" />
                  <span>Daftar Kuitansi Pengajuan</span>
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <GitBranch className="w-4 h-4 text-slate-500" />
                  <span>Ganti Unit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Ganti OPD</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Buat Kuitansi Baru
                </button>
              </div>
            </div>

            {/* Filter Section */}

            <div className="pt-4 mt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* Jenis Beban */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <Wallet className="w-3.5 h-3.5 text-rose-500" />
                    Jenis Beban
                  </label>
                  <select
                    value={selectedBeban}
                    onChange={(e) => {
                      setSelectedBeban(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-semibold text-slate-700
        bg-white border border-slate-200 rounded-xl shadow-sm
        hover:border-rose-300 focus:border-rose-500
        focus:ring-2 focus:ring-rose-100 outline-none
        transition-all duration-200 cursor-pointer"
                  >
                    <option value="SEMUA">Semua Beban</option>
                    <option value="UP">UP - Uang Persediaan</option>
                    <option value="GU">GU - Ganti Uang</option>
                    <option value="TU">TU - Tambah Uang</option>
                    <option value="LS">LS - Langsung</option>
                  </select>
                </div>

                {/* Status Kuitansi */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <ClipboardCheck className="w-3.5 h-3.5 text-rose-500" />
                    Status Kuitansi
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-semibold text-slate-700
        bg-white border border-slate-200 rounded-xl shadow-sm
        hover:border-rose-300 focus:border-rose-500
        focus:ring-2 focus:ring-rose-100 outline-none
        transition-all duration-200 cursor-pointer"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="DIAJUKAN">Diajukan</option>
                    <option value="DISETUJUI">Disetujui PA/KPA</option>
                    <option value="DITOLAK">Ditolak</option>
                    <option value="DIBUKUKAN">Dibukukan</option>
                  </select>
                </div>

                {/* Mulai Tanggal */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                    Mulai Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-medium text-slate-700
        bg-white border border-slate-200 rounded-xl shadow-sm
        hover:border-rose-300 focus:border-rose-500
        focus:ring-2 focus:ring-rose-100 outline-none
        transition-all duration-200"
                  />
                </div>

                {/* Sampai Tanggal */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <CalendarCheck className="w-3.5 h-3.5 text-rose-500" />
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-medium text-slate-700
        bg-white border border-slate-200 rounded-xl shadow-sm
        hover:border-rose-300 focus:border-rose-500
        focus:ring-2 focus:ring-rose-100 outline-none
        transition-all duration-200"
                  />
                </div>

                {/* Pencarian */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    <Search className="w-3.5 h-3.5 text-rose-500" />
                    Pencarian
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nomor, uraian..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full h-10 pl-9 pr-3 text-xs font-medium
          text-slate-700 bg-white border border-slate-200
          rounded-xl shadow-sm placeholder:text-slate-400
          hover:border-rose-300 focus:border-rose-500
          focus:ring-2 focus:ring-rose-100 outline-none
          transition-all duration-200"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* TABLE DAFTAR KUITANSI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 min-w-[140px]">No. Kuitansi & Tgl</th>
                    <th className="py-3 px-3 min-w-[200px]">Sub Kegiatan & Rekening</th>
                    <th className="py-3 px-3 min-w-[220px]">Uraian Pembayaran</th>
                    <th className="py-3 px-3 min-w-[170px]">Penerima & Rekening</th>
                    <th className="py-3 px-3 min-w-[140px]">ID Billing / NTPN</th>
                    <th className="py-3 px-3 text-right min-w-[120px]">Nilai Bruto</th>
                    <th className="py-3 px-3 text-right min-w-[110px]">Potongan</th>
                    <th className="py-3 px-3 text-right min-w-[120px]">Nilai Netto</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">Status</th>
                    <th className="py-3 px-3 text-center min-w-[120px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                        Memuat data kuitansi...
                      </td>
                    </tr>
                  ) : dataList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-400">
                        Belum ada data kuitansi pada OPD/Unit terpilih.
                      </td>
                    </tr>
                  ) : (
                    dataList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-center font-medium text-gray-500">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-gray-900">{item.nomor}</div>
                          <div className="text-[11px] text-gray-500">
                            {new Date(item.tanggal).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 mt-1">
                            Beban {item.jns_beban}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-gray-900 font-medium leading-tight">
                            <span className="font-mono text-rose-700 text-[11px]">
                              {item.kd_sub_kegiatan}
                            </span>
                            <div className="line-clamp-2">{item.nm_sub_kegiatan}</div>
                          </div>
                          <div className="text-gray-600 text-[11px] mt-1 pt-1 border-t border-gray-100">
                            <span className="font-mono text-gray-500">{item.kd_rek6}</span> -{" "}
                            {item.nm_rek6}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-gray-700 leading-snug line-clamp-3">{item.uraian}</p>
                        </td>
                        <td className="py-3 px-3">
                          {item.penerimaList && item.penerimaList.length > 0 ? (
                            <div className="space-y-1">
                              {item.penerimaList.map((p, pIdx) => (
                                <div key={pIdx} className="text-[11px] leading-tight">
                                  <span className="font-semibold text-gray-800">
                                    {p.nm_penerima}
                                  </span>
                                  <div className="text-gray-500">
                                    {p.nm_bank_penerima} •{" "}
                                    <span className="font-mono">{p.no_rek_penerima}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.potonganList && item.potonganList.length > 0 ? (
                            <div className="space-y-1">
                              {item.potonganList.map((pot, potIdx) => (
                                <div key={potIdx} className="text-[11px] leading-tight">
                                  <span className="font-medium text-gray-700">
                                    {pot.nm_rek6 || "Potongan"}
                                  </span>
                                  :
                                  {pot.id_billing ? (
                                    <div className="text-[10px] text-gray-500">
                                      Billing:{" "}
                                      <span className="font-mono font-bold text-indigo-700">
                                        {pot.id_billing}
                                      </span>
                                    </div>
                                  ) : null}
                                  {pot.ntpn ? (
                                    <div className="text-[10px] text-gray-500">
                                      NTPN:{" "}
                                      <span className="font-mono font-bold text-emerald-700">
                                        {pot.ntpn}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Tanpa potongan</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-900">
                          {formatRupiah(Number(item.nilai))}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600">
                          {formatRupiah(Number(item.nilai_potongan))}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(Number(item.nilai_bersih))}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {renderStatusBadge(item.status)}
                          {item.catatan && (
                            <div
                              className="text-[10px] text-gray-500 mt-1 italic truncate max-w-[140px]"
                              title={item.catatan}
                            >
                              Catatan: {item.catatan}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedKwitansi(item);
                                setShowModalDetail(true);
                              }}
                              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Detail Kuitansi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedKwitansi(item);
                                setShowPrintModal(true);
                              }}
                              className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Cetak Bukti Kuitansi"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {(item.status === "DRAFT" || item.status === "DITOLAK") && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Kuitansi"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Kuitansi"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, "DIAJUKAN")}
                                  className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Ajukan ke PA/KPA"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {item.status === "DIAJUKAN" && isPaKpaUser && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(item.id, "DISETUJUI")}
                                  className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Setujui Kuitansi"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(item.id);
                                    setShowRejectModal(true);
                                  }}
                                  className="p-1.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Tolak Kuitansi"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION BAR */}
            <div className="p-3 border-t border-gray-100">
              <PaginationBar
                page={currentPage}
                totalPages={Math.ceil(totalItems / pageSize) || 1}
                limit={pageSize}
                total={totalItems}
                onPageChange={setCurrentPage}
                onLimitChange={(sz: number) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAHAP 4: PENGISIAN FORMULIR KUITANSI LENGKAP & PROFESIONAL      */}
      {/* ============================================================== */}
      {currentStep === 4 && selectedOpd && (
        <form onSubmit={handleSubmitForm} className="space-y-6 animate-in fade-in">
          {/* Header Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#88131A]" />
                  <span>
                    {isEditing ? "Ubah Dokumen Kuitansi" : "Formulir Pembuatan Kuitansi Pengajuan"}
                  </span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Daftar Kuitansi
                </button>
              </div>
            </div>

            {/* 1. INFORMASI UTAMA KUITANSI */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-[#88131A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Informasi Dokumen & Beban Belanja
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Nomor Kuitansi
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatis digenerate sistem"
                    value={formNomor}
                    onChange={(e) => setFormNomor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A] bg-slate-50/50"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kosongkan untuk penomoran otomatis
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Kuitansi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Tahun Anggaran
                  </label>
                  <input
                    type="text"
                    disabled
                    value={tahunAnggaran}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    Jenis Beban <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={jnsBebanOptions}
                    value={formJnsBeban}
                    onChange={(val) => setFormJnsBeban(val || "UP")}
                    placeholder="Pilih Jenis Beban"
                    searchPlaceholder="Cari jenis beban..."
                    allowClear={false}
                  />
                </div>
              </div>

              {/* Sub Kegiatan & Rekening dengan Tampilan Elegan Select2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#88131A]" />
                      Sub Kegiatan (Sesuai Penugasan PPTK) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formSubKegiatanList.length} Kegiatan Tersedia
                    </span>
                  </label>
                  <SearchableSelect
                    options={subKegiatanOptions}
                    value={selectedSubKegiatan?.kd_sub_kegiatan || ""}
                    onChange={(val) => {
                      const sk = formSubKegiatanList.find(
                        (item) => item.kd_sub_kegiatan === val
                      );
                      setSelectedSubKegiatan(sk || null);
                      if (!sk || sk.kd_sub_kegiatan !== selectedSubKegiatan?.kd_sub_kegiatan) {
                        setSelectedRekening(null);
                      }
                      if (sk?.pptkNama) {
                        setFormPptk({
                          userId: sk.pptkUserId || `rka-${sk.kd_sub_kegiatan}`,
                          nama: sk.pptkNama,
                          nip: sk.pptkNip || "",
                        });
                      } else if (!isEditing) {
                        setFormPptk({ userId: "", nama: "", nip: "" });
                      }
                    }}
                    placeholder="-- Pilih Sub Kegiatan (Ketik untuk mencari) --"
                    searchPlaceholder="Cari kode atau nama sub kegiatan..."
                    emptyText="Tidak ada sub kegiatan yang cocok."
                    allowClear={true}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-[#88131A]" />
                      Kode Rekening Belanja (Objek 6) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formRekeningList.length} Rekening
                    </span>
                  </label>
                  <SearchableSelect
                    options={rekeningOptions}
                    value={selectedRekening?.kd_rek6 || ""}
                    onChange={(val) => {
                      const rek = formRekeningList.find(
                        (item) => item.kd_rek6 === val
                      );
                      setSelectedRekening(rek || null);
                    }}
                    disabled={!selectedSubKegiatan || formRekeningList.length === 0}
                    placeholder={
                      !selectedSubKegiatan
                        ? "-- Pilih Sub Kegiatan Terlebih Dahulu --"
                        : formRekeningList.length === 0
                          ? "-- Tidak ada rekening pada sub kegiatan ini --"
                          : "-- Pilih Kode Rekening Belanja (Ketik untuk mencari) --"
                    }
                    searchPlaceholder="Cari kode rekening atau nama belanja..."
                    emptyText="Tidak ada rekening belanja yang cocok."
                    allowClear={true}
                    required
                  />
                </div>
              </div>

              {/* NOTIFIKASI SISA PENYEDIAAN DANA (SPD TERBIT - NILAI KUITANSI) */}
              {selectedSubKegiatan && selectedRekening && (
                <div className="animate-in fade-in">
                  {loadingSisaDana ? (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-500">
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                      <span>Menghitung sisa penyediaan dana (SPD terbit - kuitansi keluar)...</span>
                    </div>
                  ) : sisaDanaInfo ? (
                    <div
                      className={`p-4 rounded-2xl border transition-all ${sisaDanaInfo.sisaPenyediaanDana <= 0
                        ? "bg-rose-50/70 border-rose-300 text-rose-900"
                        : Number(formNilaiBruto || 0) > sisaDanaInfo.sisaPenyediaanDana
                          ? "bg-amber-50/80 border-amber-300 text-amber-900"
                          : "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/10">
                        <div className="flex items-center gap-2">
                          {sisaDanaInfo.sisaPenyediaanDana <= 0 ? (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          ) : Number(formNilaiBruto || 0) > sisaDanaInfo.sisaPenyediaanDana ? (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">
                              Monitoring Penyediaan Dana Belanja (SPD Terbit)
                            </h4>
                            <p className="text-[11px] opacity-80">
                              Sub Kegiatan: {selectedSubKegiatan.kd_sub_kegiatan} • Rekening:{" "}
                              {selectedRekening.kd_rek6}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${sisaDanaInfo.sisaPenyediaanDana <= 0
                              ? "bg-rose-200 text-rose-900"
                              : Number(formNilaiBruto || 0) > sisaDanaInfo.sisaPenyediaanDana
                                ? "bg-amber-200 text-amber-950"
                                : "bg-emerald-200 text-emerald-900"
                              }`}
                          >
                            {sisaDanaInfo.sisaPenyediaanDana <= 0
                              ? "Dana SPD Nihil"
                              : Number(formNilaiBruto || 0) > sisaDanaInfo.sisaPenyediaanDana
                                ? "Melebihi Sisa SPD"
                                : "Penyediaan Dana Aman"}
                          </span>
                        </div>
                      </div>

                      {/* Angka-angka detail komparasi */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Pagu DPA:
                          </span>
                          <div className="font-mono font-bold text-slate-800 text-xs">
                            {formatRupiah(sisaDanaInfo.paguDpa)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Nilai SPD Terbit:
                          </span>
                          <div className="font-mono font-bold text-blue-800 text-xs">
                            {formatRupiah(sisaDanaInfo.totalSpd)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Kuitansi Terbit:
                          </span>
                          <div className="font-mono font-bold text-slate-800 text-xs">
                            {formatRupiah(sisaDanaInfo.totalKuitansi)}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Sisa Penyediaan Dana:
                          </span>
                          <div
                            className={`font-mono font-black text-sm ${sisaDanaInfo.sisaPenyediaanDana <= 0
                              ? "text-rose-700"
                              : "text-emerald-700"
                              }`}
                          >
                            {formatRupiah(sisaDanaInfo.sisaPenyediaanDana)}
                          </div>
                        </div>
                      </div>

                      {/* Warning bar jika melebihi */}
                      {Number(formNilaiBruto || 0) > sisaDanaInfo.sisaPenyediaanDana && (
                        <div className="mt-3 pt-2 border-t border-amber-200/80 text-[11px] font-semibold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Nilai kuitansi saat ini ({formatRupiah(Number(formNilaiBruto || 0))})
                            melebihi sisa penyediaan dana yang tersedia (
                            {formatRupiah(sisaDanaInfo.sisaPenyediaanDana)}). Pastikan dokumen SPD
                            telah diterbitkan oleh BUD sebelum pengajuan.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Uraian Keperluan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uraian Belanja / Keperluan Pembayaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tuliskan keperluan belanja kuitansi secara jelas dan lengkap..."
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              {/* Ringkasan Finansial Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nilai Bruto Kuitansi (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={formNilaiBruto}
                      onChange={(e) => setFormNilaiBruto(e.target.value)}
                      className="w-full text-base font-black text-slate-900 border-0 focus:ring-0 p-0"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Jumlah kotor sebelum potongan
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Total Potongan Pajak (Rp)
                    </label>
                    <div className="text-base font-black text-rose-600">
                      {formatRupiah(totalFormPotongan)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Dihitung dari {formPotonganList.length} potongan
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Nilai Netto / Dibayarkan (Rp)
                    </label>
                    <div className="text-base font-black text-emerald-700">
                      {formatRupiah(totalFormNetto)}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Bruto dikurangi potongan
                    </span>
                  </div>
                </div>

                {Number(formNilaiBruto) > 0 && (
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-xs italic text-slate-700 flex items-center gap-2">
                    <span className="font-bold text-slate-500 not-italic text-[11px] uppercase tracking-wider">
                      Terbilang:
                    </span>
                    <span>&quot;{terbilang(Number(formNilaiBruto))} Rupiah&quot;</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. DATA RINCIAN PENERIMA / REKANAN (MENGGUNAKAN FORM MODAL) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#88131A]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Data Rekanan / Penerima Pembayaran
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddPenerima}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl shadow-sm transition-colors cursor-pointer w-fit"
              >
                <Plus className="w-4 h-4" />
                Tambah Penerima
              </button>
            </div>

            {/* Tabel Daftar Penerima */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                    <th className="px-3.5 py-2.5">Nama Rekanan / Penerima</th>
                    <th className="px-3.5 py-2.5">Bank Penyalur</th>
                    <th className="px-3.5 py-2.5">Nomor Rekening</th>
                    <th className="px-3.5 py-2.5">Atas Nama & NPWP</th>
                    <th className="px-3.5 py-2.5 text-right">Nilai Transfer (Rp)</th>
                    <th className="px-3.5 py-2.5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formPenerimaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                        Belum ada data penerima pembayaran. Klik tombol{" "}
                        <strong className="text-slate-700">&quot;+ Tambah Penerima&quot;</strong>{" "}
                        untuk menginput rekanan.
                      </td>
                    </tr>
                  ) : (
                    formPenerimaList.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900">{p.nm_penerima}</div>
                          {p.alamat_penerima && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {p.alamat_penerima}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">
                          {p.nm_bank_penerima}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                          {p.no_rek_penerima}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="text-slate-800 font-medium">{p.an_rekening || "-"}</div>
                          {p.npwp_penerima && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              NPWP: {p.npwp_penerima}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                          {formatRupiah(Number(p.nilai))}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPenerima(idx)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Penerima Ini"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePenerima(idx)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Penerima Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. DATA RINCIAN POTONGAN PAJAK (PERSIS SEPERTI SPM & MENGGUNAKAN FORM MODAL) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#88131A]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Potongan Pajak & Potongan Lainnya
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Total Potongan:</span>
                  <div className="text-sm font-bold text-rose-600">
                    {formatRupiah(totalFormPotongan)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddPotongan}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Potongan</span>
                </button>
              </div>
            </div>

            {/* Tabel Daftar Potongan (Format Persis SPM) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                    <th className="px-3.5 py-2.5">Rekening Potongan</th>
                    <th className="px-3.5 py-2.5">ID Billing / NTPN</th>
                    <th className="px-3.5 py-2.5">Keterangan</th>
                    <th className="px-3.5 py-2.5 text-right">Nilai Potongan (Rp)</th>
                    <th className="px-3.5 py-2.5 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formPotonganList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                        Tidak ada potongan pajak pada kuitansi ini (Nihil Potongan). Klik tombol{" "}
                        <strong className="text-slate-700">&quot;+ Tambah Potongan&quot;</strong> jika
                        ada potongan pajak yang harus dipungut.
                      </td>
                    </tr>
                  ) : (
                    formPotonganList.map((pot, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="font-mono text-xs font-bold text-rose-800">
                            {pot.kd_rek6}
                          </div>
                          <div className="text-xs font-semibold text-slate-800">{pot.nm_rek6}</div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="space-y-0.5 font-mono text-xs">
                            {pot.id_billing ? (
                              <div className="text-indigo-700 font-bold">
                                Billing: {pot.id_billing}
                              </div>
                            ) : null}
                            {pot.ntpn ? (
                              <div className="text-emerald-700 font-bold">NTPN: {pot.ntpn}</div>
                            ) : null}
                            {!pot.id_billing && !pot.ntpn && (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700">{pot.keterangan || "-"}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-rose-600">
                          {formatRupiah(Number(pot.nilai))}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPotongan(idx)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Potongan Ini"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePotongan(idx)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Potongan Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. PEJABAT PENANDATANGAN DOKUMEN KUITANSI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pejabat Penandatangan Dokumen
                </h3>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* PA / KPA */}
              <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200">

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800">
                      Pengguna Anggaran / KPA
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Penanggung jawab anggaran
                    </p>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    PA / KPA
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Pilih Pejabat
                  </label>
                  <SearchableSelect
                    options={paKpaOptions}
                    value={formPaKpa.userId}
                    onChange={(val) => {
                      const found = petugasData.paKpaList.find((p) => p.id === val);
                      if (found) {
                        setFormPaKpa({
                          userId: found.id,
                          nama: found.nama,
                          nip: found.nip || ""
                        });
                      } else if (!val) {
                        setFormPaKpa({ userId: "", nama: "", nip: "" });
                      }
                    }}
                    placeholder="-- Pilih PA / KPA --"
                    searchPlaceholder="Cari nama atau NIP PA/KPA..."
                    emptyText="Tidak ada pejabat PA/KPA pada OPD ini."
                    allowClear={true}
                  />

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <UserRound className="w-3.5 h-3.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Nomor Induk Pegawai
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                        {formPaKpa.nama ? (formPaKpa.nip || "-") : "Belum dipilih"}
                      </p>
                    </div>
                    {formPaKpa.nama && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

              {/* PPTK */}
              <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200">

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800">
                      PPTK
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pelaksana teknis kegiatan
                    </p>
                  </div>

                  {activeRkaSubKegiatan?.pptkNama && (
                    <span className="ml-auto text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md whitespace-nowrap">
                      <Check className="w-3 h-3 inline mr-0.5" />
                      Sesuai RKA
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Pilih Pejabat
                  </label>
                  <SearchableSelect
                    options={pptkOptions}
                    value={formPptk.userId}
                    onChange={(val) => {
                      if (
                        activeRkaSubKegiatan?.pptkNama &&
                        val ===
                        (activeRkaSubKegiatan.pptkUserId ||
                          `rka-${activeRkaSubKegiatan.kd_sub_kegiatan}`)
                      ) {
                        setFormPptk({
                          userId: val,
                          nama: activeRkaSubKegiatan.pptkNama,
                          nip: activeRkaSubKegiatan.pptkNip || "",
                        });
                        return;
                      }
                      if (!val) {
                        setFormPptk({ userId: "", nama: "", nip: "" });
                      }
                    }}
                    disabled={!selectedSubKegiatan}
                    placeholder={
                      !selectedSubKegiatan
                        ? "-- Pilih Sub Kegiatan Terlebih Dahulu --"
                        : pptkOptions.length === 0
                          ? "-- PPTK belum ditugaskan di RKA --"
                          : "-- Pilih PPTK --"
                    }
                    searchPlaceholder="Cari nama atau NIP PPTK..."
                    emptyText="Belum ada PPTK yang ditugaskan pada sub kegiatan ini di RKA."
                    allowClear={true}
                  />

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <UserRound className="w-3.5 h-3.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Nomor Induk Pegawai
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                        {formPptk.nama ? (formPptk.nip || "-") : "Belum dipilih"}
                      </p>
                    </div>
                    {formPptk.nama && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

              {/* Bendahara Pengeluaran */}
              <div className="group relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200">

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-800">
                      Bendahara Pengeluaran
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pengelola administrasi belanja
                    </p>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md whitespace-nowrap">
                    BENDAHARA
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Pilih Pejabat
                  </label>
                  <SearchableSelect
                    options={bendaharaOptions}
                    value={formBendahara.userId}
                    onChange={(val) => {
                      const found = petugasData.bendaharaList.find((p) => p.id === val);
                      if (found) {
                        setFormBendahara({
                          userId: found.id,
                          nama: found.nama,
                          nip: found.nip || ""
                        });
                      } else if (!val) {
                        setFormBendahara({ userId: "", nama: "", nip: "" });
                      }
                    }}
                    placeholder="-- Pilih Bendahara --"
                    searchPlaceholder="Cari nama atau NIP Bendahara..."
                    emptyText="Tidak ada Bendahara pada OPD ini."
                    allowClear={true}
                  />

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <UserRound className="w-3.5 h-3.5 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        Nomor Induk Pegawai
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700 truncate">
                        {formBendahara.nama ? (formBendahara.nip || "-") : "Belum dipilih"}
                      </p>
                    </div>
                    {formBendahara.nama && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Form Actions Footer */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isEditing ? "Perbarui Dokumen Kuitansi" : "Simpan Dokumen Kuitansi"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* MODAL FORM INPUT PENERIMA (POPUP MODAL KHUSUS)                 */}
      {/* ============================================================== */}
      {showModalPenerima && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#88131A]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingPenerimaIndex !== null
                    ? "Ubah Data Rekanan / Penerima"
                    : "Tambah Data Rekanan / Penerima"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalPenerima(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePenerimaModal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penerima / Perusahaan Rekanan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CV. Mandiri Jaya / John Doe"
                  value={penerimaFormState.nm_penerima}
                  onChange={(e) =>
                    setPenerimaFormState({
                      ...penerimaFormState,
                      nm_penerima: e.target.value,
                      an_rekening: penerimaFormState.an_rekening || e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Penyalur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bank Sumut"
                    value={penerimaFormState.nm_bank_penerima}
                    onChange={(e) =>
                      setPenerimaFormState({
                        ...penerimaFormState,
                        nm_bank_penerima: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Rekening <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123-456-7890"
                    value={penerimaFormState.no_rek_penerima}
                    onChange={(e) =>
                      setPenerimaFormState({
                        ...penerimaFormState,
                        no_rek_penerima: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NPWP Rekanan
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000.0-000.000"
                    value={penerimaFormState.npwp_penerima || ""}
                    onChange={(e) =>
                      setPenerimaFormState({
                        ...penerimaFormState,
                        npwp_penerima: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pemilik buku tabungan"
                    value={penerimaFormState.an_rekening || ""}
                    onChange={(e) =>
                      setPenerimaFormState({
                        ...penerimaFormState,
                        an_rekening: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Pembayaran Rekanan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0"
                  value={penerimaFormState.nilai || ""}
                  onChange={(e) =>
                    setPenerimaFormState({
                      ...penerimaFormState,
                      nilai: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Catatan rekening (opsional)"
                  value={penerimaFormState.keterangan || ""}
                  onChange={(e) =>
                    setPenerimaFormState({
                      ...penerimaFormState,
                      keterangan: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalPenerima(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-extrabold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Penerima
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL FORM INPUT POTONGAN (POPUP MODAL KHUSUS PERSIS SPM)       */}
      {/* ============================================================== */}
      {showModalPotongan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-visible animate-in fade-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#88131A]" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingPotonganIndex !== null
                    ? "Ubah Rincian Potongan Pajak"
                    : "Tambah Rincian Potongan Pajak"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalPotongan(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePotonganModal} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rekening Potongan Pajak <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={potonganRefOptions}
                  value={potonganFormState.kd_rek6}
                  onChange={(val) => {
                    const sel = potonganRefList.find((r) => r.kd_rek6 === val);
                    setPotonganFormState({
                      ...potonganFormState,
                      kd_rek6: val,
                      nm_rek6: sel?.nm_rek6 || potonganFormState.nm_rek6,
                    });
                  }}
                  placeholder="-- Pilih Rekening Potongan Pajak --"
                  searchPlaceholder="Cari nama atau kode rekening potongan..."
                  emptyText="Rekening potongan tidak ditemukan."
                  allowClear={false}
                  required
                  dropdownPosition="bottom"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID Billing e-Pajak
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 012345678901234"
                    value={potonganFormState.id_billing || ""}
                    onChange={(e) =>
                      setPotonganFormState({
                        ...potonganFormState,
                        id_billing: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold text-indigo-700 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NTPN (Jika Sudah Setor)
                  </label>
                  <input
                    type="text"
                    placeholder="Nomor Transaksi Penerimaan Negara"
                    value={potonganFormState.ntpn || ""}
                    onChange={(e) =>
                      setPotonganFormState({
                        ...potonganFormState,
                        ntpn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 font-mono font-bold text-emerald-700 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nilai Potongan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0"
                  value={potonganFormState.nilai || ""}
                  onChange={(e) =>
                    setPotonganFormState({
                      ...potonganFormState,
                      nilai: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-black text-rose-600 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Potongan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan transaksi pemotongan (opsional)"
                  value={potonganFormState.keterangan || ""}
                  onChange={(e) =>
                    setPotonganFormState({
                      ...potonganFormState,
                      keterangan: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalPotongan(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-extrabold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm cursor-pointer"
                >
                  Simpan Potongan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DETAIL KUITANSI                                          */}
      {/* ============================================================== */}
      {showModalDetail && selectedKwitansi && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Rincian Dokumen Kuitansi: {selectedKwitansi.nomor}
                </h3>
              </div>
              <button
                onClick={() => setShowModalDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-gray-500 font-medium">Nomor Kuitansi</span>
                  <p className="font-bold text-gray-900 text-sm">{selectedKwitansi.nomor}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Tanggal Kuitansi</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedKwitansi.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Jenis Beban</span>
                  <p className="font-bold text-rose-700">Beban {selectedKwitansi.jns_beban}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Status</span>
                  <div className="mt-0.5">{renderStatusBadge(selectedKwitansi.status)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-1">Sub Kegiatan & Rekening Belanja</h4>
                <div className="p-3 rounded-lg border border-gray-200 space-y-1.5">
                  <div>
                    <span className="text-gray-500 font-medium">Sub Kegiatan: </span>
                    <strong className="text-gray-900">
                      {selectedKwitansi.kd_sub_kegiatan} - {selectedKwitansi.nm_sub_kegiatan}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Kode Rekening: </span>
                    <strong className="text-gray-900">
                      {selectedKwitansi.kd_rek6} - {selectedKwitansi.nm_rek6}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-1">Uraian Belanja</h4>
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
                  {selectedKwitansi.uraian}
                </div>
              </div>

              {/* Rincian Penerima */}
              <div>
                <h4 className="font-bold text-gray-800 mb-1">
                  Rincian Penerima ({selectedKwitansi.penerimaList.length})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3">Nama Penerima</th>
                        <th className="py-2 px-3">Bank</th>
                        <th className="py-2 px-3">No. Rekening</th>
                        <th className="py-2 px-3 text-right">Nilai Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedKwitansi.penerimaList.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-gray-900">
                            {p.nm_penerima}
                            {p.npwp_penerima && (
                              <div className="text-[10px] text-gray-500 font-normal">
                                NPWP: {p.npwp_penerima}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-700">{p.nm_bank_penerima}</td>
                          <td className="py-2 px-3 font-mono text-gray-800">{p.no_rek_penerima}</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">
                            {formatRupiah(Number(p.nilai))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rincian Potongan */}
              {selectedKwitansi.potonganList.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">
                    Rincian Potongan / Pajak ({selectedKwitansi.potonganList.length})
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <tr>
                          <th className="py-2 px-3">Jenis Potongan</th>
                          <th className="py-2 px-3">ID Billing</th>
                          <th className="py-2 px-3">NTPN</th>
                          <th className="py-2 px-3 text-right">Nilai Potongan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedKwitansi.potonganList.map((pot, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-gray-800">
                              {pot.nm_rek6 || "Potongan"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                              {pot.id_billing || "-"}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                              {pot.ntpn || "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-rose-600">
                              {formatRupiah(Number(pot.nilai))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rekapitulasi Nominal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-gray-500 font-medium">Total Bruto</span>
                  <div className="text-sm font-bold text-gray-900 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Total Potongan</span>
                  <div className="text-sm font-bold text-rose-600 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai_potongan))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Total Netto</span>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">
                    {formatRupiah(Number(selectedKwitansi.nilai_bersih))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => setShowModalDetail(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowModalDetail(false);
                  setShowPrintModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Kuitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CETAK BUKTI KUITANSI RESMI                               */}
      {/* ============================================================== */}
      {showPrintModal && selectedKwitansi && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Pratinjau Dokumen Kuitansi Pengajuan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Sekarang
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Content Area */}
            <div className="p-8 overflow-y-auto print:p-0 font-serif text-[12px] leading-snug text-black bg-white">
              {/* Header Kiri Atas: Nomor & Judul */}
              <div>
                <div className="text-sm font-bold tracking-wide">
                  NOMOR : {selectedKwitansi.nomor}
                </div>
                <div className="text-sm font-bold uppercase tracking-wide mt-0.5">
                  KWITANSI (TANDA PEMBAYARAN)
                </div>
              </div>

              {/* Metadata Kanan Atas */}
              <div className="flex justify-end mt-1 mb-2">
                <table className="text-[12px] w-[48%]">
                  <tbody>
                    <tr>
                      <td className="w-28 py-0.5">Tanggal</td>
                      <td className="w-4 text-center">:</td>
                      <td>
                        {selectedKwitansi.tanggal
                          ? new Date(selectedKwitansi.tanggal).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-0.5">No BKU</td>
                      <td className="text-center">:</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Sub Kegiatan</td>
                      <td className="text-center">:</td>
                      <td>{selectedKwitansi.kd_sub_kegiatan}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5">Rekening</td>
                      <td className="text-center">:</td>
                      <td>{selectedKwitansi.kd_rek6}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sudah Terima Dari */}
              <div className="font-bold uppercase text-[12px] mt-2 mb-2 leading-snug">
                SUDAH TERIMA DARI BENDAHARA PENGELUARAN {selectedKwitansi.nm_skpd}
              </div>

              {/* Banyaknya */}
              <div className="text-[12px] mb-1">BANYAKNYA :</div>
              <div className="flex items-baseline gap-4 mb-2">
                <div className="w-[23%] shrink-0 text-base font-bold whitespace-nowrap">
                  Rp.{" "}
                  {Number(selectedKwitansi.nilai).toLocaleString("id-ID", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="w-[77%] italic text-[12px]">
                  ( {terbilang(Math.round(Number(selectedKwitansi.nilai)))} Rupiah )
                </div>
              </div>

              {/* Yaitu untuk */}
              <div className="flex items-start gap-4 mt-2">
                <div className="w-[23%] shrink-0 font-bold text-[12px]">
                  Yaitu untuk :
                </div>
                <div className="w-[77%] border-b border-black pb-2 text-[12px] leading-relaxed">
                  {selectedKwitansi.uraian}
                </div>
              </div>

              {/* Informasi Potongan (Rata Kanan) */}
              <div className="w-[36%] ml-auto mt-1 text-[12px]">
                <div className="font-bold mb-1">Informasi Potongan :</div>
                {selectedKwitansi.potonganList.length === 0 ? (
                  <div className="text-right pb-1">(Nihil)</div>
                ) : (
                  <div className="space-y-0.5 pb-1">
                    {selectedKwitansi.potonganList.map((p, idx) => (
                      <div key={idx} className="flex justify-between gap-2 text-[11px]">
                        <span className="truncate">{p.nm_rek6}</span>
                        <span className="whitespace-nowrap">
                          Rp.{" "}
                          {Number(p.nilai).toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-black pt-1 flex justify-between items-center font-bold">
                  <span>Jumlah :</span>
                  <span>
                    {selectedKwitansi.potonganList.length > 0
                      ? `Rp. ${Number(selectedKwitansi.nilai_potongan).toLocaleString("id-ID", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                      : "(Nihil)"}
                  </span>
                </div>
              </div>

              {/* Garis Pembatas Tebal */}
              <div className="border-b-2 border-black my-3" />

              {/* Blok Tanda Tangan 4 Kolom */}
              <div className="grid grid-cols-4 gap-4 mt-4 text-[11px] leading-snug text-left">
                {/* Kolom 1: Pengguna Anggaran */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div>Setuju dibayar,</div>
                    <div className="uppercase mt-2">
                      KEPALA {selectedKwitansi.nm_skpd}, SELAKU PENGGUNA ANGGARAN
                    </div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.paKpaNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.paKpaNip || "-"}</div>
                  </div>
                </div>

                {/* Kolom 2: PPTK */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div>Diketahui Oleh :</div>
                    <div className="uppercase mt-2">
                      PEJABAT PELAKSANA TEKNIS KEGIATAN
                    </div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.pptkNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.pptkNip || "-"}</div>
                  </div>
                </div>

                {/* Kolom 3: Bendahara Pengeluaran */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div>Dibayar Oleh :</div>
                    <div className="uppercase mt-2">BENDAHARA PENGELUARAN</div>
                  </div>
                  <div className="mt-16">
                    <div className="uppercase">
                      {selectedKwitansi.bendaharaNama || "................................"}
                    </div>
                    <div>NIP. {selectedKwitansi.bendaharaNip || "-"}</div>
                  </div>
                </div>

                {/* Kolom 4: Yang Menerima */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div>,</div>
                    <div className="mt-2">Yang Menerima :</div>
                  </div>
                  <div className="mt-16">
                    <table className="w-full text-[11px]">
                      <tbody>
                        <tr>
                          <td className="w-16 align-top">Nama</td>
                          <td className="w-3 align-top">:</td>
                          <td className="uppercase">
                            {selectedKwitansi.penerimaList[0]?.nm_penerima || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="align-top">Pekerjaan</td>
                          <td className="align-top">:</td>
                          <td>
                            {selectedKwitansi.penerimaList[0]?.keterangan || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td className="align-top">Alamat</td>
                          <td className="align-top">:</td>
                          <td>
                            {selectedKwitansi.penerimaList[0]?.alamat_penerima || "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TOLAK KUITANSI (CATATAN REVISI PA/KPA)                   */}
      {/* ============================================================== */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-gray-900">Kembalikan / Tolak Kuitansi</h3>
            </div>
            <p className="text-xs text-gray-600">
              Berikan catatan perbaikan/alasan pengembalian kuitansi ini kepada PPTK:
            </p>
            <textarea
              rows={4}
              required
              placeholder="Contoh: Lampiran ID Billing salah, nilai rincian belum sesuai dengan rincian nota..."
              value={rejectCatatan}
              onChange={(e) => setRejectCatatan(e.target.value)}
              className="w-full text-xs rounded-lg border-gray-300 focus:border-rose-500 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectCatatan("");
                  setRejectingId(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rejectCatatan.trim()}
                onClick={() => {
                  if (rejectingId) {
                    handleUpdateStatus(rejectingId, "DITOLAK", rejectCatatan);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
