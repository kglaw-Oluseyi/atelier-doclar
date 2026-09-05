import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEvents,
  createEngine,
  loadCorpusBaseline,
  MemoryProgrammeStore,
} from "@maison-doclar/programme-domain";
import { AUTHORISED_REPOSITORY } from "../src/constants.js";
import { loadLinkageCatalog } from "../src/catalog.js";
import { IngestionService } from "../src/ingest.js";
import { IngestionLedger } from "../src/ledger.js";
import { MemoryDeliveryStore } from "../src/replay.js";
import { SyntheticEvidenceProvider } from "../src/synthetic-provider.js";
import { NOW, SHA_A, SHA_B, commitEvidence, runEvidence } from "./helpers.js";

function corpusService() {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, NOW);
  for (const event of corpusSeedEvents()) engine.append(event);
  const service = new IngestionService({
    engine,
    catalog: loadLinkageCatalog(),
    ledger: new IngestionLedger(),
    deliveries: new MemoryDeliveryStore(),
    now: () => NOW,
    trustedRepository: AUTHORISED_REPOSITORY,
  });
  return { store, engine, service };
}

describe("CT2 integration", () => {
  it("appends validated CT2 events and does not duplicate on replay", () => {
    const { service, store, engine } = corpusService();
    const first = service.ingestCommit(
      commitEvidence({
        sha: SHA_A,
        message: [
          "feat(programme): implement CT3",
          "",
          "Slice-ID: MD-CT3",
          "Product: FOUNDATION",
          "Native-ID: CT3",
          "Prompt-Control-ID: MD-PR-0004",
        ].join("\n"),
      }),
    );
    assert.equal(first.ok, true);
    assert.ok(first.eventsAppended > 0);
    const count = store.eventCount();
    const second = service.ingestCommit(
      commitEvidence({
        sha: SHA_A,
        message: "feat(programme): implement CT3\n\nSlice-ID: MD-CT3\nProduct: FOUNDATION\nNative-ID: CT3\nPrompt-Control-ID: MD-PR-0004",
      }),
    );
    assert.equal(second.kind, "duplicate");
    assert.equal(store.eventCount(), count);
    const left = engine.projectionAt();
    const right = engine.projectionAt();
    assert.deepEqual(left, right);
  });

  it("can move a slice into implementation and review without manufacturing acceptance", () => {
    const { service, engine } = corpusService();
    service.ingestCommit(
      commitEvidence({
        sha: SHA_B,
        message: [
          "feat: CT4 work",
          "",
          "Slice-ID: MD-CT4",
          "Product: FOUNDATION",
          "Native-ID: CT4",
          "Prompt-Control-ID: MD-PR-0005",
          "Review-Requested: true",
        ].join("\n"),
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-CT4"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT3"), "IN_REVIEW");
    assert.notEqual(statuses.get("MD-CT4"), "ACCEPTED");
    assert.equal(engine.projectionAt().slices["MD-CT4"]?.acceptedAt, undefined);
  });

  it("cannot make a slice ACCEPTED from CI success alone", () => {
    const { baseline } = loadCorpusBaseline();
    const store = new MemoryProgrammeStore();
    const engine = createEngine(store, baseline, NOW);
    const service = new IngestionService({
      engine,
      catalog: loadLinkageCatalog(),
      ledger: new IngestionLedger(),
      deliveries: new MemoryDeliveryStore(),
      now: () => NOW,
      trustedRepository: AUTHORISED_REPOSITORY,
    });
    service.ingestCommit(
      commitEvidence({
        message: "feat\n\nSlice-ID: MD-CT4\nProduct: FOUNDATION\nNative-ID: CT4\nPrompt-Control-ID: MD-PR-0005",
      }),
    );
    service.ingestWorkflowRun(runEvidence());
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-CT4"), "IN_PROGRESS");
    assert.notEqual(statuses.get("MD-CT4"), "ACCEPTED");
    assert.equal(statuses.get("MD-B0"), "READY");
  });

  it("preserves historical snapshots after later ingestion", () => {
    const { service, engine } = corpusService();
    const snapshot = engine.snapshot({
      snapshotId: "SNAP-BEFORE-INGEST",
      generatedAt: NOW,
      source: "test",
    });
    const before = structuredClone(snapshot.projection);
    service.ingestCommit(
      commitEvidence({
        message: "feat\n\nSlice-ID: MD-CT4\nProduct: FOUNDATION\nNative-ID: CT4",
      }),
    );
    const reconstructed = engine.reconstructFromSnapshot("SNAP-BEFORE-INGEST", snapshot.sourceEventPosition);
    assert.deepEqual(reconstructed.slices["MD-CT4"]?.commits, before.slices["MD-CT4"]?.commits);
    assert.equal(engine.projectionAt().slices["MD-CT4"]?.commits.length, 1);
  });

  it("keeps the corpus acceptance invariant intact", async () => {
    const { service, engine } = corpusService();
    service.ingestCommit(
      commitEvidence({
        authorName: "CEO",
        message: "feat\n\nSlice-ID: MD-CT3\nProduct: FOUNDATION\nNative-ID: CT3\nPrompt-Control-ID: MD-PR-0004",
      }),
    );
    await service.reconcile(
      new SyntheticEvidenceProvider({
        commits: [],
        runs: [runEvidence({ sha: SHA_A, conclusion: "success" })],
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    for (const [id, status] of statuses) {
      assert.notEqual(status, "ACCEPTED", `${id} must not be ACCEPTED`);
    }
    assert.equal(statuses.get("MD-B0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT1"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT2"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT3"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT4"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT5"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT6"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT7"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT8"), "IN_REVIEW");
    assert.equal(statuses.get("MD-CT9"), "NOT_STARTED");
  });
});
