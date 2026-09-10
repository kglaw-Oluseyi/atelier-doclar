import { exactHash, nfc } from "./eec-hash.js";
import { PlatformError } from "./errors.js";
import { resolveApplicability } from "./risk-applicability.js";
import {
  assertDocumentTransition,
  assertExpectedVersion,
  assertIndependentChecker,
  assertMakerChecker,
  assertProtectedHuman,
  assertSameEvent,
  assertSameOrganisation,
  bumpVersion,
  newRiskId,
  extractRiskEnvelope,
  riskStamp,
  sealSensitive,
} from "./risk-command.js";
import { parseRiskSchema } from "./risk-form-contract.js";
import { assertGovernedProtectionParty } from "./risk-protection-parties.js";
import { gapIdentity, inheritResidualDecision, matchCoverage, taxonomyForReasons } from "./risk-gap-engine.js";
import { assertLegalTransition, GAP_TRANSITIONS, POLICY_EVIDENCE_TRANSITIONS } from "./risk-transitions.js";
import {
  RiskApplicabilitySnapshotSchema,
  RiskEvidenceDocumentSchema,
  RiskFactEditionSchema,
  RiskGapFindingSchema,
  RiskPolicyEditionSchema,
  RiskPolicySchema,
  RiskResidualDecisionSchema,
  RiskRuleEditionSchema,
  RiskSourceEditionSchema,
  type RiskApplicabilitySnapshot,
  type RiskEvidenceDocument,
  type RiskFactEdition,
  type RiskGapFinding,
  type RiskPolicy,
  type RiskPolicyEdition,
  type RiskResidualDecision,
  type RiskRuleEdition,
  type RiskSourceEdition,
} from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function envelope(raw: unknown, organisationId: string, eventId?: string) {
  const parsed = extractRiskEnvelope(raw);
  assertSameOrganisation(parsed.organisationId, organisationId);
  assertSameEvent(parsed.eventId, eventId);
  return parsed;
}

export function createSourceEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    title: string;
    publisher: string;
    locator: string;
    authority: RiskSourceEdition["authority"];
    jurisdiction: string;
    summary: string;
    excerpt?: string;
    retrievedAt: string;
    lastVerifiedAt: string;
    nextReviewAt: string;
  },
  now: string,
  _actorPersonId: string,
): RiskSourceEdition {
  envelope(input, input.organisationId);
  const record = RiskSourceEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    title: nfc(input.title),
    publisher: input.publisher,
    locator: input.locator,
    authority: input.authority,
    jurisdiction: input.jurisdiction,
    retrievedAt: input.retrievedAt,
    lastVerifiedAt: input.lastVerifiedAt,
    nextReviewAt: input.nextReviewAt,
    excerpt: input.excerpt,
    summary: input.summary,
    status: "DISCOVERY",
    discoveryOnly: true,
    contentHash: exactHash({ title: nfc(input.title), locator: input.locator, summary: input.summary }),
    authorPersonId: _actorPersonId,
    submittedByPersonId: _actorPersonId,
    submittedAt: now,
    ...riskStamp(now),
  });
  snap.riskSourceEditions.push(record);
  return record;
}

