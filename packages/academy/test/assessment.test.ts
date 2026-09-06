import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  acaS04ACourse,
  evaluateAcademyAttempt,
  outcomeForPercent,
  questionsForPath,
} from "../src/index.js";

function answersFor(path: "CEO_OVERSIGHT" | "PLANNER", mutate?: (id: string) => string) {
  return questionsForPath(acaS04ACourse.questions, path).map((question) => ({
    questionId: question.id,
    optionId: mutate?.(question.id) ?? question.correctOptionId,
  }));
}

describe("ACA-S04A assessment thresholds", () => {
  it("keeps distinction at 90 and pass at 80", () => {
    assert.equal(ACADEMY_DISTINCTION_THRESHOLD, 90);
    assert.equal(ACADEMY_PASS_THRESHOLD, 80);
    assert.equal(outcomeForPercent(90), "DISTINCTION");
    assert.equal(outcomeForPercent(89), "PASS");
    assert.equal(outcomeForPercent(80), "PASS");
    assert.equal(outcomeForPercent(79), "RETAKE_REQUIRED");
  });

  it("records distinction without granting authority", () => {
    const result = evaluateAcademyAttempt(
      { courseId: "ACA-S04A", learningPath: "CEO_OVERSIGHT", answers: answersFor("CEO_OVERSIGHT") },
      acaS04ACourse.questions,
    );
    assert.equal(result.outcome, "DISTINCTION");
    assert.equal(result.percent, 100);
    assert.equal(result.grantsOperationalAuthority, false);
    assert.equal(result.grantsRoleAssignment, false);
    assert.equal(result.signsProtectedGate, false);
    assert.equal(result.authorisesProduction, false);
    assert.equal(result.specialistApproval, false);
  });

  it("requires a retake below 80 percent", () => {
    const result = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04A",
        learningPath: "PLANNER",
        answers: answersFor("PLANNER", () => "c"),
      },
      acaS04ACourse.questions,
    );
    assert.equal(result.outcome, "RETAKE_REQUIRED");
    assert.ok(result.percent < 80);
  });
});
