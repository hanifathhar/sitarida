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
    const jenis_lpj = searchParams.get("jenis_lpj") || undefined; // "UP", "GU", "TU", "KKPD", "REGULAR"

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (action === "next-nomor" && opdId) {
      const kdUnitOrSkpd = searchParams.get("kdUnitOrSkpd") || kd_unit || undefined;
      const res = await bendaharaPengeluaranService.getNextNoLpj({
        tahunAnggaran,
        opdId,
        kdUnitOrSkpd,
      });
      return NextResponse.json({ success: true, ...res });
    }

    if (action === "available-sp2d" && opdId) {
      const data = await bendaharaPengeluaranService.getAvailableSp2dForLpj({
        tahunAnggaran,
        opdId,
        kd_unit,
        jenis_lpj: jenis_lpj || "GU",
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === "available-transout" && opdId) {
      const tgl_awal = searchParams.get("tgl_awal");
      const tgl_akhir = searchParams.get("tgl_akhir");
      const no_sp2d = searchParams.get("no_sp2d") || undefined;
      const include_no_lpj = searchParams.get("include_no_lpj") || undefined;
      if (!tgl_awal || !tgl_akhir) {
        return NextResponse.json(
          { success: false, error: "Parameter tgl_awal dan tgl_akhir wajib diisi" },
          { status: 400 }
        );
      }
      const data = await bendaharaPengeluaranService.getAvailableTransoutForLpj({
        tahunAnggaran,
        opdId,
        kd_unit,
        tgl_awal,
        tgl_akhir,
        jenis_lpj: jenis_lpj || "GU",
        no_sp2d,
        include_no_lpj,
      });
      return NextResponse.json({ success: true, data });
    }

    const data = await bendaharaPengeluaranService.getLpjList({
      tahunAnggaran,
      opdId,
      kd_unit,
      jenis_lpj,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/lpj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat LPJ" },
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
    const result = await bendaharaPengeluaranService.saveLpj({
      ...body,
      tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
    });

    return NextResponse.json({
      success: true,
      message: `LPJ ${body.jenis_lpj || ""} berhasil dibuat dan diposting`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/lpj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membuat LPJ" },
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
    if (!body.original_no_lpj) {
      return NextResponse.json(
        { success: false, error: "Parameter original_no_lpj wajib diisi" },
        { status: 400 }
      );
    }

    const result = await bendaharaPengeluaranService.updateLpj({
      ...body,
      tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
    });

    return NextResponse.json({
      success: true,
      message: `LPJ ${result.no_lpj} berhasil diperbarui`,
      data: result,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-pengeluaran/lpj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui LPJ" },
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
    const no_lpj = searchParams.get("no_lpj");
    const tahunParam = searchParams.get("tahun");
    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (!no_lpj) {
      return NextResponse.json(
        { success: false, error: "Parameter no_lpj wajib diisi" },
        { status: 400 }
      );
    }

    await bendaharaPengeluaranService.deleteLpj({ tahunAnggaran, no_lpj });

    return NextResponse.json({
      success: true,
      message: `LPJ ${no_lpj} berhasil dibatalkan. Status transaksi SPJ dikembalikan menjadi belum LPJ.`,
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/lpj error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membatalkan LPJ" },
      { status: 400 }
    );
  }
}

