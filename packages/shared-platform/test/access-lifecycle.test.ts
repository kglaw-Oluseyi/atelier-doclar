import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyS04AFixtures, S04A_FIXTURE_IDS } from "../src/addressing-fixtures.js";
import {
  DEFAULT_NON_PRODUCTION_VENDOR_ACCESS,
  PlatformError,
  PlatformService,
  PostgresPlatformStore,
  MemoryPlatformPg,
  applyEosS04BToSnapshot,
  applyEosS04CToSnapshot,
  applyS04BFixturesIfMissing,
  applyS04CFixturesIfMissing,
  resolveVendorAccessFromEnv,
  S04C_FIXTURE_IDS,
  type AccessAuthority,
  type VendorAccessConfig,
} from "../src/index.js";
import { actor, fixtureService, people } from "./helpers.js";

const ALPHA = { organisationId: people.orgMaison, eventId: people.eventAlphaOne };
const director = () => actor(people.personDirector);
const EXPIRY_A = "2026-12-31T00:00:00.000Z";
const EXPIRY_B = "2027-01-15T00:00:00.000Z";

const SECURE_VENDOR: VendorAccessConfig = {
  assignmentPepper: "synthetic-railway-vendor-pepper-value-32xx",
  sessionSecret: "synthetic-railway-vendor-session-value-32x",
  currentKeyId: "vk-railway-1",
  sessionTtlSeconds: 7200,
  maxExchangeFailures: 8,
};

const RAILWAY_SYNTHETIC: AccessAuthority = {
  productionAuthorised: false,
  identityAdapter: "NON_PRODUCTION_FIXTURE",
  hostedRuntime: "RAILWAY",
  railwayProjectName: "atelier-doclar",
};

function s04cService(options?: ConstructorParameters<typeof PlatformService>[1]) {
  const { store } = fixtureService();
  store.replace(applyS04AFixtures(store.snapshot()));
  store.replace(applyEosS04BToSnapshot(store.snapshot(), "2026-09-07T10:00:00.000Z"));
  store.replace(applyS04BFixturesIfMissing(store.snapshot()));
  store.replace(applyEosS04CToSnapshot(store.snapshot(), "2026-09-07T12:00:00.000Z"));
  store.replace(applyS04CFixturesIfMissing(store.snapshot()));
  return { store, service: new PlatformService(store, options) };
}

function successAudits(store: { snapshot: () => { audit: Array<{ action: string; outcome: string }> } }, action: string) {
  return store.snapshot().audit.filter((item) => item.action === action && item.outcome === "SUCCESS");
}

function containsRaw(value: unknown, token: string): boolean {
  return JSON.stringify(value).includes(token);
}

