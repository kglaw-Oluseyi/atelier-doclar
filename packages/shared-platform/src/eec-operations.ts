import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { completenessDimensions, evaluatePredicate, rankGap } from "./eec-coverage.js";
import { assertProposalSupported, extractFixtureProposals, sanitiseInertText } from "./eec-extraction.js";
import { assertHumanConfirmation, exactHash, nfc } from "./eec-hash.js";
import {
  disclosureClassFromSensitivity,
  resolveArtefactDisclosureClass,
} from "./eec-discovery-disclosure.js";
import type {
  AssertionConflict,
  CandidateAssertion,
  CoverageAssessment,
  CreateOpportunityInput,
  DiscoveryConsentRecord,
  DiscoveryDisclosureGrant,
  DiscoveryEngagement,
  DiscoveryParticipant,
  EngagementOpportunity,
  ExtractionDisposition,
  ExtractionInvocationResult,
  ExtractionOutcome,
  InterviewSession,
  SourceArtefact,
  SourceSegment,
  StartDiscoveryEngagementInput,
} from "./eec-schemas.js";
import {
  AddParticipantInputSchema,
  ExtractAssertionsInputSchema,
  GrantDiscoveryDisclosureInputSchema,
  RecordDiscoveryConsentInputSchema,
  RecordSourceArtefactInputSchema,
  ResolveConflictInputSchema,
  ReviewAssertionInputSchema,
  RevokeDiscoveryDisclosureInputSchema,
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
type GrantDiscoveryDisclosureInput = z.infer<typeof GrantDiscoveryDisclosureInputSchema>;
type RevokeDiscoveryDisclosureInput = z.infer<typeof RevokeDiscoveryDisclosureInputSchema>;
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
    throw new PlatformError("TRANSITION_INVALID", "conversion requires the explicit convert command");
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

function consentScopeMatches(item: DiscoveryConsentRecord, participantId?: string): boolean {
  if (participantId) return item.participantId === participantId;
  return item.participantId == null;
}

function latestConsent(
  snap: PlatformSnapshot,
  engagementId: string,
  dimension: DiscoveryConsentRecord["dimension"],
  participantId?: string,
): DiscoveryConsentRecord | undefined {
  return snap.discoveryConsentRecords
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.engagementId === engagementId &&
        item.dimension === dimension &&
        consentScopeMatches(item, participantId),
    )
    .sort((left, right) => {
      const decided = right.item.decidedAt.localeCompare(left.item.decidedAt);
      if (decided !== 0) return decided;
      const created = right.item.createdAt.localeCompare(left.item.createdAt);
      if (created !== 0) return created;
      return right.index - left.index;
    })[0]?.item;
}

export function latestConsentFor(
  snap: PlatformSnapshot,
  engagementId: string,
  dimension: DiscoveryConsentRecord["dimension"],
  participantId?: string,
  source?: DiscoveryConsentRecord["source"],
): DiscoveryConsentRecord | undefined {
  return snap.discoveryConsentRecords
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.engagementId === engagementId &&
        item.dimension === dimension &&
        consentScopeMatches(item, participantId) &&
        (source ? item.source === source : true),
    )
    .sort((left, right) => {
      const decided = right.item.decidedAt.localeCompare(left.item.decidedAt);
      if (decided !== 0) return decided;
      return right.index - left.index;
    })[0]?.item;
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

function requiresParticipationConsent(mode: InterviewSession["mode"]): boolean {
  return mode !== "OFFLINE_NOTES";
}

