import assert from "node:assert/strict";
import test from "node:test";
import { decideBriefEditionOnSnap } from "../src/eec-intelligence.js";
import { formatExtractionInvocationReceipt, governingGuestCountFromBrief } from "../src/eec-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-09T12:00:00.000Z";

function startEngagement(service: ReturnType<typeof fixtureService>["service"], reference: string) {
  const ceo = actor(people.personCeo, { now: NOW });
  const planner = actor(people.personPlanner, { now: NOW });
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: reference,
    eventConceptLabel: "S045 celebration",
    enquiryChannel: "DIRECT",
    knownEventType: "WEDDING",
    reason: "open",
    idempotencyKey: `opp-${reference}`,
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: `eng-${reference}`,
  });
  for (const dimension of ["PARTICIPATION", "TRANSCRIPTION", "AI_ANALYSIS", "SOURCE_RETENTION"] as const) {
    service.recordDiscoveryConsent(planner, {
      organisationId,
      engagementId: engagement.id,
      dimension,
      decision: "GRANTED",
      policyVersion: "policy-v1",
      wordingEdition: "wording-v1",
      reason: dimension,
      idempotencyKey: `consent-${reference}-${dimension}`,
    });
  }
  return { service, ceo, planner, organisationId, engagement };
}

function extractNote(
  service: ReturnType<typeof fixtureService>["service"],
  planner: ReturnType<typeof actor>,
  organisationId: string,
  engagementId: string,
  text: string,
  key: string,
) {
  const source = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId,
    kind: "STAFF_NOTE",
    title: key,
    text,
    reason: "note",
    idempotencyKey: `src-${key}`,
  });
  const invocation = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId,
    artefactId: source.id,
    reason: "extract",
    idempotencyKey: `extract-${key}`,
  });
  return { source, invocation };
}

function guestAssertions(service: ReturnType<typeof fixtureService>["service"], planner: ReturnType<typeof actor>, organisationId: string, engagementId: string) {
  return service
    .getDiscoveryWorkspace(planner, organisationId, engagementId)
    .assertions.filter((item) => item.topicKey === "guest.target_count");
}

test("S045 extraction: first invocation is a new proposal and identical retry is existing/replayed", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Extract truth");
  const { source, invocation: first } = extractNote(
    service,
    planner,
    organisationId,
    engagement.id,
    "We are planning for 320 guests.",
    "320",
  );
  assert.equal(first.replayed, false);
  assert.equal(first.newlyProposedCount, 1);
  assert.equal(first.existingLinkedCount, 0);
  assert.equal(first.proposedCount, 1);
  assert.match(formatExtractionInvocationReceipt(first), /1 new proposal, 0 existing/);
  const before = service.getDiscoveryWorkspace(planner, organisationId, engagement.id).assertions.length;
  const outcomesBefore = service.currentSnapshot().extractionOutcomes.filter((item) => item.artefactId === source.id).length;
  const proposedAuditsBefore = service.currentSnapshot().audit.filter((item) => item.action === "assertion.proposed" && item.outcome === "SUCCESS").length;
  const retry = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: source.id,
    reason: "extract",
    idempotencyKey: "extract-320-retry",
  });
  assert.equal(retry.id, first.id);
  assert.equal(retry.replayed, true);
  assert.equal(retry.newlyProposedCount, 0);
  assert.equal(retry.existingLinkedCount, 1);
  assert.equal(retry.proposedCount, 1);
  assert.notEqual(retry.newlyProposedCount, retry.proposedCount);
  assert.match(formatExtractionInvocationReceipt(retry), /No new proposals/);
  assert.match(formatExtractionInvocationReceipt(retry), /0 new proposals, 1 existing/);
  assert.equal(service.getDiscoveryWorkspace(planner, organisationId, engagement.id).assertions.length, before);
  assert.equal(service.currentSnapshot().extractionOutcomes.filter((item) => item.artefactId === source.id).length, outcomesBefore);
  const proposedAuditsAfter = service.currentSnapshot().audit.filter((item) => item.action === "assertion.proposed" && item.outcome === "SUCCESS").length;
  assert.equal(proposedAuditsAfter, proposedAuditsBefore);
  assert.ok(service.currentSnapshot().audit.some((item) => item.action === "assertion.extract.replayed"));
});

