import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acaS04DCourse, evaluateAcademyAttempt, questionsForPath } from "@maison-doclar/academy";
import { successCopy } from "../src/server/operational-state.ts";

describe("Event OS ACA-S04D delta", () => {
  it("keeps forecast success copy distinct from RSVP mutation", () => {
    assert.match(successCopy("forecast-run"), /RSVP and guest records were not changed/);
    assert.match(successCopy("provision-decided"), /No vendor order was placed/);
    assert.match(successCopy("academy"), /does not grant Event OS authority/);
  });

  it("scores the planner bank without granting authority", () => {
    const answers = questionsForPath(acaS04DCourse.questions, "PLANNER").map((question) => ({
      questionId: question.id,
      optionId: question.correctOptionId,
    }));
    const result = evaluateAcademyAttempt(
      { courseId: "ACA-S04D", learningPath: "PLANNER", answers },
      acaS04DCourse.questions,
    );
    assert.equal(result.outcome, "DISTINCTION");
    assert.equal(result.grantsOperationalAuthority, false);
  });
});
