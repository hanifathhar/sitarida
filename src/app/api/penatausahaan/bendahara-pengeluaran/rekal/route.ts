import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const tahunParam = searchParams.get("tahun");
    const opdId = searchParams.get("opdId") || undefined;
    const kd_unit = searchParams.get("kd_unit") || undefined;
    const bulanParam = searchParams.get("bulan");
    const bulan = bulanParam ? parseInt(bulanParam, 10) : undefined;

    if (action === "fungsional-anggaran") {
      const kd_skpd = searchParams.get("kd_skpd") || undefined;
      const tahun = tahunParam ? parseInt(tahunParam, 10) : session.tahunAnggaran || 2026;
      const whereRka: any = {
        tahunAnggaran: tahun,
        kd_rek6: { startsWith: "5" },
      };
      if (kd_skpd) whereRka.kd_skpd = kd_skpd;
      if (kd_unit && kd_unit !== "ALL") whereRka.kd_unit = kd_unit;

      const rkaRows = await prisma.trdrka.findMany({
        where: whereRka,
        select: {
          kd_program: true,
          nm_program: true,
          kd_kegiatan: true,
          nm_kegiatan: true,
          kd_sub_kegiatan: true,
          nm_sub_kegiatan: true,
          kd_rek6: true,
          nm_rek6: true,
          nilai: true,
          nilai_ubah: true,
        },
        orderBy: [
          { kd_program: "asc" },
          { kd_kegiatan: "asc" },
          { kd_sub_kegiatan: "asc" },
          { kd_rek6: "asc" },
        ],
      });

      return NextResponse.json({
        success: true,
        data: rkaRows.map((r) => ({
          ...r,
          anggaran:
            Number(r.nilai_ubah) > 0 ? Number(r.nilai_ubah) : Number(r.nilai) || 0,
        })),
      });
    }

    if (action === "petugas" && opdId) {
      const [users, opd] = await Promise.all([
        prisma.user.findMany({
          where: {
            isActive: true,
            OR: [{ opdId }, { opdId: null }],
          },
          include: {
            role: {
              select: { id: true, kode: true, nama: true },
            },
          },
          orderBy: { namaLengkap: "asc" },
        }),
        prisma.opd.findUnique({
          where: { id: opdId },
          select: { kepalaNama: true, kepalaNip: true, kepalaJabatan: true },
        }),
      ]);

      const bendaharaList = users
        .filter((u) => {
          const roleName = (u.role?.nama || "").toLowerCase();
          const jab = (u.jabatan || "").toLowerCase();
          return (
            u.role?.kode === "10" ||
            roleName.includes("bendahara") ||
            jab.includes("bendahara")
          );
        })
        .map((u) => ({
          id: u.id,
          nama: u.namaLengkap,
          nip: u.nip || "",
          jabatan: u.jabatan || u.role?.nama || "Bendahara Pengeluaran",
        }));

      const paKpaList = users
        .filter((u) => {
          const roleName = (u.role?.nama || "").toLowerCase();
          const jab = (u.jabatan || "").toLowerCase();
          return (
            u.role?.kode === "7" ||
            roleName.includes("pa") ||
            roleName.includes("kpa") ||
            roleName.includes("pengguna anggaran") ||
            jab.includes("pengguna anggaran") ||
            jab.includes("kepala skpd") ||
            jab.includes("kepala dinas") ||
            jab.includes("kepala badan") ||
            /\b(pa|kpa)\b/.test(jab)
          );
        })
        .map((u) => ({
          id: u.id,
          nama: u.namaLengkap,
          nip: u.nip || "",
          jabatan:
            u.jabatan ||
            u.role?.nama ||
            "Pengguna Anggaran / Kuasa Pengguna Anggaran",
        }));

      if (opd?.kepalaNama) {
        const exists = paKpaList.some(
          (p) => p.nama.toLowerCase() === opd.kepalaNama?.toLowerCase()
        );
        if (!exists) {
          paKpaList.unshift({
            id: "kepala-opd",
            nama: opd.kepalaNama,
            nip: opd.kepalaNip || "",
            jabatan:
              opd.kepalaJabatan || "Pengguna Anggaran (Kepala SKPD)",
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: { paKpaList, bendaharaList },
      });
    }

    const tahunAnggaran = tahunParam
      ? parseInt(tahunParam, 10)
      : session.tahunAnggaran || 2026;

    const data = await bendaharaPengeluaranService.getRekalList({
      tahunAnggaran,
      opdId,
      kd_unit,
      bulan,
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/penatausahaan/bendahara-pengeluaran/rekal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memuat rekal transaksi" },
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
    const result = await bendaharaPengeluaranService.postRekalTransaksi({
      ...body,
      tahunAnggaran: body.tahunAnggaran || session.tahunAnggaran || 2026,
    });

    return NextResponse.json({
      success: true,
      message: "Proses Rekal Transaksi berhasil dijalankan",
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/penatausahaan/bendahara-pengeluaran/rekal error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menjalankan rekal transaksi" },
      { status: 400 }
    );
  }
}