describe("EOS-S04C vendor environment classification", () => {
  it("permits synthetic vendor access on production-built Railway when unauthorised, fixture adapter, and secure secrets are set", () => {
    const config = resolveVendorAccessFromEnv(
      {
        EVENT_OS_VENDOR_PEPPER: SECURE_VENDOR.assignmentPepper,
        EVENT_OS_VENDOR_SESSION_SECRET: SECURE_VENDOR.sessionSecret,
        RAILWAY_PROJECT_NAME: "atelier-doclar",
        RAILWAY_ENVIRONMENT: "production",
      },
      RAILWAY_SYNTHETIC,
    );
    assert.equal(config.assignmentPepper, SECURE_VENDOR.assignmentPepper);
    const { service } = s04cService({ vendorAccess: config, accessAuthority: RAILWAY_SYNTHETIC });
    const issued = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "env-class-vendor",
      vendorDisplayName: "Environment class vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "railway synthetic permit",
    });
    assert.ok(issued.token);
    const session = service.exchangeVendorAccess(issued.token, "2026-09-07T13:00:00.000Z");
    assert.equal(session.view.guestListRestricted, true);
  });

  it("rejects fixture vendor identity and session configuration when production is authorised", () => {
    assert.throws(
      () =>
        resolveVendorAccessFromEnv(
          {
            EVENT_OS_VENDOR_PEPPER: DEFAULT_NON_PRODUCTION_VENDOR_ACCESS.assignmentPepper,
            EVENT_OS_VENDOR_SESSION_SECRET: DEFAULT_NON_PRODUCTION_VENDOR_ACCESS.sessionSecret,
          },
          {
            productionAuthorised: true,
            identityAdapter: "OIDC_COMPATIBLE",
            hostedRuntime: "RAILWAY",
            railwayProjectName: "atelier-doclar",
          },
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "PRODUCTION_ADAPTER_FORBIDDEN",
    );
    assert.throws(
      () =>
        resolveVendorAccessFromEnv(
          {
            EVENT_OS_VENDOR_PEPPER: SECURE_VENDOR.assignmentPepper,
            EVENT_OS_VENDOR_SESSION_SECRET: SECURE_VENDOR.sessionSecret,
          },
          {
            productionAuthorised: true,
            identityAdapter: "NON_PRODUCTION_FIXTURE",
            hostedRuntime: "RAILWAY",
            railwayProjectName: "atelier-doclar",
          },
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "PRODUCTION_ADAPTER_FORBIDDEN",
    );
  });

  it("fails closed on Railway when secrets are missing or known fixture defaults", () => {
    assert.throws(
      () => resolveVendorAccessFromEnv({}, RAILWAY_SYNTHETIC),
      (error: unknown) => error instanceof PlatformError && error.code === "PRODUCTION_ADAPTER_FORBIDDEN",
    );
    assert.throws(
      () =>
        resolveVendorAccessFromEnv(
          {
            EVENT_OS_VENDOR_PEPPER: DEFAULT_NON_PRODUCTION_VENDOR_ACCESS.assignmentPepper,
            EVENT_OS_VENDOR_SESSION_SECRET: DEFAULT_NON_PRODUCTION_VENDOR_ACCESS.sessionSecret,
            RAILWAY_PROJECT_NAME: "atelier-doclar",
          },
          RAILWAY_SYNTHETIC,
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "PRODUCTION_ADAPTER_FORBIDDEN",
    );
    assert.throws(
      () =>
        resolveVendorAccessFromEnv(
          {
            EVENT_OS_VENDOR_PEPPER: SECURE_VENDOR.assignmentPepper,
            EVENT_OS_VENDOR_SESSION_SECRET: SECURE_VENDOR.sessionSecret,
            RAILWAY_PROJECT_NAME: "other-project",
          },
          { ...RAILWAY_SYNTHETIC, railwayProjectName: "other-project" },
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "PRODUCTION_ADAPTER_FORBIDDEN",
    );
  });
});

describe("EOS-S04C guest and vendor access lifecycles", () => {
  it("issues vendor access into a usable session, renews by superseding, and revokes an open session", () => {
    const { service } = s04cService();
    const created = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "lifecycle-house",
      vendorDisplayName: "Lifecycle house",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "issue vendor",
    });
    const open = service.exchangeVendorAccess(created.token, "2026-09-07T13:00:00.000Z");
    assert.ok(open.view.fulfilments.length >= 0);
    const renewed = service.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_B,
      expectedVersion: created.assignment.version,
      reason: "renew vendor",
    });
    assert.notEqual(renewed.token, created.token);
    assert.throws(
      () => service.vendorPortalView(open.sessionToken, "2026-09-07T13:05:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    const live = service.exchangeVendorAccess(renewed.token, "2026-09-07T13:06:00.000Z");
    service.revokeVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: renewed.assignment.id,
      expectedVersion: renewed.assignment.version,
      reason: "revoke vendor",
    });
    assert.throws(
      () => service.vendorPortalView(live.sessionToken, "2026-09-07T13:07:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    assert.throws(
      () => service.exchangeVendorAccess(created.token, "2026-09-07T13:08:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
  });

  it("rejects a stale different-value guest renewal without a second grant or success audit", () => {
    const { store, service } = s04cService();
    const issued = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "issue guest",
      idempotencyKey: "guest-issue-stale",
    });
    const renewed = service.renewMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_A,
      expectedVersion: issued.grant.version,
      reason: "first renew",
      idempotencyKey: "guest-renew-1",
    });
    const before = successAudits(store, "merch.guestAccess.renewed").length;
    assert.throws(
      () =>
        service.renewMerchandiseGuestAccess(director(), {
          ...ALPHA,
          grantId: issued.grant.id,
          expiresAt: EXPIRY_B,
          expectedVersion: issued.grant.version,
          reason: "stale different",
          idempotencyKey: "guest-renew-stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const active = store
      .snapshot()
      .merchandiseGuestGrants.filter(
        (item) => item.guestId === S04A_FIXTURE_IDS.guestOlufemi && item.status === "ACTIVE",
      );
    assert.equal(active.length, 1);
    assert.equal(active[0]?.id, renewed.grant.id);
    assert.equal(active[0]?.expiresAt, EXPIRY_A);
    assert.equal(successAudits(store, "merch.guestAccess.renewed").length, before);
  });

  it("rejects a stale different-value vendor renewal without minting another token", () => {
    const { store, service } = s04cService();
    const created = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "stale-vendor",
      vendorDisplayName: "Stale vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "issue",
    });
    const renewed = service.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_A,
      expectedVersion: created.assignment.version,
      reason: "first renew",
      idempotencyKey: "vendor-renew-1",
    });
    const before = successAudits(store, "merch.vendorAssignment.renewed").length;
    assert.throws(
      () =>
        service.renewVendorAssignment(director(), {
          ...ALPHA,
          assignmentId: created.assignment.id,
          expiresAt: EXPIRY_B,
          expectedVersion: created.assignment.version,
          reason: "stale different",
          idempotencyKey: "vendor-renew-stale",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const assignment = store.snapshot().vendorAssignments.find((item) => item.id === created.assignment.id);
    assert.equal(assignment?.expiresAt, EXPIRY_A);
    assert.equal(assignment?.tokenPrefix, renewed.assignment.tokenPrefix);
    assert.equal(successAudits(store, "merch.vendorAssignment.renewed").length, before);
  });

  it("treats a rapid identical guest renewal as one action", () => {
    const { store, service } = s04cService();
    const issued = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "issue guest",
    });
    const first = service.renewMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_B,
      expectedVersion: issued.grant.version,
      reason: "identical renew",
      idempotencyKey: "guest-identical-a",
    });
    const second = service.renewMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_B,
      expectedVersion: issued.grant.version,
      reason: "identical renew",
      idempotencyKey: "guest-identical-b",
    });
    assert.equal(second.grant.id, first.grant.id);
    assert.equal(second.token, "");
    assert.equal(successAudits(store, "merch.guestAccess.renewed").length, 1);
    assert.equal(
      store.snapshot().merchandiseGuestGrants.filter((item) => item.guestId === S04A_FIXTURE_IDS.guestOlufemi && item.status === "ACTIVE")
        .length,
      1,
    );
  });

  it("treats a rapid identical vendor renewal as one action", () => {
    const { store, service } = s04cService();
    const created = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "identical-vendor",
      vendorDisplayName: "Identical vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "issue",
    });
    const first = service.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_B,
      expectedVersion: created.assignment.version,
      reason: "identical renew",
      idempotencyKey: "vendor-identical-a",
    });
    const second = service.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_B,
      expectedVersion: created.assignment.version,
      reason: "identical renew",
      idempotencyKey: "vendor-identical-b",
    });
    assert.equal(second.assignment.version, first.assignment.version);
    assert.equal(second.token, "");
    assert.equal(successAudits(store, "merch.vendorAssignment.renewed").length, 1);
  });

  it("replays issue and revoke without minting another grant or incrementing again", () => {
    const { store, service } = s04cService();
    const first = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "issue",
      idempotencyKey: "issue-key",
    });
    const replayIssue = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_B,
      reason: "issue again",
      idempotencyKey: "issue-key-2",
    });
    assert.equal(replayIssue.grant.id, first.grant.id);
    assert.equal(replayIssue.replayed, true);
    assert.equal(replayIssue.token, "");
    const revoked = service.revokeMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: first.grant.id,
      expectedVersion: first.grant.version,
      reason: "revoke",
      idempotencyKey: "revoke-key",
    });
    const replayRevoke = service.revokeMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: first.grant.id,
      expectedVersion: first.grant.version,
      reason: "revoke again",
      idempotencyKey: "revoke-key-2",
    });
    assert.equal(replayRevoke.id, revoked.id);
    assert.equal(replayRevoke.version, revoked.version);
    assert.equal(successAudits(store, "merch.guestAccess.revoked").length, 1);
    const vendor = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "revoke-replay-vendor",
      vendorDisplayName: "Revoke replay",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "issue vendor",
      idempotencyKey: "vendor-issue-1",
    });
    const vendorReplay = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "revoke-replay-vendor",
      vendorDisplayName: "Revoke replay",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "issue vendor",
      idempotencyKey: "vendor-issue-2",
    });
    assert.equal(vendorReplay.assignment.id, vendor.assignment.id);
    assert.equal(vendorReplay.token, "");
    service.revokeVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: vendor.assignment.id,
      expectedVersion: vendor.assignment.version,
      reason: "revoke vendor",
      idempotencyKey: "vendor-revoke-1",
    });
    const vendorRevokeReplay = service.revokeVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: vendor.assignment.id,
      expectedVersion: vendor.assignment.version,
      reason: "revoke vendor",
      idempotencyKey: "vendor-revoke-2",
    });
    assert.equal(vendorRevokeReplay.status, "REVOKED");
    assert.equal(successAudits(store, "merch.vendorAssignment.revoked").length, 1);
  });

  it("never writes raw tokens into audit or canonical projections", () => {
    const { store, service } = s04cService();
    const guest = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "token secrecy guest",
    });
    const vendor = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "secrecy-vendor",
      vendorDisplayName: "Secrecy vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "token secrecy vendor",
    });
    const snap = store.snapshot();
    assert.equal(containsRaw(snap.audit, guest.token), false);
    assert.equal(containsRaw(snap.merchandiseGuestGrants, guest.token), false);
    assert.equal(containsRaw(snap.audit, vendor.token), false);
    assert.equal(containsRaw(snap.vendorAssignments, vendor.token), false);
  });

  it("fails closed for forged, expired, cross-event and cross-vendor access", () => {
    const { service } = s04cService();
    const created = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "deny-vendor",
      vendorDisplayName: "Deny vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: "2026-09-01T00:00:00.000Z",
      reason: "expired assignment",
    });
    assert.throws(
      () => service.exchangeVendorAccess("forged-not-a-real-token", "2026-09-07T13:00:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    assert.throws(
      () => service.exchangeVendorAccess(created.token, "2026-09-07T13:00:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    const live = service.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "deny-vendor-live",
      vendorDisplayName: "Deny live",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "live deny",
    });
    const session = service.exchangeVendorAccess(live.token, "2026-09-07T13:00:00.000Z");
    assert.throws(
      () =>
        service.vendorSubmitUpdate(session.sessionToken, {
          assignmentId: S04C_FIXTURE_IDS.assignmentOther,
          fulfilmentId: S04C_FIXTURE_IDS.fulfilmentAdewale,
          reportedState: "DISPATCHED",
          reason: "cross vendor",
          expectedFulfilmentVersion: 1,
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });
});

