"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Building2,
  DollarSign,
  Printer,
  RefreshCw,
  Search,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
} from "lucide-react";

interface BkuItem {
  id: string;
  tanggal: string;
  no_bukti: string;
  jenis: "PENERIMAAN" | "PENGELUARAN";
  uraian: string;
  skpd: string;
  debit: number;
  kredit: number;
  saldo: number;
  sumber_dana?: string | null;
  no_rek?: string | null;
}

export default function BkuView() {
  const [items, setItems] = useState<BkuItem[]>([]);
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [totalPenerimaan, setTotalPenerimaan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [saldoAkhir, setSaldoAkhir] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter
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

      const res = await fetch(`/api/penatausahaan/bud/bku?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSaldoAwal(json.data.saldoAwal || 0);
        setTotalPenerimaan(json.data.totalPenerimaan || 0);
        setTotalPengeluaran(json.data.totalPengeluaran || 0);
        setSaldoAkhir(json.data.saldoAkhir || 0);
      }
    } catch (e) {
      console.error("Gagal memuat BKU:", e);
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
      {/* 4 Cards Summary BKU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo Awal Kasda</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2 font-mono">
            {formatRupiah(saldoAwal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            {startDate ? `Per sebelum ${startDate}` : "Awal Tahun Anggaran"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">Penerimaan (Debit)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-teal-700 mt-2 font-mono">
            + {formatRupiah(totalPenerimaan)}
          </div>
          <span className="text-[11px] text-teal-700 mt-1 inline-block">
            Kas Masuk / Penyetoran Daerah
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Pengeluaran (Kredit)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#88131A] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#88131A] mt-2 font-mono">
            - {formatRupiah(totalPengeluaran)}
          </div>
          <span className="text-[11px] text-rose-700 mt-1 inline-block">
            Kas Keluar / SP2D Cair
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo Akhir Kasda</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-800 mt-2 font-mono">
            {formatRupiah(saldoAkhir)}
          </div>
          <span className="text-[11px] text-blue-700 font-semibold mt-1 inline-block">
            Posisi Kas di Bank RKUD
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Buku Kas Umum</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tabel BKU Kas Daerah */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Buku Kas Umum Daerah (BKU Kasda BUD)
            </h3>
            <p className="text-[11px] text-slate-500">
              Arus Kas Masuk (Penerimaan STS) & Kas Keluar (Pencairan SP2D) secara kronologis
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Total {items.length} Mutasi Transaksi
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 text-center">No</th>
                <th className="px-3.5 py-3">Tanggal</th>
                <th className="px-3.5 py-3">Nomor Bukti</th>
                <th className="px-3.5 py-3">SKPD / Unit</th>
                <th className="px-3.5 py-3">Uraian Transaksi</th>
                <th className="px-3.5 py-3 text-right">Penerimaan (Debit)</th>
                <th className="px-3.5 py-3 text-right">Pengeluaran (Kredit)</th>
                <th className="px-3.5 py-3 text-right">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Baris Saldo Awal */}
              <tr className="bg-slate-50/60 font-semibold text-slate-700">
                <td className="px-3.5 py-2.5 text-center text-slate-400">-</td>
                <td className="px-3.5 py-2.5">{startDate || "Awal Periode"}</td>
                <td className="px-3.5 py-2.5 font-mono text-slate-500">-</td>
                <td className="px-3.5 py-2.5">Kas Daerah</td>
                <td className="px-3.5 py-2.5 italic">SALDO AWAL KAS DAERAH</td>
                <td className="px-3.5 py-2.5 text-right">-</td>
                <td className="px-3.5 py-2.5 text-right">-</td>
                <td className="px-3.5 py-2.5 text-right font-mono font-bold text-blue-700">
                  {formatRupiah(saldoAwal)}
                </td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Memuat data Buku Kas Umum...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs italic text-slate-400">
                    Tidak ada mutasi penerimaan atau pengeluaran pada rentang waktu ini.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isMasuk = item.jenis === "PENERIMAAN";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-mono font-bold text-slate-900">{item.no_bukti}</div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                            isMasuk
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-rose-50 text-[#88131A] border border-rose-200"
                          }`}
                        >
                          {item.jenis}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="font-semibold text-slate-800">{item.skpd}</span>
                      </td>
                      <td className="px-3.5 py-3 max-w-sm truncate" title={item.uraian}>
                        {item.uraian}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-teal-700">
                        {item.debit > 0 ? formatRupiah(item.debit) : "-"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-[#88131A]">
                        {item.kredit > 0 ? formatRupiah(item.kredit) : "-"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.saldo)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right">
                  Total Mutasi & Saldo Akhir:
                </td>
                <td className="px-4 py-3 text-right text-teal-700 font-mono">
                  + {formatRupiah(totalPenerimaan)}
                </td>
                <td className="px-4 py-3 text-right text-[#88131A] font-mono">
                  - {formatRupiah(totalPengeluaran)}
                </td>
                <td className="px-4 py-3 text-right text-blue-800 font-mono text-sm">
                  {formatRupiah(saldoAkhir)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

