import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { tahunAnggaranSchema } from "@/modules/master-data/master-data.schema";
import {
  listTahunAnggaran,
  createTahunAnggaran,
  updateTahunAnggaran,
  deleteTahunAnggaran,
} from "@/modules/master-data/master-data.service";

export async function GET() {
  try {
    await requirePermission("master:read");
    const data = await listTahunAnggaran();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = await req.json();
    const input = tahunAnggaranSchema.parse(body);
    const created = await createTahunAnggaran(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Tahun Anggaran wajib disertakan.");
    const input = tahunAnggaranSchema.partial().parse(rest);
    const updated = await updateTahunAnggaran(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) throw new Error("ID Tahun Anggaran wajib disertakan.");
    const input = tahunAnggaranSchema.partial().parse(rest);
    const updated = await updateTahunAnggaran(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("master:write");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) throw new Error("ID Tahun Anggaran wajib disertakan.");
    await deleteTahunAnggaran(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
