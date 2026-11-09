"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Save,
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  Search,
  Layers,
  Eye,
  KeyRound,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RBAC_MODULE_GROUPS } from "@/lib/rbac-catalog";
import ActionBanner, { ActionFeedback } from "@/components/ui/ActionBanner";
import ConfirmDeleteDialog from "@/components/ui/ConfirmDeleteDialog";

interface PermissionItem {
  id: string;
  kode: string;
  nama: string;
  modul: string;
  deskripsi?: string | null;
}

interface RoleItem {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  isCrossOpd: boolean;
  isSystem?: boolean;
  _count: {
    users: number;
    userRoleAssignments?: number;
  };
  permissions: Array<{ permission: PermissionItem }>;
}

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [checkedKodes, setCheckedKodes] = useState<string[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // Modal Tambah / Edit Role
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRoleItem, setEditRoleItem] = useState<RoleItem | null>(null);
  const [roleForm, setRoleForm] = useState({
    kode: "",
    nama: "",
    deskripsi: "",
    isCrossOpd: false,
  });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFormError, setRoleFormError] = useState("");

  // Dialog Hapus Role
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fitur Hide Dropdown per Modul
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    for (const grp of RBAC_MODULE_GROUPS) {
      allCollapsed[grp.groupKey] = true;
    }
    setCollapsedGroups(allCollapsed);
  };

  const fetchData = useCallback(async (keepSelectedRoleId?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      const json = await res.json();
      if (json.success) {
        const fetchedRoles: RoleItem[] = json.data.roles;
        const fetchedPerms: PermissionItem[] = json.data.permissions;
        setRoles(fetchedRoles);
        setPermissions(fetchedPerms);

        const targetRole =
          (keepSelectedRoleId &&
            fetchedRoles.find((r) => r.id === keepSelectedRoleId)) ||
          fetchedRoles[0];

        if (targetRole) {
          setSelectedRoleId(targetRole.id);
          setCheckedKodes(
            targetRole.permissions.map((rp) => rp.permission.kode)
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map kode permission -> id database
  const permByKode = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    for (const p of permissions) {
      map.set(p.kode, p);
    }
    return map;
  }, [permissions]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.kode.toLowerCase().includes(q) ||
        (r.deskripsi && r.deskripsi.toLowerCase().includes(q))
    );
  }, [roles, roleSearch]);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const isSuperadminRole =
    activeRole?.kode === "0" || activeRole?.kode === "SUPERADMIN";

  function handleSelectRole(role: RoleItem) {
    setSelectedRoleId(role.id);
    setCheckedKodes(role.permissions.map((rp) => rp.permission.kode));
  }

  function toggleMenuPermission(
    menuPermKode: string,
    actions: Array<{ kode: string }>
  ) {
    if (isSuperadminRole) return;
    setCheckedKodes((prev) => {
      const isCurrentlyChecked = prev.includes(menuPermKode);
      if (isCurrentlyChecked) {
        // Jika menu dimatikan, matikan juga hak aksi di dalam menu tersebut
        const actionKodes = new Set(actions.map((a) => a.kode));
        return prev.filter(
          (k) => k !== menuPermKode && !actionKodes.has(k)
        );
      } else {
        // Jika menu diaktifkan, otomatis aktifkan aksi baca pertama (jika ada)
        const next = new Set(prev);
        next.add(menuPermKode);
        const firstReadAction = actions.find((a) => a.kode.endsWith(":read"));
        if (firstReadAction) {
          next.add(firstReadAction.kode);
        }
        return Array.from(next);
      }
    });
  }

  function toggleActionPermission(actionKode: string, parentMenuPermKode: string) {
    if (isSuperadminRole) return;
    setCheckedKodes((prev) => {
      const next = new Set(prev);
      if (next.has(actionKode)) {
        next.delete(actionKode);
      } else {
        next.add(actionKode);
        // Pastikan menu induknya juga otomatis tampil di Sidebar saat aksi di dalamnya dicentang
        next.add(parentMenuPermKode);
      }
      return Array.from(next);
    });
  }

  function toggleGroupAll(groupKey: string, enable: boolean) {
    if (isSuperadminRole) return;
    const grp = RBAC_MODULE_GROUPS.find((g) => g.groupKey === groupKey);
    if (!grp) return;

    const groupKodes: string[] = [];
    for (const item of grp.items) {
      groupKodes.push(item.menuPermKode);
      for (const act of item.actions) {
        groupKodes.push(act.kode);
      }
    }

    setCheckedKodes((prev) => {
      const next = new Set(prev);
      for (const k of groupKodes) {
        if (enable) next.add(k);
        else next.delete(k);
      }
      return Array.from(next);
    });
  }

  function toggleAllCatalog(enable: boolean) {
    if (isSuperadminRole) return;
    if (!enable) {
      setCheckedKodes([]);
      return;
    }
    const allKodes = new Set<string>();
    for (const grp of RBAC_MODULE_GROUPS) {
      for (const item of grp.items) {
        allKodes.add(item.menuPermKode);
        for (const act of item.actions) {
          allKodes.add(act.kode);
        }
      }
    }
    setCheckedKodes(Array.from(allKodes));
  }

  async function handleSavePermissions() {
    if (!activeRole || isSuperadminRole) return;
    setSaving(true);
    setFeedback(null);
    try {
      const permissionIds = checkedKodes
        .map((kode) => permByKode.get(kode)?.id)
        .filter((id): id is string => Boolean(id));

      const res = await fetch("/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: activeRole.id,
          permissionIds,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menyimpan pemetaan hak akses"
        );
      }

      setFeedback({
        type: "success",
        title: "Pemetaan Menu & Hak Akses Disimpan",
        message: `Konfigurasi menu sidebar dan hak akses untuk role '${activeRole.nama}' berhasil diperbarui secara dinamis.`,
      });
      await fetchData(activeRole.id);
      router.refresh();
    } catch (err: any) {
      setFeedback({
        type: "error",
        title: "Gagal Menyimpan Hak Akses",
        message: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  function openCreateRoleModal() {
    setEditRoleItem(null);
    setRoleFormError("");
    const nextNum = roles.length + 1;
    setRoleForm({
      kode: String(nextNum),
      nama: "",
      deskripsi: "",
      isCrossOpd: false,
    });
    setShowRoleModal(true);
  }

  function openEditRoleModal(role: RoleItem, e: React.MouseEvent) {
    e.stopPropagation();
    setEditRoleItem(role);
    setRoleFormError("");
    setRoleForm({
      kode: role.kode,
      nama: role.nama,
      deskripsi: role.deskripsi || "",
      isCrossOpd: role.isCrossOpd,
    });
    setShowRoleModal(true);
  }

  async function handleRoleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRoleSubmitting(true);
    setRoleFormError("");
    try {
      const method = editRoleItem ? "PATCH" : "POST";
      const payload = editRoleItem
        ? { id: editRoleItem.id, ...roleForm }
        : roleForm;

      const res = await fetch("/api/roles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menyimpan data Role"
        );
      }

      setShowRoleModal(false);
      setFeedback({
        type: "success",
        title: editRoleItem ? "Role Diperbarui" : "Role Baru Ditambahkan",
        message: `Role '${roleForm.nama}' (Kode: ${roleForm.kode}) berhasil ${editRoleItem ? "diperbarui" : "ditambahkan"
          }.`,
      });
      await fetchData(json.data?.id || selectedRoleId);
      router.refresh();
    } catch (err: any) {
      setRoleFormError(err.message);
    } finally {
      setRoleSubmitting(false);
    }
  }

  async function handleConfirmDeleteRole() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/roles?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || json.message || "Gagal menghapus Role"
        );
      }
      const deletedName = deleteTarget.nama;
      setDeleteTarget(null);
      setFeedback({
        type: "success",
        title: "Role Dihapus",
        message: `Role '${deletedName}' telah berhasil dihapus dari sistem.`,
      });
      await fetchData();
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // Hitung jumlah menu sidebar yang aktif untuk role terpilih
  const activeMenuCount = useMemo(() => {
    let count = 0;
    for (const grp of RBAC_MODULE_GROUPS) {
      for (const item of grp.items) {
        if (isSuperadminRole || checkedKodes.includes(item.menuPermKode)) {
          count++;
        }
      }
    }
    return count;
  }, [checkedKodes, isSuperadminRole]);

  const totalCatalogMenus = useMemo(
    () => RBAC_MODULE_GROUPS.reduce((acc, g) => acc + g.items.length, 0),
    []
  );

  return (
    <div className="space-y-4">
      <ActionBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#991B1B]" />
            <span>Manajemen Role, Pemetaan Modul</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasikan secara dinamis menu apa saja yang tampil di Sidebar serta kewenangan aksi (Lihat, Input/Ubah, Kunci/Verifikasi) untuk setiap Peran User.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateRoleModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-sm font-semibold shadow-sm transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Role Baru
        </button>
      </div>

      {loading ? (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Memuat daftar Role & Matriks Modul...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* KOLOM KIRI: DAFTAR ROLE */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-[#5E0E14] text-white flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Daftar Peran / Role ({roles.length})
              </span>
            </div>

            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Cari nama atau kode role..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[72vh] overflow-y-auto">
              {filteredRoles.map((role) => {
                const isSelected = role.id === selectedRoleId;
                const isRoleSuper =
                  role.kode === "0" || role.kode === "SUPERADMIN";
                const totalAssigned =
                  role._count.userRoleAssignments || role._count.users || 0;

                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`p-3.5 transition-all cursor-pointer ${isSelected
                      ? "bg-red-50/80 border-l-4 border-l-[#991B1B]"
                      : "bg-white hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-[#5E0E14] text-white font-mono text-[10px] font-bold">
                            #{role.kode}
                          </span>
                          <span
                            className={`font-extrabold text-xs ${isSelected ? "text-[#991B1B]" : "text-slate-900"
                              }`}
                          >
                            {role.nama}
                          </span>
                        </div>

                        {role.deskripsi && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {role.deskripsi}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => openEditRoleModal(role, e)}
                          className="p-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                          title="Edit Nama / Cakupan Role"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {!isRoleSuper && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              setDeleteTarget(role);
                            }}
                            className="p-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                            title="Hapus Role"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                      {role.isCrossOpd ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Lintas OPD
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="w-3 h-3" />
                          Spesifik OPD / Unit
                        </span>
                      )}

                      <span className="font-mono text-slate-500">
                        {totalAssigned} Penugasan •{" "}
                        {isRoleSuper ? "Semua" : role.permissions.length} Izin
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KOLOM KANAN: KONFIGURASI DINAMIS MODUL, MENU SIDEBAR & HAK AKSES */}
          <div className="lg:col-span-8 space-y-4">
            {activeRole && (
              <>
                {/* Bar Atas Role Aktif */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#5E0E14] text-white font-mono text-xs font-extrabold">
                          Kode Role: {activeRole.kode}
                        </span>
                        <h2 className="text-base font-extrabold text-slate-900">
                          {activeRole.nama}
                        </h2>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border ${activeRole.isCrossOpd
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-red-50 text-[#991B1B] border-red-200"
                            }`}
                        >
                          {activeRole.isCrossOpd
                            ? "Default: Lintas OPD"
                            : "Default: Spesifik OPD / Unit"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {activeRole.deskripsi ||
                          "Centang menu di bawah ini untuk menampilkan menu pada Sidebar dan mengatur hak akses operasionalnya."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSavePermissions}
                      disabled={saving || isSuperadminRole}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {saving
                          ? "Menyimpan..."
                          : "Simpan Pemetaan Menu & Hak Akses"}
                      </span>
                    </button>
                  </div>

                  {/* Ringkasan & Tombol Cepat */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      {isSuperadminRole && (
                        <span className="text-xs font-semibold text-emerald-700">
                          ✓ Role Superadmin memiliki akses penuh ke seluruh modul & menu.
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Kontrol Hide / Expand Dropdown Semua Modul */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={expandAllGroups}
                          className="px-2.5 py-1 rounded text-slate-700 hover:text-slate-900 hover:bg-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Buka seluruh dropdown modul"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                          <span>Buka Semua</span>
                        </button>
                        <button
                          type="button"
                          onClick={collapseAllGroups}
                          className="px-2.5 py-1 rounded text-slate-700 hover:text-slate-900 hover:bg-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Tutup / sembunyikan seluruh dropdown modul"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                          <span>Tutup Semua</span>
                        </button>
                      </div>

                      {!isSuperadminRole && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAllCatalog(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#991B1B]" />
                            Aktifkan Semua Modul
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAllCatalog(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 text-slate-500" />
                            Kosongkan Semua
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Daftar Kelompok Modul & Menu */}
                {RBAC_MODULE_GROUPS.map((group) => {
                  const isCollapsed = !!collapsedGroups[group.groupKey];
                  const allGroupMenuChecked = group.items.every(
                    (it) =>
                      isSuperadminRole || checkedKodes.includes(it.menuPermKode)
                  );
                  const activeCountInGroup = group.items.filter(
                    (it) =>
                      isSuperadminRole || checkedKodes.includes(it.menuPermKode)
                  ).length;

                  return (
                    <div
                      key={group.groupKey}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200"
                    >
                      {/* Header Modul (Dapat diklik untuk Toggle / Hide Dropdown) */}
                      <div
                        onClick={() => toggleGroupCollapse(group.groupKey)}
                        className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#46090E] via-[#5E0E14] to-[#781219] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:brightness-105 select-none transition"
                        title={
                          isCollapsed
                            ? "Klik untuk membuka modul ini"
                            : "Klik untuk menyembunyikan modul ini"
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupCollapse(group.groupKey);
                            }}
                            className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-amber-300 transition shrink-0"
                            title={isCollapsed ? "Buka modul" : "Sembunyikan modul"}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed
                                  ? "-rotate-90 text-amber-300/70"
                                  : "rotate-0 text-amber-300"
                                }`}
                            />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-extrabold tracking-wide flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-300" />
                                <span>{group.groupTitle}</span>
                              </h3>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeCountInGroup > 0
                                    ? "bg-amber-400/20 text-amber-200 border-amber-300/40"
                                    : "bg-white/10 text-white/70 border-white/20"
                                  }`}
                              >
                                {activeCountInGroup} dari {group.items.length} Menu Aktif
                              </span>
                            </div>
                            <p className="text-[11px] text-red-100/80 mt-0.5 truncate">
                              {group.groupSubtitle}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0 self-end sm:self-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isSuperadminRole && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleGroupAll(
                                  group.groupKey,
                                  !allGroupMenuChecked
                                )
                              }
                              className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition cursor-pointer"
                            >
                              {allGroupMenuChecked
                                ? "Nonaktifkan Semua"
                                : "Pilih Semua"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleGroupCollapse(group.groupKey)}
                            className="px-2.5 py-1 rounded bg-black/25 hover:bg-black/35 text-amber-200 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <span>{isCollapsed ? "Buka Modul" : "Sembunyikan"}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Daftar Menu di dalam Modul (Hanya tampil jika tidak di-hide / collapse) */}
                      {!isCollapsed && (
                        <div className="p-4 space-y-3 divide-y divide-slate-100 animate-in fade-in duration-150">
                          {group.items.map((item) => {
                            const menuChecked =
                              isSuperadminRole ||
                              checkedKodes.includes(item.menuPermKode);

                            return (
                              <div
                                key={item.menuKey}
                                className={`pt-3 first:pt-0 rounded-xl p-3.5 border transition-colors ${menuChecked
                                  ? "bg-red-50/35 border-red-200"
                                  : "bg-slate-50/60 border-slate-200"
                                  }`}
                              >
                                {/* Baris Utama: Checkbox Tampilkan Menu di Sidebar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="flex items-start sm:items-center gap-3 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      disabled={isSuperadminRole}
                                      checked={menuChecked}
                                      onChange={() =>
                                        toggleMenuPermission(
                                          item.menuPermKode,
                                          item.actions
                                        )
                                      }
                                      className="w-4 h-4 rounded border-slate-300 text-[#991B1B] focus:ring-[#991B1B] mt-0.5 sm:mt-0"
                                    />
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-extrabold text-slate-900">
                                          {item.menuLabel}
                                        </span>
                                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                          {item.menuHref}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                        <Eye className="w-3 h-3 text-[#991B1B]" />
                                        <span>
                                          {menuChecked
                                            ? "Menu ditampilkan di Sidebar untuk Role ini"
                                            : "Menu disembunyikan dari Sidebar untuk Role ini"}
                                        </span>
                                      </div>
                                    </div>
                                  </label>

                                  <span
                                    className={`shrink-0 self-start sm:self-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${menuChecked
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-slate-200 text-slate-600"
                                      }`}
                                  >
                                    {menuChecked ? "MENU AKTIF" : "DISEMBUNYIKAN"}
                                  </span>
                                </div>

                                {/* Hak Aksi Spesifik di Dalam Menu (Jika Ada) */}
                                {item.actions.length > 0 && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 pl-0 sm:pl-7">
                                    <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                                      <KeyRound className="w-3 h-3 text-[#991B1B]" />
                                      <span>
                                        Kewenangan Operasional / Aksi pada Menu{" "}
                                        {item.menuLabel}:
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {item.actions.map((act) => {
                                        const actChecked =
                                          isSuperadminRole ||
                                          checkedKodes.includes(act.kode);
                                        return (
                                          <label
                                            key={act.kode}
                                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${actChecked
                                              ? "bg-white border-[#991B1B]/40 shadow-2xs"
                                              : "bg-white/60 border-slate-200 opacity-75 hover:opacity-100"
                                              }`}
                                          >
                                            <input
                                              type="checkbox"
                                              disabled={isSuperadminRole}
                                              checked={actChecked}
                                              onChange={() =>
                                                toggleActionPermission(
                                                  act.kode,
                                                  item.menuPermKode
                                                )
                                              }
                                              className="mt-0.5 rounded border-slate-300 text-[#991B1B] focus:ring-[#991B1B]"
                                            />
                                            <div>
                                              <div className="text-xs font-bold text-slate-800">
                                                {act.nama}
                                              </div>
                                              <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                                {act.deskripsi}
                                              </div>
                                              <div className="text-[10px] font-mono text-[#991B1B] mt-0.5">
                                                {act.kode}
                                              </div>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Role */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
            <div className="px-6 py-4 bg-[#991B1B] text-white rounded-t-xl flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editRoleItem
                  ? `Edit Role (${editRoleItem.nama})`
                  : "Tambah Role Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="text-white/80 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRoleFormSubmit} className="p-6 space-y-4">
              {roleFormError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {roleFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Role *
                </label>
                <input
                  type="text"
                  required
                  disabled={
                    editRoleItem?.kode === "0" ||
                    editRoleItem?.kode === "SUPERADMIN"
                  }
                  value={roleForm.kode}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, kode: e.target.value })
                  }
                  placeholder="Contoh: 15 atau VERIFIKATOR"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Role / Peran *
                </label>
                <input
                  type="text"
                  required
                  value={roleForm.nama}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, nama: e.target.value })
                  }
                  placeholder="Contoh: Verifikator Anggaran / Kasubag Program"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Kewenangan
                </label>
                <textarea
                  rows={2}
                  value={roleForm.deskripsi}
                  onChange={(e) =>
                    setRoleForm({ ...roleForm, deskripsi: e.target.value })
                  }
                  placeholder="Penjelasan singkat tugas dan kewenangan role ini..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roleForm.isCrossOpd}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, isCrossOpd: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-300 text-[#991B1B]"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Role Lintas OPD (Akses Seluruh Perangkat Daerah)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Centang jika role ini secara default memiliki cakupan lintas seluruh OPD (seperti Bidang Anggaran / BUD / Inspektorat).
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={roleSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {roleSubmitting ? "Menyimpan..." : "Simpan Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="Konfirmasi Hapus Role"
        entityName="Role"
        itemCode={deleteTarget ? `#${deleteTarget.kode}` : undefined}
        itemLabel={deleteTarget?.nama}
        description="Penghapusan Role akan menghapus seluruh pemetaan permission pada role ini. Role yang masih memiliki pengguna aktif tidak dapat dihapus."
        loading={deleting}
        errorMessage={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDeleteRole}
      />
    </div>
  );
}
