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
    const detailId = searchParams.get("id");
    if (detailId) {
      const detail = await bendaharaPengeluaranService.getPembukuanSpjDetail(detailId);
      return NextResponse.json({ success: true, data: detail });
    }

    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await bendaharaPengeluaranService.getPembukuanSpjData({
      tahunAnggaran,
      opdId,
      kd_unit,
    });

    return NextResponse.json({
      success: true,
      data: result.bookedList,
      readyKwitansi: result.readyKwitansi,
      sp2dOptions: result.sp2dOptions,
    });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/pembukuan-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat pembukuan SPJ" },
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

    if (body.kwitansiId) {
      const result = await bendaharaPengeluaranService.savePembukuanSpjFromKwitansi({
        tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
        opdId: body.opdId,
        kwitansiId: body.kwitansiId,
        no_sp2d: body.no_sp2d,
        tgl_bukti: body.tgl_bukti,
      });

      return NextResponse.json({
        success: true,
        message: "Pembukuan SPJ berhasil disimpan",
        data: result,
      });
    }

    const result = await bendaharaPengeluaranService.savePembukuanSpj(body);

    return NextResponse.json({
      success: true,
      message: "Pembukuan SPJ berhasil disimpan",
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/pembukuan-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan pembukuan SPJ" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
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
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "ID pembukuan SPJ wajib disertakan." },
        { status: 400 }
      );
    }

    const updated = await bendaharaPengeluaranService.updatePembukuanSpj(body.id, {
      no_sp2d: body.no_sp2d,
      tgl_bukti: body.tgl_bukti,
      uraian: body.uraian,
      pay_type: body.pay_type,
    });

    return NextResponse.json({
      success: true,
      message: "Pembukuan SPJ berhasil diperbarui",
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-pengeluaran/pembukuan-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui pembukuan SPJ" },
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
      return NextResponse.json(
        { success: false, error: "ID pembukuan SPJ wajib disertakan." },
        { status: 400 }
      );
    }

    const result = await bendaharaPengeluaranService.deletePembukuanSpj(id);
    return NextResponse.json({
      success: true,
      message: `Pembukuan SPJ ${result.no_bukti} berhasil dihapus dan kuitansi dikembalikan ke daftar siap dibukukan.`,
      data: result,
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/pembukuan-spj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus pembukuan SPJ" },
      { status: 400 }
    );
  }
}

