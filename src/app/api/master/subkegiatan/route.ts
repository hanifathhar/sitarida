import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { subkegiatanSchema } from "@/modules/master-data/master-data.schema";
import {
  listSubkegiatanPaginated,
  createSubkegiatan,
  updateSubkegiatan,
  deleteSubkegiatan,
} from "@/modules/master-data/master-data.service";

function normalizeSubkegiatanBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (copy.kd_sub_kegiatan === undefined && copy.kode !== undefined)
    copy.kd_sub_kegiatan = copy.kode;
  if (copy.nm_sub_kegiatan === undefined && copy.nama !== undefined)
    copy.nm_sub_kegiatan = copy.nama;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const kegiatanId = searchParams.get("kegiatanId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = all ? 2000 : Number(searchParams.get("limit") || "10");

    const paginated = await listSubkegiatanPaginated({
      kegiatanId,
      search,
      page,
      limit,
    });

    if (all) {
      return NextResponse.json({
        success: true,
        data: paginated.items,
        pagination: paginated,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        items: paginated.items,
        meta: {
          total: paginated.total,
          page: paginated.page,
          limit: paginated.limit,
          totalPages: paginated.totalPages,
        },
      },
      pagination: paginated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = normalizeSubkegiatanBody(await req.json());
    const input = subkegiatanSchema.parse(body);
    const created = await createSubkegiatan(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = normalizeSubkegiatanBody(await req.json());
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Subkegiatan wajib disertakan.");
    const input = subkegiatanSchema.partial().parse(rest);
    const updated = await updateSubkegiatan(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID Subkegiatan wajib disertakan.");
    await deleteSubkegiatan(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
