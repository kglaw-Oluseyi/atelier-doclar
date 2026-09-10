import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertMakerChecker,
  bumpVersion,
  extractRiskEnvelope,
  newRiskId,
  riskStamp,
} from "./risk-command.js";
import {
  RiskDossierAccessGrantSchema,
  RiskDossierEditionSchema,
  RiskDossierExportSchema,
  RiskDossierPublicationSchema,
  type RiskApplicabilitySnapshot,
  type RiskDossierAccessGrant,
  type RiskDossierEdition,
  type RiskDossierExport,
  type RiskDossierPublication,
} from "./risk-schemas.js";
import { assertLegalTransition, DOSSIER_TRANSITIONS } from "./risk-transitions.js";

export const WORKING_DOSSIER_STATUSES = new Set(["DRAFT", "SUBMITTED", "APPROVED"]);

export function clientDossierCopy() {
  return {
    guaranteesForbidden: true,
    phrases: {
      evidenceReviewed: "Evidence reviewed as of the dossier date.",
      knownGaps: "Current known gaps are listed without claiming they are exhaustive.",
      contingencyPrepared: "A contingency plan has been prepared; it is not a guarantee of continuity.",
      confirmationRequired: "Insurer or counsel confirmation is required before treating this as coverage or legal advice.",
    },
    forbidden: ["zero uncovered losses", "guaranteed continuity", "insurer will pay"],
  };
}

export type RiskDossierClientMessage = {
  id: string;
  publicationId: string;
  kind: "ACKNOWLEDGE" | "QUESTION";
  body: string;
  createdByPersonId: string;
  createdAt: string;
};

export function dossierNarrativeBody(): string {
  const copy = clientDossierCopy();
  return `${copy.phrases.evidenceReviewed} ${copy.phrases.knownGaps} ${copy.phrases.contingencyPrepared} ${copy.phrases.confirmationRequired}`;
}

export function assertDossierLanguage(body: string): void {
  const copy = clientDossierCopy();
  if (copy.forbidden.some((phrase) => body.toLowerCase().includes(phrase))) {
    throw new PlatformError("VALIDATION_FAILED", "dossier language cannot guarantee coverage");
  }
}

export function requireApplicabilityForAssemble(
  snapshot: Pick<RiskApplicabilitySnapshot, "contentHash"> | undefined,
): Pick<RiskApplicabilitySnapshot, "contentHash"> {
  if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish while included data is missing");
  return snapshot;
}

export function isWorkingDossier(item: Pick<RiskDossierEdition, "current" | "status">): boolean {
  return Boolean(item.current && WORKING_DOSSIER_STATUSES.has(item.status));
}

export function isCurrentPublication(item: Pick<RiskDossierPublication, "current" | "status">): boolean {
  return item.status === "CURRENT" || Boolean(item.current && item.status !== "SUPERSEDED" && item.status !== "WITHDRAWN");
}

export function buildDossierEdition(input: {
  organisationId: string;
  eventId: string;
  now: string;
  actorPersonId: string;
  snapshotHash: string;
  versionNumber: number;
  supersedesEditionId?: string;
}): RiskDossierEdition {
  extractRiskEnvelope({
    organisationId: input.organisationId,
    eventId: input.eventId,
    assignmentId: "00000000-0000-4000-8000-000000000001",
    expectedVersion: 0,
    idempotencyKey: "assemble-builder",
  });
  const body = dossierNarrativeBody();
  assertDossierLanguage(body);
  return RiskDossierEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    versionNumber: input.versionNumber,
    status: "DRAFT",
    componentHashes: [input.snapshotHash],
    contentHash: exactHash({ snapshot: input.snapshotHash, body }),
    languageApproved: true,
    authorPersonId: input.actorPersonId,
    submittedByPersonId: input.actorPersonId,
    supersedesEditionId: input.supersedesEditionId,
    dispatched: false,
    exportKind: "NONE",
    limitations: body,
    current: true,
    ...riskStamp(input.now),
  });
}

