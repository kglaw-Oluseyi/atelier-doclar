import { createHash, randomUUID } from "node:crypto";
import {
  DEFAULT_PARAMETER_SET_VERSION,
  FORECAST_MODEL_VERSION,
  FORECAST_POLICY_VERSION,
  FORECAST_STALE_AFTER_MS,
  PROHIBITED_FORECAST_TRAIT_KEYS,
  SCHEMA_VERSION,
} from "./constants.js";
import { PlatformError } from "./errors.js";
import { personHasCeoOrganisationWide } from "./risk-command.js";
import {
  AttendanceForecastRunSchema,
  CalibrationObservationSchema,
  ConfidenceAssessmentSchema,
  ForecastEstimateSchema,
  ForecastEvaluationSchema,
  ForecastOverrideSchema,
  ForecastPolicySchema,
  ForecastPopulationMemberSchema,
  ModelParameterSetSchema,
  OperationalProvisionRecommendationSchema,
  UncertaintyDriverSchema,
  type ApproveHostProjectionInput,
  type AttendanceForecastRun,
  type CreateEventParameterSetInput,
  type DecideForecastOverrideInput,
  type DecideProvisionInput,
  type EvaluateForecastInput,
  type ForecastEstimate,
  type ForecastOverride,
  type ModelParameterSet,
  type OperationalProvisionRecommendation,
  type ProposeForecastOverrideInput,
  type ProposeProvisionInput,
  type RecordCalibrationObservationInput,
  type RunAttendanceForecastInput,
} from "./forecast-schemas.js";
import {
  classifyAttendanceIntent,
  computeForecast,
  currentInputChecksum,
  memberProbabilities,
  type ForecastEligiblePerson,
  type ForecastPopulationInput,
  type ForecastUnnamedAllowance,
} from "./forecast-model.js";
import { requireScopedEvent } from "./programme-operations.js";
import { stableHash } from "./redaction.js";
import type { PlatformSnapshot } from "./store.js";

export const DEFAULT_FORECAST_POLICY_ID = "00000000-0000-4000-8000-0000000000f1" as const;
export const DEFAULT_PARAMETER_SET_ID = "00000000-0000-4000-8000-0000000000f2" as const;

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function prohibitedForecastPayload(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const keys = Object.keys(raw as Record<string, unknown>);
  for (const key of keys) {
    const lower = key.toLowerCase();
    if ((PROHIBITED_FORECAST_TRAIT_KEYS as readonly string[]).some((item) => lower.includes(item.toLowerCase()))) {
      return key;
    }
  }
  return undefined;
}

export function assertNoProhibitedForecastFields(raw: unknown): void {
  const key = prohibitedForecastPayload(raw);
  if (key) {
    throw new PlatformError("VALIDATION_FAILED", "sensitive-trait inference is not permitted in attendance forecasting", {
      field: key,
    });
  }
}

export function defaultForecastPolicy(organisationId: string, now: string, ownerPersonId: string) {
  return ForecastPolicySchema.parse({
    id: DEFAULT_FORECAST_POLICY_ID,
    organisationId,
    name: "Maison Doclar provisional attendance policy",
    status: "ACTIVE",
    policyVersion: FORECAST_POLICY_VERSION,
    localityLabel: "PROVISIONAL_DEFAULT_NOT_LAGOS_FACT",
    explanation:
      "Provisional governed defaults for cold-start forecasting. These rates are not a claim about Lagos, Nigeria, or any community.",
    effectiveFrom: now,
    ownerPersonId,
    ...versioned(now),
  });
}

