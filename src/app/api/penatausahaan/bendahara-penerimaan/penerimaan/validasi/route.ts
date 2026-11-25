import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  bendaharaPenerimaanService,
  isBendaharaPenerimaanAuthorized,
} from "@/modules/penatausahaan/bendahara-penerimaan.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

    const result = await bendaharaPenerimaanService.validasiPenerimaanBatch(ids);

    return NextResponse.json({
      success: true,
      message: `${result.validatedCount} transaksi penerimaan berhasil divalidasi ke Kasda (trhkasin & trdkasin).`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-penerimaan/penerimaan/validasi error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memvalidasi penerimaan" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    await bendaharaPenerimaanService.batalValidasiPenerimaan(id);
    return NextResponse.json({
      success: true,
      message: "Validasi penerimaan berhasil dibatalkan dan data kas masuk dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-penerimaan/penerimaan/validasi error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal membatalkan validasi penerimaan" },
      { status: 400 }
    );
  }
}
