import { NextResponse } from "next/server";
import { jsonError } from "../../../server/http";
import { getRuntime, withDurable } from "../../../server/runtime";
import { requireActor } from "../../../server/with-session";

export async function GET(request: Request): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    return NextResponse.json({ ok: true, assignments: getRuntime().service.listAssignments(actor, organisationId) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  return withDurable(async () => {
    try {
      const { actor } = await requireActor();
      const assignment = getRuntime().service.grantAssignment(actor, await request.json());
      return NextResponse.json({ ok: true, assignment }, { status: 201 });
    } catch (error) {
      return jsonError(error);
    }
  });
}