export function decideDossierTransition(
  current: RiskDossierEdition,
  command: {
    to: RiskDossierEdition["status"];
    expectedVersion: number;
    approvedHash?: string;
  },
  actorPersonId: string,
  now: string,
): RiskDossierEdition {
  assertExpectedVersion(current.version, command.expectedVersion, "dossier");
  assertLegalTransition(DOSSIER_TRANSITIONS, current.status, command.to, "dossier");
  if (command.to === "APPROVED") {
    assertMakerChecker(current.authorPersonId ?? current.submittedByPersonId, actorPersonId, "approve dossier");
    if (current.submittedByPersonId) assertMakerChecker(current.submittedByPersonId, actorPersonId, "approve dossier");
  }
  if (command.to === "SUBMITTED") {
    return RiskDossierEditionSchema.parse({
      ...current,
      status: "SUBMITTED",
      submittedByPersonId: actorPersonId,
      submittedAt: now,
      dispatched: false,
      ...bumpVersion(current, now),
    });
  }
  return RiskDossierEditionSchema.parse({
    ...current,
    status: command.to,
    current: command.to === "WITHDRAWN" || command.to === "SUPERSEDED" ? false : current.current,
    approvedByPersonId: command.to === "APPROVED" ? actorPersonId : current.approvedByPersonId,
    approvedAt: command.to === "APPROVED" ? now : current.approvedAt,
    approvedHash: command.to === "APPROVED" ? current.contentHash : current.approvedHash,
    dispatched: false,
    ...bumpVersion(current, now),
  });
}

export function assertExactApprovedHash(edition: RiskDossierEdition, approvedHash?: string): void {
  if (!approvedHash || approvedHash !== edition.contentHash || (edition.approvedHash && edition.approvedHash !== approvedHash)) {
    throw new PlatformError("VALIDATION_FAILED", "publication requires the approved exact hash");
  }
}

export function assertPublicationEligibility(edition: RiskDossierEdition): void {
  if (edition.status !== "APPROVED" && edition.status !== "PUBLISHED") {
    throw new PlatformError("TRANSITION_INVALID", "only an approved dossier edition can be published");
  }
}

export function assertPublicationActors(edition: RiskDossierEdition, actorPersonId: string): void {
  const authorPersonId = edition.authorPersonId ?? edition.submittedByPersonId;
  assertMakerChecker(authorPersonId, actorPersonId, "publish dossier");
  if (edition.submittedByPersonId) assertMakerChecker(edition.submittedByPersonId, actorPersonId, "publish dossier");
  if (edition.approvedByPersonId && edition.approvedByPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "approver cannot publish; a distinct publishing authority is required");
  }
}

export function assertPublicationComponents(
  snapshot: Pick<RiskApplicabilitySnapshot, "overall"> | undefined,
  mandatoryIndeterminate: boolean,
): void {
  if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish stale or unapproved components");
  if (snapshot.overall === "STALE" || mandatoryIndeterminate) {
    throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish while included data is stale or indeterminate");
  }
}

export function publicationIsReplay(existing: RiskDossierPublication | undefined, edition: RiskDossierEdition): boolean {
  return Boolean(
    existing &&
      (existing.approvedHash === edition.contentHash || existing.contentHash === edition.contentHash) &&
      (existing.dossierId === edition.id || existing.editionId === edition.id),
  );
}

export function decideDossierPublication(
  edition: RiskDossierEdition,
  priorPublication: RiskDossierPublication | undefined,
  command: {
    organisationId: string;
    eventId: string;
    expectedVersion: number;
    approvedHash?: string;
    publicationNumber: number;
  },
  actorPersonId: string,
  now: string,
  snapshot: Pick<RiskApplicabilitySnapshot, "overall"> | undefined,
  mandatoryIndeterminate: boolean,
):
  | { application: "APPLIED"; publication: RiskDossierPublication; editionPatch: RiskDossierEdition; priorPatch?: RiskDossierPublication }
  | { application: "REPLAYED"; publication: RiskDossierPublication } {
  assertPublicationEligibility(edition);
  assertExactApprovedHash(edition, command.approvedHash);
  assertPublicationActors(edition, actorPersonId);
  if (priorPublication && publicationIsReplay(priorPublication, edition)) {
    return { application: "REPLAYED", publication: priorPublication };
  }
  assertExpectedVersion(edition.version, command.expectedVersion, "dossier");
  assertPublicationComponents(snapshot, mandatoryIndeterminate);
  const publication = RiskDossierPublicationSchema.parse({
    id: newRiskId(),
    organisationId: command.organisationId,
    eventId: command.eventId,
    dossierId: edition.id,
    editionId: edition.id,
    contentHash: edition.contentHash,
    approvedHash: edition.contentHash,
    publicationNumber: command.publicationNumber,
    status: "CURRENT",
    publishedAt: now,
    publishedByPersonId: actorPersonId,
    supersedesPublicationId: priorPublication?.id,
    current: true,
    dispatched: false,
    clientMessages: [],
    ...riskStamp(now),
  });
  return {
    application: "APPLIED",
    publication,
    editionPatch: RiskDossierEditionSchema.parse({
      ...edition,
      approvedHash: edition.contentHash,
      publishedByPersonId: actorPersonId,
      publishedAt: now,
      exportKind: "PDF",
      dispatched: false,
      ...bumpVersion(edition, now),
    }),
    priorPatch: priorPublication
      ? {
          ...priorPublication,
          current: false,
          status: "SUPERSEDED",
          ...bumpVersion(priorPublication, now),
        }
      : undefined,
  };
}

