import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const list = await prisma.tahunAnggaran.findMany({
      select: {
        id: true,
        tahun: true,
        nama: true,
        tahapAktif: true,
        status: true,
        isDefault: true,
      },
      orderBy: { tahun: "desc" },
    });
    return NextResponse.json({ success: true, data: list });
  } catch {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