export function defaultModelParameterSet(organisationId: string, now: string, ownerPersonId: string): ModelParameterSet {
  return ModelParameterSetSchema.parse({
    id: DEFAULT_PARAMETER_SET_ID,
    organisationId,
    policyId: DEFAULT_FORECAST_POLICY_ID,
    parameterSetVersion: DEFAULT_PARAMETER_SET_VERSION,
    applicability: "GLOBAL",
    status: "ACTIVE",
    yesBand: { low: 0.85, central: 0.9, high: 0.95 },
    noResponseBand: { low: 0.3, central: 0.4, high: 0.5 },
    noBand: { low: 0, central: 0.05, high: 0.1 },
    unnamedEntitlementBand: { low: 0.2, central: 0.5, high: 0.8 },
    localityLabel: "PROVISIONAL_DEFAULT_NOT_LAGOS_FACT",
    explanation:
      "Transparent starting bands. Yes is never treated as certain. No-response widens uncertainty. Unnamed allowances are occupancy uncertainty, not people.",
    source: "EOS-S04D governed default",
    effectiveFrom: now,
    ownerPersonId,
    ...versioned(now),
  });
}

function requireEvent(snap: PlatformSnapshot, organisationId: string, eventId: string) {
  const event = requireScopedEvent(snap, organisationId, eventId);
  if (event.organisationId !== organisationId) {
    throw new PlatformError("SCOPE_MISMATCH", "event is outside this organisation");
  }
  return event;
}

function activeParameterSet(snap: PlatformSnapshot, organisationId: string, eventId: string): ModelParameterSet {
  const eventSet = snap.modelParameterSets.find(
    (item) =>
      item.organisationId === organisationId &&
      item.eventId === eventId &&
      item.applicability === "EVENT" &&
      item.status === "ACTIVE",
  );
  if (eventSet) return eventSet;
  const globalSet = snap.modelParameterSets.find(
    (item) => item.organisationId === organisationId && item.applicability === "GLOBAL" && item.status === "ACTIVE",
  );
  if (!globalSet) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "no active forecast parameter set is available");
  }
  return globalSet;
}

function latestSubmittedIntent(snap: PlatformSnapshot, eventId: string, guestId: string): { intent?: string; hasResponse: boolean } {
  const responses = snap.rsvpResponses
    .filter(
      (item) =>
        item.eventId === eventId &&
        item.guestId === guestId &&
        (item.status === "SUBMITTED" || item.status === "AMENDED"),
    )
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const latest = responses[0];
  if (!latest) return { hasResponse: false };
  return { intent: latest.attendanceIntent, hasResponse: true };
}

export function buildForecastPopulation(snap: PlatformSnapshot, organisationId: string, eventId: string, asOf: string): ForecastPopulationInput {
  const event = requireEvent(snap, organisationId, eventId);
  if (event.id !== eventId) {
    throw new PlatformError("SCOPE_MISMATCH", "cross-event forecast inputs are refused");
  }
  const entitlements = snap.phaseEntitlements.filter(
    (item) =>
      item.organisationId === organisationId &&
      item.eventId === eventId &&
      item.subjectType === "GUEST" &&
      item.status === "ACTIVE",
  );
  const peopleByGuest = new Map<string, ForecastEligiblePerson>();
  for (const entitlement of entitlements) {
    if (entitlement.eventId !== eventId) {
      throw new PlatformError("SCOPE_MISMATCH", "cross-event phase entitlements are refused");
    }
    const guest = snap.operationalGuests.find((item) => item.id === entitlement.subjectId);
    if (!guest || guest.eventId !== eventId || guest.organisationId !== organisationId) {
      throw new PlatformError("SCOPE_MISMATCH", "phase entitlement guest is outside this event");
    }
    const existing = peopleByGuest.get(guest.id);
    const classified = latestSubmittedIntent(snap, eventId, guest.id);
    const rsvpClass = classifyAttendanceIntent(classified.intent, classified.hasResponse);
    if (!existing) {
      peopleByGuest.set(guest.id, {
        guestId: guest.id,
        phaseIds: [entitlement.phaseId],
        rsvpClass,
        inclusionReason: "Active phase entitlement for a distinct guestId",
      });
    } else if (!existing.phaseIds.includes(entitlement.phaseId)) {
      peopleByGuest.set(guest.id, { ...existing, phaseIds: [...existing.phaseIds, entitlement.phaseId] });
    }
  }
  const unnamed: ForecastUnnamedAllowance[] = [];
  for (const entitlement of snap.companionEntitlements.filter(
    (item) => item.organisationId === organisationId && item.eventId === eventId && item.status === "AVAILABLE" && item.allowance > 0,
  )) {
    if (entitlement.nominatedGuestId) {
      throw new PlatformError("VALIDATION_FAILED", "an unnamed allowance must not carry a fabricated guestId");
    }
    const principal = peopleByGuest.get(entitlement.principalGuestId);
    unnamed.push({
      entitlementId: entitlement.id,
      principalGuestId: entitlement.principalGuestId,
      allowance: entitlement.allowance,
      phaseIds: principal?.phaseIds ?? [],
      inclusionReason: "Unresolved unnamed companion allowance — occupancy uncertainty only",
    });
  }
  return {
    eventId,
    asOf,
    people: [...peopleByGuest.values()],
    unnamed,
  };
}

