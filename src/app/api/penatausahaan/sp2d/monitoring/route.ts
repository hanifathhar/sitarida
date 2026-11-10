import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSp2dAuthorized, updatePencairanSp2d, getSp2dList } from "@/modules/penatausahaan/sp2d.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke monitoring pencairan SP2D." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tahunParam = searchParams.get("tahun");
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const statusPencairan = searchParams.get("statusPencairan") || "ALL"; // ALL, CAIR, BELUM_CAIR
    const q = searchParams.get("q") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    let filterStatus: string | undefined = undefined;
    if (statusPencairan === "CAIR") {
      filterStatus = "CAIR";
    } else if (statusPencairan === "BELUM_CAIR") {
      filterStatus = "DISETUJUI";
    }

    const result = await getSp2dList({
      tahunAnggaran,
      kd_skpd,
      status: filterStatus,
      q,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/sp2d/monitoring error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat data monitoring pencairan SP2D" },
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

    if (!isSp2dAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Anda tidak berwenang mengupdate status pencairan bank." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, tgl_cair, no_transaksi_bank, isCair, keterangan } = body;

    if (!id || (isCair && !tgl_cair)) {
      return NextResponse.json(
        { success: false, error: "ID dokumen dan tanggal pencairan wajib disertakan." },
        { status: 400 }
      );
    }

    const result = await updatePencairanSp2d({
      id,
      tgl_cair: tgl_cair || new Date().toISOString().split("T")[0],
      no_transaksi_bank,
      isCair: Boolean(isCair),
      keterangan,
    });

    return NextResponse.json({
      success: true,
      message: isCair
        ? "Status SP2D berhasil diperbarui menjadi CAIR (Telah dipindahbukukan Bank RKUD)."
        : "Status pencairan SP2D dibatalkan (Kembali ke status DISETUJUI).",
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/sp2d/monitoring error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui status pencairan SP2D" },
      { status: 400 }
    );
  }
}

