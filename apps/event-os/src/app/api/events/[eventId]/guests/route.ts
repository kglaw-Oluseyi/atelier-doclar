import { NextResponse } from "next/server";
import { jsonError, readJson } from "../../../../../server/http";
import { getRuntime } from "../../../../../server/runtime";
import { requireActor } from "../../../../../server/with-session";

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId } = await context.params;
    const runtime = getRuntime();
    const organisation = runtime.service.listOrganisations(actor)[0];
    if (!organisation) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    const guests = runtime.service.listGuests(actor, {
      organisationId: organisation.id,
      eventId,
      query,
    });
    return NextResponse.json({ ok: true, guests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId } = await context.params;
    const body = (await readJson(request)) as Record<string, unknown>;
    const runtime = getRuntime();
    const organisation = runtime.service.listOrganisations(actor)[0];
    if (!organisation) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    const guest = runtime.service.intakeGuest(actor, {
      ...body,
      organisationId: organisation.id,
      eventId,
    });
    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    return jsonError(error);
  }
}
