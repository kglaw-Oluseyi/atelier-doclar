import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertHumanActor,
  assertMakerChecker,
  bumpVersion,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import { redactDossier, redactIncidentNote, redactPolicyEdition, redactVendorAssessment, type RiskProjectionAudience } from "./risk-disclosure.js";
import { derivedCertificateStatus } from "./risk-policy-operations.js";
import { RiskDossierEditionSchema, type RiskDossierEdition } from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export function protectionAudienceFromRole(roleKey: string | undefined): RiskProjectionAudience {
  if (roleKey === "CEO") return "CEO";
  if (roleKey === "EVENT_DIRECTOR") return "EVENT_DIRECTOR";
  if (roleKey === "PLANNER" || roleKey === "CLIENT_LEAD") return "PLANNER";
  if (roleKey === "READ_ONLY_AUDITOR") return "AUDITOR";
  if (roleKey === "SYSTEM_ADMINISTRATOR") return "SYSTEM_ADMINISTRATOR";
  return "PUBLIC";
}

export function organisationProtectionProjection(snap: PlatformSnapshot, organisationId: string, audience: RiskProjectionAudience, now: string) {
  const policies = snap.riskPolicies.filter((item) => item.organisationId === organisationId);
  const editions = snap.riskPolicyEditions.filter((item) => item.organisationId === organisationId && item.current);
  const rules = snap.riskRuleEditions.filter((item) => item.organisationId === organisationId);
  const events = snap.events.filter((item) => item.organisationId === organisationId);
  const gaps = snap.riskGapFindings.filter((item) => item.organisationId === organisationId && item.state === "OPEN");
  const decisions = snap.riskResidualDecisions.filter((item) => item.organisationId === organisationId && item.status === "SUBMITTED");
  const incidents = snap.riskIncidents.filter((item) => item.organisationId === organisationId && item.state !== "CLOSED" && item.state !== "POST_INCIDENT_REVIEWED");
  const dossiers = snap.riskDossierEditions.filter((item) => item.organisationId === organisationId && item.current);
  return {
    organisationId,
    policyCount: policies.length,
    expiringEvidence: editions.filter((item) => derivedCertificateStatus(item, now.slice(0, 10)) === "EXPIRED").map((item) => redactPolicyEdition(item, audience)),
    highConsequenceUnknowns: gaps.filter((item) => item.taxonomy === "UNVERIFIED_DOCUMENT" || item.taxonomy === "MISSING_POLICY_OR_CERTIFICATE").length,
    decisionsWaiting: decisions.length,
    openIncidents: incidents.length,
    untestedFallbacks: snap.riskFallbackActivations.filter((item) => item.organisationId === organisationId && item.status === "PROPOSED").length,
    dossierCurrency: dossiers.map((item) => redactDossier(item, audience)),
    ruleLibrary: rules.map((item) => ({
      id: item.id,
      ruleKey: item.ruleKey,
      status: item.status,
      jurisdiction: item.jurisdiction,
      lastVerifiedAt: item.lastVerifiedAt,
      nextReviewAt: item.nextReviewAt,
      proposition: item.proposition,
    })),
    events: events.map((item) => ({
      id: item.id,
      name: item.name,
      readiness: snap.riskApplicabilitySnapshots.filter((row) => row.eventId === item.id).at(-1)?.overall ?? "INDETERMINATE",
    })),
  };
}

