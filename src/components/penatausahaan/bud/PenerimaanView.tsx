"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Download,
} from "lucide-react";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
}

interface RekeningItem {
  kd_rek6: string;
  nm_rek6: string;
}

interface BankKasdaItem {
  nama: string;
  rekening: string;
  cabang: string;
}

interface SumberDanaItem {
  kode: string;
  nama: string;
}

interface RincianRekeningInput {
  id?: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  keterangan?: string;
}

interface PenerimaanItem {
  id: string;
  tahunAnggaran: number;
  no_kas: string;
  tgl_kas: string;
  no_sts: string | null;
  tgl_sts: string | null;
  kd_skpd: string;
  nm_skpd: string;
  opdId: string;
  uraian: string;
  sumber_dana: string | null;
  nama_penyetor: string | null;
  alamat_penyetor: string | null;
  nama_bank: string | null;
  rek_bank: string | null;
  nilai: number;
  status: string;
  keterangan: string | null;
  rincianRekening?: Array<{
    id: string;
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
    keterangan?: string | null;
  }>;
}

export default function PenerimaanView() {
  const [dataList, setDataList] = useState<PenerimaanItem[]>([]);
  const [summary, setSummary] = useState({ totalNilai: 0, totalTransaksi: 0 });
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [filterSumber, setFilterSumber] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Referensi
  const [opdList, setOpdList] = useState<OpdItem[]>([]);
  const [rekeningList, setRekeningList] = useState<RekeningItem[]>([]);
  const [bankList, setBankList] = useState<BankKasdaItem[]>([]);
  const [sumberDanaList, setSumberDanaList] = useState<SumberDanaItem[]>([]);

  // Modal Form
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | "VIEW">("CREATE");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    no_kas: "",
    tgl_kas: new Date().toISOString().split("T")[0],
    no_sts: "",
    tgl_sts: new Date().toISOString().split("T")[0],
    opdId: "",
    sumber_dana: "PAD",
    nama_penyetor: "",
    alamat_penyetor: "",
    nama_bank: "PT. Bank Sumut",
    rek_bank: "100.01.04.00001-9",
    uraian: "",
    keterangan: "",
    rincian: [] as RincianRekeningInput[],
  });

  // Modal Cetak
  const [printItem, setPrintItem] = useState<PenerimaanItem | null>(null);

  // Load Referensi
  useEffect(() => {
    async function loadRef() {
      try {
        const res = await fetch("/api/penatausahaan/bud/referensi");
        const json = await res.json();
        if (json.success) {
          setOpdList(json.data.opdList || []);
          setRekeningList(json.data.rekeningPendapatan || []);
          setBankList(json.data.bankKasda || []);
          setSumberDanaList(json.data.sumberDanaList || []);
        }
      } catch (e) {
        console.error("Gagal memuat referensi:", e);
      }
    }
    loadRef();
  }, []);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterOpd !== "ALL") q.set("opdId", filterOpd);
      if (filterSumber !== "ALL") q.set("sumber_dana", filterSumber);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (search) q.set("q", search);

      const res = await fetch(`/api/penatausahaan/bud/penerimaan?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        setSummary(json.summary || { totalNilai: 0, totalTransaksi: 0 });
      }
    } catch (e) {
      console.error("Gagal memuat data penerimaan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterOpd, filterSumber, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenCreate = () => {
    setModalMode("CREATE");
    setFormError(null);
    setFormData({
      id: "",
      no_kas: "",
      tgl_kas: new Date().toISOString().split("T")[0],
      no_sts: "",
      tgl_sts: new Date().toISOString().split("T")[0],
      opdId: opdList.length > 0 ? opdList[0].id : "",
      sumber_dana: "PAD",
      nama_penyetor: "",
      alamat_penyetor: "",
      nama_bank: bankList[0]?.nama || "PT. Bank Sumut",
      rek_bank: bankList[0]?.rekening || "100.01.04.00001-9",
      uraian: "",
      keterangan: "",
      rincian: [
        {
          kd_rek6: rekeningList[0]?.kd_rek6 || "4.1.01.01.0001",
          nm_rek6: rekeningList[0]?.nm_rek6 || "Pajak Daerah",
          nilai: 0,
          keterangan: "",
        },
      ],
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: PenerimaanItem, mode: "EDIT" | "VIEW" = "EDIT") => {
    setModalMode(mode);
    setFormError(null);
    setFormData({
      id: item.id,
      no_kas: item.no_kas,
      tgl_kas: item.tgl_kas ? new Date(item.tgl_kas).toISOString().split("T")[0] : "",
      no_sts: item.no_sts || "",
      tgl_sts: item.tgl_sts ? new Date(item.tgl_sts).toISOString().split("T")[0] : "",
      opdId: item.opdId,
      sumber_dana: item.sumber_dana || "PAD",
      nama_penyetor: item.nama_penyetor || "",
      alamat_penyetor: item.alamat_penyetor || "",
      nama_bank: item.nama_bank || bankList[0]?.nama || "",
      rek_bank: item.rek_bank || bankList[0]?.rekening || "",
      uraian: item.uraian,
      keterangan: item.keterangan || "",
      rincian: (item.rincianRekening || []).map((r) => ({
        id: r.id,
        kd_rek6: r.kd_rek6,
        nm_rek6: r.nm_rek6,
        nilai: Number(r.nilai) || 0,
        keterangan: r.keterangan || "",
      })),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, no_kas: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus transaksi penerimaan ${no_kas}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/penatausahaan/bud/penerimaan?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || "Gagal menghapus data");
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi");
    }
  };

  const handleAddRincian = () => {
    const firstRek = rekeningList[0] || {
      kd_rek6: "4.1.01.01.0001",
      nm_rek6: "Pajak Daerah",
    };
    setFormData((prev) => ({
      ...prev,
      rincian: [
        ...prev.rincian,
        {
          kd_rek6: firstRek.kd_rek6,
          nm_rek6: firstRek.nm_rek6,
          nilai: 0,
          keterangan: "",
        },
      ],
    }));
  };

  const handleRemoveRincian = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rincian: prev.rincian.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateRincian = (
    index: number,
    field: keyof RincianRekeningInput,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = [...prev.rincian];
      if (field === "kd_rek6") {
        const found = rekeningList.find((r) => r.kd_rek6 === value);
        updated[index] = {
          ...updated[index],
          kd_rek6: value,
          nm_rek6: found ? found.nm_rek6 : updated[index].nm_rek6,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return { ...prev, rincian: updated };
    });
  };

  const totalNilaiForm = useMemo(() => {
    return formData.rincian.reduce(
      (sum, r) => sum + (Number(r.nilai) || 0),
      0
    );
  }, [formData.rincian]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.opdId) {
      setFormError("Pilih OPD penerima terlebih dahulu.");
      return;
    }
    if (!formData.uraian.trim()) {
      setFormError("Uraian penerimaan wajib diisi.");
      return;
    }
    if (formData.rincian.length === 0) {
      setFormError("Minimal harus ada 1 baris rekening penerimaan.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/penatausahaan/bud/penerimaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nilai: totalNilaiForm,
          rincianRekening: formData.rincian,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
      } else {
        setFormError(json.error || "Gagal menyimpan penerimaan.");
      }
    } catch (e: any) {
      setFormError("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Penerimaan Kas Daerah
            </span>
            <div className="text-xl font-black text-teal-700 mt-0.5">
              {formatRupiah(summary.totalNilai)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#88131A]">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Jumlah Transaksi Penerimaan
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {summary.totalTransaksi} Dokumen Kas Masuk
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Rekening Kas Umum Daerah
            </span>
            <div className="text-xs font-bold text-slate-800 mt-1">
              PT. Bank Sumut Cabang Sipirok
            </div>
            <div className="text-[11px] font-mono font-bold text-teal-700">
              No. Rek: 100.01.04.00001-9
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Penerimaan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No Kas / No STS / OPD / Uraian..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
            />
          </div>

          <div>
            <select
              value={filterOpd}
              onChange={(e) => setFilterOpd(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
            >
              <option value="ALL">-- Seluruh SKPD / OPD --</option>
              {opdList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kd_skpd} - {o.nm_skpd}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
            >
              <option value="ALL">-- Seluruh Sumber Dana --</option>
              {sumberDanaList.map((s) => (
                <option key={s.kode} value={s.kode}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Dari Tanggal"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Sampai Tanggal"
            />
          </div>
        </form>
      </div>

      {/* Tabel Data Penerimaan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Daftar Penerimaan Kas Daerah (Buku Kas Masuk / STS)
          </h3>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">No. Kas / Tanggal</th>
                <th className="px-3.5 py-3">No. STS / Bukti</th>
                <th className="px-3.5 py-3">SKPD / Penyetor</th>
                <th className="px-3.5 py-3">Uraian Penerimaan</th>
                <th className="px-3.5 py-3">Sumber Dana</th>
                <th className="px-3.5 py-3 text-right">Nilai Penerimaan</th>
                <th className="px-3.5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data penerimaan daerah...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Tidak ada data penerimaan kas daerah yang ditemukan.
                  </td>
                </tr>
              ) : (
                dataList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_kas}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.tgl_kas ? new Date(item.tgl_kas).toLocaleDateString("id-ID") : "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      {item.no_sts ? (
                        <>
                          <div className="font-mono font-semibold text-slate-800">
                            {item.no_sts}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.tgl_sts
                              ? new Date(item.tgl_sts).toLocaleDateString("id-ID")
                              : "-"}
                          </div>
                        </>
                      ) : (
                        <span className="italic text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{item.nm_skpd}</div>
                      {item.nama_penyetor && (
                        <div className="text-[11px] text-slate-500">
                          Penyetor: {item.nama_penyetor}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 max-w-xs truncate" title={item.uraian}>
                      {item.uraian}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        {item.sumber_dana || "PAD"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-teal-700">
                      {formatRupiah(item.nilai)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item, "VIEW")}
                          className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                          title="Lihat Rincian"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item, "EDIT")}
                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPrintItem(item)}
                          className="p-1 rounded-lg text-[#88131A] hover:bg-rose-50"
                          title="Cetak Bukti Penerimaan"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.no_kas)}
                          className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
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
            {dataList.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right">
                    Total Nilai Penerimaan Terpilih:
                  </td>
                  <td className="px-4 py-3 text-right text-teal-700 font-mono">
                    {formatRupiah(summary.totalNilai)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Form Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === "CREATE"
                    ? "Input Penerimaan Kas Daerah Baru"
                    : modalMode === "EDIT"
                    ? "Ubah Data Penerimaan Kas Daerah"
                    : "Detail Dokumen Penerimaan Kas Daerah"}
                </h3>
                <p className="text-xs text-slate-500">
                  Pencatatan kas masuk Bendahara Umum Daerah (Tabel trhkasin & trdkasin)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor Kas Masuk (No Kas)
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === "VIEW"}
                    value={formData.no_kas}
                    onChange={(e) => setFormData((p) => ({ ...p, no_kas: e.target.value }))}
                    placeholder="Otomatis Running ([URUT]/BUD/KAS-IN/2026)"
                    className="mt-1 w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Kas Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    disabled={modalMode === "VIEW"}
                    value={formData.tgl_kas}
                    onChange={(e) => setFormData((p) => ({ ...p, tgl_kas: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    SKPD / OPD Penerima <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={modalMode === "VIEW"}
                    value={formData.opdId}
                    onChange={(e) => setFormData((p) => ({ ...p, opdId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  >
                    <option value="">-- Pilih OPD --</option>
                    {opdList.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.kd_skpd} - {o.nm_skpd}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor Bukti Setor / STS
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === "VIEW"}
                    value={formData.no_sts}
                    onChange={(e) => setFormData((p) => ({ ...p, no_sts: e.target.value }))}
                    placeholder="Contoh: 900/01/STS/2026"
                    className="mt-1 w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Tanggal Bukti STS
                  </label>
                  <input
                    type="date"
                    disabled={modalMode === "VIEW"}
                    value={formData.tgl_sts}
                    onChange={(e) => setFormData((p) => ({ ...p, tgl_sts: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Sumber Dana Penerimaan
                  </label>
                  <select
                    disabled={modalMode === "VIEW"}
                    value={formData.sumber_dana}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sumber_dana: e.target.value }))
                    }
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  >
                    {sumberDanaList.map((s) => (
                      <option key={s.kode} value={s.kode}>
                        {s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank & Rekening Penampung Kasda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Penyetor / Wajib Pajak / Retribusi
                  </label>
                  <input
                    type="text"
                    disabled={modalMode === "VIEW"}
                    value={formData.nama_penyetor}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nama_penyetor: e.target.value }))
                    }
                    placeholder="Contoh: Bendahara Penerimaan Bapenda / Wajib Retribusi"
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Bank Tujuan Rekening Kas Daerah (RKUD)
                  </label>
                  <select
                    disabled={modalMode === "VIEW"}
                    value={formData.nama_bank}
                    onChange={(e) => {
                      const sel = bankList.find((b) => b.nama === e.target.value);
                      setFormData((p) => ({
                        ...p,
                        nama_bank: e.target.value,
                        rek_bank: sel ? sel.rekening : p.rek_bank,
                      }));
                    }}
                    className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                  >
                    {bankList.map((b) => (
                      <option key={b.rekening} value={b.nama}>
                        {b.nama} ({b.rekening})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Uraian Keperluan */}
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Uraian Penerimaan Kas Daerah <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  disabled={modalMode === "VIEW"}
                  value={formData.uraian}
                  onChange={(e) => setFormData((p) => ({ ...p, uraian: e.target.value }))}
                  placeholder="Contoh: Penyetoran Pendapatan Pajak Daerah Periode Triwulan I..."
                  className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14] disabled:bg-slate-100"
                />
              </div>

              {/* Rincian Rekening Pendapatan (trdkasin) */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Rincian Rekening Penerimaan (trdkasin)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Rincian rekening pendapatan / pembiayaan daerah yang disetorkan
                    </p>
                  </div>
                  {modalMode !== "VIEW" && (
                    <button
                      type="button"
                      onClick={handleAddRincian}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Rekening</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-center">No</th>
                        <th className="px-3 py-2">Rekening Pendapatan</th>
                        <th className="px-3 py-2">Keterangan</th>
                        <th className="px-3 py-2 text-right">Nilai Penerimaan (Rp)</th>
                        {modalMode !== "VIEW" && (
                          <th className="px-3 py-2 text-center">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.rincian.map((r, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 min-w-[280px]">
                            {modalMode !== "VIEW" ? (
                              <select
                                value={r.kd_rek6}
                                onChange={(e) =>
                                  handleUpdateRincian(idx, "kd_rek6", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                              >
                                {rekeningList.map((rek) => (
                                  <option key={rek.kd_rek6} value={rek.kd_rek6}>
                                    {rek.kd_rek6} - {rek.nm_rek6}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div>
                                <span className="font-mono font-bold text-slate-900">
                                  {r.kd_rek6}
                                </span>{" "}
                                - {r.nm_rek6}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {modalMode !== "VIEW" ? (
                              <input
                                type="text"
                                value={r.keterangan || ""}
                                onChange={(e) =>
                                  handleUpdateRincian(idx, "keterangan", e.target.value)
                                }
                                placeholder="Uraian (opsional)"
                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                              />
                            ) : (
                              <span>{r.keterangan || "-"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {modalMode !== "VIEW" ? (
                              <input
                                type="number"
                                min="0"
                                value={r.nilai || ""}
                                onChange={(e) =>
                                  handleUpdateRincian(
                                    idx,
                                    "nilai",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                                className="w-36 px-2 py-1.5 text-right font-mono font-bold text-xs border border-slate-200 rounded-lg focus:outline-none"
                              />
                            ) : (
                              <span className="font-mono font-bold text-teal-700">
                                {formatRupiah(r.nilai)}
                              </span>
                            )}
                          </td>
                          {modalMode !== "VIEW" && (
                            <td className="px-3 py-2 text-center">
                              {formData.rincian.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRincian(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-slate-700">
                          Total Nilai Penerimaan:
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm text-teal-700">
                          {formatRupiah(totalNilaiForm)}
                        </td>
                        {modalMode !== "VIEW" && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {modalMode === "VIEW" ? "Tutup" : "Batal"}
                </button>
                {modalMode !== "VIEW" && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? "Menyimpan..." : "Simpan Dokumen"}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Bukti Penerimaan */}
      {printItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Bukti Penerimaan Kas Daerah (Surat Tanda Setoran)
              </h3>
              <button
                onClick={() => setPrintItem(null)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Preview Content */}
            <div className="border border-slate-300 p-6 rounded-xl font-serif text-xs space-y-4">
              <div className="text-center border-b-2 border-slate-900 pb-3">
                <h4 className="font-bold text-sm uppercase">PEMERINTAH KABUPATEN TAPANULI SELATAN</h4>
                <h5 className="font-bold text-xs uppercase">BADAN PENGELOLA KEUANGAN DAN ASET DAERAH</h5>
                <p className="text-[10px] italic">BENDAHARA UMUM DAERAH (BUD) - BUKU KAS PENERIMAAN DAERAH</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="font-semibold text-slate-600">Nomor Kas:</span>{" "}
                  <span className="font-mono font-bold text-slate-900">{printItem.no_kas}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Tanggal:</span>{" "}
                  <span>{new Date(printItem.tgl_kas).toLocaleDateString("id-ID")}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">No. Bukti / STS:</span>{" "}
                  <span className="font-mono">{printItem.no_sts || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">SKPD:</span>{" "}
                  <span>{printItem.nm_skpd}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Penyetor:</span>{" "}
                  <span>{printItem.nama_penyetor || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Bank RKUD:</span>{" "}
                  <span>{printItem.nama_bank} ({printItem.rek_bank})</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-600">Uraian:</span>
                <p className="mt-1 text-slate-800">{printItem.uraian}</p>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-600">Total Nilai Disetor:</span>
                <div className="text-base font-bold text-teal-800 mt-1">
                  {formatRupiah(printItem.nilai)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

