import { describe, expect, it } from "vitest";
import {
  IDS,
  getEvent,
  grantAssignment,
  loadActor,
  one,
  operateWorkstream,
  signInFixture,
  withTx,
  type ActorState,
} from "../src/index";

async function actorFor(userId: string): Promise<ActorState> {
  const signed = await signInFixture({
    userId,
    secret: process.env.EVENT_OS_SESSION_SECRET ?? "",
    allowFixtures: true,
    correlationId: `access-${userId}`,
  });
  return withTx((db) => loadActor(db, userId, signed.organisationId));
}

describe("department and auditor boundaries", () => {
  it("lets a department lead operate only the assigned workstream", async () => {
    const lead = await actorFor(IDS.departmentLead);
    const current = await withTx((db) =>
      one<{ version: number }>(db, `SELECT version FROM workstreams WHERE id = $1`, [
        IDS.workstream,
      ]),
    );
    await operateWorkstream(
      { actor: lead, correlationId: "operate", idempotencyKey: null },
      { id: IDS.workstream, version: current?.version ?? 1, note: "Synthetic ceremony note" },
    );
    const admin = await actorFor(IDS.administrator);
    await expect(
      grantAssignment(
        { actor: admin, correlationId: "bad-dept", idempotencyKey: null },
        {
          userId: IDS.unassigned,
          roleKey: "DEPARTMENT_LEAD",
          scopeKind: "WORKSTREAM",
          eventId: IDS.eventA,
          reason: "missing department",
          idempotencyRequest: {},
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    await expect(getEvent(lead, IDS.otherEvent)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
