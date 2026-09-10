import { createHmac, randomBytes } from "node:crypto";
import { PlatformError } from "./errors.js";
import { extractRiskEnvelope, newRiskId, bumpVersion, riskStamp } from "./risk-command.js";
import { RiskDossierAccessGrantSchema, type RiskDossierAccessGrant } from "./risk-schemas.js";
import { currentDossierPublication, publishedClientDossierProjection } from "./risk-projections.js";
import type { PlatformSnapshot } from "./store.js";

const MAX_EXCHANGE_FAILURES = 8;

export function generateDossierAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDossierAccessToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(`dossier-link:${token}`).digest("hex");
}

function expireIfNeeded(grant: RiskDossierAccessGrant, now: string): RiskDossierAccessGrant {
  if (grant.status === "ACTIVE" && grant.expiresAt <= now) {
    return Object.assign(grant, { status: "EXPIRED", ...bumpVersion(grant, now) });
  }
  return grant;
}

export function issueDossierAccessOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    tokenHash: string;
    expiresAt: string;
    audiencePersonId?: string;
  },
  now: string,
  actorPersonId: string,
): RiskDossierAccessGrant {
  extractRiskEnvelope(input);
  if (!currentDossierPublication(snap, input.eventId)) {
    throw new PlatformError("VALIDATION_FAILED", "client access requires a current dossier publication");
  }
  const prior = snap.riskDossierAccessGrants.find(
    (item) => item.eventId === input.eventId && item.status === "ACTIVE",
  );
  if (prior) {
    Object.assign(prior, { status: "REVOKED", revokedByPersonId: actorPersonId, revokedAt: now, ...bumpVersion(prior, now) });
  }
  const record = RiskDossierAccessGrantSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    audiencePersonId: input.audiencePersonId,
    purpose: "RISK_DOSSIER",
    tokenHash: input.tokenHash,
    status: "ACTIVE",
    issuedByPersonId: actorPersonId,
    issuedAt: now,
    expiresAt: input.expiresAt,
    supersedesGrantId: prior?.id,
    failedExchangeCount: 0,
    ...riskStamp(now),
  });
  snap.riskDossierAccessGrants.push(record);
  return record;
}

export function revokeDossierAccessOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string; grantId: string },
  now: string,
  actorPersonId: string,
): RiskDossierAccessGrant {
  extractRiskEnvelope(input);
  const grant = snap.riskDossierAccessGrants.find((item) => item.id === input.grantId && item.eventId === input.eventId);
  if (!grant) throw new PlatformError("NOT_FOUND", "dossier access grant was not found");
  Object.assign(grant, { status: "REVOKED", revokedByPersonId: actorPersonId, revokedAt: now, ...bumpVersion(grant, now) });
  return grant;
}

export function renewDossierAccessOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    grantId: string;
    tokenHash: string;
    expiresAt: string;
  },
  now: string,
  actorPersonId: string,
): RiskDossierAccessGrant {
  extractRiskEnvelope(input);
  const grant = snap.riskDossierAccessGrants.find((item) => item.id === input.grantId && item.eventId === input.eventId);
  if (!grant) throw new PlatformError("NOT_FOUND", "dossier access grant was not found");
  Object.assign(grant, { status: "REVOKED", revokedByPersonId: actorPersonId, revokedAt: now, ...bumpVersion(grant, now) });
  return issueDossierAccessOnSnap(
    snap,
    {
      organisationId: input.organisationId,
      eventId: input.eventId,
      assignmentId: input.assignmentId,
      expectedVersion: 0,
      idempotencyKey: `${input.idempotencyKey}-renewed`,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      audiencePersonId: grant.audiencePersonId,
    },
    now,
    actorPersonId,
  );
}

export function resolveDossierAccessOnSnap(snap: PlatformSnapshot, tokenHash: string, now: string): RiskDossierAccessGrant {
  const grant = snap.riskDossierAccessGrants.find((item) => item.tokenHash === tokenHash);
  if (!grant) throw new PlatformError("NOT_FOUND", "dossier access is not available");
  expireIfNeeded(grant, now);
  if (grant.status === "REVOKED" || grant.status === "EXPIRED") {
    throw new PlatformError("FORBIDDEN", "dossier access is not available");
  }
  if (grant.failedExchangeCount >= MAX_EXCHANGE_FAILURES) {
    Object.assign(grant, { status: "REVOKED", revokedAt: now, ...bumpVersion(grant, now) });
    throw new PlatformError("FORBIDDEN", "dossier access is not available");
  }
  return grant;
}

export function recordDossierAccessFailureOnSnap(snap: PlatformSnapshot, tokenHash: string, now: string): void {
  const grant = snap.riskDossierAccessGrants.find((item) => item.tokenHash === tokenHash);
  if (!grant) return;
  const failedExchangeCount = grant.failedExchangeCount + 1;
  Object.assign(grant, {
    failedExchangeCount,
    status: failedExchangeCount >= MAX_EXCHANGE_FAILURES ? "REVOKED" : grant.status,
    revokedAt: failedExchangeCount >= MAX_EXCHANGE_FAILURES ? now : grant.revokedAt,
    ...bumpVersion(grant, now),
  });
}

export function clientDossierFromGrant(snap: PlatformSnapshot, grant: RiskDossierAccessGrant) {
  if (grant.organisationId && grant.eventId) {
    return publishedClientDossierProjection(snap, grant.organisationId, grant.eventId);
  }
  throw new PlatformError("NOT_FOUND", "dossier access is not available");
}