describe("EOS-S04C durable access CAS", () => {
  it("rolls back partial access, audit and idempotency writes", async () => {
    const db = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(db);
    const seeded = s04cService();
    await store.replaceAsync(seeded.store.snapshot());
    const service = new PlatformService(store);
    const issued = service.issueMerchandiseGuestAccess(director(), {
      ...ALPHA,
      guestId: S04A_FIXTURE_IDS.guestOlufemi,
      expiresAt: EXPIRY_A,
      reason: "probe issue",
      idempotencyKey: "rollback-issue",
    });
    await store.flush();
    const beforeGrants = store.snapshot().merchandiseGuestGrants.length;
    const beforeAudit = store.snapshot().audit.length;
    const beforeIdem = store.snapshot().idempotency.length;
    db.failNextWrite();
    service.renewMerchandiseGuestAccess(director(), {
      ...ALPHA,
      grantId: issued.grant.id,
      expiresAt: EXPIRY_B,
      expectedVersion: issued.grant.version,
      reason: "rollback renew",
      idempotencyKey: "rollback-renew",
    });
    await assert.rejects(() => store.flush(), /synthetic write failure/);
    const reopened = await PostgresPlatformStore.open(db);
    assert.equal(reopened.snapshot().merchandiseGuestGrants.length, beforeGrants);
    assert.equal(reopened.snapshot().audit.length, beforeAudit);
    assert.equal(reopened.snapshot().idempotency.length, beforeIdem);
    assert.equal(
      reopened.snapshot().merchandiseGuestGrants.find((item) => item.id === issued.grant.id)?.status,
      "ACTIVE",
    );
  });

  it("fails a vendor mutation that races an already-persisted revocation", async () => {
    const db = new MemoryPlatformPg();
    const writerA = await PostgresPlatformStore.open(db);
    const seeded = s04cService();
    await writerA.replaceAsync(seeded.store.snapshot());
    const serviceA = new PlatformService(writerA);
    const created = serviceA.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "race-vendor",
      vendorDisplayName: "Race vendor",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "race issue",
    });
    const session = serviceA.exchangeVendorAccess(created.token, "2026-09-07T13:00:00.000Z");
    await writerA.flush();
    const writerB = await PostgresPlatformStore.open(db);
    const serviceB = new PlatformService(writerB);
    serviceA.revokeVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expectedVersion: created.assignment.version,
      reason: "race revoke",
    });
    await writerA.flush();
    serviceB.vendorSubmitUpdate(session.sessionToken, {
      assignmentId: created.assignment.id,
      fulfilmentId: S04C_FIXTURE_IDS.fulfilmentOlufemiCap,
      reportedState: "IN_PREPARATION",
      reason: "after revoke",
      expectedFulfilmentVersion: 1,
    });
    await assert.rejects(
      () => writerB.flush(),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = await PostgresPlatformStore.open(db);
    assert.equal(durable.snapshot().vendorAssignments.find((item) => item.id === created.assignment.id)?.status, "REVOKED");
    assert.equal(
      durable.snapshot().vendorUpdates.some(
        (item) => item.assignmentId === created.assignment.id && item.reportedState === "IN_PREPARATION",
      ),
      false,
    );
  });

  it("conflicts a stale vendor renewal at the persistence boundary", async () => {
    const db = new MemoryPlatformPg();
    const writerA = await PostgresPlatformStore.open(db);
    const seeded = s04cService();
    await writerA.replaceAsync(seeded.store.snapshot());
    const serviceA = new PlatformService(writerA);
    const created = serviceA.createVendorAssignment(director(), {
      ...ALPHA,
      vendorId: "persist-cas-vendor",
      vendorDisplayName: "Persist CAS",
      collectionIds: [S04C_FIXTURE_IDS.collectionTraditional],
      itemIds: [S04C_FIXTURE_IDS.itemCap],
      expiresAt: EXPIRY_A,
      reason: "cas issue",
    });
    await writerA.flush();
    const writerB = await PostgresPlatformStore.open(db);
    const serviceB = new PlatformService(writerB);
    serviceA.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_A,
      expectedVersion: created.assignment.version,
      reason: "first persist renew",
      idempotencyKey: "persist-renew-a",
    });
    await writerA.flush();
    serviceB.renewVendorAssignment(director(), {
      ...ALPHA,
      assignmentId: created.assignment.id,
      expiresAt: EXPIRY_B,
      expectedVersion: created.assignment.version,
      reason: "stale persist renew",
      idempotencyKey: "persist-renew-b",
    });
    await assert.rejects(
      () => writerB.flush(),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const durable = await PostgresPlatformStore.open(db);
    assert.equal(durable.snapshot().vendorAssignments.find((item) => item.id === created.assignment.id)?.expiresAt, EXPIRY_A);
  });
});
