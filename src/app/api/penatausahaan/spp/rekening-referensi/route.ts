import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getRekeningReferensiForSpp,
  getPenetapanUpForSpp,
  getSpdTerbitList,
  getPetugasPenandatanganByOpd,
  getNextSppSequence,
} from "@/modules/penatausahaan/spp.service";

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
    const type = searchParams.get("type"); // "penetapan-up" | "spd-terbit" | "petugas" | undefined
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId");
    const kd_skpd = searchParams.get("kd_skpd");
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const excludeSppId = searchParams.get("excludeSppId") || undefined;

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

    // 2. Khusus Penetapan UP
    if (type === "penetapan-up") {
      if (!opdId) {
        return NextResponse.json(
          { success: false, error: "Parameter opdId wajib disertakan" },
          { status: 400 }
        );
      }
      const data = await getPenetapanUpForSpp({
        tahunAnggaran,
        opdId,
      });
      return NextResponse.json({ success: true, data });
    }

    // 2.5 Nomor urut SPP berikutnya (Format: 900/no_urut/kd_unit/SPP/jns_spp/tahun)
    if (type === "next-no") {
      if (!kd_skpd) {
        return NextResponse.json(
          { success: false, error: "Parameter kd_skpd wajib disertakan" },
          { status: 400 }
        );
      }
      const nextSeq = await getNextSppSequence({
        tahunAnggaran,
        kd_skpd,
      });
      return NextResponse.json({ success: true, data: { nextSeq } });
    }

    // 3. Daftar SPD yang terbit
    if (type === "spd-terbit") {
      if (!kd_skpd) {
        return NextResponse.json(
          { success: false, error: "Parameter kd_skpd wajib disertakan" },
          { status: 400 }
        );
      }
      const data = await getSpdTerbitList({
        tahunAnggaran,
        kd_skpd,
        kd_unit,
        excludeSppId,
      });
      return NextResponse.json({ success: true, data });
    }

    // 4. Default: Rekening Belanja DPA + Kontrol Sisa SPD
    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Parameter kd_skpd wajib disertakan" },
        { status: 400 }
      );
    }

    const data = await getRekeningReferensiForSpp({
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      excludeSppId,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "GET /api/penatausahaan/spp/rekening-referensi error:",
      error
    );
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