test("S045 extraction: concurrent identical keys/content converge and a changed version is new work", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Extract concurrent");
  const { source, invocation: first } = extractNote(
    service,
    planner,
    organisationId,
    engagement.id,
    "We are planning for 320 guests.",
    "concurrent-320",
  );
  const second = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: source.id,
    reason: "extract",
    idempotencyKey: "extract-concurrent-other-key",
  });
  assert.equal(second.id, first.id);
  assert.equal(second.replayed, true);
  assert.equal(second.newlyProposedCount, 0);
  assert.throws(
    () =>
      service.extractCandidateAssertions(planner, {
        organisationId,
        engagementId: engagement.id,
        artefactId: source.id,
        expectedVersion: 99,
        reason: "stale",
        idempotencyKey: "extract-stale",
      }),
    /VERSION_CONFLICT|stale source/,
  );
  const snap = service.currentSnapshot();
  const artefact = snap.sourceArtefacts.find((item) => item.id === source.id)!;
  artefact.version += 1;
  artefact.updatedAt = NOW;
  service.loadSnapshot(snap);
  const changed = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: source.id,
    reason: "extract changed version",
    idempotencyKey: "extract-changed-version",
  });
  assert.equal(changed.replayed, false);
  assert.notEqual(changed.id, first.id);
});

test("S045 contradiction: explicit assertion identity governs regardless of order or equal timestamps", () => {
  const { service, planner, ceo, organisationId, engagement } = startEngagement(fixtureService().service, "Contradiction identity");
  extractNote(service, planner, organisationId, engagement.id, "We are planning for 320 guests.", "id-320");
  extractNote(service, planner, organisationId, engagement.id, "The other principal expects closer to 360 people.", "id-360");
  const workspace = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  const conflict = workspace.conflicts.find((item) => item.topicKey === "guest.target_count" && item.status === "OPEN");
  assert.ok(conflict);
  const threeTwenty = workspace.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "320")!;
  const threeSixty = workspace.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "360")!;
  const sourcesBefore = workspace.segments.map((item) => item.text).sort();
  const resolved = service.resolveAssertionConflict(planner, {
    organisationId,
    engagementId: engagement.id,
    conflictId: conflict.id,
    expectedVersion: conflict.version,
    reason: "choose 360 by identity",
    idempotencyKey: "resolve-360",
    decision: {
      kind: "SELECT_GOVERNING_ASSERTION",
      governingAssertionId: threeSixty.id,
      supersededAssertionIds: [threeTwenty.id],
    },
  });
  assert.equal(resolved.governingAssertionId, threeSixty.id);
  const after = guestAssertions(service, planner, organisationId, engagement.id);
  assert.equal(after.find((item) => item.id === threeSixty.id)?.confirmationState, "STAFF_REVIEWED");
  assert.equal(after.find((item) => item.id === threeTwenty.id)?.confirmationState, "SUPERSEDED");
  const sourcesAfter = service
    .getDiscoveryWorkspace(planner, organisationId, engagement.id)
    .segments.map((item) => item.text)
    .sort();
  assert.deepEqual(sourcesAfter, sourcesBefore);
  const replay = service.resolveAssertionConflict(planner, {
    organisationId,
    engagementId: engagement.id,
    conflictId: conflict.id,
    expectedVersion: conflict.version,
    reason: "choose 360 by identity",
    idempotencyKey: "resolve-360",
    decision: {
      kind: "SELECT_GOVERNING_ASSERTION",
      governingAssertionId: threeSixty.id,
      supersededAssertionIds: [threeTwenty.id],
    },
  });
  assert.equal(replay.id, resolved.id);
  assert.equal(replay.governingAssertionId, threeSixty.id);
  assert.throws(
    () =>
      service.resolveAssertionConflict(actor(people.personCeo, { actorKind: "AI", now: NOW }), {
        organisationId,
        engagementId: engagement.id,
        conflictId: conflict.id,
        expectedVersion: resolved.version,
        reason: "ai cannot govern",
        idempotencyKey: "resolve-ai",
        decision: {
          kind: "SELECT_GOVERNING_ASSERTION",
          governingAssertionId: threeSixty.id,
          supersededAssertionIds: [threeTwenty.id],
        },
      }),
    /AI_AUTHORITY|FORBIDDEN/,
  );
  assert.throws(
    () =>
      service.resolveAssertionConflict(actor(people.personAuditor, { now: NOW }), {
        organisationId,
        engagementId: engagement.id,
        conflictId: conflict.id,
        expectedVersion: resolved.version,
        reason: "auditor cannot decide",
        idempotencyKey: "resolve-auditor",
        decision: {
          kind: "SELECT_GOVERNING_ASSERTION",
          governingAssertionId: threeSixty.id,
          supersededAssertionIds: [threeTwenty.id],
        },
      }),
    /PERMISSION_ABSENT|FORBIDDEN/,
  );
  void ceo;
});

