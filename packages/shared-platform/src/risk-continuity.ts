import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertMakerChecker,
  assertProtectedHuman,
  assertSameEvent,
  assertSameOrganisation,
  bumpVersion,
  eventIdentityKey,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import {
  RiskCheckInSchema,
  RiskCheckpointInstanceSchema,
  RiskCheckpointTemplateSchema,
  RiskCommunicationIntentSchema,
  RiskContinuityPlanSchema,
  RiskCriticalFunctionSchema,
  RiskEscalationIntentSchema,
  RiskFallbackActivationSchema,
  type RiskCheckIn,
  type RiskCheckpointInstance,
  type RiskCheckpointTemplate,
  type RiskCommunicationIntent,
  type RiskContinuityPlan,
  type RiskCriticalFunction,
  type RiskFallbackActivation,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

const ACTIVATION_TRANSITIONS: Record<string, readonly string[]> = {
  PROPOSED: ["AUTHORISED", "CANCELLED"],
  AUTHORISED: ["INITIATED", "CANCELLED"],
  INITIATED: ["CONFIRMED", "FAILED"],
  CONFIRMED: ["CLOSED"],
  FAILED: ["CLOSED"],
  CANCELLED: [],
  CLOSED: [],
};

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export function createCriticalFunctionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    functionKey: string;
    title: string;
    venueAreaId?: string;
    assetId?: string;
    vendorAssignmentId?: string;
    maximumTolerableInterruptionMinutes: number;
  },
  now: string,
  actorPersonId: string,
): RiskCriticalFunction {
  envelope(input, input.organisationId, input.eventId);
  const record = RiskCriticalFunctionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    functionKey: input.functionKey,
    title: input.title,
    venueAreaId: input.venueAreaId,
    assetId: input.assetId,
    vendorAssignmentId: input.vendorAssignmentId,
    maximumTolerableInterruptionMinutes: input.maximumTolerableInterruptionMinutes,
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskCriticalFunctions.push(record);
  return record;
}

export function createContinuityPlanOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    title: string;
    recoveryObjectiveMinutes: number;
    maximumTolerableInterruptionMinutes: number;
    primaryAssignmentId?: string;
    standbyAssignmentIds?: string[];
    prerequisites?: string[];
    evidenceIds?: string[];
    decisionRole: string;
  },
  now: string,
  actorPersonId: string,
): RiskContinuityPlan {
  envelope(input, input.organisationId, input.eventId);
  const record = RiskContinuityPlanSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    title: input.title,
    recoveryObjectiveMinutes: input.recoveryObjectiveMinutes,
    maximumTolerableInterruptionMinutes: input.maximumTolerableInterruptionMinutes,
    primaryAssignmentId: input.primaryAssignmentId,
    standbyAssignmentIds: input.standbyAssignmentIds ?? [],
    prerequisites: input.prerequisites ?? [],
    evidenceIds: input.evidenceIds ?? [],
    decisionRole: input.decisionRole,
    communicationIntentIds: [],
    status: "DRAFT",
    submittedByPersonId: actorPersonId,
    contentHash: exactHash({ title: input.title, recovery: input.recoveryObjectiveMinutes }),
    current: true,
    ...riskStamp(now),
  });
  snap.riskContinuityPlans.push(record);
  return record;
}

export function decideContinuityPlanOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    planId: string;
    decision: "SUBMITTED" | "APPROVED";
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskContinuityPlan {
  envelope(input, input.organisationId, input.eventId);
  const plan = snap.riskContinuityPlans.find((item) => item.id === input.planId && item.eventId === input.eventId);
  if (!plan) throw new PlatformError("NOT_FOUND", "continuity plan not found");
  assertExpectedVersion(plan.version, input.expectedVersion, "continuity plan");
  if (input.decision === "APPROVED") {
    assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
    assertMakerChecker(plan.submittedByPersonId, actorPersonId, "approve continuity plan");
  }
  Object.assign(
    plan,
    RiskContinuityPlanSchema.parse({
      ...plan,
      status: input.decision,
      approvedByPersonId: input.decision === "APPROVED" ? actorPersonId : plan.approvedByPersonId,
      ...bumpVersion(plan, now),
    }),
  );
  return plan;
}

