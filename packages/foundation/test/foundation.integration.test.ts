import { describe, expect, it } from "vitest";
import {
  IDS,
  assertRegistryComplete,
  authorize,
  businessPermissions,
  createClient,
  decideApproval,
  getEvent,
  grantAssignment,
  loadActor,
  permissionsForRole,
  readiness,
  signInFixture,
  submitApproval,
  transitionEvent,
  withTx,
  type ActorState,
} from "../src/index";

async function actorFor(userId: string): Promise<ActorState> {
  const signed = await signInFixture({
    userId,
    secret: process.env.EVENT_OS_SESSION_SECRET ?? "",
    allowFixtures: true,
    correlationId: `test-${userId}`,
  });
  return withTx((db) => loadActor(db, userId, signed.organisationId));
}

describe("registry", () => {
  it("classifies every permission and keeps impersonation ungranted", () => {
    assertRegistryComplete();
    expect(permissionsForRole("CEO")).not.toContain("support.impersonate");
    for (const key of businessPermissions()) expect(permissionsForRole("CEO")).toContain(key);
    for (const key of permissionsForRole("READ_ONLY_AUDITOR")) {
      expect(["support.impersonate"]).not.toContain(key);
    }
    expect(permissionsForRole("READ_ONLY_AUDITOR").some((key) => key.endsWith(".create"))).toBe(
      false,
    );
  });
});

describe("foundation persistence", () => {
  it("migrates, isolates organisations, audits and lets the CEO complete maker/checker", async () => {
    const ready = await readiness();
    expect(ready).toEqual({ database: "ok", migrations: "APPLIED" });
    const ceo = await actorFor(IDS.ceo);
    const code = `N${Date.now().toString(36).toUpperCase()}`.slice(0, 16);
    const key = `client-${code}`;
    const created = await createClient(
      { actor: ceo, correlationId: "ceo-client", idempotencyKey: key },
      { code, displayName: "Synthetic New House", status: "ACTIVE" },
    );
    const replay = await createClient(
      { actor: ceo, correlationId: "ceo-client-2", idempotencyKey: key },
      { code, displayName: "Synthetic New House", status: "ACTIVE" },
    );
    expect(replay.id).toBe(created.id);
    await expect(getEvent(ceo, IDS.otherEvent)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const submitted = await submitApproval(
      { actor: ceo, correlationId: "submit", idempotencyKey: null },
      {
        kind: "EVENT_ARCHIVE",
        eventId: IDS.eventB,
        title: "Archive harvest",
        detail: "Synthetic rehearsal archive",
      },
    );
    await decideApproval(
      { actor: ceo, correlationId: "decide", idempotencyKey: null },
      {
        id: submitted.id,
        version: 1,
        decision: "APPROVED",
        reason: "CEO self-completion rehearsal",
      },
    );
    const event = await getEvent(ceo, IDS.eventB);
    expect(event.status).toBe("ARCHIVED");
    const admin = await actorFor(IDS.administrator);
    await expect(
      grantAssignment(
        { actor: admin, correlationId: "escalate", idempotencyKey: null },
        {
          userId: IDS.unassigned,
          roleKey: "CEO",
          scopeKind: "ORGANISATION",
          reason: "attempt",
          idempotencyRequest: {},
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const director = await actorFor(IDS.director);
    const current = await getEvent(director, IDS.eventA);
    const version = Number(current.version);
    if (current.phase === "DISCOVER") {
      await transitionEvent(
        { actor: director, correlationId: "design", idempotencyKey: `design-${Date.now()}` },
        { id: IDS.eventA, version, to: "DESIGN" },
      );
      await transitionEvent(
        { actor: director, correlationId: "prepare", idempotencyKey: `prepare-${Date.now()}` },
        { id: IDS.eventA, version: version + 1, to: "PREPARE" },
      );
    }
    const prepared = await getEvent(director, IDS.eventA);
    await expect(
      transitionEvent(
        { actor: director, correlationId: "ready", idempotencyKey: `ready-${Date.now()}` },
        { id: IDS.eventA, version: Number(prepared.version), to: "READY", reason: "too soon" },
      ),
    ).rejects.toMatchObject({ code: "CAPABILITY_NOT_ENABLED" });
    const decision = authorize(ceo, "support.impersonate", { organisationId: ceo.organisationId });
    expect(decision.outcome).toBe("DENY");
  });
});
