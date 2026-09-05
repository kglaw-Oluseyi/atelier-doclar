import { NextResponse } from "next/server";
import { jsonError } from "../../../../server/http";
import { getRuntime } from "../../../../server/runtime";
import { requireActor } from "../../../../server/with-session";

export async function POST(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const body = (await request.json()) as { organisationId?: string };
    if (!body.organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    return NextResponse.json({ ok: true, audit: getRuntime().service.exportAudit(actor, body.organisationId) });
  } catch (error) {
    return jsonError(error);
  }
}
