import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  pengajuanService,
  isPengajuanAuthorized,
} from "@/modules/penatausahaan/pengajuan.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const status = searchParams.get("status") || undefined;
    const jns_beban = searchParams.get("jns_beban") || undefined;
    const tglMulai = searchParams.get("tglMulai") || undefined;
    const tglSelesai = searchParams.get("tglSelesai") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await pengajuanService.getRegisterKwitansi(session, {
      tahunAnggaran,
      opdId,
      kd_unit,
      status,
      jns_beban,
      tglMulai,
      tglSelesai,
    });

    return NextResponse.json({
      success: true,
      data: result,
      summary: result.summary,
      items: result.items,
    });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/pengajuan/register error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat register kuitansi" },
      { status: 500 }
    );
  }
}

