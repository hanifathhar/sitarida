import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter").trim(),
  password: z.string().min(4, "Password minimal 4 karakter"),
  tahunAnggaranId: z.string().uuid("Tahun Anggaran wajib dipilih saat login").optional(),
  assignmentId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