function assertSessionParticipationConsent(snap: PlatformSnapshot, session: InterviewSession): void {
  if (!requiresParticipationConsent(session.mode)) return;
  if (!consentIsActive(snap, session.engagementId, "PARTICIPATION")) {
    throw new PlatformError("VALIDATION_FAILED", "participation consent is required before the session can start");
  }
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
    source: "STAFF",
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
  if (input.action === "START" || input.action === "RESUME") {
    assertSessionParticipationConsent(snap, record);
  }
  if (input.action === "RESUME" && record.status === "ACTIVE") {
    return record;
  }
  if (!SESSION_TRANSITIONS[record.status]?.includes(target)) {
    throw new PlatformError("TRANSITION_INVALID", `session cannot move from ${record.status} to ${target}`);
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
  if (input.objectKey && /^https?:\/\//i.test(input.objectKey)) {
    throw new PlatformError("VALIDATION_FAILED", "source objects cannot be stored as public URLs");
  }
  const text = sanitiseInertText(input.text);
  const artefact: SourceArtefact = {
    id: randomUUID(),
    engagementId: input.engagementId,
    sessionId: input.sessionId,
    kind: input.kind,
    title: nfc(input.title),
    contentSafetyStatus: input.contentSafetyStatus ?? "CLEAN",
    objectKey: input.objectKey,
    byteChecksum: input.byteChecksum,
    language: input.language,
    disclosureClass: input.disclosureClass ?? "OPERATIONAL",
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

function sourceContentHashFor(artefact: SourceArtefact, segments: readonly SourceSegment[]): string {
  return exactHash({
    artefactId: artefact.id,
    version: artefact.version,
    segments: segments.map((item) => ({ id: item.id, contentHash: item.contentHash })),
  });
}

function countDispositions(dispositions: readonly ExtractionDisposition[]) {
  return {
    consideredCount: new Set(dispositions.map((item) => item.sourceSegmentId)).size,
    proposedCount: dispositions.filter((item) => item.kind === "ASSERTION_PROPOSED").length,
    duplicateCount: dispositions.filter((item) => item.kind === "DUPLICATE_SUPPORTED").length,
    noMaterialCount: dispositions.filter((item) => item.kind === "NO_MATERIAL_ASSERTION").length,
    needsReviewCount: dispositions.filter((item) => item.kind === "NEEDS_HUMAN_REVIEW").length,
    rejectedCount: dispositions.filter((item) => item.kind === "REJECTED_UNSUPPORTED").length,
    failureCount: 0,
  };
}

export function toExtractionInvocation(outcome: ExtractionOutcome, replayed: boolean, invocationId = randomUUID()): ExtractionInvocationResult {
  return {
    ...outcome,
    invocationId,
    extractionRunId: outcome.id,
    replayed,
    sourceVersion: outcome.artefactVersion,
    newlyProposedCount: replayed ? 0 : outcome.proposedCount,
    existingLinkedCount: replayed ? outcome.proposedCount + outcome.duplicateCount : outcome.duplicateCount,
    noMaterialAssertionCount: outcome.noMaterialCount,
    needsHumanReviewCount: outcome.needsReviewCount,
    failedCount: outcome.failureCount,
  };
}

export function isExtractionInvocationResult(value: object): value is ExtractionInvocationResult {
  return "replayed" in value && "newlyProposedCount" in value && "invocationId" in value;
}

export function formatExtractionInvocationReceipt(invocation: ExtractionInvocationResult): string {
  const counts = `Considered ${invocation.consideredCount}: ${invocation.newlyProposedCount} new proposal${
    invocation.newlyProposedCount === 1 ? "" : "s"
  }, ${invocation.existingLinkedCount} existing, ${invocation.noMaterialAssertionCount} unmatched, ${invocation.needsHumanReviewCount} need review, ${invocation.rejectedCount} rejected.`;
  if (invocation.replayed || (invocation.newlyProposedCount === 0 && invocation.existingLinkedCount > 0)) {
    return `No new proposals — the existing proposal is already linked to this source. ${counts}`;
  }
  if (invocation.newlyProposedCount === 0) {
    return `Extraction completed — no proposals created. ${counts}`;
  }
  return counts;
}

export function findDurableExtractionOutcome(snap: PlatformSnapshot, artefactId: string): ExtractionOutcome | undefined {
  const artefact = snap.sourceArtefacts.find((item) => item.id === artefactId);
  if (!artefact) return undefined;
  const segments = snap.sourceSegments.filter((item) => item.artefactId === artefact.id);
  const contentHash = sourceContentHashFor(artefact, segments);
  return snap.extractionOutcomes.find(
    (item) => item.artefactId === artefact.id && item.artefactVersion === artefact.version && item.sourceContentHash === contentHash,
  );
}

export function extractAssertionsOnSnap(
  snap: PlatformSnapshot,
  input: ExtractAssertionsInput,
  now: string,
  actorPersonId: string,
  actorKind?: string,
  options?: { providerMode?: "DETERMINISTIC" | "UNAVAILABLE" | "MALFORMED" },
): ExtractionInvocationResult {
  if (!consentIsActive(snap, input.engagementId, "AI_ANALYSIS")) {
    throw new PlatformError("VALIDATION_FAILED", "AI analysis consent is required");
  }
  const artefact = snap.sourceArtefacts.find((item) => item.id === input.artefactId);
  if (!artefact || artefact.engagementId !== input.engagementId || artefact.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "source artefact was not found");
  }
  if (input.expectedVersion > 0 && artefact.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale source version cannot be reported as extracted");
  }
  const segments = snap.sourceSegments.filter((item) => item.artefactId === artefact.id);
  const contentHash = sourceContentHashFor(artefact, segments);
  const existingOutcome = snap.extractionOutcomes.find(
    (item) =>
      item.artefactId === artefact.id &&
      item.artefactVersion === artefact.version &&
      item.sourceContentHash === contentHash,
  );
  if (existingOutcome) {
    return toExtractionInvocation(existingOutcome, true);
  }
  if (options?.providerMode === "UNAVAILABLE") {
    const dispositions: ExtractionDisposition[] = segments.map((segment) => ({
      kind: "NEEDS_HUMAN_REVIEW" as const,
      sourceSegmentId: segment.id,
      explanationCode: "PROVIDER_UNAVAILABLE",
      safeSummary: "The fixture extractor was unavailable. The original source is unchanged.",
    }));
    const outcome: ExtractionOutcome = {
      id: randomUUID(),
      engagementId: input.engagementId,
      artefactId: artefact.id,
      artefactVersion: artefact.version,
      sourceContentHash: contentHash,
      dispositions,
      ...countDispositions(dispositions),
      failureCount: 1,
      idempotencyKey: input.idempotencyKey,
      organisationId: input.organisationId,
      version: 1,
      ...stamp(now),
    };
    snap.extractionOutcomes.push(outcome);
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "fixture provider is unavailable");
  }
  if (options?.providerMode === "MALFORMED") {
    const dispositions: ExtractionDisposition[] = segments.map((segment) => ({
      kind: "REJECTED_UNSUPPORTED" as const,
      sourceSegmentId: segment.id,
      explanationCode: "MALFORMED_PROVIDER_OUTPUT",
    }));
    const outcome: ExtractionOutcome = {
      id: randomUUID(),
      engagementId: input.engagementId,
      artefactId: artefact.id,
      artefactVersion: artefact.version,
      sourceContentHash: contentHash,
      dispositions,
      ...countDispositions(dispositions),
      failureCount: 1,
      idempotencyKey: input.idempotencyKey,
      organisationId: input.organisationId,
      version: 1,
      ...stamp(now),
    };
    snap.extractionOutcomes.push(outcome);
    return toExtractionInvocation(outcome, false);
  }
  const created: CandidateAssertion[] = [];
  const dispositions: ExtractionDisposition[] = [];
  const proposalsBySegment = new Map<string, number>();
  for (const proposal of extractFixtureProposals(segments)) {
    const sourceSegmentId = proposal.sourceSegmentIds[0];
    if (!sourceSegmentId) continue;
    try {
      assertProposalSupported(proposal, segments, input.engagementId, input.organisationId);
      assertHumanConfirmation(actorKind, "PROPOSED");
    } catch (error) {
      dispositions.push({
        kind: "REJECTED_UNSUPPORTED",
        sourceSegmentId,
        explanationCode: error instanceof PlatformError ? error.code : "UNSUPPORTED_CITATION",
      });
      continue;
    }
    const already = snap.candidateAssertions.find(
      (item) =>
        item.engagementId === input.engagementId &&
        item.topicKey === proposal.topicKey &&
        exactHash(item.structuredValue) === exactHash(proposal.value) &&
        item.sourceSegmentIds.join() === proposal.sourceSegmentIds.join(),
    );
    if (already) {
      dispositions.push({
        kind: "DUPLICATE_SUPPORTED",
        sourceSegmentId,
        existingAssertionId: already.id,
        explanationCode: "IDEMPOTENT_RETRY",
      });
      proposalsBySegment.set(sourceSegmentId, (proposalsBySegment.get(sourceSegmentId) ?? 0) + 1);
      continue;
    }
    const record: CandidateAssertion = {
      id: randomUUID(),
      engagementId: input.engagementId,
      kind: proposal.kind,
      topicKey: proposal.topicKey,
      structuredValue: proposal.value,
      narrative: nfc(proposal.rationale),
      sourceSegmentIds: [...proposal.sourceSegmentIds],
      assertedByParticipantId: segments.find((item) => item.id === sourceSegmentId)?.speakerParticipantId ?? segments[0]?.speakerParticipantId,
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
    dispositions.push({
      kind: "ASSERTION_PROPOSED",
      sourceSegmentId,
      assertionId: record.id,
    });
    proposalsBySegment.set(sourceSegmentId, (proposalsBySegment.get(sourceSegmentId) ?? 0) + 1);
    const nextClass = disclosureClassFromSensitivity(proposal.sensitivity);
    if (nextClass !== "OPERATIONAL" && resolveArtefactDisclosureClass(artefact) === "OPERATIONAL") {
      artefact.disclosureClass = nextClass;
      artefact.updatedAt = now;
    }
  }
  for (const segment of segments) {
    if (proposalsBySegment.has(segment.id)) continue;
    if (INJECTION_MARKERS_LOCAL.test(segment.text)) {
      dispositions.push({
        kind: "REJECTED_UNSUPPORTED",
        sourceSegmentId: segment.id,
        explanationCode: "INJECTION_MARKER",
      });
      continue;
    }
    dispositions.push({
      kind: "NO_MATERIAL_ASSERTION",
      sourceSegmentId: segment.id,
      explanationCode: "NO_SUPPORTED_PATTERN",
    });
  }
  const createdConflicts = detectConflictsOnSnap(snap, input.engagementId, input.organisationId, now);
  refreshCoverageOnSnap(snap, input.engagementId, now);
  const raced = snap.extractionOutcomes.find(
    (item) =>
      item.artefactId === artefact.id &&
      item.artefactVersion === artefact.version &&
      item.sourceContentHash === contentHash,
  );
  if (raced) {
    for (const record of created) {
      const index = snap.candidateAssertions.findIndex((item) => item.id === record.id);
      if (index >= 0) snap.candidateAssertions.splice(index, 1);
    }
    for (const conflict of createdConflicts) {
      const index = snap.assertionConflicts.findIndex((item) => item.id === conflict.id);
      if (index >= 0) snap.assertionConflicts.splice(index, 1);
    }
    refreshCoverageOnSnap(snap, input.engagementId, now);
    return toExtractionInvocation(raced, true);
  }
  const outcome: ExtractionOutcome = {
    id: randomUUID(),
    engagementId: input.engagementId,
    artefactId: artefact.id,
    artefactVersion: artefact.version,
    sourceContentHash: contentHash,
    dispositions,
    ...countDispositions(dispositions),
    idempotencyKey: input.idempotencyKey,
    organisationId: input.organisationId,
    version: 1,
    ...stamp(now),
  };
  snap.extractionOutcomes.push(outcome);
  return toExtractionInvocation(outcome, false);
}

const INJECTION_MARKERS_LOCAL = /ignore (all|previous) instructions|system prompt|<script|javascript:/i;

export function grantDiscoveryDisclosureOnSnap(
  snap: PlatformSnapshot,
  input: GrantDiscoveryDisclosureInput,
  now: string,
  actorPersonId: string,
): DiscoveryDisclosureGrant {
  const grant: DiscoveryDisclosureGrant = {
    id: randomUUID(),
    organisationId: input.organisationId,
    engagementId: input.engagementId,
    personId: input.personId,
    disclosureClass: input.disclosureClass,
    grantedByPersonId: actorPersonId,
    expiresAt: input.expiresAt,
    reason: input.reason,
    version: 1,
    ...stamp(now),
  };
  snap.discoveryDisclosureGrants.push(grant);
  return grant;
}

export function revokeDiscoveryDisclosureOnSnap(
  snap: PlatformSnapshot,
  input: RevokeDiscoveryDisclosureInput,
  now: string,
): DiscoveryDisclosureGrant {
  const grant = snap.discoveryDisclosureGrants.find((item) => item.id === input.grantId && item.organisationId === input.organisationId);
  if (!grant) throw new PlatformError("NOT_FOUND", "disclosure grant was not found");
  if (grant.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale disclosure grant");
  }
  grant.revokedAt = now;
  grant.revokeReason = input.revokeReason;
  grant.version += 1;
  grant.updatedAt = now;
  return grant;
}

export type BudgetGuestCountSource =
  | {
      kind: "CURRENT_BRIEF";
      count: string;
      value: number;
      editionId: string;
      briefEditionId: string;
      contentHash: string;
      briefContentHash: string;
      assertionId: string;
      confirmedAt: string;
    }
  | { kind: "BRIEF_NOT_CURRENT"; latestBriefState: "WORKING" | "SUBMITTED" | "APPROVED_UNPUBLISHED" }
  | { kind: "UNRESOLVED_CONTRADICTION" }
  | { kind: "UNKNOWN" }
  | { kind: "NOT_APPLICABLE" };

export function governingGuestCountFromBrief(snap: PlatformSnapshot, engagementId: string): BudgetGuestCountSource {
  const openConflict = snap.assertionConflicts.find(
    (item) => item.engagementId === engagementId && item.topicKey === "guest.target_count" && item.status === "OPEN",
  );
  if (openConflict) return { kind: "UNRESOLVED_CONTRADICTION" };
  const currentEdition = [...snap.eventBriefEditions]
    .reverse()
    .find((item) => item.engagementId === engagementId && item.current);
  const eligibleEdition =
    currentEdition && (currentEdition.status === "APPROVED" || currentEdition.status === "PUBLISHED") ? currentEdition : undefined;
  if (eligibleEdition) {
    const assertions = snap.candidateAssertions.filter(
      (item) =>
        eligibleEdition.assertionIds.includes(item.id) &&
        item.topicKey === "guest.target_count" &&
        ["CLIENT_CONFIRMED", "GOVERNING", "STAFF_REVIEWED"].includes(item.confirmationState),
    );
    const counts = [...new Set(assertions.map((item) => String((item.structuredValue as { count?: string })?.count ?? "")))].filter(
      Boolean,
    );
    if (counts.length === 1 && assertions[0]) {
      return {
        kind: "CURRENT_BRIEF",
        count: counts[0]!,
        value: Number(counts[0]),
        editionId: eligibleEdition.id,
        briefEditionId: eligibleEdition.id,
        contentHash: eligibleEdition.contentHash,
        briefContentHash: eligibleEdition.contentHash,
        assertionId: assertions[0].id,
        confirmedAt: eligibleEdition.updatedAt,
      };
    }
    if (counts.length > 1) return { kind: "UNRESOLVED_CONTRADICTION" };
    return { kind: "UNKNOWN" };
  }
  if (currentEdition?.status === "SUBMITTED") {
    return { kind: "BRIEF_NOT_CURRENT", latestBriefState: "SUBMITTED" };
  }
  const draft = snap.eventBriefDrafts.find((item) => item.engagementId === engagementId);
  if (draft) {
    return { kind: "BRIEF_NOT_CURRENT", latestBriefState: "WORKING" };
  }
  return { kind: "UNKNOWN" };
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
    return `Approximately ${counts[0]} guests and approximately ${counts[1]} guests are both recorded. Which figure should now govern planning?`;
  }
  if (topicKey === "event.date") {
    const dates = assertions.map((item) => String((item.structuredValue as { date?: string })?.date ?? "unknown"));
    return `A date of ${dates[0]} and a date of ${dates[1]} are both recorded. Which date should now govern planning?`;
  }
  return `More than one ${topicKey} value is recorded. Both sources are preserved until an authorised person decides.`;
}

export function resolveConflictOnSnap(
  snap: PlatformSnapshot,
  input: ResolveConflictInput,
  now: string,
  actorPersonId: string,
  actorKind?: string,
): AssertionConflict {
  if (actorKind === "AI") {
    throw new PlatformError("AI_AUTHORITY_FORBIDDEN", "AI-origin commands cannot decide a governing contradiction");
  }
  const conflict = snap.assertionConflicts.find((item) => item.id === input.conflictId);
  if (!conflict || conflict.engagementId !== input.engagementId || conflict.organisationId !== input.organisationId) {
    throw new PlatformError("NOT_FOUND", "assertion conflict was not found");
  }
  if (conflict.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "stale conflict resolution");
  }
  if (input.resolution === "COEXIST" || input.resolution === "SCOPE_SEPARATE") {
    if (conflict.status === "RESOLVED" && conflict.resolution === input.resolution) return conflict;
    if (conflict.status === "RESOLVED") {
      throw new PlatformError("VALIDATION_FAILED", "contradiction is already resolved");
    }
    conflict.resolution = input.resolution;
    conflict.status = "RESOLVED";
    conflict.decisionOwnerPersonId = actorPersonId;
    conflict.resolutionReason = input.reason;
    conflict.version += 1;
    conflict.updatedAt = now;
    refreshCoverageOnSnap(snap, input.engagementId, now);
    return conflict;
  }
  const liveDistinct = liveDistinctAssertionsForTopic(snap, input.engagementId, conflict.topicKey);
  const liveIds = new Set(liveDistinct.map((item) => item.id));
  const conflictIds = new Set(conflict.assertionIds);
  if (liveIds.size !== conflictIds.size || [...liveIds].some((id) => !conflictIds.has(id))) {
    throw new PlatformError("VERSION_CONFLICT", "stale candidate set cannot be decided");
  }
  const parsed = parseConflictDecision(input, conflict);
  if (conflict.status === "RESOLVED") {
    const sameGoverning =
      parsed.kind === "SELECT_GOVERNING_ASSERTION" &&
      conflict.governingAssertionId === parsed.governingAssertionId &&
      sameIdSet(conflict.supersededAssertionIds ?? [], parsed.supersededAssertionIds);
    if (sameGoverning) return conflict;
    throw new PlatformError("VALIDATION_FAILED", "contradiction is already resolved");
  }
  if (parsed.kind === "KEEP_UNRESOLVED") {
    conflict.resolution = "REQUEST_CLARIFICATION";
    conflict.status = "CLARIFICATION_REQUIRED";
    conflict.decisionOwnerPersonId = actorPersonId;
    conflict.resolutionReason = input.reason;
    conflict.version += 1;
    conflict.updatedAt = now;
    refreshCoverageOnSnap(snap, input.engagementId, now);
    return conflict;
  }
  applyGoverningDecision(snap, conflict, parsed.governingAssertionId, parsed.supersededAssertionIds, now);
  conflict.resolution = input.resolution === "SELECT" ? "SELECT" : "SUPERSEDE";
  conflict.status = "RESOLVED";
  conflict.decisionOwnerPersonId = actorPersonId;
  conflict.governingAssertionId = parsed.governingAssertionId;
  conflict.supersededAssertionIds = parsed.supersededAssertionIds;
  conflict.resolutionReason = input.reason;
  conflict.version += 1;
  conflict.updatedAt = now;
  refreshCoverageOnSnap(snap, input.engagementId, now);
  return conflict;
}

