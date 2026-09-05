import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEvents,
  corpusSeedEventsThroughProgression,
  createEngine,
  loadCorpusBaseline,
  parseProgrammeEvent,
  progressionKey,
  CORPUS_SEED_TIME,
  EOS_S01_ACCEPT_TIME,
  EOS_S01_ACCEPTANCE_EVENT_ID,
  EOS_S01_COMMIT,
  EOS_S01_COMMIT_EVIDENCE_ID,
  EOS_S01_REVIEWER,
} from "../src/index.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { MemoryProgrammeStore } from "../src/store.js";
import { VALID_TIME } from "./helpers.js";
import { makeEvent } from "./event-helpers.js";

function engineFrom(events = corpusSeedEvents()) {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of events) engine.append(event);
  return { engine, store, baseline };
}

const acceptanceEvent = () =>
  parseProgrammeEvent({
    eventId: EOS_S01_ACCEPTANCE_EVENT_ID,
    eventType: "ACCEPTANCE_RECORDED",
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: "EOS-S01",
    product: "EVENT_OS",
    sliceId: "EOS-S01",
    occurredAt: EOS_S01_ACCEPT_TIME,
    recordedAt: EOS_S01_ACCEPT_TIME,
    actor: { id: "ai-cto", role: "REVIEWER" },
    source: "ai-cto-technical-acceptance",
    idempotencyKey: `seed:${EOS_S01_ACCEPTANCE_EVENT_ID}`,
    payload: {
      acceptedAt: EOS_S01_ACCEPT_TIME,
      acceptedBy: EOS_S01_REVIEWER,
      authorityRole: "REVIEWER",
    },
  });

