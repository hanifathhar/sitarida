"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Printer,
  FileText,
  Building2,
  Calendar,
  Search,
  RefreshCw,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  PieChart,
  Coins,
  ShieldCheck,
  HeartHandshake,
  BookOpenText,
  Users2,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from "lucide-react";
import ActionBanner from "@/components/ui/ActionBanner";
import PaginationBar from "@/components/ui/PaginationBar";

interface OpdItem {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan?: string | null;
  kd_urusan?: string | null;
  nm_urusan?: string | null;
  kepalaNama?: string | null;
  kepalaNip?: string | null;
  kepalaJabatan?: string | null;
}

interface DrkaRow {
  id: string;
  tahunAnggaran: number;
  trskpdId: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  nilai: number;
  nilai_ubah: number;
}

interface DpoRow {
  id: string;
  tahunAnggaran: number;
  trdrkaId: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kd_rek6: string;
  nm_rek6: string;
  kd_barang?: string | null;
  uraian: string;
  satuan: string;
  satuan_ubah?: string | null;
  volume: number;
  volume_ubah?: number | null;
  harga: number;
  harga_ubah?: number | null;
  total: number;
  total_ubah?: number | null;
  kd_sumdan?: string | null;
  catatan?: string | null;
  catatan_ubah?: string | null;
}

interface PejabatDaerahInfo {
  namaDaerah: string;
  ibuKota: string;
  bupatiNama: string;
  bupatiJabatan: string;
  sekdaNama: string;
  sekdaNip: string;
  sekdaPangkat: string;
  kepalaBpkpadNama: string;
  kepalaBpkpadNip: string;
  kepalaBpkpadPangkat: string;
  nomorPerda: string;
  tanggalPerda: string;
  nomorPerbup: string;
  tanggalPerbup: string;
}

type DokumenType =
  | "1_RINGKASAN_APBD"
  | "2_RINGKASAN_URUSAN_ORGANISASI"
  | "3_RINCIAN_APBD"
  | "4_REKAP_PROGRAM_KEGIATAN"
  | "5_KESELARASAN_FUNGSI"
  | "6_PEMENUHAN_SPM"
  | "7_SINKRONISASI_RPJMD"
  | "8_SINKRONISASI_RKPD_PPAS"
  | "9_SINKRONISASI_PRIORITAS_NASIONAL"
  | "10_DAFTAR_PEGAWAI"
  | "11_DAFTAR_PIUTANG";

interface DokumenMeta {
  id: DokumenType;
  no: number;
  kodeRomawi: string;
  judul: string;
  subJudulPerda: string;
  orientasi: "portrait" | "landscape";
  icon: any;
  color: string;
}

const DOKUMEN_CATALOG: DokumenMeta[] = [
  {
    id: "1_RINGKASAN_APBD",
    no: 1,
    kodeRomawi: "Lampiran I",
    judul: "Ringkasan APBD Menurut Kelompok & Jenis",
    subJudulPerda:
      "RINGKASAN APBD YANG DIKLASIFIKASI MENURUT KELOMPOK DAN JENIS PENDAPATAN, BELANJA, DAN PEMBIAYAAN",
    orientasi: "portrait",
    icon: PieChart,
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "2_RINGKASAN_URUSAN_ORGANISASI",
    no: 2,
    kodeRomawi: "Lampiran II",
    judul: "Ringkasan APBD per Urusan & Organisasi",
    subJudulPerda:
      "RINGKASAN APBD YANG DIKLASIFIKASIKAN MENURUT URUSAN PEMERINTAHAN DAERAH DAN ORGANISASI",
    orientasi: "landscape",
    icon: Building2,
    color: "from-emerald-600 to-teal-700",
  },
  {
    id: "3_RINCIAN_APBD",
    no: 3,
    kodeRomawi: "Lampiran III",
    judul: "Rincian APBD Menurut Urusan & Rekening",
    subJudulPerda:
      "RINCIAN APBD MENURUT URUSAN PEMERINTAHAN DAERAH, ORGANISASI, PROGRAM, KEGIATAN, SUB KEGIATAN, KELOMPOK, JENIS PENDAPATAN, BELANJA, DAN PEMBIAYAAN",
    orientasi: "landscape",
    icon: FileText,
    color: "from-amber-600 to-orange-700",
  },
  {
    id: "4_REKAP_PROGRAM_KEGIATAN",
    no: 4,
    kodeRomawi: "Lampiran IV",
    judul: "Rekapitulasi Belanja per Program & Kegiatan",
    subJudulPerda:
      "REKAPITULASI BELANJA MENURUT URUSAN / BIDANG URUSAN / PROGRAM / KEGIATAN / SUB KEGIATAN",
    orientasi: "landscape",
    icon: Layers,
    color: "from-purple-600 to-violet-700",
  },
  {
    id: "5_KESELARASAN_FUNGSI",
    no: 5,
    kodeRomawi: "Lampiran V",
    judul: "Rekap Belanja Keselarasan Urusan & Fungsi",
    subJudulPerda:
      "REKAPITULASI BELANJA DAERAH UNTUK KESELARASAN DAN KETERPADUAN URUSAN PEMERINTAHAN DAERAH DAN FUNGSI DALAM KERANGKA PENGELOLAAN KEUANGAN NEGARA",
    orientasi: "landscape",
    icon: Coins,
    color: "from-rose-600 to-red-700",
  },
  {
    id: "6_PEMENUHAN_SPM",
    no: 6,
    kodeRomawi: "Lampiran VI",
    judul: "Rekapitulasi Belanja Pemenuhan SPM",
    subJudulPerda: "REKAPITULASI BELANJA UNTUK PEMENUHAN SPM",
    orientasi: "landscape",
    icon: ShieldCheck,
    color: "from-cyan-600 to-blue-700",
  },
  {
    id: "7_SINKRONISASI_RPJMD",
    no: 7,
    kodeRomawi: "Lampiran VII",
    judul: "Sinkronisasi Program RPJMD / RPD & APBD",
    subJudulPerda:
      "SINKRONISASI PROGRAM PADA RPJMD/RPD DENGAN RANCANGAN APBD",
    orientasi: "portrait",
    icon: BookOpenText,
    color: "from-indigo-600 to-sky-700",
  },
  {
    id: "8_SINKRONISASI_RKPD_PPAS",
    no: 8,
    kodeRomawi: "Lampiran VIII",
    judul: "Sinkronisasi RKPD, PPAS & APBD",
    subJudulPerda:
      "SINKRONISASI PROGRAM, KEGIATAN DAN SUB KEGIATAN PADA RKPD DAN PPAS DENGAN RANCANGAN PERATURAN DAERAH TENTANG APBD",
    orientasi: "landscape",
    icon: FileSpreadsheet,
    color: "from-pink-600 to-rose-700",
  },
  {
    id: "9_SINKRONISASI_PRIORITAS_NASIONAL",
    no: 9,
    kodeRomawi: "Lampiran IX",
    judul: "Sinkronisasi Prioritas Nasional & Provinsi",
    subJudulPerda:
      "SIKRONISASI PROGRAM PRIORITAS NASIONAL DAN PRIORITAS PROVINSI DENGAN PROGRAM PRIORITAS KABUPATEN/KOTA",
    orientasi: "landscape",
    icon: HeartHandshake,
    color: "from-violet-600 to-purple-800",
  },
  {
    id: "10_DAFTAR_PEGAWAI",
    no: 10,
    kodeRomawi: "Lampiran X",
    judul: "Daftar Pegawai per Golongan & Jabatan",
    subJudulPerda:
      "DAFTAR JUMLAH PEGAWAI PER GOLONGAN DAN PER JABATAN",
    orientasi: "portrait",
    icon: Users2,
    color: "from-amber-700 to-yellow-800",
  },
  {
    id: "11_DAFTAR_PIUTANG",
    no: 11,
    kodeRomawi: "Lampiran XI",
    judul: "Daftar Piutang Daerah",
    subJudulPerda: "DAFTAR PIUTANG DAERAH",
    orientasi: "landscape",
    icon: Coins,
    color: "from-[#5E0E14] to-[#991B1B]",
  },
];

