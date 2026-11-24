import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  bendaharaPenerimaanService,
  isBendaharaPenerimaanAuthorized,
} from "@/modules/penatausahaan/bendahara-penerimaan.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke modul Bendahara Penerimaan." },
        { status: 403 }
      );
    }

    const data = await bendaharaPenerimaanService.getReferensi(session);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-penerimaan/referensi error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat referensi" },
      { status: 500 }
    );
  }
}
