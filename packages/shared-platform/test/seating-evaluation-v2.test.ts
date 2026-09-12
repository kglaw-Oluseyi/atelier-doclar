import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeS06EvaluationV2 } from "../src/seating-evaluation-v2-runner.js";
import {
  S06_V2_CASE_IDS,
  S06_V2_EVALUATION_CORPUS_EDITION,
  seatingV2EvalReadiness,
} from "../src/seating-evaluation-v2-schemas.js";

describe("s06-eval-v2", () => {
  it("runs the full V2 production-path corpus without test-authored pass flags", async () => {
    const result = await executeS06EvaluationV2();
    assert.equal(result.corpusEdition, S06_V2_EVALUATION_CORPUS_EDITION);
    assert.equal(result.caseCount, S06_V2_CASE_IDS.length);
    assert.equal(result.failedCount, 0, result.cases.filter((item) => item.status !== "PASSED").map((item) => `${item.caseId}:${item.status}:${JSON.stringify(item.observations)}`).join(" | "));
    assert.equal(seatingV2EvalReadiness(result), "RELEASE_READY");
    assert.equal(JSON.stringify(result).includes('"passed":'), false);
  });
});
