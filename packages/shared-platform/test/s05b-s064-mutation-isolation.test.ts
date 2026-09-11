import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exactHash } from "../src/eec-hash.js";
import {
  PlatformError,
  PlatformService,
  PostgresPlatformStore,
  MemoryPlatformPg,
  applyS04AFixtures,
  applyEosS04BToSnapshot,
  applyS04BFixturesIfMissing,
  applyEosS04CToSnapshot,
  applyS04CFixturesIfMissing,
  S04A_FIXTURE_IDS,
} from "../src/index.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { PostgresRiskDossierRepository } from "../src/postgres-risk-dossier-store.js";
import { RiskDossierCommandService } from "../src/risk-dossier-command-service.js";
import { assertBoundedDossierQueries } from "../src/risk-dossier-repository.js";
import {
  approveSourceEditionOnSnap,
  createRuleEditionOnSnap,
  createSourceEditionOnSnap,
  evaluateApplicabilityOnSnap,
  recordFactEditionOnSnap,
  reviewRuleEditionOnSnap,
} from "../src/risk-policy-operations.js";
import { actor, fixtureService, people } from "./helpers.js";

const ALPHA = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
const EXPIRY_A = "2026-12-31T00:00:00.000Z";
const EXPIRY_B = "2027-01-15T00:00:00.000Z";

function digest(value: unknown): string {
  return exactHash(value);
}

