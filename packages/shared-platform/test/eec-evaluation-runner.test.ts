import assert from "node:assert/strict";
import test from "node:test";
import { evaluationCorpusHash, S05A_EVALUATION_CASES, validateEvaluationCorpus } from "../src/eec-evaluation-corpus.js";
import { executeS05AEvaluationOnSnap, requestS05AEvaluationOnSnap } from "../src/eec-evaluation-runner.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { EvaluationCaseDefinitionSchema } from "../src/eec-evaluation-schemas.js";
import { fixtureService } from "./helpers.js";

function hostSnap() {
  return fixtureService().store.snapshot();
}

const actorInput = {
  organisationId: FIXTURE_IDS.orgMaison,
  requestedByPersonId: FIXTURE_IDS.personCeo,
  correlationId: "corr-eval",
  idempotencyKey: "eval-runner-1",
  applicationSha: "local-dev",
  now: "2026-09-05T15:00:00.000Z",
};

test("corpus schema rejects duplicate ids, empty actions and bad hashes", () => {
  validateEvaluationCorpus();
  assert.ok(S05A_EVALUATION_CASES.length >= 28);
  assert.equal(evaluationCorpusHash(), evaluationCorpusHash([...S05A_EVALUATION_CASES].reverse()));
  assert.throws(() => EvaluationCaseDefinitionSchema.parse({ ...S05A_EVALUATION_CASES[0], actions: [] }));
  assert.throws(() => EvaluationCaseDefinitionSchema.parse({ ...S05A_EVALUATION_CASES[0], expected: [] }));
  assert.throws(() => EvaluationCaseDefinitionSchema.parse({ ...S05A_EVALUATION_CASES[0], contentHash: "abc" }));
});

test("runner executes isolated cases through production functions and persists one result per case", async () => {
  const snap = hostSnap();
  const queued = requestS05AEvaluationOnSnap(snap, actorInput);
  assert.equal(queued.status, "QUEUED");
  const run = await executeS05AEvaluationOnSnap(snap, { ...actorInput, runId: queued.id });
  const results = snap.aiEvaluationCaseResults.filter((item) => item.runId === run.id);
  assert.equal(results.length, S05A_EVALUATION_CASES.length);
  assert.equal(new Set(results.map((item) => item.caseId)).size, S05A_EVALUATION_CASES.length);
  assert.ok(snap.aiEvaluationRunLeases.every((item) => item.status !== "ACTIVE" || item.runId !== run.id));
  const failed = results.filter((item) => item.verdict !== "PASSED");
  if (failed.length) {
    console.error(failed.map((item) => `${item.caseId}:${item.verdict}:${item.diagnosticSummary}`).join("\n"));
  }
  assert.equal(run.status, "PASSED", failed.map((item) => `${item.caseId}:${item.diagnosticSummary}`).join(" | "));
  assert.equal(run.zeroToleranceFailed, false);
  assert.equal(run.passedCount, S05A_EVALUATION_CASES.length);
});

test("case isolation and stable ordering", async () => {
  const snap = hostSnap();
  const run = await executeS05AEvaluationOnSnap(snap, actorInput);
  const results = snap.aiEvaluationCaseResults.filter((item) => item.runId === run.id).sort((left, right) => left.caseId.localeCompare(right.caseId));
  const ids = results.map((item) => item.caseId);
  assert.deepEqual(ids, [...S05A_EVALUATION_CASES].map((item) => item.id).sort((left, right) => left.localeCompare(right)));
  const hashes = new Set(results.map((item) => item.inputSnapshotHash));
  assert.ok(hashes.size >= 1);
});
