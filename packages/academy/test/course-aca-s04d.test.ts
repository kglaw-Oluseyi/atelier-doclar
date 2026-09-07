import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acaS04DCourse, acaS04DQuestionsFor } from "../src/index.js";

const requiredScenarios = [
  "people-not-containers",
  "multiphase-no-double-count",
  "rsvp-forecast-provision",
  "run-governed-defaults",
  "range-not-certainty",
  "override-maker-checker",
  "provision-separate",
  "recompute-no-rewrite",
  "shadow-calibration",
  "no-sensitive-inference",
  "calm-host-projection",
  "course-not-authority",
];

describe("ACA-S04D course contract", () => {
  it("covers people-counting, product separation, authority and warning scenarios", () => {
    const scenarios = new Set(acaS04DCourse.questions.map((question) => question.scenario));
    for (const scenario of requiredScenarios) {
      assert.ok(scenarios.has(scenario), scenario);
    }
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "single-number"));
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "forecast-is-not-rsvp"));
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "phase-double-count"));
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "sensitive-inference"));
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "no-vendor-commitment"));
    assert.ok(acaS04DCourse.warnings.some((item) => item.id === "course-is-not-authority"));
    assert.ok(acaS04DCourse.lede.includes("training evidence only"));
    assert.match(acaS04DCourse.authorityDisclaimer, /does not grant/i);
    assert.match(acaS04DCourse.modules.map((item) => item.instruction).join(" "), /Ẹ̀bùnolúwa|Tómiwà|Kẹ́mi|Bàbátúndé/);
  });

  it("keeps role-specific banks non-empty and includes the authority question on every path", () => {
    for (const path of ["CEO_OVERSIGHT", "EVENT_DIRECTOR", "PLANNER", "OPERATIONAL_AWARENESS", "AUDITOR_READ_ONLY"] as const) {
      const bank = acaS04DQuestionsFor(path);
      assert.ok(bank.length >= 8, path);
      assert.ok(bank.some((question) => question.id === "q-course-authority"));
    }
  });
});
