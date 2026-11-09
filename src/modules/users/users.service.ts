import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SessionPayload } from "@/lib/session";
import { getOpdFilter, getUnitFilter } from "@/lib/rbac";
import { recordAuditLog } from "@/modules/audit/audit.service";
import {
  CreateUserInput,
  UpdateUserInput,
  UserRoleAssignmentInput,
  CreateRoleInput,
  UpdateRoleInput,
} from "./users.schema";
import { getAllCatalogPermissions } from "@/lib/rbac-catalog";
import { Prisma } from "@prisma/client";

const USER_INCLUDE = {
  role: true,
  opd: true,
  unitKerja: true,
  roleAssignments: {
    include: {
      role: true,
      opd: true,
      unitKerja: true,
    },
    orderBy: [
      { isPrimary: "desc" as const },
      { createdAt: "asc" as const },
    ],
  },
};

function normalizeUserWithAssignments<
  T extends {
    id: string;
    roleId: string;
    opdId: string | null;
    unitKerjaId: string | null;
    jabatan: string | null;
    role: any;
    opd: any;
    unitKerja: any;
    roleAssignments?: any[];
  }
>(user: T): T {
  if (user.roleAssignments && user.roleAssignments.length > 0) {
    return user;
  }
  return {
    ...user,
    roleAssignments: [
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
    ],
  };
}

async function resolveAndValidateAssignments(
  session: SessionPayload,
  rawAssignments: UserRoleAssignmentInput[]
) {
  if (!rawAssignments || rawAssignments.length === 0) {
    throw new Error("Minimal 1 peran (role) harus ditambahkan untuk pengguna.");
  }

  const isSuperOrCross =
    session.isCrossOpd ||
    session.roleKode === "SUPERADMIN" ||
    session.roleKode === "0";

  const resolved: Array<{
    roleId: string;
    roleKode: string;
    roleNama: string;
    opdId: string | null;
    unitKerjaId: string | null;
    jabatan: string | null;
    isPrimary: boolean;
  }> = [];

  const seenKeys = new Set<string>();

  for (let i = 0; i < rawAssignments.length; i++) {
    const item = rawAssignments[i];
    const role = await prisma.role.findUnique({ where: { id: item.roleId } });
    if (!role) {
      throw new Error(`Peran pada baris ke-${i + 1} tidak ditemukan.`);
    }

    let opdId = item.opdId && item.opdId.trim() !== "" ? item.opdId : null;
    let unitKerjaId =
      item.unitKerjaId && item.unitKerjaId.trim() !== "" ? item.unitKerjaId : null;
    const jabatan = item.jabatan && item.jabatan.trim() !== "" ? item.jabatan.trim() : null;

    if (!isSuperOrCross) {
      if (role.isCrossOpd) {
        throw new Error(
          `Admin OPD/Unit tidak diizinkan memberikan peran lintas-OPD (${role.nama}).`
        );
      }
      opdId = session.opdId ?? null;
      if (session.unitKerjaId) {
        unitKerjaId = session.unitKerjaId;
      }
    }

    if (unitKerjaId) {
      const unit = await prisma.unitKerja.findUnique({ where: { id: unitKerjaId } });
      if (!unit) {
        throw new Error(`Unit Kerja pada peran '${role.nama}' tidak ditemukan.`);
      }
      if (opdId && unit.opdId !== opdId) {
        throw new Error(
          `Unit Kerja '${unit.nm_unit}' tidak berada di bawah Perangkat Daerah (OPD) yang dipilih.`
        );
      }
      opdId = unit.opdId;
    }

    if (!role.isCrossOpd && !opdId) {
      throw new Error(
        `Peran '${role.nama}' wajib dikaitkan dengan Perangkat Daerah (OPD).`
      );
    }

    const uniqueKey = `${role.id}__${opdId ?? "ALL"}__${unitKerjaId ?? "ALL"}`;
    if (seenKeys.has(uniqueKey)) {
      throw new Error(
        `Terdapat duplikasi penugasan peran '${role.nama}' pada cakupan OPD/Unit yang sama.`
      );
    }
    seenKeys.add(uniqueKey);

    resolved.push({
      roleId: role.id,
      roleKode: role.kode,
      roleNama: role.nama,
      opdId,
      unitKerjaId,
      jabatan,
      isPrimary: i === 0,
    });
  }

  return resolved;
}

