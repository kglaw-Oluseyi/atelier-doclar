import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_CATALOGUE,
  ACADEMY_DISTINCTION_THRESHOLD,
  ACADEMY_PASS_THRESHOLD,
  ACA_S04E_COURSE_ID,
  ACA_S04F_COURSE_ID,
  ACA_S04F_COURSE_VERSION,
  acaS04FCourse,
  applyAcademyCatalogueSeed,
  assignAcaS04F,
  evaluateAcademyAttempt,
  outcomeForPercent,
  questionsForPath,
  resolveAcademyCourseRef,
} from "@maison-doclar/academy";

describe("ACA-S04F catalogue delivery", () => {
  it("registers ACA-S04F as routeable with version and eligible-role assignment", () => {
    const entry = resolveAcademyCourseRef("ACA-S04F");
    const slug = resolveAcademyCourseRef("aca-s04f");
    assert.ok(entry);
    assert.equal(entry?.id, ACA_S04F_COURSE_ID);
    assert.equal(entry?.href, "/app/academy/ACA-S04F");
    assert.equal(entry?.version, ACA_S04F_COURSE_VERSION);
    assert.equal(slug?.id, ACA_S04F_COURSE_ID);
    assert.ok(ACADEMY_CATALOGUE.some((item) => item.id === ACA_S04E_COURSE_ID));
    for (const role of ["CEO", "EVENT_DIRECTOR", "PLANNER", "READ_ONLY_AUDITOR", "CLIENT_LEAD"] as const) {
      const assigned = assignAcaS04F(role);
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
    const answers = questionsForPath(acaS04FCourse.questions, "PLANNER").map((question) => ({
      questionId: question.id,
      optionId: question.correctOptionId,
    }));
    const distinction = evaluateAcademyAttempt({ courseId: "ACA-S04F", learningPath: "PLANNER", answers }, acaS04FCourse.questions);
    assert.equal(distinction.outcome, "DISTINCTION");
    assert.equal(distinction.grantsOperationalAuthority, false);
  });

  it("replays catalogue seed without duplicating ACA-S04F and leaves ACA-S04E intact", () => {
    const once = applyAcademyCatalogueSeed([]);
    const twice = applyAcademyCatalogueSeed(once);
    assert.equal(once.filter((item) => item.id === ACA_S04F_COURSE_ID).length, 1);
    assert.equal(twice.filter((item) => item.id === ACA_S04F_COURSE_ID).length, 1);
    assert.equal(twice.filter((item) => item.id === ACA_S04E_COURSE_ID).length, 1);
    assert.equal(twice.length, ACADEMY_CATALOGUE.length);
  });
});
