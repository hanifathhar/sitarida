import { NextRequest, NextResponse } from "next/server";
import {
  listStandarHargaPaginated,
  createStandarHarga,
  updateStandarHarga,
  deleteStandarHarga,
  getNextKodeBarang,
} from "@/modules/master-data/standar-harga.service";
import { JenisStandarHarga } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const kd_kelompok = searchParams.get("kd_kelompok");

    // Endpoint helper untuk mendapatkan Kode Barang otomatis berikutnya
    if (action === "next-code" && kd_kelompok) {
      const nextInfo = await getNextKodeBarang(kd_kelompok);
      return NextResponse.json({
        success: true,
        data: nextInfo,
      });
    }

    const tahun = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : undefined;
    const jenis = (searchParams.get("jenis") as JenisStandarHarga) || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await listStandarHargaPaginated({
      tahun,
      jenis,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("GET /api/master/standar-harga error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data Standar Harga" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tahunAnggaran, jenis, kd_kelompok, kd_barang, uraianKelompok, uraianBarang, spesifikasi, satuan, hargaSatuan } = body;

    if (!jenis || !kd_kelompok || !uraianBarang || !satuan || hargaSatuan === undefined) {
      return NextResponse.json(
        { success: false, message: "Jenis, Kode Kelompok, Uraian Barang, Satuan, dan Harga Satuan wajib diisi." },
        { status: 400 }
      );
    }

    const created = await createStandarHarga({
      tahunAnggaran: Number(tahunAnggaran) || 2027,
      jenis,
      kd_kelompok,
      kd_barang,
      uraianKelompok,
      uraianBarang,
      spesifikasi,
      satuan,
      hargaSatuan: Number(hargaSatuan),
    });

    return NextResponse.json({
      success: true,
      message: `Standar Harga [${created.kd_barang || created.kd_kelompok}] berhasil ditambahkan.`,
      data: created,
    });
  } catch (error: any) {
    console.error("POST /api/master/standar-harga error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan data Standar Harga" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, jenis, kd_kelompok, kd_barang, uraianKelompok, uraianBarang, spesifikasi, satuan, hargaSatuan, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Standar Harga wajib disertakan." }, { status: 400 });
    }

    const updated = await updateStandarHarga(id, {
      jenis,
      kd_kelompok,
      kd_barang,
      uraianKelompok,
      uraianBarang,
      spesifikasi,
      satuan,
      hargaSatuan: hargaSatuan !== undefined ? Number(hargaSatuan) : undefined,
      isActive,
    });

    return NextResponse.json({
      success: true,
      message: `Standar Harga [${updated.kd_barang || updated.kd_kelompok}] berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/master/standar-harga error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data Standar Harga" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "ID Standar Harga wajib disertakan." }, { status: 400 });
    }

    const deleted = await deleteStandarHarga(id);
    return NextResponse.json({
      success: true,
      message: `Standar Harga [${deleted.kd_kelompok}] berhasil dihapus.`,
      data: deleted,
    });
  } catch (error: any) {
    console.error("DELETE /api/master/standar-harga error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data Standar Harga" },
      { status: 500 }
    );
  }
}
