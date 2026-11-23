import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export type ExternalDbKode = "CMS_WEB" | "SIMPATDA";

export interface ExternalDbConfig {
  id?: string;
  kode: ExternalDbKode;
  nama: string;
  deskripsi: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  isActive: boolean;
  updatedAt?: Date | string;
}

export const DEFAULT_EXTERNAL_DB_CONFIGS: Record<
  ExternalDbKode,
  ExternalDbConfig
> = {
  CMS_WEB: {
    kode: "CMS_WEB",
    nama: "Database CMS_WEB (Bank Sumut / SPJ)",
    deskripsi:
      "Koneksi ke database MySQL CMS_WEB untuk pengiriman SPJ kuitansi dan sinkronisasi status pencairan SPJ (trxspj).",
    host: process.env.CMS_DB_HOST || "103.167.12.55",
    port: Number(process.env.CMS_DB_PORT || 3306),
    username: process.env.CMS_DB_USER || "prg#s3rv3r#pro",
    password: process.env.CMS_DB_PASSWORD || "s3rv3r#2025%route.&",
    database: process.env.CMS_DB_NAME || "CMS_WEB",
    isActive: true,
  },
  SIMPATDA: {
    kode: "SIMPATDA",
    nama: "Database dbsimpatda (STS Pengembalian)",
    deskripsi:
      "Koneksi ke database MySQL dbsimpatda untuk pengiriman data STS (tr_tetap) dan sinkronisasi status pembayaran STS.",
    host: process.env.SIMPATDA_DB_HOST || "103.167.12.55",
    port: Number(process.env.SIMPATDA_DB_PORT || 3306),
    username: process.env.SIMPATDA_DB_USER || "prg#s3rv3r#pro",
    password: process.env.SIMPATDA_DB_PASSWORD || "s3rv3r#2025%route.&",
    database: process.env.SIMPATDA_DB_NAME || "dbsimpatda",
    isActive: true,
  },
};

const globalForExtDb = globalThis as unknown as {
  extDbConfigCache?: Map<string, { config: ExternalDbConfig; expiresAt: number }>;
};

function getCache() {
  if (!globalForExtDb.extDbConfigCache) {
    globalForExtDb.extDbConfigCache = new Map();
  }
  return globalForExtDb.extDbConfigCache;
}

export function invalidateExternalDbConfigCache(kode?: ExternalDbKode) {
  const cache = getCache();
  if (kode) {
    cache.delete(kode);
  } else {
    cache.clear();
  }
}

async function ensureTableExists() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ms_koneksi_eksternal (
      id TEXT PRIMARY KEY,
      kode TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      deskripsi TEXT,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 3306,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      database TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function ensureDefaultExternalConnections() {
  await ensureTableExists();
  for (const kode of Object.keys(DEFAULT_EXTERNAL_DB_CONFIGS) as ExternalDbKode[]) {
    const def = DEFAULT_EXTERNAL_DB_CONFIGS[kode];
    const existing = await prisma.$queryRaw<ExternalDbConfig[]>`
      SELECT id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "updatedAt"
      FROM ms_koneksi_eksternal
      WHERE kode = ${kode}
      LIMIT 1
    `;
    if (existing.length === 0) {
      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO ms_koneksi_eksternal (id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "createdAt", "updatedAt")
        VALUES (${id}, ${def.kode}, ${def.nama}, ${def.deskripsi}, ${def.host}, ${def.port}, ${def.username}, ${def.password}, ${def.database}, ${def.isActive}, NOW(), NOW())
        ON CONFLICT (kode) DO NOTHING
      `;
    }
  }
}

export async function listExternalDbConfigs(): Promise<ExternalDbConfig[]> {
  await ensureDefaultExternalConnections();
  const rows = await prisma.$queryRaw<ExternalDbConfig[]>`
    SELECT id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "updatedAt"
    FROM ms_koneksi_eksternal
    ORDER BY kode ASC
  `;
  return rows.map((r) => ({
    ...r,
    port: Number(r.port) || 3306,
    isActive: Boolean(r.isActive),
  }));
}

export async function upsertExternalDbConfig(
  input: ExternalDbConfig
): Promise<ExternalDbConfig> {
  await ensureTableExists();
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO ms_koneksi_eksternal (id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "createdAt", "updatedAt")
    VALUES (${id}, ${input.kode}, ${input.nama}, ${input.deskripsi || null}, ${input.host}, ${input.port}, ${input.username}, ${input.password}, ${input.database}, ${input.isActive}, NOW(), NOW())
    ON CONFLICT (kode) DO UPDATE SET
      nama = EXCLUDED.nama,
      deskripsi = EXCLUDED.deskripsi,
      host = EXCLUDED.host,
      port = EXCLUDED.port,
      username = EXCLUDED.username,
      password = EXCLUDED.password,
      database = EXCLUDED.database,
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = NOW()
  `;

  invalidateExternalDbConfigCache(input.kode);
  const rows = await prisma.$queryRaw<ExternalDbConfig[]>`
    SELECT id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "updatedAt"
    FROM ms_koneksi_eksternal
    WHERE kode = ${input.kode}
    LIMIT 1
  `;
  return rows[0];
}

export async function getExternalDbConfig(
  kode: ExternalDbKode
): Promise<ExternalDbConfig> {
  const cache = getCache();
  const cached = cache.get(kode);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.config.isActive) {
      throw new Error(
        `Koneksi eksternal "${cached.config.nama}" sedang dinonaktifkan pada menu Setting Koneksi.`
      );
    }
    return cached.config;
  }

  await ensureDefaultExternalConnections();
  const rows = await prisma.$queryRaw<ExternalDbConfig[]>`
    SELECT id, kode, nama, deskripsi, host, port, username, password, database, "isActive", "updatedAt"
    FROM ms_koneksi_eksternal
    WHERE kode = ${kode}
    LIMIT 1
  `;

  const def = DEFAULT_EXTERNAL_DB_CONFIGS[kode];
  const row = rows[0];
  const config: ExternalDbConfig = row
    ? {
        id: row.id,
        kode: row.kode as ExternalDbKode,
        nama: row.nama,
        deskripsi: row.deskripsi || def.deskripsi,
        host: row.host,
        port: Number(row.port) || 3306,
        username: row.username,
        password: row.password,
        database: row.database,
        isActive: Boolean(row.isActive),
      }
    : def;

  cache.set(kode, { config, expiresAt: Date.now() + 10_000 });

  if (!config.isActive) {
    throw new Error(
      `Koneksi eksternal "${config.nama}" sedang dinonaktifkan pada menu Setting Koneksi.`
    );
  }

  return config;
}
