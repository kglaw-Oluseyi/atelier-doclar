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
  resolveDependencyKind,
  CORPUS_SEED_TIME,
  type ProgrammeEvent,
} from "../src/index.js";
import { ProgrammeEventError } from "../src/event-errors.js";
import { MemoryProgrammeStore } from "../src/store.js";
import { VALID_COMMIT, VALID_TIME, smallestManifest, validEvidence, validGate } from "./helpers.js";
import { accept, commit, evidence, impl, makeEvent, review, testBaseline, testEngine } from "./event-helpers.js";

const EOS_S01_COMMIT = "b815268e939cfbd0fc33ce10df77f1c8a1374d52";

function progressionEvent(input: {
  predecessorId: string;
  successorId: string;
  authorisedBy?: string;
  actor?: ProgrammeEvent["actor"];
  evidenceIds?: string[];
}): ProgrammeEvent {
  return parseProgrammeEvent({
    eventId: `EVT-PROG-${input.predecessorId}-${input.successorId}`,
    eventType: "PROGRESSION_AUTHORISED",
    schemaVersion: 1,
    aggregateType: "programme",
    aggregateId: progressionKey(input.predecessorId, input.successorId),
    product: "FOUNDATION",
    sliceId: input.successorId,
    occurredAt: VALID_TIME,
    recordedAt: VALID_TIME,
    actor: input.actor ?? { id: "CEO", role: "CEO" },
    source: "test",
    idempotencyKey: `prog:${input.predecessorId}->${input.successorId}`,
    payload: {
      predecessorId: input.predecessorId,
      successorId: input.successorId,
      authorisedAt: VALID_TIME,
      authorisedBy: input.authorisedBy ?? "CEO",
      authorityRole: "CEO",
      evidenceIds: input.evidenceIds ?? ["EV-PROG-001"],
      reason: "governed programme progression",
    },
  });
}

function seededCorpusEngine(events = corpusSeedEvents()) {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of events) engine.append(event);
  return { engine, baseline };
}

