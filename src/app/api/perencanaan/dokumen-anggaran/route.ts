import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDokumenAnggaranData } from "@/modules/perencanaan/dokumen-anggaran.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Sesi tidak valid / belum login" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    // Kunci tahun anggaran berdasarkan tahun login sesi pengguna
    const sessionTahun = session.tahunAnggaran || 2026;
    const tahun = sessionTahun;
    const requestedOpdId = searchParams.get("opdId");

    // Jika pengguna bukan Lintas OPD / Superadmin, batasi hanya pada OPD miliknya
    const effectiveOpdId =
      !session.isCrossOpd &&
      session.roleKode !== "SUPERADMIN" &&
      session.roleKode !== "0" &&
      session.opdId
        ? session.opdId
        : requestedOpdId === "ALL" || !requestedOpdId
        ? null
        : requestedOpdId;

    const data = await getDokumenAnggaranData({
      tahun,
      opdId: effectiveOpdId,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        session: {
          isCrossOpd:
            session.isCrossOpd ||
            session.roleKode === "SUPERADMIN" ||
            session.roleKode === "0",
          userOpdId: session.opdId,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/perencanaan/dokumen-anggaran error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat data dokumen anggaran",
      },
      { status: 500 }
    );
  }
}

