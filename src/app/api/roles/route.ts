import { NextRequest, NextResponse } from "next/server";
import { requireAnyPermission, requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import {
  updateRolePermissionsSchema,
  createRoleSchema,
  updateRoleSchema,
} from "@/modules/users/users.schema";
import {
  listRolesWithPermissions,
  updateRolePermissions,
  createRole,
  updateRole,
  deleteRole,
} from "@/modules/users/users.service";

export async function GET() {
  try {
    await requireAnyPermission([
      "users:read",
      "users:manage",
      "menu:admin:roles",
      "menu:admin:users",
    ]);
    const data = await listRolesWithPermissions();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["users:manage", "menu:admin:roles"]);
    const body = await req.json();
    const input = updateRolePermissionsSchema.parse(body);
    await updateRolePermissions(session, input.roleId, input.permissionIds);
    return NextResponse.json({
      success: true,
      message: "Hak akses & pemetaan menu role berhasil diperbarui",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["users:manage", "menu:admin:roles"]);
    const body = await req.json();
    const input = createRoleSchema.parse(body);
    const created = await createRole(session, input);
    return NextResponse.json(
      {
        success: true,
        message: "Role baru berhasil ditambahkan",
        data: created,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAnyPermission(["users:manage", "menu:admin:roles"]);
    const body = await req.json();
    const input = updateRoleSchema.parse(body);
    const updated = await updateRole(session, input);
    return NextResponse.json({
      success: true,
      message: "Data role berhasil diperbarui",
      data: updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("users:manage");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID Role wajib disertakan" },
        { status: 400 }
      );
    }
    await deleteRole(session, id);
    return NextResponse.json({
      success: true,
      message: "Role berhasil dihapus",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
