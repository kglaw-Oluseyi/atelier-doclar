import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeS06Evaluation } from "../src/seating-evaluation-runner.js";
import { S06_CASE_IDS, s06CorpusHash } from "../src/seating-evaluation-schemas.js";
import { seatingVerifyAsAllowed, resolveVerifyAsRole } from "../src/seating-verify-as.js";

describe("EOS-S06 evaluation corpus and verify-as gates", () => {
  it("registers 59 independent cases and persists observations before assertions", async () => {
    assert.equal(S06_CASE_IDS.length, 59);
    const result = await executeS06Evaluation();
    assert.equal(result.caseCount, 59);
    assert.equal(result.corpusHash, s06CorpusHash());
    assert.ok(result.cases.every((item) => item.observations.length > 0));
    assert.ok(result.cases.every((item) => !JSON.stringify(item.assertions).includes('"passed":')));
    assert.equal(result.failedCount, 0, result.cases.filter((item) => item.status !== "PASSED").map((item) => item.caseId).join(","));
  });

  it("removes verify-as when production authorised, fixtures off, or flag off", () => {
    assert.equal(seatingVerifyAsAllowed({ productionAuthorised: false, fixturesAllowed: true, flag: true }), true);
    assert.equal(seatingVerifyAsAllowed({ productionAuthorised: true, fixturesAllowed: true, flag: true }), false);
    assert.equal(seatingVerifyAsAllowed({ productionAuthorised: false, fixturesAllowed: false, flag: true }), false);
    assert.equal(seatingVerifyAsAllowed({ productionAuthorised: false, fixturesAllowed: true, flag: false }), false);
    assert.equal(resolveVerifyAsRole("planner"), "planner");
    assert.equal(resolveVerifyAsRole("ceo-admin"), undefined);
  });
});
