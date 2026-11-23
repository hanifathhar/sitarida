import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { z } from "zod";
import { requireAnyPermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import {
  listExternalDbConfigs,
  upsertExternalDbConfig,
  ExternalDbKode,
} from "@/lib/external-db-config";
import { resetCmsDbPool } from "@/lib/cms-db";

const updateSchema = z.object({
  kode: z.enum(["CMS_WEB", "SIMPATDA"]),
  nama: z.string().trim().min(1, "Nama koneksi wajib diisi").max(150),
  deskripsi: z.string().trim().max(500).optional().nullable(),
  host: z.string().trim().min(1, "Host / IP Server wajib diisi").max(255),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  username: z.string().trim().min(1, "Username wajib diisi").max(150),
  password: z.string().max(255).default(""),
  database: z.string().trim().min(1, "Nama database wajib diisi").max(150),
  isActive: z.boolean().default(true),
});

const testSchema = z.object({
  host: z.string().trim().min(1, "Host / IP Server wajib diisi"),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().default(""),
  database: z.string().trim().min(1, "Nama database wajib diisi"),
});

export async function GET() {
  try {
    await requireAnyPermission(["users:manage", "menu:admin:koneksi"]);
    const list = await listExternalDbConfigs();
    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAnyPermission(["users:manage", "menu:admin:koneksi"]);
    const body = await req.json();
    const input = updateSchema.parse(body);

    const updated = await upsertExternalDbConfig({
      kode: input.kode as ExternalDbKode,
      nama: input.nama,
      deskripsi: input.deskripsi || "",
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      database: input.database,
      isActive: input.isActive,
    });

    if (input.kode === "CMS_WEB") {
      resetCmsDbPool();
    }

    return NextResponse.json({
      success: true,
      message: `Konfigurasi koneksi ${updated.nama} berhasil disimpan.`,
      data: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | null = null;
  try {
    await requireAnyPermission(["users:manage", "menu:admin:koneksi"]);
    const body = await req.json();
    const input = testSchema.parse(body);

    const start = Date.now();
    conn = await mysql.createConnection({
      host: input.host,
      port: input.port,
      user: input.username,
      password: input.password,
      database: input.database,
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    const elapsedMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      message: `Koneksi ke ${input.host}:${input.port}/${input.database} berhasil (${elapsedMs} ms).`,
      elapsedMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          err?.message ||
          "Gagal terhubung ke server database eksternal.",
      },
      { status: 400 }
    );
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
}
