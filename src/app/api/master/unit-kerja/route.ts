import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { unitKerjaSchema } from "@/modules/master-data/master-data.schema";
import {
  listUnitKerjaPaginated,
  createUnitKerja,
  updateUnitKerja,
  deleteUnitKerja,
} from "@/modules/master-data/master-data.service";

function normalizeUnitBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (copy.kd_unit === undefined && copy.kode !== undefined) copy.kd_unit = copy.kode;
  if (copy.nm_unit === undefined && copy.nama !== undefined) copy.nm_unit = copy.nama;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const opdId = searchParams.get("opdId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");

    const paginated = await listUnitKerjaPaginated(session, {
      opdId,
      search,
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
    const body = normalizeUnitBody(await req.json());
    const input = unitKerjaSchema.parse(body);
    const created = await createUnitKerja(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("opd:manage");
    const body = normalizeUnitBody(await req.json());
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Unit Kerja wajib disertakan.");
    const input = unitKerjaSchema.partial().parse(rest);
    const updated = await updateUnitKerja(session, id, input);
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
    if (!id) throw new Error("ID Unit Kerja wajib disertakan.");
    await deleteUnitKerja(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
