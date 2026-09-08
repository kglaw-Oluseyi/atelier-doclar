import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { completenessDimensions, evaluatePredicate, rankGap } from "./eec-coverage.js";
import { assertProposalSupported, extractFixtureProposals, sanitiseInertText } from "./eec-extraction.js";
import { assertHumanConfirmation, exactHash, nfc } from "./eec-hash.js";
import type {
  AssertionConflict,
  CandidateAssertion,
  CoverageAssessment,
  CreateOpportunityInput,
  DiscoveryConsentRecord,
  DiscoveryEngagement,
  DiscoveryParticipant,
  EngagementOpportunity,
  InterviewSession,
  SourceArtefact,
  SourceSegment,
  StartDiscoveryEngagementInput,
} from "./eec-schemas.js";
import {
  AddParticipantInputSchema,
  ExtractAssertionsInputSchema,
  RecordDiscoveryConsentInputSchema,
  RecordSourceArtefactInputSchema,
  ResolveConflictInputSchema,
  ReviewAssertionInputSchema,
  SessionLifecycleInputSchema,
  UpdateOpportunityInputSchema,
} from "./eec-schemas.js";
import type { z } from "zod";
import type { PlatformSnapshot } from "./store.js";

type UpdateOpportunityInput = z.infer<typeof UpdateOpportunityInputSchema>;
type AddParticipantInput = z.infer<typeof AddParticipantInputSchema>;
type RecordDiscoveryConsentInput = z.infer<typeof RecordDiscoveryConsentInputSchema>;
type SessionLifecycleInput = z.infer<typeof SessionLifecycleInputSchema>;
type RecordSourceArtefactInput = z.infer<typeof RecordSourceArtefactInputSchema>;
type ExtractAssertionsInput = z.infer<typeof ExtractAssertionsInputSchema>;
type ReviewAssertionInput = z.infer<typeof ReviewAssertionInputSchema>;
type ResolveConflictInput = z.infer<typeof ResolveConflictInputSchema>;

const SESSION_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["READY", "ACTIVE", "CANCELLED"],
  READY: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["PAUSED", "COMPLETED", "ABANDONED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ABANDONED"],
  COMPLETED: [],
  ABANDONED: [],
  CANCELLED: [],
};

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

function requireOpportunity(snap: PlatformSnapshot, organisationId: string, opportunityId: string): EngagementOpportunity {
  const record = snap.engagementOpportunities.find((item) => item.id === opportunityId);
  if (!record || record.organisationId !== organisationId) {
    throw new PlatformError("NOT_FOUND", "engagement opportunity was not found");
  }
  return record;
}

function requireEngagement(snap: PlatformSnapshot, organisationId: string, engagementId: string): DiscoveryEngagement {
  const record = snap.discoveryEngagements.find((item) => item.id === engagementId);
  if (!record || record.organisationId !== organisationId) {
    throw new PlatformError("NOT_FOUND", "discovery engagement was not found");
  }
  return record;
}

export function suggestDuplicateOpportunities(
  snap: PlatformSnapshot,
  organisationId: string,
  displayReference: string,
): EngagementOpportunity[] {
  const needle = nfc(displayReference).toLowerCase();
  return snap.engagementOpportunities.filter(
    (item) => item.organisationId === organisationId && nfc(item.displayReference).toLowerCase() === needle,
  );
}

