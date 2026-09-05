import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { assertSessionConfig, issueSession, readSession } from "../src/session.js";
import { people } from "./helpers.js";

describe("session", () => {
  const config = {
    accessToken: "event-os-access-token-not-for-production",
    sessionSecret: "event-os-session-secret-not-for-production",
  };

  it("issues a person-scoped session without a role claim", () => {
    const token = issueSession({ personId: people.personCeo, accessToken: config.accessToken }, config);
    const session = readSession(token, config);
    assert.equal(session.personId, people.personCeo);
    assert.equal("role" in session, false);
  });

  it("fails closed on synthetic secrets in production", () => {
    assert.throws(() => assertSessionConfig(config, true), PlatformError);
    assert.doesNotThrow(() => assertSessionConfig(config, false));
  });
});
