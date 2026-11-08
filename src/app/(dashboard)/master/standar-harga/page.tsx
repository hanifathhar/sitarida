"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Tags,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  Layers,
  ChevronDown,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ActionBanner from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import SearchableSelect from "@/components/ui/SearchableSelect";

type JenisStandar = "SSH" | "SBU" | "HSPK" | "ASB";

interface KelompokOption {
  id: string;
  kd_kelompok: string;
  uraianKelompok: string;
}

interface StandarHargaItem {
  id: string;
  tahunAnggaran: number;
  jenis: JenisStandar;
  kd_kelompok: string;
  kd_barang: string | null;
  no_urut: number | null;
  uraianKelompok: string | null;
  uraianBarang: string;
  spesifikasi: string | null;
  satuan: string;
  hargaSatuan: number;
  sumberFile: string | null;
  isActive: boolean;
}

export default function StandarHargaPage() {
  const [data, setData] = useState<StandarHargaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [countsByJenis, setCountsByJenis] = useState<Record<string, number>>({});

  // Banner Notification
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // Modal Form State (Tambah & Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StandarHargaItem | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields
  const [formJenis, setFormJenis] = useState<JenisStandar>("SSH");
  const [formTahun, setFormTahun] = useState<number>(2027);
  const [formKdKelompok, setFormKdKelompok] = useState("");
  const [formKdBarang, setFormKdBarang] = useState("");
  const [formUraianKelompok, setFormUraianKelompok] = useState("");
  const [formUraianBarang, setFormUraianBarang] = useState("");
  const [formSpesifikasi, setFormSpesifikasi] = useState("");
  const [formSatuan, setFormSatuan] = useState("");
  const [formHargaSatuan, setFormHargaSatuan] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<StandarHargaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Kelompok Barang Options from ms_kelompok_barang
  const [kelompokList, setKelompokList] = useState<KelompokOption[]>([]);

  async function loadKelompokList() {
    try {
      const res = await fetch("/api/master/kelompok-barang");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setKelompokList(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat list kelompok barang:", e);
    }
  }

  // Fetch Data from API
  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.set("search", search.trim());
      if (selectedJenis) params.set("jenis", selectedJenis);

      const res = await fetch(`/api/master/standar-harga?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalRecords(json.pagination?.total || 0);
        if (json.countsByJenis) setCountsByJenis(json.countsByJenis);
      } else {
        setBanner({
          type: "error",
          title: "Gagal Memuat Data",
          message: json.message || "Terjadi kesalahan saat memuat Standar Harga",
        });
      }
    } catch {
      setBanner({
        type: "error",
        title: "Kesalahan Jaringan",
        message: "Tidak dapat terhubung ke server",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadKelompokList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, selectedJenis]);

  // Loading next code state
  const [loadingNextCode, setLoadingNextCode] = useState(false);

  async function fetchNextKodeBarang(kdKelompok: string) {
    if (!kdKelompok) {
      setFormKdBarang("");
      return;
    }
    setLoadingNextCode(true);
    try {
      const res = await fetch(`/api/master/standar-harga?action=next-code&kd_kelompok=${encodeURIComponent(kdKelompok)}`);
      const json = await res.json();
      if (json.success && json.data?.kd_barang) {
        setFormKdBarang(json.data.kd_barang);
      }
    } catch (e) {
      console.error("Gagal mengambil kode barang berikutnya:", e);
    } finally {
      setLoadingNextCode(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadData();
  }

  function openCreateModal() {
    setEditingItem(null);
    setFormJenis(selectedJenis ? (selectedJenis as JenisStandar) : "SSH");
    setFormTahun(2027);
    setFormKdKelompok("");
    setFormKdBarang("");
    setFormUraianKelompok("");
    setFormUraianBarang("");
    setFormSpesifikasi("");
    setFormSatuan("");
    setFormHargaSatuan("");
    setFormIsActive(true);
    setShowModal(true);
  }

  function openEditModal(item: StandarHargaItem) {
    setEditingItem(item);
    setFormJenis(item.jenis);
    setFormTahun(item.tahunAnggaran);
    setFormKdKelompok(item.kd_kelompok);
    setFormKdBarang(item.kd_barang || "");
    setFormUraianKelompok(item.uraianKelompok || "");
    setFormUraianBarang(item.uraianBarang);
    setFormSpesifikasi(item.spesifikasi || "");
    setFormSatuan(item.satuan);
    setFormHargaSatuan(item.hargaSatuan.toString());
    setFormIsActive(item.isActive);
    setShowModal(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setBanner(null);

    try {
      const payload = {
        tahunAnggaran: formTahun,
        jenis: formJenis,
        kd_kelompok: formKdKelompok,
        kd_barang: formKdBarang || undefined,
        uraianKelompok: formUraianKelompok,
        uraianBarang: formUraianBarang,
        spesifikasi: formSpesifikasi,
        satuan: formSatuan,
        hargaSatuan: parseFloat(formHargaSatuan) || 0,
        isActive: formIsActive,
      };

      let res;
      if (editingItem) {
        res = await fetch("/api/master/standar-harga", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
      } else {
        res = await fetch("/api/master/standar-harga", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        setBanner({
          type: "success",
          title: "Berhasil",
          message:
            json.message ||
            (editingItem
              ? "Standar Harga berhasil diperbarui"
              : "Standar Harga baru berhasil disimpan"),
        });
        setShowModal(false);
        loadData();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menyimpan",
          message: json.message || "Gagal menyimpan Standar Harga",
        });
      }
    } catch {
      setBanner({
        type: "error",
        title: "Kesalahan Jaringan",
        message: "Tidak dapat terhubung ke server",
      });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setBanner(null);

    try {
      const res = await fetch(`/api/master/standar-harga?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        setBanner({
          type: "success",
          title: "Berhasil Dihapus",
          message: `Standar Harga [${deleteTarget.kd_kelompok}] ${deleteTarget.uraianBarang} berhasil dihapus.`,
        });
        setDeleteTarget(null);
        loadData();
      } else {
        setBanner({
          type: "error",
          title: "Gagal Menghapus",
          message: json.message || "Gagal menghapus Standar Harga",
        });
      }
    } catch {
      setBanner({
        type: "error",
        title: "Kesalahan Jaringan",
        message: "Tidak dapat terhubung ke server",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const getJenisBadgeColor = (jenis: JenisStandar) => {
    switch (jenis) {
      case "SSH":
        return "bg-blue-100 text-blue-900 border-blue-200";
      case "SBU":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      case "HSPK":
        return "bg-purple-100 text-purple-900 border-purple-200";
      case "ASB":
        return "bg-amber-100 text-amber-900 border-amber-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Banner Notification */}
      {banner && (
        <ActionBanner
          feedback={banner}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#5E0E14] text-white shadow-sm">
              <Tags className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Master Standar Harga Satuan (SHS)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar Satuan Harga (SSH), Standar Biaya Umum (SBU), HSPK & ASB Kabupaten Tapanuli Selatan TA 2027
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] via-[#7B111A] to-[#991B1B] text-white text-xs font-bold shadow-md hover:shadow-lg hover:from-[#46090E] hover:to-[#7F1D1D] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Item Standar Harga</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards per Jenis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["SSH", "SBU", "HSPK", "ASB"] as JenisStandar[]).map((j) => {
          const isSelected = selectedJenis === j;
          const count = countsByJenis[j] || 0;
          return (
            <button
              key={j}
              type="button"
              onClick={() => {
                setSelectedJenis(isSelected ? "" : j);
                setPage(1);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                  ? "bg-[#5E0E14] text-white border-[#5E0E14] shadow-md ring-2 ring-[#991B1B]/40"
                  : "bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold tracking-wider uppercase ${isSelected ? "text-amber-200" : "text-slate-500"
                    }`}
                >
                  {j === "SSH"
                    ? "Satuan Harga"
                    : j === "SBU"
                      ? "Biaya Umum"
                      : j === "HSPK"
                        ? "Pokok Kegiatan"
                        : "Analisis Belanja"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black ${isSelected ? "bg-white/20 text-white" : getJenisBadgeColor(j)
                    }`}
                >
                  {j}
                </span>
              </div>
              <div className="text-xl font-extrabold mt-1.5 font-mono">
                {count.toLocaleString("id-ID")}
                <span
                  className={`text-xs font-normal ml-1 ${isSelected ? "text-white/80" : "text-slate-500"
                    }`}
                >
                  item
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Table Card (Header Maroon #5E0E14 Style) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Table Filter & Toolbar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari kode kelompok, nama barang, atau spesifikasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-24 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B] shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1.5 rounded-lg bg-[#5E0E14] text-white text-[11px] font-bold hover:bg-[#46090E] transition-all cursor-pointer"
            >
              Cari
            </button>
          </form>

          <div className="flex items-center gap-2">
            {selectedJenis && (
              <button
                type="button"
                onClick={() => {
                  setSelectedJenis("");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-all cursor-pointer"
              >
                <span>Filter: {selectedJenis}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="text-xs text-slate-500">
              Total: <strong className="font-mono text-slate-800">{totalRecords.toLocaleString("id-ID")}</strong> item
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-12 text-center">No</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-24 text-center">Jenis</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-52">Kode Barang (SSH)</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60">Uraian Barang & Kelompok</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60">Spesifikasi</th>
                <th className="py-3 px-3 border-r border-[#7B111A]/60 w-24 text-center">Satuan</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60 text-right w-36">Harga Satuan (Rp)</th>
                <th className="py-3 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#991B1B] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data standar harga...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div className="font-semibold text-slate-700">Tidak ada data standar harga</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Silakan sesuaikan kata kunci pencarian atau filter jenis di atas
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => {
                  const rowNum = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/30 transition-colors odd:bg-white even:bg-slate-50/50"
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">
                        {rowNum}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getJenisBadgeColor(
                            item.jenis
                          )}`}
                        >
                          {item.jenis}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">
                          {item.kd_barang || item.kd_kelompok}
                        </div>
                        {item.kd_barang && item.kd_kelompok && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Kel: {item.kd_kelompok}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {item.uraianBarang}
                        </div>
                        {item.uraianKelompok && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.uraianKelompok}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                        {item.spesifikasi || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                        {item.satuan}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRupiah(item.hargaSatuan)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Edit Item"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            title="Hapus Item"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer"
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

        {/* Pagination Bar */}
        <PaginationBar
          page={page}
          totalPages={totalPages}
          limit={pageSize}
          total={totalRecords}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>

      {/* Modal Tambah / Edit Standar Harga (Header Maroon #991B1B) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-[#991B1B] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Tags className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    {editingItem ? "Edit Standar Harga Satuan" : "Tambah Item Standar Harga Baru"}
                  </h3>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    Standar Biaya & Satuan Harga Daerah Kabupaten Tapanuli Selatan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Jenis Standar Harga <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formJenis}
                    onChange={(e) => setFormJenis(e.target.value as JenisStandar)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  >
                    <option value="SSH">SSH (Standar Satuan Harga)</option>
                    <option value="SBU">SBU (Standar Biaya Umum)</option>
                    <option value="HSPK">HSPK (Harga Satuan Pokok Kegiatan)</option>
                    <option value="ASB">ASB (Analisis Standar Belanja)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Tahun Anggaran <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formTahun}
                    onChange={(e) => setFormTahun(parseInt(e.target.value, 10) || 2027)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Kelompok Barang <span className="text-red-600">*</span>
                  </label>
                  <SearchableSelect
                    options={kelompokList.map((k) => ({
                      value: k.kd_kelompok,
                      label: `${k.uraianKelompok}`,
                      badge: k.kd_kelompok,
                      subLabel: k.uraianKelompok,
                    }))}
                    value={formKdKelompok}
                    onChange={(val) => {
                      setFormKdKelompok(val);
                      const found = kelompokList.find((k) => k.kd_kelompok === val);
                      if (found) {
                        setFormUraianKelompok(found.uraianKelompok);
                      }
                      // Jika menambah baru, ambil Kode Barang otomatis berikutnya
                      if (!editingItem) {
                        fetchNextKodeBarang(val);
                      }
                    }}
                    placeholder="-- Ketik Kode atau Uraian Kelompok Barang --"
                    searchPlaceholder="Cari kode atau nama kelompok barang..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Kode Kelompok (Terpilih)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 1.1.12.01.01.0001"
                      value={formKdKelompok}
                      onChange={(e) => setFormKdKelompok(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Kode Barang (SSH)</span>
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {loadingNextCode ? "Menghitung..." : "Otomatis"}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly={!editingItem}
                        placeholder={loadingNextCode ? "Mengambil kode otomatis..." : "Pilih kelompok barang terlebih dahulu"}
                        value={formKdBarang}
                        onChange={(e) => setFormKdBarang(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-[#88131A] focus:outline-none focus:ring-2 focus:ring-[#991B1B] ${
                          !editingItem ? "bg-amber-50/60 cursor-not-allowed" : "bg-white"
                        }`}
                      />
                      {loadingNextCode && (
                        <div className="absolute right-3 top-2.5">
                          <div className="w-3.5 h-3.5 border-2 border-[#991B1B] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Uraian Kelompok Barang
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bahan Bangunan dan Konstruksi"
                    value={formUraianKelompok}
                    onChange={(e) => setFormUraianKelompok(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Uraian Barang / Jasa <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama barang atau rincian item standar harga"
                  value={formUraianBarang}
                  onChange={(e) => setFormUraianBarang(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  placeholder="Merk, ukuran, standar teknis, atau keterangan lain"
                  value={formSpesifikasi}
                  onChange={(e) => setFormSpesifikasi(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Satuan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Buah, Kg, Batang, M2, Tahun"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Harga Satuan (Rp) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="Contoh: 150000"
                    value={formHargaSatuan}
                    onChange={(e) => setFormHargaSatuan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#7B111A] to-[#991B1B] hover:from-[#5E0E14] hover:to-[#7F1D1D] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Simpan Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Hapus Item Standar Harga?"
        entityName="Standar Harga"
        itemCode={deleteTarget?.kd_kelompok}
        itemLabel={deleteTarget?.uraianBarang}
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
