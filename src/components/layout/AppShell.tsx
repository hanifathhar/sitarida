"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  GitBranch,
  BookOpen,
  Layers,
  FolderKanban,
  ListChecks,
  Wallet,
  Tags,
  UploadCloud,
  Users,
  Shield,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  UserCircle2,
  Grid,
  Menu,
  WalletCards,
  FileCheck2,
  CalendarDays,
  FileText,
} from "lucide-react";
import { SessionPayload } from "@/lib/session";

interface TahunAnggaranOption {
  id: string;
  tahun: number;
  nama: string;
  tahapAktif: string;
  status: string;
}

interface AppShellProps {
  session: SessionPayload;
  tahunList: TahunAnggaranOption[];
  activeTahun: TahunAnggaranOption;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "RINGKASAN & REALISASI PENGANGGARAN DAERAH",
  "/master/rekening": "MASTER REKENING",
  "/master/opd": "MASTER PERANGKAT DAERAH / OPD",
  "/master/unit": "MASTER UNIT KERJA / SUB-UNIT",
  "/master/program": "MASTER PROGRAM",
  "/master/kegiatan": "MASTER KEGIATAN ",
  "/master/subkegiatan": "MASTER SUB KEGIATAN",
  "/master/sumber-dana": "MASTER SUMBER DANA",
  "/master/tahun-anggaran": "MASTER TAHUN ANGGARAN",
  "/master/standar-harga": "MASTER STANDAR HARGA (SSH / SBU / HSPK / ASB)",
  "/master/import": "IMPORT & VALIDASI MASTER DATA",
  "/perencanaan/plafond": "PLAFOND ANGGARAN OPD & UNIT KERJA",
  "/perencanaan/rka": "RENCANA KERJA & ANGGARAN (RKA-SKPD)",
  "/perencanaan/anggaran-kas": "ANGGARAN KAS BELANJA OPD",
  "/perencanaan/spd": "SURAT PENYEDIAAN DANA (SPD)",
  "/admin/users": "DATA PEGAWAI / PENGGUNA & PENUGASAN OPD",
  "/admin/roles": "MANAJEMEN ROLE & HAK AKSES",
  "/admin/audit-log": "LAPORAN JEJAK AUDIT (AUDIT LOG)",
};

