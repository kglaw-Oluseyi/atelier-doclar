import { NextResponse } from "next/server";
import { jsonError } from "../../../../../server/http";
import { getRuntime } from "../../../../../server/runtime";
import { requireActor } from "../../../../../server/with-session";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const event = getRuntime().service.transitionEvent(actor, { ...body, eventId });
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return jsonError(error);
  }
}