function liveDistinctAssertionsForTopic(snap: PlatformSnapshot, engagementId: string, topicKey: string): CandidateAssertion[] {
  const live = snap.candidateAssertions.filter(
    (item) => item.engagementId === engagementId && item.topicKey === topicKey && !["REJECTED", "SUPERSEDED"].includes(item.confirmationState),
  );
  return live.filter(
    (item, index) => live.findIndex((other) => exactHash(other.structuredValue) === exactHash(item.structuredValue)) === index,
  );
}

function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function parseConflictDecision(
  input: ResolveConflictInput,
  conflict: AssertionConflict,
):
  | { kind: "KEEP_UNRESOLVED" }
  | { kind: "SELECT_GOVERNING_ASSERTION"; governingAssertionId: string; supersededAssertionIds: string[] } {
  if (input.decision?.kind === "KEEP_UNRESOLVED" || input.resolution === "REQUEST_CLARIFICATION") {
    return { kind: "KEEP_UNRESOLVED" };
  }
  if (input.decision?.kind === "SELECT_GOVERNING_ASSERTION") {
    validateGoverningChoice(conflict, input.decision.governingAssertionId, input.decision.supersededAssertionIds);
    return {
      kind: "SELECT_GOVERNING_ASSERTION",
      governingAssertionId: input.decision.governingAssertionId,
      supersededAssertionIds: input.decision.supersededAssertionIds,
    };
  }
  const governingAssertionId = input.selectedAssertionId;
  if (!governingAssertionId) {
    throw new PlatformError("VALIDATION_FAILED", "a governing assertion identity is required");
  }
  const supersededAssertionIds = conflict.assertionIds.filter((id) => id !== governingAssertionId);
  validateGoverningChoice(conflict, governingAssertionId, supersededAssertionIds);
  return { kind: "SELECT_GOVERNING_ASSERTION", governingAssertionId, supersededAssertionIds };
}