export function approveSourceEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string; sourceId: string },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskSourceEdition {
  envelope(input, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  const source = snap.riskSourceEditions.find((item) => item.id === input.sourceId && item.organisationId === input.organisationId);
  if (!source) throw new PlatformError("NOT_FOUND", "source edition not found");
  assertExpectedVersion(source.version, input.expectedVersion, "source");
  assertIndependentChecker({
    actorPersonId,
    authorPersonId: source.authorPersonId,
    submitterPersonId: source.submittedByPersonId,
    action: "approve",
  });
  Object.assign(
    source,
    RiskSourceEditionSchema.parse({
      ...source,
      status: "APPROVED",
      discoveryOnly: false,
      lastVerifiedAt: now,
      approvedByPersonId: actorPersonId,
      approvedAt: now,
      approvedHash: source.contentHash,
      ...bumpVersion(source, now),
    }),
  );
  return source;
}

export function createRuleEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    ruleKey: string;
    jurisdiction: string;
    proposition: string;
    sourceEditionIds: string[];
    requirementKey: string;
    policyType?: RiskRuleEdition["policyType"];
    mandatory: boolean;
    effectiveFrom?: string;
    effectiveTo?: string;
  },
  now: string,
  actorPersonId: string,
): RiskRuleEdition {
  envelope(input, input.organisationId);
  const sources = input.sourceEditionIds.map((id) => {
    const source = snap.riskSourceEditions.find((item) => item.id === id && item.organisationId === input.organisationId);
    if (!source) throw new PlatformError("NOT_FOUND", "source edition is not in this organisation");
    return source;
  });
  const record = RiskRuleEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    ruleKey: input.ruleKey,
    jurisdiction: input.jurisdiction,
    proposition: input.proposition,
    sourceEditionIds: sources.map((item) => item.id),
    requirementKey: input.requirementKey,
    policyType: input.policyType,
    mandatory: input.mandatory,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    lastVerifiedAt: now,
    nextReviewAt: now,
    status: "DISCOVERY",
    contentHash: exactHash({ ruleKey: input.ruleKey, proposition: input.proposition, sources: input.sourceEditionIds }),
    createdByPersonId: actorPersonId,
    submittedByPersonId: actorPersonId,
    submittedAt: now,
    ...riskStamp(now),
  });
  snap.riskRuleEditions.push(record);
  return record;
}

export function reviewRuleEditionOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string; ruleId: string; status: "COUNSEL_REVIEWED" | "APPROVED" | "WITHDRAWN" },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskRuleEdition {
  envelope(input, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind, input.organisationId);
  const rule = snap.riskRuleEditions.find((item) => item.id === input.ruleId && item.organisationId === input.organisationId);
  if (!rule) throw new PlatformError("NOT_FOUND", "rule edition not found");
  assertExpectedVersion(rule.version, input.expectedVersion, "rule");
  if (input.status === "APPROVED") {
    assertIndependentChecker({
      actorPersonId,
      authorPersonId: rule.createdByPersonId,
      submitterPersonId: rule.submittedByPersonId ?? rule.createdByPersonId,
      action: "approve",
    });
  }
  if (input.status === "APPROVED") {
    const sources = snap.riskSourceEditions.filter((item) => rule.sourceEditionIds.includes(item.id));
    if (sources.some((item) => item.status === "DISCOVERY" || item.status === "WITHDRAWN")) {
      throw new PlatformError("VALIDATION_FAILED", "an inaccessible or discovery-only source cannot silently become an approved rule");
    }
  }
  const next = RiskRuleEditionSchema.parse({
    ...rule,
    status: input.status,
    reviewedByPersonId: actorPersonId,
    approvedByPersonId: input.status === "APPROVED" ? actorPersonId : rule.approvedByPersonId,
    approvedAt: input.status === "APPROVED" ? now : rule.approvedAt,
    approvedHash: input.status === "APPROVED" ? rule.contentHash : rule.approvedHash,
    lastVerifiedAt: now,
    ...bumpVersion(rule, now),
  });
  Object.assign(rule, next);
  return rule;
}

