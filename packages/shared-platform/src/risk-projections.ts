import { exactHash } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import {
  assertExpectedVersion,
  assertMakerChecker,
  assertProtectedHuman,
  bumpVersion,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
} from "./risk-command.js";
import { redactDossier, redactIncidentNote, redactPolicyEdition, redactVendorAssessment, type RiskProjectionAudience } from "./risk-disclosure.js";
import { listGovernedProtectionParties } from "./risk-protection-parties.js";
import { derivedCertificateStatus } from "./risk-policy-operations.js";
import {
  RiskDossierEditionSchema,
  RiskDossierExportSchema,
  RiskDossierPublicationSchema,
  type RiskDossierEdition,
  type RiskDossierExport,
} from "./risk-schemas.js";
import { assertLegalTransition, DOSSIER_TRANSITIONS } from "./risk-transitions.js";
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
    sources: snap.riskSourceEditions.filter((item) => item.organisationId === organisationId).map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      jurisdiction: item.jurisdiction,
      publisher: item.publisher,
      lastVerifiedAt: item.lastVerifiedAt,
      nextReviewAt: item.nextReviewAt,
      version: item.version,
    })),
    clauses: snap.riskClauseTemplates.filter((item) => item.organisationId === organisationId).map((item) => ({
      id: item.id,
      title: item.title,
      family: item.family,
      status: item.status,
      jurisdiction: item.jurisdiction,
    })),
    clauseEditions: snap.riskClauseEditions.filter((item) => item.organisationId === organisationId && item.current).map((item) => ({
      id: item.id,
      family: item.family,
      legalReviewStatus: item.legalReviewStatus,
      commercialApprovalStatus: item.commercialApprovalStatus,
      enforceabilityClaimed: item.enforceabilityClaimed,
      version: item.version,
    })),
    vendors: snap.riskVendorAssessments.filter((item) => item.organisationId === organisationId).map((item) => redactVendorAssessment(item, audience)),
    renewals: editions.map((item) => ({
      id: item.id,
      policyType: item.policyType,
      insurerLabel: item.insurerLabel,
      endOn: item.period.endOn,
      version: item.version,
    })),
    decisionQueue: [
      ...decisions.map((item) => ({ id: item.id, kind: "RESIDUAL" as const, label: `Residual decision ${item.status}`, href: "#protection-portfolio" })),
      ...snap.riskClauseEditions
        .filter((item) => item.organisationId === organisationId && item.legalReviewStatus === "NOT_REVIEWED")
        .map((item) => ({ id: item.id, kind: "CLAUSE" as const, label: `Clause ${item.family} awaiting legal review`, href: "#protection-clauses" })),
    ],
    headlineLinks: {
      highConsequenceUnknowns: "#protection-portfolio",
      decisionsWaiting: "#protection-portfolio",
      openIncidents: "#protection-portfolio",
      untestedFallbacks: "#protection-portfolio",
    },
    policies: policies.map((item) => ({
      id: item.id,
      policyType: item.policyType,
      insurerLabel: item.insurerLabel,
      eventId: item.eventId,
      version: item.version,
    })),
    policyEditions: editions.map((item) => redactPolicyEdition(item, audience)),
    evidence: snap.riskEvidenceDocuments.filter((item) => item.organisationId === organisationId).map((item) => ({
      id: item.id,
      title: item.title,
      state: item.state,
      originalFilename: item.originalFilename,
      version: item.version,
    })),
    ruleLibrary: rules.map((item) => ({
      id: item.id,
      ruleKey: item.ruleKey,
      status: item.status,
      jurisdiction: item.jurisdiction,
      lastVerifiedAt: item.lastVerifiedAt,
      nextReviewAt: item.nextReviewAt,
      proposition: item.proposition,
      version: item.version,
    })),
    events: events.map((item) => ({
      id: item.id,
      name: item.name,
      readiness: snap.riskApplicabilitySnapshots.filter((row) => row.eventId === item.id).at(-1)?.overall ?? "INDETERMINATE",
    })),
    insurers: listGovernedProtectionParties(snap, organisationId, "INSURER"),
    vendorParties: listGovernedProtectionParties(snap, organisationId, "VENDOR"),
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
  const approvedCurrent = snap.budgetScenarioEditions.filter(
    (item) =>
      item.organisationId === organisationId &&
      item.current &&
      (item.status === "APPROVED" || item.status === "PUBLISHED"),
  );
  const governingBudget =
    approvedCurrent.find((item) => item.eventId === eventId) ?? approvedCurrent.find((item) => !item.eventId);
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
    publications: snap.riskDossierPublications.filter((item) => item.eventId === eventId),
    exports: snap.riskDossierExports.filter((item) => item.eventId === eventId),
    residuals: snap.riskResidualDecisions.filter((item) => item.eventId === eventId),
    facts: snap.riskFactEditions.filter((item) => item.eventId === eventId),
    functions: snap.riskCriticalFunctions.filter((item) => item.eventId === eventId || item.organisationId === organisationId),
    changedSinceReview: snapshot?.evaluatedAt ?? now,
    budget,
    governingBudget: governingBudget
      ? { id: governingBudget.id, version: governingBudget.version, resultHash: governingBudget.resultHash }
      : undefined,
    lastChange: snapshot?.evaluatedAt ?? now,
    insurers: listGovernedProtectionParties(snap, organisationId, "INSURER"),
    vendorParties: listGovernedProtectionParties(snap, organisationId, "VENDOR"),
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
    approvedHash?: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskDossierEdition {
  extractRiskEnvelope(input);
  const dossier = snap.riskDossierEditions.find((item) => item.id === input.dossierId && item.eventId === input.eventId);
  if (!dossier) throw new PlatformError("NOT_FOUND", "dossier edition not found");
  assertExpectedVersion(dossier.version, input.expectedVersion, "dossier");
  assertLegalTransition(DOSSIER_TRANSITIONS, dossier.status, input.to, "dossier");
  if (input.to === "SUBMITTED" || input.to === "APPROVED" || input.to === "PUBLISHED") {
    assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind);
  }
  if (input.to === "APPROVED") {
    assertMakerChecker(dossier.submittedByPersonId, actorPersonId, "approve dossier");
  }
  if (input.to === "PUBLISHED") {
    assertMakerChecker(dossier.submittedByPersonId, actorPersonId, "publish dossier");
    if (dossier.approvedByPersonId && dossier.approvedByPersonId === actorPersonId) {
      throw new PlatformError("FORBIDDEN", "approver cannot publish; a distinct publishing authority is required");
    }
    const snapshot = snap.riskApplicabilitySnapshots.find((item) => dossier.componentHashes.includes(item.contentHash));
    if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish stale or unapproved components");
    const mandatoryIndeterminate = snapshot.requirements.some((item) => {
      const rule = snap.riskRuleEditions.find((row) => row.id === item.ruleEditionId);
      return item.decision === "INDETERMINATE" && Boolean(rule?.mandatory);
    });
    if (snapshot.overall === "STALE" || mandatoryIndeterminate) {
      throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish while included data is stale or indeterminate");
    }
    if (!input.approvedHash || input.approvedHash !== dossier.contentHash) {
      throw new PlatformError("VALIDATION_FAILED", "publication requires the approved exact hash");
    }
    const existingPublication = snap.riskDossierPublications.find(
      (item) => item.eventId === input.eventId && item.approvedHash === dossier.contentHash && item.current,
    );
    if (existingPublication) return dossier;
    const publicationNumber = snap.riskDossierPublications.filter((item) => item.eventId === input.eventId).length + 1;
    for (const prior of snap.riskDossierPublications.filter((item) => item.eventId === input.eventId && item.current)) {
      Object.assign(prior, { ...prior, current: false, ...bumpVersion(prior, now) });
    }
    snap.riskDossierPublications.push(
      RiskDossierPublicationSchema.parse({
        id: newRiskId(),
        organisationId: input.organisationId,
        eventId: input.eventId,
        dossierId: dossier.id,
        approvedHash: dossier.contentHash,
        publicationNumber,
        publishedAt: now,
        publishedByPersonId: actorPersonId,
        current: true,
        dispatched: false,
        clientMessages: [],
        ...riskStamp(now),
      }),
    );
  }
  Object.assign(
    dossier,
    RiskDossierEditionSchema.parse({
      ...dossier,
      status: input.to,
      current: input.to === "WITHDRAWN" || input.to === "SUPERSEDED" ? false : dossier.current,
      approvedByPersonId: input.to === "APPROVED" ? actorPersonId : dossier.approvedByPersonId,
      publishedByPersonId: input.to === "PUBLISHED" ? actorPersonId : dossier.publishedByPersonId,
      publishedAt: input.to === "PUBLISHED" ? now : dossier.publishedAt,
      dispatched: false,
      exportKind: input.to === "PUBLISHED" ? "PDF" : dossier.exportKind,
      ...bumpVersion(dossier, now),
    }),
  );
  return dossier;
}

