import { createHash } from "node:crypto";
import { loadNonProductionFixtures } from "./bootstrap.js";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash, nfc } from "./eec-hash.js";
import { calculateBudgetScenarioOnSnap, issueDiscoveryClientAccessOnSnap, runFixtureAiJobOnSnap } from "./eec-intelligence.js";
import { buildDiscoveryWorkspace, eecPermissionAllowed } from "./eec-projections.js";
import { instantiateRoadmapFromTemplateOnSnap, recordConversationTurnOnSnap, seedBudgetKnowledgeOnSnap } from "./eec-s05a-depth.js";
import {
  addParticipantOnSnap,
  createOpportunityOnSnap,
  extractAssertionsOnSnap,
  recordDiscoveryConsentOnSnap,
  recordSourceArtefactOnSnap,
  refreshCoverageOnSnap,
  reviewAssertionOnSnap,
  sessionLifecycleOnSnap,
  startDiscoveryEngagementOnSnap,
} from "./eec-operations.js";
import {
  clientInvestmentProjection,
  issueClientReviewEditionOnSnap,
  nextGovernedInterviewFromCorpus,
  recordClientInvestmentActionOnSnap,
  recordClientReviewActionOnSnap,
  refreshClientReviewStaleState,
} from "./eec-s05a-completion.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { MemoryPlatformStore } from "./memory-store.js";
import { PlatformError } from "./errors.js";
import type { ActorContext } from "./service.js";
import type { PlatformSnapshot } from "./store.js";
import type { EvaluationAction, EvaluationCaseDefinition, EvaluationObservationResult, ExpectedObservation } from "./eec-evaluation-schemas.js";
import { observeExpected, type EvaluationActionOutcome } from "./eec-evaluation-probes.js";

export interface EvaluationClock {
  now(): string;
}

export interface EvaluationActors {
  staffPersonId: string;
  staffKind: "HUMAN" | "AI";
  otherOrgPersonId: string;
}

export interface EvaluationAdapters {
  afterExtract?(snap: PlatformSnapshot, caseDef: EvaluationCaseDefinition): void;
  afterBudget?(snap: PlatformSnapshot, caseDef: EvaluationCaseDefinition): void;
  afterProjectClient?(projection: Record<string, unknown>, snap: PlatformSnapshot): Record<string, unknown>;
  afterProjectOther?(projection: Record<string, unknown>, snap: PlatformSnapshot): Record<string, unknown>;
  afterConflictDetect?(snap: PlatformSnapshot, caseDef: EvaluationCaseDefinition): void;
  afterSessionTransition?(snap: PlatformSnapshot, caseDef: EvaluationCaseDefinition): void;
  afterClientAction?(snap: PlatformSnapshot, caseDef: EvaluationCaseDefinition): void;
}

export interface EvaluationHarness {
  readonly snapshot: PlatformSnapshot;
  readonly clock: EvaluationClock;
  readonly actors: EvaluationActors;
  readonly caseDef: EvaluationCaseDefinition;
  execute(action: EvaluationAction): Promise<EvaluationActionOutcome>;
  observe(expected: ExpectedObservation): EvaluationObservationResult;
  snapshotHash(): string;
  outcomes(): EvaluationActionOutcome[];
  lastClientProjection(): Record<string, unknown> | undefined;
  lastOtherProjection(): Record<string, unknown> | undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deterministicId(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function canonicalizeSnapshotForHash(value: unknown): unknown {
  const seen = new Map<string, string>();
  let next = 0;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      if (UUID_RE.test(node)) {
        const existing = seen.get(node);
        if (existing) return existing;
        const token = `id-${String(next).padStart(4, "0")}`;
        next += 1;
        seen.set(node, token);
        return token;
      }
      return nfc(node);
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, walk(nested)]),
      );
    }
    return node;
  };
  return walk(value);
}

export function hashPlatformSnapshot(snap: PlatformSnapshot): string {
  return exactHash(canonicalizeSnapshotForHash(snap));
}

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

function withExpectedVersion<T extends object>(input: T): T & { expectedVersion: number } {
  return { ...input, expectedVersion: 0 };
}

