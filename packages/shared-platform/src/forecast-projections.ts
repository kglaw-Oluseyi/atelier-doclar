import { forecastIsStale } from "./forecast-operations.js";
import type { PermissionKey } from "./schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface ForecastCapabilities {
  canRun: boolean;
  canViewDetail: boolean;
  canViewHostProjection: boolean;
  canProposeOverride: boolean;
  canApproveOverride: boolean;
  canProposeProvision: boolean;
  canApproveProvision: boolean;
  canManageParameters: boolean;
  canEvaluate: boolean;
  canViewAudit: boolean;
}

export function forecastPermissionAllowed(check: (permission: PermissionKey) => boolean): ForecastCapabilities {
  return {
    canRun: check("forecast.run"),
    canViewDetail: check("forecast.detail.view"),
    canViewHostProjection: check("forecast.hostProjection.view"),
    canProposeOverride: check("forecast.override.propose"),
    canApproveOverride: check("forecast.override.approve"),
    canProposeProvision: check("provision.propose"),
    canApproveProvision: check("provision.approve"),
    canManageParameters: check("model.parameters.manage"),
    canEvaluate: check("model.evaluate"),
    canViewAudit: check("forecast.audit.view"),
  };
}

function staffName(snap: PlatformSnapshot, personId: string): string {
  const person = snap.persons.find((item) => item.id === personId);
  return person?.displayName ?? "Authorised operator";
}

