"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  GitBranch,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Landmark,
} from "lucide-react";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface OpdOption {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan: string | null;
}

interface UnitItem {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
  skpdbank: string | null;
  bank_penerima: string | null;
  rek_penerima: string | null;
  nama_penerima: string | null;
  kepalaNama: string | null;
  kepalaNip: string | null;
  alamat: string | null;
  opd: OpdOption;
}

export default function MasterUnitPage() {
  const [items, setItems] = useState<UnitItem[]>([]);
  const [opdOptions, setOpdOptions] = useState<OpdOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [opdFilter, setOpdFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Form Input / Update
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opdId, setOpdId] = useState("");
  const [kdUnit, setKdUnit] = useState("");
  const [nmUnit, setNmUnit] = useState("");
  const [skpdbank, setSkpdbank] = useState("");
  const [bankPenerima, setBankPenerima] = useState("");
  const [rekPenerima, setRekPenerima] = useState("");
  const [namaPenerima, setNamaPenerima] = useState("");
  const [kepalaNama, setKepalaNama] = useState("");
  const [kepalaNip, setKepalaNip] = useState("");
  const [alamat, setAlamat] = useState("");

  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // State Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<UnitItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const opdSelectOptions = useMemo(
    () =>
      opdOptions.map((o) => ({
        value: o.id,
        badge: o.kd_skpd,
        label: o.nm_skpd,
        subLabel: o.singkatan || undefined,
      })),
    [opdOptions]
  );

  async function fetchOpds() {
    const res = await fetch("/api/master/opd?limit=100");
    const json = await res.json();
    if (json.success) {
      setOpdOptions(json.data);
      if (json.data.length > 0 && !opdId) {
        setOpdId(json.data[0].id);
      }
    }
  }

  async function fetchUnits(p = page, l = limit, q = search, opd = opdFilter) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(p),
      limit: String(l),
    });
    if (q) params.set("search", q);
    if (opd) params.set("opdId", opd);

    const res = await fetch(`/api/master/unit-kerja?${params.toString()}`);
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
    fetchOpds();
    fetchUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateForm() {
    setEditingId(null);
    if (opdOptions.length > 0) {
      setOpdId(opdOptions[0].id);
      setKdUnit(`${opdOptions[0].kd_skpd}.00`);
    } else {
      setKdUnit("");
    }
    setNmUnit("");
    setSkpdbank("");
    setBankPenerima("BANK SUMUT CABANG SIPIROK");
    setRekPenerima("");
    setNamaPenerima("");
    setKepalaNama("");
    setKepalaNip("");
    setAlamat("");
    setShowForm(true);
    setFeedback(null);
  }

  function openEditForm(u: UnitItem) {
    setEditingId(u.id);
    setOpdId(u.opdId);
    setKdUnit(u.kd_unit);
    setNmUnit(u.nm_unit);
    setSkpdbank(u.skpdbank || "");
    setBankPenerima(u.bank_penerima || "");
    setRekPenerima(u.rek_penerima || "");
    setNamaPenerima(u.nama_penerima || "");
    setKepalaNama(u.kepalaNama || "");
    setKepalaNip(u.kepalaNip || "");
    setAlamat(u.alamat || "");
    setShowForm(true);
    setFeedback(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const payload = {
      id: editingId || undefined,
      opdId,
      kd_unit: kdUnit,
      nm_unit: nmUnit,
      skpdbank,
      bank_penerima: bankPenerima,
      rek_penerima: rekPenerima,
      nama_penerima: namaPenerima,
      kepalaNama,
      kepalaNip,
      alamat,
    };

    const res = await fetch("/api/master/unit-kerja", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Unit Kerja",
        message: json.message || json.error?.message || "Gagal menyimpan Unit Kerja",
      });
      return;
    }

    setFeedback({
      type: "success",
      title: editingId ? "Unit Kerja Diperbarui" : "Unit Kerja Ditambahkan",
      message: editingId
        ? `Unit Kerja [${kdUnit}] '${nmUnit}' berhasil diperbarui.`
        : `Unit Kerja [${kdUnit}] '${nmUnit}' berhasil ditambahkan.`,
    });
    setShowForm(false);
    setEditingId(null);
    fetchUnits(page, limit, search, opdFilter);
  }

  function handleDelete(u: UnitItem) {
    setDeleteTarget(u);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setFeedback(null);

    const res = await fetch(`/api/master/unit-kerja?id=${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.message || json.error?.message || "Gagal menghapus Unit Kerja";
      setDeleteError(msg);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Unit Kerja",
        message: msg,
      });
      setDeleting(false);
      return;
    }
    setFeedback({
      type: "success",
      title: "Unit Kerja Dihapus",
      message: `Unit Kerja [${deleteTarget.kd_unit}] '${deleteTarget.nm_unit}' berhasil dihapus.`,
    });
    setDeleteTarget(null);
    setDeleting(false);
    fetchUnits(page, limit, search, opdFilter);
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-extrabold text-[#5E0E14] flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#991B1B]" />
            <span>Master Unit Kerja</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Unit Kerja</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-red-200 p-5 space-y-4 shadow-cakra-card"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-extrabold text-[#5E0E14]">
              {editingId ? "Edit Data Unit Kerja (ms_unit)" : "Tambah Unit Kerja Baru (ms_unit)"}
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Perangkat Daerah
              </label>
              <SearchableSelect
                options={opdSelectOptions}
                value={opdId}
                onChange={(val) => {
                  setOpdId(val);
                  const found = opdOptions.find((o) => o.id === val);
                  if (found && !editingId) {
                    setKdUnit(`${found.kd_skpd}.00`);
                  }
                }}
                placeholder="- Pilih Perangkat Daerah -"
                searchPlaceholder="Cari kode atau nama Perangkat Daerah..."
                allowClear={false}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kode Unit
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 1.02.5.02.0.00.02.00"
                value={kdUnit}
                onChange={(e) => setKdUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Unit Kerja / UPT
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Puskesmas Pargarutan / Dinas Kesehatan Daerah"
                value={nmUnit}
                onChange={(e) => setNmUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kode SKPD Bank
              </label>
              <input
                type="text"
                placeholder="Contoh: 1020200"
                value={skpdbank}
                onChange={(e) => setSkpdbank(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Bank Penerima
              </label>
              <input
                type="text"
                placeholder="Contoh: BANK SUMUT CABANG SIPIROK"
                value={bankPenerima}
                onChange={(e) => setBankPenerima(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                No. Rekening Penerima
              </label>
              <input
                type="text"
                placeholder="Contoh: 23301020000142"
                value={rekPenerima}
                onChange={(e) => setRekPenerima(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Pemilik Rekening
              </label>
              <input
                type="text"
                placeholder="Contoh: DINAS KESEHATAN DAERAH TAPSEL"
                value={namaPenerima}
                onChange={(e) => setNamaPenerima(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Kepala / Pimpinan Unit
              </label>
              <input
                type="text"
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
                value={kepalaNip}
                onChange={(e) => setKepalaNip(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
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
              {editingId ? "Simpan Perubahan" : "Simpan Unit Kerja"}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-full sm:w-80">
            <SearchableSelect
              options={opdSelectOptions}
              value={opdFilter}
              onChange={(val) => {
                setOpdFilter(val);
                setPage(1);
                fetchUnits(1, limit, search, val);
              }}
              clearLabel="Semua Perangkat Daerah"
              placeholder="Semua Perangkat Daerah"
              searchPlaceholder="Cari kode atau nama Perangkat Daerah..."
            />
          </div>

          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kd_unit, nm_unit, skpdbank, nomor/nama rekening..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                fetchUnits(1, limit, e.target.value, opdFilter);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabel Unit Kerja + Pagination */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-cakra-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#991B1B] text-white text-[11px] font-bold uppercase">
                <th className="py-3 px-4">Kode Unit (kd_unit)</th>
                <th className="py-3 px-4">Nama Unit Kerja (nm_unit) & OPD Induk</th>
                <th className="py-3 px-4">SKPD Bank</th>
                <th className="py-3 px-4">Bank & Rekening Penerima</th>
                <th className="py-3 px-4">Nama Penerima</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Memuat data Unit Kerja...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Tidak ada data Unit Kerja yang sesuai filter.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-red-50/30">
                    <td className="py-3 px-4 font-mono font-bold text-[#5E0E14]">
                      {u.kd_unit}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{u.nm_unit}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {u.opd?.nm_skpd || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">
                      {u.skpdbank || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-800 flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5 text-[#991B1B] shrink-0" />
                        <span>{u.bank_penerima || "-"}</span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-[#5E0E14] mt-0.5">
                        {u.rek_penerima ? `Rek: ${u.rek_penerima}` : "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {u.nama_penerima || "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(u)}
                          className="p-1.5 rounded border border-gray-300 hover:bg-amber-50 hover:border-amber-400 text-amber-700 cursor-pointer"
                          title="Edit Unit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded border border-gray-300 hover:bg-red-50 hover:border-red-400 text-red-700 cursor-pointer"
                          title="Hapus Unit"
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
            fetchUnits(newPage, limit, search, opdFilter);
          }}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
            fetchUnits(1, newLimit, search, opdFilter);
          }}
        />
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Unit Kerja (ms_unit)"
        entityName="Unit Kerja / Sub-Unit"
        itemCode={deleteTarget?.kd_unit}
        itemLabel={deleteTarget?.nm_unit}
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
