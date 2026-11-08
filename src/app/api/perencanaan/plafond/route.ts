import { NextRequest, NextResponse } from "next/server";
import {
  listPlafondPaginated,
  upsertPlafond,
  deletePlafond,
  togglePlafondLock,
  batchTogglePlafondLock,
} from "@/modules/perencanaan/plafond.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tahunAnggaran = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : 2027;
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await listPlafondPaginated({
      tahunAnggaran,
      opdId,
      unitKerjaId,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/perencanaan/plafond error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data Plafond Anggaran" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tahunAnggaran, opdId, unitKerjaId, paguMurni, paguUbah, isLockedMurni, isLockedUbah, keterangan } = body;

    if (!opdId || paguMurni === undefined) {
      return NextResponse.json(
        { success: false, message: "OPD dan Pagu Murni wajib diisi." },
        { status: 400 }
      );
    }

    const saved = await upsertPlafond({
      tahunAnggaran: Number(tahunAnggaran) || 2027,
      opdId,
      unitKerjaId: unitKerjaId || null,
      paguMurni: Number(paguMurni),
      paguUbah: paguUbah !== undefined ? Number(paguUbah) : undefined,
      isLockedMurni: typeof isLockedMurni === "boolean" ? isLockedMurni : undefined,
      isLockedUbah: typeof isLockedUbah === "boolean" ? isLockedUbah : undefined,
      keterangan,
    });

    return NextResponse.json({
      success: true,
      message: `Plafond anggaran [${saved.kd_skpd}${saved.kd_unit ? " - " + saved.kd_unit : ""}] berhasil disimpan.`,
      data: saved,
    });
  } catch (error: any) {
    console.error("POST /api/perencanaan/plafond error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan Plafond Anggaran" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, tahunAnggaran, mode, isLocked, isBatch } = body;

    if (!mode || (mode !== "MURNI" && mode !== "PERUBAHAN")) {
      return NextResponse.json(
        { success: false, message: "Mode harus 'MURNI' atau 'PERUBAHAN'." },
        { status: 400 }
      );
    }

    if (isBatch) {
      const tahun = Number(tahunAnggaran) || 2027;
      const res = await batchTogglePlafondLock(tahun, mode, Boolean(isLocked));
      return NextResponse.json({
        success: true,
        message: `${res.count} OPD/Unit berhasil di-${isLocked ? "KUNCI" : "BUKA KUNCI"} untuk RKA ${mode === "PERUBAHAN" ? "Perubahan" : "Penyusunan (Murni)"} TA ${tahun}.`,
        count: res.count,
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID Plafond wajib disertakan untuk toggle kunci tunggal." },
        { status: 400 }
      );
    }

    const updated = await togglePlafondLock(id, mode, Boolean(isLocked));
    return NextResponse.json({
      success: true,
      message: `Input RKA ${mode === "PERUBAHAN" ? "Perubahan" : "Penyusunan"} untuk [${updated.kd_skpd}] berhasil di-${isLocked ? "KUNCI" : "BUKA"}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/perencanaan/plafond error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengubah status kunci RKA" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID Plafond wajib disertakan" }, { status: 400 });
    }

    const deleted = await deletePlafond(id);
    return NextResponse.json({
      success: true,
      message: `Plafond anggaran [${deleted.kd_skpd}] berhasil dihapus.`,
      data: deleted,
    });
  } catch (error: any) {
    console.error("DELETE /api/perencanaan/plafond error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus Plafond Anggaran" },
      { status: 500 }
    );
  }
}

