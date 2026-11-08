import { z } from "zod";

export const userRoleAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  roleId: z.string().uuid("Role wajib dipilih"),
  opdId: z.string().uuid().optional().nullable().or(z.literal("")),
  unitKerjaId: z.string().uuid().optional().nullable().or(z.literal("")),
  jabatan: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(50)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip"
    ),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  namaLengkap: z.string().min(3, "Nama lengkap wajib diisi"),
  nip: z.string().optional().nullable(),
  jabatan: z.string().optional().nullable(),
  roleId: z.string().uuid("Role wajib dipilih").optional(),
  opdId: z.string().uuid().optional().nullable().or(z.literal("")),
  unitKerjaId: z.string().uuid().optional().nullable().or(z.literal("")),
  assignments: z.array(userRoleAssignmentSchema).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: z.string().email("Format email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
  namaLengkap: z.string().min(3, "Nama lengkap wajib diisi").optional(),
  nip: z.string().optional().nullable(),
  jabatan: z.string().optional().nullable(),
  roleId: z.string().uuid().optional(),
  opdId: z.string().uuid().optional().nullable().or(z.literal("")),
  unitKerjaId: z.string().uuid().optional().nullable().or(z.literal("")),
  assignments: z.array(userRoleAssignmentSchema).optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export const updateRolePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
});

export const createRoleSchema = z.object({
  kode: z
    .string()
    .min(1, "Kode Role wajib diisi")
    .max(30, "Kode Role maksimal 30 karakter")
    .trim(),
  nama: z
    .string()
    .min(2, "Nama Role minimal 2 karakter")
    .max(80, "Nama Role maksimal 80 karakter")
    .trim(),
  deskripsi: z.string().optional().nullable(),
  isCrossOpd: z.boolean().default(false),
});

export const updateRoleSchema = z.object({
  id: z.string().uuid(),
  kode: z.string().min(1).max(30).trim().optional(),
  nama: z.string().min(2).max(80).trim().optional(),
  deskripsi: z.string().optional().nullable(),
  isCrossOpd: z.boolean().optional(),
});

export type UserRoleAssignmentInput = z.infer<typeof userRoleAssignmentSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
