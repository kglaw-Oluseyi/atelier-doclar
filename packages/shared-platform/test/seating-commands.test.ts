import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { permissionsForRole } from "../src/catalog.js";
import { MemorySeatingRepository } from "../src/memory-seating-store.js";
import { SeatingCommandService } from "../src/seating-command-service.js";
import { actor, fixtureService, people } from "./helpers.js";

function service() {
  const { service: platform, store } = fixtureService();
  const seating = new SeatingCommandService(new MemorySeatingRepository(), {
    resolveActor: (personId) => platform.resolveActor(personId),
    snapshot: () => store.snapshot(),
    tokenPepper: () => "s06-test-pepper-value",
  });
  return { platform, seating };
}

const envelope = (_personId: string, assignmentId: string, key = "idempotency-key-01") => ({
  organisationId: people.orgMaison,
  eventId: people.eventAlphaOne,
  actorAssignmentId: assignmentId,
  idempotencyKey: key,
});

describe("EOS-S06 seating commands and permissions", () => {
  it("denies System Administrator and Auditor mutations and forged assignment reuse", async () => {
    const { seating } = service();
    await assert.rejects(
      () => seating.freezeSeatingInputs(actor(people.personAdmin), envelope(people.personAdmin, people.assignAdmin)),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () => seating.createSeatingConstraint(actor(people.personAuditor), envelope(people.personAuditor, people.assignAuditor), {
        kind: "HARD",
        predicateType: "KEEP_TOGETHER",
        payload: { predicateType: "KEEP_TOGETHER", guestTokens: ["aaaa", "bbbb"] },
        authority: "HARD_AUTHORISED",
        evidenceRefs: [],
        disclosureClass: "OPERATIONAL",
      }),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () => seating.freezeSeatingInputs(actor(people.personPlanner), envelope(people.personPlanner, people.assignCeo)),
      /cannot perform this seating action/,
    );
  });

  it("denies Planner self-approval and Director publish", async () => {
    const { seating } = service();
    assert.equal(permissionsForRole("SYSTEM_ADMINISTRATOR").some((key) => key.startsWith("seating.")), false);
    assert.ok(permissionsForRole("PLANNER").includes("seating.plan.edit"));
    assert.equal(permissionsForRole("PLANNER").includes("seating.plan.approve"), false);
    assert.equal(permissionsForRole("EVENT_DIRECTOR").includes("seating.plan.publish"), false);
    assert.ok(permissionsForRole("CEO").includes("seating.plan.publish"));
    await assert.rejects(
      () =>
        seating.decideSeatingApproval(actor(people.personPlanner), envelope(people.personPlanner, people.assignPlanner, "idempotency-key-02"), {
          editionId: "00000000-0000-4000-8000-000000000801",
          editionHash: "hash",
          decision: "APPROVED",
        }),
      /cannot perform this seating action/,
    );
    await assert.rejects(
      () =>
        seating.publishSeatingPlan(actor(people.personDirector), envelope(people.personDirector, people.assignDirector, "idempotency-key-03"), {
          editionId: "00000000-0000-4000-8000-000000000801",
          editionHash: "hash",
        }),
      /cannot perform this seating action/,
    );
  });

  it("replays an identical constraint create", async () => {
    const { seating } = service();
    const payload = {
      kind: "HARD" as const,
      predicateType: "KEEP_APART",
      payload: { predicateType: "KEEP_APART" as const, guestTokens: ["g0001", "g0002"] },
      authority: "HARD_AUTHORISED",
      evidenceRefs: [],
      disclosureClass: "OPERATIONAL" as const,
    };
    const first = await seating.createSeatingConstraint(actor(people.personPlanner), envelope(people.personPlanner, people.assignPlanner, "idempotency-key-04"), payload);
    const second = await seating.createSeatingConstraint(actor(people.personPlanner), envelope(people.personPlanner, people.assignPlanner, "idempotency-key-04"), payload);
    assert.equal(first.application, "APPLIED");
    assert.equal(second.application, "REPLAYED");
    assert.equal(second.didDataChange, false);
  });
});
