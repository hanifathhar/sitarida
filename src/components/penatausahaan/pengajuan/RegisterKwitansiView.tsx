"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "../bendahara-pengeluaran/BendaharaStepperWrapper";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  RefreshCw,
  Printer,
  BarChart3,
  Receipt,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatRupiahDesimal(val: number, withSpace: boolean = true): string {
  const safeVal = Number(val) || 0;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeVal);
  return `${withSpace ? "Rp " : "Rp"}${formatted}`;
}

function formatShortId(val: number): string {
  const n = Number(val) || 0;
  if (n <= 0) return "0";
  if (n >= 1_000_000_000_000) {
    return (
      (n / 1_000_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " T"
    );
  }
  if (n >= 1_000_000_000) {
    return (
      (n / 1_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " M"
    );
  }
  if (n >= 1_000_000) {
    return (
      (n / 1_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) + " Jt"
    );
  }
  if (n >= 1_000) {
    return (
      (n / 1_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }) + " Rb"
    );
  }
  return n.toLocaleString("id-ID");
}

const NAMA_BULAN = [
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

const SHORT_BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

interface SpdRow {
  kd_sub_kegiatan: string;
  kd_rek6: string;
  nilai: number;
}

export default function RegisterKwitansiView() {
  return (
    <BendaharaStepperWrapper
      title="Register Kuitansi Pengajuan"
      subtitle="Monitoring nilai SPD terbit, realisasi pengajuan kuitansi, dan cetak buku pembantu rincian objek"
      step3Label="Register Kuitansi"
      step4Label="Ringkasan & Grafik"
    >
      {({ selectedOpd, selectedUnit }) => (
        <RegisterKwitansiContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function RegisterKwitansiContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [spdRows, setSpdRows] = useState<SpdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );

  // Dialog parameter cetak
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [cfgBulan, setCfgBulan] = useState<number>(new Date().getMonth() + 1);
  const [cfgSubKegiatan, setCfgSubKegiatan] = useState<string>("");
  const [cfgRek6, setCfgRek6] = useState<string>("");
  const [cfgJenisAnggaran, setCfgJenisAnggaran] = useState<"APBD" | "PAPBD">(
    "APBD"
  );
  const [cfgKertas, setCfgKertas] = useState<"A4" | "F4" | "FOLIO">("A4");
  const [cfgTempat, setCfgTempat] = useState<string>("Sipirok");
  const [cfgTglCetak, setCfgTglCetak] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Penandatangan & RKA referensi
  const [paKpaOptions, setPaKpaOptions] = useState<any[]>([]);
  const [bendaharaOptions, setBendaharaOptions] = useState<any[]>([]);
  const [cfgPaId, setCfgPaId] = useState<string>("");
  const [cfgPaNama, setCfgPaNama] = useState<string>("");
  const [cfgPaNip, setCfgPaNip] = useState<string>("");
  const [cfgPaJabatan, setCfgPaJabatan] = useState<string>(
    "Pengguna Anggaran / Kuasa Pengguna Anggaran"
  );
  const [cfgBendaharaId, setCfgBendaharaId] = useState<string>("");
  const [cfgBendaharaNama, setCfgBendaharaNama] = useState<string>("");
  const [cfgBendaharaNip, setCfgBendaharaNip] = useState<string>("");
  const [cfgBendaharaJabatan, setCfgBendaharaJabatan] = useState<string>(
    "Bendahara Pengeluaran"
  );

  const [rkaOptions, setRkaOptions] = useState<
    Array<{
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      kd_rek6: string;
      nm_rek6: string;
      nilai: number;
      nilai_ubah: number;
    }>
  >([]);

  const fetchData = useCallback(async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);

      const res = await fetch(
        `/api/penatausahaan/pengajuan/register?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items || []);
        setSpdRows(json.data.spdRows || []);
      }
    } catch (e) {
      console.error("Gagal memuat register kuitansi:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedOpd, selectedUnit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedOpd) {
      setPaKpaOptions([]);
      setBendaharaOptions([]);
      return;
    }
    const fetchPetugas = async () => {
      try {
        const res = await fetch(
          `/api/penatausahaan/bendahara-pengeluaran/rekal?action=petugas&opdId=${selectedOpd.id}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          const paList = json.data.paKpaList || [];
          const bendList = json.data.bendaharaList || [];
          setPaKpaOptions(paList);
          setBendaharaOptions(bendList);

          if (paList.length > 0) {
            setCfgPaId(paList[0].id);
            setCfgPaNama(paList[0].nama || "");
            setCfgPaNip(paList[0].nip || "");
            setCfgPaJabatan(
              paList[0].jabatan || "Pengguna Anggaran / Kuasa Pengguna Anggaran"
            );
          }
          if (bendList.length > 0) {
            setCfgBendaharaId(bendList[0].id);
            setCfgBendaharaNama(bendList[0].nama || "");
            setCfgBendaharaNip(bendList[0].nip || "");
            setCfgBendaharaJabatan(
              bendList[0].jabatan || "Bendahara Pengeluaran"
            );
          }
        }
      } catch (e) {
        console.error("Gagal memuat penandatangan:", e);
      }
    };
    fetchPetugas();
  }, [selectedOpd]);

  useEffect(() => {
    if (!selectedOpd) {
      setRkaOptions([]);
      return;
    }
    const fetchRka = async () => {
      try {
        const q = new URLSearchParams();
        q.set("action", "fungsional-anggaran");
        q.set("tahun", String(new Date().getFullYear()));
        q.set("kd_skpd", selectedOpd.kd_skpd);
        if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
        const res = await fetch(
          `/api/penatausahaan/bendahara-pengeluaran/rekal?${q.toString()}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRkaOptions(
            json.data
              .filter((r: any) => String(r.kd_rek6 || "").startsWith("5"))
              .map((r: any) => ({
                kd_sub_kegiatan: r.kd_sub_kegiatan,
                nm_sub_kegiatan: r.nm_sub_kegiatan,
                kd_rek6: r.kd_rek6,
                nm_rek6: r.nm_rek6,
                nilai: Number(r.nilai) || 0,
                nilai_ubah: Number(r.nilai_ubah) || 0,
              }))
          );
        }
      } catch (e) {
        console.error("Gagal memuat referensi RKA:", e);
      }
    };
    fetchRka();
  }, [selectedOpd, selectedUnit]);

  const activeItems = useMemo(
    () => items.filter((it) => it.status !== "DITOLAK"),
    [items]
  );

  // 3 Summary Cards: Total Nilai SPD Terbit, Total Realisasi Kuitansi (Bruto), Sisa SPD
  const summary = useMemo(() => {
    const totalSpdTerbit = spdRows.reduce(
      (acc, r) => acc + (Number(r.nilai) || 0),
      0
    );
    const totalBruto = activeItems.reduce(
      (acc, it) => acc + (Number(it.nilai) || 0),
      0
    );
    const sisaSpd = totalSpdTerbit - totalBruto;
    return {
      docCount: activeItems.length,
      totalSpdTerbit,
      totalBruto,
      sisaSpd,
    };
  }, [spdRows, activeItems]);

  // Opsi Sub Kegiatan & Rekening Belanja untuk dialog cetak
  const subKegiatanOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rkaOptions) {
      if (r.kd_sub_kegiatan && !map.has(r.kd_sub_kegiatan)) {
        map.set(r.kd_sub_kegiatan, r.nm_sub_kegiatan || "-");
      }
    }
    for (const it of activeItems) {
      if (it.kd_sub_kegiatan && !map.has(it.kd_sub_kegiatan)) {
        map.set(it.kd_sub_kegiatan, it.nm_sub_kegiatan || "-");
      }
    }
    return Array.from(map.entries())
      .map(([kd_sub_kegiatan, nm_sub_kegiatan]) => ({
        kd_sub_kegiatan,
        nm_sub_kegiatan,
      }))
      .sort((a, b) => a.kd_sub_kegiatan.localeCompare(b.kd_sub_kegiatan));
  }, [rkaOptions, activeItems]);

  const rekeningOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rkaOptions) {
      if (cfgSubKegiatan && r.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (r.kd_rek6 && !map.has(r.kd_rek6)) {
        map.set(r.kd_rek6, r.nm_rek6 || "-");
      }
    }
    for (const it of activeItems) {
      if (cfgSubKegiatan && it.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (it.kd_rek6 && !map.has(it.kd_rek6)) {
        map.set(it.kd_rek6, it.nm_rek6 || "-");
      }
    }
    return Array.from(map.entries())
      .map(([kd_rek6, nm_rek6]) => ({ kd_rek6, nm_rek6 }))
      .sort((a, b) => a.kd_rek6.localeCompare(b.kd_rek6));
  }, [rkaOptions, activeItems, cfgSubKegiatan]);

  // Preview Anggaran, Nilai SPD Terbit & Sisa SPD sesuai filter Sub Kegiatan + Rekening Belanja
  const filterPreview = useMemo(() => {
    let apbd = 0;
    let papbd = 0;
    for (const r of rkaOptions) {
      if (cfgSubKegiatan && r.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (cfgRek6 && r.kd_rek6 !== cfgRek6) continue;
      apbd += r.nilai;
      papbd += r.nilai_ubah > 0 ? r.nilai_ubah : r.nilai;
    }

    let spdTerbit = 0;
    for (const s of spdRows) {
      if (cfgSubKegiatan && s.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (cfgRek6 && s.kd_rek6 !== cfgRek6) continue;
      spdTerbit += Number(s.nilai) || 0;
    }

    let kuitansiSdPeriode = 0;
    for (const it of activeItems) {
      if (cfgSubKegiatan && it.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (cfgRek6 && it.kd_rek6 !== cfgRek6) continue;
      const bln = new Date(it.tanggal).getMonth() + 1;
      if (cfgBulan > 0 && bln > cfgBulan) continue;
      kuitansiSdPeriode += Number(it.nilai) || 0;
    }

    return {
      apbd,
      papbd,
      spdTerbit,
      kuitansiSdPeriode,
      sisaSpd: spdTerbit - kuitansiSdPeriode,
    };
  }, [rkaOptions, spdRows, activeItems, cfgSubKegiatan, cfgRek6, cfgBulan]);

  // Data Grafik 12 Bulan: Bruto, Potongan, Netto
  const chartData = useMemo(() => {
    const monthly = SHORT_BULAN.map((label, idx) => ({
      bulanNum: idx + 1,
      bulan: label,
      bruto: 0,
      potongan: 0,
      netto: 0,
    }));

    for (const it of activeItems) {
      const mIdx = new Date(it.tanggal).getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        monthly[mIdx].bruto += Number(it.nilai) || 0;
        monthly[mIdx].potongan += Number(it.nilai_potongan) || 0;
        monthly[mIdx].netto += Number(it.nilai_bersih) || 0;
      }
    }

    return monthly;
  }, [activeItems]);

  const chartScale = useMemo(() => {
    const maxVal = chartData.reduce(
      (acc, c) => Math.max(acc, c.bruto, c.potongan, c.netto),
      0
    );
    const maxAxis = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1000;
    const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      label: formatShortId(Math.round(maxAxis * ratio)),
      ratio,
    }));
    return { maxAxis, ticks };
  }, [chartData]);

  const selectedMonthData = useMemo(
    () => chartData.find((c) => c.bulanNum === selectedMonth) || chartData[0],
    [chartData, selectedMonth]
  );

  const formatNum = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(val) || 0);

  const handleCetakRincianObjek = () => {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const tahun = new Date().getFullYear();
    const periodeLabel = cfgBulan
      ? NAMA_BULAN[cfgBulan - 1]
      : "Semua Bulan (Jan - Des)";
    const orgText = selectedOpd
      ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}`
      : "-";
    const unitText = selectedUnit
      ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
      : orgText;

    const selectedSubObj = subKegiatanOptions.find(
      (s) => s.kd_sub_kegiatan === cfgSubKegiatan
    );
    const kegiatanLabel = cfgSubKegiatan
      ? `${cfgSubKegiatan} - ${selectedSubObj?.nm_sub_kegiatan || "-"}`
      : "Semua Sub Kegiatan";

    const selectedRekObj = rekeningOptions.find((r) => r.kd_rek6 === cfgRek6);
    const rekeningLabel = cfgRek6
      ? `${cfgRek6} - ${selectedRekObj?.nm_rek6 || "-"}`
      : "Semua Rekening Belanja";

    const { apbd, papbd, spdTerbit } = filterPreview;

    const isMatchFilter = (it: any) => {
      if (cfgSubKegiatan && it.kd_sub_kegiatan !== cfgSubKegiatan) return false;
      if (cfgRek6 && it.kd_rek6 !== cfgRek6) return false;
      return (Number(it.nilai) || 0) > 0;
    };

    const formatKetStatus = (status: string) => {
      const s = String(status || "").toUpperCase();
      if (s === "DIBUKUKAN") return "SUDAH DIBUKUKAN<br/>BENDAHARA";
      if (s === "DISETUJUI") return "DISETUJUI PA/KPA";
      if (s === "DIAJUKAN") return "DIAJUKAN";
      if (s === "DRAFT") return "DRAFT";
      return s || "-";
    };

    // Hitung total kuitansi s/d periode ini (untuk Sisa Dana SPD yang akurat)
    let totSdIni = 0;
    for (const it of activeItems) {
      if (!isMatchFilter(it)) continue;
      const bln = new Date(it.tanggal).getMonth() + 1;
      if (cfgBulan > 0 && bln > cfgBulan) continue;
      totSdIni += Number(it.nilai) || 0;
    }

    // Transaksi periode ini
    const detailRows: Array<{
      nomor: string;
      tanggal: string;
      uraian: string;
      nilai: number;
      penerima: string;
      ket: string;
      userEntry: string;
    }> = [];

    for (const it of activeItems) {
      if (!isMatchFilter(it)) continue;
      const bln = new Date(it.tanggal).getMonth() + 1;
      if (cfgBulan > 0 && bln !== cfgBulan) continue;
      const penerimaStr =
        Array.isArray(it.penerimaList) && it.penerimaList.length > 0
          ? it.penerimaList
            .map((p: any) => p.nm_penerima)
            .filter(Boolean)
            .join(", ")
          : "-";
      detailRows.push({
        nomor: it.nomor || "-",
        tanggal: it.tanggal,
        uraian: it.uraian || it.nm_rek6 || "-",
        nilai: Number(it.nilai) || 0,
        penerima: penerimaStr || "-",
        ket: formatKetStatus(it.status),
        userEntry: it.pptkNama || "-",
      });
    }

    detailRows.sort((a, b) => {
      const da = new Date(a.tanggal).getTime();
      const db = new Date(b.tanggal).getTime();
      if (da !== db) return da - db;
      return a.nomor.localeCompare(b.nomor);
    });

    let totKwitansi = 0;
    const trsHtml = detailRows
      .map((r) => {
        totKwitansi += r.nilai;
        const tglStr = r.tanggal
          ? new Date(r.tanggal).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          : "-";
        return `
          <tr>
            <td class="text-center font-mono">${r.nomor}</td>
            <td class="text-center">${tglStr}</td>
            <td>${r.uraian}</td>
            <td class="text-right">${formatNum(r.nilai)}</td>
            <td>${r.penerima}</td>
            <td class="text-center">${r.ket}</td>
            <td class="text-center">${r.userEntry}</td>
          </tr>
        `;
      })
      .join("");

    const sisaSpdReport = spdTerbit - totSdIni;

    const tglCetakFormatted = (
      cfgTglCetak ? new Date(cfgTglCetak) : new Date()
    ).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const paNipText = cfgPaNip.trim()
      ? `NIP. ${cfgPaNip.trim()}`
      : "NIP. ........................................";
    const bendNipText = cfgBendaharaNip.trim()
      ? `NIP. ${cfgBendaharaNip.trim()}`
      : "NIP. ........................................";
    const tempatText = cfgTempat.trim() || "Sipirok";
    const pageSize = cfgKertas === "F4" ? "215mm 330mm" : cfgKertas === "FOLIO" ? "216mm 330mm" : "A4";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>REGISTER KUITANSI PENGAJUAN</title>
        <style>
          @page { size: ${pageSize}; margin: 10mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 9.5px; color: #000; margin: 0; padding: 10px; }
          .header-text { text-align: center; margin-bottom: 10px; }
          .header-text h1 { font-size: 11.5px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .header-text h2 { font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .header-text p { font-size: 10px; margin: 4px 0 0; font-weight: bold; text-transform: uppercase; }
          .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9px; }
          .meta td { padding: 1.5px 4px; vertical-align: top; }
          table.rob { width: 100%; border-collapse: collapse; font-size: 9px; }
          table.rob th, table.rob td { border: 1px solid #000; padding: 3.5px 5px; vertical-align: top; }
          table.rob th { text-align: center; font-weight: bold; background: #fff; }
          .text-right { text-align: right; white-space: nowrap; }
          .text-center { text-align: center; }
          .font-mono { white-space: nowrap; }
          .italic-bold td { font-style: italic; font-weight: bold; }
          .ttd { width: 100%; margin-top: 18px; page-break-inside: avoid; font-size: 9.5px; }
          .ttd td { width: 50%; text-align: center; vertical-align: top; }
          .ttd-space { height: 52px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header-text">
          <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
          <h2>REGISTER KUITANSI PENGAJUAN</h2>
          <p>TAHUN ANGGARAN ${tahun}</p>
        </div>

        <table class="meta">
          <tr><td style="width:140px;">Organisasi</td><td>: ${orgText}</td></tr>
          <tr><td>Unit/UPT</td><td>: ${unitText}</td></tr>
          <tr><td>Sub Kegiatan</td><td>: ${kegiatanLabel}</td></tr>
          <tr><td>Rekening Belanja</td><td>: ${rekeningLabel}</td></tr>
          <tr><td>Periode</td><td>: ${periodeLabel}</td></tr>
          <tr><td>Anggaran APBD</td><td>: Rp. ${formatNum(apbd)}</td></tr>
          <tr><td>Anggaran PAPBD</td><td>: Rp. ${formatNum(papbd)}</td></tr>
          <tr><td><strong>Nilai SPD Terbit</strong></td><td>: <strong>Rp. ${formatNum(spdTerbit)}</strong></td></tr>
          <tr><td><strong>Sisa SPD</strong></td><td>: <strong>Rp. ${formatNum(sisaSpdReport)}</strong></td></tr>
        </table>

        <table class="rob">
          <thead>
            <tr>
              <th style="width:140px;">Nomor<br/>Kwitansi</th>
              <th style="width:68px;">Tanggal<br/>Kwitansi</th>
              <th>Uraian</th>
              <th style="width:95px;">Rupiah (Rp)</th>
              <th style="width:120px;">Penerima</th>
              <th style="width:110px;">Ket.</th>
              <th style="width:130px;">User Entry</th>
            </tr>
          </thead>
          <tbody>
            ${trsHtml ||
      `<tr><td colspan="7" class="text-center">Belum ada pengajuan kuitansi pada filter dan periode ini.</td></tr>`
      }
            <tr class="italic-bold">
              <td colspan="3">Jumlah Kwitansi</td>
              <td class="text-right">${formatNum(totKwitansi)}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr class="italic-bold">
              <td colspan="3">Sisa Dana SPD</td>
              <td class="text-right">${formatNum(sisaSpdReport)}</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <table class="ttd">
          <tr>
            <td>
              <div>Mengetahui,</div>
              <div><strong>${cfgPaJabatan || "Pengguna Anggaran / Kuasa Pengguna Anggaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><u><strong>${cfgPaNama.trim() || "(....................................................)"}</strong></u></div>
              <div>${paNipText}</div>
            </td>
            <td>
              <div>${tempatText}, ${tglCetakFormatted}</div>
              <div><strong>${cfgBendaharaJabatan || "Bendahara Pengeluaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><u><strong>${cfgBendaharaNama.trim() || "(....................................................)"}</strong></u></div>
              <div>${bendNipText}</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  return (
    <div className="space-y-4">
      {/* 3 Summary Cards (persis RekalTransaksiView): Nilai SPD Terbit, Realisasi Kuitansi, Sisa SPD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-teal-700 uppercase">
            Total Nilai SPD Terbit
          </span>
          <div className="text-lg font-mono font-bold text-teal-700 mt-1">
            {formatRupiah(summary.totalSpdTerbit)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">
            Total Realisasi Kuitansi (Bruto)
          </span>
          <div className="text-lg font-mono font-bold text-rose-700 mt-1">
            {formatRupiah(summary.totalBruto)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase">
            Sisa SPD
          </span>
          <div
            className={`text-lg font-mono font-bold mt-1 ${summary.sisaSpd < 0 ? "text-rose-700" : "text-indigo-700"
              }`}
          >
            {formatRupiah(summary.sisaSpd)}
          </div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Register &amp; Monitoring Pengajuan Kuitansi
            </h3>
            <p className="text-xs text-gray-500">
              Total {summary.docCount} dokumen kuitansi aktif
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </button>
        </div>
      </div>

      {/* Cetak Laporan Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Printer className="w-4 h-4 text-[#5E0E14]" />
          <span>Cetak Laporan Register Kuitansi:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintDialog(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-50 text-[#88131A] border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Buku Pembantu Rincian Objek Kuitansi</span>
          </button>
        </div>
      </div>

      {/* Grafik Batang Bruto, Potongan, Netto per Bulan (persis RekalTransaksiView) */}
      <div className="w-full bg-white rounded-3xl border border-blue-200/80 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            Grafik Realisasi Pengajuan Kuitansi
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Bruto</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>Potongan</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>Netto</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex flex-col items-center justify-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-slate-400" />
            Memuat grafik register kuitansi...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
                  onClick={(state: any) => {
                    const idx = state?.activeTooltipIndex;
                    if (typeof idx === "number" && chartData[idx]) {
                      setSelectedMonth(chartData[idx].bulanNum);
                    }
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="bulan"
                    tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
                    axisLine={{ stroke: "#cbd5e1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatShortId(Number(v) || 0)}
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatRupiahDesimal(Number(value) || 0, false),
                      String(name),
                    ]}
                    labelFormatter={(label) => {
                      const found = chartData.find((c) => c.bulan === label);
                      return found
                        ? `Bulan ${NAMA_BULAN[found.bulanNum - 1]}`
                        : String(label);
                    }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bruto"
                    name="Bruto"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#059669", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="potongan"
                    name="Potongan"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#e11d48", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netto"
                    name="Netto"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
              {chartData.map((m) => {
                const isActive = selectedMonth === m.bulanNum;
                return (
                  <button
                    key={m.bulan}
                    type="button"
                    onClick={() => setSelectedMonth(m.bulanNum)}
                    className={`text-center text-xs font-semibold py-1 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? "text-[#88131A] font-extrabold bg-rose-50"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {m.bulan}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ringkasan Bulan Terpilih */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Ringkasan Bulan {NAMA_BULAN[selectedMonth - 1]}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Bruto
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                {formatRupiahDesimal(selectedMonthData?.bruto || 0, false)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Potongan
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-rose-700 font-mono mt-0.5">
                {formatRupiahDesimal(selectedMonthData?.potongan || 0, false)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Netto
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-indigo-700 font-mono mt-0.5">
                {formatRupiahDesimal(selectedMonthData?.netto || 0, false)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Parameter Cetak Buku Pembantu Rincian Objek Kuitansi */}
      {showPrintDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  Parameter Cetak Buku Pembantu Rincian Objek Kuitansi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintDialog(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowPrintDialog(false);
                handleCetakRincianObjek();
              }}
              className="p-5 space-y-4 overflow-y-auto text-xs"
            >
              <div className="space-y-3 rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
                <p className="text-[11px] font-bold text-[#88131A] uppercase">
                  Filter Sub Kegiatan, Rekening Belanja &amp; SPD
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sub Kegiatan
                  </label>
                  <SearchableSelect
                    options={subKegiatanOptions.map((s) => ({
                      value: s.kd_sub_kegiatan,
                      label: s.nm_sub_kegiatan,
                      badge: s.kd_sub_kegiatan,
                    }))}
                    value={cfgSubKegiatan}
                    onChange={(val) => {
                      setCfgSubKegiatan(val);
                      setCfgRek6("");
                    }}
                    placeholder="-- Semua Sub Kegiatan --"
                    searchPlaceholder="Cari kode atau nama sub kegiatan..."
                    clearLabel="-- Semua Sub Kegiatan --"
                    allowClear
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rekening Belanja
                  </label>
                  <SearchableSelect
                    options={rekeningOptions.map((r) => ({
                      value: r.kd_rek6,
                      label: r.nm_rek6,
                      badge: r.kd_rek6,
                    }))}
                    value={cfgRek6}
                    onChange={(val) => setCfgRek6(val)}
                    placeholder="-- Semua Rekening Belanja --"
                    searchPlaceholder="Cari kode atau nama rekening belanja..."
                    clearLabel="-- Semua Rekening Belanja --"
                    allowClear
                  />
                </div>

                {/* Preview Anggaran, Nilai SPD Terbit & Sisa SPD */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg bg-white border border-gray-200 p-2">
                    <div className="text-[10px] text-gray-500">Anggaran APBD</div>
                    <div className="font-mono font-bold text-gray-900">
                      {formatRupiah(filterPreview.apbd)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-gray-200 p-2">
                    <div className="text-[10px] text-gray-500">Anggaran PAPBD</div>
                    <div className="font-mono font-bold text-gray-900">
                      {formatRupiah(filterPreview.papbd)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-teal-200 p-2">
                    <div className="text-[10px] text-teal-700">Nilai SPD Terbit</div>
                    <div className="font-mono font-bold text-teal-700">
                      {formatRupiah(filterPreview.spdTerbit)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-indigo-200 p-2">
                    <div className="text-[10px] text-indigo-700">Sisa SPD</div>
                    <div
                      className={`font-mono font-bold ${filterPreview.sisaSpd < 0
                        ? "text-rose-700"
                        : "text-indigo-700"
                        }`}
                    >
                      {formatRupiah(filterPreview.sisaSpd)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Periode Bulan
                  </label>
                  <select
                    value={cfgBulan}
                    onChange={(e) => setCfgBulan(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value={0}>Semua Bulan (Jan - Des)</option>
                    {NAMA_BULAN.map((nm, i) => (
                      <option key={i + 1} value={i + 1}>
                        {nm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Jenis Anggaran
                  </label>
                  <select
                    value={cfgJenisAnggaran}
                    onChange={(e) =>
                      setCfgJenisAnggaran(e.target.value as "APBD" | "PAPBD")
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="APBD">APBD Murni</option>
                    <option value="PAPBD">PAPBD (Perubahan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Ukuran Kertas
                  </label>
                  <select
                    value={cfgKertas}
                    onChange={(e) =>
                      setCfgKertas(e.target.value as "A4" | "F4" | "FOLIO")
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="A4">A4</option>
                    <option value="F4">F4</option>
                    <option value="FOLIO">Folio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Tempat Cetak
                  </label>
                  <input
                    type="text"
                    value={cfgTempat}
                    onChange={(e) => setCfgTempat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Tanggal Cetak
                  </label>
                  <input
                    type="date"
                    value={cfgTglCetak}
                    onChange={(e) => setCfgTglCetak(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    PA / KPA
                  </label>
                  <select
                    value={cfgPaId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCfgPaId(val);
                      const found = paKpaOptions.find((p) => p.id === val);
                      if (found) {
                        setCfgPaNama(found.nama || "");
                        setCfgPaNip(found.nip || "");
                        setCfgPaJabatan(found.jabatan || "PA / KPA");
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">-- Pilih PA / KPA --</option>
                    {paKpaOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Bendahara Pengeluaran
                  </label>
                  <select
                    value={cfgBendaharaId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCfgBendaharaId(val);
                      const found = bendaharaOptions.find((b) => b.id === val);
                      if (found) {
                        setCfgBendaharaNama(found.nama || "");
                        setCfgBendaharaNip(found.nip || "");
                        setCfgBendaharaJabatan(
                          found.jabatan || "Bendahara Pengeluaran"
                        );
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">-- Pilih Bendahara --</option>
                    {bendaharaOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintDialog(false)}
                  className="px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Laporan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
