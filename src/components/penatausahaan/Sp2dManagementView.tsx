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
  no_transaksi_bank?: string | null;
  keterangan?: string | null;
}

export default function Sp2dManagementView() {
  // Navigation Steps: 1: Pilih OPD -> 2: Daftar SP2D -> 3: Form SP2D
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Scope & Authorization
  const [loadingScope, setLoadingScope] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [selectedOpd, setSelectedOpd] = useState<OpdItem | null>(null);
  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [searchOpd, setSearchOpd] = useState("");

  // Daftar SP2D (Step 2)
  const [sp2dList, setSp2dList] = useState<Sp2dItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchSp2d, setSearchSp2d] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterJenis, setFilterJenis] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form SP2D (Step 3)
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
    kuasaBudNama: "MARA TUA SIREGAR, S.Sos",
    kuasaBudNip: "197205101993031002",
    kuasaBudJabatan: "Kuasa Bendahara Umum Daerah (BUD)",
    status: "DRAFT",
    keterangan: "",
  });
  const [formRincianBelanja, setFormRincianBelanja] = useState<any[]>([]);
  const [formPotongan, setFormPotongan] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Modal Pilih SPM Terbit
  const [showSpmModal, setShowSpmModal] = useState(false);
  const [loadingSpmModal, setLoadingSpmModal] = useState(false);
  const [spmTerbitList, setSpmTerbitList] = useState<any[]>([]);
  const [searchSpmModal, setSearchSpmModal] = useState("");

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

  // 2. Load Daftar SP2D saat Step 2 aktif
  useEffect(() => {
    if (currentStep === 2 && selectedOpd) {
      loadSp2dList();
    }
  }, [currentStep, selectedOpd, filterStatus, filterJenis]);

  async function loadSp2dList() {
    if (!selectedOpd) return;
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
      });
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

  // 3. Generate Nomor SP2D Running Global
  async function fetchNextSp2dNumber(jenis: string = "UP") {
    try {
      const res = await fetch(
        `/api/penatausahaan/sp2d/referensi?type=next-no&tahun=${tahunAnggaran}&jenisSp2d=${jenis}`
      );
      const json = await res.json();
      return json?.data?.generatedNo || `900/00001/SP2D/${jenis}/${tahunAnggaran}`;
    } catch {
      return `900/00001/SP2D/${jenis}/${tahunAnggaran}`;
    }
  }

  // 4. Pilih OPD -> Lanjut ke Step 2
  function handleSelectOpd(opd: OpdItem) {
    setSelectedOpd(opd);
    setCurrentStep(2);
  }

  // 5. Buat SP2D Baru
  async function handleCreateNewSp2d() {
    if (!selectedOpd) return;

    const nextNo = await fetchNextSp2dNumber("UP");
    setEditingId(null);
    setActiveJenisSp2d("UP");
    setFormHeader({
      no_sp2d: nextNo,
      tgl_sp2d: new Date().toISOString().split("T")[0],
      spmId: "",
      no_spm: "",
      tgl_spm: "",
      sppId: "",
      no_spp: "",
      tgl_spp: "",
      bulan: new Date().getMonth() + 1,
      keperluan: `Penerbitan SP2D ${selectedOpd.nm_skpd} Tahun ${tahunAnggaran}`,
      no_spd: "",
      tgl_spd: "",
      nama_penerima: "",
      bank_penerima: "",
      rek_penerima: "",
      npwp_penerima: "",
      nama_bank_pembayar: "PT. Bank Sumut (RKUD Tapanuli Selatan)",
      rek_bank_pembayar: "23301020000129",
      kuasaBudNama: "MARA TUA SIREGAR, S.Sos",
      kuasaBudNip: "197205101993031002",
      kuasaBudJabatan: "Kuasa Bendahara Umum Daerah (BUD)",
      status: "DRAFT",
      keterangan: "",
    });
    setFormRincianBelanja([]);
    setFormPotongan([]);

    setCurrentStep(3);
    handleOpenSpmModal();
  }

  // 6. Buka Modal Pilih SPM Terbit
  async function handleOpenSpmModal() {
    if (!selectedOpd) return;
    setShowSpmModal(true);
    setLoadingSpmModal(true);
    try {
      const params = new URLSearchParams({
        tahun: tahunAnggaran.toString(),
        kd_skpd: selectedOpd.kd_skpd,
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
        message: "Koneksi bermasalah saat memuat daftar SPM terbit.",
      });
    } finally {
      setLoadingSpmModal(false);
    }
  }

  // 7. Pilih Dokumen SPM Asal
  async function handleSelectSpm(spm: any) {
    const derivedJenis = (spm.jenis_spm || "UP").toUpperCase().replace(/-/g, "_");
    setActiveJenisSp2d(derivedJenis);

    // Ambil nomor SP2D running sesuai jenis dokumen yang dipilih
    const generatedNo = await fetchNextSp2dNumber(derivedJenis);

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
      spmId: spm.id,
      no_spm: spm.no_spm,
      tgl_spm: spm.tgl_spm,
      sppId: spm.sppId || "",
      no_spp: spm.no_spp || "",
      tgl_spp: spm.tgl_spp || "",
      keperluan: kep,
      no_spd: spm.no_spd || prev.no_spd,
      tgl_spd: spm.tgl_spd || prev.tgl_spd,
      nama_penerima: spm.nama_penerima || prev.nama_penerima,
      bank_penerima: spm.bank_penerima || prev.bank_penerima,
      rek_penerima: spm.rek_penerima || prev.rek_penerima,
      npwp_penerima: spm.npwp_penerima || prev.npwp_penerima,
    }));

    setFormRincianBelanja(spm.rincianBelanja || []);
    setFormPotongan(spm.potongan || []);
    setShowSpmModal(false);

    setBanner({
      type: "success",
      title: "Data SPM Berhasil Ditarik",
      message: `Berhasil menarik dokumen ${spm.no_spm} dengan nilai bruto ${formatRupiah(
        spm.nilai
      )}. Rincian rekening belanja dari SPP dan potongan pajak siap diterbitkan SP2D.`,
    });
  }

  // 8. Edit / Buka Detail SP2D
  async function handleEditSp2d(item: Sp2dItem) {
    setEditingId(item.id);
    setActiveJenisSp2d(item.jenis_sp2d);
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
          nama_bank_pembayar: d.nama_bank_pembayar || "PT. Bank Sumut (RKUD Tapanuli Selatan)",
          rek_bank_pembayar: d.rek_bank_pembayar || "23301020000129",
          kuasaBudNama: d.kuasaBudNama || "MARA TUA SIREGAR, S.Sos",
          kuasaBudNip: d.kuasaBudNip || "197205101993031002",
          kuasaBudJabatan: d.kuasaBudJabatan || "Kuasa Bendahara Umum Daerah (BUD)",
          status: d.status || "DRAFT",
          keterangan: d.keterangan || "",
        });
        setFormRincianBelanja(d.rincianBelanja || []);
        setFormPotongan(d.potongan || []);
        setCurrentStep(3);
      }
    } catch {
      setBanner({
        type: "error",
        message: "Gagal memuat rincian data SP2D.",
      });
    }
  }

  // 9. Simpan SP2D
  async function handleSaveSp2d(targetStatus: "DRAFT" | "DISETUJUI") {
    if (!selectedOpd) return;

    if (!formHeader.no_sp2d.trim()) {
      setBanner({ type: "error", message: "Nomor SP2D wajib diisi." });
      return;
    }
    if (!formHeader.no_spm.trim()) {
      setBanner({
        type: "error",
        message: "Dokumen SPM belum dipilih. Silakan klik tombol 'Pilih Dokumen SPM'.",
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
        bulan: Number(formHeader.bulan) || 1,
        keperluan: formHeader.keperluan.trim(),
        nilai: totalBruto,
        nilai_potongan: totalPotongan,
        nilai_bersih: totalNetto,
        no_spd: formHeader.no_spd.trim() || null,
        tgl_spd: formHeader.tgl_spd || null,
        nama_penerima: formHeader.nama_penerima || null,
        bank_penerima: formHeader.bank_penerima || null,
        rek_penerima: formHeader.rek_penerima || null,
        npwp_penerima: formHeader.npwp_penerima || null,
        nama_bank_pembayar: formHeader.nama_bank_pembayar || null,
        rek_bank_pembayar: formHeader.rek_bank_pembayar || null,
        kuasaBudNama: formHeader.kuasaBudNama || null,
        kuasaBudNip: formHeader.kuasaBudNip || null,
        kuasaBudJabatan: formHeader.kuasaBudJabatan || null,
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
          title: "Berhasil",
          message: `Dokumen SP2D ${formHeader.no_sp2d} berhasil disimpan dengan status ${targetStatus}.`,
        });
        setCurrentStep(2);
        loadSp2dList();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menyimpan SP2D",
          message: json.error || "Gagal menyimpan dokumen SP2D ke basis data.",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Terjadi kesalahan koneksi saat menyimpan SP2D.",
      });
    } finally {
      setSaving(false);
    }
  }

  // 10. Hapus Dokumen SP2D
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
          message: `Dokumen ${deleteTarget.no_sp2d} berhasil dihapus.`,
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

  // 11. Buka Modal Cetak
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

  // Filter OPD
  const filteredOpds = useMemo(() => {
    if (!searchOpd.trim()) return opdList;
    const q = searchOpd.toLowerCase();
    return opdList.filter(
      (o) =>
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q) ||
        (o.singkatan || "").toLowerCase().includes(q)
    );
  }, [opdList, searchOpd]);

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
          <p className="text-xs text-slate-500 font-medium">Memuat profil akses SP2D...</p>
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
            Modul Surat Perintah Pencairan Dana (SP2D) adalah wewenang tingkat daerah
            yang hanya dapat diakses oleh peran <strong>Bendahara Umum Daerah (BUD)</strong>,{" "}
            <strong>Bidang Perbendaharaan</strong>, dan <strong>Superadmin</strong>.
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
      {/* STEP 1: PILIH OPD */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="mx-auto max-w-6xl space-y-6">
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
                  Pilih Perangkat Daerah (SKPD) untuk menerbitkan dokumen pencairan dana SP2D atas SPM yang telah disetujui.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchOpd}
                  onChange={(e) => setSearchOpd(e.target.value)}
                  placeholder="Cari kode atau nama SKPD..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {filteredOpds.map((opd) => (
                <div
                  key={opd.id}
                  onClick={() => handleSelectOpd(opd)}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-[#5E0E14] hover:shadow-md cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#88131A] bg-red-50 border border-red-200/60 px-2 py-0.5 rounded">
                        {opd.kd_skpd}
                      </span>
                      {opd.singkatan && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {opd.singkatan}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#5E0E14] transition-colors line-clamp-2">
                      {opd.nm_skpd}
                    </h3>
                    {opd.kepalaNama && (
                      <p className="text-[11px] text-slate-500">
                        Kepala: <span className="font-medium text-slate-700">{opd.kepalaNama}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#88131A]">
                    <span>Kelola SP2D SKPD</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: DAFTAR DOKUMEN SP2D */}
      {/* ========================================================================= */}
      {currentStep === 2 && selectedOpd && (
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ganti SKPD</span>
            </button>

            <button
              onClick={handleCreateNewSp2d}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan SP2D Baru</span>
            </button>
          </div>

          {/* Info Card SKPD Terpilih */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[#88131A]">
                  {selectedOpd.kd_skpd}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedOpd.nm_skpd}
                </h2>
              </div>
              <div className="text-right text-xs text-slate-500">
                Tahun Anggaran: <strong className="text-slate-800">{tahunAnggaran}</strong>
              </div>
            </div>

            {/* Statistik Ringkas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-medium text-slate-500">Total SP2D Terbit</div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {sp2dList.length} <span className="text-xs font-semibold text-slate-400">Berkas</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200/60">
                <div className="text-[11px] font-medium text-blue-800">Total Bruto</div>
                <div className="text-lg font-black text-blue-900 mt-1">
                  {formatRupiah(sp2dList.reduce((acc, curr) => acc + curr.nilai, 0))}
                </div>
              </div>

              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                <div className="text-[11px] font-medium text-amber-800">Total Potongan</div>
                <div className="text-lg font-black text-amber-900 mt-1">
                  {formatRupiah(sp2dList.reduce((acc, curr) => acc + curr.nilai_potongan, 0))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
                <div className="text-[11px] font-medium text-emerald-800">Total Cair (Netto)</div>
                <div className="text-lg font-black text-emerald-900 mt-1">
                  {formatRupiah(sp2dList.reduce((acc, curr) => acc + curr.nilai_bersih, 0))}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchSp2d}
                onChange={(e) => setSearchSp2d(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSp2dList()}
                placeholder="Cari no SP2D, SPM, penerima..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
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
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                        <p className="mt-2 text-xs">Memuat daftar SP2D...</p>
                      </td>
                    </tr>
                  ) : paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-medium text-slate-500">
                          Belum ada dokumen SP2D untuk SKPD ini.
                        </p>
                        <button
                          onClick={handleCreateNewSp2d}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#5E0E14] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#88131A] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Terbitkan SP2D Pertama</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((sp2d) => (
                      <tr key={sp2d.id} className="transition hover:bg-slate-50/75">
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

                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold text-rose-800">
                            {sp2d.no_spm}
                          </span>
                          {sp2d.tgl_spm && (
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {sp2d.tgl_spm}
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
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sp2d.status === "CAIR"
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
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                title="Hapus Dokumen"
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

            {sp2dList.length > 0 && (
              <div className="border-t border-slate-200">
                <PaginationBar
                  page={currentPage}
                  totalPages={totalPages}
                  total={sp2dList.length}
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
      {/* STEP 3: FORM PENERBITAN SP2D */}
      {/* ========================================================================= */}
      {currentStep === 3 && selectedOpd && (
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
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
                    placeholder="900/00001/SP2D/UP/2026"
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
                      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
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

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Uraian / Keperluan Pembayaran SP2D <span className="text-rose-500">*</span>
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
            </div>

            {/* 2. Informasi Penerima & Rekening Pembayar Bank Kas Daerah */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Informasi Rekening Bank & Penerima
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#88131A] uppercase tracking-wide">
                    Rekening Kas Umum Daerah (Penyalur/Pembayar)
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">
                      Bank Pembayar RKUD
                    </label>
                    <input
                      type="text"
                      value={formHeader.nama_bank_pembayar}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, nama_bank_pembayar: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600">
                      No. Rekening Kas Daerah
                    </label>
                    <input
                      type="text"
                      value={formHeader.rek_bank_pembayar}
                      onChange={(e) =>
                        setFormHeader((p) => ({ ...p, rek_bank_pembayar: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Rekening Penerima Dana
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">
                        Nama Penerima
                      </label>
                      <input
                        type="text"
                        value={formHeader.nama_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, nama_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">
                        Bank Penerima
                      </label>
                      <input
                        type="text"
                        value={formHeader.bank_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, bank_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">
                        No. Rekening
                      </label>
                      <input
                        type="text"
                        value={formHeader.rek_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, rek_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">
                        NPWP
                      </label>
                      <input
                        type="text"
                        value={formHeader.npwp_penerima}
                        onChange={(e) =>
                          setFormHeader((p) => ({ ...p, npwp_penerima: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Detail Rincian Belanja (Terintegrasi dari trdspp) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pembebanan Belanja pada Kode Rekening
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rincian akun belanja ditarik otomatis dari tabel trdspp melalui relasi nomor SPP dan SPM.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Total Belanja:</span>
                  <div className="text-sm font-bold text-blue-700">
                    {formatRupiah(totalBruto)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Sub Kegiatan & Uraian</th>
                      <th className="px-3 py-2.5">Kode Rekening</th>
                      <th className="px-3 py-2.5">Nama Rekening Belanja</th>
                      <th className="px-3 py-2.5 text-right">Nilai Belanja (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formRincianBelanja.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center italic text-slate-400">
                          Belum ada rincian belanja. Silakan pilih dokumen SPM terlebih dahulu.
                        </td>
                      </tr>
                    ) : (
                      formRincianBelanja.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-800">
                              {item.kd_sub_kegiatan}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              {item.nm_sub_kegiatan}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono font-medium text-slate-700">
                            {item.kd_rek6}
                          </td>
                          <td className="px-3 py-2 text-slate-800">{item.nm_rek6}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Potongan Pajak & Potongan Lainnya (Terintegrasi dari trspmpot) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Potongan Pajak & Potongan Lainnya
                  </h3>
                  <p className="text-xs text-slate-500">
                    Potongan pajak dan ID Billing terintegrasi dari dokumen SPM sumber (trspmpot).
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Total Potongan:</span>
                  <div className="text-sm font-bold text-amber-700">
                    {formatRupiah(totalPotongan)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Rekening Potongan</th>
                      <th className="px-3 py-2.5">ID Billing / NTPN</th>
                      <th className="px-3 py-2.5">Uraian / Keterangan</th>
                      <th className="px-3 py-2.5 text-right">Nilai Potongan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formPotongan.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center italic text-slate-400">
                          Nihil Potongan Pajak.
                        </td>
                      </tr>
                    ) : (
                      formPotongan.map((pot, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-slate-700">{pot.kd_rek6}</span>
                            <div className="text-[11px] font-semibold text-slate-800">
                              {pot.nm_rek6}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs font-bold text-blue-800">
                            {pot.id_billing || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{pot.keterangan || "-"}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">
                            {formatRupiah(pot.nilai)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Ringkasan Nilai SP2D (Bruto, Potongan, Netto) */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-md">
              <h3 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">
                Ringkasan Nilai Surat Perintah Pencairan Dana (SP2D)
              </h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-700 pb-5">
                <div>
                  <span className="text-xs text-slate-400">1. Nilai Belanja (Bruto)</span>
                  <div className="text-xl font-bold font-mono text-blue-300 mt-0.5">
                    {formatRupiah(totalBruto)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">2. Total Potongan Pajak</span>
                  <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                    {formatRupiah(totalPotongan)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-emerald-400 font-semibold">
                    3. Nilai Bersih Yang Dicairkan (Netto)
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-300 mt-0.5">
                    {formatRupiah(totalNetto)}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs italic text-slate-300">
                Terbilang: {totalNetto > 0 ? `${terbilang(totalNetto)} Rupiah` : "Nol Rupiah"}
              </div>
            </div>

            {/* 6. Penandatangan Kuasa BUD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Penandatangan Kuasa Bendahara Umum Daerah (BUD)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Nama Kuasa BUD</label>
                  <input
                    type="text"
                    value={formHeader.kuasaBudNama}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, kuasaBudNama: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">NIP Kuasa BUD</label>
                  <input
                    type="text"
                    value={formHeader.kuasaBudNip}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, kuasaBudNip: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Jabatan</label>
                  <input
                    type="text"
                    value={formHeader.kuasaBudJabatan}
                    onChange={(e) =>
                      setFormHeader((p) => ({ ...p, kuasaBudJabatan: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
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
      {/* MODAL PILIH DOKUMEN SPM TERBIT */}
      {/* ========================================================================= */}
      {showSpmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pilih Dokumen SPM yang Diterbitkan SKPD
                </h3>
                <p className="text-xs text-slate-500">
                  Hanya menampilkan dokumen SPM yang telah disetujui dan belum diterbitkan SP2D.
                </p>
              </div>
              <button
                onClick={() => setShowSpmModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchSpmModal}
                  onChange={(e) => setSearchSpmModal(e.target.value)}
                  placeholder="Cari nomor SPM, keperluan, penerima..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs shadow-sm focus:border-[#5E0E14] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingSpmModal ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#5E0E14] border-t-transparent" />
                  <p className="mt-2 text-xs">Memuat dokumen SPM...</p>
                </div>
              ) : spmTerbitList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-600">
                    Tidak ditemukan dokumen SPM yang siap diterbitkan SP2D pada SKPD ini.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pastikan SKPD telah menyelesaikan dan menyetujui dokumen SPM terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {spmTerbitList
                    .filter((spm) => {
                      const q = searchSpmModal.toLowerCase();
                      return (
                        spm.no_spm.toLowerCase().includes(q) ||
                        (spm.keperluan || "").toLowerCase().includes(q) ||
                        (spm.nama_penerima || "").toLowerCase().includes(q)
                      );
                    })
                    .map((spm) => (
                      <div
                        key={spm.id}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-[#5E0E14] hover:shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {spm.no_spm}
                            </span>
                            <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-[#88131A]">
                              {spm.jenis_spm?.replace(/_/g, " ")}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {spm.tgl_spm}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-slate-600">
                            {spm.keperluan}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {spm.no_spp && (
                              <span>SPP: <strong>{spm.no_spp}</strong></span>
                            )}
                            {spm.nama_penerima && (
                              <span>Penerima: <strong>{spm.nama_penerima}</strong></span>
                            )}
                            <span>Rincian: <strong>{spm.rincianBelanja?.length || 0} akun</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400">Total Bruto:</span>
                            <div className="text-sm font-bold text-blue-700 font-mono">
                              {formatRupiah(spm.nilai)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectSpm(spm)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5E0E14] px-4 py-2 text-xs font-bold text-white hover:bg-[#88131A] shadow cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Pilih SPM</span>
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
        description={`Apakah Anda yakin ingin menghapus dokumen ${deleteTarget?.no_sp2d}? Status SPM terkait akan dikembalikan.`}
        loading={deleting}
        onConfirm={confirmDeleteSp2d}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