export function phaseEligibleGuestIds(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  phaseId: string,
): string[] {
  const ids = new Set<string>();
  for (const entitlement of snap.phaseEntitlements) {
    if (
      entitlement.organisationId === organisationId &&
      entitlement.eventId === eventId &&
      entitlement.phaseId === phaseId &&
      entitlement.subjectType === "GUEST" &&
      entitlement.status === "ACTIVE"
    ) {
      ids.add(entitlement.subjectId);
    }
  }
  return [...ids].sort();
}

export function coreTruthFingerprint(snap: PlatformSnapshot, eventId: string): string {
  return stableHash({
    guests: snap.operationalGuests.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, version: item.version })),
    rsvp: snap.rsvpResponses.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, version: item.version, intent: item.attendanceIntent })),
    invitations: snap.rsvpInvitations.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, version: item.version })),
    credentials: snap.credentialProjections.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, version: item.version })),
    entitlements: snap.phaseEntitlements.filter((item) => item.eventId === eventId).map((item) => ({ id: item.id, version: item.version })),
  });
}

function sourceRefs(snap: PlatformSnapshot, eventId: string): Array<{ collection: string; id: string; version: number }> {
  const refs: Array<{ collection: string; id: string; version: number }> = [];
  for (const guest of snap.operationalGuests.filter((item) => item.eventId === eventId)) {
    refs.push({ collection: "operationalGuests", id: guest.id, version: guest.version });
  }
  for (const response of snap.rsvpResponses.filter((item) => item.eventId === eventId)) {
    refs.push({ collection: "rsvpResponses", id: response.id, version: response.version });
  }
  for (const entitlement of snap.phaseEntitlements.filter((item) => item.eventId === eventId && item.status === "ACTIVE")) {
    refs.push({ collection: "phaseEntitlements", id: entitlement.id, version: entitlement.version });
  }
  for (const entitlement of snap.companionEntitlements.filter((item) => item.eventId === eventId)) {
    refs.push({ collection: "companionEntitlements", id: entitlement.id, version: entitlement.version });
  }
  return refs;
}

