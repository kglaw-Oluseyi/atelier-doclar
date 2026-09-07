import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_CATALOGUE,
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  ACA_S04D_COURSE_VERSION,
  acaS04CCourse,
  acaS04DCourse,
  applyAcademyCatalogueSeed,
  assignAcaS04D,
  evaluateAcademyAttempt,
  outcomeForPercent,
  questionsForPath,
  resolveAcademyCourseRef,
} from "@maison-doclar/academy";

describe("ACA-S04D catalogue delivery", () => {
  it("registers ACA-S04D as routeable with version and eligible-role assignment", () => {
    const entry = resolveAcademyCourseRef("ACA-S04D");
    const slug = resolveAcademyCourseRef("aca-s04d");
    assert.ok(entry);
    assert.equal(entry?.id, ACA_S04D_COURSE_ID);
    assert.equal(entry?.href, "/app/academy/ACA-S04D");
    assert.equal(entry?.version, ACA_S04D_COURSE_VERSION);
    assert.equal(slug?.id, ACA_S04D_COURSE_ID);
    assert.ok(ACADEMY_CATALOGUE.some((item) => item.id === ACA_S04C_COURSE_ID));
    for (const role of ["CEO", "EVENT_DIRECTOR", "PLANNER", "READ_ONLY_AUDITOR", "CLIENT_LEAD"] as const) {
      const assigned = assignAcaS04D(role);
      assert.equal(assigned.assigned, true);
      assert.equal(assigned.grantsOperationalAuthority, false);
    }
  });

  it("keeps distinction at 90, pass at 80-89, retake below 80, and completion grants no authority", () => {
    assert.equal(ACADEMY_DISTINCTION_THRESHOLD, 90);
    assert.equal(ACADEMY_PASS_THRESHOLD, 80);
    assert.equal(outcomeForPercent(90), "DISTINCTION");
    assert.equal(outcomeForPercent(89), "PASS");
    assert.equal(outcomeForPercent(80), "PASS");
    assert.equal(outcomeForPercent(79), "RETAKE_REQUIRED");
    const answers = questionsForPath(acaS04DCourse.questions, "PLANNER").map((question) => ({
      questionId: question.id,
      optionId: question.correctOptionId,
    }));
    const distinction = evaluateAcademyAttempt({ courseId: "ACA-S04D", learningPath: "PLANNER", answers }, acaS04DCourse.questions);
    assert.equal(distinction.outcome, "DISTINCTION");
    assert.equal(distinction.grantsOperationalAuthority, false);
    const almost = evaluateAcademyAttempt(
      {
        courseId: "ACA-S04D",
        learningPath: "PLANNER",
        answers: answers.map((answer, index) =>
          index === 0
            ? { ...answer, optionId: acaS04DCourse.questions.find((item) => item.id === answer.questionId)?.options.find((option) => option.id !== answer.optionId)?.id ?? answer.optionId }
            : answer,
        ),
      },
      acaS04DCourse.questions,
    );
    assert.ok(almost.percent < 100);
    if (almost.percent >= 80 && almost.percent <= 89) assert.equal(almost.outcome, "PASS");
    if (almost.percent < 80) assert.equal(almost.outcome, "RETAKE_REQUIRED");
  });

  it("replays catalogue seed without duplicating ACA-S04D and leaves ACA-S04C intact", () => {
    const once = applyAcademyCatalogueSeed([]);
    const twice = applyAcademyCatalogueSeed(once);
    assert.equal(once.filter((item) => item.id === ACA_S04D_COURSE_ID).length, 1);
    assert.equal(twice.filter((item) => item.id === ACA_S04D_COURSE_ID).length, 1);
    assert.equal(twice.filter((item) => item.id === ACA_S04C_COURSE_ID).length, 1);
    assert.equal(acaS04CCourse.id, ACA_S04C_COURSE_ID);
    assert.equal(twice.length, ACADEMY_CATALOGUE.length);
  });
});
