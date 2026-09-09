import assert from "node:assert/strict";
import test from "node:test";
import { dtoContainsRestrictedSecrets, decideDiscoveryDisclosure } from "../src/eec-discovery-disclosure.js";
import { extractGuestCountCandidates } from "../src/eec-extraction.js";
import { migrateEosS05ADisclosureV5 } from "../src/eec-migration.js";
import { extractAssertionsOnSnap, governingGuestCountFromBrief } from "../src/eec-operations.js";
import { clientSafeHeading } from "../src/eec-projections.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-09T08:00:00.000Z";

function startEngagement(service: ReturnType<typeof fixtureService>["service"], reference = "S043 enquiry") {
  const ceo = actor(people.personCeo, { now: NOW });
  const planner = actor(people.personPlanner, { now: NOW });
  const organisationId = service.listOrganisations(ceo)[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: reference,
    eventConceptLabel: "Adéwálé family celebration",
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

test("S043 disclosure: confidential surprise is masked for auditor and omitted from client", () => {
  const { service, ceo, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Confidential enquiry");
  const auditor = actor(people.personAuditor, { now: NOW });
  const admin = actor(people.personAdmin, { now: NOW });
  service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Venue hold",
    text: "The family mentioned 320 guests in Yorùbá.",
    disclosureClass: "OPERATIONAL",
    reason: "operational",
    idempotencyKey: "src-op",
  });
  const confidential = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "CONFIDENTIAL — surprise element (staff only)",
    text: "Do not disclose the surprise guest list to the other principal.",
    disclosureClass: "CONFIDENTIAL_SURPRISE",
    reason: "confidential",
    idempotencyKey: "src-conf",
  });
  const plannerView = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  assert.ok(plannerView.artefacts.some((item) => item.title.includes("surprise element")));
  const auditorView = service.getDiscoveryWorkspace(auditor, organisationId, engagement.id);
  assert.ok(auditorView.artefacts.some((item) => item.title === "Restricted evidence"));
  assert.equal(JSON.stringify(auditorView).includes("surprise element"), false);
  assert.equal(auditorView.segments.some((item) => item.text.includes("Do not disclose")), false);
  assert.ok(auditorView.artefacts.some((item) => item.title === "Venue hold"));
  assert.ok(auditorView.segments.some((item) => item.text.includes("320 guests")));
  assert.throws(
    () => service.getStoredDiscoverySource(auditor, organisationId, engagement.id, confidential.id),
    /cannot retrieve/,
  );
  assert.throws(() => service.getDiscoveryWorkspace(admin, organisationId, engagement.id), /PERMISSION_ABSENT|FORBIDDEN|not found|cannot view/i);
  assert.throws(() => service.getDiscoveryWorkspace(planner, people.orgOther, engagement.id), /SCOPE_MISMATCH|PERMISSION_ABSENT|FORBIDDEN|not found/i);
  const activeGrant = service.grantDiscoveryDisclosure(ceo, {
    organisationId,
    engagementId: engagement.id,
    personId: people.personAuditor,
    disclosureClass: "CONFIDENTIAL_SURPRISE",
    expiresAt: "2026-09-10T08:00:00.000Z",
    reason: "active grant",
    idempotencyKey: "grant-active",
  });
  const grantedView = service.getDiscoveryWorkspace(actor(people.personAuditor, { now: NOW }), organisationId, engagement.id);
  assert.ok(grantedView.artefacts.some((item) => item.title.includes("surprise element")));
  service.revokeDiscoveryDisclosure(ceo, {
    organisationId,
    grantId: activeGrant.id,
    expectedVersion: activeGrant.version,
    revokeReason: "no longer required",
    reason: "revoke",
    idempotencyKey: "grant-revoke",
  });
  const revokedView = service.getDiscoveryWorkspace(actor(people.personAuditor, { now: NOW }), organisationId, engagement.id);
  assert.ok(revokedView.artefacts.some((item) => item.title === "Restricted evidence"));
  service.grantDiscoveryDisclosure(ceo, {
    organisationId,
    engagementId: engagement.id,
    personId: people.personAuditor,
    disclosureClass: "CONFIDENTIAL_SURPRISE",
    expiresAt: "2026-09-09T07:00:00.000Z",
    reason: "expired grant",
    idempotencyKey: "grant-expired",
  });
  const expiredView = service.getDiscoveryWorkspace(actor(people.personAuditor, { now: NOW }), organisationId, engagement.id);
  assert.ok(expiredView.artefacts.some((item) => item.title === "Restricted evidence"));
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "client",
    idempotencyKey: "client-access",
  });
  const client = service.getClientDiscoveryProjection(access.token);
  assert.equal(JSON.stringify(client).includes("surprise element"), false);
  assert.equal(JSON.stringify(client).includes("Do not disclose"), false);
  assert.equal(client.clientSafeHeading, "Adéwálé family celebration");
  assert.ok(
    !dtoContainsRestrictedSecrets(auditorView, {
      title: "CONFIDENTIAL — surprise element (staff only)",
      text: "Do not disclose the surprise guest list to the other principal.",
    }),
  );
});

