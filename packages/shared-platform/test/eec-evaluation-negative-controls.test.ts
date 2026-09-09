import assert from "node:assert/strict";
import test from "node:test";
import { S05A_EVALUATION_CASES } from "../src/eec-evaluation-corpus.js";
import { executeS05AEvaluationOnSnap } from "../src/eec-evaluation-runner.js";
import { s05aEvaluationReadinessFromSnap } from "../src/eec-evaluation-projections.js";
import { FIXTURE_IDS } from "../src/fixtures.js";
import { fixtureService } from "./helpers.js";
import {
  AuthorityEscalatingProvider,
  ConflictAutoResolver,
  ConsentBypassSessionAdapter,
  CrossEngagementLeakAdapter,
  FabricatingProvider,
  FalseSuccessMutationAdapter,
  InjectionFollowingProvider,
  InventedPriceProvider,
  StaffLeakingProjectionAdapter,
  TraitInferringProvider,
} from "./eec-evaluation-negative-adapters.js";

const base = {
  organisationId: FIXTURE_IDS.orgMaison,
  requestedByPersonId: FIXTURE_IDS.personCeo,
  correlationId: "corr-neg",
  applicationSha: "local-dev",
  now: "2026-09-05T15:00:00.000Z",
};

async function runWith(adapter: Parameters<typeof executeS05AEvaluationOnSnap>[1]["adapters"], key: string, caseId: string) {
  const snap = fixtureService().store.snapshot();
  const cases = S05A_EVALUATION_CASES.filter((item) => item.id === caseId);
  const run = await executeS05AEvaluationOnSnap(snap, { ...base, idempotencyKey: key, adapters: adapter, cases });
  const readiness = s05aEvaluationReadinessFromSnap(snap, FIXTURE_IDS.orgMaison);
  return { run, readiness, result: snap.aiEvaluationCaseResults.find((item) => item.runId === run.id) };
}

test("fabricating provider is detected", async () => {
  const { run, readiness, result } = await runWith(FabricatingProvider, "neg-fab", "EVAL-S05A-WEDDING-COVERAGE");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "FABRICATED_CLIENT_STATEMENT"));
  assert.equal(readiness.releaseReady, false);
});

test("invented price provider is detected", async () => {
  const { run, result } = await runWith(InventedPriceProvider, "neg-price", "EVAL-S05A-NO-INVENTED-PRICE");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "INVENTED_GOVERNING_PRICE"));
});

test("trait inferring provider is detected", async () => {
  const { run, result } = await runWith(TraitInferringProvider, "neg-trait", "EVAL-S05A-PROTECTED-TRAIT");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "PROTECTED_TRAIT_INFERENCE"));
});

test("consent bypass adapter is detected", async () => {
  const { run, result } = await runWith(ConsentBypassSessionAdapter, "neg-consent", "EVAL-S05A-CONSENT-SPOOF");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "CONSENT_BYPASS"));
});

test("staff leak adapter is detected", async () => {
  const { run, result } = await runWith(StaffLeakingProjectionAdapter, "neg-staff", "EVAL-S05A-CLIENT-PROJECTION");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "STAFF_ONLY_DISCLOSURE"));
});

test("cross-engagement leak adapter is detected", async () => {
  const { run, result } = await runWith(CrossEngagementLeakAdapter, "neg-cross", "EVAL-S05A-CROSS-ENGAGEMENT");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "CROSS_ENGAGEMENT_LEAKAGE" || item.category === "CROSS_ORGANISATION_LEAKAGE"));
});

test("AI governing mutation is detected", async () => {
  const { run, result } = await runWith(AuthorityEscalatingProvider, "neg-ai", "EVAL-S05A-AI-AUTHORITY");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "AI_OPERATIONAL_AUTHORITY"));
});

test("silent conflict resolution is detected", async () => {
  const { run, result } = await runWith(ConflictAutoResolver, "neg-conflict", "EVAL-S05A-PRINCIPALS-CONFLICT");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.some((item) => item.category === "SILENT_CONFLICT_RESOLUTION"));
});

test("prompt injection authority change is detected", async () => {
  const { run, result } = await runWith(InjectionFollowingProvider, "neg-inject", "EVAL-S05A-PROMPT-INJECTION");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.zeroToleranceFailures.length);
});

test("false-success adapter is detected", async () => {
  const { run, result } = await runWith(FalseSuccessMutationAdapter, "neg-false", "EVAL-S05A-FALSE-SUCCESS");
  assert.equal(run.status, "FAILED");
  assert.ok(result?.verdict === "FAILED");
});

test("mutation-sensitivity: unsafe output cannot pass the evaluator", async () => {
  const { run } = await runWith(FabricatingProvider, "neg-meta", "EVAL-S05A-WEDDING-COVERAGE");
  assert.notEqual(run.status, "PASSED");
});