export function eventProtectionProjection(snap: PlatformSnapshot, organisationId: string, eventId: string, audience: RiskProjectionAudience, now: string) {
  const snapshot = [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === eventId);
  const gaps = snap.riskGapFindings.filter((item) => item.eventId === eventId);
  const policies = snap.riskPolicyEditions.filter((item) => item.organisationId === organisationId && item.current && (item.eventId === eventId || !item.eventId));
  const incidents = snap.riskIncidents.filter((item) => item.eventId === eventId);
  const notes = snap.riskIncidentNotes.filter((item) => item.eventId === eventId).map((item) => redactIncidentNote(item, audience));
  const assessments = snap.riskVendorAssessments.filter((item) => item.eventId === eventId || (item.organisationId === organisationId && !item.eventId));
  const roster = snap.riskRosterAssignments.filter((item) => item.eventId === eventId);
  const checkpoints = snap.riskCheckpointInstances.filter((item) => item.eventId === eventId);
  const plans = snap.riskContinuityPlans.filter((item) => item.eventId === eventId && item.current);
  const activations = snap.riskFallbackActivations.filter((item) => item.eventId === eventId);
  const dossiers = snap.riskDossierEditions.filter((item) => item.eventId === eventId);
  const budget = [...snap.riskBudgetProjections].reverse().find((item) => item.eventId === eventId);
  const openGaps = gaps.filter((item) => item.state === "OPEN" || item.state === "REOPENED");
  const overridden = gaps.filter((item) => item.state === "ACCEPTED_RISK").length;
  return {
    organisationId,
    eventId,
    overall: snapshot?.overall ?? "INDETERMINATE",
    snapshot,
    gaps,
    openGapCount: openGaps.length,
    overriddenGapCount: overridden,
    unresolvedCount: openGaps.length,
    whyNotReady: openGaps[0]?.explanation ?? (snapshot?.overall === "READY" ? "Current verified evidence covers mandatory approved rules, or residual risk is authorised." : "Protection is not ready until unknowns and gaps are resolved."),
    policies: policies.map((item) => redactPolicyEdition(item, audience)),
    roster,
    assessments: assessments.map((item) => redactVendorAssessment(item, audience)),
    checkpoints,
    plans,
    activations,
    incidents: incidents.map((item) => ({
      ...item,
      notes: notes.filter((note) => note.incidentId === item.id),
      protocol: item.lifeSafety ? "If anyone is in immediate danger, follow Maison Doclar emergency procedures and contact human emergency services. This platform has not dispatched help." : undefined,
    })),
    dossiers: dossiers.map((item) => redactDossier(item, audience)),
    budget,
    lastChange: snapshot?.evaluatedAt ?? now,
  };
}

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

export function assembleDossierOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    reason?: string;
  },
  now: string,
  actorPersonId: string,
): RiskDossierEdition {
  extractRiskEnvelope(input);
  const snapshot = [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === input.eventId);
  if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish while included data is missing");
  const copy = clientDossierCopy();
  const body = `${copy.phrases.evidenceReviewed} ${copy.phrases.knownGaps} ${copy.phrases.contingencyPrepared} ${copy.phrases.confirmationRequired}`;
  if (copy.forbidden.some((phrase) => body.toLowerCase().includes(phrase))) {
    throw new PlatformError("VALIDATION_FAILED", "dossier language cannot guarantee coverage");
  }
  const current = snap.riskDossierEditions.find((item) => item.eventId === input.eventId && item.current);
  if (current) Object.assign(current, { ...current, current: false, status: current.status === "PUBLISHED" ? "SUPERSEDED" : current.status, ...bumpVersion(current, now) });
  const record = RiskDossierEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    status: "DRAFT",
    componentHashes: [snapshot.contentHash],
    contentHash: exactHash({ snapshot: snapshot.contentHash, body }),
    languageApproved: true,
    submittedByPersonId: actorPersonId,
    dispatched: false,
    exportKind: "NONE",
    limitations: body,
    current: true,
    ...riskStamp(now),
  });
  snap.riskDossierEditions.push(record);
  return record;
}

export function transitionDossierOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    dossierId: string;
    to: RiskDossierEdition["status"];
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskDossierEdition {
  extractRiskEnvelope(input);
  const dossier = snap.riskDossierEditions.find((item) => item.id === input.dossierId && item.eventId === input.eventId);
  if (!dossier) throw new PlatformError("NOT_FOUND", "dossier edition not found");
  assertExpectedVersion(dossier.version, input.expectedVersion, "dossier");
  if (input.to === "APPROVED" || input.to === "PUBLISHED") {
    assertHumanActor(actorKind);
    assertMakerChecker(dossier.submittedByPersonId, actorPersonId, "approve or publish dossier");
  }
  if (input.to === "PUBLISHED") {
    const snapshot = snap.riskApplicabilitySnapshots.find((item) => dossier.componentHashes.includes(item.contentHash));
    if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish stale or unapproved components");
  }
  Object.assign(
    dossier,
    RiskDossierEditionSchema.parse({
      ...dossier,
      status: input.to,
      approvedByPersonId: input.to === "APPROVED" || input.to === "PUBLISHED" ? actorPersonId : dossier.approvedByPersonId,
      publishedByPersonId: input.to === "PUBLISHED" ? actorPersonId : dossier.publishedByPersonId,
      publishedAt: input.to === "PUBLISHED" ? now : dossier.publishedAt,
      dispatched: false,
      exportKind: input.to === "PUBLISHED" ? "PDF" : dossier.exportKind,
      ...bumpVersion(dossier, now),
    }),
  );
  return dossier;
}
