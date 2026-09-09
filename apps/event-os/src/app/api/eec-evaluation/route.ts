import { NextResponse } from "next/server";
import { getRuntime } from "../../../server/runtime";
import { requireActor } from "../../../server/with-session";

export async function POST(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const body = (await request.json().catch(() => ({}))) as { organisationId?: string; idempotencyKey?: string };
    const organisationId = String(body.organisationId ?? "");
    const run = await getRuntime().service.executeS05AEvaluation(actor, {
      organisationId,
      reason: "direct evaluation action",
      idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
    });
    return NextResponse.json({ ok: true, runId: run.id, status: run.status });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "AUTH_REQUIRED";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "FORBIDDEN" || code === "SCOPE_MISMATCH" ? 403 : 400;
    return NextResponse.json({ ok: false, code }, { status });
  }
}
