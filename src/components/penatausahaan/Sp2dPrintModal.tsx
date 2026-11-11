"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import { terbilang } from "@/lib/utils";

export interface Sp2dPrintData {
  id: string;
  tahunAnggaran?: number;
  no_sp2d: string;
  tgl_sp2d: string;
  no_spm: string;
  tgl_spm?: string | null;
  no_spp?: string | null;
  tgl_spp?: string | null;
  no_spd?: string | null;
  tgl_spd?: string | null;
  kd_skpd: string;
  nm_skpd: string;
  kd_unit?: string | null;
  nm_unit?: string | null;
  jenis_sp2d: string;
  keperluan: string;
  nilai: number;
  nilai_potongan: number;
  nilai_bersih: number;
  nama_penerima?: string | null;
  bank_penerima?: string | null;
  rek_penerima?: string | null;
  npwp_penerima?: string | null;
  nama_bank_pembayar?: string | null;
  rek_bank_pembayar?: string | null;
  kuasaBudNama?: string | null;
  kuasaBudNip?: string | null;
  kuasaBudJabatan?: string | null;
  no_transaksi_bank?: string | null;
  rincianBelanja?: Array<{
    kd_sub_kegiatan: string;
    nm_sub_kegiatan: string;
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
  }>;
  potongan?: Array<{
    kd_rek6: string;
    nm_rek6: string;
    nilai: number;
    id_billing?: string | null;
    keterangan?: string | null;
  }>;
}

interface Sp2dPrintModalProps {
  data: Sp2dPrintData | null;
  onClose: () => void;
}

/**
 * Format angka rupiah standar cetakan SP2D: 379.236.060,00
 */