export function runAttendanceForecastOnSnap(
  snap: PlatformSnapshot,
  input: RunAttendanceForecastInput,
  now: string,
  actorPersonId: string,
): AttendanceForecastRun {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const before = coreTruthFingerprint(snap, event.id);
  const parameters = activeParameterSet(snap, input.organisationId, event.id);
  if (parameters.status !== "ACTIVE") {
    throw new PlatformError("VALIDATION_FAILED", "the selected parameter set is not active");
  }
  const policy = snap.forecastPolicies.find((item) => item.id === parameters.policyId && item.status === "ACTIVE");
  if (!policy) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "forecast policy is unavailable");
  }
  const population = buildForecastPopulation(snap, input.organisationId, event.id, now);
  const computed = computeForecast(population, parameters, now);
  const runId = randomUUID();
  const inputSnapshotId = createHash("sha256").update(`${runId}:${computed.populationChecksum}`).digest("hex").slice(0, 32);
  const inputSnapshotUuid = `${inputSnapshotId.slice(0, 8)}-${inputSnapshotId.slice(8, 12)}-4${inputSnapshotId.slice(13, 16)}-8${inputSnapshotId.slice(17, 20)}-${inputSnapshotId.slice(20, 32)}`;
  const previous = snap.attendanceForecastRuns
    .filter((item) => item.eventId === event.id && item.status === "SUCCEEDED")
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  if (previous) {
    previous.status = "SUPERSEDED";
    previous.updatedAt = now;
    previous.version += 1;
  }
  const run = AttendanceForecastRunSchema.parse({
    id: runId,
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    asOf: now,
    modelVersion: FORECAST_MODEL_VERSION,
    policyId: policy.id,
    parameterSetId: parameters.id,
    parameterSetVersion: parameters.parameterSetVersion,
    inputSnapshotId: inputSnapshotUuid,
    populationChecksum: computed.populationChecksum,
    sourceRefs: sourceRefs(snap, event.id),
    observedRsvp: {
      yes: computed.programmePeople.observedYes,
      no: computed.programmePeople.observedNo,
      noResponse: computed.programmePeople.observedNoResponse,
      unknown: computed.programmePeople.observedUnknown,
      eligiblePeople: computed.programmePeople.eligiblePeople,
      unnamedAllowanceUnits: computed.programmeOccupancy.unnamedAllowanceUnits,
    },
    status: "SUCCEEDED",
    hostProjectionStatus: "DRAFT",
    supersededRunId: previous?.id,
    actorPersonId,
    reason: input.reason,
    explanation: `Deterministic ${FORECAST_MODEL_VERSION} using ${parameters.parameterSetVersion}. Observed RSVP, forecast and provision remain separate products.`,
    ...versioned(now),
  });
  snap.attendanceForecastRuns.push(run);
  for (const person of population.people) {
    const probabilities = memberProbabilities(person.rsvpClass, parameters);
    snap.forecastPopulationMembers.push(
      ForecastPopulationMemberSchema.parse({
        id: randomUUID(),
        organisationId: event.organisationId,
        clientId: event.clientId,
        eventId: event.id,
        forecastRunId: run.id,
        kind: "PERSON",
        guestId: person.guestId,
        phaseIds: [...person.phaseIds],
        rsvpClass: person.rsvpClass,
        inclusionReason: person.inclusionReason,
        probabilityLow: probabilities.low,
        probabilityCentral: probabilities.central,
        probabilityHigh: probabilities.high,
        assumptionKind: person.rsvpClass === "UNKNOWN" ? "UNRESOLVED_UNCERTAINTY" : "DATA_BACKED",
        ...versioned(now),
      }),
    );
  }
  for (const unnamed of population.unnamed) {
    snap.forecastPopulationMembers.push(
      ForecastPopulationMemberSchema.parse({
        id: randomUUID(),
        organisationId: event.organisationId,
        clientId: event.clientId,
        eventId: event.id,
        forecastRunId: run.id,
        kind: "UNNAMED_ENTITLEMENT",
        entitlementId: unnamed.entitlementId,
        phaseIds: [...unnamed.phaseIds],
        rsvpClass: "NO_RESPONSE",
        inclusionReason: unnamed.inclusionReason,
        probabilityLow: parameters.unnamedEntitlementBand.low,
        probabilityCentral: parameters.unnamedEntitlementBand.central,
        probabilityHigh: parameters.unnamedEntitlementBand.high,
        assumptionKind: "UNRESOLVED_UNCERTAINTY",
        ...versioned(now),
      }),
    );
  }

  const persistEstimate = (count: ReturnType<typeof computeForecast>["programmePeople"], explanation: string): ForecastEstimate => {
    const estimate = ForecastEstimateSchema.parse({
      id: randomUUID(),
      organisationId: event.organisationId,
      clientId: event.clientId,
      eventId: event.id,
      forecastRunId: run.id,
      scope: count.scope,
      phaseId: count.phaseId,
      product: "FORECAST",
      countsPeople: count.countsPeople,
      eligiblePeople: count.eligiblePeople,
      unnamedAllowanceUnits: count.unnamedAllowanceUnits,
      exactLow: count.exactLow,
      exactExpected: count.exactExpected,
      exactHigh: count.exactHigh,
      low: count.low,
      expected: count.expected,
      high: count.high,
      explanation,
      ...versioned(now),
    });
    snap.forecastEstimates.push(estimate);
    snap.confidenceAssessments.push(
      ConfidenceAssessmentSchema.parse({
        id: randomUUID(),
        organisationId: event.organisationId,
        clientId: event.clientId,
        eventId: event.id,
        forecastRunId: run.id,
        estimateId: estimate.id,
        level: count.confidence.level,
        responseCoverage: count.confidence.responseCoverage,
        freshnessAsOf: now,
        stale: count.confidence.stale,
        dataQualityReason: count.confidence.dataQualityReason,
        plainLanguage: count.confidence.plainLanguage,
        ...versioned(now),
      }),
    );
    for (const driver of count.drivers) {
      snap.uncertaintyDrivers.push(
        UncertaintyDriverSchema.parse({
          id: randomUUID(),
          organisationId: event.organisationId,
          clientId: event.clientId,
          eventId: event.id,
          forecastRunId: run.id,
          estimateId: estimate.id,
          code: driver.code,
          contribution: driver.contribution,
          explanation: driver.explanation,
          hostSafeLabel: driver.hostSafeLabel,
          ...versioned(now),
        }),
      );
    }
    return estimate;
  };

  persistEstimate(
    computed.programmePeople,
    "Whole-event distinct people. A guest eligible for several phases is counted once. Phase totals must not be summed as whole-event attendance.",
  );
  persistEstimate(
    computed.programmeOccupancy,
    "Whole-event occupancy including unnamed allowance uncertainty. This is not a people count and not a catering order.",
  );
  for (const phase of computed.phases) {
    persistEstimate(phase.people, "Phase distinct-person forecast. The same guest may appear in another phase without increasing the whole-event union.");
    persistEstimate(phase.occupancy, "Phase occupancy including unnamed allowances that follow the principal's eligible phases.");
  }

  const after = coreTruthFingerprint(snap, event.id);
  if (before !== after) {
    throw new PlatformError("INTERNAL_ERROR", "forecast run attempted to mutate RSVP, guest or attendance truth");
  }
  return run;
}

