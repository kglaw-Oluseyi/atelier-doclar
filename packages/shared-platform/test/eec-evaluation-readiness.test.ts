import assert from "node:assert/strict";
import test from "node:test";
import { SCHEMA_VERSION } from "../src/constants.js";
import { S05A_EVALUATION_CASES } from "../src/eec-evaluation-corpus.js";
import { currentEvaluationVersions, executeS05AEvaluationOnSnap, requestS05AEvaluationOnSnap } from "../src/eec-evaluation-runner.js";
import { s05aEvaluationReadinessFromSnap, s05aReadinessFromSnap } from "../src/eec-evaluation-projections.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { fixtureService } from "./helpers.js";

test("no run is UNRUN, blocked and not release ready", () => {
  const snap = fixtureService().store.snapshot();
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(readiness.status, "UNRUN");
  assert.equal(readiness.blocked, true);
  assert.equal(readiness.releaseReady, false);
  const legacy = s05aReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(legacy.evaluationBlocked, true);
});

test("queued run is RUNNING and blocked", () => {
  const snap = fixtureService().store.snapshot();
  requestS05AEvaluationOnSnap(snap, {
    organisationId: FIXTURE_IDS.orgMaison,
    requestedByPersonId: FIXTURE_IDS.personCeo,
    correlationId: "corr",
    idempotencyKey: "ready-queued",
    applicationSha: "local-dev",
    now: "2026-09-05T15:00:00.000Z",
  });
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(readiness.status, "RUNNING");
  assert.equal(readiness.blocked, true);
});

test("legacy S040 record without case results is INCOMPATIBLE", () => {
  const snap = fixtureService().store.snapshot();
  snap.aiEvaluationRuns.push({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    organisationId: FIXTURE_IDS.orgMaison,
    corpusEdition: "s05a-eval-v1",
    modelVersion: "fixture-inactive-v1",
    status: "PASSED",
    zeroToleranceFailed: false,
    metrics: { cases: "22" },
    compatibilityStatus: "INCOMPATIBLE",
    version: 2,
    schemaVersion: SCHEMA_VERSION,
    createdAt: "2026-09-05T15:00:00.000Z",
    updatedAt: "2026-09-05T15:00:00.000Z",
  } as (typeof snap.aiEvaluationRuns)[number]);
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(readiness.status, "INCOMPATIBLE");
  assert.equal(readiness.blocked, true);
  assert.equal(readiness.releaseReady, false);
});

test("corpus hash change is STALE", async () => {
  const snap = fixtureService().store.snapshot();
  const run = await executeS05AEvaluationOnSnap(snap, {
    organisationId: FIXTURE_IDS.orgMaison,
    requestedByPersonId: FIXTURE_IDS.personCeo,
    correlationId: "corr",
    idempotencyKey: "ready-stale",
    applicationSha: "local-dev",
    now: "2026-09-05T15:00:00.000Z",
    cases: S05A_EVALUATION_CASES.slice(0, 1),
  });
  const stored = snap.aiEvaluationRuns.find((item) => item.id === run.id)!;
  stored.corpusHash = "a".repeat(64);
  stored.status = "PASSED";
  stored.zeroToleranceFailed = false;
  stored.passedCount = stored.caseCount;
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(readiness.status, "STALE");
  assert.equal(readiness.blocked, true);
});

test("version mismatch is INCOMPATIBLE", async () => {
  const snap = fixtureService().store.snapshot();
  const run = await executeS05AEvaluationOnSnap(snap, {
    organisationId: FIXTURE_IDS.orgMaison,
    requestedByPersonId: FIXTURE_IDS.personCeo,
    correlationId: "corr",
    idempotencyKey: "ready-incompat",
    applicationSha: "local-dev",
    now: "2026-09-05T15:00:00.000Z",
    cases: S05A_EVALUATION_CASES.slice(0, 1),
  });
  const stored = snap.aiEvaluationRuns.find((item) => item.id === run.id)!;
  stored.orchestratorVersion = "changed-orchestrator";
  stored.status = "PASSED";
  stored.zeroToleranceFailed = false;
  stored.corpusHash = currentEvaluationVersions().corpusHash;
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  assert.equal(readiness.status, "INCOMPATIBLE");
  assert.equal(readiness.blocked, true);
});
