import assert from "node:assert/strict";
import test from "node:test";
import { SessionLifecycleInputSchema } from "../src/eec-schemas.js";
import { consentIsActive } from "../src/eec-operations.js";
import { PlatformError } from "../src/errors.js";
import { actor, fixtureService, people } from "./helpers.js";

function openEngagement(service: ReturnType<typeof fixtureService>["service"], key: string) {
  const organisationId = service.listOrganisations(actor(people.personCeo))[0]!.id;
  const planner = actor(people.personPlanner);
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: `Consent ${key}`,
    enquiryChannel: "DIRECT",
    reason: "open",
    idempotencyKey: `opp-${key}`,
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: `eng-${key}`,
  });
  return { organisationId, planner, engagement };
}

function denied(run: () => unknown, code: string | readonly string[] = "VALIDATION_FAILED") {
  const allowed = typeof code === "string" ? [code] : [...code];
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof PlatformError, String(error));
    assert.ok(allowed.includes(error.code), `expected ${allowed.join("|")} got ${String((error as PlatformError).code)}`);
    return;
  }
  assert.fail("Missing expected exception.");
}

test("EEC-06 correction: durable session mode is authoritative and transition mode is rejected", () => {
  const parsed = SessionLifecycleInputSchema.safeParse({
    organisationId: "00000000-0000-4000-8000-000000000001",
    engagementId: "00000000-0000-4000-8000-000000000099",
    sessionId: "00000000-0000-4000-8000-000000000098",
    action: "START",
    mode: "OFFLINE_NOTES",
    reason: "spoof",
    idempotencyKey: "spoof-mode",
  });
  assert.equal(parsed.success, false);

  const { service } = fixtureService();
  const { organisationId, planner, engagement } = openEngagement(service, "spoof-staff");
  const staff = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    action: "CREATE",
    mode: "STAFF_LED",
    reason: "staff draft",
    idempotencyKey: "create-staff",
  });
  denied(() =>
    service.changeInterviewSession(planner, {
      organisationId,
      engagementId: engagement.id,
      sessionId: staff.id,
      action: "START",
      mode: "OFFLINE_NOTES",
      expectedVersion: staff.version,
      reason: "spoof offline",
      idempotencyKey: "start-spoof-staff",
    }),
  );
  denied(() =>
    service.changeInterviewSession(planner, {
      organisationId,
      engagementId: engagement.id,
      sessionId: staff.id,
      action: "START",
      expectedVersion: staff.version,
      reason: "no consent",
      idempotencyKey: "start-staff-denied",
    }),
  );

  const { engagement: clientEngagement } = openEngagement(service, "spoof-client");
  const clientLed = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: clientEngagement.id,
    action: "CREATE",
    mode: "CLIENT_LED",
    reason: "client draft",
    idempotencyKey: "create-client",
  });
  denied(() =>
    service.changeInterviewSession(planner, {
      organisationId,
      engagementId: clientEngagement.id,
      sessionId: clientLed.id,
      action: "START",
      mode: "OFFLINE_NOTES",
      expectedVersion: clientLed.version,
      reason: "spoof client",
      idempotencyKey: "start-spoof-client",
    }),
  );
});

test("EEC-06 correction: withdrawal blocks START and idempotent ACTIVE RESUME", () => {
  const { service, store } = fixtureService();
  const { organisationId, planner, engagement } = openEngagement(service, "withdraw");
  const session = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    action: "CREATE",
    mode: "STAFF_LED",
    reason: "draft",
    idempotencyKey: "create-withdraw",
  });
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "grant",
    idempotencyKey: "grant-withdraw",
  });
  const started = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "START",
    expectedVersion: session.version,
    reason: "start",
    idempotencyKey: "start-withdraw",
  });
  const paused = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "PAUSE",
    expectedVersion: started.version,
    reason: "pause",
    idempotencyKey: "pause-withdraw",
  });
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "WITHDRAWN",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "withdraw",
    idempotencyKey: "withdraw-part",
  });
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "PARTICIPATION"), false);
  denied(() =>
    service.changeInterviewSession(planner, {
      organisationId,
      engagementId: engagement.id,
      sessionId: session.id,
      action: "RESUME",
      expectedVersion: paused.version,
      reason: "resume after withdraw",
      idempotencyKey: "resume-withdraw",
    }),
  );

  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "re-grant",
    idempotencyKey: "regrant",
  });
  const resumed = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    sessionId: session.id,
    action: "RESUME",
    expectedVersion: paused.version,
    reason: "resume again",
    idempotencyKey: "resume-ok",
  });
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "DECLINED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "decline",
    idempotencyKey: "decline-part",
  });
  denied(() =>
    service.changeInterviewSession(planner, {
      organisationId,
      engagementId: engagement.id,
      sessionId: session.id,
      action: "RESUME",
      expectedVersion: resumed.version,
      reason: "active resume after decline",
      idempotencyKey: "resume-active-denied",
    }),
  );
});

