import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  createJurnalPenyesuaian,
  deleteJurnalPenyesuaian,
  getJurnalPenyesuaianRefs,
  isJurnalPenyesuaianAuthorized,
  listJurnalPenyesuaian,
  updateJurnalPenyesuaian,
} from "@/modules/akuntansi/jurnal-penyesuaian.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isJurnalPenyesuaianAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    if (searchParams.get("ref") === "1") {
      const refs = await getJurnalPenyesuaianRefs({
        tahunAnggaran,
        kd_skpd: searchParams.get("kd_skpd") || undefined,
        kd_unit: searchParams.get("kd_unit") || undefined,
      });
      return NextResponse.json({ success: true, data: refs });
    }

    const kd_skpd = searchParams.get("kd_skpd") || "";
    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Kode SKPD wajib diisi." },
        { status: 400 }
      );
    }

    const kd_unit = searchParams.get("kd_unit") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("q") || undefined;

    const data = await listJurnalPenyesuaian(session, {
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      startDate,
      endDate,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/jurnal-penyesuaian error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Jurnal Penyesuaian" },
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

    const body = await req.json();
    const tahunAnggaran = Number(body?.tahunAnggaran) || session.tahunAnggaran || 2026;
    const created = await createJurnalPenyesuaian(session, {
      ...body,
      tahunAnggaran,
    });

    return NextResponse.json({
      success: true,
      message: `Jurnal Penyesuaian ${created.no_voucher} berhasil disimpan.`,
      data: created,
    });
  } catch (err: any) {
    console.error("POST /api/akuntansi/jurnal-penyesuaian error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan Jurnal Penyesuaian" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    const tahunAnggaran = Number(body?.tahunAnggaran) || session.tahunAnggaran || 2026;
    const updated = await updateJurnalPenyesuaian(session, id, {
      ...body,
      tahunAnggaran,
    });

    return NextResponse.json({
      success: true,
      message: `Jurnal Penyesuaian ${updated.no_voucher} berhasil diperbarui.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/akuntansi/jurnal-penyesuaian error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui Jurnal Penyesuaian" },
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    await deleteJurnalPenyesuaian(session, id);
    return NextResponse.json({
      success: true,
      message: "Jurnal Penyesuaian berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/akuntansi/jurnal-penyesuaian error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus Jurnal Penyesuaian" },
      { status: 400 }
    );
  }
}
