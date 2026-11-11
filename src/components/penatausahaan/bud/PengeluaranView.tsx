"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  FileCheck2,
  Receipt,
  Download,
  CreditCard,
  Landmark,
} from "lucide-react";

interface Sp2dCairItem {
  id: string;
  tahunAnggaran: number;
  no_sp2d: string;
  tgl_sp2d: string;
  tgl_cair: string | null;
  no_spm: string;
  no_spp: string;
  kd_skpd: string;
  nm_skpd: string;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  nama_penerima: string | null;
  bank_penerima: string | null;
  rek_penerima: string | null;
  nama_bank_pembayar: string | null;
  rek_bank_pembayar: string | null;
  no_transaksi_bank: string | null;
  status: string;
  spm?: {
    potonganList?: Array<{
      kd_rek6: string;
      nm_rek6: string;
      id_billing?: string | null;
      nilai: number;
    }>;
  };
}

export default function PengeluaranView() {
  const [dataList, setDataList] = useState<Sp2dCairItem[]>([]);
  const [summary, setSummary] = useState({
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
    totalSp2dCair: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [opdList, setOpdList] = useState<Array<{ id: string; kd_skpd: string; nm_skpd: string }>>([]);

  // Load Referensi OPD
  useEffect(() => {
    async function loadRef() {
      try {
        const res = await fetch("/api/penatausahaan/bud/referensi");
        const json = await res.json();
        if (json.success) {
          setOpdList(json.data.opdList || []);
        }
      } catch (e) {
        console.error("Gagal memuat OPD:", e);
      }
    }
    loadRef();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterOpd !== "ALL") q.set("opdId", filterOpd);
      if (filterJenis !== "ALL") q.set("jenis_sp2d", filterJenis);
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (search) q.set("q", search);

      const res = await fetch(`/api/penatausahaan/bud/pengeluaran?${q.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
        setSummary(
          json.summary || {
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
            totalSp2dCair: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat daftar pengeluaran:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterOpd, filterJenis, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total SP2D Cair</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalSp2dCair} Dokumen
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1 inline-block">
            Telah ditransfer ke rekening penerima
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nilai Belanja (Bruto)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-700 mt-2">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Beban APBD Tahun 2026
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Potongan Pajak / Lainnya</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700 mt-2">
            - {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1 inline-block">
            Pemotongan e-Billing Pajak & IWP
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nilai Bersih Cair (Netto)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold mt-1 inline-block">
            Total Kas Keluar dari RKUD
          </span>
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
              placeholder="Cari No. SP2D / SPM / Penerima / Keperluan / No. Ref Bank..."
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
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E0E14]"
            >
              <option value="ALL">-- Seluruh Jenis SP2D --</option>
              <option value="UP">SP2D - UP</option>
              <option value="GU">SP2D - GU</option>
              <option value="TU">SP2D - TU</option>
              <option value="LS_GAJI">SP2D - LS Gaji & Tunjangan</option>
              <option value="LS_BARANG_JASA">SP2D - LS Pengadaan Barang & Jasa</option>
              <option value="UP_KKPD">SP2D - UP KKPD</option>
              <option value="GU_KKPD">SP2D - GU KKPD</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Dari Tanggal Cair"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Sampai Tanggal Cair"
            />
          </div>
        </form>
      </div>

      {/* Tabel Pengeluaran SP2D Cair */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Daftar Dokumen SP2D yang Telah Dicairkan (Kas Keluar)
            </h3>
            <p className="text-[11px] text-slate-500">
              Menampilkan seluruh Surat Perintah Pencairan Dana (SP2D) yang telah cair oleh Kuasa BUD
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Daftar</span>
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">No. SP2D / No. SPM</th>
                <th className="px-3.5 py-3">Tgl. Cair / Referensi Bank</th>
                <th className="px-3.5 py-3">SKPD / Penerima</th>
                <th className="px-3.5 py-3">Jenis / Keperluan</th>
                <th className="px-3.5 py-3 text-right">Nilai Bruto</th>
                <th className="px-3.5 py-3 text-right">Potongan</th>
                <th className="px-3.5 py-3 text-right">Nilai Cair (Netto)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat daftar SP2D yang cair...
                  </td>
                </tr>
              ) : dataList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data SP2D dengan status cair pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                dataList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-mono font-bold text-slate-900">{item.no_sp2d}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        SPM: {item.no_spm}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-emerald-800">
                        {item.tgl_cair
                          ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
                          : new Date(item.tgl_sp2d).toLocaleDateString("id-ID")}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Ref: {item.no_transaksi_bank || "-"}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{item.nm_skpd}</div>
                      <div className="text-[11px] text-slate-500">
                        Ke: {item.nama_penerima || "-"} ({item.bank_penerima || "Bank"})
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#88131A] border border-rose-200">
                        {item.jenis_sp2d.replace(/_/g, " ")}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1" title={item.keperluan}>
                        {item.keperluan}
                      </p>
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-700">
                      {formatRupiah(item.nilai)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-amber-700">
                      {item.nilai_potongan > 0 ? `- ${formatRupiah(item.nilai_potongan)}` : "-"}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(item.nilai_bersih)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {dataList.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right">
                    Total Pengeluaran SP2D Cair:
                  </td>
                  <td className="px-4 py-3 text-right text-slate-800 font-mono">
                    {formatRupiah(summary.totalBruto)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 font-mono">
                    - {formatRupiah(summary.totalPotongan)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-mono text-sm">
                    {formatRupiah(summary.totalNetto)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

