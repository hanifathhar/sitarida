import mysql from "mysql2/promise";

const CMS_DB_CONFIG = {
  host: process.env.CMS_DB_HOST || "103.167.12.55",
  port: Number(process.env.CMS_DB_PORT || 3306),
  user: process.env.CMS_DB_USER || "prg#s3rv3r#pro",
  password: process.env.CMS_DB_PASSWORD || "s3rv3r#2025%route.&",
  database: process.env.CMS_DB_NAME || "CMS_WEB",
  connectTimeout: 15000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
};

const globalForCmsDb = globalThis as unknown as {
  cmsMysqlPool: mysql.Pool | undefined;
};

export function getCmsDbPool(): mysql.Pool {
  if (!globalForCmsDb.cmsMysqlPool) {
    globalForCmsDb.cmsMysqlPool = mysql.createPool(CMS_DB_CONFIG);
  }
  return globalForCmsDb.cmsMysqlPool;
}
