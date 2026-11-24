import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  bendaharaPenerimaanService,
  isBendaharaPenerimaanAuthorized,
} from "@/modules/penatausahaan/bendahara-penerimaan.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const verif = searchParams.get("verif") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("q") || undefined;

    const data = await bendaharaPenerimaanService.listPenerimaan(session, {
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      verif,
      startDate,
      endDate,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-penerimaan/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data penerimaan" },
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
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    const tahunAnggaran = session.tahunAnggaran || 2026;

    if (!body.no_terima || !body.tgl_terima || !body.kd_skpd || !body.kd_rek6 || !body.nm_rek6) {
      return NextResponse.json(
        {
          success: false,
          error: "Nomor Penerimaan, Tanggal Penerimaan, SKPD, dan Rekening wajib diisi.",
        },
        { status: 400 }
      );
    }

    const nilai = Number(body.nilai);
    if (Number.isNaN(nilai) || nilai < 0) {
      return NextResponse.json(
        { success: false, error: "Nilai penerimaan harus berupa angka >= 0." },
        { status: 400 }
      );
    }

    const created = await bendaharaPenerimaanService.createPenerimaan({
      ...body,
      tahunAnggaran,
      nilai,
    });

    return NextResponse.json({
      success: true,
      message: "Data Penerimaan berhasil disimpan.",
      data: created,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-penerimaan/penerimaan error:", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Nomor Penerimaan (no_terima) sudah terdaftar." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan data penerimaan" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    const nilai = Number(body.nilai);
    if (Number.isNaN(nilai) || nilai < 0) {
      return NextResponse.json(
        { success: false, error: "Nilai penerimaan harus berupa angka >= 0." },
        { status: 400 }
      );
    }

    const updated = await bendaharaPenerimaanService.updatePenerimaan(body.id, {
      ...body,
      nilai,
    });

    return NextResponse.json({
      success: true,
      message: "Data Penerimaan berhasil diperbarui.",
      data: updated,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-penerimaan/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui data penerimaan" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    const verif = Number(body.verif) === 1 ? 1 : 0;
    await bendaharaPenerimaanService.toggleVerifyPenerimaan(body.id, verif);

    return NextResponse.json({
      success: true,
      message: verif === 1 ? "Penerimaan berhasil diverifikasi." : "Verifikasi Penerimaan dibatalkan.",
    });
  } catch (err: any) {
    console.error("PATCH /api/penatausahaan/bendahara-penerimaan/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses verifikasi" },
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
    if (!isBendaharaPenerimaanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID wajib diisi." }, { status: 400 });
    }

    await bendaharaPenerimaanService.deletePenerimaan(id);
    return NextResponse.json({
      success: true,
      message: "Data Penerimaan berhasil dihapus.",
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-penerimaan/penerimaan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus data penerimaan" },
      { status: 500 }
    );
  }
}