export function buildIsolatedEvaluationHarness(
  caseDef: EvaluationCaseDefinition,
  adapters?: EvaluationAdapters,
  clockNow = "2026-09-05T15:00:00.000Z",
): EvaluationHarness {
  const store = new MemoryPlatformStore();
  loadNonProductionFixtures(store);
  const snap = store.snapshot();
  const now = clockNow;
  const organisationId = caseDef.seed.organisationRef === "SECONDARY" ? FIXTURE_IDS.orgOther : FIXTURE_IDS.orgMaison;
  const staffPersonId = caseDef.seed.organisationRef === "SECONDARY" ? FIXTURE_IDS.personOtherOrg : FIXTURE_IDS.personCeo;
  const opportunity = createOpportunityOnSnap(
    snap,
    withExpectedVersion({
      organisationId,
      displayReference: caseDef.seed.displayReference,
      enquiryChannel: "DIRECT",
      knownEventType: caseDef.seed.eventType,
      knownEventDate: caseDef.seed.knownEventDate,
      reason: "evaluation-seed",
      idempotencyKey: `${caseDef.id}-opp`,
    }),
    now,
    staffPersonId,
  );
  const engagement = startDiscoveryEngagementOnSnap(
    snap,
    {
      organisationId,
      opportunityId: opportunity.id,
      expectedVersion: opportunity.version,
      displayReference: caseDef.seed.displayReference,
      reason: "evaluation-start",
      idempotencyKey: `${caseDef.id}-eng`,
    },
    now,
  );
  const participants = new Map<string, string>();
  for (const principal of caseDef.seed.principals) {
    const record = addParticipantOnSnap(
      snap,
      withExpectedVersion({
        organisationId,
        engagementId: engagement.id,
        displayName: principal.displayName,
        claimedRole: principal.claimedRole,
        authorityClaim: principal.authorityClaim,
        reason: "evaluation-participant",
        idempotencyKey: `${caseDef.id}-${principal.ref}`,
      }),
      now,
    );
    participants.set(principal.ref, record.id);
  }
  for (const note of caseDef.seed.staffNotes) {
    const artefact = recordSourceArtefactOnSnap(
      snap,
      withExpectedVersion({
        organisationId,
        engagementId: engagement.id,
        kind: "STAFF_NOTE",
        title: note.topicKey,
        text: note.text,
        disclosureClass: note.disclosureClass,
        reason: "evaluation-staff-note",
        idempotencyKey: `${caseDef.id}-note-${note.topicKey}`,
      }),
      now,
    );
    snap.candidateAssertions.push({
      id: deterministicId(`${caseDef.id}:${note.topicKey}`),
      engagementId: engagement.id,
      kind: note.kind === "CLIENT_SAFE" ? "FACT" : "ASSUMPTION",
      topicKey: note.topicKey,
      structuredValue: { text: note.text },
      narrative: nfc(note.text),
      sourceSegmentIds: [artefact.segment.id],
      capturedByPersonId: staffPersonId,
      origin: "HUMAN",
      directness: "DIRECT_STATEMENT",
      confidence: "HIGH",
      rationale: nfc(note.text),
      confirmationState: "PROPOSED",
      sensitivity: note.kind === "CLIENT_SAFE" ? "STANDARD" : "FINANCIAL",
      effectiveFrom: now,
      contentHash: exactHash({ topicKey: note.topicKey, text: note.text }),
      organisationId,
      version: 1,
      ...stamp(now),
    });
  }
  if (caseDef.seed.secondEngagement) {
    const otherOpp = createOpportunityOnSnap(
      snap,
      withExpectedVersion({
        organisationId,
        displayReference: `${caseDef.seed.displayReference} B`,
        enquiryChannel: "DIRECT",
        knownEventType: caseDef.seed.eventType,
        reason: "evaluation-other-eng",
        idempotencyKey: `${caseDef.id}-opp-b`,
      }),
      now,
      staffPersonId,
    );
    const otherEng = startDiscoveryEngagementOnSnap(
      snap,
      {
        organisationId,
        opportunityId: otherOpp.id,
        expectedVersion: otherOpp.version,
        displayReference: `${caseDef.seed.displayReference} B`,
        reason: "evaluation-other-eng",
        idempotencyKey: `${caseDef.id}-eng-b`,
      },
      now,
    );
    const otherSource = recordSourceArtefactOnSnap(
      snap,
      withExpectedVersion({
        organisationId,
        engagementId: otherEng.id,
        kind: "STAFF_NOTE",
        title: "other-engagement",
        text: caseDef.seed.otherValueRef ?? "other-engagement",
        reason: "evaluation-other-eng",
        idempotencyKey: `${caseDef.id}-other-eng-src`,
      }),
      now,
    );
    snap.candidateAssertions.push({
      id: deterministicId(`${caseDef.id}:other-eng`),
      engagementId: otherEng.id,
      kind: "FACT",
      topicKey: "guest.target_count",
      structuredValue: { marker: caseDef.seed.otherValueRef ?? "other-engagement" },
      narrative: nfc(caseDef.seed.otherValueRef ?? "other-engagement"),
      sourceSegmentIds: [otherSource.segment.id],
      capturedByPersonId: staffPersonId,
      origin: "HUMAN",
      directness: "DIRECT_STATEMENT",
      confidence: "HIGH",
      rationale: "isolated second engagement marker",
      confirmationState: "PROPOSED",
      sensitivity: "STANDARD",
      effectiveFrom: now,
      contentHash: exactHash({ marker: caseDef.seed.otherValueRef ?? "other-engagement" }),
      organisationId,
      version: 1,
      ...stamp(now),
    });
    (snap as PlatformSnapshot & { __otherEngagementId?: string }).__otherEngagementId = otherEng.id;
  }
  if (caseDef.seed.secondOrganisation) {
    const otherOpp = createOpportunityOnSnap(
      snap,
      withExpectedVersion({
        organisationId: FIXTURE_IDS.orgOther,
        displayReference: `${caseDef.seed.displayReference} Other org`,
        enquiryChannel: "DIRECT",
        knownEventType: caseDef.seed.eventType,
        reason: "evaluation-other-org",
        idempotencyKey: `${caseDef.id}-opp-org`,
      }),
      now,
      FIXTURE_IDS.personOtherOrg,
    );
    const otherEng = startDiscoveryEngagementOnSnap(
      snap,
      {
        organisationId: FIXTURE_IDS.orgOther,
        opportunityId: otherOpp.id,
        expectedVersion: otherOpp.version,
        reason: "evaluation-other-org",
        idempotencyKey: `${caseDef.id}-eng-org`,
      },
      now,
    );
    const otherSource = recordSourceArtefactOnSnap(
      snap,
      withExpectedVersion({
        organisationId: FIXTURE_IDS.orgOther,
        engagementId: otherEng.id,
        kind: "STAFF_NOTE",
        title: "other-org",
        text: caseDef.seed.otherValueRef ?? "other-org",
        reason: "evaluation-other-org",
        idempotencyKey: `${caseDef.id}-other-org-src`,
      }),
      now,
    );
    snap.candidateAssertions.push({
      id: deterministicId(`${caseDef.id}:other-org`),
      engagementId: otherEng.id,
      kind: "FACT",
      topicKey: "guest.target_count",
      structuredValue: { marker: caseDef.seed.otherValueRef ?? "other-org" },
      narrative: nfc(caseDef.seed.otherValueRef ?? "other-org"),
      sourceSegmentIds: [otherSource.segment.id],
      capturedByPersonId: FIXTURE_IDS.personOtherOrg,
      origin: "HUMAN",
      directness: "DIRECT_STATEMENT",
      confidence: "HIGH",
      rationale: "isolated second organisation marker",
      confirmationState: "PROPOSED",
      sensitivity: "STANDARD",
      effectiveFrom: now,
      contentHash: exactHash({ marker: caseDef.seed.otherValueRef ?? "other-org" }),
      organisationId: FIXTURE_IDS.orgOther,
      version: 1,
      ...stamp(now),
    });
  }
  seedBudgetKnowledgeOnSnap(snap, organisationId, now);
  if (caseDef.seed.stripPriceEvidence) {
    snap.priceEvidenceRecords = snap.priceEvidenceRecords.filter((item) => item.organisationId !== organisationId);
    snap.vendorPriceCardEditions = snap.vendorPriceCardEditions.filter((item) => item.organisationId !== organisationId);
  }
  if (caseDef.seed.stalePriceEvidence) {
    for (const item of snap.priceEvidenceRecords.filter((record) => record.organisationId === organisationId)) {
      item.stale = true;
      item.validUntil = "2020-01-01";
      item.version += 1;
      item.updatedAt = now;
    }
    for (const card of snap.vendorPriceCardEditions.filter((record) => record.organisationId === organisationId)) {
      card.effectiveUntil = "2020-01-01";
      card.version += 1;
      card.updatedAt = now;
    }
  }

  store.replace(snap);

  const outcomes: EvaluationActionOutcome[] = [];
  let sessionId: string | undefined;
  let clientToken = `eval-token-${caseDef.id}`;
  let clientAccessId: string | undefined;
  let lastQuestion = nextGovernedInterviewFromCorpus(store.snapshot(), engagement.id);
  let lastClientProjection: Record<string, unknown> | undefined;
  let lastOtherProjection: Record<string, unknown> | undefined;
  const actors: EvaluationActors = {
    staffPersonId,
    staffKind: "HUMAN",
    otherOrgPersonId: FIXTURE_IDS.personOtherOrg,
  };

  const staffActor = (): ActorContext => ({
    personId: actors.staffPersonId,
    correlationId: `eval-${caseDef.id}`,
    now,
    actorKind: actors.staffKind,
  });

  const ensureClientAccess = (): string => {
    const current = store.snapshot();
    if (clientAccessId && current.discoveryClientAccess.some((item) => item.id === clientAccessId)) return clientAccessId;
    const access = issueDiscoveryClientAccessOnSnap(
      current,
      { organisationId, engagementId: engagement.id, token: clientToken, expiresAt: "2027-12-31T00:00:00.000Z" },
      now,
    );
    clientAccessId = access.id;
    store.replace(current);
    return access.id;
  };

  const executeOne = (action: EvaluationAction): EvaluationActionOutcome => {
    const current = store.snapshot();
    const recordIds: string[] = [];
    try {
      if (action.kind === "RECORD_CONSENT") {
        const record = recordDiscoveryConsentOnSnap(
          current,
          withExpectedVersion({
            organisationId,
            engagementId: engagement.id,
            participantId: action.participantRef ? participants.get(action.participantRef) : undefined,
            dimension: action.dimension,
            decision: action.decision,
            policyVersion: "eval-policy-v1",
            wordingEdition: "eval-wording-v1",
            reason: "evaluation-consent",
            idempotencyKey: `${caseDef.id}-consent-${action.dimension}-${action.decision}`,
          }),
          now,
          staffPersonId,
        );
        recordIds.push(record.id);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "CREATE_SESSION") {
        const session = sessionLifecycleOnSnap(
          current,
          withExpectedVersion({
            organisationId,
            engagementId: engagement.id,
            action: "CREATE",
            mode: action.mode,
            reason: "evaluation-session",
            idempotencyKey: `${caseDef.id}-session`,
          }),
          now,
        );
        sessionId = session.id;
        recordIds.push(session.id);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "TRANSITION_SESSION") {
        const session = current.interviewSessions.find((item) => item.id === sessionId);
        if (!session) throw new PlatformError("NOT_FOUND", "interview session was not found");
        if (caseDef.seed.spoofStartAsOfflineNotes && action.action === "START") {
          session.mode = session.mode;
        }
        const next = sessionLifecycleOnSnap(
          current,
          {
            organisationId,
            engagementId: engagement.id,
            sessionId: session.id,
            action: action.action === "RESUME" ? "RESUME" : action.action === "START" ? "START" : action.action,
            expectedVersion: session.version,
            reason: "evaluation-transition",
            idempotencyKey: `${caseDef.id}-${action.action}-${session.version}`,
          },
          now,
        );
        recordIds.push(next.id);
        adapters?.afterSessionTransition?.(current, caseDef);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "ADD_TURN") {
        lastQuestion = nextGovernedInterviewFromCorpus(current, engagement.id);
        const questionId = lastQuestion?.questionId ?? action.topicKey ?? "free";
        const topicKeys = action.topicKey ? [action.topicKey] : lastQuestion?.topicKeys ?? [];
        const turn = recordConversationTurnOnSnap(
          current,
          {
            organisationId,
            engagementId: engagement.id,
            sessionId,
            questionId,
            phase: lastQuestion?.phase ?? "COVERAGE",
            topicKeys,
            prompt: lastQuestion?.prompt ?? "Evaluation turn",
            answerSource: "CLIENT_DIRECT",
            speakerLabel: action.speakerRef,
            directClientText: action.text,
            revisitReason: lastQuestion?.revisitReason,
          },
          now,
        );
        const artefact = recordSourceArtefactOnSnap(
          current,
          withExpectedVersion({
            organisationId,
            engagementId: engagement.id,
            sessionId,
            kind: "STAFF_NOTE",
            title: action.topicKey ?? questionId,
            text: action.text,
            speakerParticipantId: participants.get(action.speakerRef),
            reason: "evaluation-source",
            idempotencyKey: `${caseDef.id}-src-${turn.id}`,
          }),
          now,
        );
        recordIds.push(turn.id, artefact.artefact.id, artefact.segment.id);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "REQUEST_NEXT_QUESTION") {
        lastQuestion = nextGovernedInterviewFromCorpus(current, engagement.id);
        store.replace(current);
        return { ok: true, recordIds: lastQuestion ? [lastQuestion.questionId] : [] };
      }
      if (action.kind === "EXTRACT_ASSERTIONS") {
        if (caseDef.seed.providerMode === "UNAVAILABLE") {
          runFixtureAiJobOnSnap(current, { organisationId, engagementId: engagement.id, kind: "ASSERTIONS", unavailable: true }, now);
          store.replace(current);
          throw new PlatformError("DEPENDENCY_UNAVAILABLE", "fixture provider is unavailable");
        }
        const artefacts = current.sourceArtefacts.filter((item) => item.engagementId === engagement.id);
        const created: string[] = [];
        for (const artefact of artefacts) {
          const extracted = extractAssertionsOnSnap(
            current,
            withExpectedVersion({
              organisationId,
              engagementId: engagement.id,
              artefactId: artefact.id,
              reason: "evaluation-extract",
              idempotencyKey: `${caseDef.id}-extract-${artefact.id}`,
            }),
            now,
            staffPersonId,
            "HUMAN",
          );
          created.push(
            ...extracted.dispositions
              .filter((item) => item.kind === "ASSERTION_PROPOSED")
              .map((item) => item.assertionId),
          );
        }
        adapters?.afterExtract?.(current, caseDef);
        adapters?.afterConflictDetect?.(current, caseDef);
        store.replace(current);
        return { ok: true, recordIds: created };
      }
      if (action.kind === "REVIEW_ASSERTION") {
        const assertion = [...current.candidateAssertions]
          .reverse()
          .find((item) => item.engagementId === engagement.id && item.topicKey === action.topicKey && item.confirmationState !== "SUPERSEDED" && item.confirmationState !== "REJECTED");
        if (!assertion) throw new PlatformError("NOT_FOUND", "candidate assertion was not found");
        if (caseDef.seed.attemptGoverningAsAi) {
          actors.staffKind = "AI";
          try {
            reviewAssertionOnSnap(
              current,
              {
                organisationId,
                engagementId: engagement.id,
                assertionId: assertion.id,
                decision: action.decision,
                confirmationState: "GOVERNING",
                expectedVersion: assertion.version,
                reason: "evaluation-ai-govern",
                idempotencyKey: `${caseDef.id}-ai-govern`,
              },
              now,
              staffPersonId,
              "AI",
            );
          } finally {
            actors.staffKind = "HUMAN";
          }
        }
        const reviewed = reviewAssertionOnSnap(
          current,
          {
            organisationId,
            engagementId: engagement.id,
            assertionId: assertion.id,
            decision: action.decision,
            expectedVersion: assertion.version,
            reason: "evaluation-review",
            idempotencyKey: `${caseDef.id}-review-${assertion.id}`,
          },
          now,
          staffPersonId,
          staffActor().actorKind,
        );
        if (caseDef.seed.markStaleTopic === action.topicKey && action.decision === "ACCEPT_STAFF_REVIEWED") {
          reviewed.effectiveUntil = "2026-09-01T00:00:00.000Z";
          refreshCoverageOnSnap(current, engagement.id, now);
        }
        recordIds.push(reviewed.id);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "CLIENT_ACTION") {
        const accessId = ensureClientAccess();
        const live = store.snapshot();
        if (action.topicKey === "investment.envelope") {
          const record = recordClientInvestmentActionOnSnap(
            live,
            {
              organisationId,
              engagementId: engagement.id,
              accessId,
              kind: action.action === "PREFER_NOT" ? "PREFER_NOT" : action.action === "DEFER" ? "NO_ENVELOPE" : "CLARIFY",
              narrative: action.narrative,
            },
            now,
          );
          recordIds.push(record.id);
          store.replace(live);
          return { ok: true, recordIds };
        }
        let review = live.clientReviewEditions.find((item) => item.engagementId === engagement.id && item.current);
        if (!review) {
          review = issueClientReviewEditionOnSnap(live, { organisationId, engagementId: engagement.id, expiresAt: "2027-12-31T00:00:00.000Z" }, now);
        }
        const assertion = [...live.candidateAssertions]
          .reverse()
          .find((item) => item.engagementId === engagement.id && item.topicKey === action.topicKey);
        const expectedHash = caseDef.seed.forceStaleVersion && action.action === "CORRECT" ? "stale-review-hash" : review.contentHash;
        const mapped =
          action.action === "CONFIRM"
            ? "CONFIRM_EDITION"
            : action.action === "CORRECT"
              ? "CORRECT"
              : action.action === "DISPUTE"
                ? "DISPUTE"
                : action.action === "PREFER_NOT"
                  ? "PREFER_NOT"
                  : "DEFER";
        const record = recordClientReviewActionOnSnap(
          live,
          {
            organisationId,
            engagementId: engagement.id,
            accessId,
            kind: mapped,
            itemKey: assertion?.id,
            narrative: action.narrative,
            expectedHash,
          },
          now,
        );
        if (action.action === "CORRECT" && assertion && action.narrative) {
          refreshClientReviewStaleState(live, engagement.id, now);
        }
        adapters?.afterClientAction?.(live, caseDef);
        recordIds.push(record.id);
        store.replace(live);
        return { ok: true, recordIds };
      }
      if (action.kind === "RUN_BUDGET") {
        if (action.scenario === "short-lead-roadmap" || caseDef.seed.roadmapLeadMode) {
          const result = instantiateRoadmapFromTemplateOnSnap(
            current,
            {
              organisationId,
              engagementId: engagement.id,
              archetype: caseDef.eventType,
              leadMode: caseDef.seed.roadmapLeadMode ?? "SHORT",
              availableDays: caseDef.seed.roadmapAvailableDays,
            },
            now,
          );
          recordIds.push(result.edition.id);
        } else {
          const scenario = calculateBudgetScenarioOnSnap(
            current,
            {
              organisationId,
              engagementId: engagement.id,
              purpose: "PROTECT_INVESTMENT",
              archetype: caseDef.eventType === "CORPORATE" ? "CORPORATE" : "WEDDING",
              guests: "180",
            },
            now,
            staffPersonId,
          );
          recordIds.push(scenario.id);
        }
        adapters?.afterBudget?.(current, caseDef);
        store.replace(current);
        return { ok: true, recordIds };
      }
      if (action.kind === "PROJECT_CLIENT") {
        ensureClientAccess();
        const live = store.snapshot();
        const assertions = live.candidateAssertions
          .filter((item) => item.engagementId === engagement.id && item.sensitivity === "STANDARD")
          .map((item) => ({ topicKey: item.topicKey, narrative: item.narrative, confirmationState: item.confirmationState }));
        const investment = clientInvestmentProjection(live, engagement.id);
        lastClientProjection = {
          organisationId,
          engagementId: engagement.id,
          assertions,
          investment,
        };
        lastClientProjection = adapters?.afterProjectClient?.(lastClientProjection, live) ?? lastClientProjection;
        store.replace(live);
        return { ok: true, recordIds: [engagement.id] };
      }
      if (action.kind === "PROJECT_STAFF") {
        lastClientProjection = {
          organisationId,
          engagementId: engagement.id,
          assertions: current.candidateAssertions.filter((item) => item.engagementId === engagement.id),
        };
        store.replace(current);
        return { ok: true, recordIds: [engagement.id] };
      }
      if (action.kind === "PROJECT_AUDITOR") {
        const live = store.snapshot();
        const liveEngagement = live.discoveryEngagements.find((item) => item.id === engagement.id);
        const liveOpportunity = live.engagementOpportunities.find((item) => item.id === opportunity.id);
        if (!liveEngagement || !liveOpportunity) throw new PlatformError("NOT_FOUND", "discovery engagement was not found");
        const keys = ["engagement.view", "discovery.session.view", "discovery.source.view"] as const;
        lastClientProjection = buildDiscoveryWorkspace({
          opportunity: liveOpportunity,
          engagement: liveEngagement,
          participants: live.discoveryParticipants.filter((item) => item.engagementId === engagement.id),
          consents: live.discoveryConsentRecords.filter((item) => item.engagementId === engagement.id),
          sessions: live.interviewSessions.filter((item) => item.engagementId === engagement.id),
          artefacts: live.sourceArtefacts.filter((item) => item.engagementId === engagement.id),
          segments: live.sourceSegments.filter((item) => item.engagementId === engagement.id),
          assertions: live.candidateAssertions.filter((item) => item.engagementId === engagement.id),
          conflicts: live.assertionConflicts.filter((item) => item.engagementId === engagement.id),
          assessments: live.coverageAssessments.filter((item) => item.engagementId === engagement.id),
          extractionOutcomes: live.extractionOutcomes.filter((item) => item.engagementId === engagement.id),
          capabilities: eecPermissionAllowed(keys),
          permissionKeys: keys,
          grants: live.discoveryDisclosureGrants.filter((item) => item.organisationId === organisationId),
          actorPersonId: FIXTURE_IDS.personAuditor,
          now,
        });
        store.replace(live);
        return { ok: true, recordIds: [engagement.id] };
      }
      if (action.kind === "PROJECT_ADMIN") {
        throw new PlatformError("FORBIDDEN", "this assignment cannot view discovery conversations");
      }
      if (action.kind === "PROJECT_OTHER_ENGAGEMENT") {
        const tokenProjection = {
          organisationId,
          engagementId: engagement.id,
          assertions: current.candidateAssertions
            .filter((item) => item.engagementId === engagement.id && item.sensitivity === "STANDARD")
            .map((item) => item.narrative),
        };
        lastOtherProjection = adapters?.afterProjectOther?.(tokenProjection, current) ?? tokenProjection;
        store.replace(current);
        return { ok: true, recordIds: [engagement.id] };
      }
      throw new PlatformError("VALIDATION_FAILED", `unsupported evaluation action`);
    } catch (error) {
      if (action.kind === "TRANSITION_SESSION") adapters?.afterSessionTransition?.(current, caseDef);
      if (action.kind === "CLIENT_ACTION") adapters?.afterClientAction?.(current, caseDef);
      store.replace(current);
      const code = error instanceof PlatformError ? error.code : "INTERNAL_ERROR";
      const message = error instanceof Error ? error.message.slice(0, 200) : "evaluation action failed";
      return { ok: false, errorCode: code, errorMessage: message, recordIds };
    }
  };

  return {
    get snapshot() {
      return store.snapshot();
    },
    clock: { now: () => now },
    actors,
    caseDef,
    async execute(action) {
      const outcome = executeOne(action);
      outcomes.push(outcome);
      return outcome;
    },
    observe(expected) {
      return observeExpected({
        expected,
        snap: store.snapshot(),
        engagementId: engagement.id,
        organisationId,
        outcomes,
        lastQuestion: lastQuestion?.questionId,
        lastRevisitReason: lastQuestion?.revisitReason,
        clientProjection: lastClientProjection,
        otherProjection: lastOtherProjection,
        otherValueRef: caseDef.seed.otherValueRef,
      });
    },
    snapshotHash() {
      return hashPlatformSnapshot(store.snapshot());
    },
    outcomes: () => outcomes,
    lastClientProjection: () => lastClientProjection,
    lastOtherProjection: () => lastOtherProjection,
  };
}
