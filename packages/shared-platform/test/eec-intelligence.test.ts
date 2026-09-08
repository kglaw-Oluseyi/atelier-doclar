import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBudgetExpr } from "../src/eec-budget-engine.js";
import { calculateCriticalPath, nextInterviewQuestion } from "../src/eec-intelligence.js";
import { migrateEosS05AIntelligence } from "../src/eec-migration.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function openReviewedEngagement() {
  const { service, store } = fixtureService();
  const ceo = actor(people.personCeo);
  const planner = actor(people.personPlanner);
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: "Adéwálé intelligence enquiry",
    enquiryChannel: "DIRECT",
    knownEventType: "WEDDING",
    reason: "open",
    idempotencyKey: "intel-opp",
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: "intel-eng",
  });
  for (const dimension of ["PARTICIPATION", "AI_ANALYSIS"] as const) {
    service.recordDiscoveryConsent(planner, {
      organisationId,
      engagementId: engagement.id,
      dimension,
      decision: "GRANTED",
      policyVersion: "policy-v1",
      wordingEdition: "wording-v1",
      reason: dimension,
      idempotencyKey: `intel-consent-${dimension}`,
    });
  }
  const artefact = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Staff note",
    text: "The Adéwálé family mentioned 180 guests in Yorùbá.",
    reason: "note",
    idempotencyKey: "intel-note",
  });
  service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: artefact.id,
    reason: "extract",
    idempotencyKey: "intel-extract",
  });
  const workspace = service.getDiscoveryWorkspace(ceo, organisationId, engagement.id);
  const assertion = workspace.assertions.find((item) => item.topicKey === "guest.target_count") ?? workspace.assertions[0]!;
  const reviewed = service.reviewCandidateAssertion(planner, {
    organisationId,
    engagementId: engagement.id,
    assertionId: assertion.id,
    decision: "ACCEPT_STAFF_REVIEWED",
    expectedVersion: assertion.version,
    reason: "staff review",
    idempotencyKey: "intel-review",
  });
  return { service, store, ceo, planner, organisationId, engagement, reviewed };
}

