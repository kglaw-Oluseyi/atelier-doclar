import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FilesystemProgrammeStore, MemoryProgrammeStore } from "../src/store.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { VALID_COMMIT } from "./helpers.js";
import { makeEvent } from "./event-helpers.js";

describe("programme store", () => {
  it("appends an event and assigns a monotonic revision", () => {
    const store = new MemoryProgrammeStore();
    const first = store.append(
      makeEvent({ eventType: "COMMIT_LINKED", expectedRevision: 0, payload: { sha: VALID_COMMIT } }),
    );
    const second = store.append(
      makeEvent({
        eventType: "SLICE_IMPLEMENTATION_OBSERVED",
        expectedRevision: 1,
        payload: { summary: "work" },
      }),
    );
    assert.equal(first.kind, "appended");
    assert.equal(first.revision, 1);
    assert.equal(second.kind, "appended");
    assert.equal(second.revision, 2);
    assert.equal(store.eventCount(), 2);
  });

  it("does not mutate a stored event when a caller mutates a copy", () => {
    const store = new MemoryProgrammeStore();
    const appended = store.append(
      makeEvent({ eventId: "EVT-IMM", eventType: "COMMIT_LINKED", payload: { sha: VALID_COMMIT } }),
    );
    assert.equal(appended.kind, "appended");
    appended.event.source = "mutated";
    const stored = store.getById("EVT-IMM");
    assert.equal(stored?.source, "test");
  });

  it("rejects mutation of an accepted event identity", () => {
    const store = new MemoryProgrammeStore();
    store.append(makeEvent({ eventId: "EVT-IMM2", eventType: "COMMIT_LINKED", payload: { sha: VALID_COMMIT } }));
    assert.throws(
      () =>
        store.append(
          makeEvent({
            eventId: "EVT-IMM2",
            eventType: "SLICE_IMPLEMENTATION_OBSERVED",
            payload: { summary: "different" },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "EVENT_IDENTITY_CONFLICT",
    );
  });

  it("treats a duplicate idempotency key as a no-op", () => {
    const store = new MemoryProgrammeStore();
    const event = makeEvent({
      eventType: "COMMIT_LINKED",
      idempotencyKey: "IDEM-1",
      payload: { sha: VALID_COMMIT },
    });
    const first = store.append(event);
    const second = store.append(event);
    assert.equal(first.kind, "appended");
    assert.equal(second.kind, "duplicate");
    assert.equal(store.eventCount(), 1);
    assert.equal(store.getAggregateRevision("slice", "MD-AA"), 1);
  });

  it("fails a stale concurrency revision", () => {
    const store = new MemoryProgrammeStore();
    store.append(makeEvent({ eventType: "COMMIT_LINKED", expectedRevision: 0, payload: { sha: VALID_COMMIT } }));
    assert.throws(
      () =>
        store.append(
          makeEvent({
            eventType: "SLICE_IMPLEMENTATION_OBSERVED",
            expectedRevision: 0,
            payload: { summary: "stale" },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "STALE_REVISION",
    );
  });

  it("keeps filesystem snapshots immutable", () => {
    const dir = mkdtempSync(join(tmpdir(), "md-ct2-store-"));
    const store = new FilesystemProgrammeStore(dir);
    store.append(makeEvent({ eventType: "COMMIT_LINKED", payload: { sha: VALID_COMMIT } }));
    store.saveSnapshot({
      snapshotId: "SNAP-1",
      createdAt: "2026-09-05T05:10:00Z",
      sourceEventPosition: 1,
      projection: {
        eventPosition: 1,
        aggregateRevisions: {},
        manifests: [],
        products: [],
        phases: [],
        slices: {},
        openItems: {},
        gates: {},
        decisions: {},
      },
      view: {
        snapshotId: "SNAP-1",
        revision: 1,
        generatedAt: "2026-09-05T05:10:00Z",
        sourceEventPosition: 1,
        calculationVersion: "ct2-1",
        products: [],
        phases: [],
        slices: [],
        openItems: [],
        gates: [],
        decisions: [],
        statuses: {},
        outstanding: {
          unacceptedMandatorySlices: [],
          unlockedUnacceptedSlices: [],
          blockedSlices: [],
          blockingOpenItems: [],
          incompleteGates: [],
          blockingDecisions: [],
          missingRequiredEvidence: [],
          percentage: { available: false, reason: "WEIGHTS_ABSENT" },
        },
        freshness: { source: "test", eventPosition: 1 },
      },
    });
    assert.throws(
      () =>
        store.saveSnapshot({
          snapshotId: "SNAP-1",
          createdAt: "2026-09-05T06:00:00Z",
          sourceEventPosition: 1,
          projection: {
            eventPosition: 1,
            aggregateRevisions: {},
            manifests: [],
            products: [],
            phases: [],
            slices: {},
            openItems: {},
            gates: {},
            decisions: {},
          },
          view: store.getSnapshot("SNAP-1")!.view,
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SNAPSHOT_EXISTS",
    );
    const reloaded = new FilesystemProgrammeStore(dir);
    assert.equal(reloaded.eventCount(), 1);
    assert.equal(reloaded.getSnapshot("SNAP-1")?.snapshotId, "SNAP-1");
  });
});