export function createEvidenceDocumentOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    title: string;
    classification: RiskEvidenceDocument["classification"];
    originalFilename?: string;
  },
  now: string,
  actorPersonId: string,
): RiskEvidenceDocument {
  envelope(input, input.organisationId, input.eventId);
  if (input.originalFilename && /[<>:"\\]|javascript:|<\?/.test(input.originalFilename)) {
    throw new PlatformError("VALIDATION_FAILED", "filename contains unsafe characters");
  }
  const record = RiskEvidenceDocumentSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    title: input.title,
    classification: input.classification,
    state: "PENDING_UPLOAD",
    scanStatus: "NOT_SCANNED",
    originalFilename: input.originalFilename,
    uploadedByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskEvidenceDocuments.push(record);
  return record;
}

export function completeEvidenceUploadOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    documentId: string;
    objectKey: string;
    byteChecksum: string;
    byteLength: number;
    contentType: string;
    scanAdapter: "INACTIVE" | "READY";
  },
  now: string,
): RiskEvidenceDocument {
  envelope(input, input.organisationId);
  const document = snap.riskEvidenceDocuments.find((item) => item.id === input.documentId && item.organisationId === input.organisationId);
  if (!document) throw new PlatformError("NOT_FOUND", "evidence document not found");
  assertExpectedVersion(document.version, input.expectedVersion, "document");
  assertDocumentTransition(document.state, "UPLOADED");
  if (input.byteLength > 20_000_000) throw new PlatformError("VALIDATION_FAILED", "upload exceeds size limit");
  if (!input.byteChecksum) throw new PlatformError("VALIDATION_FAILED", "hash identity is required");
  const duplicate = snap.riskEvidenceDocuments.find(
    (item) => item.id !== document.id && item.organisationId === input.organisationId && item.byteChecksum === input.byteChecksum && item.state !== "REJECTED",
  );
  const nextState = input.scanAdapter === "READY" ? "SCAN_PENDING" : "UPLOADED";
  const next = RiskEvidenceDocumentSchema.parse({
    ...document,
    state: nextState,
    scanStatus: input.scanAdapter === "READY" ? "SCAN_PENDING" : "NOT_SCANNED",
    objectKey: input.objectKey,
    byteChecksum: input.byteChecksum,
    byteLength: input.byteLength,
    contentType: input.contentType,
    rejectionReason: duplicate ? "duplicate bytes of another certificate" : document.rejectionReason,
    ...bumpVersion(document, now),
  });
  Object.assign(document, next);
  return document;
}

export function applyEvidenceScanOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; documentId: string; expectedVersion: number; assignmentId: string; idempotencyKey: string; scanStatus: "CLEAN" | "QUARANTINED" | "SCAN_FAILED" },
  now: string,
): RiskEvidenceDocument {
  envelope(input, input.organisationId);
  const document = snap.riskEvidenceDocuments.find((item) => item.id === input.documentId && item.organisationId === input.organisationId);
  if (!document) throw new PlatformError("NOT_FOUND", "evidence document not found");
  assertExpectedVersion(document.version, input.expectedVersion, "document");
  const to = input.scanStatus === "CLEAN" ? "CLEAN" : input.scanStatus;
  assertDocumentTransition(document.state, to);
  Object.assign(document, RiskEvidenceDocumentSchema.parse({ ...document, state: to, scanStatus: input.scanStatus, ...bumpVersion(document, now) }));
  return document;
}

