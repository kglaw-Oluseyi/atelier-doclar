import { projectCapabilities } from "@maison-doclar/foundation";
import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/api";

export async function GET(request: Request) {
  const gate = await requireApiActor(request);
  if (gate.error) return gate.error;
  return NextResponse.json({
    userId: gate.session.actor.userId,
    organisationId: gate.session.actor.organisationId,
    capabilities: projectCapabilities(gate.session.actor),
    productionAuthorised: false,
  });
}
