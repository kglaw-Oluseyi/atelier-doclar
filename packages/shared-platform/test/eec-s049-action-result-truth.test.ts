import assert from "node:assert/strict";
import test from "node:test";
import { decideBriefEditionOnSnap } from "../src/eec-intelligence.js";
import { governingGuestCountFromBrief } from "../src/eec-operations.js";
import { BudgetScenarioEditionSchema } from "../src/eec-intelligence-schemas.js";
import { budgetGeneratedTimeLabel } from "../src/durable-mutation-effect.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

const T1 = "2026-09-09T10:00:00.000Z";
const T2 = "2026-09-09T11:00:00.000Z";
const T3 = "2026-09-09T12:00:00.000Z";

function startEngagement(service: ReturnType<typeof fixtureService>["service"], reference: string, now = T1) {
  const ceo = actor(people.personCeo, { now });
  const planner = actor(people.personPlanner, { now });
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: reference,
    eventConceptLabel: "S049 celebration",
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
  service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId,
    artefactId: source.id,
    reason: "extract",
    idempotencyKey: `extract-${key}`,
  });
}

function approveBrief360(service: ReturnType<typeof fixtureService>["service"], reference: string, now = T1) {
  const started = startEngagement(service, reference, now);
  const { planner, ceo, organisationId, engagement } = started;
  extractNote(service, planner, organisationId, engagement.id, "We are planning for approximately 360 guests.", `note-${reference}`);
  const extracted = service
    .getDiscoveryWorkspace(planner, organisationId, engagement.id)
    .assertions.find((item) => item.topicKey === "guest.target_count")!;
  service.reviewCandidateAssertion(planner, {
    organisationId,
    engagementId: engagement.id,
    assertionId: extracted.id,
    decision: "ACCEPT_STAFF_REVIEWED",
    expectedVersion: extracted.version,
    reason: "staff review",
    idempotencyKey: `review-${reference}`,
  });
  service.createBriefDraft(planner, { organisationId, engagementId: engagement.id, reason: "draft", idempotencyKey: `draft-${reference}` });
  const draft = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).draft!;
  const submitted = service.submitBriefEdition(planner, {
    organisationId,
    engagementId: engagement.id,
    gate: "WORKING",
    expectedVersion: draft.version,
    reason: "submit",
    idempotencyKey: `submit-${reference}`,
  });
  assert.throws(
    () =>
      decideBriefEditionOnSnap(
        service.currentSnapshot(),
        { organisationId, editionId: submitted.id, decision: "APPROVE", expectedVersion: submitted.version },
        now,
        planner.personId,
      ),
    /submitting maker cannot decide|FORBIDDEN/,
  );
  service.decideBriefEdition(ceo, {
    organisationId,
    editionId: submitted.id,
    decision: "APPROVE",
    expectedVersion: submitted.version,
    reason: "checker approve",
    idempotencyKey: `approve-${reference}`,
  });
  const governing = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  assert.equal(governing.kind, "CURRENT_BRIEF");
  if (governing.kind === "CURRENT_BRIEF") assert.equal(governing.count, "360");
  return { ...started, governing };
}

function calculate(
  service: ReturnType<typeof fixtureService>["service"],
  planner: ReturnType<typeof actor>,
  organisationId: string,
  engagementId: string,
  guests: number,
  reason: string,
  key: string,
  now: string,
) {
  return service.calculateBudgetScenario(actor(planner.personId, { now, correlationId: `corr-${key}` }), {
    organisationId,
    engagementId,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: guests,
    guestCountOverrideReason: reason,
    reason: `calculate ${guests}`,
    idempotencyKey: key,
  });
}

