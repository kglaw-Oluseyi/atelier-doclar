"use server";

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SessionError,
  evaluateApproval,
  readSession,
  type AuditEntry,
} from "@maison-doclar/programme-tower";
import { auditRepository } from "./audit";
import { sessionConfig } from "./config";
import { getAudit } from "./runtime";

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
      id: `AUD-${Date.now()}-${gate.id}`,
      at: new Date().toISOString(),
      actorId: actor.actorId,
      action: "GATE_APPROVAL_ATTEMPT",
      targetId: gate.id,
      result: decision.allowed ? "accepted" : "rejected",
      reason: decision.allowed ? "allowed" : decision.code,
    };
    const postgresAudit = await getAudit();
    if (postgresAudit) await postgresAudit.appendAsync(entry);
    else auditRepository().append(entry);
    return `${gate.id} approval ${decision.allowed ? "accepted" : "rejected"} (${decision.allowed ? "APPROVED" : decision.code})`;
  } catch (error) {
    if (error instanceof SessionError) {
      return `${gateId} approval rejected (DENIED)`;
    }
    return `${gateId} approval rejected (ERROR)`;
  }
}
