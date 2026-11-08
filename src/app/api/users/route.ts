import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAnyPermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { createUserSchema } from "@/modules/users/users.schema";
import { createUser, listUsers } from "@/modules/users/users.service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["users:read", "rka:read", "rka:write"]);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const roleId = searchParams.get("roleId") || undefined;
    const roleKode = searchParams.get("roleKode") || searchParams.get("role") || undefined;
    const opdId = searchParams.get("opdId") || undefined;
    const unitKerjaId = searchParams.get("unitKerjaId") || undefined;

    const users = await listUsers(session, { search, roleId, roleKode, opdId, unitKerjaId });
    return NextResponse.json({ success: true, data: users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("users:manage");
    const body = await req.json();
    const input = createUserSchema.parse(body);
    const created = await createUser(session, input);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

