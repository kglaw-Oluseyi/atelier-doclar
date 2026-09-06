import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acaS04ACourse, evaluateAcademyAttempt, questionsForPath } from "@maison-doclar/academy";
import { successCopy } from "../src/server/operational-state.ts";

describe("Event OS Academy delta", () => {
  it("keeps academy success copy distinct from operational authorisation", () => {
    assert.match(successCopy("academy"), /does not grant Event OS authority/);
  });

  it("scores the planner bank without granting authority", () => {
    const answers = questionsForPath(acaS04ACourse.questions, "PLANNER").map((question) => ({
      questionId: question.id,
      optionId: question.correctOptionId,
    }));
    const result = evaluateAcademyAttempt(
      { courseId: "ACA-S04A", learningPath: "PLANNER", answers },
      acaS04ACourse.questions,
    );
    assert.equal(result.outcome, "DISTINCTION");
    assert.equal(result.grantsOperationalAuthority, false);
  });
});
