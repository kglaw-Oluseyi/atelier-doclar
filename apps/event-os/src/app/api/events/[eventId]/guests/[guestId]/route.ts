import { NextResponse } from "next/server";
import { jsonError, readJson } from "../../../../../../server/http";
import { getRuntime, withDurable } from "../../../../../../server/runtime";
import { requireActor } from "../../../../../../server/with-session";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string; guestId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId, guestId } = await context.params;
    const runtime = getRuntime();
    const organisation = runtime.service.listOrganisations(actor)[0];
    if (!organisation) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    const guest = runtime.service.getGuest(actor, organisation.id, eventId, guestId);
    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; guestId: string }> }): Promise<Response> {
  return withDurable(async () => {
    try {
      const { actor } = await requireActor();
      const { eventId, guestId } = await context.params;
      const body = (await readJson(request)) as Record<string, unknown>;
      const runtime = getRuntime();
      const organisation = runtime.service.listOrganisations(actor)[0];
      if (!organisation) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
      const guest = runtime.service.amendGuest(actor, {
        ...body,
        organisationId: organisation.id,
        eventId,
        guestId,
      });
      return NextResponse.json({ ok: true, guest });
    } catch (error) {
      return jsonError(error);
    }
  });
}
