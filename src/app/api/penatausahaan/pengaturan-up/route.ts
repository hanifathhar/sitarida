import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getPengaturanUpData,
  saveSinglePenetapanUp,
  bulkSavePenetapanUp,
} from "@/modules/penatausahaan/pengaturan-up.service";

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
    const tahunParam = searchParams.get("tahun");
    const search = searchParams.get("q") || undefined;

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const data = await getPengaturanUpData({
      tahunAnggaran,
      search,
    });

    const isSuperadmin =
      session.roleKode === "0" ||
      session.roleKode === "SUPERADMIN";

    const isBud =
      session.roleKode === "1" ||
      session.roleNama?.toUpperCase().includes("BUD") ||
      session.permissions.includes("penatausahaan:up:manage");

    const canManage = isSuperadmin || isBud;

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        session: {
          userOpdId: session.opdId,
          isCrossOpd: session.isCrossOpd ?? true,
          canManage,
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/penatausahaan/pengaturan-up error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isSuperadmin =
      session.roleKode === "0" ||
      session.roleKode === "SUPERADMIN";

    const isBud =
      session.roleKode === "1" ||
      session.roleNama?.toUpperCase().includes("BUD") ||
      session.permissions.includes("penatausahaan:up:manage");

    if (!isSuperadmin && !isBud) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses Ditolak: Hanya Pejabat Pengelola Keuangan Daerah (BUD) atau Administrator yang berwenang menetapkan besaran UP & UP-KKPD.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const tahunAnggaran = body.tahunAnggaran || session.tahunAnggaran || 2026;

    if (body.bulk && Array.isArray(body.items)) {
      const result = await bulkSavePenetapanUp({
        tahunAnggaran,
        no_sk: body.no_sk,
        tgl_sk: body.tgl_sk,
        bankKkpd: body.bankKkpd,
        items: body.items,
        userNama: session.namaLengkap,
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil menyimpan penetapan UP masal untuk ${result.length} Perangkat Daerah`,
        data: result,
      });
    }

    // Single Save
    const { opdId, no_sk, tgl_sk, nominalUp, nominalKkpd, bankKkpd, keterangan, status } =
      body;

    if (!opdId) {
      return NextResponse.json(
        { success: false, error: "ID Perangkat Daerah wajib diisi" },
        { status: 400 }
      );
    }

    const result = await saveSinglePenetapanUp({
      tahunAnggaran,
      opdId,
      no_sk,
      tgl_sk,
      nominalUp: Number(nominalUp) || 0,
      nominalKkpd: Number(nominalKkpd) || 0,
      bankKkpd,
      keterangan,
      status: status || "DITETAPKAN",
      userNama: session.namaLengkap,
    });

    return NextResponse.json({
      success: true,
      message: "Berhasil menyimpan penetapan besaran UP & UP-KKPD",
      data: result,
    });
  } catch (error: any) {
    console.error("POST /api/penatausahaan/pengaturan-up error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
