"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Building2,
  DollarSign,
  Printer,
  RefreshCw,
  FileCheck2,
  Receipt,
  Layers,
  CreditCard,
} from "lucide-react";

interface RekapJenisItem {
  jenis_sp2d: string;
  totalSp2d: number;
  totalBruto: number;
  totalPotongan: number;
  totalNetto: number;
}

interface RekapOpdItem {
  kd_skpd: string;
  nm_skpd: string;
  totalSp2d: number;
  totalBruto: number;
  totalPotongan: number;
  totalNetto: number;
}

export default function RekapPengeluaranView() {
  const [summary, setSummary] = useState({
    totalSp2d: 0,
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
  });
  const [perJenis, setPerJenis] = useState<RekapJenisItem[]>([]);
  const [perOpd, setPerOpd] = useState<RekapOpdItem[]>([]);
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

      const res = await fetch(`/api/penatausahaan/bud/rekap-pengeluaran?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(
          json.data.summary || {
            totalSp2d: 0,
            totalBruto: 0,
            totalPotongan: 0,
            totalNetto: 0,
          }
        );
        setPerJenis(json.data.perJenis || []);
        setPerOpd(json.data.perOpd || []);
      }
    } catch (e) {
      console.error("Gagal memuat rekap pengeluaran:", e);
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
      {/* 4 Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jumlah SP2D Dicairkan</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.totalSp2d} Dokumen
          </div>
          <span className="text-[11px] text-teal-700 font-semibold mt-1 inline-block">
            Dari {perOpd.length} Perangkat Daerah
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Belanja (Bruto)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-700 mt-2 font-mono">
            {formatRupiah(summary.totalBruto)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            Anggaran Belanja Daerah
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
            - {formatRupiah(summary.totalPotongan)}
          </div>
          <span className="text-[11px] text-amber-800 font-medium mt-1 inline-block">
            Dipungut & Diteruskan ke Kas Negara
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Total Bersih Ditransfer</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2 font-mono">
            {formatRupiah(summary.totalNetto)}
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold mt-1 inline-block">
            Kas Keluar dari RKUD (Netto)
          </span>
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

      {/* Tabel 1: Rekap Per Jenis SP2D */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Rekapitulasi Pengeluaran Kas Daerah Berdasarkan Jenis SP2D
          </h3>
          <p className="text-[11px] text-slate-500">
            Rincian realisasi belanja Uang Persediaan (UP), Ganti Uang (GU), Tambah Uang (TU), dan Langsung (LS)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">Jenis Dokumen SP2D</th>
                <th className="px-3.5 py-3 text-center">Jumlah SP2D Cair</th>
                <th className="px-3.5 py-3 text-right">Nilai Bruto</th>
                <th className="px-3.5 py-3 text-right">Potongan Pajak</th>
                <th className="px-3.5 py-3 text-right">Nilai Bersih (Netto)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perJenis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs italic text-slate-400">
                    Belum ada pengeluaran SP2D cair.
                  </td>
                </tr>
              ) : (
                perJenis.map((item, idx) => (
                  <tr key={item.jenis_sp2d} className="hover:bg-slate-50">
                    <td className="px-3.5 py-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-3.5 py-3">
                      <span className="font-bold text-slate-900">
                        SP2D {item.jenis_sp2d.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center font-medium">
                      {item.totalSp2d} Dokumen
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-medium text-slate-700">
                      {formatRupiah(item.totalBruto)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-amber-700">
                      {item.totalPotongan > 0 ? `- ${formatRupiah(item.totalPotongan)}` : "-"}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(item.totalNetto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {perJenis.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-mono">
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

      {/* Tabel 2: Rekap Per OPD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Pengeluaran Kas Daerah Berdasarkan SKPD / OPD
            </h3>
            <p className="text-[11px] text-slate-500">
              Total realisasi pencairan dana per Organisasi Perangkat Daerah
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{perOpd.length} Perangkat Daerah</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">Nama SKPD / Perangkat Daerah</th>
                <th className="px-3.5 py-3 text-center">Jumlah SP2D</th>
                <th className="px-3.5 py-3 text-right">Nilai Bruto</th>
                <th className="px-3.5 py-3 text-right">Potongan Pajak</th>
                <th className="px-3.5 py-3 text-right">Nilai Bersih Cair</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perOpd.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs italic text-slate-400">
                    Belum ada pengeluaran SP2D.
                  </td>
                </tr>
              ) : (
                perOpd.map((opd, idx) => (
                  <tr key={opd.kd_skpd} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-slate-900">{opd.nm_skpd}</div>
                      <div className="font-mono text-[10px] text-slate-500">{opd.kd_skpd}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-medium">
                      {opd.totalSp2d}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-medium text-slate-700">
                      {formatRupiah(opd.totalBruto)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-amber-700">
                      {opd.totalPotongan > 0 ? `- ${formatRupiah(opd.totalPotongan)}` : "-"}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(opd.totalNetto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {perOpd.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-slate-800">
                    Total Pengeluaran Seluruh OPD:
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 font-mono">
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

