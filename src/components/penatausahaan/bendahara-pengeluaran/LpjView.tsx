"use client";

import React, { useState, useEffect, useMemo } from "react";
import BendaharaStepperWrapper, {
  OpdItem,
  UnitItem,
} from "./BendaharaStepperWrapper";
import PaginationBar from "@/components/ui/PaginationBar";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Printer,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileCheck2,
  Search,
  UserRound,
  CalendarDays,
  FileText,
  ChevronDown,
  MapPin,
  Receipt,
  UserCheck,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface LpjViewProps {
  mode?: "REGULAR" | "KKPD";
}

export default function LpjView({ mode = "REGULAR" }: LpjViewProps) {
  const isKkpd = mode === "KKPD";
  const title = isKkpd
    ? "Laporan Pertanggungjawaban KKPD (LPJ-KKPD)"
    : "Laporan Pertanggungjawaban Bendahara (LPJ)";
  const subtitle = isKkpd
    ? "Pembuatan LPJ atas transaksi Kartu Kredit Pemerintah Daerah (KKPD)"
    : "Pembuatan Laporan Pertanggungjawaban Uang Persediaan (UP / GU / TU)";
  const step3Label = isKkpd ? "Daftar LPJ-KKPD" : "Daftar Dokumen LPJ (UP / GU / TU)";

  return (
    <BendaharaStepperWrapper
      title={title}
      subtitle={subtitle}
      step3Label={step3Label}
    >
      {({ selectedOpd, selectedUnit }) => (
        <LpjContent
          mode={mode}
          selectedOpd={selectedOpd}
          selectedUnit={selectedUnit}
        />
      )}
    </BendaharaStepperWrapper>
  );
}

