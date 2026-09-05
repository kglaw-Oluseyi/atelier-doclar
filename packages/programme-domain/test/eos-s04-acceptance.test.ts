import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEventsThroughS04Acceptance,
  corpusSeedEventsThroughS04Implementation,
  createEngine,
  loadCorpusBaseline,
  parseProgrammeEvent,
  resolveDependencyKind,
  CORPUS_SEED_TIME,
  EOS_S01_REVIEWER,
  EOS_S04_ACCEPT_TIME,
  EOS_S04_ACCEPTANCE_EVENT_ID,
  EOS_S04_ACCEPTANCE_EVIDENCE_ID,
  EOS_S04_COMMIT,
  EOS_S04_COMMIT_EVIDENCE_ID,
  EOS_S04_FINAL_VERIFIED_HEAD,
} from "../src/index.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { MemoryProgrammeStore } from "../src/store.js";
import { VALID_TIME } from "./helpers.js";
import { makeEvent } from "./event-helpers.js";

function engineFrom(events = corpusSeedEventsThroughS04Acceptance()) {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of events) engine.append(event);
  return { engine, store, baseline };
}

const acceptanceEvent = () =>
  parseProgrammeEvent({
    eventId: EOS_S04_ACCEPTANCE_EVENT_ID,
    eventType: "ACCEPTANCE_RECORDED",
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: "EOS-S04",
    product: "EVENT_OS",
    sliceId: "EOS-S04",
    occurredAt: EOS_S04_ACCEPT_TIME,
    recordedAt: EOS_S04_ACCEPT_TIME,
    actor: { id: "ai-cto", role: "REVIEWER" },
    source: "ai-cto-technical-acceptance",
    idempotencyKey: `seed:${EOS_S04_ACCEPTANCE_EVENT_ID}`,
    payload: {
      acceptedAt: EOS_S04_ACCEPT_TIME,
      acceptedBy: EOS_S01_REVIEWER,
      authorityRole: "REVIEWER",
    },
  });

const FOUNDATION_SLICES = [
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
] as const;

const PROTECTED_GATES = [
  "GATE-INDEPENDENT",
  "GATE-CEO-PRODUCTION",
  "GATE-SPECIALIST-BIOMETRIC",
  "GATE-VENUE-REHEARSAL",
] as const;

