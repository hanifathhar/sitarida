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
    const action = searchParams.get("action");
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const statusPembukuan =
      (searchParams.get("statusPembukuan") as "SEMUA" | "SUDAH" | "BELUM") || "SEMUA";
    const search = searchParams.get("q") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (action === "next-bku" && opdId) {
      const kdUnitOrSkpd = searchParams.get("kdUnitOrSkpd") || kd_unit || undefined;
      const bkuRes = await bendaharaPengeluaranService.getNextBkuNumber({
        tahunAnggaran,
        opdId,
        kdUnitOrSkpd,
      });
      return NextResponse.json({ success: true, ...bkuRes });
    }

    const data = await bendaharaPengeluaranService.getPembukuanSp2dList({
      tahunAnggaran,
      opdId,
      kd_unit,
      statusPembukuan,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat daftar pembukuan SP2D" },
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
          error: "Akses ditolak. Modul Bendahara Pengeluaran hanya dapat diakses oleh BUD, Bendahara Pengeluaran, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await bendaharaPengeluaranService.postPembukuanSp2d(body);

    return NextResponse.json({
      success: true,
      message: `SP2D berhasil dibukukan dengan No. Bukti ${result.no_bukti}`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membukukan SP2D" },
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID Transout wajib diisi" }, { status: 400 });
    }

    await bendaharaPengeluaranService.deletePembukuan(id);
    return NextResponse.json({ success: true, message: "Pembukuan SP2D berhasil dibatalkan." });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/pembukuan-sp2d error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membatalkan pembukuan SP2D" },
      { status: 500 }
    );
  }
}

