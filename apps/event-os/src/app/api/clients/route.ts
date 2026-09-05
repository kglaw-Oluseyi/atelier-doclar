import { NextResponse } from "next/server";
import { jsonError } from "../../../server/http";
import { getRuntime } from "../../../server/runtime";
import { requireActor } from "../../../server/with-session";

export async function GET(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    return NextResponse.json({ ok: true, clients: getRuntime().service.listClients(actor, organisationId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const client = getRuntime().service.createClient(actor, await request.json());
    return NextResponse.json({ ok: true, client }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