function LpjContent({
  mode,
  selectedOpd,
  selectedUnit,
}: {
  mode: "REGULAR" | "KKPD";
  selectedOpd: OpdItem | null;
  selectedUnit: UnitItem | null;
}) {
  const isKkpd = mode === "KKPD";
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [noLpj, setNoLpj] = useState("");
  const [tglLpj, setTglLpj] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tglAwal, setTglAwal] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [tglAkhir, setTglAkhir] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [jenisLpj, setJenisLpj] = useState<string>(isKkpd ? "KKPD" : "GU");
  const [noSp2d, setNoSp2d] = useState("");
  const [sp2dOptions, setSp2dOptions] = useState<any[]>([]);
  const [keterangan, setKeterangan] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [availableTransouts, setAvailableTransouts] = useState<any[]>([]);
  const [loadingTransouts, setLoadingTransouts] = useState(false);
  const [selectedTransoutIds, setSelectedTransoutIds] = useState<string[]>([]);
  const [selectedDetailLpj, setSelectedDetailLpj] = useState<any | null>(null);
  const [editingNoLpj, setEditingNoLpj] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Print LPJ Config Dialog State
  const [printItem, setPrintItem] = useState<any | null>(null);
  const [cfgTglCetak, setCfgTglCetak] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [cfgTempat, setCfgTempat] = useState<string>("Sipirok");
  const [cfgJumlahUp, setCfgJumlahUp] = useState<string>("0");
  const [petugasOptions, setPetugasOptions] = useState<
    Array<{ id: string; nama: string; nip: string; jabatan: string }>
  >([]);
  const [cfgSignerId, setCfgSignerId] = useState<string>("");
  const [cfgSignerNama, setCfgSignerNama] = useState<string>("");
  const [cfgSignerNip, setCfgSignerNip] = useState<string>("");
  const [cfgSignerJabatan, setCfgSignerJabatan] = useState<string>(
    "Pejabat Penatausahaan Keuangan"
  );

  const fetchData = async () => {
    if (!selectedOpd) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      q.set("jenis_lpj", isKkpd ? "KKPD" : "REGULAR");
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?${q.toString()}`
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
  }, [selectedOpd, selectedUnit, mode]);

  useEffect(() => {
    if (!selectedOpd) {
      setPetugasOptions([]);
      return;
    }
    const fetchPetugas = async () => {
      try {
        const res = await fetch(
          `/api/penatausahaan/bendahara-pengeluaran/rekal?action=petugas&opdId=${selectedOpd.id}`
        );
        const json = await res.json();
        if (json.success && json.data) {
          const bendList = json.data.bendaharaList || [];
          setPetugasOptions(bendList);
          if (bendList.length > 0) {
            setCfgSignerId(bendList[0].id);
            setCfgSignerNama(bendList[0].nama || "");
            setCfgSignerNip(bendList[0].nip || "");
            setCfgSignerJabatan(
              bendList[0].jabatan || "Bendahara Pengeluaran"
            );
          } else {
            setCfgSignerId("");
            setCfgSignerNama("");
            setCfgSignerNip("");
            setCfgSignerJabatan("Bendahara Pengeluaran");
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPetugas();
  }, [selectedOpd]);

  const fetchNextNoLpj = async () => {
    if (!selectedOpd) return;
    try {
      const q = new URLSearchParams();
      q.set("action", "next-nomor");
      q.set("opdId", selectedOpd.id);
      q.set("kdUnitOrSkpd", selectedUnit?.kd_unit || selectedOpd.kd_skpd);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && json.generatedNoLpj) {
        setNoLpj(json.generatedNoLpj);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAvailableSp2d = async () => {
    if (!selectedOpd) return;
    try {
      const q = new URLSearchParams();
      q.set("action", "available-sp2d");
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      q.set("jenis_lpj", jenisLpj);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSp2dOptions(json.data);
      } else {
        setSp2dOptions([]);
      }
    } catch (e) {
      console.error(e);
      setSp2dOptions([]);
    }
  };

  const fetchAvailableTransouts = async () => {
    if (!selectedOpd || !tglAwal || !tglAkhir) return;
    setLoadingTransouts(true);
    try {
      const q = new URLSearchParams();
      q.set("action", "available-transout");
      q.set("opdId", selectedOpd.id);
      if (selectedUnit) q.set("kd_unit", selectedUnit.kd_unit);
      q.set("tgl_awal", tglAwal);
      q.set("tgl_akhir", tglAkhir);
      q.set("jenis_lpj", jenisLpj);
      if (noSp2d) q.set("no_sp2d", noSp2d);
      if (editingNoLpj) q.set("include_no_lpj", editingNoLpj);
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?${q.toString()}`
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableTransouts(json.data);
        if (editingNoLpj) {
          const linked = json.data
            .filter((d: any) => d.no_lpj === editingNoLpj)
            .map((d: any) => d.id);
          setSelectedTransoutIds(
            linked.length > 0 ? linked : json.data.map((d: any) => d.id)
          );
        } else {
          setSelectedTransoutIds(json.data.map((d: any) => d.id));
        }
      } else {
        setAvailableTransouts([]);
        setSelectedTransoutIds([]);
      }
    } catch (e) {
      console.error(e);
      setAvailableTransouts([]);
      setSelectedTransoutIds([]);
    } finally {
      setLoadingTransouts(false);
    }
  };

  useEffect(() => {
    if (showModal && !editingNoLpj) {
      fetchNextNoLpj();
    }
  }, [showModal, selectedOpd, selectedUnit, editingNoLpj]);

  useEffect(() => {
    if (showModal) {
      fetchAvailableSp2d();
    }
  }, [showModal, selectedOpd, selectedUnit, jenisLpj]);

  useEffect(() => {
    if (showModal) {
      fetchAvailableTransouts();
    }
  }, [showModal, selectedOpd, selectedUnit, tglAwal, tglAkhir, jenisLpj, noSp2d, editingNoLpj]);

  const selectedTotal = useMemo(() => {
    const idSet = new Set(selectedTransoutIds);
    return availableTransouts
      .filter((t) => idSet.has(t.id))
      .reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  }, [availableTransouts, selectedTransoutIds]);

  const handleDeleteLpj = async () => {
    if (!deleteTarget?.no_lpj) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/penatausahaan/bendahara-pengeluaran/lpj?no_lpj=${encodeURIComponent(
          deleteTarget.no_lpj
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchData();
      } else {
        setDeleteError(json.error || "Gagal membatalkan LPJ");
      }
    } catch {
      setDeleteError("Terjadi kesalahan koneksi.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter & Pagination
  const filteredList = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.no_lpj?.toLowerCase().includes(q) ||
          item.keterangan?.toLowerCase().includes(q) ||
          item.jenis_lpj?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Tanggal LPJ
      if (startDate || endDate) {
        const itemDateStr = item.tgl_lpj
          ? new Date(item.tgl_lpj).toISOString().split("T")[0]
          : item.tgl_awal
            ? new Date(item.tgl_awal).toISOString().split("T")[0]
            : "";
        if (startDate && itemDateStr && itemDateStr < startDate) return false;
        if (endDate && itemDateStr && itemDateStr > endDate) return false;
      }

      return true;
    });
  }, [dataList, search, startDate, endDate]);

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpd) return;
    setFormError(null);

    if (new Date(tglAwal) > new Date(tglAkhir)) {
      setFormError("Tanggal awal periode tidak boleh melebihi tanggal akhir.");
      return;
    }

    if (selectedTransoutIds.length === 0) {
      setFormError("Pilih minimal 1 transaksi SPJ pada rentang tanggal tersebut.");
      return;
    }

    setSubmitting(true);
    try {
      const defaultKet =
        keterangan.trim() ||
        `Pertanggungjawaban Belanja ${jenisLpj} Periode ${new Date(
          tglAwal
        ).toLocaleDateString("id-ID")} s/d ${new Date(
          tglAkhir
        ).toLocaleDateString("id-ID")} - ${selectedOpd.nm_skpd}`;

      const res = await fetch("/api/penatausahaan/bendahara-pengeluaran/lpj", {
        method: editingNoLpj ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingNoLpj ? { original_no_lpj: editingNoLpj } : {}),
          opdId: selectedOpd.id,
          kd_unit: selectedUnit?.kd_unit || undefined,
          nm_unit: selectedUnit?.nm_unit || undefined,
          unitKerjaId: selectedUnit?.id || undefined,
          no_lpj: noLpj || undefined,
          no_sp2d: noSp2d || undefined,
          tgl_lpj: tglLpj,
          tgl_awal: tglAwal,
          tgl_akhir: tglAkhir,
          jenis_lpj: jenisLpj,
          keterangan: defaultKet,
          transoutIds: selectedTransoutIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan dokumen LPJ");
      }
      setEditingNoLpj(null);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingNoLpj(item.no_lpj);
    setNoLpj(item.no_lpj || "");
    setNoSp2d(item.no_sp2d || "");
    setJenisLpj(item.jenis_lpj || (isKkpd ? "KKPD" : "GU"));
    setTglLpj(
      item.tgl_lpj
        ? new Date(item.tgl_lpj).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setTglAwal(
      item.tgl_awal
        ? new Date(item.tgl_awal).toISOString().split("T")[0]
        : tglAwal
    );
    setTglAkhir(
      item.tgl_akhir
        ? new Date(item.tgl_akhir).toISOString().split("T")[0]
        : tglAkhir
    );
    setKeterangan(item.keterangan || "");
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenPrint = (item: any) => {
    setPrintItem(item);
    setCfgTglCetak(
      item.tgl_lpj
        ? new Date(item.tgl_lpj).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    const defaultUp =
      Number(item.sp2d_nilai) > 0
        ? Number(item.sp2d_nilai)
        : Number(item.total_belanja) || 0;
    setCfgJumlahUp(String(defaultUp));
  };

  const executeCetakLpj = () => {
    if (!printItem) return;
    const item = printItem;
    const win = window.open("", "_blank", "width=850,height=900");
    if (!win) {
      alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak laporan.");
      return;
    }

    const formatNum = (val: number) =>
      new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val || 0);

    // Kelompokkan rincian berjenjang: Kegiatan -> Sub Kegiatan -> Rekening Belanja
    type RekItem = { kd_rek6: string; nm_rek6: string; nilai: number };
    type SubItem = {
      kd_sub_kegiatan: string;
      nm_sub_kegiatan: string;
      reks: Map<string, RekItem>;
      total: number;
    };
    type KegItem = {
      kd_kegiatan: string;
      nm_kegiatan: string;
      subs: Map<string, SubItem>;
      total: number;
    };

    const kegMap = new Map<string, KegItem>();
    let grandTotal = 0;

    for (const d of item.rincian || []) {
      const kdSub = String(d.kd_sub_kegiatan || "-");
      const nmSub = String(d.nm_sub_kegiatan || "-");
      const kdRek = String(d.kd_rek6 || "-");
      const nmRek = String(d.nm_rek6 || "-");
      const val = Number(d.nilai) || 0;
      grandTotal += val;

      const subParts = kdSub.split(".");
      const kdKeg =
        subParts.length > 1 ? subParts.slice(0, -1).join(".") : kdSub;
      const nmKeg = `KEGIATAN ${nmSub.toUpperCase()}`;

      let keg = kegMap.get(kdKeg);
      if (!keg) {
        keg = {
          kd_kegiatan: kdKeg,
          nm_kegiatan: nmKeg,
          subs: new Map(),
          total: 0,
        };
        kegMap.set(kdKeg, keg);
      }
      keg.total += val;

      let sub = keg.subs.get(kdSub);
      if (!sub) {
        sub = {
          kd_sub_kegiatan: kdSub,
          nm_sub_kegiatan: nmSub,
          reks: new Map(),
          total: 0,
        };
        keg.subs.set(kdSub, sub);
      }
      sub.total += val;

      const existingRek = sub.reks.get(kdRek) || {
        kd_rek6: kdRek,
        nm_rek6: nmRek,
        nilai: 0,
      };
      existingRek.nilai += val;
      sub.reks.set(kdRek, existingRek);
    }

    const bodyRows: string[] = [];
    const sortedKegs = Array.from(kegMap.values()).sort((a, b) =>
      a.kd_kegiatan.localeCompare(b.kd_kegiatan)
    );

    for (const keg of sortedKegs) {
      bodyRows.push(`
        <tr class="bold-row">
          <td class="font-mono">${keg.kd_kegiatan}</td>
          <td>${keg.nm_kegiatan}</td>
          <td class="text-right">${formatNum(keg.total)}</td>
        </tr>
      `);

      const sortedSubs = Array.from(keg.subs.values()).sort((a, b) =>
        a.kd_sub_kegiatan.localeCompare(b.kd_sub_kegiatan)
      );
      for (const sub of sortedSubs) {
        bodyRows.push(`
          <tr class="bold-row">
            <td class="font-mono">${sub.kd_sub_kegiatan}</td>
            <td>${sub.nm_sub_kegiatan}</td>
            <td class="text-right">${formatNum(sub.total)}</td>
          </tr>
        `);

        const sortedReks = Array.from(sub.reks.values()).sort((a, b) =>
          a.kd_rek6.localeCompare(b.kd_rek6)
        );
        for (const rek of sortedReks) {
          const fullKode =
            sub.kd_sub_kegiatan && sub.kd_sub_kegiatan !== "-"
              ? `${sub.kd_sub_kegiatan}.${rek.kd_rek6}`
              : rek.kd_rek6;
          bodyRows.push(`
            <tr>
              <td class="font-mono">${fullKode}</td>
              <td>${rek.nm_rek6}</td>
              <td class="text-right">${formatNum(rek.nilai)}</td>
            </tr>
          `);
        }
      }
    }

    const jumlahUp = parseFloat(cfgJumlahUp) || 0;
    const sisaUp = jumlahUp - grandTotal;

    const skpdNama = (item.nm_skpd || selectedOpd?.nm_skpd || "-").toUpperCase();
    const tglAwalStr = new Date(item.tgl_awal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const tglAkhirStr = new Date(item.tgl_akhir).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const tglCetakStr = (
      cfgTglCetak ? new Date(cfgTglCetak) : new Date()
    ).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const tempatText = cfgTempat.trim() || "Sipirok";
    const signerNamaText =
      cfgSignerNama.trim() || "(....................................................)";
    const signerNipText = cfgSignerNip.trim()
      ? `NIP. ${cfgSignerNip.trim()}`
      : "NIP. ........................................";

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>LAPORAN PERTANGGUNG JAWABAN UANG PERSEDIAAN (${item.jenis_lpj})</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 9px; color: #000; margin: 0; padding: 10px; }
          .title-wrap { text-align: center; margin-bottom: 10px; }
          .title-wrap h1 { font-size: 11.5px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap h2 { font-size: 11px; margin: 2px 0 0; font-weight: bold; text-transform: uppercase; }
          .title-wrap h3 { font-size: 10px; margin: 6px 0 0; font-weight: normal; text-transform: uppercase; }
          .title-wrap p { font-size: 9px; margin: 2px 0 0; }
          table.lpj { width: 100%; border-collapse: collapse; font-size: 8.5px; }
          table.lpj th, table.lpj td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
          table.lpj th { text-align: center; font-weight: bold; background: #fff; }
          .text-right { text-align: right; white-space: nowrap; }
          .text-center { text-align: center; }
          .font-mono { white-space: nowrap; }
          .bold-row td { font-weight: bold; }
          .ttd-wrap { width: 100%; margin-top: 22px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
          .ttd-box { width: 250px; text-align: center; font-size: 9px; }
          .ttd-space { height: 52px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="title-wrap">
          <h1>PEMERINTAH KABUPATEN TAPANULI SELATAN</h1>
          <h2>${skpdNama}</h2>
          <h3>LAPORAN PERTANGGUNG JAWABAN UANG PERSEDIAAN (${item.jenis_lpj})</h3>
          <p>Periode ${tglAwalStr} S/d ${tglAkhirStr}</p>
          <p>No. LPJ: ${item.no_lpj || "-"} &nbsp;|&nbsp; No. SP2D: ${item.no_sp2d || "-"}</p>
        </div>

        <table class="lpj">
          <thead>
            <tr>
              <th style="width:175px;">KODE<br/>REKENING</th>
              <th>URAIAN/KEGIATAN/SUB KEGIATAN/BELANJA</th>
              <th style="width:105px;">JUMLAH<br/>(Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows.join("") ||
      `<tr><td colspan="3" class="text-center">Tidak ada rincian belanja pada LPJ ini.</td></tr>`
      }
            <tr class="bold-row">
              <td></td>
              <td>Jumlah (Rp)</td>
              <td class="text-right">${formatNum(grandTotal)}</td>
            </tr>
            <tr class="bold-row">
              <td></td>
              <td>Jumlah Uang Persediaan (Rp)</td>
              <td class="text-right">${formatNum(jumlahUp)}</td>
            </tr>
            <tr class="bold-row">
              <td></td>
              <td>Sisa Uang Persediaan (Rp)</td>
              <td class="text-right">${formatNum(sisaUp)}</td>
            </tr>
          </tbody>
        </table>

        <div class="ttd-wrap">
          <div class="ttd-box">
            <div>${tempatText}, ${tglCetakStr}</div>
            <div>${cfgSignerJabatan || "Pejabat Penatausahaan Keuangan"}</div>
            <div class="ttd-space"></div>
            <div><strong>${signerNamaText}</strong></div>
            <div>${signerNipText}</div>
          </div>
        </div>

        <script>
          window.onload = function () { setTimeout(function () { window.print(); }, 250); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${isKkpd
              ? "bg-purple-50 text-purple-700"
              : "bg-teal-50 text-teal-700"
              }`}
          >
            {isKkpd ? (
              <CreditCard className="w-5 h-5" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isKkpd
                ? "Rekapitulasi LPJ-KKPD"
                : "Rekapitulasi LPJ"}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Periode Tanggal */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-500">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Dari Tanggal"
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border-0 bg-transparent text-slate-700 focus:outline-none p-0 cursor-pointer"
              title="Sampai Tanggal"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Reset filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari No. LPJ / Keterangan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#88131A]"
            />
          </div>

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
              setEditingNoLpj(null);
              setNoLpj("");
              setNoSp2d("");
              setKeterangan("");
              setFormError(null);
              setShowModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isKkpd ? "Buat LPJ-KKPD Baru" : "Buat LPJ Baru"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#5E0E14] text-white">
              <tr>
                <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                <th className="px-3 py-3 font-semibold w-48">Nomor LPJ</th>
                <th className="px-3 py-3 font-semibold w-24">Tanggal</th>
                <th className="px-3 py-3 font-semibold w-48">Rentang Periode Transaksi</th>
                <th className="px-3 py-3 font-semibold w-24 text-center">Jenis LPJ</th>
                <th className="px-3 py-3 font-semibold">Uraian / Keterangan</th>
                <th className="px-3 py-3 font-semibold text-right w-40">
                  Total Belanja (Rp)
                </th>
                <th className="px-3 py-3 font-semibold text-center w-24">Status</th>
                <th className="px-3 py-3 font-semibold text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Memuat data dokumen LPJ...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    Belum ada dokumen LPJ yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#5E0E14]">
                      {item.no_lpj}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {new Date(item.tgl_lpj).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-gray-700 font-medium">
                      {new Date(item.tgl_awal).toLocaleDateString("id-ID")} s/d{" "}
                      {new Date(item.tgl_akhir).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border">
                        {item.jenis_lpj}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-sm">
                      {item.keterangan}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">
                      {formatRupiah(Number(item.total_belanja) || 0)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {item.status || "DRAFT"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!item.isLockedBySpp && !item.no_spp && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                            title="Edit LPJ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenPrint(item)}
                          className="p-1.5 text-teal-700 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                          title="Cetak LPJ"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {item.isLockedBySpp || item.no_spp ? (
                          <span
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold"
                            title={`Terkunci karena sudah dibuatkan SPP (${item.no_spp || "-"})`}
                          >
                            Terkunci
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Batalkan / Hapus LPJ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          total={filteredList.length}
          limit={pageSize}
          onPageChange={setCurrentPage}
          onLimitChange={(newLimit) => {
            setPageSize(newLimit);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal Buat LPJ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">
                  {editingNoLpj
                    ? `Edit LPJ: ${editingNoLpj}`
                    : isKkpd
                      ? "Formulir Pembuatan LPJ-KKPD"
                      : "Formulir Pembuatan LPJ Pengeluaran"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jenis LPJ
                  </label>
                  {isKkpd ? (
                    <input
                      type="text"
                      disabled
                      value="KKPD (Kartu Kredit Pemerintah Daerah)"
                      className="w-full text-xs px-3 py-2 bg-gray-100 border rounded-lg text-gray-700 font-semibold"
                    />
                  ) : (
                    <select
                      value={jenisLpj}
                      onChange={(e) => setJenisLpj(e.target.value)}
                      className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                    >
                      <option value="GU">Ganti Uang (GU)</option>
                      <option value="TU">Tambahan Uang (TU)</option>
                      <option value="UP">Uang Persediaan (UP)</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Pengesahan LPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglLpj}
                    onChange={(e) => setTglLpj(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nomor LPJ
                  </label>
                  <input
                    type="text"
                    value={noLpj}
                    onChange={(e) => setNoLpj(e.target.value)}
                    placeholder="00001/[kd_unit]/LPJ/2026"
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nomor SP2D
                  </label>
                  <SearchableSelect
                    options={sp2dOptions.map((s) => ({
                      value: s.no_sp2d,
                      label: "",
                      badge: s.no_sp2d,
                      subLabel: ``,
                    }))}
                    value={noSp2d}
                    onChange={(val) => setNoSp2d(val)}
                    placeholder="-- Semua / Pilih No. SP2D --"
                    searchPlaceholder="Cari nomor atau keperluan SP2D..."
                    clearLabel=""
                    allowClear
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rentang Transaksi Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglAwal}
                    onChange={(e) => setTglAwal(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sampai Dengan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={tglAkhir}
                    onChange={(e) => setTglAkhir(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan / Uraian LPJ
                </label>
                <textarea
                  rows={2}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Uraian pertanggungjawaban belanja..."
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-[#5E0E14] focus:outline-none"
                />
              </div>

              {/* Pratinjau Daftar Transaksi SPJ Belum di-LPJ-kan */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3.5 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800">
                      Daftar Transaksi SPJ ({jenisLpj}) Belum di-LPJ-kan
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {selectedTransoutIds.length} / {availableTransouts.length} dipilih
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#5E0E14]">
                      Total: {formatRupiah(selectedTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={fetchAvailableTransouts}
                      disabled={loadingTransouts}
                      className="text-[11px] font-semibold text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${loadingTransouts ? "animate-spin" : ""}`}
                      />
                      Tarik Ulang
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={
                              availableTransouts.length > 0 &&
                              selectedTransoutIds.length === availableTransouts.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTransoutIds(
                                  availableTransouts.map((t) => t.id)
                                );
                              } else {
                                setSelectedTransoutIds([]);
                              }
                            }}
                            className="accent-[#5E0E14] cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 w-36">No. Bukti</th>
                        <th className="px-3 py-2 w-24">Tanggal</th>
                        <th className="px-3 py-2">Uraian Belanja</th>
                        <th className="px-3 py-2 text-right w-32">Nilai (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingTransouts ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
                            Menarik data transaksi dari trhtransout...
                          </td>
                        </tr>
                      ) : availableTransouts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-400">
                            Tidak ada transaksi {jenisLpj} yang belum di-LPJ-kan pada rentang tanggal ini.
                          </td>
                        </tr>
                      ) : (
                        availableTransouts.map((t) => {
                          const checked = selectedTransoutIds.includes(t.id);
                          return (
                            <tr
                              key={t.id}
                              onClick={() => {
                                setSelectedTransoutIds((prev) =>
                                  prev.includes(t.id)
                                    ? prev.filter((x) => x !== t.id)
                                    : [...prev, t.id]
                                );
                              }}
                              className={`cursor-pointer transition-colors ${checked ? "bg-rose-50/50" : "hover:bg-gray-50"
                                }`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => { }}
                                  className="accent-[#5E0E14] cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono font-semibold text-gray-900">
                                {t.no_bukti}
                              </td>
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                {new Date(t.tgl_bukti).toLocaleDateString("id-ID")}
                              </td>
                              <td className="px-3 py-2 text-gray-700 line-clamp-2">
                                {t.uraian}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                {formatRupiah(Number(t.total) || 0)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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
                  disabled={submitting || selectedTransoutIds.length === 0}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Dokumen LPJ ({selectedTransoutIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Rincian LPJ */}
      {selectedDetailLpj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-[#5E0E14] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Rincian LPJ: {selectedDetailLpj.no_lpj}
                </h3>
                <p className="text-[11px] text-white/80">
                  Jenis: {selectedDetailLpj.jenis_lpj} | Total:{" "}
                  {formatRupiah(Number(selectedDetailLpj.total_belanja) || 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailLpj(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-700 font-semibold">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">No</th>
                    <th className="px-3 py-2 w-36">No. Bukti</th>
                    <th className="px-3 py-2 w-24">Tgl. Bukti</th>
                    <th className="px-3 py-2 w-36">Sub Kegiatan</th>
                    <th className="px-3 py-2">Rekening Belanja</th>
                    <th className="px-3 py-2 text-right w-32">Nilai (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(selectedDetailLpj.rincian || []).map((r: any, idx: number) => (
                    <tr key={r.id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-center font-mono text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-[#5E0E14]">
                        {r.no_bukti}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {r.tgl_bukti}
                      </td>
                      <td className="px-3 py-2 font-mono text-teal-700">
                        {r.kd_sub_kegiatan}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono font-semibold text-gray-900">
                          {r.kd_rek6}
                        </div>
                        <div className="text-gray-600">{r.nm_rek6}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(Number(r.nilai) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailLpj(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Parameter Cetak LPJ */}
      {printItem && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* HEADER */}
            <div className="relative bg-gradient-to-r from-[#5E0E14] to-[#801D25] px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Printer className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Parameter Cetak LPJ
                    </h3>
                    <p className="text-[11px] text-white/70 mt-1">
                      Lengkapi parameter untuk mencetak laporan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPrintItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-0 left-6 right-6 h-px bg-white/15" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeCetakLpj();
                setPrintItem(null);
              }}
              className="p-6 space-y-5"
            >
              {/* INFORMASI LPJ */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#5E0E14]" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Informasi Dokumen
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-3.5 h-3.5 text-[#5E0E14]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Nomor LPJ
                      </span>
                    </div>
                    <p className="text-sm font-bold font-mono text-[#5E0E14] break-all">
                      {printItem.no_lpj || "-"}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Nomor SP2D
                      </span>
                    </div>
                    <p className="text-sm font-bold font-mono text-slate-800 break-all">
                      {printItem.no_sp2d || "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* PARAMETER CETAK */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#5E0E14]" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pengaturan Cetak
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Tanggal Cetak <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={cfgTglCetak}
                        onChange={(e) => setCfgTglCetak(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white outline-none transition focus:border-[#5E0E14] focus:ring-2 focus:ring-[#5E0E14]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Tempat Penandatanganan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={cfgTempat}
                        onChange={(e) => setCfgTempat(e.target.value)}
                        placeholder="Contoh: Sipirok"
                        className="w-full pl-10 pr-3 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white outline-none transition focus:border-[#5E0E14] focus:ring-2 focus:ring-[#5E0E14]/10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PENANDATANGAN */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#5E0E14]" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pejabat Penandatangan
                  </h4>
                </div>

                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Bendahara Pengeluaran <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    required
                    value={cfgSignerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCfgSignerId(id);
                      const found = petugasOptions.find((u) => u.id === id);

                      if (found) {
                        setCfgSignerNama(found.nama || "");
                        setCfgSignerNip(found.nip || "");
                        setCfgSignerJabatan(
                          found.jabatan || "Bendahara Pengeluaran"
                        );
                      } else {
                        setCfgSignerNama("");
                        setCfgSignerNip("");
                        setCfgSignerJabatan("Bendahara Pengeluaran");
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-700 border border-slate-200 rounded-xl bg-white outline-none appearance-none cursor-pointer transition focus:border-[#5E0E14] focus:ring-2 focus:ring-[#5E0E14]/10"
                  >
                    <option value="">-- Pilih Bendahara Pengeluaran --</option>
                    {petugasOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {cfgSignerId && (
                  <div className="mt-3 flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Penandatangan Terpilih
                      </p>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        {cfgSignerNama}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        NIP. {cfgSignerNip || "-"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {cfgSignerJabatan}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400">
                  Pastikan data penandatangan sudah benar.
                </p>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPrintItem(null)}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-[#5E0E14] hover:bg-[#46090E] rounded-xl shadow-lg shadow-[#5E0E14]/15 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak LPJ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus / Batalkan LPJ"
        entityName="Dokumen LPJ"
        itemCode={deleteTarget?.no_lpj}
        itemLabel=""
        description=""
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteLpj}
      />
    </div>
  );
}

