"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Printer,
  X,
  Calendar,
  MapPin,
  CheckCircle2,
  Building2,
  DollarSign,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";

interface SpmPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  spmData: any | null;
  loading?: boolean;
}

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTanggalSingkat(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatRupiahKoma(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "0,00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0,00";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function SpmPrintModal({
  isOpen,
  onClose,
  spmData,
  loading = false,
}: SpmPrintModalProps) {
  const [tempatCetak, setTempatCetak] = useState<string>("Sipirok");
  const [tanggalCetak, setTanggalCetak] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (spmData?.tgl_spm) {
      setTanggalCetak(spmData.tgl_spm.split("T")[0]);
    } else {
      setTanggalCetak(new Date().toISOString().split("T")[0]);
    }
    setTempatCetak("Sipirok");
  }, [spmData]);

  if (!isOpen || !spmData) return null;

  const rincianList = spmData.rincian || [];
  const potonganList = spmData.potongan || [];
  const totalBruto = Number(spmData.nilai) || 0;
  const totalPotongan = Number(spmData.nilai_potongan) || 0;
  const totalBersih =
    Number(spmData.nilai_bersih) || Math.max(0, totalBruto - totalPotongan);

  const kdSkpdUnit =
    spmData.kd_unit || spmData.kd_skpd || spmData.opd?.kd_skpd || "-";
  const nmSkpdUnit =
    spmData.nm_unit || spmData.nm_skpd || spmData.opd?.nm_skpd || "-";

  // Kelompokkan rincian rekening secara berjenjang: Kegiatan / Sub Kegiatan -> Rekening Belanja
  const groupedSubKegiatan: {
    key: string;
    kd_sub_kegiatan: string;
    nm_sub_kegiatan: string;
    items: any[];
  }[] = [];

  for (const r of rincianList) {
    const subKey =
      r.kd_sub_kegiatan?.trim() || r.kd_kegiatan?.trim() || "__NO_KEGIATAN__";
    let grp = groupedSubKegiatan.find((g) => g.key === subKey);
    if (!grp) {
      grp = {
        key: subKey,
        kd_sub_kegiatan: r.kd_sub_kegiatan || r.kd_kegiatan || "",
        nm_sub_kegiatan: r.nm_sub_kegiatan || r.nm_kegiatan || "",
        items: [],
      };
      groupedSubKegiatan.push(grp);
    }
    grp.items.push(r);
  }

  // HTML Renderer Format Resmi SPM (Landscape A4) Sesuai Standar Tapanuli Selatan
  function generateSpmHtml(): string {
    return `
      <div class="spm-container">
        <!-- HEADER ATAS DOKUMEN -->
        <div class="spm-header">
          <div class="spm-header-title">
            <div class="title-line">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
            <div class="title-line">SURAT PERINTAH MEMBAYAR (SPM)</div>
            <div class="title-line">TAHUN ANGGARAN ${spmData.tahunAnggaran || 2026}</div>
          </div>
          <div class="spm-header-right">
            <div class="jenis-badge">UP/GU/TU/LS</div>
            <div class="no-spm-line">Nomor SPM : ${spmData.no_spm}</div>
          </div>
        </div>

        <div class="spm-subnote">
          (diisi oleh PPK-SKPD/UNIT)
        </div>

        <!-- BINGKAI KOTAK UTAMA (2 KOLOM: KIRI DAN KANAN) -->
        <table class="spm-main-box">
          <tbody>
            <tr>
              <!-- ======================================================== -->
              <!-- KOLOM KIRI                                               -->
              <!-- ======================================================== -->
              <td class="col-left">
                <!-- 1. KUASA BUD & PENERBITAN SP2D -->
                <div class="sec-kuasa-bud">
                  <div class="bold-text">KUASA BENDAHARA UMUM DAERAH</div>
                  <div class="bold-text">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
                  <div class="normal-text">Supaya menerbitkan SP2D kepada :</div>
                </div>

                <!-- 2. IDENTITAS SKPD, BENDAHARA, PENERIMA, BANK, SPD -->
                <div class="sec-identitas">
                  <table class="table-inner">
                    <tbody>
                      <tr>
                        <td class="lbl-col">SKPD/UNIT</td>
                        <td class="colon-col">:</td>
                        <td class="val-col font-bold">${kdSkpdUnit} - ${nmSkpdUnit}</td>
                      </tr>
                      <tr>
                        <td class="lbl-col">Bendahara Pengeluaran</td>
                        <td class="colon-col">:</td>
                        <td class="val-col font-bold">${spmData.bendaharaNama || "-"} / BENDAHARA PENGELUARAN</td>
                      </tr>
                      <tr>
                        <td class="lbl-col">Pihak Ketiga</td>
                        <td class="colon-col">:</td>
                        <td class="val-col font-bold">${spmData.nama_penerima || nmSkpdUnit || "-"}</td>
                      </tr>
                      <tr>
                        <td class="lbl-col">Nomor Rekening Bank</td>
                        <td class="colon-col">:</td>
                        <td class="val-col font-bold">${spmData.rek_penerima || "-"} / ${spmData.bank_penerima || "-"}</td>
                      </tr>
                      <tr>
                        <td class="lbl-col">Nomor NPWP</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${spmData.npwp_penerima || "-"}</td>
                      </tr>
                      <tr>
                        <td class="lbl-col">Dasar Pembayaran/No dan Tanggal SPD</td>
                        <td class="colon-col">:</td>
                        <td class="val-col">${spmData.no_spd || "-"} dan ${spmData.tgl_spd ? formatTanggalIndo(spmData.tgl_spd) : "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- 3. UNTUK KEPERLUAN -->
                <div class="sec-keperluan">
                  <div class="normal-text">Untuk Keperluan :</div>
                  <div class="val-keperluan">${spmData.keperluan || "-"}</div>
                </div>

                <!-- 4. PEMBEBANAN PADA KODE REKENING (BERJENJANG KEGIATAN & REKENING) -->
                <div class="sec-pembebanan">
                  <div class="lbl-pembebanan">Pembebanan pada kode rekening :</div>
                  <table class="table-rincian">
                    <tbody>
                      ${
                        rincianList.length === 0
                          ? `
                        <tr>
                          <td colspan="3" class="text-center italic" style="padding: 10px; color: #666;">
                            Tidak ada rincian rekening belanja
                          </td>
                        </tr>
                      `
                          : groupedSubKegiatan
                              .map((grp) => {
                                const hasKegiatan = Boolean(grp.kd_sub_kegiatan);
                                return `
                                  ${
                                    hasKegiatan
                                      ? `
                                    <!-- Baris Judul Induk Kegiatan / Sub Kegiatan -->
                                    <tr class="row-header-kegiatan">
                                      <td colspan="3" class="kegiatan-cell">
                                        <div class="kegiatan-wrap">
                                          <span class="kegiatan-kd font-mono">${grp.kd_sub_kegiatan}</span>
                                          <span class="kegiatan-nm">${grp.nm_sub_kegiatan}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  `
                                      : ""
                                  }
                                  <!-- Baris Rekening Belanja di Bawah Kegiatan (Berjenjang) -->
                                  ${grp.items
                                    .map(
                                      (r: any) => `
                                    <tr class="row-item-rek">
                                      <td class="rincian-kd font-mono ${hasKegiatan ? "pl-jenjang" : ""}">
                                        ${r.kd_rek6}
                                      </td>
                                      <td class="rincian-nm">
                                        ${r.nm_rek6}
                                      </td>
                                      <td class="rincian-val font-mono font-bold">
                                        ${formatRupiahKoma(r.nilai)}
                                      </td>
                                    </tr>
                                  `
                                    )
                                    .join("")}
                                `;
                              })
                              .join("")
                      }
                    </tbody>
                  </table>
                </div>

                <!-- 5. TOTAL PERMINTAAN & TERBILANG & NO SPP -->
                <div class="sec-total-spp">
                  <div class="font-bold text-total">
                    Jumlah Permintaan Rp. ${formatRupiahKoma(totalBruto)}
                  </div>
                  <div class="terbilang-text">
                    <strong>Terbilang :</strong> (${terbilang(totalBruto)} Rupiah)
                  </div>
                  <div class="spp-ref-text">
                    Nomor SPP dan Tanggal SPP : <strong>${spmData.no_spp || "-"}</strong> m/d <strong>${spmData.tgl_spp ? formatTanggalSingkat(spmData.tgl_spp) : "-"}</strong>
                  </div>
                </div>

                <!-- CATATAN KAKI KIRI -->
                <div class="sec-footnote">
                  <div>*) coret yang tidak perlu</div>
                  <div>**) pilih yang sesuai</div>
                </div>
              </td>

              <!-- ======================================================== -->
              <!-- KOLOM KANAN                                              -->
              <!-- ======================================================== -->
              <td class="col-right">
                <!-- 1. TABEL POTONGAN - POTONGAN -->
                <div class="sec-potongan">
                  <div class="tbl-title">Potongan - Potongan :</div>
                  <table class="bordered-table tbl-pot">
                    <thead>
                      <tr>
                        <th style="width: 28px;">No</th>
                        <th>Uraian (No. rekening)</th>
                        <th style="width: 105px;">Jumlah</th>
                        <th style="width: 95px;">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        potonganList.length > 0
                          ? potonganList
                              .map(
                                (p: any, idx: number) => `
                        <tr>
                          <td class="text-center">${idx + 1}</td>
                          <td>${p.kd_rek6} - ${p.nm_rek6}</td>
                          <td class="text-right font-mono">${formatRupiahKoma(p.nilai)}</td>
                          <td class="font-xs">${p.id_billing ? `ID: ${p.id_billing}` : p.keterangan || ""}</td>
                        </tr>
                      `
                              )
                              .join("")
                          : `
                        <tr>
                          <td class="text-center">-</td>
                          <td class="text-center italic" style="color: #666;">N I H I L</td>
                          <td class="text-right font-mono">0,00</td>
                          <td></td>
                        </tr>
                      `
                      }
                      <tr class="row-total">
                        <td colspan="2" class="text-center font-bold">Jumlah Potongan</td>
                        <td class="text-right font-bold font-mono">${formatRupiahKoma(totalPotongan)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- 2. TABEL INFORMASI (TIDAK MENGURANGI PEMBAYARAN) -->
                <div class="sec-informasi">
                  <div class="tbl-title">Informasi :(tidak mengurangi jumlah pembayaran SPM)</div>
                  <table class="bordered-table tbl-info">
                    <thead>
                      <tr>
                        <th style="width: 28px;">No</th>
                        <th>Uraian (No. rekening)</th>
                        <th style="width: 105px;">Jumlah</th>
                        <th style="width: 95px;">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="row-total">
                        <td colspan="2" class="text-center font-bold">Jumlah Potongan</td>
                        <td class="text-right font-bold font-mono">0,00</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- 3. TABEL SPM YANG DIBAYARKAN -->
                <div class="sec-spm-bayar">
                  <div class="tbl-title">SPM Yang di Bayarkan</div>
                  <table class="bordered-table tbl-bayar">
                    <tbody>
                      <tr>
                        <td colspan="2" style="width: 58%;">Jumlah Yang Diminta</td>
                        <td style="width: 105px;" class="text-right font-bold font-mono">${formatRupiahKoma(totalBruto)}</td>
                        <td style="width: 95px;"></td>
                      </tr>
                      <tr>
                        <td colspan="2">Jumlah Potongan</td>
                        <td class="text-right font-bold font-mono">${formatRupiahKoma(totalPotongan)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colspan="2" class="font-bold">Jumlah Yang Dibayarkan</td>
                        <td></td>
                        <td class="text-right font-bold font-mono" style="font-size: 8.5pt;">${formatRupiahKoma(totalBersih)}</td>
                      </tr>
                      <tr>
                        <td colspan="4" class="terbilang-bayar">
                          <strong>Uang Sejumlah :</strong> (${terbilang(totalBersih)} Rupiah)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- 4. LEMBAR PENANDATANGAN KEPALA SKPD -->
                <div class="sec-ttd">
                  <div class="ttd-box">
                    <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak || spmData.tgl_spm)}</div>
                    <div class="ttd-jabatan font-bold uppercase">
                      ${spmData.paKpaJabatan || `KEPALA ${nmSkpdUnit}`}
                    </div>
                    <div class="ttd-space"></div>
                    <div class="ttd-nama font-bold underline uppercase">
                      ${spmData.paKpaNama || spmData.opd?.kepalaNama || "(....................................)"}
                    </div>
                    <div class="ttd-nip">
                      NIP. ${spmData.paKpaNip || spmData.opd?.kepalaNip || "...................................."}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- FOOTER RESMI DI LUAR BINGKAI -->
        <div class="spm-footer-note font-bold">
          SPM ini sah apabila telah di tandatangani dan distempel oleh Kepala SKPD
        </div>
      </div>
    `;
  }

  // Stylesheet Resmi Landscape
  function getPrintStyles(): string {
    return `
      @page {
        size: A4 landscape;
        margin: 8mm 10mm 8mm 10mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 8.5pt;
        line-height: 1.25;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .spm-container {
        width: 100%;
        max-width: 280mm;
        margin: 0 auto;
      }
      .spm-header {
        position: relative;
        text-align: center;
        margin-bottom: 2px;
      }
      .spm-header-title {
        font-weight: bold;
        font-size: 10.5pt;
        line-height: 1.25;
      }
      .title-line {
        letter-spacing: 0.2px;
      }
      .spm-header-right {
        position: absolute;
        top: 0;
        right: 0;
        text-align: right;
        font-size: 8.5pt;
        font-weight: bold;
      }
      .jenis-badge {
        letter-spacing: 1px;
      }
      .no-spm-line {
        font-size: 8pt;
        margin-top: 1px;
      }
      .spm-subnote {
        text-align: center;
        font-size: 7.5pt;
        font-style: italic;
        margin-bottom: 3px;
      }
      table.spm-main-box {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
      }
      .col-left {
        width: 50%;
        vertical-align: top;
        border-right: 1px solid #000;
        padding: 0;
      }
      .col-right {
        width: 50%;
        vertical-align: top;
        padding: 0;
      }
      .sec-kuasa-bud {
        padding: 3px 6px;
        border-bottom: 1px solid #000;
        font-size: 8pt;
        line-height: 1.2;
      }
      .sec-identitas {
        padding: 3px 6px;
        border-bottom: 1px solid #000;
        font-size: 7.5pt;
      }
      table.table-inner {
        width: 100%;
        border-collapse: collapse;
      }
      table.table-inner td {
        padding: 1px 0;
        vertical-align: top;
      }
      .lbl-col {
        width: 165px;
      }
      .colon-col {
        width: 8px;
      }
      .sec-keperluan {
        padding: 3px 6px;
        border-bottom: 1px solid #000;
        font-size: 7.5pt;
        min-height: 38px;
      }
      .val-keperluan {
        margin-top: 1px;
        line-height: 1.25;
      }
      .sec-pembebanan {
        padding: 3px 6px;
        border-bottom: 1px solid #000;
        font-size: 7.5pt;
        min-height: 165px;
      }
      .lbl-pembebanan {
        margin-bottom: 3px;
      }
      table.table-rincian {
        width: 100%;
        border-collapse: collapse;
      }
      table.table-rincian td {
        padding: 1px 2px;
        vertical-align: top;
      }
      .row-header-kegiatan td {
        padding-top: 4px;
        padding-bottom: 2px;
      }
      .kegiatan-wrap {
        display: flex;
        align-items: baseline;
        gap: 6px;
        font-weight: bold;
        color: #000;
        line-height: 1.25;
      }
      .kegiatan-kd {
        font-size: 7.5pt;
        white-space: nowrap;
        letter-spacing: 0.2px;
      }
      .kegiatan-nm {
        font-size: 7.5pt;
      }
      .pl-jenjang {
        padding-left: 14px !important;
      }
      .rincian-kd {
        width: 32%;
        white-space: nowrap;
        font-size: 7pt;
      }
      .rincian-nm {
        width: 46%;
        font-size: 7pt;
      }
      .rincian-val {
        width: 22%;
        text-align: right;
        font-size: 7pt;
        white-space: nowrap;
      }
      .sec-total-spp {
        padding: 3px 6px;
        border-bottom: 1px solid #000;
        font-size: 7.5pt;
        line-height: 1.3;
      }
      .text-total {
        font-size: 8pt;
      }
      .terbilang-text {
        font-size: 7.5pt;
        margin-top: 1px;
      }
      .spp-ref-text {
        font-size: 7.5pt;
        margin-top: 1px;
      }
      .sec-footnote {
        padding: 2px 6px;
        font-size: 7pt;
        font-style: italic;
        line-height: 1.2;
      }
      .sec-potongan, .sec-informasi, .sec-spm-bayar {
        padding: 2px 5px;
      }
      .tbl-title {
        font-size: 8pt;
        font-weight: bold;
        margin-bottom: 2px;
      }
      table.bordered-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
        font-size: 7.5pt;
      }
      table.bordered-table th, table.bordered-table td {
        border: 1px solid #000;
        padding: 1.5px 3px;
      }
      table.bordered-table th {
        background: #fbfbfb;
        font-weight: bold;
        text-align: center;
      }
      .row-total td {
        background: #fff;
      }
      .terbilang-bayar {
        padding: 3px 4px;
        font-size: 7.5pt;
        line-height: 1.25;
      }
      .sec-ttd {
        padding: 6px 12px 6px 6px;
        display: flex;
        justify-content: flex-end;
      }
      .ttd-box {
        width: 290px;
        text-align: center;
        font-size: 8pt;
        line-height: 1.25;
      }
      .ttd-jabatan {
        margin-top: 2px;
      }
      .ttd-space {
        height: 48px;
      }
      .ttd-nama {
        font-size: 8.5pt;
      }
      .ttd-nip {
        font-size: 7.5pt;
        margin-top: 1px;
      }
      .spm-footer-note {
        margin-top: 3px;
        text-align: center;
        font-size: 7.5pt;
      }
      .font-bold { font-weight: bold; }
      .font-mono { font-family: 'Courier New', Courier, monospace; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .italic { font-style: italic; }
      .underline { text-decoration: underline; }
      .uppercase { text-transform: uppercase; }
      .font-xs { font-size: 7pt; }
    `;
  }

  function handlePrintAction() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cetak SPM - ${spmData.no_spm}</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${generateSpmHtml()}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header Modal */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-[#88131A] rounded-xl shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                Format Cetak Resmi {spmData.no_spm}
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                Surat Perintah Membayar ({spmData.jenis_spm?.replace(/_/g, "-")}) • {nmSkpdUnit}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAction}
              className="px-4 py-2 bg-[#5E0E14] hover:bg-[#46090E] text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Parameter Cetak */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold">
              UP/GU/TU/LS
            </span>
            <span className="text-slate-500">
              Diminta: <strong className="text-slate-900">{formatRupiah(totalBruto)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Dibayarkan: <strong className="text-emerald-700">{formatRupiah(totalBersih)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={tempatCetak}
                onChange={(e) => setTempatCetak(e.target.value)}
                placeholder="Tempat"
                className="w-20 text-xs font-medium bg-transparent focus:outline-none text-slate-800"
                title="Tempat Penandatanganan"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={tanggalCetak}
                onChange={(e) => setTanggalCetak(e.target.value)}
                className="text-xs font-medium bg-transparent focus:outline-none text-slate-800"
                title="Tanggal Penandatanganan"
              />
            </div>
          </div>
        </div>

        {/* Paper Canvas Preview (Landscape Preview) */}
        <div className="flex-1 p-4 sm:p-6 bg-slate-200/70 overflow-auto flex justify-center items-start">
          <div className="w-full max-w-[285mm] min-w-[270mm] bg-white shadow-xl p-6 sm:p-8 text-black font-sans relative border border-slate-300 rounded-sm">
            <style>{getPrintStyles()}</style>
            <div dangerouslySetInnerHTML={{ __html: generateSpmHtml() }} />
          </div>
        </div>

        {/* Hidden Iframe for Actual Printing */}
        <iframe ref={iframeRef} className="hidden" title="Print Frame" />
      </div>
    </div>
  );
}