test("EEC-06 correction: consent is engagement-wide or participant-specific and dimensions stay independent", () => {
  const { service, store } = fixtureService();
  const { organisationId, planner, engagement } = openEngagement(service, "scope");
  const first = service.addDiscoveryParticipant(planner, {
    organisationId,
    engagementId: engagement.id,
    displayName: "Adéwálé",
    claimedRole: "Principal",
    authorityClaim: "PRINCIPAL",
    reason: "add first",
    idempotencyKey: "p1",
  });
  const second = service.addDiscoveryParticipant(planner, {
    organisationId,
    engagementId: engagement.id,
    displayName: "Relative",
    claimedRole: "Relative",
    authorityClaim: "RELATIVE",
    reason: "add second",
    idempotencyKey: "p2",
  });
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    participantId: first.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "first only",
    idempotencyKey: "consent-p1",
  });
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "PARTICIPATION", first.id), true);
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "PARTICIPATION", second.id), false);
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "PARTICIPATION"), false);

  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "AUDIO_RECORDING",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "audio",
    idempotencyKey: "audio",
  });
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "AUDIO_RECORDING"), true);
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "TRANSCRIPTION"), false);
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "TRANSCRIPTION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "transcript",
    idempotencyKey: "transcript",
  });
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "AI_ANALYSIS"), false);
  denied(() =>
    service.extractCandidateAssertions(planner, {
      organisationId,
      engagementId: engagement.id,
      artefactId: "00000000-0000-4000-8000-000000000097",
      reason: "no ai consent",
      idempotencyKey: "extract-denied",
    }),
  );

  const other = openEngagement(service, "other-eng");
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: other.engagement.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "other engagement",
    idempotencyKey: "other-consent",
  });
  assert.equal(consentIsActive(store.snapshot(), engagement.id, "PARTICIPATION"), false);
  denied(
    () => service.getDiscoveryWorkspace(actor(people.personOtherOrg), organisationId, engagement.id),
    ["FORBIDDEN", "SCOPE_MISMATCH", "NOT_FOUND"],
  );
});

test("EEC-06 correction: equal-timestamp latest consent is deterministic and stale versions stay truthful", () => {
  const { service, store } = fixtureService();
  const { organisationId, planner, engagement } = openEngagement(service, "order");
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "GRANTED",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "first",
    idempotencyKey: "order-1",
  });
  service.recordDiscoveryConsent(planner, {
    organisationId,
    engagementId: engagement.id,
    dimension: "PARTICIPATION",
    decision: "WITHDRAWN",
    policyVersion: "policy-v1",
    wordingEdition: "wording-v1",
    reason: "second",
    idempotencyKey: "order-2",
  });
  const snap = store.snapshot();
  const matching = snap.discoveryConsentRecords.filter(
    (item) => item.engagementId === engagement.id && item.dimension === "PARTICIPATION" && item.participantId == null,
  );
  assert.ok(matching.length >= 2);
  assert.equal(matching[0]!.decidedAt, matching[1]!.decidedAt);
  assert.equal(consentIsActive(snap, engagement.id, "PARTICIPATION"), false);

  const session = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    action: "CREATE",
    reason: "stale",
    idempotencyKey: "stale-create",
  });
  denied(
    () =>
      service.changeInterviewSession(planner, {
        organisationId,
        engagementId: engagement.id,
        sessionId: session.id,
        action: "READY",
        expectedVersion: 99,
        reason: "stale ready",
        idempotencyKey: "stale-ready",
      }),
    "VERSION_CONFLICT",
  );
  const replay = service.changeInterviewSession(planner, {
    organisationId,
    engagementId: engagement.id,
    action: "CREATE",
    reason: "stale",
    idempotencyKey: "stale-create",
  });
  assert.equal(replay.id, session.id);
});
