import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { MemoryPlatformPg, PostgresPlatformStore } from "../src/postgres-store.js";
import { DEFAULT_NON_PRODUCTION_STAFF_SESSION } from "../src/session.js";
import { PlatformService } from "../src/service.js";
import { isStaffAuthCapableStore } from "../src/staff-auth-store.js";
import { fixtureService } from "./helpers.js";

const NOW = "2026-09-05T15:00:00.000Z";
const ACCESS = DEFAULT_NON_PRODUCTION_STAFF_SESSION.accessToken;

function fatGuest(i: number) {
  return {
    id: `og-auth-scale-${i}`,
    organisationId: "org-maison-doclar",
    eventId: "ev-auth-scale",
    version: 1,
    schemaVersion: 1 as const,
    createdAt: NOW,
    updatedAt: NOW,
    displayName: `Guest ${i}`,
    status: "ACTIVE" as const,
    email: `guest${i}@example.test`,
    protocolNotes: "n".repeat(180),
    intakePayload: { raw: { a: "A".repeat(80), b: "B".repeat(80) } },
  };
}

function loadGuests(store: ReturnType<typeof fixtureService>["store"], count: number): void {
  const snap = store.snapshot();
  for (let i = 0; i < count; i += 1) {
    snap.operationalGuests.push(fatGuest(i) as never);
  }
  // Bypass validators for synthetic scale ballast that is not a full guest schema.
  (store as unknown as { state: typeof snap }).state.operationalGuests = snap.operationalGuests;
}

describe("bounded staff authentication", () => {
  it("does not call store.snapshot or store.replace on the authentication write path", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/service.ts", import.meta.url)), "utf8");
    const start = source.indexOf("authenticateNamedStaff(");
    const end = source.indexOf("\n  requireStaffSession(", start);
    const body = source.slice(start, end);
    const boundedBranch = body.slice(0, body.indexOf("const snap = this.store.snapshot();"));
    assert.match(boundedBranch, /isStaffAuthCapableStore\(this\.store\)/);
    assert.equal(boundedBranch.includes("this.store.snapshot()"), false);
    assert.equal(boundedBranch.includes("this.store.replace("), false);
    assert.match(boundedBranch, /applyStaffAuthMutation/);
  });

  it("keeps valid, invalid-token and unknown-email behaviour", () => {
    const { service, store } = fixtureService();
    assert.equal(isStaffAuthCapableStore(store), true);
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.equal(issued.person.email, "ceo@maison-doclar.test");
    assert.equal(store.snapshot().staffSessions.some((item) => item.id === issued.session.id), true);
    assert.throws(
      () => service.authenticateNamedStaff({ email: "ceo@maison-doclar.test", accessToken: "wrong" }, NOW),
    );
    assert.throws(
      () =>
        service.authenticateNamedStaff(
          { email: "missing@maison-doclar.test", accessToken: ACCESS },
          NOW,
        ),
    );
    const audit = JSON.stringify(store.snapshot().audit.filter((item) => item.action.startsWith("auth.session")));
    assert.match(audit, /auth\.session\.issued/);
    assert.match(audit, /auth\.session\.denied/);
    assert.equal(audit.includes(ACCESS), false);
    assert.equal(audit.includes(issued.token), false);
  });

  it("resolves roles from assignments and accepts protected session reads without full snapshot clone", () => {
    const { service, store } = fixtureService();
    const issued = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    const originalSnapshot = store.snapshot.bind(store);
    let snapshotCalls = 0;
    store.snapshot = () => {
      snapshotCalls += 1;
      return originalSnapshot();
    };
    const resolved = service.requireStaffSession(issued.token, NOW);
    assert.equal(resolved.person.id, issued.person.id);
    assert.equal(snapshotCalls, 0);
    store.snapshot = originalSnapshot;
  });

  it("revokes sessions and survives concurrent sign-ins", async () => {
    const { service } = fixtureService();
    const first = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    const second = service.authenticateNamedStaff(
      { email: "director@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    assert.notEqual(first.session.id, second.session.id);
    assert.equal(service.logoutStaffSession(first.token, NOW).revoked, true);
    assert.throws(() => service.requireStaffSession(first.token, NOW));
    assert.equal(service.requireStaffSession(second.token, NOW).session.id, second.session.id);
  });

  it("keeps auth latency flat as guest volume grows (50 / 600 / 1000 / 2000)", () => {
    const samples: Array<{ guests: number; ms: number }> = [];
    for (const guests of [50, 600, 1000, 2000]) {
      const { service, store } = fixtureService();
      loadGuests(store, guests);
      // warm
      service.authenticateNamedStaff({ email: "ceo@maison-doclar.test", accessToken: ACCESS }, NOW);
      const runs: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const started = performance.now();
        service.authenticateNamedStaff(
          { email: "director@maison-doclar.test", accessToken: ACCESS },
          NOW,
        );
        runs.push(performance.now() - started);
      }
      runs.sort((a, b) => a - b);
      samples.push({ guests, ms: runs[Math.floor(runs.length / 2)]! });
    }
    const small = samples.find((item) => item.guests === 50)!;
    const large = samples.find((item) => item.guests === 2000)!;
    assert.ok(small.ms < 50, `small fixture p50 too slow: ${small.ms}`);
    assert.ok(large.ms < 50, `2000-guest auth p50 too slow: ${large.ms}`);
    assert.ok(
      large.ms < small.ms * 8 + 10,
      `auth latency grew materially with guests: ${JSON.stringify(samples)}`,
    );
  });

  it("persists only bounded auth rows through Postgres documents", async () => {
    const memory = new MemoryPlatformPg();
    const store = await PostgresPlatformStore.open(memory);
    const bootstrap = fixtureService();
    store.replace(bootstrap.store.snapshot());
    await store.flush();
    const beforeDocs = memory.documents.length;
    const service = new PlatformService(store, {
      staffSession: DEFAULT_NON_PRODUCTION_STAFF_SESSION,
    });
    const issued = service.authenticateNamedStaff(
      { email: "ceo@maison-doclar.test", accessToken: ACCESS },
      NOW,
    );
    await store.flush();
    const inserted = memory.documents.length - beforeDocs;
    assert.ok(inserted <= 3, `expected <=3 new documents, got ${inserted}`);
    assert.ok(memory.documents.some((row) => row.collection === "staffSessions" && row.id === issued.session.id));
    const reopened = await PostgresPlatformStore.open(memory);
    const again = new PlatformService(reopened, {
      staffSession: DEFAULT_NON_PRODUCTION_STAFF_SESSION,
    });
    assert.equal(again.requireStaffSession(issued.token, NOW).session.id, issued.session.id);
  });
});
