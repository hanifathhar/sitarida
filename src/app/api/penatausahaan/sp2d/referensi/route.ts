import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  isSp2dAuthorized,
  getSpmTerbitForSp2d,
  getNextSp2dSequence,
} from "@/modules/penatausahaan/sp2d.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke data referensi SP2D." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "spm-terbit" | "next-no"
    const tahunParam = searchParams.get("tahun");
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const jenisSp2d =
      searchParams.get("jenis_sp2d") ||
      searchParams.get("jenisSp2d") ||
      undefined;
    const excludeSp2dId = searchParams.get("excludeSp2dId") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    // 1. Nomor Urut SP2D Berikutnya (Running Global se-Kabupaten)
    if (type === "next-no") {
      const data = await getNextSp2dSequence({
        tahunAnggaran,
        jenisSp2d,
      });
      return NextResponse.json({ success: true, data });
    }

    // 2. Daftar SPM Terbit yang siap diterbitkan SP2D
    const data = await getSpmTerbitForSp2d({
      tahunAnggaran,
      kd_skpd,
      jenisSp2d,
      excludeSp2dId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/sp2d/referensi error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses referensi SP2D" },
      { status: 500 }
    );
  }
}

