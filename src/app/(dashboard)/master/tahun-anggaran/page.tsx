"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Search, Pencil, Trash2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface TahunAnggaranItem {
  id: string;
  tahun: number;
  nama: string;
  tahapAktif: "MURNI" | "PERGESERAN" | "PERUBAHAN";
  status: "PERSIAPAN" | "AKTIF" | "DITUTUP";
  isDefault: boolean;
  keterangan: string | null;
}

const TAHAP_OPTIONS = [
  { value: "MURNI", badge: "MURNI", label: "APBD Murni" },
  { value: "PERGESERAN", badge: "PERGESERAN", label: "Pergeseran Anggaran" },
  { value: "PERUBAHAN", badge: "PERUBAHAN", label: "Perubahan APBD (P-APBD)" },
];

const STATUS_OPTIONS = [
  { value: "PERSIAPAN", badge: "PERSIAPAN", label: "Persiapan Penyusunan" },
  { value: "AKTIF", badge: "AKTIF", label: "Aktif Berjalan" },
  { value: "DITUTUP", badge: "DITUTUP", label: "Ditutup / Selesai" },
];

export default function TahunAnggaranPage() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<TahunAnggaranItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal Form (Tambah & Edit)
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TahunAnggaranItem | null>(null);
  const [form, setForm] = useState<{
    tahun: number;
    nama: string;
    tahapAktif: "MURNI" | "PERGESERAN" | "PERUBAHAN";
    status: "PERSIAPAN" | "AKTIF" | "DITUTUP";
    isDefault: boolean;
    keterangan: string;
  }>({
    tahun: 2027,
    nama: "Tahun Anggaran 2027",
    tahapAktif: "MURNI",
    status: "PERSIAPAN",
    isDefault: false,
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Banner & Confirm Delete
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TahunAnggaranItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/master/tahun-anggaran");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllItems(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        String(item.tahun).includes(q) ||
        item.nama.toLowerCase().includes(q) ||
        item.tahapAktif.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(q))
    );
  }, [allItems, search]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * limit, page * limit),
    [filteredItems, page, limit]
  );

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    const nextYear =
      allItems.length > 0 ? Math.max(...allItems.map((i) => i.tahun)) + 1 : 2027;
    setForm({
      tahun: nextYear,
      nama: `Tahun Anggaran ${nextYear}`,
      tahapAktif: "MURNI",
      status: "PERSIAPAN",
      isDefault: false,
      keterangan: "",
    });
    setShowModal(true);
  }

  function openEdit(item: TahunAnggaranItem) {
    setEditItem(item);
    setErrorMsg("");
    setForm({
      tahun: item.tahun,
      nama: item.nama,
      tahapAktif: item.tahapAktif,
      status: item.status,
      isDefault: item.isDefault,
      keterangan: item.keterangan || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const method = editItem ? "PUT" : "POST";
      const payload = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch("/api/master/tahun-anggaran", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menyimpan Tahun Anggaran"
        );
      }
      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Tahun Anggaran Diperbarui" : "Tahun Anggaran Ditambahkan",
        message: `Tahun Anggaran [${form.tahun}] ${form.nama} berhasil ${
          editItem ? "diperbarui" : "ditambahkan"
        }.`,
      });
      fetchData();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Tahun Anggaran",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(item: TahunAnggaranItem) {
    setDeleteError(null);
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/master/tahun-anggaran?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menghapus Tahun Anggaran"
        );
      }
      const deleted = deleteTarget;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Tahun Anggaran Dihapus",
        message: `Tahun Anggaran [${deleted.tahun}] ${deleted.nama} telah berhasil dihapus.`,
      });
      fetchData();
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Tahun Anggaran",
        message: err.message,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#991B1B]" />
            Master Tahun Anggaran
          </h1>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Tahun Anggaran
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari tahun, nama periode, tahap, atau keterangan..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
              />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-[#991B1B]">{total}</strong> Tahun Anggaran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5E0E14] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold w-36">Tahun</th>
                <th className="px-4 py-3 font-semibold">Nama Periode & Keterangan</th>
                <th className="px-4 py-3 font-semibold text-center w-36">Tahap Aktif</th>
                <th className="px-4 py-3 font-semibold text-center w-32">Status</th>
                <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Memuat data Tahun Anggaran...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data Tahun Anggaran ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[#991B1B]">
                      <div className="flex items-center gap-2">
                        <span>{item.tahun}</span>
                        {item.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#991B1B] border border-red-200 font-sans text-[10px] font-bold">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.nama}</div>
                      {item.keterangan && (
                        <div className="text-xs text-slate-500 mt-0.5">{item.keterangan}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-[#991B1B] border border-red-200">
                        {item.tahapAktif}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.status === "AKTIF"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "PERSIAPAN"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Edit Tahun Anggaran"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                          title="Hapus Tahun Anggaran"
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

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal Form Input / Update (Gaya Sumber Dana) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200">
            <div className="px-6 py-4 bg-[#991B1B] text-white rounded-t-xl flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editItem
                  ? `Update Tahun Anggaran (${editItem.tahun})`
                  : "Tambah Tahun Anggaran"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Anggaran *
                  </label>
                  <input
                    type="number"
                    required
                    value={form.tahun}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setForm({
                        ...form,
                        tahun: val,
                        nama: editItem ? form.nama : `Tahun Anggaran ${val}`,
                      });
                    }}
                    placeholder="Contoh: 2026"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Periode *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    placeholder="Contoh: Tahun Anggaran 2026"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahap Anggaran *
                  </label>
                  <SearchableSelect
                    options={TAHAP_OPTIONS}
                    value={form.tahapAktif}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        tahapAktif: val as "MURNI" | "PERGESERAN" | "PERUBAHAN",
                      })
                    }
                    placeholder="- Pilih Tahap -"
                    searchPlaceholder="Cari tahap anggaran..."
                    allowClear={false}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Periode *
                  </label>
                  <SearchableSelect
                    options={STATUS_OPTIONS}
                    value={form.status}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        status: val as "PERSIAPAN" | "AKTIF" | "DITUTUP",
                      })
                    }
                    placeholder="- Pilih Status -"
                    searchPlaceholder="Cari status periode..."
                    allowClear={false}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Kebijakan Anggaran
                </label>
                <textarea
                  rows={2}
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Contoh: Penyusunan APBD Murni Kabupaten Tapanuli Selatan..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="taDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-slate-300 text-[#991B1B]"
                />
                <label htmlFor="taDefault" className="text-xs font-medium text-slate-700">
                  Jadikan Tahun Anggaran Default saat pengguna login
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Menyimpan..."
                    : editItem
                      ? "Simpan Perubahan"
                      : "Simpan Tahun Anggaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Tahun Anggaran"
        entityName="Tahun Anggaran"
        itemCode={deleteTarget ? String(deleteTarget.tahun) : undefined}
        itemLabel={deleteTarget?.nama}
        description="Tahun Anggaran yang berstatus Default tidak dapat dihapus sebelum memindahkan Default ke periode tahun lain."
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
