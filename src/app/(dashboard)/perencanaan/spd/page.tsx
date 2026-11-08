"use client";

import React, { useEffect, useState } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import ActionBanner from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface SpdItem {
  id: string;
  tahunAnggaran: number;
  nomorSpd: string;
  tanggalSpd: string;
  opdId: string;
  kd_skpd: string;
  nm_skpd: string;
  periode: string;
  jumlahSpd: number;
  keterangan: string | null;
  status: string;
}

export default function SpdPage() {
  const [data, setData] = useState<SpdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(2027);
  const [search, setSearch] = useState("");

  const [opdList, setOpdList] = useState<{ id: string; kd_skpd: string; nm_skpd: string }[]>([]);

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title?: string;
    message: string;
  } | null>(null);

  // Form Modal
  const [showModal, setShowModal] = useState(false);
  const [formNomor, setFormNomor] = useState("");
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [formOpdId, setFormOpdId] = useState("");
  const [formPeriode, setFormPeriode] = useState("Triwulan I");
  const [formJumlah, setFormJumlah] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/perencanaan/kas-spd?type=spd&tahun=${tahun}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data || []);
      }
    } catch {
      setBanner({ type: "error", message: "Gagal memuat daftar SPD" });
    } finally {
      setLoading(false);
    }
  }

  async function loadOpd() {
    try {
      const res = await fetch("/api/master/opd?limit=500");
      const json = await res.json();
      if (json.success) setOpdList(json.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadOpd();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/perencanaan/kas-spd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "spd",
          tahunAnggaran: tahun,
          nomorSpd: formNomor,
          tanggalSpd: formTanggal,
          opdId: formOpdId,
          periode: formPeriode,
          jumlahSpd: parseFloat(formJumlah) || 0,
          keterangan: formKeterangan,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBanner({ type: "success", title: "Berhasil", message: json.message });
        setShowModal(false);
        setFormNomor("");
        setFormJumlah("");
        setFormKeterangan("");
        loadData();
      } else {
        setBanner({ type: "error", message: json.message });
      }
    } catch {
      setBanner({ type: "error", message: "Gagal menerbitkan SPD" });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredData = data.filter(
    (d) =>
      !search.trim() ||
      d.nomorSpd.toLowerCase().includes(search.toLowerCase()) ||
      d.nm_skpd.toLowerCase().includes(search.toLowerCase())
  );

  const totalNominalSpd = filteredData.reduce((acc, curr) => acc + curr.jumlahSpd, 0);

  return (
    <div className="space-y-6">
      {banner && <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-[#5E0E14] text-white shadow-sm">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Surat Penyediaan Dana (SPD)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Otorisasi kredit anggaran penerbitan dana bagi OPD Kabupaten Tapanuli Selatan TA {tahun}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tahun}
            onChange={(e) => setTahun(parseInt(e.target.value, 10))}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
          >
            <option value={2026}>TA 2026</option>
            <option value={2027}>TA 2027</option>
          </select>
          <button
            onClick={() => {
              setFormNomor(`SPD/${tahun}/001`);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white text-xs font-bold shadow-md hover:from-[#46090E] hover:to-[#7F1D1D] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan SPD Baru</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nomor SPD atau nama SKPD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div className="text-xs font-bold text-slate-700">
            Total Alokasi SPD: <span className="font-mono text-emerald-800">{formatRupiah(totalNominalSpd)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#5E0E14] text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-12 text-center">No</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 w-44">Nomor SPD</th>
                <th className="py-3 px-3 border-r border-[#7B111A]/60 w-32 text-center">Tanggal</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60">Perangkat Daerah (OPD)</th>
                <th className="py-3 px-3.5 border-r border-[#7B111A]/60 text-center w-32">Periode</th>
                <th className="py-3 px-4 border-r border-[#7B111A]/60 text-right w-44">Jumlah SPD (Rp)</th>
                <th className="py-3 px-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat data SPD...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Belum ada SPD diterbitkan untuk TA {tahun}.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 odd:bg-white even:bg-slate-50/50">
                    <td className="py-2.5 px-3.5 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">{item.nomorSpd}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{formatTanggal(item.tanggalSpd)}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {item.kd_skpd} — {item.nm_skpd}
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-400 font-normal">{item.keterangan}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-amber-900">
                      {item.periode}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-800">
                      {formatRupiah(item.jumlahSpd)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Terbitkan SPD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-[#991B1B] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold">Terbitkan Surat Penyediaan Dana (SPD)</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Nomor SPD <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNomor}
                    onChange={(e) => setFormNomor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Tanggal SPD <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Organisasi Perangkat Daerah (OPD) <span className="text-red-600">*</span>
                </label>
                <SearchableSelect
                  options={opdList.map((o) => ({
                    value: o.id,
                    label: `${o.kd_skpd} — ${o.nm_skpd}`,
                    badge: o.kd_skpd,
                    subLabel: o.nm_skpd,
                  }))}
                  value={formOpdId}
                  onChange={(val) => setFormOpdId(val)}
                  placeholder="-- Pilih OPD Penerima SPD --"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Periode <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formPeriode}
                    onChange={(e) => setFormPeriode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Triwulan I">Triwulan I</option>
                    <option value="Triwulan II">Triwulan II</option>
                    <option value="Triwulan III">Triwulan III</option>
                    <option value="Triwulan IV">Triwulan IV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Jumlah Dana SPD (Rp) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Keterangan / Dasar Alokasi</label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: DIPA/DPA Triwulan I TA 2027"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#991B1B] rounded-xl shadow-md disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : "Terbitkan SPD"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
