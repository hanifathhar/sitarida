import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getOpdFilter } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { listAuditLogs } from "@/modules/audit/audit.service";

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("audit:read");
    const { searchParams } = new URL(req.url);
    const modul = searchParams.get("modul") || undefined;
    const aksi = searchParams.get("aksi") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const opdId = getOpdFilter(session, searchParams.get("opdId"));

    const data = await listAuditLogs({ modul, aksi, search, opdId, page, limit: 30 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

