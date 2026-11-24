import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { budService, isBudAuthorized } from "@/modules/penatausahaan/bud.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBudAuthorized(session)) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Modul BUD hanya dapat diakses oleh BUD, Bidang Perbendaharaan, dan Superadmin.",
        },
        { status: 403 }
      );
    }

    const items = await budService.getSaldoKasdaList();
    const tahunAnggaran = session.tahunAnggaran || new Date().getFullYear();
    const current = items.find((item) => item.tahunAnggaran === tahunAnggaran) || null;

    return NextResponse.json({
      success: true,
      data: {
        tahunAnggaran,
        current,
        items,
      },
    });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bud/saldo-kasda error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data Saldo Kasda" },
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
    if (!isBudAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const tahunAnggaran = session.tahunAnggaran || new Date().getFullYear();
    const nilai = Number(body.nilai);
    const keterangan = typeof body.keterangan === "string" ? body.keterangan.trim() : "";

    if (Number.isNaN(nilai) || nilai < 0) {
      return NextResponse.json(
        { success: false, error: "Nilai Saldo Awal Kasda harus berupa angka >= 0." },
        { status: 400 }
      );
    }

    const saved = await budService.upsertSaldoKasda({
      tahunAnggaran,
      nilai,
      keterangan,
      updatedBy: session.namaLengkap || session.username,
    });

    return NextResponse.json({
      success: true,
      message: `Saldo Awal Kasda TA ${tahunAnggaran} berhasil disimpan.`,
      data: saved,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bud/saldo-kasda error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan Saldo Kasda" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBudAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID Saldo Kasda wajib diisi." },
        { status: 400 }
      );
    }

    await budService.deleteSaldoKasda(id);
    return NextResponse.json({
      success: true,
      message: "Data Saldo Awal Kasda berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bud/saldo-kasda error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus Saldo Kasda" },
      { status: 500 }
    );
  }
}
