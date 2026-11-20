"use client";

import { useState, useEffect, useCallback } from "react";
import { Landmark, Plus, Search, Pencil, Trash2, X } from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";

export default function MasterBankPage() {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    kode: "",
    nama: "",
    jns_rekening: "BANK" as "BANK" | "BILLER",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        jns_rekening: filterJenis,
      });
      const res = await fetch(`/api/master/bank?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setMeta(json.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, filterJenis]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    setForm({
      kode: "",
      nama: "",
      jns_rekening: "BANK",
      isActive: true,
    });
    setShowModal(true);
  }

  function openEdit(item: any) {
    setEditItem(item);
    setErrorMsg("");
    setForm({
      kode: item.kode,
      nama: item.nama,
      jns_rekening: item.jns_rekening === "BILLER" ? "BILLER" : "BANK",
      isActive: Boolean(item.isActive),
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
      const res = await fetch("/api/master/bank", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || json.error || json.message || "Gagal menyimpan Master Bank"
        );
      }
      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Master Bank Diperbarui" : "Master Bank Ditambahkan",
        message: `Data [${form.kode}] ${form.nama} (${form.jns_rekening}) berhasil ${editItem ? "diperbarui" : "ditambahkan"
          }.`,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/master/bank?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message || json.error || json.message || "Gagal menghapus Master Bank"
        );
      }
      setFeedback({
        type: "success",
        title: "Master Bank Dihapus",
        message: `Data [${deleteTarget.kode}] ${deleteTarget.nama} berhasil dihapus.`,
      });
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#5E0E14] to-[#88131A] text-white shadow-sm">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Master Bank &amp; Biller</h1>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md hover:opacity-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Bank / Biller
        </button>
      </div>

      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode atau nama bank / biller..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Jenis:</span>
          <select
            value={filterJenis}
            onChange={(e) => {
              setFilterJenis(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#88131A] font-semibold text-slate-700"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="BANK">BANK</option>
            <option value="BILLER">BILLER</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-12">No</th>
                <th className="px-4 py-3 w-36">Kode</th>
                <th className="px-4 py-3">Nama Bank / Biller</th>
                <th className="px-4 py-3 text-center w-32">Jenis Rekening</th>
                <th className="px-4 py-3 text-center w-28">Status</th>
                <th className="px-4 py-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Memuat data Master Bank...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Belum ada data Master Bank / Biller.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-slate-400">
                      {(meta.page - 1) * meta.limit + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#5E0E14]">
                      {item.kode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.nama}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${item.jns_rekening === "BILLER"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-teal-50 text-teal-800 border-teal-200"
                          }`}
                      >
                        {item.jns_rekening}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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
          onPageChange={setPage}
        />
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editItem ? "Edit Master Bank / Biller" : "Tambah Master Bank / Biller"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  placeholder="Contoh: 117 / 014 / BILLER01"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Bank / Biller <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: PT. BANK SUMUT"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Rekening <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.jns_rekening}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jns_rekening: e.target.value as "BANK" | "BILLER",
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#88131A]"
                >
                  <option value="BANK">BANK</option>
                  <option value="BILLER">BILLER</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-[#5E0E14]"
                />
                <span>Status Aktif</span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Master Bank"
        entityName="Master Bank"
        itemCode={deleteTarget?.kode}
        itemLabel={deleteTarget?.nama}
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
