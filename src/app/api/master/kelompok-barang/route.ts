import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { kd_kelompok: { contains: search, mode: "insensitive" } },
        { uraianKelompok: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.kelompokBarang.findMany({
      where,
      orderBy: { kd_kelompok: "asc" },
      select: {
        id: true,
        kd_kelompok: true,
        uraianKelompok: true,
        deskripsi: true,
      },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("GET /api/master/kelompok-barang error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memuat kelompok barang" },
      { status: 500 }
    );
  }
}