export function createPolicyOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    policyType: RiskPolicy["policyType"];
    insurerPartyId: string;
    insurerLabel?: string;
  },
  now: string,
  actorPersonId: string,
): RiskPolicy {
  envelope(input, input.organisationId, input.eventId);
  const insurer = assertGovernedProtectionParty(snap, input.organisationId, input.insurerPartyId, "INSURER");
  const record = parseRiskSchema(RiskPolicySchema, {
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    scopeKind: input.eventId ? "EVENT" : "ORGANISATION",
    policyType: input.policyType,
    insurerPartyId: insurer.id,
    insurerLabel: input.insurerLabel?.trim() || insurer.label,
    createdByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskPolicies.push(record);
  return record;
}

export function createPolicyEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId?: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    policyId: string;
    policyNumber: string;
    currency: string;
    period: { startOn: string; endOn: string };
    limits: RiskPolicyEdition["limits"];
    deductibles: RiskPolicyEdition["deductibles"];
    insuredPartyLabels: string[];
    documentEditionId: string;
    territorialScope?: string;
    activityScope?: string;
    exclusionNotes?: string;
    endorsementNotes?: string;
    assetInventoryRefs?: string[];
  },
  now: string,
  actorPersonId: string,
): RiskPolicyEdition {
  envelope(input, input.organisationId, input.eventId);
  const policy = snap.riskPolicies.find((item) => item.id === input.policyId && item.organisationId === input.organisationId);
  if (!policy) throw new PlatformError("NOT_FOUND", "policy not found");
  assertExpectedVersion(policy.version, input.expectedVersion, "policy");
  const document = snap.riskEvidenceDocuments.find((item) => item.id === input.documentEditionId && item.organisationId === input.organisationId);
  if (!document) throw new PlatformError("NOT_FOUND", "policy document not found");
  if (document.state === "QUARANTINED") throw new PlatformError("VALIDATION_FAILED", "quarantined document cannot become coverage evidence");
  for (const limit of input.limits) {
    if (limit.limit.minor.startsWith("-") && limit.limit.minor !== "0") throw new PlatformError("VALIDATION_FAILED", "negative coverage limits are forbidden");
    if (limit.limit.minor.includes(".")) throw new PlatformError("VALIDATION_FAILED", "fractional minor units are forbidden");
  }
  const previous = snap.riskPolicyEditions.find((item) => item.policyId === policy.id && item.current);
  if (previous) {
    Object.assign(previous, RiskPolicyEditionSchema.parse({ ...previous, current: false, verificationState: "SUPERSEDED", ...bumpVersion(previous, now) }));
  }
  const edition = RiskPolicyEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId ?? policy.eventId,
    policyId: policy.id,
    policyType: policy.policyType,
    insurerPartyId: policy.insurerPartyId,
    insurerLabel: policy.insurerLabel,
    policyNumberCiphertext: sealSensitive("policy-number", input.policyNumber),
    currency: input.currency,
    period: input.period,
    limits: input.limits,
    deductibles: input.deductibles,
    territorialScope: input.territorialScope,
    activityScope: input.activityScope,
    insuredPartyLabels: input.insuredPartyLabels,
    assetInventoryRefs: input.assetInventoryRefs ?? [],
    endorsementNotes: input.endorsementNotes,
    exclusionNotes: input.exclusionNotes,
    documentEditionId: document.id,
    verificationState: "SUBMITTED",
    submittedByPersonId: actorPersonId,
    contentHash: exactHash({
      policyId: policy.id,
      period: input.period,
      limits: input.limits,
      document: document.byteChecksum ?? document.id,
    }),
    supersedesEditionId: previous?.id,
    current: true,
    ...riskStamp(now),
  });
  snap.riskPolicyEditions.push(edition);
  Object.assign(policy, { ...policy, currentEditionId: edition.id, ...bumpVersion(policy, now) });
  return edition;
}

export function verifyPolicyEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    editionId: string;
    decision: "VERIFIED" | "REJECTED";
    reason?: string;
    eventEndOn?: string;
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskPolicyEdition {
  envelope(input, input.organisationId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind);
  const edition = snap.riskPolicyEditions.find((item) => item.id === input.editionId && item.organisationId === input.organisationId);
  if (!edition) throw new PlatformError("NOT_FOUND", "policy edition not found");
  assertExpectedVersion(edition.version, input.expectedVersion, "policy edition");
  assertLegalTransition(POLICY_EVIDENCE_TRANSITIONS, edition.verificationState, input.decision, "policy evidence");
  assertMakerChecker(edition.submittedByPersonId, actorPersonId, "verify");
  const document = snap.riskEvidenceDocuments.find((item) => item.id === edition.documentEditionId);
  if (!document) throw new PlatformError("NOT_FOUND", "cited document is inaccessible");
  if (document.state === "QUARANTINED") throw new PlatformError("VALIDATION_FAILED", "quarantined document cannot be verified");
  if (input.decision === "VERIFIED" && input.eventEndOn && edition.period.endOn < input.eventEndOn) {
    throw new PlatformError("VALIDATION_FAILED", "certificate expires before event close-out");
  }
  if (input.decision === "VERIFIED") {
    assertDocumentTransition(document.state === "UPLOADED" || document.state === "CLEAN" ? document.state : "CLEAN", "VERIFIED");
    Object.assign(document, RiskEvidenceDocumentSchema.parse({ ...document, state: "VERIFIED", verifiedByPersonId: actorPersonId, ...bumpVersion(document, now) }));
  } else {
    Object.assign(document, RiskEvidenceDocumentSchema.parse({ ...document, state: "REJECTED", rejectionReason: input.reason ?? "rejected", ...bumpVersion(document, now) }));
  }
  Object.assign(
    edition,
    RiskPolicyEditionSchema.parse({
      ...edition,
      verificationState: input.decision,
      verifiedByPersonId: actorPersonId,
      verifiedAt: now,
      ...bumpVersion(edition, now),
    }),
  );
  return edition;
}

