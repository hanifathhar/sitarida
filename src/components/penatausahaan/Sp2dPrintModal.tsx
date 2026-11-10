"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";

export interface Sp2dPrintData {
  id: string;
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

export default function Sp2dPrintModal({ data, onClose }: Sp2dPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  function handlePrint() {
    window.print();
  }

  type RincianItem = NonNullable<typeof data.rincianBelanja>[number];
  interface GroupItem {
    kd_sub: string;
    nm_sub: string;
    items: RincianItem[];
  }

  // Pengelompokan Rincian Belanja Berjenjang (Sub Kegiatan -> Rekening Belanja)
  const groupedBelanja = (data.rincianBelanja || []).reduce<Record<string, GroupItem>>((acc, curr) => {
    const key = `${curr.kd_sub_kegiatan}__${curr.nm_sub_kegiatan}`;
    if (!acc[key]) {
      acc[key] = {
        kd_sub: curr.kd_sub_kegiatan,
        nm_sub: curr.nm_sub_kegiatan,
        items: [],
      };
    }
    acc[key]!.items.push(curr);
    return acc;
  }, {});

  const groupKeys = Object.keys(groupedBelanja);

  const tglFormatted = data.tgl_sp2d
    ? new Date(data.tgl_sp2d).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Pratinjau Cetak Surat Perintah Pencairan Dana (SP2D)
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen resmi SP2D standar Kuasa Bendahara Umum Daerah (BUD).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5E0E14] px-4 py-2 text-xs font-bold text-white shadow hover:bg-[#46090E] transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Printable Document */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          <div
            ref={printRef}
            className="mx-auto max-w-[210mm] bg-white text-black text-[11px] leading-tight font-serif p-8 border border-slate-300 print:border-0 print:p-0"
          >
            {/* Header Instansi */}
            <div className="text-center pb-2 border-b-2 border-black">
              <h1 className="text-sm font-bold uppercase tracking-wider">
                PEMERINTAH KABUPATEN TAPANULI SELATAN
              </h1>
              <h2 className="text-base font-black uppercase tracking-wider mt-0.5">
                SURAT PERINTAH PENCAIRAN DANA (SP2D)
              </h2>
              <div className="text-[11px] font-semibold tracking-wide mt-0.5">
                TAHUN ANGGARAN 2026
              </div>
            </div>

            {/* Nomor Dokumen & Jenis */}
            <div className="flex justify-between items-center py-2 text-[11px] border-b border-black">
              <div>
                <span>Nomor SPM: </span>
                <span className="font-bold font-mono">{data.no_spm}</span>
                {data.tgl_spm && (
                  <span className="ml-2 italic text-slate-600">
                    tgl. {data.tgl_spm}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider border border-black px-2 py-0.5 mr-2">
                  {data.jenis_sp2d?.replace(/_/g, " ") || "SP2D"}
                </span>
                <span>Nomor SP2D: </span>
                <span className="font-bold font-mono">{data.no_sp2d}</span>
              </div>
            </div>

            {/* Inti Perintah Pencairan */}
            <div className="py-2.5 space-y-1 border-b border-black text-[11px]">
              <div>
                <strong>KUASA BENDAHARA UMUM DAERAH</strong>
              </div>
              <div>PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
              <div className="pt-1">
                Hendaklah mencairkan / memindahbukukan dari Bank:{" "}
                <strong>{data.nama_bank_pembayar || "PT. Bank Sumut (RKUD)"}</strong>{" "}
                {data.rek_bank_pembayar && (
                  <span>No. Rekening: <strong>{data.rek_bank_pembayar}</strong></span>
                )}
              </div>
              <div>
                Uang sejumlah:{" "}
                <strong className="underline">
                  {formatRupiah(data.nilai_bersih)}
                </strong>{" "}
                (<em>{terbilang(data.nilai_bersih)} Rupiah</em>)
              </div>
            </div>

            {/* Identitas Penerima */}
            <div className="py-2.5 border-b border-black space-y-1">
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">Kepada</div>
                <div className="col-span-9 font-bold">
                  : {data.nama_penerima || data.nm_skpd}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">Nomor Rekening Bank</div>
                <div className="col-span-9">
                  : {data.rek_penerima || "-"} / {data.bank_penerima || "-"}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">Nomor Pokok Wajib Pajak (NPWP)</div>
                <div className="col-span-9">
                  : {data.npwp_penerima || "-"}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">SKPD / Unit Kerja</div>
                <div className="col-span-9">
                  : {data.kd_skpd} - {data.nm_skpd}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">Dasar Pembayaran / SPD</div>
                <div className="col-span-9">
                  : {data.no_spd || "-"} {data.tgl_spd ? `tgl. ${data.tgl_spd}` : ""}
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3">Untuk Keperluan</div>
                <div className="col-span-9 font-medium">
                  : {data.keperluan}
                </div>
              </div>
            </div>

            {/* Pembebanan Rekening Belanja & Potongan (2 Kolom berdampingan) */}
            <div className="grid grid-cols-12 border-b border-black">
              {/* Kolom Kiri: Pembebanan pada Kode Rekening */}
              <div className="col-span-7 border-r border-black p-2 space-y-2">
                <div className="font-bold underline text-[11px]">
                  Pembebanan pada kode rekening:
                </div>

                <div className="space-y-2 text-[10px]">
                  {groupKeys.length === 0 ? (
                    <div className="italic text-slate-500">
                      Rincian belanja terintegrasi pada dokumen SPP/SPM asal.
                    </div>
                  ) : (
                    groupKeys.map((k) => {
                      const group = groupedBelanja[k];
                      if (!group) return null;
                      return (
                        <div key={k} className="space-y-0.5">
                          <div className="font-bold text-slate-800">
                            {group.kd_sub} {group.nm_sub}
                          </div>
                          <div className="space-y-0.5 pl-3">
                            {group.items.map((item, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-start gap-1"
                              >
                                <span className="text-slate-700">
                                  {item.kd_rek6} {item.nm_rek6}
                                </span>
                                <span className="font-mono font-medium whitespace-nowrap">
                                  {formatRupiah(item.nilai)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-dotted border-slate-400 flex justify-between font-bold text-[11px]">
                  <span>Jumlah Permintaan (Bruto):</span>
                  <span className="font-mono">{formatRupiah(data.nilai)}</span>
                </div>
                <div className="text-[10px] italic">
                  Terbilang: ({terbilang(data.nilai)} Rupiah)
                </div>
              </div>

              {/* Kolom Kanan: Potongan-Potongan Pajak & Ringkasan Bayar */}
              <div className="col-span-5 p-2 flex flex-col justify-between">
                <div>
                  <div className="font-bold underline text-[11px] mb-1.5">
                    Potongan-Potongan:
                  </div>

                  <table className="w-full text-[10px] border border-black">
                    <thead>
                      <tr className="border-b border-black bg-slate-100 font-bold">
                        <th className="p-1 text-center w-6">No</th>
                        <th className="p-1 text-left">Uraian / ID Billing</th>
                        <th className="p-1 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {!data.potongan || data.potongan.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-2 text-center italic text-slate-400">
                            Nihil Potongan
                          </td>
                        </tr>
                      ) : (
                        data.potongan.map((p, idx) => (
                          <tr key={idx}>
                            <td className="p-1 text-center">{idx + 1}</td>
                            <td className="p-1">
                              <div>{p.nm_rek6}</div>
                              {p.id_billing && (
                                <div className="font-mono text-[9px] text-slate-600">
                                  Billing: {p.id_billing}
                                </div>
                              )}
                            </td>
                            <td className="p-1 text-right font-mono">
                              {formatRupiah(p.nilai)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="border-t border-black font-bold">
                      <tr>
                        <td colSpan={2} className="p-1 text-right">Jumlah Potongan:</td>
                        <td className="p-1 text-right font-mono">
                          {formatRupiah(data.nilai_potongan)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Perhitungan Bersih Dibayarkan */}
                <div className="mt-4 pt-2 border-t border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Jumlah Yang Diminta</span>
                    <span className="font-mono">{formatRupiah(data.nilai)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah Potongan</span>
                    <span className="font-mono">{formatRupiah(data.nilai_potongan)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-black pt-1 text-[12px]">
                    <span>Jumlah Yang Dibayarkan</span>
                    <span className="font-mono text-black">
                      {formatRupiah(data.nilai_bersih)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Lembar Pengesahan Kuasa BUD */}
            <div className="pt-4 flex justify-between items-end text-[11px]">
              <div className="text-[9px] italic text-slate-500 max-w-xs">
                Lembar 1: Bank Penyalur RKUD (Bank Sumut)
                <br />
                Lembar 2: Bendahara Pengeluaran SKPD
                <br />
                Lembar 3: Arsip Kuasa BUD / Perbendaharaan
              </div>

              <div className="text-center min-w-[240px]">
                <div>Sipirok, {tglFormatted}</div>
                <div className="font-bold mt-0.5">
                  KUASA BENDAHARA UMUM DAERAH
                </div>
                <div className="h-16 flex items-center justify-center italic text-slate-300">
                  ( Tanda Tangan & Cap Stempel )
                </div>
                <div className="font-bold underline">
                  {data.kuasaBudNama || "MARA TUA SIREGAR, S.Sos"}
                </div>
                <div>NIP. {data.kuasaBudNip || "197205101993031002"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
