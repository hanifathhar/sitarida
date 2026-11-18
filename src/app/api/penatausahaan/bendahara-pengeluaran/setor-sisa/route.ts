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
    const tipe = (searchParams.get("tipe") as "SISA_KAS" | "PENGEMBALIAN") || "SISA_KAS";
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await bendaharaPengeluaranService.getSetorSisaData({
      tahunAnggaran,
      opdId,
      kd_unit,
      tipe,
    });

    return NextResponse.json({
      success: true,
      data: result.bookedList,
      readyStsList: result.readyStsList,
      sp2dOptions: result.sp2dOptions,
    });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data setor sisa / pengembalian" },
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

    if (body.pengembalianId) {
      const result = await bendaharaPengeluaranService.saveSetorSisaFromSts({
        tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
        opdId: body.opdId,
        pengembalianId: body.pengembalianId,
        tipe: body.tipe,
        tgl_bukti: body.tgl_bukti,
        jenis_kas: body.jenis_kas,
        no_sp2d: body.no_sp2d,
        uraian: body.uraian,
      });

      return NextResponse.json({
        success: true,
        message: `STS berhasil dibukukan ke ${
          body.tipe === "PENGEMBALIAN" ? "Pengembalian Belanja" : "Setor Sisa Kas"
        } dengan No. BKU ${result.no_bukti}`,
        data: result,
      });
    }

    const result = await bendaharaPengeluaranService.saveSetorSisaKas(body);

    return NextResponse.json({
      success: true,
      message: `Data ${body.tipe === "SISA_KAS" ? "Setor Sisa Kas" : "Pengembalian Belanja"} berhasil disimpan`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan setor sisa / pengembalian" },
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
        { success: false, error: "ID Setor Sisa Kas wajib disertakan." },
        { status: 400 }
      );
    }

    const updated = await bendaharaPengeluaranService.updateSetorSisaKas(body.id, {
      tgl_bukti: body.tgl_bukti,
      jenis_kas: body.jenis_kas,
      no_sp2d: body.no_sp2d,
      uraian: body.uraian,
    });

    return NextResponse.json({
      success: true,
      message: `Setor Sisa Kas ${updated.no_bukti} berhasil diperbarui`,
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui Setor Sisa Kas" },
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
        { success: false, error: "ID Setor Sisa Kas wajib disertakan." },
        { status: 400 }
      );
    }

    const result = await bendaharaPengeluaranService.deleteSetorSisaKas(id);
    return NextResponse.json({
      success: true,
      message: `Setor Sisa Kas ${result.no_bukti} berhasil dihapus dan STS dikembalikan ke daftar siap dibukukan.`,
      data: result,
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus Setor Sisa Kas" },
      { status: 400 }
    );
  }
}

