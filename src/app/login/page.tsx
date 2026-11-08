"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Building2,
  GitBranch,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

interface TahunOption {
  id: string;
  tahun: number;
  nama: string;
  tahapAktif: string;
  status: string;
  isDefault: boolean;
}

interface LoginRoleAssignment {
  assignmentId: string;
  isPrimary: boolean;
  roleId: string;
  roleKode: string;
  roleNama: string;
  jabatan: string | null;
  levelAkses: "LINTAS_OPD" | "OPD" | "UNIT";
  opdId: string | null;
  opdKode: string | null;
  opdNama: string | null;
  unitKerjaId: string | null;
  unitKerjaKode: string | null;
  unitKerjaNama: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // State Video Kiri Full
  const [videoMuted, setVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // State Form Login Kanan
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tahunList, setTahunList] = useState<TahunOption[]>([]);
  const [tahunAnggaranId, setTahunAnggaranId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State Pemilihan Peran Multi-Role (Gaya SIPD)
  const [roleStepUser, setRoleStepUser] = useState<{
    id: string;
    username: string;
    namaLengkap: string;
    nip: string | null;
  } | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<LoginRoleAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/tahun-anggaran/public")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setTahunList(json.data);
          const def =
            json.data.find((t: TahunOption) => t.isDefault) || json.data[0];
          setTahunAnggaranId(def.id);
        }
      });
  }, []);

  function toggleMute() {
    if (!videoRef.current) return;
    const nextMuted = !videoMuted;
    videoRef.current.muted = nextMuted;
    setVideoMuted(nextMuted);
  }

  function restartVideo() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => { });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, tahunAnggaranId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || data.message || "Gagal masuk ke sistem.");
        setLoading(false);
        return;
      }

      if (data.requiresRoleSelection && Array.isArray(data.assignments)) {
        setRoleStepUser(data.user);
        setRoleAssignments(data.assignments);
        setSelectedAssignmentId(data.assignments[0]?.assignmentId || "");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Periksa jaringan Anda.");
      setLoading(false);
    }
  }

  async function handleSelectRoleSubmit(assignmentIdToUse?: string) {
    const targetId = assignmentIdToUse || selectedAssignmentId;
    if (!targetId) {
      setError("Silakan pilih salah satu peran terlebih dahulu.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          tahunAnggaranId,
          assignmentId: targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || data.message || "Gagal masuk dengan peran tersebut.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Periksa jaringan Anda.");
      setLoading(false);
    }
  }

  function handleBackToCredentials() {
    setRoleStepUser(null);
    setRoleAssignments([]);
    setSelectedAssignmentId("");
    setError(null);
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#071426]" />;
  }

  const selectedTahunObj = tahunList.find((t) => t.id === tahunAnggaranId);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden select-none">
      <div className="relative w-full lg:w-7/12 xl:w-8/12 h-72 sm:h-96 lg:h-screen bg-black overflow-hidden shrink-0">
        <video
          ref={videoRef}
          src="/opening.mp4"
          autoPlay
          loop
          playsInline
          muted={videoMuted}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay Tipis Atas untuk Logo & Kontrol Suara */}
        <div className="absolute top-0 inset-x-0 z-10 p-5 lg:p-8 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/25 to-transparent">
          <div className="flex items-center gap-3">
            <img
              src="/Logo-Tapsel.png"
              alt="Pemerintah Kabupaten Tapanuli Selatan"
              style={{ height: "54px", width: "auto" }}
              className="h-9 w-auto object-contain drop-shadow-lg"
            />
            <div className="h-8 w-px bg-white/30 hidden sm:block" />
            <img
              src="/bpkpad-white.png"
              alt="BPKPAD Kabupaten Tapanuli Selatan"
              style={{ height: "54px", width: "auto" }}
              className="h-8 w-auto object-contain drop-shadow-lg hidden sm:block"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restartVideo}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/25 text-white transition cursor-pointer"
              title="Ulangi Video dari Awal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md border border-white/25 text-white text-xs font-bold transition cursor-pointer"
            >
              {videoMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-300" />
                  <span>Suara Mati</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  <span>Suara Aktif</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Overlay Tipis Bawah untuk Informasi Instansi */}
        <div className="absolute bottom-0 inset-x-0 z-10 p-5 lg:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent text-white">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
              Pemerintah Kabupaten Tapanuli Selatan
            </div>
            <div className="text-sm lg:text-base font-extrabold tracking-wide">
              Badan Pengelolaan Keuangan, Pendapatan dan Aset Daerah
            </div>
          </div>
          <span className="text-xs font-semibold text-white/80 shrink-0">
            BPKPAD • No Cash Go Digital
          </span>
        </div>
      </div>

      {/* ============================================================
          SEBELAH KANAN: HALAMAN FORM LOGIN & PEMILIHAN PERAN (GAYA SIPD)
         ============================================================ */}
      <div className="w-full lg:w-5/12 xl:w-4/12 lg:h-screen overflow-y-auto flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-gradient-to-b from-white via-white to-red-50/40 border-l border-slate-200">
        <div className="my-auto w-full max-w-md mx-auto">
          {/* Header Logo & Judul Login */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img
                src="/bpkpad-len.png"
                alt="Logo BPKPAD"
                style={{ height: "100px", width: "auto" }}
                className="h-9 w-auto object-contain drop-shadow"
              />
            </div>
            <h1 className="text-2xl font-black text-[#5E0E14] tracking-tight">
              {roleStepUser ? "PILIH PERAN PENUGASAN" : "SELAMAT DATANG"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {roleStepUser
                ? "Akun Anda memiliki lebih dari 1 peran aktif. Silakan pilih peran untuk masuk:"
                : "Pilih Tahun Anggaran dan masukkan akun pengguna Anda"}
            </p>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-[#991B1B] to-amber-500 mt-3" />
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <span>{error}</span>
            </div>
          )}

          {roleStepUser ? (
            /* ============================================================
               TAHAP 2: PEMILIHAN PERAN / ROLE (GAYA SIPD)
               ============================================================ */
            <div className="space-y-4">
              {/* Info Pegawai & Tahun Anggaran */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {roleStepUser.namaLengkap}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {roleStepUser.nip ? `NIP. ${roleStepUser.nip}` : ""}
                  </div>
                </div>
                {selectedTahunObj && (
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-red-100 text-[#991B1B] text-[11px] font-extrabold">
                    TA {selectedTahunObj.tahun}
                  </span>
                )}
              </div>

              {/* Daftar Kartu Peran */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {roleAssignments.map((item, idx) => {
                  const isSelected = selectedAssignmentId === item.assignmentId;
                  return (
                    <div
                      key={item.assignmentId}
                      onClick={() => setSelectedAssignmentId(item.assignmentId)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                        ? "border-[#991B1B] bg-red-50/60 shadow-sm"
                        : "border-slate-200 bg-white hover:border-red-200 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-[#5E0E14] text-white text-[10px] font-extrabold uppercase tracking-wider">
                            Peran {idx + 1}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {item.roleNama}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.levelAkses === "LINTAS_OPD" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" />
                              LINTAS OPD
                            </span>
                          ) : item.levelAkses === "UNIT" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              <GitBranch className="w-3 h-3" />
                              LEVEL UNIT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-[#991B1B] border border-red-200">
                              <Building2 className="w-3 h-3" />
                              LEVEL OPD
                            </span>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#991B1B]" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        {item.levelAkses === "LINTAS_OPD" ? (
                          <div className="font-semibold text-emerald-800">
                            Cakupan: Seluruh Perangkat Daerah (Lintas OPD)
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800">
                              <span className="font-mono text-[#991B1B] font-bold mr-1">
                                [{item.opdKode}]
                              </span>
                              {item.opdNama}
                            </div>
                            {item.levelAkses === "UNIT" && item.unitKerjaNama && (
                              <div className="text-[11px] text-amber-900 font-medium mt-0.5">
                                Sub-Unit: [{item.unitKerjaKode}] {item.unitKerjaNama}
                              </div>
                            )}
                          </div>
                        )}

                        {item.jabatan && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span>Jabatan: {item.jabatan}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tombol Lanjutkan & Kembali */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={loading || !selectedAssignmentId}
                  onClick={() => handleSelectRoleSubmit()}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#7F1D1D] hover:from-[#7F1D1D] hover:to-[#991B1B] disabled:opacity-60 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>
                    {loading ? "Membuka Sesi Peran..." : "Masuk sebagai Peran Terpilih"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleBackToCredentials}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti Akun / Kembali ke Login</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================
               TAHAP 1: INPUT KREDENSIAL USERNAME & PASSWORD
               ============================================================ */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilihan Tahun Anggaran pada saat Login */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Tahun Anggaran <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#991B1B] absolute left-3.5 top-3" />
                  <select
                    required
                    value={tahunAnggaranId}
                    onChange={(e) => setTahunAnggaranId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold rounded-xl border border-red-200 bg-red-50/50 text-[#5E0E14] focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  >
                    {tahunList.map((t) => (
                      <option key={t.id} value={t.id}>
                        TAHUN ANGGARAN {t.tahun}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Username */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Username / NIP Pengguna <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username (contoh: superadmin)"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                </div>
              </div>

              {/* Input Password */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Kata Sandi / Password <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#991B1B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tombol Submit Login */}
              <button
                type="submit"
                disabled={loading || !tahunAnggaranId}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#7F1D1D] hover:from-[#7F1D1D] hover:to-[#991B1B] disabled:opacity-60 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{loading ? "Memverifikasi Sesi..." : "Masuk ke Aplikasi"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer Kanan */}
        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>© Copyright 2018 BPKPAD Team Developer</span>
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SITARIDA Version 1.03</span>
          </span>
        </div>
      </div>
    </div>
  );
}
