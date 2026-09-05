import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_ACCESS_TOKEN,
  SYNTHETIC_SESSION_SECRET,
  issueSession,
  readSession,
} from "@maison-doclar/programme-tower";

describe("control-tower session wiring", () => {
  it("uses the bounded non-production session config", () => {
    const config = {
      accessToken: process.env.PROGRAMME_ACCESS_TOKEN ?? SYNTHETIC_ACCESS_TOKEN,
      sessionSecret: process.env.PROGRAMME_SESSION_SECRET ?? SYNTHETIC_SESSION_SECRET,
    };
    const token = issueSession(
      { actorId: "named-reviewer", role: "executive", accessToken: config.accessToken },
      config,
    );
    const actor = readSession(token, config);
    assert.equal(actor.role, "executive");
    assert.notEqual(actor.actorId, "Cursor");
  });
});
