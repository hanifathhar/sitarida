import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { sumberDanaSchema } from "@/modules/master-data/master-data.schema";
import {
  listSumberDanaPaginated,
  createSumberDana,
  updateSumberDana,
  deleteSumberDana,
} from "@/modules/master-data/master-data.service";

function normalizeSumberDanaBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (copy.kd_sumdan === undefined && copy.kode !== undefined) copy.kd_sumdan = copy.kode;
  if (copy.nm_sumdan === undefined && copy.nama !== undefined) copy.nm_sumdan = copy.nama;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = all ? 1000 : Number(searchParams.get("limit") || "10");

    const paginated = await listSumberDanaPaginated({
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
    const body = normalizeSumberDanaBody(await req.json());
    const input = sumberDanaSchema.parse(body);
    const created = await createSumberDana(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = normalizeSumberDanaBody(await req.json());
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Sumber Dana wajib disertakan.");
    const input = sumberDanaSchema.partial().parse(rest);
    const updated = await updateSumberDana(session, id, input);
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
    if (!id) throw new Error("ID Sumber Dana wajib disertakan.");
    await deleteSumberDana(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