export function saveCheckpointTemplateOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    offsetHours: number;
    title: string;
    requiredEvidence: string;
    status?: "DRAFT" | "APPROVED";
  },
  now: string,
  actorPersonId: string,
): RiskCheckpointTemplate {
  envelope(input, input.organisationId);
  const record = RiskCheckpointTemplateSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    offsetHours: input.offsetHours,
    title: input.title,
    requiredEvidence: input.requiredEvidence,
    status: input.status ?? "APPROVED",
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskCheckpointTemplates.push(record);
  return record;
}

export function generateCheckpointInstancesOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string },
  now: string,
): RiskCheckpointInstance[] {
  envelope(input, input.organisationId, input.eventId);
  const event = snap.events.find((item) => item.id === input.eventId && item.organisationId === input.organisationId);
  if (!event) throw new PlatformError("NOT_FOUND", "event not found");
  const templates = snap.riskCheckpointTemplates.filter((item) => item.organisationId === input.organisationId && item.status === "APPROVED");
  const created: RiskCheckpointInstance[] = [];
  for (const template of templates) {
    const dueAt = new Date(Date.parse(event.startsAt) - template.offsetHours * 3600_000).toISOString();
    const identityKey = eventIdentityKey([input.eventId, template.id, dueAt]);
    const existing = snap.riskCheckpointInstances.find((item) => item.identityKey === identityKey);
    if (existing) {
      created.push(existing);
      continue;
    }
    const record = RiskCheckpointInstanceSchema.parse({
      id: newRiskId(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      templateId: template.id,
      dueAt,
      timezone: event.timezone,
      status: "SCHEDULED",
      identityKey,
      ...riskStamp(now),
    });
    snap.riskCheckpointInstances.push(record);
    created.push(record);
  }
  return created;
}

export function derivedCheckpointStatus(instance: RiskCheckpointInstance, now: string, checkIns: readonly RiskCheckIn[]): RiskCheckpointInstance["status"] {
  const latest = [...checkIns].reverse().find((item) => item.checkpointId === instance.id);
  if (latest?.response === "CONFIRMED") return "CONFIRMED";
  if (latest?.response === "AT_RISK") return "AT_RISK";
  if (latest?.response === "UNAVAILABLE") return "MISSED";
  if (instance.dueAt <= now && instance.status === "SCHEDULED") return "DUE";
  if (instance.dueAt < now && !latest) return "MISSED";
  return instance.status;
}

export function recordCheckInOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    checkpointId: string;
    response: RiskCheckIn["response"];
    source: RiskCheckIn["source"];
    note?: string;
  },
  now: string,
  actorPersonId: string,
): RiskCheckIn {
  envelope(input, input.organisationId, input.eventId);
  if (input.source === "SYSTEM_DERIVED" && /delivered|receipt/i.test(input.note ?? "")) {
    throw new PlatformError("VALIDATION_FAILED", "a reminder delivery receipt is not vendor confirmation");
  }
  const checkpoint = snap.riskCheckpointInstances.find((item) => item.id === input.checkpointId && item.eventId === input.eventId);
  if (!checkpoint) throw new PlatformError("NOT_FOUND", "checkpoint not found");
  const previous = snap.riskCheckIns.find((item) => item.checkpointId === checkpoint.id);
  const record = RiskCheckInSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    checkpointId: checkpoint.id,
    response: input.response,
    source: input.source,
    actorPersonId,
    note: input.note,
    supersedesCheckInId: previous?.id,
    reminderReceiptDoesNotConfirm: true,
    ...riskStamp(now),
  });
  snap.riskCheckIns.push(record);
  const status = derivedCheckpointStatus(checkpoint, now, [...snap.riskCheckIns.filter((item) => item.checkpointId === checkpoint.id)]);
  Object.assign(checkpoint, { ...checkpoint, status, ...bumpVersion(checkpoint, now) });
  return record;
}

