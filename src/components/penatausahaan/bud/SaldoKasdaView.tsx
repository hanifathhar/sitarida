"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Wallet,
  Save,
  RefreshCw,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Landmark,
  FileSpreadsheet,
  Calendar,
  X,
} from "lucide-react";

interface SaldoKasdaItem {
  id: string;
  tahunAnggaran: number;
  nilai: number;
  keterangan: string;
  updatedBy: string;
  updatedAt: string;
}

export default function SaldoKasdaView() {
  const [items, setItems] = useState<SaldoKasdaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tahunAnggaran, setTahunAnggaran] = useState<number>(2026);
  const [nilai, setNilai] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/penatausahaan/bud/saldo-kasda");
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        if (json.data.tahunAnggaran) {
          setTahunAnggaran(json.data.tahunAnggaran);
        }
      }
    } catch (e) {
      console.error("Gagal memuat Saldo Kasda:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentYearItem = useMemo(
    () => items.find((i) => i.tahunAnggaran === tahunAnggaran) || null,
    [items, tahunAnggaran]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const parsedNilai = Number(nilai.replace(/,/g, "."));
    if (Number.isNaN(parsedNilai) || parsedNilai < 0) {
      setFeedback({ type: "error", text: "Nilai saldo awal harus berupa angka >= 0." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/penatausahaan/bud/saldo-kasda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaran,
          nilai: parsedNilai,
          keterangan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: json.message || "Berhasil disimpan." });
        setNilai("");
        setKeterangan("");
        await fetchData();
      } else {
        setFeedback({ type: "error", text: json.error || "Gagal menyimpan data." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menyimpan ke server." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: SaldoKasdaItem) => {
    if (item.tahunAnggaran !== tahunAnggaran) {
      setFeedback({
        type: "error",
        text: `Tahun Anggaran dikunci ke sesi login (TA ${tahunAnggaran}).`,
      });
      return;
    }
    setNilai(String(item.nilai));
    setKeterangan(item.keterangan || "");
    setFeedback(null);
  };

  const handleDelete = async (item: SaldoKasdaItem) => {
    if (!confirm(`Hapus Saldo Awal Kasda TA ${item.tahunAnggaran}?`)) return;
    setFeedback(null);
    try {
      const res = await fetch(`/api/penatausahaan/bud/saldo-kasda?id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", text: json.message || "Berhasil dihapus." });
        await fetchData();
      } else {
        setFeedback({ type: "error", text: json.error || "Gagal menghapus data." });
      }
    } catch {
      setFeedback({ type: "error", text: "Terjadi kesalahan saat menghapus data." });
    }
  };

  const handleExportExcel = () => {
    const rowsData: (string | number)[][] = [
      ["TABEL SALDO KASDA (SALDO AWAL BKU BUD)"],
      [],
      ["NO", "TAHUN ANGGARAN", "SALDO AWAL KASDA (Rp)", "KETERANGAN", "DIPERBARUI OLEH"],
      ...items.map((item, idx) => [
        idx + 1,
        `TA ${item.tahunAnggaran}`,
        item.nilai,
        item.keterangan || "-",
        item.updatedBy || "-",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rowsData);
    ws["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 24 }, { wch: 42 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saldo Kasda");
    XLSX.writeFile(wb, `Saldo_Kasda_BUD_TA_${tahunAnggaran}.xlsx`);
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

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Utama Modern */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white flex items-center justify-center shadow-sm shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Saldo Kasda (Bendahara Umum Daerah)
                </h1>
                <span className="inline-flex items-center rounded-full bg-[#5E0E14]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#5E0E14]">
                  TA {tahunAnggaran}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Pengelolaan Saldo Awal Kas Daerah (RKUD) per Tahun Anggaran yang terhubung langsung ke Buku Kas Umum Daerah (BKU BUD)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/penatausahaan/bud/bku"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke BKU BUD</span>
            </Link>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 KPI Summary Cards Modern */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/70 to-white rounded-2xl border border-blue-200/90 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-700" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Saldo Awal Kasda TA {tahunAnggaran}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono tabular-nums mt-2.5 tracking-tight">
            {formatRupiah(currentYearItem?.nilai || 0)}
          </div>
          <span className="text-[11px] text-blue-700 font-medium mt-1 inline-block">
            Dasar saldo awal pembukuan BKU BUD
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Status Saldo Awal TA {tahunAnggaran}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 mt-2.5">
            {currentYearItem ? (
              <span className="text-emerald-700">Sudah Ditetapkan</span>
            ) : (
              <span className="text-amber-700">Belum Diinput</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            {currentYearItem
              ? `Diperbarui oleh ${currentYearItem.updatedBy || "BUD"}`
              : "Silakan input saldo awal pada form di bawah"}
          </span>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#88131A]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Riwayat Tahun Anggaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#88131A] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5 tabular-nums">
            {items.length} <span className="text-sm font-bold text-slate-500">Tahun Anggaran</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Tercatat dalam tabel tbl_saldo_kasda
          </span>
        </div>
      </div>

      {/* Form Input Saldo Awal Kasda */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Input / Perbarui Saldo Awal BKU BUD (Saldo Kasda)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Saldo awal per Tahun Anggaran menjadi dasar saldo awal BKU BUD dan berlanjut otomatis menjadi saldo awal bulan-bulan berikutnya.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Tahun Anggaran (Sesi Login)</span>
            </label>
            <input
              type="number"
              readOnly
              disabled
              value={tahunAnggaran}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Nilai Saldo Awal Kasda (Rp) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Contoh: 256144648034.85"
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Keterangan
            </label>
            <input
              type="text"
              placeholder="Contoh: Sisa Kas di RKUD Tahun Anggaran Sebelumnya"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] disabled:opacity-60 px-5 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Saldo Awal Kasda"}</span>
          </button>
        </div>
      </form>

      {/* Tabel Saldo Kasda */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Tabel Saldo Kasda (Saldo Awal BKU BUD)
            </h3>
            <p className="text-[11px] text-slate-500">
              Daftar saldo awal kas daerah yang tercatat per Tahun Anggaran
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {items.length} Data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-14">No</th>
                <th className="px-4 py-3 text-center w-36">Tahun Anggaran</th>
                <th className="px-4 py-3 text-right w-56">Saldo Awal Kasda (Rp)</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 w-48">Diperbarui Oleh</th>
                <th className="px-4 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs italic text-slate-400">
                    Memuat data Saldo Kasda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs italic text-slate-400">
                    Belum ada data Saldo Awal Kasda yang diinput.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isActiveYear = item.tahunAnggaran === tahunAnggaran;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 even:bg-slate-50/30 transition-colors ${
                        isActiveYear ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                            isActiveYear
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          TA {item.tahunAnggaran}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap tabular-nums">
                        {formatAngka(item.nilai)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.keterangan || <span className="italic text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        <div className="font-semibold text-slate-700">{item.updatedBy || "-"}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.updatedAt).toLocaleString("id-ID")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Hapus"
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
    </div>
  );
}