export function buildEventForecastWorkspace(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  capabilities: ForecastCapabilities,
  now = new Date().toISOString(),
) {
  const event = snap.events.find((item) => item.id === eventId && item.organisationId === organisationId);
  if (!event) return undefined;
  const runs = snap.attendanceForecastRuns
    .filter((item) => item.eventId === eventId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const current = runs.find((item) => item.status === "SUCCEEDED");
  const estimates = current ? snap.forecastEstimates.filter((item) => item.forecastRunId === current.id) : [];
  const programmePeople = estimates.find((item) => item.scope === "PROGRAMME" && item.countsPeople);
  const programmeOccupancy = estimates.find((item) => item.scope === "PROGRAMME" && !item.countsPeople);
  const phases = snap.programmePhases
    .filter((item) => item.eventId === eventId)
    .sort((left, right) => left.sequence - right.sequence)
    .map((phase) => {
      const people = estimates.find((item) => item.scope === "PHASE" && item.phaseId === phase.id && item.countsPeople);
      const occupancy = estimates.find((item) => item.scope === "PHASE" && item.phaseId === phase.id && !item.countsPeople);
      return {
        id: phase.id,
        name: phase.name,
        type: phase.type,
        people,
        occupancy,
      };
    });
  const confidence = current
    ? snap.confidenceAssessments.find((item) => item.forecastRunId === current.id && item.estimateId === programmePeople?.id)
    : undefined;
  const drivers = current
    ? snap.uncertaintyDrivers
        .filter((item) => item.forecastRunId === current.id && item.estimateId === programmePeople?.id)
        .map((item) => ({
          id: item.id,
          code: item.code,
          contribution: item.contribution,
          explanation: capabilities.canViewDetail ? item.explanation : item.hostSafeLabel,
          hostSafeLabel: item.hostSafeLabel,
        }))
    : [];
  const overrides = current
    ? snap.forecastOverrides
        .filter((item) => item.forecastRunId === current.id)
        .map((item) => ({
          id: item.id,
          field: item.field,
          status: item.status,
          originalLow: item.originalLow,
          originalExpected: item.originalExpected,
          originalHigh: item.originalHigh,
          proposedLow: item.proposedLow,
          proposedExpected: item.proposedExpected,
          proposedHigh: item.proposedHigh,
          reason: capabilities.canViewDetail ? item.reason : undefined,
          evidence: capabilities.canViewAudit ? item.evidence : undefined,
          proposedBy: staffName(snap, item.proposedByPersonId),
          decidedBy: item.decidedByPersonId ? staffName(snap, item.decidedByPersonId) : undefined,
          version: item.version,
        }))
    : [];
  const provisions = current
    ? snap.operationalProvisionRecommendations
        .filter((item) => item.forecastRunId === current.id)
        .map((item) => ({
          id: item.id,
          domain: item.domain,
          proposedQuantity: item.proposedQuantity,
          buffer: item.buffer,
          rationale: capabilities.canViewDetail ? item.rationale : undefined,
          ownerLabel: item.ownerLabel,
          status: item.status,
          proposedBy: staffName(snap, item.proposedByPersonId),
          decidedBy: item.decidedByPersonId ? staffName(snap, item.decidedByPersonId) : undefined,
          reviewAt: item.reviewAt,
          version: item.version,
        }))
    : [];
  const parameters = snap.modelParameterSets.filter(
    (item) =>
      item.organisationId === organisationId &&
      (item.applicability === "GLOBAL" || item.eventId === eventId) &&
      item.status !== "WITHDRAWN",
  );
  const observations = current
    ? snap.calibrationObservations
        .filter((item) => item.forecastRunId === current.id)
        .map((item) => ({
          id: item.id,
          evidenceKind: item.evidenceKind,
          completeness: item.completeness,
          observedCount: item.observedCount,
          originalLow: item.originalLow,
          originalExpected: item.originalExpected,
          originalHigh: item.originalHigh,
          variance: item.variance,
          intervalCovered: item.intervalCovered,
          notes: capabilities.canViewAudit || capabilities.canEvaluate ? item.notes : undefined,
        }))
    : [];
  const evaluations = current
    ? snap.forecastEvaluations
        .filter((item) => item.forecastRunId === current.id)
        .map((item) => ({
          id: item.id,
          status: item.status,
          absoluteError: item.absoluteError,
          intervalCovered: item.intervalCovered,
          releaseRecommendation: item.releaseRecommendation,
        }))
    : [];
  const observedRsvp = current?.observedRsvp;
  const stale = current ? forecastIsStale(current, now) || Boolean(confidence?.stale) : false;
  const phaseSum = phases.reduce((sum, phase) => sum + (phase.people?.expected ?? 0), 0);
  return {
    eventId: event.id,
    organisationId: event.organisationId,
    eventName: event.name,
    capabilities,
    products: {
      observedRsvp: "Observed RSVP is what guests have actually said. It is not a forecast.",
      forecast: "The attendance forecast is an explainable estimate with a range and confidence.",
      provision: "Operational provision is a separately governed planning proposal. It is not attendance truth.",
    },
    currentRun: current
      ? {
          id: current.id,
          asOf: current.asOf,
          status: current.status,
          hostProjectionStatus: current.hostProjectionStatus,
          modelVersion: current.modelVersion,
          parameterSetVersion: current.parameterSetVersion,
          parameterSetId: current.parameterSetId,
          populationChecksum: current.populationChecksum,
          actor: staffName(snap, current.actorPersonId),
          reason: current.reason,
          explanation: current.explanation,
          version: current.version,
          stale,
          supersededRunId: current.supersededRunId,
        }
      : undefined,
    programmePeople,
    programmeOccupancy,
    phases,
    phaseSumWarning:
      programmePeople && phaseSum !== programmePeople.expected
        ? `Phase expected totals (${phaseSum}) are not the whole-event distinct-person forecast (${programmePeople.expected}). Do not add phases together.`
        : undefined,
    confidence,
    drivers,
    overrides,
    provisions,
    parameters: capabilities.canManageParameters || capabilities.canViewAudit
      ? parameters.map((item) => ({
          id: item.id,
          applicability: item.applicability,
          status: item.status,
          parameterSetVersion: item.parameterSetVersion,
          localityLabel: item.localityLabel,
          explanation: item.explanation,
          yesBand: item.yesBand,
          noResponseBand: item.noResponseBand,
          noBand: item.noBand,
          unnamedEntitlementBand: item.unnamedEntitlementBand,
        }))
      : [],
    observations,
    evaluations,
    observedRsvp,
    history: capabilities.canViewAudit
      ? runs.map((item) => ({
          id: item.id,
          asOf: item.asOf,
          status: item.status,
          hostProjectionStatus: item.hostProjectionStatus,
          parameterSetVersion: item.parameterSetVersion,
        }))
      : [],
    rsvpAdjacent: {
      yes: observedRsvp?.yes ?? 0,
      no: observedRsvp?.no ?? 0,
      noResponse: observedRsvp?.noResponse ?? 0,
      unknown: observedRsvp?.unknown ?? 0,
      eligiblePeople: observedRsvp?.eligiblePeople ?? 0,
    },
  };
}

export type EventForecastWorkspace = NonNullable<ReturnType<typeof buildEventForecastWorkspace>>;

export function buildHostForecastProjection(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  now = new Date().toISOString(),
) {
  const event = snap.events.find((item) => item.id === eventId && item.organisationId === organisationId);
  if (!event) return undefined;
  const current = snap.attendanceForecastRuns
    .filter((item) => item.eventId === eventId && item.status === "SUCCEEDED" && item.hostProjectionStatus === "APPROVED")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  if (!current) {
    return {
      eventId: event.id,
      eventName: event.name,
      available: false as const,
      message: "No approved host projection is available yet.",
    };
  }
  const programme = snap.forecastEstimates.find(
    (item) => item.forecastRunId === current.id && item.scope === "PROGRAMME" && item.countsPeople,
  );
  const confidence = snap.confidenceAssessments.find(
    (item) => item.forecastRunId === current.id && item.estimateId === programme?.id,
  );
  const drivers = snap.uncertaintyDrivers
    .filter((item) => item.forecastRunId === current.id && item.estimateId === programme?.id)
    .map((item) => item.hostSafeLabel);
  const previous = snap.attendanceForecastRuns.find((item) => item.id === current.supersededRunId);
  const previousPeople = previous
    ? snap.forecastEstimates.find((item) => item.forecastRunId === previous.id && item.scope === "PROGRAMME" && item.countsPeople)
    : undefined;
  const materialChange =
    previousPeople && programme && previousPeople.expected !== programme.expected
      ? `The planning centre moved from ${previousPeople.expected} to ${programme.expected} people.`
      : "No material change since the previous approved projection.";
  const approvedProvision = snap.operationalProvisionRecommendations
    .filter((item) => item.forecastRunId === current.id && item.status === "APPROVED")
    .map((item) => ({ domain: item.domain, quantity: item.proposedQuantity, buffer: item.buffer }));
  return {
    eventId: event.id,
    eventName: event.name,
    available: true as const,
    asOf: current.asOf,
    stale: forecastIsStale(current, now),
    range: programme ? { low: programme.low, expected: programme.expected, high: programme.high } : undefined,
    confidencePlainLanguage: confidence?.plainLanguage ?? "Confidence has not been assessed.",
    materialUncertainty: drivers,
    approvedProvision,
    lastRefreshedAt: current.asOf,
    materialChange,
    disclaimer: "This is a planning range, not a counted attendance and not a catering order.",
  };
}

export type HostForecastProjection = NonNullable<ReturnType<typeof buildHostForecastProjection>>;

export function buildForecastOverviewStrip(
  snap: PlatformSnapshot,
  organisationId: string,
  eventId: string,
  now = new Date().toISOString(),
) {
  const workspace = buildEventForecastWorkspace(snap, organisationId, eventId, forecastPermissionAllowed(() => true), now);
  if (!workspace?.programmePeople || !workspace.currentRun) {
    return {
      eventId,
      hasForecast: false as const,
      title: "Attendance forecast",
      message: "No forecast has been run yet.",
    };
  }
  return {
    eventId,
    hasForecast: true as const,
    title: "Attendance forecast",
    low: workspace.programmePeople.low,
    expected: workspace.programmePeople.expected,
    high: workspace.programmePeople.high,
    confidence: workspace.confidence?.plainLanguage,
    stale: workspace.currentRun.stale,
    asOf: workspace.currentRun.asOf,
    provision: workspace.provisions.find((item) => item.status === "APPROVED"),
    phaseSumWarning: workspace.phaseSumWarning,
  };
}