function formatNilaiSp2d(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,00";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format tanggal format angka: 04/11/2026
 */
function formatTglAngka(tglStr?: string | null): string {
  if (!tglStr) return "-";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format tanggal formal: 11 November 2026
 */
function formatTglIndo(tglStr?: string | null): string {
  if (!tglStr) return "-";
  const d = new Date(tglStr);
  if (isNaN(d.getTime())) return tglStr;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Sp2dPrintModal({ data, onClose }: Sp2dPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  function handlePrint() {
    window.print();
  }

  const tahunAnggaran = data.tahunAnggaran || 2026;
  const tglIndo = formatTglIndo(data.tgl_sp2d);
  const tglSpmAngka = formatTglAngka(data.tgl_spm);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header Dialog (Hidden saat cetak) */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Pratinjau Format Cetak SP2D (Sesuai Standar SP2D.pdf)
            </h3>
            <p className="text-xs text-slate-500">
              Format lembar Surat Perintah Pencairan Dana (SP2D) resmi Pemerintah Kabupaten Tapanuli Selatan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5E0E14] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#46090E] transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak SP2D</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Lembar Dokumen SP2D */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible bg-slate-100/60 print:bg-white">
          <div
            ref={printRef}
            className="sp2d-paper mx-auto max-w-[210mm] bg-white text-black text-[10px] leading-tight font-sans p-6 border border-slate-300 print:border-0 print:p-0 shadow-sm print:shadow-none"
          >
            {/* ========================================================================= */}
            {/* BINGKAI KOTAK UTAMA DOKUMEN SP2D */}
            {/* ========================================================================= */}
            <div className="border border-black">
              {/* 1. Baris Nomor Bank */}
              <div className="border-b border-black px-2 py-1 text-[10px]">
                <span>Nomor Bank : </span>
                <span className="font-mono font-medium">
                  {data.no_transaksi_bank || "005586"}
                </span>
              </div>

              {/* 2. Kop Dokumen: Pemkab Tapsel & Judul SP2D */}
              <div className="grid grid-cols-12 border-b border-black">
                {/* Kiri: Logo & Pemkab Tapsel */}
                <div className="col-span-6 border-r border-black p-2 flex items-center justify-center gap-3">
                  <img
                    src="/Logo-Tapsel.png"
                    alt="Logo Tapanuli Selatan"
                    className="h-14 w-auto object-contain"
                  />
                  <div className="text-center">
                    <div className="text-[11px] font-bold uppercase tracking-wider leading-snug">
                      PEMERINTAH
                    </div>
                    <div className="text-xs font-black uppercase tracking-wider leading-snug">
                      KABUPATEN TAPANULI SELATAN
                    </div>
                  </div>
                </div>

                {/* Kanan: Nomor & Judul SP2D */}
                <div className="col-span-6 p-2 text-center flex flex-col justify-center">
                  <div className="text-[10px]">Nomor :</div>
                  <div className="font-mono font-bold text-[11px] tracking-tight">
                    {data.no_sp2d}
                  </div>
                  <div className="font-bold text-[11px] uppercase tracking-wide mt-1">
                    SURAT PERINTAH PENCAIRAN DANA
                  </div>
                  <div className="font-bold text-[11px] uppercase">
                    (SP2D)
                  </div>
                </div>
              </div>

              {/* 3. Baris Informasi SPM, SKPD, dan SPD (2 Kolom) */}
              <div className="grid grid-cols-12 border-b border-black text-[10px]">
                {/* Kolom Kiri */}
                <div className="col-span-6 border-r border-black p-2 space-y-1">
                  <div className="flex">
                    <span className="w-28 shrink-0">Nomor SPM</span>
                    <span className="font-mono font-medium">: {data.no_spm}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Tanggal SPM</span>
                    <span>: {tglSpmAngka}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Nama SKPD/UNIT</span>
                    <span className="font-medium">
                      : {data.kd_skpd} - {data.nm_skpd}
                    </span>
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="col-span-6 p-2 space-y-1">
                  <div className="flex">
                    <span className="w-28 shrink-0">Dari</span>
                    <span className="font-medium">: KUASA BUD</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 shrink-0">Tahun Anggaran</span>
                    <span>: {tahunAnggaran}</span>
                  </div>
                  <div>
                    <span>Nomor SPD :</span>
                    <div className="font-mono text-[9.5px] mt-0.5">
                      {data.no_spd || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Baris Instruksi Pemindahbukuan & Identitas Penerima */}
              <div className="border-b border-black p-2 space-y-1 text-[10px]">
                <div className="flex">
                  <span className="w-40 shrink-0">Bank/Pos</span>
                  <span>
                    : {data.nama_bank_pembayar || "PT. Bank Sumut Cabang Sipirok"}
                  </span>
                </div>
                <div>
                  <span>Hendaklah mencairkan/memindahbukukan dari bank Rekening Nomor</span>
                  <span className="font-mono font-bold">
                    {" "}: AC. {data.rek_bank_pembayar || "233.01.02.000001-4"}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-40 shrink-0 font-bold">Uang Sebesar</span>
                  <span className="font-bold">
                    : Rp. {formatNilaiSp2d(data.nilai)}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="w-40 shrink-0">Terbilang</span>
                  <span className="italic">
                    : ({terbilang(data.nilai)} Rupiah)
                  </span>
                </div>
                <div className="flex pt-0.5">
                  <span className="w-40 shrink-0">Kepada</span>
                  <span className="font-bold">
                    : {data.nama_penerima || data.nm_skpd}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-40 shrink-0">NPWP</span>
                  <span className="font-mono">: {data.npwp_penerima || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 shrink-0">No. Rekening Bank</span>
                  <span className="font-mono font-bold">: {data.rek_penerima || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 shrink-0">Bank/Pos</span>
                  <span>: {data.bank_penerima || "BANK SUMUT"}</span>
                </div>
                <div className="flex">
                  <span className="w-40 shrink-0">Keperluan Untuk</span>
                  <span className="leading-snug">
                    : {data.keperluan}
                  </span>
                </div>
              </div>

              {/* 5. Tabel Pembebanan pada Kode Rekening */}
              <div className="border-b border-black">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="w-8 border-r border-black py-1 px-1.5 text-center font-bold">
                        No.
                      </th>
                      <th className="w-80 border-r border-black py-1 px-2 text-center font-bold">
                        Kode Rekening
                      </th>
                      <th className="border-r border-black py-1 px-2 text-center font-bold">
                        Uraian
                      </th>
                      <th className="w-36 py-1 px-2 text-center font-bold">
                        Jumlah<br />(Rp.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.rincianBelanja || data.rincianBelanja.length === 0 ? (
                      <tr className="border-b border-black">
                        <td className="border-r border-black py-1 px-1.5 text-center">1.</td>
                        <td className="border-r border-black py-1 px-2 font-mono text-[9px]">
                          {data.kd_skpd}
                        </td>
                        <td className="border-r border-black py-1 px-2">{data.keperluan}</td>
                        <td className="py-1 px-2 text-right font-mono font-bold">
                          {formatNilaiSp2d(data.nilai)}
                        </td>
                      </tr>
                    ) : (
                      data.rincianBelanja.map((item, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 text-center align-top">
                            {idx + 1}.
                          </td>
                          <td className="border-r border-black py-1 px-2 font-mono text-[9px] align-top">
                            {item.kd_sub_kegiatan} {item.kd_rek6}
                          </td>
                          <td className="border-r border-black py-1 px-2 align-top">
                            {item.nm_rek6}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-medium align-top">
                            {formatNilaiSp2d(item.nilai)}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Baris Total Pembebanan */}
                    <tr>
                      <td
                        colSpan={3}
                        className="border-r border-black py-1 px-2 font-bold text-left"
                      >
                        Jumlah
                      </td>
                      <td className="py-1 px-2 text-right font-mono font-bold">
                        {formatNilaiSp2d(data.nilai)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Tabel Potongan - Potongan */}
              <div className="border-b border-black">
                <div className="px-2 py-0.5 font-normal text-[10px] border-b border-black">
                  Potongan - Potongan
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="w-8 border-r border-black py-1 px-1.5 text-center font-bold">
                        No.
                      </th>
                      <th className="border-r border-black py-1 px-2 text-center font-bold">
                        Uraian<br />Kode Rekening
                      </th>
                      <th className="w-36 border-r border-black py-1 px-2 text-center font-bold">
                        Jumlah<br />(Rp.)
                      </th>
                      <th className="w-44 py-1 px-2 text-center font-bold">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.potongan || data.potongan.length === 0 ? (
                      <tr className="border-b border-black">
                        <td className="border-r border-black py-1 px-1.5 text-center">-</td>
                        <td className="border-r border-black py-1 px-2 italic text-slate-500">
                          Nihil Potongan
                        </td>
                        <td className="border-r border-black py-1 px-2 text-right font-mono">
                          0,00
                        </td>
                        <td className="py-1 px-2">-</td>
                      </tr>
                    ) : (
                      data.potongan.map((pot, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="border-r border-black py-1 px-1.5 text-center align-top">
                            {idx + 1}
                          </td>
                          <td className="border-r border-black py-1 px-2 align-top">
                            {pot.kd_rek6} - {pot.nm_rek6}
                          </td>
                          <td className="border-r border-black py-1 px-2 text-right font-mono align-top">
                            {formatNilaiSp2d(pot.nilai)}
                          </td>
                          <td className="py-1 px-2 align-top text-[9.5px]">
                            {pot.id_billing
                              ? `ID Billing: ${pot.id_billing}`
                              : pot.keterangan || "-"}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* Baris Total Potongan */}
                    <tr>
                      <td
                        colSpan={2}
                        className="border-r border-black py-1 px-2 font-bold text-left"
                      >
                        Jumlah
                      </td>
                      <td className="border-r border-black py-1 px-2 text-right font-mono font-bold">
                        {formatNilaiSp2d(data.nilai_potongan)}
                      </td>
                      <td className="py-1 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 7. Tabel Informasi (tidak mengurangi jumlah pembayaran SP2D) */}
              <div className="border-b border-black">
                <div className="px-2 py-0.5 font-normal text-[10px] border-b border-black">
                  Informasi:(tidak mengurangi jumlah pembayaran SP2D)
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="w-8 border-r border-black py-1 px-1.5 text-center font-bold">
                        No.
                      </th>
                      <th className="border-r border-black py-1 px-2 text-center font-bold">
                        Uraian<br />Kode Rekening
                      </th>
                      <th className="w-36 border-r border-black py-1 px-2 text-center font-bold">
                        Jumlah<br />(Rp.)
                      </th>
                      <th className="w-44 py-1 px-2 text-center font-bold">
                        Keterangan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Baris Total Informasi (0,00) */}
                    <tr>
                      <td
                        colSpan={2}
                        className="border-r border-black py-1 px-2 font-bold text-left"
                      >
                        Jumlah
                      </td>
                      <td className="border-r border-black py-1 px-2 text-right font-mono font-bold">
                        0,00
                      </td>
                      <td className="py-1 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 8. Ringkasan SP2D Yang di Bayarkan */}
              <div className="border-b border-black">
                <table className="w-full border-collapse text-[10px]">
                  <tbody>
                    <tr className="border-b border-black">
                      <td
                        colSpan={2}
                        className="py-1 px-2 font-bold text-left border-r border-black"
                      >
                        SP2D Yang di Bayarkan
                      </td>
                      <td className="py-1 px-2"></td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="w-96 py-0.5 px-3 border-r border-black">
                        Jumlah Yang di Minta
                      </td>
                      <td className="w-48 py-0.5 px-2 border-r border-black font-mono">
                        Rp. {formatNilaiSp2d(data.nilai)}
                      </td>
                      <td className="py-0.5 px-2"></td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="w-96 py-0.5 px-3 border-r border-black">
                        Jumlah Potongan
                      </td>
                      <td className="w-48 py-0.5 px-2 border-r border-black font-mono">
                        Rp. {formatNilaiSp2d(data.nilai_potongan)}
                      </td>
                      <td className="py-0.5 px-2"></td>
                    </tr>
                    <tr>
                      <td className="w-96 py-1 px-2 font-bold border-r border-black">
                        Jumlah Yang di Bayarkan
                      </td>
                      <td className="w-48 py-1 px-2 font-mono font-bold border-r border-black">
                        Rp. {formatNilaiSp2d(data.nilai_bersih)}
                      </td>
                      <td className="py-1 px-2"></td>
                    </tr>
                  </tbody>
                </table>

                {/* Terbilang Jumlah yang Dibayarkan */}
                <div className="p-2 border-t border-black text-[10px]">
                  <span>Terbilang : </span>
                  <span className="italic">
                    ({terbilang(data.nilai_bersih)} Rupiah)
                  </span>
                </div>
              </div>

              {/* 9. Area Tanda Tangan Kuasa BUD */}
              <div className="p-4 flex justify-end">
                <div className="w-72 text-center text-[10.5px] space-y-1">
                  <div>Sipirok, {tglIndo}</div>
                  <div className="font-bold tracking-wide">
                    KUASA BENDAHARA UMUM DAERAH
                  </div>

                  {/* Ruang Tanda Tangan */}
                  <div className="h-20 flex items-center justify-center">
                    {/* Placeholder ruang stempel / ttd */}
                  </div>

                  <div className="font-bold underline tracking-wide">
                    {data.kuasaBudNama || "M. FRANANDA, S.E, M.M"}
                  </div>
                  <div>
                    Nip. {data.kuasaBudNip || "198007232003121002"}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 10. FOOTER DI LUAR BINGKAI KOTAK */}
            {/* ========================================================================= */}
            <div className="flex justify-between items-center text-[9px] pt-2 px-1 text-slate-700">
              <div>
                <span>Nomor SP2D : </span>
                <span className="font-mono font-medium">{data.no_sp2d}</span>
              </div>
              <div>
                <span className="italic">Halaman: 1 dari 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .sp2d-paper,
          .sp2d-paper * {
            visibility: visible;
          }
          .sp2d-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