export async function listUsers(
  session: SessionPayload,
  params?: {
    search?: string;
    roleId?: string;
    roleKode?: string;
    opdId?: string;
    unitKerjaId?: string;
  }
) {
  const effectiveOpdId = getOpdFilter(session, params?.opdId);
  const effectiveUnitId = getUnitFilter(session, params?.unitKerjaId);
  const andConditions: Prisma.UserWhereInput[] = [];

  // Filter berdasarkan penugasan (baik di kolom utama User maupun di tabel ms_user_role_assignments)
  if (effectiveOpdId || effectiveUnitId || params?.roleId || params?.roleKode) {
    const primaryMatch: Prisma.UserWhereInput = {};
    const assignmentMatch: Prisma.UserRoleAssignmentWhereInput = {};

    if (effectiveOpdId) {
      primaryMatch.opdId = effectiveOpdId;
      assignmentMatch.opdId = effectiveOpdId;
    }
    if (effectiveUnitId) {
      primaryMatch.unitKerjaId = effectiveUnitId;
      assignmentMatch.unitKerjaId = effectiveUnitId;
    }
    if (params?.roleId) {
      primaryMatch.roleId = params.roleId;
      assignmentMatch.roleId = params.roleId;
    }
    if (params?.roleKode) {
      const roleFilter: Prisma.RoleWhereInput = {
        OR: [
          { kode: params.roleKode },
          { nama: { contains: params.roleKode, mode: "insensitive" } },
        ],
      };
      primaryMatch.role = roleFilter;
      assignmentMatch.role = roleFilter;
    }

    andConditions.push({
      OR: [
        primaryMatch,
        {
          roleAssignments: {
            some: assignmentMatch,
          },
        },
      ],
    });
  }

  if (params?.search) {
    andConditions.push({
      OR: [
        { namaLengkap: { contains: params.search, mode: "insensitive" } },
        { username: { contains: params.search, mode: "insensitive" } },
        { nip: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const users = await prisma.user.findMany({
    where,
    include: USER_INCLUDE,
    orderBy: [{ createdAt: "desc" }],
  });

  return users.map(normalizeUserWithAssignments);
}

export async function createUser(session: SessionPayload, input: CreateUserInput) {
  const rawAssignments: UserRoleAssignmentInput[] =
    input.assignments && input.assignments.length > 0
      ? input.assignments
      : input.roleId
        ? [
            {
              roleId: input.roleId,
              opdId: input.opdId || null,
              unitKerjaId: input.unitKerjaId || null,
              jabatan: input.jabatan || null,
              isPrimary: true,
            },
          ]
        : [];

  const resolvedAssignments = await resolveAndValidateAssignments(
    session,
    rawAssignments
  );
  const primary = resolvedAssignments[0];

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: input.username, mode: "insensitive" } },
        { email: { equals: input.email, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    throw new Error("Username atau email sudah terdaftar pada sistem.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const created = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      namaLengkap: input.namaLengkap,
      nip: input.nip || null,
      jabatan: primary.jabatan ?? input.jabatan ?? null,
      roleId: primary.roleId,
      opdId: primary.opdId,
      unitKerjaId: primary.unitKerjaId,
      isActive: input.isActive,
      roleAssignments: {
        create: resolvedAssignments.map((a, idx) => ({
          roleId: a.roleId,
          opdId: a.opdId,
          unitKerjaId: a.unitKerjaId,
          jabatan: a.jabatan ?? input.jabatan ?? null,
          isPrimary: idx === 0,
        })),
      },
    },
    include: USER_INCLUDE,
  });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "users",
    entitas: "User",
    entitasId: created.id,
    deskripsi: `Menambahkan pengguna baru '${created.namaLengkap}' (${created.username}) dengan ${resolvedAssignments.length} peran [${resolvedAssignments
      .map((a) => a.roleNama)
      .join(", ")}]`,
    dataSesudah: {
      id: created.id,
      username: created.username,
      namaLengkap: created.namaLengkap,
      roles: resolvedAssignments.map((a) => ({
        role: a.roleNama,
        opdId: a.opdId,
        unitKerjaId: a.unitKerjaId,
      })),
    },
  });

  return normalizeUserWithAssignments(created);
}

export async function updateUser(
  session: SessionPayload,
  userId: string,
  input: UpdateUserInput
) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: USER_INCLUDE,
  });
  if (!existing) throw new Error("Pengguna tidak ditemukan.");

  const isSuperOrCross =
    session.isCrossOpd ||
    session.roleKode === "SUPERADMIN" ||
    session.roleKode === "0";

  if (!isSuperOrCross) {
    if (existing.opdId !== session.opdId) {
      throw new Error("Anda hanya dapat mengelola pengguna pada OPD Anda sendiri.");
    }
    if (session.unitKerjaId && existing.unitKerjaId !== session.unitKerjaId) {
      throw new Error(
        "Pengguna Level UNIT hanya dapat mengelola pengguna pada Unit Kerjanya sendiri."
      );
    }
  }

  let resolvedAssignments:
    | Awaited<ReturnType<typeof resolveAndValidateAssignments>>
    | undefined;

  if (input.assignments && input.assignments.length > 0) {
    resolvedAssignments = await resolveAndValidateAssignments(
      session,
      input.assignments
    );
  } else if (input.roleId !== undefined) {
    resolvedAssignments = await resolveAndValidateAssignments(session, [
      {
        roleId: input.roleId,
        opdId:
          input.opdId !== undefined ? input.opdId || null : existing.opdId,
        unitKerjaId:
          input.unitKerjaId !== undefined
            ? input.unitKerjaId || null
            : existing.unitKerjaId,
        jabatan:
          input.jabatan !== undefined ? input.jabatan || null : existing.jabatan,
        isPrimary: true,
      },
    ]);
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.namaLengkap !== undefined) data.namaLengkap = input.namaLengkap;
  if (input.email !== undefined) data.email = input.email;
  if (input.nip !== undefined) data.nip = input.nip || null;
  if (input.jabatan !== undefined) data.jabatan = input.jabatan || null;

  if (resolvedAssignments && resolvedAssignments.length > 0) {
    const primary = resolvedAssignments[0];
    data.role = { connect: { id: primary.roleId } };
    data.opd = primary.opdId
      ? { connect: { id: primary.opdId } }
      : { disconnect: true };
    data.unitKerja = primary.unitKerjaId
      ? { connect: { id: primary.unitKerjaId } }
      : { disconnect: true };
    if (primary.jabatan !== null || input.jabatan !== undefined) {
      data.jabatan = primary.jabatan ?? (input.jabatan || null);
    }
  }

  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.isLocked !== undefined) {
    data.isLocked = input.isLocked;
    if (!input.isLocked) data.failedLogins = 0;
  }
  if (input.password && input.password.trim().length >= 6) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (resolvedAssignments && resolvedAssignments.length > 0) {
      await tx.userRoleAssignment.deleteMany({ where: { userId } });
      await tx.userRoleAssignment.createMany({
        data: resolvedAssignments.map((a, idx) => ({
          userId,
          roleId: a.roleId,
          opdId: a.opdId,
          unitKerjaId: a.unitKerjaId,
          jabatan: a.jabatan ?? (input.jabatan || existing.jabatan || null),
          isPrimary: idx === 0,
        })),
      });
    }

    return tx.user.update({
      where: { id: userId },
      data,
      include: USER_INCLUDE,
    });
  });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "users",
    entitas: "User",
    entitasId: updated.id,
    deskripsi: `Memperbarui data pengguna '${updated.namaLengkap}' (${updated.username})`,
    dataSebelum: {
      namaLengkap: existing.namaLengkap,
      role: existing.role.kode,
      opd: existing.opd?.nm_skpd ?? null,
      unitKerja: existing.unitKerja?.nm_unit ?? null,
      isActive: existing.isActive,
      isLocked: existing.isLocked,
    },
    dataSesudah: {
      namaLengkap: updated.namaLengkap,
      role: updated.role.kode,
      opd: updated.opd?.nm_skpd ?? null,
      unitKerja: updated.unitKerja?.nm_unit ?? null,
      totalPeran: updated.roleAssignments?.length ?? 1,
      isActive: updated.isActive,
      isLocked: updated.isLocked,
    },
  });

  return normalizeUserWithAssignments(updated);
}

