import { NextRequest, NextResponse } from "next/server";
import {
  listAnggaranKas,
  upsertAnggaranKas,
  listSpd,
  createSpd,
} from "@/modules/perencanaan/kas-spd.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "kas" atau "spd"
    const tahun = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : 2027;

    if (type === "spd") {
      const spdList = await listSpd(tahun);
      return NextResponse.json({ success: true, data: spdList });
    }

    const kasList = await listAnggaranKas(tahun);
    return NextResponse.json({ success: true, data: kasList });
  } catch (error: any) {
    console.error("GET /api/perencanaan/kas-spd error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data kas / spd" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "spd") {
      const { tahunAnggaran, nomorSpd, tanggalSpd, opdId, periode, jumlahSpd, keterangan } = body;
      if (!nomorSpd || !opdId || !periode || jumlahSpd === undefined) {
        return NextResponse.json({ success: false, message: "Field SPD tidak lengkap" }, { status: 400 });
      }
      const created = await createSpd({
        tahunAnggaran: Number(tahunAnggaran) || 2027,
        nomorSpd,
        tanggalSpd: tanggalSpd ? new Date(tanggalSpd) : undefined,
        opdId,
        periode,
        jumlahSpd: Number(jumlahSpd),
        keterangan,
      });
      return NextResponse.json({ success: true, message: `SPD [${created.nomorSpd}] berhasil diterbitkan.`, data: created });
    }

    const { tahunAnggaran, opdId, triwulan1, triwulan2, triwulan3, triwulan4 } = body;
    if (!opdId) {
      return NextResponse.json({ success: false, message: "OPD wajib diisi" }, { status: 400 });
    }
    const saved = await upsertAnggaranKas({
      tahunAnggaran: Number(tahunAnggaran) || 2027,
      opdId,
      triwulan1: Number(triwulan1 || 0),
      triwulan2: Number(triwulan2 || 0),
      triwulan3: Number(triwulan3 || 0),
      triwulan4: Number(triwulan4 || 0),
    });
    return NextResponse.json({ success: true, message: `Anggaran kas [${saved.kd_skpd}] berhasil disimpan.`, data: saved });
  } catch (error: any) {
    console.error("POST /api/perencanaan/kas-spd error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses data kas / spd" },
      { status: 500 }
    );
  }
}

