import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { programSchema } from "@/modules/master-data/master-data.schema";
import {
  listProgramPaginated,
  createProgram,
  updateProgram,
  deleteProgram,
} from "@/modules/master-data/master-data.service";

function normalizeProgramBody(body: any) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  if (copy.kd_program === undefined && copy.kode !== undefined) copy.kd_program = copy.kode;
  if (copy.nm_program === undefined && copy.nama !== undefined) copy.nm_program = copy.nama;
  if (copy.kd_urusan === undefined && copy.urusanKode !== undefined) copy.kd_urusan = copy.urusanKode;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    await requirePermission("master:read");
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const kd_urusan = searchParams.get("kd_urusan") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = all ? 1000 : Number(searchParams.get("limit") || "10");

    const paginated = await listProgramPaginated({
      kd_urusan,
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
    const body = normalizeProgramBody(await req.json());
    const input = programSchema.parse(body);
    const created = await createProgram(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = normalizeProgramBody(await req.json());
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Program wajib disertakan.");
    const input = programSchema.partial().parse(rest);
    const updated = await updateProgram(session, id, input);
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
    if (!id) throw new Error("ID Program wajib disertakan.");
    await deleteProgram(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
