import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateAllStatuses,
  corpusSeedEventsThroughHv1,
  corpusSeedEventsThroughS03Acceptance,
  corpusSeedEventsThroughS03Implementation,
  createEngine,
  loadCorpusBaseline,
  parseProgrammeEvent,
  resolveDependencyKind,
  CORPUS_SEED_TIME,
  EOS_S01_REVIEWER,
  EOS_S03_ACCEPT_TIME,
  EOS_S03_ACCEPTANCE_EVENT_ID,
  EOS_S03_COMMIT,
  EOS_S03_COMMIT_EVIDENCE_ID,
  EOS_S03_FINAL_VERIFIED_HEAD,
  EOS_HV1_EVIDENCE_ID,
} from "../src/index.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { MemoryProgrammeStore } from "../src/store.js";
import { VALID_TIME } from "./helpers.js";
import { makeEvent } from "./event-helpers.js";

function engineFrom(events = corpusSeedEventsThroughHv1()) {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of events) engine.append(event);
  return { engine, store, baseline };
}

const acceptanceEvent = () =>
  parseProgrammeEvent({
    eventId: EOS_S03_ACCEPTANCE_EVENT_ID,
    eventType: "ACCEPTANCE_RECORDED",
    schemaVersion: 1,
    aggregateType: "slice",
    aggregateId: "EOS-S03",
    product: "EVENT_OS",
    sliceId: "EOS-S03",
    occurredAt: EOS_S03_ACCEPT_TIME,
    recordedAt: EOS_S03_ACCEPT_TIME,
    actor: { id: "ai-cto", role: "REVIEWER" },
    source: "ai-cto-technical-acceptance",
    idempotencyKey: `seed:${EOS_S03_ACCEPTANCE_EVENT_ID}`,
    payload: {
      acceptedAt: EOS_S03_ACCEPT_TIME,
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

describe("EOS-S03 formal technical acceptance", () => {
  it("remains IN_REVIEW without ACCEPTANCE_RECORDED", () => {
    const { engine } = engineFrom(corpusSeedEventsThroughS03Implementation());
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S04"), "NOT_STARTED");
    assert.equal(
      corpusSeedEventsThroughS03Implementation().some(
        (event) => event.eventType === "ACCEPTANCE_RECORDED" && event.sliceId === "EOS-S03",
      ),
      false,
    );
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 2);
  });

  it("derives EOS-S03 ACCEPTED from named reviewer, timestamp, immutable commit evidence and accepted predecessor", () => {
    const { engine, baseline } = engineFrom();
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    const eosS03 = baseline.manifests.find((item) => item.id === "EOS-S03");
    assert.ok(eosS03);
    assert.deepEqual(eosS03.dependsOn, ["EOS-S02"]);
    assert.equal(
      resolveDependencyKind(eosS03, "EOS-S02", Object.fromEntries(baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.deepEqual(projection.slices["EOS-S03"]?.commits, [EOS_S03_COMMIT]);
    assert.ok(
      projection.slices["EOS-S03"]?.evidence.some(
        (item) => item.id === EOS_S03_COMMIT_EVIDENCE_ID && item.kind === "COMMIT" && item.immutable,
      ),
    );
    assert.equal(projection.slices["EOS-S03"]?.acceptedBy, EOS_S01_REVIEWER);
    assert.equal(projection.slices["EOS-S03"]?.acceptedAt, EOS_S03_ACCEPT_TIME);
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
  });

  it("records S01-S03 human verification evidence without rewriting EOS-S03 acceptance identity", () => {
    const { engine } = engineFrom();
    const projection = engine.projectionAt();
    const facts = projection.slices["EOS-S03"];
    assert.ok(facts);
    assert.ok(
      facts.evidence.some(
        (item) =>
          item.id === EOS_HV1_EVIDENCE_ID &&
          item.kind === "DOCUMENT" &&
          item.uri === "docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md",
      ),
    );
    assert.deepEqual(facts.commits, [EOS_S03_COMMIT]);
    assert.equal(facts.acceptedBy, EOS_S01_REVIEWER);
    assert.equal(facts.acceptedAt, EOS_S03_ACCEPT_TIME);
    const statuses = calculateAllStatuses(projection);
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "READY");
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 3);
  });

  it("keeps the accepted implementation SHA distinct from the later verified HEAD", () => {
    const { engine } = engineFrom();
    const facts = engine.projectionAt().slices["EOS-S03"];
    assert.ok(facts);
    assert.deepEqual(facts.commits, [EOS_S03_COMMIT]);
    assert.equal(facts.commits[0], "bed7cebeb14e731c1d0e8a289ceb7cfa21f546fe");
    assert.notEqual(facts.commits[0], EOS_S03_FINAL_VERIFIED_HEAD);
    assert.notEqual(EOS_S03_COMMIT, EOS_S03_FINAL_VERIFIED_HEAD);
    const commitEvidence = facts.evidence.find((item) => item.id === EOS_S03_COMMIT_EVIDENCE_ID);
    assert.ok(commitEvidence);
    assert.equal(commitEvidence.uri, `git:${EOS_S03_COMMIT}`);
    assert.match(commitEvidence.summary, new RegExp(EOS_S03_COMMIT));
  });

  it("rejects Cursor as acceptedBy", () => {
    assert.throws(
      () =>
        makeEvent({
          eventType: "ACCEPTANCE_RECORDED",
          aggregateId: "EOS-S03",
          sliceId: "EOS-S03",
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
          aggregateId: "EOS-S03",
          sliceId: "EOS-S03",
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
    assert.equal(calculateAllStatuses(engine.projectionAt()).get("EOS-S03"), "ACCEPTED");
  });

  it("rejects a conflicting duplicate acceptance identity", () => {
    const { engine } = engineFrom();
    assert.throws(
      () =>
        engine.append(
          parseProgrammeEvent({
            ...acceptanceEvent(),
            payload: {
              acceptedAt: EOS_S03_ACCEPT_TIME,
              acceptedBy: "A Different Reviewer",
              authorityRole: "REVIEWER",
            },
          }),
        ),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "EVENT_IDENTITY_CONFLICT",
    );
    assert.equal(engine.projectionAt().slices["EOS-S03"]?.acceptedBy, EOS_S01_REVIEWER);
  });

  it("leaves Foundation slices IN_REVIEW and accepted count exactly 3", () => {
    const { engine } = engineFrom();
    const statuses = calculateAllStatuses(engine.projectionAt());
    for (const id of FOUNDATION_SLICES) {
      assert.equal(statuses.get(id), "IN_REVIEW", `${id} must remain IN_REVIEW`);
    }
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    const accepted = [...statuses.entries()].filter(([, status]) => status === "ACCEPTED");
    assert.deepEqual(accepted.map(([id]) => id), ["EOS-S01", "EOS-S02", "EOS-S03"]);
    assert.equal(accepted.length, 3);
  });

  it("derives EOS-S04 READY only after EOS-S03 acceptance, without implementation evidence", () => {
    const before = engineFrom(corpusSeedEventsThroughS03Implementation());
    const beforeStatuses = calculateAllStatuses(before.engine.projectionAt());
    const eosS04 = before.baseline.manifests.find((item) => item.id === "EOS-S04");
    assert.ok(eosS04);
    assert.deepEqual(eosS04.dependsOn, ["EOS-S03"]);
    assert.equal(
      resolveDependencyKind(eosS04, "EOS-S03", Object.fromEntries(before.baseline.gates.map((gate) => [gate.id, gate]))),
      "ACCEPTANCE",
    );
    assert.equal(beforeStatuses.get("EOS-S03"), "IN_REVIEW");
    assert.equal(beforeStatuses.get("EOS-S04"), "NOT_STARTED");

    const after = engineFrom(corpusSeedEventsThroughS03Acceptance());
    const afterProjection = after.engine.projectionAt();
    const afterStatuses = calculateAllStatuses(afterProjection);
    assert.equal(afterStatuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(afterStatuses.get("EOS-S04"), "READY");
    assert.notEqual(afterStatuses.get("EOS-S04"), "IN_PROGRESS");
    assert.notEqual(afterStatuses.get("EOS-S04"), "IN_REVIEW");
    assert.notEqual(afterStatuses.get("EOS-S04"), "ACCEPTED");
    assert.deepEqual(afterProjection.slices["EOS-S04"]?.commits, []);
    assert.deepEqual(afterProjection.slices["EOS-S04"]?.evidence, []);
    assert.equal(
      corpusSeedEventsThroughHv1().some((event) => event.sliceId === "EOS-S04" && event.eventType !== "SLICE_DECLARED"),
      false,
    );
  });

  it("does not authorise production or change protected gates", () => {
    const { engine } = engineFrom();
    const view = engine.currentView({ generatedAt: EOS_S03_ACCEPT_TIME, snapshotId: "SNAP-EOS-S03-ACCEPT" });
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "ACCEPTED");
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
    for (const id of PROTECTED_GATES) {
      const gate = view.gates.find((item) => item.id === id);
      assert.ok(gate, id);
      assert.notEqual(gate.status, "APPROVED");
      assert.equal(gate.status, "NOT_READY");
    }
  });
});
