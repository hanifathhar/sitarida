import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/session";
import { recordAuditLog } from "@/modules/audit/audit.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session) {
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";
    await recordAuditLog({
      session,
      aksi: "LOGOUT",
      modul: "auth",
      entitas: "User",
      entitasId: session.userId,
      deskripsi: `Pengguna '${session.namaLengkap}' (${session.username}) logout dari sistem`,
      ipAddress,
      userAgent,
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: "Logout berhasil" });
}