export function buildDossierExport(
  dossier: RiskDossierEdition,
  publication: RiskDossierPublication,
  input: { organisationId: string; eventId: string },
  now: string,
  actorPersonId: string,
): RiskDossierExport {
  if (!publication || (publication.dossierId !== dossier.id && publication.editionId !== dossier.id)) {
    throw new PlatformError("VALIDATION_FAILED", "export requires a published dossier edition");
  }
  return RiskDossierExportSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    dossierId: dossier.id,
    publicationId: publication.id,
    publicationNumber: publication.publicationNumber,
    marking: "PERMISSION_SAFE_CLIENT",
    fullHash: exactHash({ dossier: dossier.contentHash, publication: publication.approvedHash, generatedAt: now }),
    generatedAt: now,
    generatedByPersonId: actorPersonId,
    mediaType: "application/pdf",
    privilegeBoundToPersonId: actorPersonId,
    status: "COMPLETE",
    dispatched: false,
    ...riskStamp(now),
  });
}

export function decideGrantIssue(
  prior: RiskDossierAccessGrant | undefined,
  input: {
    organisationId: string;
    eventId: string;
    tokenHash: string;
    expiresAt: string;
    audiencePersonId?: string;
  },
  now: string,
  actorPersonId: string,
): { grant: RiskDossierAccessGrant; priorPatch?: RiskDossierAccessGrant } {
  const priorPatch = prior
    ? { ...prior, status: "REVOKED" as const, revokedByPersonId: actorPersonId, revokedAt: now, ...bumpVersion(prior, now) }
    : undefined;
  return {
    grant: RiskDossierAccessGrantSchema.parse({
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
    }),
    priorPatch,
  };
}

export function decideGrantRevoke(grant: RiskDossierAccessGrant, now: string, actorPersonId: string): RiskDossierAccessGrant {
  return { ...grant, status: "REVOKED", revokedByPersonId: actorPersonId, revokedAt: now, ...bumpVersion(grant, now) };
}

export function decideClientMessage(
  publication: RiskDossierPublication,
  edition: RiskDossierEdition | undefined,
  input: { kind: "ACKNOWLEDGE" | "QUESTION"; body: string },
  now: string,
  actorPersonId: string,
): { publication: RiskDossierPublication; message: RiskDossierClientMessage } {
  const publicationHash = publication.contentHash ?? publication.approvedHash;
  if (!edition || publicationHash !== edition.contentHash) {
    throw new PlatformError("VALIDATION_FAILED", "client messages require a published dossier");
  }
  const message: RiskDossierClientMessage = {
    id: newRiskId(),
    publicationId: publication.id,
    kind: input.kind,
    body: input.body.trim(),
    createdByPersonId: actorPersonId,
    createdAt: now,
  };
  if (!message.body) throw new PlatformError("VALIDATION_FAILED", "client message body is required");
  return {
    publication: {
      ...publication,
      clientMessages: [...(publication.clientMessages ?? []), {
        id: message.id,
        kind: message.kind,
        body: message.body,
        createdByPersonId: message.createdByPersonId,
        createdAt: message.createdAt,
      }],
      ...bumpVersion(publication, now),
    },
    message,
  };
}

export function resolveGrantStatus(grant: RiskDossierAccessGrant, now: string): RiskDossierAccessGrant {
  if (grant.status === "ACTIVE" && grant.expiresAt <= now) {
    return { ...grant, status: "EXPIRED", ...bumpVersion(grant, now) };
  }
  return grant;
}

export function assertGrantUsable(grant: RiskDossierAccessGrant, now: string): RiskDossierAccessGrant {
  const current = resolveGrantStatus(grant, now);
  if (current.status === "REVOKED" || current.status === "EXPIRED") {
    throw new PlatformError("FORBIDDEN", "dossier access is not available");
  }
  if (current.failedExchangeCount >= 8) {
    throw new PlatformError("FORBIDDEN", "dossier access is not available");
  }
  return current;
}

export function mapCurrentnessConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/unique|duplicate key|one_current|VERSION_CONFLICT/i.test(message)) {
    throw new PlatformError("VERSION_CONFLICT", "stale risk aggregate write was not rescued", {
      publicMessage: "This record changed while you were editing. Reload before saving.",
    });
  }
  throw error;
}
