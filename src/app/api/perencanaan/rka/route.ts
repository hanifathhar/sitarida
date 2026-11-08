import { NextRequest, NextResponse } from "next/server";
import {
  listTrskpdPaginated,
  getTrskpdDetail,
  upsertTrskpd,
  updateTrskpdMetadata,
  addTrdrka,
  addTrdpo,
  updateTrdpo,
  deleteTrskpd,
  deleteTrdrka,
  deleteTrdpo,
} from "@/modules/perencanaan/rka.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const detail = await getTrskpdDetail(id);
      if (!detail) {
        return NextResponse.json({ success: false, message: "RKA tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: detail });
    }

    const tahunAnggaran = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : 2027;
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await listTrskpdPaginated({
      tahunAnggaran,
      opdId,
      unitKerjaId,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/perencanaan/rka error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat RKA" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Aksi 1: Tambah Rekening Belanja (Trdrka)
    if (action === "add-rekening") {
      const { trskpdId, kd_rek6, nm_rek6, mode, rkaMode } = body;
      if (!trskpdId || !kd_rek6 || !nm_rek6) {
        return NextResponse.json({ success: false, message: "Field rekening tidak lengkap" }, { status: 400 });
      }
      const created = await addTrdrka({ trskpdId, kd_rek6, nm_rek6, mode: mode || rkaMode });
      return NextResponse.json({ success: true, message: "Rekening belanja berhasil ditambahkan", data: created });
    }

    // Aksi 2: Tambah Rincian Obyek Belanja (Trdpo)
    if (action === "add-rincian") {
      const {
        trdrkaId,
        kd_barang,
        uraian,
        satuan,
        satuan_ubah,
        volume,
        volume_ubah,
        harga,
        harga_ubah,
        kd_sumdan,
        catatan,
        catatan_ubah,
        mode,
        rkaMode,
      } = body;
      if (!trdrkaId || !uraian || !satuan || volume === undefined || harga === undefined) {
        return NextResponse.json({ success: false, message: "Field rincian objek belanja tidak lengkap" }, { status: 400 });
      }
      const created = await addTrdpo({
        trdrkaId,
        kd_barang,
        uraian,
        satuan,
        satuan_ubah,
        volume: Number(volume),
        volume_ubah: volume_ubah !== undefined ? Number(volume_ubah) : undefined,
        harga: Number(harga),
        harga_ubah: harga_ubah !== undefined ? Number(harga_ubah) : undefined,
        kd_sumdan,
        catatan,
        catatan_ubah,
        mode: mode || rkaMode,
      });
      return NextResponse.json({ success: true, message: "Rincian belanja berhasil ditambahkan", data: created });
    }

    // Aksi: Update Rincian Belanja (Murni / Perubahan)
    if (action === "update-rincian") {
      const { id, volume, satuan, harga, volume_ubah, satuan_ubah, harga_ubah, catatan, catatan_ubah, mode, rkaMode } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: "ID Rincian belanja wajib disertakan" }, { status: 400 });
      }
      const updated = await updateTrdpo(id, {
        volume: volume !== undefined ? Number(volume) : undefined,
        satuan,
        harga: harga !== undefined ? Number(harga) : undefined,
        volume_ubah: volume_ubah !== undefined ? (volume_ubah !== null ? Number(volume_ubah) : null) : undefined,
        satuan_ubah,
        harga_ubah: harga_ubah !== undefined ? (harga_ubah !== null ? Number(harga_ubah) : null) : undefined,
        catatan,
        catatan_ubah,
        mode: mode || rkaMode,
      });
      return NextResponse.json({ success: true, message: "Rincian belanja berhasil diperbarui", data: updated });
    }

    // Aksi 3: Edit Sub Kegiatan Metadata (Capaian Target, PPTK, Sasaran, Waktu, Lokasi)
    if (action === "edit-subkeg" || action === "update-subkeg") {
      const {
        id,
        sasaran_kegiatan,
        waktu_kegiatan,
        capaian_kegiatan,
        lokasi_kegiatan,
        pptkUserId,
        mode,
        rkaMode,
      } = body;

      if (!id) {
        return NextResponse.json({ success: false, message: "ID Sub Kegiatan wajib disertakan" }, { status: 400 });
      }

      const updated = await updateTrskpdMetadata(id, {
        sasaran_kegiatan,
        waktu_kegiatan,
        capaian_kegiatan,
        lokasi_kegiatan,
        pptkUserId,
        mode: mode || rkaMode,
      });

      return NextResponse.json({
        success: true,
        message: `Sub Kegiatan [${updated.kd_sub_kegiatan}] berhasil diperbarui.`,
        data: updated,
      });
    }

    // Aksi Default: Simpan / Update Sub Kegiatan RKA (Trskpd)
    const {
      id,
      tahunAnggaran,
      opdId,
      unitKerjaId,
      kd_program,
      nm_program,
      kd_kegiatan,
      nm_kegiatan,
      kd_sub_kegiatan,
      nm_sub_kegiatan,
      sasaran_kegiatan,
      waktu_kegiatan,
      capaian_kegiatan,
      lokasi_kegiatan,
      pptkUserId,
      mode,
      rkaMode,
    } = body;

    if (!opdId || !kd_program || !kd_kegiatan || !kd_sub_kegiatan) {
      return NextResponse.json({ success: false, message: "Data Sub Kegiatan tidak lengkap" }, { status: 400 });
    }

    const saved = await upsertTrskpd({
      id,
      tahunAnggaran: Number(tahunAnggaran) || 2027,
      opdId,
      unitKerjaId,
      kd_program,
      nm_program,
      kd_kegiatan,
      nm_kegiatan,
      kd_sub_kegiatan,
      nm_sub_kegiatan,
      sasaran_kegiatan,
      waktu_kegiatan,
      capaian_kegiatan,
      lokasi_kegiatan,
      pptkUserId,
      mode: mode || rkaMode,
    });

    return NextResponse.json({
      success: true,
      message: `Sub Kegiatan RKA [${saved.kd_sub_kegiatan}] berhasil disimpan.`,
      data: saved,
    });
  } catch (error: any) {
    console.error("POST /api/perencanaan/rka error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan data RKA" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "rka" | "rekening" | "rincian"
    const id = searchParams.get("id");
    const mode = (searchParams.get("mode") as "MURNI" | "PERUBAHAN") || undefined;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID wajib disertakan" }, { status: 400 });
    }

    if (type === "rincian") {
      const del = await deleteTrdpo(id, mode);
      return NextResponse.json({ success: true, message: `Rincian [${del.uraian}] berhasil dihapus.` });
    }

    if (type === "rekening") {
      const del = await deleteTrdrka(id, mode);
      return NextResponse.json({ success: true, message: `Rekening [${del.kd_rek6}] berhasil dihapus.` });
    }

    const del = await deleteTrskpd(id, mode);
    return NextResponse.json({ success: true, message: `Sub Kegiatan RKA [${del.kd_sub_kegiatan}] berhasil dihapus.` });
  } catch (error: any) {
    console.error("DELETE /api/perencanaan/rka error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus data RKA" },
      { status: 500 }
    );
  }
}

