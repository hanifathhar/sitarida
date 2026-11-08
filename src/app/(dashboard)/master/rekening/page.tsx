"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
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

type LevelNum = 1 | 2 | 3 | 4 | 5 | 6;

const TAB_CONFIG: Array<{
  level: LevelNum;
  tableName: string;
  label: string;
  parentKey?: "rek1Id" | "rek2Id" | "rek3Id" | "rek4Id" | "rek5Id";
  parentRel?: "rek1" | "rek2" | "rek3" | "rek4" | "rek5";
  parentLabel?: string;
  placeholderKode: string;
}> = [
    {
      level: 1,
      tableName: "ms_rek1",
      label: "Rekening Akun",
      placeholderKode: "Contoh: 5",
    },
    {
      level: 2,
      tableName: "ms_rek2",
      label: "Rekening Kelompok",
      parentKey: "rek1Id",
      parentRel: "rek1",
      parentLabel: "Rekening Akun",
      placeholderKode: "Contoh: 5.1",
    },
    {
      level: 3,
      tableName: "ms_rek3",
      label: "Rekening Jenis",
      parentKey: "rek2Id",
      parentRel: "rek2",
      parentLabel: "Rekening Kelompok",
      placeholderKode: "Contoh: 5.1.02",
    },
    {
      level: 4,
      tableName: "ms_rek4",
      label: "Rekening Objek",
      parentKey: "rek3Id",
      parentRel: "rek3",
      parentLabel: "Rekening Jenis",
      placeholderKode: "Contoh: 5.1.02.01",
    },
    {
      level: 5,
      tableName: "ms_rek5",
      label: "Rekening Rincian Objek",
      parentKey: "rek4Id",
      parentRel: "rek4",
      parentLabel: "Rekening Objek",
      placeholderKode: "Contoh: 5.1.02.01.01",
    },
    {
      level: 6,
      tableName: "ms_rek6",
      label: "Rekening Sub Rincian Objek",
      parentKey: "rek5Id",
      parentRel: "rek5",
      parentLabel: "Rekening Rincian Objek",
      placeholderKode: "Contoh: 5.1.02.01.01.0024",
    },
  ];

type KategoriAkun =
  | "ASET"
  | "KEWAJIBAN"
  | "EKUITAS"
  | "PENDAPATAN"
  | "BELANJA"
  | "PEMBIAYAAN"
  | "PENDAPATAN - LO"
  | "BEBAN - LO";

const KATEGORI_AKUN_OPTIONS: KategoriAkun[] = [
  "ASET",
  "KEWAJIBAN",
  "EKUITAS",
  "PENDAPATAN",
  "BELANJA",
  "PEMBIAYAAN",
  "PENDAPATAN - LO",
  "BEBAN - LO",
];

function getRekKode(obj: any): string {
  if (!obj) return "";
  return (
    obj.kd_rek1 ??
    obj.kd_rek2 ??
    obj.kd_rek3 ??
    obj.kd_rek4 ??
    obj.kd_rek5 ??
    obj.kd_rek6 ??
    obj.kode ??
    ""
  );
}

function getRekNama(obj: any): string {
  if (!obj) return "";
  return (
    obj.nm_rek1 ??
    obj.nm_rek2 ??
    obj.nm_rek3 ??
    obj.nm_rek4 ??
    obj.nm_rek5 ??
    obj.nm_rek6 ??
    obj.uraian ??
    ""
  );
}