export function exportDossierOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    dossierId: string;
  },
  now: string,
  actorPersonId: string,
): RiskDossierExport {
  extractRiskEnvelope(input);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId);
  const dossier = snap.riskDossierEditions.find((item) => item.id === input.dossierId && item.eventId === input.eventId);
  if (!dossier || dossier.status !== "PUBLISHED") {
    throw new PlatformError("VALIDATION_FAILED", "export requires a published dossier edition");
  }
  const publication = snap.riskDossierPublications.find((item) => item.dossierId === dossier.id && item.current);
  if (!publication) throw new PlatformError("NOT_FOUND", "dossier publication was not found");
  const record = RiskDossierExportSchema.parse({
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
  snap.riskDossierExports.push(record);
  return record;
}

export function publishedClientDossierProjection(snap: PlatformSnapshot, organisationId: string, eventId: string) {
  const publication = [...snap.riskDossierPublications].reverse().find((item) => item.eventId === eventId && item.current);
  const dossier = publication ? snap.riskDossierEditions.find((item) => item.id === publication.dossierId) : undefined;
  const copy = clientDossierCopy();
  return {
    organisationId,
    eventId,
    published: Boolean(publication && dossier?.status === "PUBLISHED"),
    publicationNumber: publication?.publicationNumber,
    publishedAt: publication?.publishedAt,
    contentHash: dossier?.contentHash,
    limitations: dossier?.limitations,
    phrases: copy.phrases,
    messages: publication?.clientMessages ?? [],
    canEditStaffTruth: false,
  };
}

export function recordClientDossierMessageOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    kind: "ACKNOWLEDGE" | "QUESTION";
    body: string;
  },
  now: string,
  actorPersonId: string,
) {
  extractRiskEnvelope(input);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, undefined, input.organisationId);
  const publication = snap.riskDossierPublications.find((item) => item.eventId === input.eventId && item.current);
  if (!publication) throw new PlatformError("NOT_FOUND", "no published client dossier is available");
  const dossier = snap.riskDossierEditions.find((item) => item.id === publication.dossierId);
  if (!dossier || dossier.status !== "PUBLISHED") {
    throw new PlatformError("VALIDATION_FAILED", "client messages require a published dossier");
  }
  publication.clientMessages = [
    ...(publication.clientMessages ?? []),
    {
      id: newRiskId(),
      kind: input.kind,
      body: input.body.trim(),
      createdByPersonId: actorPersonId,
      createdAt: now,
    },
  ];
  Object.assign(publication, bumpVersion(publication, now));
  return publication;
}
