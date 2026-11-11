"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
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
  Receipt,
  FileCheck,
  Landmark,
  ShieldAlert,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import Sp2dPrintModal, { Sp2dPrintData } from "./Sp2dPrintModal";

export type JenisSp2dType =
  | "UP"
  | "GU"
  | "TU"
  | "LS_GAJI"
  | "LS_BARANG_JASA"
  | "UP_KKPD"
  | "GU_KKPD"
  | "ALL";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan?: string | null;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
}

interface PejabatBudItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  roleNama?: string;
}

interface Sp2dItem {
  id: string;
  tahunAnggaran: number;
  no_sp2d: string;
  tgl_sp2d: string;
  no_spm: string;
  tgl_spm?: string | null;
  spmId?: string | null;
  no_spp?: string | null;
  tgl_spp?: string | null;
  sppId?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  opdId: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  jenis_sp2d: string;
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
  nama_bank_pembayar?: string | null;
  rek_bank_pembayar?: string | null;
  kuasaBudNama?: string | null;
  kuasaBudNip?: string | null;
  status: string;
  tgl_cair?: string | null;
  tgl_terima?: string | null;
  no_terima?: string | null;
  status_pembukuan?: string | null;
  no_transaksi_bank?: string | null;
  keterangan?: string | null;
}

