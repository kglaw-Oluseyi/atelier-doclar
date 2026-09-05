import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SessionError,
  appendAudit,
  evaluateApproval,
  loadCurrentSnapshot,
  readSession,
  type AuditEntry,
} from "@maison-doclar/programme-tower";
import { sessionConfig } from "../../../../../server/config";

const audit: AuditEntry[] = [];

export async function POST(request: Request): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    const body = (await request.json()) as { gateId?: unknown; namedAuthority?: unknown };
    const snapshot = loadCurrentSnapshot();
    const gate = snapshot.gates.find((item) => item.id === body.gateId);
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
      id: `AUD-${String(audit.length + 1).padStart(3, "0")}`,
      at: new Date().toISOString(),
      actorId: actor.actorId,
      action: "GATE_APPROVAL_ATTEMPT",
      targetId: gate.id,
      result: decision.allowed ? "accepted" : "rejected",
      reason: decision.allowed ? "allowed" : decision.code,
    };
    const next = appendAudit(audit, entry);
    audit.splice(0, audit.length, ...next);
    return NextResponse.json(
      { ok: decision.allowed, code: decision.allowed ? "APPROVED" : decision.code, audit: next },
      { status: decision.allowed ? 200 : 403 },
    );
  } catch (error) {
    if (error instanceof SessionError) {
      return NextResponse.json({ ok: false, code: "DENIED" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, code: "ERROR" }, { status: 500 });
  }
}
