import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { updateUserSchema } from "@/modules/users/users.schema";
import { updateUser, deleteUser } from "@/modules/users/users.service";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("users:manage");
    const { id } = await context.params;
    const body = await req.json();
    const input = updateUserSchema.parse(body);
    const updated = await updateUser(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("users:manage");
    const { id } = await context.params;
    const body = await req.json();
    const input = updateUserSchema.parse(body);
    const updated = await updateUser(session, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("users:manage");
    const { id } = await context.params;
    await deleteUser(session, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