export function proposeForecastOverrideOnSnap(
  snap: PlatformSnapshot,
  input: ProposeForecastOverrideInput,
  now: string,
  actorPersonId: string,
): ForecastOverride {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const run = snap.attendanceForecastRuns.find((item) => item.id === input.forecastRunId);
  if (!run || run.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast run was not found");
  }
  if (run.status === "SUPERSEDED") {
    throw new PlatformError("TRANSITION_INVALID", "a superseded forecast cannot receive a new override");
  }
  const estimate = snap.forecastEstimates.find((item) => item.id === input.estimateId && item.forecastRunId === run.id);
  if (!estimate || estimate.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast estimate was not found");
  }
  if (input.proposedHigh > (estimate.countsPeople ? estimate.eligiblePeople : estimate.eligiblePeople + estimate.unnamedAllowanceUnits)) {
    throw new PlatformError("VALIDATION_FAILED", "override cannot exceed the eligible population");
  }
  const population = buildForecastPopulation(snap, input.organisationId, event.id, now);
  const record = ForecastOverrideSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    forecastRunId: run.id,
    estimateId: estimate.id,
    field: input.field,
    originalLow: estimate.low,
    originalExpected: estimate.expected,
    originalHigh: estimate.high,
    proposedLow: input.proposedLow,
    proposedExpected: input.proposedExpected,
    proposedHigh: input.proposedHigh,
    reason: input.reason,
    evidence: input.evidence,
    status: "PROPOSED",
    proposedByPersonId: actorPersonId,
    inputChecksumAtProposal: currentInputChecksum(population, run.parameterSetId),
    expiresAt: input.expiresAt,
    ...versioned(now),
  });
  snap.forecastOverrides.push(record);
  return record;
}

