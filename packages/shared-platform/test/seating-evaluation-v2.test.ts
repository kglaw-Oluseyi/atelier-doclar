import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { evaluateS06V2Case, executeS06EvaluationV2 } from "../src/seating-evaluation-v2-runner.js";
import {
  S06_V2_CASE_IDS,
  S06_V2_CORPUS_HASH,
  S06_V2_EVALUATION_CONTRACT_VERSION,
  S06_V2_EVALUATION_CORPUS_EDITION,
  S06_V2_PRIOR_CORPUS_STALE_REASON,
  S06_V3_CASE_IDS,
  S06_V3_CORPUS_HASH,
  S06_V3_EVALUATION_CONTRACT_VERSION,
  S06_V3_EVALUATION_CORPUS_EDITION,
  S06_V4_CASE_IDS,
  S06V2AssertionSchema,
  S06V2ObservationSchema,
  s06V2CorpusHash,
  s06V3CorpusHash,
  seatingV2EvalReadiness,
} from "../src/seating-evaluation-v2-schemas.js";
import { SEATING_V2_CONFIG_HASH } from "../src/seating-v2-package.js";
import { SEATING_V2_SOLVER_VERSION, SEATING_V2_VALIDATOR_VERSION } from "../src/seating-v2-schemas.js";
import { emptySeatingV2State } from "../src/seating-v2-state.js";
import { buildSeatingV2Workspace } from "../src/seating-v2-workspace.js";
import { fixtureService, people } from "./helpers.js";

const PRODUCTION_SOURCES = [
  new URL("../src/seating-evaluation-v2-runner.ts", import.meta.url),
  new URL("../src/seating-evaluation-v2-schemas.ts", import.meta.url),
  new URL("../src/seating-v2-command-service.ts", import.meta.url),
  new URL("../src/seating-v2-compiler.ts", import.meta.url),
  new URL("../src/seating-v2-package.ts", import.meta.url),
  new URL("../src/seating-solver-v1.ts", import.meta.url),
  new URL("../src/index.ts", import.meta.url),
];

const TEST_ONLY_IMPORTS = [
  "seating-v2-s075-oracle",
  "seating-v2-s075-differential",
  "detectS075DifferentialMutation",
  "seatingV2ExhaustiveOracle",
  "walkRawIdentity",
  "assertS075DifferentialAgreement",
];

