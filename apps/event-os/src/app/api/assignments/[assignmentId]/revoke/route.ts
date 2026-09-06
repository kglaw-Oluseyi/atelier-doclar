import { NextResponse } from "next/server";
import { jsonError } from "../../../../../server/http";
import { getRuntime, withDurable } from "../../../../../server/runtime";
import { requireActor } from "../../../../../server/with-session";

export async function POST(request: Request, context: { params: Promise<{ assignmentId: string }> }): Promise<Response> {
  return withDurable(async () => {
    try {
      const { actor } = await requireActor();
      const { assignmentId } = await context.params;
      const body = (await request.json()) as Record<string, unknown>;
      const assignment = getRuntime().service.revokeAssignment(actor, { ...body, assignmentId });
      return NextResponse.json({ ok: true, assignment });
    } catch (error) {
      return jsonError(error);
    }
  });
}
