import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { parseRiskSchema } from "./risk-form-contract.js";
import { RiskCommandEnvelopeSchema } from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export function riskStamp(now: string, version = 1) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version,
    createdAt: now,
    updatedAt: now,
  };
}

export function bumpVersion(record: { version: number; updatedAt: string }, now: string): { version: number; updatedAt: string } {
  return { version: record.version + 1, updatedAt: now };
}

export function newRiskId(): string {
  return randomUUID();
}

export function parseRiskEnvelope(raw: unknown) {
  return parseRiskSchema(RiskCommandEnvelopeSchema, raw);
}

export function extractRiskEnvelope(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new PlatformError("VALIDATION_FAILED", "command envelope is required");
  }
  const record = raw as Record<string, unknown>;
  return parseRiskEnvelope({
    organisationId: record.organisationId,
    ...(record.eventId ? { eventId: record.eventId } : {}),
    assignmentId: record.assignmentId,
    expectedVersion: record.expectedVersion,
    idempotencyKey: record.idempotencyKey,
    ...(typeof record.reason === "string" && record.reason.trim() ? { reason: record.reason } : {}),
  });
}

export function assertExpectedVersion(actual: number, expected: number, label: string): void {
  if (actual !== expected) {
    throw new PlatformError("VERSION_CONFLICT", `${label} changed since this view was loaded`);
  }
}

export function sealSensitive(kind: string, plaintext: string): string {
  const trimmed = plaintext.trim();
  if (!trimmed) throw new PlatformError("VALIDATION_FAILED", `${kind} is required`);
  return `enc:v1:${exactHash({ kind, value: trimmed })}`;
}

export function assertSameOrganisation(left: string, right: string): void {
  if (left !== right) throw new PlatformError("SCOPE_MISMATCH", "organisation scope does not match");
}

export function assertSameEvent(eventId: string | undefined, expected?: string): void {
  if (expected && eventId !== expected) throw new PlatformError("SCOPE_MISMATCH", "event scope does not match");
}

export type MakerCheckerRelief = {
  /**
   * Organisation-wide CEO may complete maker and checker alone anywhere in Event OS.
   * Non-CEO roles remain strictly separated.
   */
  ceoAuthority?: boolean;
  /** Optional audit note when CEO completes both roles. */
  overrideReason?: string;
};

export const CEO_MAKER_CHECKER_DEFAULT_REASON = "CEO organisation-wide authority self-check" as const;

export function assertMakerChecker(
  makerPersonId: string,
  checkerPersonId: string,
  action: string,
  relief?: MakerCheckerRelief,
): void {
  if (makerPersonId !== checkerPersonId) return;
  if (relief?.ceoAuthority) return;
  throw new PlatformError("FORBIDDEN", `maker cannot ${action} their own edition`, {
    publicMessage: `Maker/checker: a different authorised person must ${action}. Organisation-wide CEO may complete both roles alone.`,
  });
}

export function assertIndependentChecker(input: {
  actorPersonId: string;
  authorPersonId?: string;
  submitterPersonId?: string;
  action: "approve";
  relief?: MakerCheckerRelief;
  snap?: PlatformSnapshot;
  organisationId?: string;
}): void {
  const relief =
    input.relief ??
    (input.snap ? ceoMakerCheckerReliefFromSnap(input.snap, input.actorPersonId, input.organisationId) : undefined);
  if (input.authorPersonId) {
    assertMakerChecker(input.authorPersonId, input.actorPersonId, input.action, relief);
  }
  if (input.submitterPersonId) {
    assertMakerChecker(input.submitterPersonId, input.actorPersonId, input.action, relief);
  }
}

/** Resolve whether an actor snapshot holds organisation-wide CEO authority. */
export function actorHasCeoOrganisationWide(
  actor: {
    assignments: ReadonlyArray<{ status: string; organisationId: string; roleId: string }>;
    roles: ReadonlyArray<{ id: string; key: string; organisationWide?: boolean }>;
  },
  organisationId?: string,
): boolean {
  return actor.assignments.some((assignment) => {
    if (assignment.status !== "ACTIVE") return false;
    if (organisationId && assignment.organisationId !== organisationId) return false;
    const role = actor.roles.find((item) => item.id === assignment.roleId);
    return Boolean(role && role.key === "CEO" && role.organisationWide);
  });
}

export function ceoMakerCheckerRelief(
  actor: {
    assignments: ReadonlyArray<{ status: string; organisationId: string; roleId: string }>;
    roles: ReadonlyArray<{ id: string; key: string; organisationWide?: boolean }>;
  },
  organisationId?: string,
  overrideReason?: string,
): MakerCheckerRelief {
  const ceoAuthority = actorHasCeoOrganisationWide(actor, organisationId);
  if (!ceoAuthority) return {};
  const reason = overrideReason?.trim() || CEO_MAKER_CHECKER_DEFAULT_REASON;
  return { ceoAuthority: true, overrideReason: reason };
}

