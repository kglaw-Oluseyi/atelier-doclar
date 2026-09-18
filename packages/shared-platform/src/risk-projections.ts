import { PlatformError } from "./errors.js";
import { selectEffectiveRiskAuthorities } from "./risk-authority.js";
import {
  assertExpectedVersion,
  assertMakerCheckerFor,
  assertProtectedHuman,
  bumpVersion,
  extractRiskEnvelope,
  newRiskId,
} from "./risk-command.js";
import {
  assertExactApprovedHash,
  assertPublicationActors,
  assertPublicationEligibility,
  buildDossierEdition,
  buildDossierExport,
  clientDossierCopy,
  decideDossierPublication,
  decideDossierTransition,
  isCurrentPublication,
  isWorkingDossier,
  publicationIsReplay,
  requireApplicabilityForAssemble,
} from "./risk-dossier-decisions.js";
import { redactDossier, redactIncidentNote, redactPolicyEdition, redactVendorAssessment, type RiskProjectionAudience } from "./risk-disclosure.js";
import { projectCheckpointInstances } from "./risk-continuity.js";
import { listGovernedProtectionParties } from "./risk-protection-parties.js";
import { derivedCertificateStatus } from "./risk-policy-operations.js";
import {
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
  const authorities = selectEffectiveRiskAuthorities(snap, organisationId, now);
  const governingRuleIds = new Set(
    authorities.filter((item) => item.authorityState === "CURRENT_APPROVED" || item.authorityState === "STALE_APPROVED").map((item) => item.rule.id),
  );
  const governingSourceIds = new Set(authorities.flatMap((item) => item.sources.map((source) => source.id)));
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
      contentHash: item.contentHash,
      version: item.version,
      governing: governingSourceIds.has(item.id),
      historyOnly: !governingSourceIds.has(item.id),
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
      contentHash: item.contentHash,
      supersedesEditionId: item.supersedesEditionId,
      version: item.version,
      governing: governingRuleIds.has(item.id),
      historyOnly: !governingRuleIds.has(item.id),
    })),
    effectiveAuthorities: authorities.map((item) => ({
      ruleId: item.rule.id,
      ruleKey: item.rule.ruleKey,
      requirementKey: item.rule.requirementKey,
      status: item.rule.status,
      contentHash: item.rule.contentHash,
      nextReviewAt: item.rule.nextReviewAt,
      lastVerifiedAt: item.rule.lastVerifiedAt,
      version: item.rule.version,
      authorityState: item.authorityState,
      reasons: item.reasons,
      governing: item.authorityState === "CURRENT_APPROVED" || item.authorityState === "STALE_APPROVED",
      sources: item.sources.map((source) => ({
        id: source.id,
        title: source.title,
        status: source.status,
        contentHash: source.contentHash,
        nextReviewAt: source.nextReviewAt,
        lastVerifiedAt: source.lastVerifiedAt,
        version: source.version,
      })),
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
  const eventSnapshots = snap.riskApplicabilitySnapshots.filter((item) => item.eventId === eventId);
  const snapshot = [...eventSnapshots].reverse()[0];
  const previousSnapshot = [...eventSnapshots].reverse()[1];
  const authorities = selectEffectiveRiskAuthorities(snap, organisationId, now);
  const gaps = snap.riskGapFindings.filter((item) => item.eventId === eventId);
  const currentGaps = snapshot ? gaps.filter((item) => item.snapshotId === snapshot.id) : [];
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
  const currentOpenGaps = currentGaps.filter((item) => item.state === "OPEN" || item.state === "REOPENED");
  return {
    organisationId,
    eventId,
    overall: snapshot?.overall ?? "INDETERMINATE",
    snapshot,
    previousSnapshot,
    readinessChange:
      previousSnapshot && snapshot
        ? previousSnapshot.overall === snapshot.overall
          ? `Readiness remained ${snapshot.overall}. Effective governing rule IDs: ${(snapshot.ruleEditionIds ?? []).join(", ") || "none"}.`
          : `Readiness changed from ${previousSnapshot.overall} to ${snapshot.overall}. Effective governing rule IDs: ${(snapshot.ruleEditionIds ?? []).join(", ") || "none"}.`
        : snapshot
          ? `Current readiness ${snapshot.overall}. Effective governing rule IDs: ${(snapshot.ruleEditionIds ?? []).join(", ") || "none"}.`
          : "No applicability snapshot has been captured yet.",
    effectiveAuthorities: authorities.map((item) => ({
      ruleId: item.rule.id,
      ruleKey: item.rule.ruleKey,
      requirementKey: item.rule.requirementKey,
      status: item.rule.status,
      contentHash: item.rule.contentHash,
      nextReviewAt: item.rule.nextReviewAt,
      authorityState: item.authorityState,
      reasons: item.reasons,
      governing: item.authorityState === "CURRENT_APPROVED" || item.authorityState === "STALE_APPROVED",
      sources: item.sources.map((source) => ({ id: source.id, title: source.title, contentHash: source.contentHash, nextReviewAt: source.nextReviewAt })),
    })),
    gaps: currentGaps,
    openGapCount: currentGaps.filter((item) => item.state === "OPEN" || item.state === "REOPENED").length,
    overriddenGapCount: currentGaps.filter((item) => item.state === "ACCEPTED_RISK").length,
    unresolvedCount: currentGaps.filter((item) => item.state === "OPEN" || item.state === "REOPENED").length,
    whyNotReady: currentOpenGaps[0]?.explanation ?? (snapshot?.overall === "READY" ? "Current verified evidence covers mandatory approved rules, or residual risk is authorised." : "Protection is not ready until unknowns and gaps are resolved."),
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

export { clientDossierCopy };

export function currentWorkingDossier(snap: PlatformSnapshot, eventId: string): RiskDossierEdition | undefined {
  return [...snap.riskDossierEditions].reverse().find((item) => item.eventId === eventId && isWorkingDossier(item));
}

export function currentDossierPublication(snap: PlatformSnapshot, eventId: string): RiskDossierPublication | undefined {
  return [...snap.riskDossierPublications].reverse().find((item) => item.eventId === eventId && isCurrentPublication(item));
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
  const snapshot = requireApplicabilityForAssemble(
    [...snap.riskApplicabilitySnapshots].reverse().find((item) => item.eventId === input.eventId),
  );
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
  const record = buildDossierEdition({
    organisationId: input.organisationId,
    eventId: input.eventId,
    now,
    actorPersonId,
    snapshotHash: snapshot.contentHash,
    versionNumber,
    supersedesEditionId: current?.id ?? priorCurrent?.id,
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
    assertMakerCheckerFor(snap, dossier.authorPersonId ?? dossier.submittedByPersonId, actorPersonId, "approve dossier", input.organisationId);
    if (dossier.submittedByPersonId) {
      assertMakerCheckerFor(snap, dossier.submittedByPersonId, actorPersonId, "approve dossier", input.organisationId);
    }
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
  Object.assign(
    dossier,
    decideDossierTransition(dossier, input, actorPersonId, now, {
      snap,
      organisationId: input.organisationId,
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
  assertPublicationEligibility(edition);
  assertExactApprovedHash(edition, input.approvedHash);
  assertPublicationActors(edition, actorPersonId, snap);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind);
  const snapshot = snap.riskApplicabilitySnapshots.find((item) => edition.componentHashes.includes(item.contentHash));
  const mandatoryIndeterminate = Boolean(
    snapshot?.requirements.some((item) => {
      const rule = snap.riskRuleEditions.find((row) => row.id === item.ruleEditionId);
      return item.decision === "INDETERMINATE" && Boolean(rule?.mandatory);
    }),
  );
  const existingPublication = currentDossierPublication(snap, input.eventId);
  if (existingPublication && publicationIsReplay(existingPublication, edition)) return existingPublication;
  const publicationNumber = snap.riskDossierPublications.filter((item) => item.eventId === input.eventId).length + 1;
  const decided = decideDossierPublication(
    edition,
    existingPublication,
    { organisationId: input.organisationId, eventId: input.eventId, expectedVersion: input.expectedVersion, approvedHash: input.approvedHash, publicationNumber },
    actorPersonId,
    now,
    snapshot,
    mandatoryIndeterminate,
  );
  if (decided.application === "REPLAYED") return decided.publication;
  if (decided.priorPatch && existingPublication) Object.assign(existingPublication, decided.priorPatch);
  snap.riskDossierPublications.push(decided.publication);
  Object.assign(edition, decided.editionPatch);
  const record = decided.publication;
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
  if (!dossier || !publication) {
    throw new PlatformError("VALIDATION_FAILED", "export requires a published dossier edition");
  }
  const record = buildDossierExport(dossier, publication, input, now, actorPersonId);
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
