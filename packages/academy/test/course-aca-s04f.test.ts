import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  acaS04FCourse,
  acaS04FQuestionsFor,
  assignAcaS04F,
  evaluateAcademyAttempt,
} from "../src/index.js";

describe("ACA-S04F", () => {
  it("assigns training evidence only and scores distinction at 90", () => {
    assert.equal(assignAcaS04F("PLANNER").courseId, "ACA-S04F");
    assert.equal(assignAcaS04F("PLANNER").grantsOperationalAuthority, false);
    const questions = acaS04FQuestionsFor("PLANNER");
    assert.equal(questions.length, 12);
    const perfect = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04F",
        learningPath: "PLANNER",
        answers: questions.map((question) => ({ questionId: question.id, optionId: question.correctOptionId })),
      },
      acaS04FCourse.questions,
    );
    assert.equal(perfect.percent, 100);
    assert.equal(perfect.outcome, "DISTINCTION");
    assert.ok(perfect.percent >= ACADEMY_DISTINCTION_THRESHOLD);
    const ten = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04F",
        learningPath: "PLANNER",
        answers: questions.map((question, index) => ({
          questionId: question.id,
          optionId: index < 10 ? question.correctOptionId : question.options.find((item) => item.id !== question.correctOptionId)?.id ?? "a",
        })),
      },
      acaS04FCourse.questions,
    );
    assert.equal(ten.percent, 83);
    assert.equal(ten.outcome, "PASS");
    assert.ok(ten.percent >= ACADEMY_PASS_THRESHOLD);
  });
});
