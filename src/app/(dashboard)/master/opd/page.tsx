"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface UrusanOption {
  id: string;
  kd_urusan1: string;
  nm_urusan1: string;
  kd_urusan2: string;
  nm_urusan2: string;
}

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan: string | null;
  kd_urusan: string | null;
  nm_urusan: string | null;
  kepalaNama: string | null;
  kepalaNip: string | null;
  alamat: string | null;
  _count: { unitKerjas: number; users: number };
}

export default function OpdPage() {
  const [items, setItems] = useState<OpdItem[]>([]);
  const [urusanOptions, setUrusanOptions] = useState<UrusanOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [search, setSearch] = useState("");
  const [urusanFilter, setUrusanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Form Input / Update
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kdSkpd, setKdSkpd] = useState("");
  const [nmSkpd, setNmSkpd] = useState("");
  const [singkatan, setSingkatan] = useState("");
  const [kdUrusan, setKdUrusan] = useState("");
  const [nmUrusan, setNmUrusan] = useState("");
  const [kepalaNama, setKepalaNama] = useState("");
  const [kepalaNip, setKepalaNip] = useState("");
  const [alamat, setAlamat] = useState("");

  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // State Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<OpdItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const urusanSelectOptions = useMemo(
    () =>
      urusanOptions.map((u) => ({
        value: u.kd_urusan2,
        badge: u.kd_urusan2,
        label: u.nm_urusan2,
        subLabel: u.nm_urusan1,
      })),
    [urusanOptions]
  );

  async function fetchOpd(p = page, l = limit, q = search, urusan = urusanFilter) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: String(l),
    });
    if (q) params.set("search", q);
    if (urusan) params.set("kd_urusan", urusan);

    const res = await fetch(`/api/master/opd?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setItems(json.data);
      if (json.pagination) {
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOpd();
    fetch("/api/master/urusan")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setUrusanOptions(json.data);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setKdSkpd("");
    setNmSkpd("");
    setSingkatan("");
    setKdUrusan("");
    setNmUrusan("");
    setKepalaNama("");
    setKepalaNip("");
    setAlamat("");
    setShowForm(true);
    setFeedback(null);
  }

  function openEditForm(opd: OpdItem) {
    setEditingId(opd.id);
    setKdSkpd(opd.kd_skpd);
    setNmSkpd(opd.nm_skpd);
    setSingkatan(opd.singkatan || "");
    setKdUrusan(opd.kd_urusan || "");
    setNmUrusan(opd.nm_urusan || "");
    setKepalaNama(opd.kepalaNama || "");
    setKepalaNip(opd.kepalaNip || "");
    setAlamat(opd.alamat || "");
    setShowForm(true);
    setFeedback(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const payload = {
      id: editingId || undefined,
      kd_skpd: kdSkpd,
      nm_skpd: nmSkpd,
      singkatan,
      kd_urusan: kdUrusan,
      nm_urusan: nmUrusan,
      kepalaNama,
      kepalaNip,
      alamat,
    };

    const res = await fetch("/api/master/opd", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan OPD",
        message: json.message || json.error?.message || "Gagal menyimpan data OPD",
      });
      return;
    }

    setFeedback({
      type: "success",
      title: editingId ? "OPD Diperbarui" : "OPD Ditambahkan",
      message: editingId
        ? `Data OPD [${kdSkpd}] '${nmSkpd}' berhasil diperbarui.`
        : `Data OPD [${kdSkpd}] '${nmSkpd}' berhasil ditambahkan.`,
    });
    setShowForm(false);
    setEditingId(null);
    fetchOpd(page, limit, search, urusanFilter);
  }

  function handleDelete(opd: OpdItem) {
    setDeleteTarget(opd);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setFeedback(null);

    const res = await fetch(`/api/master/opd?id=${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.message || json.error?.message || "Gagal menghapus OPD";
      setDeleteError(msg);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus OPD",
        message: msg,
      });
      setDeleting(false);
      return;
    }
    setFeedback({
      type: "success",
      title: "OPD Dihapus",
      message: `OPD [${deleteTarget.kd_skpd}] '${deleteTarget.nm_skpd}' berhasil dihapus.`,
    });
    setDeleteTarget(null);
    setDeleting(false);
    fetchOpd(page, limit, search, urusanFilter);
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-[#5E0E14] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#991B1B]" />
            <span>Master Perangkat Daerah / OPD</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah OPD Baru</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-red-200 p-5 space-y-4 shadow-cakra-card"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-extrabold text-[#5E0E14]">
              {editingId ? "Edit Data Perangkat Daerah (OPD)" : "Tambah Perangkat Daerah (OPD) Baru"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 text-gray-400 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kode SKPD / OPD
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 2.09.0.00.0.00.01.0000"
                value={kdSkpd}
                onChange={(e) => setKdSkpd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Perangkat Daerah
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Dinas Ketahanan Pangan"
                value={nmSkpd}
                onChange={(e) => setNmSkpd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Singkatan
              </label>
              <input
                type="text"
                placeholder="Contoh: DISHANPAN"
                value={singkatan}
                onChange={(e) => setSingkatan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Pilih Urusan (`kd_urusan`)
              </label>
              <SearchableSelect
                options={urusanSelectOptions}
                value={kdUrusan}
                onChange={(selectedKode) => {
                  setKdUrusan(selectedKode);
                  const found = urusanOptions.find((u) => u.kd_urusan2 === selectedKode);
                  if (found) {
                    setNmUrusan(found.nm_urusan2);
                  } else if (!selectedKode) {
                    setNmUrusan("");
                  }
                }}
                clearLabel="- Pilih Urusan -"
                placeholder="- Pilih Urusan -"
                searchPlaceholder="Cari kode atau nama Urusan..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Urusan
              </label>
              <input
                type="text"
                readOnly
                placeholder="Terisi otomatis dari pilihan ms_urusan"
                value={nmUrusan}
                onChange={(e) => setNmUrusan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Kepala OPD
              </label>
              <input
                type="text"
                placeholder="Nama lengkap beserta gelar"
                value={kepalaNama}
                onChange={(e) => setKepalaNama(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                NIP
              </label>
              <input
                type="text"
                placeholder="18 digit NIP"
                value={kepalaNip}
                onChange={(e) => setKepalaNip(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Alamat Kantor
              </label>
              <input
                type="text"
                placeholder="Komplek Perkantoran Pemerintahan Tapanuli Selatan, Sipirok"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold cursor-pointer"
            >
              {editingId ? "Simpan Perubahan" : "Simpan OPD"}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-80">
            <SearchableSelect
              options={urusanSelectOptions}
              value={urusanFilter}
              onChange={(val) => {
                setUrusanFilter(val);
                setPage(1);
                fetchOpd(1, limit, search, val);
              }}
              clearLabel="Semua Urusan"
              placeholder="Semua Urusan"
              searchPlaceholder="Cari kode atau nama Urusan..."
            />
          </div>

          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kd_skpd, nm_skpd, singkatan, atau kepala OPD..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                fetchOpd(1, limit, e.target.value, urusanFilter);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabel OPD + Pagination */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-cakra-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#991B1B] text-white text-[11px] font-bold uppercase">
                <th className="py-3 px-4">Kode SKPD (kd_skpd)</th>
                <th className="py-3 px-4">Nama Perangkat Daerah (nm_skpd)</th>
                <th className="py-3 px-4">Kepala OPD & NIP</th>
                <th className="py-3 px-4">Statistik Unit & Pengguna</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Memuat data OPD...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Tidak ada data Perangkat Daerah yang sesuai filter.
                  </td>
                </tr>
              ) : (
                items.map((opd) => (
                  <tr key={opd.id} className="hover:bg-red-50/30">
                    <td className="py-3 px-4 font-mono font-bold text-[#5E0E14]">
                      {opd.kd_skpd}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">
                        {opd.nm_skpd}{" "}
                        {opd.singkatan && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-red-50 text-[#991B1B] text-[10px]">
                            {opd.singkatan}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {opd.kd_urusan
                          ? `${opd.kd_urusan} - ${opd.nm_urusan || ""}`
                          : opd.nm_urusan || opd.alamat || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800">
                        {opd.kepalaNama || "-"}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500">
                        {opd.kepalaNip ? `NIP. ${opd.kepalaNip}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold">
                          {opd._count?.unitKerjas ?? 0} Unit
                        </span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold">
                          {opd._count?.users ?? 0} Pengguna
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(opd)}
                          className="p-1.5 rounded border border-gray-300 hover:bg-amber-50 hover:border-amber-400 text-amber-700 cursor-pointer"
                          title="Edit OPD"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(opd)}
                          className="p-1.5 rounded border border-gray-300 hover:bg-red-50 hover:border-red-400 text-red-700 cursor-pointer"
                          title="Hapus OPD"
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
          onPageChange={(newPage) => {
            setPage(newPage);
            fetchOpd(newPage, limit, search, urusanFilter);
          }}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
            fetchOpd(1, newLimit, search, urusanFilter);
          }}
        />
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Perangkat Daerah (OPD)"
        entityName="Perangkat Daerah (OPD)"
        itemCode={deleteTarget?.kd_skpd}
        itemLabel={deleteTarget?.nm_skpd}
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