export function decideForecastOverrideOnSnap(
  snap: PlatformSnapshot,
  input: DecideForecastOverrideInput,
  now: string,
  actorPersonId: string,
): ForecastOverride {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const record = snap.forecastOverrides.find((item) => item.id === input.overrideId);
  if (!record || record.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast override was not found");
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "the override changed while it was being reviewed");
  }
  if (record.status !== "PROPOSED") {
    throw new PlatformError("TRANSITION_INVALID", "only a proposed override can be decided");
  }
  if (record.proposedByPersonId === actorPersonId && !personHasCeoOrganisationWide(snap, actorPersonId, input.organisationId)) {
    throw new PlatformError("FORBIDDEN", "the proposer cannot approve or reject the same override");
  }
  const run = snap.attendanceForecastRuns.find((item) => item.id === record.forecastRunId);
  if (!run || run.status !== "SUCCEEDED") {
    throw new PlatformError("TRANSITION_INVALID", "the underlying forecast is no longer current");
  }
  const population = buildForecastPopulation(snap, input.organisationId, event.id, now);
  if (currentInputChecksum(population, run.parameterSetId) !== record.inputChecksumAtProposal) {
    throw new PlatformError("VERSION_CONFLICT", "underlying guest or RSVP evidence changed; re-evaluate the override");
  }
  record.status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  record.decidedByPersonId = actorPersonId;
  record.decidedAt = now;
  record.decisionReason = input.decisionReason;
  record.updatedAt = now;
  record.version += 1;
  return record;
}

export function proposeProvisionOnSnap(
  snap: PlatformSnapshot,
  input: ProposeProvisionInput,
  now: string,
  actorPersonId: string,
): OperationalProvisionRecommendation {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const run = snap.attendanceForecastRuns.find((item) => item.id === input.forecastRunId);
  if (!run || run.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast run was not found");
  }
  if (run.status !== "SUCCEEDED") {
    throw new PlatformError("TRANSITION_INVALID", "provision can only be proposed against a current forecast");
  }
  const population = buildForecastPopulation(snap, input.organisationId, event.id, now);
  const record = OperationalProvisionRecommendationSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    forecastRunId: run.id,
    domain: input.domain,
    proposedQuantity: input.proposedQuantity,
    buffer: input.buffer,
    rationale: input.rationale,
    capacityLimit: input.capacityLimit,
    ownerLabel: input.ownerLabel,
    status: "PROPOSED",
    proposedByPersonId: actorPersonId,
    inputChecksumAtProposal: currentInputChecksum(population, run.parameterSetId),
    reviewAt: input.reviewAt,
    expiresAt: input.expiresAt,
    product: "PROVISION",
    ...versioned(now),
  });
  snap.operationalProvisionRecommendations.push(record);
  return record;
}

