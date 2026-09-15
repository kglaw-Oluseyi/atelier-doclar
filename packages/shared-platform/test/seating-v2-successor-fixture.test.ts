import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EOS_S06_SUCCESSOR_LAYOUT_A_NAME,
  EOS_S06_SUCCESSOR_LAYOUT_B_NAME,
  FIXTURE_IDS,
  ensureEosS06SuccessorLayoutBinding,
  ensureEosS06SuccessorLayoutFixture,
  ensureSeatingLayoutBindingForLayout,
} from "../src/index.js";
import { fixtureService } from "./helpers.js";

describe("EOS-S06 successor layout fixture", () => {
  it("is idempotent and exposes CURRENT A + CURRENT B with binding to A", async () => {
    const { service, store } = fixtureService();
    const first = ensureEosS06SuccessorLayoutFixture(store, service);
    const second = ensureEosS06SuccessorLayoutFixture(store, service);
    assert.equal(first.layoutAId, second.layoutAId);
    assert.equal(first.layoutBId, second.layoutBId);
    assert.equal(first.layoutAName, EOS_S06_SUCCESSOR_LAYOUT_A_NAME);
    assert.equal(first.layoutBName, EOS_S06_SUCCESSOR_LAYOUT_B_NAME);

    const snap = store.snapshot();
    const currentA = snap.layoutPublications.find((item) => item.layoutId === first.layoutAId && item.status === "CURRENT");
    const currentB = snap.layoutPublications.find((item) => item.layoutId === first.layoutBId && item.status === "CURRENT");
    assert.ok(currentA);
    assert.ok(currentB);
    assert.notEqual(currentA!.contentHash, currentB!.contentHash);

    const binding = await ensureEosS06SuccessorLayoutBinding(store, service);
    assert.ok(binding);
    assert.equal(binding!.layoutId, first.layoutAId);
    assert.equal(binding!.state, "ACTIVE");
  });

  it("supports the disposable A→B successor binding journey", async () => {
    const { service, store } = fixtureService();
    const fixture = ensureEosS06SuccessorLayoutFixture(store, service);

    const bindingA = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: fixture.layoutAId,
      plannerAssignmentId: FIXTURE_IDS.assignPlanner,
      directorAssignmentId: FIXTURE_IDS.assignDirector,
      idempotencyPrefix: "s06-journey-a",
    });
    assert.equal(bindingA.state, "ACTIVE");
    assert.equal(bindingA.layoutId, fixture.layoutAId);

    const bindingB = await ensureSeatingLayoutBindingForLayout(service, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: fixture.layoutBId,
      plannerAssignmentId: FIXTURE_IDS.assignPlanner,
      directorAssignmentId: FIXTURE_IDS.assignDirector,
      idempotencyPrefix: "s06-journey-b",
    });
    assert.equal(bindingB.state, "ACTIVE");
    assert.equal(bindingB.layoutId, fixture.layoutBId);

    const history = await service.seatingV2Commands().repository.transaction(async (tx) =>
      tx.list<{ id: string; state: string; layoutId: string }>("layoutBindings", {
        organisationId: FIXTURE_IDS.orgMaison,
        eventId: FIXTURE_IDS.eventAlphaOne,
      }),
    );
    assert.ok(history.some((item) => item.layoutId === fixture.layoutAId && item.state === "SUPERSEDED"));
    assert.ok(history.some((item) => item.id === bindingB.id && item.state === "ACTIVE"));
  });
});
