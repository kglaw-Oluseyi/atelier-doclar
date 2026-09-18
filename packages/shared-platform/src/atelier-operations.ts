import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { personHasCeoOrganisationWide } from "./risk-command.js";
import {
  atelierTokenPrefix,
  generateAtelierLinkToken,
  hashAtelierLinkToken,
  type AtelierAccessConfig,
} from "./atelier-access.js";
import type {
  AtelierAccessGrant,
  AtelierSession,
  EventAtelier,
  EventNarrativeEdition,
  HostDecisionReceipt,
  HostDecisionRequest,
  IssueAtelierAccessInput,
  MagicLinkChallenge,
  PublishAtelierInput,
  PublishCuratedUpdateInput,
  PublishDecisionRequestInput,
  PublishNarrativeEditionInput,
  RenewAtelierAccessInput,
  ReviewHostDecisionInput,
  RevokeAtelierAccessInput,
  StartNarrativeRevisionInput,
  SubmitHostDecisionInput,
} from "./atelier-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, version: 1, createdAt: now, updatedAt: now } as const;
}

function requireAtelier(snap: PlatformSnapshot, eventId: string): EventAtelier {
  const atelier = snap.eventAteliers.find((item) => item.eventId === eventId);
  if (!atelier) throw new PlatformError("NOT_FOUND", "atelier was not found");
  return atelier;
}

function requireEvent(snap: PlatformSnapshot, organisationId: string, eventId: string) {
  const event = snap.events.find((item) => item.id === eventId && item.organisationId === organisationId);
  if (!event) throw new PlatformError("NOT_FOUND", "event was not found");
  return event;
}

export function assertVersion(current: number, expected: number): void {
  if (current !== expected) throw new PlatformError("VERSION_CONFLICT", "atelier record changed");
}

function closeGrantSessions(snap: PlatformSnapshot, grantId: string, now: string, status: "REVOKED" | "EXPIRED" = "REVOKED"): void {
  for (const session of snap.atelierSessions.filter((item) => item.grantId === grantId && item.status === "ACTIVE")) {
    session.status = status;
    session.revokedAt = now;
    session.version += 1;
    session.updatedAt = now;
  }
  for (const challenge of snap.magicLinkChallenges.filter((item) => item.grantId === grantId && item.status === "ISSUED")) {
    challenge.status = "REVOKED";
    challenge.version += 1;
    challenge.updatedAt = now;
  }
}

