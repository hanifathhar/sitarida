import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getSppScopeData,
  listSppByScope,
  saveSpp,
  SaveSppPayload,
} from "@/modules/penatausahaan/spp.service";

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
      const scopeData = await getSppScopeData(session);
      return NextResponse.json({
        success: true,
        data: scopeData,
      });
    }

    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId");
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;
    const jenisSpp = searchParams.get("jenisSpp") || undefined;
    const search = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (!opdId) {
      return NextResponse.json(
        { success: false, error: "Parameter opdId wajib disertakan" },
        { status: 400 }
      );
    }

    const result = await listSppByScope({
      tahunAnggaran,
      opdId,
      unitKerjaId: unitKerjaId === "ALL" ? undefined : unitKerjaId,
      jenisSpp,
      search,
      status,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spp error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
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

    const body: SaveSppPayload = await req.json();

    if (!body.no_spp || !body.tgl_spp || !body.opdId || !body.jenis_spp) {
      return NextResponse.json(
        {
          success: false,
          error: "Nomor SPP, Tanggal SPP, OPD, dan Jenis SPP wajib diisi",
        },
        { status: 400 }
      );
    }

    const result = await saveSpp(
      {
        ...body,
        tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
      },
      session.namaLengkap
    );

    return NextResponse.json({
      success: true,
      message: "Data SPP berhasil disimpan",
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/spp error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 400 }
    );
  }
}

