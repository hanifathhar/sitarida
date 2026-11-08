"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Layers, Plus, Search, Pencil, Trash2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function MasterSubkegiatanPage() {
  const [items, setItems] = useState<any[]>([]);
  const [kegiatans, setKegiatans] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKegiatanId, setFilterKegiatanId] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    kegiatanId: "",
    kd_sub_kegiatan: "",
    nm_sub_kegiatan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const kegiatanOptions = useMemo(
    () =>
      kegiatans.map((k) => ({
        value: k.id,
        badge: k.kd_kegiatan,
        label: k.nm_kegiatan,
      })),
    [kegiatans]
  );

  useEffect(() => {
    fetch("/api/master/kegiatan?all=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setKegiatans(json.data);
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });
      if (filterKegiatanId) params.set("kegiatanId", filterKegiatanId);
      const res = await fetch(`/api/master/subkegiatan?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filterKegiatanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    setForm({
      kegiatanId: filterKegiatanId || (kegiatans[0]?.id ?? ""),
      kd_sub_kegiatan: "",
      nm_sub_kegiatan: "",
    });
    setShowModal(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setErrorMsg("");
    setForm({
      kegiatanId: item.kegiatanId,
      kd_sub_kegiatan: item.kd_sub_kegiatan,
      nm_sub_kegiatan: item.nm_sub_kegiatan,
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
      const res = await fetch("/api/master/subkegiatan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || json.message || "Gagal menyimpan Sub Kegiatan");
      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Sub Kegiatan Diperbarui" : "Sub Kegiatan Ditambahkan",
        message: `Sub Kegiatan [${form.kd_sub_kegiatan}] ${form.nm_sub_kegiatan} berhasil ${
          editItem ? "diperbarui" : "ditambahkan"
        }.`,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Sub Kegiatan",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(item: any) {
    setDeleteError(null);
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/master/subkegiatan?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || json.message || "Gagal menghapus Sub Kegiatan");
      const deleted = deleteTarget;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Sub Kegiatan Dihapus",
        message: `Sub Kegiatan [${deleted.kd_sub_kegiatan}] ${deleted.nm_sub_kegiatan} telah berhasil dihapus.`,
      });
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Sub Kegiatan",
        message: err.message,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#991B1B]" />
            Master Sub Kegiatan
          </h1>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Sub Kegiatan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                placeholder="Cari kd_sub_kegiatan atau nm_sub_kegiatan..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
              />
            </div>

            <div className="w-full sm:w-80">
              <SearchableSelect
                options={kegiatanOptions}
                value={filterKegiatanId}
                onChange={(val) => {
                  setFilterKegiatanId(val);
                  setPage(1);
                }}
                clearLabel="- Semua Kegiatan -"
                placeholder="- Semua Kegiatan -"
                searchPlaceholder="Cari kode atau nama Kegiatan..."
              />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-[#991B1B]">{meta.total}</strong> Sub Kegiatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5E0E14] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold w-48">Kode Sub Kegiatan</th>
                <th className="px-4 py-3 font-semibold">Nama Sub Kegiatan</th>
                <th className="px-4 py-3 font-semibold">Kegiatan</th>
                <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Memuat data Sub Kegiatan...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data Sub Kegiatan ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[#991B1B]">
                      {item.kd_sub_kegiatan}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.nm_sub_kegiatan}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.kegiatan ? (
                        <span>
                          <strong className="font-mono text-slate-800">
                            {item.kegiatan.kd_kegiatan}
                          </strong>{" - "}
                          {item.kegiatan.nm_kegiatan}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Edit Sub Kegiatan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                          title="Hapus Sub Kegiatan"
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
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-slate-200">
            <div className="px-6 py-4 bg-[#991B1B] text-white rounded-t-xl flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editItem
                  ? `Update Sub Kegiatan (${editItem.kd_sub_kegiatan})`
                  : "Tambah Sub Kegiatan Baru"}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kegiatan Induk *
                </label>
                <SearchableSelect
                  options={kegiatanOptions}
                  value={form.kegiatanId}
                  onChange={(val) => setForm({ ...form, kegiatanId: val })}
                  placeholder="- Pilih Kegiatan -"
                  searchPlaceholder="Cari kode atau nama Kegiatan..."
                  allowClear={false}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Sub Kegiatan  *
                </label>
                <input
                  type="text"
                  required
                  value={form.kd_sub_kegiatan}
                  onChange={(e) => setForm({ ...form, kd_sub_kegiatan: e.target.value })}
                  placeholder="Contoh: 5.02.01.2.01.0001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sub Kegiatan  *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.nm_sub_kegiatan}
                  onChange={(e) => setForm({ ...form, nm_sub_kegiatan: e.target.value })}
                  placeholder="Contoh: Penyusunan Dokumen Perencanaan Perangkat Daerah"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
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
                      : "Simpan Sub Kegiatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Sub Kegiatan"
        entityName="Sub Kegiatan"
        itemCode={deleteTarget?.kd_sub_kegiatan}
        itemLabel={deleteTarget?.nm_sub_kegiatan}
        description="Penghapusan Sub Kegiatan hanya dapat dilakukan apabila belum digunakan pada dokumen anggaran."
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
