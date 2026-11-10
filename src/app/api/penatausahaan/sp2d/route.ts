import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  isSp2dAuthorized,
  getSp2dScopeData,
  getSp2dList,
  saveSp2d,
  SaveSp2dPayload,
} from "@/modules/penatausahaan/sp2d.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Modul SP2D hanya dapat diakses oleh BUD, Bidang Perbendaharaan, dan Superadmin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const scopeOnly = searchParams.get("scope") === "true";

    if (scopeOnly) {
      const scopeData = await getSp2dScopeData(session);
      return NextResponse.json({ success: true, data: scopeData });
    }

    const tahunParam = searchParams.get("tahun");
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const jenis_sp2d =
      searchParams.get("jenis_sp2d") ||
      searchParams.get("jenisSp2d") ||
      undefined;
    const search = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await getSp2dList({
      tahunAnggaran,
      kd_skpd,
      jenis_sp2d,
      status,
      q: search,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/sp2d error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses permintaan data SP2D" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Anda tidak memiliki wewenang untuk menerbitkan SP2D." },
        { status: 403 }
      );
    }

    const body: SaveSp2dPayload = await req.json();

    if (!body.no_sp2d || !body.tgl_sp2d || !body.opdId || !body.spmId) {
      return NextResponse.json(
        { success: false, error: "Field wajib: no_sp2d, tgl_sp2d, opdId, dan spmId harus diisi." },
        { status: 400 }
      );
    }

    const result = await saveSp2d(body, session.namaLengkap);

    return NextResponse.json({
      success: true,
      message: `Dokumen SP2D ${body.no_sp2d} berhasil disimpan.`,
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/sp2d error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menyimpan dokumen SP2D" },
      { status: 400 }
    );
  }
}

