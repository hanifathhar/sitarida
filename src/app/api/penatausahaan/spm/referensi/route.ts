import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getSppTerbitForSpm,
  getNextSpmSequence,
  getRekeningPotonganRef,
} from "@/modules/penatausahaan/spm.service";
import { getPetugasPenandatanganByOpd } from "@/modules/penatausahaan/spp.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "spp-pilihan" | "next-no" | "petugas" | "potongan-ref"
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId");
    const kd_skpd = searchParams.get("kd_skpd");
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const jenisSpm =
      searchParams.get("jenis_spm") ||
      searchParams.get("jenisSpm") ||
      undefined;
    const excludeSpmId = searchParams.get("excludeSpmId") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    // 1. Data Petugas Penandatangan per Role OPD
    if (type === "petugas") {
      if (!opdId) {
        return NextResponse.json(
          { success: false, error: "Parameter opdId wajib disertakan" },
          { status: 400 }
        );
      }
      const data = await getPetugasPenandatanganByOpd(opdId);
      return NextResponse.json({ success: true, data });
    }

    // 2. Nomor Urut SPM Berikutnya
    if (type === "next-no") {
      if (!kd_skpd) {
        return NextResponse.json(
          { success: false, error: "Parameter kd_skpd wajib disertakan" },
          { status: 400 }
        );
      }
      const nextSeq = await getNextSpmSequence({
        tahunAnggaran,
        kd_skpd,
      });
      return NextResponse.json({ success: true, data: { nextSeq } });
    }

    // 3. Referensi Kode Rekening Potongan Pajak / BPJS / Lainnya
    if (type === "potongan-ref") {
      const data = getRekeningPotonganRef();
      return NextResponse.json({ success: true, data });
    }

    // 4. Default / spp-pilihan: Daftar Dokumen SPP yang Terbit
    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Parameter kd_skpd wajib disertakan" },
        { status: 400 }
      );
    }

    const data = await getSppTerbitForSpm({
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      jenis_spm: jenisSpm,
      excludeSpmId,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/spm/referensi error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat data referensi SPM.",
      },
      { status: 500 }
    );
  }
}

