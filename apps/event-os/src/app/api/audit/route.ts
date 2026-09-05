import { NextResponse } from "next/server";
import { jsonError } from "../../../server/http";
import { getRuntime } from "../../../server/runtime";
import { requireActor } from "../../../server/with-session";

export async function GET(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    return NextResponse.json({ ok: true, audit: getRuntime().service.searchAudit(actor, organisationId) });
  } catch (error) {
    return jsonError(error);
  }
}
