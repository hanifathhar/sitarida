"use client";

import React, { useEffect, useState } from "react";
import { Layers, Plus, Search, AlertCircle, CheckCircle2 } from "lucide-react";

interface SubkegiatanItem {
  id: string;
  kd_sub_kegiatan: string;
  nm_sub_kegiatan: string;
  kinerja: string | null;
  indikator: string | null;
  satuanKeluaran: string | null;
}

interface KegiatanItem {
  id: string;
  kd_kegiatan: string;
  nm_kegiatan: string;
  indikator: string | null;
  subkegiatans: SubkegiatanItem[];
}

interface ProgramItem {
  id: string;
  kd_program: string;
  nm_program: string;
  kd_urusan: string | null;
  indikator: string | null;
  kegiatans: KegiatanItem[];
}

export default function NomenklaturPage() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [tahunInfo, setTahunInfo] = useState<{ id: string; tahun: number } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<
    "PROGRAM" | "KEGIATAN" | "SUBKEGIATAN" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [parentId, setParentId] = useState("");
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [indikator, setIndikator] = useState("");
  const [kinerja, setKinerja] = useState("");
  const [satuanKeluaran, setSatuanKeluaran] = useState("Dokumen");

  async function fetchData(q = search) {
    setLoading(true);
    const res = await fetch(`/api/master/nomenklatur?search=${encodeURIComponent(q)}`);
    const json = await res.json();
    if (json.success) {
      setPrograms(json.data);
      setTahunInfo(json.tahunAnggaran);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tahunInfo || !activeModal) return;
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = {
      tipe: activeModal,
      indikator,
      sumberReferensi: `Kepmendagri Nomenklatur TA ${tahunInfo?.tahun ?? 2026}`,
    };

    if (activeModal === "PROGRAM") {
      payload.kd_program = kode;
      payload.nm_program = nama;
    } else if (activeModal === "KEGIATAN") {
      payload.programId = parentId;
      payload.kd_kegiatan = kode;
      payload.nm_kegiatan = nama;
    } else if (activeModal === "SUBKEGIATAN") {
      payload.kegiatanId = parentId;
      payload.kd_sub_kegiatan = kode;
      payload.nm_sub_kegiatan = nama;
      payload.kinerja = kinerja;
      payload.satuanKeluaran = satuanKeluaran;
    }

    const res = await fetch("/api/master/nomenklatur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      setError(json.message || "Gagal menyimpan nomenklatur");
      return;
    }

    setSuccess(`${activeModal} [${kode}] ${nama} berhasil ditambahkan.`);
    setActiveModal(null);
    setKode("");
    setNama("");
    setIndikator("");
    fetchData();
  }

  const allKegiatans = programs.flatMap((p) =>
    p.kegiatans.map((k) => ({ ...k, programKode: p.kd_program }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-800" />
            <span>
              Master Nomenklatur Program, Kegiatan & Subkegiatan{" "}
              {tahunInfo ? `(TA ${tahunInfo.tahun})` : ""}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarki berperiode tahun anggaran dengan validasi relasi kode induk-anak (MST-004 s.d. MST-006)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveModal("PROGRAM");
              setKode("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Program</span>
          </button>
          <button
            onClick={() => {
              setActiveModal("KEGIATAN");
              if (programs[0]) {
                setParentId(programs[0].id);
                setKode(`${programs[0].kd_program}.2.02`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-800 text-blue-900 hover:bg-blue-50 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Kegiatan</span>
          </button>
          <button
            onClick={() => {
              setActiveModal("SUBKEGIATAN");
              if (allKegiatans[0]) {
                setParentId(allKegiatans[0].id);
                setKode(`${allKegiatans[0].kd_kegiatan}.0002`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Subkegiatan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {activeModal && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm"
        >
          <h2 className="text-sm font-bold text-slate-900">
            Tambah {activeModal} Baru (Tahun Anggaran {tahunInfo?.tahun})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {activeModal === "KEGIATAN" && (
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program Induk
                </label>
                <select
                  value={parentId}
                  onChange={(e) => {
                    setParentId(e.target.value);
                    const p = programs.find((x) => x.id === e.target.value);
                    if (p) setKode(`${p.kd_program}.2.01`);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.kd_program}] {p.nm_program}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeModal === "SUBKEGIATAN" && (
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kegiatan Induk
                </label>
                <select
                  value={parentId}
                  onChange={(e) => {
                    setParentId(e.target.value);
                    const k = allKegiatans.find((x) => x.id === e.target.value);
                    if (k) setKode(`${k.kd_kegiatan}.0001`);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {allKegiatans.map((k) => (
                    <option key={k.id} value={k.id}>
                      [{k.kd_kegiatan}] {k.nm_kegiatan}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode {activeModal}
              </label>
              <input
                type="text"
                required
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="Contoh: 1.01.02"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama / Uraian {activeModal}
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indikator Capaian / Keluaran
              </label>
              <input
                type="text"
                value={indikator}
                onChange={(e) => setIndikator(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            {activeModal === "SUBKEGIATAN" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan Keluaran
                  </label>
                  <input
                    type="text"
                    value={satuanKeluaran}
                    onChange={(e) => setSatuanKeluaran(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kinerja Subkegiatan
                  </label>
                  <input
                    type="text"
                    value={kinerja}
                    onChange={(e) => setKinerja(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold"
            >
              Simpan {activeModal}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Cari kode atau nama Program / Kegiatan / Subkegiatan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchData(e.target.value);
          }}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
        />
      </div>

      {/* Tree View Nomenklatur */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            Memuat hierarki nomenklatur...
          </div>
        ) : programs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
            Belum ada data Program/Kegiatan/Subkegiatan pada Tahun Anggaran {tahunInfo?.tahun}.
          </div>
        ) : (
          programs.map((prog) => (
            <div
              key={prog.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-4 bg-[#88131A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white text-[#5E0E14] font-mono text-xs font-extrabold">
                      PROGRAM {prog.kd_program}
                    </span>
                    <h3 className="text-sm font-bold">{prog.nm_program}</h3>
                  </div>
                  {prog.indikator && (
                    <div className="text-[11px] text-red-100 mt-1">
                      Indikator Program: {prog.indikator}
                    </div>
                  )}
                </div>
                {prog.kd_urusan && (
                  <span className="px-2.5 py-1 rounded bg-[#4C0A0E] text-white text-xs font-bold">
                    Urusan: {prog.kd_urusan}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4">
                {prog.kegiatans.map((keg) => (
                  <div
                    key={keg.id}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono text-xs font-bold">
                            KEGIATAN {keg.kd_kegiatan}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{keg.nm_kegiatan}</span>
                        </div>
                        {keg.indikator && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Indikator Kegiatan: {keg.indikator}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {keg.subkegiatans.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 pl-6 hover:bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[11px] font-bold">
                                SUB {sub.kd_sub_kegiatan}
                              </span>
                              <span className="font-semibold text-slate-800">{sub.nm_sub_kegiatan}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Kinerja: {sub.kinerja || "-"} • Indikator: {sub.indikator || "-"}
                            </div>
                          </div>
                          {sub.satuanKeluaran && (
                            <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-medium whitespace-nowrap">
                              Satuan Output: {sub.satuanKeluaran}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

