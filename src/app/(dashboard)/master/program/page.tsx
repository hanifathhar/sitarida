"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Layers, Plus, Search, Pencil, Trash2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function MasterProgramPage() {
  const [items, setItems] = useState<any[]>([]);
  const [urusans, setUrusans] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKdUrusan, setFilterKdUrusan] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    kd_program: "",
    nm_program: "",
    kd_urusan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // State Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const urusanOptions = useMemo(
    () =>
      urusans.map((u) => ({
        value: u.kd_urusan2,
        badge: u.kd_urusan2,
        label: u.nm_urusan2,
        subLabel: u.nm_urusan1,
      })),
    [urusans]
  );

  useEffect(() => {
    fetch("/api/master/urusan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setUrusans(json.data);
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
      if (filterKdUrusan) params.set("kd_urusan", filterKdUrusan);
      const res = await fetch(`/api/master/program?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filterKdUrusan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    setForm({ kd_program: "", nm_program: "", kd_urusan: filterKdUrusan || "" });
    setShowModal(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setErrorMsg("");
    setForm({
      kd_program: item.kd_program,
      nm_program: item.nm_program,
      kd_urusan: item.kd_urusan || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const method = editItem ? "PUT" : "POST";
      const payload = editItem
        ? { id: editItem.id, ...form, kd_urusan: form.kd_urusan || null }
        : { ...form, kd_urusan: form.kd_urusan || null };
      const res = await fetch("/api/master/program", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Gagal menyimpan Program");
      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Program Diperbarui" : "Program Ditambahkan",
        message: `Program [${form.kd_program}] ${form.nm_program} berhasil ${
          editItem ? "diperbarui" : "ditambahkan"
        }.`,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Program",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(item: any) {
    setDeleteTarget(item);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/master/program?id=${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Gagal menghapus Program");
      const deleted = deleteTarget;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Program Dihapus",
        message: `Program [${deleted.kd_program}] ${deleted.nm_program} telah berhasil dihapus.`,
      });
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Program",
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
            Master Program Pembangunan Daerah
          </h1>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Program
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
                placeholder="Cari kd_program atau nm_program..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
              />
            </div>

            <div className="w-full sm:w-80">
              <SearchableSelect
                options={urusanOptions}
                value={filterKdUrusan}
                onChange={(val) => {
                  setFilterKdUrusan(val);
                  setPage(1);
                }}
                clearLabel="- Semua Urusan -"
                placeholder="- Semua Urusan -"
                searchPlaceholder="Cari kode atau nama Urusan..."
              />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-[#991B1B]">{meta.total}</strong> Program
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5E0E14] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold w-44">Kode Program</th>
                <th className="px-4 py-3 font-semibold">Nama Program</th>
                <th className="px-4 py-3 font-semibold">Nama Urusan</th>
                <th className="px-4 py-3 font-semibold text-center w-28">Jml Kegiatan</th>
                <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Memuat data Program...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data Program ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const urusanObj = urusans.find((u) => u.kd_urusan2 === item.kd_urusan);
                  return (
                    <tr key={item.id} className="hover:bg-red-50/30 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#991B1B]">
                        {item.kd_program}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.nm_program}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.kd_urusan ? (
                          <span>
                            {urusanObj ? ` ${urusanObj.nm_urusan2}` : ""}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#991B1B]">
                          {item._count?.kegiatans ?? 0} Kegiatan
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                            title="Edit Program"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                            title="Hapus Program"
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
                {editItem ? `Update Program (${editItem.kd_program})` : "Tambah Program Baru"}
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
                  Urusan
                </label>
                <SearchableSelect
                  options={urusanOptions}
                  value={form.kd_urusan}
                  onChange={(val) => setForm({ ...form, kd_urusan: val })}
                  clearLabel="- Pilih Urusan -"
                  placeholder="- Pilih Urusan -"
                  searchPlaceholder="Cari kode atau nama Urusan..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Program *
                </label>
                <input
                  type="text"
                  required
                  value={form.kd_program}
                  onChange={(e) => setForm({ ...form, kd_program: e.target.value })}
                  placeholder="Contoh: 5.02.01"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Program *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.nm_program}
                  onChange={(e) => setForm({ ...form, nm_program: e.target.value })}
                  placeholder="Contoh: PROGRAM PENUNJANG URUSAN PEMERINTAHAN DAERAH KABUPATEN/KOTA"
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
                  {submitting ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Simpan Program"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Program Pembangunan"
        entityName="Program"
        itemCode={deleteTarget?.kd_program}
        itemLabel={deleteTarget?.nm_program}
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
