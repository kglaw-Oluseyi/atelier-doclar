import { NextResponse } from "next/server";
import { jsonError } from "../../../../server/http";
import { getRuntime, withDurable } from "../../../../server/runtime";
import { requireActor } from "../../../../server/with-session";

export async function GET(request: Request, context: { params: Promise<{ clientId: string }> }): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { clientId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    return NextResponse.json({ ok: true, client: getRuntime().service.getClient(actor, organisationId, clientId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ clientId: string }> }): Promise<Response> {
  return withDurable(async () => {
    try {
      const { actor } = await requireActor();
      const { clientId } = await context.params;
      const body = (await request.json()) as Record<string, unknown>;
      const client = getRuntime().service.updateClient(actor, { ...body, clientId });
      return NextResponse.json({ ok: true, client });
    } catch (error) {
      return jsonError(error);
    }
  });
}
