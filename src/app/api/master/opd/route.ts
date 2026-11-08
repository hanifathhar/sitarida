import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { opdSchema } from "@/modules/master-data/master-data.schema";
import {
  listOpdPaginated,
  createOpd,
  updateOpd,
  deleteOpd,
} from "@/modules/master-data/master-data.service";

function normalizeOpdBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (copy.kd_skpd === undefined && copy.kode !== undefined) copy.kd_skpd = copy.kode;
  if (copy.nm_skpd === undefined && copy.nama !== undefined) copy.nm_skpd = copy.nama;
  if (copy.kd_urusan === undefined && copy.urusanKode !== undefined) copy.kd_urusan = copy.urusanKode;
  if (copy.nm_urusan === undefined && copy.urusanNama !== undefined) copy.nm_urusan = copy.urusanNama;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const search = searchParams.get("search") || undefined;
    const kd_urusan =
      searchParams.get("kd_urusan") || searchParams.get("urusanKode") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = all ? 500 : Number(searchParams.get("limit") || "10");

    const paginated = await listOpdPaginated(session, {
      search,
      kd_urusan,
      page,
      limit,
    });
    return NextResponse.json({
      success: true,
      data: paginated.items,
      pagination: paginated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("opd:manage");
    const body = normalizeOpdBody(await req.json());
    const input = opdSchema.parse(body);
    const created = await createOpd(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("opd:manage");
    const body = normalizeOpdBody(await req.json());
    const { id, ...rest } = body;
    if (!id) throw new Error("ID OPD wajib disertakan.");
    const input = opdSchema.partial().parse(rest);
    const updated = await updateOpd(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("opd:manage");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID OPD wajib disertakan.");
    await deleteOpd(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
