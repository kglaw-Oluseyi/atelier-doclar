import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertMakerChecker,
  assertProtectedHuman,
  assertSameEvent,
  assertSameOrganisation,
  bumpVersion,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import {
  RiskIncidentNoteSchema,
  RiskIncidentSchema,
  RiskLearningProposalSchema,
  type RiskIncident,
  type RiskIncidentNote,
  type RiskLearningProposal,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const INCIDENT_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["STABILISED", "CLOSED"],
  STABILISED: ["RECOVERY", "CLOSED"],
  RECOVERY: ["CLOSED"],
  CLOSED: ["POST_INCIDENT_REVIEWED"],
  POST_INCIDENT_REVIEWED: [],
};

export const LIFE_SAFETY_PROTOCOL =
  "If anyone is in immediate danger, follow Maison Doclar emergency procedures and contact human emergency services. This platform has not dispatched help.";

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export function reportIncidentOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    title: string;
    severity: RiskIncident["severity"];
    lifeSafety?: boolean;
    phaseLabel?: string;
    spatialRef?: string;
    vendorAssignmentId?: string;
    sensitive?: boolean;
  },
  now: string,
  actorPersonId: string,
): RiskIncident {
  envelope(input, input.organisationId, input.eventId);
  const record = RiskIncidentSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    title: input.title,
    severity: input.lifeSafety ? "LIFE_SAFETY" : input.severity,
    state: "OPEN",
    lifeSafety: Boolean(input.lifeSafety),
    phaseLabel: input.phaseLabel,
    spatialRef: input.spatialRef,
    vendorAssignmentId: input.vendorAssignmentId,
    reportedByPersonId: actorPersonId,
    sensitive: Boolean(input.sensitive) || Boolean(input.lifeSafety),
    ...riskStamp(now),
  });
  snap.riskIncidents.push(record);
  return record;
}

export function addIncidentNoteOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    incidentId: string;
    kind: RiskIncidentNote["kind"];
    body: string;
    classification?: RiskIncidentNote["classification"];
  },
  now: string,
  actorPersonId: string,
): RiskIncidentNote {
  envelope(input, input.organisationId, input.eventId);
  const incident = snap.riskIncidents.find((item) => item.id === input.incidentId && item.eventId === input.eventId);
  if (!incident) throw new PlatformError("NOT_FOUND", "incident not found");
  const record = RiskIncidentNoteSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    incidentId: incident.id,
    kind: input.kind,
    body: input.body,
    classification: input.classification ?? (incident.sensitive ? "RESTRICTED_INCIDENT" : "OPERATIONAL"),
    actorPersonId,
    ...riskStamp(now),
  });
  snap.riskIncidentNotes.push(record);
  return record;
}

export function transitionIncidentOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    incidentId: string;
    to: RiskIncident["state"];
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskIncident {
  envelope(input, input.organisationId, input.eventId);
  const incident = snap.riskIncidents.find((item) => item.id === input.incidentId && item.eventId === input.eventId);
  if (!incident) throw new PlatformError("NOT_FOUND", "incident not found");
  assertExpectedVersion(incident.version, input.expectedVersion, "incident");
  if (!(INCIDENT_TRANSITIONS[incident.state] ?? []).includes(input.to)) {
    throw new PlatformError("TRANSITION_INVALID", `incident cannot move from ${incident.state} to ${input.to}`);
  }
  if (input.to === "CLOSED") {
    assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
    const openActions = snap.riskIncidentNotes.filter((item) => item.incidentId === incident.id && item.kind === "ACTION");
    const residual = snap.riskResidualDecisions.find((item) => item.eventId === input.eventId && item.status === "APPROVED");
    if (openActions.length && !residual) {
      throw new PlatformError("VALIDATION_FAILED", "incident cannot close while critical actions remain open without an authorised residual-risk decision");
    }
    assertMakerChecker(incident.reportedByPersonId, actorPersonId, "close incident");
  }
  Object.assign(incident, RiskIncidentSchema.parse({ ...incident, state: input.to, ...bumpVersion(incident, now) }));
  return incident;
}

export function proposeLearningOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    incidentId: string;
    target: RiskLearningProposal["target"];
    proposal: string;
  },
  now: string,
  actorPersonId: string,
): RiskLearningProposal {
  envelope(input, input.organisationId, input.eventId);
  const incident = snap.riskIncidents.find((item) => item.id === input.incidentId && item.eventId === input.eventId);
  if (!incident) throw new PlatformError("NOT_FOUND", "incident not found");
  const record = RiskLearningProposalSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    incidentId: incident.id,
    target: input.target,
    proposal: input.proposal,
    adopted: false,
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskLearningProposals.push(record);
  return record;
}
