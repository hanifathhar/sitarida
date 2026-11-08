import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import {
  listMsRek,
  createMsRek,
  updateMsRek,
  deleteMsRek,
} from "@/modules/master-data/master-data.service";

function parseLevel(raw: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Number(raw) || 1;
  if (n >= 1 && n <= 6) return n as 1 | 2 | 3 | 4 | 5 | 6;
  return 1;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const level = parseLevel(searchParams.get("level"));
    const search = searchParams.get("search") || undefined;
    const parentId = searchParams.get("parentId") || undefined;
    const kategori = searchParams.get("kategori") || undefined;
    const rkaOnly = searchParams.get("rkaOnly") === "true";
    const prefix = searchParams.get("prefix") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");

    const data = await listMsRek({
      level,
      search,
      parentId,
      kategori,
      rkaOnly,
      prefix,
      page,
      limit,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = await req.json();
    const { level, ...payload } = body;
    const lv = parseLevel(level);
    const created = await createMsRek(session, lv, payload);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = await req.json();
    const { level, id, ...payload } = body;
    if (!id) throw new Error("ID wajib disertakan.");
    const lv = parseLevel(level);
    const updated = await updateMsRek(session, lv, id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const { searchParams } = new URL(req.url);
    const level = parseLevel(searchParams.get("level"));
    const id = searchParams.get("id");
    if (!id) throw new Error("ID wajib disertakan.");
    await deleteMsRek(session, level, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
