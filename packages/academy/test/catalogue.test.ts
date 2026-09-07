import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACADEMY_CATALOGUE,
  ACA_S04C_COURSE_ID,
  ACA_S04D_COURSE_ID,
  applyAcademyCatalogueSeed,
  resolveAcademyCourseRef,
} from "../src/index.js";

describe("academy catalogue", () => {
  it("resolves ACA-S04D from canonical id and slug without duplicating on replay", () => {
    assert.equal(resolveAcademyCourseRef("ACA-S04D")?.id, ACA_S04D_COURSE_ID);
    assert.equal(resolveAcademyCourseRef("aca-s04d")?.href, "/app/academy/ACA-S04D");
    const replayed = applyAcademyCatalogueSeed(applyAcademyCatalogueSeed([...ACADEMY_CATALOGUE]));
    assert.equal(replayed.filter((item) => item.id === ACA_S04D_COURSE_ID).length, 1);
    assert.equal(replayed.filter((item) => item.id === ACA_S04C_COURSE_ID).length, 1);
  });
});
