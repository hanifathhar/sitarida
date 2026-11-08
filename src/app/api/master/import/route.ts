import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-response";
import { importMasterBatchSchema } from "@/modules/master-data/master-data.schema";
import { importMasterBatch } from "@/modules/master-data/master-data.service";

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("master:import");
    const body = await req.json();
    const input = importMasterBatchSchema.parse(body);
    const result = await importMasterBatch(session, input);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return handleApiError(err);
  }
}

