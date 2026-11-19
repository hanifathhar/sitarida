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

    if (action === "dth-data") {
      const tahun = tahunParam ? parseInt(tahunParam, 10) : session.tahunAnggaran || 2026;
      const whereBase: any = { tahunAnggaran: tahun };
      if (opdId) whereBase.opdId = opdId;
      if (kd_unit && kd_unit !== "ALL") whereBase.kd_unit = kd_unit;
      if (bulan && bulan >= 1 && bulan <= 12) {
        whereBase.tgl_bukti = {
          gte: new Date(Date.UTC(tahun, bulan - 1, 1, 0, 0, 0, 0)),
          lt: new Date(Date.UTC(tahun, bulan, 1, 0, 0, 0, 0)),
        };
      }

      const [transoutList, strpotList] = await Promise.all([
        prisma.trhtransout.findMany({
          where: whereBase,
          include: { rincian: true },
          orderBy: [{ tgl_bukti: "asc" }, { no_bukti: "asc" }],
        }),
        prisma.trhstrpot.findMany({
          where: whereBase,
          include: { rincian: true },
          orderBy: [{ tgl_bukti: "asc" }, { no_bukti: "asc" }],
        }),
      ]);

      const noSp2dSet = Array.from(
        new Set(transoutList.map((t) => t.no_sp2d).filter(Boolean) as string[])
      );
      const sp2dList =
        noSp2dSet.length > 0
          ? await prisma.trhsp2d.findMany({
              where: { tahunAnggaran: tahun, no_sp2d: { in: noSp2dSet } },
              select: {
                no_sp2d: true,
                no_spm: true,
                nilai: true,
                nama_penerima: true,
                npwp_penerima: true,
                spm: {
                  select: {
                    nilai: true,
                    nama_penerima: true,
                    npwp_penerima: true,
                  },
                },
              },
            })
          : [];

      const sp2dMap = new Map(sp2dList.map((s) => [s.no_sp2d, s]));

      const dthRows: Array<{
        no_spm: string;
        nilai_spm: number;
        no_sp2d: string;
        nilai_sp2d: number;
        kd_rek6: string;
        pajak_kd_rek6: string;
        pajak_nm_rek6: string;
        pajak_jumlah: number;
        npwp: string;
        rekanan: string;
        id_billing: string;
        ntpn: string;
        keterangan: string;
      }> = [];

      for (const h of transoutList) {
        const sp2d = h.no_sp2d ? sp2dMap.get(h.no_sp2d) : undefined;
        const noSpm = sp2d?.no_spm || h.no_spj || "-";
        const noSp2d = h.no_sp2d || "-";
        const npwp = sp2d?.npwp_penerima || sp2d?.spm?.npwp_penerima || "-";
        const rekanan = sp2d?.nama_penerima || sp2d?.spm?.nama_penerima || "-";

        for (const d of h.rincian || []) {
          const nilai = Number(d.nilai) || 0;
          dthRows.push({
            no_spm: noSpm,
            nilai_spm: nilai,
            no_sp2d: noSp2d,
            nilai_sp2d: nilai,
            kd_rek6: d.kd_rek6 || "-",
            pajak_kd_rek6: "",
            pajak_nm_rek6: "",
            pajak_jumlah: 0,
            npwp,
            rekanan,
            id_billing: "",
            ntpn: "",
            keterangan: d.keterangan || h.uraian || "-",
          });
        }
      }

      // Tambahkan baris setor pajak (trhstrpot / trdstrpot) agar billing, NTPN, dan potongan pajak tercetak lengkap
      for (const p of strpotList) {
        for (const pd of p.rincian || []) {
          dthRows.push({
            no_spm: p.no_trmpot || "-",
            nilai_spm: 0,
            no_sp2d: p.no_bukti || "-",
            nilai_sp2d: 0,
            kd_rek6: "-",
            pajak_kd_rek6: pd.kd_rek6 || "",
            pajak_nm_rek6: pd.nm_rek6 || "",
            pajak_jumlah: Number(pd.nilai) || 0,
            npwp: "-",
            rekanan: "-",
            id_billing: pd.id_billing || "",
            ntpn: pd.ntpn || "",
            keterangan: pd.keterangan || p.uraian || "-",
          });
        }
      }

      return NextResponse.json({ success: true, data: dthRows });
    }

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

