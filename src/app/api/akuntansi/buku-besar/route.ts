import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getBukuBesarData,
  getBukuBesarRefs,
  isBukuBesarAuthorized,
} from "@/modules/akuntansi/buku-besar.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBukuBesarAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get("ref") === "1") {
      const refs = await getBukuBesarRefs(session);
      return NextResponse.json({ success: true, data: refs });
    }

    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const allKabupaten = searchParams.get("allKabupaten") === "1";
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const rekLevel = searchParams.get("rekLevel") || undefined;
    const kd_rek = searchParams.get("kd_rek") || searchParams.get("kd_rek6") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getBukuBesarData(session, {
      tahunAnggaran,
      allKabupaten,
      kd_skpd,
      kd_unit,
      rekLevel,
      kd_rek,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/buku-besar error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Buku Besar" },
      { status: 400 }
    );
  }
}
