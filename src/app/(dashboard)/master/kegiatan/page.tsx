"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Layers, Plus, Search, Pencil, Trash2 } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function MasterKegiatanPage() {
  const [items, setItems] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterProgramId, setFilterProgramId] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    programId: "",
    kd_kegiatan: "",
    nm_kegiatan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // State Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const programOptions = useMemo(
    () =>
      programs.map((p) => ({
        value: p.id,
        badge: p.kd_program,
        label: p.nm_program,
      })),
    [programs]
  );

  useEffect(() => {
    fetch("/api/master/program?all=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPrograms(json.data);
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
      if (filterProgramId) params.set("programId", filterProgramId);
      const res = await fetch(`/api/master/kegiatan?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filterProgramId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    setForm({
      programId: filterProgramId || (programs[0]?.id ?? ""),
      kd_kegiatan: "",
      nm_kegiatan: "",
    });
    setShowModal(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setErrorMsg("");
    setForm({
      programId: item.programId,
      kd_kegiatan: item.kd_kegiatan,
      nm_kegiatan: item.nm_kegiatan,
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
      const res = await fetch("/api/master/kegiatan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Gagal menyimpan Kegiatan");
      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Kegiatan Diperbarui" : "Kegiatan Ditambahkan",
        message: `Kegiatan [${form.kd_kegiatan}] ${form.nm_kegiatan} berhasil ${
          editItem ? "diperbarui" : "ditambahkan"
        }.`,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Kegiatan",
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
      const res = await fetch(`/api/master/kegiatan?id=${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || "Gagal menghapus Kegiatan");
      const deleted = deleteTarget;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Kegiatan Dihapus",
        message: `Kegiatan [${deleted.kd_kegiatan}] ${deleted.nm_kegiatan} telah berhasil dihapus.`,
      });
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Kegiatan",
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
            Master Kegiatan Daerah
          </h1>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Kegiatan
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
                placeholder="Cari kd_kegiatan atau nm_kegiatan..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
              />
            </div>

            <div className="w-full sm:w-80">
              <SearchableSelect
                options={programOptions}
                value={filterProgramId}
                onChange={(val) => {
                  setFilterProgramId(val);
                  setPage(1);
                }}
                clearLabel="- Semua Program -"
                placeholder="- Semua Program -"
                searchPlaceholder="Cari kode atau nama Program..."
              />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-[#991B1B]">{meta.total}</strong> Kegiatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5E0E14] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold w-44">Kode Kegiatan</th>
                <th className="px-4 py-3 font-semibold">Nama Kegiatan</th>
                <th className="px-4 py-3 font-semibold">Program</th>
                <th className="px-4 py-3 font-semibold text-center w-32">Sub Kegiatan</th>
                <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Memuat data Kegiatan...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data Kegiatan ditemukan.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[#991B1B]">
                      {item.kd_kegiatan}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.nm_kegiatan}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.program ? (
                        <span>
                          <strong className="font-mono text-slate-800">{item.program.kd_program}</strong>{" - "}
                          {item.program.nm_program}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#991B1B]">
                        {item._count?.subkegiatans ?? 0} Sub
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Edit Kegiatan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                          title="Hapus Kegiatan"
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
                {editItem ? `Update Kegiatan (${editItem.kd_kegiatan})` : "Tambah Kegiatan Baru"}
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
                  Program Induk *
                </label>
                <SearchableSelect
                  options={programOptions}
                  value={form.programId}
                  onChange={(val) => setForm({ ...form, programId: val })}
                  placeholder="- Pilih Program -"
                  searchPlaceholder="Cari kode atau nama Program..."
                  allowClear={false}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={form.kd_kegiatan}
                  onChange={(e) => setForm({ ...form, kd_kegiatan: e.target.value })}
                  placeholder="Contoh: 5.02.01.2.01"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kegiatan *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.nm_kegiatan}
                  onChange={(e) => setForm({ ...form, nm_kegiatan: e.target.value })}
                  placeholder="Contoh: Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah"
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
                  {submitting ? "Menyimpan..." : editItem ? "Simpan Perubahan" : "Simpan Kegiatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Kegiatan Daerah"
        entityName="Kegiatan"
        itemCode={deleteTarget?.kd_kegiatan}
        itemLabel={deleteTarget?.nm_kegiatan}
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
