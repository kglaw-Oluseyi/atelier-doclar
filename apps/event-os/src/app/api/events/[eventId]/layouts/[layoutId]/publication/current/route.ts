import { NextResponse } from "next/server";
import { jsonError } from "../../../../../../../../server/http";
import { getRuntime } from "../../../../../../../../server/runtime";
import { requireActor } from "../../../../../../../../server/with-session";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string; layoutId: string }> },
): Promise<Response> {
  try {
    const { actor } = await requireActor();
    const { eventId, layoutId } = await context.params;
    const organisationId = new URL(request.url).searchParams.get("organisationId");
    if (!organisationId) return NextResponse.json({ ok: false, code: "VALIDATION_FAILED" }, { status: 400 });
    const projection = getRuntime().service.getLayoutDownstreamProjection(actor, organisationId, eventId, layoutId);
    return NextResponse.json(
      {
        ok: true,
        contract: projection,
        draft: false,
        note: "Immutable current-publication spatial contract for EOS-S06 consumption. This endpoint does not modify spatial truth.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}
