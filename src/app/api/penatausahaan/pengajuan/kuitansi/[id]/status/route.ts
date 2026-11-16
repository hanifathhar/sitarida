import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  pengajuanService,
  isPengajuanAuthorized,
} from "@/modules/penatausahaan/pengajuan.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const statusTarget = body.status || body.action;
    const catatan = body.catatan;
    if (!statusTarget || !["DIAJUKAN", "DISETUJUI", "DITOLAK", "DIBATALKAN"].includes(statusTarget)) {
      return NextResponse.json(
        { success: false, error: "Status target tidak valid" },
        { status: 400 }
      );
    }

    const updated = await pengajuanService.updateStatusKwitansi(
      id,
      session,
      statusTarget,
      catatan
    );

    return NextResponse.json({
      success: true,
      message: `Status kuitansi berhasil diubah menjadi ${statusTarget}`,
      data: updated,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/pengajuan/kuitansi/[id]/status error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal mengubah status kuitansi" },
      { status: 500 }
    );
  }
}