function materialisePublishedNarrativeFromDraft(
  snap: PlatformSnapshot,
  atelier: EventAtelier,
  now: string,
  actorPersonId: string,
): void {
  const current = snap.eventNarrativeEditions.find((item) => item.id === atelier.currentNarrativeEditionId);
  if (!current || current.publicationState === "PUBLISHED") return;
  if (current.publicationState !== "DRAFT") return;
  const published: EventNarrativeEdition = {
    ...current,
    id: randomUUID(),
    publicationState: "PUBLISHED",
    publishedAt: now,
    approvedByPersonId: actorPersonId,
    supersedesEditionId: undefined,
    changeSummary: "First published narrative edition from accepted source material.",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.eventNarrativeEditions.push(published);
  atelier.currentNarrativeEditionId = published.id;
  atelier.currentNarrativeDraftId = undefined;
}

export function publishAtelierOnSnap(
  snap: PlatformSnapshot,
  input: PublishAtelierInput,
  now: string,
  actorPersonId: string,
): EventAtelier {
  requireEvent(snap, input.organisationId, input.eventId);
  const atelier = requireAtelier(snap, input.eventId);
  if (atelier.publicationState === "PUBLISHED") return atelier;
  atelier.publicationState = "PUBLISHED";
  atelier.publishedAt = now;
  atelier.publishedByPersonId = actorPersonId;
  atelier.version += 1;
  atelier.updatedAt = now;
  const publishDraft = <T extends { atelierId: string; publicationState: string; version: number; updatedAt: string }>(
    rows: T[],
  ) => {
    for (const row of rows) {
      if (row.atelierId !== atelier.id || row.publicationState !== "DRAFT") continue;
      row.publicationState = "PUBLISHED";
      row.version += 1;
      row.updatedAt = now;
    }
  };
  for (const chapter of snap.atelierChapters.filter((item) => item.atelierId === atelier.id && item.visibilityPolicy === "HOST_VISIBLE")) {
    if (chapter.publicationState === "DRAFT") {
      chapter.publicationState = "PUBLISHED";
      chapter.version += 1;
      chapter.updatedAt = now;
    }
  }
  materialisePublishedNarrativeFromDraft(snap, atelier, now, actorPersonId);
  publishDraft(snap.curatedMediaSets);
  publishDraft(snap.approvedAssetEditions);
  publishDraft(snap.guestJourneyProjections);
  publishDraft(snap.hostMilestoneProjections);
  publishDraft(snap.vendorEnsembleProjections);
  publishDraft(snap.contingencyAssuranceProjections);
  publishDraft(snap.curatedUpdates);
  return atelier;
}

export function ensureNarrativeRevisionDraftOnSnap(
  snap: PlatformSnapshot,
  input: StartNarrativeRevisionInput,
  now: string,
  actorPersonId: string,
): EventNarrativeEdition {
  const atelier = requireAtelier(snap, input.eventId);
  if (atelier.currentNarrativeDraftId) {
    const existing = snap.eventNarrativeEditions.find(
      (item) => item.id === atelier.currentNarrativeDraftId && item.publicationState === "DRAFT",
    );
    if (existing) return existing;
  }
  const current = snap.eventNarrativeEditions.find((item) => item.id === atelier.currentNarrativeEditionId);
  if (current?.publicationState === "DRAFT") {
    atelier.currentNarrativeDraftId = current.id;
    atelier.updatedAt = now;
    return current;
  }
  if (!current || current.publicationState !== "PUBLISHED") {
    throw new PlatformError("NOT_FOUND", "no published narrative edition exists to revise");
  }
  const draft: EventNarrativeEdition = {
    ...current,
    id: randomUUID(),
    publicationState: "DRAFT",
    publishedAt: undefined,
    approvedByPersonId: undefined,
    supersedesEditionId: current.id,
    changeSummary: undefined,
    authorPersonId: actorPersonId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  snap.eventNarrativeEditions.push(draft);
  atelier.currentNarrativeDraftId = draft.id;
  atelier.version += 1;
  atelier.updatedAt = now;
  return draft;
}

export function publishNarrativeEditionOnSnap(
  snap: PlatformSnapshot,
  input: PublishNarrativeEditionInput,
  now: string,
  actorPersonId: string,
): EventNarrativeEdition {
  const atelier = requireAtelier(snap, input.eventId);
  if (input.expectedAtelierVersion != null) {
    assertVersion(atelier.version, input.expectedAtelierVersion);
  }
  const currentPublished = snap.eventNarrativeEditions.find(
    (item) => item.id === atelier.currentNarrativeEditionId && item.publicationState === "PUBLISHED",
  );
  const supersededIds: string[] = [];
  for (const edition of snap.eventNarrativeEditions) {
    if (edition.atelierId !== atelier.id || edition.publicationState !== "PUBLISHED") continue;
    edition.publicationState = "SUPERSEDED";
    edition.version += 1;
    edition.updatedAt = now;
    supersededIds.push(edition.id);
  }
  if (atelier.currentNarrativeDraftId) {
    const draft = snap.eventNarrativeEditions.find((item) => item.id === atelier.currentNarrativeDraftId);
    if (draft && draft.publicationState === "DRAFT") {
      draft.publicationState = "WITHDRAWN";
      draft.version += 1;
      draft.updatedAt = now;
    }
  }
  const edition: EventNarrativeEdition = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: atelier.clientId,
    eventId: input.eventId,
    atelierId: atelier.id,
    story: input.story,
    atmosphere: input.atmosphere,
    pillars: input.pillars,
    culturalIntent: input.culturalIntent,
    designDirection: input.designDirection,
    authorPersonId: actorPersonId,
    approvedByPersonId: actorPersonId,
    publicationState: "PUBLISHED",
    publishedAt: now,
    supersedesEditionId: currentPublished?.id,
    changeSummary:
      input.changeSummary ??
      (currentPublished
        ? `Supersedes published edition ${currentPublished.id}.`
        : "First published narrative edition."),
    provenance: input.provenance,
    effectiveAt: now,
    ...stamp(now),
  };
  snap.eventNarrativeEditions.push(edition);
  atelier.currentNarrativeEditionId = edition.id;
  atelier.currentNarrativeDraftId = undefined;
  atelier.version += 1;
  atelier.updatedAt = now;
  void supersededIds;
  return edition;
}

export function publishDecisionRequestOnSnap(
  snap: PlatformSnapshot,
  input: PublishDecisionRequestInput,
  now: string,
  actorPersonId: string,
): HostDecisionRequest {
  const atelier = requireAtelier(snap, input.eventId);
  if (atelier.publicationState !== "PUBLISHED") {
    throw new PlatformError("TRANSITION_INVALID", "atelier must be published before a host decision is offered");
  }
  const request: HostDecisionRequest = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: atelier.clientId,
    eventId: input.eventId,
    atelierId: atelier.id,
    kind: input.kind,
    title: input.title,
    question: input.question,
    consequence: input.consequence,
    options: input.options,
    deadlineAt: input.deadlineAt,
    status: "PUBLISHED",
    requiresReview: input.requiresReview,
    requiresStepUp: input.requiresStepUp,
    publishedByPersonId: actorPersonId,
    expectedVersion: 1,
    canonicalTarget: "ATELIER_DECISION_ONLY",
    ...stamp(now),
  };
  snap.hostDecisionRequests.push(request);
  return request;
}

