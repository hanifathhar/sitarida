"use client";

import React, { useEffect, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Play } from "lucide-react";

interface ImportRowReport {
  baris: number;
  kode: string;
  uraian: string;
  status: "BERHASIL" | "GAGAL";
  alasan?: string;
}

interface ImportResult {
  targetEntitas: string;
  totalBaris: number;
  berhasilCount: number;
  gagalCount: number;
  laporan: ImportRowReport[];
}

const SAMPLE_TEMPLATES: Record<string, string> = {
  REKENING: JSON.stringify(
    [
      {
        kode: "5.1.02.01.01.0026",
        uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak",
        kategori: "BELANJA",
        level: "SUB_RINCIAN_OBJEK",
        sumberReferensi: "Permendagri 90/2019",
      },
      {
        kode: "5.1.02.01.01.0036",
        uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik",
        kategori: "BELANJA",
        level: "SUB_RINCIAN_OBJEK",
        sumberReferensi: "Permendagri 90/2019",
      },
      {
        kode: "4.1.02.01.01.0005",
        uraian: "Contoh Baris Gagal (Kode 4 tapi Kategori BELANJA)",
        kategori: "BELANJA",
        level: "SUB_RINCIAN_OBJEK",
      },
    ],
    null,
    2
  ),
  SUMBER_DANA: JSON.stringify(
    [
      {
        kode: "1.2.04.01",
        uraian: "Dana Insentif Fiskal (DIF) Kinerja Tahun Berjalan",
        kelompok: "DANA_TRANSFER",
      },
      {
        kode: "1.3.01.01",
        uraian: "Pendapatan Hibah dari Pemerintah Pusat",
        kelompok: "LAIN_LAIN",
      },
    ],
    null,
    2
  ),
  PROGRAM: JSON.stringify(
    [
      {
        kode: "1.02.02",
        uraian: "PROGRAM PEMENUHAN UPAYA KESEHATAN PERORANGAN DAN UPAYA KESEHATAN MASYARAKAT",
        indikator: "Indeks Keluarga Sehat (IKS) Kabupaten Tapanuli Selatan",
      },
    ],
    null,
    2
  ),
};

export default function ImportMasterPage() {
  const [tahunList, setTahunList] = useState<Array<{ id: string; tahun: number }>>([]);
  const [tahunAnggaranId, setTahunAnggaranId] = useState("");
  const [targetEntitas, setTargetEntitas] = useState<
    "REKENING" | "PROGRAM" | "SUMBER_DANA" | "OPD"
  >("REKENING");
  const [jsonInput, setJsonInput] = useState(SAMPLE_TEMPLATES.REKENING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetch("/api/master/tahun-anggaran")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setTahunList(json.data);
          const def = json.data.find((x: { isDefault: boolean }) => x.isDefault) || json.data[0];
          setTahunAnggaranId(def.id);
        }
      });
  }, []);

  function handleSelectTemplate(entitas: "REKENING" | "PROGRAM" | "SUMBER_DANA" | "OPD") {
    setTargetEntitas(entitas);
    setJsonInput(SAMPLE_TEMPLATES[entitas] || "[]");
    setResult(null);
    setError(null);
  }

  async function handleRunImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    let parsedRows: Record<string, unknown>[];
    try {
      parsedRows = JSON.parse(jsonInput);
      if (!Array.isArray(parsedRows)) {
        throw new Error("Format data harus berupa JSON Array ([ ... ]).");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Format JSON tidak valid");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/master/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAnggaranId,
          targetEntitas,
          rows: parsedRows,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Gagal menjalankan proses import");
      } else {
        setResult(json.data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-800" />
          <span>Import & Validasi Master Data (MST-010, MST-011 & Aturan Bisnis #13)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Memvalidasi kode, relasi, duplikasi, serta menghasilkan laporan rinci baris berhasil dan gagal beserta alasan
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Konfigurasi Import */}
        <form
          onSubmit={handleRunImport}
          className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-800" />
              <span>Template & Payload Import</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Anggaran Target
              </label>
              <select
                value={tahunAnggaranId}
                onChange={(e) => setTahunAnggaranId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                {tahunList.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tahun Anggaran {t.tahun}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entitas Master Data
              </label>
              <select
                value={targetEntitas}
                onChange={(e) =>
                  handleSelectTemplate(
                    e.target.value as "REKENING" | "PROGRAM" | "SUMBER_DANA" | "OPD"
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="REKENING">Master Rekening (MST-003)</option>
                <option value="SUMBER_DANA">Master Sumber Dana (MST-007)</option>
                <option value="PROGRAM">Master Program (MST-004)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data Baris Import (Format Template JSON — termasuk contoh uji validasi baris gagal)
            </label>
            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 bg-slate-950 text-emerald-300 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>
              {loading ? "Memvalidasi & Mengimpor..." : "Jalankan Validasi & Import Data"}
            </span>
          </button>
        </form>

        {/* Panel Laporan Hasil Import */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Laporan Hasil Validasi & Import (Aturan Bisnis #13)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Menampilkan rincian setiap baris yang berhasil disimpan maupun ditolak oleh validator
          </p>

          {!result ? (
            <div className="p-8 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-500">
              Klik tombol <strong>Jalankan Validasi & Import Data</strong> di sebelah kiri untuk
              melihat simulasi validasi baris berhasil dan baris gagal beserta alasannya.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Total Baris Diproses</div>
                  <div className="text-lg font-bold text-slate-900">{result.totalBaris}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] text-emerald-700">Baris Berhasil</div>
                  <div className="text-lg font-bold text-emerald-800">{result.berhasilCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="text-[11px] text-red-700">Baris Ditolak/Gagal</div>
                  <div className="text-lg font-bold text-red-800">{result.gagalCount}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                      <th className="py-2.5 px-3">Baris</th>
                      <th className="py-2.5 px-3">Kode & Uraian</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {result.laporan.map((row) => (
                      <tr key={row.baris}>
                        <td className="py-2.5 px-3 font-mono font-bold">#{row.baris}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{row.kode}</div>
                          <div className="text-[11px] text-slate-600">{row.uraian}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          {row.status === "BERHASIL" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> BERHASIL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" /> GAGAL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {row.alasan || "Valid & tersimpan ke database"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

