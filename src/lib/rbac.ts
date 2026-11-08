import { getSession, SessionPayload } from "./session";
import { prisma } from "./prisma";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Mengambil daftar permission terbaru langsung dari database berdasarkan roleKode aktif
 * agar setiap perubahan pada menu Role & Hak Akses langsung berdampak real-time.
 */
export async function enrichSessionWithLivePermissions(
  session: SessionPayload
): Promise<SessionPayload> {
  try {
    const role = await prisma.role.findUnique({
      where: { kode: session.roleKode },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) return session;
    return {
      ...session,
      roleNama: role.nama,
      permissions: role.permissions.map((rp) => rp.permission.kode),
    };
  } catch {
    return session;
  }
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new AuthError(
      "Sesi tidak ditemukan atau telah berakhir. Silakan login kembali.",
      401
    );
  }
  return enrichSessionWithLivePermissions(session);
}

export async function requirePermission(permissionKode: string): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.roleKode === "SUPERADMIN" || session.roleKode === "0") {
    return session;
  }
  if (!session.permissions.includes(permissionKode)) {
    throw new AuthError(
      `Akses ditolak: Anda (${session.roleNama}) tidak memiliki izin '${permissionKode}'.`,
      403
    );
  }
  return session;
}

export async function requireAnyPermission(
  permissionKodes: string[]
): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.roleKode === "SUPERADMIN" || session.roleKode === "0") {
    return session;
  }
  const hasOne = permissionKodes.some((k) => session.permissions.includes(k));
  if (!hasOne) {
    throw new AuthError(
      `Akses ditolak: Anda (${session.roleNama}) tidak memiliki salah satu izin yang diperlukan (${permissionKodes.join(", ")}).`,
      403
    );
  }
  return session;
}

export function hasPermission(
  session: SessionPayload | null,
  permissionKode: string
): boolean {
  if (!session) return false;
  if (session.roleKode === "SUPERADMIN" || session.roleKode === "0") return true;
  return session.permissions.includes(permissionKode);
}

/**
 * Mengembalikan filter opdId sesuai prinsip least privilege (Bab 6.2 PRD).
 * Pengguna OPD maupun UNIT dibatasi hanya pada OPD yang menjadi tanggung jawabnya.
 */
export function getOpdFilter(
  session: SessionPayload,
  requestedOpdId?: string | null
): string | undefined {
  if (
    session.isCrossOpd ||
    session.roleKode === "SUPERADMIN" ||
    session.roleKode === "0"
  ) {
    return requestedOpdId || undefined;
  }
  return session.opdId || "RESTRICTED_NO_OPD";
}

/**
 * Mengembalikan filter unitKerjaId sesuai level user (OPD vs UNIT):
 * - Lintas OPD / Superadmin: bebas melihat semua Unit atau memfilter Unit tertentu
 * - Level OPD (opdId terisi, unitKerjaId kosong): dapat melihat seluruh Unit di bawah OPD-nya
 * - Level UNIT (unitKerjaId terisi): hanya dapat melihat Unit Kerjanya sendiri
 */
export function getUnitFilter(
  session: SessionPayload,
  requestedUnitId?: string | null
): string | undefined {
  if (
    session.isCrossOpd ||
    session.roleKode === "SUPERADMIN" ||
    session.roleKode === "0"
  ) {
    return requestedUnitId || undefined;
  }
  if (session.unitKerjaId) {
    return session.unitKerjaId;
  }
  return requestedUnitId || undefined;
}

export type AnggaranKasAccessRole =
  | "SUPERADMIN"
  | "BIDANG_ANGGARAN"
  | "KASUBAG_PERENCANAAN"
  | "PPTK"
  | "FORBIDDEN";

/**
 * Menentukan kategori hak akses pengguna untuk modul Anggaran Kas
 * dengan tetap menghormati konfigurasi dinamis pada Role & Hak Akses.
 */
export function getAnggaranKasAccessRole(
  session:
    | Pick<SessionPayload, "roleKode" | "roleNama" | "permissions" | "isCrossOpd">
    | null
    | undefined
): AnggaranKasAccessRole {
  if (!session) return "FORBIDDEN";
  const kode = (session.roleKode || "").trim().toUpperCase();
  const nama = (session.roleNama || "").trim().toLowerCase();
  const perms = session.permissions || [];

  if (kode === "0" || kode === "SUPERADMIN" || nama.includes("superadmin")) {
    return "SUPERADMIN";
  }

  const hasDynamicAngkasPerm =
    perms.includes("menu:perencanaan:anggaran-kas") ||
    perms.includes("angkas:read") ||
    perms.includes("angkas:write");

  if (
    kode === "2" ||
    kode === "BIDANG_ANGGARAN" ||
    kode === "ADMIN_BPKPAD" ||
    nama.includes("bidang anggaran")
  ) {
    return "BIDANG_ANGGARAN";
  }
  if (kode === "9" || kode === "PPTK" || nama.includes("pptk")) {
    return "PPTK";
  }
  if (
    kode === "14" ||
    kode === "KASUBAG_PERENCANAAN" ||
    kode === "ADMIN_OPD" ||
    nama.includes("kasubag perencanaan") ||
    nama.includes("perencanaan")
  ) {
    return "KASUBAG_PERENCANAAN";
  }

  // Jika role lain diberikan hak akses Anggaran Kas secara dinamis melalui menu Role & Hak Akses
  if (hasDynamicAngkasPerm) {
    return session.isCrossOpd ? "BIDANG_ANGGARAN" : "KASUBAG_PERENCANAAN";
  }

  return "FORBIDDEN";
}

export function canAccessAnggaranKas(
  session:
    | Pick<SessionPayload, "roleKode" | "roleNama" | "permissions" | "isCrossOpd">
    | null
    | undefined
): boolean {
  if (!session) return false;
  const kode = (session.roleKode || "").trim().toUpperCase();
  if (kode === "0" || kode === "SUPERADMIN") return true;
  const perms = session.permissions || [];
  if (
    perms.includes("menu:perencanaan:anggaran-kas") ||
    perms.includes("angkas:read") ||
    perms.includes("angkas:write")
  ) {
    return true;
  }
  return getAnggaranKasAccessRole(session) !== "FORBIDDEN";
}

/**
 * Hak Lock / Unlock Anggaran Kas: Superadmin, Bidang Anggaran, atau role yang memiliki permission 'angkas:lock'
 */
export function canLockAnggaranKas(
  session:
    | Pick<SessionPayload, "roleKode" | "roleNama" | "permissions" | "isCrossOpd">
    | null
    | undefined
): boolean {
  if (!session) return false;
  const perms = session.permissions || [];
  if (perms.includes("angkas:lock")) return true;
  const role = getAnggaranKasAccessRole(session);
  return role === "SUPERADMIN" || role === "BIDANG_ANGGARAN";
}
