"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Printer,
  X,
  FileText,
  Layers,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Download,
} from "lucide-react";
import { formatRupiah, terbilang } from "@/lib/utils";

export type SppPrintTab =
  | "pengantar"
  | "ringkasan"
  | "rincian"
  | "kelengkapan"
  | "sptjm"
  | "semua";

interface SppPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sppData: any | null;
  loading?: boolean;
}

function getNamaBulan(bulanNumber?: number | null, fallbackDate?: string): string {
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
  if (bulanNumber && bulanNumber >= 1 && bulanNumber <= 12) {
    return monthNames[bulanNumber - 1];
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!isNaN(d.getTime())) {
      return monthNames[d.getMonth()];
    }
  }
  return "Januari";
}

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
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

function getFullDocTitle(jenisSpp: string) {
  switch (jenisSpp) {
    case "UP":
      return "SURAT PERMINTAAN PEMBAYARAN UANG PERSEDIAAN (SPP-UP)";
    case "GU":
      return "SURAT PERMINTAAN PEMBAYARAN GANTI UANG (SPP-GU)";
    case "TU":
      return "SURAT PERMINTAAN PEMBAYARAN TAMBAHAN UANG (SPP-TU)";
    case "LS_GAJI":
      return "SURAT PERMINTAAN PEMBAYARAN LANGSUNG GAJI (SPP-LS GAJI)";
    case "LS_BARANG_JASA":
      return "SURAT PERMINTAAN PEMBAYARAN LANGSUNG BARANG DAN JASA (SPP-LS BARANG DAN JASA)";
    case "UP_KKPD":
      return "SURAT PERMINTAAN PEMBAYARAN UANG PERSEDIAAN KKPD (SPP-UP KKPD)";
    case "GU_KKPD":
      return "SURAT PERMINTAAN PEMBAYARAN GANTI UANG KKPD (SPP-GU KKPD)";
    default:
      return `SURAT PERMINTAAN PEMBAYARAN (${jenisSpp ? jenisSpp.replace(/_/g, "-") : "SPP"})`;
  }
}

function getBadgeCode(jenisSpp: string) {
  switch (jenisSpp) {
    case "UP":
      return "SPP-UP";
    case "GU":
      return "SPP-GU";
    case "TU":
      return "SPP-TU";
    case "LS_GAJI":
      return "SPP-LS GAJI";
    case "LS_BARANG_JASA":
      return "SPP-LS BARANG DAN JASA";
    case "UP_KKPD":
      return "SPP-UP KKPD";
    case "GU_KKPD":
      return "SPP-GU KKPD";
    default:
      return `SPP-${jenisSpp ? jenisSpp.replace(/_/g, "-") : "SPP"}`;
  }
}