describe("EOS-S04 formal technical acceptance", () => {
  it("remains IN_REVIEW without ACCEPTANCE_RECORDED", () => {
    const { engine } = engineFrom(corpusSeedEventsThroughS04Implementation());
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S05"), "NOT_STARTED");
    assert.equal(
      corpusSeedEventsThroughS04Implementation().some(
        (event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S04",
      ),
      false,
    );
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 3);
  });

  it("derives EOS-S04 ACCEPTED from named reviewer, timestamp, immutable commit evidence and accepted predecessor", () => {
    const { engine, baseline } = engineFrom();
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    const eosS04 = baseline.manifests.find((item) => item.id === "EOS-S04");
    assert.ok(eosS04);
    assert.deepEqual(eosS04.dependsOn, ["EOS-S03"]);
    assert.equal(
      resolveDependencyKind(eosS04, "EOS-S03", Object.fromEntries(baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.deepEqual(projection.slices["EOS-S04"]?.commits, [EOS_S04_COMMIT]);
    assert.ok(
      projection.slices["EOS-S04"]?.evidence.some(
        (item) => item.id === EOS_S04_COMMIT_EVIDENCE_ID && item.kind === "COMMIT" && item.immutable,
      ),
    );
    assert.ok(
      projection.slices["EOS-S04"]?.evidence.some(
        (item) =>
          item.id === EOS_S04_ACCEPTANCE_EVIDENCE_ID &&
          item.kind === "DOCUMENT" &&
          item.uri === "docs/control/EOS_S04_ACCEPTANCE.md",
      ),
    );
    assert.equal(projection.slices["EOS-S04"]?.acceptedBy, EOS_S01_REVIEWER);
    assert.equal(projection.slices["EOS-S04"]?.acceptedAt, EOS_S04_ACCEPT_TIME);
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "ACCEPTED");
  });

  it("keeps the accepted implementation SHA distinct from the later verified HEAD", () => {
    const { engine } = engineFrom();
    const facts = engine.projectionAt().slices["EOS-S04"];
    assert.ok(facts);
    assert.deepEqual(facts.commits, [EOS_S04_COMMIT]);
    assert.equal(facts.commits[0], "8d87dc13ce87ab1431783d0e6649b34807eeb7ab");
    assert.notEqual(facts.commits[0], EOS_S04_FINAL_VERIFIED_HEAD);
    assert.notEqual(EOS_S04_COMMIT, EOS_S04_FINAL_VERIFIED_HEAD);
    const commitEvidence = facts.evidence.find((item) => item.id === EOS_S04_COMMIT_EVIDENCE_ID);
    assert.ok(commitEvidence);
    assert.equal(commitEvidence.uri, `git:${EOS_S04_COMMIT}`);
    assert.match(commitEvidence.summary, new RegExp(EOS_S04_COMMIT));
  });

  it("rejects Cursor as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          aggregateId: "EOS-S04",
          sliceId: "EOS-S04",
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
          aggregateId: "EOS-S04",
          sliceId: "EOS-S04",
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

  it("is idempotent when the same acceptance event is appended again", () => {
    const { engine, store } = engineFrom();
    const count = store.eventCount();
    const result = engine.append(acceptanceEvent());
    assert.equal(result.kind, "duplicate");
    assert.equal(store.eventCount(), count);
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("EOS-S04"), "ACCEPTED");
  });

  it("rejects a conflicting duplicate acceptance identity", () => {
    const { engine } = engineFrom();
    assert.throws(
      () =>
        engine.append(
          parseProgrammeEvent({
            ...acceptanceEvent(),
            payload: {
              acceptedAt: EOS_S04_ACCEPT_TIME,
              acceptedBy: "A Different Reviewer",
              authorityRole: "REVIEWER",
            },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "EVENT_IDENTITY_CONFLICT",
    );
    assert.equal(engine.projectionAt().slices["EOS-S04"]?.acceptedBy, EOS_S01_REVIEWER);
  });

  it("leaves Foundation slices IN_REVIEW and accepted count exactly 4", () => {
    const { engine } = engineFrom();
    const statuses = calculateAllStatuses(engine.projectionAt());
    for (const id of FOUNDATION_SLICES) {
      assert.equal(statuses.get(id), "IN_REVIEW", `${id} must remain IN_REVIEW`);
    }
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "ACCEPTED");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01", "EOS-S02", "EOS-S03", "EOS-S04"]);
    assert.equal(accepted.length, 4);
  });

  it("derives EOS-S05 READY only after EOS-S04 acceptance, without implementation evidence", () => {
    const before = engineFrom(corpusSeedEventsThroughS04Implementation());
    const beforeStatuses = calculateAllStatuses(before.engine.projectionAt());
    const eosS05 = before.baseline.manifests.find((item) => item.id === "EOS-S05");
    assert.ok(eosS05);
    assert.deepEqual(eosS05.dependsOn, ["EOS-S04"]);
    assert.equal(
      resolveDependencyKind(eosS05, "EOS-S04", Object.fromEntries(before.baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.equal(beforeStatuses.get("EOS-S04"), "IN_REVIEW");
    assert.equal(beforeStatuses.get("EOS-S05"), "NOT_STARTED");

    const after = engineFrom(corpusSeedEventsThroughS04Acceptance());
    const afterProjection = after.engine.projectionAt();
    const afterStatuses = calculateAllStatuses(afterProjection);
    assert.equal(afterStatuses.get("EOS-S04"), "ACCEPTED");
    assert.equal(afterStatuses.get("EOS-S05"), "READY");
    assert.notEqual(afterStatuses.get("EOS-S05"), "IN_PROGRESS");
    assert.notEqual(afterStatuses.get("EOS-S05"), "IN_REVIEW");
    assert.notEqual(afterStatuses.get("EOS-S05"), "ACCEPTED");
    assert.deepEqual(afterProjection.slices["EOS-S05"]?.commits, []);
    assert.deepEqual(afterProjection.slices["EOS-S05"]?.evidence, []);
  });

  it("does not authorise production or change protected gates", () => {
    const { engine } = engineFrom();
    const view = engine.currentView({ generatedAt: EOS_S04_ACCEPT_TIME, snapshotId: "SNAP-EOS-S04-ACCEPT" });
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S04"], "ACCEPTED");
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
    for (const id of PROTECTED_GATES) {
      const gate = view.gates.find((item) => item.id === id);
      assert.ok(gate, id);
      assert.notEqual(gate.status, "APPROVED");
      assert.equal(gate.status, "NOT_READY");
    }
  });
});
