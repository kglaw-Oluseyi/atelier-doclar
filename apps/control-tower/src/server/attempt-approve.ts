"use server";

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SessionError,
  appendAudit,
  evaluateApproval,
  readSession,
  type AuditEntry,
} from "@maison-doclar/programme-tower";
import { sessionConfig } from "./config";

const audit: AuditEntry[] = [];

function gateStub(gateId: string) {
  if (!gateId.startsWith("GATE-")) return undefined;
  return {
    id: gateId,
    product: "FOUNDATION" as const,
    title: gateId,
    status: "NOT_READY" as const,
    authority: "Named external authority",
    requiredEvidenceIds: [],
  };
}

export async function attemptGateApproval(
  _previous: string | undefined,
  formData: FormData,
): Promise<string> {
  const gateId = String(formData.get("gateId") ?? "");
  const namedAuthority = String(formData.get("namedAuthority") ?? "");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const actor = readSession(token, sessionConfig());
    const gate = gateStub(gateId);
    if (!gate) return `${gateId || "unknown"} approval rejected (UNKNOWN_GATE)`;
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
    return `${gate.id} approval ${decision.allowed ? "accepted" : "rejected"} (${decision.allowed ? "APPROVED" : decision.code})`;
  } catch (error) {
    if (error instanceof SessionError) {
      return `${gateId} approval rejected (DENIED)`;
    }
    return `${gateId} approval rejected (ERROR)`;
  }
}