export default function SppPrintModal({
  isOpen,
  onClose,
  sppData,
  loading = false,
}: SppPrintModalProps) {
  const [activeTab, setActiveTab] = useState<SppPrintTab>("pengantar");
  const [tempatCetak, setTempatCetak] = useState<string>("Sipirok");
  const [tanggalCetak, setTanggalCetak] = useState<string>("");
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (sppData) {
      setTanggalCetak(
        sppData.tgl_spp || new Date().toISOString().split("T")[0]
      );
      setTempatCetak("Sipirok");
    }
  }, [sppData]);

  if (!isOpen || !sppData) return null;

  const badgeCode = getBadgeCode(sppData.jenis_spp);
  const fullDocTitle = getFullDocTitle(sppData.jenis_spp);
  const printInfo = sppData.printInfo || {};

  // Action cetak via hidden iframe
  function handlePrint() {
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(generatePrintHtml());
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }

  // Generator HTML cetak resmi
  function generatePrintHtml(): string {
    const renderContent = () => {
      if (activeTab === "semua") {
        return `
          <div class="print-page">${generatePengantarHtml()}</div>
          <div class="page-break"></div>
          <div class="print-page">${generateRingkasanHtml()}</div>
          <div class="page-break"></div>
          <div class="print-page">${generateRincianHtml()}</div>
          <div class="page-break"></div>
          <div class="print-page">${generateKelengkapanHtml()}</div>
          <div class="page-break"></div>
          <div class="print-page">${generateSptjmHtml()}</div>
        `;
      }
      if (activeTab === "pengantar") return generatePengantarHtml();
      if (activeTab === "ringkasan") return generateRingkasanHtml();
      if (activeTab === "rincian") return generateRincianHtml();
      if (activeTab === "kelengkapan") return generateKelengkapanHtml();
      if (activeTab === "sptjm") return generateSptjmHtml();
      return "";
    };

    return `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>${badgeCode} - ${sppData.no_spp}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.4;
            }
            .page-break {
              page-break-after: always;
              height: 0;
            }
            .print-page {
              width: 100%;
              min-height: 250mm;
              position: relative;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            .bordered-table th,
            .bordered-table td {
              border: 1px solid #000;
              padding: 4px 6px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: 'Courier New', Courier, monospace; }
            .uppercase { text-transform: uppercase; }
            .underline { text-decoration: underline; }
            .checklist-box {
              width: 13px;
              height: 13px;
              border: 1px solid #000;
              display: inline-block;
              margin-right: 8px;
            }
            .kop-double-line {
              border-bottom: 2px solid #000;
              margin-bottom: 12px;
              padding-bottom: 8px;
            }
            .footer-page-num {
              position: absolute;
              bottom: 0;
              left: 0;
              font-size: 9pt;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${renderContent()}
        </body>
      </html>
    `;
  }

  function generatePengantarHtml(): string {
    return `
      <div class="text-center font-bold" style="margin-bottom: 18px;">
        <div style="font-size: 13pt;">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
        <div style="font-size: 13pt;">${fullDocTitle}</div>
        <div style="font-size: 11pt; font-family: 'Courier New', monospace; margin: 2px 0;">NOMOR : ${sppData.no_spp}</div>
        <div style="font-size: 12pt;">TAHUN ANGGARAN ${sppData.tahunAnggaran}</div>
        <div style="font-size: 13pt; text-decoration: underline; margin-top: 14px;">PENGANTAR</div>
      </div>

      <div style="margin-bottom: 14px; font-size: 10.5pt; line-height: 1.4;">
        <div>Kepada Yth.</div>
        <div>Pengguna Anggaran / Kuasa Pengguna Anggaran</div>
        <div>SKPD/UNIT : ${sppData.nm_skpd}</div>
        <div>di Tempat</div>
      </div>

      <p class="text-justify" style="text-indent: 32px; margin-bottom: 12px; font-size: 10.5pt; line-height: 1.45;">
        Dengan memperhatikan Peraturan Bupati Kabupaten Tapanuli Selatan Nomor 67 Tahun 2020 Tanggal 30 Desember 2020 tentang Penjabaran APBD Tahun Anggaran 2021, dan Surat keputusan Bupati Kabupaten Tapanuli Selatan. Tentang penetapan besaran jumlah surat permintaan pembayaran Uang Persediaan (SPP-UP), surat permintaan pembayaran Ganti Uang (SPP-GU), surat permintaan pembayaran Tambahan Uang (SPP-TU), dan surat permintaan pembayaran Langsung (SPP-LS) bagi Satuan Kerja Perangkat Daerah kabupaten Tapanuli Selatan. Bersama ini kami mengajukan surat permintaan pembayaran (${badgeCode}) sebagai berikut :
      </p>

      <table style="width: 100%; font-size: 10.5pt; line-height: 1.45; margin-bottom: 16px;">
        <tr>
          <td style="width: 25px; vertical-align: top;">a.</td>
          <td style="width: 230px; vertical-align: top;">Urusan Pemerintah</td>
          <td style="width: 15px; vertical-align: top;">:</td>
          <td style="vertical-align: top;">${sppData.opd?.kd_urusan || "1.01"} - ${sppData.opd?.nm_urusan || "Pendidikan"}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">b.</td>
          <td style="vertical-align: top;">SKPD/UNIT</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">${sppData.kd_unit || sppData.kd_skpd} - ${sppData.nm_unit || sppData.nm_skpd}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">c.</td>
          <td style="vertical-align: top;">Tahun Anggaran</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">${sppData.tahunAnggaran}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">d.</td>
          <td style="vertical-align: top;">Dasar Pengeluaran SPD</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top; font-family: 'Courier New', monospace;">${sppData.no_spd || "-"}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">e.</td>
          <td style="vertical-align: top;">Jumlah Sisa Dana SPD</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">
            ${formatRupiah(printInfo.sisaSpd || 0)}
            <div style="font-style: italic; font-size: 9.5pt;">(${terbilang(printInfo.sisaSpd || 0)} rupiah)</div>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top;">f.</td>
          <td style="vertical-align: top;">Untuk Keperluan Bulan</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">${getNamaBulan(sppData.bulan, sppData.tgl_spp)}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">g.</td>
          <td style="vertical-align: top;">Nama Bendahara Pengeluaran</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">${sppData.bendaharaNama || "-"}</td>
        </tr>
        <tr>
          <td style="vertical-align: top;">h.</td>
          <td style="vertical-align: top;">Jumlah Dana Yang diminta</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">
            ${formatRupiah(sppData.nilai)}
            <div style="font-style: italic; font-size: 9.5pt;">(${terbilang(sppData.nilai)} rupiah)</div>
          </td>
        </tr>
        <tr>
          <td style="vertical-align: top;">i.</td>
          <td style="vertical-align: top;">Nama dan Nomor Rekening Bank</td>
          <td style="vertical-align: top;">:</td>
          <td style="vertical-align: top;">${sppData.bank_penerima || "Bank Sumut"}/${sppData.rek_penerima || "-"}</td>
        </tr>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
        <div style="text-align: center; width: 280px; font-size: 10.5pt;">
          <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak)}</div>
          <div style="font-weight: bold; margin-top: 2px;">BENDAHARA PENGELUARAN</div>
          <div style="height: 65px;"></div>
          <div style="font-weight: bold; text-decoration: underline;">${sppData.bendaharaNama || "...................................."}</div>
          <div>NIP. ${sppData.bendaharaNip || "...................................."}</div>
        </div>
      </div>

      <div class="footer-page-num">Halaman: 1 / 1</div>
    `;
  }

  function generateRingkasanHtml(): string {
    const spdItems = printInfo.ringkasanSpdList || [];
    return `
      <div class="text-center font-bold" style="margin-bottom: 20px;">
        <div style="font-size: 13pt;">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
        <div style="font-size: 13pt;">${fullDocTitle}</div>
        <div style="font-size: 11pt; font-family: 'Courier New', monospace; margin: 2px 0;">NOMOR : ${sppData.no_spp}</div>
        <div style="font-size: 12pt;">TAHUN ANGGARAN ${sppData.tahunAnggaran}</div>
        <div style="font-size: 13pt; text-decoration: underline; margin-top: 14px;">RINGKASAN</div>
      </div>

      <table class="bordered-table" style="font-size: 10pt; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f7f7f7;">
            <th colspan="4" style="text-align: left; font-weight: bold; padding: 6px;">RINGKASAN DPA/DPPA/DPPAL-SKPD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="3">Jumlah dana DPA/DPPA/DPPAL-SKPD</td>
            <td class="text-right font-mono font-bold" style="width: 170px;">${formatRupiah(printInfo.totalDpa || 0)}</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <th colspan="4" style="text-align: left; font-weight: bold; padding: 6px;">RINGKASAN SPD</th>
          </tr>
          <tr class="text-center font-bold" style="background-color: #fafafa;">
            <td style="width: 50px;">No. Urut</td>
            <td>Nomor SPD</td>
            <td style="width: 130px;">Tanggal SPD</td>
            <td style="width: 170px;" class="text-right">Jumlah Dana</td>
          </tr>
          ${spdItems.length > 0
        ? spdItems
          .map(
            (s: any, idx: number) => `
                    <tr>
                      <td class="text-center">${idx + 1}</td>
                      <td class="font-mono">${s.no_spd}</td>
                      <td class="text-center">${formatTanggalIndo(s.tgl_spd)}</td>
                      <td class="text-right font-mono">${formatRupiah(s.totalNilai || s.nilaiSpd || 0)}</td>
                    </tr>
                  `
          )
          .join("")
        : `
                <tr>
                  <td class="text-center">1</td>
                  <td class="font-mono">${sppData.no_spd || "-"}</td>
                  <td class="text-center">${formatTanggalIndo(sppData.tgl_spd)}</td>
                  <td class="text-right font-mono">${formatRupiah(printInfo.totalSpdRingkasan || sppData.nilai)}</td>
                </tr>
              `
      }
          <tr class="font-bold">
            <td colspan="3" class="text-right">JUMLAH</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.totalSpdRingkasan || 0)}</td>
          </tr>
          <tr>
            <td colspan="3">Sisa Dana Yang Belum di SPD kan</td>
            <td class="text-right font-mono font-bold">${formatRupiah(printInfo.sisaDanaBelumSpd || 0)}</td>
          </tr>
          <tr style="background-color: #f7f7f7;">
            <th colspan="4" style="text-align: left; font-weight: bold; padding: 6px;">RINGKASAN BELANJA</th>
          </tr>
          <tr>
            <td colspan="3">Belanja UP/GU</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.belanjaUpGu || 0)}</td>
          </tr>
          <tr>
            <td colspan="3">Belanja TU</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.belanjaTu || 0)}</td>
          </tr>
          <tr>
            <td colspan="3">Belanja LS Barang dan Jasa</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.belanjaLs || 0)}</td>
          </tr>
          <tr class="font-bold">
            <td colspan="3" class="text-right">JUMLAH</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.totalBelanja || 0)}</td>
          </tr>
          <tr class="font-bold">
            <td colspan="3">Sisa SPD yang telah, belum dibelanjakan</td>
            <td class="text-right font-mono">${formatRupiah(printInfo.sisaSpdBelumDibelanjakan || 0)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
        <div style="text-align: center; width: 280px; font-size: 10.5pt;">
          <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak)}</div>
          <div style="font-weight: bold; margin-top: 2px;">BENDAHARA PENGELUARAN</div>
          <div style="height: 65px;"></div>
          <div style="font-weight: bold; text-decoration: underline;">${sppData.bendaharaNama || "...................................."}</div>
          <div>NIP. ${sppData.bendaharaNip || "...................................."}</div>
        </div>
      </div>

      <div class="footer-page-num">Halaman: 1 / 1</div>
    `;
  }

  function generateRincianHtml(): string {
    const rincianList = sppData.rincian || [];
    return `
      <div class="text-center font-bold" style="margin-bottom: 20px;">
        <div style="font-size: 13pt;">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
        <div style="font-size: 13pt;">${fullDocTitle}</div>
        <div style="font-size: 11pt; font-family: 'Courier New', monospace; margin: 2px 0;">NOMOR : ${sppData.no_spp}</div>
        <div style="font-size: 12pt;">TAHUN ANGGARAN ${sppData.tahunAnggaran}</div>
        <div style="font-size: 13pt; text-decoration: underline; margin-top: 14px;">RINCIAN</div>
      </div>

      <table class="bordered-table" style="font-size: 10pt; margin-bottom: 24px;">
        <thead>
          <tr class="text-center font-bold" style="background-color: #f7f7f7;">
            <th style="width: 45px;">No</th>
            <th style="width: 170px;">Kode Rekening</th>
            <th>Uraian</th>
            <th style="width: 180px;" class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${rincianList.length > 0
        ? rincianList
          .map(
            (r: any, idx: number) => `
                    <tr>
                      <td class="text-center">${idx + 1}</td>
                      <td class="font-mono font-bold">${r.kd_rek6}</td>
                      <td>${r.nm_rek6}</td>
                      <td class="text-right font-mono font-bold">${formatRupiah(r.nilai)}</td>
                    </tr>
                  `
          )
          .join("")
        : `
                <tr>
                  <td class="text-center">1</td>
                  <td class="font-mono font-bold">1.1.01.03.01.0001</td>
                  <td>Kas di Bendahara Pengeluaran</td>
                  <td class="text-right font-mono font-bold">${formatRupiah(sppData.nilai)}</td>
                </tr>
              `
      }
        </tbody>
        <tfoot>
          <tr class="font-bold" style="background-color: #f7f7f7;">
            <td colspan="3" class="text-right">JUMLAH</td>
            <td class="text-right font-mono font-bold">${formatRupiah(sppData.nilai)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
        <div style="text-align: center; width: 280px; font-size: 10.5pt;">
          <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak)}</div>
          <div style="font-weight: bold; margin-top: 2px;">BENDAHARA PENGELUARAN</div>
          <div style="height: 65px;"></div>
          <div style="font-weight: bold; text-decoration: underline;">${sppData.bendaharaNama || "...................................."}</div>
          <div>NIP. ${sppData.bendaharaNip || "...................................."}</div>
        </div>
      </div>

      <div class="footer-page-num">Halaman: 1 / 1</div>
    `;
  }

  function generateKelengkapanHtml(): string {
    const checklistItems = [
      `Surat Pengantar ${badgeCode}`,
      `Ringkasan ${badgeCode}`,
      `Rincian ${badgeCode}`,
      "Salinan SPD",
      `Surat Keterangan yang memuat keperluan ${badgeCode}`,
      "Surat Perjanjian Kontrak",
      "Nomor Rekening Bank",
      "Berita Acara Penyelesaian Pekerjaan",
      "Berita Acara Serah Terima Barang dan Jasa",
      "Berita Acara Pembayaran",
      "Tanda Terima/Kwitansi",
      "Dokumen Yang dipersyaratkan dalam kontrak",
      "Berita Acara Pemeriksaan yang ditandatangani oleh Rekanan",
    ];

    return `
      <div class="kop-double-line" style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 65px; height: 75px; text-align: center;">
          <img src="/Logo-Tapsel.png" alt="Logo Tapsel" style="max-width: 60px; max-height: 75px;" />
        </div>
        <div style="flex: 1; text-align: center; line-height: 1.25;">
          <div style="font-size: 12pt; font-weight: bold;">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">${sppData.nm_skpd}</div>
          <div style="font-size: 11pt; font-weight: bold;">TAHUN ANGGARAN ${sppData.tahunAnggaran}</div>
        </div>
      </div>

      <div class="text-center font-bold" style="margin-bottom: 18px;">
        <div style="font-size: 12pt; text-decoration: underline; text-transform: uppercase;">PENELITIAN KELENGKAPAN DOKUMEN ${badgeCode}</div>
        <div style="font-size: 10.5pt; font-family: 'Courier New', monospace; margin-top: 3px;">Nomor : ${sppData.no_spp}</div>
      </div>

      <div style="font-size: 10pt; line-height: 1.6; margin-bottom: 24px;">
        ${checklistItems
        .map(
          (item) => `
          <div style="display: flex; align-items: center; margin-bottom: 3px;">
            <span class="checklist-box"></span>
            <span>${item}</span>
          </div>
        `
        )
        .join("")}
      </div>

      <div style="font-size: 10.5pt; line-height: 1.5; margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 6px;">Penelitian Kelengkapan Dokumen ${badgeCode} :</div>
        <table style="width: 100%;">
          <tr>
            <td style="width: 90px;">Tanggal</td>
            <td style="width: 15px;">:</td>
            <td>${tanggalCetak ? formatTanggalIndo(tanggalCetak) : ""}</td>
          </tr>
          <tr>
            <td>Nama</td>
            <td>:</td>
            <td style="font-weight: bold;">${sppData.kasubagNama || "RISNAWATI SITOMPUL, SE"}</td>
          </tr>
          <tr>
            <td>N I P</td>
            <td>:</td>
            <td style="font-family: 'Courier New', monospace;">${sppData.kasubagNip || (sppData.kasubagNama ? "" : "196912122014072001")}</td>
          </tr>
          <tr>
            <td>Jabatan</td>
            <td>:</td>
            <td>${sppData.kasubagJabatan || "Kasubag Keuangan"}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 30px; font-size: 10.5pt;">
        <div>Tanda Tangan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ____________________________________________________</div>
      </div>

      <div class="footer-page-num">Halaman: 1 / 1</div>
    `;
  }

  function generateSptjmHtml(): string {
    return `
      <div class="kop-double-line" style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 65px; height: 75px; text-align: center;">
          <img src="/Logo-Tapsel.png" alt="Logo Tapsel" style="max-width: 60px; max-height: 75px;" />
        </div>
        <div style="flex: 1; text-align: center; line-height: 1.25;">
          <div style="font-size: 12pt; font-weight: bold;">PEMERINTAH KABUPATEN TAPANULI SELATAN</div>
          <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase;">${sppData.nm_skpd}</div>
          <div style="font-size: 11pt; font-weight: bold;">TAHUN ANGGARAN ${sppData.tahunAnggaran}</div>
          <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">SIPIROK</div>
        </div>
      </div>

      <div class="text-center font-bold" style="margin-bottom: 18px;">
        <div style="font-size: 12pt; text-decoration: underline; text-transform: uppercase;">SURAT PERNYATAAN PERTANGGUNG-JAWABAN MUTLAK</div>
      </div>

      <div style="font-size: 10.5pt; line-height: 1.45; margin-bottom: 12px;">
        <div>Yang Bertandatangan dibawah ini :</div>
        <table style="width: 100%; margin-top: 4px;">
          <tr>
            <td style="width: 80px; vertical-align: top;">Nama</td>
            <td style="width: 15px; vertical-align: top;">:</td>
            <td style="vertical-align: top; font-weight: bold;">${sppData.paKpaNama || sppData.opd?.kepalaNama || "-"}</td>
          </tr>
          <tr>
            <td style="vertical-align: top;">N I P</td>
            <td style="vertical-align: top;">:</td>
            <td style="vertical-align: top; font-family: 'Courier New', monospace;">${sppData.paKpaNip || sppData.opd?.kepalaNip || "-"}</td>
          </tr>
          <tr>
            <td style="vertical-align: top;">Jabatan</td>
            <td style="vertical-align: top;">:</td>
            <td style="vertical-align: top; text-transform: uppercase;">KEPALA ${sppData.nm_skpd} KABUPATEN TAPANULI SELATAN</td>
          </tr>
        </table>
      </div>

      <div style="font-size: 10.5pt; line-height: 1.45; text-align: justify; margin-bottom: 14px;">
        <div style="font-weight: bold; margin-bottom: 6px;">Menyatakan dengan ini bahwa :</div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <span>1).</span>
          <div>Segala Permohonan Pencairan Dana yang dilakukan oleh ${sppData.nm_skpd} , melalui ${badgeCode} dari Bendaharawan Umum Daerah untuk keperluan Program/Kegiatan SKPD Pada Tahun ${sppData.tahunAnggaran}</div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <span>2).</span>
          <div>Penggunaan dana tersebut diatas akan dilaksanakan sesuai dengan ketentuan dan peraturan yang berlaku dan tetap mengedepankan prinsip efesiensi dan bertanggungjawab penuh Realisasi Fisik dan keuangan penggunaan dana yang diminta dan dicairkan</div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <span>3).</span>
          <div>Bukti-bukti penggunaan Dana/Belanja tersebut diatas disimpan sesuai dengan ketentuan yang berlaku pada SKPD ${sppData.nm_skpd} untuk kelengkapan administrasi dan keperluan pemeriksaan aparat fungsional</div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <span>4).</span>
          <div>Satu Rangkap dari bukti-bukti perlengkapan setelah mendapat pengesahan dari pejabat penatausahaan keuangan SKPD ${sppData.nm_skpd} akan disampaikan kepada bendaharawan umum daerah paling lambat 10 bulan berikutnya</div>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
          <span>5).</span>
          <div>Dalam dana tersebut terdapat sisa lebih belanja dana/tidak dapat dipergunakan sebagaimana mestinya sesuai dengan ketentuan dan peraturan yang berlaku, maka sisa dana tersebut akan segera dikembalikan/disetorkan kepada Bendaharawan paling lambat tanggal 10 bulan berikutnya</div>
        </div>
      </div>

      <p class="text-justify" style="font-size: 10.5pt; line-height: 1.45; margin-bottom: 18px;">
        Demikian Surat Pernyataan Tanggung-Jawab Mutlak ini dibuat untuk melengkapi persyaratan pengajuan ${badgeCode} ${sppData.nm_skpd}
      </p>

      <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
        <div style="text-align: center; width: 320px; font-size: 10.5pt;">
          <div>${tempatCetak}, ${formatTanggalIndo(tanggalCetak)}</div>
          <div style="font-weight: bold; margin-top: 2px; text-transform: uppercase;">KEPALA ${sppData.nm_skpd} KABUPATEN TAPANULI SELATAN</div>
          <div style="height: 65px;"></div>
          <div style="font-weight: bold; text-decoration: underline;">${sppData.paKpaNama || sppData.opd?.kepalaNama || "...................................."}</div>
          <div>NIP. ${sppData.paKpaNip || sppData.opd?.kepalaNip || "...................................."}</div>
        </div>
      </div>

      <div class="footer-page-num">Halaman: 1 / 1</div>
    `;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#88131A]" />
              <h3 className="text-sm font-extrabold text-slate-900">
                Pratinjau & Cetak Dokumen {badgeCode}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-800 border border-amber-200">
                {sppData.no_spp}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              [{sppData.kd_skpd}] {sppData.nm_skpd}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {activeTab === "semua" ? "Bundel Lengkap" : "Dokumen"}</span>
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

        {/* Tab Selector & Parameter Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "pengantar", label: "1. Pengantar", icon: FileText },
              { id: "ringkasan", label: "2. Ringkasan", icon: Layers },
              { id: "rincian", label: "3. Rincian", icon: FileCheck2 },
              { id: "kelengkapan", label: "4. Kelengkapan", icon: CheckCircle2 },
              { id: "sptjm", label: "5. SPTJM", icon: ShieldCheck },
              { id: "semua", label: "📑 Bundel", icon: Printer },
            ].map((t) => {
              const IconComp = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as SppPrintTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isActive
                    ? "bg-[#5E0E14] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Setting Parameter Cetak */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={tempatCetak}
                onChange={(e) => setTempatCetak(e.target.value)}
                placeholder="Tempat"
                className="w-24 text-xs font-medium bg-transparent focus:outline-none text-slate-800"
                title="Tempat Penandatanganan"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
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

        {/* Paper Canvas Preview */}
        <div className="flex-1 p-6 bg-slate-200/60 overflow-y-auto flex justify-center">
          <div className="w-full max-w-[210mm] space-y-8">
            {activeTab === "semua" ? (
              <>
                <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans text-slate-400">
                    Lembar 1: Surat Pengantar
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generatePengantarHtml(),
                    }}
                  />
                </div>
                <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans text-slate-400">
                    Lembar 2: Ringkasan SPP
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateRingkasanHtml(),
                    }}
                  />
                </div>
                <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans text-slate-400">
                    Lembar 3: Rincian SPP
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateRincianHtml(),
                    }}
                  />
                </div>
                <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans text-slate-400">
                    Lembar 4: Penelitian Kelengkapan
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateKelengkapanHtml(),
                    }}
                  />
                </div>
                <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans text-slate-400">
                    Lembar 5: SPTJM
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateSptjmHtml(),
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white shadow-md p-10 min-h-[297mm] text-slate-900 font-serif relative">
                {activeTab === "pengantar" && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generatePengantarHtml(),
                    }}
                  />
                )}
                {activeTab === "ringkasan" && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateRingkasanHtml(),
                    }}
                  />
                )}
                {activeTab === "rincian" && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateRincianHtml(),
                    }}
                  />
                )}
                {activeTab === "kelengkapan" && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateKelengkapanHtml(),
                    }}
                  />
                )}
                {activeTab === "sptjm" && (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateSptjmHtml(),
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hidden Iframe for Direct Printing */}
        <iframe
          ref={printIframeRef}
          className="hidden"
          title="Print Frame"
        />
      </div>
    </div>
  );
}

