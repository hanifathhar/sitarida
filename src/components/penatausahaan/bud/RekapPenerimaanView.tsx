"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Building2,
  DollarSign,
  Printer,
  RefreshCw,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface RekapOpdItem {
  kd_skpd: string;
  nm_skpd: string;
  totalTransaksi: number;
  totalNilai: number;
}

interface RekapSumberItem {
  sumber_dana: string;
  totalTransaksi: number;
  totalNilai: number;
}

interface RekapRekeningItem {
  kd_rek6: string;
  nm_rek6: string;
  totalNilai: number;
  count: number;
}

export default function RekapPenerimaanView() {
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [perOpd, setPerOpd] = useState<RekapOpdItem[]>([]);
  const [perSumber, setPerSumber] = useState<RekapSumberItem[]>([]);
  const [perRekening, setPerRekening] = useState<RekapRekeningItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);

      const res = await fetch(`/api/penatausahaan/bud/rekap-penerimaan?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setGrandTotal(json.data.grandTotal || 0);
        setTotalTransaksi(json.data.totalTransaksi || 0);
        setPerOpd(json.data.perOpd || []);
        setPerSumber(json.data.perSumber || []);
        setPerRekening(json.data.perRekening || []);
      }
    } catch (e) {
      console.error("Gagal memuat rekap penerimaan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Akumulasi Penerimaan
            </span>
            <div className="text-2xl font-black text-teal-700 font-mono mt-0.5">
              {formatRupiah(grandTotal)}
            </div>
            <span className="text-[11px] text-slate-400">Kas Daerah Tahun Anggaran 2026</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Dokumen Penerimaan
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {totalTransaksi} Transaksi
            </div>
            <span className="text-[11px] text-slate-400">Dari {perOpd.length} Perangkat Daerah</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#88131A]">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Kontributor OPD Tertinggi
            </span>
            <div className="text-sm font-bold text-slate-900 truncate max-w-[200px] mt-0.5" title={perOpd[0]?.nm_skpd}>
              {perOpd[0]?.nm_skpd || "-"}
            </div>
            <span className="text-[11px] font-mono font-bold text-teal-700">
              {perOpd[0] ? formatRupiah(perOpd[0].totalNilai) : "Rp 0"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Rentang Periode:</span>
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekapitulasi</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Grid: Rekap Per OPD & Rekap Per Sumber Dana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rekap Per OPD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Penerimaan Per SKPD / OPD
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3.5 py-2.5 text-center">No</th>
                  <th className="px-3.5 py-2.5">SKPD / OPD</th>
                  <th className="px-3.5 py-2.5 text-center">Transaksi</th>
                  <th className="px-3.5 py-2.5 text-right">Nilai Penerimaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perOpd.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs italic text-slate-400">
                      Belum ada data penerimaan OPD.
                    </td>
                  </tr>
                ) : (
                  perOpd.map((opd, idx) => (
                    <tr key={opd.kd_skpd} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-800">{opd.nm_skpd}</div>
                        <div className="font-mono text-[10px] text-slate-500">{opd.kd_skpd}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">{opd.totalTransaksi}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-teal-700">
                        {formatRupiah(opd.totalNilai)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekap Per Sumber Dana */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Penerimaan Per Sumber Dana
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3.5 py-2.5 text-center">No</th>
                  <th className="px-3.5 py-2.5">Sumber Dana</th>
                  <th className="px-3.5 py-2.5 text-center">Transaksi</th>
                  <th className="px-3.5 py-2.5 text-right">Total Disetor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {perSumber.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs italic text-slate-400">
                      Belum ada data sumber dana.
                    </td>
                  </tr>
                ) : (
                  perSumber.map((s, idx) => (
                    <tr key={s.sumber_dana} className="hover:bg-slate-50">
                      <td className="px-3.5 py-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                        {s.sumber_dana}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">{s.totalTransaksi}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-teal-700">
                        {formatRupiah(s.totalNilai)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel Rekap Per Rekening Pendapatan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Rekapitulasi Realisasi Pendapatan Per Kode Rekening (trdkasin)
          </h3>
          <span className="text-xs text-slate-500">{perRekening.length} Rekening Pendapatan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">Kode Akun Rekening</th>
                <th className="px-3.5 py-3">Uraian Rekening Pendapatan</th>
                <th className="px-3.5 py-3 text-center">Frekuensi Setor</th>
                <th className="px-3.5 py-3 text-right">Total Nilai Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perRekening.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs italic text-slate-400">
                    Belum ada data rekening pendapatan pada filter ini.
                  </td>
                </tr>
              ) : (
                perRekening.map((rek, idx) => (
                  <tr key={rek.kd_rek6} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {rek.kd_rek6}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                      {rek.nm_rek6}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">{rek.count} kali</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-teal-700">
                      {formatRupiah(rek.totalNilai)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {perRekening.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-800">
                    Total Realisasi Penerimaan:
                  </td>
                  <td className="px-4 py-3 text-right text-teal-700 font-mono text-sm">
                    {formatRupiah(grandTotal)}
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