export function evaluateEscalationsOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string },
  now: string,
  actorPersonId: string,
): { escalations: typeof snap.riskEscalationIntents; intents: RiskCommunicationIntent[] } {
  envelope(input, input.organisationId, input.eventId);
  const instances = snap.riskCheckpointInstances.filter((item) => item.eventId === input.eventId);
  const createdIntents: RiskCommunicationIntent[] = [];
  for (const instance of instances) {
    const status = derivedCheckpointStatus(instance, now, snap.riskCheckIns);
    if (status !== "MISSED" && status !== "AT_RISK") continue;
    const identityKey = eventIdentityKey(["escalation", instance.id, status]);
    if (snap.riskEscalationIntents.some((item) => item.identityKey === identityKey)) continue;
    const intent = RiskCommunicationIntentSchema.parse({
      id: newRiskId(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      purpose: `Checkpoint ${status.toLowerCase()}`,
      recipientLabel: "Event lead (internal)",
      channel: "INTERNAL",
      status: "PENDING_APPROVAL",
      providerStatus: "INACTIVE",
      approvalRequired: true,
      dispatched: false,
      createdByPersonId: actorPersonId,
      ...riskStamp(now),
    });
    snap.riskCommunicationIntents.push(intent);
    createdIntents.push(intent);
    snap.riskEscalationIntents.push(
      RiskEscalationIntentSchema.parse({
        id: newRiskId(),
        organisationId: input.organisationId,
        eventId: input.eventId,
        checkpointId: instance.id,
        communicationIntentId: intent.id,
        identityKey,
        approvalRequired: true,
        dispatched: false,
        createdAtEvaluation: now,
        ...riskStamp(now),
      }),
    );
    Object.assign(instance, { ...instance, status: "ESCALATED", ...bumpVersion(instance, now) });
  }
  return { escalations: snap.riskEscalationIntents.filter((item) => item.eventId === input.eventId), intents: createdIntents };
}

export function proposeFallbackOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    planId: string;
    triggerEvidence: string;
    impact: string;
    eligibleAlternativeIds?: string[];
    unmetPrerequisites?: string[];
    budgetVarianceNote?: string;
  },
  now: string,
  actorPersonId: string,
): RiskFallbackActivation {
  envelope(input, input.organisationId, input.eventId);
  const plan = snap.riskContinuityPlans.find((item) => item.id === input.planId && item.eventId === input.eventId);
  if (!plan) throw new PlatformError("NOT_FOUND", "continuity plan not found");
  const record = RiskFallbackActivationSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    planId: plan.id,
    triggerEvidence: input.triggerEvidence,
    impact: input.impact,
    eligibleAlternativeIds: input.eligibleAlternativeIds ?? plan.standbyAssignmentIds,
    unmetPrerequisites: input.unmetPrerequisites ?? plan.prerequisites,
    budgetVarianceNote: input.budgetVarianceNote,
    status: "PROPOSED",
    proposedByPersonId: actorPersonId,
    bookingRequested: false,
    paymentRequested: false,
    dispatchRequested: false,
    ...riskStamp(now),
  });
  snap.riskFallbackActivations.push(record);
  return record;
}

export function transitionFallbackOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    activationId: string;
    to: RiskFallbackActivation["status"];
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskFallbackActivation {
  envelope(input, input.organisationId, input.eventId);
  const activation = snap.riskFallbackActivations.find((item) => item.id === input.activationId && item.eventId === input.eventId);
  if (!activation) throw new PlatformError("NOT_FOUND", "fallback activation not found");
  assertExpectedVersion(activation.version, input.expectedVersion, "fallback activation");
  if (!(ACTIVATION_TRANSITIONS[activation.status] ?? []).includes(input.to)) {
    throw new PlatformError("TRANSITION_INVALID", `fallback cannot move from ${activation.status} to ${input.to}`);
  }
  if (input.to === "AUTHORISED") {
    assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
    const plan = snap.riskContinuityPlans.find((item) => item.id === activation.planId);
    if (plan) assertMakerChecker(plan.submittedByPersonId, actorPersonId, "authorise fallback");
    if (activation.proposedByPersonId === actorPersonId) {
      throw new PlatformError("FORBIDDEN", "authoriser must differ from the plan proposer for consequential activation");
    }
  }
  Object.assign(
    activation,
    RiskFallbackActivationSchema.parse({
      ...activation,
      status: input.to,
      authorisedByPersonId: input.to === "AUTHORISED" ? actorPersonId : activation.authorisedByPersonId,
      bookingRequested: false,
      paymentRequested: false,
      dispatchRequested: false,
      ...bumpVersion(activation, now),
    }),
  );
  return activation;
}

export function formatDueAt(dueAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(dueAt));
}
