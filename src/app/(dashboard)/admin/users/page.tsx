"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Building2,
  GitBranch,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { formatTanggal } from "@/lib/utils";
import PaginationBar from "@/components/ui/PaginationBar";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface RoleOption {
  id: string;
  kode: string;
  nama: string;
  isCrossOpd: boolean;
}

interface OpdOption {
  id: string;
  kd_skpd: string;
  nm_skpd: string;
  singkatan: string | null;
}

interface UnitOption {
  id: string;
  opdId: string;
  kd_unit: string;
  nm_unit: string;
}

type UserLevelType = "LINTAS_OPD" | "OPD" | "UNIT";

interface UserRoleAssignmentItem {
  id: string;
  userId: string;
  roleId: string;
  opdId: string | null;
  unitKerjaId: string | null;
  jabatan: string | null;
  isPrimary: boolean;
  role: RoleOption;
  opd: OpdOption | null;
  unitKerja: UnitOption | null;
}

interface UserItem {
  id: string;
  username: string;
  email: string;
  namaLengkap: string;
  nip: string | null;
  jabatan: string | null;
  roleId: string;
  opdId: string | null;
  unitKerjaId: string | null;
  isActive: boolean;
  isLocked: boolean;
  failedLogins: number;
  lastLoginAt: string | null;
  role: RoleOption;
  opd: OpdOption | null;
  unitKerja: UnitOption | null;
  roleAssignments?: UserRoleAssignmentItem[];
}

interface FormAssignmentRow {
  key: string;
  roleId: string;
  userLevel: UserLevelType;
  opdId: string;
  unitKerjaId: string;
  jabatan: string;
}

const LEVEL_USER_OPTIONS = [
  {
    value: "OPD",
    badge: "LEVEL OPD",
    label: "Level OPD",
  },
  {
    value: "UNIT",
    badge: "LEVEL UNIT",
    label: "Level Unit Kerja / Sub-Unit",
  },
  {
    value: "LINTAS_OPD",
    badge: "LINTAS OPD",
    label: "Lintas Seluruh OPD",
  },
];

function getAssignmentLevel(a: {
  opdId: string | null;
  unitKerjaId: string | null;
}): UserLevelType {
  if (a.unitKerjaId) return "UNIT";
  if (a.opdId) return "OPD";
  return "LINTAS_OPD";
}

