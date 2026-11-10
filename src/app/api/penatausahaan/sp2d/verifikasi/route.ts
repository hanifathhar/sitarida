import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSp2dAuthorized, verifySp2d } from "@/modules/penatausahaan/sp2d.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Anda tidak berwenang memverifikasi SP2D." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, catatan_verifikasi } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Parameter id dan status wajib disertakan." },
        { status: 400 }
      );
    }

    if (!["DIVERIFIKASI", "DISETUJUI", "DITOLAK"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status verifikasi harus DIVERIFIKASI, DISETUJUI, atau DITOLAK." },
        { status: 400 }
      );
    }

    const result = await verifySp2d({
      id,
      status,
      catatan_verifikasi,
      verifikatorNama: session.namaLengkap,
      verifikatorNip: session.username, // atau NIP jika tersimpan
    });

    return NextResponse.json({
      success: true,
      message: `Status SP2D berhasil diperbarui menjadi ${status}.`,
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/sp2d/verifikasi error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses verifikasi SP2D" },
      { status: 400 }
    );
  }
}