test("S043 extraction: 320/360 phrasing, truthful receipt, idempotency and contradiction", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Extract enquiry");
  const first = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "First count",
    text: "We are planning for approximately 360 guests.",
    reason: "note",
    idempotencyKey: "src-360a",
  });
  const firstOutcome = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: first.id,
    reason: "extract",
    idempotencyKey: "extract-360a",
  });
  assert.equal(firstOutcome.proposedCount, 1);
  const second = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Second view",
    text: "The other principal expects closer to 360 people.",
    reason: "note",
    idempotencyKey: "src-360b",
  });
  service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: second.id,
    reason: "extract",
    idempotencyKey: "extract-360b",
  });
  const third = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Preference pair",
    text: "320 is the current preference; 360 is another principal's view.",
    reason: "note",
    idempotencyKey: "src-pair",
  });
  const pair = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: third.id,
    reason: "extract",
    idempotencyKey: "extract-pair",
  });
  assert.ok(pair.proposedCount >= 1);
  const workspace = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  const counts = workspace.assertions
    .filter((item) => item.topicKey === "guest.target_count")
    .map((item) => String((item.structuredValue as { count?: string }).count));
  assert.ok(counts.includes("320"));
  assert.ok(counts.includes("360"));
  assert.ok(workspace.conflicts.some((item) => item.topicKey === "guest.target_count" && item.status === "OPEN"));
  const beforeRetry = service.getDiscoveryWorkspace(planner, organisationId, engagement.id).assertions.length;
  const retry = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: third.id,
    reason: "extract",
    idempotencyKey: "extract-pair-retry",
  });
  assert.equal(retry.id, pair.id);
  assert.equal(service.getDiscoveryWorkspace(planner, organisationId, engagement.id).assertions.length, beforeRetry);
  const empty = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "No fact",
    text: "We spoke about the weather and nothing else.",
    reason: "note",
    idempotencyKey: "src-empty",
  });
  const zero = service.extractCandidateAssertions(planner, {
    organisationId,
    engagementId: engagement.id,
    artefactId: empty.id,
    reason: "extract",
    idempotencyKey: "extract-empty",
  });
  assert.equal(zero.proposedCount, 0);
  assert.ok(zero.noMaterialCount >= 1);
  assert.equal(
    workspace.assertions.every((item) => item.confirmationState !== "GOVERNING"),
    true,
  );
  const phrases = [
    "We are planning for approximately 360 guests.",
    "The other principal expects closer to 360 people.",
    "Guest count may be around 360 rather than 320.",
    "320 is the current preference; 360 is another principal's view.",
  ];
  for (const phrase of phrases) {
    const found = extractGuestCountCandidates(phrase).map((item) => item.count);
    assert.ok(found.includes("360"), phrase);
  }
  assert.throws(
    () =>
      service.extractCandidateAssertions(planner, {
        organisationId,
        engagementId: engagement.id,
        artefactId: empty.id,
        expectedVersion: 99,
        reason: "stale",
        idempotencyKey: "extract-stale",
      }),
    /stale source version/,
  );
});

