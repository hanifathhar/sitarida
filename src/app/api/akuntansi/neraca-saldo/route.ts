import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getNeracaSaldoData,
  getNeracaSaldoRefs,
  isNeracaSaldoAuthorized,
} from "@/modules/akuntansi/neraca-saldo.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isNeracaSaldoAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get("ref") === "1") {
      const refs = await getNeracaSaldoRefs(session);
      return NextResponse.json({ success: true, data: refs });
    }

    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const allKabupaten = searchParams.get("allKabupaten") === "1";
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const rekLevel = searchParams.get("rekLevel") || "6";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getNeracaSaldoData(session, {
      tahunAnggaran,
      allKabupaten,
      kd_skpd,
      kd_unit,
      rekLevel,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/neraca-saldo error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Neraca Saldo" },
      { status: 400 }
    );
  }
}
