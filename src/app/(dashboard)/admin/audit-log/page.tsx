"use client";

import React, { useEffect, useState } from "react";
import { History, Search, ShieldAlert } from "lucide-react";
import { formatTanggal } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  username: string | null;
  userRole: string | null;
  aksi: string;
  modul: string;
  entitas: string;
  deskripsi: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [modul, setModul] = useState("");
  const [aksi, setAksi] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchLogs(m = modul, a = aksi, q = search) {
    setLoading(true);
    const params = new URLSearchParams();
    if (m) params.set("modul", m);
    if (a) params.set("aksi", a);
    if (q) params.set("search", q);

    const res = await fetch(`/api/audit-logs?${params.toString()}`);
    const json = await res.json();
    if (json.success) {
      setItems(json.data.items);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-800" />
            <span>Audit Log & Jejak Aktivitas Sistem (AUD-001, AUD-002 & AUD-005)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan permanen (immutable) seluruh aktivitas autentikasi, perubahan master data, dan administrasi pengguna
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <ShieldAlert className="w-4 h-4" />
          <span>Dilindungi AUD-005: Log Tidak Dapat Diedit/Dihapus</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={modul}
          onChange={(e) => {
            setModul(e.target.value);
            fetchLogs(e.target.value, aksi, search);
          }}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
        >
          <option value="">Semua Modul</option>
          <option value="auth">Modul Auth</option>
          <option value="users">Modul Users & RBAC</option>
          <option value="master-data">Modul Master Data</option>
        </select>

        <select
          value={aksi}
          onChange={(e) => {
            setAksi(e.target.value);
            fetchLogs(modul, e.target.value, search);
          }}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium"
        >
          <option value="">Semua Aksi</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="IMPORT">IMPORT</option>
        </select>

        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari deskripsi log, username, atau entitas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchLogs(modul, aksi, e.target.value);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
          />
        </div>
      </div>

      {/* Tabel Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                <th className="py-3 px-4">Waktu Kejadian</th>
                <th className="py-3 px-4">Aktor & Peran</th>
                <th className="py-3 px-4">Modul & Entitas</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Deskripsi Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Memuat Audit Log...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Belum ada catatan audit log yang sesuai filter.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {formatTanggal(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.username || "system"}</div>
                      <div className="text-[10px] text-slate-500">{log.userRole || "-"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{log.entitas}</div>
                      <div className="text-[10px] font-mono text-slate-500">{log.modul}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          log.aksi === "CREATE" || log.aksi === "LOGIN"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.aksi === "LOGIN_FAILED" || log.aksi === "LOCK"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.aksi}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.deskripsi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

