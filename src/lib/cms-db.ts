import mysql from "mysql2/promise";
import { getExternalDbConfig } from "@/lib/external-db-config";

const globalForCmsDb = globalThis as unknown as {
  cmsMysqlPool: mysql.Pool | undefined;
  cmsMysqlSig: string | undefined;
};

export function resetCmsDbPool() {
  if (globalForCmsDb.cmsMysqlPool) {
    globalForCmsDb.cmsMysqlPool.end().catch(() => {});
    globalForCmsDb.cmsMysqlPool = undefined;
    globalForCmsDb.cmsMysqlSig = undefined;
  }
}

export async function getCmsDbPool(): Promise<mysql.Pool> {
  const cfg = await getExternalDbConfig("CMS_WEB");
  const sig = `${cfg.host}:${cfg.port}:${cfg.username}:${cfg.password}:${cfg.database}`;

  if (globalForCmsDb.cmsMysqlPool && globalForCmsDb.cmsMysqlSig === sig) {
    return globalForCmsDb.cmsMysqlPool;
  }

  if (globalForCmsDb.cmsMysqlPool) {
    globalForCmsDb.cmsMysqlPool.end().catch(() => {});
  }

  globalForCmsDb.cmsMysqlPool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: cfg.database,
    connectTimeout: 3000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
  globalForCmsDb.cmsMysqlSig = sig;

  return globalForCmsDb.cmsMysqlPool;
}
