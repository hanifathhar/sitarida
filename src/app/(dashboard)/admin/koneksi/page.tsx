"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Save,
  PlugZap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Server,
} from "lucide-react";

interface KoneksiItem {
  id: string;
  kode: "CMS_WEB" | "SIMPATDA";
  nama: string;
  deskripsi?: string | null;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  isActive: boolean;
  updatedAt?: string;
}

export default function SettingKoneksiPage() {
  const [items, setItems] = useState<KoneksiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKode, setSavingKode] = useState<string | null>(null);
  const [testingKode, setTestingKode] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/koneksi");
      const json = await res.json();
      if (res.ok && json.success) {
        setItems(json.data || []);
      } else {
        setLoadError(json.error || "Gagal memuat konfigurasi koneksi.");
      }
    } catch (err) {
      console.error("Gagal memuat setting koneksi:", err);
      setLoadError("Terjadi kesalahan jaringan saat memuat konfigurasi koneksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (
    kode: string,
    field: keyof KoneksiItem,
    value: string | number | boolean
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.kode === kode ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async (item: KoneksiItem) => {
    setSavingKode(item.kode);
    setFeedback((prev) => {
      const next = { ...prev };
      delete next[item.kode];
      return next;
    });

    try {
      const res = await fetch("/api/admin/koneksi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode: item.kode,
          nama: item.nama,
          deskripsi: item.deskripsi || null,
          host: item.host,
          port: Number(item.port) || 3306,
          username: item.username,
          password: item.password,
          database: item.database,
          isActive: item.isActive,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback((prev) => ({
          ...prev,
          [item.kode]: {
            type: "success",
            text: json.message || "Konfigurasi berhasil disimpan.",
          },
        }));
        if (json.data) {
          setItems((prev) =>
            prev.map((x) => (x.kode === item.kode ? json.data : x))
          );
        }
      } else {
        setFeedback((prev) => ({
          ...prev,
          [item.kode]: {
            type: "error",
            text: json.error || "Gagal menyimpan konfigurasi.",
          },
        }));
      }
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [item.kode]: {
          type: "error",
          text: "Terjadi kesalahan jaringan saat menyimpan konfigurasi.",
        },
      }));
    } finally {
      setSavingKode(null);
    }
  };

  const handleTest = async (item: KoneksiItem) => {
    setTestingKode(item.kode);
    setFeedback((prev) => {
      const next = { ...prev };
      delete next[item.kode];
      return next;
    });

    try {
      const res = await fetch("/api/admin/koneksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: item.host,
          port: Number(item.port) || 3306,
          username: item.username,
          password: item.password,
          database: item.database,
        }),
      });
      const json = await res.json();
      setFeedback((prev) => ({
        ...prev,
        [item.kode]: {
          type: res.ok && json.success ? "success" : "error",
          text:
            json.message ||
            json.error ||
            "Gagal menguji koneksi ke server eksternal.",
        },
      }));
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [item.kode]: {
          type: "error",
          text: "Terjadi kesalahan jaringan saat menguji koneksi.",
        },
      }));
    } finally {
      setTestingKode(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-[#88131A] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-[#88131A] border border-rose-200">
                ADMINISTRASI SISTEM
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Setting Koneksi Server Eksternal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola konfigurasi koneksi database MySQL eksternal (
              <strong>CMS_WEB</strong> dan <strong>dbsimpatda</strong>) secara
              terpusat tanpa perlu mengubah kode sumber.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Memuat konfigurasi koneksi...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {items.map((item) => {
            const fb = feedback[item.kode];
            const isPassVisible = Boolean(showPass[item.kode]);
            const isSaving = savingKode === item.kode;
            const isTesting = testingKode === item.kode;

            return (
              <div
                key={item.kode}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5E0E14] text-white flex items-center justify-center shrink-0">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          {item.nama}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 text-slate-700">
                          {item.kode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.deskripsi || "-"}
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) =>
                        updateField(item.kode, "isActive", e.target.checked)
                      }
                      className="rounded border-slate-300 text-[#5E0E14] focus:ring-[#5E0E14]"
                    />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </label>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 text-xs flex-1">
                  {fb && (
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2 font-medium ${
                        fb.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {fb.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      )}
                      <span>{fb.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Host / IP Server <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.host}
                        onChange={(e) =>
                          updateField(item.kode, "host", e.target.value)
                        }
                        placeholder="103.167.12.55"
                        className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Port <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.port}
                        onChange={(e) =>
                          updateField(
                            item.kode,
                            "port",
                            Number(e.target.value) || 3306
                          )
                        }
                        placeholder="3306"
                        className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Database <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.database}
                      onChange={(e) =>
                        updateField(item.kode, "database", e.target.value)
                      }
                      className="w-full px-3 py-2 font-mono font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.username}
                        onChange={(e) =>
                          updateField(item.kode, "username", e.target.value)
                        }
                        className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={isPassVisible ? "text" : "password"}
                          value={item.password}
                          onChange={(e) =>
                            updateField(item.kode, "password", e.target.value)
                          }
                          className="w-full pl-3 pr-9 py-2 font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5E0E14]/20 focus:border-[#5E0E14]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPass((prev) => ({
                              ...prev,
                              [item.kode]: !prev[item.kode],
                            }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={
                            isPassVisible
                              ? "Sembunyikan Password"
                              : "Tampilkan Password"
                          }
                        >
                          {isPassVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isTesting || isSaving}
                    onClick={() => handleTest(item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{isTesting ? "Menguji..." : "Test Koneksi"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || isTesting}
                    onClick={() => handleSave(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5E0E14] to-[#88131A] text-white text-xs font-bold shadow-sm hover:opacity-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
