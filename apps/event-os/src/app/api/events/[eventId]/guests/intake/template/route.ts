import { NextResponse } from "next/server";
import { requireActor } from "../../../../../server/with-session";
import { getRuntime } from "../../../../../server/runtime";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  const { actor } = await requireActor();
  const runtime = getRuntime();
  const organisation = runtime.service.listOrganisations(actor)[0];
  if (!organisation) return NextResponse.json({ error: "No organisation" }, { status: 403 });
  try {
    runtime.service.listGuests(actor, { organisationId: organisation.id, eventId, sort: "FAMILY_NAME" });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const csv = runtime.service.guestIntakeTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="maison-doclar-guest-intake-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
