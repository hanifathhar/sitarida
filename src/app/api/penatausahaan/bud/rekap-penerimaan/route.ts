import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { budService, isBudAuthorized } from "@/modules/penatausahaan/bud.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isBudAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Modul BUD hanya dapat diakses oleh BUD, Bidang Perbendaharaan, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await budService.getRekapPenerimaan({
      tahunAnggaran,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bud/rekap-penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat rekapitulasi penerimaan daerah" },
      { status: 500 }
    );
  }
}

