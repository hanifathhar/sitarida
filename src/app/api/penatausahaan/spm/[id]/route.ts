import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSpmDetail, deleteSpm } from "@/modules/penatausahaan/spm.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const spm = await getSpmDetail(id);

    if (!spm) {
      return NextResponse.json(
        { success: false, error: "Dokumen SPM tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: spm,
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spm/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil data detail SPM",
      },
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    await deleteSpm(id);

    return NextResponse.json({
      success: true,
      message: "Dokumen SPM berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/penatausahaan/spm/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal menghapus dokumen SPM",
      },
      { status: 400 }
    );
  }
}

