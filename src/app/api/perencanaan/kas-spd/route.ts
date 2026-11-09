import { NextRequest, NextResponse } from "next/server";
import {
  listAnggaranKas,
  upsertAnggaranKas,
  getUnitSpdData,
  generateSpdTriwulan,
  deleteSpdTriwulan,
} from "@/modules/perencanaan/kas-spd.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "kas" atau "spd"
    const tahun = searchParams.get("tahun")
      ? parseInt(searchParams.get("tahun")!, 10)
      : 2027;
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;

    if (type === "spd") {
      if (!opdId) {
        return NextResponse.json(
          { success: false, message: "Parameter opdId wajib disertakan" },
          { status: 400 }
        );
      }
      const spdData = await getUnitSpdData({
        tahunAnggaran: tahun,
        opdId,
        unitKerjaId,
      });
      return NextResponse.json({ success: true, data: spdData });
    }

    const kasList = await listAnggaranKas(tahun);
    return NextResponse.json({ success: true, data: kasList });
  } catch (error: any) {
    console.error("GET /api/perencanaan/kas-spd error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat data kas / spd",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "spd") {
      const {
        tahunAnggaran,
        opdId,
        unitKerjaId,
        triwulan,
        no_spd,
        tgl_spd,
        keterangan,
      } = body;

      if (!opdId || !triwulan || !no_spd) {
        return NextResponse.json(
          {
            success: false,
            message: "OPD, Periode Triwulan, dan Nomor SPD (no_spd) wajib diisi.",
          },
          { status: 400 }
        );
      }

      const created = await generateSpdTriwulan({
        tahunAnggaran: Number(tahunAnggaran) || 2027,
        opdId,
        unitKerjaId: unitKerjaId || null,
        triwulan: Number(triwulan) as 1 | 2 | 3 | 4,
        no_spd,
        tgl_spd: tgl_spd ? new Date(tgl_spd) : undefined,
        keterangan,
      });

      return NextResponse.json({
        success: true,
        message: `Dokumen SPD [${created.no_spd}] untuk ${created.periode} (${created.jumlahRekening} rekening belanja) berhasil diterbitkan.`,
        data: created,
      });
    }

    const { tahunAnggaran, opdId, triwulan1, triwulan2, triwulan3, triwulan4 } =
      body;
    if (!opdId) {
      return NextResponse.json(
        { success: false, message: "OPD wajib diisi" },
        { status: 400 }
      );
    }
    const saved = await upsertAnggaranKas({
      tahunAnggaran: Number(tahunAnggaran) || 2027,
      opdId,
      triwulan1: Number(triwulan1 || 0),
      triwulan2: Number(triwulan2 || 0),
      triwulan3: Number(triwulan3 || 0),
      triwulan4: Number(triwulan4 || 0),
    });
    return NextResponse.json({
      success: true,
      message: `Anggaran kas [${saved.kd_skpd}] berhasil disimpan.`,
      data: saved,
    });
  } catch (error: any) {
    console.error("POST /api/perencanaan/kas-spd error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memproses data kas / spd",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = searchParams.get("tahun")
      ? parseInt(searchParams.get("tahun")!, 10)
      : 2027;
    const opdId = searchParams.get("opdId");
    const unitKerjaId = searchParams.get("unitKerjaId") || null;
    const triwulan = searchParams.get("triwulan")
      ? parseInt(searchParams.get("triwulan")!, 10)
      : undefined;
    const no_spd = searchParams.get("no_spd") || undefined;

    if (!opdId) {
      return NextResponse.json(
        { success: false, message: "OPD wajib disertakan" },
        { status: 400 }
      );
    }

    const res = await deleteSpdTriwulan({
      tahunAnggaran: tahun,
      opdId,
      unitKerjaId,
      triwulan,
      no_spd,
    });

    return NextResponse.json({
      success: true,
      message: `Dokumen SPD berhasil dihapus (${res.deletedCount} baris rincian).`,
      data: res,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menghapus dokumen SPD",
      },
      { status: 400 }
    );
  }
}
