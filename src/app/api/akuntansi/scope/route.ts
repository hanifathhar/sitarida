import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getAkuntansiScope,
  isAkuntansiAuthorized,
} from "@/modules/akuntansi/posting-jurnal.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isAkuntansiAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke modul Akuntansi / Pelaporan." },
        { status: 403 }
      );
    }

    const data = await getAkuntansiScope(session);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/scope error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat scope Akuntansi" },
      { status: 500 }
    );
  }
}