export default function AppShell({
  session,
  activeTahun,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  function getActiveGroupByPath(path: string): Record<string, boolean> {
    return {
      perencanaan: path.startsWith("/perencanaan"),
      pengaturan: path.startsWith("/admin"),
      masterRekeningOpd: ["/master/rekening", "/master/opd", "/master/unit"].some(
        (p) => path.startsWith(p)
      ),
      masterNomenklatur: [
        "/master/program",
        "/master/kegiatan",
        "/master/subkegiatan",
        "/master/sumber-dana",
      ].some((p) => path.startsWith(p)),
      masterReferensi: [
        "/master/tahun-anggaran",
        "/master/standar-harga",
        "/master/import",
      ].some((p) => path.startsWith(p)),
    };
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    getActiveGroupByPath(pathname)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpenGroups(getActiveGroupByPath(pathname));
  }, [pathname]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({
      perencanaan: false,
      pengaturan: false,
      masterRekeningOpd: false,
      masterNomenklatur: false,
      masterReferensi: false,
      [key]: !prev[key],
    }));
  }

  const isSuperadmin =
    session.roleKode === "SUPERADMIN" || session.roleKode === "0";

  const can = (perm: string) =>
    isSuperadmin || session.permissions.includes(perm);

  // Daftar Menu Dinamis per Kelompok berdasarkan pemetaan Role & Hak Akses
  const perencanaanMenus = [
    {
      label: "Plafont OPD / Unit",
      href: "/perencanaan/plafond",
      icon: WalletCards,
      perm: "menu:perencanaan:plafond",
    },
    {
      label: "Rencana Kerja Anggaran",
      href: "/perencanaan/rka",
      icon: FileText,
      perm: "menu:perencanaan:rka",
    },
    {
      label: "Anggaran Kas",
      href: "/perencanaan/anggaran-kas",
      icon: CalendarDays,
      perm: "menu:perencanaan:anggaran-kas",
    },
    {
      label: "Surat Penyediaan Dana (SPD)",
      href: "/perencanaan/spd",
      icon: FileCheck2,
      perm: "menu:perencanaan:spd",
    },
  ].filter((m) => can(m.perm));

  const pengaturanMenus = [
    {
      label: "Data Pegawai / User",
      href: "/admin/users",
      icon: Users,
      perm: "menu:admin:users",
    },
    {
      label: "Role & Hak Akses",
      href: "/admin/roles",
      icon: Shield,
      perm: "menu:admin:roles",
    },
    {
      label: "Laporan Audit Log",
      href: "/admin/audit-log",
      icon: History,
      perm: "menu:admin:audit",
    },
  ].filter((m) => can(m.perm));

  const masterOrganisasiMenus = [
    {
      label: "Master Rekening",
      href: "/master/rekening",
      icon: BookOpen,
      perm: "menu:master:rekening",
    },
    {
      label: "Master OPD",
      href: "/master/opd",
      icon: Building2,
      perm: "menu:master:opd",
    },
    {
      label: "Master Unit",
      href: "/master/unit",
      icon: GitBranch,
      perm: "menu:master:unit",
    },
  ].filter((m) => can(m.perm));

  const masterNomenklaturMenus = [
    {
      label: "Master Program",
      href: "/master/program",
      icon: Layers,
      perm: "menu:master:program",
    },
    {
      label: "Master Kegiatan",
      href: "/master/kegiatan",
      icon: FolderKanban,
      perm: "menu:master:kegiatan",
    },
    {
      label: "Master Sub Kegiatan",
      href: "/master/subkegiatan",
      icon: ListChecks,
      perm: "menu:master:subkegiatan",
    },
    {
      label: "Master Sumber Dana",
      href: "/master/sumber-dana",
      icon: Wallet,
      perm: "menu:master:sumber-dana",
    },
  ].filter((m) => can(m.perm));

  const masterReferensiMenus = [
    {
      label: "Tahun Anggaran",
      href: "/master/tahun-anggaran",
      icon: Calendar,
      perm: "menu:master:tahun-anggaran",
    },
    {
      label: "Standar Harga (SSH)",
      href: "/master/standar-harga",
      icon: Tags,
      perm: "menu:master:standar-harga",
    },
    {
      label: "Import Template",
      href: "/master/import",
      icon: UploadCloud,
      perm: "menu:master:import",
    },
  ].filter((m) => can(m.perm));

  const hasAnyMasterSection =
    masterOrganisasiMenus.length > 0 ||
    masterNomenklaturMenus.length > 0 ||
    masterReferensiMenus.length > 0;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const currentPageTitle =
    PAGE_TITLES[pathname] || "SITARIDA — PENGELOLAAN KEUANGAN DAERAH";

  if (!mounted) {
    return <div className="min-h-screen bg-[#D6DADE]" />;
  }

  return (
    <div className="min-h-screen flex bg-[#D6DADE] text-gray-800">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR KIRI — GAYA CAKRA MERAH TUA (#5E0E14) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#5E0E14] text-white flex flex-col transition-all duration-200 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${desktopCollapsed ? "lg:w-0 lg:overflow-hidden" : "w-64"}`}
      >
        {/* Logo & Brand Header */}
        <div className="h-14 px-4 bg-[#4A0A0F] border-b border-red-900/60 flex items-center gap-3 shrink-0">
          <img
            src="/Logo-Tapsel.png"
            alt="Logo Tapanuli Selatan"
            className="w-8 h-8 object-contain drop-shadow shrink-0"
          />
          <span className="text-xl font-black tracking-wide text-white">
            SITARIDA
          </span>
        </div>

        {/* Isi Menu Sidebar (Dinamis sesuai Pemetaan Role & Hak Akses) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {can("dashboard:view") && (
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${pathname === "/dashboard"
                  ? "bg-white text-[#88131A] font-bold"
                  : "bg-[#7A151D] hover:bg-[#991B1B] text-white"
                }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard (TA {activeTahun.tahun})</span>
            </Link>
          )}

          {/* MENU UTAMA: MODUL PERENCANAAN */}
          {perencanaanMenus.length > 0 && (
            <div className="bg-[#8E1B24] rounded-xl p-2 space-y-1.5 shadow-sm border border-red-400/20">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => toggleGroup("perencanaan")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-300" />
                  <span className="tracking-wide">Modul Perencanaan</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openGroups.perencanaan ? "rotate-180" : ""
                    }`}
                />
              </button>

              {openGroups.perencanaan && (
                <div className="space-y-1.5 pt-0.5">
                  {perencanaanMenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${active
                            ? "bg-white text-[#88131A] font-bold shadow-sm"
                            : "bg-[#5E0E14] hover:bg-[#46090E] text-white font-medium"
                          }`}
                      >
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#88131A]" : "text-amber-200"
                            }`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MENU UTAMA: PENGATURAN */}
          {pengaturanMenus.length > 0 && (
            <div className="bg-[#8E1B24] rounded-xl p-2 space-y-1.5 shadow-sm border border-red-400/15">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => toggleGroup("pengaturan")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-red-100" />
                  <span>Pengaturan</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openGroups.pengaturan ? "rotate-180" : ""
                    }`}
                />
              </button>

              {openGroups.pengaturan && (
                <div className="space-y-1.5 pt-0.5">
                  {pengaturanMenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${active
                            ? "bg-white text-[#88131A] font-bold shadow-sm"
                            : "bg-[#5E0E14] hover:bg-[#46090E] text-white font-medium"
                          }`}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {hasAnyMasterSection && (
            <div className="pt-2 px-1">
              <div className="text-[11px] text-red-200/90 font-medium">
                Master Data
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-white mt-1.5 px-1">
                <div className="flex items-center gap-2">
                  <Grid className="w-3.5 h-3.5 text-red-200" />
                  <span>Kelola Master Data</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-red-200" />
              </div>
            </div>
          )}

          {/* KARTU GRUP 1: Rekening, OPD & Unit */}
          {masterOrganisasiMenus.length > 0 && (
            <div className="bg-[#8E1B24] rounded-xl p-2 space-y-1.5 shadow-sm border border-red-400/15">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => toggleGroup("masterRekeningOpd")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-red-100" />
                  <span>Rekening & Organisasi</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openGroups.masterRekeningOpd ? "rotate-180" : ""
                    }`}
                />
              </button>

              {openGroups.masterRekeningOpd && (
                <div className="space-y-1.5 pt-0.5">
                  {masterOrganisasiMenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${active
                            ? "bg-white text-[#88131A] font-bold shadow-sm"
                            : "bg-[#5E0E14] hover:bg-[#46090E] text-white font-medium"
                          }`}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* KARTU GRUP 2: Program, Kegiatan, Sub Kegiatan, Sumber Dana */}
          {masterNomenklaturMenus.length > 0 && (
            <div className="bg-[#8E1B24] rounded-xl p-2 space-y-1.5 shadow-sm border border-red-400/15">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => toggleGroup("masterNomenklatur")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-red-100" />
                  <span>Nomenklatur & Dana</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openGroups.masterNomenklatur ? "rotate-180" : ""
                    }`}
                />
              </button>

              {openGroups.masterNomenklatur && (
                <div className="space-y-1.5 pt-0.5">
                  {masterNomenklaturMenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${active
                            ? "bg-white text-[#88131A] font-bold shadow-sm"
                            : "bg-[#5E0E14] hover:bg-[#46090E] text-white font-medium"
                          }`}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* KARTU GRUP 3: Tahun Anggaran, Standar Harga & Import */}
          {masterReferensiMenus.length > 0 && (
            <div className="bg-[#8E1B24] rounded-xl p-2 space-y-1.5 shadow-sm border border-red-400/15">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => toggleGroup("masterReferensi")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-100" />
                  <span>Pengaturan Master</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${openGroups.masterReferensi ? "rotate-180" : ""
                    }`}
                />
              </button>

              {openGroups.masterReferensi && (
                <div className="space-y-1.5 pt-0.5">
                  {masterReferensiMenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${active
                            ? "bg-white text-[#88131A] font-bold shadow-sm"
                            : "bg-[#5E0E14] hover:bg-[#46090E] text-white font-medium"
                          }`}
                      >
                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tombol Keluar */}
        <div className="p-3 border-t border-red-900/50">
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#A8242C] hover:bg-[#DC2626] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* AREA KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR — MERAH (#991B1B) PERSIS GAYA CAKRA */}
        <header className="h-14 bg-[#991B1B] text-white px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-7 h-7 rounded-full bg-white/90 text-[#88131A] flex items-center justify-center shadow-sm"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="hidden lg:flex w-7 h-7 rounded-full bg-white/90 hover:bg-white text-[#88131A] items-center justify-center shadow-sm transition-transform"
              title="Sembunyikan/Tampilkan Sidebar"
            >
              {desktopCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Badge Tahun Anggaran Sesi Login (Otomatis dari pilihan Login) */}
            <div className="bg-[#6B1016] border border-red-300/30 rounded-md px-4 py-1.5 flex items-center gap-2 shadow-inner">
              <span className="text-xs font-extrabold tracking-wider text-white uppercase">
                TAHUN {activeTahun.tahun}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/80 text-red-100 font-bold">
                {activeTahun.tahapAktif}
              </span>
            </div>
          </div>

          {/* Kanan Header */}
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-[#5E0E14] font-black text-[10px] flex items-center justify-center shadow">
                2
              </span>
            </div>

            <div className="text-right leading-tight">
              <div className="text-xs sm:text-sm font-extrabold text-white flex items-center justify-end gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-red-950/70 border border-red-300/30 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  {session.unitKerjaId
                    ? "LEVEL UNIT"
                    : session.isCrossOpd || session.roleKode === "SUPERADMIN" || session.roleKode === "0"
                      ? "LINTAS OPD"
                      : "LEVEL OPD"}
                </span>
                <span>
                  {session.unitKerjaNama ||
                    session.opdNama ||
                    "BPKPAD Kab. Tapanuli Selatan"}
                </span>
              </div>
              <div className="text-[11px] text-red-100 font-medium">
                {session.namaLengkap} ({session.roleNama})
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-white text-[#88131A] flex items-center justify-center shadow-sm shrink-0">
              <UserCircle2 className="w-7 h-7" />
            </div>
          </div>
        </header>

        {/* SUB-HEADER PUTIH */}
        <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-[#5E0E14] font-extrabold text-sm tracking-wide">
            <Users className="w-4 h-4 text-[#991B1B]" />
            <span>{currentPageTitle}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span>Sesi Login Tahun Anggaran:</span>
            <span className="px-2 py-0.5 rounded bg-red-50 text-[#991B1B] border border-red-200 font-bold text-[11px]">
              TA {activeTahun.tahun} • {activeTahun.status}
            </span>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 p-4 lg:p-5 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        {/* FOOTER PUTIH */}
        <footer className="bg-white border-t border-gray-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <div>© {activeTahun.tahun} BPKPAD Team Developer</div>
          <div className="font-bold text-gray-800">Version 1.03</div>
        </footer>
      </div>
    </div>
  );
}