export function recordFactEditionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    factKey: string;
    value: string;
    unknown: boolean;
    evidenceIds?: string[];
  },
  now: string,
  actorPersonId: string,
): RiskFactEdition {
  envelope(input, input.organisationId, input.eventId);
  const record = RiskFactEditionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    factKey: input.factKey,
    value: input.unknown ? "UNKNOWN" : input.value,
    unknown: input.unknown,
    evidenceIds: input.evidenceIds ?? [],
    contentHash: exactHash({ factKey: input.factKey, value: input.value, unknown: input.unknown }),
    recordedByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskFactEditions.push(record);
  return record;
}

export function evaluateApplicabilityOnSnap(
  snap: PlatformSnapshot,
  input: { organisationId: string; eventId: string; assignmentId: string; expectedVersion: number; idempotencyKey: string },
  now: string,
  actorPersonId: string,
): { snapshot: RiskApplicabilitySnapshot; gaps: RiskGapFinding[] } {
  envelope(input, input.organisationId, input.eventId);
  const event = snap.events.find((item) => item.id === input.eventId && item.organisationId === input.organisationId);
  if (!event) throw new PlatformError("NOT_FOUND", "event not found");
  const rules = snap.riskRuleEditions.filter((item) => item.organisationId === input.organisationId);
  const facts = snap.riskFactEditions.filter((item) => item.organisationId === input.organisationId && item.eventId === input.eventId);
  const policies = snap.riskPolicyEditions.filter(
    (item) =>
      item.organisationId === input.organisationId &&
      item.current &&
      (item.eventId === input.eventId || (!item.eventId && item.organisationId === input.organisationId)),
  );
  const requirements = resolveApplicability({ now, facts, rules, policies });
  const eventEnd = event.endsAt.slice(0, 10);
  const eventStart = event.startsAt.slice(0, 10);
  const contentHash = exactHash({ requirements, ruleIds: rules.map((item) => item.id), factIds: facts.map((item) => item.id), policyIds: policies.map((item) => item.id) });
  const overall = requirements.some((item) => item.decision === "INDETERMINATE" || item.decision === "STALE")
    ? requirements.some((item) => item.decision === "STALE")
      ? "STALE"
      : "INDETERMINATE"
    : requirements.some((item) => item.decision === "APPLIES" && !matchCoverage(item, policies, eventStart, eventEnd).matched)
      ? "GAPS"
      : "READY";
  const snapshot = RiskApplicabilitySnapshotSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    evaluatedAt: now,
    ruleEditionIds: rules.map((item) => item.id),
    factEditionIds: facts.map((item) => item.id),
    policyEditionIds: policies.map((item) => item.id),
    requirements,
    overall,
    contentHash,
    evaluatedByPersonId: actorPersonId,
    ...riskStamp(now),
  });
  snap.riskApplicabilitySnapshots.push(snapshot);
  const gaps: RiskGapFinding[] = [];
  for (const requirement of requirements) {
    if (requirement.decision === "DOES_NOT_APPLY") continue;
    const match = matchCoverage(requirement, policies, eventStart, eventEnd);
    const reasons =
      requirement.decision === "INDETERMINATE"
        ? ["RULE_OR_SOURCE_STALE"]
        : requirement.decision === "STALE"
          ? ["RULE_OR_SOURCE_STALE"]
          : match.reasons.length
            ? match.reasons
            : [];
    if (!reasons.length && requirement.decision === "APPLIES" && match.matched) continue;
    const taxonomy = taxonomyForReasons(requirement.decision === "INDETERMINATE" ? ["UNVERIFIED_DOCUMENT"] : reasons);
    const identityKey = gapIdentity(input.eventId, contentHash, requirement.requirementKey, match.policyEditionId ? [match.policyEditionId] : []);
    const prior = snap.riskGapFindings.find((item) => item.identityKey === identityKey);
    const priorDecision = inheritResidualDecision(
      snap.riskResidualDecisions.find((item) => item.gapId === prior?.id && item.status === "APPROVED"),
      contentHash,
    );
    const gap = RiskGapFindingSchema.parse({
      id: prior?.id ?? newRiskId(),
      organisationId: input.organisationId,
      eventId: input.eventId,
      snapshotId: snapshot.id,
      snapshotHash: contentHash,
      requirementKey: requirement.requirementKey,
      taxonomy,
      identityKey,
      state: priorDecision ? "ACCEPTED_RISK" : "OPEN",
      affectedObjectIds: match.policyEditionId ? [match.policyEditionId] : [],
      explanation: reasons.join("; ") || requirement.missingFacts.join(",") || requirement.decision,
      residualDecisionId: priorDecision?.id,
      ...(prior ? bumpVersion(prior, now) : riskStamp(now)),
    });
    if (prior) Object.assign(prior, gap);
    else snap.riskGapFindings.push(gap);
    gaps.push(gap);
  }
  return { snapshot, gaps };
}

