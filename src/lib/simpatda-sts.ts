import mysql from "mysql2/promise";
import { prisma } from "@/lib/prisma";

export function getSimpatdaConnection() {
  return mysql.createConnection({
    host: process.env.SIMPATDA_DB_HOST || "103.167.12.55",
    port: Number(process.env.SIMPATDA_DB_PORT || 3306),
    user: process.env.SIMPATDA_DB_USER || "prg#s3rv3r#pro",
    password: process.env.SIMPATDA_DB_PASSWORD || "s3rv3r#2025%route.&",
    database: process.env.SIMPATDA_DB_NAME || "dbsimpatda",
    connectTimeout: 5000,
  });
}

function sameDate(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/**
 * Sinkronisasi otomatis status pembayaran & verifikasi STS dari dbsimpatda.tr_tetap
 * ke tabel tbl_pengembalian untuk seluruh STS yang sudah dikirim (sent_simpatda = true).
 */
export async function syncStsFromSimpatda(params?: {
  opdId?: string;
  tahunAnggaran?: number;
}): Promise<{ checked: number; updated: number }> {
  const localRows = await prisma.tblPengembalian.findMany({
    where: {
      sent_simpatda: true,
      no_sts: { not: null },
      ...(params?.opdId ? { opdId: params.opdId } : {}),
      ...(params?.tahunAnggaran ? { tahunAnggaran: params.tahunAnggaran } : {}),
    },
    select: {
      id: true,
      no_sts: true,
      verif: true,
      status: true,
      kd_cabang: true,
      kd_pengesahan: true,
      tgl_bayar: true,
      nm_channel: true,
      kd_terminal: true,
    },
  });

  const validRows = localRows.filter((r) => Boolean(r.no_sts?.trim()));
  if (validRows.length === 0) {
    return { checked: 0, updated: 0 };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await getSimpatdaConnection();
    const noStsList = validRows.map((r) => r.no_sts!.trim());
    const placeholders = noStsList.map(() => "?").join(", ");

    const [remoteRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT no_sts, verif, kd_cabang, kd_pengesahan, tgl_bayar, nm_channel, kd_terminal
       FROM tr_tetap
       WHERE no_sts IN (${placeholders})`,
      noStsList
    );

    const remoteMap = new Map<string, mysql.RowDataPacket>();
    for (const row of remoteRows) {
      const key = String(row.no_sts || "").trim();
      if (key) remoteMap.set(key, row);
    }

    let updated = 0;
    for (const local of validRows) {
      const remote = remoteMap.get(local.no_sts!.trim());
      if (!remote) continue;

      const remoteVerif = Number(remote.verif) || 0;
      const remoteKdCabang = remote.kd_cabang ? String(remote.kd_cabang).trim() : null;
      const remoteKdPengesahan = remote.kd_pengesahan
        ? String(remote.kd_pengesahan).trim()
        : null;
      const remoteTglBayar = remote.tgl_bayar ? new Date(remote.tgl_bayar) : null;
      const remoteNmChannel = remote.nm_channel ? String(remote.nm_channel).trim() : null;
      const remoteKdTerminal = remote.kd_terminal ? String(remote.kd_terminal).trim() : null;

      let nextStatus = local.status;
      if (remoteVerif === 1 && local.status === "TERBIT") {
        nextStatus = "TERBAYAR";
      } else if (remoteVerif === 0 && local.status === "TERBAYAR") {
        nextStatus = "TERBIT";
      }

      const isChanged =
        local.verif !== remoteVerif ||
        local.status !== nextStatus ||
        (local.kd_cabang || null) !== remoteKdCabang ||
        (local.kd_pengesahan || null) !== remoteKdPengesahan ||
        !sameDate(local.tgl_bayar, remoteTglBayar) ||
        (local.nm_channel || null) !== remoteNmChannel ||
        (local.kd_terminal || null) !== remoteKdTerminal;

      if (isChanged) {
        await prisma.tblPengembalian.update({
          where: { id: local.id },
          data: {
            verif: remoteVerif,
            status: nextStatus,
            kd_cabang: remoteKdCabang,
            kd_pengesahan: remoteKdPengesahan,
            tgl_bayar: remoteTglBayar,
            nm_channel: remoteNmChannel,
            kd_terminal: remoteKdTerminal,
          },
        });
        updated++;
      }
    }

    return { checked: validRows.length, updated };
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
}
