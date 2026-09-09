import assert from "node:assert/strict";
import test from "node:test";
import { decideBriefEditionOnSnap } from "../src/eec-intelligence.js";
import { governingGuestCountFromBrief } from "../src/eec-operations.js";
import {
  MAX_GUEST_COUNT,
  parseBudgetCalculateFormData,
  parseCalculateBudgetScenarioCommand,
  resolveEffectiveBudgetDrivers,
} from "../src/eec-budget-override.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-09T20:00:00.000Z";

function startEngagement(service: ReturnType<typeof fixtureService>["service"], reference: string) {
  const ceo = actor(people.personCeo, { now: NOW });
  const planner = actor(people.personPlanner, { now: NOW });
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: reference,
    eventConceptLabel: "S047 celebration",
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

function approveBrief360(service: ReturnType<typeof fixtureService>["service"], reference: string) {
  const started = startEngagement(service, reference);
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
        NOW,
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

function guestDriven(scenario: { trace: Array<{ op: string; detail: string; value: string }> }, code: string) {
  return scenario.trace.filter((step) => step.op === "DRIVER" && step.detail === `${code}:guest.target_count`);
}

test("S047 command: FormData 350 parses to numeric override 350", () => {
  const formData = new FormData();
  formData.set("organisationId", "00000000-0000-4000-8000-000000000001");
  formData.set("engagementId", "00000000-0000-4000-8000-000000000002");
  formData.set("guestCountOverride", "350");
  formData.set("guestCountOverrideReason", "Synthetic planning reduction");
  formData.set("idempotencyKey", "form-350");
  const command = parseBudgetCalculateFormData(formData);
  assert.equal(command.guestCountOverride, 350);
  assert.equal(typeof command.guestCountOverride, "number");
});

test("S047 command: empty means no override; invalid values are rejected", () => {
  const empty = parseCalculateBudgetScenarioCommand({
    organisationId: "00000000-0000-4000-8000-000000000001",
    guestCountOverride: "",
    idempotencyKey: "empty",
  });
  assert.equal(empty.guestCountOverride, undefined);
  assert.throws(
    () => parseCalculateBudgetScenarioCommand({ organisationId: "00000000-0000-4000-8000-000000000001", guestCountOverride: "-1", idempotencyKey: "neg" }),
    (error: unknown) => error instanceof PlatformError,
  );
  assert.throws(
    () => parseCalculateBudgetScenarioCommand({ organisationId: "00000000-0000-4000-8000-000000000001", guestCountOverride: "350.5", idempotencyKey: "dec" }),
    (error: unknown) => error instanceof PlatformError,
  );
  assert.throws(
    () =>
      parseCalculateBudgetScenarioCommand({
        organisationId: "00000000-0000-4000-8000-000000000001",
        guestCountOverride: String(MAX_GUEST_COUNT + 1),
        idempotencyKey: "over",
      }),
    (error: unknown) => error instanceof PlatformError,
  );
});

test("S047 command: mass-assigned governing count is ignored", () => {
  const command = parseCalculateBudgetScenarioCommand({
    organisationId: "00000000-0000-4000-8000-000000000001",
    guestCountOverride: "350",
    governingGuestCount: "360",
    idempotencyKey: "mass",
  });
  assert.equal(command.guestCountOverride, 350);
  assert.equal("governingGuestCount" in command, false);
});

test("S047 drivers: governing 360 with and without override", () => {
  const brief = resolveEffectiveBudgetDrivers({
    governingDrivers: [{ code: "guest.target_count", value: 360, overridable: true }],
    scenarioAssumptions: [],
  });
  assert.equal(brief[0]?.value, 360);
  assert.equal(brief[0]?.provenance.kind, "CURRENT_BRIEF");
  const overridden = resolveEffectiveBudgetDrivers({
    governingDrivers: [{ code: "guest.target_count", value: 360, overridable: true }],
    scenarioAssumptions: [
      {
        driverCode: "guest.target_count",
        value: 350,
        source: "SCENARIO_OVERRIDE",
        governingValue: 360,
        reason: "Synthetic planning reduction",
      },
    ],
  });
  assert.equal(overridden[0]?.value, 350);
  assert.equal(overridden[0]?.provenance.kind, "SCENARIO_OVERRIDE");
  if (overridden[0]?.provenance.kind === "SCENARIO_OVERRIDE") {
    assert.equal(overridden[0].provenance.governingValue, 360);
  }
  const threeForty = resolveEffectiveBudgetDrivers({
    governingDrivers: [{ code: "guest.target_count", value: 360, overridable: true }],
    scenarioAssumptions: [
      {
        driverCode: "guest.target_count",
        value: 340,
        source: "SCENARIO_OVERRIDE",
        governingValue: 360,
        reason: "Further synthetic reduction",
      },
    ],
  });
  assert.equal(threeForty[0]?.value, 340);
  assert.throws(
    () =>
      resolveEffectiveBudgetDrivers({
        governingDrivers: [{ code: "guest.target_count", value: 360, overridable: true }],
        scenarioAssumptions: [
          { driverCode: "guest.target_count", value: 350, source: "SCENARIO_OVERRIDE", governingValue: 360, reason: "first" },
          { driverCode: "guest.target_count", value: 340, source: "SCENARIO_OVERRIDE", governingValue: 360, reason: "second" },
        ],
      }),
    /duplicate active override/,
  );
  assert.throws(
    () =>
      resolveEffectiveBudgetDrivers({
        governingDrivers: [{ code: "guest.target_count", value: 360, overridable: false }],
        scenarioAssumptions: [
          { driverCode: "guest.target_count", value: 350, source: "SCENARIO_OVERRIDE", governingValue: 360, reason: "protected" },
        ],
      }),
    /not overridable/,
  );
});

test("S047 production break: typed 350 must become effective driver and catering/beverage traces", () => {
  const { service, planner, organisationId, engagement } = approveBrief360(fixtureService().service, "Override 350");
  const first = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 350,
    guestCountOverrideReason: "Synthetic planning reduction to 350",
    reason: "calculate 350",
    idempotencyKey: "s047-350",
  });
  const catering = guestDriven(first, "CATERING_HEAD");
  const beverage = guestDriven(first, "BEVERAGE");
  assert.ok(catering.length > 0, "catering driver trace missing");
  assert.ok(beverage.length > 0, "beverage driver trace missing");
  assert.ok(
    catering.every((step) => step.value === "350"),
    `catering used ${catering.map((step) => step.value).join(",")}`,
  );
  assert.ok(
    beverage.every((step) => step.value === "350"),
    `beverage used ${beverage.map((step) => step.value).join(",")}`,
  );
  assert.ok(
    first.trace.some((step) => /governing=360/.test(step.detail) && /assumption=350/.test(step.detail) && step.value === "350"),
    "override lineage trace missing",
  );
  assert.ok(
    first.trace.some((step) => /Event Brief was not changed/i.test(step.detail) || /brief_unchanged/i.test(step.detail)),
    "brief-unchanged trace missing",
  );
  const assumption = service.currentSnapshot().budgetAssumptions.find((item) => item.engagementId === engagement.id && item.value === "350");
  assert.equal(assumption?.sourceKind, "SCENARIO_OVERRIDE");
  assert.equal(assumption?.governingValue, "360");
  const still = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  if (still.kind === "CURRENT_BRIEF") assert.equal(still.count, "360");
  const lines = service.currentSnapshot().budgetLines.filter((item) => item.scenarioId === first.id);
  const guestLines = lines.filter((item) => item.quantityDriverKey === "guest.target_count");
  assert.ok(guestLines.length > 0);
  assert.ok(guestLines.every((item) => item.quantity === "350"));
  const venue = lines.find((item) => item.itemCode === "VENUE_HIRE");
  assert.ok(venue);
  assert.notEqual(venue!.quantity, "350");
  assert.ok(first.id);
  const reopened = service.getBudgetCalculationResult(planner, organisationId, engagement.id, first.id);
  assert.equal(reopened.id, first.id);
  assert.equal(reopened.resultHash, first.resultHash);
  const replay = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 350,
    guestCountOverrideReason: "Synthetic planning reduction to 350",
    reason: "calculate 350",
    idempotencyKey: "s047-350",
  });
  assert.equal(replay.id, first.id);
  assert.equal(replay.resultHash, first.resultHash);
  const successor = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 340,
    guestCountOverrideReason: "Further synthetic reduction to 340",
    reason: "calculate 340",
    idempotencyKey: "s047-340",
  });
  assert.notEqual(successor.id, first.id);
  assert.notEqual(successor.resultHash, first.resultHash);
  assert.ok(guestDriven(successor, "CATERING_HEAD").every((step) => step.value === "340"));
  const prior = service.getBudgetCalculationResult(planner, organisationId, engagement.id, first.id);
  assert.ok(guestDriven(prior, "CATERING_HEAD").every((step) => step.value === "350"));
  const briefAfter = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  if (briefAfter.kind === "CURRENT_BRIEF") assert.equal(briefAfter.count, "360");
  assert.throws(
    () =>
      service.calculateBudgetScenario(planner, {
        organisationId,
        engagementId: engagement.id,
        purpose: "PROTECT_PRIORITIES",
        archetype: "WEDDING",
        guestCountOverride: 350,
        reason: "missing reason",
        idempotencyKey: "s047-no-reason",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
  );
});

