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
    const id = searchParams.get("id");

    if (id) {
      const data = await budService.getPenerimaanDetail(id);
      return NextResponse.json({ success: true, data });
    }

    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const sumber_dana = searchParams.get("sumber_dana") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("q") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await budService.getPenerimaanList({
      tahunAnggaran,
      opdId,
      kd_skpd,
      sumber_dana,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bud/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data penerimaan daerah" },
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

    if (!isBudAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Modul BUD hanya dapat diakses oleh BUD, Bidang Perbendaharaan, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const tahunAnggaran = body.tahunAnggaran || session.tahunAnggaran || 2026;

    const result = await budService.savePenerimaan({
      ...body,
      tahunAnggaran,
    });

    return NextResponse.json({
      success: true,
      message: "Data Penerimaan Daerah berhasil disimpan",
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bud/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan data penerimaan daerah" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Penerimaan wajib diberikan" },
        { status: 400 }
      );
    }

    await budService.deletePenerimaan(id);

    return NextResponse.json({
      success: true,
      message: "Data Penerimaan Daerah berhasil dihapus",
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bud/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus data penerimaan daerah" },
      { status: 500 }
    );
  }
}