test("S043 extraction preserves source when provider is unavailable or malformed", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Provider enquiry");
  const source = service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Keep me",
    text: "We expect 180 guests.",
    reason: "note",
    idempotencyKey: "src-keep",
  });
  assert.throws(
    () =>
      extractAssertionsOnSnap(
        service.currentSnapshot(),
        {
          organisationId,
          engagementId: engagement.id,
          artefactId: source.id,
          expectedVersion: 0,
          reason: "unavailable",
          idempotencyKey: "extract-unavail",
        },
        NOW,
        planner.personId,
        "HUMAN",
        { providerMode: "UNAVAILABLE" },
      ),
    /unavailable/,
  );
  const afterUnavailable = service.getDiscoveryWorkspace(planner, organisationId, engagement.id);
  assert.ok(afterUnavailable.artefacts.some((item) => item.title === "Keep me"));
  const malformed = extractAssertionsOnSnap(
    service.currentSnapshot(),
    {
      organisationId,
      engagementId: engagement.id,
      artefactId: source.id,
      expectedVersion: 0,
      reason: "malformed",
      idempotencyKey: "extract-malformed",
    },
    NOW,
    planner.personId,
    "HUMAN",
    { providerMode: "MALFORMED" },
  );
  assert.ok(malformed.rejectedCount >= 1);
  assert.ok(service.getDiscoveryWorkspace(planner, organisationId, engagement.id).artefacts.some((item) => item.title === "Keep me"));
});

test("S043 client consent dimensions persist separately and block AI", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Consent enquiry");
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "client",
    idempotencyKey: "client-consent-access",
  });
  assert.throws(() => service.extractClientDiscoveryAssertionsByToken(access.token), /AI analysis consent/);
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "PARTICIPATION", decision: "GRANTED" });
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "TRANSCRIPTION", decision: "GRANTED" });
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "SOURCE_RETENTION", decision: "GRANTED" });
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "AUDIO_RECORDING", decision: "DECLINED" });
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "AI_ANALYSIS", decision: "DECLINED" });
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "DEIDENTIFIED_BENCHMARKING", decision: "DECLINED" });
  const projection = service.getClientDiscoveryProjection(access.token);
  assert.equal(projection.consents.find((item) => item.dimension === "PARTICIPATION")?.decision, "GRANTED");
  assert.equal(projection.consents.find((item) => item.dimension === "AI_ANALYSIS")?.decision, "DECLINED");
  assert.equal(projection.consents.find((item) => item.dimension === "DEIDENTIFIED_BENCHMARKING")?.decision, "DECLINED");
  assert.equal(projection.aiAnalysisBlocked, true);
  assert.throws(() => service.extractClientDiscoveryAssertionsByToken(access.token), /AI analysis consent/);
  const grantKey = "client-ai-grant-once";
  service.recordClientDiscoveryConsentByToken(access.token, {
    dimension: "AI_ANALYSIS",
    decision: "GRANTED",
    idempotencyKey: grantKey,
  });
  service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Client words",
    text: "We expect 180 guests.",
    reason: "note",
    idempotencyKey: "src-client-ai",
  });
  const extracted = service.extractClientDiscoveryAssertionsByToken(access.token);
  assert.ok(extracted.some((item) => item.proposedCount > 0));
  service.recordClientDiscoveryConsentByToken(access.token, { dimension: "AI_ANALYSIS", decision: "WITHDRAWN" });
  service.recordClientDiscoveryConsentByToken(access.token, {
    dimension: "AI_ANALYSIS",
    decision: "GRANTED",
    idempotencyKey: grantKey,
  });
  assert.throws(() => service.extractClientDiscoveryAssertionsByToken(access.token), /AI analysis consent/);
  const later = service.getClientDiscoveryProjection(access.token);
  assert.equal(later.consents.find((item) => item.dimension === "AI_ANALYSIS")?.decision, "WITHDRAWN");
  assert.equal(later.consents.find((item) => item.dimension === "PARTICIPATION")?.decision, "GRANTED");
  const audit = JSON.stringify(service.currentSnapshot().audit.filter((item) => item.action === "consent.recorded"));
  assert.equal(audit.includes(access.token), false);
});

