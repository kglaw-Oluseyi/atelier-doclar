import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { SCHEMA_VERSION } from "../src/constants.js";
import { PlatformError } from "../src/errors.js";
import { resolveDiscoveryClientAccess } from "../src/eec-intelligence.js";
import type { PlatformClock } from "../src/platform-clock.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { PostgresRiskDossierRepository } from "../src/postgres-risk-dossier-store.js";
import { RiskDossierCommandService } from "../src/risk-dossier-command-service.js";
import { assertGrantUsable } from "../src/risk-dossier-decisions.js";
import type { RiskDossierAccessGrant } from "../src/risk-schemas.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { TEST_CLOCK_INSTANT, actor, fixtureService, people } from "./helpers.js";

const ISSUE_AT = TEST_CLOCK_INSTANT;
const EXPIRES_AT = "2026-09-12T15:00:00.000Z";
const AFTER_EXPIRY = "2026-09-12T15:00:00.001Z";
const RENEW_AT = "2026-09-06T15:00:00.000Z";
const RENEWED_EXPIRES_AT = "2026-09-13T15:00:00.000Z";

function adjustableClock(instant: string): PlatformClock & { set(next: string): void } {
  let current = instant;
  return {
    now: () => new Date(current),
    set(next) {
      current = next;
    },
  };
}

