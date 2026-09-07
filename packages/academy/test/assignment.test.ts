import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assignAcaS04A, assignAcaS04C, preferredRoleKey } from "../src/index.js";

describe("ACA-S04A assignment", () => {
  it("assigns a learning path from the existing role model and never grants authority", () => {
    assert.equal(assignAcaS04A("CEO").learningPath, "CEO_OVERSIGHT");
    assert.equal(assignAcaS04A("EVENT_DIRECTOR").learningPath, "EVENT_DIRECTOR");
    assert.equal(assignAcaS04A("PLANNER").learningPath, "PLANNER");
    assert.equal(assignAcaS04A("READ_ONLY_AUDITOR").learningPath, "AUDITOR_READ_ONLY");
    assert.equal(assignAcaS04A("SYSTEM_ADMINISTRATOR").learningPath, "OPERATIONAL_AWARENESS");
    assert.equal(assignAcaS04A("CEO").grantsOperationalAuthority, false);
    assert.equal(assignAcaS04C("PLANNER").courseId, "ACA-S04C");
    assert.equal(assignAcaS04C("PLANNER").grantsOperationalAuthority, false);
  });

  it("prefers CEO then director then planner then auditor", () => {
    assert.equal(preferredRoleKey(["PLANNER", "CEO"]), "CEO");
    assert.equal(preferredRoleKey(["READ_ONLY_AUDITOR"]), "READ_ONLY_AUDITOR");
  });
});
