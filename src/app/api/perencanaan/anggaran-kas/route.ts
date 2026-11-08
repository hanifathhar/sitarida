import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canAccessAnggaranKas, canLockAnggaranKas } from "@/lib/rbac";
import {
  listSubkegiatanAnggaranKas,
  getDetailAnggaranKasSubkeg,
  saveAnggaranKasRekening,
  batchSaveAnggaranKasSubkeg,
  getAnggaranKasLockStatus,
  getAllOpdAnggaranKasLocks,
  toggleAnggaranKasLock,
  batchToggleAllAnggaranKasLock,
} from "@/modules/perencanaan/anggaran-kas.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan. Silakan login kembali." }, { status: 401 });
    }
    if (!canAccessAnggaranKas(session)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Menu Anggaran Kas hanya dapat diakses oleh Superadmin, Bidang Anggaran, Kasubag Perencanaan OPD, dan PPTK.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || undefined;
    const tahun = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : 2027;
    const trskpdId = searchParams.get("trskpdId") || undefined;
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;
    const search = searchParams.get("search") || undefined;

    if (action === "locks") {
      const lockMap = await getAllOpdAnggaranKasLocks(tahun);
      return NextResponse.json({ success: true, data: lockMap });
    }

    // Jika meminta detail Sub Kegiatan beserta rekening belanja & 12 bulan
    if (trskpdId) {
      const detail = await getDetailAnggaranKasSubkeg(trskpdId, tahun, session);
      return NextResponse.json({ success: true, data: detail });
    }

    // Jika meminta daftar Sub Kegiatan pada OPD / Unit
    if (opdId) {
      const [list, lockInfo] = await Promise.all([
        listSubkegiatanAnggaranKas({
          tahunAnggaran: tahun,
          opdId,
          unitKerjaId: unitKerjaId || null,
          search,
          session,
        }),
        getAnggaranKasLockStatus({
          tahunAnggaran: tahun,
          opdId,
          unitKerjaId: unitKerjaId || null,
        }),
      ]);
      return NextResponse.json({
        success: true,
        data: list,
        isLocked: lockInfo.isLocked,
      });
    }

    return NextResponse.json(
      { success: false, message: "Parameter opdId atau trskpdId diperlukan." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("GET /api/perencanaan/anggaran-kas error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat data Anggaran Kas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan. Silakan login kembali." }, { status: 401 });
    }
    if (!canAccessAnggaranKas(session)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Menu Anggaran Kas hanya dapat diakses oleh Superadmin, Bidang Anggaran, Kasubag Perencanaan OPD, dan PPTK.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, tahunAnggaran, mode } = body;

    const tahun = Number(tahunAnggaran) || 2027;

    if (action === "batch-save") {
      const { trskpdId, items } = body;
      if (!trskpdId || !Array.isArray(items)) {
        return NextResponse.json(
          { success: false, message: "Field trskpdId dan items wajib disertakan." },
          { status: 400 }
        );
      }
      const saved = await batchSaveAnggaranKasSubkeg({
        tahunAnggaran: tahun,
        trskpdId,
        mode,
        session,
        items,
      });
      return NextResponse.json({
        success: true,
        message: `${saved.length} rekening anggaran kas berhasil disimpan.`,
        data: saved,
      });
    }

    // Simpan single rekening
    const { trdrkaId, bulan1, bulan2, bulan3, bulan4, bulan5, bulan6, bulan7, bulan8, bulan9, bulan10, bulan11, bulan12 } = body;

    if (!trdrkaId) {
      return NextResponse.json(
        { success: false, message: "ID Rekening Belanja (trdrkaId) wajib disertakan." },
        { status: 400 }
      );
    }

    const saved = await saveAnggaranKasRekening({
      tahunAnggaran: tahun,
      trdrkaId,
      mode,
      session,
      bulan1: Number(bulan1 || 0),
      bulan2: Number(bulan2 || 0),
      bulan3: Number(bulan3 || 0),
      bulan4: Number(bulan4 || 0),
      bulan5: Number(bulan5 || 0),
      bulan6: Number(bulan6 || 0),
      bulan7: Number(bulan7 || 0),
      bulan8: Number(bulan8 || 0),
      bulan9: Number(bulan9 || 0),
      bulan10: Number(bulan10 || 0),
      bulan11: Number(bulan11 || 0),
      bulan12: Number(bulan12 || 0),
    });

    return NextResponse.json({
      success: true,
      message: `Anggaran kas rekening [${saved.kd_rek6}] berhasil disimpan.`,
      data: saved,
    });
  } catch (error: any) {
    console.error("POST /api/perencanaan/anggaran-kas error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menyimpan data Anggaran Kas" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Sesi tidak ditemukan. Silakan login kembali." }, { status: 401 });
    }
    if (!canLockAnggaranKas(session)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akses ditolak: Penguncian Anggaran Kas hanya dapat dilakukan oleh Superadmin atau Bidang Anggaran.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tahunAnggaran, opdId, unitKerjaId, isLocked, isBatch } = body;
    const tahun = Number(tahunAnggaran) || 2027;

    if (isBatch) {
      const res = await batchToggleAllAnggaranKasLock({
        tahunAnggaran: tahun,
        isLocked: Boolean(isLocked),
        session,
      });
      return NextResponse.json({
        success: true,
        message: `${res.count} Perangkat Daerah (OPD) berhasil di-${isLocked ? "KUNCI" : "BUKA KUNCI"} untuk Input Anggaran Kas TA ${tahun}.`,
        data: res,
      });
    }

    if (!opdId) {
      return NextResponse.json(
        { success: false, message: "ID OPD wajib disertakan untuk mengubah status kunci Anggaran Kas." },
        { status: 400 }
      );
    }

    const updated = await toggleAnggaranKasLock({
      tahunAnggaran: tahun,
      opdId,
      unitKerjaId: unitKerjaId || null,
      isLocked: Boolean(isLocked),
      session,
    });

    return NextResponse.json({
      success: true,
      message: `Input Anggaran Kas untuk [${updated.kd_skpd}${updated.kd_unit ? " - " + updated.kd_unit : ""}] berhasil di-${isLocked ? "KUNCI" : "BUKA KUNCI"}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/perencanaan/anggaran-kas error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengubah status kunci Anggaran Kas" },
      { status: 500 }
    );
  }
}

