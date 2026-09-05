import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SessionError,
  evaluateApproval,
  readSession,
  type AuditEntry,
} from "@maison-doclar/programme-tower";
import { auditRepository } from "../../../../../server/audit";
import { sessionConfig } from "../../../../../server/config";

function gateStub(gateId: unknown) {
  if (typeof gateId !== "string" || !gateId.startsWith("GATE-")) return undefined;
  return {
    id: gateId,
    product: "FOUNDATION" as const,
    title: gateId,
    status: "NOT_READY" as const,
    authority: "Named external authority",
    requiredEvidenceIds: [],
  };
}

export async function POST(request: Request): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    const body = (await request.json()) as { gateId?: unknown; namedAuthority?: unknown };
    const gate = gateStub(body.gateId);
    if (!gate) return NextResponse.json({ ok: false, code: "UNKNOWN_GATE" }, { status: 404 });
    const namedAuthority = typeof body.namedAuthority === "string" ? body.namedAuthority : "";
    const decision = evaluateApproval({
      actorId: actor.actorId,
      role: actor.role,
      namedAuthority,
      gate,
      now: new Date().toISOString(),
    });
    const entry: AuditEntry = {
      id: `AUD-${Date.now()}-${gate.id}`,
      at: new Date().toISOString(),
      actorId: actor.actorId,
      action: "GATE_APPROVAL_ATTEMPT",
      targetId: gate.id,
      result: decision.allowed ? "accepted" : "rejected",
      reason: decision.allowed ? "allowed" : decision.code,
    };
    auditRepository().append(entry);
    return NextResponse.json(
      { ok: decision.allowed, code: decision.allowed ? "APPROVED" : decision.code, audit: auditRepository().list() },
      { status: decision.allowed ? 200 : 403 },
    );
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json({ ok: false, code: "DENIED" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, code: "ERROR" }, { status: 500 });
  }
}
