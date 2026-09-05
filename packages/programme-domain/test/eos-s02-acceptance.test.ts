import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEvents,
  corpusSeedEventsThroughS02Implementation,
  createEngine,
  loadCorpusBaseline,
  parseProgrammeEvent,
  resolveDependencyKind,
  CORPUS_SEED_TIME,
  EOS_S01_REVIEWER,
  EOS_S02_ACCEPT_TIME,
  EOS_S02_ACCEPTANCE_EVENT_ID,
  EOS_S02_COMMIT,
  EOS_S02_COMMIT_EVIDENCE_ID,
  EOS_S02_FINAL_VERIFIED_HEAD,
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
    eventId: EOS_S02_ACCEPTANCE_EVENT_ID,
    eventType: "ACCEPTANCE_RECORDED",
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: "EOS-S02",
    product: "EVENT_OS",
    sliceId: "EOS-S02",
    occurredAt: EOS_S02_ACCEPT_TIME,
    recordedAt: EOS_S02_ACCEPT_TIME,
    actor: { id: "ai-cto", role: "REVIEWER" },
    source: "ai-cto-technical-acceptance",
    idempotencyKey: `seed:${EOS_S02_ACCEPTANCE_EVENT_ID}`,
    payload: {
      acceptedAt: EOS_S02_ACCEPT_TIME,
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

describe("EOS-S02 formal technical acceptance", () => {
  it("remains IN_REVIEW without ACCEPTANCE_RECORDED", () => {
    const { engine } = engineFrom(corpusSeedEventsThroughS02Implementation());
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S03"), "NOT_STARTED");
    assert.equal(
      corpusSeedEventsThroughS02Implementation().some(
        (event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S02",
      ),
      false,
    );
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 1);
  });

  it("derives EOS-S02 ACCEPTED from named reviewer, timestamp, immutable commit evidence and accepted predecessor", () => {
    const { engine, baseline } = engineFrom();
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    const eosS02 = baseline.manifests.find((item) => item.id === "EOS-S02");
    assert.ok(eosS02);
    assert.deepEqual(eosS02.dependsOn, ["EOS-S01"]);
    assert.equal(
      resolveDependencyKind(eosS02, "EOS-S01", Object.fromEntries(baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.deepEqual(projection.slices["EOS-S02"]?.commits, [EOS_S02_COMMIT]);
    assert.ok(
      projection.slices["EOS-S02"]?.evidence.some(
        (item) => item.id === EOS_S02_COMMIT_EVIDENCE_ID && item.kind === "COMMIT" && item.immutable,
      ),
    );
    assert.equal(projection.slices["EOS-S02"]?.acceptedBy, EOS_S01_REVIEWER);
    assert.equal(projection.slices["EOS-S02"]?.acceptedAt, EOS_S02_ACCEPT_TIME);
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
  });

  it("keeps the accepted implementation SHA distinct from the later verified HEAD", () => {
    const { engine } = engineFrom();
    const facts = engine.projectionAt().slices["EOS-S02"];
    assert.ok(facts);
    assert.deepEqual(facts.commits, [EOS_S02_COMMIT]);
    assert.equal(facts.commits[0], "23e8ad98f7a0b8d18ae083f385bfc04cd43ab973");
    assert.notEqual(facts.commits[0], EOS_S02_FINAL_VERIFIED_HEAD);
    assert.notEqual(EOS_S02_COMMIT, EOS_S02_FINAL_VERIFIED_HEAD);
    const commitEvidence = facts.evidence.find((item) => item.id === EOS_S02_COMMIT_EVIDENCE_ID);
    assert.ok(commitEvidence);
    assert.equal(commitEvidence.uri, `git:${EOS_S02_COMMIT}`);
    assert.match(commitEvidence.summary, new RegExp(EOS_S02_COMMIT));
  });

  it("rejects Cursor as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          aggregateId: "EOS-S02",
          sliceId: "EOS-S02",
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
          aggregateId: "EOS-S02",
          sliceId: "EOS-S02",
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
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("EOS-S02"), "ACCEPTED");
  });

  it("rejects a conflicting duplicate acceptance identity", () => {
    const { engine } = engineFrom();
    assert.throws(
      () =>
        engine.append(
          parseProgrammeEvent({
            ...acceptanceEvent(),
            payload: {
              acceptedAt: EOS_S02_ACCEPT_TIME,
              acceptedBy: "A Different Reviewer",
              authorityRole: "REVIEWER",
            },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "EVENT_IDENTITY_CONFLICT",
    );
    assert.equal(engine.projectionAt().slices["EOS-S02"]?.acceptedBy, EOS_S01_REVIEWER);
  });

  it("leaves Foundation slices IN_REVIEW and accepted count exactly 2", () => {
    const { engine } = engineFrom();
    const statuses = calculateAllStatuses(engine.projectionAt());
    for (const id of FOUNDATION_SLICES) {
      assert.equal(statuses.get(id), "IN_REVIEW", `${id} must remain IN_REVIEW`);
    }
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01", "EOS-S02"]);
    assert.equal(accepted.length, 2);
  });

  it("derives EOS-S03 READY only after EOS-S02 acceptance", () => {
    const before = engineFrom(corpusSeedEventsThroughS02Implementation());
    const beforeStatuses = calculateAllStatuses(before.engine.projectionAt());
    const eosS03 = before.baseline.manifests.find((item) => item.id === "EOS-S03");
    assert.ok(eosS03);
    assert.deepEqual(eosS03.dependsOn, ["EOS-S02"]);
    assert.equal(
      resolveDependencyKind(eosS03, "EOS-S02", Object.fromEntries(before.baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.equal(beforeStatuses.get("EOS-S02"), "IN_REVIEW");
    assert.equal(beforeStatuses.get("EOS-S03"), "NOT_STARTED");

    const after = engineFrom();
    const afterStatuses = calculateAllStatuses(after.engine.projectionAt());
    assert.equal(afterStatuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(afterStatuses.get("EOS-S03"), "READY");
    assert.notEqual(afterStatuses.get("EOS-S03"), "IN_PROGRESS");
    assert.notEqual(afterStatuses.get("EOS-S03"), "IN_REVIEW");
    assert.notEqual(afterStatuses.get("EOS-S03"), "ACCEPTED");
  });

  it("does not authorise production or change protected gates", () => {
    const { engine } = engineFrom();
    const view = engine.currentView({ generatedAt: EOS_S02_ACCEPT_TIME, snapshotId: "SNAP-EOS-S02-ACCEPT" });
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
    for (const id of PROTECTED_GATES) {
      const gate = view.gates.find((item) => item.id === id);
      assert.ok(gate, id);
      assert.notEqual(gate.status, "APPROVED");
      assert.equal(gate.status, "NOT_READY");
    }
  });
});