test("S043 heading, budget prefill and disclosure decision stay permission-safe", () => {
  assert.equal(clientSafeHeading({ displayReference: "CLAUDE-S05A-CODE", eventConceptLabel: "Family dinner" }), "Family dinner");
  assert.equal(clientSafeHeading({ displayReference: "CLAUDE-S05A-CODE" }), "Your Maison Doclar consultation");
  const decision = decideDiscoveryDisclosure("CONFIDENTIAL_SURPRISE", {
    organisationId: "org",
    engagementId: "eng",
    permissionKeys: ["discovery.source.view"],
    grants: [],
    now: NOW,
    clientProjection: false,
    inScope: true,
  });
  assert.equal(decision.kind, "MASK");
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Budget enquiry");
  const intelligence = service.getIntelligenceWorkspace(planner, organisationId, engagement.id);
  assert.notEqual(intelligence.guestPrefill.kind, "CONFIRMED");
  assert.throws(
    () =>
      service.calculateBudgetScenario(planner, {
        organisationId,
        engagementId: engagement.id,
        purpose: "PROTECT_PRIORITIES",
        archetype: "WEDDING",
        guests: "200",
        assumptionAcknowledged: false,
        reason: "unacked",
        idempotencyKey: "budget-unacked",
      }),
    /assumption/,
  );
  const scenario = service.calculateBudgetScenario(planner, {
    organisationId,
    engagementId: engagement.id,
    purpose: "PROTECT_PRIORITIES",
    archetype: "WEDDING",
    guests: "200",
    assumptionAcknowledged: true,
    reason: "acked",
    idempotencyKey: "budget-acked",
  });
  assert.ok(scenario.id);
  const assumption = service.currentSnapshot().budgetAssumptions.find((item) => item.engagementId === engagement.id);
  assert.equal(assumption?.sourceKind, "SCENARIO");
  assert.equal(governingGuestCountFromBrief(service.currentSnapshot(), engagement.id).kind, "UNKNOWN");
});

test("S043 disclosure migration V5 backfills and replays without rewriting source text", () => {
  const { service, planner, organisationId, engagement } = startEngagement(fixtureService().service, "Migration enquiry");
  service.recordDiscoverySource(planner, {
    organisationId,
    engagementId: engagement.id,
    kind: "STAFF_NOTE",
    title: "Legacy note",
    text: "The family mentioned 180 guests.",
    reason: "note",
    idempotencyKey: "src-legacy",
  });
  const snap = structuredClone(service.currentSnapshot());
  snap.s05aIntelligenceReceipts = snap.s05aIntelligenceReceipts.filter((item) => item.migrationId !== "EOS-S05A-DISCLOSURE-V5");
  const artefact = snap.sourceArtefacts.find((item) => item.title === "Legacy note");
  assert.ok(artefact);
  const originalTitle = artefact.title;
  const originalText = snap.sourceSegments.find((item) => item.artefactId === artefact.id)?.text;
  delete artefact.disclosureClass;
  const applied = migrateEosS05ADisclosureV5(snap, NOW);
  assert.equal(applied.status, "APPLIED");
  const migrated = applied.snapshot.sourceArtefacts.find((item) => item.id === artefact.id);
  assert.equal(migrated?.disclosureClass, "OPERATIONAL");
  assert.equal(migrated?.disclosureBackfillRule, "ASSERTION_SENSITIVITY_ELSE_OPERATIONAL");
  assert.equal(migrated?.version, artefact.version + 1);
  assert.equal(migrated?.title, originalTitle);
  assert.equal(applied.snapshot.sourceSegments.find((item) => item.artefactId === artefact.id)?.text, originalText);
  const replay = migrateEosS05ADisclosureV5(applied.snapshot, NOW);
  assert.equal(replay.status, "REPLAYED");
  assert.equal(replay.receipt?.migrationId, "EOS-S05A-DISCLOSURE-V5");
});
