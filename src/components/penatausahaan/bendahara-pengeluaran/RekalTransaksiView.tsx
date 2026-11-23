"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  Calculator,
  Plus,
  RefreshCw,
  Printer,
  X,
  AlertCircle,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  Landmark,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

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
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) {
    return (
      sign +
      (abs / 1_000_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) +
      " T"
    );
  }
  if (abs >= 1_000_000_000) {
    return (
      sign +
      (abs / 1_000_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) +
      " M"
    );
  }
  if (abs >= 1_000_000) {
    return (
      sign +
      (abs / 1_000_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }) +
      " Jt"
    );
  }
  if (abs >= 1_000) {
    return (
      sign +
      (abs / 1_000).toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }) +
      " Rb"
    );
  }
  return n.toLocaleString("id-ID");
}

type PrintReportType = "BKU" | "FUNGSIONAL" | "PAJAK" | "RINCIAN_OBJEK" | "DTH";

export default function RekalTransaksiView() {
  return (
    <BendaharaStepperWrapper
      title="Rekal Transaksi Bendahara"
      subtitle=""
      step3Label="Riwayat Rekal Transaksi"
    >
      {({ selectedOpd, selectedUnit }) => (
        <RekalTransaksiContent
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function RekalTransaksiContent({
  selectedOpd,
  selectedUnit,
}: {
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [printBulan, setPrintBulan] = useState<number>(0); // 0 = Semua Bulan
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );

  // Print Config Dialog State
  const [printDialogType, setPrintDialogType] =
    useState<PrintReportType | null>(null);
  const [cfgBulan, setCfgBulan] = useState<number>(0);
  const [cfgTglCetak, setCfgTglCetak] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [cfgKertas, setCfgKertas] = useState<
    "A4 landscape" | "A4 portrait" | "legal landscape"
  >("A4 landscape");
  const [cfgTempat, setCfgTempat] = useState<string>("Sipirok");
  const [paKpaOptions, setPaKpaOptions] = useState<
    Array<{ id: string; nama: string; nip: string; jabatan: string }>
  >([]);
  const [bendaharaOptions, setBendaharaOptions] = useState<
    Array<{ id: string; nama: string; nip: string; jabatan: string }>
  >([]);
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
      anggaran: number;
    }>
  >([]);
  const [cfgSubKegiatan, setCfgSubKegiatan] = useState<string>("");
  const [cfgRek6, setCfgRek6] = useState<string>("");
  const [cfgJenisAnggaran, setCfgJenisAnggaran] = useState<"APBD" | "PAPBD">(
    "APBD"
  );

  // Form State
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/rekal?${q.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setDataList(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOpd, selectedUnit]);

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
          } else {
            setCfgPaId("");
            setCfgPaNama("");
            setCfgPaNip("");
            setCfgPaJabatan("Pengguna Anggaran / Kuasa Pengguna Anggaran");
          }

          if (bendList.length > 0) {
            setCfgBendaharaId(bendList[0].id);
            setCfgBendaharaNama(bendList[0].nama || "");
            setCfgBendaharaNip(bendList[0].nip || "");
            setCfgBendaharaJabatan(bendList[0].jabatan || "Bendahara Pengeluaran");
          } else {
            setCfgBendaharaId("");
            setCfgBendaharaNama("");
            setCfgBendaharaNip("");
            setCfgBendaharaJabatan("Bendahara Pengeluaran");
          }
        }
      } catch (e) {
        console.error("Gagal memuat daftar penandatangan:", e);
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
                anggaran: Number(r.anggaran) || 0,
              }))
          );
        }
      } catch (e) {
        console.error("Gagal memuat referensi sub kegiatan & rekening:", e);
      }
    };
    fetchRka();
  }, [selectedOpd, selectedUnit]);

  const subKegiatanOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rkaOptions) {
      if (r.kd_sub_kegiatan && !map.has(r.kd_sub_kegiatan)) {
        map.set(r.kd_sub_kegiatan, r.nm_sub_kegiatan || "-");
      }
    }
    for (const h of dataList) {
      for (const d of h.rincian || []) {
        const kdRek = String(d.kd_rek6 || "");
        if (kdRek.startsWith("5") && d.kd_sub_kegiatan && !map.has(d.kd_sub_kegiatan)) {
          map.set(d.kd_sub_kegiatan, d.nm_sub_kegiatan || "-");
        }
      }
    }
    return Array.from(map.entries())
      .map(([kd_sub_kegiatan, nm_sub_kegiatan]) => ({
        kd_sub_kegiatan,
        nm_sub_kegiatan,
      }))
      .sort((a, b) => a.kd_sub_kegiatan.localeCompare(b.kd_sub_kegiatan));
  }, [rkaOptions, dataList]);

  const rekeningOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rkaOptions) {
      if (cfgSubKegiatan && r.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (r.kd_rek6 && !map.has(r.kd_rek6)) {
        map.set(r.kd_rek6, r.nm_rek6 || "-");
      }
    }
    for (const h of dataList) {
      for (const d of h.rincian || []) {
        const kdRek = String(d.kd_rek6 || "");
        if (!kdRek.startsWith("5")) continue;
        if (cfgSubKegiatan && d.kd_sub_kegiatan !== cfgSubKegiatan) continue;
        if (!map.has(kdRek)) {
          map.set(kdRek, d.nm_rek6 || "-");
        }
      }
    }
    return Array.from(map.entries())
      .map(([kd_rek6, nm_rek6]) => ({ kd_rek6, nm_rek6 }))
      .sort((a, b) => a.kd_rek6.localeCompare(b.kd_rek6));
  }, [rkaOptions, dataList, cfgSubKegiatan]);

  const anggaranPreview = useMemo(() => {
    let apbd = 0;
    let papbd = 0;
    for (const r of rkaOptions) {
      if (cfgSubKegiatan && r.kd_sub_kegiatan !== cfgSubKegiatan) continue;
      if (cfgRek6 && r.kd_rek6 !== cfgRek6) continue;
      apbd += r.nilai;
      papbd += r.nilai_ubah > 0 ? r.nilai_ubah : r.nilai;
    }
    return { apbd, papbd };
  }, [rkaOptions, cfgSubKegiatan, cfgRek6]);

  const chartData = useMemo(() => {
    const monthly = SHORT_BULAN.map((label, idx) => ({
      bulanNum: idx + 1,
      bulan: label,
      penerimaan: 0,
      pengeluaran: 0,
      saldo: 0,
    }));

    for (const item of dataList) {
      const mIdx = (Number(item.bulan) || 1) - 1;
      if (mIdx < 0 || mIdx > 11) continue;
      for (const r of item.rincian || []) {
        monthly[mIdx].penerimaan += Number(r.terima) || 0;
        monthly[mIdx].pengeluaran += Number(r.keluar) || 0;
      }
    }

    for (const m of monthly) {
      m.saldo = m.penerimaan - m.pengeluaran;
    }

    return monthly;
  }, [dataList]);

  const chartScale = useMemo(() => {
    const allValues = chartData.flatMap((c) => [
      c.penerimaan,
      c.pengeluaran,
      Math.max(c.saldo, 0),
    ]);
    const maxVal = Math.max(...allValues, 0);

    if (maxVal === 0) {
      return {
        maxAxis: 100_000_000,
        ticks: [
          { value: 100_000_000, label: "100 Jt" },
          { value: 75_000_000, label: "75 Jt" },
          { value: 50_000_000, label: "50 Jt" },
          { value: 25_000_000, label: "25 Jt" },
          { value: 0, label: "0" },
        ],
      };
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / magnitude;
    let niceTop = 2;
    if (normalized <= 1) niceTop = 1;
    else if (normalized <= 2) niceTop = 2;
    else if (normalized <= 4) niceTop = 4;
    else if (normalized <= 5) niceTop = 5;
    else if (normalized <= 8) niceTop = 8;
    else niceTop = 10;

    const maxAxis = niceTop * magnitude;
    const step = maxAxis / 4;

    return {
      maxAxis,
      ticks: [
        { value: maxAxis, label: formatShortId(maxAxis) },
        { value: step * 3, label: formatShortId(step * 3) },
        { value: step * 2, label: formatShortId(step * 2) },
        { value: step, label: formatShortId(step) },
        { value: 0, label: "0" },
      ],
    };
  }, [chartData]);

  const selectedMonthData = useMemo(() => {
    return (
      chartData.find((c) => c.bulanNum === selectedMonth) || chartData[0]
    );
  }, [chartData, selectedMonth]);

  const summary = useMemo(() => {
    let penerimaan = 0;
    let pengeluaran = 0;
    const filteredDocs = printBulan
      ? dataList.filter((d) => Number(d.bulan) === printBulan)
      : dataList;
    for (const item of filteredDocs) {
      for (const r of item.rincian || []) {
        penerimaan += Number(r.terima) || 0;
        pengeluaran += Number(r.keluar) || 0;
      }
    }
    return {
      docCount: filteredDocs.length,
      penerimaan,
      pengeluaran,
      saldo: penerimaan - pengeluaran,
    };
  }, [dataList, printBulan]);

  const formatNum = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);

  const openPrintWindow = (title: string, subtitle: string, bodyHtml: string) => {
    const win = window.open("", "_blank", "width=1050,height=780");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const skpdText = selectedOpd
      ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}`
      : "-";
    const unitText = selectedUnit
      ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
      : skpdText;
    const periodeText = cfgBulan
      ? `Bulan ${NAMA_BULAN[cfgBulan - 1]} Tahun Anggaran ${new Date().getFullYear()}`
      : `Tahun Anggaran ${new Date().getFullYear()} (Semua Bulan)`;
    const tglCetakFormatted = (cfgTglCetak ? new Date(cfgTglCetak) : new Date()).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
    const paNamaText = cfgPaNama.trim() || "(....................................................)";
    const paNipText = cfgPaNip.trim() ? `NIP. ${cfgPaNip.trim()}` : "NIP. ........................................";
    const bendNamaText = cfgBendaharaNama.trim() || "(....................................................)";
    const bendNipText = cfgBendaharaNip.trim()
      ? `NIP. ${cfgBendaharaNip.trim()}`
      : "NIP. ........................................";
    const tempatText = cfgTempat.trim() || "Sipirok";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: ${cfgKertas}; margin: 12mm; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #111827; margin: 0; padding: 12px; }
          .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
          .header h1 { font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.4px; }
          .header h2 { font-size: 12px; margin: 3px 0 0; text-transform: uppercase; }
          .header p { font-size: 10px; margin: 3px 0 0; color: #374151; }
          .meta { width: 100%; margin-bottom: 10px; font-size: 10.5px; }
          .meta td { padding: 2px 4px; vertical-align: top; }
          table.report { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          table.report th, table.report td { border: 1px solid #374151; padding: 5px 6px; vertical-align: top; }
          table.report th { background: #f3f4f6; font-weight: bold; text-align: center; font-size: 10px; text-transform: uppercase; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: "Courier New", monospace; }
          .total-row td { background: #f9fafb; font-weight: bold; }
          .group-row td { background: #eef2ff; font-weight: bold; }
          .ttd { width: 100%; margin-top: 24px; page-break-inside: avoid; }
          .ttd td { width: 50%; text-align: center; vertical-align: top; padding: 4px 16px; }
          .ttd-space { height: 58px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <table class="meta">
          <tr><td style="width:130px;"><strong>SKPD</strong></td><td>: ${skpdText}</td></tr>
          <tr><td><strong>Unit Kerja</strong></td><td>: ${unitText}</td></tr>
          <tr><td><strong>Periode</strong></td><td>: ${periodeText}</td></tr>
        </table>
        ${bodyHtml}
        <table class="ttd">
          <tr>
            <td>
              <div>Mengetahui,</div>
              <div><strong>${cfgPaJabatan || "Pengguna Anggaran / Kuasa Pengguna Anggaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><strong>${paNamaText}</strong></div>
              <div>${paNipText}</div>
            </td>
            <td>
              <div>${tempatText}, ${tglCetakFormatted}</div>
              <div><strong>${cfgBendaharaJabatan || "Bendahara Pengeluaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><strong>${bendNamaText}</strong></div>
              <div>${bendNipText}</div>
            </td>
          </tr>
        </table>
        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const getFilteredDetails = () => {
    const docs = cfgBulan
      ? dataList.filter((d) => Number(d.bulan) === cfgBulan)
      : dataList;
    const rows: Array<{
      tgl_bukti: string;
      no_bukti: string;
      jenis_beban: string;
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      kd_rek6: string;
      nm_rek6: string;
      uraian: string;
      terima: number;
      keluar: number;
    }> = [];

    for (const h of docs) {
      for (const d of h.rincian || []) {
        rows.push({
          tgl_bukti: d.tgl_bukti || h.tgl_bukti,
          no_bukti: d.no_bukti || h.no_bukti,
          jenis_beban: d.jenis_beban || h.jenis_beban || "-",
          kd_sub_kegiatan: d.kd_sub_kegiatan || "-",
          nm_sub_kegiatan: d.nm_sub_kegiatan || "-",
          kd_rek6: d.kd_rek6 || "-",
          nm_rek6: d.nm_rek6 || "-",
          uraian: d.keterangan || h.keterangan || "-",
          terima: Number(d.terima) || 0,
          keluar: Number(d.keluar) || 0,
        });
      }
    }

    rows.sort((a, b) => {
      const da = new Date(a.tgl_bukti).getTime();
      const db = new Date(b.tgl_bukti).getTime();
      if (da !== db) return da - db;
      return a.no_bukti.localeCompare(b.no_bukti);
    });
    return rows;
  };

  const handleCetakBku = () => {
    const win = window.open("", "_blank", "width=1150,height=800");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const docs = (
      cfgBulan
        ? dataList.filter((d) => Number(d.bulan) === cfgBulan)
        : [...dataList]
    ).sort((a, b) => {
      const da = new Date(a.tgl_bukti).getTime();
      const db = new Date(b.tgl_bukti).getTime();
      if (da !== db) return da - db;
      return String(a.no_bukti || "").localeCompare(String(b.no_bukti || ""));
    });

    // Hitung Saldo Bulan Lalu (terimaLalu & keluarLalu) jika memilih bulan tertentu (> 1)
    let terimaLalu = 0;
    let keluarLalu = 0;
    if (cfgBulan > 1) {
      for (const h of dataList) {
        if (Number(h.bulan) < cfgBulan) {
          for (const d of h.rincian || []) {
            terimaLalu += Number(d.terima) || 0;
            keluarLalu += Number(d.keluar) || 0;
          }
        }
      }
    }
    const saldoLalu = terimaLalu - keluarLalu;

    let runningSaldo = saldoLalu;
    let totTerima = 0;
    let totKeluar = 0;

    const splitKodeSegments = (
      kdSubKegiatan: string | null | undefined,
      kdRek6: string | null | undefined,
      kdSkpd: string
    ) => {
      const urusanPart = kdSkpd ? kdSkpd.split(".").slice(0, 2).join(".") : "";
      const subParts = (kdSubKegiatan || "").split(".").filter(Boolean);
      // Contoh kd_sub_kegiatan: 5.02.01.2.02.01 -> urusan(5.02), prog(01), keg(2.02), sub(01)
      const prog = subParts[2] || "";
      const keg =
        subParts.length >= 5 ? `${subParts[3]}.${subParts[4]}` : subParts[3] || "";
      const sub = subParts[5] || "";

      const rekParts = (kdRek6 || "").split(".").filter(Boolean);
      return [
        urusanPart,
        kdSkpd || "",
        prog,
        keg,
        sub,
        rekParts[0] || "",
        rekParts[1] || "",
        rekParts[2] || "",
        rekParts[3] || "",
        rekParts[4] || "",
        rekParts[5] || "",
      ];
    };

    const emptyKodeCells = Array(11)
      .fill('<td class="kod"></td>')
      .join("");

    const saldoLaluRow =
      cfgBulan > 0
        ? `
        <tr>
          <td></td>
          <td></td>
          ${emptyKodeCells}
          <td><strong>SALDO BULAN LALU</strong></td>
          <td></td>
          <td></td>
          <td class="text-right">${formatNum(saldoLalu)}</td>
        </tr>`
        : "";

    const bodyRows = docs
      .map((h) => {
        const noUrut = String(h.no_bukti || "").split("/")[0] || "-";
        const tglStr = h.tgl_bukti
          ? new Date(h.tgl_bukti).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          : "-";

        const headerRow = `
          <tr class="tx-head">
            <td class="text-center">${noUrut}</td>
            <td class="text-center">${tglStr}</td>
            ${emptyKodeCells}
            <td><strong>${h.keterangan || h.no_bukti || "-"}</strong></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;

        const detailRows = (h.rincian || [])
          .map((d: any) => {
            const terima = Number(d.terima) || 0;
            const keluar = Number(d.keluar) || 0;
            const isTuNihilRow = [
              "TU_NIHIL",
              "TU-NIHIL",
              "GU_NIHIL",
              "GU-NIHIL",
            ].includes(
              String(d.jenis_beban || h.jenis_beban || "").toUpperCase()
            );
            runningSaldo += terima - keluar;
            totTerima += terima;
            totKeluar += keluar;

            const segs = splitKodeSegments(
              d.kd_sub_kegiatan,
              d.kd_rek6,
              h.kd_skpd || selectedOpd?.kd_skpd || ""
            );
            const kodeCells = segs
              .map((s) => `<td class="kod text-center">${s}</td>`)
              .join("");

            return `
              <tr>
                <td></td>
                <td></td>
                ${kodeCells}
                <td>${d.nm_rek6 || d.keterangan || "-"}</td>
                <td class="text-right">${terima > 0 ? formatNum(terima) : isTuNihilRow ? "Nihil" : ""}</td>
                <td class="text-right">${keluar > 0 ? formatNum(keluar) : ""}</td>
                <td class="text-right">${formatNum(runningSaldo)}</td>
              </tr>
            `;
          })
          .join("");

        return headerRow + detailRows;
      })
      .join("");

    const tahun = new Date().getFullYear();
    const periodeLabel = cfgBulan
      ? `PERIODE ${NAMA_BULAN[cfgBulan - 1].toUpperCase()} ${tahun}`
      : `PERIODE TAHUN ANGGARAN ${tahun}`;
    const kdSkpd = selectedOpd?.kd_skpd || "-";
    const urusanKode = kdSkpd !== "-" ? kdSkpd.split(".").slice(0, 2).join(".") : "-";
    const orgText = selectedOpd ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}` : "-";
    const unitText = selectedUnit
      ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
      : orgText;
    const paNamaText = cfgPaNama.trim() || "-";
    const bendNamaText = cfgBendaharaNama.trim() || "-";
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

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>BUKU KAS UMUM PENGELUARAN</title>
        <style>
          @page { size: ${cfgKertas}; margin: 10mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 9.5px; color: #000; margin: 0; padding: 10px; }
          .title-wrap { text-align: center; margin-bottom: 10px; }
          .title-wrap h1 { font-size: 12px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap h2 { font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap p { font-size: 10px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9.5px; }
          .meta td { padding: 1px 4px; vertical-align: top; }
          table.bku { width: 100%; border-collapse: collapse; font-size: 9px; }
          table.bku th, table.bku td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
          table.bku th { text-align: center; font-weight: bold; background: #fff; }
          table.bku td.kod { padding: 3px 2px; font-size: 8.5px; white-space: nowrap; }
          .text-right { text-align: right; white-space: nowrap; }
          .text-center { text-align: center; }
          .total-row td { font-weight: bold; background: #f9fafb; }
          .ttd { width: 100%; margin-top: 20px; page-break-inside: avoid; font-size: 9.5px; }
          .ttd td { width: 50%; text-align: center; vertical-align: top; }
          .ttd-space { height: 52px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="title-wrap">
          <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
          <h2>BUKU KAS UMUM PENGELUARAN</h2>
          <p>${periodeLabel}</p>
        </div>

        <table class="meta">
          <tr><td style="width:190px;">Urusan Pemerintahan</td><td>: ${urusanKode}</td></tr>
          <tr><td>Organisasi</td><td>: ${orgText}</td></tr>
          <tr><td>Unit/UPT</td><td>: ${unitText}</td></tr>
          <tr><td>Pengguna/Kuasa Pengguna Anggaran</td><td>: ${paNamaText}</td></tr>
          <tr><td>Bendahara Pengeluaran</td><td>: ${bendNamaText}</td></tr>
        </table>

        <table class="bku">
          <thead>
            <tr>
              <th style="width:52px;">NO<br/>URUT</th>
              <th style="width:66px;">TANGGAL</th>
              <th colspan="11">KODE REKENING</th>
              <th>URAIAN</th>
              <th style="width:88px;">PENERIMAAN</th>
              <th style="width:88px;">PENGELUARAN</th>
              <th style="width:92px;">SALDO</th>
            </tr>
            <tr>
              <th>1</th>
              <th>2</th>
              <th colspan="11">3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>7</th>
            </tr>
          </thead>
          <tbody>
            ${saldoLaluRow}
            ${bodyRows ||
      `<tr><td colspan="17" class="text-center">Belum ada data rekal transaksi pada periode ini.</td></tr>`
      }
            <tr class="total-row">
              <td colspan="14">Jumlah Bulan ini</td>
              <td class="text-right">${formatNum(totTerima)}</td>
              <td class="text-right">${formatNum(totKeluar)}</td>
              <td class="text-right">${formatNum(runningSaldo)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="14">Jumlah Sampai Bulan Lalu</td>
              <td class="text-right">${formatNum(terimaLalu)}</td>
              <td class="text-right">${formatNum(keluarLalu)}</td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td colspan="14">Jumlah s/d Bulan ini</td>
              <td class="text-right">${formatNum(terimaLalu + totTerima)}</td>
              <td class="text-right">${formatNum(keluarLalu + totKeluar)}</td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td colspan="14">Sisa Kas Pada Bulan ini</td>
              <td></td>
              <td class="text-right">${formatNum(runningSaldo)}</td>
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
              <div><strong>${cfgPaNama.trim() || "(....................................................)"}</strong></div>
              <div>${paNipText}</div>
            </td>
            <td>
              <div>${tempatText}, ${tglCetakFormatted}</div>
              <div><strong>${cfgBendaharaJabatan || "Bendahara Pengeluaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><strong>${cfgBendaharaNama.trim() || "(....................................................)"}</strong></div>
              <div>${bendNipText}</div>
            </td>
          </tr>
        </table>

        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleCetakFungsional = async () => {
    const win = window.open("", "_blank", "width=1280,height=820");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const tahun = new Date().getFullYear();
    const targetBulan = cfgBulan || 12; // jika semua bulan, s/d bulan 12

    // Fetch anggaran (trdrka) untuk SKPD / Unit ini
    let rkaRows: Array<{
      kd_program: string;
      nm_program: string;
      kd_kegiatan: string;
      nm_kegiatan: string;
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      kd_rek6: string;
      nm_rek6: string;
      anggaran: number;
    }> = [];
    try {
      const q = new URLSearchParams();
      q.set("action", "fungsional-anggaran");
      q.set("tahun", String(tahun));
      if (selectedOpd?.kd_skpd) q.set("kd_skpd", selectedOpd.kd_skpd);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/rekal?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        rkaRows = json.data.filter((r: any) =>
          String(r.kd_rek6 || "").startsWith("5")
        );
      }
    } catch {
      // lanjutkan walau anggaran gagal dimuat
    }

    type BucketCols = {
      gajiLalu: number;
      gajiIni: number;
      barjasLalu: number;
      barjasIni: number;
      upLalu: number;
      upIni: number;
    };

    const emptyBuckets = (): BucketCols => ({
      gajiLalu: 0,
      gajiIni: 0,
      barjasLalu: 0,
      barjasIni: 0,
      upLalu: 0,
      upIni: 0,
    });

    const addBucket = (b: BucketCols, kind: "GAJI" | "BARJAS" | "UP", isLalu: boolean, val: number) => {
      if (kind === "GAJI") {
        if (isLalu) b.gajiLalu += val;
        else b.gajiIni += val;
      } else if (kind === "BARJAS") {
        if (isLalu) b.barjasLalu += val;
        else b.barjasIni += val;
      } else {
        if (isLalu) b.upLalu += val;
        else b.upIni += val;
      }
    };

    const sumBuckets = (a: BucketCols, b: BucketCols): BucketCols => ({
      gajiLalu: a.gajiLalu + b.gajiLalu,
      gajiIni: a.gajiIni + b.gajiIni,
      barjasLalu: a.barjasLalu + b.barjasLalu,
      barjasIni: a.barjasIni + b.barjasIni,
      upLalu: a.upLalu + b.upLalu,
      upIni: a.upIni + b.upIni,
    });

    const classifyJenis = (jenis: string): "GAJI" | "BARJAS" | "UP" => {
      const j = (jenis || "").toUpperCase();
      if (j.includes("GAJI")) return "GAJI";
      if (j.includes("LS")) return "BARJAS";
      return "UP";
    };

    const classifyPajak = (kd: string, nm: string): "PPN" | "PPH21" | "PPH22" | "PPH23" | "LAIN" => {
      const text = `${kd} ${nm}`.toUpperCase();
      if (text.includes("PPN")) return "PPN";
      if (text.includes("21") || text.includes("PASAL 21")) return "PPH21";
      if (text.includes("22") || text.includes("PASAL 22")) return "PPH22";
      if (text.includes("23") || text.includes("PASAL 23")) return "PPH23";
      return "LAIN";
    };

    // Agregasi realisasi belanja (pengeluaran SPJ), penerimaan SP2D, pajak, pengembalian
    const spjMap = new Map<string, BucketCols>();
    const spjMetaMap = new Map<string, { kd_sub_kegiatan: string; nm_sub_kegiatan: string; kd_rek6: string; nm_rek6: string }>();

    const sp2dIn = emptyBuckets();
    const pengembalianIn = emptyBuckets();
    const pajakIn = {
      PPN: emptyBuckets(),
      PPH21: emptyBuckets(),
      PPH22: emptyBuckets(),
      PPH23: emptyBuckets(),
      LAIN: emptyBuckets(),
    };

    const setorPengembalianOut = emptyBuckets();
    const pajakOut = {
      PPN: emptyBuckets(),
      PPH21: emptyBuckets(),
      PPH22: emptyBuckets(),
      PPH23: emptyBuckets(),
      LAIN: emptyBuckets(),
    };

    for (const h of dataList) {
      const m = Number(h.bulan) || 0;
      if (cfgBulan > 0 && m > cfgBulan) continue;
      const isLalu = cfgBulan > 0 ? m < cfgBulan : false;

      for (const d of h.rincian || []) {
        const kdRek = String(d.kd_rek6 || "");
        // Data yang berkaitan dengan pendapatan (4.x) tidak ditampilkan pada SPJ Belanja Fungsional
        if (kdRek.startsWith("4")) continue;

        const jns = (d.jenis_beban || h.jenis_beban || "").toUpperCase();
        const terima = Number(d.terima) || 0;
        const keluar = Number(d.keluar) || 0;

        if (jns === "TRM_POT") {
          const pKey = classifyPajak(d.kd_rek6 || "", d.nm_rek6 || "");
          addBucket(pajakIn[pKey], "UP", isLalu, terima);
          continue;
        }
        if (jns === "STR_POT") {
          const pKey = classifyPajak(d.kd_rek6 || "", d.nm_rek6 || "");
          addBucket(pajakOut[pKey], "UP", isLalu, keluar);
          continue;
        }
        if (jns === "BELANJA") {
          if (terima > 0) addBucket(pengembalianIn, "UP", isLalu, terima);
          if (keluar > 0) addBucket(setorPengembalianOut, "UP", isLalu, keluar);
          continue;
        }
        // Setor Sisa Kas (trhkasin UP/GU/TU) menggunakan rekening kas (bukan rekening belanja 5.x)
        if (
          ["UP", "GU", "TU", "UP/GU/TU", "SISA_KAS"].includes(jns) &&
          keluar > 0 &&
          terima === 0 &&
          !kdRek.startsWith("5")
        ) {
          addBucket(setorPengembalianOut, "UP", isLalu, keluar);
          continue;
        }

        const bucketKind = classifyJenis(jns);

        // Penerimaan SP2D (trhtransin -> terima > 0)
        if (terima > 0) {
          addBucket(sp2dIn, bucketKind, isLalu, terima);
        }

        // Pengeluaran SPJ Belanja (trhtransout -> keluar > 0)
        if (keluar > 0) {
          const sub = d.kd_sub_kegiatan || "-";
          const rek = d.kd_rek6 || "-";
          const key = `${sub}__${rek}`;
          const cur = spjMap.get(key) || emptyBuckets();
          addBucket(cur, bucketKind, isLalu, keluar);
          spjMap.set(key, cur);
          if (!spjMetaMap.has(key)) {
            spjMetaMap.set(key, {
              kd_sub_kegiatan: sub,
              nm_sub_kegiatan: d.nm_sub_kegiatan || "-",
              kd_rek6: rek,
              nm_rek6: d.nm_rek6 || "-",
            });
          }
        }
      }
    }

    // Bangun struktur hierarki Program -> Kegiatan -> Sub Kegiatan -> Rekening
    type RekNode = {
      kd_rek6: string;
      nm_rek6: string;
      anggaran: number;
      b: BucketCols;
    };
    type SubNode = {
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      reks: RekNode[];
      anggaran: number;
      b: BucketCols;
    };
    type KegNode = {
      kd_kegiatan: string;
      nm_kegiatan: string;
      subs: Map<string, SubNode>;
      anggaran: number;
      b: BucketCols;
    };
    type ProgNode = {
      kd_program: string;
      nm_program: string;
      kegs: Map<string, KegNode>;
      anggaran: number;
      b: BucketCols;
    };

    const progMap = new Map<string, ProgNode>();
    const usedSpjKeys = new Set<string>();

    const ensureHierarchy = (
      kdProg: string,
      nmProg: string,
      kdKeg: string,
      nmKeg: string,
      kdSub: string,
      nmSub: string
    ) => {
      let prog = progMap.get(kdProg);
      if (!prog) {
        prog = {
          kd_program: kdProg,
          nm_program: nmProg,
          kegs: new Map(),
          anggaran: 0,
          b: emptyBuckets(),
        };
        progMap.set(kdProg, prog);
      }
      let keg = prog.kegs.get(kdKeg);
      if (!keg) {
        keg = {
          kd_kegiatan: kdKeg,
          nm_kegiatan: nmKeg,
          subs: new Map(),
          anggaran: 0,
          b: emptyBuckets(),
        };
        prog.kegs.set(kdKeg, keg);
      }
      let sub = keg.subs.get(kdSub);
      if (!sub) {
        sub = {
          kd_sub_kegiatan: kdSub,
          nm_sub_kegiatan: nmSub,
          reks: [],
          anggaran: 0,
          b: emptyBuckets(),
        };
        keg.subs.set(kdSub, sub);
      }
      return { prog, keg, sub };
    };

    for (const r of rkaRows) {
      const { prog, keg, sub } = ensureHierarchy(
        r.kd_program,
        r.nm_program,
        r.kd_kegiatan,
        r.nm_kegiatan,
        r.kd_sub_kegiatan,
        r.nm_sub_kegiatan
      );
      const key = `${r.kd_sub_kegiatan}__${r.kd_rek6}`;
      usedSpjKeys.add(key);
      const b = spjMap.get(key) || emptyBuckets();
      sub.reks.push({
        kd_rek6: r.kd_rek6,
        nm_rek6: r.nm_rek6,
        anggaran: r.anggaran,
        b,
      });
      sub.anggaran += r.anggaran;
      keg.anggaran += r.anggaran;
      prog.anggaran += r.anggaran;
      sub.b = sumBuckets(sub.b, b);
      keg.b = sumBuckets(keg.b, b);
      prog.b = sumBuckets(prog.b, b);
    }

    // Tambahkan SPJ yang tidak ada di RKA agar tetap muncul
    for (const [key, b] of spjMap.entries()) {
      if (usedSpjKeys.has(key)) continue;
      const meta = spjMetaMap.get(key)!;
      const subParts = meta.kd_sub_kegiatan.split(".");
      const kdProg = subParts.slice(0, 3).join(".") || "-";
      const kdKeg = subParts.slice(0, 5).join(".") || "-";
      const { prog, keg, sub } = ensureHierarchy(
        kdProg,
        `PROGRAM ${kdProg}`,
        kdKeg,
        `KEGIATAN ${kdKeg}`,
        meta.kd_sub_kegiatan,
        meta.nm_sub_kegiatan
      );
      sub.reks.push({
        kd_rek6: meta.kd_rek6,
        nm_rek6: meta.nm_rek6,
        anggaran: 0,
        b,
      });
      sub.b = sumBuckets(sub.b, b);
      keg.b = sumBuckets(keg.b, b);
      prog.b = sumBuckets(prog.b, b);
    }

    const render12Cols = (anggaran: number | null, b: BucketCols, showSisa = true) => {
      const gajiSd = b.gajiLalu + b.gajiIni;
      const barjasSd = b.barjasLalu + b.barjasIni;
      const upSd = b.upLalu + b.upIni;
      const totalSpj = gajiSd + barjasSd + upSd;
      const sisa = (anggaran || 0) - totalSpj;
      return `
        <td class="text-right">${anggaran !== null ? formatNum(anggaran) : ""}</td>
        <td class="text-right">${formatNum(b.gajiLalu)}</td>
        <td class="text-right">${formatNum(b.gajiIni)}</td>
        <td class="text-right">${formatNum(gajiSd)}</td>
        <td class="text-right">${formatNum(b.barjasLalu)}</td>
        <td class="text-right">${formatNum(b.barjasIni)}</td>
        <td class="text-right">${formatNum(barjasSd)}</td>
        <td class="text-right">${formatNum(b.upLalu)}</td>
        <td class="text-right">${formatNum(b.upIni)}</td>
        <td class="text-right">${formatNum(upSd)}</td>
        <td class="text-right">${formatNum(totalSpj)}</td>
        <td class="text-right">${showSisa && anggaran !== null ? formatNum(sisa) : ""}</td>
      `;
    };

    let totalAnggaranBelanja = 0;
    let totalSpjBelanja = emptyBuckets();
    const belanjaRowsHtml: string[] = [];

    for (const prog of progMap.values()) {
      totalAnggaranBelanja += prog.anggaran;
      totalSpjBelanja = sumBuckets(totalSpjBelanja, prog.b);
      belanjaRowsHtml.push(`
        <tr class="bold-row">
          <td class="font-mono">${prog.kd_program}</td>
          <td>${prog.nm_program}</td>
          ${render12Cols(prog.anggaran, prog.b, true)}
        </tr>
      `);
      for (const keg of prog.kegs.values()) {
        belanjaRowsHtml.push(`
          <tr class="bold-row">
            <td class="font-mono">${keg.kd_kegiatan}</td>
            <td>${keg.nm_kegiatan}</td>
            ${render12Cols(keg.anggaran, keg.b, true)}
          </tr>
        `);
        for (const sub of keg.subs.values()) {
          belanjaRowsHtml.push(`
            <tr class="bold-row">
              <td class="font-mono">${sub.kd_sub_kegiatan}</td>
              <td>${sub.nm_sub_kegiatan}</td>
              ${render12Cols(sub.anggaran, sub.b, true)}
            </tr>
          `);
          for (const rek of sub.reks) {
            belanjaRowsHtml.push(`
              <tr>
                <td class="font-mono">${sub.kd_sub_kegiatan}.${rek.kd_rek6}</td>
                <td>${rek.nm_rek6}</td>
                ${render12Cols(rek.anggaran, rek.b, true)}
              </tr>
            `);
          }
        }
      }
    }

    // Total Penerimaan & Total Pengeluaran
    const totalPenerimaanBuckets = [
      sp2dIn,
      pajakIn.PPN,
      pajakIn.PPH21,
      pajakIn.PPH22,
      pajakIn.PPH23,
      pajakIn.LAIN,
      pengembalianIn,
    ].reduce(sumBuckets, emptyBuckets());

    const totalPengeluaranBuckets = [
      totalSpjBelanja,
      pajakOut.PPN,
      pajakOut.PPH21,
      pajakOut.PPH22,
      pajakOut.PPH23,
      pajakOut.LAIN,
      setorPengembalianOut,
    ].reduce(sumBuckets, emptyBuckets());

    const grandTerima =
      totalPenerimaanBuckets.gajiLalu +
      totalPenerimaanBuckets.gajiIni +
      totalPenerimaanBuckets.barjasLalu +
      totalPenerimaanBuckets.barjasIni +
      totalPenerimaanBuckets.upLalu +
      totalPenerimaanBuckets.upIni;
    const grandKeluar =
      totalPengeluaranBuckets.gajiLalu +
      totalPengeluaranBuckets.gajiIni +
      totalPengeluaranBuckets.barjasLalu +
      totalPengeluaranBuckets.barjasIni +
      totalPengeluaranBuckets.upLalu +
      totalPengeluaranBuckets.upIni;
    const saldoKasAkhir = grandTerima - grandKeluar;

    const bulanHeaderLabel = cfgBulan
      ? NAMA_BULAN[cfgBulan - 1].toUpperCase()
      : "SEMUA BULAN";
    const orgText = selectedOpd
      ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}`
      : "-";
    const unitText = selectedUnit
      ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
      : orgText;
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

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>SPJ BELANJA FUNGSIONAL</title>
        <style>
          @page { size: ${cfgKertas}; margin: 8mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 8.5px; color: #000; margin: 0; padding: 8px; }
          .title-wrap { text-align: center; margin-bottom: 8px; }
          .title-wrap h1 { font-size: 11px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap h2 { font-size: 10.5px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap p { font-size: 9.5px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .meta { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8.5px; }
          .meta td { padding: 1px 4px; vertical-align: top; }
          table.spj { width: 100%; border-collapse: collapse; font-size: 8px; }
          table.spj th, table.spj td { border: 1px solid #000; padding: 2.5px 3.5px; vertical-align: top; }
          table.spj th { text-align: center; font-weight: bold; background: #fff; }
          .text-right { text-align: right; white-space: nowrap; }
          .text-center { text-align: center; }
          .font-mono { white-space: nowrap; }
          .bold-row td { font-weight: bold; }
          .section-row td { font-weight: bold; background: #f3f4f6; }
          .ttd { width: 100%; margin-top: 18px; page-break-inside: avoid; font-size: 8.5px; }
          .ttd td { width: 50%; text-align: center; vertical-align: top; }
          .ttd-space { height: 48px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="title-wrap">
          <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
          <h2>LAPORAN PERTANGGUNGJAWABAN BENDAHARA PENGELUARAN</h2>
          <p>(SPJ BELANJA FUNGSIONAL)</p>
        </div>

        <table class="meta">
          <tr><td style="width:190px;">SKPD/OPD</td><td>: ${orgText}</td></tr>
          <tr><td>Unit/UPT</td><td>: ${unitText}</td></tr>
          <tr><td>Pengguna/Kuasa Pengguna Anggaran</td><td>: ${cfgPaNama.trim() || "-"}</td></tr>
          <tr><td>Bendahara Pengeluaran</td><td>: ${cfgBendaharaNama.trim() || "-"}</td></tr>
          <tr><td>Tahun Anggaran</td><td>: ${tahun}</td></tr>
          <tr><td>Bulan</td><td>: ${bulanHeaderLabel}</td></tr>
        </table>

        <table class="spj">
          <thead>
            <tr>
              <th rowspan="2" style="width:115px;">KODE<br/>REKENING</th>
              <th rowspan="2">URAIAN</th>
              <th rowspan="2" style="width:72px;">JUMLAH<br/>ANGGARAN<br/>(Rp)</th>
              <th colspan="3">SPJ LS GAJI (Rp)</th>
              <th colspan="3">SPJ LS BARANG &amp; JASA (Rp)</th>
              <th colspan="3">SPJ (UP/GU/TU) (Rp)</th>
              <th rowspan="2" style="width:72px;">TOTAL SPJ<br/>(LS+UP/GU/TU)<br/>(Rp)</th>
              <th rowspan="2" style="width:72px;">SISA ANGGARAN<br/>(Rp)</th>
            </tr>
            <tr>
              <th style="width:58px;">S/D BULAN LALU</th>
              <th style="width:58px;">BULAN INI</th>
              <th style="width:58px;">S/D BULAN INI</th>
              <th style="width:58px;">S/D BULAN LALU</th>
              <th style="width:58px;">BULAN INI</th>
              <th style="width:58px;">S/D BULAN INI</th>
              <th style="width:58px;">S/D BULAN LALU</th>
              <th style="width:58px;">BULAN INI</th>
              <th style="width:58px;">S/D BULAN INI</th>
            </tr>
            <tr>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>7</th>
              <th>8</th>
              <th>9</th>
              <th>10</th>
              <th>11</th>
              <th>12</th>
              <th>13 = 6+9+12</th>
              <th>14</th>
            </tr>
          </thead>
          <tbody>
            ${belanjaRowsHtml.join("") ||
      `<tr><td colspan="14" class="text-center">Belum ada data belanja pada periode ini (s/d bulan ${targetBulan}).</td></tr>`
      }
            <tr class="section-row">
              <td></td>
              <td>JUMLAH BELANJA</td>
              ${render12Cols(totalAnggaranBelanja, totalSpjBelanja, true)}
            </tr>

            <tr class="section-row">
              <td></td>
              <td colspan="13">PENERIMAAN</td>
            </tr>
            <tr>
              <td></td>
              <td>SP2D</td>
              ${render12Cols(null, sp2dIn, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPN</td>
              ${render12Cols(null, pajakIn.PPN, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 21</td>
              ${render12Cols(null, pajakIn.PPH21, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 22</td>
              ${render12Cols(null, pajakIn.PPH22, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 23</td>
              ${render12Cols(null, pajakIn.PPH23, false)}
            </tr>
            <tr>
              <td></td>
              <td>LAIN-LAIN</td>
              ${render12Cols(null, pajakIn.LAIN, false)}
            </tr>
            <tr>
              <td></td>
              <td>PENERIMAAN PENGEMBALIAN</td>
              ${render12Cols(null, pengembalianIn, false)}
            </tr>
            <tr class="section-row">
              <td></td>
              <td>JUMLAH PENERIMAAN</td>
              ${render12Cols(null, totalPenerimaanBuckets, false)}
            </tr>

            <tr class="section-row">
              <td></td>
              <td colspan="13">PENGELUARAN</td>
            </tr>
            <tr>
              <td></td>
              <td>SPJ (LS + UP/GU/TU)</td>
              ${render12Cols(null, totalSpjBelanja, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPN</td>
              ${render12Cols(null, pajakOut.PPN, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 21</td>
              ${render12Cols(null, pajakOut.PPH21, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 22</td>
              ${render12Cols(null, pajakOut.PPH22, false)}
            </tr>
            <tr>
              <td></td>
              <td>PPH 23</td>
              ${render12Cols(null, pajakOut.PPH23, false)}
            </tr>
            <tr>
              <td></td>
              <td>LAIN-LAIN</td>
              ${render12Cols(null, pajakOut.LAIN, false)}
            </tr>
            <tr>
              <td></td>
              <td>PENYETORAN PENGEMBALIAN PENGELUARAN PENUH</td>
              ${render12Cols(null, setorPengembalianOut, false)}
            </tr>
            <tr class="section-row">
              <td></td>
              <td>JUMLAH PENGELUARAN</td>
              ${render12Cols(null, totalPengeluaranBuckets, false)}
            </tr>
            <tr class="section-row">
              <td colspan="13">SALDO KAS</td>
              <td class="text-right">${formatNum(saldoKasAkhir)}</td>
            </tr>
          </tbody>
        </table>

        <table class="ttd">
          <tr>
            <td>
              <div>Mengetahui,</div>
              <div><strong>${cfgPaJabatan || "Pengguna Anggaran / Kuasa Pengguna Anggaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><strong>${cfgPaNama.trim() || "(....................................................)"}</strong></div>
              <div>${paNipText}</div>
            </td>
            <td>
              <div>${tempatText}, ${tglCetakFormatted}</div>
              <div><strong>${cfgBendaharaJabatan || "Bendahara Pengeluaran"}</strong></div>
              <div class="ttd-space"></div>
              <div><strong>${cfgBendaharaNama.trim() || "(....................................................)"}</strong></div>
              <div>${bendNipText}</div>
            </td>
          </tr>
        </table>

        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleCetakBukuPajak = () => {
    const rows = getFilteredDetails().filter((r) =>
      ["TRM_POT", "STR_POT"].includes((r.jenis_beban || "").toUpperCase())
    );
    let runningSaldo = 0;
    let totTerima = 0;
    let totKeluar = 0;

    const trs = rows
      .map((r, idx) => {
        runningSaldo += r.terima - r.keluar;
        totTerima += r.terima;
        totKeluar += r.keluar;
        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${new Date(r.tgl_bukti).toLocaleDateString("id-ID")}</td>
            <td class="font-mono">${r.no_bukti}</td>
            <td class="font-mono">${r.kd_rek6}</td>
            <td>${r.nm_rek6} - ${r.uraian}</td>
            <td class="text-right font-mono">${formatNum(r.terima)}</td>
            <td class="text-right font-mono">${formatNum(r.keluar)}</td>
            <td class="text-right font-mono">${formatNum(runningSaldo)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <table class="report">
        <thead>
          <tr>
            <th style="width:32px;">No</th>
            <th style="width:78px;">Tanggal</th>
            <th style="width:130px;">No. Bukti</th>
            <th style="width:105px;">Kode Pajak</th>
            <th>Uraian Pemotongan / Penyetoran Pajak</th>
            <th style="width:110px;">Pemotongan (Rp)</th>
            <th style="width:110px;">Penyetoran (Rp)</th>
            <th style="width:115px;">Saldo (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${trs || `<tr><td colspan="8" class="text-center">Belum ada transaksi pajak (TRM_POT / STR_POT) pada periode ini.</td></tr>`}
          <tr class="total-row">
            <td colspan="5" class="text-right">JUMLAH PAJAK</td>
            <td class="text-right font-mono">${formatNum(totTerima)}</td>
            <td class="text-right font-mono">${formatNum(totKeluar)}</td>
            <td class="text-right font-mono">${formatNum(totTerima - totKeluar)}</td>
          </tr>
        </tbody>
      </table>
    `;
    openPrintWindow(
      "BUKU PEMBANTU PAJAK",
      "Pemotongan dan Penyetoran Pajak Bendahara Pengeluaran",
      html
    );
  };

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

    const anggaranApbd = anggaranPreview.apbd;
    const anggaranPapbd = anggaranPreview.papbd;
    const activeAnggaran =
      cfgJenisAnggaran === "PAPBD" ? anggaranPapbd : anggaranApbd;

    const isBelanjaRow = (d: any, h: any) => {
      const kdRek = String(d.kd_rek6 || "");
      const jns = String(d.jenis_beban || h.jenis_beban || "").toUpperCase();
      if (!kdRek.startsWith("5")) return false;
      if (["TRM_POT", "STR_POT", "BELANJA", "SISA_KAS"].includes(jns))
        return false;
      if (cfgSubKegiatan && d.kd_sub_kegiatan !== cfgSubKegiatan) return false;
      if (cfgRek6 && kdRek !== cfgRek6) return false;
      return (Number(d.keluar) || 0) > 0;
    };

    const isLsJenis = (jns: string) =>
      String(jns || "").toUpperCase().includes("LS");

    // 1. Akumulasi s/d periode lalu (bulan < cfgBulan)
    let lsLalu = 0;
    let upLalu = 0;
    if (cfgBulan > 1) {
      for (const h of dataList) {
        if (Number(h.bulan) < cfgBulan) {
          for (const d of h.rincian || []) {
            if (!isBelanjaRow(d, h)) continue;
            const val = Number(d.keluar) || 0;
            const jns = String(d.jenis_beban || h.jenis_beban || "");
            if (isLsJenis(jns)) lsLalu += val;
            else upLalu += val;
          }
        }
      }
    }

    // 2. Transaksi periode ini (cfgBulan === 0 berarti semua bulan)
    const detailRows: Array<{
      no_bukti: string;
      tgl_bukti: string;
      uraian: string;
      ls: number;
      up: number;
    }> = [];

    for (const h of dataList) {
      if (cfgBulan > 0 && Number(h.bulan) !== cfgBulan) continue;
      for (const d of h.rincian || []) {
        if (!isBelanjaRow(d, h)) continue;
        const val = Number(d.keluar) || 0;
        const jns = String(d.jenis_beban || h.jenis_beban || "");
        const ls = isLsJenis(jns) ? val : 0;
        const up = isLsJenis(jns) ? 0 : val;
        detailRows.push({
          no_bukti: d.no_bukti || h.no_bukti || "-",
          tgl_bukti: d.tgl_bukti || h.tgl_bukti,
          uraian: d.keterangan || h.keterangan || d.nm_rek6 || "-",
          ls,
          up,
        });
      }
    }

    detailRows.sort((a, b) => {
      const da = new Date(a.tgl_bukti).getTime();
      const db = new Date(b.tgl_bukti).getTime();
      if (da !== db) return da - db;
      return a.no_bukti.localeCompare(b.no_bukti);
    });

    let totLs = 0;
    let totUp = 0;
    const trsHtml = detailRows
      .map((r) => {
        totLs += r.ls;
        totUp += r.up;
        const jml = r.ls + r.up;
        const tglStr = r.tgl_bukti
          ? new Date(r.tgl_bukti).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          : "-";
        return `
          <tr>
            <td class="text-center font-mono">${r.no_bukti}</td>
            <td class="text-center">${tglStr}</td>
            <td>${r.uraian}</td>
            <td class="text-right">${formatNum(r.ls)}</td>
            <td class="text-right">${formatNum(r.up)}</td>
            <td class="text-right">${formatNum(jml)}</td>
          </tr>
        `;
      })
      .join("");

    const totPeriodeIni = totLs + totUp;
    const totLalu = lsLalu + upLalu;
    const lsSdIni = lsLalu + totLs;
    const upSdIni = upLalu + totUp;
    const totSdIni = lsSdIni + upSdIni;
    const sisaAnggaran = activeAnggaran - totSdIni;

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
    const logoUrl = `${window.location.origin}/logo_tapsel.png`;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>BUKU PEMBANTU RINCIAN OBJEK BELANJA</title>
        <style>
          @page { size: ${cfgKertas}; margin: 10mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 9.5px; color: #000; margin: 0; padding: 10px; }
          .header-wrap { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 10px; min-height: 54px; }
          .header-logo { position: absolute; left: 120px; top: 0; height: 50px; width: auto; object-fit: contain; }
          .header-text { text-align: center; }
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
        <div class="header-wrap">
          <div class="header-text">
            <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
            <h2>BUKU PEMBANTU RINCIAN OBJEK BELANJA</h2>
            <p>TAHUN ANGGARAN ${tahun}</p>
          </div>
        </div>

        <table class="meta">
          <tr><td style="width:130px;">Organisasi</td><td>: ${orgText}</td></tr>
          <tr><td>Unit/UPT</td><td>: ${unitText}</td></tr>
          <tr><td>Kegiatan</td><td>: ${kegiatanLabel}</td></tr>
          <tr><td>Rekening</td><td>: ${rekeningLabel}</td></tr>
          <tr><td>Periode</td><td>: ${periodeLabel}</td></tr>
          <tr><td>Anggaran APBD</td><td>: Rp. ${formatNum(anggaranApbd)}</td></tr>
          <tr><td>Anggaran PAPBD</td><td>: Rp. ${formatNum(anggaranPapbd)}</td></tr>
        </table>

        <table class="rob">
          <thead>
            <tr>
              <th rowspan="2" style="width:140px;">Nomor<br/>BKU</th>
              <th rowspan="2" style="width:72px;">Tanggal</th>
              <th rowspan="2">Uraian</th>
              <th colspan="3">Pengeluaran (Rp)</th>
            </tr>
            <tr>
              <th style="width:95px;">LS</th>
              <th style="width:95px;">UP/GU/TU</th>
              <th style="width:95px;">Jumlah</th>
            </tr>
            <tr>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6=4+5</th>
            </tr>
          </thead>
          <tbody>
            ${trsHtml ||
      `<tr><td colspan="6" class="text-center">Belum ada transaksi rincian objek belanja pada periode ini.</td></tr>`
      }
            <tr class="italic-bold">
              <td colspan="3">Jumlah</td>
              <td class="text-right">${formatNum(totLs)}</td>
              <td class="text-right">${formatNum(totUp)}</td>
              <td class="text-right">${formatNum(totPeriodeIni)}</td>
            </tr>
            <tr class="italic-bold">
              <td colspan="3">Jumlah s/d periode lalu</td>
              <td class="text-right">${formatNum(lsLalu)}</td>
              <td class="text-right">${formatNum(upLalu)}</td>
              <td class="text-right">${formatNum(totLalu)}</td>
            </tr>
            <tr class="italic-bold">
              <td colspan="3">Jumlah s/d periode ini</td>
              <td class="text-right">${formatNum(lsSdIni)}</td>
              <td class="text-right">${formatNum(upSdIni)}</td>
              <td class="text-right">${formatNum(totSdIni)}</td>
            </tr>
            <tr class="italic-bold">
              <td colspan="3">Sisa Anggaran (${cfgJenisAnggaran})</td>
              <td></td>
              <td></td>
              <td class="text-right">${formatNum(sisaAnggaran)}</td>
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

        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleCetakDth = async () => {
    const win = window.open("", "_blank", "width=1300,height=820");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const tahun = new Date().getFullYear();
    let dthRows: Array<{
      no_spm: string;
      nilai_spm: number;
      no_sp2d: string;
      nilai_sp2d: number;
      kd_rek6: string;
      pajak_kd_rek6: string;
      pajak_nm_rek6: string;
      pajak_jumlah: number;
      npwp: string;
      rekanan: string;
      id_billing: string;
      ntpn: string;
      keterangan: string;
    }> = [];

    try {
      const q = new URLSearchParams();
      q.set("action", "dth-data");
      q.set("tahun", String(tahun));
      if (selectedOpd?.id) q.set("opdId", selectedOpd.id);
      if (selectedUnit?.kd_unit) q.set("kd_unit", selectedUnit.kd_unit);
      if (cfgBulan > 0) q.set("bulan", String(cfgBulan));
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/rekal?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        dthRows = json.data;
      }
    } catch {
      // tetap render meski gagal fetch
    }

    let totSpm = 0;
    let totSp2d = 0;
    let totPajak = 0;

    const trsHtml = dthRows
      .map((r) => {
        totSpm += r.nilai_spm || 0;
        totSp2d += r.nilai_sp2d || 0;
        totPajak += r.pajak_jumlah || 0;
        return `
          <tr>
            <td class="font-mono">${r.no_spm}</td>
            <td class="text-right">${formatNum(r.nilai_spm)}</td>
            <td class="font-mono">${r.no_sp2d}</td>
            <td class="text-right">${formatNum(r.nilai_sp2d)}</td>
            <td class="text-center font-mono">${r.kd_rek6}</td>
            <td class="text-center font-mono">${r.pajak_kd_rek6 || ""}</td>
            <td>${r.pajak_nm_rek6 || ""}</td>
            <td class="text-right">${formatNum(r.pajak_jumlah)}</td>
            <td class="text-center font-mono">${r.npwp || "-"}</td>
            <td>${r.rekanan || "-"}</td>
            <td class="text-center font-mono">${r.id_billing || ""}</td>
            <td class="text-center font-mono">${r.ntpn || ""}</td>
            <td>${r.keterangan || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const kdSkpd = selectedOpd?.kd_skpd || "-";
    const urusanKode = kdSkpd !== "-" ? kdSkpd.split(".").slice(0, 2).join(".") : "-";
    const orgText = selectedOpd
      ? `${selectedOpd.kd_skpd} - ${selectedOpd.nm_skpd}`
      : "-";
    const unitText = selectedUnit
      ? `${selectedUnit.kd_unit} - ${selectedUnit.nm_unit}`
      : orgText;
    const bulanLabel = cfgBulan
      ? `BULAN ${NAMA_BULAN[cfgBulan - 1].toUpperCase()}`
      : "SEMUA BULAN";

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

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>DAFTAR TRANSAKSI HARIAN BELANJA DAERAH (DTH)</title>
        <style>
          @page { size: ${cfgKertas}; margin: 8mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 8.5px; color: #000; margin: 0; padding: 8px; }
          .title-wrap { text-align: center; margin-bottom: 8px; }
          .title-wrap h1 { font-size: 11px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap h2 { font-size: 10.5px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap p { font-size: 9.5px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5px; }
          .meta td { padding: 1px 4px; vertical-align: top; }
          table.dth { width: 100%; border-collapse: collapse; font-size: 7.8px; }
          table.dth th, table.dth td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
          table.dth th { text-align: center; font-weight: bold; background: #fff; }
          .text-right { text-align: right; white-space: nowrap; }
          .text-center { text-align: center; }
          .font-mono { white-space: nowrap; }
          .total-row td { font-weight: bold; background: #f9fafb; }
          .ttd { width: 100%; margin-top: 18px; page-break-inside: avoid; font-size: 8.5px; }
          .ttd td { width: 50%; text-align: center; vertical-align: top; }
          .ttd-space { height: 48px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="title-wrap">
          <h1>DAFTAR TRANSAKSI HARIAN BELANJA DAERAH (DTH)</h1>
          <h2>PEMERINTAH KABUPATEN TAPANULI SELATAN</h2>
          <p>${bulanLabel}<br/>TAHUN ANGGARAN ${tahun}</p>
        </div>

        <table class="meta">
          <tr><td style="width:190px;">Urusan Pemerintahan</td><td>: ${urusanKode}</td></tr>
          <tr><td>Organisasi</td><td>: ${orgText}</td></tr>
          <tr><td>Unit/UPT</td><td>: ${unitText}</td></tr>
          <tr><td>Pengguna/Kuasa Pengguna Anggaran</td><td>: ${cfgPaNama.trim() || "-"}</td></tr>
          <tr><td>Bendahara Pengeluaran</td><td>: ${cfgBendaharaNama.trim() || "-"}</td></tr>
        </table>

        <table class="dth">
          <thead>
            <tr>
              <th colspan="2">SPM/SPD</th>
              <th colspan="2">SP2D</th>
              <th rowspan="2" style="width:82px;">Kode Akun<br/>Belanja</th>
              <th colspan="3">Potongan Pajak</th>
              <th rowspan="2" style="width:85px;">NPWP</th>
              <th rowspan="2" style="width:105px;">Rekanan</th>
              <th rowspan="2" style="width:80px;">Billing</th>
              <th rowspan="2" style="width:80px;">NTPN</th>
              <th rowspan="2">Keterangan</th>
            </tr>
            <tr>
              <th style="width:125px;">Nomor</th>
              <th style="width:72px;">Nilai</th>
              <th style="width:125px;">SP2D</th>
              <th style="width:72px;">Nilai</th>
              <th style="width:72px;">Kode Akun</th>
              <th style="width:80px;">Jenis Akun</th>
              <th style="width:68px;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${trsHtml ||
      `<tr><td colspan="13" class="text-center">Belum ada transaksi belanja / pajak pada periode ini.</td></tr>`
      }
            <tr class="total-row">
              <td class="text-right">JUMLAH</td>
              <td class="text-right">${formatNum(totSpm)}</td>
              <td></td>
              <td class="text-right">${formatNum(totSp2d)}</td>
              <td colspan="3"></td>
              <td class="text-right">${formatNum(totPajak)}</td>
              <td colspan="5"></td>
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

        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    setSubmitting(true);
    try {
      const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/rekal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opdId: selectedOpd.id,
          kd_unit: selectedUnit?.kd_unit || undefined,
          nm_unit: selectedUnit?.nm_unit || undefined,
          unitKerjaId: selectedUnit?.id || undefined,
          bulan: Number(bulan),
          keterangan:
            keterangan ||
            `Rekal Transaksi Kas Bulan ${NAMA_BULAN[bulan - 1]} - ${selectedOpd.nm_skpd}`,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal melakukan rekal transaksi");
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards: Penerimaan, Pengeluaran, Saldo Kas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-teal-700 uppercase">
            Jumlah Penerimaan
          </span>
          <div className="text-lg font-mono font-bold text-teal-700 mt-1">
            {formatRupiah(summary.penerimaan)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-700 uppercase">
            Jumlah Pengeluaran
          </span>
          <div className="text-lg font-mono font-bold text-rose-700 mt-1">
            {formatRupiah(summary.pengeluaran)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase">
            Saldo Kas
          </span>
          <div
            className={`text-lg font-mono font-bold mt-1 ${summary.saldo < 0 ? "text-rose-700" : "text-indigo-700"
              }`}
          >
            {formatRupiah(summary.saldo)}
          </div>
        </div>
      </div>

      {/* Top action bar & Cetak Laporan */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Rekal &amp; Sinkronisasi Transaksi
            </h3>
            <p className="text-xs text-gray-500">
              Total {summary.docCount} dokumen rekal transaksi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Bulan untuk Summary & Cetak */}


          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Muat Ulang
          </button>
          <button
            onClick={() => {
              setKeterangan("");
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Rekal Transaksi
          </button>
        </div>
      </div>

      {/* Cetak Laporan Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Printer className="w-4 h-4 text-[#5E0E14]" />
          <span>Cetak Laporan Penatausahaan:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCfgBulan(printBulan);
              setPrintDialogType("BKU");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Buku Kas Umum</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCfgBulan(printBulan);
              setPrintDialogType("DTH");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Data Transaksi Harian (DTH)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCfgBulan(printBulan);
              setPrintDialogType("FUNGSIONAL");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Fungsional Belanja</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCfgBulan(printBulan);
              setPrintDialogType("PAJAK");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Buku Pajak</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCfgBulan(printBulan);
              setPrintDialogType("RINCIAN_OBJEK");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-[#88131A] border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Buku Rincian Objek Belanja</span>
          </button>
        </div>
      </div>

      {/* Grafik Batang Penerimaan, Pengeluaran, Saldo per Bulan (persis ApbdDashboardView) */}
      <div className="w-full bg-white rounded-3xl border border-blue-200/80 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
        {/* Header Grafik & Legenda Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            Grafik Rekal &amp; Sinkronisasi Kas
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Penerimaan</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>Pengeluaran</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>Saldo</span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex flex-col items-center justify-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-slate-400" />
            Memuat grafik rekal transaksi...
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[820px] pt-4 pb-2">
              <div className="flex">
                {/* Sumbu Y Labels */}
                <div className="w-16 shrink-0 flex flex-col justify-between text-[11px] font-semibold text-slate-400 pr-3 h-72 select-none">
                  {chartScale.ticks.map((t, i) => (
                    <div key={i} className="leading-none">
                      {t.label}
                    </div>
                  ))}
                </div>

                {/* Plot Area dengan Grid & 12 Kelompok Bulan */}
                <div className="flex-1 relative h-72">
                  {/* Garis Horizontal Grid */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {chartScale.ticks.map((_, i) => (
                      <div
                        key={i}
                        className={`w-full border-b ${i === chartScale.ticks.length - 1
                          ? "border-slate-200"
                          : "border-dashed border-slate-100"
                          }`}
                      />
                    ))}
                  </div>

                  {/* 12 Kelompok Bulan */}
                  <div className="relative z-10 h-full grid grid-cols-12 gap-1.5 items-end px-2">
                    {chartData.map((m) => {
                      const isActive = selectedMonth === m.bulanNum;
                      const bars = [
                        {
                          id: "penerimaan",
                          label: "Penerimaan",
                          val: m.penerimaan,
                          textColor: "text-emerald-800",
                          barClass:
                            "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-700 shadow-sm shadow-emerald-500/20",
                        },
                        {
                          id: "pengeluaran",
                          label: "Pengeluaran",
                          val: m.pengeluaran,
                          textColor: "text-rose-800",
                          barClass:
                            "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-700 shadow-sm shadow-rose-500/20",
                        },
                        {
                          id: "saldo",
                          label: "Saldo",
                          val: Math.max(m.saldo, 0),
                          rawVal: m.saldo,
                          textColor:
                            m.saldo < 0 ? "text-rose-700" : "text-indigo-900",
                          barClass:
                            "bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-700 shadow-sm shadow-indigo-500/20",
                        },
                      ];

                      return (
                        <div
                          key={m.bulanNum}
                          onClick={() => setSelectedMonth(m.bulanNum)}
                          className="h-full flex flex-col justify-end items-center cursor-pointer group border-r last:border-r-0 border-dashed border-slate-100 px-1"
                        >
                          <div className="w-full h-full flex items-end justify-center gap-1">
                            {bars.map((b) => {
                              const rawPct =
                                chartScale.maxAxis > 0
                                  ? (b.val / chartScale.maxAxis) * 100
                                  : 0;
                              const heightPct =
                                b.val > 0 ? Math.max(rawPct, 10) : 2;
                              const displayVal =
                                b.rawVal !== undefined ? b.rawVal : b.val;

                              return (
                                <div
                                  key={b.id}
                                  className="flex-1 max-w-[22px] h-full flex flex-col justify-end items-center"
                                  title={`${NAMA_BULAN[m.bulanNum - 1]} — ${b.label}: ${formatRupiahDesimal(
                                    displayVal
                                  )}`}
                                >
                                  <span
                                    className={`text-[9px] font-extrabold mb-1 whitespace-nowrap ${b.textColor}`}
                                  >
                                    {formatShortId(displayVal)}
                                  </span>
                                  <div
                                    className={`w-full rounded-t-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${b.barClass
                                      } ${isActive
                                        ? "opacity-100"
                                        : "opacity-85 group-hover:opacity-100"
                                      }`}
                                    style={{ height: `${heightPct}%` }}
                                  >
                                    {heightPct >= 26 && (
                                      <span
                                        className="text-[9px] font-bold text-white/95 whitespace-nowrap select-none tracking-wide"
                                        style={{
                                          writingMode: "vertical-rl",
                                          transform: "rotate(180deg)",
                                        }}
                                      >
                                        {b.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Label Sumbu X (Jan - Des) */}
              <div className="flex mt-3">
                <div className="w-16 shrink-0" />
                <div className="flex-1 grid grid-cols-12 gap-1.5 text-center px-2">
                  {chartData.map((m) => {
                    const isActive = selectedMonth === m.bulanNum;
                    return (
                      <button
                        key={m.bulanNum}
                        type="button"
                        onClick={() => setSelectedMonth(m.bulanNum)}
                        className={`text-xs font-bold py-1 rounded-lg transition-colors cursor-pointer ${isActive
                          ? "text-slate-900 bg-slate-100"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        {m.bulan}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Box Ringkasan Bulan Terpilih di Bawah Grafik */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0 bg-indigo-600" />
            <div>
              <div className="text-[11px] font-medium text-slate-400">
                Bulan terpilih
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900">
                {NAMA_BULAN[(selectedMonthData?.bulanNum || 1) - 1]}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <div className="text-[11px] font-medium text-slate-400">
                Penerimaan
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono mt-0.5">
                {formatRupiahDesimal(selectedMonthData?.penerimaan || 0, false)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">
                Pengeluaran
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-rose-700 font-mono mt-0.5">
                {formatRupiahDesimal(selectedMonthData?.pengeluaran || 0, false)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">
                Saldo Kas
              </div>
              <div
                className={`text-xs sm:text-sm font-extrabold font-mono mt-0.5 ${(selectedMonthData?.saldo || 0) < 0
                  ? "text-rose-700"
                  : "text-indigo-700"
                  }`}
              >
                {formatRupiahDesimal(selectedMonthData?.saldo || 0, false)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Input Rekal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">
                  Posting Rekal Transaksi Kas Bendahara
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}


              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pilih Bulan Transaksi <span className="text-red-500">*</span>
                </label>
                <select
                  value={bulan}
                  onChange={(e) => setBulan(parseInt(e.target.value, 10))}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                >
                  {NAMA_BULAN.map((nm, i) => (
                    <option key={i + 1} value={i + 1}>
                      Bulan {i + 1} - {nm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan Rekal
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder={`Rekal Transaksi Kas Bulan ${NAMA_BULAN[bulan - 1]}...`}
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Eksekusi Rekal Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfigurasi / Parameter Cetak */}
      {printDialogType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`bg-white rounded-xl shadow-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] ${printDialogType === "RINCIAN_OBJEK" ? "max-w-2xl" : "max-w-lg"
              }`}
          >
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  Parameter Cetak{" "}
                  {printDialogType === "BKU"
                    ? "Buku Kas Umum (BKU)"
                    : printDialogType === "FUNGSIONAL"
                      ? "SPJ Fungsional"
                      : printDialogType === "PAJAK"
                        ? "Buku Pembantu Pajak"
                        : printDialogType === "DTH"
                          ? "Daftar Transaksi Harian (DTH)"
                          : "Buku Rincian Objek Belanja"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintDialogType(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const type = printDialogType;
                setPrintDialogType(null);
                if (type === "BKU") handleCetakBku();
                else if (type === "FUNGSIONAL") handleCetakFungsional();
                else if (type === "PAJAK") handleCetakBukuPajak();
                else if (type === "RINCIAN_OBJEK") handleCetakRincianObjek();
                else if (type === "DTH") handleCetakDth();
              }}
              className="p-5 space-y-4 overflow-y-auto"
            >
              {printDialogType === "RINCIAN_OBJEK" && (
                <div className="space-y-3 rounded-xl border border-rose-200/80 bg-rose-50/40 p-4">
                  <p className="text-[11px] font-bold text-[#88131A] uppercase">
                    Filter Sub Kegiatan, Rekening &amp; Jenis Anggaran
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

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Pilihan Anggaran
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${cfgJenisAnggaran === "APBD"
                          ? "border-[#5E0E14] bg-white font-bold text-[#5E0E14]"
                          : "border-gray-200 bg-white/70 text-gray-700"
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cfgJenisAnggaran"
                            value="APBD"
                            checked={cfgJenisAnggaran === "APBD"}
                            onChange={() => setCfgJenisAnggaran("APBD")}
                            className="accent-[#5E0E14]"
                          />
                          APBD / Murni
                        </span>
                      </label>

                      <label
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${cfgJenisAnggaran === "PAPBD"
                          ? "border-[#5E0E14] bg-white font-bold text-[#5E0E14]"
                          : "border-gray-200 bg-white/70 text-gray-700"
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="cfgJenisAnggaran"
                            value="PAPBD"
                            checked={cfgJenisAnggaran === "PAPBD"}
                            onChange={() => setCfgJenisAnggaran("PAPBD")}
                            className="accent-[#5E0E14]"
                          />
                          PAPBD / Perubahan
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Periode Bulan
                  </label>
                  <select
                    value={cfgBulan}
                    onChange={(e) => setCfgBulan(parseInt(e.target.value, 10))}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  >
                    <option value={0}>Semua Bulan (Jan - Des)</option>
                    {NAMA_BULAN.map((nm, i) => (
                      <option key={i + 1} value={i + 1}>
                        Bulan {i + 1} - {nm}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Cetak
                  </label>
                  <input
                    type="date"
                    value={cfgTglCetak}
                    onChange={(e) => setCfgTglCetak(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ukuran &amp; Orientasi Kertas
                  </label>
                  <select
                    value={cfgKertas}
                    onChange={(e) =>
                      setCfgKertas(
                        e.target.value as
                        | "A4 landscape"
                        | "A4 portrait"
                        | "legal landscape"
                      )
                    }
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  >
                    <option value="A4 landscape">A4 Landscape</option>
                    <option value="A4 portrait">A4 Portrait</option>
                    <option value="legal landscape">F4 / Legal Landscape</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tempat Penandatanganan
                  </label>
                  <input
                    type="text"
                    value={cfgTempat}
                    onChange={(e) => setCfgTempat(e.target.value)}
                    placeholder="Sipirok"
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-[11px] font-bold text-gray-600 uppercase">
                  Penandatangan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PA / KPA
                    </label>
                    <select
                      value={cfgPaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setCfgPaId(id);
                        const found = paKpaOptions.find((u) => u.id === id);
                        if (found) {
                          setCfgPaNama(found.nama || "");
                          setCfgPaNip(found.nip || "");
                        } else {
                          setCfgPaNama("");
                          setCfgPaNip("");
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none bg-white"
                    >
                      <option value="">-- Pilih PA / KPA --</option>
                      {paKpaOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nama}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-gray-500 font-mono">
                      NIP: {cfgPaNip || "-"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bendahara Pengeluaran
                    </label>
                    <select
                      value={cfgBendaharaId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setCfgBendaharaId(id);
                        const found = bendaharaOptions.find((u) => u.id === id);
                        if (found) {
                          setCfgBendaharaNama(found.nama || "");
                          setCfgBendaharaNip(found.nip || "");
                        } else {
                          setCfgBendaharaNama("");
                          setCfgBendaharaNip("");
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none bg-white"
                    >
                      <option value="">-- Pilih Bendahara Pengeluaran --</option>
                      {bendaharaOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nama}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-gray-500 font-mono">
                      NIP: {cfgBendaharaNip || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPrintDialogType(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

