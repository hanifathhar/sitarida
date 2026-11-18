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

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (action === "options") {
      const options = await bendaharaPengeluaranService.getPenerbitanStsOptions({
        tahunAnggaran,
        opdId,
      });
      return NextResponse.json({ success: true, data: options });
    }

    const data = await bendaharaPengeluaranService.getPenerbitanStsList({
      tahunAnggaran,
      opdId,
      kd_unit,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Penerbitan STS" },
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
    const result = await bendaharaPengeluaranService.savePenerbitanSts({
      ...body,
      tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
    });

    return NextResponse.json({
      success: true,
      message: "Penerbitan STS berhasil disimpan",
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan Penerbitan STS" },
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
        { success: false, error: "ID Penerbitan STS wajib disertakan." },
        { status: 400 }
      );
    }

    const result = await bendaharaPengeluaranService.updatePenerbitanSts(body.id, body);
    return NextResponse.json({
      success: true,
      message: "Penerbitan STS berhasil diperbarui",
      data: result,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui Penerbitan STS" },
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
        { success: false, error: "ID Penerbitan STS wajib disertakan." },
        { status: 400 }
      );
    }

    const result = await bendaharaPengeluaranService.deletePenerbitanSts(id);
    return NextResponse.json({
      success: true,
      message: `STS ${result.no_sts} berhasil dihapus.`,
      data: result,
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus Penerbitan STS" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadmin =
      session.roleKode === "0" || session.roleKode === "SUPERADMIN";
    if (!isSuperadmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Fitur update status pembayaran STS hanya dapat diakses oleh Superadmin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "ID Penerbitan STS wajib disertakan." },
        { status: 400 }
      );
    }

    if (body.action === "cancel") {
      const result = await bendaharaPengeluaranService.cancelStsPaymentStatus(
        body.id
      );
      return NextResponse.json({
        success: true,
        message: `Pembayaran STS ${
          result.no_sts || result.no_tetap
        } berhasil dibatalkan (verif = 0).`,
        data: result,
      });
    }

    const result = await bendaharaPengeluaranService.updateStsPaymentStatus(
      body.id,
      {
        kd_cabang: body.kd_cabang,
        kd_pengesahan: body.kd_pengesahan,
        tgl_bayar: body.tgl_bayar,
        nm_channel: body.nm_channel,
        kd_terminal: body.kd_terminal,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Status pembayaran STS ${result.no_sts || result.no_tetap} berhasil diperbarui (verif = 1).`,
      data: result,
    });
  } catch (err: any) {
    console.error("PATCH /api/penatausahaan/bendahara-pengeluaran/penerbitan-sts error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui status pembayaran STS" },
      { status: 400 }
    );
  }
}