test("S049 replay truth: first 350 is APPLIED; identical replay is REPLAYED with no data change", () => {
  const { service, planner, organisationId, engagement } = approveBrief360(fixtureService().service, "S049 replay");
  const first = calculate(service, planner, organisationId, engagement.id, 350, "Synthetic planning reduction to 350", "s049-350", T1);
  const firstEffect = service.consumeLastMutationEffect();
  assert.equal(firstEffect?.application, "APPLIED");
  assert.equal(firstEffect?.didDataChange, true);
  assert.ok(firstEffect?.createdRecordIds.includes(first.id));
  const replay = calculate(service, planner, organisationId, engagement.id, 350, "Synthetic planning reduction to 350", "s049-350-b", T3);
  const replayEffect = service.consumeLastMutationEffect();
  assert.equal(replay.id, first.id);
  assert.equal(replay.resultHash, first.resultHash);
  assert.equal(budgetGeneratedTimeLabel(replay), budgetGeneratedTimeLabel(first));
  assert.equal(replayEffect?.application, "REPLAYED");
  assert.equal(replayEffect?.didDataChange, false);
  assert.ok(replayEffect?.reusedRecordIds.includes(first.id));
  const audits = service.currentSnapshot().audit.filter((item) => item.resourceId === first.id);
  assert.equal(audits.filter((item) => item.action === "budget.calculated" && item.outcome === "SUCCESS").length, 1);
  assert.ok(audits.some((item) => item.action === "budget.calculation.replayed"));
  const successor = calculate(service, planner, organisationId, engagement.id, 340, "Further synthetic reduction to 340", "s049-340", T2);
  const successorEffect = service.consumeLastMutationEffect();
  assert.equal(successorEffect?.application, "APPLIED");
  assert.notEqual(successor.id, first.id);
  const prior = service.getBudgetCalculationResult(planner, organisationId, engagement.id, first.id);
  assert.equal(prior.resultHash, first.resultHash);
  assert.equal(budgetGeneratedTimeLabel(prior), budgetGeneratedTimeLabel(first));
});

test("S049 timestamp provenance: 350 generated time survives 340/335, replay, refresh and store parity", async () => {
  const memory = fixtureService();
  const { service, planner, organisationId, engagement } = approveBrief360(memory.service, "S049 time");
  const first = calculate(service, planner, organisationId, engagement.id, 350, "Synthetic planning reduction to 350", "s049-time-350", T1);
  assert.equal(first.calculationGeneratedAt, T1);
  assert.equal(budgetGeneratedTimeLabel(first), T1);
  calculate(service, planner, organisationId, engagement.id, 340, "Further synthetic reduction to 340", "s049-time-340", T2);
  const after340 = service.getBudgetCalculationResult(planner, organisationId, engagement.id, first.id);
  assert.equal(after340.calculationGeneratedAt, T1);
  assert.equal(budgetGeneratedTimeLabel(after340), T1);
  assert.notEqual(after340.updatedAt, after340.calculationGeneratedAt);
  calculate(service, planner, organisationId, engagement.id, 335, "Further synthetic reduction to 335", "s049-time-335", T3);
  const after335 = service.getBudgetCalculationResult(planner, organisationId, engagement.id, first.id);
  assert.equal(after335.calculationGeneratedAt, T1);
  const replay = calculate(service, planner, organisationId, engagement.id, 350, "Synthetic planning reduction to 350", "s049-time-350-replay", T3);
  assert.equal(replay.calculationGeneratedAt, T1);
  const legacy = budgetGeneratedTimeLabel({ createdAt: undefined, calculationGeneratedAt: undefined });
  assert.equal(legacy, "Generation time unavailable for this legacy result");
  const parsed = BudgetScenarioEditionSchema.parse(after335);
  assert.equal(parsed.calculationGeneratedAt, T1);
  const db = new MemoryPlatformPg();
  const firstStore = await PostgresPlatformStore.open(db);
  await firstStore.replaceAsync(service.currentSnapshot());
  const reopened = await PostgresPlatformStore.open(db);
  const persisted = reopened.snapshot().budgetScenarioEditions.find((item) => item.id === first.id);
  assert.equal(persisted?.calculationGeneratedAt, T1);
  assert.equal(budgetGeneratedTimeLabel(persisted ?? {}), T1);
});

test("S049 maker/checker denial and stale decide remain NOT_APPLIED", () => {
  const { service, planner, ceo, organisationId, engagement } = approveBrief360(fixtureService().service, "S049 decide");
  const scenario = calculate(service, planner, organisationId, engagement.id, 350, "Synthetic planning reduction to 350", "s049-decide-350", T1);
  assert.throws(
    () =>
      service.decideBudgetScenario(planner, {
        organisationId,
        scenarioId: scenario.id,
        expectedVersion: scenario.version,
        reason: "maker cannot approve",
        idempotencyKey: "s049-maker",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      service.decideBudgetScenario(ceo, {
        organisationId,
        scenarioId: scenario.id,
        expectedVersion: scenario.version - 1,
        reason: "stale decide",
        idempotencyKey: "s049-stale",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
  );
});
