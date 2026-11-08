import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { recordAuditLog } from "@/modules/audit/audit.service";
import { LoginInput } from "./auth.schema";

const MAX_FAILED_ATTEMPTS = 5;

export interface RoleOptionForLogin {
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

export type AuthenticateResult =
  | {
      requiresRoleSelection: true;
      user: {
        id: string;
        username: string;
        namaLengkap: string;
        nip: string | null;
      };
      assignments: RoleOptionForLogin[];
    }
  | {
      requiresRoleSelection: false;
      sessionPayload: SessionPayload;
    };

export async function authenticateUser(
  input: LoginInput,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<AuthenticateResult> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: input.username, mode: "insensitive" } },
        { email: { equals: input.username, mode: "insensitive" } },
      ],
    },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      opd: true,
      unitKerja: true,
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
          opd: true,
          unitKerja: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!user) {
    await recordAuditLog({
      username: input.username,
      aksi: "LOGIN_FAILED",
      modul: "auth",
      entitas: "User",
      deskripsi: `Percobaan login gagal: akun '${input.username}' tidak ditemukan`,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    throw new Error("Username atau password tidak valid.");
  }

  if (!user.isActive) {
    throw new Error(
      "Akun Anda berstatus nonaktif. Hubungi Administrator BPKPAD / Superadmin."
    );
  }

  if (user.isLocked) {
    throw new Error(
      "Akun Anda terkunci karena terlalu banyak percobaan gagal. Hubungi Administrator."
    );
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    const newFailedCount = user.failedLogins + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: newFailedCount,
        isLocked: shouldLock,
      },
    });

    await recordAuditLog({
      userId: user.id,
      username: user.username,
      userRole: user.role.kode,
      opdId: user.opdId,
      aksi: shouldLock ? "LOCK" : "LOGIN_FAILED",
      modul: "auth",
      entitas: "User",
      entitasId: user.id,
      deskripsi: shouldLock
        ? `Akun '${user.username}' dikunci otomatis setelah ${newFailedCount} percobaan gagal`
        : `Password salah untuk pengguna '${user.username}' (percobaan ke-${newFailedCount})`,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    throw new Error(
      shouldLock
        ? "Akun terkunci otomatis karena 5x gagal login."
        : "Username atau password tidak valid."
    );
  }

  // Susun daftar peran penugasan user (gunakan roleAssignments jika ada, atau fallback ke kolom utama User)
  const rawAssignments =
    user.roleAssignments && user.roleAssignments.length > 0
      ? user.roleAssignments
      : [
          {
            id: `primary-${user.id}`,
            userId: user.id,
            roleId: user.roleId,
            opdId: user.opdId,
            unitKerjaId: user.unitKerjaId,
            jabatan: user.jabatan,
            isPrimary: true,
            role: user.role,
            opd: user.opd,
            unitKerja: user.unitKerja,
          },
        ];

  const computeLevelAkses = (a: (typeof rawAssignments)[number]): "LINTAS_OPD" | "OPD" | "UNIT" => {
    if (a.unitKerjaId) return "UNIT";
    if (a.opdId) return "OPD";
    return "LINTAS_OPD";
  };

  // Jika user memiliki > 1 peran dan belum memilih assignmentId, kembalikan daftar pilihan peran (gaya SIPD)
  if (rawAssignments.length > 1 && !input.assignmentId) {
    const assignments: RoleOptionForLogin[] = rawAssignments.map((a) => ({
      assignmentId: a.id,
      isPrimary: a.isPrimary,
      roleId: a.roleId,
      roleKode: a.role.kode,
      roleNama: a.role.nama,
      jabatan: a.jabatan ?? user.jabatan ?? null,
      levelAkses: computeLevelAkses(a),
      opdId: a.opdId ?? null,
      opdKode: a.opd?.kd_skpd ?? null,
      opdNama: a.opd?.nm_skpd ?? null,
      unitKerjaId: a.unitKerjaId ?? null,
      unitKerjaKode: a.unitKerja?.kd_unit ?? null,
      unitKerjaNama: a.unitKerja?.nm_unit ?? null,
    }));

    return {
      requiresRoleSelection: true,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        nip: user.nip ?? null,
      },
      assignments,
    };
  }

  const chosen = input.assignmentId
    ? rawAssignments.find((a) => a.id === input.assignmentId)
    : rawAssignments[0];

  if (!chosen) {
    throw new Error("Peran penugasan yang dipilih tidak ditemukan untuk akun ini.");
  }

  // Ambil Tahun Anggaran yang dipilih saat login (atau fallback ke default)
  let selectedTa = input.tahunAnggaranId
    ? await prisma.tahunAnggaran.findUnique({ where: { id: input.tahunAnggaranId } })
    : null;

  if (!selectedTa) {
    selectedTa = await prisma.tahunAnggaran.findFirst({
      orderBy: [{ isDefault: "desc" }, { tahun: "desc" }],
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLogins: 0,
      lastLoginAt: new Date(),
    },
  });

  const permissions = chosen.role.permissions.map((rp) => rp.permission.kode);
  const levelAkses = computeLevelAkses(chosen);
  const effectiveIsCrossOpd = levelAkses === "LINTAS_OPD";

  const sessionPayload: SessionPayload = {
    userId: user.id,
    username: user.username,
    namaLengkap: user.namaLengkap,
    email: user.email,
    roleKode: chosen.role.kode,
    roleNama: chosen.role.nama,
    isCrossOpd: effectiveIsCrossOpd,
    opdId: chosen.opdId ?? null,
    opdKode: chosen.opd?.kd_skpd ?? null,
    opdNama: chosen.opd?.nm_skpd ?? null,
    unitKerjaId: chosen.unitKerjaId ?? null,
    unitKerjaKode: chosen.unitKerja?.kd_unit ?? null,
    unitKerjaNama: chosen.unitKerja?.nm_unit ?? null,
    levelAkses,
    tahunAnggaranId: selectedTa?.id,
    tahunAnggaran: selectedTa?.tahun,
    permissions,
  };

  await recordAuditLog({
    session: sessionPayload,
    aksi: "LOGIN",
    modul: "auth",
    entitas: "User",
    entitasId: user.id,
    deskripsi: `Pengguna '${user.namaLengkap}' masuk sebagai '${chosen.role.nama}' [${
      levelAkses === "LINTAS_OPD"
        ? "Lintas OPD"
        : chosen.unitKerja
          ? `Unit: ${chosen.unitKerja.nm_unit}`
          : `OPD: ${chosen.opd?.nm_skpd ?? "-"}`
    }] pada Tahun Anggaran ${selectedTa?.tahun ?? "-"}`,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return {
    requiresRoleSelection: false,
    sessionPayload,
  };
}
