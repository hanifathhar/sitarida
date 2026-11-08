import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const isCrossOpd =
      session.isCrossOpd ||
      session.roleKode === "SUPERADMIN" ||
      session.roleKode === "0" ||
      session.roleKode === "2" ||
      session.roleKode === "BIDANG_ANGGARAN";

    // 1. Ambil daftar OPD yang boleh diakses
    let opds: { id: string; kd_skpd: string; nm_skpd: string }[] = [];
    if (isCrossOpd) {
      opds = await prisma.opd.findMany({
        where: { isActive: true },
        orderBy: { kd_skpd: "asc" },
        select: { id: true, kd_skpd: true, nm_skpd: true },
      });
    } else if (session.opdId) {
      opds = await prisma.opd.findMany({
        where: { id: session.opdId, isActive: true },
        select: { id: true, kd_skpd: true, nm_skpd: true },
      });
    } else {
      // Fallback: jika user PPTK ditunjuk di Trskpd namun opdId di profil belum terisi
      const assignedTrskpd = await prisma.trskpd.findMany({
        where: {
          OR: [
            { pptkUserId: session.userId },
            ...(session.username ? [{ pptkNip: session.username }] : []),
          ],
        },
        select: { opdId: true },
        distinct: ["opdId"],
      });
      const opdIds = assignedTrskpd.map((t) => t.opdId).filter(Boolean);
      if (opdIds.length > 0) {
        opds = await prisma.opd.findMany({
          where: { id: { in: opdIds }, isActive: true },
          orderBy: { kd_skpd: "asc" },
          select: { id: true, kd_skpd: true, nm_skpd: true },
        });
      }
    }

    // 2. Ambil daftar Unit yang boleh diakses
    let units: { id: string; opdId: string; kd_unit: string; nm_unit: string }[] = [];
    if (isCrossOpd) {
      units = await prisma.unitKerja.findMany({
        where: { isActive: true },
        orderBy: { kd_unit: "asc" },
        select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      });
    } else if (session.unitKerjaId) {
      // Level UNIT: hanya unit sendiri
      units = await prisma.unitKerja.findMany({
        where: { id: session.unitKerjaId, isActive: true },
        select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      });
    } else if (session.opdId) {
      // Level OPD: seluruh unit di bawah OPD tersebut
      units = await prisma.unitKerja.findMany({
        where: { opdId: session.opdId, isActive: true },
        orderBy: { kd_unit: "asc" },
        select: { id: true, opdId: true, kd_unit: true, nm_unit: true },
      });
    }

    let tahunAnggaran = session.tahunAnggaran;
    if (!tahunAnggaran) {
      if (session.tahunAnggaranId) {
        const ta = await prisma.tahunAnggaran.findUnique({ where: { id: session.tahunAnggaranId } });
        tahunAnggaran = ta?.tahun;
      }
      if (!tahunAnggaran) {
        const def = await prisma.tahunAnggaran.findFirst({ where: { isDefault: true } });
        tahunAnggaran = def?.tahun || 2026;
      }
    }

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
          levelAkses: session.levelAkses || (isCrossOpd ? "LINTAS_OPD" : session.unitKerjaId ? "UNIT" : "OPD"),
          opdId: session.opdId,
          unitKerjaId: session.unitKerjaId,
          tahunAnggaran,
          tahunAnggaranId: session.tahunAnggaranId,
        },
        opds,
        units,
      },
    });
  } catch (error: any) {
    console.error("GET /api/perencanaan/scope error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat cakupan akses pengguna" },
      { status: 500 }
    );
  }
}
