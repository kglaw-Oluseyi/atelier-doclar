import assert from "node:assert/strict";
import test from "node:test";
import { addWorkingDays, INTERVIEW_CORPUS, nextGovernedInterviewFromCorpus } from "../src/eec-s05a-completion.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function openReviewedEngagement() {
  const { service, store } = fixtureService();
  const ceo = actor(people.personCeo);
  const planner = actor(people.personPlanner);
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: "Completion enquiry",
    enquiryChannel: "DIRECT",
    knownEventType: "WEDDING",
    reason: "open",
    idempotencyKey: "completion-opp",
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: "completion-eng",
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
      idempotencyKey: `completion-consent-${dimension}`,
    });
  }
  return { service, store, ceo, planner, organisationId, engagement };
}

test("client review edition sign-off is hash-bound and does not approve the brief", () => {
  const { service, planner, ceo, organisationId, engagement } = openReviewedEngagement();
  service.createBriefDraft(planner, { organisationId, engagementId: engagement.id, reason: "draft", idempotencyKey: "completion-draft" });
  service.submitBriefEdition(planner, {
    organisationId,
    engagementId: engagement.id,
    gate: "WORKING",
    expectedVersion: 1,
    reason: "submit",
    idempotencyKey: "completion-submit",
  });
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "review",
    idempotencyKey: "completion-token",
  });
  const projection = service.getClientDiscoveryProjection(access.token);
  assert.equal(projection.review?.status, "ISSUED");
  assert.ok(projection.review?.contentHash);
  const confirmed = service.recordClientReviewActionByToken(access.token, {
    kind: "CONFIRM_EDITION",
    expectedHash: projection.review!.contentHash,
  });
  assert.equal(confirmed.kind, "CONFIRM_EDITION");
  const after = service.getClientDiscoveryProjection(access.token);
  assert.equal(after.review?.status, "CLIENT_CONFIRMED");
  const brief = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).editions.find((item) => item.current);
  assert.equal(brief?.status, "SUBMITTED");
  assert.notEqual(brief?.decidedByPersonId, ceo.personId);
  assert.throws(
    () =>
      service.recordClientReviewActionByToken(access.token, {
        kind: "CONFIRM_EDITION",
        expectedHash: "not-the-review-hash",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
  );
});

test("client investment lineage does not approve a staff budget", () => {
  const { service, planner, organisationId, engagement } = openReviewedEngagement();
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "invest",
    idempotencyKey: "completion-invest-token",
  });
  service.recordClientInvestmentActionByToken(access.token, {
    kind: "NO_ENVELOPE",
    narrative: "We have not decided a figure.",
  });
  const projection = service.getClientDiscoveryProjection(access.token);
  assert.equal(projection.investment.envelopeStatus, "NOT_DECIDED");
  assert.ok(projection.investment.notices.some((item) => /not an instruction to spend/i.test(item)));
  service.recordClientInvestmentActionByToken(access.token, {
    kind: "CONFIRM_ENVELOPE",
    amountMinor: "2500000000",
  });
  const after = service.getClientDiscoveryProjection(access.token);
  assert.equal(after.investment.envelopeMinor, "2500000000");
  const scenarios = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).scenarios;
  assert.equal(scenarios.filter((item) => item.status === "APPROVED").length, 0);
});

test("working-day calendar placement and interview corpus coverage", () => {
  const { service, store, planner, organisationId, engagement } = openReviewedEngagement();
  const calendar = store.snapshot().calendarDefinitions.find((item) => item.organisationId === organisationId);
  assert.ok(calendar);
  assert.equal(calendar.timezone, "Africa/Lagos");
  assert.ok(calendar.blackoutDates.every((item) => item.synthetic));
  const friday = addWorkingDays("2026-09-11", 1, calendar, []);
  assert.equal(friday, "2026-09-14");
  const edition = service.instantiateRoadmap(planner, {
    organisationId,
    engagementId: engagement.id,
    archetype: "WEDDING",
    leadMode: "STANDARD",
    reason: "calendar",
    idempotencyKey: "completion-roadmap",
  });
  const milestones = service.getIntelligenceWorkspace(planner, organisationId, engagement.id).milestones;
  assert.ok(edition.unresolvedAssumptions?.some((item) => /date/i.test(item)) || milestones.every((item) => !item.targetEnd));
  const next = nextGovernedInterviewFromCorpus(store.snapshot(), engagement.id);
  assert.equal(next?.questionId, "welcome");
  assert.ok(INTERVIEW_CORPUS.some((item) => item.key === "ceremonies"));
  assert.ok(INTERVIEW_CORPUS.some((item) => item.key === "investment"));
  assert.ok(INTERVIEW_CORPUS.some((item) => item.key === "privacy"));
});

test("evaluation readiness is fail-closed until an executable run exists", () => {
  const { service, organisationId } = openReviewedEngagement();
  const readiness = service.getS05AReadiness(organisationId);
  assert.equal(readiness.evaluationStatus, "UNRUN");
  assert.equal(readiness.evaluationBlocked, true);
  assert.equal(readiness.releaseReady, false);
  assert.equal(readiness.calendarReady, true);
});
