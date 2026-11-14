import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  pengajuanService,
  isPengajuanAuthorized,
} from "@/modules/penatausahaan/pengajuan.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isPengajuanAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "scope" | "sub-kegiatan" | "rekening"
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_skpd = searchParams.get("kd_skpd") || undefined;
    const kd_sub_kegiatan = searchParams.get("kd_sub_kegiatan") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    if (type === "scope") {
      const isSuperadmin =
        session.roleKode === "0" || session.roleKode === "SUPERADMIN";
      const isCrossOpd = isSuperadmin || session.isCrossOpd;

      const opds = await prisma.opd.findMany({
        where: {
          isActive: true,
          ...(isCrossOpd ? {} : { id: session.opdId || undefined }),
        },
        orderBy: { kd_skpd: "asc" },
        select: {
          id: true,
          kd_skpd: true,
          nm_skpd: true,
          singkatan: true,
          kepalaNama: true,
          kepalaNip: true,
          kepalaJabatan: true,
        },
      });

      const units = await prisma.unitKerja.findMany({
        where: {
          isActive: true,
          ...(isCrossOpd
            ? {}
            : {
                opdId: session.opdId || undefined,
                ...(session.unitKerjaId ? { id: session.unitKerjaId } : {}),
              }),
        },
        orderBy: { kd_unit: "asc" },
        select: {
          id: true,
          opdId: true,
          kd_unit: true,
          nm_unit: true,
          kepalaNama: true,
          kepalaNip: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          session: {
            userId: session.userId,
            username: session.username,
            namaLengkap: session.namaLengkap,
            roleKode: session.roleKode,
            roleNama: session.roleNama,
            isCrossOpd,
            opdId: session.opdId || null,
            unitKerjaId: session.unitKerjaId || null,
          },
          opds,
          units,
        },
      });
    }

    if (type === "potongan-ref") {
      const { getRekeningPotonganRef } = await import("@/modules/penatausahaan/spm.service");
      const data = getRekeningPotonganRef();
      return NextResponse.json({ success: true, data });
    }

    if (type === "petugas") {
      if (!opdId) {
        return NextResponse.json(
          { success: false, error: "Parameter opdId wajib disertakan" },
          { status: 400 }
        );
      }
      const { getPetugasPenandatanganByOpd } = await import("@/modules/penatausahaan/spp.service");
      const data = await getPetugasPenandatanganByOpd(opdId);
      return NextResponse.json({ success: true, data });
    }

    if (type === "sisa-dana") {
      const kd_rek6 = searchParams.get("kd_rek6");
      const excludeKwitansiId = searchParams.get("excludeKwitansiId") || undefined;
      if (!kd_skpd || !kd_sub_kegiatan || !kd_rek6) {
        return NextResponse.json(
          { success: false, error: "kd_skpd, kd_sub_kegiatan, dan kd_rek6 wajib diisi" },
          { status: 400 }
        );
      }
      const data = await pengajuanService.getSisaPenyediaanDana({
        tahunAnggaran,
        kd_skpd,
        kd_sub_kegiatan,
        kd_rek6,
        excludeKwitansiId,
      });
      return NextResponse.json({ success: true, data });
    }

    if (type === "rekening") {
      if (!kd_skpd || !kd_sub_kegiatan) {
        return NextResponse.json(
          { success: false, error: "kd_skpd dan kd_sub_kegiatan wajib diisi" },
          { status: 400 }
        );
      }
      const data = await pengajuanService.getAvailableRekening({
        tahunAnggaran,
        kd_skpd,
        kd_sub_kegiatan,
      });
      return NextResponse.json({ success: true, data });
    }

    // Default: sub-kegiatan
    const data = await pengajuanService.getAvailableSubKegiatan(session, {
      tahunAnggaran,
      opdId,
      kd_skpd,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/pengajuan/options error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat opsi" },
      { status: 500 }
    );
  }
}

