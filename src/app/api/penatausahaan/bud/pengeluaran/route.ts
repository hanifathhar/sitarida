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
    const opdId = searchParams.get("opdId") || undefined;
    const jenis_sp2d = searchParams.get("jenis_sp2d") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("q") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await budService.getPengeluaranList({
      tahunAnggaran,
      opdId,
      jenis_sp2d,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bud/pengeluaran error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat daftar pengeluaran daerah" },
      { status: 500 }
    );
  }
}

