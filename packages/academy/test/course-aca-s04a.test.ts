import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acaS04ACourse, acaS04AQuestionsFor } from "../src/index.js";

const requiredScenarios = [
  "titled-adult",
  "formal-familiar",
  "blank-title",
  "child-no-dob",
  "household",
  "entourage",
  "independent-identities",
  "issue-entitlement",
  "accept-entitlement",
  "decline-entitlement",
  "expire-entitlement",
  "revoke-entitlement",
  "materialise-once",
  "preserve-lineage",
  "title-correction",
  "relationship-correction",
];

describe("ACA-S04A course contract", () => {
  it("covers every required scenario and governance warning", () => {
    const scenarios = new Set(acaS04ACourse.questions.map((question) => question.scenario));
    for (const scenario of requiredScenarios) {
      assert.ok(scenarios.has(scenario), scenario);
    }
    assert.ok(acaS04ACourse.warnings.some((item) => item.id === "inferred-title"));
    assert.ok(acaS04ACourse.warnings.some((item) => item.id === "course-is-not-authority"));
    assert.ok(acaS04ACourse.lede.includes("training evidence only"));
    assert.match(acaS04ACourse.authorityDisclaimer, /does not grant/i);
    assert.match(acaS04ACourse.modules.map((item) => item.instruction).join(" "), /Ọmọ́tọ́lá|Ẹ̀bùnolúwa/);
  });

  it("keeps role-specific banks non-empty and includes the authority question on every path", () => {
    for (const path of ["CEO_OVERSIGHT", "EVENT_DIRECTOR", "PLANNER", "OPERATIONAL_AWARENESS", "AUDITOR_READ_ONLY"] as const) {
      const bank = acaS04AQuestionsFor(path);
      assert.ok(bank.length >= 8, path);
      assert.ok(bank.some((question) => question.id === "q-course-authority"));
    }
  });
});
