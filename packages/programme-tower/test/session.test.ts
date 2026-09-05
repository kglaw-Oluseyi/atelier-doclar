import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_ACCESS_TOKEN,
  SYNTHETIC_SESSION_SECRET,
  SessionError,
  issueSession,
  readSession,
} from "../src/index.js";

const config = {
  accessToken: SYNTHETIC_ACCESS_TOKEN,
  sessionSecret: SYNTHETIC_SESSION_SECRET,
};

describe("bounded session", () => {
  it("issues and reads a valid session", () => {
    const token = issueSession(
      { actorId: "named-reviewer", role: "reader", accessToken: SYNTHETIC_ACCESS_TOKEN, now: "2026-09-05T10:00:00.000Z" },
      config,
    );
    const actor = readSession(token, config, "2026-09-05T10:01:00.000Z");
    assert.equal(actor.actorId, "named-reviewer");
    assert.equal(actor.role, "reader");
  });

  it("rejects a wrong access token", () => {
    assert.throws(
      () => issueSession({ actorId: "x", role: "reader", accessToken: "nope" }, config),
      (error: unknown) => error instanceof SessionError && error.code === "INVALID_TOKEN",
    );
  });

  it("rejects UNKNOWN or Cursor as actor", () => {
    assert.throws(
      () => issueSession({ actorId: "Cursor", role: "executive", accessToken: SYNTHETIC_ACCESS_TOKEN }, config),
      (error: unknown) => error instanceof SessionError && error.code === "INVALID_ACTOR",
    );
  });

  it("rejects a tampered session", () => {
    const token = issueSession(
      { actorId: "named-reviewer", role: "reader", accessToken: SYNTHETIC_ACCESS_TOKEN },
      config,
    );
    assert.throws(
      () => readSession(`${token}x`, config),
      (error: unknown) => error instanceof SessionError && error.code === "INVALID_SESSION",
    );
  });

  it("rejects an expired session", () => {
    const token = issueSession(
      { actorId: "named-reviewer", role: "reader", accessToken: SYNTHETIC_ACCESS_TOKEN, now: "2026-09-05T10:00:00.000Z" },
      { ...config, ttlSeconds: 1 },
    );
    assert.throws(
      () => readSession(token, config, "2026-09-05T12:00:00.000Z"),
      (error: unknown) => error instanceof SessionError && error.code === "EXPIRED_SESSION",
    );
  });

  it("does not leak the synthetic secret in the token", () => {
    const token = issueSession(
      { actorId: "named-reviewer", role: "reader", accessToken: SYNTHETIC_ACCESS_TOKEN },
      config,
    );
    assert.equal(token.includes(SYNTHETIC_SESSION_SECRET), false);
    assert.equal(token.includes(SYNTHETIC_ACCESS_TOKEN), false);
  });
});
