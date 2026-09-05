import { NextResponse } from "next/server";
import { PlatformError, publicMessageFor } from "@maison-doclar/shared-platform";

export function jsonError(error: unknown): NextResponse {
  if (error instanceof PlatformError) {
    const status =
      error.code === "AUTH_REQUIRED"
        ? 401
        : error.code === "ACCESS_PENDING"
          ? 403
          : error.code === "FORBIDDEN" || error.code === "AI_AUTHORITY_FORBIDDEN"
            ? 403
            : error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH"
              ? 404
              : error.code === "VERSION_CONFLICT" || error.code === "IDEMPOTENCY_CONFLICT"
                ? 409
                : error.code === "VALIDATION_FAILED" || error.code === "TRANSITION_INVALID"
                  ? 400
                  : error.code === "CAPABILITY_NOT_ENABLED"
                    ? 409
                    : error.code === "PRODUCTION_ADAPTER_FORBIDDEN" || error.code === "FIXTURE_FORBIDDEN"
                      ? 403
                      : 500;
    return NextResponse.json(
      {
        ok: false,
        code: error.code,
        message: error.publicMessage,
        details: error.details,
      },
      { status },
    );
  }
  return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", message: publicMessageFor("INTERNAL_ERROR") }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json();
}
