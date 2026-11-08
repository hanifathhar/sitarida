import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./rbac";

export function handleApiError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.statusCode }
    );
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    return NextResponse.json(
      {
        success: false,
        message: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Data tidak valid",
        errors: err.issues,
      },
      { status: 400 }
    );
  }
  const message = err instanceof Error ? err.message : "Terjadi kesalahan pada server.";
  return NextResponse.json({ success: false, message }, { status: 400 });
}