function validateGoverningChoice(conflict: AssertionConflict, governingAssertionId: string, supersededAssertionIds: readonly string[]): void {
  const conflictIds = new Set(conflict.assertionIds);
  if (!conflictIds.has(governingAssertionId)) {
    throw new PlatformError("VALIDATION_FAILED", "governing assertion is not a candidate of this contradiction");
  }
  if (supersededAssertionIds.includes(governingAssertionId)) {
    throw new PlatformError("VALIDATION_FAILED", "governing assertion cannot also be superseded");
  }
  for (const id of supersededAssertionIds) {
    if (!conflictIds.has(id)) {
      throw new PlatformError("VALIDATION_FAILED", "superseded assertion is not a candidate of this contradiction");
    }
  }
  const covered = new Set([governingAssertionId, ...supersededAssertionIds]);
  if (![...conflictIds].every((id) => covered.has(id))) {
    throw new PlatformError("VALIDATION_FAILED", "decision must cover the competing candidates");
  }
}

function applyGoverningDecision(
  snap: PlatformSnapshot,
  conflict: AssertionConflict,
  governingAssertionId: string,
  supersededAssertionIds: readonly string[],
  now: string,
): void {
  for (const assertionId of conflict.assertionIds) {
    const assertion = snap.candidateAssertions.find(
      (item) =>
        item.id === assertionId && item.engagementId === conflict.engagementId && item.organisationId === conflict.organisationId,
    );
    if (!assertion) {
      throw new PlatformError("VALIDATION_FAILED", "decision cannot manufacture a candidate value");
    }
    assertion.confirmationState = assertionId === governingAssertionId ? "STAFF_REVIEWED" : "SUPERSEDED";
    if (assertionId !== governingAssertionId && !supersededAssertionIds.includes(assertionId)) {
      throw new PlatformError("VALIDATION_FAILED", "decision must cover the competing candidates");
    }
    assertion.version += 1;
    assertion.updatedAt = now;
  }
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