function envelope(extra?: Record<string, unknown>) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    assignmentId: people.assignPlanner,
    expectedVersion: 0,
    idempotencyKey: `s064-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

function seedAccess(store: { snapshot(): ReturnType<MemoryPlatformStore["snapshot"]>; replace(next: ReturnType<MemoryPlatformStore["snapshot"]>): void }) {
  store.replace(applyS04AFixtures(store.snapshot()));
  store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
  store.replace(applyS04BFixturesIfMissing(store.snapshot()));
  store.replace(applyEosS04CToSnapshot(store.snapshot(), "2026-09-07T12:00:00.000Z"));
  store.replace(applyS04CFixturesIfMissing(store.snapshot()));
}

describe("MD-PR-S064 mutation isolation", () => {
  it("keeps the canonical snapshot isolated when a working copy mutates two collections and is abandoned", () => {
    const store = new MemoryPlatformStore();
    const { store: seeded } = fixtureService();
    store.replace(seeded.snapshot());
    const before = store.snapshot();
    const beforeDigest = digest(before);
    const working = store.snapshot();
    working.clients[0]!.displayName = "Abandoned working name";
    working.clients[0]!.version += 1;
    working.audit.push({
      ...working.audit[0]!,
      id: "00000000-0000-4000-8000-000000009964",
      action: "abandoned.mutation",
    });
    assert.notEqual(working.clients[0], store.snapshot().clients[0]);
    assert.deepEqual(store.snapshot(), before);
    assert.equal(digest(store.snapshot()), beforeDigest);
    assert.equal(store.snapshot().audit.some((item) => item.action === "abandoned.mutation"), false);
  });

  it("does not let a caller mutate a returned grant into the canonical store", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const seeded = fixtureService();
    seedAccess(seeded.store);
    await store.replaceAsync(seeded.store.snapshot());
    const service = new PlatformService(store);
    const issued = service.issueMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "isolation return",
      idempotencyKey: "s064-return-issue",
    });
    await store.flush();
    const beforeDigest = digest(store.snapshot().merchandiseGuestGrants);
    issued.grant.status = "REVOKED";
    issued.grant.version += 8;
    issued.grant.expiresAt = EXPIRY_B;
    const durable = store.snapshot().merchandiseGuestGrants.find((item) => item.id === issued.grant.id);
    assert.equal(durable?.status, "ACTIVE");
    assert.equal(durable?.expiresAt, EXPIRY_A);
    assert.equal(digest(store.snapshot().merchandiseGuestGrants), beforeDigest);
  });

  it("rolls back a persistence failure after domain work and rehydrates identical state", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const seeded = fixtureService();
    seedAccess(seeded.store);
    await store.replaceAsync(seeded.store.snapshot());
    const service = new PlatformService(store);
    const issued = service.issueMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "rollback issue",
      idempotencyKey: "s064-rollback-issue",
    });
    await store.flush();
    const before = structuredClone(store.snapshot());
    db.failNextWrite();
    service.renewMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_B,
      expectedVersion: issued.grant.version,
      reason: "rollback renew",
      idempotencyKey: "s064-rollback-renew",
    });
    await assert.rejects(() => store.flush(), /synthetic write failure/);
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.snapshot().merchandiseGuestGrants.find((item) => item.id === issued.grant.id)?.expiresAt, EXPIRY_A);
    assert.equal(reopened.snapshot().merchandiseGuestGrants.find((item) => item.id === issued.grant.id)?.version, issued.grant.version);
    assert.equal(reopened.snapshot().idempotency.some((item) => item.key === "s064-rollback-renew"), false);
    assert.equal(
      reopened.snapshot().audit.some((item) => item.idempotencyKey === "s064-rollback-renew" && item.outcome === "SUCCESS"),
      false,
    );
    assert.equal(digest(reopened.snapshot().merchandiseGuestGrants), digest(before.merchandiseGuestGrants));
  });

  it("applies only one of two same-version writers and reloads the winner", async () => {
    const db = new MemoryPlatformPg();
    const writerA = await PostgresPlatformStore.open(db);
    const seeded = fixtureService();
    seedAccess(seeded.store);
    await writerA.replaceAsync(seeded.store.snapshot());
    const serviceA = new PlatformService(writerA);
    const issued = serviceA.issueMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "cas issue",
    });
    await writerA.flush();
    const writerB = await PostgresPlatformStore.open(db);
    const serviceB = new PlatformService(writerB);
    const first = serviceA.renewMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_A,
      expectedVersion: issued.grant.version,
      reason: "winner",
      idempotencyKey: "s064-cas-a",
    });
    await writerA.flush();
    serviceB.renewMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_B,
      expectedVersion: issued.grant.version,
      reason: "loser",
      idempotencyKey: "s064-cas-b",
    });
    await assert.rejects(
      () => writerB.flush(),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = await PostgresPlatformStore.open(db);
    const grant = durable.snapshot().merchandiseGuestGrants.find((item) => item.id === first.grant.id);
    assert.equal(grant?.expiresAt, EXPIRY_A);
    assert.equal(grant?.id, first.grant.id);
    assert.equal(durable.snapshot().merchandiseGuestGrants.some((item) => item.expiresAt === EXPIRY_B), false);
    assert.equal(durable.snapshot().audit.filter((item) => item.action === "merch.guestAccess.renewed" && item.outcome === "SUCCESS").length, 1);
    assert.equal(durable.snapshot().idempotency.filter((item) => item.key === "s064-cas-a").length, 1);
    assert.equal(durable.snapshot().idempotency.filter((item) => item.key === "s064-cas-b").length, 0);
  });

  it("replays an identical issue with the same durable identifiers and no second write", () => {
    const { store, service } = (() => {
      const seeded = fixtureService();
      seedAccess(seeded.store);
      return { store: seeded.store, service: new PlatformService(seeded.store) };
    })();
    const first = service.issueMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "replay issue",
      idempotencyKey: "s064-replay-issue",
    });
    const afterFirst = digest({
      grants: store.snapshot().merchandiseGuestGrants,
      versions: store.snapshot().merchandiseGuestGrants.map((item) => [item.id, item.version, item.updatedAt]),
    });
    const replay = service.issueMerchandiseGuestAccess(actor(people.personDirector), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "replay issue",
      idempotencyKey: "s064-replay-issue",
    });
    assert.equal(replay.grant.id, first.grant.id);
    assert.equal(replay.grant.version, first.grant.version);
    assert.equal(replay.grant.updatedAt, first.grant.updatedAt);
    assert.equal(store.snapshot().merchandiseGuestGrants.filter((item) => item.guestId === S04A_FIXTURE_IDS.guestOlufemi && item.status === "ACTIVE").length, 1);
    assert.equal(
      digest({
        grants: store.snapshot().merchandiseGuestGrants,
        versions: store.snapshot().merchandiseGuestGrants.map((item) => [item.id, item.version, item.updatedAt]),
      }),
      afterFirst,
    );
    assert.equal(store.snapshot().audit.filter((item) => item.action === "merch.guestAccess.issued" && item.outcome === "SUCCESS").length, 1);
  });

  it("keeps S063 dossier commands on bounded repository queries with last-known-good after a successor draft", async () => {
    const db = new MemoryPlatformPg();
    const postgres = await PostgresPlatformStore.open(db);
    const seeded = fixtureService();
    const migrated = migrateEosS05B(seeded.store.snapshot());
    seeded.store.replace(migrated.snapshot);
    const snap = seeded.store.snapshot();
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
      { organisationId: people.orgMaison, assignmentId: people.assignDirector, sourceId: source.id, expectedVersion: source.version, idempotencyKey: envelope().idempotencyKey },
      "2026-09-10T09:01:00.000Z",
      people.personDirector,
      "HUMAN",
    );
    const rule = createRuleEditionOnSnap(
      snap,
      {
        ...envelope({ assignmentId: people.assignCeo }),
        ruleKey: "s064-public-liability",
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
      { organisationId: people.orgMaison, assignmentId: people.assignDirector, ruleId: rule.id, status: "APPROVED", expectedVersion: rule.version, idempotencyKey: envelope().idempotencyKey },
      "2026-09-10T09:03:00.000Z",
      people.personDirector,
      "HUMAN",
    );
    recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "jurisdiction", value: "NG", unknown: false }, "2026-09-10T09:04:00.000Z", people.personCeo);
    recordFactEditionOnSnap(snap, { ...envelope({ assignmentId: people.assignCeo }), factKey: "event_dates", value: "2026-12-01/2026-12-02", unknown: false }, "2026-09-10T09:04:30.000Z", people.personCeo);
    evaluateApplicabilityOnSnap(snap, envelope({ assignmentId: people.assignCeo }), "2026-09-10T09:10:00.000Z", people.personCeo);
    await postgres.replaceAsync(snap);
    const commands = new RiskDossierCommandService(new PostgresRiskDossierRepository(db), {
      tokenPepper: () => "s064-test-pepper-value-32-chars-xx",
    });
    const draft = await commands.assemble(actor(people.personPlanner), envelope());
    const submitted = await commands.submit(actor(people.personPlanner), { ...envelope(), dossierId: draft.id, expectedVersion: draft.version });
    const approved = await commands.approve(actor(people.personDirector), {
      ...envelope({ assignmentId: people.assignDirector }),
      dossierId: submitted.id,
      expectedVersion: submitted.version,
    });
    const published = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: approved.version,
      approvedHash: approved.contentHash,
    });
    const replay = await commands.publish(actor(people.personCeo), {
      ...envelope({ assignmentId: people.assignCeo }),
      editionId: approved.id,
      expectedVersion: approved.version,
      approvedHash: approved.contentHash,
    });
    assert.equal(replay.id, published.id);
    assert.equal(replay.application, "REPLAYED");
    const successor = await commands.assemble(actor(people.personPlanner), envelope({ idempotencyKey: "s064-successor-draft" }));
    assert.equal(successor.status, "DRAFT");
    const workspace = await commands.getStaffWorkspace(people.orgMaison, people.eventAlphaOne, "CEO");
    assert.equal(workspace.currentPublication?.id, published.id);
    assert.equal(workspace.currentPublication?.status, "CURRENT");
    const queries = db.riskRows.map((row) => `${row.table}`);
    assert.equal(queries.includes("loadAll"), false);
    assertBoundedDossierQueries([
      "SELECT body FROM risk_dossier_editions WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE",
      "SELECT body FROM risk_dossier_publications WHERE organisation_id = $1 AND event_id = $2 AND current IS TRUE",
    ]);
    assert.equal(JSON.stringify(db.riskRows.map((row) => row.table)).includes("writeRiskSnapshotDelta"), false);
  });
});
