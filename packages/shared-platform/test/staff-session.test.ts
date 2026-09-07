import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { NonProductionIdentityAdapter } from "../src/identity.js";
import { PlatformError } from "../src/errors.js";
import { MemoryPlatformStore } from "../src/memory-store.js";
import { DEFAULT_NON_PRODUCTION_STAFF_SESSION, issueSession } from "../src/session.js";
import { PlatformService } from "../src/service.js";
import { emptySnapshot, normalizeSnapshot } from "../src/store.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";
const ACCESS = DEFAULT_NON_PRODUCTION_STAFF_SESSION.accessToken;

function signedPayload(payload: unknown, secret = DEFAULT_NON_PRODUCTION_STAFF_SESSION.sessionSecret): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}

describe("revocable staff sessions", () => {
  it("creates a server-side session on named authentication", () => {
    const { service, store } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(issued.person.displayName, "Event Director");
    assert.equal(issued.session.personId, people.personDirector);
    assert.equal(issued.session.revokedAt, undefined);
    assert.equal(store.snapshot().staffSessions.length, 1);
    assert.equal(store.snapshot().staffSessions[0]?.id, issued.session.id);
    assert.equal(store.snapshot().staffSessions[0]?.nonProductionFixture, true);
    const resolved = service.requireStaffSession(issued.token, NOW);
    assert.equal(resolved.session.id, issued.session.id);
    assert.equal(resolved.actor.personId, people.personDirector);
  });

  it("resolves a token only while that session is active", () => {
    const { service } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(service.requireStaffSession(issued.token, NOW).session.id, issued.session.id);
    service.logoutStaffSession(issued.token, NOW);
    assert.throws(
      () => service.requireStaffSession(issued.token, NOW),
      (error: unknown) =>
        error instanceof PlatformError && error.code === "AUTH_REQUIRED" && error.details?.[0] === "revoked",
    );
  });

  it("logout revokes the current session and denies captured replay", () => {
    const { service, store } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    const captured = issued.token;
    const first = service.logoutStaffSession(captured, NOW);
    assert.equal(first.revoked, true);
    const record = store.snapshot().staffSessions.find((item) => item.id === issued.session.id);
    assert.ok(record?.revokedAt);
    assert.equal(record?.revocationReason, "LOGOUT");
    assert.throws(() => service.requireStaffSession(captured, NOW), PlatformError);
    assert.equal(service.logoutStaffSession(captured, NOW).revoked, false);
  });

  it("denies expired, explicitly revoked, malformed and legacy tokens", () => {
    const { service } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.throws(
      () => service.requireStaffSession(issued.token, "2026-09-06T15:00:00.000Z"),
      (error: unknown) => error instanceof PlatformError && error.details?.[0] === "expired",
    );
    const second = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    service.revokeStaffSession(second.session.id, "ADMIN", NOW);
    assert.throws(
      () => service.requireStaffSession(second.token, NOW),
      (error: unknown) => error instanceof PlatformError && error.details?.[0] === "revoked",
    );
    assert.throws(
      () => service.requireStaffSession("not-a-token", NOW),
      (error: unknown) => error instanceof PlatformError && error.details?.[0] === "malformed",
    );
    const legacy = signedPayload({
      personId: people.personCeo,
      issuedAt: NOW,
      expiresAt: "2026-09-06T15:00:00.000Z",
    });
    assert.throws(
      () => service.requireStaffSession(legacy, NOW),
      (error: unknown) => error instanceof PlatformError && error.details?.[0] === "legacy",
    );
    const orphan = issueSession(
      { personId: people.personCeo, accessToken: ACCESS, now: NOW },
      DEFAULT_NON_PRODUCTION_STAFF_SESSION,
    );
    assert.throws(
      () => service.requireStaffSession(orphan.token, NOW),
      (error: unknown) => error instanceof PlatformError && error.details?.[0] === "legacy",
    );
  });

  it("treats logout with a missing or malformed token as safe and idempotent", () => {
    const { service } = fixtureService();
    assert.deepEqual(service.logoutStaffSession(undefined, NOW), { revoked: false });
    assert.deepEqual(service.logoutStaffSession("broken", NOW), { revoked: false });
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(service.logoutStaffSession(issued.token, NOW).revoked, true);
    assert.equal(service.logoutStaffSession(issued.token, NOW).revoked, false);
  });

  it("rotates the session id on a later sign-in", () => {
    const { service } = fixtureService();
    const first = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    const second = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      "2026-09-05T15:01:00.000Z",
    );
    assert.notEqual(first.session.id, second.session.id);
    assert.equal(service.requireStaffSession(first.token, NOW).session.id, first.session.id);
    assert.equal(service.requireStaffSession(second.token, NOW).session.id, second.session.id);
  });

  it("does not resolve one person's session as another person", () => {
    const { service } = fixtureService();
    const director = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    const ceo = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(service.requireStaffSession(director.token, NOW).actor.personId, people.personDirector);
    assert.equal(service.requireStaffSession(ceo.token, NOW).actor.personId, people.personCeo);
    service.logoutStaffSession(director.token, NOW);
    assert.throws(() => service.requireStaffSession(director.token, NOW), PlatformError);
    assert.equal(service.requireStaffSession(ceo.token, NOW).actor.personId, people.personCeo);
  });

  it("resolves current authority from assignments, not from the session token", () => {
    const { service } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal("role" in issued.session, false);
    assert.equal("role" in service.requireStaffSession(issued.token, NOW).actor, false);
    const resolved = service.resolveActor(issued.person.id);
    const directorRole = resolved.roles.find((role) => role.key === "EVENT_DIRECTOR");
    assert.ok(directorRole);
    assert.ok(resolved.assignments.some((item) => item.roleId === directorRole.id && item.status === "ACTIVE"));
  });

  it("audits issuance and revocation without token or credential material", () => {
    const { service, store } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
      "00000000-0000-4000-8000-0000000000c1",
    );
    service.logoutStaffSession(issued.token, NOW, "00000000-0000-4000-8000-0000000000c2");
    const audit = JSON.stringify(store.snapshot().audit.filter((item) => item.action.startsWith("auth.session")));
    assert.match(audit, /auth.session.issued/);
    assert.match(audit, /auth.session.revoked/);
    assert.doesNotMatch(audit, new RegExp(issued.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(audit, /event-os-access-token-not-for-production/);
    assert.doesNotMatch(audit, /tokenBindingHash/);
  });

  it("denies fixture sign-in when the non-production adapter is disabled", () => {
    assert.throws(
      () =>
        new NonProductionIdentityAdapter(false).resolve({
          externalSubject: "ceo@maison-doclar.test",
          email: "ceo@maison-doclar.test",
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FIXTURE_FORBIDDEN",
    );
    const store = new MemoryPlatformStore();
    const service = new PlatformService(store, {
      accessAuthority: {
        productionAuthorised: true,
        identityAdapter: "OIDC_COMPATIBLE",
        hostedRuntime: "LOCAL",
      },
    });
    assert.throws(() => service.staffSessionConfig(), PlatformError);
  });

  it("never defaults a missing or unknown identity to the CEO", () => {
    const { service, store } = fixtureService();
    assert.throws(
      () => service.authenticateNamedStaff({ accessToken: ACCESS }, NOW),
      PlatformError,
    );
    assert.throws(
      () =>
        service.authenticateNamedStaff(
          { email: "unknown.staff@example.test", accessToken: ACCESS },
          NOW,
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "AUTH_REQUIRED",
    );
    assert.equal(store.snapshot().staffSessions.length, 0);
    assert.equal(store.snapshot().persons.find((item) => item.id === people.personCeo)?.lastAuthenticatedAt, undefined);
  });

  it("fails closed on an ambiguous identity", () => {
    const { service, store } = fixtureService();
    const snap = store.snapshot();
    const ceo = snap.persons.find((item) => item.id === people.personCeo);
    assert.ok(ceo);
    snap.persons.push({
      ...ceo,
      id: "00000000-0000-4000-8000-0000000000aa",
      externalSubject: "dev:ceo-duplicate@maison-doclar.test",
    });
    store.replace(snap);
    assert.throws(
      () =>
        service.authenticateNamedStaff(
          { email: "ceo@maison-doclar.test", accessToken: ACCESS },
          NOW,
        ),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.equal(store.snapshot().staffSessions.length, 0);
  });

  it("rejects protected service access after the session is revoked", () => {
    const { service } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    service.listOrganisations(actor(issued.person.id));
    service.logoutStaffSession(issued.token, NOW);
    assert.throws(() => service.requireStaffSession(issued.token, NOW), PlatformError);
  });

  it("loads stored snapshots that omit staff sessions", () => {
    const loaded = normalizeSnapshot({ ...emptySnapshot(), staffSessions: undefined as unknown as [] });
    assert.deepEqual(loaded.staffSessions, []);
    const { service } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "planner@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(issued.session.personId, people.personPlanner);
  });
});
