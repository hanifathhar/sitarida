'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Download, 
  RefreshCw, 
  Calendar, 
  Building2, 
  CreditCard, 
  Filter, 
  Coins, 
  Receipt,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import SearchableSelect, { SelectOption } from '@/components/ui/SearchableSelect';

interface OpdOption {
  id: string;
  kode: string;
  nama: string;
}

interface RegisterItem {
  id: string;
  noKwitansi: string;
  tglKwitansi: string;
  tahunAnggaran: number;
  jnsBeban: string;
  kdSkpd: string;
  nmSkpd: string;
  kdSubKegiatan: string;
  nmSubKegiatan: string;
  kdRek6: string;
  nmRek6: string;
  uraian: string;
  status: string;
  nilaiBruto: number;
  nilaiPotongan: number;
  nilaiNetto: number;
  penerima: {
    nama: string;
    bank: string;
    rekening: string;
    npwp?: string | null;
  }[];
  potongan: {
    jenisPotongan: string;
    idBilling?: string | null;
    ntpn?: string | null;
    nilai: number;
  }[];
}

interface SummaryData {
  totalItems: number;
  totalBruto: number;
  totalPotongan: number;
  totalNetto: number;
}

export default function RegisterKwitansiView() {
  const [data, setData] = useState<RegisterItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalItems: 0,
    totalBruto: 0,
    totalPotongan: 0,
    totalNetto: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [jnsBeban, setJnsBeban] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [selectedOpdId, setSelectedOpdId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Dropdown options
  const [opdList, setOpdList] = useState<OpdOption[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userOpdId, setUserOpdId] = useState<string>('');

  // Format rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
  };

  // Format tanggal
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Load initial options
  useEffect(() => {
    fetchOptions();
  }, []);

  // Fetch register data when filters change
  useEffect(() => {
    fetchRegisterData();
  }, [startDate, endDate, jnsBeban, status, selectedOpdId]);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/penatausahaan/pengajuan/options');
      const json = await res.json();
      if (json.success) {
        setOpdList(json.data.opdList || []);
        setUserRole(json.data.userRole || '');
        setUserOpdId(json.data.userOpdId || '');
        if (json.data.userOpdId) {
          setSelectedOpdId(json.data.userOpdId);
        }
      }
    } catch (e) {
      console.error('Failed to fetch options', e);
    }
  };

  const fetchRegisterData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (jnsBeban) params.set('jnsBeban', jnsBeban);
      if (status) params.set('status', status);
      if (selectedOpdId) params.set('opdId', selectedOpdId);

      const res = await fetch(`/api/penatausahaan/pengajuan/register?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const items = json.data?.items || json.items || [];
        const summaryData = json.data?.summary || json.summary || {
          totalItems: 0,
          totalBruto: 0,
          totalPotongan: 0,
          totalNetto: 0,
        };
        setData(items);
        setSummary(summaryData);
      }
    } catch (e) {
      console.error('Failed to fetch register data', e);
    } finally {
      setLoading(false);
    }
  };

  const opdOptions: SelectOption[] = useMemo(() => {
    return opdList.map((opd) => ({
      value: opd.id,
      label: opd.nama,
      badge: opd.kode,
      badgeColor: "bg-red-50 text-[#991B1B] border-red-200 font-mono font-bold",
    }));
  }, [opdList]);

  const filteredData = data.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.noKwitansi.toLowerCase().includes(q) ||
      item.uraian.toLowerCase().includes(q) ||
      item.nmSubKegiatan.toLowerCase().includes(q) ||
      item.nmRek6.toLowerCase().includes(q) ||
      item.penerima.some((p) => p.nama.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'No',
      'No Kuitansi',
      'Tanggal',
      'Beban',
      'Sub Kegiatan',
      'Rekening Belanja',
      'Uraian',
      'Penerima',
      'Bruto (Rp)',
      'Potongan (Rp)',
      'Netto (Rp)',
      'Status',
    ];

    const rows = filteredData.map((item, index) => [
      index + 1,
      `"${item.noKwitansi}"`,
      `"${formatDate(item.tglKwitansi)}"`,
      `"${item.jnsBeban}"`,
      `"${item.kdSubKegiatan} - ${item.nmSubKegiatan}"`,
      `"${item.kdRek6} - ${item.nmRek6}"`,
      `"${item.uraian.replace(/"/g, '""')}"`,
      `"${item.penerima.map((p) => p.nama).join(', ')}"`,
      item.nilaiBruto,
      item.nilaiPotongan,
      item.nilaiNetto,
      `"${item.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Register_Kuitansi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedOpdName = opdList.find((o) => o.id === selectedOpdId)?.nama || 'Semua Perangkat Daerah';

  return (
    <div className="space-y-6 p-6">
      {/* Header Screen (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Register Kuitansi Pengajuan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Buku register dan rekapitulasi pengajuan kuitansi belanja daerah
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegisterData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak Register
          </button>
        </div>
      </div>

      {/* Printable Report Header (only visible on print) */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN</h2>
        <h1 className="text-lg font-extrabold uppercase mt-1">BUKU REGISTER KUITANSI PENGAJUAN</h1>
        <p className="text-xs font-semibold text-slate-700 mt-1 uppercase">
          PERANGKAT DAERAH: {selectedOpdName}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {startDate || endDate
            ? `Periode: ${startDate ? formatDate(startDate) : 'Awal'} s.d ${endDate ? formatDate(endDate) : 'Sekarang'}`
            : `Tahun Anggaran: ${new Date().getFullYear()}`}
        </p>
        <div className="border-b-2 border-black mt-3"></div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Kuitansi</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{summary.totalItems} Dokumen</p>
            <p className="text-xs text-slate-400 mt-1">Sesuai filter kriteria</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Nilai Bruto</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatRupiah(summary.totalBruto)}</p>
            <p className="text-xs text-slate-400 mt-1">Nilai kotor belanja</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Potongan Pajak</p>
            <p className="text-xl font-bold text-rose-600 mt-1">{formatRupiah(summary.totalPotongan)}</p>
            <p className="text-xs text-slate-400 mt-1">PPN, PPh & potongan lain</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Nilai Netto</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatRupiah(summary.totalNetto)}</p>
            <p className="text-xs text-slate-400 mt-1">Jumlah yang dibayarkan</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Section (Hidden on Print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Filter className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Filter Pencarian & Parameter Register</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* OPD Selector (if superadmin or not restricted) */}
          {(userRole === '0' || !userOpdId) && (
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Perangkat Daerah (SKPD)</label>
              <SearchableSelect
                options={opdOptions}
                value={selectedOpdId}
                onChange={(val) => setSelectedOpdId(val)}
                placeholder="-- Semua OPD --"
                searchPlaceholder="Cari kode atau nama OPD..."
                allowClear={true}
                clearLabel="-- Semua OPD --"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Mulai Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Beban</label>
            <select
              value={jnsBeban}
              onChange={(e) => setJnsBeban(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">-- Semua Beban --</option>
              <option value="UP">UP (Uang Persediaan)</option>
              <option value="GU">GU (Ganti Uang)</option>
              <option value="TU">TU (Tambah Uang)</option>
              <option value="LS">LS (Langsung)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status Kuitansi</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">-- Semua Status --</option>
              <option value="DRAFT">DRAFT</option>
              <option value="DIAJUKAN">DIAJUKAN</option>
              <option value="DISETUJUI">DISETUJUI (PA/KPA)</option>
              <option value="DITOLAK">DITOLAK</option>
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative pt-2">
          <Search className="w-4 h-4 absolute left-3 top-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor kuitansi, uraian belanja, sub kegiatan, atau nama penerima..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Table Register */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 print:bg-transparent print:border-black">
              <tr>
                <th className="py-3 px-3 w-10 text-center border-r border-slate-200 print:border-black">No</th>
                <th className="py-3 px-3 min-w-[140px] border-r border-slate-200 print:border-black">No. Kuitansi & Tgl</th>
                <th className="py-3 px-3 min-w-[200px] border-r border-slate-200 print:border-black">Sub Kegiatan & Rekening</th>
                <th className="py-3 px-3 min-w-[220px] border-r border-slate-200 print:border-black">Uraian Pembayaran</th>
                <th className="py-3 px-3 min-w-[180px] border-r border-slate-200 print:border-black">Penerima & Rekening</th>
                <th className="py-3 px-3 min-w-[150px] border-r border-slate-200 print:border-black">ID Billing / NTPN</th>
                <th className="py-3 px-3 text-right min-w-[120px] border-r border-slate-200 print:border-black">Nilai Bruto</th>
                <th className="py-3 px-3 text-right min-w-[110px] border-r border-slate-200 print:border-black">Potongan</th>
                <th className="py-3 px-3 text-right min-w-[120px] border-r border-slate-200 print:border-black">Nilai Netto</th>
                <th className="py-3 px-3 text-center min-w-[90px] print:border-black">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-black">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data register kuitansi...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada data kuitansi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center font-medium text-slate-500 border-r border-slate-100 print:border-black">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 print:border-black">
                      <div className="font-semibold text-slate-900">{item.noKwitansi}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(item.tglKwitansi)}</div>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 mt-1">
                        Beban {item.jnsBeban}
                      </span>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 print:border-black">
                      <div className="text-slate-900 font-medium leading-tight">
                        <span className="font-mono text-indigo-600 text-[11px]">{item.kdSubKegiatan}</span>
                        <div className="line-clamp-2">{item.nmSubKegiatan}</div>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-1 pt-1 border-t border-slate-100">
                        <span className="font-mono text-slate-500">{item.kdRek6}</span> - {item.nmRek6}
                      </div>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 print:border-black">
                      <p className="text-slate-700 leading-snug line-clamp-3">{item.uraian}</p>
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 print:border-black">
                      {item.penerima && item.penerima.length > 0 ? (
                        <div className="space-y-1">
                          {item.penerima.map((p, pIdx) => (
                            <div key={pIdx} className="text-[11px] leading-tight">
                              <span className="font-semibold text-slate-800">{p.nama}</span>
                              <div className="text-slate-500">
                                {p.bank} • <span className="font-mono">{p.rekening}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 border-r border-slate-100 print:border-black">
                      {item.potongan && item.potongan.length > 0 ? (
                        <div className="space-y-1">
                          {item.potongan.map((pot, potIdx) => (
                            <div key={potIdx} className="text-[11px] leading-tight">
                              <span className="font-medium text-slate-700">{pot.jenisPotongan}</span>:
                              {pot.idBilling ? (
                                <div className="text-[10px] text-slate-500">
                                  Billing: <span className="font-mono font-bold text-indigo-700">{pot.idBilling}</span>
                                </div>
                              ) : null}
                              {pot.ntpn ? (
                                <div className="text-[10px] text-slate-500">
                                  NTPN: <span className="font-mono font-bold text-emerald-700">{pot.ntpn}</span>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Tanpa potongan</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 border-r border-slate-100 print:border-black">
                      {formatRupiah(item.nilaiBruto)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-rose-600 border-r border-slate-100 print:border-black">
                      {formatRupiah(item.nilaiPotongan)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700 border-r border-slate-100 print:border-black">
                      {formatRupiah(item.nilaiNetto)}
                    </td>
                    <td className="py-3 px-3 text-center print:border-black">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'DISETUJUI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'DIAJUKAN'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'DITOLAK'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 print:border-black">
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-slate-700 border-r border-slate-200 print:border-black">
                    Total Rekapitulasi:
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-200 print:border-black">
                    {formatRupiah(summary.totalBruto)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 border-r border-slate-200 print:border-black">
                    {formatRupiah(summary.totalPotongan)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-800 border-r border-slate-200 print:border-black">
                    {formatRupiah(summary.totalNetto)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Printable Signatures Block (only visible on print) */}
      <div className="hidden print:grid grid-cols-2 gap-8 mt-12 text-center text-xs">
        <div>
          <p className="font-semibold">Mengetahui,</p>
          <p className="font-bold">Pengguna Anggaran / KPA</p>
          <div className="h-24"></div>
          <p className="font-bold underline uppercase">( ..................................................... )</p>
          <p className="text-[10px]">NIP. .....................................................</p>
        </div>
        <div>
          <p className="font-semibold">
            Dicetak Pada: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="font-bold">Bendahara Pengeluaran / PPTK</p>
          <div className="h-24"></div>
          <p className="font-bold underline uppercase">( ..................................................... )</p>
          <p className="text-[10px]">NIP. .....................................................</p>
        </div>
      </div>
    </div>
  );
}