export function createOpportunityOnSnap(
  snap: PlatformSnapshot,
  input: CreateOpportunityInput,
  now: string,
  actorPersonId: string,
): EngagementOpportunity {
  const record: EngagementOpportunity = {
    id: randomUUID(),
    displayReference: nfc(input.displayReference),
    eventConceptLabel: input.eventConceptLabel ? nfc(input.eventConceptLabel) : undefined,
    enquiryChannel: input.enquiryChannel,
    knownEventDate: input.knownEventDate,
    knownEventType: input.knownEventType,
    stage: "ENQUIRY",
    ownerPersonId: actorPersonId,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.engagementOpportunities.push(record);
  return record;
}

export function updateOpportunityOnSnap(
  snap: PlatformSnapshot,
  input: UpdateOpportunityInput,
  now: string,
  expectedVersion: number,
): EngagementOpportunity {
  const record = requireOpportunity(snap, input.organisationId, input.opportunityId);
  if (record.version !== expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale opportunity update");
  }
  if (input.stage === "CONVERTED") {
    throw new PlatformError("TRANSITION_INVALID", "conversion is not authorised in Foundation Milestone A");
  }
  record.stage = input.stage ?? record.stage;
  record.ownerPersonId = input.ownerPersonId ?? record.ownerPersonId;
  record.closedReason = input.closedReason ?? record.closedReason;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function startDiscoveryEngagementOnSnap(
  snap: PlatformSnapshot,
  input: StartDiscoveryEngagementInput,
  now: string,
): DiscoveryEngagement {
  const opportunity = requireOpportunity(snap, input.organisationId, input.opportunityId);
  if (opportunity.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale opportunity when starting discovery");
  }
  const existing = snap.discoveryEngagements.find(
    (item) => item.opportunityId === opportunity.id && item.status === "ACTIVE",
  );
  if (existing) return existing;
  const record: DiscoveryEngagement = {
    id: randomUUID(),
    opportunityId: opportunity.id,
    displayReference: nfc(input.displayReference ?? opportunity.displayReference),
    eventConceptLabel: opportunity.eventConceptLabel,
    status: "ACTIVE",
    ownerPersonId: opportunity.ownerPersonId,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.discoveryEngagements.push(record);
  opportunity.stage = "DISCOVERY";
  opportunity.version += 1;
  opportunity.updatedAt = now;
  refreshCoverageOnSnap(snap, record.id, now);
  return record;
}

export function addParticipantOnSnap(
  snap: PlatformSnapshot,
  input: AddParticipantInput,
  now: string,
): DiscoveryParticipant {
  requireEngagement(snap, input.organisationId, input.engagementId);
  const record: DiscoveryParticipant = {
    id: randomUUID(),
    engagementId: input.engagementId,
    displayName: nfc(input.displayName),
    claimedRole: nfc(input.claimedRole),
    authorityClaim: input.authorityClaim,
    linkedPersonId: input.linkedPersonId,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.discoveryParticipants.push(record);
  return record;
}

function latestConsent(
  snap: PlatformSnapshot,
  engagementId: string,
  dimension: DiscoveryConsentRecord["dimension"],
  participantId?: string,
): DiscoveryConsentRecord | undefined {
  return [...snap.discoveryConsentRecords]
    .reverse()
    .find(
      (item) =>
        item.engagementId === engagementId &&
        item.dimension === dimension &&
        (participantId ? item.participantId === participantId : true),
    );
}

export function consentIsActive(
  snap: PlatformSnapshot,
  engagementId: string,
  dimension: DiscoveryConsentRecord["dimension"],
  participantId?: string,
): boolean {
  const latest = latestConsent(snap, engagementId, dimension, participantId);
  return latest?.decision === "GRANTED";
}

export function recordDiscoveryConsentOnSnap(
  snap: PlatformSnapshot,
  input: RecordDiscoveryConsentInput,
  now: string,
  actorPersonId: string,
): DiscoveryConsentRecord {
  requireEngagement(snap, input.organisationId, input.engagementId);
  const record: DiscoveryConsentRecord = {
    id: randomUUID(),
    engagementId: input.engagementId,
    participantId: input.participantId,
    dimension: input.dimension,
    decision: input.decision,
    policyVersion: input.policyVersion,
    wordingEdition: input.wordingEdition,
    decidedAt: now,
    withdrawnAt: input.decision === "WITHDRAWN" ? now : undefined,
    legalBasisPlaceholder: input.legalBasisPlaceholder,
    actorPersonId,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.discoveryConsentRecords.push(record);
  return record;
}

export function sessionLifecycleOnSnap(
  snap: PlatformSnapshot,
  input: SessionLifecycleInput,
  now: string,
): InterviewSession {
  requireEngagement(snap, input.organisationId, input.engagementId);
  if (input.action === "CREATE") {
    const record: InterviewSession = {
      id: randomUUID(),
      engagementId: input.engagementId,
      mode: input.mode ?? "STAFF_LED",
      language: input.language ?? "en-GB",
      status: "DRAFT",
      providerState: "FIXTURE",
      organisationId: input.organisationId,
      version: 1,
      ...stamp(now),
    };
    snap.interviewSessions.push(record);
    return record;
  }
  const record = snap.interviewSessions.find((item) => item.id === input.sessionId);
  if (!record || record.organisationId !== input.organisationId || record.engagementId !== input.engagementId) {
    throw new PlatformError("NOT_FOUND", "interview session was not found");
  }
  if (record.version !== input.expectedVersion && input.action !== "RESUME") {
    throw new PlatformError("VERSION_CONFLICT", "stale interview session");
  }
  const target =
    input.action === "READY"
      ? "READY"
      : input.action === "START" || input.action === "RESUME"
        ? "ACTIVE"
        : input.action === "PAUSE"
          ? "PAUSED"
          : input.action === "COMPLETE"
            ? "COMPLETED"
            : input.action === "ABANDON"
              ? "ABANDONED"
              : "CANCELLED";
  if (input.action === "RESUME" && record.status === "ACTIVE") {
    return record;
  }
  if (!SESSION_TRANSITIONS[record.status]?.includes(target)) {
    throw new PlatformError("TRANSITION_INVALID", `session cannot move from ${record.status} to ${target}`);
  }
  if ((input.action === "START" || input.action === "RESUME") && input.mode !== "OFFLINE_NOTES") {
    if (!consentIsActive(snap, input.engagementId, "PARTICIPATION")) {
      throw new PlatformError("VALIDATION_FAILED", "participation consent is required before the session can start");
    }
  }
  record.status = target;
  if (target === "ACTIVE") record.startedAt = record.startedAt ?? now;
  if (target === "PAUSED") record.pausedAt = now;
  if (target === "COMPLETED") record.completedAt = now;
  record.version += 1;
  record.updatedAt = now;
  return record;
}

export function recordSourceArtefactOnSnap(
  snap: PlatformSnapshot,
  input: RecordSourceArtefactInput,
  now: string,
): { artefact: SourceArtefact; segment: SourceSegment } {
  requireEngagement(snap, input.organisationId, input.engagementId);
  if (input.kind === "TRANSCRIPT" && !consentIsActive(snap, input.engagementId, "TRANSCRIPTION")) {
    throw new PlatformError("VALIDATION_FAILED", "transcription consent is required");
  }
  if (input.kind === "AUDIO_METADATA" && !consentIsActive(snap, input.engagementId, "AUDIO_RECORDING")) {
    throw new PlatformError("VALIDATION_FAILED", "audio recording consent is required");
  }
  const text = sanitiseInertText(input.text);
  const artefact: SourceArtefact = {
    id: randomUUID(),
    engagementId: input.engagementId,
    sessionId: input.sessionId,
    kind: input.kind,
    title: nfc(input.title),
    contentSafetyStatus: "CLEAN",
    language: input.language,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  const segment: SourceSegment = {
    id: randomUUID(),
    artefactId: artefact.id,
    engagementId: input.engagementId,
    sequence: 0,
    speakerParticipantId: input.speakerParticipantId,
    speakerClaim: input.speakerParticipantId ? "RESOLVED" : "UNRESOLVED",
    text,
    language: input.language,
    contentHash: exactHash({ text, language: input.language ?? "" }),
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.sourceArtefacts.push(artefact);
  snap.sourceSegments.push(segment);
  return { artefact, segment };
}

export function extractAssertionsOnSnap(
  snap: PlatformSnapshot,
  input: ExtractAssertionsInput,
  now: string,
  actorPersonId: string,
  actorKind?: string,
): CandidateAssertion[] {
  if (!consentIsActive(snap, input.engagementId, "AI_ANALYSIS")) {
    throw new PlatformError("VALIDATION_FAILED", "AI analysis consent is required");
  }
  const artefact = snap.sourceArtefacts.find((item) => item.id === input.artefactId);
  if (!artefact || artefact.engagementId !== input.engagementId || artefact.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "source artefact was not found");
  }
  const segments = snap.sourceSegments.filter((item) => item.artefactId === artefact.id);
  const created: CandidateAssertion[] = [];
  for (const proposal of extractFixtureProposals(segments)) {
    assertProposalSupported(proposal, segments, input.engagementId, input.organisationId);
    assertHumanConfirmation(actorKind, "PROPOSED");
    const already = snap.candidateAssertions.find(
      (item) =>
        item.engagementId === input.engagementId &&
        item.topicKey === proposal.topicKey &&
        exactHash(item.structuredValue) === exactHash(proposal.value) &&
        item.sourceSegmentIds.join() === proposal.sourceSegmentIds.join(),
    );
    if (already) continue;
    const record: CandidateAssertion = {
      id: randomUUID(),
      engagementId: input.engagementId,
      kind: proposal.kind,
      topicKey: proposal.topicKey,
      structuredValue: proposal.value,
      narrative: nfc(proposal.rationale),
      sourceSegmentIds: [...proposal.sourceSegmentIds],
      assertedByParticipantId: segments[0]?.speakerParticipantId,
      capturedByPersonId: actorPersonId,
      origin: "AI_FIXTURE",
      directness: proposal.directness,
      confidence: proposal.confidence,
      rationale: nfc(proposal.rationale),
      confirmationState: "EXTRACTED",
      sensitivity: proposal.sensitivity,
      effectiveFrom: now,
      contentHash: exactHash({
        kind: proposal.kind,
        topicKey: proposal.topicKey,
        value: proposal.value,
        sourceSegmentIds: proposal.sourceSegmentIds,
      }),
      organisationId: input.organisationId,
      version: 1,
      ...stamp(now),
    };
    snap.candidateAssertions.push(record);
    created.push(record);
  }
  detectConflictsOnSnap(snap, input.engagementId, input.organisationId, now);
  refreshCoverageOnSnap(snap, input.engagementId, now);
  return created;
}

export function reviewAssertionOnSnap(
  snap: PlatformSnapshot,
  input: ReviewAssertionInput,
  now: string,
  actorPersonId: string,
  actorKind?: string,
): CandidateAssertion {
  const record = snap.candidateAssertions.find((item) => item.id === input.assertionId);
  if (!record || record.engagementId !== input.engagementId || record.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "candidate assertion was not found");
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale assertion review");
  }
  if (input.confirmationState) {
    assertHumanConfirmation(actorKind, input.confirmationState);
  }
  if (input.decision === "ACCEPT_STAFF_REVIEWED") {
    record.confirmationState = "STAFF_REVIEWED";
    record.version += 1;
    record.updatedAt = now;
    refreshCoverageOnSnap(snap, input.engagementId, now);
    return record;
  }
  if (input.decision === "REJECT") {
    record.confirmationState = "REJECTED";
    record.version += 1;
    record.updatedAt = now;
    refreshCoverageOnSnap(snap, input.engagementId, now);
    return record;
  }
  if (input.decision === "REQUEST_CLARIFICATION") {
    record.confirmationState = "DISPUTED";
    record.version += 1;
    record.updatedAt = now;
    return record;
  }
  const amended: CandidateAssertion = {
    ...record,
    id: randomUUID(),
    structuredValue: input.amendedValue ?? record.structuredValue,
    narrative: input.amendedNarrative ? nfc(input.amendedNarrative) : record.narrative,
    origin: "HUMAN",
    capturedByPersonId: actorPersonId,
    confirmationState: "PROPOSED",
    supersedesAssertionId: record.id,
    contentHash: exactHash({
      kind: record.kind,
      topicKey: record.topicKey,
      value: input.amendedValue ?? record.structuredValue,
      sourceSegmentIds: record.sourceSegmentIds,
    }),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  record.confirmationState = "SUPERSEDED";
  record.version += 1;
  record.updatedAt = now;
  snap.candidateAssertions.push(amended);
  detectConflictsOnSnap(snap, input.engagementId, input.organisationId, now);
  refreshCoverageOnSnap(snap, input.engagementId, now);
  return amended;
}

function valuesConflict(left: unknown, right: unknown): boolean {
  return exactHash(left) !== exactHash(right);
}

export function detectConflictsOnSnap(
  snap: PlatformSnapshot,
  engagementId: string,
  organisationId: string,
  now: string,
): AssertionConflict[] {
  const live = snap.candidateAssertions.filter(
    (item) =>
      item.engagementId === engagementId &&
      !["REJECTED", "SUPERSEDED"].includes(item.confirmationState),
  );
  const created: AssertionConflict[] = [];
  const byTopic = new Map<string, CandidateAssertion[]>();
  for (const assertion of live) {
    const list = byTopic.get(assertion.topicKey) ?? [];
    list.push(assertion);
    byTopic.set(assertion.topicKey, list);
  }
  for (const [topicKey, group] of byTopic) {
    if (group.length < 2) continue;
    const distinct = group.filter((item, index) =>
      group.findIndex((other) => exactHash(other.structuredValue) === exactHash(item.structuredValue)) === index,
    );
    if (distinct.length < 2) continue;
    const preferenceOnly = distinct.every((item) => item.kind === "PREFERENCE");
    if (preferenceOnly && distinct.every((item) => item.assertedByParticipantId !== distinct[0]?.assertedByParticipantId)) {
      continue;
    }
    const existing = snap.assertionConflicts.find(
      (item) => item.engagementId === engagementId && item.topicKey === topicKey && item.status === "OPEN",
    );
    if (existing) continue;
    const highImpact = topicKey === "guest.target_count" || topicKey === "event.date" || topicKey === "investment.envelope";
    const conflict: AssertionConflict = {
      id: randomUUID(),
      engagementId,
      topicKey,
      assertionIds: distinct.map((item) => item.id),
      sourceSegmentIds: [...new Set(distinct.flatMap((item) => item.sourceSegmentIds))],
      severity: highImpact ? "HIGH" : "MEDIUM",
      explanation: clarificationWording(topicKey, distinct),
      blockingGates: highImpact ? ["WORKING_BRIEF", "APPROVED_BRIEF"] : ["APPROVED_BRIEF"],
      status: "OPEN",
      clarificationWording: clarificationWording(topicKey, distinct),
      organisationId,
      version: 1,
      ...stamp(now),
    };
    snap.assertionConflicts.push(conflict);
    created.push(conflict);
  }
  return created;
}

export function clarificationWording(topicKey: string, assertions: readonly CandidateAssertion[]): string {
  if (topicKey === "guest.target_count") {
    const counts = assertions.map((item) => String((item.structuredValue as { count?: string })?.count ?? "unknown"));
    return `Earlier, ${counts[0]} guests was recorded as the preferred target. A later source suggests approximately ${counts[1]}. Which figure should now govern planning?`;
  }
  if (topicKey === "event.date") {
    const dates = assertions.map((item) => String((item.structuredValue as { date?: string })?.date ?? "unknown"));
    return `A date of ${dates[0]} was recorded. A later source names ${dates[1]}. Which date should now govern planning?`;
  }
  return `More than one ${topicKey} value is recorded. Both sources are preserved until an authorised person decides.`;
}

export function resolveConflictOnSnap(
  snap: PlatformSnapshot,
  input: ResolveConflictInput,
  now: string,
  actorPersonId: string,
): AssertionConflict {
  const conflict = snap.assertionConflicts.find((item) => item.id === input.conflictId);
  if (!conflict || conflict.engagementId !== input.engagementId || conflict.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "assertion conflict was not found");
  }
  if (conflict.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale conflict resolution");
  }
  conflict.resolution = input.resolution;
  conflict.decisionOwnerPersonId = actorPersonId;
  conflict.status = input.resolution === "REQUEST_CLARIFICATION" ? "CLARIFICATION_REQUIRED" : "RESOLVED";
  if (input.resolution === "SELECT" || input.resolution === "SUPERSEDE") {
    for (const assertionId of conflict.assertionIds) {
      const assertion = snap.candidateAssertions.find((item) => item.id === assertionId);
      if (!assertion) continue;
      assertion.confirmationState = assertionId === input.selectedAssertionId ? "STAFF_REVIEWED" : "SUPERSEDED";
      assertion.version += 1;
      assertion.updatedAt = now;
    }
  }
  conflict.version += 1;
  conflict.updatedAt = now;
  refreshCoverageOnSnap(snap, input.engagementId, now);
  return conflict;
}

export function refreshCoverageOnSnap(snap: PlatformSnapshot, engagementId: string, now: string): CoverageAssessment[] {
  const engagement = snap.discoveryEngagements.find((item) => item.id === engagementId);
  if (!engagement) return [];
  const opportunity = snap.engagementOpportunities.find((item) => item.id === engagement.opportunityId);
  const edition = snap.coverageCatalogueEditions.find((item) => item.organisationId === engagement.organisationId && item.current);
  if (!edition) return [];
  const requirements = snap.coverageRequirements.filter((item) => item.catalogueEditionId === edition.id);
  const assessments: CoverageAssessment[] = [];
  for (const requirement of requirements) {
    const applicable = evaluatePredicate(requirement.applicability, opportunity?.knownEventType);
    const assertions = snap.candidateAssertions.filter(
      (item) => item.engagementId === engagementId && item.topicKey === requirement.topicKey && item.confirmationState !== "REJECTED" && item.confirmationState !== "SUPERSEDED",
    );
    const conflicted = snap.assertionConflicts.some(
      (item) => item.engagementId === engagementId && item.topicKey === requirement.topicKey && item.status === "OPEN",
    );
    const stale = assertions.some((item) => item.effectiveUntil && item.effectiveUntil < now);
    let state: CoverageAssessment["state"] = "UNASSESSED";
    if (!applicable) state = "NOT_APPLICABLE";
    else if (conflicted) state = "CONFLICTED";
    else if (stale) state = "STALE";
    else if (assertions.some((item) => item.kind === "UNKNOWN" || item.kind === "NOT_APPLICABLE")) state = itemKindState(assertions);
    else if (assertions.some((item) => item.confirmationState === "STAFF_REVIEWED" || item.confirmationState === "CLIENT_CONFIRMED" || item.confirmationState === "GOVERNING")) {
      state = "CONFIRMED";
    } else if (assertions.length > 0) state = "ANSWERED_UNCONFIRMED";
    else if (requirement.earliestPhase === "WORKING_BRIEF" && !opportunity?.knownEventType) state = "NOT_YET_RELEVANT";
    const existing = snap.coverageAssessments.find(
      (item) => item.engagementId === engagementId && item.requirementId === requirement.id,
    );
    const next: CoverageAssessment = {
      id: existing?.id ?? randomUUID(),
      engagementId,
      requirementId: requirement.id,
      topicKey: requirement.topicKey,
      state,
      evidenceAssertionIds: assertions.map((item) => item.id),
      rankScore: String(rankGap(requirement, state, 0)),
      explanation: `${requirement.title} is ${state.replaceAll("_", " ").toLowerCase()}.`,
      organisationId: engagement.organisationId,
      version: (existing?.version ?? 0) + 1,
      schemaVersion: SCHEMA_VERSION,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) {
      Object.assign(existing, next);
      assessments.push(existing);
    } else {
      snap.coverageAssessments.push(next);
      assessments.push(next);
    }
  }
  completenessDimensions(assessments.map((item) => item.state));
  return assessments;
}

function itemKindState(assertions: readonly CandidateAssertion[]): CoverageAssessment["state"] {
  if (assertions.some((item) => item.kind === "NOT_APPLICABLE")) return "NOT_APPLICABLE";
  if (assertions.some((item) => item.kind === "UNKNOWN")) return "UNKNOWN";
  return "PARTIAL";
}

export { valuesConflict };