export function publishCuratedUpdateOnSnap(
  snap: PlatformSnapshot,
  input: PublishCuratedUpdateInput,
  now: string,
  actorPersonId: string,
): void {
  const atelier = requireAtelier(snap, input.eventId);
  snap.curatedUpdates.push({
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: atelier.clientId,
    eventId: input.eventId,
    atelierId: atelier.id,
    title: input.title,
    body: input.body,
    importance: input.importance,
    authorPersonId: actorPersonId,
    publishedAt: now,
    publicationState: "PUBLISHED",
    ...stamp(now),
  });
}

export function issueAtelierAccessOnSnap(
  snap: PlatformSnapshot,
  input: IssueAtelierAccessInput,
  now: string,
  actorPersonId: string,
  config: AtelierAccessConfig,
): { grant: AtelierAccessGrant; challenge: MagicLinkChallenge; token: string } {
  const atelier = requireAtelier(snap, input.eventId);
  const person = snap.persons.find((item) => item.id === input.personId);
  if (!person) throw new PlatformError("NOT_FOUND", "host person was not found");
  if (input.hostRole === "READ_ONLY_HOST" && input.canDecide) {
    throw new PlatformError("VALIDATION_FAILED", "read-only host cannot decide");
  }
  for (const existing of snap.atelierAccessGrants) {
    if (existing.atelierId !== atelier.id || existing.personId !== input.personId || existing.status !== "ACTIVE") {
      continue;
    }
    existing.status = "SUPERSEDED";
    existing.version += 1;
    existing.updatedAt = now;
    closeGrantSessions(snap, existing.id, now);
  }
  const ttl = input.ttlSeconds ?? 24 * 60 * 60;
  const grant: AtelierAccessGrant = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: atelier.clientId,
    eventId: input.eventId,
    atelierId: atelier.id,
    personId: input.personId,
    hostRole: input.hostRole,
    chapters: input.chapters,
    canDecide: input.canDecide,
    canExport: input.canExport,
    status: "ACTIVE",
    issuedByPersonId: actorPersonId,
    expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString(),
    failedExchangeCount: 0,
    ...stamp(now),
  };
  const token = generateAtelierLinkToken();
  const challenge: MagicLinkChallenge = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: atelier.clientId,
    eventId: input.eventId,
    atelierId: atelier.id,
    grantId: grant.id,
    purpose: input.purpose ?? "ATELIER_ENTRY",
    tokenHash: hashAtelierLinkToken(token, config),
    tokenPrefix: atelierTokenPrefix(token),
    status: "ISSUED",
    expiresAt: new Date(Date.parse(now) + (config.challengeTtlSeconds ?? 1800) * 1000).toISOString(),
    issuedByPersonId: actorPersonId,
    ...stamp(now),
  };
  snap.atelierAccessGrants.push(grant);
  snap.magicLinkChallenges.push(challenge);
  return { grant, challenge, token };
}