describe("s06-eval-v4", () => {
  it("keeps the frozen v3 corpus hash and does not restamp it", () => {
    assert.equal(S06_V3_EVALUATION_CORPUS_EDITION, "s06-eval-v3");
    assert.equal(S06_V3_EVALUATION_CONTRACT_VERSION, "s06-eval-contract-v2");
    assert.equal(S06_V3_CASE_IDS.length, 35);
    assert.equal(s06V3CorpusHash(), S06_V3_CORPUS_HASH);
    assert.equal(S06_V3_CORPUS_HASH, "e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c");
    assert.notEqual(s06V2CorpusHash(), S06_V3_CORPUS_HASH);
  });

  it("records the current v4 edition, contract, ordered register and configuration hash", () => {
    assert.equal(S06_V2_EVALUATION_CORPUS_EDITION, "s06-eval-v4");
    assert.equal(S06_V2_EVALUATION_CONTRACT_VERSION, "s06-eval-contract-v4");
    assert.equal(S06_V2_CASE_IDS.length, 49);
    assert.deepEqual([...S06_V2_CASE_IDS.slice(0, S06_V3_CASE_IDS.length)], [...S06_V3_CASE_IDS]);
    assert.deepEqual([...S06_V2_CASE_IDS.slice(S06_V3_CASE_IDS.length)], [...S06_V4_CASE_IDS]);
    assert.equal(S06_V4_CASE_IDS.length, 14);
    assert.equal(s06V2CorpusHash(), S06_V2_CORPUS_HASH);
    assert.equal(S06_V2_CORPUS_HASH, "0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369");
    assert.equal(SEATING_V2_CONFIG_HASH, "5e05590ee74b527002c9cabad6d45384094c4f4f5d56ec2730e60a72840ac815");
  });

  it("rejects case-authored pass flags and evaluates only from observations", () => {
    assert.equal(S06V2ObservationSchema.safeParse({ kind: "persisted", name: "x", value: { passed: true } }).success, false);
    assert.equal(S06V2AssertionSchema.safeParse({ name: "x", expected: { passed: true }, compare: "equals" }).success, false);
    const observations = [{ kind: "persisted", name: "runStatus", value: "FEASIBLE" }];
    const assertions = [{ name: "runStatus", expected: "FEASIBLE", compare: "equals" as const }];
    assert.equal(evaluateS06V2Case(observations, assertions), "PASSED");
    assert.equal(evaluateS06V2Case([{ kind: "persisted", name: "runStatus", value: "INFEASIBLE" }], assertions), "FAILED");
  });

  it("makes readiness fail-closed when v3 replaces current or the v4 persist is incomplete", () => {
    assert.equal(seatingV2EvalReadiness({}), "BLOCKED");
    assert.equal(
      seatingV2EvalReadiness({
        status: "PASSED",
        corpusEdition: S06_V3_EVALUATION_CORPUS_EDITION,
        caseCount: S06_V3_CASE_IDS.length,
        failedCount: 0,
      }),
      "BLOCKED",
    );
    assert.equal(
      seatingV2EvalReadiness({
        status: "PASSED",
        corpusEdition: S06_V2_EVALUATION_CORPUS_EDITION,
        caseCount: S06_V3_CASE_IDS.length,
        failedCount: 0,
      }),
      "BLOCKED",
    );
    assert.equal(
      seatingV2EvalReadiness({
        status: "RUNNING",
        corpusEdition: S06_V2_EVALUATION_CORPUS_EDITION,
        caseCount: S06_V2_CASE_IDS.length,
        failedCount: 0,
      }),
      "BLOCKED",
    );
    assert.equal(
      seatingV2EvalReadiness({
        status: "FAILED",
        corpusEdition: S06_V2_EVALUATION_CORPUS_EDITION,
        caseCount: S06_V2_CASE_IDS.length,
        failedCount: 1,
      }),
      "BLOCKED",
    );
    assert.equal(
      seatingV2EvalReadiness({
        status: "PASSED",
        corpusEdition: S06_V2_EVALUATION_CORPUS_EDITION,
        caseCount: S06_V2_CASE_IDS.length,
        failedCount: 0,
      }),
      "RELEASE_READY",
    );
  });

  it("projects a persisted v3 PASSED result as STALE and blocked", () => {
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    const state = emptySeatingV2State();
    state.evaluationRuns.push({
      id: "00000000-0000-4000-8000-000000000010",
      organisationId: people.orgMaison,
      schemaVersion: 1,
      corpusEdition: S06_V3_EVALUATION_CORPUS_EDITION,
      corpusHash: S06_V3_CORPUS_HASH,
      contractVersion: S06_V3_EVALUATION_CONTRACT_VERSION,
      solverVersion: "s06-solver-v2",
      configHash: SEATING_V2_CONFIG_HASH,
      validatorVersion: SEATING_V2_VALIDATOR_VERSION,
      projectionVersion: "seating-projection-v2",
      status: "PASSED",
      caseCount: S06_V3_CASE_IDS.length,
      passedCount: S06_V3_CASE_IDS.length,
      failedCount: 0,
      createdBy: people.personCeo,
      createdAt: "2026-09-13T12:00:00.000Z",
    });
    const view = buildSeatingV2Workspace(store.snapshot(), state, people.eventAlphaOne, "PLANNER");
    const evaluation = view.evaluation;
    assert.ok(evaluation);
    assert.equal(evaluation.status, "STALE");
    assert.equal(evaluation.caseCount, S06_V3_CASE_IDS.length);
    assert.equal(typeof evaluation.corpusEdition, "string");
    assert.match(evaluation.corpusEdition ?? "", /s06-eval-v3/);
    assert.match(evaluation.corpusEdition ?? "", new RegExp(S06_V2_PRIOR_CORPUS_STALE_REASON.replaceAll(".", "\\.")));
    assert.equal(seatingV2EvalReadiness(state.evaluationRuns[0]!), "BLOCKED");
  });

  it("does not let the production corpus import the independent oracle or test-only mutation adapters", async () => {
    for (const url of PRODUCTION_SOURCES) {
      const source = await readFile(url, "utf8");
      for (const banned of TEST_ONLY_IMPORTS) {
        assert.equal(source.includes(banned), false, `${url.pathname} imports ${banned}`);
      }
    }
  });

  it("runs the clean v4 production-path corpus, then detects corrupted outcomes", async () => {
    const result = await executeS06EvaluationV2();
    assert.equal(result.corpusEdition, "s06-eval-v4");
    assert.equal(result.contractVersion, "s06-eval-contract-v4");
    assert.equal(result.solverVersion, SEATING_V2_SOLVER_VERSION);
    assert.equal(result.validatorVersion, SEATING_V2_VALIDATOR_VERSION);
    assert.equal(result.configHash, SEATING_V2_CONFIG_HASH);
    assert.equal(result.corpusHash, s06V2CorpusHash());
    assert.equal(result.caseCount, S06_V2_CASE_IDS.length);
    assert.deepEqual(
      result.cases.map((item) => item.caseId),
      [...S06_V2_CASE_IDS],
    );
    assert.equal(
      result.failedCount,
      0,
      result.cases
        .filter((item) => item.status !== "PASSED")
        .map((item) => `${item.caseId}:${item.status}:${JSON.stringify(item.observations)}`)
        .join(" | "),
    );
    assert.equal(result.status, "PASSED");
    assert.equal(seatingV2EvalReadiness(result), "RELEASE_READY");
    assert.equal(JSON.stringify(result).includes('"passed":'), false);
    assert.ok(result.cases.every((item) => item.observations.length > 0));

    const flipped = structuredClone(result);
    const target = flipped.cases.find((item) => item.caseId === "S06V4-PATH-01");
    assert.ok(target);
    const observation = target.observations.find((item) => item.name === "runStatus");
    assert.ok(observation);
    observation.value = "INFEASIBLE";
    target.status = evaluateS06V2Case(target.observations, target.assertions);
    flipped.failedCount = flipped.cases.filter((item) => item.status !== "PASSED").length;
    flipped.passedCount = flipped.cases.filter((item) => item.status === "PASSED").length;
    flipped.status = "FAILED";
    assert.equal(target.status, "FAILED");
    assert.equal(seatingV2EvalReadiness(flipped), "BLOCKED");

    const restampedV3 = { ...result, corpusEdition: S06_V3_EVALUATION_CORPUS_EDITION, status: "PASSED" as const, failedCount: 0 };
    assert.equal(seatingV2EvalReadiness(restampedV3), "BLOCKED");

    const countMismatch = { ...result, caseCount: S06_V3_CASE_IDS.length };
    assert.equal(seatingV2EvalReadiness(countMismatch), "BLOCKED");

    const falseReady = { ...result, status: "PASSED" as const, failedCount: 1 };
    assert.equal(seatingV2EvalReadiness(falseReady), "BLOCKED");
  });
});
