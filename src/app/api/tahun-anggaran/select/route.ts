import { NextRequest, NextResponse } from "next/server";
import { setSelectedTahunAnggaranId } from "@/lib/session";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { tahunAnggaranId } = await req.json();
    if (!tahunAnggaranId) {
      return NextResponse.json(
        { success: false, message: "ID Tahun Anggaran wajib diisi" },
        { status: 400 }
      );
    }
    await setSelectedTahunAnggaranId(tahunAnggaranId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

