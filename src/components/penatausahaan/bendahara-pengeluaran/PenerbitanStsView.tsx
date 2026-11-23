"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
  ScopeData,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import StsPrintModal from "./StsPrintModal";
import {
  Banknote,
  Plus,
  RefreshCw,
  Trash2,
  X,
  AlertCircle,
  ArrowDownLeft,
  Calendar,
  Search,
  Pencil,
  CheckCircle2,
  Printer,
  ShieldCheck,
  Lock,
  RotateCcw,
  Send,
  Undo2,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type JenisPengembalian = "SISA_KAS" | "BELANJA" | "LAINNYA";

interface RekOption {
  kd_rek6: string;
  nm_rek6: string;
}

interface SubKegiatanOption {
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
}

interface BelanjaOption {
  kd_sub_kegiatan: string | null;
  nm_sub_kegiatan: string | null;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
}

const JENIS_LABEL: Record<JenisPengembalian, string> = {
  SISA_KAS: "Sisa Kas",
  BELANJA: "Belanja",
  LAINNYA: "Lainnya (Pendapatan)",
};

export default function PenerbitanStsView() {
  return (
    <BendaharaStepperWrapper
      title="Penerbitan STS"
      subtitle="Penerbitan Surat Tanda Setor (STS) Pengembalian Sisa Kas, Belanja, dan Pendapatan Lainnya"
      step3Label="Daftar Penerbitan STS"
    >
      {({ selectedOpd, selectedUnit, scopeData }) => (
        <PenerbitanStsContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          scopeData={scopeData}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenerbitanStsContent({
  selectedOpd,
  selectedUnit,
  scopeData,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  scopeData: ScopeData | null;
}) {
  const isSuperadmin =
    scopeData?.session?.roleKode === "0" ||
    scopeData?.session?.roleKode === "SUPERADMIN";
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Options from API
  const [nextSeq, setNextSeq] = useState<number>(1);
  const [kasBendaharaRek, setKasBendaharaRek] = useState<RekOption[]>([]);
  const [pendapatanLainnyaRek, setPendapatanLainnyaRek] = useState<RekOption[]>([]);
  const [subKegiatanOptions, setSubKegiatanOptions] = useState<SubKegiatanOption[]>([]);
  const [belanjaOptions, setBelanjaOptions] = useState<BelanjaOption[]>([]);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jenisPengembalian, setJenisPengembalian] =
    useState<JenisPengembalian>("SISA_KAS");
  const [noSts, setNoSts] = useState("");
  const [tglSts, setTglSts] = useState(new Date().toISOString().split("T")[0]);
  const [kdSubKegiatan, setKdSubKegiatan] = useState("");
  const [nmSubKegiatan, setNmSubKegiatan] = useState("");
  const [kdRek6, setKdRek6] = useState("");
  const [nmRek6, setNmRek6] = useState("");
  const [uraian, setUraian] = useState("");
  const [nilai, setNilai] = useState<number>(0);
  const [namaPenyetor, setNamaPenyetor] = useState("");
  const [alamatPenyetor, setAlamatPenyetor] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [simpatdaError, setSimpatdaError] = useState<string | null>(null);
  const [sendingSimpatdaId, setSendingSimpatdaId] = useState<string | null>(null);

  // Delete Dialog & Print Modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [printItem, setPrintItem] = useState<any | null>(null);

  // Superadmin Update Status Pembayaran Dialog
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [kdCabang, setKdCabang] = useState("");
  const [kdPengesahan, setKdPengesahan] = useState("");
  const [tglBayar, setTglBayar] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nmChannel, setNmChannel] = useState("");
  const [kdTerminal, setKdTerminal] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Superadmin Cancel Pembayaran Dialog
  const [cancelPaymentTarget, setCancelPaymentTarget] = useState<any | null>(null);
  const [cancelingPayment, setCancelingPayment] = useState(false);
  const [cancelPaymentError, setCancelPaymentError] = useState<string | null>(null);

  const handleConfirmCancelPayment = async () => {
    if (!cancelPaymentTarget) return;
    setCancelingPayment(true);
    setCancelPaymentError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: cancelPaymentTarget.id,
            action: "cancel",
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Pembayaran STS ${cancelPaymentTarget.no_sts || cancelPaymentTarget.no_tetap
          } berhasil dibatalkan`
        );
        setCancelPaymentTarget(null);
        await fetchData();
      } else {
        setCancelPaymentError(json.error || "Gagal membatalkan pembayaran STS.");
      }
    } catch {
      setCancelPaymentError("Terjadi kesalahan jaringan saat membatalkan pembayaran.");
    } finally {
      setCancelingPayment(false);
    }
  };

  const handleKirimSimpatda = async (item: any) => {
    setSendingSimpatdaId(item.id);
    setSuccessMsg(null);
    setSimpatdaError(null);
    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts/kirim-simpatda",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Data STS ${item.no_sts || item.no_tetap} berhasil dikirim ke pembayaran.`
        );
        await fetchData();
      } else {
        setSimpatdaError(
          json.error || "Gagal mengirim data STS ke pembayaran."
        );
        if (res.status === 409) {
          await fetchData();
        }
      }
    } catch {
      setSimpatdaError(
        "Terjadi kesalahan jaringan saat mengirim data ke pembayaran."
      );
    } finally {
      setSendingSimpatdaId(null);
    }
  };

  const handleBatalKirimSimpatda = async (item: any) => {
    setSendingSimpatdaId(item.id);
    setSuccessMsg(null);
    setSimpatdaError(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts/kirim-simpatda?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Pengiriman data STS ${item.no_sts || item.no_tetap} berhasil dibatalkan.`
        );
        await fetchData();
      } else {
        setSimpatdaError(
          json.error ||
          "Gagal membatalkan pengiriman data STS ke database dbsimpatda."
        );
      }
    } catch {
      setSimpatdaError(
        "Terjadi kesalahan jaringan saat membatalkan pengiriman data ke dbsimpatda."
      );
    } finally {
      setSendingSimpatdaId(null);
    }
  };

  const handleOpenPaymentDialog = (item: any) => {
    setPaymentTarget(item);
    setKdCabang(item.kd_cabang || "");
    setKdPengesahan(item.kd_pengesahan || "");
    setTglBayar(
      item.tgl_bayar
        ? new Date(item.tgl_bayar).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setNmChannel(item.nm_channel || "");
    setKdTerminal(item.kd_terminal || "");
    setPaymentError(null);
  };

  const handleConfirmPaymentUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    setUpdatingPayment(true);
    setPaymentError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: paymentTarget.id,
            kd_cabang: kdCabang,
            kd_pengesahan: kdPengesahan,
            tgl_bayar: tglBayar,
            nm_channel: nmChannel,
            kd_terminal: kdTerminal,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Status pembayaran STS ${paymentTarget.no_sts || paymentTarget.no_tetap
          } berhasil diverifikasi`
        );
        setPaymentTarget(null);
        await fetchData();
      } else {
        setPaymentError(json.error || "Gagal memperbarui status pembayaran.");
      }
    } catch {
      setPaymentError("Terjadi kesalahan jaringan saat memperbarui pembayaran.");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOpd, selectedUnit]);

  const fetchOptions = useCallback(async () => {
    if (!selectedOpd) return;
    try {
      const q = new URLSearchParams({
        action: "options",
        opdId: selectedOpd.id,
      });
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setNextSeq(Number(json.data.nextSeq) || 1);
        setKasBendaharaRek(json.data.kasBendaharaRek || []);
        setPendapatanLainnyaRek(json.data.pendapatanLainnyaRek || []);
        setSubKegiatanOptions(json.data.subKegiatanOptions || []);
        setBelanjaOptions(json.data.belanjaOptions || []);
      }
    } catch (e) {
      console.error("Gagal memuat opsi Penerbitan STS:", e);
    }
  }, [selectedOpd]);

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, [fetchData, fetchOptions]);

  // Polling otomatis setiap 30 detik agar update status bayar/verifikasi dari dbsimpatda langsung tersinkron
  useEffect(() => {
    if (!selectedOpd) return;
    const timer = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(timer);
  }, [selectedOpd, fetchData]);

  useEffect(() => {
    if (!showModal || editingId) return;
    const tahun = tglSts ? tglSts.slice(0, 4) : "2026";
    const urut = String(nextSeq).padStart(5, "0");
    const rekClean = (kdRek6 || "").replace(/\./g, "").trim().slice(0, 7);
    if (rekClean) {
      setNoSts(`1296${rekClean}${tahun}7${urut}`);
    } else {
      setNoSts("");
    }
  }, [showModal, editingId, kdRek6, tglSts, nextSeq]);

  // Select options
  const kasSelectOptions: SelectOption[] = useMemo(
    () =>
      kasBendaharaRek.map((r) => ({
        value: r.kd_rek6,
        label: `${r.kd_rek6} - ${r.nm_rek6}`,
        subLabel: r.kd_rek6,
      })),
    [kasBendaharaRek]
  );

  const subKegSelectOptions: SelectOption[] = useMemo(
    () =>
      subKegiatanOptions.map((s) => ({
        value: s.kd_sub_kegiatan,
        label: `${s.kd_sub_kegiatan} - ${s.nm_sub_kegiatan}`,
        subLabel: s.kd_sub_kegiatan,
      })),
    [subKegiatanOptions]
  );

  const belanjaSelectOptions: SelectOption[] = useMemo(() => {
    const filtered = kdSubKegiatan
      ? belanjaOptions.filter((b) => b.kd_sub_kegiatan === kdSubKegiatan)
      : belanjaOptions;
    return filtered.map((b) => ({
      value: b.kd_rek6,
      label: `${b.kd_rek6} - ${b.nm_rek6}`,
      subLabel: `Anggaran: ${formatRupiah(Number(b.nilai || 0))}`,
    }));
  }, [belanjaOptions, kdSubKegiatan]);

  const pendapatanSelectOptions: SelectOption[] = useMemo(
    () =>
      pendapatanLainnyaRek.map((r) => ({
        value: r.kd_rek6,
        label: `${r.kd_rek6} - ${r.nm_rek6}`,
        subLabel: r.kd_rek6,
      })),
    [pendapatanLainnyaRek]
  );

  const applyDefaultKasRek = (list: RekOption[]) => {
    const preferred =
      list.find((r) =>
        r.nm_rek6.toLowerCase().includes("kas di bendahara pengeluaran")
      ) || list[0];
    if (preferred) {
      setKdRek6(preferred.kd_rek6);
      setNmRek6(preferred.nm_rek6);
    } else {
      setKdRek6("1.1.01.03.01.0001");
      setNmRek6("Kas di Bendahara Pengeluaran");
    }
  };

  const handleJenisChange = (jenis: JenisPengembalian) => {
    setJenisPengembalian(jenis);
    setKdSubKegiatan("");
    setNmSubKegiatan("");
    if (jenis === "SISA_KAS") {
      applyDefaultKasRek(kasBendaharaRek);
    } else {
      setKdRek6("");
      setNmRek6("");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNoSts("");
    setTglSts(new Date().toISOString().split("T")[0]);
    setJenisPengembalian("SISA_KAS");
    setKdSubKegiatan("");
    setNmSubKegiatan("");
    applyDefaultKasRek(kasBendaharaRek);
    setNilai(0);
    setUraian("");
    setNamaPenyetor("");
    setAlamatPenyetor("");
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    setNoSts(item.no_sts || "");
    setTglSts(
      item.tgl_sts
        ? new Date(item.tgl_sts).toISOString().split("T")[0]
        : item.tgl_tetap
          ? new Date(item.tgl_tetap).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
    );
    setJenisPengembalian(
      (item.jenis_pengembalian as JenisPengembalian) || "SISA_KAS"
    );
    setKdSubKegiatan(item.kd_sub_kegiatan || "");
    setNmSubKegiatan(item.nm_sub_kegiatan || "");
    setKdRek6(item.kd_rek6 || "");
    setNmRek6(item.nm_rek6 || "");
    setNilai(Number(item.nilai || 0));
    setUraian(item.uraian || "");
    setNamaPenyetor(item.nama_penyetor || "");
    setAlamatPenyetor(item.alamat_penyetor || "");
    setFormError(null);
    setShowModal(true);
  };

  // Filter & Pagination
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_tetap?.toLowerCase().includes(q) ||
          item.no_sts?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q) ||
          item.kd_rek6?.toLowerCase().includes(q) ||
          item.nm_rek6?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (startDate || endDate) {
        const itemDateStr = item.tgl_tetap
          ? new Date(item.tgl_tetap).toISOString().split("T")[0]
          : "";
        if (startDate && itemDateStr && itemDateStr < startDate) return false;
        if (endDate && itemDateStr && itemDateStr > endDate) return false;
      }

      return true;
    });
  }, [dataList, search, startDate, endDate]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (jenisPengembalian === "BELANJA" && !kdSubKegiatan) {
      setFormError("Sub Kegiatan wajib dipilih untuk pengembalian Belanja.");
      return;
    }
    if (!kdRek6) {
      setFormError("Rekening wajib dipilih.");
      return;
    }
    if (!nilai || nilai <= 0) {
      setFormError("Nilai setoran STS harus lebih dari 0.");
      return;
    }
    if (!uraian.trim()) {
      setFormError("Uraian penerbitan STS wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editingId ? { id: editingId } : {}),
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit,
            nm_unit: selectedUnit?.nm_unit,
            no_sts: noSts.trim() || undefined,
            tgl_sts: tglSts,
            jenis_pengembalian: jenisPengembalian,
            kd_sub_kegiatan:
              jenisPengembalian === "BELANJA" ? kdSubKegiatan : undefined,
            nm_sub_kegiatan:
              jenisPengembalian === "BELANJA" ? nmSubKegiatan : undefined,
            kd_rek6: kdRek6,
            nm_rek6: nmRek6,
            nama_penyetor: namaPenyetor.trim() || undefined,
            alamat_penyetor: alamatPenyetor.trim() || undefined,
            uraian: uraian.trim(),
            nilai,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setSuccessMsg(
          editingId
            ? "Data Penerbitan STS berhasil diperbarui."
            : `STS berhasil diterbitkan (${json.data?.no_sts || json.data?.no_tetap}).`
        );
        await Promise.all([fetchData(), fetchOptions()]);
      } else {
        setFormError(json.error || "Gagal menyimpan Penerbitan STS");
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/penerbitan-sts?id=${encodeURIComponent(
          deleteTarget.id
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message || "Data STS berhasil dihapus.");
        setDeleteTarget(null);
        await Promise.all([fetchData(), fetchOptions()]);
      } else {
        setDeleteError(json.error || "Gagal menghapus data STS.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {simpatdaError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{simpatdaError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSimpatdaError(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              Penerbitan STS Pengembalian
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Periode Tanggal */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Sampai Tanggal"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Reset filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. STS / Rekening / Uraian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat STS Pengembalian
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#5E0E14] text-white">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                <th className="px-3 py-3 font-semibold w-44">No. Tetap &amp; No. STS</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-36">Jenis</th>
                <th className="px-3 py-3 font-semibold">Sub Kegiatan &amp; Rekening</th>
                <th className="px-3 py-3 font-semibold">Uraian / Keterangan</th>
                <th className="px-3 py-3 font-semibold w-44">Penyetor</th>
                <th className="px-3 py-3 font-semibold w-24">Status</th>
                <th className="px-3 py-3 font-semibold text-right w-36">
                  Nilai Setoran (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data Penerbitan STS...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Banknote className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada data Penerbitan STS yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#5E0E14] font-mono">
                        {item.no_sts || item.no_tetap}
                      </div>
                      {item.no_sts && item.no_tetap !== item.no_sts && (
                        <div className="text-[10px] text-gray-500 font-mono">
                          Tetap: {item.no_tetap}
                        </div>
                      )}

                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(item.tgl_tetap).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.jenis_pengembalian === "SISA_KAS"
                          ? "bg-blue-100 text-blue-800"
                          : item.jenis_pengembalian === "BELANJA"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-teal-100 text-teal-800"
                          }`}
                      >
                        {JENIS_LABEL[item.jenis_pengembalian as JenisPengembalian] ||
                          item.jenis_pengembalian}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      {item.kd_sub_kegiatan && (
                        <div className="text-[11px] font-mono text-teal-700 font-semibold">
                          {item.kd_sub_kegiatan}
                        </div>
                      )}
                      {item.nm_sub_kegiatan && (
                        <div className="text-[11px] text-gray-600 line-clamp-1">
                          {item.nm_sub_kegiatan}
                        </div>
                      )}
                      <div className="font-mono font-bold text-gray-800 text-[11px]">
                        {item.kd_rek6 || "-"}
                      </div>
                      <div className="text-[11px] text-gray-600 line-clamp-1">
                        {item.nm_rek6 || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-xs">
                      <p className="line-clamp-2">{item.uraian}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <div className="font-semibold text-gray-800">
                        {item.nama_penyetor || "-"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {item.alamat_penyetor || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-xs">
                      <div className="mt-1">
                        {item.verif === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Terbayar
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Belum Bayar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                      {formatRupiah(Number(item.nilai) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintItem(item)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Cetak STS"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {item.verif === 1 ? (
                          <>
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold cursor-not-allowed"
                              title="Terkunci — STS sudah terbayar. Kirim, Edit, dan Hapus dikunci."
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Terkunci</span>
                            </span>
                            {isSuperadmin && item.status !== "DIBUKUKAN" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelPaymentTarget(item);
                                  setCancelPaymentError(null);
                                }}
                                className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Batalkan Status Pembayaran"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {item.sent_simpatda ? (
                              <button
                                type="button"
                                disabled={sendingSimpatdaId === item.id}
                                onClick={() => handleBatalKirimSimpatda(item)}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg cursor-pointer disabled:opacity-50"
                                title="Batal Kirim Data dari dbsimpatda"
                              >
                                {sendingSimpatdaId === item.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Undo2 className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={sendingSimpatdaId === item.id}
                                onClick={() => handleKirimSimpatda(item)}
                                className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg cursor-pointer disabled:opacity-50"
                                title="Kirim Data ke dbsimpatda"
                              >
                                {sendingSimpatdaId === item.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {isSuperadmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentDialog(item)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                title="Update Status Pembayaran"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Edit STS"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(item);
                                setDeleteError(null);
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus STS"
                            >
                              <Trash2 className="w-4 h-4" />
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

        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          total={filteredList.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal Input / Edit Penerbitan STS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-base">
                  {editingId
                    ? "Edit Penerbitan STS Pengembalian"
                    : "Formulir Penerbitan STS Pengembalian"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jenis Pengembalian <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jenisPengembalian}
                    onChange={(e) =>
                      handleJenisChange(e.target.value as JenisPengembalian)
                    }
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-semibold"
                  >
                    <option value="SISA_KAS">1. Sisa Kas (Rekening Kas Bendahara)</option>
                    <option value="BELANJA">2. Belanja (Sub Kegiatan &amp; Rekening Belanja)</option>
                    <option value="LAINNYA">3. Lainnya (Rekening Pendapatan Lain-lain)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal STS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglSts}
                    onChange={(e) => setTglSts(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              {/* Kondisi Pilihan Rekening Sesuai 3 Jenis Pengembalian */}
              {jenisPengembalian === "SISA_KAS" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rekening Kas di Bendahara Pengeluaran (Otomatis){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={kasSelectOptions}
                    value={kdRek6}
                    onChange={(val) => {
                      const found = kasBendaharaRek.find((r) => r.kd_rek6 === val);
                      setKdRek6(val);
                      setNmRek6(found?.nm_rek6 || "Kas di Bendahara Pengeluaran");
                    }}
                    placeholder="-- Pilih Rekening Kas di Bendahara Pengeluaran --"
                    dropdownPosition="bottom"
                  />
                </div>
              )}

              {jenisPengembalian === "BELANJA" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pilih Sub Kegiatan <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={subKegSelectOptions}
                      value={kdSubKegiatan}
                      onChange={(val) => {
                        const found = subKegiatanOptions.find(
                          (s) => s.kd_sub_kegiatan === val
                        );
                        setKdSubKegiatan(val);
                        setNmSubKegiatan(found?.nm_sub_kegiatan || "");
                        setKdRek6("");
                        setNmRek6("");
                      }}
                      placeholder="-- Pilih Sub Kegiatan --"
                      dropdownPosition="bottom"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pilih Rekening Belanja <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={belanjaSelectOptions}
                      value={kdRek6}
                      onChange={(val) => {
                        const found = belanjaOptions.find(
                          (b) =>
                            b.kd_rek6 === val &&
                            (!kdSubKegiatan || b.kd_sub_kegiatan === kdSubKegiatan)
                        );
                        setKdRek6(val);
                        setNmRek6(found?.nm_rek6 || "");
                      }}
                      placeholder="-- Pilih Rekening Belanja --"
                      dropdownPosition="bottom"
                    />
                  </div>
                </div>
              )}

              {jenisPengembalian === "LAINNYA" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rekening Pendapatan atas Pengembalian Belanja (4.1.04 / 4.3){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={pendapatanSelectOptions}
                    value={kdRek6}
                    onChange={(val) => {
                      const found = pendapatanLainnyaRek.find(
                        (r) => r.kd_rek6 === val
                      );
                      setKdRek6(val);
                      setNmRek6(found?.nm_rek6 || "");
                    }}
                    placeholder="-- Pilih Rekening Pendapatan Lain-lain --"
                    dropdownPosition="bottom"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nomor Surat Tanda Setor (STS)
                  </label>
                  <input
                    type="text"
                    value={noSts}
                    onChange={(e) => setNoSts(e.target.value)}
                    placeholder="Otomatis setelah memilih rekening"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono bg-slate-50"
                  />
                  {!editingId && (
                    <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                      No. Tetap otomatis: 7{String(nextSeq).padStart(5, "0")}/
                      {tglSts ? tglSts.slice(0, 4) : "2026"}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nilai Setoran STS (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={nilai || ""}
                    onChange={(e) => setNilai(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-bold text-blue-700 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uraian / Keterangan STS <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder={`Keterangan penerbitan STS (${JENIS_LABEL[jenisPengembalian]})...`}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Penyetor
                  </label>
                  <input
                    type="text"
                    value={namaPenyetor}
                    onChange={(e) => setNamaPenyetor(e.target.value)}
                    placeholder="Masukkan nama penyetor..."
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Alamat Penyetor
                  </label>
                  <input
                    type="text"
                    value={alamatPenyetor}
                    onChange={(e) => setAlamatPenyetor(e.target.value)}
                    placeholder="Masukkan alamat penyetor..."
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? "Simpan Perubahan" : "Simpan STS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus STS"
        entityName="Penerbitan STS"
        itemCode={deleteTarget?.no_sts || deleteTarget?.no_tetap}
        itemLabel={deleteTarget?.uraian}
        description="Data Penerbitan STS pada tbl_pengembalian ini akan dihapus secara permanen."
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <StsPrintModal
        open={Boolean(printItem)}
        item={printItem}
        onClose={() => setPrintItem(null)}
      />

      {/* Form Dialog Update Status Pembayaran STS (Khusus Superadmin) */}
      {paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">
                    Update Status Pembayaran
                  </h3>
                  <p className="text-[11px] text-white/80 font-mono">
                    No. STS: {paymentTarget.no_sts || paymentTarget.no_tetap}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentTarget(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPaymentUpdate} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Nilai Setoran STS</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {formatRupiah(Number(paymentTarget.nilai) || 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={kdCabang}
                    onChange={(e) => setKdCabang(e.target.value)}
                    placeholder="Contoh: 233"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Pengesahan{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={kdPengesahan}
                    onChange={(e) => setKdPengesahan(e.target.value)}
                    placeholder="Masukkan kode pengesahan..."
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Bayar{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglBayar}
                    onChange={(e) => setTglBayar(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Channel{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nmChannel}
                    onChange={(e) => setNmChannel(e.target.value)}
                    placeholder="Contoh: TELLER / CMS / ATM"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Terminal{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={kdTerminal}
                    onChange={(e) => setKdTerminal(e.target.value)}
                    placeholder="Contoh: TRM01"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPaymentTarget(null)}
                  disabled={updatingPayment}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingPayment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingPayment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Simpan Status Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Dialog Pembatalan Pembayaran STS (Khusus Superadmin) */}
      {cancelPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm">
                  Batalkan Pembayaran STS (Superadmin)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelPaymentTarget(null)}
                disabled={cancelingPayment}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {cancelPaymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{cancelPaymentError}</span>
                </div>
              )}

              <p className="text-slate-700 leading-relaxed">
                Anda akan membatalkan status pembayaran STS{" "}
                <strong className="font-mono text-[#5E0E14]">
                  {cancelPaymentTarget.no_sts || cancelPaymentTarget.no_tetap}
                </strong></p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kode Pengesahan:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {cancelPaymentTarget.kd_pengesahan || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel / Cabang:</span>
                  <span className="font-semibold text-slate-800">
                    {cancelPaymentTarget.nm_channel || "-"} (
                    {cancelPaymentTarget.kd_cabang || "-"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nilai STS:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {formatRupiah(Number(cancelPaymentTarget.nilai) || 0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelPaymentTarget(null)}
                  disabled={cancelingPayment}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelPayment}
                  disabled={cancelingPayment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {cancelingPayment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span>Konfirmasi Batalkan Pembayaran</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
