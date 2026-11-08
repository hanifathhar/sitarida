import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const items = await prisma.msUrusan.findMany({
      where: search
        ? {
            OR: [
              { kd_urusan1: { contains: search, mode: "insensitive" } },
              { nm_urusan1: { contains: search, mode: "insensitive" } },
              { kd_urusan2: { contains: search, mode: "insensitive" } },
              { nm_urusan2: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ kd_urusan1: "asc" }, { kd_urusan2: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

