import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getSpmScopeData,
  getSpmList,
  saveSpm,
  SaveSpmPayload,
} from "@/modules/penatausahaan/spm.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const scopeOnly = searchParams.get("scope") === "true";

    if (scopeOnly) {
      const scopeData = await getSpmScopeData(session);
      return NextResponse.json({
        success: true,
        data: scopeData,
      });
    }

    const tahunParam = searchParams.get("tahun");
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const jenisSpm =
      searchParams.get("jenis_spm") ||
      searchParams.get("jenisSpm") ||
      undefined;
    const search = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Parameter kd_skpd wajib disertakan" },
        { status: 400 }
      );
    }

    const result = await getSpmList({
      tahunAnggaran,
      kd_skpd,
      kd_unit: kd_unit === "ALL" ? undefined : kd_unit,
      jenis_spm: jenisSpm,
      q: search,
      status,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spm error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan pada server",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: SaveSpmPayload = await req.json();

    if (!body.no_spm || !body.tgl_spm || !body.no_spp || !body.opdId || !body.jenis_spm) {
      return NextResponse.json(
        {
          success: false,
          error: "Nomor SPM, Tanggal SPM, Nomor SPP, OPD, dan Jenis SPM wajib diisi.",
        },
        { status: 400 }
      );
    }

    const result = await saveSpm(body, session.namaLengkap);

    return NextResponse.json({
      success: true,
      message: body.id
        ? "Dokumen SPM berhasil diperbarui"
        : "Dokumen SPM berhasil diterbitkan",
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/spm error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal menyimpan dokumen SPM.",
      },
      { status: 400 }
    );
  }
}

