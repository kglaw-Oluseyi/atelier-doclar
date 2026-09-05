import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifySurface, deniedPortfolio, loadCorpusPortfolio } from "../src/index.js";
import { buildFreshness } from "../src/surface.js";

describe("portfolio and surface states", () => {
  it("loads the corpus portfolio without manufacturing acceptance", () => {
    const view = loadCorpusPortfolio({
      actor: {
        actorId: "named-reviewer",
        role: "reader",
        issuedAt: "2026-09-05T10:00:00.000Z",
        expiresAt: "2026-09-05T18:00:00.000Z",
      },
      now: "2026-09-05T10:00:00.000Z",
    });
    assert.equal(view.state, "ok");
    assert.equal(view.cannotApprove, true);
    assert.equal(view.percentageAvailable, false);
    assert.ok(view.products.length >= 7);
    assert.equal(view.acceptedTotal, 4);
    assert.ok(view.remainingTotal >= 80);
    assert.ok(view.criticalPath.includes("MD-CT4"));
    assert.ok(view.horizon.some((item) => item.sliceId === "MD-CT3" && item.band === "now"));
    assert.ok(view.gates.every((gate) => gate.unsigned));
    assert.equal(view.freshness.liveGithub, "UNKNOWN");
    assert.equal(view.freshness.healthy, false);
  });

  it("denies an unauthenticated view without leaking portfolio counts as healthy", () => {
    const view = deniedPortfolio("2026-09-05T10:00:00.000Z");
    assert.equal(view.state, "denied");
    assert.equal(view.products.length, 0);
    assert.equal(view.freshness.healthy, false);
  });

  it("classifies denied, empty, stale, degraded, conflict, error and recovery", () => {
    const base = buildFreshness({
      source: "test",
      generatedAt: "2026-09-05T10:00:00.000Z",
      now: "2026-09-05T10:00:00.000Z",
      ingestionState: "FRESH",
      lastSuccessfulIngestion: "2026-09-05T10:00:00.000Z",
    });
    assert.equal(classifySurface({ authenticated: false, snapshotCount: 1, freshness: base }), "denied");
    assert.equal(classifySurface({ authenticated: true, snapshotCount: 0, freshness: base }), "empty");
    assert.equal(
      classifySurface({
        authenticated: true,
        snapshotCount: 1,
        freshness: { ...base, ingestionState: "STALE" },
      }),
      "stale",
    );
    assert.equal(
      classifySurface({
        authenticated: true,
        snapshotCount: 1,
        freshness: { ...base, ingestionState: "UNKNOWN" },
      }),
      "degraded",
    );
    assert.equal(classifySurface({ authenticated: true, snapshotCount: 1, freshness: base, conflict: true }), "conflict");
    assert.equal(classifySurface({ authenticated: true, snapshotCount: 1, freshness: base, loadError: "x" }), "error");
    assert.equal(
      classifySurface({
        authenticated: true,
        snapshotCount: 1,
        freshness: base,
        loadError: "x",
        allowRecovery: true,
      }),
      "recovery",
    );
  });

  it("supports explicit fixtures when allowed", () => {
    const actor = {
      actorId: "named-reviewer",
      role: "reader" as const,
      issuedAt: "2026-09-05T10:00:00.000Z",
      expiresAt: "2026-09-05T18:00:00.000Z",
    };
    assert.equal(loadCorpusPortfolio({ actor, fixture: "stale", allowFixtures: true }).state, "stale");
    assert.equal(loadCorpusPortfolio({ actor, fixture: "degraded", allowFixtures: true }).state, "degraded");
    assert.equal(loadCorpusPortfolio({ actor, fixture: "conflict", allowFixtures: true }).state, "conflict");
    assert.equal(loadCorpusPortfolio({ actor, fixture: "error", allowFixtures: true }).state, "error");
    assert.equal(loadCorpusPortfolio({ actor, fixture: "recovery", allowFixtures: true }).state, "recovery");
    assert.equal(loadCorpusPortfolio({ actor, fixture: "empty", allowFixtures: true }).state, "empty");
    assert.throws(() => loadCorpusPortfolio({ actor, fixture: "stale" }));
  });
});