export function submitResidualDecisionOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    gapId: string;
    choice: RiskResidualDecision["choice"];
    reason: string;
    compensatingControl?: string;
    evidenceIds?: string[];
    expiresOn?: string;
  },
  now: string,
  actorPersonId: string,
): RiskResidualDecision {
  envelope(input, input.organisationId, input.eventId);
  const gap = snap.riskGapFindings.find((item) => item.id === input.gapId && item.eventId === input.eventId);
  if (!gap) throw new PlatformError("NOT_FOUND", "gap not found");
  const record = RiskResidualDecisionSchema.parse({
    id: newRiskId(),
    organisationId: input.organisationId,
    eventId: input.eventId,
    gapId: gap.id,
    snapshotHash: gap.snapshotHash,
    choice: input.choice,
    reason: input.reason,
    compensatingControl: input.compensatingControl,
    evidenceIds: input.evidenceIds ?? [],
    expiresOn: input.expiresOn,
    submittedByPersonId: actorPersonId,
    status: "SUBMITTED",
    contentHash: exactHash({ gap: gap.id, choice: input.choice, reason: input.reason }),
    ...riskStamp(now),
  });
  snap.riskResidualDecisions.push(record);
  Object.assign(gap, { ...gap, state: "MITIGATION_PROPOSED", ...bumpVersion(gap, now) });
  return record;
}

export function decideResidualRiskOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    eventId: string;
    assignmentId: string;
    expectedVersion: number;
    idempotencyKey: string;
    decisionId: string;
    decision: "APPROVED" | "REJECTED";
  },
  now: string,
  actorPersonId: string,
  actorKind?: string,
): RiskResidualDecision {
  envelope(input, input.organisationId, input.eventId);
  assertProtectedHuman(snap, input.assignmentId, actorPersonId, actorKind);
  const decision = snap.riskResidualDecisions.find((item) => item.id === input.decisionId && item.eventId === input.eventId);
  if (!decision) throw new PlatformError("NOT_FOUND", "residual-risk decision not found");
  assertExpectedVersion(decision.version, input.expectedVersion, "residual-risk decision");
  assertMakerChecker(decision.submittedByPersonId, actorPersonId, "decide residual risk");
  Object.assign(
    decision,
    RiskResidualDecisionSchema.parse({
      ...decision,
      status: input.decision,
      decidedByPersonId: actorPersonId,
      ...bumpVersion(decision, now),
    }),
  );
  const gap = snap.riskGapFindings.find((item) => item.id === decision.gapId);
  if (gap) {
    const nextState = input.decision === "APPROVED" ? (decision.choice === "RESOLVE_WITH_EVIDENCE" ? "RESOLVED" : "ACCEPTED_RISK") : "OPEN";
    assertLegalTransition(GAP_TRANSITIONS, gap.state, nextState, "protection gap");
    Object.assign(gap, {
      ...gap,
      state: nextState,
      residualDecisionId: input.decision === "APPROVED" ? decision.id : undefined,
      ...bumpVersion(gap, now),
    });
  }
  return decision;
}

export function derivedCertificateStatus(edition: RiskPolicyEdition, nowDate: string): "CURRENT" | "EXPIRED" {
  return edition.period.endOn < nowDate ? "EXPIRED" : "CURRENT";
}