function formatRupiah(val: number) {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}

function formatAngkaTitik(val: number) {
  return Math.round(val || 0).toLocaleString("id-ID");
}

export default function CetakDokumenAnggaranPage() {
  const [tahun, setTahun] = useState<number>(2025);
  const [selectedOpdId, setSelectedOpdId] = useState<string>("ALL");
  const [activeDocId, setActiveDocId] =
    useState<DokumenType>("1_RINGKASAN_APBD");

  const [loading, setLoading] = useState(true);
  const [opds, setOpds] = useState<OpdItem[]>([]);
  const [drkaRows, setDrkaRows] = useState<DrkaRow[]>([]);
  const [dpoRows, setDpoRows] = useState<DpoRow[]>([]);
  const [pejabatInfo, setPejabatInfo] = useState<PejabatDaerahInfo>({
    namaDaerah: "KABUPATEN TAPANULI SELATAN",
    ibuKota: "Sipirok",
    bupatiNama: "DOLLY PASARIBU",
    bupatiJabatan: "BUPATI TAPANULI SELATAN",
    sekdaNama: "SOFYAN ADIL, S.Sos, M.A.P",
    sekdaPangkat: "PEMBINA UTAMA MADYA",
    sekdaNip: "19730509 199303 1 002",
    kepalaBpkpadNama: "M. FRANANDA, S.E, M.M",
    kepalaBpkpadPangkat: "PEMBINA UTAMA MUDA",
    kepalaBpkpadNip: "19800723 200312 1 002",
    nomorPerda: "2 TAHUN 2024",
    tanggalPerda: "31 Desember 2024",
    nomorPerbup: "29 TAHUN 2024",
    tanggalPerbup: "31 Desember 2024",
  });

  const [searchTable, setSearchTable] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(15);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tahun: String(tahun),
      });
      if (selectedOpdId && selectedOpdId !== "ALL") {
        params.append("opdId", selectedOpdId);
      }
      const res = await fetch(`/api/perencanaan/dokumen-anggaran?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.tahun) {
          setTahun(json.data.tahun);
        }
        setOpds(json.data.opds || []);
        setDrkaRows(json.data.drkaRows || []);
        setDpoRows(json.data.dpoRows || []);
        if (json.data.pejabatInfo) {
          setPejabatInfo(json.data.pejabatInfo);
        }
      } else {
        setBanner({
          type: "error",
          message: json.message || "Gagal memuat data dokumen anggaran",
        });
      }
    } catch {
      setBanner({
        type: "error",
        message: "Kesalahan jaringan saat memuat data anggaran",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, selectedOpdId]);

  const activeDocMeta = useMemo(
    () => DOKUMEN_CATALOG.find((d) => d.id === activeDocId)!,
    [activeDocId]
  );

  // =========================================================================
  // KALKULASI DATA UTAMA ANGGARAN
  // =========================================================================
  const apbdSummary = useMemo(() => {
    let pend = 0;
    let bel = 0;
    let pembiayaanMasuk = 0;
    let pembiayaanKeluar = 0;

    for (const r of drkaRows) {
      const kd = (r.kd_rek6 || "").trim();
      const val = Number(r.nilai_ubah) || Number(r.nilai) || 0;

      if (kd.startsWith("4")) {
        pend += val;
      } else if (kd.startsWith("5")) {
        bel += val;
      } else if (kd.startsWith("6.2")) {
        pembiayaanKeluar += val;
      } else if (kd.startsWith("6")) {
        pembiayaanMasuk += val;
      }
    }

    const surplus = pend - bel;
    const pembiayaanNetto = pembiayaanMasuk - pembiayaanKeluar;
    const silpa = surplus + pembiayaanNetto;

    return {
      pend,
      bel,
      surplus,
      pembiayaanMasuk,
      pembiayaanKeluar,
      pembiayaanNetto,
      silpa,
    };
  }, [drkaRows]);

  // Agregasi Baris Lampiran 1: Ringkasan APBD Menurut Kelompok & Jenis
  const lampiran1Rows = useMemo(() => {
    interface ItemRow {
      kode: string;
      uraian: string;
      level: 1 | 2 | 3;
      jumlah: number;
      dasarHukum: string;
    }
    const map = new Map<string, ItemRow>();

    map.set("4", { kode: "4", uraian: "PENDAPATAN DAERAH", level: 1, jumlah: 0, dasarHukum: "" });
    map.set("4.1", { kode: "4.1", uraian: "PENDAPATAN ASLI DAERAH (PAD)", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("4.1.01", { kode: "4.1.01", uraian: "Pajak Daerah", level: 3, jumlah: 0, dasarHukum: "UU No. 1 Tahun 2022 / Perda" });
    map.set("4.1.02", { kode: "4.1.02", uraian: "Retribusi Daerah", level: 3, jumlah: 0, dasarHukum: "Perda Pajak & Retribusi Daerah" });
    map.set("4.1.03", { kode: "4.1.03", uraian: "Hasil Pengelolaan Kekayaan Daerah yang Dipisahkan", level: 3, jumlah: 0, dasarHukum: "Perda Penyertaan Modal Daerah" });
    map.set("4.1.04", { kode: "4.1.04", uraian: "Lain-lain PAD yang Sah", level: 3, jumlah: 0, dasarHukum: "Ketentuan Perundang-undangan" });

    map.set("4.2", { kode: "4.2", uraian: "PENDAPATAN TRANSFER", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("4.2.01", { kode: "4.2.01", uraian: "Pendapatan Transfer Pemerintah Pusat", level: 3, jumlah: 0, dasarHukum: "PMK Alokasi TKD TA Berkenaan" });
    map.set("4.2.02", { kode: "4.2.02", uraian: "Pendapatan Transfer Antar Daerah", level: 3, jumlah: 0, dasarHukum: "Bagi Hasil Pajak Provinsi" });

    map.set("4.3", { kode: "4.3", uraian: "LAIN-LAIN PENDAPATAN DAERAH YANG SAH", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("4.3.01", { kode: "4.3.01", uraian: "Pendapatan Hibah", level: 3, jumlah: 0, dasarHukum: "Perjanjian Hibah Daerah (NPHD)" });
    map.set("4.3.03", { kode: "4.3.03", uraian: "Lain-lain Pendapatan Sesuai dengan Ketentuan Peraturan Perundang-Undangan", level: 3, jumlah: 0, dasarHukum: "Ketentuan Peraturan Perundang-Undangan" });

    map.set("5", { kode: "5", uraian: "BELANJA DAERAH", level: 1, jumlah: 0, dasarHukum: "" });
    map.set("5.1", { kode: "5.1", uraian: "BELANJA OPERASI", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("5.1.01", { kode: "5.1.01", uraian: "Belanja Pegawai", level: 3, jumlah: 0, dasarHukum: "Peraturan Gaji & Tunjangan ASN" });
    map.set("5.1.02", { kode: "5.1.02", uraian: "Belanja Barang dan Jasa", level: 3, jumlah: 0, dasarHukum: "SSH / Standar Harga Satuan" });
    map.set("5.1.05", { kode: "5.1.05", uraian: "Belanja Hibah", level: 3, jumlah: 0, dasarHukum: "Keputusan Bupati tentang Penerima Hibah" });
    map.set("5.1.06", { kode: "5.1.06", uraian: "Belanja Bantuan Sosial", level: 3, jumlah: 0, dasarHukum: "Keputusan Bupati tentang Bansos" });

    map.set("5.2", { kode: "5.2", uraian: "BELANJA MODAL", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("5.2.01", { kode: "5.2.01", uraian: "Belanja Modal Tanah", level: 3, jumlah: 0, dasarHukum: "Dokumen Perencanaan Pengadaan Tanah" });
    map.set("5.2.02", { kode: "5.2.02", uraian: "Belanja Modal Peralatan dan Mesin", level: 3, jumlah: 0, dasarHukum: "SSH / Standar Kebutuhan BMD" });
    map.set("5.2.03", { kode: "5.2.03", uraian: "Belanja Modal Gedung dan Bangunan", level: 3, jumlah: 0, dasarHukum: "HSPK / Rencana Teknis Pembangunan" });
    map.set("5.2.04", { kode: "5.2.04", uraian: "Belanja Modal Jalan, Jaringan, dan Irigasi", level: 3, jumlah: 0, dasarHukum: "HSPK Pekerjaan Fisik / Ke-PU-an" });

    map.set("5.3", { kode: "5.3", uraian: "BELANJA TIDAK TERDUGA", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("5.3.01", { kode: "5.3.01", uraian: "Belanja Tidak Terduga", level: 3, jumlah: 0, dasarHukum: "Ketentuan Penanggulangan Keadaan Darurat" });

    map.set("5.4", { kode: "5.4", uraian: "BELANJA TRANSFER", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("5.4.01", { kode: "5.4.01", uraian: "Belanja Bagi Hasil", level: 3, jumlah: 0, dasarHukum: "Bagi Hasil Pajak/Retribusi ke Desa" });
    map.set("5.4.02", { kode: "5.4.02", uraian: "Belanja Bantuan Keuangan", level: 3, jumlah: 0, dasarHukum: "Bantuan Keuangan Khusus / Desa" });

    map.set("6", { kode: "6", uraian: "PEMBIAYAAN DAERAH", level: 1, jumlah: 0, dasarHukum: "" });
    map.set("6.1", { kode: "6.1", uraian: "PENERIMAAN PEMBIAYAAN", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("6.1.01", { kode: "6.1.01", uraian: "Sisa Lebih Perhitungan Anggaran Tahun Sebelumnya (SiLPA)", level: 3, jumlah: 0, dasarHukum: "LHP BPK atas LKPD Tahun Lalu" });
    map.set("6.2", { kode: "6.2", uraian: "PENGELUARAN PEMBIAYAAN", level: 2, jumlah: 0, dasarHukum: "" });
    map.set("6.2.02", { kode: "6.2.02", uraian: "Penyertaan Modal Daerah", level: 3, jumlah: 0, dasarHukum: "Perda Penyertaan Modal Daerah" });

    for (const r of drkaRows) {
      const kd = (r.kd_rek6 || "").trim();
      const val = Number(r.nilai_ubah) || Number(r.nilai) || 0;

      if (kd.startsWith("4")) {
        map.get("4")!.jumlah += val;
        if (kd.startsWith("4.1")) {
          map.get("4.1")!.jumlah += val;
          for (const sub of ["4.1.01", "4.1.02", "4.1.03", "4.1.04"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        } else if (kd.startsWith("4.2")) {
          map.get("4.2")!.jumlah += val;
          for (const sub of ["4.2.01", "4.2.02"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        } else {
          map.get("4.3")!.jumlah += val;
          for (const sub of ["4.3.01", "4.3.03"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        }
      } else if (kd.startsWith("5")) {
        map.get("5")!.jumlah += val;
        if (kd.startsWith("5.1")) {
          map.get("5.1")!.jumlah += val;
          for (const sub of ["5.1.01", "5.1.02", "5.1.05", "5.1.06"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        } else if (kd.startsWith("5.2")) {
          map.get("5.2")!.jumlah += val;
          for (const sub of ["5.2.01", "5.2.02", "5.2.03", "5.2.04"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        } else if (kd.startsWith("5.3")) {
          map.get("5.3")!.jumlah += val;
          map.get("5.3.01")!.jumlah += val;
        } else if (kd.startsWith("5.4")) {
          map.get("5.4")!.jumlah += val;
          for (const sub of ["5.4.01", "5.4.02"]) {
            if (kd.startsWith(sub)) map.get(sub)!.jumlah += val;
          }
        }
      } else if (kd.startsWith("6.2")) {
        map.get("6")!.jumlah += val;
        map.get("6.2")!.jumlah += val;
        map.get("6.2.02")!.jumlah += val;
      } else if (kd.startsWith("6")) {
        map.get("6")!.jumlah += val;
        map.get("6.1")!.jumlah += val;
        map.get("6.1.01")!.jumlah += val;
      }
    }

    return Array.from(map.values());
  }, [drkaRows]);

  // Agregasi Baris Lampiran 2: Ringkasan APBD per Urusan & Organisasi
  const lampiran2Rows = useMemo(() => {
    const map = new Map<
      string,
      {
        kd_skpd: string;
        nm_skpd: string;
        pendapatan: number;
        operasi: number;
        modal: number;
        btt: number;
        transfer: number;
        totalBelanja: number;
        surplus: number;
      }
    >();

    for (const o of opds) {
      map.set(o.kd_skpd, {
        kd_skpd: o.kd_skpd,
        nm_skpd: o.nm_skpd,
        pendapatan: 0,
        operasi: 0,
        modal: 0,
        btt: 0,
        transfer: 0,
        totalBelanja: 0,
        surplus: 0,
      });
    }

    for (const r of drkaRows) {
      const kd = (r.kd_rek6 || "").trim();
      const val = Number(r.nilai_ubah) || Number(r.nilai) || 0;

      let entry = map.get(r.kd_skpd);
      if (!entry) {
        entry = {
          kd_skpd: r.kd_skpd,
          nm_skpd: r.nm_skpd,
          pendapatan: 0,
          operasi: 0,
          modal: 0,
          btt: 0,
          transfer: 0,
          totalBelanja: 0,
          surplus: 0,
        };
        map.set(r.kd_skpd, entry);
      }

      if (kd.startsWith("4")) {
        entry.pendapatan += val;
      } else if (kd.startsWith("5")) {
        entry.totalBelanja += val;
        if (kd.startsWith("5.1")) entry.operasi += val;
        else if (kd.startsWith("5.2")) entry.modal += val;
        else if (kd.startsWith("5.3")) entry.btt += val;
        else if (kd.startsWith("5.4")) entry.transfer += val;
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        surplus: item.pendapatan - item.totalBelanja,
      }))
      .filter((row) =>
        selectedOpdId === "ALL"
          ? true
          : row.kd_skpd === selectedOpdId ||
            opds.find((o) => o.id === selectedOpdId)?.kd_skpd === row.kd_skpd
      )
      .sort((a, b) => a.kd_skpd.localeCompare(b.kd_skpd));
  }, [opds, drkaRows, selectedOpdId]);

  // Agregasi Baris Lampiran 4: Rekapitulasi Belanja per Program & Kegiatan
  const lampiran4Rows = useMemo(() => {
    const map = new Map<
      string,
      {
        kd_skpd: string;
        nm_skpd: string;
        kd_program: string;
        nm_program: string;
        kd_kegiatan: string;
        nm_kegiatan: string;
        kd_sub_kegiatan: string;
        nm_sub_kegiatan: string;
        operasi: number;
        modal: number;
        btt: number;
        transfer: number;
        total: number;
        lokasi: string;
        sumberDana: string;
      }
    >();

    for (const r of drkaRows) {
      const kd = (r.kd_rek6 || "").trim();
      if (!kd.startsWith("5")) continue;

      const key = `${r.kd_skpd}__${r.kd_sub_kegiatan}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          kd_skpd: r.kd_skpd,
          nm_skpd: r.nm_skpd,
          kd_program: r.kd_program,
          nm_program: r.nm_program,
          kd_kegiatan: r.kd_kegiatan,
          nm_kegiatan: r.nm_kegiatan,
          kd_sub_kegiatan: r.kd_sub_kegiatan,
          nm_sub_kegiatan: r.nm_sub_kegiatan,
          operasi: 0,
          modal: 0,
          btt: 0,
          transfer: 0,
          total: 0,
          lokasi: "Kab. Tapanuli Selatan",
          sumberDana: "Dana Alokasi Umum (DAU) / PAD",
        };
        map.set(key, entry);
      }

      const val = Number(r.nilai_ubah) || Number(r.nilai) || 0;
      entry.total += val;

      if (kd.startsWith("5.1")) entry.operasi += val;
      else if (kd.startsWith("5.2")) entry.modal += val;
      else if (kd.startsWith("5.3")) entry.btt += val;
      else if (kd.startsWith("5.4")) entry.transfer += val;
    }

    return Array.from(map.values())
      .filter((row) =>
        selectedOpdId === "ALL"
          ? true
          : row.kd_skpd === selectedOpdId ||
            opds.find((o) => o.id === selectedOpdId)?.kd_skpd === row.kd_skpd
      )
      .map((r, idx) => ({
        no: idx + 1,
        ...r,
      }));
  }, [drkaRows, selectedOpdId, opds]);

  // Filter Baris Tabel yang Aktif
  const activeTableData = useMemo(() => {
    const q = searchTable.toLowerCase().trim();

    if (activeDocId === "1_RINGKASAN_APBD") {
      return lampiran1Rows.filter(
        (r) =>
          !q ||
          r.kode.toLowerCase().includes(q) ||
          r.uraian.toLowerCase().includes(q)
      );
    }
    if (activeDocId === "2_RINGKASAN_URUSAN_ORGANISASI") {
      return lampiran2Rows.filter(
        (r) =>
          !q ||
          r.kd_skpd.toLowerCase().includes(q) ||
          r.nm_skpd.toLowerCase().includes(q)
      );
    }
    if (activeDocId === "4_REKAP_PROGRAM_KEGIATAN") {
      return lampiran4Rows.filter(
        (r) =>
          !q ||
          r.nm_skpd.toLowerCase().includes(q) ||
          r.nm_program.toLowerCase().includes(q) ||
          r.nm_kegiatan.toLowerCase().includes(q) ||
          r.nm_sub_kegiatan.toLowerCase().includes(q)
      );
    }
    if (activeDocId === "3_RINCIAN_APBD") {
      return drkaRows.filter(
        (r) =>
          !q ||
          r.kd_skpd.toLowerCase().includes(q) ||
          r.nm_skpd.toLowerCase().includes(q) ||
          r.kd_rek6.toLowerCase().includes(q) ||
          r.nm_rek6.toLowerCase().includes(q)
      );
    }
    // Fallback general table view
    return drkaRows.filter(
      (r) =>
        !q ||
        r.kd_skpd.toLowerCase().includes(q) ||
        r.nm_skpd.toLowerCase().includes(q) ||
        r.kd_rek6.toLowerCase().includes(q) ||
        r.nm_rek6.toLowerCase().includes(q)
    );
  }, [
    activeDocId,
    searchTable,
    lampiran1Rows,
    lampiran2Rows,
    lampiran4Rows,
    drkaRows,
  ]);

  const totalPages = Math.max(1, Math.ceil(activeTableData.length / tableLimit));
  const safePage = Math.min(tablePage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * tableLimit;
    return activeTableData.slice(start, start + tableLimit);
  }, [activeTableData, safePage, tableLimit]);

  // =========================================================================
  // GENERATOR HTML LAPORAN PERSIS SESUAI FOLDER "Perda APBD TA. 2025"
  // =========================================================================
  const generatePerda2025ReportHtml = (): string => {
    const isLandscape = activeDocMeta.orientasi === "landscape";
    const pageSize = isLandscape ? "A4 landscape" : "A4 portrait";

    let tableHeaders = "";
    let tableRows = "";

    if (activeDocId === "1_RINGKASAN_APBD") {
      tableHeaders = `
        <tr>
          <th style="width: 140px;">KODE</th>
          <th>URAIAN</th>
          <th style="width: 170px;">JUMLAH (Rp)</th>
          <th style="width: 190px;">DASAR HUKUM</th>
        </tr>
        <tr style="background: #f8fafc; font-size: 8.5pt;">
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
        </tr>
      `;
      tableRows = lampiran1Rows
        .map(
          (r) => `
        <tr style="font-weight: ${r.level === 1 ? "bold" : r.level === 2 ? "bold" : "normal"}; background-color: ${r.level === 1 ? "#f1f5f9" : "#fff"};">
          <td style="font-family: monospace;">${r.kode}</td>
          <td style="padding-left: ${r.level === 1 ? "6px" : r.level === 2 ? "18px" : "32px"};">${r.uraian}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.jumlah)}</td>
          <td style="font-size: 8.5pt;">${r.dasarHukum || "-"}</td>
        </tr>
      `
        )
        .join("");

      // Baris Surplus/Defisit, Netto & SILPA persis Lampiran 1 Perda 2025
      tableRows += `
        <tr style="font-weight: bold; background: #fff;">
          <td></td>
          <td style="padding-left: 18px;">SURPLUS / (DEFISIT)</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(apbdSummary.surplus)}</td>
          <td></td>
        </tr>
        <tr style="font-weight: bold; background: #fff;">
          <td></td>
          <td style="padding-left: 18px;">PEMBIAYAAN NETTO</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(apbdSummary.pembiayaanNetto)}</td>
          <td></td>
        </tr>
        <tr style="font-weight: bold; background: #f8fafc; border-top: 2px solid #000;">
          <td></td>
          <td>SISA LEBIH PEMBIAYAAN ANGGARAN TAHUN BERKENAAN (SILPA)</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(apbdSummary.silpa)}</td>
          <td></td>
        </tr>
      `;
    } else if (activeDocId === "2_RINGKASAN_URUSAN_ORGANISASI") {
      tableHeaders = `
        <tr>
          <th rowspan="2" style="width: 130px;">Kode</th>
          <th rowspan="2">Urusan Pemerintah Daerah / Organisasi</th>
          <th rowspan="2" style="width: 130px;">Pendapatan (Rp)</th>
          <th colspan="4">Belanja (Rp)</th>
          <th rowspan="2" style="width: 140px;">Jumlah Belanja (Rp)</th>
          <th rowspan="2" style="width: 130px;">Surplus / (Defisit) (Rp)</th>
        </tr>
        <tr>
          <th style="width: 110px;">Operasi</th>
          <th style="width: 110px;">Modal</th>
          <th style="width: 100px;">Tidak Terduga</th>
          <th style="width: 110px;">Transfer</th>
        </tr>
        <tr style="font-size: 8.5pt;">
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
          <th>5</th>
          <th>6</th>
          <th>7</th>
          <th>8 = (4+5+6+7)</th>
          <th>9 = (3-8)</th>
        </tr>
      `;
      tableRows = lampiran2Rows
        .map(
          (r) => `
        <tr>
          <td style="font-family: monospace;">${r.kd_skpd}</td>
          <td>${r.nm_skpd}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.pendapatan)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.operasi)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.modal)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.btt)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.transfer)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatAngkaTitik(r.totalBelanja)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatAngkaTitik(r.surplus)}</td>
        </tr>
      `
        )
        .join("");
    } else if (activeDocId === "4_REKAP_PROGRAM_KEGIATAN") {
      tableHeaders = `
        <tr>
          <th rowspan="2" style="width: 35px;">No</th>
          <th rowspan="2" style="width: 130px;">Kode</th>
          <th rowspan="2">Urusan / Bidang Urusan / Program / Kegiatan / Sub Kegiatan</th>
          <th rowspan="2">Indikator Kinerja</th>
          <th rowspan="2" style="width: 80px;">Target</th>
          <th colspan="5">Pagu Belanja (Rp)</th>
          <th rowspan="2" style="width: 100px;">Lokasi</th>
          <th rowspan="2" style="width: 110px;">Sumber Dana</th>
        </tr>
        <tr>
          <th style="width: 95px;">Operasi</th>
          <th style="width: 95px;">Modal</th>
          <th style="width: 85px;">Tidak Terduga</th>
          <th style="width: 85px;">Transfer</th>
          <th style="width: 110px;">Total</th>
        </tr>
        <tr style="font-size: 8.5pt;">
          <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th><th>12</th>
        </tr>
      `;
      tableRows = lampiran4Rows
        .slice(0, 400)
        .map(
          (r) => `
        <tr>
          <td style="text-align: center;">${r.no}</td>
          <td style="font-family: monospace;">${r.kd_sub_kegiatan}</td>
          <td><strong>${r.nm_skpd}</strong><br/>${r.nm_sub_kegiatan}</td>
          <td style="font-size: 8.5pt;">Capaian Layanan Urusan Pemerintahan</td>
          <td style="text-align: center;">100 %</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.operasi)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.modal)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.btt)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAngkaTitik(r.transfer)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatAngkaTitik(r.total)}</td>
          <td style="font-size: 8.5pt;">${r.lokasi}</td>
          <td style="font-size: 8.5pt;">${r.sumberDana}</td>
        </tr>
      `
        )
        .join("");
    } else {
      // Format Rincian Lampiran III & Default
      tableHeaders = `
        <tr>
          <th style="width: 140px;">KODE REKENING</th>
          <th>URAIAN</th>
          <th style="width: 170px;">JUMLAH (Rp)</th>
          <th style="width: 190px;">DASAR HUKUM</th>
        </tr>
        <tr style="background: #f8fafc; font-size: 8.5pt;">
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
        </tr>
      `;
      tableRows = drkaRows
        .slice(0, 500)
        .map(
          (r) => `
        <tr>
          <td style="font-family: monospace;">${r.kd_rek6}</td>
          <td><strong>${r.nm_skpd}</strong><br/>${r.nm_rek6}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${formatAngkaTitik(Number(r.nilai_ubah) || Number(r.nilai) || 0)}</td>
          <td style="font-size: 8.5pt;">Peraturan Bupati tentang Penjabaran APBD TA ${tahun}</td>
        </tr>
      `
        )
        .join("");
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${activeDocMeta.kodeRomawi} - ${activeDocMeta.judul} TA ${tahun}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 12mm 14mm 12mm 14mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: ${isLandscape ? "9pt" : "9.5pt"};
      line-height: 1.28;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    /* KOP KANAN ATAS PERSIS DOKUMEN PERDA 2025 */
    .top-meta-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 12px;
    }
    .top-meta-box {
      border: 1px solid #000;
      padding: 4px 8px;
      font-size: 8.5pt;
      line-height: 1.35;
      width: ${isLandscape ? "330px" : "300px"};
    }
    .center-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .header-region {
      font-weight: bold;
      font-size: 11pt;
      letter-spacing: 0.5px;
    }
    .header-doc-title {
      font-weight: bold;
      font-size: 10.5pt;
      text-transform: uppercase;
      margin-top: 3px;
      line-height: 1.25;
      padding: 0 ${isLandscape ? "80px" : "30px"};
    }
    .header-year {
      font-weight: bold;
      font-size: 10.5pt;
      margin-top: 3px;
    }
    table.perda-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: ${isLandscape ? "8.5pt" : "9pt"};
    }
    table.perda-table th, table.perda-table td {
      border: 1px solid #000;
      padding: 3.5px 5px;
      vertical-align: top;
    }
    table.perda-table thead th {
      background: #fff;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }
    /* TTD BUPATI TAPANULI SELATAN */
    .ttd-wrap {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
      page-break-inside: avoid;
    }
    .ttd-box {
      width: 280px;
      text-align: center;
      font-size: 9.5pt;
    }
  </style>
</head>
<body>
  <!-- KOTAK KANAN ATAS FORMAT RESMI PERDA APBD TA. 2025 -->
  <div class="top-meta-container">
    <div class="top-meta-box">
      <div><strong>${activeDocMeta.kodeRomawi} :</strong> Rancangan Peraturan Daerah</div>
      <div><strong>Nomor :</strong> ${pejabatInfo.nomorPerda}</div>
      <div><strong>Tanggal :</strong> ${pejabatInfo.tanggalPerda}</div>
    </div>
  </div>

  <!-- JUDUL DOKUMEN TENGAH -->
  <div class="center-header">
    <div class="header-region">KABUPATEN TAPANULI SELATAN</div>
    <div class="header-doc-title">${activeDocMeta.subJudulPerda}</div>
    <div class="header-year">TAHUN ANGGARAN ${tahun}</div>
  </div>

  <!-- TABEL LAPORAN RESMI -->
  <table class="perda-table">
    <thead>
      ${tableHeaders}
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- TANDA TANGAN BUPATI TAPANULI SELATAN PERSIS DOKUMEN PERDA APBD 2025 -->
  <div class="ttd-wrap">
    <div class="ttd-box">
      <div style="font-weight: bold;">${pejabatInfo.bupatiJabatan},</div>
      <div style="height: 60px;"></div>
      <div style="font-weight: bold;">${pejabatInfo.bupatiNama}</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    const iframe = printIframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const handleOpenNewTab = () => {
    const html = generatePerda2025ReportHtml();
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  return (
    <div className="space-y-6">
      {banner && (
        <ActionBanner feedback={banner} onDismiss={() => setBanner(null)} />
      )}

      {/* HEADER UTAMA & FILTER ANGGARAN SESUAI PERDA APBD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] text-white shadow-xs">
                <Printer className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Cetak Dokumen Anggaran (Perda APBD)</span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-red-100 text-[#88131A] border border-red-300">
                    FORMAT RESMI PERDA APBD TA. 2025
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format baku Lampiran I s/d XI Peraturan Daerah Kabupaten Tapanuli Selatan tentang APBD dalam satu tampilan terpadu.
                </p>
              </div>
            </div>
          </div>

          {/* Kontrol Tahun, OPD, Refresh & Parameter TTD */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tahun Anggaran Terkunci Sesuai Tahun Login */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-900">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>TA. {tahun} (Terkunci Sesuai Tahun Login)</span>
            </div>

            {/* Filter OPD */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                value={selectedOpdId}
                onChange={(e) => setSelectedOpdId(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 font-bold text-slate-800 cursor-pointer max-w-[220px] truncate"
              >
                <option value="ALL">Semua SKPD (Kabupaten)</option>
                {opds.map((o) => (
                  <option key={o.id} value={o.id}>
                    [{o.kd_skpd}] {o.nm_skpd}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Parameter TTD / Legal */}
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
              title="Atur Pejabat Penandatangan & Nomor Perda"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Parameter Cetak</span>
            </button>

            {/* Tombol Segarkan */}
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Ringkasan Cepat APBD Mini Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase">
              Pendapatan Daerah
            </span>
            <div className="text-sm font-extrabold font-mono text-blue-900 mt-0.5 truncate">
              {formatRupiah(apbdSummary.pend)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Belanja Daerah
            </span>
            <div className="text-sm font-extrabold font-mono text-emerald-900 mt-0.5 truncate">
              {formatRupiah(apbdSummary.bel)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase">
              Surplus / (Defisit)
            </span>
            <div className="text-sm font-extrabold font-mono text-rose-900 mt-0.5 truncate">
              {formatRupiah(apbdSummary.surplus)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
            <span className="text-[10px] font-bold text-purple-700 uppercase">
              Pembiayaan Netto
            </span>
            <div className="text-sm font-extrabold font-mono text-purple-900 mt-0.5 truncate">
              {formatRupiah(apbdSummary.pembiayaanNetto)}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================
          KATALOG 11 LAMPIRAN PERDA APBD TA. 2025
          ================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#991B1B]" />
            <span>Pilih 1 dari 11 Dokumen Lampiran Perda APBD:</span>
          </div>
          <span className="text-xs font-bold text-[#5E0E14]">
            Aktif: {activeDocMeta.kodeRomawi} — {activeDocMeta.judul}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DOKUMEN_CATALOG.map((doc) => {
            const isSelected = activeDocId === doc.id;
            const DocIcon = doc.icon;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setActiveDocId(doc.id);
                  setSearchTable("");
                  setTablePage(1);
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? "bg-white border-[#991B1B] shadow-md ring-2 ring-[#991B1B]/15"
                    : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        isSelected
                          ? "bg-[#5E0E14] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>{doc.kodeRomawi}</span>
                    </span>

                    <span className="text-[10px] font-bold text-slate-400 capitalize">
                      {doc.orientasi}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span
                      className={`p-2 rounded-xl text-white shrink-0 bg-gradient-to-br ${doc.color}`}
                    >
                      <DocIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">
                        {doc.judul}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span className="truncate">Perda APBD TA {tahun}</span>
                  <span
                    className={`font-bold inline-flex items-center gap-0.5 ${
                      isSelected ? "text-[#5E0E14]" : "text-slate-400"
                    }`}
                  >
                    <span>Pilih</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================================================
          AREA TAMPILAN AKTIF TABEL DOKUMEN SESUAI PERDA 2025
          ================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Preview & Action Button */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>{activeDocMeta.kodeRomawi} : {activeDocMeta.judul}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-[#88131A]">
                Format Baku A4 {activeDocMeta.orientasi.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {activeDocMeta.subJudulPerda} • {activeTableData.length} Baris Data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Input Pencarian */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTable}
                onChange={(e) => {
                  setSearchTable(e.target.value);
                  setTablePage(1);
                }}
                placeholder="Cari dalam tabel..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300"
              />
            </div>

            {/* Tombol Cetak / PDF Fullscreen Modal */}
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-extrabold shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Pratinjau PDF</span>
            </button>
          </div>
        </div>

        {/* Tabel Data Dokumen Sesuai Format Perda APBD */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Memuat data dokumen anggaran...
            </div>
          ) : activeDocId === "1_RINGKASAN_APBD" ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#5E0E14] text-white">
                  <th className="py-2.5 px-3 font-bold w-36">KODE</th>
                  <th className="py-2.5 px-3 font-bold">URAIAN</th>
                  <th className="py-2.5 px-3 font-bold text-right w-48">JUMLAH (Rp)</th>
                  <th className="py-2.5 px-3 font-bold w-64">DASAR HUKUM</th>
                </tr>
                <tr className="bg-slate-100 text-slate-600 font-mono text-[10px]">
                  <th className="py-1 px-3">1</th>
                  <th className="py-1 px-3">2</th>
                  <th className="py-1 px-3 text-right">3</th>
                  <th className="py-1 px-3">4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedRows.map((r: any) => (
                  <tr
                    key={r.kode}
                    className={`hover:bg-amber-50/40 transition-colors ${
                      r.level === 1
                        ? "bg-slate-100 font-extrabold text-slate-900"
                        : r.level === 2
                        ? "font-bold text-slate-800"
                        : "text-slate-700"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono">{r.kode}</td>
                    <td
                      className="py-2.5 px-3"
                      style={{
                        paddingLeft:
                          r.level === 1 ? "12px" : r.level === 2 ? "24px" : "36px",
                      }}
                    >
                      {r.uraian}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#5E0E14]">
                      {formatRupiah(r.jumlah)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {r.dasarHukum || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeDocId === "2_RINGKASAN_URUSAN_ORGANISASI" ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#5E0E14] text-white">
                  <th rowSpan={2} className="py-2 px-3 font-bold w-36">Kode</th>
                  <th rowSpan={2} className="py-2 px-3 font-bold">Urusan Pemerintah Daerah / Organisasi</th>
                  <th rowSpan={2} className="py-2 px-3 font-bold text-right">Pendapatan</th>
                  <th colSpan={4} className="py-1.5 px-3 font-bold text-center border-b border-white/20">
                    Belanja (Operasi / Modal / BTT / Transfer)
                  </th>
                  <th rowSpan={2} className="py-2 px-3 font-bold text-right">Jumlah Belanja</th>
                  <th rowSpan={2} className="py-2 px-3 font-bold text-right">Surplus / (Defisit)</th>
                </tr>
                <tr className="bg-[#5E0E14] text-white text-[11px]">
                  <th className="py-1 px-2 text-right">Operasi</th>
                  <th className="py-1 px-2 text-right">Modal</th>
                  <th className="py-1 px-2 text-right">Tidak Terduga</th>
                  <th className="py-1 px-2 text-right">Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedRows.map((r: any) => (
                  <tr key={r.kd_skpd} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#5E0E14]">
                      {r.kd_skpd}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {r.nm_skpd}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatRupiah(r.pendapatan)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {formatRupiah(r.operasi)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {formatRupiah(r.modal)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {formatRupiah(r.btt)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {formatRupiah(r.transfer)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatRupiah(r.totalBelanja)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {formatRupiah(r.surplus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Default View
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#5E0E14] text-white">
                  <th className="py-2.5 px-3 font-bold w-36">Kode Rekening</th>
                  <th className="py-2.5 px-3 font-bold">Uraian Dokumen</th>
                  <th className="py-2.5 px-3 font-bold">Perangkat Daerah (SKPD)</th>
                  <th className="py-2.5 px-3 font-bold text-right w-44">Jumlah Anggaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedRows.map((r: any, idx: number) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#5E0E14]">
                      {r.kd_sub_kegiatan || r.kd_rek6}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {r.nm_sub_kegiatan || r.uraian || r.nm_rek6}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      [{r.kd_skpd}] {r.nm_skpd}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatRupiah(r.total || r.nilai_ubah || r.nilai || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={activeTableData.length}
          limit={tableLimit}
          onPageChange={setTablePage}
          onLimitChange={(l) => {
            setTableLimit(l);
            setTablePage(1);
          }}
        />
      </div>

      {/* =================================================================
          MODAL REPORT PRATINJAU & CETAK DOKUMEN RESMI (FULLSCREEN DIALOG)
          ================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-300 h-[94vh] flex flex-col">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-[#46090E] via-[#5E0E14] to-[#88131A] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-white/15 text-amber-300">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold">
                    {activeDocMeta.kodeRomawi} : {activeDocMeta.judul}
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    Format Resmi Perda APBD TA {tahun} • Kertas A4 {activeDocMeta.orientasi.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#46090E] text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Kanvas Kertas A4 Simulasi Print */}
            <div className="flex-1 bg-slate-800/95 overflow-auto p-4 sm:p-6 flex justify-center items-start">
              <div
                className={`bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-400 ${
                  activeDocMeta.orientasi === "portrait"
                    ? "w-full max-w-[820px] min-h-[1080px]"
                    : "w-full max-w-[1120px] min-h-[790px]"
                }`}
              >
                <iframe
                  ref={printIframeRef}
                  title={activeDocMeta.judul}
                  srcDoc={generatePerda2025ReportHtml()}
                  className={`w-full border-0 ${
                    activeDocMeta.orientasi === "portrait"
                      ? "h-[1080px]"
                      : "h-[790px]"
                  }`}
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>
                Penandatangan: <strong>{pejabatInfo.bupatiJabatan} ({pejabatInfo.bupatiNama})</strong> • Nomor Perda: <strong>{pejabatInfo.nomorPerda}</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          MODAL FORM PARAMETER CETAK & PEJABAT PENANDATANGAN
          ================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="bg-[#5E0E14] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                  <span>Parameter Cetak &amp; Penandatangan Perda APBD</span>
                </h3>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  Sesuaikan nomor Perda dan pejabat penandatangan dokumen Perda APBD.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Daerah
                  </label>
                  <input
                    type="text"
                    value={pejabatInfo.namaDaerah}
                    onChange={(e) =>
                      setPejabatInfo((p) => ({ ...p, namaDaerah: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ibu Kota / Tempat Penetapan
                  </label>
                  <input
                    type="text"
                    value={pejabatInfo.ibuKota}
                    onChange={(e) =>
                      setPejabatInfo((p) => ({ ...p, ibuKota: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nomor Peraturan Daerah
                  </label>
                  <input
                    type="text"
                    value={pejabatInfo.nomorPerda}
                    onChange={(e) =>
                      setPejabatInfo((p) => ({ ...p, nomorPerda: e.target.value }))
                    }
                    placeholder="2 TAHUN 2024"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tanggal Peraturan Daerah
                  </label>
                  <input
                    type="text"
                    value={pejabatInfo.tanggalPerda}
                    onChange={(e) =>
                      setPejabatInfo((p) => ({ ...p, tanggalPerda: e.target.value }))
                    }
                    placeholder="31 Desember 2024"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Kepala Daerah (Nama &amp; Jabatan Sesuai Format Perda)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pejabatInfo.bupatiNama}
                      onChange={(e) =>
                        setPejabatInfo((p) => ({ ...p, bupatiNama: e.target.value }))
                      }
                      placeholder="DOLLY PASARIBU"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    />
                    <input
                      type="text"
                      value={pejabatInfo.bupatiJabatan}
                      onChange={(e) =>
                        setPejabatInfo((p) => ({ ...p, bupatiJabatan: e.target.value }))
                      }
                      placeholder="BUPATI TAPANULI SELATAN"
                      className="w-56 px-3 py-2 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#5E0E14] text-white font-bold cursor-pointer"
                >
                  Simpan Parameter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