test("S045 contradiction: 320 by identity, reversed creation order, stale set, and invalid IDs", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Contradiction 320");
  extractNote(service, planner, organisationId, engagement.id, "The other principal expects closer to 360 people.", "rev-360");
  extractNote(service, planner, organisationId, engagement.id, "We are planning for 320 guests.", "rev-320");
  const workspace = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  const conflict = workspace.conflicts.find((item) => item.topicKey === "guest.target_count" && item.status === "OPEN")!;
  const threeTwenty = workspace.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "320")!;
  const threeSixty = workspace.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "360")!;
  const createdOrder = workspace.assertions.filter((item) => item.topicKey === "guest.target_count").map((item) => item.id);
  assert.equal(createdOrder[0], threeSixty.id);
  service.resolveAssertionConflict(planner, {
    organisationId,
    engagementId: engagement.id,
    conflictId: conflict.id,
    expectedVersion: conflict.version,
    reason: "choose 320 by identity after reversed creation",
    idempotencyKey: "resolve-320",
    decision: {
      kind: "SELECT_GOVERNING_ASSERTION",
      governingAssertionId: threeTwenty.id,
      supersededAssertionIds: [threeSixty.id],
    },
  });
  const after = guestAssertions(service, planner, organisationId, engagement.id);
  assert.equal(after.find((item) => item.id === threeTwenty.id)?.confirmationState, "STAFF_REVIEWED");
  assert.equal(after.find((item) => item.id === threeSixty.id)?.confirmationState, "SUPERSEDED");

  const second = startEngagement(service, "Contradiction foreign");
  extractNote(service, planner, organisationId, second.engagement.id, "We are planning for 320 guests.", "foreign-320");
  extractNote(service, planner, organisationId, second.engagement.id, "The other principal expects closer to 360 people.", "foreign-360");
  const foreign = service.getDiscoveryWorkspace(planner, organisationId, second.engagement.id);
  const foreignConflict = foreign.conflicts.find((item) => item.status === "OPEN")!;
  const foreignGoverning = foreign.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "360")!;
  assert.throws(
    () =>
      service.resolveAssertionConflict(planner, {
        organisationId,
        engagementId: second.engagement.id,
        conflictId: foreignConflict.id,
        expectedVersion: foreignConflict.version,
        reason: "foreign id",
        idempotencyKey: "resolve-foreign",
        decision: {
          kind: "SELECT_GOVERNING_ASSERTION",
          governingAssertionId: threeTwenty.id,
          supersededAssertionIds: [foreignGoverning.id],
        },
      }),
    /governing assertion is not a candidate|VALIDATION_FAILED/,
  );
  assert.throws(
    () =>
      service.resolveAssertionConflict(planner, {
        organisationId,
        engagementId: second.engagement.id,
        conflictId: foreignConflict.id,
        expectedVersion: foreignConflict.version,
        reason: "governing in superseded",
        idempotencyKey: "resolve-self-supersede",
        decision: {
          kind: "SELECT_GOVERNING_ASSERTION",
          governingAssertionId: foreignGoverning.id,
          supersededAssertionIds: [foreignGoverning.id],
        },
      }),
    /cannot also be superseded|VALIDATION_FAILED/,
  );
  extractNote(service, planner, organisationId, second.engagement.id, "We expect 400 guests.", "stale-400");
  assert.throws(
    () =>
      service.resolveAssertionConflict(planner, {
        organisationId,
        engagementId: second.engagement.id,
        conflictId: foreignConflict.id,
        expectedVersion: foreignConflict.version,
        reason: "stale set",
        idempotencyKey: "resolve-stale-set",
        decision: {
          kind: "SELECT_GOVERNING_ASSERTION",
          governingAssertionId: foreignGoverning.id,
          supersededAssertionIds: foreignConflict.assertionIds.filter((id) => id !== foreignGoverning.id),
        },
      }),
    /stale candidate set|VERSION_CONFLICT/,
  );
});

