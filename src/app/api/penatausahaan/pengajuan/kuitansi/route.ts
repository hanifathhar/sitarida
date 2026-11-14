import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  pengajuanService,
  isPengajuanAuthorized,
} from "@/modules/penatausahaan/pengajuan.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Menu Pengajuan hanya dapat diakses oleh Superadmin, PPTK, dan PA/KPA.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;
    const status = searchParams.get("status") || undefined;
    const jns_beban = searchParams.get("jns_beban") || undefined;
    const search = searchParams.get("q") || undefined;
    const tglMulai = searchParams.get("tglMulai") || undefined;
    const tglSelesai = searchParams.get("tglSelesai") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const result = await pengajuanService.getKwitansiList(session, {
      tahunAnggaran,
      opdId,
      unitKerjaId,
      status,
      jns_beban,
      search,
      tglMulai,
      tglSelesai,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/pengajuan/kuitansi error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat daftar kuitansi" },
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

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Pembuatan kuitansi hanya dapat dilakukan oleh Superadmin, PPTK, dan PA/KPA.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.tanggal || !body.kd_sub_kegiatan || !body.kd_rek6 || !body.jns_beban || !body.nilai) {
      return NextResponse.json(
        {
          success: false,
          error: "Mohon lengkapi data wajib: Tanggal, Sub Kegiatan, Rekening, Jenis Beban, dan Nilai Kuitansi.",
        },
        { status: 400 }
      );
    }

    if (!body.penerima || !Array.isArray(body.penerima) || body.penerima.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Mohon masukkan minimal 1 data penerima pembayaran kuitansi.",
        },
        { status: 400 }
      );
    }

    const tahunAnggaran = body.tahunAnggaran
      ? parseInt(body.tahunAnggaran, 10)
      : session.tahunAnggaran || 2026;

    const opdId = body.opdId || session.opdId;
    if (!opdId) {
      return NextResponse.json(
        { success: false, error: "Perangkat Daerah (OPD) belum dipilih." },
        { status: 400 }
      );
    }

    const data = await pengajuanService.createKwitansi(session, {
      ...body,
      tahunAnggaran,
      opdId,
    });

    return NextResponse.json({
      success: true,
      message: "Kuitansi berhasil dibuat.",
      data,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/pengajuan/kuitansi error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membuat kuitansi" },
      { status: 500 }
    );
  }
}