export function decideProvisionOnSnap(
  snap: PlatformSnapshot,
  input: DecideProvisionInput,
  now: string,
  actorPersonId: string,
): OperationalProvisionRecommendation {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const record = snap.operationalProvisionRecommendations.find((item) => item.id === input.provisionId);
  if (!record || record.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "provision recommendation was not found");
  }
  if (record.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "the provision recommendation changed while it was being reviewed");
  }
  if (record.status !== "PROPOSED") {
    throw new PlatformError("TRANSITION_INVALID", "only a proposed provision can be decided");
  }
  if (record.proposedByPersonId === actorPersonId && !personHasCeoOrganisationWide(snap, actorPersonId, input.organisationId)) {
    throw new PlatformError("FORBIDDEN", "the proposer cannot approve or reject the same provision recommendation");
  }
  const run = snap.attendanceForecastRuns.find((item) => item.id === record.forecastRunId);
  if (!run || run.status !== "SUCCEEDED") {
    throw new PlatformError("TRANSITION_INVALID", "the underlying forecast is no longer current");
  }
  const population = buildForecastPopulation(snap, input.organisationId, event.id, now);
  if (currentInputChecksum(population, run.parameterSetId) !== record.inputChecksumAtProposal) {
    throw new PlatformError("VERSION_CONFLICT", "underlying guest or RSVP evidence changed; re-evaluate the provision");
  }
  record.status = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  record.decidedByPersonId = actorPersonId;
  record.decidedAt = now;
  record.decisionReason = input.decisionReason;
  record.updatedAt = now;
  record.version += 1;
  return record;
}

export function approveHostProjectionOnSnap(
  snap: PlatformSnapshot,
  input: ApproveHostProjectionInput,
  now: string,
  actorPersonId: string,
): AttendanceForecastRun {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const run = snap.attendanceForecastRuns.find((item) => item.id === input.forecastRunId);
  if (!run || run.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast run was not found");
  }
  if (run.version !== input.expectedVersion) {
    throw new PlatformError("VERSION_CONFLICT", "the forecast changed while the host projection was being approved");
  }
  if (run.status !== "SUCCEEDED") {
    throw new PlatformError("TRANSITION_INVALID", "only a current forecast can be released as a host projection");
  }
  if (
    run.actorPersonId === actorPersonId &&
    run.hostProjectionStatus === "DRAFT" &&
    !personHasCeoOrganisationWide(snap, actorPersonId, input.organisationId)
  ) {
    throw new PlatformError("FORBIDDEN", "the operator who ran the forecast cannot approve the same host projection");
  }
  run.hostProjectionStatus = "APPROVED";
  run.updatedAt = now;
  run.version += 1;
  return run;
}

export function recordCalibrationObservationOnSnap(
  snap: PlatformSnapshot,
  input: RecordCalibrationObservationInput,
  now: string,
  actorPersonId: string,
) {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const run = snap.attendanceForecastRuns.find((item) => item.id === input.forecastRunId);
  if (!run || run.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "forecast run was not found");
  }
  const estimate = snap.forecastEstimates.find((item) => item.id === input.estimateId && item.forecastRunId === run.id);
  if (!estimate) {
    throw new PlatformError("NOT_FOUND", "forecast estimate was not found");
  }
  if (input.completeness !== "ACCEPTED" && input.evidenceKind === "RECONCILED_OPERATIONAL") {
    throw new PlatformError("TRANSITION_INVALID", "operational calibration requires accepted completeness");
  }
  const variance =
    input.observedCount === undefined ? undefined : input.observedCount - estimate.expected;
  const intervalCovered =
    input.observedCount === undefined ? undefined : input.observedCount >= estimate.low && input.observedCount <= estimate.high;
  const record = CalibrationObservationSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    forecastRunId: run.id,
    estimateId: estimate.id,
    evidenceKind: input.evidenceKind,
    completeness: input.completeness,
    observedCount: input.observedCount,
    sourceLedger: input.sourceLedger,
    originalLow: estimate.low,
    originalExpected: estimate.expected,
    originalHigh: estimate.high,
    variance,
    intervalCovered,
    notes: input.notes,
    recordedByPersonId: actorPersonId,
    ...versioned(now),
  });
  snap.calibrationObservations.push(record);
  const original = snap.forecastEstimates.find((item) => item.id === estimate.id);
  if (!original || original.low !== estimate.low || original.expected !== estimate.expected || original.high !== estimate.high) {
    throw new PlatformError("INTERNAL_ERROR", "calibration must not rewrite the original forecast");
  }
  return record;
}

