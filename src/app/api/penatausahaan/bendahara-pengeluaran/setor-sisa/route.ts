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
    const tipe = (searchParams.get("tipe") as "SISA_KAS" | "PENGEMBALIAN") || "SISA_KAS";
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const data = await bendaharaPengeluaranService.getSetorSisaList({
      tahunAnggaran,
      opdId,
      tipe,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data setor sisa / pengembalian" },
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
    const result = await bendaharaPengeluaranService.saveSetorSisaKas(body);

    return NextResponse.json({
      success: true,
      message: `Data ${body.tipe === "SISA_KAS" ? "Setor Sisa Kas" : "Pengembalian Belanja"} berhasil disimpan`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/setor-sisa error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan setor sisa / pengembalian" },
      { status: 400 }
    );
  }
}

