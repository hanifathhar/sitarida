import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getLaporanKeuanganData,
  getLaporanKeuanganRefs,
  isLaporanKeuanganAuthorized,
} from "@/modules/akuntansi/laporan-keuangan.service";
import type { JenisLaporanKeuangan } from "@/modules/akuntansi/laporan-keuangan.templates";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isLaporanKeuanganAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get("ref") === "1") {
      const refs = await getLaporanKeuanganRefs(session);
      return NextResponse.json({ success: true, data: refs });
    }

    const rawJenis = (searchParams.get("jenis") || "LRA").toUpperCase();
    if (!["LRA", "LO", "NERACA"].includes(rawJenis)) {
      return NextResponse.json(
        { success: false, error: "Jenis laporan tidak valid (LRA, LO, NERACA)." },
        { status: 400 }
      );
    }

    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const allKabupaten = searchParams.get("allKabupaten") === "1";
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const kd_rek = searchParams.get("kd_rek") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const data = await getLaporanKeuanganData(session, {
      jenis: rawJenis as JenisLaporanKeuangan,
      tahunAnggaran,
      allKabupaten,
      kd_skpd,
      kd_unit,
      kd_rek,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error("GET /api/akuntansi/laporan-keuangan error:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
