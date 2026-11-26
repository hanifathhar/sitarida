"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
  ScopeData,
} from "@/components/penatausahaan/bendahara-pengeluaran/BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect, { SelectOption } from "@/components/ui/SearchableSelect";
import {
  FileText,
  RefreshCw,
  Search,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  DollarSign,
  ListChecks,
  ArrowLeft,
} from "lucide-react";

interface JurnalDetailRow {
  id: string;
  kdsub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: "D" | "K";
  debet: number;
  kredit: number;
  keterangan: string;
}

interface JurnalPenyesuaianItem {
  id: string;
  no_voucher: string;
  tgl_voucher: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit: string | null;
  nm_unit: string | null;
  keterangan: string;
  total_debet: number;
  total_kredit: number;
  jns_transaksi: string;
  tabel: string;
  details: JurnalDetailRow[];
}

interface FormRowState {
  key: string;
  kdsub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  rk: "D" | "K";
  nilai: string;
}

export default function JurnalPenyesuaianView() {
  return (
    <BendaharaStepperWrapper
      title="Jurnal Penyesuaian"
      subtitle=""
      step3Label="Daftar Jurnal Penyesuaian"
      step4Label="Input Jurnal Penyesuaian"
      scopeUrl="/api/akuntansi/scope"
    >
      {({ selectedOpd, selectedUnit, scopeData, currentStep, setCurrentStep }) => (
        <JurnalPenyesuaianContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
          scopeData={scopeData}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function JurnalPenyesuaianContent({
  selectedOpd,
  selectedUnit,
  scopeData,
  currentStep,
  setCurrentStep,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
  scopeData: ScopeData | null;
  currentStep: 1 | 2 | 3 | 4;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
}) {
  const [items, setItems] = useState<JurnalPenyesuaianItem[]>([]);
  const [summary, setSummary] = useState({
    totalDokumen: 0,
    totalBaris: 0,
    totalDebet: 0,
    totalKredit: 0,
  });
  const [rekenings, setRekenings] = useState<{ kd_rek6: string; nm_rek6: string }[]>([]);
  const [rkaItems, setRkaItems] = useState<
    {
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      kd_rek6: string;
      nm_rek6: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form Create/Edit (Step 4)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noVoucher, setNoVoucher] = useState("");
  const [tglVoucher, setTglVoucher] = useState(() => new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  const [rows, setRows] = useState<FormRowState[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // FormDialog Input/Edit Rincian Jurnal
  const [rowDialogOpen, setRowDialogOpen] = useState(false);
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [rowJenis, setRowJenis] = useState<string>("");
  const [rowSubKeg, setRowSubKeg] = useState("");
  const [rowRek6, setRowRek6] = useState("");
  const [rowRk, setRowRk] = useState<"D" | "K">("D");
  const [rowNilai, setRowNilai] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  // Detail & Delete Modals
  const [detailItem, setDetailItem] = useState<JurnalPenyesuaianItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JurnalPenyesuaianItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tahunAnggaran = (scopeData?.session as any)?.tahunAnggaran || 2026;

  const fetchRefs = async () => {
    try {
      const q = new URLSearchParams({ ref: "1" });
      if (selectedOpd?.kd_skpd) q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(`/api/akuntansi/jurnal-penyesuaian?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRekenings(json.data.rekenings || []);
        setRkaItems(json.data.rkaItems || []);
      }
    } catch (e) {
      console.error("Gagal memuat referensi rekening:", e);
    }
  };

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/akuntansi/jurnal-penyesuaian?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSummary(
          json.data.summary || {
            totalDokumen: 0,
            totalBaris: 0,
            totalDebet: 0,
            totalKredit: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat Jurnal Penyesuaian:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefs();
  }, [selectedOpd, selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit, startDate, endDate]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.no_voucher.toLowerCase().includes(q) ||
        i.keterangan.toLowerCase().includes(q) ||
        i.details.some(
          (d) =>
            d.kd_rek6.toLowerCase().includes(q) ||
            d.nm_rek6.toLowerCase().includes(q) ||
            d.nm_sub_kegiatan.toLowerCase().includes(q)
        )
    );
  }, [items, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOpd, selectedUnit, startDate, endDate, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const filteredRekOptionsByJenis: SelectOption[] = useMemo(() => {
    if (!rowJenis || rowJenis === "5") return [];
    return rekenings
      .filter((r) => r.kd_rek6.startsWith(rowJenis))
      .map((r) => ({
        value: r.kd_rek6,
        label: `${r.kd_rek6} - ${r.nm_rek6}`,
      }));
  }, [rekenings, rowJenis]);

  const subKegMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rkaItems) {
      if (r.kd_sub_kegiatan && !map.has(r.kd_sub_kegiatan)) {
        map.set(r.kd_sub_kegiatan, r.nm_sub_kegiatan);
      }
    }
    return map;
  }, [rkaItems]);

  const rkaSubKegOptions: SelectOption[] = useMemo(
    () =>
      Array.from(subKegMap.entries()).map(([kd, nm]) => ({
        value: kd,
        label: `${kd} - ${nm}`,
      })),
    [subKegMap]
  );

  const rkaRekOptionsBySubKeg: SelectOption[] = useMemo(() => {
    if (!rowSubKeg) return [];
    const seen = new Set<string>();
    const opts: SelectOption[] = [];
    for (const r of rkaItems) {
      if (r.kd_sub_kegiatan === rowSubKeg && !seen.has(r.kd_rek6)) {
        seen.add(r.kd_rek6);
        opts.push({
          value: r.kd_rek6,
          label: `${r.kd_rek6} - ${r.nm_rek6}`,
        });
      }
    }
    return opts;
  }, [rkaItems, rowSubKeg]);

  const rekMap = useMemo(() => {
    const m = new Map(rekenings.map((r) => [r.kd_rek6, r.nm_rek6]));
    for (const r of rkaItems) {
      if (!m.has(r.kd_rek6)) m.set(r.kd_rek6, r.nm_rek6);
    }
    return m;
  }, [rekenings, rkaItems]);

  const openAddRowDialog = () => {
    setEditingRowKey(null);
    setRowJenis("");
    setRowSubKeg("");
    setRowRek6("");
    setRowRk("D");
    setRowNilai("");
    setRowError(null);
    setRowDialogOpen(true);
  };

  const openEditRowDialog = (r: FormRowState) => {
    setEditingRowKey(r.key);
    const firstChar = (r.kd_rek6 || "").trim().charAt(0);
    setRowJenis(["1", "2", "3", "4", "5", "6", "7", "8"].includes(firstChar) ? firstChar : "");
    setRowSubKeg(r.kdsub_kegiatan || "");
    setRowRek6(r.kd_rek6);
    setRowRk(r.rk);
    setRowNilai(r.nilai);
    setRowError(null);
    setRowDialogOpen(true);
  };

  const handleSaveRowDialog = () => {
    setRowError(null);
    if (!rowJenis) {
      setRowError("Jenis rekening wajib dipilih terlebih dahulu.");
      return;
    }
    if (rowJenis === "5") {
      if (!rowSubKeg.trim()) {
        setRowError("Sub Kegiatan wajib dipilih sesuai RKA untuk jurnal belanja.");
        return;
      }
      if (!rowRek6.trim()) {
        setRowError("Rekening belanja sesuai RKA wajib dipilih.");
        return;
      }
    } else if (!rowRek6.trim()) {
      setRowError("Rekening wajib dipilih.");
      return;
    }
    const nilaiNum = Number(rowNilai) || 0;
    if (nilaiNum <= 0) {
      setRowError("Nilai harus lebih dari 0.");
      return;
    }

    const nextRow: FormRowState = {
      key: editingRowKey || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kdsub_kegiatan: rowSubKeg.trim(),
      nm_sub_kegiatan: rowSubKeg.trim() ? subKegMap.get(rowSubKeg.trim()) || "" : "",
      kd_rek6: rowRek6.trim(),
      nm_rek6: rekMap.get(rowRek6.trim()) || "",
      rk: rowRk,
      nilai: String(nilaiNum),
    };

    if (editingRowKey) {
      setRows((prev) => prev.map((x) => (x.key === editingRowKey ? nextRow : x)));
    } else {
      setRows((prev) => [...prev, nextRow]);
    }
    setRowDialogOpen(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    let maxUrut = 0;
    for (const item of items) {
      const firstPart = (item.no_voucher || "").split("/")[0]?.trim() || "";
      if (/^\d{1,7}$/.test(firstPart)) {
        const num = parseInt(firstPart, 10);
        if (!isNaN(num) && num > maxUrut) maxUrut = num;
      }
    }
    const nextUrut = String(maxUrut + 1).padStart(5, "0");
    const unitCode = selectedUnit?.kd_unit || selectedOpd?.kd_skpd || "";
    setNoVoucher(`${nextUrut}/${unitCode}/JU/${tahunAnggaran}`);
    setTglVoucher(new Date().toISOString().split("T")[0]);
    setKeterangan("");
    setRows([]);
    setFormError(null);
    setCurrentStep(4);
  };

  const openEditForm = (item: JurnalPenyesuaianItem) => {
    setEditingId(item.id);
    setNoVoucher(item.no_voucher);
    setTglVoucher(item.tgl_voucher);
    setKeterangan(item.keterangan === "-" ? "" : item.keterangan);
    setRows(
      item.details.map((d) => ({
        key: d.id,
        kdsub_kegiatan: d.kdsub_kegiatan || "",
        nm_sub_kegiatan: d.nm_sub_kegiatan || "",
        kd_rek6: d.kd_rek6,
        nm_rek6: d.nm_rek6,
        rk: d.rk,
        nilai: String(d.rk === "D" ? d.debet : d.kredit),
      }))
    );
    setFormError(null);
    setCurrentStep(4);
  };

  const formTotals = useMemo(() => {
    let debet = 0;
    let kredit = 0;
    for (const r of rows) {
      const val = Number(r.nilai) || 0;
      if (r.rk === "D") debet += val;
      else kredit += val;
    }
    const balanced = debet > 0 && Math.abs(debet - kredit) < 0.01;
    return { debet, kredit, balanced };
  }, [rows]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    if (!formTotals.balanced) {
      setFormError(
        `Jurnal harus balance (Debet = Kredit dan > 0). Saat ini Debet: ${formatAngka(
          formTotals.debet
        )}, Kredit: ${formatAngka(formTotals.kredit)}.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId || undefined,
        tahunAnggaran,
        no_voucher: noVoucher.trim(),
        tgl_voucher: tglVoucher,
        kd_skpd: selectedOpd.kd_skpd,
        nm_skpd: selectedOpd.nm_skpd,
        kd_unit: selectedUnit?.kd_unit || undefined,
        nm_unit: selectedUnit?.nm_unit || undefined,
        keterangan: keterangan.trim(),
        details: rows.map((r) => ({
          kdsub_kegiatan: r.kdsub_kegiatan,
          nm_sub_kegiatan: r.nm_sub_kegiatan,
          kd_rek6: r.kd_rek6,
          nm_rek6: r.nm_rek6 || rekMap.get(r.kd_rek6) || "",
          rk: r.rk,
          nilai: Number(r.nilai) || 0,
        })),
      };

      const res = await fetch("/api/akuntansi/jurnal-penyesuaian", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Gagal menyimpan Jurnal Penyesuaian.");
        return;
      }

      setCurrentStep(3);
      setFeedback({ type: "success", text: json.message || "Jurnal Penyesuaian tersimpan." });
      await fetchData();
    } catch (err: any) {
      setFormError(err?.message || "Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/akuntansi/jurnal-penyesuaian?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFeedback({ type: "error", text: json.error || "Gagal menghapus Jurnal Penyesuaian." });
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setFeedback({ type: "success", text: json.message || "Jurnal Penyesuaian dihapus." });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Terjadi kesalahan jaringan." });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  const formatAngka = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  if (currentStep === 4) {
    return (
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {editingId ? "Edit Jurnal Penyesuaian" : "Input Jurnal Penyesuaian Baru"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5 text-xs">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                No. Voucher *
              </label>
              <input
                type="text"
                required
                value={noVoucher}
                onChange={(e) => setNoVoucher(e.target.value)}
                placeholder="Contoh: JU-0001/..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Tanggal Voucher *
              </label>
              <input
                type="date"
                required
                value={tglVoucher}
                onChange={(e) => setTglVoucher(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                OPD / Unit
              </label>
              <input
                type="text"
                readOnly
                value={
                  selectedUnit
                    ? `${selectedOpd?.kd_skpd} - ${selectedUnit.nm_unit}`
                    : `${selectedOpd?.kd_skpd} - ${selectedOpd?.nm_skpd}`
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600"
              />
            </div>
            <div className="md:col-span-12">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Keterangan / Uraian Penyesuaian *
              </label>
              <textarea
                required
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tuliskan uraian jurnal penyesuaian..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Rincian Akun Jurnal
              </h4>
              <button
                type="button"
                onClick={openAddRowDialog}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 text-[11px] font-bold text-white shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rincian</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 w-10 text-center">No</th>
                      <th className="px-3.5 py-2.5 min-w-[180px]">Sub Kegiatan</th>
                      <th className="px-3.5 py-2.5 w-44">Kode Rekening</th>
                      <th className="px-3.5 py-2.5">Nama Rekening</th>
                      <th className="px-3.5 py-2.5 w-16 text-center">RK</th>
                      <th className="px-3.5 py-2.5 w-36 text-right">Debet (Rp)</th>
                      <th className="px-3.5 py-2.5 w-36 text-right">Kredit (Rp)</th>
                      <th className="px-3.5 py-2.5 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                          Belum ada rincian Akun jurnal. Klik &quot;Tambah Rincian&quot; untuk menambahkan.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => {
                        const val = Number(r.nilai) || 0;
                        return (
                          <tr key={r.key} className="hover:bg-slate-50/70">
                            <td className="px-3.5 py-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 text-slate-700 leading-snug">
                              {r.nm_sub_kegiatan ? (
                                <div>
                                  <div className="font-medium text-slate-800">{r.nm_sub_kegiatan}</div>
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    {r.kdsub_kegiatan}
                                  </div>
                                </div>
                              ) : r.kdsub_kegiatan ? (
                                <span className="font-mono text-[11px]">{r.kdsub_kegiatan}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">
                              {r.kd_rek6}
                            </td>
                            <td className={`px-3.5 py-2.5 ${r.rk === "K" ? "pl-8" : ""}`}>
                              {r.nm_rek6}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${r.rk === "D"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                              >
                                {r.rk}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                              {formatAngka(r.rk === "D" ? val : 0)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                              {formatAngka(r.rk === "K" ? val : 0)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditRowDialog(r)}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                  title="Edit Rincian"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRows((prev) => prev.filter((row) => row.key !== r.key))
                                  }
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title="Hapus Rincian"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                {formTotals.balanced ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Balance
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" /> Belum Balance
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-5 font-mono text-xs">
                <div>
                  <span className="text-slate-500 mr-1.5">Total Debet:</span>
                  <span className="font-bold text-blue-700">{formatAngka(formTotals.debet)}</span>
                </div>
                <div>
                  <span className="text-slate-500 mr-1.5">Total Kredit:</span>
                  <span className="font-bold text-emerald-700">
                    {formatAngka(formTotals.kredit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={saving}
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !formTotals.balanced}
              className="px-5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] disabled:opacity-45 text-xs font-bold text-white cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Jurnal"}
            </button>
          </div>
        </div>

        {/* FormDialog Input / Edit Rincian Jurnal */}
        {rowDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-visible">
              <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white">
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingRowKey ? "Edit Rincian Ayat Jurnal" : "Tambah Rincian Ayat Jurnal"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRowDialogOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 sm:p-7 space-y-5 text-xs">
                {rowError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{rowError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Jenis *
                  </label>
                  <select
                    value={rowJenis}
                    onChange={(e) => {
                      const nextJenis = e.target.value;
                      setRowJenis(nextJenis);
                      setRowRek6("");
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 cursor-pointer"
                  >
                    <option value="">-- Pilih Jenis --</option>
                    <option value="1">1 | Aktiva</option>
                    <option value="2">2 | Hutang</option>
                    <option value="3">3 | Pasiva</option>
                    <option value="4">4 | Pendapatan</option>
                    <option value="5">5 | Belanja</option>
                    <option value="6">6 | Pembiayaan</option>
                    <option value="7">7 | Pendapatan LO</option>
                    <option value="8">8 | Beban LO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sub Kegiatan {rowJenis === "5" ? "* (Wajib)" : "(Opsional)"}
                  </label>
                  <SearchableSelect
                    options={rkaSubKegOptions}
                    value={rowSubKeg}
                    onChange={(val) => {
                      setRowSubKeg(val);
                      if (rowJenis === "5") setRowRek6("");
                    }}
                    placeholder={
                      rkaSubKegOptions.length === 0
                        ? "Belum ada Sub Kegiatan"
                        : "-- Pilih Sub Kegiatan --"
                    }
                    allowClear={rowJenis !== "5"}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {rowJenis === "5"
                      ? "Rekening Belanja *"
                      : "Rekening *"}
                  </label>
                  <SearchableSelect
                    options={rowJenis === "5" ? rkaRekOptionsBySubKeg : filteredRekOptionsByJenis}
                    value={rowRek6}
                    onChange={(val) => setRowRek6(val)}
                    placeholder={
                      !rowJenis
                        ? "Pilih Jenis terlebih dahulu..."
                        : rowJenis === "5" && !rowSubKeg
                          ? "Pilih Sub Kegiatan terlebih dahulu..."
                          : "-- Pilih Rekening --"
                    }
                    disabled={!rowJenis || (rowJenis === "5" && !rowSubKeg)}
                    allowClear={false}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Posisi (RK) *
                    </label>
                    <select
                      value={rowRk}
                      onChange={(e) => setRowRk(e.target.value as "D" | "K")}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="D">D (Debet)</option>
                      <option value="K">K (Kredit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nilai (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rowNilai}
                      onChange={(e) => setRowNilai(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 rounded-b-2xl bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRowDialogOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveRowDialog}
                  className="px-5 py-2 rounded-xl bg-[#5E0E14] hover:bg-[#7A141C] text-xs font-bold text-white cursor-pointer"
                >
                  {editingRowKey ? "Simpan Rincian" : "Tambahkan ke Jurnal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Utama */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Jurnal Penyesuaian
                </h2>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] hover:opacity-95 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jurnal Penyesuaian</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs font-medium ${feedback.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Jurnal Penyesuaian
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
            {summary.totalDokumen} <span className="text-xs font-bold text-slate-500">Voucher</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Total Baris Ayat Jurnal
            </span>
            <ListChecks className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2 tabular-nums">
            {summary.totalBaris} <span className="text-xs font-bold text-amber-600">Baris</span>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-blue-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Total Debet
            </span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-2 font-mono tabular-nums">
            {formatRupiah(summary.totalDebet)}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Kredit
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-900 mt-2 font-mono tabular-nums">
            {formatRupiah(summary.totalKredit)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="md:col-span-5">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pencarian Cepat</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor voucher, keterangan, atau rekening..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSearchQuery("");
              }}
              className="w-full inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Data Jurnal Penyesuaian */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">No</th>
                <th className="px-3.5 py-3 min-w-[190px]">No. Voucher &amp; Tanggal</th>
                <th className="px-3.5 py-3 min-w-[240px]">Keterangan</th>
                <th className="px-3.5 py-3 text-center w-24">Jml Baris</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Total Debet (Rp)</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap">Total Kredit (Rp)</th>
                <th className="px-3.5 py-3 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs italic text-slate-400">
                    Memuat data Jurnal Penyesuaian...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada data Jurnal Penyesuaian pada OPD/Unit dan periode ini.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors">
                    <td className="px-3.5 py-3 text-center text-slate-400 tabular-nums">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_voucher}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.tgl_voucher}</div>
                    </td>
                    <td className="px-3.5 py-3 max-w-md leading-snug text-slate-700">
                      {item.keterangan}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.details.length} Baris
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatAngka(item.total_debet)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatAngka(item.total_kredit)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-[#5E0E14] hover:text-white transition cursor-pointer"
                          title="Detail Jurnal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="Hapus"
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
        {filteredItems.length > 0 && (
          <div className="border-t border-slate-200 p-3">
            <PaginationBar
              page={currentPage}
              totalPages={totalPages}
              total={filteredItems.length}
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

      {/* Modal Detail Jurnal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Detail Jurnal Penyesuaian</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">No. Voucher</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{detailItem.no_voucher}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Tanggal Voucher</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{detailItem.tgl_voucher}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Jenis / Tabel</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailItem.jns_transaksi} ({detailItem.tabel})
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">OPD / Unit</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {detailItem.kd_skpd} - {detailItem.nm_skpd}
                    {detailItem.nm_unit ? ` (${detailItem.nm_unit})` : ""}
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Keterangan</div>
                  <div className="text-slate-700 mt-0.5">{detailItem.keterangan}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-10">No</th>
                        <th className="px-3.5 py-2.5 min-w-[180px]">Sub Kegiatan</th>
                        <th className="px-3.5 py-2.5 w-44">Kode Rekening</th>
                        <th className="px-3.5 py-2.5">Nama Rekening</th>
                        <th className="px-3.5 py-2.5 text-center w-16">RK</th>
                        <th className="px-3.5 py-2.5 text-right w-40">Debet (Rp)</th>
                        <th className="px-3.5 py-2.5 text-right w-40">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailItem.details.map((d, i) => (
                        <tr key={d.id} className="hover:bg-slate-50/70">
                          <td className="px-3.5 py-2.5 text-center text-slate-400">{i + 1}</td>
                          <td className="px-3.5 py-2.5 text-slate-700 leading-snug">
                            {d.nm_sub_kegiatan ? (
                              <div>
                                <div className="font-medium text-slate-800">{d.nm_sub_kegiatan}</div>
                                {d.kdsub_kegiatan && (
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                    {d.kdsub_kegiatan}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-900">
                            {d.kd_rek6}
                          </td>
                          <td className={`px-3.5 py-2.5 ${d.rk === "K" ? "pl-8" : ""}`}>
                            {d.nm_rek6}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold ${d.rk === "D"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                            >
                              {d.rk}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatAngka(d.debet)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                            {formatAngka(d.kredit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td colSpan={5} className="px-3.5 py-2.5 text-right text-[11px] uppercase tracking-wider text-slate-600">
                          Total
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                          {formatAngka(detailItem.total_debet)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums">
                          {formatAngka(detailItem.total_kredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Jurnal Penyesuaian</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Hapus voucher <span className="font-mono font-bold">{deleteTarget.no_voucher}</span> beserta seluruh rinciannya di <span className="font-mono">trhmaping</span> &amp; <span className="font-mono">trdmaping</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
