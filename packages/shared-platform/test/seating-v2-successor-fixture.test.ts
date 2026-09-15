import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EOS_S06_SUCCESSOR_LAYOUT_A_NAME,
  EOS_S06_SUCCESSOR_LAYOUT_B_NAME,
  ensureEosS06SuccessorLayoutBinding,
  ensureEosS06SuccessorLayoutFixture,
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
});