function openDiscovery(clock: PlatformClock) {
  const { service } = fixtureService({ clock });
  const planner = actor(people.personPlanner, { now: clock.now().toISOString() });
  const organisationId = service.listOrganisations(actor(people.personCeo))[0]!.id;
  const opportunity = service.createEngagementOpportunity(planner, {
    organisationId,
    displayReference: "Token clock enquiry",
    enquiryChannel: "DIRECT",
    knownEventType: "WEDDING",
    reason: "open",
    idempotencyKey: `clock-opp-${clock.now().toISOString()}`,
  });
  const engagement = service.startDiscoveryEngagement(planner, {
    organisationId,
    opportunityId: opportunity.id,
    expectedVersion: opportunity.version,
    reason: "start",
    idempotencyKey: `clock-eng-${clock.now().toISOString()}`,
  });
  return { service, planner, organisationId, engagement };
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignPlanner,
    expectedVersion: 0,
    idempotencyKey: `clock-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function prepareDossier(snap: ReturnType<ReturnType<typeof fixtureService>["store"]["snapshot"]>) {
  const source = createSourceEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      title: "NSITF",
      publisher: "NSITF",
      locator: "https://nsitf.gov.ng/",
      authority: "REGULATOR",
      jurisdiction: "NG",
      summary: "Synthetic",
      retrievedAt: "2026-09-10T09:00:00.000Z",
      lastVerifiedAt: "2026-09-10T09:00:00.000Z",
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    },
    "2026-09-10T09:00:00.000Z",
    people.personCeo,
  );
  approveSourceEditionOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignDirector,
      sourceId: source.id,
      expectedVersion: source.version,
      idempotencyKey: envelope().idempotencyKey,
    },
    "2026-09-10T09:01:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  const rule = createRuleEditionOnSnap(
    snap,
    {
      ...envelope({ assignmentId: people.assignCeo }),
      ruleKey: "public-liability-event",
      jurisdiction: "NG",
      proposition: "Public liability evidence may be required.",
      sourceEditionIds: [source.id],
      requirementKey: "PUBLIC_LIABILITY",
      policyType: "PUBLIC_LIABILITY",
      mandatory: true,
      nextReviewAt: "2026-12-10T09:00:00.000Z",
    },
    "2026-09-10T09:02:00.000Z",
    people.personCeo,
  );
  reviewRuleEditionOnSnap(
    snap,
    {
      organisationId: people.orgMaison,
      assignmentId: people.assignDirector,
      ruleId: rule.id,
      status: "APPROVED",
      expectedVersion: rule.version,
      idempotencyKey: envelope().idempotencyKey,
    },
    "2026-09-10T09:03:00.000Z",
    people.personDirector,
    "HUMAN",
  );
  recordFactEditionOnSnap(
    snap,
    { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false },
    "2026-09-10T09:04:00.000Z",
    people.personCeo,
  );
  recordFactEditionOnSnap(
    snap,
    { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false },
    "2026-09-10T09:04:30.000Z",
    people.personCeo,
  );
  evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
}

async function publishedDossierCommands(clock: PlatformClock) {
  const pg = new MemoryPlatformPg();
  const { store } = fixtureService({ clock });
  const migrated = migrateEosS05B(store.snapshot());
  store.replace(migrated.snapshot);
  const prepared = store.snapshot();
  prepareDossier(prepared);
  store.replace(prepared);
  await PostgresPlatformStore.migrate(pg);
  const postgres = await PostgresPlatformStore.open(pg);
  await postgres.replaceAsync(store.snapshot());
  const commands = new RiskDossierCommandService(new PostgresRiskDossierRepository(pg), {
    tokenPepper: () => "s073-clock-test-pepper-value-32ch",
    clock,
  });
  const draft = await commands.assemble(actor(people.personPlanner), envelope());
  const submitted = await commands.submit(actor(people.personPlanner), {
    ...envelope(),
    dossierId: draft.id,
    expectedVersion: draft.version,
  });
  const approved = await commands.approve(actor(people.personDirector), {
    ...envelope({ assignmentId: people.assignDirector }),
    dossierId: submitted.id,
    expectedVersion: submitted.version,
  });
  const grantReady = await commands.getStaffWorkspace(people.orgMaison, people.eventAlphaOne, "CEO");
  await commands.publish(actor(people.personCeo), {
    ...envelope({ assignmentId: people.assignCeo }),
    editionId: approved.id,
    expectedVersion: grantReady.workingEdition?.version ?? approved.version,
    approvedHash: approved.contentHash,
  });
  return { commands };
}

function sampleGrant(overrides: Partial<RiskDossierAccessGrant> = {}): RiskDossierAccessGrant {
  return {
    id: "00000000-0000-4000-8000-000000000701",
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    purpose: "RISK_DOSSIER",
    tokenHash: "hashed-token",
    status: "ACTIVE",
    issuedByPersonId: people.personCeo,
    issuedAt: ISSUE_AT,
    expiresAt: EXPIRES_AT,
    failedExchangeCount: 0,
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    createdAt: ISSUE_AT,
    updatedAt: ISSUE_AT,
    ...overrides,
  };
}

test("discovery token issue and validation share the injected clock", () => {
  const clock = adjustableClock(ISSUE_AT);
  const { service, planner, organisationId, engagement } = openDiscovery(clock);
  const access = service.issueDiscoveryClientAccess(planner, {
    organisationId,
    engagementId: engagement.id,
    reason: "issue",
    idempotencyKey: "clock-discovery-issue",
  });
  assert.equal(access.expiresAt, EXPIRES_AT);
  assert.notEqual(access.tokenHash, access.token);
  const allowed = service.getClientDiscoveryProjection(access.token);
  assert.equal(allowed.organisationId, organisationId);
  assert.equal(allowed.engagementId, engagement.id);
  clock.set(EXPIRES_AT);
  assert.throws(
    () => service.getClientDiscoveryProjection(access.token),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  clock.set(AFTER_EXPIRY);
  assert.throws(
    () => service.getClientDiscoveryProjection(access.token),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  clock.set(ISSUE_AT);
  service.revokeDiscoveryClientAccess(planner, {
    organisationId,
    accessId: access.id,
    reason: "revoke before expiry",
    idempotencyKey: "clock-discovery-revoke",
  });
  assert.throws(
    () => service.getClientDiscoveryProjection(access.token),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  const renewed = service.issueDiscoveryClientAccess(actor(people.personPlanner, { now: RENEW_AT }), {
    organisationId,
    engagementId: engagement.id,
    reason: "reissue",
    idempotencyKey: "clock-discovery-renew",
  });
  assert.equal(renewed.expiresAt, RENEWED_EXPIRES_AT);
  clock.set(RENEW_AT);
  assert.equal(service.getClientDiscoveryProjection(renewed.token).engagementId, engagement.id);
  clock.set(RENEWED_EXPIRES_AT);
  assert.throws(
    () => service.getClientDiscoveryProjection(renewed.token),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
});

test("discovery expiry equality uses the same comparison as production", () => {
  const token = "00000000-0000-4000-8000-000000000900";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const snap = {
    discoveryClientAccess: [
      {
        id: "00000000-0000-4000-8000-000000000801",
        organisationId: people.orgMaison,
        engagementId: "00000000-0000-4000-8000-000000000802",
        tokenHash,
        expiresAt: EXPIRES_AT,
        permittedActions: ["CONFIRM"],
        version: 1,
        schemaVersion: SCHEMA_VERSION,
        createdAt: ISSUE_AT,
        updatedAt: ISSUE_AT,
      },
    ],
  };
  assert.equal(resolveDiscoveryClientAccess(snap as never, token, ISSUE_AT).engagementId, "00000000-0000-4000-8000-000000000802");
  assert.throws(
    () => resolveDiscoveryClientAccess(snap as never, token, EXPIRES_AT),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  assert.throws(
    () => resolveDiscoveryClientAccess(snap as never, token, AFTER_EXPIRY),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
  assert.throws(
    () => resolveDiscoveryClientAccess(snap as never, "not-the-token", ISSUE_AT),
    (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
  );
});

test("dossier token issue and validation share the injected clock", async () => {
  const clock = adjustableClock(ISSUE_AT);
  const { commands } = await publishedDossierCommands(clock);
  const issued = await commands.issueClientAccess(actor(people.personCeo, { now: ISSUE_AT }), envelope({ assignmentId: people.assignCeo }));
  assert.equal(issued.expiresAt, EXPIRES_AT);
  assert.ok(issued.token);
  assert.notEqual(issued.tokenHash, issued.token);
  const allowed = await commands.resolveClientSession(issued.token);
  assert.equal(allowed.grant.organisationId, people.orgMaison);
  assert.equal(allowed.grant.eventId, people.eventAlphaOne);
  clock.set(EXPIRES_AT);
  await assert.rejects(() => commands.resolveClientSession(issued.token), PlatformError);
  clock.set(AFTER_EXPIRY);
  await assert.rejects(() => commands.resolveClientSession(issued.token), PlatformError);
  clock.set(ISSUE_AT);
  const stillActive = await commands.resolveClientSession(issued.token);
  assert.equal(stillActive.grant.id, issued.id);
  const renewed = await commands.renewClientAccess(actor(people.personCeo, { now: RENEW_AT }), {
    ...envelope({ assignmentId: people.assignCeo }),
    grantId: issued.id,
    expectedVersion: issued.version,
  });
  assert.equal(renewed.expiresAt, RENEWED_EXPIRES_AT);
  clock.set(RENEW_AT);
  const renewedSession = await commands.resolveClientSession(renewed.token);
  assert.equal(renewedSession.grant.expiresAt, RENEWED_EXPIRES_AT);
  await assert.rejects(() => commands.resolveClientSession(issued.token), PlatformError);
  clock.set(RENEWED_EXPIRES_AT);
  await assert.rejects(() => commands.resolveClientSession(renewed.token), PlatformError);
  clock.set(RENEW_AT);
  await commands.revokeClientAccess(actor(people.personCeo, { now: RENEW_AT }), {
    ...envelope({ assignmentId: people.assignCeo }),
    grantId: renewed.id,
    expectedVersion: renewed.version,
  });
  await assert.rejects(() => commands.resolveClientSession(renewed.token), PlatformError);
});

test("dossier grant expiry and maximum-failure controls stay on the injected now", () => {
  assert.equal(assertGrantUsable(sampleGrant(), ISSUE_AT).status, "ACTIVE");
  assert.throws(
    () => assertGrantUsable(sampleGrant(), EXPIRES_AT),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => assertGrantUsable(sampleGrant(), AFTER_EXPIRY),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => assertGrantUsable(sampleGrant({ status: "REVOKED", revokedAt: ISSUE_AT, revokedByPersonId: people.personCeo }), ISSUE_AT),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => assertGrantUsable(sampleGrant({ failedExchangeCount: 8 }), ISSUE_AT),
    (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
  );
});
