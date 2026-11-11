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
    const tipe = searchParams.get("tipe"); // "PENERIMAAN" atau "PENYETORAN"
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (tipe === "PENYETORAN") {
      const data = await bendaharaPengeluaranService.getPenyetoranPotonganList({
        tahunAnggaran,
        opdId,
      });
      return NextResponse.json({ success: true, data });
    } else {
      const data = await bendaharaPengeluaranService.getPenerimaanPotonganList({
        tahunAnggaran,
        opdId,
      });
      return NextResponse.json({ success: true, data });
    }
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/potongan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data potongan" },
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
    const tipe = body.tipe; // "PENERIMAAN" atau "PENYETORAN"

    if (tipe === "PENYETORAN") {
      const result = await bendaharaPengeluaranService.savePenyetoranPotongan(body);
      return NextResponse.json({
        success: true,
        message: "Data Penyetoran Potongan berhasil disimpan",
        data: result,
      });
    } else {
      const result = await bendaharaPengeluaranService.savePenerimaanPotongan(body);
      return NextResponse.json({
        success: true,
        message: "Data Penerimaan Potongan berhasil disimpan",
        data: result,
      });
    }
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/potongan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan transaksi potongan" },
      { status: 400 }
    );
  }
}

