import assert from "node:assert/strict";
import test from "node:test";
import { migrateEosS05A } from "../src/eec-migration.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

test("EEC-05 organisation isolation, idempotent create and no Event side effect", () => {
  const { service, store } = fixtureService();
  const organisationId = service.listOrganisations(actor(people.personCeo))[0]!.id;
  const created = service.createEngagementOpportunity(actor(people.personPlanner), {
    organisationId,
    displayReference: "Adéwálé enquiry",
    enquiryChannel: "REFERRAL",
    knownEventType: "WEDDING",
    reason: "First conversation",
    idempotencyKey: "opp-1",
  });
  const replay = service.createEngagementOpportunity(actor(people.personPlanner), {
    organisationId,
    displayReference: "Adéwálé enquiry",
    enquiryChannel: "REFERRAL",
    knownEventType: "WEDDING",
    reason: "First conversation",
    idempotencyKey: "opp-1",
  });
  assert.equal(replay.id, created.id);
  assert.equal(store.snapshot().events.length, fixtureService().store.snapshot().events.length);
  assert.throws(
    () =>
      service.createEngagementOpportunity(actor(people.personAuditor), {
        organisationId,
        displayReference: "Denied",
        enquiryChannel: "DIRECT",
        reason: "auditor",
        idempotencyKey: "opp-denied",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
});

test("EEC-06 consent, resume and provider-unavailable truth", () => {
  const { service } = fixtureService();
  const organisationId = service.listOrganisations(actor(people.personCeo))[0]!.id;
  const opportunity = service.createEngagementOpportunity(actor(people.personPlanner), {
    organisationId,
    displayReference: "Consent journey",
    enquiryChannel: "DIRECT",
    reason: "open",
    idempotencyKey: "opp-consent",
  });
  const engagement = service.startDiscoveryEngagement(actor(people.personPlanner), {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: "eng-consent",
  });
  const session = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    action: "CREATE",
    reason: "draft",
    idempotencyKey: "session-1",
  });
  assert.throws(
    () =>
      service.changeInterviewSession(actor(people.personPlanner), {
        organisationId,
        engagementId: engagement.id,
        sessionId: session.id,
        action: "START",
        expectedVersion: session.version,
        reason: "no consent",
        idempotencyKey: "session-start-denied",
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
  );
  service.recordDiscoveryConsent(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "granted",
    idempotencyKey: "consent-part",
  });
  const ready = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "READY",
    expectedVersion: session.version,
    reason: "ready",
    idempotencyKey: "session-ready",
  });
  const started = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "START",
    expectedVersion: ready.version,
    reason: "start",
    idempotencyKey: "session-start",
  });
  const paused = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "PAUSE",
    expectedVersion: started.version,
    reason: "pause",
    idempotencyKey: "session-pause",
  });
  const resumed = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "RESUME",
    expectedVersion: paused.version,
    reason: "resume",
    idempotencyKey: "session-resume",
  });
  const again = service.changeInterviewSession(actor(people.personPlanner), {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "RESUME",
    expectedVersion: resumed.version,
    reason: "resume again",
    idempotencyKey: "session-resume-2",
  });
  assert.equal(again.id, resumed.id);
  assert.equal(again.status, "ACTIVE");
  assert.equal(again.providerState, "FIXTURE");
});

test("EEC-07 through EEC-10 evidence, extraction, review and contradiction", () => {
  const { service } = fixtureService();
  const ceo = actor(people.personCeo);
  const planner = actor(people.personPlanner);
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: "Contradiction journey",
    enquiryChannel: "PARTNER",
    knownEventType: "WEDDING",
    reason: "open",
    idempotencyKey: "opp-conflict",
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: "eng-conflict",
  });
  for (const dimension of ["PARTICIPATION", "TRANSCRIPTION", "AI_ANALYSIS"] as const) {
    service.recordDiscoveryConsent(planner, {
      organisationId,
      engagementId: engagement.id,
      dimension,
      decision: "GRANTED",
      policyVersion: "policy-v1",
      wordingEdition: "wording-v1",
      reason: dimension,
      idempotencyKey: `consent-${dimension}`,
    });
  }
  const first = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "First note",
    text: "The family mentioned 320 guests for the celebration in Yorùbá.",
    reason: "note",
    idempotencyKey: "src-1",
  });
  const second = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Later note",
    text: "A later conversation suggested 360 guests.",
    reason: "note",
    idempotencyKey: "src-2",
  });
  service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: first.id,
    reason: "extract",
    idempotencyKey: "extract-1",
  });
  service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: second.id,
    reason: "extract",
    idempotencyKey: "extract-2",
  });
  const workspace = service.getDiscoveryWorkspace(ceo, organisationId, engagement.id);
  assert.ok(workspace.assertions.some((item) => item.topicKey === "guest.target_count"));
  assert.ok(workspace.segments.some((item) => item.text.includes("Yorùbá")));
  assert.ok(workspace.conflicts.some((item) => item.topicKey === "guest.target_count"));
  assert.ok(workspace.assessments.some((item) => item.state === "CONFLICTED"));
  const conflict = workspace.conflicts[0]!;
  const selected = workspace.assertions.find((item) => item.topicKey === "guest.target_count")!;
  service.resolveAssertionConflict(ceo, {
    organisationId,
    engagementId: engagement.id,
    conflictId: conflict.id,
    resolution: "SELECT",
    selectedAssertionId: selected.id,
    expectedVersion: conflict.version,
    reason: "select 320",
    idempotencyKey: "resolve-1",
  });
  assert.throws(
    () =>
      service.reviewCandidateAssertion(actor(people.personCeo, { actorKind: "AI" }), {
        organisationId,
        engagementId: engagement.id,
        assertionId: selected.id,
        decision: "ACCEPT_STAFF_REVIEWED",
        confirmationState: "GOVERNING",
        expectedVersion: selected.version,
        reason: "ai cannot govern",
        idempotencyKey: "ai-govern",
      }),
    (error: unknown) => error instanceof Error,
  );
  const reviewed = service.reviewCandidateAssertion(planner, {
    organisationId,
    engagementId: engagement.id,
    assertionId: selected.id,
    decision: "ACCEPT_STAFF_REVIEWED",
    expectedVersion: service.getDiscoveryWorkspace(ceo, organisationId, engagement.id).assertions.find((item) => item.id === selected.id)!.version,
    reason: "staff review",
    idempotencyKey: "review-1",
  });
  assert.equal(reviewed.confirmationState, "STAFF_REVIEWED");
  const auditorView = service.getDiscoveryWorkspace(actor(people.personAuditor), organisationId, engagement.id);
  assert.equal(auditorView.capabilities.canManageSession, false);
  assert.equal(auditorView.capabilities.canReviewAssertion, false);
});

test("EEC-04 migration replays and seeds synthetic coverage", () => {
  const { store } = fixtureService();
  const first = migrateEosS05A(store.snapshot(), "2026-09-08T22:00:00.000Z");
  assert.equal(first.status, "REPLAYED");
  assert.ok(store.snapshot().coverageRequirements.length > 0);
});