test("S045 contradiction: equal timestamps still bind the selected identity and legacy SELECT remains valid", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Equal timestamps");
  extractNote(service, planner, organisationId, engagement.id, "We are planning for 320 guests.", "eq-320");
  extractNote(service, planner, organisationId, engagement.id, "The other principal expects closer to 360 people.", "eq-360");
  const snap = service.currentSnapshot();
  for (const assertion of snap.candidateAssertions.filter((item) => item.engagementId === engagement.id)) {
    assertion.createdAt = NOW;
    assertion.updatedAt = NOW;
  }
  service.loadSnapshot(snap);
  const workspace = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  const conflict = workspace.conflicts.find((item) => item.status === "OPEN")!;
  const threeSixty = workspace.assertions.find((item) => String((item.structuredValue as { count?: string }).count) === "360")!;
  service.resolveAssertionConflict(planner, {
    organisationId,
    engagementId: engagement.id,
    conflictId: conflict.id,
    resolution: "SELECT",
    selectedAssertionId: threeSixty.id,
    expectedVersion: conflict.version,
    reason: "legacy select 360",
    idempotencyKey: "legacy-select-360",
  });
  assert.equal(guestAssertions(service, planner, organisationId, engagement.id).find((item) => item.id === threeSixty.id)?.confirmationState, "STAFF_REVIEWED");
});

test("S045 budget: candidate, working, submitted, unresolved, eligible 360, override, unknown, and maker cannot self-approve", () => {
  const { service, planner, ceo, organisationId, engagement } = startEngagement(fixtureService().service, "Budget gate");
  extractNote(service, planner, organisationId, engagement.id, "We are planning for approximately 360 guests.", "budget-360");
  assert.equal(governingGuestCountFromBrief(service.currentSnapshot(), engagement.id).kind, "UNKNOWN");
  const extracted = guestAssertions(service, planner, organisationId, engagement.id)[0]!;
  service.reviewCandidateAssertion(planner, {
    organisationId,
    engagementId: engagement.id,
    assertionId: extracted.id,
    decision: "ACCEPT_STAFF_REVIEWED",
    expectedVersion: extracted.version,
    reason: "staff review",
    idempotencyKey: "review-360",
  });
  service.createBriefDraft(planner, { organisationId, engagementId: engagement.id, reason: "draft", idempotencyKey: "draft-360" });
  assert.equal(governingGuestCountFromBrief(service.currentSnapshot(), engagement.id).kind, "BRIEF_NOT_CURRENT");
  const draft = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).draft!;
  const submitted = service.submitBriefEdition(planner, {
    organisationId,
    engagementId: engagement.id,
    gate: "WORKING",
    expectedVersion: draft.version,
    reason: "submit",
    idempotencyKey: "submit-360",
  });
  const submittedSource = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  assert.equal(submittedSource.kind, "BRIEF_NOT_CURRENT");
  if (submittedSource.kind === "BRIEF_NOT_CURRENT") assert.equal(submittedSource.latestBriefState, "SUBMITTED");
  assert.throws(
    () =>
      decideBriefEditionOnSnap(
        service.currentSnapshot(),
        { organisationId, editionId: submitted.id, decision: "APPROVE", expectedVersion: submitted.version },
        NOW,
        planner.personId,
      ),
    /submitting maker cannot decide|FORBIDDEN/,
  );
  const approved = service.decideBriefEdition(ceo, {
    organisationId,
    editionId: submitted.id,
    decision: "APPROVE",
    expectedVersion: submitted.version,
    reason: "checker approve",
    idempotencyKey: "checker-approve",
  });
  const eligible = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  assert.equal(eligible.kind, "CURRENT_BRIEF");
  if (eligible.kind === "CURRENT_BRIEF") assert.equal(eligible.count, "360");
  const scenario = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guests: "410",
    guestCountOverrideReason: "Synthetic planning increase to 410",
    assumptionAcknowledged: true,
    reason: "override",
    idempotencyKey: "budget-override",
  });
  assert.ok(scenario.id);
  const assumption = service.currentSnapshot().budgetAssumptions.find((item) => item.engagementId === engagement.id);
  assert.equal(assumption?.sourceKind, "SCENARIO_OVERRIDE");
  const still = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  if (still.kind === "CURRENT_BRIEF") assert.equal(still.count, "360");
  void approved;

  const other = startEngagement(service, "Budget unknown");
  assert.equal(governingGuestCountFromBrief(service.currentSnapshot(), other.engagement.id).kind, "UNKNOWN");
  assert.equal(service.getIntelligenceWorkspace(planner, organisationId, other.engagement.id).guestPrefill.kind, "UNKNOWN");

  const contradicted = startEngagement(service, "Budget contradiction");
  extractNote(service, planner, organisationId, contradicted.engagement.id, "We are planning for 320 guests.", "open-320");
  extractNote(service, planner, organisationId, contradicted.engagement.id, "The other principal expects closer to 360 people.", "open-360");
  assert.equal(governingGuestCountFromBrief(service.currentSnapshot(), contradicted.engagement.id).kind, "UNRESOLVED_CONTRADICTION");
});
