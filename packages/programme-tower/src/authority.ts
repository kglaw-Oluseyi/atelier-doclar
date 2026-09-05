import type { Gate } from "@maison-doclar/programme-domain";
import type { TowerRole } from "./constants.js";

export const PROTECTED_AUTHORITIES = [
  "CEO",
  "independent",
  "specialist",
  "security",
  "privacy",
  "legal",
  "venue",
  "live-event",
  "protocol",
  "cultural",
] as const;

export const FORBIDDEN_APPROVERS = ["UNKNOWN", "Cursor", "cursor", "implementer", "SYSTEM"];

export interface ApprovalAttempt {
  actorId: string;
  role: TowerRole;
  namedAuthority: string;
  gate: Gate;
  now: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  targetId: string;
  result: "accepted" | "rejected";
  reason: string;
}

export type ApprovalDecision =
  | { allowed: false; code: "UNAUTHORISED_ACTOR" | "MISSING_AUTHORITY" | "EXPIRED" | "REJECTED_GATE" | "RESERVED_IDENTITY" }
  | { allowed: true };

export function evaluateApproval(attempt: ApprovalAttempt): ApprovalDecision {
  if (FORBIDDEN_APPROVERS.includes(attempt.actorId) || attempt.actorId.toLowerCase() === "cursor") {
    return { allowed: false, code: "RESERVED_IDENTITY" };
  }
  if (attempt.role === "implementer" || attempt.role === "reader") {
    return { allowed: false, code: "UNAUTHORISED_ACTOR" };
  }
  if (!attempt.namedAuthority.trim() || FORBIDDEN_APPROVERS.includes(attempt.namedAuthority)) {
    return { allowed: false, code: "MISSING_AUTHORITY" };
  }
  if (attempt.namedAuthority === attempt.actorId && attempt.role !== "reviewer" && attempt.role !== "executive") {
    return { allowed: false, code: "UNAUTHORISED_ACTOR" };
  }
  if (attempt.gate.status === "REJECTED") {
    return { allowed: false, code: "REJECTED_GATE" };
  }
  if (attempt.gate.status === "EXPIRED" || (attempt.gate.expiresAt && Date.parse(attempt.gate.expiresAt) <= Date.parse(attempt.now))) {
    return { allowed: false, code: "EXPIRED" };
  }
  // CT6 never auto-approves protected gates from the Control Tower executor.
  return { allowed: false, code: "UNAUTHORISED_ACTOR" };
}

export function appendAudit(history: readonly AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [...history, entry];
}

export function approvalStillValid(input: { status: string; expiresAt?: string; now: string }): boolean {
  if (input.status !== "APPROVED") return false;
  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.parse(input.now)) return false;
  return true;
}

export function buildReleaseCandidate(input: {
  accepted: number;
  unsignedGates: number;
  blockingItems: number;
}): { readyForReview: boolean; productionAuthorised: false; summary: string } {
  return {
    readyForReview: input.accepted > 0 && input.unsignedGates === 0 && input.blockingItems === 0,
    productionAuthorised: false,
    summary:
      input.unsignedGates > 0
        ? "Release candidate evidence may exist; independent and CEO gates remain unsigned."
        : "Production is not authorised from this surface.",
  };
}
