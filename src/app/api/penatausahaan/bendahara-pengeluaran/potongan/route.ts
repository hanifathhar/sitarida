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
    const action = searchParams.get("action");
    const tipe = searchParams.get("tipe"); // "PENERIMAAN" atau "PENYETORAN"
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (action === "potongan-ref") {
      const { getRekeningPotonganRef } = await import("@/modules/penatausahaan/spm.service");
      const data = getRekeningPotonganRef();
      return NextResponse.json({ success: true, data });
    }

    if (action === "kwitansi-cair") {
      const data = await bendaharaPengeluaranService.getKwitansiCairOptions({
        tahunAnggaran,
        opdId,
        kd_unit,
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === "trmpot-belum-setor") {
      const data = await bendaharaPengeluaranService.getUnsetorTrmpotList({
        tahunAnggaran,
        opdId,
        kd_unit,
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === "next-bku" && opdId) {
      const seq = await bendaharaPengeluaranService.getNextBkuSeq({
        tahunAnggaran,
        opdId,
      });
      const bkuRes = await bendaharaPengeluaranService.getNextBkuNumber({
        tahunAnggaran,
        opdId,
        kdUnitOrSkpd: kd_unit,
      });
      const unitPart = bkuRes.generatedNoBku.split("/")[1] || kd_unit || "UNIT";
      const no_bukti = `${String(seq).padStart(5, "0")}/${unitPart}/${tahunAnggaran}`;
      return NextResponse.json({ success: true, no_bukti, seq });
    }

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

export async function PUT(req: NextRequest) {
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
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "ID penerimaan potongan wajib disertakan." },
        { status: 400 }
      );
    }

    if (body.tipe === "PENYETORAN") {
      const result = await bendaharaPengeluaranService.updatePenyetoranPotongan(
        body.id,
        body
      );
      return NextResponse.json({
        success: true,
        message: `Penyetoran Potongan ${result.no_bukti} berhasil diperbarui`,
        data: result,
      });
    }

    const result = await bendaharaPengeluaranService.updatePenerimaanPotongan(
      body.id,
      body
    );
    return NextResponse.json({
      success: true,
      message: `Penerimaan Potongan ${result.no_bukti} berhasil diperbarui`,
      data: result,
    });
  } catch (err: any) {
    console.error("PUT /api/penatausahaan/bendahara-pengeluaran/potongan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui transaksi potongan" },
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
    const id = searchParams.get("id");
    const tipe = searchParams.get("tipe");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID transaksi potongan wajib disertakan." },
        { status: 400 }
      );
    }

    if (tipe === "PENYETORAN") {
      const result = await bendaharaPengeluaranService.deletePenyetoranPotongan(id);
      return NextResponse.json({
        success: true,
        message: `Penyetoran Potongan ${result.no_bukti} berhasil dihapus.`,
        data: result,
      });
    }

    const result = await bendaharaPengeluaranService.deletePenerimaanPotongan(id);
    return NextResponse.json({
      success: true,
      message: `Penerimaan Potongan ${result.no_bukti} berhasil dihapus.`,
      data: result,
    });
  } catch (err: any) {
    console.error("DELETE /api/penatausahaan/bendahara-pengeluaran/potongan error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus transaksi potongan" },
      { status: 400 }
    );
  }
}

