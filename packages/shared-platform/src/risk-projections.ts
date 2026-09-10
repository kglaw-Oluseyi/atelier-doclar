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
import { projectCheckpointInstances } from "./risk-continuity.js";
import { listGovernedProtectionParties } from "./risk-protection-parties.js";
import { derivedCertificateStatus } from "./risk-policy-operations.js";
import {
  RiskDossierEditionSchema,
  RiskDossierExportSchema,
  RiskDossierPublicationSchema,
  type RiskDossierEdition,
  type RiskDossierExport,
  type RiskDossierPublication,
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
      renderedBody: item.renderedBody,
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
    checkpointInstances: projectCheckpointInstances(snap, eventId, now),
    plans,
    activations,
    incidents: incidents.map((item) => ({
      ...item,
      notes: notes.filter((note) => note.incidentId === item.id),
      protocol: item.lifeSafety ? "If anyone is in immediate danger, follow Maison Doclar emergency procedures and contact human emergency services. This platform has not dispatched help." : undefined,
    })),
    dossiers: dossiers.map((item) => redactDossier(item, audience)),
    workingDossier: currentWorkingDossier(snap, eventId) ? redactDossier(currentWorkingDossier(snap, eventId)!, audience) : undefined,
    publishedDossier: publishedDossierEdition(snap, eventId) ? redactDossier(publishedDossierEdition(snap, eventId)!, audience) : undefined,
    currentPublication: currentDossierPublication(snap, eventId),
    accessGrants: (snap.riskDossierAccessGrants ?? []).filter((item) => item.eventId === eventId),
    learnings: snap.riskLearningProposals.filter((item) => item.eventId === eventId),
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

const WORKING_STATUSES = new Set(["DRAFT", "SUBMITTED", "APPROVED"]);

export function currentWorkingDossier(snap: PlatformSnapshot, eventId: string): RiskDossierEdition | undefined {
  return [...snap.riskDossierEditions]
    .reverse()
    .find((item) => item.eventId === eventId && item.current && WORKING_STATUSES.has(item.status));
}

export function currentDossierPublication(snap: PlatformSnapshot, eventId: string): RiskDossierPublication | undefined {
  return [...snap.riskDossierPublications]
    .reverse()
    .find(
      (item) =>
        item.eventId === eventId &&
        (item.status === "CURRENT" || (item.current && item.status !== "SUPERSEDED" && item.status !== "WITHDRAWN")),
    );
}

export function publishedDossierEdition(snap: PlatformSnapshot, eventId: string): RiskDossierEdition | undefined {
  const publication = currentDossierPublication(snap, eventId);
  const editionId = publication?.editionId ?? publication?.dossierId;
  return editionId ? snap.riskDossierEditions.find((item) => item.id === editionId) : undefined;
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
  const current = currentWorkingDossier(snap, input.eventId);
  const priorCurrent = snap.riskDossierEditions.find((item) => item.eventId === input.eventId && item.current);
  if (current) {
    Object.assign(current, { ...current, current: false, ...bumpVersion(current, now) });
  } else if (priorCurrent && priorCurrent.status !== "PUBLISHED") {
    Object.assign(priorCurrent, { ...priorCurrent, current: false, ...bumpVersion(priorCurrent, now) });
  } else if (priorCurrent) {
    Object.assign(priorCurrent, { ...priorCurrent, current: false, ...bumpVersion(priorCurrent, now) });
  }
  const versionNumber = snap.riskDossierEditions.filter((item) => item.eventId === input.eventId).length + 1;
  const record = RiskDossierEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    versionNumber,
    status: "DRAFT",
    componentHashes: [snapshot.contentHash],
    contentHash: exactHash({ snapshot: snapshot.contentHash, body }),
    languageApproved: true,
    authorPersonId: actorPersonId,
    submittedByPersonId: actorPersonId,
    supersedesEditionId: current?.id ?? priorCurrent?.id,
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
    assertMakerChecker(dossier.authorPersonId ?? dossier.submittedByPersonId, actorPersonId, "approve dossier");
    if (dossier.submittedByPersonId) assertMakerChecker(dossier.submittedByPersonId, actorPersonId, "approve dossier");
  }
  if (input.to === "PUBLISHED") {
    publishDossierOnSnap(
      snap,
      {
        ...input,
        editionId: input.dossierId,
        approvedHash: input.approvedHash,
      },
      now,
      actorPersonId,
      actorKind,
    );
    return snap.riskDossierEditions.find((item) => item.id === dossier.id) ?? dossier;
  }
  if (input.to === "SUBMITTED") {
    Object.assign(
      dossier,
      RiskDossierEditionSchema.parse({
        ...dossier,
        status: "SUBMITTED",
        submittedByPersonId: actorPersonId,
        submittedAt: now,
        dispatched: false,
        ...bumpVersion(dossier, now),
      }),
    );
    return dossier;
  }
  Object.assign(
    dossier,
    RiskDossierEditionSchema.parse({
      ...dossier,
      status: input.to,
      current: input.to === "WITHDRAWN" || input.to === "SUPERSEDED" ? false : dossier.current,
      approvedByPersonId: input.to === "APPROVED" ? actorPersonId : dossier.approvedByPersonId,
      approvedAt: input.to === "APPROVED" ? now : dossier.approvedAt,
      approvedHash: input.to === "APPROVED" ? dossier.contentHash : dossier.approvedHash,
      dispatched: false,
      ...bumpVersion(dossier, now),
    }),
  );
  return dossier;
}

