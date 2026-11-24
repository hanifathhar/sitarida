"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  Save,
  RefreshCw,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
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

  const formatAngka = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Form Input Saldo Awal Kasda */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5E0E14]/10 text-[#5E0E14] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Input Saldo Awal BKU BUD (Saldo Kasda)
              </h2>
              <p className="text-[11px] text-slate-500">
                Saldo awal per Tahun Anggaran dihitung sebagai dasar saldo awal BKU BUD dan berlanjut otomatis menjadi saldo awal bulan-bulan berikutnya.
              </p>
            </div>
          </div>

          <Link
            href="/penatausahaan/bud/bku"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke BKU BUD</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Tahun Anggaran (Sesi Login)
            </label>
            <input
              type="number"
              readOnly
              disabled
              value={tahunAnggaran}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Nilai Saldo Awal Kasda (Rp)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Contoh: 256144648034.85"
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-[#5E0E14] focus:outline-none"
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
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#5E0E14] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] disabled:opacity-60 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Saldo Awal Kasda"}</span>
          </button>
        </div>
      </form>

      {/* Tabel Saldo Kasda */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Tabel Saldo Kasda (Saldo Awal BKU BUD)
            </h3>
            <p className="text-[11px] text-slate-500">
              Daftar saldo awal kas daerah yang tercatat per Tahun Anggaran
            </p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-14">No</th>
                <th className="px-4 py-3 text-center w-32">Tahun Anggaran</th>
                <th className="px-4 py-3 text-right w-56">Saldo Awal Kasda (Rp)</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 w-44">Diperbarui Oleh</th>
                <th className="px-4 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data Saldo Kasda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data Saldo Awal Kasda yang diinput.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      TA {item.tahunAnggaran}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                      {formatAngka(item.nilai)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.keterangan || <span className="italic text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      <div>{item.updatedBy || "-"}</div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
