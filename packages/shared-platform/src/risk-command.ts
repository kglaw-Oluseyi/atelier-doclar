import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { RiskCommandEnvelopeSchema } from "./risk-schemas.js";

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
  const parsed = RiskCommandEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PlatformError("VALIDATION_FAILED", parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  return parsed.data;
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

export function assertMakerChecker(makerPersonId: string, checkerPersonId: string, action: string): void {
  if (makerPersonId === checkerPersonId) {
    throw new PlatformError("FORBIDDEN", `maker cannot ${action} their own edition`);
  }
}

export function assertHumanActor(actorKind: string | undefined): void {
  if (actorKind === "AI") {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI cannot approve a governing protection decision");
  }
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