export async function deleteUser(session: SessionPayload, userId: string) {
  if (session.userId === userId) {
    throw new Error("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login.");
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, opd: true, unitKerja: true },
  });
  if (!existing) throw new Error("Pengguna tidak ditemukan.");

  if (!session.isCrossOpd && session.roleKode !== "SUPERADMIN" && session.roleKode !== "0") {
    if (existing.opdId !== session.opdId) {
      throw new Error("Anda hanya dapat menghapus pengguna pada OPD Anda sendiri.");
    }
    if (session.unitKerjaId && existing.unitKerjaId !== session.unitKerjaId) {
      throw new Error(
        "Pengguna Level UNIT hanya dapat menghapus pengguna pada Unit Kerjanya sendiri."
      );
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "users",
    entitas: "User",
    entitasId: userId,
    deskripsi: `Menghapus pengguna '${existing.namaLengkap}' (@${existing.username})`,
    dataSebelum: {
      username: existing.username,
      namaLengkap: existing.namaLengkap,
      role: existing.role.kode,
    },
  });

  return true;
}

export async function ensureCatalogPermissionsSynced() {
  const catalog = getAllCatalogPermissions();
  for (const item of catalog) {
    await prisma.permission.upsert({
      where: { kode: item.kode },
      update: {
        nama: item.nama,
        modul: item.modul,
        deskripsi: item.deskripsi,
      },
      create: {
        kode: item.kode,
        nama: item.nama,
        modul: item.modul,
        deskripsi: item.deskripsi,
      },
    });
  }
}