function getEffectiveAssignments(u: UserItem): UserRoleAssignmentItem[] {
  if (u.roleAssignments && u.roleAssignments.length > 0) {
    return u.roleAssignments;
  }
  return [
    {
      id: `primary-${u.id}`,
      userId: u.id,
      roleId: u.roleId,
      opdId: u.opdId,
      unitKerjaId: u.unitKerjaId,
      jabatan: u.jabatan,
      isPrimary: true,
      role: u.role,
      opd: u.opd,
      unitKerja: u.unitKerja,
    },
  ];
}

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [opds, setOpds] = useState<OpdOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterOpdId, setFilterOpdId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal Form (Tambah & Edit)
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<UserItem | null>(null);
  const [form, setForm] = useState<{
    username: string;
    email: string;
    password: string;
    namaLengkap: string;
    nip: string;
    jabatan: string;
    isActive: boolean;
    assignments: FormAssignmentRow[];
  }>({
    username: "",
    email: "",
    password: "sitarida123",
    namaLengkap: "",
    nip: "",
    jabatan: "",
    isActive: true,
    assignments: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Banner & Confirm Delete
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resUsers, resRoles, resOpds, resUnits] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/roles"),
        fetch("/api/master/opd?limit=500"),
        fetch("/api/master/unit-kerja?limit=1000"),
      ]);
      const [jsonUsers, jsonRoles, jsonOpds, jsonUnits] = await Promise.all([
        resUsers.json(),
        resRoles.json(),
        resOpds.json(),
        resUnits.json(),
      ]);

      if (jsonUsers.success) setAllUsers(jsonUsers.data);
      if (jsonRoles.success) setRoles(jsonRoles.data.roles);
      if (jsonOpds.success) setOpds(jsonOpds.data);
      if (jsonUnits.success) setUnits(jsonUnits.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Options untuk SearchableSelect
  const roleSelectOptions = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        badge: r.kode,
        label: r.nama,
        subLabel: r.isCrossOpd ? "Role Lintas OPD" : "Role Spesifik OPD / Unit",
      })),
    [roles]
  );

  const opdSelectOptions = useMemo(
    () =>
      opds.map((o) => ({
        value: o.id,
        badge: o.kd_skpd,
        label: o.nm_skpd,
        subLabel: o.singkatan || undefined,
      })),
    [opds]
  );

  const getUnitOptionsForOpd = useCallback(
    (opdId: string) => {
      const filtered = opdId ? units.filter((u) => u.opdId === opdId) : units;
      return filtered.map((u) => ({
        value: u.id,
        badge: u.kd_unit,
        label: u.nm_unit,
      }));
    },
    [units]
  );

  // Filter & Pagination Daftar Pengguna
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const assignments = getEffectiveAssignments(u);
      if (filterLevel) {
        const matchLv = assignments.some(
          (a) => getAssignmentLevel(a) === filterLevel
        );
        if (!matchLv) return false;
      }
      if (filterOpdId) {
        const matchOpd = assignments.some((a) => a.opdId === filterOpdId);
        if (!matchOpd) return false;
      }
      if (!q) return true;
      const inBasic =
        u.namaLengkap.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip && u.nip.toLowerCase().includes(q)) ||
        (u.jabatan && u.jabatan.toLowerCase().includes(q));
      if (inBasic) return true;

      return assignments.some(
        (a) =>
          a.role?.nama?.toLowerCase().includes(q) ||
          a.opd?.nm_skpd?.toLowerCase().includes(q) ||
          a.unitKerja?.nm_unit?.toLowerCase().includes(q) ||
          (a.jabatan && a.jabatan.toLowerCase().includes(q))
      );
    });
  }, [allUsers, search, filterLevel, filterOpdId]);

  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * limit, page * limit),
    [filteredUsers, page, limit]
  );

  function createEmptyAssignmentRow(): FormAssignmentRow {
    const defaultOpdRole = roles.find((r) => !r.isCrossOpd) || roles[0];
    const defaultOpdId = filterOpdId || (opds[0]?.id ?? "");
    return {
      key: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      roleId: defaultOpdRole?.id ?? "",
      userLevel: defaultOpdRole?.isCrossOpd ? "LINTAS_OPD" : "OPD",
      opdId: defaultOpdRole?.isCrossOpd ? "" : defaultOpdId,
      unitKerjaId: "",
      jabatan: "",
    };
  }

  function openCreate() {
    setEditItem(null);
    setErrorMsg("");
    setForm({
      username: "",
      email: "",
      password: "sitarida123",
      namaLengkap: "",
      nip: "",
      jabatan: "",
      isActive: true,
      assignments: [createEmptyAssignmentRow()],
    });
    setShowModal(true);
  }

  function openEdit(u: UserItem) {
    setEditItem(u);
    setErrorMsg("");
    const effective = getEffectiveAssignments(u);
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      namaLengkap: u.namaLengkap,
      nip: u.nip || "",
      jabatan: u.jabatan || "",
      isActive: u.isActive,
      assignments: effective.map((a, idx) => ({
        key: a.id || `assign-${idx}`,
        roleId: a.roleId,
        userLevel: getAssignmentLevel(a),
        opdId: a.opdId || "",
        unitKerjaId: a.unitKerjaId || "",
        jabatan: a.jabatan || "",
      })),
    });
    setShowModal(true);
  }

  function handleAddAssignmentRow() {
    setForm((prev) => ({
      ...prev,
      assignments: [...prev.assignments, createEmptyAssignmentRow()],
    }));
  }

  function handleRemoveAssignmentRow(key: string) {
    setForm((prev) => {
      if (prev.assignments.length <= 1) return prev;
      return {
        ...prev,
        assignments: prev.assignments.filter((a) => a.key !== key),
      };
    });
  }

  function updateAssignmentRow(
    key: string,
    updater: (row: FormAssignmentRow) => FormAssignmentRow
  ) {
    setForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((row) =>
        row.key === key ? updater(row) : row
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      if (form.assignments.length === 0) {
        throw new Error("Minimal 1 penugasan peran harus diisi.");
      }

      const normalizedAssignments = form.assignments.map((a, idx) => {
        if (!a.roleId) {
          throw new Error(`Role pada Peran #${idx + 1} wajib dipilih.`);
        }
        if (a.userLevel === "OPD" && !a.opdId) {
          throw new Error(
            `Pada Peran #${idx + 1} (Level OPD), Perangkat Daerah (OPD) wajib dipilih.`
          );
        }
        if (a.userLevel === "UNIT" && (!a.opdId || !a.unitKerjaId)) {
          throw new Error(
            `Pada Peran #${idx + 1} (Level UNIT), Perangkat Daerah (OPD) dan Unit Kerja wajib dipilih.`
          );
        }

        const finalOpdId =
          a.userLevel === "LINTAS_OPD" ? null : a.opdId || null;
        const finalUnitId =
          a.userLevel === "UNIT" ? a.unitKerjaId || null : null;

        return {
          roleId: a.roleId,
          opdId: finalOpdId,
          unitKerjaId: finalUnitId,
          jabatan: a.jabatan.trim() || form.jabatan.trim() || null,
          isPrimary: idx === 0,
        };
      });

      const primary = normalizedAssignments[0];
      const url = editItem ? `/api/users/${editItem.id}` : "/api/users";
      const method = editItem ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        email: form.email,
        namaLengkap: form.namaLengkap,
        nip: form.nip || null,
        jabatan: primary.jabatan || form.jabatan || null,
        roleId: primary.roleId,
        opdId: primary.opdId,
        unitKerjaId: primary.unitKerjaId,
        assignments: normalizedAssignments,
        isActive: form.isActive,
      };

      if (!editItem) {
        payload.username = form.username;
        payload.password = form.password;
      } else if (form.password.trim().length > 0) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menyimpan data pengguna"
        );
      }

      setShowModal(false);
      setFeedback({
        type: "success",
        title: editItem ? "Pengguna Diperbarui" : "Pengguna Ditambahkan",
        message: `Pengguna '${form.namaLengkap}' (@${form.username}) dengan ${normalizedAssignments.length} peran penugasan berhasil ${
          editItem ? "diperbarui" : "ditambahkan"
        }.`,
      });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Pengguna",
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleLock(u: UserItem) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !u.isLocked }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal mengubah status kunci akun"
        );
      }
      setFeedback({
        type: "success",
        title: u.isLocked ? "Kunci Akun Dibuka" : "Akun Dikunci",
        message: `Akun @${u.username} (${u.namaLengkap}) berhasil ${
          u.isLocked ? "dibuka kuncinya" : "dikunci"
        }.`,
      });
      fetchData();
    } catch (err: any) {
      setFeedback({
        type: "error",
        title: "Gagal Mengubah Status Akun",
        message: err.message,
      });
    }
  }

  function handleDelete(u: UserItem) {
    setDeleteError(null);
    setDeleteTarget(u);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menghapus pengguna"
        );
      }
      const deleted = deleteTarget;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Pengguna Dihapus",
        message: `Pengguna [@${deleted.username}] ${deleted.namaLengkap} telah berhasil dihapus.`,
      });
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message);
      setFeedback({
        type: "error",
        title: "Gagal Menghapus Pengguna",
        message: err.message,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#991B1B]" />
            Manajemen Pengguna & Multi-Peran (Penugasan OPD / Unit)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Satu akun pengguna dapat memiliki lebih dari 1 peran penugasan (contoh: Kepala Bidang Anggaran lintas OPD sekaligus PPTK pada OPD tertentu).
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, username, NIP, role, OPD..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
              />
            </div>

            <div className="w-full sm:w-56">
              <SearchableSelect
                options={LEVEL_USER_OPTIONS}
                value={filterLevel}
                onChange={(val) => {
                  setFilterLevel(val);
                  setPage(1);
                }}
                clearLabel="- Semua Level User -"
                placeholder="- Semua Level User -"
                searchPlaceholder="Cari level user..."
              />
            </div>

            <div className="w-full sm:w-72">
              <SearchableSelect
                options={opdSelectOptions}
                value={filterOpdId}
                onChange={(val) => {
                  setFilterOpdId(val);
                  setPage(1);
                }}
                clearLabel="- Semua OPD -"
                placeholder="- Semua OPD -"
                searchPlaceholder="Cari kode atau nama OPD..."
              />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-[#991B1B]">{total}</strong> Pengguna
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#5E0E14] text-white text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Pegawai & NIP</th>
                <th className="px-4 py-3 font-semibold">Username & Email</th>
                <th className="px-4 py-3 font-semibold">
                  Daftar Peran & Cakupan OPD / Unit Kerja
                </th>
                <th className="px-4 py-3 font-semibold text-center w-28">Status</th>
                <th className="px-4 py-3 font-semibold text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Memuat data Pengguna...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data Pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const assignments = getEffectiveAssignments(u);
                  return (
                    <tr key={u.id} className="hover:bg-red-50/30 transition align-top">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{u.namaLengkap}</div>
                        {u.nip && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                            NIP. {u.nip}
                          </span>
                        )}
                        {assignments.length > 1 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-[#991B1B] border border-red-200 text-[10px] font-extrabold">
                              <Layers className="w-3 h-3" />
                              {assignments.length} Peran Aktif
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#991B1B]">
                          @{u.username}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {assignments.map((a, idx) => {
                            const lv = getAssignmentLevel(a);
                            return (
                              <div
                                key={a.id || idx}
                                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {assignments.length > 1 && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#5E0E14] text-white text-[10px] font-bold">
                                        Peran {idx + 1}
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300 text-xs font-extrabold">
                                      {a.role?.nama}
                                    </span>
                                    {a.jabatan && (
                                      <span className="text-[11px] text-slate-500 italic">
                                        ({a.jabatan})
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs">
                                    {lv === "LINTAS_OPD" ? (
                                      <span className="font-semibold text-emerald-800">
                                        Seluruh Perangkat Daerah & Unit Kerja (Lintas OPD)
                                      </span>
                                    ) : (
                                      <div>
                                        <span className="font-mono text-[#991B1B] font-bold mr-1">
                                          [{a.opd?.kd_skpd}]
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                          {a.opd?.nm_skpd}
                                        </span>
                                        {lv === "UNIT" && a.unitKerja && (
                                          <div className="text-[11px] text-amber-900 font-semibold mt-0.5">
                                            Sub-Unit: [{a.unitKerja.kd_unit}]{" "}
                                            {a.unitKerja.nm_unit}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {lv === "OPD" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-red-50 text-[#991B1B] border border-red-200">
                                      <Building2 className="w-3 h-3" />
                                      LEVEL OPD
                                    </span>
                                  ) : lv === "UNIT" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                                      <GitBranch className="w-3 h-3" />
                                      LEVEL UNIT
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <ShieldCheck className="w-3 h-3" />
                                      LINTAS OPD
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.isLocked
                              ? "bg-red-100 text-red-800"
                              : u.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.isLocked ? "Terkunci" : u.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {formatTanggal(u.lastLoginAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                            title="Edit Pengguna & Peran"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleLock(u)}
                            className={`p-1.5 rounded-md border transition cursor-pointer ${
                              u.isLocked
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                            }`}
                            title={u.isLocked ? "Buka Kunci Akun" : "Kunci Akun"}
                          >
                            {u.isLocked ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal Form Input / Update */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-xl border border-slate-200 my-8 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-[#991B1B] text-white rounded-t-xl flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base">
                {editItem
                  ? `Update Pengguna & Peran (@${editItem.username})`
                  : "Tambah Pengguna Baru"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5 overflow-y-auto flex-1"
            >
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Bagian 1: Identitas Akun Pegawai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editItem)}
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Contoh: kabid.anggaran / nip pegawai"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nama@tapselkab.go.id"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.namaLengkap}
                    onChange={(e) =>
                      setForm({ ...form, namaLengkap: e.target.value })
                    }
                    placeholder="Contoh: Ahmad Fauzi, S.E."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editItem
                      ? "Password Baru (Kosongkan jika tetap)"
                      : "Password Awal *"}
                  </label>
                  <input
                    type="text"
                    required={!editItem}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={
                      editItem
                        ? "Isi hanya jika ingin ganti password"
                        : "Min. 6 karakter"
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Pegawai
                  </label>
                  <input
                    type="text"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    placeholder="18 digit NIP"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan Utama (Default)
                  </label>
                  <input
                    type="text"
                    value={form.jabatan}
                    onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                    placeholder="Contoh: Kepala Bidang Anggaran"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {/* Bagian 2: Daftar Penugasan Peran (Multi-Role seperti SIPD) */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#5E0E14] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#991B1B]" />
                      Daftar Penugasan Peran & Cakupan Akses ({form.assignments.length}{" "}
                      Peran)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Jika pengguna memiliki lebih dari 1 peran, saat login pengguna akan diminta memilih ingin masuk sebagai peran yang mana.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAssignmentRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#991B1B] border border-red-200 text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Peran Lain
                  </button>
                </div>

                <div className="space-y-3">
                  {form.assignments.map((row, idx) => {
                    const unitOpts = getUnitOptionsForOpd(row.opdId);
                    return (
                      <div
                        key={row.key}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#5E0E14] text-white text-[10px] font-extrabold uppercase">
                              Peran #{idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                (Peran Utama)
                              </span>
                            )}
                          </div>

                          {form.assignments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignmentRow(row.key)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus Peran Ini
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Role / Hak Akses (RBAC) *
                            </label>
                            <SearchableSelect
                              options={roleSelectOptions}
                              value={row.roleId}
                              onChange={(val) => {
                                const selectedRole = roles.find((r) => r.id === val);
                                updateAssignmentRow(row.key, (prev) => {
                                  const nextLevel: UserLevelType = selectedRole?.isCrossOpd
                                    ? "LINTAS_OPD"
                                    : prev.userLevel === "LINTAS_OPD"
                                      ? "OPD"
                                      : prev.userLevel;
                                  return {
                                    ...prev,
                                    roleId: val,
                                    userLevel: nextLevel,
                                    opdId:
                                      nextLevel === "LINTAS_OPD"
                                        ? ""
                                        : prev.opdId || opds[0]?.id || "",
                                    unitKerjaId:
                                      nextLevel === "UNIT" ? prev.unitKerjaId : "",
                                  };
                                });
                              }}
                              placeholder="- Pilih Role / Hak Akses -"
                              searchPlaceholder="Cari kode atau nama Role..."
                              allowClear={false}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Level Cakupan Akses *
                            </label>
                            <SearchableSelect
                              options={LEVEL_USER_OPTIONS}
                              value={row.userLevel}
                              onChange={(val) => {
                                const nextLevel = val as UserLevelType;
                                updateAssignmentRow(row.key, (prev) => ({
                                  ...prev,
                                  userLevel: nextLevel,
                                  opdId:
                                    nextLevel === "LINTAS_OPD"
                                      ? ""
                                      : prev.opdId || opds[0]?.id || "",
                                  unitKerjaId:
                                    nextLevel === "UNIT" ? prev.unitKerjaId : "",
                                }));
                              }}
                              placeholder="- Pilih Level Cakupan -"
                              searchPlaceholder="Cari level cakupan..."
                              allowClear={false}
                              required
                            />
                          </div>

                          {row.userLevel !== "LINTAS_OPD" && (
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Perangkat Daerah / OPD *
                              </label>
                              <SearchableSelect
                                options={opdSelectOptions}
                                value={row.opdId}
                                onChange={(val) => {
                                  const firstUnit = units.find(
                                    (u) => u.opdId === val
                                  );
                                  updateAssignmentRow(row.key, (prev) => ({
                                    ...prev,
                                    opdId: val,
                                    unitKerjaId:
                                      prev.userLevel === "UNIT"
                                        ? firstUnit?.id ?? ""
                                        : "",
                                  }));
                                }}
                                placeholder="- Pilih Perangkat Daerah (OPD) -"
                                searchPlaceholder="Cari kode atau nama OPD..."
                                allowClear={false}
                                required
                              />
                            </div>
                          )}

                          {row.userLevel === "UNIT" && (
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Unit Kerja / Sub-Unit *
                              </label>
                              <SearchableSelect
                                options={unitOpts}
                                value={row.unitKerjaId}
                                onChange={(val) =>
                                  updateAssignmentRow(row.key, (prev) => ({
                                    ...prev,
                                    unitKerjaId: val,
                                  }))
                                }
                                placeholder={
                                  row.opdId
                                    ? "- Pilih Unit Kerja di Bawah OPD -"
                                    : "- Pilih OPD terlebih dahulu -"
                                }
                                searchPlaceholder="Cari kode atau nama Unit Kerja..."
                                disabled={!row.opdId}
                                allowClear={false}
                                required
                              />
                            </div>
                          )}

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Jabatan Spesifik pada Peran Ini (Opsional)
                            </label>
                            <input
                              type="text"
                              value={row.jabatan}
                              onChange={(e) =>
                                updateAssignmentRow(row.key, (prev) => ({
                                  ...prev,
                                  jabatan: e.target.value,
                                }))
                              }
                              placeholder="Contoh: Kepala Bidang Anggaran / PPTK Kegiatan ..."
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usrActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-[#991B1B]"
                />
                <label
                  htmlFor="usrActive"
                  className="text-xs font-medium text-slate-700"
                >
                  Akun Pengguna Aktif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Menyimpan..."
                    : editItem
                      ? "Simpan Perubahan"
                      : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Pengguna"
        entityName="Pengguna"
        itemCode={deleteTarget ? `@${deleteTarget.username}` : undefined}
        itemLabel={deleteTarget?.namaLengkap}
        description="Penghapusan akun pengguna akan mencabut seluruh akses ke sistem SITARIDA dan dicatat pada Audit Log."
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
