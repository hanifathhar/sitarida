"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import PaginationBar from "@/components/ui/PaginationBar";
import {
  Printer,
  Building2,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  BookOpenText,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  ChevronDown,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2,
  Check,
  Lock,
  X,
} from "lucide-react";

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
  paKpaInfo?: {
    nama: string;
    nip: string;
    jabatan: string;
    pangkat?: string;
    role?: string;
  } | null;
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
  trdrkaId: string;
  kd_skpd: string;
  kd_sub_kegiatan: string;
  kd_rek6: string;
  uraian: string;
  satuan: string;
  satuan_ubah?: string | null;
  volume: number;
  volume_ubah?: number | null;
  harga: number;
  harga_ubah?: number | null;
  total: number;
  total_ubah?: number | null;
}

interface TrskpdRow {
  id: string;
  tahunAnggaran: number;
  opdId: string;
  kd_skpd: string;
  nm_skpd: string;
  kd_program: string;
  nm_program: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  sasaran_kegiatan?: string | null;
  waktu_kegiatan?: string | null;
  capaian_kegiatan?: string | null;
  lokasi_kegiatan?: string | null;
  pptkNama?: string | null;
  pptkNip?: string | null;
  totalAnggaran: number;
  totalAnggaran_ubah: number;
}

interface RkaDpaSkpdViewProps {
  mode: "RKA" | "DPA";
}

interface ItemRekeningRingkasan {
  kode: string;
  uraian: string;
  murni: number;
  ubah: number;
  selisih: number;
  persen: number;
}

interface SubGroupRingkasan {
  murni: number;
  ubah: number;
  selisih: number;
  persen: number;
  items: ItemRekeningRingkasan[];
}

// Data baseline patokan resmi untuk BPKPAD
const BPKPAD_OFFICIAL_BASELINE = {
  pendapatan: {
    pad: {
      murni: 104613341280,
      ubah: 104613341280,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Pajak Daerah", murni: 43904935539, ubah: 43904935539, selisih: 0, persen: 0 },
        { kode: "02", uraian: "Retribusi Daerah", murni: 5300000, ubah: 5300000, selisih: 0, persen: 0 },
        { kode: "03", uraian: "Hasil Pengelolaan Kekayaan Daerah yang Dipisahkan", murni: 58423105741, ubah: 58423105741, selisih: 0, persen: 0 },
        { kode: "04", uraian: "Lain-lain PAD yang Sah", murni: 2280000000, ubah: 2280000000, selisih: 0, persen: 0 },
      ],
    },
    transfer: {
      murni: 1394744041639,
      ubah: 1394744041639,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Pendapatan Transfer Pemerintah Pusat", murni: 1361865181000, ubah: 1361865181000, selisih: 0, persen: 0 },
        { kode: "02", uraian: "Pendapatan Transfer Antar Daerah", murni: 32878860639, ubah: 32878860639, selisih: 0, persen: 0 },
      ],
    },
    lainSah: {
      murni: 37232850910,
      ubah: 37232850910,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Pendapatan Hibah", murni: 20824800000, ubah: 20824800000, selisih: 0, persen: 0 },
        { kode: "03", uraian: "Lain-lain Pendapatan Sesuai dengan Ketentuan Peraturan Perundang-Undangan", murni: 16408050910, ubah: 16408050910, selisih: 0, persen: 0 },
      ],
    },
    murni: 1536590233829,
    ubah: 1536590233829,
    selisih: 0,
    persen: 0,
  },
  belanja: {
    operasi: {
      murni: 48872042609,
      ubah: 48872042609,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Belanja Pegawai", murni: 42206023859, ubah: 42206023859, selisih: 0, persen: 0 },
        { kode: "02", uraian: "Belanja Barang dan Jasa", murni: 6666018750, ubah: 6666018750, selisih: 0, persen: 0 },
      ],
    },
    modal: {
      murni: 464985000,
      ubah: 464985000,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "02", uraian: "Belanja Modal Peralatan dan Mesin", murni: 464985000, ubah: 464985000, selisih: 0, persen: 0 },
      ],
    },
    btt: {
      murni: 5000000000,
      ubah: 5000000000,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Belanja Tidak Terduga", murni: 5000000000, ubah: 5000000000, selisih: 0, persen: 0 },
      ],
    },
    transfer: {
      murni: 265399116462,
      ubah: 265399116462,
      selisih: 0,
      persen: 0,
      items: [
        { kode: "01", uraian: "Belanja Bagi Hasil", murni: 5906113000, ubah: 5906113000, selisih: 0, persen: 0 },
        { kode: "02", uraian: "Belanja Bantuan Keuangan", murni: 259493003462, ubah: 259493003462, selisih: 0, persen: 0 },
      ],
    },
    murni: 319736144071,
    ubah: 319736144071,
    selisih: 0,
    persen: 0,
  },
  pembiayaan: {
    penerimaanMurni: 73320000000,
    penerimaanUbah: 73320000000,
    penerimaanSelisih: 0,
    penerimaanPersen: 0,
    pengeluaranMurni: 10000000000,
    pengeluaranUbah: 10000000000,
    pengeluaranSelisih: 0,
    pengeluaranPersen: 0,
    nettoMurni: 63320000000,
    nettoUbah: 63320000000,
    nettoSelisih: 0,
    nettoPersen: 0,
  },
};

