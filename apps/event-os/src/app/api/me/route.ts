import { NextResponse } from "next/server";
import { jsonError } from "../../../server/http";
import { getRuntime } from "../../../server/runtime";
import { requireActor } from "../../../server/with-session";

export async function GET(): Promise<Response> {
  try {
    const { actor, person } = await requireActor();
    const runtime = getRuntime();
    const organisations = runtime.service.listOrganisations(actor);
    const assignments = organisations.flatMap((org) => runtime.service.listAssignments(actor, org.id));
    return NextResponse.json({
      ok: true,
      person: { id: person.id, displayName: person.displayName, email: person.email, status: person.status },
      organisations,
      assignments,
    });
  } catch (error) {
    return jsonError(error);
  }
}
