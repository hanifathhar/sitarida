"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Save,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Settings2,
  Check,
} from "lucide-react";
import type { JenisLaporanKeuangan } from "@/modules/akuntansi/laporan-keuangan.templates";

interface MappingRow {
  id: string;
  jenisLaporan: JenisLaporanKeuangan;
  urutan: number;
  kodeBaris: string;
  uraian: string;
  tipeBaris: string;
  level: number;
  kodeRekening: string | null;
  posisiNormal: string;
  formula: string | null;
  isBold: boolean;
}

interface MappingLaporanModalProps {
  open: boolean;
  jenis: JenisLaporanKeuangan;
  onClose: () => void;
  onSaved: () => void;
}

export default function MappingLaporanModal({
  open,
  jenis,
  onClose,
  onSaved,
}: MappingLaporanModalProps) {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState<Partial<MappingRow> | null>(null);

  async function loadMapping() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/akuntansi/laporan-keuangan/mapping?jenis=${jenis}`);
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Gagal memuat mapping rekening.");
        return;
      }
      setRows(json.data || []);
    } catch {
      setErrorMsg("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadMapping();
    }
  }, [open, jenis]);

  if (!open) return null;

  async function handleSaveRow() {
    if (!editingRow) return;
    if (!editingRow.uraian?.trim()) {
      setErrorMsg("Uraian baris wajib diisi.");
      return;
    }

    setSavingId(editingRow.id || "NEW");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/akuntansi/laporan-keuangan/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingRow,
          jenisLaporan: jenis,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Gagal menyimpan baris mapping.");
        return;
      }
      setEditingRow(null);
      await loadMapping();
      onSaved();
    } catch {
      setErrorMsg("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus baris mapping ini?")) return;
    setSavingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/akuntansi/laporan-keuangan/mapping?id=${id}&jenis=${jenis}`,
        {
          method: "DELETE",
        }
      );
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Gagal menghapus baris.");
        return;
      }
      await loadMapping();
      onSaved();
    } catch {
      setErrorMsg("Terjadi kesalahan saat menghapus.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleResetDefault() {
    if (
      !confirm(
        `Reset semua mapping ${jenis} ke template standar Permen 90? Perubahan kustom akan diganti.`
      )
    ) {
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/akuntansi/laporan-keuangan/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", jenisLaporan: jenis }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Gagal mereset mapping.");
        return;
      }
      setRows(json.data || []);
      onSaved();
    } catch {
      setErrorMsg("Terjadi kesalahan saat reset.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.kodeBaris.toLowerCase().includes(q) ||
      r.uraian.toLowerCase().includes(q) ||
      (r.kodeRekening || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#5E0E14] text-white flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Mapping Rekening — Laporan {jenis}
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur kode rekening (pisahkan dengan koma jika lebih dari satu) atau rumus subtotal setiap baris laporan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setEditingRow({
                  jenisLaporan: jenis,
                  urutan: (rows[rows.length - 1]?.urutan || 0) + 10,
                  kodeBaris: "",
                  uraian: "",
                  tipeBaris: "DETAIL",
                  level: 3,
                  kodeRekening: "",
                  posisiNormal: "AUTO",
                  formula: "",
                  isBold: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5E0E14] hover:bg-[#46090E] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Inline Editor Form */}
        {editingRow && (
          <div className="mx-5 mt-3 p-4 rounded-xl border border-[#5E0E14]/25 bg-red-50/40 space-y-3 text-xs">
            <div className="font-bold text-[#5E0E14]">
              {editingRow.id ? "Edit Baris Mapping" : "Tambah Baris Mapping Baru"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Urutan</label>
                <input
                  type="number"
                  value={editingRow.urutan ?? 10}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, urutan: Number(e.target.value) }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Kode Baris
                </label>
                <input
                  type="text"
                  value={editingRow.kodeBaris ?? ""}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, kodeBaris: e.target.value }))
                  }
                  placeholder="cth: 4.1.01"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Uraian</label>
                <input
                  type="text"
                  value={editingRow.uraian ?? ""}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, uraian: e.target.value }))
                  }
                  placeholder="Nama pos laporan"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipe Baris
                </label>
                <select
                  value={editingRow.tipeBaris || "DETAIL"}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, tipeBaris: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="HEADER">HEADER</option>
                  <option value="DETAIL">DETAIL</option>
                  <option value="SUBTOTAL">SUBTOTAL</option>
                  <option value="TOTAL">TOTAL</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mapping Kode Rekening (pisahkan koma)
                </label>
                <input
                  type="text"
                  value={editingRow.kodeRekening ?? ""}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, kodeRekening: e.target.value }))
                  }
                  placeholder="cth: 4.1.01 atau 1.1.01.07,1.1.01.10"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Formula (opsional)
                </label>
                <input
                  type="text"
                  value={editingRow.formula ?? ""}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, formula: e.target.value }))
                  }
                  placeholder="cth: 4.1+4.2 atau 4-5"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Posisi Normal
                </label>
                <select
                  value={editingRow.posisiNormal || "AUTO"}
                  onChange={(e) =>
                    setEditingRow((prev) => ({ ...prev, posisiNormal: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="AUTO">AUTO (Sesuai Akun)</option>
                  <option value="DEBET">DEBET (D - K)</option>
                  <option value="KREDIT">KREDIT (K - D)</option>
                  <option value="MINUS_DEBET">MINUS DEBET (-(D - K))</option>
                  <option value="MINUS_KREDIT">MINUS KREDIT (-(K - D))</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(editingRow.isBold)}
                    onChange={(e) =>
                      setEditingRow((prev) => ({ ...prev, isBold: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#5E0E14]"
                  />
                  <span>Tebal (Bold)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingId !== null}
                onClick={handleSaveRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {savingId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Baris</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Table */}
        <div className="px-5 pt-3 pb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode baris, uraian, atau kode rekening..."
            className="w-full sm:w-80 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-auto px-5 pb-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#5E0E14]" />
              Memuat tabel mapping...
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 z-10">
                <tr>
                  <th className="border border-slate-200 px-2.5 py-2 text-center w-14">Urut</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-left w-24">Kode</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-left">Uraian</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-center w-24">Tipe</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-left w-48">
                    Mapping Rekening
                  </th>
                  <th className="border border-slate-200 px-2.5 py-2 text-left w-36">Formula</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-center w-24">Posisi</th>
                  <th className="border border-slate-200 px-2.5 py-2 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 ${r.isBold ? "bg-slate-50/70 font-semibold" : ""}`}
                  >
                    <td className="border border-slate-200 px-2.5 py-1.5 text-center font-mono">
                      {r.urutan}
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5 font-mono">
                      {r.kodeBaris || "-"}
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5">{r.uraian}</td>
                    <td className="border border-slate-200 px-2.5 py-1.5 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono">
                        {r.tipeBaris}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-emerald-800">
                      {r.kodeRekening || "-"}
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-blue-700">
                      {r.formula || "-"}
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5 text-center text-[11px]">
                      {r.posisiNormal}
                    </td>
                    <td className="border border-slate-200 px-2.5 py-1.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingRow(r)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={savingId === r.id}
                          onClick={() => handleDelete(r.id)}
                          className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Total {rows.length} baris konfigurasi.</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Selesai</span>
          </button>
        </div>
      </div>
    </div>
  );
}