export function issueAtelierStepUpOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; grantId: string; reason: string },
  now: string,
  actorPersonId: string,
  config: AtelierAccessConfig,
): { grant: AtelierAccessGrant; challenge: MagicLinkChallenge; token: string } {
  const grant = snap.atelierAccessGrants.find((item) => item.id === input.grantId && item.eventId === input.eventId);
  if (!grant || grant.status !== "ACTIVE") throw new PlatformError("NOT_FOUND", "atelier grant was not found");
  const token = generateAtelierLinkToken();
  const challenge: MagicLinkChallenge = {
    id: randomUUID(),
    organisationId: input.organisationId,
    clientId: grant.clientId,
    eventId: input.eventId,
    atelierId: grant.atelierId,
    grantId: grant.id,
    purpose: "STEP_UP",
    tokenHash: hashAtelierLinkToken(token, config),
    tokenPrefix: atelierTokenPrefix(token),
    status: "ISSUED",
    expiresAt: new Date(Date.parse(now) + (config.challengeTtlSeconds ?? 1800) * 1000).toISOString(),
    issuedByPersonId: actorPersonId,
    ...stamp(now),
  };
  snap.magicLinkChallenges.push(challenge);
  return { grant, challenge, token };
}

export function revokeAtelierAccessOnSnap(
  snap: PlatformSnapshot,
  input: RevokeAtelierAccessInput,
  now: string,
): AtelierAccessGrant {
  const grant = snap.atelierAccessGrants.find((item) => item.id === input.grantId && item.eventId === input.eventId);
  if (!grant) throw new PlatformError("NOT_FOUND", "atelier grant was not found");
  assertVersion(grant.version, input.expectedVersion);
  grant.status = "REVOKED";
  grant.revokedAt = now;
  grant.version += 1;
  grant.updatedAt = now;
  closeGrantSessions(snap, grant.id, now);
  return grant;
}

export function renewAtelierAccessOnSnap(
  snap: PlatformSnapshot,
  input: RenewAtelierAccessInput,
  now: string,
  actorPersonId: string,
  config: AtelierAccessConfig,
): { grant: AtelierAccessGrant; challenge: MagicLinkChallenge; token: string; priorGrant: AtelierAccessGrant } {
  const prior = snap.atelierAccessGrants.find((item) => item.id === input.grantId && item.eventId === input.eventId);
  if (!prior) throw new PlatformError("NOT_FOUND", "atelier grant was not found");
  assertVersion(prior.version, input.expectedVersion);
  if (prior.hostRole === "READ_ONLY_HOST" && input.canDecide) {
    throw new PlatformError("VALIDATION_FAILED", "read-only host cannot decide");
  }
  const issued = issueAtelierAccessOnSnap(
    snap,
    {
      organisationId: input.organisationId,
      eventId: input.eventId,
      personId: prior.personId,
      hostRole: prior.hostRole,
      chapters: prior.chapters,
      canDecide: input.canDecide,
      canExport: input.canExport,
      ttlSeconds: input.ttlSeconds,
      purpose: input.purpose,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    },
    now,
    actorPersonId,
    config,
  );
  return { ...issued, priorGrant: prior };
}

