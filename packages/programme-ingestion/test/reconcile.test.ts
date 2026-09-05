import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTransientFailure } from "../src/errors.js";
import { SyntheticEvidenceProvider } from "../src/synthetic-provider.js";
import { SHA_A, SHA_B, commitEvidence, runEvidence, testHarness } from "./helpers.js";

describe("reconciliation", () => {
  it("discovers a missed commit", async () => {
    const { service, engine } = testHarness();
    const provider = new SyntheticEvidenceProvider({
      commits: [commitEvidence({ sha: SHA_B, message: "feat\n\nSlice-ID: MD-AA" })],
    });
    const outcome = await service.reconcile(provider);
    assert.equal(outcome.ok, true);
    assert.ok(outcome.eventsAppended > 0);
    assert.ok(engine.projectionAt().slices["MD-AA"]?.commits.includes(SHA_B));
    assert.equal(service.freshness().lastReconciliation, "2026-09-05T09:00:00.000Z");
  });

  it("discovers missed CI for a known commit", async () => {
    const { service, engine } = testHarness();
    service.ingestCommit(commitEvidence());
    const provider = new SyntheticEvidenceProvider({
      commits: [commitEvidence()],
      runs: [runEvidence({ runId: "8888" })],
    });
    const outcome = await service.reconcile(provider);
    assert.equal(outcome.ok, true);
    assert.ok(engine.projectionAt().slices["MD-AA"]?.checks.some((item) => item.id === "CHK-GH-8888"));
  });

  it("is idempotent when repeated", async () => {
    const { service, store } = testHarness();
    const provider = new SyntheticEvidenceProvider({
      commits: [commitEvidence()],
      runs: [runEvidence()],
    });
    const first = await service.reconcile(provider);
    const count = store.eventCount();
    const second = await service.reconcile(provider);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(store.eventCount(), count);
    assert.equal(second.kind, "duplicate");
  });

  it("treats a temporary provider failure as retryable and does not advance state", async () => {
    const { service, store } = testHarness();
    const before = store.eventCount();
    const outcome = await service.reconcile(
      new SyntheticEvidenceProvider({ failWith: "PROVIDER_UNAVAILABLE" }),
    );
    assert.equal(outcome.ok, false);
    assert.equal(outcome.code, "PROVIDER_UNAVAILABLE");
    assert.equal(outcome.retryable, true);
    assert.equal(isTransientFailure("PROVIDER_UNAVAILABLE"), true);
    assert.equal(isTransientFailure("INVALID_SIGNATURE"), false);
    assert.equal(store.eventCount(), before);
    assert.equal(service.freshness().state, "ERROR");
  });

  it("treats rate limiting as transient", async () => {
    const { service } = testHarness();
    const outcome = await service.reconcile(new SyntheticEvidenceProvider({ failWith: "RATE_LIMITED" }));
    assert.equal(outcome.code, "RATE_LIMITED");
    assert.equal(outcome.retryable, true);
    assert.equal(service.freshness().state, "ERROR");
  });

  it("does not invent success from an empty unchecked source", async () => {
    const { service } = testHarness();
    assert.equal(service.freshness().state, "UNKNOWN");
    await service.reconcile(new SyntheticEvidenceProvider());
    assert.equal(service.freshness().state, "FRESH");
    assert.equal(service.freshness().source, "github");
  });
});
