import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { S05B_EVALUATION_CASES, s05bEvaluationCorpusHash, validateS05BEvaluationCorpus } from "../src/risk-evaluation-corpus.js";
import { S05B_EVALUATION_CORPUS_EDITION } from "../src/risk-evaluation-schemas.js";
import { detectUnsafeFromObservations, executeS05BCase } from "../src/risk-evaluation-fixtures.js";
import { executeS05BEvaluationOnSnap } from "../src/risk-evaluation-runner.js";
import { s05bEvaluationReadinessFromSnap } from "../src/risk-evaluation-projections.js";
import { migrateEosS05B } from "../src/risk-migration.js";
import { fixtureService, people } from "./helpers.js";

describe("EOS-S05B evaluation v3", () => {
  it("registers an honest typed corpus and does not accept v2 as current", () => {
    validateS05BEvaluationCorpus();
    assert.equal(S05B_EVALUATION_CORPUS_EDITION, "s05b-eval-v4");
    assert.ok(S05B_EVALUATION_CASES.length >= 40);
    assert.equal(
      S05B_EVALUATION_CASES.some((item) => JSON.stringify(item).includes('"passed":')),
      false,
    );
    assert.equal(
      S05B_EVALUATION_CASES.some((item) => item.family === "ACCESSIBILITY"),
      false,
    );
    const signatures = new Set(S05B_EVALUATION_CASES.map((item) => JSON.stringify({ actions: item.actions, expected: item.expected })));
    assert.equal(signatures.size, S05B_EVALUATION_CASES.length);
    assert.ok(s05bEvaluationCorpusHash().length > 16);
  });

  it("runs the current corpus against production functions", () => {
    const { store } = fixtureService();
    const migrated = migrateEosS05B(store.snapshot());
    store.replace(migrated.snapshot);
    const snap = store.snapshot();
    const run = executeS05BEvaluationOnSnap(snap, {
      organisationId: people.orgMaison,
      requestedByPersonId: people.personCeo,
      correlationId: "eval-v3",
      idempotencyKey: "eval-v3-key-01",
      applicationSha: "local-dev",
      now: "2026-09-10T10:00:00.000Z",
    });
    store.replace(snap);
    if (run.status !== "PASSED") {
      const failed = store.snapshot().riskEvaluationCaseResults.filter((item) => item.runId === run.id && item.verdict !== "PASSED");
      assert.equal(run.status, "PASSED", failed.map((item) => `${item.caseId}:${item.diagnosticSummary}`).join(" | "));
    }
    const ready = s05bEvaluationReadinessFromSnap(store.snapshot(), people.orgMaison);
    assert.equal(ready.evaluationStatus, "PASSED");
    assert.equal(ready.corpusEdition, "s05b-eval-v4");
    assert.equal(ready.persistedResultCount, S05B_EVALUATION_CASES.length);
    assert.equal(ready.caseCount, S05B_EVALUATION_CASES.length);
  });

  it("detects negative controls from corrupted observations, not adapter flags", () => {
    const clean = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-APP-01")!);
    assert.equal(detectUnsafeFromObservations(clean).includes("FABRICATED_COVERAGE"), false);
    const fabricated = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-APP-01")!, { fabricateCoverage: true });
    assert.ok(detectUnsafeFromObservations(fabricated).includes("FABRICATED_COVERAGE"));
    const roster = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-ROSTER-01")!);
    assert.equal(detectUnsafeFromObservations(roster).includes("FALSE_SUCCESS"), false);
    const falsed = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-ROSTER-01")!, { falseSuccess: true });
    assert.ok(detectUnsafeFromObservations(falsed).includes("FALSE_SUCCESS"));
    const priced = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-BUDGET-01")!, { inventPremium: true });
    assert.ok(detectUnsafeFromObservations(priced).includes("INVENTED_PRICE"));
    const unicode = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-UNICODE-01")!, { unicodeLoss: true });
    assert.ok(detectUnsafeFromObservations(unicode).includes("UNICODE_LOSS"));
    const auditor = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-AUTH-AUDITOR-DOSSIER-DENY")!);
    assert.equal(detectUnsafeFromObservations(auditor).includes("AUTHORITY_ESCALATION"), false);
    assert.ok(
      detectUnsafeFromObservations([
        ...auditor,
        { kind: "COMMAND_DENIAL", code: "SUCCESS", didDataChange: true, auditOutcome: "SUCCESS" },
      ]).includes("AUTHORITY_ESCALATION"),
    );
    const lastGood = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-DOSSIER-LAST-GOOD-DURING-DRAFT")!);
    assert.equal(detectUnsafeFromObservations(lastGood).includes("FALSE_SUCCESS"), false);
    assert.ok(
      detectUnsafeFromObservations(
        lastGood.map((item) => (item.kind === "HASH" && item.name === "publication" ? { ...item, matches: false } : item)),
      ).includes("FALSE_SUCCESS"),
    );
    const checkpoint = executeS05BCase(S05B_EVALUATION_CASES.find((item) => item.id === "S05B-CHECKPOINT-PROJECTION-NO-DISPATCH")!);
    assert.equal(detectUnsafeFromObservations(checkpoint).includes("SILENT_DISPATCH"), false);
    assert.ok(
      detectUnsafeFromObservations([...checkpoint, { kind: "EXTERNAL_EFFECT_COUNT", effect: "checkpoint.dispatch", count: 1 }]).includes(
        "SILENT_DISPATCH",
      ),
    );
  });

  it("treats a v2 corpus hash as stale", () => {
    const { store } = fixtureService();
    const snap = store.snapshot();
    snap.riskEvaluationRuns.push({
      id: "00000000-0000-4000-8000-000000000401",
      organisationId: people.orgMaison,
      corpusEdition: "s05b-eval-v2",
      corpusHash: "old",
      orchestratorVersion: "s05b-orchestrator-v2",
      providerVersion: "fixture-inactive-v2",
      projectionPolicyVersion: "risk-projection-v2",
      evaluationContractVersion: "s05b-eval-contract-v2",
      applicationSha: "old",
      status: "PASSED",
      caseCount: 52,
      passedCount: 52,
      failedCount: 0,
      errorCount: 0,
      zeroToleranceFailed: false,
      requestedByPersonId: people.personCeo,
      correlationId: "old",
      idempotencyKey: "old",
      version: 1,
      schemaVersion: 1,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });
    store.replace(snap);
    const ready = s05bEvaluationReadinessFromSnap(store.snapshot(), people.orgMaison);
    assert.equal(ready.evaluationStatus, "STALE");
    assert.equal(ready.releaseReady, false);
  });
});
