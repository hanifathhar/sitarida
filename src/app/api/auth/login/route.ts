import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/modules/auth/auth.schema";
import { authenticateUser } from "@/modules/auth/auth.service";
import { setSessionCookie } from "@/lib/session";
import { handleApiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const result = await authenticateUser(input, { ipAddress, userAgent });

    if (result.requiresRoleSelection) {
      return NextResponse.json({
        success: true,
        requiresRoleSelection: true,
        message: "Pilih peran penugasan untuk melanjutkan",
        user: result.user,
        assignments: result.assignments,
      });
    }

    await setSessionCookie(result.sessionPayload);

    return NextResponse.json({
      success: true,
      requiresRoleSelection: false,
      message: "Login berhasil",
      user: result.sessionPayload,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