export function publishDossierOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    dossierId?: string;
    editionId?: string;
    approvedHash?: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskDossierPublication {
  extractRiskEnvelope(input);
  const editionId = input.editionId ?? input.dossierId;
  if (!editionId) throw new PlatformError("VALIDATION_FAILED", "publication requires an edition id");
  const edition = snap.riskDossierEditions.find(
    (item) => item.id === editionId && item.eventId === input.eventId && item.organisationId === input.organisationId,
  );
  if (!edition) throw new PlatformError("NOT_FOUND", "dossier edition not found");
  if (edition.status !== "APPROVED" && edition.status !== "PUBLISHED") {
    throw new PlatformError("TRANSITION_INVALID", "only an approved dossier edition can be published");
  }
  if (!input.approvedHash || input.approvedHash !== edition.contentHash || (edition.approvedHash && edition.approvedHash !== input.approvedHash)) {
    throw new PlatformError("VALIDATION_FAILED", "publication requires the approved exact hash");
  }
  const authorPersonId = edition.authorPersonId ?? edition.submittedByPersonId;
  assertMakerChecker(authorPersonId, actorPersonId, "publish dossier");
  if (edition.submittedByPersonId) assertMakerChecker(edition.submittedByPersonId, actorPersonId, "publish dossier");
  if (edition.approvedByPersonId && edition.approvedByPersonId === actorPersonId) {
    throw new PlatformError("FORBIDDEN", "approver cannot publish; a distinct publishing authority is required");
  }
  assertExpectedVersion(edition.version, input.expectedVersion, "dossier");
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind);
  const snapshot = snap.riskApplicabilitySnapshots.find((item) => edition.componentHashes.includes(item.contentHash));
  if (!snapshot) throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish stale or unapproved components");
  const mandatoryIndeterminate = snapshot.requirements.some((item) => {
    const rule = snap.riskRuleEditions.find((row) => row.id === item.ruleEditionId);
    return item.decision === "INDETERMINATE" && Boolean(rule?.mandatory);
  });
  if (snapshot.overall === "STALE" || mandatoryIndeterminate) {
    throw new PlatformError("VALIDATION_FAILED", "dossier cannot publish while included data is stale or indeterminate");
  }
  const existingPublication = currentDossierPublication(snap, input.eventId);
  if (existingPublication && (existingPublication.approvedHash === edition.contentHash || existingPublication.contentHash === edition.contentHash) && (existingPublication.dossierId === edition.id || existingPublication.editionId === edition.id)) {
    return existingPublication;
  }
  const priorCurrent = snap.riskDossierPublications.filter(
    (item) => item.eventId === input.eventId && (item.current || item.status === "CURRENT"),
  );
  const publicationNumber = snap.riskDossierPublications.filter((item) => item.eventId === input.eventId).length + 1;
  for (const prior of priorCurrent) {
    Object.assign(prior, {
      ...prior,
      current: false,
      status: "SUPERSEDED",
      ...bumpVersion(prior, now),
    });
  }
  const record = RiskDossierPublicationSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    dossierId: edition.id,
    editionId: edition.id,
    contentHash: edition.contentHash,
    approvedHash: edition.contentHash,
    publicationNumber,
    status: "CURRENT",
    publishedAt: now,
    publishedByPersonId: actorPersonId,
    supersedesPublicationId: priorCurrent[0]?.id,
    current: true,
    dispatched: false,
    clientMessages: [],
    ...riskStamp(now),
  });
  snap.riskDossierPublications.push(record);
  Object.assign(
    edition,
    RiskDossierEditionSchema.parse({
      ...edition,
      approvedHash: edition.contentHash,
      publishedByPersonId: actorPersonId,
      publishedAt: now,
      exportKind: "PDF",
      dispatched: false,
      ...bumpVersion(edition, now),
    }),
  );
  const verified = currentDossierPublication(snap, input.eventId);
  const verifiedEdition = publishedDossierEdition(snap, input.eventId);
  if (!verified || verified.id !== record.id || !verifiedEdition || verifiedEdition.id !== edition.id) {
    throw new PlatformError("INTERNAL_ERROR", "publication did not verify after write");
  }
  if ((verified.contentHash ?? verified.approvedHash) !== edition.contentHash) {
    throw new PlatformError("INTERNAL_ERROR", "publication hash did not verify after write");
  }
  return verified;
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
  const publication = currentDossierPublication(snap, input.eventId);
  if (!dossier || !publication || (publication.dossierId !== dossier.id && publication.editionId !== dossier.id)) {
    throw new PlatformError("VALIDATION_FAILED", "export requires a published dossier edition");
  }
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
  const publication = currentDossierPublication(snap, eventId);
  const editionId = publication?.editionId ?? publication?.dossierId;
  const dossier = editionId ? snap.riskDossierEditions.find((item) => item.id === editionId) : undefined;
  const publicationHash = publication?.contentHash ?? publication?.approvedHash;
  const hashOk = Boolean(publication && dossier && publicationHash === dossier.contentHash);
  const copy = clientDossierCopy();
  return {
    organisationId,
    eventId,
    published: hashOk,
    publicationNumber: publication?.publicationNumber,
    publishedAt: publication?.publishedAt,
    contentHash: hashOk ? dossier?.contentHash : undefined,
    limitations: hashOk ? dossier?.limitations : undefined,
    phrases: copy.phrases,
    messages: hashOk ? (publication?.clientMessages ?? []) : [],
    canEditStaffTruth: false,
    workingEditionId: currentWorkingDossier(snap, eventId)?.id,
    publishedEditionId: hashOk ? dossier?.id : undefined,
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
  const publication = currentDossierPublication(snap, input.eventId);
  if (!publication) throw new PlatformError("NOT_FOUND", "no published client dossier is available");
  const dossier = publishedDossierEdition(snap, input.eventId);
  const publicationHash = publication.contentHash ?? publication.approvedHash;
  if (!dossier || publicationHash !== dossier.contentHash) {
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