export function submitHostDecisionOnSnap(
  snap: PlatformSnapshot,
  input: SubmitHostDecisionInput,
  now: string,
  grant: AtelierAccessGrant,
  session: AtelierSession,
): HostDecisionReceipt {
  const request = snap.hostDecisionRequests.find((item) => item.id === input.requestId);
  if (!request || request.eventId !== grant.eventId) {
    throw new PlatformError("NOT_FOUND", "decision is not available");
  }
  if (!grant.canDecide || grant.hostRole === "READ_ONLY_HOST") {
    throw new PlatformError("FORBIDDEN", "this host role cannot submit a decision");
  }
  if (grant.status !== "ACTIVE") {
    throw new PlatformError("FORBIDDEN", "atelier access is no longer available");
  }
  if (request.status === "EXPIRED" || Date.parse(request.deadlineAt) <= Date.parse(now)) {
    request.status = "EXPIRED";
    throw new PlatformError("TRANSITION_INVALID", "this decision is no longer open", {
      publicMessage: "This decision has closed. Nothing was recorded.",
    });
  }
  const existing = snap.hostDecisionReceipts.find(
    (item) => item.requestId === request.id && item.submittedByPersonId === grant.personId,
  );
  if (existing && existing.submittedChoice === input.choice) return existing;
  if (existing) {
    throw new PlatformError("IDEMPOTENCY_CONFLICT", "this decision was already submitted differently");
  }
  assertVersion(request.version, input.expectedVersion);
  if (!request.options.includes(input.choice)) {
    throw new PlatformError("VALIDATION_FAILED", "that option is not offered");
  }
  if (request.requiresStepUp && (!session.elevatedUntil || Date.parse(session.elevatedUntil) <= Date.parse(now))) {
    throw new PlatformError("FORBIDDEN", "step-up is required", {
      publicMessage: "A fresh confirmation is required before this decision can be recorded.",
    });
  }
  if (request.status !== "PUBLISHED") {
    throw new PlatformError("VERSION_CONFLICT", "this decision changed while you were responding");
  }
  const reviewStatus = request.requiresReview ? "PENDING" : "NOT_REQUIRED";
  request.status = request.requiresReview ? "REVIEW_PENDING" : "SUBMITTED";
  request.version += 1;
  request.updatedAt = now;
  const receipt: HostDecisionReceipt = {
    id: randomUUID(),
    organisationId: grant.organisationId,
    clientId: grant.clientId,
    eventId: grant.eventId,
    atelierId: grant.atelierId,
    requestId: request.id,
    grantId: grant.id,
    submittedByPersonId: grant.personId,
    submittedChoice: input.choice,
    submittedAt: now,
    changedCanonicalData: false,
    reviewStatus,
    nextOwner: request.requiresReview ? "Maison Doclar event team" : "Recorded. No further host action.",
    finalOutcome: request.requiresReview
      ? "Received. Staff review is pending. Canonical Event OS records are unchanged."
      : "Received. Canonical Event OS records are unchanged.",
    requestVersion: request.version,
    correlationId: randomUUID(),
    ...stamp(now),
  };
  snap.hostDecisionReceipts.push(receipt);
  return receipt;
}

export function reviewHostDecisionOnSnap(
  snap: PlatformSnapshot,
  input: ReviewHostDecisionInput,
  now: string,
  actorPersonId: string,
): HostDecisionReceipt {
  const request = snap.hostDecisionRequests.find((item) => item.id === input.requestId && item.eventId === input.eventId);
  const receipt = snap.hostDecisionReceipts.find((item) => item.id === input.receiptId);
  if (!request || !receipt) throw new PlatformError("NOT_FOUND", "decision review target was not found");
  assertVersion(request.version, input.expectedVersion);
  if (
    (receipt.submittedByPersonId === actorPersonId || request.publishedByPersonId === actorPersonId) &&
    !personHasCeoOrganisationWide(snap, actorPersonId, input.organisationId ?? request.organisationId)
  ) {
    throw new PlatformError("FORBIDDEN", "maker cannot check this decision");
  }
  if (receipt.reviewStatus !== "PENDING") {
    throw new PlatformError("TRANSITION_INVALID", "this decision is not awaiting review");
  }
  receipt.reviewStatus = input.approve ? "APPROVED" : "REJECTED";
  receipt.reviewedByPersonId = actorPersonId;
  receipt.finalOutcome = input.approve
    ? "Reviewed and accepted. Canonical Event OS records remain unchanged."
    : "Reviewed and declined. Canonical Event OS records remain unchanged.";
  receipt.nextOwner = "Closed.";
  receipt.version += 1;
  receipt.updatedAt = now;
  request.status = input.approve ? "APPROVED" : "REJECTED";
  request.version += 1;
  request.updatedAt = now;
  return receipt;
}