export default function RkaDpaSkpdView({ mode }: RkaDpaSkpdViewProps) {
  const [loading, setLoading] = useState(true);
  const [tahunLogin, setTahunLogin] = useState<number>(2026);
  const [opds, setOpds] = useState<OpdItem[]>([]);
  const [selectedOpdId, setSelectedOpdId] = useState<string>("");
  const [drkaRows, setDrkaRows] = useState<DrkaRow[]>([]);
  const [dpoRows, setDpoRows] = useState<DpoRow[]>([]);
  const [trskpdRows, setTrskpdRows] = useState<TrskpdRow[]>([]);
  const [pejabat, setPejabat] = useState<any>(null);
  const [isCrossOpd, setIsCrossOpd] = useState(true);

  // Searchable Picker OPD
  const [opdPickerOpen, setOpdPickerOpen] = useState(false);
  const [opdSearchQuery, setOpdSearchQuery] = useState("");
  const opdPickerRef = useRef<HTMLDivElement>(null);

  // Navigasi Tampilan Dokumen
  const [activeTab, setActiveTab] = useState<"RINGKASAN" | "SUB_KEGIATAN">("RINGKASAN");
  const [tahapAnggaran, setTahapAnggaran] = useState<"MURNI" | "PERUBAHAN">("MURNI");
  const [searchSubKegiatan, setSearchSubKegiatan] = useState("");

  // Pagination Sub Kegiatan
  const [pageSubKegiatan, setPageSubKegiatan] = useState(1);
  const [limitSubKegiatan, setLimitSubKegiatan] = useState(10);

  // Reset page saat filter/pencarian atau OPD berganti
  useEffect(() => {
    setPageSubKegiatan(1);
  }, [searchSubKegiatan, selectedOpdId]);

  // Modal Cetak & Pratinjau (Sesuai Gaya Cetak SPD)
  const [reportModal, setReportModal] = useState<{
    type: "RINGKASAN" | "SUB_KEGIATAN";
    tahap: "MURNI" | "PERUBAHAN";
    subKegiatanKey?: string;
  } | null>(null);

  const [showReportFormConfig, setShowReportFormConfig] = useState(false);
  const [budInfo, setBudInfo] = useState<{
    nama: string;
    nip: string;
    jabatan: string;
    pangkat?: string;
    role?: string;
  } | null>(null);

  // Parameter Cetak: Hanya Tempat dan Tanggal saja
  const [reportForm, setReportForm] = useState({
    tempatTtd: "Sipirok",
    tanggalTtd: "31 Desember 2025",
  });

  const [dropdownCetakOpen, setDropdownCetakOpen] = useState(false);
  const reportIframeRef = useRef<HTMLIFrameElement>(null);

  // Close Picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        opdPickerRef.current &&
        !opdPickerRef.current.contains(event.target as Node)
      ) {
        setOpdPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ambil data anggaran sesuai tahun login
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/perencanaan/dokumen-anggaran`);
      const json = await res.json();
      if (json.success && json.data) {
        const t = json.data.tahun || 2026;
        setTahunLogin(t);
        setOpds(json.data.opds || []);
        setDrkaRows(json.data.drkaRows || []);
        setDpoRows(json.data.dpoRows || []);
        setTrskpdRows(json.data.trskpdRows || []);
        setPejabat(json.data.pejabatInfo || null);
        setBudInfo(json.data.budInfo || null);
        setIsCrossOpd(json.data.session?.isCrossOpd ?? true);

        // Inisialisasi OPD terpilih
        if (!selectedOpdId && json.data.opds && json.data.opds.length > 0) {
          const defaultOpd =
            json.data.opds.find((o: OpdItem) => o.id === json.data.session?.userOpdId) ||
            json.data.opds.find(
              (o: OpdItem) =>
                o.kd_skpd.startsWith("5.02") ||
                o.nm_skpd.toLowerCase().includes("keuangan") ||
                o.nm_skpd.toLowerCase().includes("bpkpad")
            ) ||
            json.data.opds[0];
          setSelectedOpdId(defaultOpd.id);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data anggaran:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedOpd = useMemo(() => {
    return opds.find((o) => o.id === selectedOpdId) || opds[0] || null;
  }, [opds, selectedOpdId]);

  // Filter daftar OPD berdasarkan pencarian
  const filteredOpds = useMemo(() => {
    if (!opdSearchQuery.trim()) return opds;
    const q = opdSearchQuery.toLowerCase();
    return opds.filter(
      (o) =>
        o.kd_skpd.toLowerCase().includes(q) ||
        o.nm_skpd.toLowerCase().includes(q) ||
        (o.singkatan && o.singkatan.toLowerCase().includes(q))
    );
  }, [opds, opdSearchQuery]);

  // Sinkronkan parameter tanggal saat tahun anggaran login didapat
  useEffect(() => {
    setReportForm((prev) => ({
      ...prev,
      tempatTtd: "Sipirok",
      tanggalTtd: `31 Desember ${tahunLogin - 1}`,
    }));
  }, [tahunLogin]);

  // Penandatangan Dokumen Otomatis:
  // - RKA: User OPD dengan Role PA/KPA masing-masing SKPD
  // - DPA: User dengan Role BUD (Pejabat Pengelola Keuangan Daerah Selaku Bendahara Umum Daerah)
  const penandatanganAktif = useMemo(() => {
    if (mode === "DPA") {
      const nama = budInfo?.nama || pejabat?.kepalaBpkpadNama || "M. FRANANDA, S.E, M.M";
      const nip = budInfo?.nip || pejabat?.kepalaBpkpadNip || "19800723 200312 1 002";
      const pangkat = budInfo?.pangkat || pejabat?.kepalaBpkpadPangkat || "PEMBINA UTAMA MUDA";
      return {
        nama,
        nip,
        pangkat,
        jabatan: "PEJABAT PENGELOLA KEUANGAN DAERAH SELAKU BENDAHARA UMUM DAERAH",
        role: "BUD",
        labelJabatan: "PEJABAT PENGELOLA KEUANGAN DAERAH SELAKU BENDAHARA UMUM DAERAH",
        keterangan: "Role BUD (PPKD Selaku Bendahara Umum Daerah)",
      };
    } else {
      // Mode RKA: User OPD role PA/KPA masing-masing
      const pa = selectedOpd?.paKpaInfo;
      const nama =
        pa?.nama ||
        (selectedOpd?.kepalaNama && selectedOpd.kepalaNama !== "-"
          ? selectedOpd.kepalaNama
          : `Kepala ${selectedOpd?.nm_skpd || "SKPD"}`);
      const nip =
        pa?.nip && pa.nip !== "-"
          ? pa.nip
          : (selectedOpd?.kepalaNip && selectedOpd.kepalaNip !== "-"
            ? selectedOpd.kepalaNip
            : "-");
      const jabatan =
        pa?.jabatan ||
        selectedOpd?.kepalaJabatan ||
        `Pengguna Anggaran`;
      return {
        nama,
        nip,
        pangkat: pa?.pangkat || "",
        jabatan,
        role: "PA/KPA",
        labelJabatan: "Pengguna Anggaran / Kuasa Pengguna Anggaran",
        keterangan: `Role PA/KPA (${selectedOpd?.nm_skpd || "SKPD"})`,
      };
    }
  }, [mode, selectedOpd, budInfo, pejabat]);

  const isBpkpad = useMemo(() => {
    if (!selectedOpd) return false;
    return (
      selectedOpd.kd_skpd.startsWith("5.02") ||
      selectedOpd.nm_skpd.toLowerCase().includes("keuangan") ||
      selectedOpd.nm_skpd.toLowerCase().includes("bpkpad")
    );
  }, [selectedOpd]);

  // Format Angka Rupiah
  const formatRupiah = (val: number, allowParens = true) => {
    if (val === 0) return "Rp. 0";
    if (val < 0 && allowParens) {
      return `(Rp. ${Math.abs(val).toLocaleString("id-ID")})`;
    }
    return `Rp. ${val.toLocaleString("id-ID")}`;
  };

  const formatSelisihRupiah = (val: number) => {
    if (val === 0) return "Rp. 0";
    if (val < 0) return `(Rp. ${Math.abs(val).toLocaleString("id-ID")})`;
    return `Rp. ${val.toLocaleString("id-ID")}`;
  };

  const formatPersen = (val: number) => {
    if (isNaN(val) || !isFinite(val) || val === 0) return "0,00%";
    return `${val.toFixed(2).replace(".", ",")}%`;
  };

  // Kalkulasi data Ringkasan (Akun 4, 5, 6) memuat Murni & Perubahan
  const ringkasanData = useMemo(() => {
    if (!selectedOpd) return null;

    const filteredRows = drkaRows.filter((r) => r.kd_skpd === selectedOpd.kd_skpd);

    const mapJenis: Record<string, { totalMurni: number; totalUbah: number; uraian: string }> = {};

    filteredRows.forEach((r) => {
      const parts = (r.kd_rek6 || "").split(".");
      if (parts.length >= 3) {
        const key = `${parts[0]}.${parts[1]}.${parts[2]}`;
        const valMurni = Number(r.nilai) || 0;
        const valUbah =
          r.nilai_ubah !== null && r.nilai_ubah !== undefined
            ? Number(r.nilai_ubah)
            : valMurni;
        if (!mapJenis[key]) {
          mapJenis[key] = { totalMurni: 0, totalUbah: 0, uraian: r.nm_rek6 || "" };
        }
        mapJenis[key].totalMurni += valMurni;
        mapJenis[key].totalUbah += valUbah;
      }
    });

    const hasDbExpenses = Object.keys(mapJenis).some((k) => k.startsWith("5."));

    // Fallback baseline dokumen resmi jika BPKPAD dan belum ada entri di DB
    if (isBpkpad && (!hasDbExpenses || tahunLogin === 2025)) {
      const p = BPKPAD_OFFICIAL_BASELINE.pendapatan;
      const b = BPKPAD_OFFICIAL_BASELINE.belanja;
      const pem = BPKPAD_OFFICIAL_BASELINE.pembiayaan;
      const surplusMurni = p.murni - b.murni;
      const surplusUbah = p.ubah - b.ubah;
      return {
        isBaseline: true,
        pendapatan: p,
        belanja: b,
        pembiayaan: pem,
        surplusDefisitMurni: surplusMurni,
        surplusDefisitUbah: surplusUbah,
        surplusDefisitSelisih: surplusUbah - surplusMurni,
        surplusDefisitPersen: surplusMurni !== 0 ? ((surplusUbah - surplusMurni) / Math.abs(surplusMurni)) * 100 : 0,
      };
    }

    const standardRekNames: Record<string, string> = {
      "4.1.01": "Pajak Daerah",
      "4.1.02": "Retribusi Daerah",
      "4.1.03": "Hasil Pengelolaan Kekayaan Daerah yang Dipisahkan",
      "4.1.04": "Lain-lain PAD yang Sah",
      "4.2.01": "Pendapatan Transfer Pemerintah Pusat",
      "4.2.02": "Pendapatan Transfer Antar Daerah",
      "4.3.01": "Pendapatan Hibah",
      "4.3.03": "Lain-lain Pendapatan Sesuai dengan Ketentuan Peraturan Perundang-Undangan",
      "5.1.01": "Belanja Pegawai",
      "5.1.02": "Belanja Barang dan Jasa",
      "5.1.03": "Belanja Bunga",
      "5.1.04": "Belanja Subsidi",
      "5.1.05": "Belanja Hibah",
      "5.1.06": "Belanja Bantuan Sosial",
      "5.2.01": "Belanja Modal Tanah",
      "5.2.02": "Belanja Modal Peralatan dan Mesin",
      "5.2.03": "Belanja Modal Gedung dan Bangunan",
      "5.2.04": "Belanja Modal Jalan, Jaringan, dan Irigasi",
      "5.2.05": "Belanja Modal Aset Tetap Lainnya",
      "5.3.01": "Belanja Tidak Terduga",
      "5.4.01": "Belanja Bagi Hasil",
      "5.4.02": "Belanja Bantuan Keuangan",
    };

    const padItems: ItemRekeningRingkasan[] = [];
    let padMurni = 0, padUbah = 0;
    const transferItems: ItemRekeningRingkasan[] = [];
    let transferMurni = 0, transferUbah = 0;
    const lainSahItems: ItemRekeningRingkasan[] = [];
    let lainSahMurni = 0, lainSahUbah = 0;

    Object.keys(mapJenis).forEach((key) => {
      const parts = key.split(".");
      const sub = parts[2] || "01";
      const murni = mapJenis[key].totalMurni;
      const ubah = mapJenis[key].totalUbah;
      const selisih = ubah - murni;
      const persen = murni > 0 ? (selisih / murni) * 100 : 0;
      const uraian = standardRekNames[key] || mapJenis[key].uraian;

      const item: ItemRekeningRingkasan = { kode: sub, uraian, murni, ubah, selisih, persen };

      if (key.startsWith("4.1.")) {
        padItems.push(item);
        padMurni += murni;
        padUbah += ubah;
      } else if (key.startsWith("4.2.")) {
        transferItems.push(item);
        transferMurni += murni;
        transferUbah += ubah;
      } else if (key.startsWith("4.3.")) {
        lainSahItems.push(item);
        lainSahMurni += murni;
        lainSahUbah += ubah;
      }
    });

    const operasiItems: ItemRekeningRingkasan[] = [];
    let operasiMurni = 0, operasiUbah = 0;
    const modalItems: ItemRekeningRingkasan[] = [];
    let modalMurni = 0, modalUbah = 0;
    const bttItems: ItemRekeningRingkasan[] = [];
    let bttMurni = 0, bttUbah = 0;
    const belanjaTransferItems: ItemRekeningRingkasan[] = [];
    let belanjaTransferMurni = 0, belanjaTransferUbah = 0;

    Object.keys(mapJenis).forEach((key) => {
      const parts = key.split(".");
      const sub = parts[2] || "01";
      const murni = mapJenis[key].totalMurni;
      const ubah = mapJenis[key].totalUbah;
      const selisih = ubah - murni;
      const persen = murni > 0 ? (selisih / murni) * 100 : 0;
      const uraian = standardRekNames[key] || mapJenis[key].uraian;

      const item: ItemRekeningRingkasan = { kode: sub, uraian, murni, ubah, selisih, persen };

      if (key.startsWith("5.1.")) {
        operasiItems.push(item);
        operasiMurni += murni;
        operasiUbah += ubah;
      } else if (key.startsWith("5.2.")) {
        modalItems.push(item);
        modalMurni += murni;
        modalUbah += ubah;
      } else if (key.startsWith("5.3.")) {
        bttItems.push(item);
        bttMurni += murni;
        bttUbah += ubah;
      } else if (key.startsWith("5.4.")) {
        belanjaTransferItems.push(item);
        belanjaTransferMurni += murni;
        belanjaTransferUbah += ubah;
      }
    });

    const totalPendapatanMurni = padMurni + transferMurni + lainSahMurni;
    const totalPendapatanUbah = padUbah + transferUbah + lainSahUbah;
    const totalBelanjaMurni = operasiMurni + modalMurni + bttMurni + belanjaTransferMurni;
    const totalBelanjaUbah = operasiUbah + modalUbah + bttUbah + belanjaTransferUbah;

    const surplusDefisitMurni = totalPendapatanMurni - totalBelanjaMurni;
    const surplusDefisitUbah = totalPendapatanUbah - totalBelanjaUbah;
    const surplusDefisitSelisih = surplusDefisitUbah - surplusDefisitMurni;
    const surplusDefisitPersen = surplusDefisitMurni !== 0 ? (surplusDefisitSelisih / Math.abs(surplusDefisitMurni)) * 100 : 0;

    return {
      isBaseline: false,
      pendapatan: {
        pad: {
          murni: padMurni,
          ubah: padUbah,
          selisih: padUbah - padMurni,
          persen: padMurni > 0 ? ((padUbah - padMurni) / padMurni) * 100 : 0,
          items: padItems,
        },
        transfer: {
          murni: transferMurni,
          ubah: transferUbah,
          selisih: transferUbah - transferMurni,
          persen: transferMurni > 0 ? ((transferUbah - transferMurni) / transferMurni) * 100 : 0,
          items: transferItems,
        },
        lainSah: {
          murni: lainSahMurni,
          ubah: lainSahUbah,
          selisih: lainSahUbah - lainSahMurni,
          persen: lainSahMurni > 0 ? ((lainSahUbah - lainSahMurni) / lainSahMurni) * 100 : 0,
          items: lainSahItems,
        },
        murni: totalPendapatanMurni,
        ubah: totalPendapatanUbah,
        selisih: totalPendapatanUbah - totalPendapatanMurni,
        persen: totalPendapatanMurni > 0 ? ((totalPendapatanUbah - totalPendapatanMurni) / totalPendapatanMurni) * 100 : 0,
      },
      belanja: {
        operasi: {
          murni: operasiMurni,
          ubah: operasiUbah,
          selisih: operasiUbah - operasiMurni,
          persen: operasiMurni > 0 ? ((operasiUbah - operasiMurni) / operasiMurni) * 100 : 0,
          items: operasiItems,
        },
        modal: {
          murni: modalMurni,
          ubah: modalUbah,
          selisih: modalUbah - modalMurni,
          persen: modalMurni > 0 ? ((modalUbah - modalMurni) / modalMurni) * 100 : 0,
          items: modalItems,
        },
        btt: {
          murni: bttMurni,
          ubah: bttUbah,
          selisih: bttUbah - bttMurni,
          persen: bttMurni > 0 ? ((bttUbah - bttMurni) / bttMurni) * 100 : 0,
          items: bttItems,
        },
        transfer: {
          murni: belanjaTransferMurni,
          ubah: belanjaTransferUbah,
          selisih: belanjaTransferUbah - belanjaTransferMurni,
          persen: belanjaTransferMurni > 0 ? ((belanjaTransferUbah - belanjaTransferMurni) / belanjaTransferMurni) * 100 : 0,
          items: belanjaTransferItems,
        },
        murni: totalBelanjaMurni,
        ubah: totalBelanjaUbah,
        selisih: totalBelanjaUbah - totalBelanjaMurni,
        persen: totalBelanjaMurni > 0 ? ((totalBelanjaUbah - totalBelanjaMurni) / totalBelanjaMurni) * 100 : 0,
      },
      pembiayaan: {
        penerimaanMurni: 0,
        penerimaanUbah: 0,
        penerimaanSelisih: 0,
        penerimaanPersen: 0,
        pengeluaranMurni: 0,
        pengeluaranUbah: 0,
        pengeluaranSelisih: 0,
        pengeluaranPersen: 0,
        nettoMurni: 0,
        nettoUbah: 0,
        nettoSelisih: 0,
        nettoPersen: 0,
      },
      surplusDefisitMurni,
      surplusDefisitUbah,
      surplusDefisitSelisih,
      surplusDefisitPersen,
    };
  }, [selectedOpd, drkaRows, isBpkpad, tahunLogin]);

  // Daftar Sub Kegiatan SKPD Terpilih
  const subKegiatanList = useMemo(() => {
    if (!selectedOpd) return [];

    const map = new Map<
      string,
      {
        kd_sub_kegiatan: string;
        nm_sub_kegiatan: string;
        kd_program: string;
        nm_program: string;
        kd_kegiatan: string;
        nm_kegiatan: string;
        totalMurni: number;
        totalUbah: number;
        trskpd?: TrskpdRow;
        rekeningCount: number;
      }
    >();

    drkaRows
      .filter((r) => r.kd_skpd === selectedOpd.kd_skpd)
      .forEach((r) => {
        const key = r.kd_sub_kegiatan;
        const current = map.get(key) || {
          kd_sub_kegiatan: r.kd_sub_kegiatan,
          nm_sub_kegiatan: r.nm_sub_kegiatan,
          kd_program: r.kd_program,
          nm_program: r.nm_program,
          kd_kegiatan: r.kd_kegiatan,
          nm_kegiatan: r.nm_kegiatan,
          totalMurni: 0,
          totalUbah: 0,
          rekeningCount: 0,
        };
        current.totalMurni += Number(r.nilai) || 0;
        current.totalUbah +=
          r.nilai_ubah !== null && r.nilai_ubah !== undefined
            ? Number(r.nilai_ubah)
            : Number(r.nilai) || 0;
        current.rekeningCount += 1;
        map.set(key, current);
      });

    trskpdRows
      .filter((t) => t.kd_skpd === selectedOpd.kd_skpd)
      .forEach((t) => {
        const item = map.get(t.kd_sub_kegiatan);
        if (item) {
          item.trskpd = t;
        } else {
          map.set(t.kd_sub_kegiatan, {
            kd_sub_kegiatan: t.kd_sub_kegiatan,
            nm_sub_kegiatan: t.nm_sub_kegiatan,
            kd_program: t.kd_program,
            nm_program: t.nm_program,
            kd_kegiatan: t.kd_kegiatan,
            nm_kegiatan: t.nm_kegiatan,
            totalMurni: Number(t.totalAnggaran) || 0,
            totalUbah: Number(t.totalAnggaran_ubah) || Number(t.totalAnggaran) || 0,
            trskpd: t,
            rekeningCount: 0,
          });
        }
      });

    const list = Array.from(map.values());
    if (!searchSubKegiatan) return list;
    const q = searchSubKegiatan.toLowerCase();
    return list.filter(
      (s) =>
        s.kd_sub_kegiatan.toLowerCase().includes(q) ||
        s.nm_sub_kegiatan.toLowerCase().includes(q) ||
        s.nm_kegiatan.toLowerCase().includes(q) ||
        s.nm_program.toLowerCase().includes(q)
    );
  }, [selectedOpd, drkaRows, trskpdRows, searchSubKegiatan]);

  // Pagination Data Sub Kegiatan
  const totalSubKegiatan = subKegiatanList.length;
  const totalPagesSubKegiatan = Math.max(1, Math.ceil(totalSubKegiatan / limitSubKegiatan));
  const paginatedSubKegiatanList = useMemo(() => {
    const start = (pageSubKegiatan - 1) * limitSubKegiatan;
    return subKegiatanList.slice(start, start + limitSubKegiatan);
  }, [subKegiatanList, pageSubKegiatan, limitSubKegiatan]);

  // Generator HTML Ringkasan SKPD (A4 Portrait atau Landscape saat Perubahan)
  const generateRingkasanHtml = () => {
    if (!selectedOpd || !ringkasanData) return "";
    const isUbah = tahapAnggaran === "PERUBAHAN";
    const docJudul =
      mode === "RKA"
        ? isUbah ? "RENCANA KERJA DAN ANGGARAN PERUBAHAN" : "RENCANA KERJA DAN ANGGARAN"
        : isUbah ? "DOKUMEN PELAKSANAAN ANGGARAN PERUBAHAN" : "DOKUMEN PELAKSANAAN ANGGARAN";
    const formulirKode =
      mode === "RKA"
        ? isUbah ? "RKA-SKPD PERUBAHAN" : "RKA SKPD"
        : isUbah ? "DPA-SKPD PERUBAHAN" : "DPA SKPD";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formulirKode} - ${selectedOpd.nm_skpd}</title>
  <style>
    @page { size: A4 ${isUbah ? "landscape" : "portrait"}; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${isUbah ? "10px" : "11px"}; color: #000; margin: 0; padding: 12px; }
    .box-header { border: 1.5px solid #000; display: flex; text-align: center; }
    .box-header-left { flex: 1; padding: 6px 12px; border-right: 1.5px solid #000; }
    .box-header-left .t1 { font-weight: bold; font-size: 13px; text-transform: uppercase; line-height: 1.2; }
    .box-header-left .line { border-top: 1px solid #000; margin: 5px 0; }
    .box-header-left .t2 { font-size: 11px; }
    .box-header-right { width: 170px; display: flex; flex-direction: column; justify-content: center; font-weight: bold; font-size: 12px; }
    .org-row { margin: 8px 0; font-size: 11px; display: flex; }
    .org-label { width: 90px; }
    .box-title { border: 1.5px solid #000; padding: 5px; text-align: center; font-weight: bold; font-size: 12px; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: ${isUbah ? "10px" : "11px"}; }
    th { border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; background: #fafafa; }
    td { border: 1px solid #000; padding: 3.5px 5px; vertical-align: top; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .ttd-box { border: 1.5px solid #000; border-top: none; display: flex; min-height: 125px; font-size: 10.5px; }
    .ttd-left { flex: 1; border-right: 1.5px solid #000; padding: 8px; }
    .ttd-right { width: 320px; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
  </style>
</head>
<body>
  <div class="box-header">
    <div class="box-header-left">
      <div class="t1">${docJudul}</div>
      <div class="t1">SATUAN KERJA PERANGKAT DAERAH</div>
      <div class="line"></div>
      <div class="t2">Pemerintahan Kab. Tapanuli Selatan Tahun Anggaran ${tahunLogin} ${isUbah ? "(Tahap Perubahan)" : "(Tahap Penyusunan/Murni)"
      }</div>
    </div>
    <div class="box-header-right">
      <div>Formulir</div>
      <div>${formulirKode}</div>
    </div>
  </div>

  <div class="org-row">
    <div class="org-label">Organisasi</div>
    <div style="width: 15px;">:</div>
    <div style="font-weight: bold;">${selectedOpd.kd_skpd} ${selectedOpd.nm_skpd}</div>
  </div>

  <div class="box-title">
    <div>Ringkasan Anggaran Pendapatan dan Belanja ${isUbah ? "Perubahan" : ""}</div>
    <div>Satuan Kerja Perangkat Daerah</div>
  </div>

  <table>
    <thead>
      ${!isUbah
        ? `
      <tr>
        <th colspan="3" style="width: 75px;">Kode Rekening</th>
        <th>Uraian</th>
        <th style="width: 180px;">Jumlah (Rp)</th>
      </tr>`
        : `
      <tr>
        <th colspan="3" rowspan="2" style="width: 75px;">Kode Rekening</th>
        <th rowspan="2">Uraian</th>
        <th rowspan="2" style="width: 140px;">Sebelum Perubahan (Rp)</th>
        <th rowspan="2" style="width: 140px;">Setelah Perubahan (Rp)</th>
        <th colspan="2" style="width: 150px;">Bertambah / (Berkurang)</th>
      </tr>
      <tr>
        <th style="width: 105px;">(Rp)</th>
        <th style="width: 45px;">(%)</th>
      </tr>`
      }
    </thead>
    <tbody>
      <!-- PENDAPATAN -->
      <tr class="bold">
        <td class="text-center" style="width: 25px;">4</td>
        <td class="text-center" style="width: 25px;"></td>
        <td class="text-center" style="width: 25px;"></td>
        <td>PENDAPATAN DAERAH</td>
        ${!isUbah ? `<td class="text-right"></td>` : `<td colspan="4"></td>`}
      </tr>
      <tr class="bold">
        <td class="text-center">4</td>
        <td class="text-center">1</td>
        <td class="text-center"></td>
        <td>PENDAPATAN ASLI DAERAH (PAD)</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pendapatan.pad.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.pad.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.pad.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pendapatan.pad.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pendapatan.pad.persen)}</td>`
      }
      </tr>
      ${ringkasanData.pendapatan.pad.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">4</td>
          <td class="text-center">1</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td class="text-center">4</td>
        <td class="text-center">2</td>
        <td class="text-center"></td>
        <td>PENDAPATAN TRANSFER</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pendapatan.transfer.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.transfer.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.transfer.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pendapatan.transfer.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pendapatan.transfer.persen)}</td>`
      }
      </tr>
      ${ringkasanData.pendapatan.transfer.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">4</td>
          <td class="text-center">2</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td class="text-center">4</td>
        <td class="text-center">3</td>
        <td class="text-center"></td>
        <td>LAIN-LAIN PENDAPATAN DAERAH YANG SAH</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pendapatan.lainSah.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.lainSah.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.lainSah.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pendapatan.lainSah.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pendapatan.lainSah.persen)}</td>`
      }
      </tr>
      ${ringkasanData.pendapatan.lainSah.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">4</td>
          <td class="text-center">3</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td colspan="4" class="text-right">Jumlah Pendapatan</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pendapatan.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pendapatan.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pendapatan.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pendapatan.persen)}</td>`
      }
      </tr>

      <!-- BELANJA -->
      <tr class="bold">
        <td class="text-center">5</td>
        <td class="text-center"></td>
        <td class="text-center"></td>
        <td>BELANJA DAERAH</td>
        ${!isUbah ? `<td class="text-right"></td>` : `<td colspan="4"></td>`}
      </tr>
      <tr class="bold">
        <td class="text-center">5</td>
        <td class="text-center">1</td>
        <td class="text-center"></td>
        <td>BELANJA OPERASI</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.belanja.operasi.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.belanja.operasi.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.belanja.operasi.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.belanja.operasi.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.belanja.operasi.persen)}</td>`
      }
      </tr>
      ${ringkasanData.belanja.operasi.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">5</td>
          <td class="text-center">1</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td class="text-center">5</td>
        <td class="text-center">2</td>
        <td class="text-center"></td>
        <td>BELANJA MODAL</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.belanja.modal.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.belanja.modal.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.belanja.modal.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.belanja.modal.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.belanja.modal.persen)}</td>`
      }
      </tr>
      ${ringkasanData.belanja.modal.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">5</td>
          <td class="text-center">2</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td class="text-center">5</td>
        <td class="text-center">3</td>
        <td class="text-center"></td>
        <td>BELANJA TIDAK TERDUGA</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.belanja.btt.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.belanja.btt.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.belanja.btt.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.belanja.btt.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.belanja.btt.persen)}</td>`
      }
      </tr>
      ${ringkasanData.belanja.btt.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">5</td>
          <td class="text-center">3</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td class="text-center">5</td>
        <td class="text-center">4</td>
        <td class="text-center"></td>
        <td>BELANJA TRANSFER</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.belanja.transfer.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.belanja.transfer.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.belanja.transfer.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.belanja.transfer.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.belanja.transfer.persen)}</td>`
      }
      </tr>
      ${ringkasanData.belanja.transfer.items
        .map(
          (it) => `
        <tr>
          <td class="text-center">5</td>
          <td class="text-center">4</td>
          <td class="text-center">${it.kode}</td>
          <td>${it.uraian}</td>
          ${!isUbah
              ? `<td class="text-right">${formatRupiah(it.murni)}</td>`
              : `
          <td class="text-right">${formatRupiah(it.murni)}</td>
          <td class="text-right">${formatRupiah(it.ubah)}</td>
          <td class="text-right">${formatSelisihRupiah(it.selisih)}</td>
          <td class="text-center">${formatPersen(it.persen)}</td>`
            }
        </tr>`
        )
        .join("")}

      <tr class="bold">
        <td colspan="4" class="text-right">Jumlah Belanja</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.belanja.murni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.belanja.murni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.belanja.ubah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.belanja.selisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.belanja.persen)}</td>`
      }
      </tr>
      <tr class="bold">
        <td colspan="4" class="text-right">Total Surplus / (Defisit)</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.surplusDefisitMurni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.surplusDefisitMurni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.surplusDefisitUbah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.surplusDefisitSelisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.surplusDefisitPersen)}</td>`
      }
      </tr>

      <!-- PEMBIAYAAN -->
      <tr class="bold">
        <td class="text-center">6</td>
        <td class="text-center"></td>
        <td class="text-center"></td>
        <td>PEMBIAYAAN</td>
        ${!isUbah ? `<td class="text-right"></td>` : `<td colspan="4"></td>`}
      </tr>
      <tr class="bold">
        <td colspan="4" class="text-right">Jumlah Penerimaan Pembiayaan</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pembiayaan.penerimaanMurni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.penerimaanMurni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.penerimaanUbah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pembiayaan.penerimaanSelisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pembiayaan.penerimaanPersen)}</td>`
      }
      </tr>
      <tr class="bold">
        <td colspan="4" class="text-right">Jumlah Pengeluaran Pembiayaan</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pembiayaan.pengeluaranMurni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.pengeluaranMurni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.pengeluaranUbah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pembiayaan.pengeluaranSelisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pembiayaan.pengeluaranPersen)}</td>`
      }
      </tr>
      <tr class="bold">
        <td colspan="4" class="text-right">Pembiayaan Netto :</td>
        ${!isUbah
        ? `<td class="text-right">${formatRupiah(ringkasanData.pembiayaan.nettoMurni)}</td>`
        : `
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.nettoMurni)}</td>
        <td class="text-right">${formatRupiah(ringkasanData.pembiayaan.nettoUbah)}</td>
        <td class="text-right">${formatSelisihRupiah(ringkasanData.pembiayaan.nettoSelisih)}</td>
        <td class="text-center">${formatPersen(ringkasanData.pembiayaan.nettoPersen)}</td>`
      }
      </tr>
    </tbody>
  </table>

  <div class="ttd-box">
    <div class="ttd-left"></div>
    <div class="ttd-right">
      ${mode === "RKA"
        ? `
      <div>
        <div>Kab. Tapanuli Selatan, ${reportForm.tanggalTtd}</div>
        <div style="margin-top: 3px;">Pengguna Anggaran / Kuasa Pengguna Anggaran</div>
        <div style="margin-top: 1px; font-weight: bold; font-size: 8.5pt;">${selectedOpd.nm_skpd}</div>
      </div>
      <div style="margin-top: 45px;">
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${penandatanganAktif.nama}</div>
        <div style="margin-top: 3px;">NIP. ${penandatanganAktif.nip}</div>
      </div>`
        : `
      <div>
        <div>Ditetapkan di ${reportForm.tempatTtd}</div>
        <div>pada tanggal ${reportForm.tanggalTtd}</div>
        <div style="margin-top: 4px; font-weight: bold;">
          PEJABAT PENGELOLA KEUANGAN DAERAH<br/>SELAKU BENDAHARA UMUM DAERAH
        </div>
      </div>
      <div style="margin-top: 45px;">
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${penandatanganAktif.nama}</div>
        <div style="margin-top: 2px;">${penandatanganAktif.pangkat || "PEMBINA UTAMA MUDA"}</div>
        <div style="margin-top: 2px;">NIP. ${penandatanganAktif.nip}</div>
      </div>`
      }
    </div>
  </div>
</body>
</html>`;
  };

  // Generator HTML RKA Belanja Sub Kegiatan (A4 Landscape / Portrait)
  const generateSubKegiatanHtml = (subKegiatanKey?: string) => {
    if (!selectedOpd) return "";

    const targetSub =
      subKegiatanList.find((s) => s.kd_sub_kegiatan === subKegiatanKey) ||
      subKegiatanList[0];

    if (!targetSub) {
      return `<div>Sub kegiatan tidak ditemukan.</div>`;
    }

    const rekRows = drkaRows.filter(
      (r) =>
        r.kd_skpd === selectedOpd.kd_skpd &&
        r.kd_sub_kegiatan === targetSub.kd_sub_kegiatan
    );

    const dpos = dpoRows.filter(
      (d) =>
        d.kd_skpd === selectedOpd.kd_skpd &&
        d.kd_sub_kegiatan === targetSub.kd_sub_kegiatan
    );

    const isPerubahan = tahapAnggaran === "PERUBAHAN";
    const formulirKode =
      mode === "RKA"
        ? isPerubahan ? "RKA-SKPD 2.2 PERUBAHAN" : "RKA-SKPD 2.2"
        : isPerubahan ? "DPA-SKPD 2.2 PERUBAHAN" : "DPA-SKPD 2.2";

    const docJudul =
      mode === "RKA"
        ? "RENCANA KERJA DAN ANGGARAN"
        : "DOKUMEN PELAKSANAAN ANGGARAN";

    const totalSebelum = rekRows.reduce((acc, r) => acc + (Number(r.nilai) || 0), 0);
    const totalSetelah = rekRows.reduce(
      (acc, r) =>
        acc +
        (r.nilai_ubah !== null && r.nilai_ubah !== undefined
          ? Number(r.nilai_ubah)
          : Number(r.nilai) || 0),
      0
    );
    const selisihRp = totalSetelah - totalSebelum;
    const selisihPersen = totalSebelum > 0 ? (selisihRp / totalSebelum) * 100 : 0;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formulirKode} - ${targetSub.kd_sub_kegiatan}</title>
  <style>
    @page { size: A4 ${isPerubahan ? "landscape" : "portrait"}; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 12px; }
    .box-header { border: 1.5px solid #000; display: flex; text-align: center; }
    .box-header-left { flex: 1; padding: 6px 10px; border-right: 1.5px solid #000; }
    .box-header-left .t1 { font-weight: bold; font-size: 12px; text-transform: uppercase; line-height: 1.2; }
    .box-header-left .line { border-top: 1px solid #000; margin: 5px 0; }
    .box-header-left .t2 { font-size: 10px; }
    .box-header-right { width: 170px; display: flex; flex-direction: column; justify-content: center; font-weight: bold; font-size: 11px; }
    .meta-table { width: 100%; border: 1.5px solid #000; border-top: none; font-size: 10px; border-collapse: collapse; }
    .meta-table td { padding: 3px 6px; border: 1px solid #000; vertical-align: top; }
    .meta-title { font-weight: bold; background: #f0f0f0; }
    .content-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-top: none; font-size: 10px; }
    .content-table th { border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; background: #fafafa; }
    .content-table td { border: 1px solid #000; padding: 3.5px 5px; vertical-align: top; }
    .bold { font-weight: bold; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .ttd-box { border: 1.5px solid #000; border-top: none; display: flex; min-height: 125px; font-size: 10px; }
    .ttd-left { flex: 1; border-right: 1.5px solid #000; padding: 8px; }
    .ttd-right { width: 300px; padding: 8px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; }
  </style>
</head>
<body>
  <div class="box-header">
    <div class="box-header-left">
      <div class="t1">${docJudul} SATUAN KERJA PERANGKAT DAERAH</div>
      <div class="line"></div>
      <div class="t2">Pemerintahan Kab. Tapanuli Selatan Tahun Anggaran ${tahunLogin} ${isPerubahan ? "" : ""
      }</div>
    </div>
    <div class="box-header-right">
      <div>Formulir</div>
      <div>${formulirKode}</div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <td style="width: 130px;">Urusan Pemerintahan</td>
      <td style="width: 15px;" class="text-center">:</td>
      <td style="width: 160px; font-weight: bold;">${selectedOpd.kd_urusan || "X.XX"}</td>
      <td colspan="2">${selectedOpd.nm_urusan || "URUSAN PEMERINTAHAN DAERAH"}</td>
    </tr>
    <tr>
      <td>Organisasi</td>
      <td class="text-center">:</td>
      <td style="font-weight: bold;">${selectedOpd.kd_skpd}</td>
      <td colspan="2" style="font-weight: bold;">${selectedOpd.nm_skpd}</td>
    </tr>
    <tr>
      <td>Program</td>
      <td class="text-center">:</td>
      <td style="font-weight: bold;">${targetSub.kd_program}</td>
      <td colspan="2">${targetSub.nm_program}</td>
    </tr>
    <tr>
      <td>Kegiatan</td>
      <td class="text-center">:</td>
      <td style="font-weight: bold;">${targetSub.kd_kegiatan}</td>
      <td colspan="2">${targetSub.nm_kegiatan}</td>
    </tr>
    <tr>
      <td>Sub Kegiatan</td>
      <td class="text-center">:</td>
      <td style="font-weight: bold;">${targetSub.kd_sub_kegiatan}</td>
      <td colspan="2" style="font-weight: bold;">${targetSub.nm_sub_kegiatan}</td>
    </tr>
    <tr>
      <td>Waktu Pelaksanaan</td>
      <td class="text-center">:</td>
      <td colspan="3">${targetSub.trskpd?.waktu_kegiatan || `Januari s/d Desember ${tahunLogin}`}</td>
    </tr>
    <tr>
      <td>Lokasi Kegiatan</td>
      <td class="text-center">:</td>
      <td colspan="3">${targetSub.trskpd?.lokasi_kegiatan || "Kabupaten Tapanuli Selatan"}</td>
    </tr>
    <tr>
      <td>Kelompok Sasaran</td>
      <td class="text-center">:</td>
      <td colspan="3">${targetSub.trskpd?.sasaran_kegiatan || "Perangkat Daerah / Masyarakat Terkait"}</td>
    </tr>
  </table>

  <!-- Indikator & Tolok Ukur Kinerja -->
  <table class="meta-table">
    <tr class="meta-title">
      <td colspan="4" class="text-center">Indikator & Tolok Ukur Kinerja Sub Kegiatan</td>
    </tr>
    ${!isPerubahan
        ? `
    <tr class="bold text-center">
      <td style="width: 140px;">Indikator</td>
      <td>Tolok Ukur Kinerja</td>
      <td colspan="2" style="width: 180px;">Target Kinerja</td>
    </tr>
    <tr>
      <td class="bold">Capaian Program</td>
      <td>${targetSub.trskpd?.capaian_kegiatan || targetSub.nm_program || "Tercapainya target kinerja program sesuai dokumen perencanaan"}</td>
      <td colspan="2" class="text-center">100%</td>
    </tr>
    <tr>
      <td class="bold">Masukan (Input)</td>
      <td>Jumlah dana yang dibutuhkan untuk pelaksanaan sub kegiatan</td>
      <td colspan="2" class="text-center bold">${formatRupiah(Number(targetSub.trskpd?.totalAnggaran) || totalSebelum)}</td>
    </tr>
    <tr>
      <td class="bold">Keluaran (Output)</td>
      <td>${targetSub.trskpd?.sasaran_kegiatan || `Terlaksananya kegiatan ${targetSub.nm_sub_kegiatan}`}</td>
      <td colspan="2" class="text-center">${targetSub.trskpd?.waktu_kegiatan || "12 Bulan"}</td>
    </tr>
    <tr>
      <td class="bold">Hasil (Outcome)</td>
      <td>${targetSub.trskpd?.capaian_kegiatan ? `Tercapainya target ${targetSub.trskpd.capaian_kegiatan}` : `Tercapainya output dan outcome ${targetSub.nm_sub_kegiatan}`}</td>
      <td colspan="2" class="text-center">100%</td>
    </tr>`
        : `
    <tr class="bold text-center">
      <td style="width: 140px;" rowspan="2">Indikator</td>
      <td rowspan="2">Tolok Ukur Kinerja</td>
      <td colspan="2">Target Kinerja</td>
    </tr>
    <tr class="bold text-center">
      <td style="width: 110px;">Sebelum Perubahan</td>
      <td style="width: 110px;">Setelah Perubahan</td>
    </tr>
    <tr>
      <td class="bold">Capaian Program</td>
      <td>${targetSub.trskpd?.capaian_kegiatan || targetSub.nm_program || "Tercapainya target kinerja program sesuai dokumen perencanaan"}</td>
      <td class="text-center">100%</td>
      <td class="text-center">100%</td>
    </tr>
    <tr>
      <td class="bold">Masukan (Input)</td>
      <td>Jumlah dana yang dibutuhkan untuk pelaksanaan sub kegiatan</td>
      <td class="text-center bold">${formatRupiah(Number(targetSub.trskpd?.totalAnggaran) || totalSebelum)}</td>
      <td class="text-center bold">${formatRupiah(Number(targetSub.trskpd?.totalAnggaran_ubah) || totalSetelah)}</td>
    </tr>
    <tr>
      <td class="bold">Keluaran (Output)</td>
      <td>${targetSub.trskpd?.sasaran_kegiatan || `Terlaksananya kegiatan ${targetSub.nm_sub_kegiatan}`}</td>
      <td class="text-center">${targetSub.trskpd?.waktu_kegiatan || "12 Bulan"}</td>
      <td class="text-center">${targetSub.trskpd?.waktu_kegiatan || "12 Bulan"}</td>
    </tr>
    <tr>
      <td class="bold">Hasil (Outcome)</td>
      <td>${targetSub.trskpd?.capaian_kegiatan ? `Tercapainya target ${targetSub.trskpd.capaian_kegiatan}` : `Tercapainya output dan outcome ${targetSub.nm_sub_kegiatan}`}</td>
      <td class="text-center">100%</td>
      <td class="text-center">100%</td>
    </tr>`}
  </table>

  <!-- Rincian Rekening Belanja -->
  <table class="content-table">
    <thead>
      ${!isPerubahan
        ? `
      <tr>
        <th rowspan="2" style="width: 110px;">Kode Rekening</th>
        <th rowspan="2">Uraian Rekening Belanja</th>
        <th colspan="3">Rincian Perhitungan</th>
        <th rowspan="2" style="width: 140px;">Jumlah (Rp)</th>
      </tr>
      <tr>
        <th style="width: 55px;">Volume</th>
        <th style="width: 60px;">Satuan</th>
        <th style="width: 110px;">Harga Satuan</th>
      </tr>`
        : `
      <tr>
        <th rowspan="2" style="width: 100px;">Kode Rekening</th>
        <th rowspan="2">Uraian</th>
        <th colspan="2">Sebelum Perubahan</th>
        <th colspan="2">Setelah Perubahan</th>
        <th colspan="2">Bertambah / (Berkurang)</th>
      </tr>
      <tr>
        <th style="width: 50px;">Rincian</th>
        <th style="width: 105px;">Jumlah (Rp)</th>
        <th style="width: 50px;">Rincian</th>
        <th style="width: 105px;">Jumlah (Rp)</th>
        <th style="width: 95px;">(Rp)</th>
        <th style="width: 50px;">%</th>
      </tr>`
      }
    </thead>
    <tbody>
      <tr class="bold" style="background: #fdfdfd;">
        <td class="text-center">5</td>
        <td colspan="${!isPerubahan ? 4 : 6}">BELANJA DAERAH</td>
        <td class="text-right">${formatRupiah(isPerubahan ? totalSetelah : totalSebelum)}</td>
      </tr>
      ${rekRows.length === 0
        ? `<tr><td colspan="${!isPerubahan ? 6 : 8}" class="text-center" style="padding: 15px; color: #666;">Belum ada rekening belanja yang diinput pada sub kegiatan ini.</td></tr>`
        : rekRows
          .map((r) => {
            const subDpos = dpos.filter((d) => d.kd_rek6 === r.kd_rek6);
            const murniVal = Number(r.nilai) || 0;
            const ubahVal =
              r.nilai_ubah !== null && r.nilai_ubah !== undefined
                ? Number(r.nilai_ubah)
                : murniVal;
            const diffVal = ubahVal - murniVal;
            const diffPct = murniVal > 0 ? (diffVal / murniVal) * 100 : 0;

            return `
        <tr class="bold">
          <td class="text-center">${r.kd_rek6}</td>
          <td>${r.nm_rek6}</td>
          ${!isPerubahan
                ? `
          <td class="text-center">1</td>
          <td class="text-center">Tahun</td>
          <td class="text-right">${formatRupiah(murniVal)}</td>
          <td class="text-right">${formatRupiah(murniVal)}</td>`
                : `
          <td class="text-center">1 Thn</td>
          <td class="text-right">${formatRupiah(murniVal)}</td>
          <td class="text-center">1 Thn</td>
          <td class="text-right">${formatRupiah(ubahVal)}</td>
          <td class="text-right">${diffVal < 0 ? `(${formatRupiah(Math.abs(diffVal))})` : formatRupiah(diffVal)}</td>
          <td class="text-center">${diffPct.toFixed(1)}%</td>`
              }
        </tr>
        ${subDpos
                .map(
                  (d) => `
        <tr style="font-size: 9.5px; color: #222;">
          <td class="text-center" style="color: #666;">-</td>
          <td style="padding-left: 15px;">• ${d.uraian}</td>
          ${!isPerubahan
                      ? `
          <td class="text-center">${d.volume}</td>
          <td class="text-center">${d.satuan || "-"}</td>
          <td class="text-right">${formatRupiah(Number(d.harga) || 0)}</td>
          <td class="text-right">${formatRupiah(Number(d.total) || 0)}</td>`
                      : `
          <td class="text-center">${d.volume} ${d.satuan || ""}</td>
          <td class="text-right">${formatRupiah(Number(d.total) || 0)}</td>
          <td class="text-center">${d.volume_ubah ?? d.volume} ${d.satuan_ubah || d.satuan || ""}</td>
          <td class="text-right">${formatRupiah(Number(d.total_ubah ?? d.total) || 0)}</td>
          <td class="text-right">${formatRupiah((Number(d.total_ubah ?? d.total) || 0) - (Number(d.total) || 0))}</td>
          <td class="text-center">-</td>`
                    }
        </tr>`
                )
                .join("")}
        `;
          })
          .join("")
      }
      <tr class="bold" style="background: #f4f4f4;">
        <td colspan="${!isPerubahan ? 5 : 3}" class="text-right">Total Anggaran Sub Kegiatan</td>
        ${!isPerubahan
        ? `
        <td class="text-right">${formatRupiah(totalSebelum)}</td>`
        : `
        <td class="text-right">${formatRupiah(totalSebelum)}</td>
        <td></td>
        <td class="text-right">${formatRupiah(totalSetelah)}</td>
        <td class="text-right">${formatRupiah(selisihRp)}</td>
        <td class="text-center">${selisihPersen.toFixed(1)}%</td>`
      }
      </tr>
    </tbody>
  </table>

  <div class="ttd-box">
    <div class="ttd-left">
      <div style="font-weight: bold; margin-bottom: 4px;">Pejabat Pelaksana Teknis Kegiatan (PPTK):</div>
      <div style="font-weight: bold; font-size: 10pt;">${targetSub.trskpd?.pptkNama || "-"}</div>
      <div style="margin-top: 2px;">NIP. ${targetSub.trskpd?.pptkNip || "-"}</div>
      <div style="margin-top: 10px; font-size: 8pt; color: #555;">
        <div>1. Sub kegiatan dibiayai dari sumber dana yang sah sesuai peraturan perundang-undangan.</div>
        <div>2. Alokasi anggaran digunakan secara efektif, efisien, transparan, dan akuntabel.</div>
      </div>
    </div>
    <div class="ttd-right">
      ${mode === "RKA"
        ? `
      <div>
        <div>Kab. Tapanuli Selatan, ${reportForm.tanggalTtd}</div>
        <div style="margin-top: 3px;">Pengguna Anggaran / Kuasa Pengguna Anggaran</div>
        <div style="margin-top: 1px; font-weight: bold; font-size: 8.5pt;">${selectedOpd.nm_skpd}</div>
      </div>
      <div style="margin-top: 45px;">
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${penandatanganAktif.nama}</div>
        <div style="margin-top: 3px;">NIP. ${penandatanganAktif.nip}</div>
      </div>`
        : `
      <div>
        <div>Ditetapkan di ${reportForm.tempatTtd}</div>
        <div>pada tanggal ${reportForm.tanggalTtd}</div>
        <div style="margin-top: 4px; font-weight: bold;">
          PEJABAT PENGELOLA KEUANGAN DAERAH<br/>SELAKU BENDAHARA UMUM DAERAH
        </div>
      </div>
      <div style="margin-top: 45px;">
        <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${penandatanganAktif.nama}</div>
        <div style="margin-top: 2px;">${penandatanganAktif.pangkat || "PEMBINA UTAMA MUDA"}</div>
        <div style="margin-top: 2px;">NIP. ${penandatanganAktif.nip}</div>
      </div>`
      }
    </div>
  </div>
</body>
</html>`;
  };

  const activeReportHtml = useMemo(() => {
    if (!reportModal) return "";
    if (reportModal.type === "RINGKASAN") {
      return generateRingkasanHtml();
    }
    return generateSubKegiatanHtml(reportModal.subKegiatanKey);
  }, [
    reportModal,
    ringkasanData,
    subKegiatanList,
    reportForm,
    tahapAnggaran,
    tahunLogin,
    penandatanganAktif,
    mode,
    selectedOpd,
  ]);

  const openReportModal = (
    type: "RINGKASAN" | "SUB_KEGIATAN",
    subKey?: string
  ) => {
    setReportModal({
      type,
      tahap: tahapAnggaran,
      subKegiatanKey: subKey,
    });
    setDropdownCetakOpen(false);
  };

  const handlePrintActiveReport = () => {
    const iframe = reportIframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleOpenReportNewTab = () => {
    if (!activeReportHtml) return;
    const blob = new Blob([activeReportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const docLabel = mode === "RKA" ? "RKA SKPD" : "DPA SKPD";
  const isUbah = tahapAnggaran === "PERUBAHAN";

  return (
    <div className="space-y-6 pb-20">
      {/* 1. TOP HEADER & KARTU INFORMASI */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        {/* Baris 1: Judul Menu, Badge Tahun Login, dan Tombol Aksi Kanan */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#5E0E14] to-[#991B1B] text-white shadow-md shrink-0">
              {mode === "RKA" ? (
                <BookOpenText className="w-7 h-7" />
              ) : (
                <FileSpreadsheet className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {docLabel}
                </h1>
              </div>
            </div>
          </div>

          {/* Sisi Kanan Atas: Tombol Refresh & Dropdown Tombol Cetak */}
          <div className="flex items-center gap-2.5 self-start lg:self-auto">
            {/* Tombol Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              title="Muat ulang data"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* DROPDOWN MENU CETAK RESMI (Sesuai Gaya Cetak SPD) */}

          </div>
        </div>

        {/* Baris 2: PILIHAN PERANGKAT DAERAH (OPD) - Tepat di bawah Judul Menu agar Rapi */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 shrink-0">
            <span className="p-1.5 rounded-lg bg-[#5E0E14]/10 text-[#5E0E14]">
              <Building2 className="w-4 h-4" />
            </span>
            <span>Pilih OPD :</span>
          </div>

          <div className="flex-1 max-w-2xl">
            {isCrossOpd ? (
              <div className="relative" ref={opdPickerRef}>
                <button
                  type="button"
                  onClick={() => setOpdPickerOpen((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#5E0E14]/10 text-[#5E0E14] shrink-0">
                      {selectedOpd?.kd_skpd || "PILIH SKPD"}
                    </span>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">
                        {selectedOpd?.nm_skpd || "Belum ada SKPD terpilih"}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${opdPickerOpen ? "rotate-180 text-[#5E0E14]" : ""
                      }`}
                  />
                </button>

                {/* Popover Dropdown dengan Pencarian */}
                {opdPickerOpen && (
                  <div className="absolute left-0 mt-2 w-full sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Header Pencarian */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Cari kode SKPD, nama dinas, atau badan..."
                          value={opdSearchQuery}
                          onChange={(e) => setOpdSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/30 focus:border-[#5E0E14]"
                        />
                        {opdSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setOpdSearchQuery("")}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1 mt-2">
                        <span>
                          Ditemukan <strong>{filteredOpds.length}</strong> dari {opds.length} SKPD
                        </span>
                      </div>
                    </div>

                    {/* Daftar List SKPD Scrollable */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredOpds.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Tidak ditemukan SKPD dengan kata kunci "{opdSearchQuery}"
                        </div>
                      ) : (
                        filteredOpds.map((o) => {
                          const isSelected = o.id === selectedOpdId;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => {
                                setSelectedOpdId(o.id);
                                setOpdPickerOpen(false);
                                setOpdSearchQuery("");
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${isSelected
                                ? "bg-red-50/90 text-[#5E0E14]"
                                : "hover:bg-slate-50 text-slate-800"
                                }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                    {o.kd_skpd}
                                  </span>
                                  {o.singkatan && (
                                    <span className="text-[10px] font-bold text-slate-400">
                                      ({o.singkatan})
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold truncate mt-0.5">
                                  {o.nm_skpd}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#5E0E14] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              selectedOpd && (
                <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
                  <span className="font-mono text-[11px] font-bold text-[#5E0E14]">
                    [{selectedOpd.kd_skpd}]
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedOpd.nm_skpd}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* 2. TAHAP ANGGARAN & TAB SWITCHER */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("RINGKASAN")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === "RINGKASAN"
                ? "bg-white text-[#5E0E14] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ringkasan {docLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SUB_KEGIATAN")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${activeTab === "SUB_KEGIATAN"
                ? "bg-white text-[#5E0E14] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{docLabel} Berdasarkan Sub Kegiatan</span>
            </button>
          </div>

          {/* Toggle Tahap Anggaran: Penyusunan (Murni) vs Perubahan */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">Tahap Anggaran:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setTahapAnggaran("MURNI")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isUbah
                  ? "bg-[#5E0E14] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {docLabel} Penyusunan
              </button>
              <button
                type="button"
                onClick={() => setTahapAnggaran("PERUBAHAN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isUbah
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {docLabel} Perubahan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAMPILAN KONTEN UTAMA */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-semibold text-slate-600">
            Memuat data dokumen {docLabel} TA. {tahunLogin}...
          </p>
        </div>
      ) : activeTab === "RINGKASAN" ? (
        /* ======================== TAB 1: RINGKASAN RKA / DPA SKPD ======================== */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Pratinjau Formulir Ringkasan {docLabel} {isUbah ? "" : ""}
              </h3>
              <p className="text-xs text-slate-500">
                {isUbah
                  ? "Menampilkan perbandingan nilai Penyusunan (Murni), Perubahan, serta Selisih (+/-) & Persentase"
                  : "Menampilkan format baku Ringkasan Anggaran Pendapatan dan Belanja SKPD"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openReportModal("RINGKASAN")}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#5E0E14] hover:bg-[#4a0b10] text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            {/* Pratinjau Kertas Formulir Ringkasan */}
            <div
              className={`mx-auto border border-black p-6 bg-white font-sans text-black text-[11px] leading-tight shadow-sm ${isUbah ? "max-w-[1020px]" : "max-w-[840px]"
                }`}
            >
              {/* Header Box */}
              <div className="border border-black flex text-center">
                <div className="flex-1 py-2 px-3 border-r border-black">
                  <div className="font-bold text-[13px] uppercase">
                    {mode === "RKA"
                      ? isUbah ? "RENCANA KERJA DAN ANGGARAN PERUBAHAN" : "RENCANA KERJA DAN ANGGARAN"
                      : isUbah ? "DOKUMEN PELAKSANAAN ANGGARAN PERUBAHAN" : "DOKUMEN PELAKSANAAN ANGGARAN"}
                  </div>
                  <div className="font-bold text-[13px] uppercase">SATUAN KERJA PERANGKAT DAERAH</div>
                  <div className="border-t border-black my-1" />
                  <div className="text-[11px]">
                    Pemerintahan Kab. Tapanuli Selatan Tahun Anggaran {tahunLogin}
                  </div>
                </div>
                <div className="w-44 py-2 flex flex-col justify-center font-bold text-[12px]">
                  <div>Formulir</div>
                  <div>
                    {mode === "RKA"
                      ? isUbah ? "RKA-SKPD PERUBAHAN" : "RKA SKPD"
                      : isUbah ? "DPA-SKPD PERUBAHAN" : "DPA SKPD"}
                  </div>
                </div>
              </div>

              {/* Baris Organisasi */}
              <div className="my-2.5 flex items-start gap-2 text-[11px]">
                <span className="w-20">Organisasi</span>
                <span>:</span>
                <span className="font-bold flex-1">
                  {selectedOpd?.kd_skpd} {selectedOpd?.nm_skpd}
                </span>
              </div>

              {/* Kotak Judul Tengah */}
              <div className="border border-black p-1.5 text-center my-2 font-bold text-[12px]">
                <div>Ringkasan Anggaran Pendapatan dan Belanja {isUbah ? "Perubahan" : ""}</div>
                <div>Satuan Kerja Perangkat Daerah</div>
              </div>

              {/* Tabel Rekening */}
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  {!isUbah ? (
                    <tr className="border-b border-black text-center font-bold">
                      <th colSpan={3} className="border-r border-black p-1 w-20">
                        Kode Rekening
                      </th>
                      <th className="border-r border-black p-1">Uraian</th>
                      <th className="p-1 w-44">Jumlah (Rp)</th>
                    </tr>
                  ) : (
                    <>
                      <tr className="border-b border-black text-center font-bold">
                        <th colSpan={3} rowSpan={2} className="border-r border-black p-1 w-20">
                          Kode Rekening
                        </th>
                        <th rowSpan={2} className="border-r border-black p-1">
                          Uraian
                        </th>
                        <th rowSpan={2} className="border-r border-black p-1 w-36">
                          Sebelum Perubahan (Rp)
                        </th>
                        <th rowSpan={2} className="border-r border-black p-1 w-36">
                          Setelah Perubahan (Rp)
                        </th>
                        <th colSpan={2} className="p-1 w-44">
                          Bertambah / (Berkurang)
                        </th>
                      </tr>
                      <tr className="border-b border-black text-center font-bold">
                        <th className="border-r border-black p-1 w-32">(Rp)</th>
                        <th className="p-1 w-12">(%)</th>
                      </tr>
                    </>
                  )}
                </thead>
                <tbody>
                  {/* PENDAPATAN */}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1 w-6">4</td>
                    <td className="border-r border-black text-center p-1 w-6"></td>
                    <td className="border-r border-black text-center p-1 w-8"></td>
                    <td className="border-r border-black p-1">PENDAPATAN DAERAH</td>
                    {!isUbah ? (
                      <td className="p-1 text-right"></td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="p-1"></td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">4</td>
                    <td className="border-r border-black text-center p-1">1</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">PENDAPATAN ASLI DAERAH (PAD)</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.pad.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.pad.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.pad.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pendapatan.pad.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pendapatan.pad.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.pendapatan.pad.items.map((it, idx) => (
                    <tr key={`p-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">4</td>
                      <td className="border-r border-black text-center p-1">1</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">4</td>
                    <td className="border-r border-black text-center p-1">2</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">PENDAPATAN TRANSFER</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.transfer.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.transfer.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.transfer.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pendapatan.transfer.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pendapatan.transfer.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.pendapatan.transfer.items.map((it, idx) => (
                    <tr key={`t-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">4</td>
                      <td className="border-r border-black text-center p-1">2</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">4</td>
                    <td className="border-r border-black text-center p-1">3</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">LAIN-LAIN PENDAPATAN DAERAH YANG SAH</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.lainSah.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.lainSah.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.lainSah.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pendapatan.lainSah.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pendapatan.lainSah.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.pendapatan.lainSah.items.map((it, idx) => (
                    <tr key={`l-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">4</td>
                      <td className="border-r border-black text-center p-1">3</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Jumlah Pendapatan
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pendapatan.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pendapatan.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pendapatan.persen || 0)}</td>
                      </>
                    )}
                  </tr>

                  {/* BELANJA */}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">5</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">BELANJA DAERAH</td>
                    {!isUbah ? (
                      <td className="p-1 text-right"></td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="p-1"></td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">5</td>
                    <td className="border-r border-black text-center p-1">1</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">BELANJA OPERASI</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.belanja.operasi.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.operasi.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.operasi.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.belanja.operasi.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.belanja.operasi.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.belanja.operasi.items.map((it, idx) => (
                    <tr key={`bo-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">5</td>
                      <td className="border-r border-black text-center p-1">1</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">5</td>
                    <td className="border-r border-black text-center p-1">2</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">BELANJA MODAL</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.belanja.modal.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.modal.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.modal.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.belanja.modal.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.belanja.modal.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.belanja.modal.items.map((it, idx) => (
                    <tr key={`bm-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">5</td>
                      <td className="border-r border-black text-center p-1">2</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">5</td>
                    <td className="border-r border-black text-center p-1">3</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">BELANJA TIDAK TERDUGA</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.belanja.btt.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.btt.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.btt.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.belanja.btt.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.belanja.btt.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.belanja.btt.items.map((it, idx) => (
                    <tr key={`btt-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">5</td>
                      <td className="border-r border-black text-center p-1">3</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">5</td>
                    <td className="border-r border-black text-center p-1">4</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black p-1">BELANJA TRANSFER</td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.belanja.transfer.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.transfer.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.transfer.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.belanja.transfer.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.belanja.transfer.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  {ringkasanData?.belanja.transfer.items.map((it, idx) => (
                    <tr key={`bt-${idx}`} className="border-b border-black">
                      <td className="border-r border-black text-center p-1">5</td>
                      <td className="border-r border-black text-center p-1">4</td>
                      <td className="border-r border-black text-center p-1">{it.kode}</td>
                      <td className="border-r border-black p-1">{it.uraian}</td>
                      {!isUbah ? (
                        <td className="p-1 text-right">{formatRupiah(it.murni)}</td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.murni)}</td>
                          <td className="border-r border-black p-1 text-right">{formatRupiah(it.ubah)}</td>
                          <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(it.selisih)}</td>
                          <td className="p-1 text-center">{formatPersen(it.persen)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Jumlah Belanja
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.belanja.murni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.murni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.belanja.ubah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.belanja.selisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.belanja.persen || 0)}</td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Total Surplus / (Defisit)
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.surplusDefisitMurni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.surplusDefisitMurni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.surplusDefisitUbah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.surplusDefisitSelisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.surplusDefisitPersen || 0)}</td>
                      </>
                    )}
                  </tr>

                  {/* PEMBIAYAAN */}
                  <tr className="border-b border-black font-bold">
                    <td className="border-r border-black text-center p-1">6</td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td className="border-r border-black text-center p-1"></td>
                    <td>PEMBIAYAAN</td>
                    {!isUbah ? (
                      <td className="p-1 text-right"></td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1"></td>
                        <td className="p-1"></td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Jumlah Penerimaan Pembiayaan
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.penerimaanMurni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.penerimaanMurni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.penerimaanUbah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pembiayaan.penerimaanSelisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pembiayaan.penerimaanPersen || 0)}</td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Jumlah Pengeluaran Pembiayaan
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.pengeluaranMurni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.pengeluaranMurni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.pengeluaranUbah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pembiayaan.pengeluaranSelisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pembiayaan.pengeluaranPersen || 0)}</td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black font-bold">
                    <td colSpan={4} className="border-r border-black p-1 text-right pr-3">
                      Pembiayaan Netto :
                    </td>
                    {!isUbah ? (
                      <td className="p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.nettoMurni || 0)}</td>
                    ) : (
                      <>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.nettoMurni || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatRupiah(ringkasanData?.pembiayaan.nettoUbah || 0)}</td>
                        <td className="border-r border-black p-1 text-right">{formatSelisihRupiah(ringkasanData?.pembiayaan.nettoSelisih || 0)}</td>
                        <td className="p-1 text-center">{formatPersen(ringkasanData?.pembiayaan.nettoPersen || 0)}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="border border-t-0 border-black flex text-[11px] min-h-[130px]">
                <div className="flex-1 border-r border-black p-3"></div>
                <div className="w-80 p-3 flex flex-col justify-between text-center">
                  {mode === "RKA" ? (
                    <>
                      <div>
                        <div>Kab. Tapanuli Selatan, {reportForm.tanggalTtd}</div>
                        <div className="mt-0.5">Pengguna Anggaran / Kuasa Pengguna Anggaran</div>
                        <div className="font-bold text-[10px] mt-0.5">{selectedOpd?.nm_skpd}</div>
                      </div>
                      <div className="mt-8">
                        <div className="font-bold underline uppercase">{penandatanganAktif.nama}</div>
                        <div className="mt-0.5">NIP. {penandatanganAktif.nip}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div>Ditetapkan di {reportForm.tempatTtd}</div>
                        <div>pada tanggal {reportForm.tanggalTtd}</div>
                        <div className="mt-1 font-bold">
                          PEJABAT PENGELOLA KEUANGAN DAERAH<br />SELAKU BENDAHARA UMUM DAERAH
                        </div>
                      </div>
                      <div className="mt-8">
                        <div className="font-bold underline uppercase">{penandatanganAktif.nama}</div>
                        <div className="text-[10px]">{penandatanganAktif.pangkat || "PEMBINA UTAMA MUDA"}</div>
                        <div className="mt-0.5">NIP. {penandatanganAktif.nip}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== TAB 2: RKA BERDASARKAN SUB KEGIATAN ======================== */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Daftar Sub Kegiatan
              </h3>
              <p className="text-xs text-slate-500">
                Total {totalSubKegiatan} sub kegiatan pada {selectedOpd?.nm_skpd || "SKPD terpilih"}
              </p>
            </div>

            {/* Input Pencarian */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode / nama sub kegiatan..."
                value={searchSubKegiatan}
                onChange={(e) => setSearchSubKegiatan(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#5E0E14]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#5E0E14] text-white">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 w-48">Kode Sub Kegiatan</th>
                  <th className="py-2.5 px-4">Program &amp; Nama Sub Kegiatan</th>
                  <th className="py-2.5 px-3 text-right">Penyusunan</th>
                  <th className="py-2.5 px-3 text-right">Perubahan</th>
                  <th className="py-2.5 px-3 text-right">Selisih (+/-)</th>
                  <th className="py-2.5 px-3 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedSubKegiatanList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ditemukan sub kegiatan pada SKPD ini.
                    </td>
                  </tr>
                ) : (
                  paginatedSubKegiatanList.map((sub, idx) => {
                    const rowNumber = (pageSubKegiatan - 1) * limitSubKegiatan + idx + 1;
                    const selisih = sub.totalUbah - sub.totalMurni;
                    return (
                      <tr key={sub.kd_sub_kegiatan} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#5E0E14]">
                          {sub.kd_sub_kegiatan}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{sub.nm_sub_kegiatan}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Program: [{sub.kd_program}] {sub.nm_program}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Kegiatan: [{sub.kd_kegiatan}] {sub.nm_kegiatan}
                          </div>
                          {sub.trskpd && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {sub.trskpd.pptkNama && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-medium">
                                  PPTK: {sub.trskpd.pptkNama}
                                </span>
                              )}
                              {sub.trskpd.sasaran_kegiatan && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-medium truncate max-w-xs" title={sub.trskpd.sasaran_kegiatan}>
                                  Sasaran: {sub.trskpd.sasaran_kegiatan}
                                </span>
                              )}
                              {sub.trskpd.waktu_kegiatan && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                                  Waktu: {sub.trskpd.waktu_kegiatan}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                          {formatRupiah(sub.totalMurni)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(sub.totalUbah)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={
                              selisih > 0
                                ? "text-emerald-700"
                                : selisih < 0
                                  ? "text-rose-700"
                                  : "text-slate-500"
                            }
                          >
                            {selisih === 0 ? "Rp. 0" : selisih < 0 ? `(${formatRupiah(Math.abs(selisih))})` : `+${formatRupiah(selisih)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openReportModal("SUB_KEGIATAN", sub.kd_sub_kegiatan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Baris Pagination */}
          {subKegiatanList.length > 0 && (
            <PaginationBar
              page={pageSubKegiatan}
              totalPages={totalPagesSubKegiatan}
              total={totalSubKegiatan}
              limit={limitSubKegiatan}
              onPageChange={(p) => setPageSubKegiatan(p)}
              onLimitChange={(l) => {
                setLimitSubKegiatan(l);
                setPageSubKegiatan(1);
              }}
            />
          )}
        </div>
      )}

      {/* =================================================================
          FORM MODAL REPORT PRATINJAU & CETAK RESMI (SESUAI GAYA CETAK SPD)
          ================================================================= */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-300 h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header Form Modal Report */}
            <div className="bg-gradient-to-r from-[#46090E] via-[#5E0E14] to-[#88131A] text-white px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2.5 rounded-xl bg-white/15 text-amber-300 shrink-0">
                  <Printer className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                      Report {docLabel}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/40 text-amber-200 font-mono text-[11px] font-bold">
                      TA. {tahunLogin}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-100/90 truncate mt-0.5">
                    [{selectedOpd?.kd_skpd}] {selectedOpd?.nm_skpd} •{" "}
                    {reportModal.type === "RINGKASAN"
                      ? `Ringkasan Pendapatan dan Belanja SKPD ${isUbah ? "Perubahan" : ""}`
                      : `Rincian Belanja Sub Kegiatan: ${reportModal.subKegiatanKey || ""}`}
                  </p>
                </div>
              </div>

              {/* Tombol Aksi di Header Modal */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">


                {/* Toggle Parameter Cetak */}
                <button
                  type="button"
                  onClick={() => setShowReportFormConfig((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${showReportFormConfig
                    ? "bg-amber-300 text-[#46090E] border-amber-300"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                  title="Sesuaikan tanggal atau penandatangan sebelum cetak"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Parameter Cetak</span>
                </button>

                {/* Tombol Cetak / PDF */}
                <button
                  type="button"
                  onClick={handlePrintActiveReport}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#46090E] text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>

                {/* Tombol Tutup Modal */}
                <button
                  type="button"
                  onClick={() => setReportModal(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                  title="Tutup Modal Report"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form Parameter Cetak (Hanya Tempat & Tanggal Saja) */}
            {showReportFormConfig && (
              <div className="bg-amber-50/95 border-b border-amber-200 px-5 py-3.5 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  {/* Parameter Input: Hanya Tempat & Tanggal Saja */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                        Tempat Dokumen Ditetapkan
                      </label>
                      <input
                        type="text"
                        value={reportForm.tempatTtd}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, tempatTtd: e.target.value }))
                        }
                        placeholder="Sipirok"
                        className="w-44 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                        Tanggal Penetapan Dokumen
                      </label>
                      <input
                        type="text"
                        value={reportForm.tanggalTtd}
                        onChange={(e) =>
                          setReportForm((f) => ({ ...f, tanggalTtd: e.target.value }))
                        }
                        placeholder="31 Desember 2025"
                        className="w-56 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kanvas Pratinjau Kertas Menggunakan Iframe Terisolasi */}
            <div className="flex-1 bg-slate-800/95 overflow-auto p-4 sm:p-6 flex justify-center items-start">
              <div
                className={`bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-400 transition-all ${isUbah
                  ? "w-full max-w-[1100px] min-h-[780px]"
                  : "w-full max-w-[850px] min-h-[1050px]"
                  }`}
              >
                <iframe
                  ref={reportIframeRef}
                  title={`Pratinjau Formulir ${docLabel}`}
                  srcDoc={activeReportHtml}
                  className={`w-full border-0 ${isUbah ? "h-[780px]" : "h-[1050px]"
                    }`}
                />
              </div>
            </div>

            {/* Footer Form Modal Report */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
                <span>
                  Mode Pratinjau:{" "}
                  <strong className="text-slate-900">
                    {reportModal.type === "RINGKASAN"
                      ? isUbah
                        ? `1. Ringkasan ${docLabel} Perubahan (Komparasi Murni vs Perubahan — A4 Landscape)`
                        : `1. Ringkasan ${docLabel} Penyusunan (A4 Portrait)`
                      : `2. Formulir Belanja Sub Kegiatan (${isUbah ? "A4 Landscape" : "A4 Portrait"
                      })`}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenReportNewTab}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#991B1B] hover:from-[#46090E] hover:to-[#7F1D1D] text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
