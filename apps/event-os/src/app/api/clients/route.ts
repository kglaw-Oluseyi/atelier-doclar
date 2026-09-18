import { listClients, createClient } from "@maison-doclar/foundation";
import { NextResponse } from "next/server";
import { requireApiActor } from "@/server/api";

export async function GET(request: Request) {
  const gate = await requireApiActor(request);
  if ("error" in gate && gate.error) return gate.error;
  const clients = await listClients(gate.session.actor, {});
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const gate = await requireApiActor(request);
  if ("error" in gate && gate.error) return gate.error;
  const body = (await request.json()) as {
    code: string;
    displayName: string;
    status: "ACTIVE" | "PROSPECT" | "PAUSED" | "CLOSED";
    idempotencyKey: string;
  };
  try {
    const created = await createClient(
      {
        actor: gate.session.actor,
        correlationId: request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
        idempotencyKey: body.idempotencyKey,
      },
      body,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "INTERNAL_ERROR";
    return NextResponse.json({ code }, { status: code === "NOT_FOUND" ? 404 : 403 });
  }
}
