import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { assertSessionConfig, issueSession, readSession } from "../src/session.js";
import { people } from "./helpers.js";

describe("session", () => {
  const config = {
    accessToken: "event-os-access-token-not-for-production",
    sessionSecret: "event-os-session-secret-not-for-production",
  };

  it("issues a person-scoped session bound to a session id without a role claim", () => {
    const { token, actor } = issueSession({ personId: people.personCeo, accessToken: config.accessToken }, config);
    const session = readSession(token, config);
    assert.equal(session.personId, people.personCeo);
    assert.equal(session.sessionId, actor.sessionId);
    assert.equal("role" in session, false);
  });

  it("denies a legacy token that lacks a session id", () => {
    const payload = Buffer.from(
      JSON.stringify({
        personId: people.personCeo,
        issuedAt: "2026-09-05T15:00:00.000Z",
        expiresAt: "2026-09-06T15:00:00.000Z",
      }),
      "utf8",
    ).toString("base64url");
    const token = `${payload}.${createHmac("sha256", config.sessionSecret).update(payload).digest("base64url")}`;
    assert.throws(
      () => readSession(token, config, "2026-09-05T15:00:00.000Z"),
      (error: unknown) =>
        error instanceof PlatformError && error.code === "AUTH_REQUIRED" && error.details?.[0] === "legacy",
    );
  });

  it("fails closed on synthetic secrets in production", () => {
    assert.throws(() => assertSessionConfig(config, true), PlatformError);
    assert.doesNotThrow(() => assertSessionConfig(config, false));
  });
});
