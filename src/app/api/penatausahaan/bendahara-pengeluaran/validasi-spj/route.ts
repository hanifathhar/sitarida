import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  bendaharaPengeluaranService,
  isBendaharaAuthorized,
} from "@/modules/penatausahaan/bendahara-pengeluaran.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isBendaharaAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Modul Bendahara Pengeluaran hanya dapat diakses oleh BUD, Bendahara Pengeluaran, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const status = searchParams.get("status") || undefined;
    const jns_beban = searchParams.get("jns_beban") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const data = await bendaharaPengeluaranService.getValidasiSpjKwitansiList({
      tahunAnggaran,
      opdId,
      kd_unit,
      status,
      jns_beban,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/validasi-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data SPJ / Kuitansi" },
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

    if (!isBendaharaAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, ids, action, catatan } = body;

    if ((!id && (!Array.isArray(ids) || ids.length === 0)) || !action) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 dokumen kuitansi dan tentukan aksi." },
        { status: 400 }
      );
    }

    const data = await bendaharaPengeluaranService.updateValidasiSpjKwitansi({
      id,
      ids,
      action,
      catatan,
      session,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses ${data.processedCount} dokumen kuitansi (${action}).`,
      data,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/validasi-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memvalidasi kuitansi" },
      { status: 400 }
    );
  }
}