export default function RekeningPage() {
  const [activeLevel, setActiveLevel] = useState<LevelNum>(1);
  const [items, setItems] = useState<any[]>([]);
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Form Input / Update
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kode, setKode] = useState("");
  const [uraian, setUraian] = useState("");
  const [kategori, setKategori] = useState<KategoriAkun>("BELANJA");
  const [parentId, setParentId] = useState("");
  const [mapLo, setMapLo] = useState("");
  const [mapUtang, setMapUtang] = useState("");
  const [mapAset, setMapAset] = useState("");
  const [sumberReferensi, setSumberReferensi] = useState(
    "Permendagri 90/2019 & Kepmendagri 050"
  );

  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // State Confirm Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentTab = TAB_CONFIG.find((t) => t.level === activeLevel)!;

  const kategoriSelectOptions = useMemo(
    () => KATEGORI_AKUN_OPTIONS.map((kat) => ({ value: kat, label: kat })),
    []
  );

  const parentSelectOptions = useMemo(
    () =>
      parentOptions.map((p) => ({
        value: p.id,
        badge: getRekKode(p),
        label: getRekNama(p),
      })),
    [parentOptions]
  );

  async function fetchParentOptions(level: LevelNum) {
    if (level === 1) {
      setParentOptions([]);
      return;
    }
    const parentLv = (level - 1) as LevelNum;
    const res = await fetch(`/api/master/rekening?level=${parentLv}&limit=3000`);
    const json = await res.json();
    if (json.success) {
      setParentOptions(json.data.items);
      if (json.data.items.length > 0 && !parentId) {
        setParentId(json.data.items[0].id);
      }
    }
  }

  async function fetchData(
    lv = activeLevel,
    p = page,
    l = limit,
    q = search,
    pFilter = parentFilter,
    kat = kategoriFilter
  ) {
    setLoading(true);
    const params = new URLSearchParams({
      level: String(lv),
      page: String(p),
      limit: String(l),
    });
    if (q) params.set("search", q);
    if (pFilter) params.set("parentId", pFilter);
    if (kat && lv === 1) params.set("kategori", kat);

    const res = await fetch(`/api/master/rekening?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setItems(json.data.items);
      setTotal(json.data.total);
      setTotalPages(json.data.totalPages);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchParentOptions(activeLevel);
    fetchData(activeLevel, 1, limit, search, parentFilter, kategoriFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel]);

  function handleSwitchTab(lv: LevelNum) {
    setActiveLevel(lv);
    setSearch("");
    setParentFilter("");
    setKategoriFilter("");
    setPage(1);
    setShowForm(false);
    setEditingId(null);
    setFeedback(null);
  }

  function openCreateForm() {
    setEditingId(null);
    setKode("");
    setUraian("");
    setKategori("BELANJA");
    setMapLo("");
    setMapUtang("");
    setMapAset("");
    if (parentOptions.length > 0) {
      setParentId(parentOptions[0].id);
      setKode(`${getRekKode(parentOptions[0])}.`);
    }
    setShowForm(true);
    setFeedback(null);
  }

  function openEditForm(item: any) {
    setEditingId(item.id);
    setKode(getRekKode(item));
    setUraian(getRekNama(item));
    if (item.kategori) setKategori(item.kategori);
    if (currentTab.parentKey && item[currentTab.parentKey]) {
      setParentId(item[currentTab.parentKey] as string);
    }
    setMapLo(item.map_lo || "");
    setMapUtang(item.map_utang || "");
    setMapAset(item.map_aset || "");
    setSumberReferensi(item.sumberReferensi || "Permendagri 90/2019 & Kepmendagri 050");
    setShowForm(true);
    setFeedback(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const kdField = `kd_rek${activeLevel}`;
    const nmField = `nm_rek${activeLevel}`;

    const payload: Record<string, unknown> = {
      level: activeLevel,
      [kdField]: kode,
      [nmField]: uraian,
    };

    if (activeLevel === 1) {
      payload.kategori = kategori;
    } else if (currentTab.parentKey) {
      payload[currentTab.parentKey] = parentId;
    }

    if (activeLevel === 6) {
      payload.map_lo = mapLo.trim() || null;
      payload.map_utang = mapUtang.trim() || null;
      payload.map_aset = mapAset.trim() || null;
      payload.sumberReferensi = sumberReferensi.trim() || null;
    }

    if (editingId) {
      payload.id = editingId;
    }

    const res = await fetch("/api/master/rekening", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setFeedback({
        type: "error",
        title: `Gagal Menyimpan ${currentTab.label}`,
        message: json.message || json.error?.message || "Gagal menyimpan data rekening",
      });
      return;
    }

    setFeedback({
      type: "success",
      title: editingId ? `${currentTab.label} Diperbarui` : `${currentTab.label} Ditambahkan`,
      message: editingId
        ? `Data ${currentTab.tableName} [${kode}] ${uraian} berhasil diperbarui.`
        : `Data ${currentTab.tableName} [${kode}] ${uraian} berhasil ditambahkan.`,
    });
    setShowForm(false);
    setEditingId(null);
    fetchData(activeLevel, page, limit, search, parentFilter, kategoriFilter);
  }

  function handleDelete(item: any) {
    setDeleteTarget(item);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    setFeedback(null);

    const res = await fetch(
      `/api/master/rekening?level=${activeLevel}&id=${encodeURIComponent(deleteTarget.id)}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.message || json.error?.message || "Gagal menghapus rekening";
      setDeleteError(msg);
      setFeedback({
        type: "error",
        title: `Gagal Menghapus ${currentTab.label}`,
        message: msg,
      });
      setDeleting(false);
      return;
    }
    setFeedback({
      type: "success",
      title: `${currentTab.label} Dihapus`,
      message: `Data [${getRekKode(deleteTarget)}] ${getRekNama(deleteTarget)} berhasil dihapus dari ${currentTab.tableName}.`,
    });
    setDeleteTarget(null);
    setDeleting(false);
    fetchData(activeLevel, page, limit, search, parentFilter, kategoriFilter);
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Header & Tabs 6 Level (ms_rek1 s/d ms_rek6) */}
      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-base font-extrabold text-[#5E0E14] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#991B1B]" />
              <span>Master {currentTab.label}</span>
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah {currentTab.label}</span>
          </button>
        </div>

        {/* 6 Tab Pilihan Tabel Rekening */}
        <div className="flex flex-wrap gap-2 pt-3">
          {TAB_CONFIG.map((tab) => {
            const active = tab.level === activeLevel;
            return (
              <button
                key={tab.level}
                type="button"
                onClick={() => handleSwitchTab(tab.level)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${active
                  ? "bg-[#991B1B] text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-[#991B1B]"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Input / Update */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-red-200 p-5 space-y-4 shadow-cakra-card"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-extrabold text-[#5E0E14]">
              {editingId ? `Edit Data ${currentTab.label}` : `Input Data Baru ${currentTab.label}`}
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
            {activeLevel === 1 ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kategori Akun
                </label>
                <SearchableSelect
                  options={kategoriSelectOptions}
                  value={kategori}
                  onChange={(val) => setKategori(val as KategoriAkun)}
                  placeholder="-- Pilih Kategori --"
                  searchPlaceholder="Cari kategori akun..."
                  allowClear={false}
                  required
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {currentTab.parentLabel}
                </label>
                <SearchableSelect
                  options={parentSelectOptions}
                  value={parentId}
                  onChange={(val) => {
                    setParentId(val);
                    const found = parentOptions.find((p) => p.id === val);
                    if (found && !editingId) {
                      setKode(`${getRekKode(found)}.`);
                    }
                  }}
                  placeholder="-- Pilih Rekening Induk --"
                  searchPlaceholder={`Cari kode atau nama ${currentTab.parentLabel || "Rekening Induk"}...`}
                  allowClear={false}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Kode {currentTab.label}
              </label>
              <input
                type="text"
                required
                placeholder={currentTab.placeholderKode}
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono font-bold"
              />
            </div>

            <div className={activeLevel === 1 ? "sm:col-span-1" : "sm:col-span-2"}>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama {currentTab.label}
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan nama / uraian rekening..."
                value={uraian}
                onChange={(e) => setUraian(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
              />
            </div>

            {activeLevel === 6 && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mapping LO
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 8.1.02.01..."
                    value={mapLo}
                    onChange={(e) => setMapLo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mapping Utang/Piutang
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2.1.06..."
                    value={mapUtang}
                    onChange={(e) => setMapUtang(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mapping Aset
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1.1.12..."
                    value={mapAset}
                    onChange={(e) => setMapAset(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Sumber Referensi
                  </label>
                  <input
                    type="text"
                    value={sumberReferensi}
                    onChange={(e) => setSumberReferensi(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-bold cursor-pointer"
            >
              {editingId ? "Simpan Perubahan" : "Simpan Data"}
            </button>
          </div>
        </form>
      )}

      {/* Bar Filter & Pencarian */}
      <div className="bg-white rounded-xl p-4 shadow-cakra-card border border-gray-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          {activeLevel === 1 ? (
            <div className="w-full sm:w-72">
              <SearchableSelect
                options={kategoriSelectOptions}
                value={kategoriFilter}
                onChange={(val) => {
                  setKategoriFilter(val);
                  setPage(1);
                  fetchData(activeLevel, 1, limit, search, parentFilter, val);
                }}
                clearLabel={`Semua ${currentTab.label}`}
                placeholder={`Semua ${currentTab.label}`}
                searchPlaceholder="Cari kategori akun..."
              />
            </div>
          ) : (
            <div className="w-full sm:w-80">
              <SearchableSelect
                options={parentSelectOptions}
                value={parentFilter}
                onChange={(val) => {
                  setParentFilter(val);
                  setPage(1);
                  fetchData(activeLevel, 1, limit, search, val, kategoriFilter);
                }}
                clearLabel={`Semua ${currentTab.parentLabel || currentTab.label}`}
                placeholder={`Semua ${currentTab.parentLabel || currentTab.label}`}
                searchPlaceholder={`Cari kode atau nama ${currentTab.parentLabel || "Rekening Induk"}...`}
              />
            </div>
          )}

          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Cari kd_rek${activeLevel} atau nm_rek${activeLevel} pada ${currentTab.tableName}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                fetchData(activeLevel, 1, limit, e.target.value, parentFilter, kategoriFilter);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Rekening + Pagination */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-cakra-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#991B1B] text-white text-[11px] font-bold uppercase">
                <th className="py-3 px-4 w-44">Kode {currentTab.label}</th>
                <th className="py-3 px-4">Uraian {currentTab.label}</th>
                {activeLevel === 6 && (
                  <th className="py-3 px-4">Mapping (LO / Utang / Aset)</th>
                )}
                <th className="py-3 px-4">
                  {activeLevel === 1 ? "Kategori" : "Rekening Induk"}
                </th>
                <th className="py-3 px-4 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeLevel === 6 ? 5 : 4}
                    className="py-8 text-center text-gray-500"
                  >
                    Memuat data {currentTab.tableName}...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeLevel === 6 ? 5 : 4}
                    className="py-8 text-center text-gray-500"
                  >
                    Tidak ada data pada tabel {currentTab.tableName}.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const parentObj = currentTab.parentRel ? item[currentTab.parentRel] : null;
                  return (
                    <tr key={item.id} className="hover:bg-red-50/30">
                      <td className="py-3 px-4 font-mono font-bold text-[#5E0E14]">
                        {getRekKode(item)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">
                        {getRekNama(item)}
                      </td>
                      {activeLevel === 6 && (
                        <td className="py-3 px-4 text-[11px]">
                          {item.map_lo || item.map_utang || item.map_aset ? (
                            <div className="space-y-0.5 font-mono">
                              {item.map_lo && (
                                <div>
                                  <span className="text-gray-500 font-sans">LO:</span>{" "}
                                  <span className="font-bold text-[#5E0E14]">{item.map_lo}</span>
                                </div>
                              )}
                              {item.map_utang && (
                                <div>
                                  <span className="text-gray-500 font-sans">Utang:</span>{" "}
                                  <span className="font-bold text-[#5E0E14]">{item.map_utang}</span>
                                </div>
                              )}
                              {item.map_aset && (
                                <div>
                                  <span className="text-gray-500 font-sans">Aset:</span>{" "}
                                  <span className="font-bold text-[#5E0E14]">{item.map_aset}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {activeLevel === 1 ? (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-[#991B1B] border border-red-200 font-bold text-[10px]">
                            {item.kategori}
                          </span>
                        ) : parentObj ? (
                          <span>
                            <strong className="font-mono text-[#991B1B]">
                              {getRekKode(parentObj)}
                            </strong>{" - "}
                            {getRekNama(parentObj)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="p-1.5 rounded border border-gray-300 hover:bg-amber-50 hover:border-amber-400 text-amber-700 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded border border-gray-300 hover:bg-red-50 hover:border-red-400 text-red-700 cursor-pointer"
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

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(newPage) => {
            setPage(newPage);
            fetchData(activeLevel, newPage, limit, search, parentFilter, kategoriFilter);
          }}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
            fetchData(activeLevel, 1, newLimit, search, parentFilter, kategoriFilter);
          }}
        />
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title={`Hapus Rekening (${currentTab.tableName})`}
        entityName={`Rekening ${currentTab.tableName}`}
        itemCode={getRekKode(deleteTarget)}
        itemLabel={getRekNama(deleteTarget)}
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
