import { NextResponse } from "next/server";
import { requireActor } from "../../../../../../../../server/with-session";
import { getRuntime } from "../../../../../../../../server/runtime";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string; jobId: string }> }) {
  const { eventId, jobId } = await context.params;
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  try {
    const csv = runtime.service.exportGuestIntakeCorrectionCsv(actor, organisation.id, eventId, jobId);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="intake-${jobId}-corrections.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