export async function listRolesWithPermissions() {
  await ensureCatalogPermissionsSynced();

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: {
          select: {
            users: true,
            userRoleAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.permission.findMany({
      orderBy: [{ modul: "asc" }, { kode: "asc" }],
    }),
  ]);
  return { roles, permissions };
}

export async function updateRolePermissions(
  session: SessionPayload,
  roleId: string,
  permissionIds: string[]
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!role) throw new Error("Role tidak ditemukan.");

  const allPerms = await prisma.permission.findMany();
  const permById = new Map(allPerms.map((p) => [p.id, p]));
  const permByKode = new Map(allPerms.map((p) => [p.kode, p]));

  const selectedKodes = new Set<string>();
  for (const id of permissionIds) {
    const p = permById.get(id);
    if (p) selectedKodes.add(p.kode);
  }

  // Sinkronkan otomatis permission API pendamping ketika menu diaktifkan
  const hasAnyMasterMenu = Array.from(selectedKodes).some((k) =>
    k.startsWith("menu:master:")
  );
  if (hasAnyMasterMenu) {
    selectedKodes.add("master:read");
  }
  if (selectedKodes.has("menu:master:import")) {
    selectedKodes.add("master:import");
  }
  if (selectedKodes.has("menu:perencanaan:plafond") || selectedKodes.has("kuappas:manage")) {
    selectedKodes.add("kuappas:read");
  }
  if (
    selectedKodes.has("menu:perencanaan:rka") ||
    selectedKodes.has("rka:write") ||
    selectedKodes.has("rka:submit") ||
    selectedKodes.has("rka:verify")
  ) {
    selectedKodes.add("rka:read");
  }
  if (
    selectedKodes.has("menu:perencanaan:anggaran-kas") ||
    selectedKodes.has("angkas:write") ||
    selectedKodes.has("angkas:lock")
  ) {
    selectedKodes.add("angkas:read");
  }
  if (selectedKodes.has("menu:perencanaan:spd") || selectedKodes.has("dpa:manage")) {
    selectedKodes.add("spd:read");
  }
  if (
    selectedKodes.has("menu:perencanaan:cetak-dokumen") ||
    selectedKodes.has("apbd:print")
  ) {
    selectedKodes.add("rka:read");
    selectedKodes.add("apbd:manage");
  }
  if (
    selectedKodes.has("menu:perencanaan:rka-skpd") ||
    selectedKodes.has("rka:print")
  ) {
    selectedKodes.add("rka:read");
  }
  if (
    selectedKodes.has("menu:perencanaan:dpa-skpd") ||
    selectedKodes.has("dpa:print")
  ) {
    selectedKodes.add("rka:read");
    selectedKodes.add("dpa:manage");
  }
  if (
    selectedKodes.has("menu:admin:users") ||
    selectedKodes.has("menu:admin:roles") ||
    selectedKodes.has("users:manage")
  ) {
    selectedKodes.add("users:read");
  }
  if (selectedKodes.has("menu:admin:audit")) {
    selectedKodes.add("audit:read");
  }

  const finalPermissionIds = Array.from(selectedKodes)
    .map((k) => permByKode.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: finalPermissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "users",
    entitas: "RolePermission",
    entitasId: role.id,
    deskripsi: `Memperbarui pemetaan menu & hak akses untuk role '${role.nama}' (${finalPermissionIds.length} permission aktif)`,
  });

  return true;
}