test("S047 production break: stale hash and wrong scope fail honestly", () => {
  const { service, planner, organisationId, engagement, governing } = approveBrief360(fixtureService().service, "Stale hash");
  assert.equal(governing.kind, "CURRENT_BRIEF");
  assert.throws(
    () =>
      service.calculateBudgetScenario(planner, {
        organisationId,
        engagementId: engagement.id,
        purpose: "PROTECT_PRIORITIES",
        archetype: "WEDDING",
        guestCountOverride: 350,
        guestCountOverrideReason: "Synthetic planning reduction to 350",
        governingBriefContentHash: "0".repeat(64),
        reason: "stale",
        idempotencyKey: "s047-stale",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
  );
  const other = startEngagement(service, "Other engagement");
  assert.throws(
    () =>
      service.calculateBudgetScenario(planner, {
        organisationId,
        engagementId: other.engagement.id,
        purpose: "PROTECT_PRIORITIES",
        archetype: "WEDDING",
        guestCountOverride: 350,
        guestCountOverrideReason: "Synthetic planning reduction to 350",
        governingBriefEditionId: governing.kind === "CURRENT_BRIEF" ? governing.briefEditionId : undefined,
        reason: "wrong event",
        idempotencyKey: "s047-scope",
      }),
    (error: unknown) => error instanceof PlatformError,
  );
  assert.equal(service.currentSnapshot().budgetScenarioEditions.filter((item) => item.engagementId === engagement.id).length, 0);
  const isolated = startEngagement(service, "Isolated");
  assert.throws(
    () => service.getBudgetCalculationResult(planner, organisationId, isolated.engagement.id, "00000000-0000-4000-8000-000000000099"),
    (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH"),
  );
});

test("S047 hashes: 360, 350 and 340 are distinct; identical 350 is deterministic", () => {
  const { service, planner, organisationId, engagement } = approveBrief360(fixtureService().service, "Hashes");
  const baseline = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 360,
    reason: "no variance",
    idempotencyKey: "hash-360",
  });
  const mid = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 350,
    guestCountOverrideReason: "Synthetic planning reduction to 350",
    reason: "350",
    idempotencyKey: "hash-350",
  });
  const low = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 340,
    guestCountOverrideReason: "Further synthetic reduction to 340",
    reason: "340",
    idempotencyKey: "hash-340",
  });
  assert.notEqual(baseline.resultHash, mid.resultHash);
  assert.notEqual(mid.resultHash, low.resultHash);
  assert.notEqual(baseline.inputHash, mid.inputHash);
  const replay = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guestCountOverride: 350,
    guestCountOverrideReason: "Synthetic planning reduction to 350",
    reason: "350",
    idempotencyKey: "hash-350",
  });
  assert.equal(replay.resultHash, mid.resultHash);
  const brief = governingGuestCountFromBrief(service.currentSnapshot(), engagement.id);
  const prefill = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).guestPrefill;
  assert.equal(brief.kind, "CURRENT_BRIEF");
  assert.equal(prefill.kind, "CURRENT_BRIEF");
  if (brief.kind === "CURRENT_BRIEF" && prefill.kind === "CURRENT_BRIEF") {
    assert.equal(prefill.contentHash, brief.contentHash);
    assert.equal(brief.count, "360");
  }
});
