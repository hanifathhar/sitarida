import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getDetailJurnal,
  isAkuntansiAuthorized,
  JenisJurnal,
  listSumberJurnal,
  postJurnalPenetapan,
  postJurnalPenerimaan,
  postJurnalSp2d,
  postJurnalSpj,
  postJurnalSetorSisa,
  unpostJurnalPenetapan,
  unpostJurnalPenerimaan,
  unpostJurnalSp2d,
  unpostJurnalSpj,
  unpostJurnalSetorSisa,
} from "@/modules/akuntansi/posting-jurnal.service";

const VALID_JENIS: JenisJurnal[] = [
  "penetapan",
  "penerimaan",
  "sp2d",
  "spj",
  "setor-sisa-kas",
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jenis = (searchParams.get("jenis") || "") as JenisJurnal;
    if (!VALID_JENIS.includes(jenis)) {
      return NextResponse.json(
        { success: false, error: "Jenis jurnal tidak valid." },
        { status: 400 }
      );
    }

    if (!isAkuntansiAuthorized(session, jenis)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke menu Posting Jurnal ini." },
        { status: 403 }
      );
    }

    if (searchParams.get("detail") === "1") {
      const nomor = searchParams.get("nomor") || "";
      if (!nomor) {
        return NextResponse.json(
          { success: false, error: "Nomor dokumen wajib diisi." },
          { status: 400 }
        );
      }
      const detail = await getDetailJurnal(session, { jenis, nomor });
      if (!detail) {
        return NextResponse.json(
          { success: false, error: "Detail jurnal belum ditemukan di trhmaping/trdmaping." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: detail });
    }

    const kd_skpd = searchParams.get("kd_skpd") || "";
    if (!kd_skpd) {
      return NextResponse.json(
        { success: false, error: "Kode SKPD wajib diisi." },
        { status: 400 }
      );
    }

    const tahunAnggaran = Number(searchParams.get("tahun")) || session.tahunAnggaran || 2026;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("q") || undefined;

    const data = await listSumberJurnal(session, {
      jenis,
      tahunAnggaran,
      kd_skpd,
      kd_unit,
      startDate,
      endDate,
      search,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/akuntansi/posting-jurnal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat data sumber jurnal" },
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

    const body = await req.json();
    const jenis = (body?.jenis || "") as JenisJurnal;
    const action = (body?.action || "post") as "post" | "unpost";
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    if (!VALID_JENIS.includes(jenis)) {
      return NextResponse.json(
        { success: false, error: "Jenis jurnal tidak valid." },
        { status: 400 }
      );
    }

    if (!isAkuntansiAuthorized(session, jenis)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak ke menu Posting Jurnal ini." },
        { status: 403 }
      );
    }

    const label =
      jenis === "penetapan"
        ? "penetapan"
        : jenis === "penerimaan"
          ? "penerimaan"
          : jenis === "sp2d"
            ? "SP2D"
            : jenis === "spj"
              ? "SPJ UP/GU/TU"
              : "Setor Sisa Kas/Pengembalian";

    if (action === "unpost") {
      const result =
        jenis === "penetapan"
          ? await unpostJurnalPenetapan(session, ids)
          : jenis === "penerimaan"
            ? await unpostJurnalPenerimaan(session, ids)
            : jenis === "sp2d"
              ? await unpostJurnalSp2d(session, ids)
              : jenis === "spj"
                ? await unpostJurnalSpj(session, ids)
                : await unpostJurnalSetorSisa(session, ids);
      return NextResponse.json({
        success: true,
        message: `${result.unpostedCount} dokumen ${label} berhasil dibatalkan postingnya.`,
        data: result,
      });
    }

    const result =
      jenis === "penetapan"
        ? await postJurnalPenetapan(session, ids)
        : jenis === "penerimaan"
          ? await postJurnalPenerimaan(session, ids)
          : jenis === "sp2d"
            ? await postJurnalSp2d(session, ids)
            : jenis === "spj"
              ? await postJurnalSpj(session, ids)
              : await postJurnalSetorSisa(session, ids);
    return NextResponse.json({
      success: true,
      message: `${result.postedCount} dokumen ${label} berhasil diposting ke jurnal.`,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/akuntansi/posting-jurnal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memproses posting jurnal" },
      { status: 400 }
    );
  }
}
