import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SessionPayload } from "@/lib/session";

export interface CreateAuditLogInput {
  session?: SessionPayload | null;
  userId?: string | null;
  username?: string | null;
  userRole?: string | null;
  opdId?: string | null;
  aksi: "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "WORKFLOW" | "LOCK";
  modul: "auth" | "users" | "master-data" | "kua-ppas" | "rka" | "apbd" | "dpa" | "workflow" | "audit";
  entitas: string;
  entitasId?: string | null;
  deskripsi: string;
  dataSebelum?: unknown;
  dataSesudah?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(input: CreateAuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.session?.userId ?? input.userId ?? null,
        username: input.session?.username ?? input.username ?? "system",
        userRole: input.session?.roleKode ?? input.userRole ?? null,
        opdId: input.session?.opdId ?? input.opdId ?? null,
        aksi: input.aksi,
        modul: input.modul,
        entitas: input.entitas,
        entitasId: input.entitasId ?? null,
        deskripsi: input.deskripsi,
        dataSebelum: input.dataSebelum
          ? (JSON.parse(JSON.stringify(input.dataSebelum)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        dataSesudah: input.dataSesudah
          ? (JSON.parse(JSON.stringify(input.dataSesudah)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[AuditLog Error]", err);
  }
}

export async function listAuditLogs(params: {
  modul?: string;
  aksi?: string;
  search?: string;
  opdId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(10, params.limit || 25));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};
  if (params.modul) where.modul = params.modul;
  if (params.aksi) where.aksi = params.aksi;
  if (params.opdId) where.opdId = params.opdId;
  if (params.search) {
    where.OR = [
      { deskripsi: { contains: params.search, mode: "insensitive" } },
      { username: { contains: params.search, mode: "insensitive" } },
      { entitas: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