export default function Sp2dManagementView() {
  // Navigation Steps: 1: Daftar SP2D (Tampilan Awal Langsung) -> 2: Form SP2D
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Scope & Authorization
  const [loadingScope, setLoadingScope] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [pejabatBudList, setPejabatBudList] = useState<PejabatBudItem[]>([]);

  // Filter & Search Daftar SP2D (Step 1)
  const [sp2dList, setSp2dList] = useState<Sp2dItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchSp2d, setSearchSp2d] = useState("");
  const [selectedFilterOpd, setSelectedFilterOpd] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterJenis, setFilterJenis] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form SP2D (Step 2)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeJenisSp2d, setActiveJenisSp2d] = useState<string>("UP");
  const [formHeader, setFormHeader] = useState({
    no_sp2d: "",
    tgl_sp2d: new Date().toISOString().split("T")[0],
    spmId: "",
    no_spm: "",
    tgl_spm: "",
    sppId: "",
    no_spp: "",
    tgl_spp: "",
    bulan: new Date().getMonth() + 1,
    keperluan: "",
    no_spd: "",
    tgl_spd: "",
    nama_penerima: "",
    bank_penerima: "",
    rek_penerima: "",
    npwp_penerima: "",
    nama_bank_pembayar: "PT. Bank Sumut (RKUD Tapanuli Selatan)",
    rek_bank_pembayar: "23301020000129",
    kuasaBudNama: "M. FRANANDA, S.E, M.M",
    kuasaBudNip: "198007232003121002",
    kuasaBudJabatan:
      "KEPALA BADAN PENGELOLA KEUANGAN, PENDAPATAN DAN ASET DAERAH",
    status: "DRAFT",
    keterangan: "",
  });
  const [formRincianBelanja, setFormRincianBelanja] = useState<any[]>([]);
  const [formPotongan, setFormPotongan] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal Pilih SPM Diajukan OPD
  const [showSpmModal, setShowSpmModal] = useState(false);
  const [loadingSpmModal, setLoadingSpmModal] = useState(false);
  const [spmTerbitList, setSpmTerbitList] = useState<any[]>([]);
  const [searchSpmModal, setSearchSpmModal] = useState("");
  const [filterSpmModalOpd, setFilterSpmModalOpd] = useState<string>("ALL");
  const [filterSpmModalJenis, setFilterSpmModalJenis] = useState<string>("ALL");

  // Modal Cetak
  const [printData, setPrintData] = useState<Sp2dPrintData | null>(null);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<Sp2dItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Banner Feedback
  const [banner, setBanner] = useState<ActionFeedback | null>(null);

  // 1. Inisialisasi Scope Data
  useEffect(() => {
    async function initScope() {
      setLoadingScope(true);
      try {
        const res = await fetch("/api/penatausahaan/sp2d?scope=true");
        const json = await res.json();
        if (json.success && json.data) {
          setIsAuthorized(true);
          setOpdList(json.data.opds || []);
          if (json.data.pejabatBud && Array.isArray(json.data.pejabatBud)) {
            setPejabatBudList(json.data.pejabatBud);
            if (json.data.pejabatBud.length > 0) {
              const bud = json.data.pejabatBud[0];
              setFormHeader((prev) => ({
                ...prev,
                kuasaBudNama: bud.nama,
                kuasaBudNip: bud.nip,
                kuasaBudJabatan: bud.jabatan,
              }));
            }
          }
          if (json.data.session?.tahunAnggaran) {
            setTahunAnggaran(json.data.session.tahunAnggaran);
          }
        } else {
          setIsAuthorized(false);
          setBanner({
            type: "error",
            title: "Akses Terbatas",
            message:
              json.error ||
              "Menu SP2D hanya dapat diakses oleh peran BUD, Bidang Perbendaharaan, dan Superadmin.",
          });
        }
      } catch (err) {
        setIsAuthorized(false);
        setBanner({
          type: "error",
          title: "Koneksi Gagal",
          message: "Gagal menghubungkan ke server untuk inisialisasi modul SP2D.",
        });
      } finally {
        setLoadingScope(false);
      }
    }

    initScope();
  }, []);

  // 2. Load Daftar SP2D saat Step 1 aktif atau filter berubah
  useEffect(() => {
    if (isAuthorized && !loadingScope && currentStep === 1) {
      loadSp2dList();
    }
  }, [
    isAuthorized,
    loadingScope,
    currentStep,
    selectedFilterOpd,
    filterStatus,
    filterJenis,
    tahunAnggaran,
  ]);

  async function loadSp2dList() {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
      });
      if (selectedFilterOpd && selectedFilterOpd !== "ALL") {
        params.append("kd_skpd", selectedFilterOpd);
      }
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (filterJenis !== "ALL") params.append("jenis_sp2d", filterJenis);
      if (searchSp2d.trim()) params.append("q", searchSp2d.trim());

      const res = await fetch(`/api/penatausahaan/sp2d?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSp2dList(json.data.items || []);
        setCurrentPage(1);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SP2D.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Gagal menghubungi server untuk memuat daftar SP2D.",
      });
    } finally {
      setLoadingList(false);
    }
  }

  // 3. Generate Nomor SP2D Running Global se-Kabupaten
  // Format: [NOMOR_URUT]/[KD_UNIT]/SP2D/[JENIS]/2026
  async function fetchNextSp2dNumber(jenis: string = "UP", kodeUnit?: string) {
    try {
      const params = new URLSearchParams({
        type: "next-no",
        tahun: tahunAnggaran.toString(),
        jenisSp2d: jenis,
      });
      if (kodeUnit) params.append("kd_unit", kodeUnit);

      const res = await fetch(
        `/api/penatausahaan/sp2d/referensi?${params.toString()}`
      );
      const json = await res.json();
      return (
        json?.data?.generatedNo ||
        `00001/${kodeUnit || "1.01.2.22.0.00.01.0000"}/SP2D/${jenis}/${tahunAnggaran}`
      );
    } catch {
      return `00001/${kodeUnit || "1.01.2.22.0.00.01.0000"}/SP2D/${jenis}/${tahunAnggaran}`;
    }
  }

  // 4. Buka Modal Pilih Dokumen SPM (Menampilkan Seluruh SPM dari OPD)
  async function handleOpenSpmModal() {
    setShowSpmModal(true);
    setLoadingSpmModal(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
      });
      if (editingId) params.append("excludeSp2dId", editingId);

      const res = await fetch(`/api/penatausahaan/sp2d/referensi?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSpmTerbitList(json.data);
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal memuat daftar SPM pilihan.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Koneksi bermasalah saat memuat daftar SPM yang diajukan oleh OPD.",
      });
    } finally {
      setLoadingSpmModal(false);
    }
  }

  // 5. Buat SP2D Baru -> Langsung Buka Modal Pilih SPM
  function handleCreateNewSp2d() {
    setEditingId(null);
    setSearchSpmModal("");
    setFilterSpmModalOpd("ALL");
    setFilterSpmModalJenis("ALL");
    handleOpenSpmModal();
  }

  // 6. Pilih Dokumen SPM Asal -> Masuk ke Form Penerbitan SP2D (Step 2)
  async function handleSelectSpm(spm: any) {
    // Cari OPD asal dokumen SPM
    const matchedOpd =
      opdList.find((o) => o.id === spm.opdId || o.kd_skpd === spm.kd_skpd) || {
        id: spm.opdId,
        kd_skpd: spm.kd_skpd,
        nm_skpd: spm.nm_skpd,
        singkatan: null,
        kepalaNama: null,
        kepalaNip: null,
      };
    setSelectedOpd(matchedOpd);

    const derivedJenis = (spm.jenis_spm || "UP").toUpperCase().replace(/-/g, "_");
    setActiveJenisSp2d(derivedJenis);

    // Ambil nomor SP2D running sesuai format: [NOMOR_URUT]/[KD_UNIT]/SP2D/[JENIS]/2026
    const targetUnitCode = spm.kd_unit || spm.kd_skpd || "";
    const generatedNo = await fetchNextSp2dNumber(derivedJenis, targetUnitCode);

    let kep = spm.keperluan || "";
    if (kep.includes("Surat Perintah Membayar")) {
      kep = kep.replace("Surat Perintah Membayar", "Surat Perintah Pencairan Dana");
    }
    if (kep.includes("SPM")) {
      kep = kep.replace("SPM", "SP2D");
    }

    setFormHeader((prev) => ({
      ...prev,
      no_sp2d: generatedNo,
      tgl_sp2d: new Date().toISOString().split("T")[0],
      spmId: spm.id,
      no_spm: spm.no_spm,
      tgl_spm: spm.tgl_spm,
      sppId: spm.sppId || "",
      no_spp: spm.no_spp || "",
      tgl_spp: spm.tgl_spp || "",
      bulan: spm.bulan || new Date().getMonth() + 1,
      keperluan: kep || `Penerbitan SP2D ${spm.nm_skpd} Tahun ${tahunAnggaran}`,
      no_spd: spm.no_spd || prev.no_spd,
      tgl_spd: spm.tgl_spd || prev.tgl_spd,
      nama_penerima: spm.nama_penerima || prev.nama_penerima,
      bank_penerima: spm.bank_penerima || prev.bank_penerima,
      rek_penerima: spm.rek_penerima || prev.rek_penerima,
      npwp_penerima: spm.npwp_penerima || prev.npwp_penerima,
      nama_bank_pembayar: "PT. Bank Sumut (RKUD Tapanuli Selatan)",
      rek_bank_pembayar: "23301020000129",
      kuasaBudNama:
        pejabatBudList[0]?.nama || prev.kuasaBudNama || "M. FRANANDA, S.E, M.M",
      kuasaBudNip:
        pejabatBudList[0]?.nip || prev.kuasaBudNip || "198007232003121002",
      kuasaBudJabatan:
        pejabatBudList[0]?.jabatan ||
        prev.kuasaBudJabatan ||
        "KEPALA BADAN PENGELOLA KEUANGAN, PENDAPATAN DAN ASET DAERAH",
      status: "DRAFT",
      keterangan: "",
    }));

    setFormRincianBelanja(spm.rincianBelanja || []);
    setFormPotongan(spm.potongan || []);
    setShowSpmModal(false);
    setCurrentStep(2);

    setBanner({
      type: "success",
      title: "Data SPM Berhasil Ditarik",
      message: `Berhasil menarik dokumen ${spm.no_spm} milik ${spm.nm_skpd} dengan nilai bruto ${formatRupiah(
        spm.nilai
      )}. Rincian rekening belanja dari SPP dan potongan pajak siap diterbitkan SP2D.`,
    });
  }

  // 7. Edit / Buka Detail SP2D
  async function handleEditSp2d(item: Sp2dItem) {
    setEditingId(item.id);
    setActiveJenisSp2d(item.jenis_sp2d);

    const matchedOpd =
      opdList.find((o) => o.id === item.opdId || o.kd_skpd === item.kd_skpd) || {
        id: item.opdId,
        kd_skpd: item.kd_skpd,
        nm_skpd: item.nm_skpd,
        singkatan: null,
        kepalaNama: null,
        kepalaNip: null,
      };
    setSelectedOpd(matchedOpd);

    try {
      const res = await fetch(`/api/penatausahaan/sp2d/${item.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setFormHeader({
          no_sp2d: d.no_sp2d,
          tgl_sp2d: d.tgl_sp2d,
          spmId: d.spmId || "",
          no_spm: d.no_spm,
          tgl_spm: d.tgl_spm || "",
          sppId: d.sppId || "",
          no_spp: d.no_spp || "",
          tgl_spp: d.tgl_spp || "",
          bulan: d.bulan || 1,
          keperluan: d.keperluan || "",
          no_spd: d.no_spd || "",
          tgl_spd: d.tgl_spd || "",
          nama_penerima: d.nama_penerima || "",
          bank_penerima: d.bank_penerima || "",
          rek_penerima: d.rek_penerima || "",
          npwp_penerima: d.npwp_penerima || "",
          nama_bank_pembayar:
            d.nama_bank_pembayar || "PT. Bank Sumut (RKUD Tapanuli Selatan)",
          rek_bank_pembayar: d.rek_bank_pembayar || "23301020000129",
          kuasaBudNama: d.kuasaBudNama || "M. FRANANDA, S.E, M.M",
          kuasaBudNip: d.kuasaBudNip || "198007232003121002",
          kuasaBudJabatan:
            d.kuasaBudJabatan ||
            "KEPALA BADAN PENGELOLA KEUANGAN, PENDAPATAN DAN ASET DAERAH",
          status: d.status || "DRAFT",
          keterangan: d.keterangan || "",
        });
        setFormRincianBelanja(d.rincianBelanja || []);
        setFormPotongan(d.potongan || []);
        setCurrentStep(2);
      }
    } catch {
      setBanner({
        type: "error",
        message: "Gagal memuat rincian data SP2D.",
      });
    }
  }

  // 8. Simpan SP2D
  async function handleSaveSp2d(targetStatus: "DRAFT" | "DISETUJUI") {
    if (!selectedOpd) {
      setBanner({
        type: "error",
        message: "Perangkat Daerah (SKPD) tidak valid atau belum terdeteksi.",
      });
      return;
    }

    if (!formHeader.no_sp2d.trim()) {
      setBanner({ type: "error", message: "Nomor SP2D wajib diisi." });
      return;
    }
    if (!formHeader.no_spm.trim()) {
      setBanner({
        type: "error",
        message:
          "Dokumen SPM belum dipilih. Silakan klik tombol 'Pilih Dokumen SPM'.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        tahunAnggaran,
        no_sp2d: formHeader.no_sp2d.trim(),
        tgl_sp2d: formHeader.tgl_sp2d,
        spmId: formHeader.spmId,
        no_spm: formHeader.no_spm,
        tgl_spm: formHeader.tgl_spm || null,
        sppId: formHeader.sppId || null,
        no_spp: formHeader.no_spp || null,
        tgl_spp: formHeader.tgl_spp || null,
        opdId: selectedOpd.id,
        jenis_sp2d: activeJenisSp2d,
        bulan: formHeader.bulan,
        keperluan: formHeader.keperluan.trim(),
        nilai: totalBruto,
        nilai_potongan: totalPotongan,
        nilai_bersih: totalNetto,
        no_spd: formHeader.no_spd || null,
        tgl_spd: formHeader.tgl_spd || null,
        nama_penerima: formHeader.nama_penerima || null,
        bank_penerima: formHeader.bank_penerima || null,
        rek_penerima: formHeader.rek_penerima || null,
        npwp_penerima: formHeader.npwp_penerima || null,
        nama_bank_pembayar: formHeader.nama_bank_pembayar,
        rek_bank_pembayar: formHeader.rek_bank_pembayar,
        kuasaBudNama: formHeader.kuasaBudNama,
        kuasaBudNip: formHeader.kuasaBudNip,
        kuasaBudJabatan: formHeader.kuasaBudJabatan,
        status: targetStatus,
        keterangan: formHeader.keterangan || null,
      };

      const res = await fetch("/api/penatausahaan/sp2d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "SP2D Berhasil Disimpan",
          message: `Dokumen ${formHeader.no_sp2d} berhasil disimpan dengan status ${targetStatus}.`,
        });
        setCurrentStep(1);
        loadSp2dList();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menyimpan SP2D",
          message: json.error || "Terjadi kesalahan saat menyimpan dokumen.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Koneksi bermasalah saat mengirim data ke server.",
      });
    } finally {
      setSaving(false);
    }
  }

  // 9. Konfirmasi Hapus SP2D
  async function confirmDeleteSp2d() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/penatausahaan/sp2d/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          message: `Dokumen SP2D ${deleteTarget.no_sp2d} berhasil dihapus. Status dokumen SPM telah dikembalikan ke DIAJUKAN.`,
        });
        setDeleteTarget(null);
        loadSp2dList();
      } else {
        setBanner({
          type: "error",
          message: json.error || "Gagal menghapus dokumen SP2D.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Koneksi bermasalah saat menghapus dokumen.",
      });
    } finally {
      setDeleting(false);
    }
  }

  // 10. Buka Modal Cetak
  async function handleOpenPrint(sp2dId: string) {
    try {
      const res = await fetch(`/api/penatausahaan/sp2d/${sp2dId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPrintData(json.data);
      }
    } catch {
      setBanner({
        type: "error",
        message: "Gagal memuat data cetak SP2D.",
      });
    }
  }

  // Perhitungan Nilai Bruto, Potongan, Netto
  const totalBruto = useMemo(() => {
    return formRincianBelanja.reduce(
      (acc, curr) => acc + (Number(curr.nilai) || 0),
      0
    );
  }, [formRincianBelanja]);

  const totalPotongan = useMemo(() => {
    return formPotongan.reduce(
      (acc, curr) => acc + (Number(curr.nilai) || 0),
      0
    );
  }, [formPotongan]);

  const totalNetto = useMemo(() => {
    return Math.max(0, totalBruto - totalPotongan);
  }, [totalBruto, totalPotongan]);

  // Filter Dokumen SPM di Modal
  const filteredSpmList = useMemo(() => {
    return spmTerbitList.filter((spm) => {
      if (filterSpmModalOpd !== "ALL" && spm.kd_skpd !== filterSpmModalOpd) {
        return false;
      }
      if (
        filterSpmModalJenis !== "ALL" &&
        spm.jenis_spm !== filterSpmModalJenis
      ) {
        return false;
      }
      if (searchSpmModal.trim()) {
        const q = searchSpmModal.toLowerCase();
        const matchNo = spm.no_spm.toLowerCase().includes(q);
        const matchOpd =
          (spm.nm_skpd || "").toLowerCase().includes(q) ||
          (spm.kd_skpd || "").toLowerCase().includes(q);
        const matchKep = (spm.keperluan || "").toLowerCase().includes(q);
        const matchPen = (spm.nama_penerima || "").toLowerCase().includes(q);
        if (!matchNo && !matchOpd && !matchKep && !matchPen) return false;
      }
      return true;
    });
  }, [spmTerbitList, filterSpmModalOpd, filterSpmModalJenis, searchSpmModal]);

  // Pagination SP2D
  const totalPages = Math.ceil(sp2dList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sp2dList.slice(start, start + pageSize);
  }, [sp2dList, currentPage, pageSize]);

  if (loadingScope) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-2">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#5E0E14] border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">
            Memuat profil akses SP2D...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-[#88131A]" />
          <h2 className="text-base font-bold text-slate-900">
            Akses Ditolak — Otoritas Khusus SP2D
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Modul Surat Perintah Pencairan Dana (SP2D) adalah wewenang tingkat
            daerah yang hanya dapat diakses oleh peran{" "}
            <strong>Bendahara Umum Daerah (BUD)</strong>,{" "}
            <strong>Bidang Perbendaharaan</strong>, dan{" "}
            <strong>Superadmin</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Notifikasi */}
      <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />

      {/* ========================================================================= */}
      {/* STEP 1: DAFTAR DOKUMEN SP2D (TAMPILAN AWAL LANGSUNG) */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header & Action Button */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Landmark className="w-3.5 h-3.5" />
                  Kuasa BUD / Bidang Perbendaharaan
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Pembuatan Surat Perintah Pencairan Dana (SP2D)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar seluruh dokumen SP2D se-Kabupaten Tapanuli Selatan atas
                  SPM yang telah diajukan oleh Perangkat Daerah (OPD).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateNewSp2d}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat SP2D Baru</span>
                </button>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-5">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">
                  Total SP2D Terbit
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {sp2dList.length}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    Berkas
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60">
                <div className="text-[11px] font-medium text-blue-800">
                  Total Bruto
                </div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  {formatRupiah(
                    sp2dList.reduce((acc, curr) => acc + curr.nilai, 0)
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60">
                <div className="text-[11px] font-medium text-amber-800">
                  Total Potongan
                </div>
                <div className="text-lg font-black text-amber-900 mt-1">
                  {formatRupiah(
                    sp2dList.reduce((acc, curr) => acc + curr.nilai_potongan, 0)
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
                <div className="text-[11px] font-medium text-emerald-800">
                  Total Cair (Netto)
                </div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  {formatRupiah(
                    sp2dList.reduce((acc, curr) => acc + curr.nilai_bersih, 0)
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar Komprehensif */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchSp2d}
                onChange={(e) => setSearchSp2d(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSp2dList()}
                placeholder="Cari no SP2D, SPM, SKPD, keperluan, penerima..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Filter SKPD / OPD */}
              <select
                value={selectedFilterOpd}
                onChange={(e) => setSelectedFilterOpd(e.target.value)}
                className="max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Perangkat Daerah (SKPD)</option>
                {opdList.map((opd) => (
                  <option key={opd.id} value={opd.kd_skpd}>
                    {opd.kd_skpd} - {opd.singkatan || opd.nm_skpd}
                  </option>
                ))}
              </select>

              {/* Filter Jenis SP2D */}
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="UP">SP2D-UP</option>
                <option value="GU">SP2D-GU</option>
                <option value="TU">SP2D-TU</option>
                <option value="LS_GAJI">SP2D-LS Gaji</option>
                <option value="LS_BARANG_JASA">SP2D-LS Barjas</option>
                <option value="UP_KKPD">SP2D-UP KKPD</option>
                <option value="GU_KKPD">SP2D-GU KKPD</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DISETUJUI">DISETUJUI</option>
                <option value="CAIR">CAIR</option>
                <option value="DITOLAK">DITOLAK</option>
              </select>

              <button
                onClick={loadSp2dList}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer"
                title="Refresh Daftar"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabel SP2D */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">No. SP2D & Tanggal</th>
                    <th className="px-4 py-3">Perangkat Daerah (SKPD)</th>
                    <th className="px-4 py-3">No. SPM (Sumber)</th>
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
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                        <p className="mt-2 text-xs">Memuat daftar dokumen SP2D...</p>
                      </td>
                    </tr>
                  ) : paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Belum ada dokumen SP2D yang diterbitkan.
                        </p>
                        <button
                          onClick={handleCreateNewSp2d}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5E0E14] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#88131A] cursor-pointer shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Buat SP2D Baru</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((sp2d) => (
                      <tr
                        key={sp2d.id}
                        className="transition hover:bg-slate-50/75"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900">
                              {sp2d.no_sp2d}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {sp2d.jenis_sp2d?.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>{sp2d.tgl_sp2d}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-[220px]">
                          <span className="font-mono text-[10px] font-bold text-[#88131A] bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
                            {sp2d.kd_skpd}
                          </span>
                          <div className="mt-1 font-semibold text-slate-800 line-clamp-2">
                            {sp2d.nm_skpd}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold text-rose-800">
                            {sp2d.no_spm}
                          </span>
                          {sp2d.tgl_spm && (
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Tgl SPM: {sp2d.tgl_spm}
                            </div>
                          )}
                        </td>

                        <td className="max-w-xs px-4 py-3.5">
                          <p className="line-clamp-2 text-xs text-slate-700">
                            {sp2d.keperluan}
                          </p>
                          {sp2d.nama_penerima && (
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                              Penerima: {sp2d.nama_penerima}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                          {formatRupiah(sp2d.nilai)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-medium text-amber-700">
                          {formatRupiah(sp2d.nilai_potongan)}
                        </td>

                        <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                          {formatRupiah(sp2d.nilai_bersih)}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${sp2d.status === "CAIR"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : sp2d.status === "DISETUJUI"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : sp2d.status === "DIVERIFIKASI"
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : sp2d.status === "DITOLAK"
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : "bg-slate-100 text-slate-800 border border-slate-200"
                                }`}
                            >
                              {sp2d.status}
                            </span>
                            {sp2d.status_pembukuan === "SUDAH_DIBUKUKAN" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                Sudah Dibukukan
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenPrint(sp2d.id)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                              title="Cetak Format SP2D"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditSp2d(sp2d)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#5E0E14] cursor-pointer"
                              title="Edit SP2D"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {sp2d.status === "DRAFT" && (
                              <button
                                onClick={() => setDeleteTarget(sp2d)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-rose-600 cursor-pointer"
                                title="Hapus SP2D"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {sp2dList.length > 0 && (
              <div className="p-4 border-t border-slate-100">
                <PaginationBar
                  page={currentPage}
                  totalPages={totalPages}
                  total={sp2dList.length}
                  limit={pageSize}
                  onPageChange={setCurrentPage}
                  onLimitChange={(size: number) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: FORM PENERBITAN SP2D */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Daftar SP2D</span>
            </button>
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => handleOpenPrint(editingId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#88131A] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Format SP2D</span>
                </button>
              )}
              <span className="text-xs text-slate-500">
                {editingId ? "Mode Edit Dokumen" : "Penerbitan Baru"}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Informasi SKPD Pemohon */}
            {selectedOpd && (
              <div className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#88131A]">
                    Perangkat Daerah Pemohon (SKPD)
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#88131A] bg-white border border-red-200 px-2 py-0.5 rounded">
                      {selectedOpd.kd_skpd}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {selectedOpd.nm_skpd}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-600">
                  Tahun Anggaran: <strong className="text-slate-900">{tahunAnggaran}</strong>
                </div>
              </div>
            )}

            {/* 1. Header Informasi SP2D & Pemilihan SPM */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Informasi Dokumen SP2D
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {activeJenisSp2d?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Nomor urut running global se-Kabupaten dan relasi dengan dokumen SPM sumber.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenSpmModal}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] px-4 py-2 text-xs font-bold text-white shadow transition hover:opacity-95 cursor-pointer"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>{formHeader.no_spm ? "Ganti Dokumen SPM" : "Pilih Dokumen SPM"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor SP2D (Running Global) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formHeader.no_sp2d}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, no_sp2d: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    placeholder="00001/1.01.2.22.0.00.01.0000/SP2D/UP/2026"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal SP2D <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formHeader.tgl_sp2d}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, tgl_sp2d: e.target.value }))
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
                      setFormHeader((p) => ({ ...p, bulan: parseInt(e.target.value, 10) }))
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
                        Bulan {idx + 1} — {bln}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Dokumen Terintegrasi SPM & SPP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Dokumen SPM Sumber (SKPD)
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {formHeader.no_spm || "(Belum memilih SPM)"}
                  </div>
                  {formHeader.tgl_spm && (
                    <div className="text-[11px] text-slate-500">
                      Tanggal: {formHeader.tgl_spm}
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Dokumen SPP Asal (trhspp)
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-900">
                    {formHeader.no_spp || "(Otomatis ditarik dari SPM)"}
                  </div>
                  {formHeader.tgl_spp && (
                    <div className="text-[11px] text-slate-500">
                      Tanggal: {formHeader.tgl_spp}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Informasi Keperluan & Dasar SPD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Keperluan & Surat Penyediaan Dana (SPD)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Untuk Keperluan (Uraian SP2D) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formHeader.keperluan}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, keperluan: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    placeholder="Uraian peruntukan pencairan dana..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Nomor SPD
                    </label>
                    <input
                      type="text"
                      value={formHeader.no_spd}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, no_spd: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                      placeholder="Nomor SPD terkait..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Tanggal SPD
                    </label>
                    <input
                      type="date"
                      value={formHeader.tgl_spd}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, tgl_spd: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Rekening Penerima & Bank Pembayar (RKUD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pihak Ketiga / Bendahara Pengeluaran Penerima */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard className="h-4 w-4 text-[#88131A]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Penerima / Bendahara (Kredit)
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">
                      Nama Penerima / Bendahara
                    </label>
                    <input
                      type="text"
                      value={formHeader.nama_penerima}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, nama_penerima: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">
                        Nama Bank Penerima
                      </label>
                      <input
                        type="text"
                        value={formHeader.bank_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, bank_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600">
                        No. Rekening Penerima
                      </label>
                      <input
                        type="text"
                        value={formHeader.rek_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, rek_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">
                      NPWP Penerima
                    </label>
                    <input
                      type="text"
                      value={formHeader.npwp_penerima}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, npwp_penerima: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Pembayar / RKUD (Debit) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Wallet className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Bank Pembayar / Rekening Kas Umum Daerah (RKUD)
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">
                      Bank Pembayar
                    </label>
                    <input
                      type="text"
                      value={formHeader.nama_bank_pembayar}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, nama_bank_pembayar: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">
                      No. Rekening Pembayar (RKUD)
                    </label>
                    <input
                      type="text"
                      value={formHeader.rek_bank_pembayar}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, rek_bank_pembayar: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600">
                      Bendahara Umum Daerah/Kuasa <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formHeader.kuasaBudNama}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selectedPejabat = pejabatBudList.find(
                          (p) => p.nama === val
                        );
                        if (selectedPejabat) {
                          setFormHeader((p) => ({
                            ...p,
                            kuasaBudNama: selectedPejabat.nama,
                            kuasaBudNip: selectedPejabat.nip,
                            kuasaBudJabatan:
                              selectedPejabat.jabatan ||
                              "Kuasa Bendahara Umum Daerah",
                          }));
                        } else {
                          setFormHeader((p) => ({ ...p, kuasaBudNama: val }));
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm focus:border-[#5E0E14] focus:outline-none"
                    >
                      <option value="">-- Pilih Pejabat --</option>
                      {pejabatBudList.map((p) => (
                        <option key={p.id} value={p.nama}>
                          {p.nama}
                        </option>
                      ))}
                      {/* Opsi fallback jika nama yang tersimpan sebelumnya belum ada di list */}
                      {formHeader.kuasaBudNama &&
                        !pejabatBudList.some(
                          (p) => p.nama === formHeader.kuasaBudNama
                        ) && (
                          <option value={formHeader.kuasaBudNama}>
                            {formHeader.kuasaBudNama}{" "}
                            {formHeader.kuasaBudNip
                              ? `(NIP: ${formHeader.kuasaBudNip})`
                              : ""}
                          </option>
                        )}
                    </select>

                    {formHeader.kuasaBudNip && (
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60 font-mono">
                        <span>
                          NIP:{" "}
                          <strong className="text-slate-700">
                            {formHeader.kuasaBudNip}
                          </strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formHeader.kuasaBudJabatan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Rincian Pembebanan Rekening Belanja (Ditarik dari SPP/trdspp) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pembebanan pada Kode Rekening Belanja
                  </h3>
                  <p className="text-xs text-slate-500">
                    Otomatis terhubung dengan rincian rekening belanja dari dokumen SPP asal.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {formRincianBelanja.length} Rekening
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Kode Sub Kegiatan & Rekening Belanja</th>
                      <th className="px-4 py-2.5">Uraian Akun Belanja</th>
                      <th className="px-4 py-2.5 text-right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formRincianBelanja.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Belum ada data rincian belanja. Pilih dokumen SPM terlebih dahulu.
                        </td>
                      </tr>
                    ) : (
                      formRincianBelanja.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#88131A] font-medium">
                            <div>{item.kd_sub_kegiatan}</div>
                            <div className="text-slate-800 font-bold">{item.kd_rek6}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-800">
                            <div className="text-[11px] text-slate-400">
                              {item.nm_sub_kegiatan}
                            </div>
                            <div className="font-medium">{item.nm_rek6}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {formRincianBelanja.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-xs">
                          Jumlah Permintaan Pembayaran (Bruto):
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-blue-700">
                          {formatRupiah(totalBruto)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 5. Rincian Potongan Pajak & Potongan Lainnya (trspmpot) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Potongan-Potongan Pajak & Jaminan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Potongan resmi yang diinput pada dokumen SPM (PPh 21/22/23, PPN, IWP, dll beserta ID Billing).
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {formPotongan.length} Potongan
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Kode Rekening</th>
                      <th className="px-4 py-2.5">Uraian Potongan</th>
                      <th className="px-4 py-2.5">ID Billing Pajak</th>
                      <th className="px-4 py-2.5 text-right">Nilai Potongan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formPotongan.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Tidak ada potongan pajak pada SPM ini.
                        </td>
                      </tr>
                    ) : (
                      formPotongan.map((pot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-700">
                            {pot.kd_rek6}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {pot.nm_rek6}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-amber-800 font-bold">
                            {pot.id_billing || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">
                            {formatRupiah(pot.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {formPotongan.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-xs">
                          Jumlah Potongan:
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-amber-700">
                          {formatRupiah(totalPotongan)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 6. Ringkasan Nilai SP2D & Terbilang */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Ringkasan Nilai SP2D
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Jumlah Bruto (Diminta)
                  </span>
                  <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                    {formatRupiah(totalBruto)}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <span className="text-[11px] font-semibold text-amber-800">
                    Jumlah Potongan Pajak
                  </span>
                  <div className="mt-1 font-mono text-lg font-bold text-amber-700">
                    {formatRupiah(totalPotongan)}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    Jumlah Bersih yang Dicairkan (Netto)
                  </span>
                  <div className="mt-1 font-mono text-xl font-black text-emerald-700">
                    {formatRupiah(totalNetto)}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-[11px] font-bold uppercase text-slate-400">
                  Uang Sejumlah (Terbilang):
                </span>
                <p className="mt-1 text-xs font-bold italic text-slate-800">
                  &ldquo;{totalNetto > 0 ? terbilang(totalNetto) : "Nol"} Rupiah&rdquo;
                </p>
              </div>
            </div>

            {/* Tombol Simpan & Navigasi */}
            <div className="flex items-center justify-between pt-4 pb-12">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm"
              >
                Kembali ke Daftar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveSp2d("DRAFT")}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan DRAFT"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveSp2d("DISETUJUI")}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{saving ? "Menyimpan..." : "Terbitkan SP2D"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PILIH DOKUMEN SPM YANG DIAJUKAN OLEH SELURUH OPD */}
      {/* ========================================================================= */}
      {showSpmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Landmark className="w-3 h-3" />
                  Dokumen SPM dari Seluruh Perangkat Daerah (OPD)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Pilih Dokumen SPM yang Diajukan OPD
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan seluruh SPM yang telah dibuat dan diajukan oleh OPD
                  (status: DIAJUKAN) yang belum diterbitkan SP2D.
                </p>
              </div>
              <button
                onClick={() => setShowSpmModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Search Bar di Modal */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchSpmModal}
                  onChange={(e) => setSearchSpmModal(e.target.value)}
                  placeholder="Cari nomor SPM, nama SKPD, keperluan, penerima..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
                />
              </div>

              {/* Filter OPD Dropdown */}
              <select
                value={filterSpmModalOpd}
                onChange={(e) => setFilterSpmModalOpd(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
              >
                <option value="ALL">Semua Perangkat Daerah (SKPD)</option>
                {opdList.map((opd) => (
                  <option key={opd.id} value={opd.kd_skpd}>
                    {opd.kd_skpd} - {opd.singkatan || opd.nm_skpd}
                  </option>
                ))}
              </select>

              {/* Filter Jenis SPM */}
              <select
                value={filterSpmModalJenis}
                onChange={(e) => setFilterSpmModalJenis(e.target.value)}
                className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#5E0E14] focus:outline-none"
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
            </div>

            {/* List SPM */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingSpmModal ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                  <p className="mt-2 text-xs">
                    Memuat daftar dokumen SPM yang diajukan OPD...
                  </p>
                </div>
              ) : filteredSpmList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Tidak ditemukan dokumen SPM yang berstatus diajukan atau siap diterbitkan SP2D.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pastikan OPD telah menyelesaikan dan mengajukan dokumen SPM melalui modul SPM.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSpmList.map((spm) => (
                    <div
                      key={spm.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-[#5E0E14] hover:shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1.5 flex-1">
                        {/* Identitas OPD & Status Dokumen */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-[#88131A] bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            {spm.kd_skpd}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {spm.nm_skpd}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${spm.status === "DIAJUKAN"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : spm.status === "DISETUJUI"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                          >
                            {spm.status}
                          </span>
                        </div>

                        {/* Nomor SPM, Jenis, Tanggal */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {spm.no_spm}
                          </span>
                          <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-[#88131A]">
                            {spm.jenis_spm?.replace(/_/g, " ")}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Tgl SPM: {spm.tgl_spm}
                          </span>
                        </div>

                        {/* Keperluan */}
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {spm.keperluan}
                        </p>

                        {/* Meta: Penerima & Rincian */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          {spm.no_spp && (
                            <span>
                              SPP: <strong>{spm.no_spp}</strong>
                            </span>
                          )}
                          {spm.nama_penerima && (
                            <span>
                              Penerima: <strong>{spm.nama_penerima}</strong>
                            </span>
                          )}
                          <span>
                            Rincian Akun:{" "}
                            <strong>
                              {spm.rincianBelanja?.length || 0} akun belanja
                            </strong>
                          </span>
                          {spm.potongan?.length > 0 && (
                            <span className="text-amber-700 font-semibold">
                              {spm.potongan.length} potongan pajak
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nilai & Tombol Pilih */}
                      <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 sm:pl-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400">
                            Total Bruto:
                          </span>
                          <div className="text-sm font-bold text-blue-700 font-mono">
                            {formatRupiah(spm.nilai)}
                          </div>
                          {spm.nilai_potongan > 0 && (
                            <div className="text-[11px] text-amber-700 font-mono">
                              Pot: {formatRupiah(spm.nilai_potongan)}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectSpm(spm)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E0E14] px-4 py-2 text-xs font-bold text-white hover:bg-[#88131A] shadow cursor-pointer transition"
                        >
                          <Check className="h-4 w-4" />
                          <span>Pilih SPM Ini</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Format SP2D */}
      {printData && (
        <Sp2dPrintModal data={printData} onClose={() => setPrintData(null)} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Hapus Dokumen SP2D"
        itemCode={deleteTarget?.no_sp2d}
        description={`Apakah Anda yakin ingin menghapus dokumen ${deleteTarget?.no_sp2d}? Status SPM terkait akan dikembalikan ke DIAJUKAN.`}
        loading={deleting}
        onConfirm={confirmDeleteSp2d}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