test("EEC-11 brief draft, maker/checker and publish", () => {
  const { service, ceo, planner, organisationId, engagement } = openReviewedEngagement();
  const draft = service.createBriefDraft(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "draft brief",
    idempotencyKey: "brief-draft",
  });
  const replay = service.createBriefDraft(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "draft brief",
    idempotencyKey: "brief-draft",
  });
  assert.equal(replay.id, draft.id);
  const submitted = service.submitBriefEdition(planner, {
    organisationId,
    engagementId: engagement.id,
    gate: "WORKING",
    expectedVersion: draft.version,
    reason: "submit",
    idempotencyKey: "brief-submit",
  });
  assert.throws(
    () =>
      service.decideBriefEdition(planner, {
        organisationId,
        editionId: submitted.id,
        decision: "APPROVE",
        expectedVersion: submitted.version,
        reason: "same maker",
        idempotencyKey: "brief-same-maker",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  const approved = service.decideBriefEdition(ceo, {
    organisationId,
    editionId: submitted.id,
    decision: "APPROVE",
    expectedVersion: submitted.version,
    reason: "approve",
    idempotencyKey: "brief-approve",
  });
  const published = service.publishBriefEdition(ceo, {
    organisationId,
    editionId: approved.id,
    expectedVersion: approved.version,
    reason: "publish",
    idempotencyKey: "brief-publish",
  });
  assert.equal(published.status, "PUBLISHED");
  assert.match(published.contentHash, /^[a-f0-9]{64}$/);
});

test("EEC-12 client confirmation and token isolation", () => {
  const { service, ceo, planner, organisationId, engagement, reviewed } = openReviewedEngagement();
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "issue client access",
    idempotencyKey: "client-access",
  });
  assert.ok(access.token);
  const projection = service.getClientDiscoveryProjection(access.token);
  assert.equal(projection.engagementId, engagement.id);
  assert.ok(!JSON.stringify(projection).includes(reviewed.id) || projection.assertions.some((item) => item.id === reviewed.id));
  const decision = service.recordClientBriefDecisionByToken(access.token, {
    assertionId: reviewed.id,
    decision: "CONFIRM",
    participantLabel: "Adéwálé principal",
  });
  assert.equal(decision.decision, "CONFIRM");
  assert.throws(
    () => service.getClientDiscoveryProjection("not-a-token"),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  assert.throws(
    () =>
      service.recordClientBriefDecision(actor(people.personAuditor), {
        organisationId,
        engagementId: engagement.id,
        assertionId: reviewed.id,
        decision: "CONFIRM",
        participantLabel: "auditor",
        reason: "denied",
        idempotencyKey: "client-auditor",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  assert.ok(service.getDiscoveryWorkspace(ceo, organisationId, engagement.id));
});

test("EEC-13 explicit conversion is idempotent and creates Client/Event", () => {
  const { service, store, ceo, planner, organisationId, engagement } = openReviewedEngagement();
  const draft = service.createBriefDraft(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "draft",
    idempotencyKey: "conv-draft",
  });
  const submitted = service.submitBriefEdition(planner, {
    organisationId,
    engagementId: engagement.id,
    gate: "WORKING",
    expectedVersion: draft.version,
    reason: "submit",
    idempotencyKey: "conv-submit",
  });
  const approved = service.decideBriefEdition(ceo, {
    organisationId,
    editionId: submitted.id,
    decision: "APPROVE",
    expectedVersion: submitted.version,
    reason: "approve",
    idempotencyKey: "conv-approve",
  });
  const published = service.publishBriefEdition(ceo, {
    organisationId,
    editionId: approved.id,
    expectedVersion: approved.version,
    reason: "publish",
    idempotencyKey: "conv-publish",
  });
  assert.throws(
    () =>
      service.convertDiscoveryEngagement(planner, {
        organisationId,
        engagementId: engagement.id,
        sourceBriefHash: published.contentHash,
        clientDisposition: { kind: "CREATE_NEW", code: "ADEWALE", displayName: "Adéwálé family" },
        eventDisposition: {
          kind: "CREATE_NEW",
          code: "WED-01",
          name: "Adéwálé wedding",
          startsAt: "2026-12-12T10:00:00.000Z",
          endsAt: "2026-12-13T02:00:00.000Z",
          timezone: "Africa/Lagos",
        },
        expectedVersion: service.getDiscoveryWorkspace(ceo, organisationId, engagement.id).engagement.version,
        reason: "planner cannot convert",
        idempotencyKey: "conv-planner",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  const receipt = service.convertDiscoveryEngagement(ceo, {
    organisationId,
    engagementId: engagement.id,
    sourceBriefHash: published.contentHash,
    clientDisposition: { kind: "CREATE_NEW", code: "ADEWALE", displayName: "Adéwálé family" },
    eventDisposition: {
      kind: "CREATE_NEW",
      code: "WED-01",
      name: "Adéwálé wedding",
      startsAt: "2026-12-12T10:00:00.000Z",
      endsAt: "2026-12-13T02:00:00.000Z",
      timezone: "Africa/Lagos",
    },
    expectedVersion: service.getDiscoveryWorkspace(ceo, organisationId, engagement.id).engagement.version,
    reason: "convert",
    idempotencyKey: "conv-1",
  });
  const replay = service.convertDiscoveryEngagement(ceo, {
    organisationId,
    engagementId: engagement.id,
    sourceBriefHash: published.contentHash,
    clientDisposition: { kind: "CREATE_NEW", code: "ADEWALE", displayName: "Adéwálé family" },
    eventDisposition: {
      kind: "CREATE_NEW",
      code: "WED-01",
      name: "Adéwálé wedding",
      startsAt: "2026-12-12T10:00:00.000Z",
      endsAt: "2026-12-13T02:00:00.000Z",
      timezone: "Africa/Lagos",
    },
    expectedVersion: service.getDiscoveryWorkspace(ceo, organisationId, engagement.id).engagement.version,
    reason: "convert",
    idempotencyKey: "conv-1",
  });
  assert.equal(replay.id, receipt.id);
  assert.equal(store.snapshot().clients.some((item) => item.id === receipt.clientId), true);
  assert.equal(store.snapshot().events.some((item) => item.id === receipt.eventId), true);
  assert.throws(
    () =>
      service.convertDiscoveryEngagement(ceo, {
        organisationId,
        engagementId: engagement.id,
        sourceBriefHash: "0".repeat(64),
        clientDisposition: { kind: "CREATE_NEW", code: "OTHER", displayName: "Other" },
        eventDisposition: {
          kind: "CREATE_NEW",
          code: "WED-02",
          name: "Other",
          startsAt: "2026-12-12T10:00:00.000Z",
          endsAt: "2026-12-13T02:00:00.000Z",
          timezone: "Africa/Lagos",
        },
        expectedVersion: 99,
        reason: "wrong hash",
        idempotencyKey: "conv-wrong",
      }),
    (error: unknown) => error instanceof PlatformError && (error.code === "IDEMPOTENCY_CONFLICT" || error.code === "VALIDATION_FAILED" || error.code === "TRANSITION_INVALID"),
  );
});

test("EEC-15–EEC-25 budget engine money, hashes, permissions and no payments", () => {
  const { service, ceo, planner, organisationId, engagement } = openReviewedEngagement();
  const first = evaluateBudgetExpr(
    { kind: "ADD", terms: [{ kind: "CONST_MONEY", valueMinor: "1500000", currency: "NGN" }, { kind: "CONST_MONEY", valueMinor: "2500000", currency: "NGN" }] },
    { drivers: {}, ruleEditionHash: "rule-a" },
  );
  const second = evaluateBudgetExpr(
    { kind: "ADD", terms: [{ kind: "CONST_MONEY", valueMinor: "1500000", currency: "NGN" }, { kind: "CONST_MONEY", valueMinor: "2500000", currency: "NGN" }] },
    { drivers: {}, ruleEditionHash: "rule-a" },
  );
  assert.deepEqual(first.value, second.value);
  assert.equal(first.inputHash, second.inputHash);
  assert.equal(first.value.kind, "MONEY");
  assert.throws(
    () =>
      evaluateBudgetExpr(
        { kind: "ADD", terms: [{ kind: "CONST_MONEY", valueMinor: "1", currency: "NGN" }, { kind: "CONST_MONEY", valueMinor: "1", currency: "USD" }] },
        { drivers: {}, ruleEditionHash: "fx" },
      ),
    (error: unknown) => error instanceof PlatformError,
  );
  assert.throws(
    () => evaluateBudgetExpr({ kind: "DRIVER", key: "missing.driver" }, { drivers: {}, ruleEditionHash: "missing" }),
    (error: unknown) => error instanceof PlatformError,
  );
  service.declareFinancialState(ceo, {
    organisationId,
    kind: "ENVELOPE",
    currency: "NGN",
    minor: "500000000",
    basis: "Synthetic envelope",
    reason: "envelope",
    idempotencyKey: "envelope-1",
  });
  const scenario = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guests: "180",
    reason: "calculate",
    idempotencyKey: "budget-1",
  });
  assert.match(scenario.expectedMinor, /^-?\d+$/);
  assert.ok(scenario.trace.length > 0);
  const lower = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "CLIENT_ALTERNATIVE",
    archetype: "COMPRESSED",
    guests: "120",
    reason: "lower spend",
    idempotencyKey: "budget-low",
  });
  assert.ok(BigInt(lower.expectedMinor) < BigInt(scenario.expectedMinor));
  assert.throws(
    () =>
      service.calculateBudgetScenario(planner, {
        organisationId,
        engagementId: engagement.id,
        purpose: "PROTECT_FULL_BRIEF",
        archetype: "WEDDING",
        guests: "180",
        excludeCodes: ["ACCESSIBILITY"],
        reason: "drop protected",
        idempotencyKey: "budget-protected",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
  );
  assert.throws(
    () =>
      service.decideBudgetScenario(planner, {
        organisationId,
        scenarioId: scenario.id,
        expectedVersion: scenario.version,
        reason: "same maker",
        idempotencyKey: "budget-same",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  const approved = service.decideBudgetScenario(ceo, {
    organisationId,
    scenarioId: scenario.id,
    expectedVersion: scenario.version,
    reason: "approve budget",
    idempotencyKey: "budget-approve",
  });
  assert.equal(approved.status, "APPROVED");
  assert.throws(
    () =>
      service.declareFinancialState(ceo, {
        organisationId,
        kind: "PAYMENT",
        currency: "NGN",
        minor: "1",
        basis: "not allowed",
        reason: "payment",
        idempotencyKey: "pay-1",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
  );
  const auditor = service.getIntelligenceWorkspace(actor(people.personAuditor), organisationId, engagement.id);
  assert.equal(auditor.scenarios[0]?.expectedMinor, "redacted");
  assert.throws(
    () =>
      service.calculateBudgetScenario(actor(people.personAdmin), {
        organisationId,
        engagementId: engagement.id,
        purpose: "PROTECT_PRIORITIES",
        archetype: "WEDDING",
        guests: "10",
        reason: "admin",
        idempotencyKey: "budget-admin",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
});

test("EEC-26–EEC-32 roadmap critical path, cycles and change impact", () => {
  const { service, ceo, planner, organisationId, engagement } = openReviewedEngagement();
  const edition = service.instantiateRoadmap(planner, {
    organisationId,
    engagementId: engagement.id,
    titles: [
      { title: "Confirm guest count", layer: "DECISION", durationDays: "3", clientVisible: true },
      { title: "Venue hold window", layer: "OPERATIONAL_READINESS", durationDays: "5", clientVisible: false },
      { title: "Family celebration date", layer: "CLIENT_OUTCOME", durationDays: "2", clientVisible: true },
    ],
    reason: "roadmap",
    idempotencyKey: "road-1",
  });
  const path = service.getRoadmapCriticalPath(ceo, organisationId, edition.id);
  assert.equal(path.status, "CALCULATED");
  assert.equal(path.totalDurationDays, "10");
  const milestones = [
    { id: "11111111-1111-4111-8111-111111111201", organisationId, title: "A", layer: "DECISION" as const, durationDays: "1", clientVisible: true, schemaVersion: 1 as const, version: 1, createdAt: "2026-09-08T00:00:00.000Z", updatedAt: "2026-09-08T00:00:00.000Z" },
    { id: "11111111-1111-4111-8111-111111111202", organisationId, title: "B", layer: "DECISION" as const, durationDays: "1", clientVisible: true, schemaVersion: 1 as const, version: 1, createdAt: "2026-09-08T00:00:00.000Z", updatedAt: "2026-09-08T00:00:00.000Z" },
  ];
  assert.throws(
    () =>
      calculateCriticalPath(milestones, [
        {
          id: "11111111-1111-4111-8111-111111111211",
          organisationId,
          editionId: edition.id,
          fromMilestoneId: milestones[0]!.id,
          toMilestoneId: milestones[1]!.id,
          kind: "FINISH_TO_START",
          schemaVersion: 1,
          version: 1,
          createdAt: "2026-09-08T00:00:00.000Z",
          updatedAt: "2026-09-08T00:00:00.000Z",
        },
        {
          id: "11111111-1111-4111-8111-111111111212",
          organisationId,
          editionId: edition.id,
          fromMilestoneId: milestones[1]!.id,
          toMilestoneId: milestones[0]!.id,
          kind: "FINISH_TO_START",
          schemaVersion: 1,
          version: 1,
          createdAt: "2026-09-08T00:00:00.000Z",
          updatedAt: "2026-09-08T00:00:00.000Z",
        },
      ]),
    (error: unknown) => error instanceof PlatformError && /cycle/.test(error.message),
  );
  const change = service.createChangeProposal(planner, {
    organisationId,
    engagementId: engagement.id,
    summary: "Guest count may move from 180 to 220",
    reason: "detect",
    idempotencyKey: "change-1",
  });
  const replay = service.createChangeProposal(planner, {
    organisationId,
    engagementId: engagement.id,
    summary: "Guest count may move from 180 to 220",
    reason: "detect",
    idempotencyKey: "change-1b",
  });
  assert.equal(replay.id, change.id);
  const impact = service.assessChangeImpact(planner, {
    organisationId,
    changeProposalId: change.id,
    reason: "assess",
    idempotencyKey: "impact-1",
  });
  assert.equal(impact.impacts.find((item) => item.target === "rsvp")?.kind, "NONE");
  assert.throws(
    () =>
      service.decideChangeProposal(planner, {
        organisationId,
        changeProposalId: change.id,
        decision: "APPROVE",
        expectedVersion: service.getIntelligenceWorkspace(ceo, organisationId, engagement.id).changes[0]!.version,
        reason: "same detector",
        idempotencyKey: "change-same",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  const decided = service.decideChangeProposal(ceo, {
    organisationId,
    changeProposalId: change.id,
    decision: "APPROVE",
    expectedVersion: service.getIntelligenceWorkspace(ceo, organisationId, engagement.id).changes[0]!.version,
    reason: "approve change",
    idempotencyKey: "change-approve",
  });
  assert.equal(decided.status, "PROPAGATED");
});

test("EEC-33–EEC-36 AI remains fixture and proposal-only", () => {
  const { service, planner, organisationId, engagement } = openReviewedEngagement();
  const job = service.runFixtureAiJob(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "NEXT_QUESTION",
    reason: "fixture",
    idempotencyKey: "ai-1",
  });
  assert.equal(job.providerState, "FIXTURE");
  assert.equal((job.output as { governing?: boolean }).governing, false);
  assert.throws(
    () =>
      service.runFixtureAiJob(actor(people.personPlanner, { actorKind: "AI" }), {
        organisationId,
        engagementId: engagement.id,
        kind: "SUMMARY",
        reason: "ai actor",
        idempotencyKey: "ai-actor",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "AI_AUTHORITY_FORBIDDEN",
  );
  const question = nextInterviewQuestion(
    [
      { topicKey: "guest.target_count", state: "CONFLICTED", rankScore: "9" },
      { topicKey: "date.window", state: "CONFIRMED", rankScore: "1" },
    ],
    ["guest.target_count"],
  );
  assert.equal(question?.revisit, true);
  assert.match(question?.question ?? "", /revisit/);
});

test("EEC-40 executive command and intelligence migration replay", () => {
  const { service, store, ceo, organisationId } = openReviewedEngagement();
  const command = service.getExecutiveCommand(ceo, organisationId);
  assert.ok(typeof command.known === "number");
  assert.ok(command.blocking);
  assert.throws(
    () => service.getExecutiveCommand(actor(people.personAdmin), organisationId),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  const first = migrateEosS05AIntelligence(store.snapshot(), "2026-09-08T23:00:00.000Z");
  assert.ok(first.status === "APPLIED" || first.status === "REPLAYED");
  const replay = migrateEosS05AIntelligence(first.snapshot, "2026-09-08T23:01:00.000Z");
  assert.equal(replay.status, "REPLAYED");
});
