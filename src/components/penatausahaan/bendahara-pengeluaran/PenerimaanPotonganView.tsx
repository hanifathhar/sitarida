"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import {
  Receipt,
  Plus,
  RefreshCw,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft,
  FileText,
  Coins,
  Pencil,
  Trash2,
  DollarSign,
  Lock,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface PotonganRef {
  id: string;
  kd_rek6: string;
  nm_rek6: string;
}

interface RincianPotonganForm {
  kd_rek6: string;
  nm_rek6: string;
  id_billing: string;
  nilai: number;
  keterangan: string;
}

export default function PenerimaanPotonganView() {
  return (
    <BendaharaStepperWrapper
      title="Penerimaan Potongan Pajak"
      subtitle="Pencatatan penerimaan potongan pajak (PPh/PPN) ke Buku Kas Umum (BKU)"
      step3Label="Daftar Penerimaan Potongan"
      step4Label="Pengisian Penerimaan Potongan"
    >
      {({ selectedOpd, selectedUnit, currentStep, setCurrentStep }) => (
        <PenerimaanPotonganContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function PenerimaanPotonganContent({
  selectedOpd,
  selectedUnit,
  currentStep,
  setCurrentStep,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
}) {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Referensi Potongan & Kuitansi Cair = 1
  const [potonganRefList, setPotonganRefList] = useState<PotonganRef[]>([]);
  const [kwitansiCairList, setKwitansiCairList] = useState<
    Array<{
      id: string;
      nomor: string;
      tanggal: string;
      uraian: string;
      nilai: number;
      status: string;
      potonganList?: Array<{
        kd_rek6: string;
        nm_rek6: string;
        id_billing?: string | null;
        nilai: number;
        keterangan?: string | null;
      }>;
    }>
  >([]);

  // Step 4: Form State (trhtrmpot + trdtrmpot)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [noBukti, setNoBukti] = useState("");
  const [noSp2d, setNoSp2d] = useState("");
  const [tglBukti, setTglBukti] = useState(new Date().toISOString().split("T")[0]);
  const [uraian, setUraian] = useState("");
  const [rincian, setRincian] = useState<RincianPotonganForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Tambah/Edit Rincian Potongan (sama seperti Formulir Kuitansi)
  const [showModalRincian, setShowModalRincian] = useState(false);
  const [editingRincianIdx, setEditingRincianIdx] = useState<number | null>(null);
  const [rincianDraft, setRincianDraft] = useState<RincianPotonganForm>({
    kd_rek6: "",
    nm_rek6: "",
    id_billing: "",
    nilai: 0,
    keterangan: "",
  });

  const fetchData = useCallback(async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      q.set("tipe", "PENERIMAAN");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
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
  }, [selectedOpd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    async function loadRefs() {
      try {
        const res = await fetch(
          "/api/penatausahaan/bendahara-pengeluaran/potongan?action=potongan-ref"
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPotonganRefList(json.data);
        }
      } catch (e) {
        console.error("Gagal memuat referensi potongan:", e);
      }
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (!selectedOpd) return;
    async function loadKwitansiCair() {
      try {
        const q = new URLSearchParams({
          action: "kwitansi-cair",
          opdId: selectedOpd!.id,
        });
        if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
        const res = await fetch(
          `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setKwitansiCairList(json.data);
        }
      } catch (e) {
        console.error("Gagal memuat daftar kuitansi cair:", e);
      }
    }
    loadKwitansiCair();
  }, [selectedOpd, selectedUnit]);

  const fetchNextBkuNumber = async () => {
    if (!selectedOpd) return;
    try {
      const q = new URLSearchParams({
        action: "next-bku",
        opdId: selectedOpd.id,
      });
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.no_bukti) {
        setNoBukti(json.no_bukti);
      }
    } catch (e) {
      console.error("Gagal mengambil nomor BKU berikutnya:", e);
    }
  };

  const handleOpenNewForm = async () => {
    setEditingId(null);
    setNoSp2d("");
    setTglBukti(new Date().toISOString().split("T")[0]);
    setUraian("");
    setRincian([]);
    setFormError(null);
    setSuccessMsg(null);
    setListError(null);
    setNoBukti("Memuat nomor BKU...");
    setCurrentStep(4);
    await fetchNextBkuNumber();
  };

  const handleOpenEditForm = (item: any) => {
    setEditingId(item.id);
    setNoBukti(item.no_bukti || "");
    setTglBukti(
      item.tgl_bukti
        ? new Date(item.tgl_bukti).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setNoSp2d(item.no_sp2d || "");
    setUraian(item.uraian || "");
    setRincian(
      Array.isArray(item.rincian)
        ? item.rincian.map((r: any) => ({
          kd_rek6: r.kd_rek6 || "",
          nm_rek6: r.nm_rek6 || "",
          id_billing: r.id_billing || "",
          nilai: Number(r.nilai || 0),
          keterangan: r.keterangan || "",
        }))
        : []
    );
    setFormError(null);
    setSuccessMsg(null);
    setListError(null);
    setCurrentStep(4);
  };

  const handleOpenDeleteDialog = (item: any) => {
    setDeleteTarget(item);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);
    setListError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/potongan?id=${encodeURIComponent(
          deleteTarget.id
        )}&tipe=PENERIMAAN`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(
          json.message ||
          `Penerimaan Potongan ${deleteTarget.no_bukti} berhasil dihapus.`
        );
        setDeleteTarget(null);
        await fetchData();
      } else {
        setDeleteError(json.error || "Gagal menghapus penerimaan potongan.");
      }
    } catch {
      setDeleteError("Terjadi kesalahan jaringan saat menghapus data.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Pagination Step 3
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_bukti?.toLowerCase().includes(q) ||
          item.no_sp2d?.toLowerCase().includes(q) ||
          item.uraian?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (startDate || endDate) {
        const itemDateStr = item.tgl_bukti
          ? new Date(item.tgl_bukti).toISOString().split("T")[0]
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

  const potonganSelectOptions: SelectOption[] = useMemo(
    () =>
      potonganRefList.map((p) => ({
        value: p.kd_rek6,
        label: `${p.kd_rek6} - ${p.nm_rek6}`,
        subLabel: p.kd_rek6,
      })),
    [potonganRefList]
  );

  const kwitansiSelectOptions: SelectOption[] = useMemo(
    () =>
      kwitansiCairList.map((k) => ({
        value: k.nomor,
        label: k.nomor,
        badge: "",
        subLabel: `${new Date(k.tanggal).toLocaleDateString("id-ID")} • ${formatRupiah(
          Number(k.nilai || 0)
        )} • ${k.uraian}`,
      })),
    [kwitansiCairList]
  );

  const handleSelectKwitansi = (nomor: string) => {
    setNoSp2d(nomor);
    const kwt = kwitansiCairList.find((k) => k.nomor === nomor);
    if (!kwt) return;
    if (!uraian.trim()) {
      setUraian(`Penerimaan Potongan SPJ ${kwt.nomor} - ${kwt.uraian}`);
    }
    if (rincian.length === 0 && kwt.potonganList && kwt.potonganList.length > 0) {
      setRincian(
        kwt.potonganList.map((p) => ({
          kd_rek6: p.kd_rek6,
          nm_rek6: p.nm_rek6,
          id_billing: p.id_billing || "",
          nilai: Number(p.nilai || 0),
          keterangan: p.keterangan || "",
        }))
      );
    }
  };

  const handleOpenAddRincian = () => {
    setEditingRincianIdx(null);
    setRincianDraft({
      kd_rek6: "",
      nm_rek6: "",
      id_billing: "",
      nilai: 0,
      keterangan: "",
    });
    setShowModalRincian(true);
  };

  const handleOpenEditRincian = (idx: number) => {
    setEditingRincianIdx(idx);
    setRincianDraft({ ...rincian[idx] });
    setShowModalRincian(true);
  };

  const handleSaveRincianDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rincianDraft.kd_rek6) return;
    if ((Number(rincianDraft.nilai) || 0) <= 0) return;

    if (editingRincianIdx !== null) {
      setRincian((prev) =>
        prev.map((item, idx) => (idx === editingRincianIdx ? rincianDraft : item))
      );
    } else {
      setRincian((prev) => [...prev, rincianDraft]);
    }
    setShowModalRincian(false);
  };

  const handleRemoveRincian = (i: number) => {
    setRincian((prev) => prev.filter((_, idx) => idx !== i));
  };

  const totalNilai = rincian.reduce((sum, r) => sum + (Number(r.nilai) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    if (!uraian.trim()) {
      setFormError("Uraian penerimaan potongan wajib diisi.");
      return;
    }
    if (rincian.length === 0) {
      setFormError("Tambahkan minimal 1 rincian potongan pajak (trdtrmpot).");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(
        "/api/penatausahaan/bendahara-pengeluaran/potongan",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(editingId ? { id: editingId } : {}),
            tipe: "PENERIMAAN",
            tahunAnggaran: 2026,
            opdId: selectedOpd.id,
            kd_unit: selectedUnit?.kd_unit,
            nm_unit: selectedUnit?.nm_unit,
            no_bukti:
              noBukti && !noBukti.startsWith("Memuat") ? noBukti.trim() : undefined,
            tgl_bukti: tglBukti,
            no_sp2d: noSp2d || undefined,
            uraian,
            rincian,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(
          editingId
            ? `Penerimaan Potongan Pajak ${json.data?.no_bukti || noBukti
            } berhasil diperbarui.`
            : `Penerimaan Potongan Pajak berhasil disimpan dengan No. Bukti BKU ${json.data?.no_bukti || noBukti
            }.`
        );
        setEditingId(null);
        setCurrentStep(3);
        await fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan penerimaan potongan");
      }
    } catch {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // STEP 4: FORM ISIAN PENERIMAAN POTONGAN PAJAK (SEPERTI FORMULIR KUITANSI)
  // =========================================================================
  if (currentStep === 4) {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="p-1 hover:bg-black/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. RINGKASAN PENERIMAAN POTONGAN (trhtrmpot) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#88131A]" />
                <span>
                  {editingId
                    ? `Formulir Edit Penerimaan Potongan (${noBukti})`
                    : "Formulir Input Penerimaan Potongan Pajak"}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lengkapi ringkasan dokumen penerimaan (trhtrmpot) dan rincian rekening
                potongan pajak (trdtrmpot).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setCurrentStep(3);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer self-start md:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Penerimaan</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#88131A]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Ringkasan Penerimaan Potongan (trhtrmpot)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Bukti BKU (Otomatis) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noBukti}
                  onChange={(e) => setNoBukti(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-slate-50 text-[#5E0E14] focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Format BKU berurut: [no_urut]/[kd_unit]/2026
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Bukti Penerimaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tglBukti}
                  onChange={(e) => setTglBukti(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Kuitansi / SPJ Sudah Cair
                </label>
                <SearchableSelect
                  options={kwitansiSelectOptions}
                  value={noSp2d}
                  onChange={handleSelectKwitansi}
                  placeholder="-- Pilih No. Kuitans --"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Uraian Penerimaan Potongan Pajak <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                placeholder="Contoh: Pemungutan Pajak PPN/PPh Pasal 21/22/23 atas belanja..."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#88131A]/20 focus:border-[#88131A]"
              />
            </div>


          </div>
        </div>

        {/* 2. RINCIAN POTONGAN PAJAK (trdtrmpot) — PERSIS FORMULIR KUITANSI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#88131A]" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Rincian Potongan Pajak (trdtrmpot)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daftar rekening potongan pajak, ID Billing, dan nilai yang dipungut
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Total Potongan:</span>
                <div className="text-sm font-mono font-bold text-rose-600">
                  {formatRupiah(totalNilai)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddRincian}
                className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm transition hover:bg-amber-100 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Potongan</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                  <th className="px-3.5 py-2.5">Rekening Potongan</th>
                  <th className="px-3.5 py-2.5">ID Billing</th>
                  <th className="px-3.5 py-2.5">Keterangan</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai Potongan (Rp)</th>
                  <th className="px-3.5 py-2.5 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rincian.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                      Belum ada rincian potongan pajak. Klik tombol{" "}
                      <strong className="text-slate-700">&quot;+ Tambah Potongan&quot;</strong>{" "}
                      untuk menambahkan rincian potongan pajak.
                    </td>
                  </tr>
                ) : (
                  rincian.map((pot, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-mono text-xs font-bold text-rose-800">
                          {pot.kd_rek6}
                        </div>
                        <div className="text-xs font-semibold text-slate-800">
                          {pot.nm_rek6}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-xs">
                        {pot.id_billing ? (
                          <span className="text-indigo-700 font-bold">
                            {pot.id_billing}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-600">
                        {pot.keterangan || "-"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(Number(pot.nilai || 0))}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRincian(idx)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Ubah Rincian Potongan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRincian(idx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus Rincian Potongan"
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

        {/* Footer Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Nomor bukti otomatis akan tercatat sesuai urutan BKU saat disimpan.
          </p>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || rincian.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Simpan Penerimaan Potongan"}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Tambah / Ubah Rincian Potongan Pajak */}
        {showModalRincian && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-visible">
              <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>
                    {editingRincianIdx !== null
                      ? "Ubah Rincian Potongan Pajak"
                      : "Tambah Rincian Potongan Pajak"}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModalRincian(false)}
                  className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rekening Potongan Pajak <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={potonganSelectOptions}
                    value={rincianDraft.kd_rek6}
                    onChange={(val) => {
                      const found = potonganRefList.find((p) => p.kd_rek6 === val);
                      setRincianDraft((prev) => ({
                        ...prev,
                        kd_rek6: val,
                        nm_rek6: found?.nm_rek6 || prev.nm_rek6,
                      }));
                    }}
                    placeholder="-- Pilih Rekening Potongan Pajak --"
                    searchPlaceholder="Cari nama atau kode rekening potongan..."
                    emptyText="Rekening potongan tidak ditemukan."
                    allowClear={false}
                    dropdownPosition="bottom"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID Billing Pajak (Opsional)
                  </label>
                  <input
                    type="text"
                    value={rincianDraft.id_billing}
                    onChange={(e) =>
                      setRincianDraft((prev) => ({
                        ...prev,
                        id_billing: e.target.value,
                      }))
                    }
                    placeholder="Masukkan 15 digit kode billing..."
                    className="w-full px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Potongan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rincianDraft.nilai || ""}
                    onChange={(e) =>
                      setRincianDraft((prev) => ({
                        ...prev,
                        nilai: Number(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 font-mono font-bold text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={rincianDraft.keterangan}
                    onChange={(e) =>
                      setRincianDraft((prev) => ({
                        ...prev,
                        keterangan: e.target.value,
                      }))
                    }
                    placeholder="Keterangan tambahan..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModalRincian(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRincianDraft}
                    disabled={!rincianDraft.kd_rek6 || (Number(rincianDraft.nilai) || 0) <= 0}
                    className="px-4 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {editingRincianIdx !== null ? "Simpan Rincian" : "Tambahkan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  }

  // =========================================================================
  // STEP 3: DAFTAR PENERIMAAN POTONGAN PAJAK
  // =========================================================================
  return (
    <div className="space-y-6">
      {listError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{listError}</span>
          </div>
          <button
            type="button"
            onClick={() => setListError(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Action / Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Penerimaan Potongan Pajak
          </h3>
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
              placeholder="Cari No. Bukti / SP2D / Uraian..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

          <button
            onClick={handleOpenNewForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>Penerimaan Potongan Baru</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
            title="Segarkan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 w-48">No. Bukti / Tanggal</th>
                <th className="px-3.5 py-3 w-48">No. Kuitansi / SPJ</th>
                <th className="px-3.5 py-3">Uraian Pemotongan</th>
                <th className="px-3.5 py-3 text-right w-40">Total Potongan (Rp)</th>
                <th className="px-3.5 py-3 text-center w-28">Status</th>
                <th className="px-3.5 py-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
                    Memuat data potongan...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data penerimaan potongan yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">
                        {item.no_bukti}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.tgl_bukti
                          ? new Date(item.tgl_bukti).toLocaleDateString("id-ID")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-mono">{item.no_sp2d || "-"}</td>
                    <td className="px-3.5 py-3 max-w-sm truncate" title={item.uraian}>
                      {item.uraian}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(Number(item.total || 0))}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {item.isLocked ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>DISETOR</span>
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <Receipt className="w-3 h-3" />
                          <span>{item.status || "TERIMA"}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.isLocked ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[11px] font-semibold cursor-not-allowed"
                            title={`Data terkunci karena sudah disetor (${item.strpotNoBukti || "-"
                              }). Hapus data Penyetoran Potongan terlebih dahulu untuk mengubah atau menghapus.`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(item)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Edit Penerimaan Potongan"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteDialog(item)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus Penerimaan Potongan"
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

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Penerimaan Potongan"
        entityName="Penerimaan Potongan Pajak"
        itemCode={deleteTarget?.no_bukti}
        itemLabel=""
        description=""
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