export function evaluateForecastOnSnap(
  snap: PlatformSnapshot,
  input: EvaluateForecastInput,
  now: string,
  actorPersonId: string,
) {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const observation = snap.calibrationObservations.find((item) => item.id === input.observationId);
  if (!observation || observation.eventId !== event.id) {
    throw new PlatformError("NOT_FOUND", "calibration observation was not found");
  }
  if (observation.completeness !== "ACCEPTED" || observation.observedCount === undefined) {
    throw new PlatformError("TRANSITION_INVALID", "evaluation is not yet available until completeness is accepted");
  }
  const record = ForecastEvaluationSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    clientId: event.clientId,
    eventId: event.id,
    forecastRunId: observation.forecastRunId,
    observationId: observation.id,
    status: observation.evidenceKind === "SYNTHETIC_SHADOW" ? "SHADOW" : "REVIEWED",
    absoluteError: Math.abs((observation.observedCount ?? 0) - observation.originalExpected),
    intervalCovered: observation.intervalCovered,
    releaseRecommendation: "NOT_RELEASED",
    notes: input.reason,
    evaluatedByPersonId: actorPersonId,
    ...versioned(now),
  });
  snap.forecastEvaluations.push(record);
  const original = snap.forecastEstimates.find((item) => item.id === observation.estimateId);
  if (
    !original ||
    original.low !== observation.originalLow ||
    original.expected !== observation.originalExpected ||
    original.high !== observation.originalHigh
  ) {
    throw new PlatformError("INTERNAL_ERROR", "evaluation must preserve the original forecast");
  }
  return record;
}

export function createEventParameterSetOnSnap(
  snap: PlatformSnapshot,
  input: CreateEventParameterSetInput,
  now: string,
  actorPersonId: string,
): ModelParameterSet {
  const event = requireEvent(snap, input.organisationId, input.eventId);
  const policy = snap.forecastPolicies.find((item) => item.organisationId === event.organisationId && item.status === "ACTIVE");
  if (!policy) {
    throw new PlatformError("DEPENDENCY_UNAVAILABLE", "forecast policy is unavailable");
  }
  for (const existing of snap.modelParameterSets.filter(
    (item) => item.eventId === event.id && item.applicability === "EVENT" && item.status === "ACTIVE",
  )) {
    existing.status = "SUPERSEDED";
    existing.updatedAt = now;
    existing.version += 1;
    existing.effectiveUntil = now;
  }
  const record = ModelParameterSetSchema.parse({
    id: randomUUID(),
    organisationId: event.organisationId,
    eventId: event.id,
    policyId: policy.id,
    parameterSetVersion: `${DEFAULT_PARAMETER_SET_VERSION}-EVENT`,
    applicability: "EVENT",
    status: "ACTIVE",
    yesBand: { low: input.yesLow, central: input.yesCentral, high: input.yesHigh },
    noResponseBand: { low: input.noResponseLow, central: input.noResponseCentral, high: input.noResponseHigh },
    noBand: { low: input.noLow, central: input.noCentral, high: input.noHigh },
    unnamedEntitlementBand: { low: input.unnamedLow, central: input.unnamedCentral, high: input.unnamedHigh },
    localityLabel: "PROVISIONAL_DEFAULT_NOT_LAGOS_FACT",
    explanation: input.explanation,
    source: "event-scoped governed parameter set",
    effectiveFrom: now,
    ownerPersonId: actorPersonId,
    approvedByPersonId: actorPersonId,
    ...versioned(now),
  });
  snap.modelParameterSets.push(record);
  return record;
}

export function forecastIsStale(run: AttendanceForecastRun, now: string): boolean {
  return Date.parse(now) - Date.parse(run.asOf) >= FORECAST_STALE_AFTER_MS;
}
