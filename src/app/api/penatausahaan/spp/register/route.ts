import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRegisterSppData } from "@/modules/penatausahaan/spp.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const jenisSpp = searchParams.get("jenisSpp") || undefined;
    const tglMulai = searchParams.get("tglMulai") || undefined;
    const tglSelesai = searchParams.get("tglSelesai") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("q") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const effectiveOpdId =
      !session.isCrossOpd &&
      session.roleKode !== "0" &&
      session.roleKode !== "SUPERADMIN"
        ? session.opdId
        : opdId;

    const data = await getRegisterSppData({
      tahunAnggaran,
      opdId: effectiveOpdId,
      jenisSpp,
      tglMulai,
      tglSelesai,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spp/register error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

