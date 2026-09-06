import { NextResponse } from "next/server";
import { jsonError } from "../../../../server/http";
import { getRuntime, withDurable } from "../../../../server/runtime";
import { requireActor } from "../../../../server/with-session";

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    const runtime = getRuntime();
    return NextResponse.json({
      ok: true,
      event: runtime.service.getEvent(actor, organisationId, eventId),
      masterEventFile: runtime.service.getMasterEventFile(actor, organisationId, eventId),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  return withDurable(async () => {
    try {
      const { actor } = await requireActor();
      const { eventId } = await context.params;
      const body = (await request.json()) as Record<string, unknown>;
      const event = getRuntime().service.updateEvent(actor, { ...body, eventId });
      return NextResponse.json({ ok: true, event });
    } catch (error) {
      return jsonError(error);
    }
  });
}
