import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  isSp2dAuthorized,
  getSp2dDetail,
  deleteSp2d,
} from "@/modules/penatausahaan/sp2d.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke modul SP2D." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const data = await getSp2dDetail(id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Dokumen SP2D tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/sp2d/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat detail SP2D" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak untuk menghapus SP2D." },
        { status: 403 }
      );
    }

    const { id } = await params;
    await deleteSp2d(id);

    return NextResponse.json({
      success: true,
      message: "Dokumen SP2D berhasil dihapus dan status SPM dikembalikan.",
    });
  } catch (error: any) {
    console.error("DELETE /api/penatausahaan/sp2d/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menghapus dokumen SP2D" },
      { status: 400 }
    );
  }
}

