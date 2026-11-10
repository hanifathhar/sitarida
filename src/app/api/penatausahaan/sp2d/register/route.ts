import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSp2dAuthorized, getRegisterSp2dData } from "@/modules/penatausahaan/sp2d.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke buku register SP2D." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const jenisSp2d =
      searchParams.get("jenis_sp2d") ||
      searchParams.get("jenisSp2d") ||
      undefined;
    const tglMulai = searchParams.get("tglMulai") || undefined;
    const tglSelesai = searchParams.get("tglSelesai") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("q") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await getRegisterSp2dData({
      tahunAnggaran,
      opdId,
      jenisSp2d,
      tglMulai,
      tglSelesai,
      status,
      search,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/sp2d/register error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat data buku register SP2D" },
      { status: 500 }
    );
  }
}