export async function createRole(session: SessionPayload, input: CreateRoleInput) {
  const existing = await prisma.role.findFirst({
    where: {
      OR: [
        { kode: { equals: input.kode, mode: "insensitive" } },
        { nama: { equals: input.nama, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    throw new Error(
      `Role dengan kode '${input.kode}' atau nama '${input.nama}' sudah ada.`
    );
  }

  // Berikan permission default dashboard:view untuk role baru
  const dashPerm = await prisma.permission.findUnique({
    where: { kode: "dashboard:view" },
  });

  const created = await prisma.role.create({
    data: {
      kode: input.kode,
      nama: input.nama,
      deskripsi: input.deskripsi || null,
      isCrossOpd: input.isCrossOpd,
      isSystem: false,
      ...(dashPerm
        ? {
            permissions: {
              create: [{ permissionId: dashPerm.id }],
            },
          }
        : {}),
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true, userRoleAssignments: true } },
    },
  });

  await recordAuditLog({
    session,
    aksi: "CREATE",
    modul: "users",
    entitas: "Role",
    entitasId: created.id,
    deskripsi: `Menambahkan role baru '${created.nama}' (Kode: ${created.kode})`,
  });

  return created;
}

export async function updateRole(session: SessionPayload, input: UpdateRoleInput) {
  const existing = await prisma.role.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Role tidak ditemukan.");

  if (input.kode && input.kode !== existing.kode) {
    const dupKode = await prisma.role.findFirst({
      where: {
        id: { not: input.id },
        kode: { equals: input.kode, mode: "insensitive" },
      },
    });
    if (dupKode) throw new Error(`Kode Role '${input.kode}' sudah digunakan.`);
  }

  const updated = await prisma.role.update({
    where: { id: input.id },
    data: {
      ...(input.kode !== undefined ? { kode: input.kode } : {}),
      ...(input.nama !== undefined ? { nama: input.nama } : {}),
      ...(input.deskripsi !== undefined ? { deskripsi: input.deskripsi || null } : {}),
      ...(input.isCrossOpd !== undefined ? { isCrossOpd: input.isCrossOpd } : {}),
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true, userRoleAssignments: true } },
    },
  });

  await recordAuditLog({
    session,
    aksi: "UPDATE",
    modul: "users",
    entitas: "Role",
    entitasId: updated.id,
    deskripsi: `Memperbarui role '${updated.nama}' (Kode: ${updated.kode})`,
  });

  return updated;
}

export async function deleteRole(session: SessionPayload, roleId: string) {
  const existing = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      _count: { select: { users: true, userRoleAssignments: true } },
    },
  });
  if (!existing) throw new Error("Role tidak ditemukan.");

  if (existing.kode === "0" || existing.kode === "SUPERADMIN") {
    throw new Error("Role Superadmin tidak dapat dihapus.");
  }

  if (existing._count.users > 0 || existing._count.userRoleAssignments > 0) {
    throw new Error(
      `Role '${existing.nama}' masih digunakan oleh pengguna aktif. Pindahkan penugasan pengguna terlebih dahulu sebelum menghapus role ini.`
    );
  }

  await prisma.role.delete({ where: { id: roleId } });

  await recordAuditLog({
    session,
    aksi: "DELETE",
    modul: "users",
    entitas: "Role",
    entitasId: roleId,
    deskripsi: `Menghapus role '${existing.nama}' (Kode: ${existing.kode})`,
  });

  return true;
}
