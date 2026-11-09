import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSppDetail, deleteSpp } from "@/modules/penatausahaan/spp.service";

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
    const spp = await getSppDetail(id);

    if (!spp) {
      return NextResponse.json(
        { success: false, error: "Dokumen SPP tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: spp,
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spp/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
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
    await deleteSpp(id);

    return NextResponse.json({
      success: true,
      message: "Dokumen SPP berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/penatausahaan/spp/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 400 }
    );
  }
}

