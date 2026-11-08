import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { listProgramPaginated } from "@/modules/master-data/master-data.service";

export async function GET() {
  try {
    await requirePermission("master:read");
    const data = await listProgramPaginated({
      page: 1,
      limit: 100,
    });

    return NextResponse.json({ success: true, data: data.items });
  } catch (err) {
    return handleApiError(err);
  }
}
