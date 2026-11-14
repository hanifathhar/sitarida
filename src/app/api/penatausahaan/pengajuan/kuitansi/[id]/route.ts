import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  pengajuanService,
  isPengajuanAuthorized,
} from "@/modules/penatausahaan/pengajuan.service";

export async function GET(
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
    const data = await pengajuanService.getKwitansiById(id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Kuitansi tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/pengajuan/kuitansi/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat detail kuitansi" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const data = await pengajuanService.updateKwitansi(id, session, body);

    return NextResponse.json({
      success: true,
      message: "Kuitansi berhasil diperbarui",
      data,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/pengajuan/kuitansi/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui kuitansi" },
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

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { id } = await params;
    await pengajuanService.deleteKwitansi(id, session);

    return NextResponse.json({
      success: true,
      message: "Kuitansi berhasil dihapus",
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/pengajuan/kuitansi/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus kuitansi" },
      { status: 500 }
    );
  }
}

