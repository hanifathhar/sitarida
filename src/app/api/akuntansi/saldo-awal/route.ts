import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  deleteSaldoAwal,
  getSaldoAwalRefs,
  isSaldoAwalAuthorized,
  listSaldoAwal,
  upsertSaldoAwal,
} from "@/modules/akuntansi/saldo-awal.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isSaldoAwalAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get("ref") === "1") {
      const refs = await getSaldoAwalRefs();
      return NextResponse.json({ success: true, data: refs });
    }

    const kd_skpd = searchParams.get("kd_skpd") || "";
    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Kode SKPD wajib diisi." },
        { status: 400 }
      );
    }

    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const search = searchParams.get("q") || undefined;

    const data = await listSaldoAwal(session, {
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/saldo-awal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Saldo Awal" },
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
    const result = await upsertSaldoAwal(session, {
      ...body,
      tahunAnggaran,
    });

    return NextResponse.json({
      success: true,
      message: "Saldo awal akun berhasil disimpan.",
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/akuntansi/saldo-awal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan Saldo Awal" },
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
    if (!body?.id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    const tahunAnggaran = Number(body?.tahunAnggaran) || session.tahunAnggaran || 2026;
    const result = await upsertSaldoAwal(session, {
      ...body,
      tahunAnggaran,
    });

    return NextResponse.json({
      success: true,
      message: "Saldo awal akun berhasil diperbarui.",
      data: result,
    });
  } catch (err: any) {
    console.error("PUT /api/akuntansi/saldo-awal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui Saldo Awal" },
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

    await deleteSaldoAwal(session, id);
    return NextResponse.json({
      success: true,
      message: "Saldo awal akun berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/akuntansi/saldo-awal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus Saldo Awal" },
      { status: 400 }
    );
  }
}
