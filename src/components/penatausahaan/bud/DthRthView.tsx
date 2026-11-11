"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  DollarSign,
  Layers,
} from "lucide-react";

interface DthItem {
  noUrut: number;
  id: string;
  tgl_cair: string | null;
  no_sp2d: string;
  no_spm: string;
  kd_skpd: string;
  nm_skpd: string;
  nama_penerima: string | null;
  npwp_penerima: string | null;
  keperluan: string;
  nilai_bruto: number;
  nilai_potongan: number;
  nilai_netto: number;
  no_transaksi_bank: string | null;
  potongan: Array<{
    kd_rek6: string;
    nm_rek6: string;
    id_billing?: string | null;
    nilai: number;
  }>;
}

interface RthItem {
  kd_rek6: string;
  nm_rek6: string;
  jumlahTransaksi: number;
  totalNilai: number;
  billingCount: number;
}

export default function DthRthView() {
  const [activeTab, setActiveTab] = useState<"DTH" | "RTH">("DTH");
  const [dthList, setDthList] = useState<DthItem[]>([]);
  const [rthList, setRthList] = useState<RthItem[]>([]);
  const [summary, setSummary] = useState({
    totalTransaksiSp2d: 0,
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterOpd, setFilterOpd] = useState("ALL");
  const [opdList, setOpdList] = useState<Array<{ id: string; kd_skpd: string; nm_skpd: string }>>([]);

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
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      if (filterOpd !== "ALL") q.set("opdId", filterOpd);

      const res = await fetch(`/api/penatausahaan/bud/dth-rth?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDthList(json.data.dth || []);
        setRthList(json.data.rth || []);
        setSummary(
          json.data.summary || {
            totalTransaksiSp2d: 0,
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
          }
        );
      }
    } catch (e) {
      console.error("Gagal memuat DTH dan RTH:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterOpd]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* 4 Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jumlah Transaksi DTH</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalTransaksiSp2d} Transaksi
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1 inline-block">
            SP2D Belanja yang Dicairkan
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Belanja Bruto</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-700 mt-2 font-mono">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Nilai Pengeluaran Rekening Kasda
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Total Potongan Pajak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700 mt-2 font-mono">
            {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-semibold mt-1 inline-block">
            {rthList.length} Akun Pemotongan Pajak
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Total Bersih / Netto</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2 font-mono">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold mt-1 inline-block">
            Diterima Rekening Rekanan / Pegawai
          </span>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Toggle Tab */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("DTH")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "DTH"
                ? "bg-white text-[#88131A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daftar Transaksi Harian (DTH)
          </button>
          <button
            onClick={() => setActiveTab("RTH")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "RTH"
                ? "bg-white text-[#88131A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rekapitulasi Transaksi Harian (RTH)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Dari Tanggal"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none"
              title="Sampai Tanggal"
            />
          </div>

          <div>
            <select
              value={filterOpd}
              onChange={(e) => setFilterOpd(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="ALL">-- Seluruh SKPD / OPD --</option>
              {opdList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.kd_skpd} - {o.nm_skpd}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak {activeTab}</span>
          </button>
        </div>
      </div>

      {/* Konten Tab DTH */}
      {activeTab === "DTH" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Daftar Transaksi Harian (DTH) Pengeluaran SP2D & Potongan Pajak
              </h3>
              <p className="text-[11px] text-slate-500">
                Laporan transaksi pencairan dana SP2D per tanggal transaksi beserta ID Billing e-Pajak
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {dthList.length} Rekord Dokumen
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3 text-center">No</th>
                  <th className="px-3.5 py-3">Tgl. Cair / No. SP2D</th>
                  <th className="px-3.5 py-3">SKPD / Penerima / NPWP</th>
                  <th className="px-3.5 py-3">Keperluan Pembayaran</th>
                  <th className="px-3.5 py-3 text-right">Bruto (Rp)</th>
                  <th className="px-3.5 py-3 text-right">Potongan (Rp)</th>
                  <th className="px-3.5 py-3 text-right">Netto (Rp)</th>
                  <th className="px-3.5 py-3">Rincian Potongan & ID Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                      Memuat data Daftar Transaksi Harian (DTH)...
                    </td>
                  </tr>
                ) : dthList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                      Tidak ada data transaksi DTH pada periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  dthList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                        {item.noUrut}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">
                          {item.tgl_cair
                            ? new Date(item.tgl_cair).toLocaleDateString("id-ID")
                            : "-"}
                        </div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {item.no_sp2d}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">{item.nm_skpd}</div>
                        <div className="text-[11px] text-slate-600">
                          Penerima: {item.nama_penerima || "-"}
                        </div>
                        {item.npwp_penerima && (
                          <div className="text-[10px] font-mono text-slate-500">
                            NPWP: {item.npwp_penerima}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 max-w-xs truncate" title={item.keperluan}>
                        {item.keperluan}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-800">
                        {formatRupiah(item.nilai_bruto)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono text-amber-700">
                        {item.nilai_potongan > 0 ? `- ${formatRupiah(item.nilai_potongan)}` : "-"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(item.nilai_netto)}
                      </td>
                      <td className="px-3.5 py-3">
                        {item.potongan.length === 0 ? (
                          <span className="text-[11px] italic text-slate-400">Nihil</span>
                        ) : (
                          <div className="space-y-1">
                            {item.potongan.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100"
                              >
                                <div className="font-semibold text-slate-700">
                                  {p.nm_rek6} ({formatRupiah(p.nilai)})
                                </div>
                                {p.id_billing ? (
                                  <div className="font-mono text-[10px] text-teal-700 font-bold">
                                    ID Billing: {p.id_billing}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-rose-500 italic">
                                    Belum ada ID Billing
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Konten Tab RTH */}
      {activeTab === "RTH" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Rekapitulasi Transaksi Harian (RTH) Pemotongan Pajak
              </h3>
              <p className="text-[11px] text-slate-500">
                Akumulasi seluruh pemotongan pajak (PPN, PPh, IWP, Pajak Daerah) untuk rekonsiliasi KPPN / Bapenda
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {rthList.length} Akun Rekening
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3 text-center">No</th>
                  <th className="px-3.5 py-3">Kode Akun Rekening</th>
                  <th className="px-3.5 py-3">Uraian Jenis Pajak / Potongan</th>
                  <th className="px-3.5 py-3 text-center">Jumlah SP2D Pemungut</th>
                  <th className="px-3.5 py-3 text-center">Ketersediaan ID Billing</th>
                  <th className="px-3.5 py-3 text-right">Total Potongan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                      Memuat data Rekapitulasi Transaksi Harian (RTH)...
                    </td>
                  </tr>
                ) : rthList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs italic text-slate-400">
                      Tidak ada pemotongan pajak pada periode transaksi yang dipilih.
                    </td>
                  </tr>
                ) : (
                  rthList.map((item, idx) => (
                    <tr key={item.kd_rek6} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                        {item.kd_rek6}
                      </td>
                      <td className="px-3.5 py-3 font-semibold text-slate-800">
                        {item.nm_rek6}
                      </td>
                      <td className="px-3.5 py-3 text-center font-medium">
                        {item.jumlahTransaksi} Transaksi
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>{item.billingCount} / {item.jumlahTransaksi} Terisi</span>
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-amber-700">
                        {formatRupiah(item.totalNilai)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rthList.length > 0 && (
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">
                      Total Seluruh Pemotongan Pajak (RTH):
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 font-mono text-sm">
                      {formatRupiah(summary.totalPotongan)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

