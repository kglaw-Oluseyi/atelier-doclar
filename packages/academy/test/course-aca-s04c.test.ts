import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acaS04CCourse, acaS04CQuestionsFor } from "../src/index.js";

const requiredScenarios = [
  "offer-not-invitation",
  "household-not-guest",
  "cohort-no-merge",
  "cap-consent",
  "no-inferred-size",
  "no-payment",
  "vendor-least-privilege",
  "vendor-no-core-mutation",
  "cross-vendor",
  "exception-handling",
  "course-not-authority",
];

describe("ACA-S04C course contract", () => {
  it("covers privacy, vendor, identity, consent and exception scenarios", () => {
    const scenarios = new Set(acaS04CCourse.questions.map((question) => question.scenario));
    for (const scenario of requiredScenarios) {
      assert.ok(scenarios.has(scenario), scenario);
    }
    assert.ok(acaS04CCourse.warnings.some((item) => item.id === "prohibited-measurement"));
    assert.ok(acaS04CCourse.warnings.some((item) => item.id === "course-is-not-authority"));
    assert.ok(acaS04CCourse.lede.includes("training evidence only"));
    assert.match(acaS04CCourse.authorityDisclaimer, /does not grant/i);
    assert.match(acaS04CCourse.modules.map((item) => item.instruction).join(" "), /Bàbátúndé|Ọmọ́tọ́lá|Olúfẹ́mi/);
  });

  it("keeps role-specific banks non-empty and includes the authority question on every path", () => {
    for (const path of ["CEO_OVERSIGHT", "EVENT_DIRECTOR", "PLANNER", "OPERATIONAL_AWARENESS", "AUDITOR_READ_ONLY"] as const) {
      const bank = acaS04CQuestionsFor(path);
      assert.ok(bank.length >= 8, path);
      assert.ok(bank.some((question) => question.id === "q-course-authority"));
    }
  });
});
