import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  acaS04ECourse,
  acaS04EQuestionsFor,
  assignAcaS04E,
  evaluateAcademyAttempt,
} from "../src/index.js";

describe("ACA-S04E", () => {
  it("assigns training evidence only and scores distinction at 90", () => {
    assert.equal(assignAcaS04E("PLANNER").courseId, "ACA-S04E");
    assert.equal(assignAcaS04E("PLANNER").grantsOperationalAuthority, false);
    const questions = acaS04EQuestionsFor("PLANNER");
    assert.equal(questions.length, 10);
    const perfect = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04E",
        learningPath: "PLANNER",
        answers: questions.map((question) => ({ questionId: question.id, optionId: question.correctOptionId })),
      },
      acaS04ECourse.questions,
    );
    assert.equal(perfect.percent, 100);
    assert.equal(perfect.outcome, "DISTINCTION");
    assert.ok(perfect.percent >= ACADEMY_DISTINCTION_THRESHOLD);
    const eight = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04E",
        learningPath: "PLANNER",
        answers: questions.map((question, index) => ({
          questionId: question.id,
          optionId: index < 8 ? question.correctOptionId : question.options.find((item) => item.id !== question.correctOptionId)?.id ?? "a",
        })),
      },
      acaS04ECourse.questions,
    );
    assert.equal(eight.percent, 80);
    assert.equal(eight.outcome, "PASS");
    assert.ok(eight.percent >= ACADEMY_PASS_THRESHOLD);
  });
});