/** CEO authority from platform assignments (for OnSnap / command paths that only have personId). */
export function personHasCeoOrganisationWide(
  snap: PlatformSnapshot,
  personId: string,
  organisationId?: string,
): boolean {
  return snap.assignments.some((assignment) => {
    if (assignment.personId !== personId || assignment.status !== "ACTIVE") return false;
    if (organisationId && assignment.organisationId !== organisationId) return false;
    const role = snap.roles.find((item) => item.id === assignment.roleId);
    return Boolean(role && role.key === "CEO" && role.organisationWide);
  });
}

export function ceoMakerCheckerReliefFromSnap(
  snap: PlatformSnapshot,
  personId: string,
  organisationId?: string,
  overrideReason?: string,
): MakerCheckerRelief {
  if (!personHasCeoOrganisationWide(snap, personId, organisationId)) return {};
  const reason = overrideReason?.trim() || CEO_MAKER_CHECKER_DEFAULT_REASON;
  return { ceoAuthority: true, overrideReason: reason };
}

/** Maker/checker with automatic CEO organisation-wide relief when the checker is CEO. */
export function assertMakerCheckerFor(
  snap: PlatformSnapshot,
  makerPersonId: string,
  checkerPersonId: string,
  action: string,
  organisationId?: string,
): void {
  assertMakerChecker(
    makerPersonId,
    checkerPersonId,
    action,
    ceoMakerCheckerReliefFromSnap(snap, checkerPersonId, organisationId),
  );
}

export function assertHumanActor(actorKind: string | undefined): void {
  if (actorKind === "AI") {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI cannot approve a governing protection decision");
  }
}

export function reloadDurableAssignment(
  snap: PlatformSnapshot,
  assignmentId: string,
  actorPersonId: string,
  organisationId?: string,
) {
  const assignment = snap.assignments.find((item) => item.id === assignmentId);
  if (!assignment || assignment.status !== "ACTIVE") {
    throw new PlatformError("FORBIDDEN", "current assignment is required");
  }
  if (assignment.personId !== actorPersonId) {
    throw new PlatformError("FORBIDDEN", "assignment does not belong to this person");
  }
  if (organisationId && assignment.organisationId !== organisationId) {
    throw new PlatformError("SCOPE_MISMATCH", "assignment is outside this organisation");
  }
  const person = snap.persons.find((item) => item.id === actorPersonId);
  if (!person || person.status !== "ACTIVE") {
    throw new PlatformError("FORBIDDEN", "durable person identity is not active");
  }
  return { assignment, person, human: true as const };
}

export function assertProtectedHuman(
  snap: PlatformSnapshot,
  assignmentId: string,
  actorPersonId: string,
  _callerActorKind?: string,
  organisationId?: string,
): void {
  reloadDurableAssignment(snap, assignmentId, actorPersonId, organisationId);
}

export const DOCUMENT_TRANSITIONS: Record<string, readonly string[]> = {
  PENDING_UPLOAD: ["UPLOADED", "REJECTED"],
  UPLOADED: ["SCAN_PENDING", "CLEAN", "REJECTED", "VERIFIED"],
  SCAN_PENDING: ["CLEAN", "QUARANTINED", "SCAN_FAILED"],
  CLEAN: ["VERIFIED", "REJECTED", "SUPERSEDED", "EXPIRED"],
  QUARANTINED: ["REJECTED"],
  SCAN_FAILED: ["SCAN_PENDING", "REJECTED"],
  VERIFIED: ["SUPERSEDED", "EXPIRED"],
  REJECTED: [],
  EXPIRED: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export function assertDocumentTransition(from: string, to: string): void {
  if (!(DOCUMENT_TRANSITIONS[from] ?? []).includes(to)) {
    throw new PlatformError("TRANSITION_INVALID", `document cannot move from ${from} to ${to}`);
  }
}

export function placeholderMultiset(body: string): string[] {
  return [...body.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((match) => match[1] ?? "").filter(Boolean).sort();
}

export function renderClauseBody(body: string, variables: Array<{ key: string; value: string }>): string {
  const required = placeholderMultiset(body);
  const provided = [...variables.map((item) => item.key)].sort();
  if (required.join("|") !== provided.join("|")) {
    throw new PlatformError("VALIDATION_FAILED", "clause placeholders and supplied variables must be an exact multiset");
  }
  return required.reduce((text, key) => {
    const value = variables.find((item) => item.key === key)?.value ?? "";
    return text.replaceAll(`{{${key}}}`, escapeClauseValue(value));
  }, body);
}

export function escapeClauseValue(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function eventIdentityKey(parts: Array<string | undefined>): string {
  return exactHash(parts.filter(Boolean));
}