describe("EOS-S01 formal technical acceptance", () => {
  it("cannot become ACCEPTED before commit evidence exists", () => {
    const { engine } = engineFrom(corpusSeedEventsThroughProgression());
    engine.append(
      makeEvent({
        eventType: "ACCEPTANCE_RECORDED",
        aggregateId: "EOS-S01",
        sliceId: "EOS-S01",
        actor: { id: "ai-cto", role: "REVIEWER" },
        payload: {
          acceptedAt: VALID_TIME,
          acceptedBy: EOS_S01_REVIEWER,
          authorityRole: "REVIEWER",
        },
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "IN_REVIEW");
    assert.notEqual(statuses.get("EOS-S01"), "ACCEPTED");
  });

  it("derives EOS-S01 ACCEPTED from COMMIT evidence, named reviewer and satisfied PROGRESSION", () => {
    const { engine } = engineFrom();
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    assert.ok(projection.progressions[progressionKey("MD-CT0", "EOS-S01")]);
    assert.deepEqual(projection.slices["EOS-S01"]?.commits, [EOS_S01_COMMIT]);
    assert.ok(
      projection.slices["EOS-S01"]?.evidence.some(
        (item) => item.id === EOS_S01_COMMIT_EVIDENCE_ID && item.kind === "COMMIT" && item.immutable,
      ),
    );
    assert.equal(projection.slices["EOS-S01"]?.acceptedBy, EOS_S01_REVIEWER);
    assert.equal(projection.slices["EOS-S01"]?.acceptedAt, EOS_S01_ACCEPT_TIME);
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 1);
  });

  it("rejects Cursor as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          aggregateId: "EOS-S01",
          sliceId: "EOS-S01",
          actor: { id: "ai-cto", role: "REVIEWER" },
          payload: {
            acceptedAt: VALID_TIME,
            acceptedBy: "Cursor",
            authorityRole: "REVIEWER",
          },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("rejects UNKNOWN as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          aggregateId: "EOS-S01",
          sliceId: "EOS-S01",
          actor: { id: "ai-cto", role: "REVIEWER" },
          payload: {
            acceptedAt: VALID_TIME,
            acceptedBy: "UNKNOWN",
            authorityRole: "REVIEWER",
          },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("points acceptance at the immutable implementation commit", () => {
    const { engine } = engineFrom();
    const facts = engine.projectionAt().slices["EOS-S01"];
    assert.ok(facts);
    assert.deepEqual(facts.commits, [EOS_S01_COMMIT]);
    assert.notEqual(facts.commits[0], "230b6a71ea254b42435949fcf9623f6c35b158fa");
    const commitEvidence = facts.evidence.find((item) => item.id === EOS_S01_COMMIT_EVIDENCE_ID);
    assert.ok(commitEvidence);
    assert.equal(commitEvidence.uri, `git:${EOS_S01_COMMIT}`);
    assert.match(commitEvidence.summary, new RegExp(EOS_S01_COMMIT));
  });

  it("is idempotent when the same acceptance event is appended again", () => {
    const { engine, store } = engineFrom();
    const count = store.eventCount();
    const result = engine.append(acceptanceEvent());
    assert.equal(result.kind, "duplicate");
    assert.equal(store.eventCount(), count);
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("EOS-S01"), "ACCEPTED");
  });

  it("rejects a conflicting duplicate acceptance identity", () => {
    const { engine } = engineFrom();
    assert.throws(
      () =>
        engine.append(
          parseProgrammeEvent({
            ...acceptanceEvent(),
            payload: {
              acceptedAt: EOS_S01_ACCEPT_TIME,
              acceptedBy: "A Different Reviewer",
              authorityRole: "REVIEWER",
            },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "EVENT_IDENTITY_CONFLICT",
    );
    assert.equal(engine.projectionAt().slices["EOS-S01"]?.acceptedBy, EOS_S01_REVIEWER);
  });

  it("leaves Foundation slices IN_REVIEW after EOS-S01 acceptance", () => {
    const { engine } = engineFrom();
    const statuses = calculateAllStatuses(engine.projectionAt());
    for (const id of [
      "MD-B0",
      "MD-CT0",
      "MD-CT1",
      "MD-CT2",
      "MD-CT3",
      "MD-CT4",
      "MD-CT5",
      "MD-CT6",
      "MD-CT7",
      "MD-CT8",
      "MD-CT9",
      "MD-FC1",
      "MD-LV1",
      "MD-HV1",
      "MD-GR1",
    ]) {
      assert.equal(statuses.get(id), "IN_REVIEW", `${id} must remain IN_REVIEW`);
    }
  });

  it("makes accepted count exactly 1 and EOS-S02 READY only after EOS-S01 acceptance", () => {
    const before = engineFrom(corpusSeedEventsThroughProgression());
    const beforeStatuses = calculateAllStatuses(before.engine.projectionAt());
    assert.equal(beforeStatuses.get("EOS-S01"), "IN_REVIEW");
    assert.equal(beforeStatuses.get("EOS-S02"), "NOT_STARTED");
    assert.equal([...beforeStatuses.values()].filter((status) => status === "ACCEPTED").length, 0);

    const after = engineFrom();
    const afterStatuses = calculateAllStatuses(after.engine.projectionAt());
    assert.equal(afterStatuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(afterStatuses.get("EOS-S02"), "READY");
    assert.equal([...afterStatuses.values()].filter((status) => status === "ACCEPTED").length, 1);
  });

  it("does not authorise production or change protected gates", () => {
    const { engine } = engineFrom();
    const view = engine.currentView({ generatedAt: EOS_S01_ACCEPT_TIME, snapshotId: "SNAP-EOS-S01-ACCEPT" });
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
    for (const id of [
      "GATE-INDEPENDENT",
      "GATE-CEO-PRODUCTION",
      "GATE-SPECIALIST-BIOMETRIC",
      "GATE-VENUE-REHEARSAL",
    ]) {
      const gate = view.gates.find((item) => item.id === id);
      assert.ok(gate, id);
      assert.notEqual(gate.status, "APPROVED");
    }
  });
});