describe("dependency semantics", () => {
  it("keeps the legacy dependsOn default as ACCEPTANCE", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
    assert.equal(statuses.get("MD-BB"), "NOT_STARTED");
    engine.append(impl("MD-BB"));
    const afterImpl = calculateAllStatuses(engine.projectionAt());
    assert.equal(afterImpl.get("MD-BB"), "IN_PROGRESS");
    assert.notEqual(afterImpl.get("MD-BB"), "READY");
  });

  it("ordinary ACCEPTANCE dependency still requires ACCEPTED", () => {
    const { engine } = testEngine();
    engine.append(impl("MD-AA"));
    engine.append(commit("MD-AA"));
    engine.append(evidence("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(accept("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "ACCEPTED");
    assert.equal(statuses.get("MD-BB"), "READY");
  });

  it("does not treat IN_REVIEW as a satisfied PROGRESSION prerequisite", () => {
    const { engine } = testEngine(
      testBaseline({
        manifests: [
          smallestManifest({ id: "MD-AA", order: 0, dependsOn: [] }),
          smallestManifest({
            id: "MD-BB",
            order: 1,
            dependsOn: ["MD-AA"],
            dependencyKinds: { "MD-AA": "PROGRESSION" },
            title: "B",
          }),
        ],
      }),
    );
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
    assert.equal(statuses.get("MD-BB"), "NOT_STARTED");
    const projection = engine.projectionAt();
    assert.equal(Object.keys(projection.progressions).length, 0);
  });

  it("satisfies PROGRESSION only with governed authorisation evidence", () => {
    const { engine } = testEngine(
      testBaseline({
        manifests: [
          smallestManifest({ id: "MD-AA", order: 0, dependsOn: [] }),
          smallestManifest({
            id: "MD-BB",
            order: 1,
            dependsOn: ["MD-AA"],
            dependencyKinds: { "MD-AA": "PROGRESSION" },
            title: "B",
          }),
        ],
      }),
    );
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(progressionEvent({ predecessorId: "MD-AA", successorId: "MD-BB" }));
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
    assert.equal(statuses.get("MD-BB"), "READY");
    const auth = engine.projectionAt().progressions[progressionKey("MD-AA", "MD-BB")];
    assert.ok(auth);
    assert.equal(auth.evidenceIds.length > 0, true);
    assert.equal(auth.authorisedBy, "CEO");
  });

  it("rejects Cursor as a progression authority", () => {
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          authorisedBy: "Cursor",
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          actor: { id: "Cursor", role: "CEO" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("rejects UNKNOWN as a progression authority", () => {
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          authorisedBy: "UNKNOWN",
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          actor: { id: "UNKNOWN", role: "REVIEWER" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("rejects implementer or system self-authorisation of progression", () => {
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          actor: { id: "cursor-agent", role: "IMPLEMENTER" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
    assert.throws(
      () =>
        progressionEvent({
          predecessorId: "MD-AA",
          successorId: "MD-BB",
          actor: { id: "corpus-seed", role: "SYSTEM" },
        }),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("does not let a progression event satisfy a legacy ACCEPTANCE edge", () => {
    const { engine } = testEngine();
    assert.throws(
      () => engine.append(progressionEvent({ predecessorId: "MD-AA", successorId: "MD-BB" })),
      (error: unknown) => error instanceof ProgrammeEventError && error.code === "SCHEMA_INVALID",
    );
  });

  it("does not change the predecessor to ACCEPTED when progression is authorised", () => {
    const { engine } = testEngine(
      testBaseline({
        manifests: [
          smallestManifest({ id: "MD-AA", order: 0, dependsOn: [] }),
          smallestManifest({
            id: "MD-BB",
            order: 1,
            dependsOn: ["MD-AA"],
            dependencyKinds: { "MD-AA": "PROGRESSION" },
            title: "B",
          }),
        ],
      }),
    );
    engine.append(impl("MD-AA"));
    engine.append(review("MD-AA"));
    engine.append(progressionEvent({ predecessorId: "MD-AA", successorId: "MD-BB" }));
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    assert.equal(statuses.get("MD-AA"), "IN_REVIEW");
    assert.equal(projection.slices["MD-AA"]?.acceptedAt, undefined);
    assert.equal(projection.slices["MD-AA"]?.acceptedBy, undefined);
  });

  it("does not authorise production or change protected gates", () => {
    const { engine } = seededCorpusEngine();
    const projection = engine.projectionAt();
    const view = engine.currentView({ generatedAt: CORPUS_SEED_TIME, snapshotId: "SNAP-GR1-GATES" });
    assert.ok(projection.progressions[progressionKey("MD-CT0", "EOS-S01")]);
    for (const gate of Object.values(projection.gates)) {
      assert.notEqual(gate.status, "APPROVED", `${gate.id} must remain unsigned`);
    }
    assert.equal(view.gates.some((gate) => gate.status === "APPROVED"), false);
    assert.equal(Object.values(view.statuses).filter((status) => status === "ACCEPTED").length, 4);
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S04"], "ACCEPTED");
  });

  it("lets EOS-S01 satisfy its Foundation PROGRESSION prerequisite without mass acceptance", () => {
    const { engine, baseline } = seededCorpusEngine();
    const eos = baseline.manifests.find((item) => item.id === "EOS-S01");
    assert.ok(eos);
    assert.deepEqual(eos.dependsOn, ["MD-CT0"]);
    assert.equal(resolveDependencyKind(eos, "MD-CT0", Object.fromEntries(baseline.gates.map((gate) => [gate.id, gate]))), "PROGRESSION");
    const projection = engine.projectionAt();
    const statuses = calculateAllStatuses(projection);
    assert.equal(statuses.get("MD-CT0"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.ok(projection.progressions[progressionKey("MD-CT0", "EOS-S01")]);
    for (const id of ["MD-B0", "MD-CT0", "MD-CT1", "MD-CT9", "MD-FC1", "MD-LV1", "MD-HV1", "MD-GR1"]) {
      assert.equal(statuses.get(id), "IN_REVIEW", `${id} must remain unaccepted`);
    }
    assert.equal(statuses.get("EOS-S02"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S03"), "ACCEPTED");
    assert.equal(statuses.get("EOS-S04"), "ACCEPTED");
    assert.equal([...statuses.values()].filter((status) => status === "ACCEPTED").length, 4);
  });

  it("keeps EOS-S01 IN_REVIEW until its own valid acceptance evidence is recorded", () => {
    const { engine } = seededCorpusEngine(corpusSeedEventsThroughProgression());
    const before = calculateAllStatuses(engine.projectionAt());
    assert.equal(before.get("EOS-S01"), "IN_REVIEW");
    engine.append(
      makeEvent({
        eventType: "ACCEPTANCE_RECORDED",
        aggregateId: "EOS-S01",
        sliceId: "EOS-S01",
        actor: { id: "named-reviewer", role: "REVIEWER" },
        payload: {
          acceptedAt: VALID_TIME,
          acceptedBy: "Named Reviewer",
          authorityRole: "REVIEWER",
        },
      }),
    );
    const withoutCommit = calculateAllStatuses(engine.projectionAt());
    assert.equal(withoutCommit.get("EOS-S01"), "IN_REVIEW");
    assert.notEqual(withoutCommit.get("EOS-S01"), "ACCEPTED");
  });

  it("can accept EOS-S01 after COMMIT evidence without accepting Foundation; EOS-S02 then becomes READY", () => {
    const { engine } = seededCorpusEngine(corpusSeedEventsThroughProgression());
    engine.append(commit("EOS-S01", EOS_S01_COMMIT));
    engine.append(
      makeEvent({
        eventType: "EVIDENCE_ATTACHED",
        aggregateId: "EOS-S01",
        sliceId: "EOS-S01",
        payload: {
          evidence: validEvidence({
            id: "EV-EOS-S01-COMMIT",
            uri: `git:${EOS_S01_COMMIT}`,
            summary: `commit ${EOS_S01_COMMIT}`,
          }),
        },
      }),
    );
    engine.append(
      makeEvent({
        eventType: "ACCEPTANCE_RECORDED",
        aggregateId: "EOS-S01",
        sliceId: "EOS-S01",
        actor: { id: "named-reviewer", role: "REVIEWER" },
        payload: {
          acceptedAt: VALID_TIME,
          acceptedBy: "Named Reviewer",
          authorityRole: "REVIEWER",
        },
      }),
    );
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "ACCEPTED");
    assert.equal(statuses.get("MD-CT0"), "IN_REVIEW");
    assert.equal(statuses.get("MD-GR1"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S02"), "READY");
    const view = engine.currentView({ generatedAt: VALID_TIME, snapshotId: "SNAP-EOS-S01-ACCEPT-PATH" });
    assert.equal(view.gates.every((gate) => gate.status !== "APPROVED"), true);
  });

  it("keeps EOS-S02 ineligible until EOS-S01 is ACCEPTED", () => {
    const { engine, baseline } = seededCorpusEngine(corpusSeedEventsThroughProgression());
    const s02 = baseline.manifests.find((item) => item.id === "EOS-S02");
    assert.ok(s02);
    assert.deepEqual(s02.dependsOn, ["EOS-S01"]);
    assert.equal(s02.dependencyKinds, undefined);
    const statuses = calculateAllStatuses(engine.projectionAt());
    assert.equal(statuses.get("EOS-S01"), "IN_REVIEW");
    assert.equal(statuses.get("EOS-S02"), "NOT_STARTED");
    assert.notEqual(statuses.get("EOS-S02"), "READY");
  });

  it("still treats an undeclared gate ID as a GATE prerequisite", () => {
    const gate = validGate({ id: "GATE-INDEPENDENT", status: "NOT_READY" });
    const { engine } = testEngine(
      testBaseline({
        gates: [gate],
        manifests: [
          smallestManifest({
            id: "MD-AA",
            order: 0,
            dependsOn: ["GATE-INDEPENDENT"],
            title: "Gated",
          }),
        ],
      }),
    );
    const before = calculateAllStatuses(engine.projectionAt());
    assert.equal(before.get("MD-AA"), "NOT_STARTED");
    engine.append(
      makeEvent({
        eventType: "GATE_STATUS_CHANGED",
        aggregateType: "gate",
        aggregateId: "GATE-INDEPENDENT",
        sliceId: "MD-AA",
        actor: { id: "independent", role: "INDEPENDENT" },
        payload: {
          gateId: "GATE-INDEPENDENT",
          status: "APPROVED",
          authority: "Named independent reviewer",
          approvedAt: VALID_TIME,
          evidenceIds: ["EV-GATE-001"],
        },
      }),
    );
    const after = calculateAllStatuses(engine.projectionAt());
    assert.equal(after.get("MD-AA"), "READY");
  });

  it("preserves Control Tower corpus projection invariants", () => {
    const { engine } = seededCorpusEngine();
    const view = engine.currentView({ generatedAt: CORPUS_SEED_TIME, snapshotId: "SNAP-CT-REGRESSION" });
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
    ]) {
      assert.equal(view.statuses[id], "IN_REVIEW");
    }
    assert.equal(view.statuses["EOS-S01"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S02"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S03"], "ACCEPTED");
    assert.equal(view.statuses["EOS-S04"], "ACCEPTED");
    assert.equal(Object.values(view.statuses).filter((status) => status === "ACCEPTED").length, 4);
    assert.ok(view.outstanding.unacceptedMandatorySlices.includes("MD-CT2"));
    assert.ok(view.outstanding.blockingOpenItems.includes("OI-CT0-002"));
    assert.equal(view.outstanding.percentage.available, false);
  });
});
