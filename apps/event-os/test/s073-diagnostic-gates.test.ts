import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diagnosticGate } from "../src/server/event-os-diagnostic";

describe("S073 diagnostic gates", () => {
  it("is unavailable when the temporary token is unset", () => {
    const previous = process.env.EVENT_OS_DIAGNOSTIC_TOKEN;
    const fixtures = process.env.EVENT_OS_ALLOW_FIXTURES;
    delete process.env.EVENT_OS_DIAGNOSTIC_TOKEN;
    process.env.EVENT_OS_ALLOW_FIXTURES = "1";
    try {
      assert.equal(diagnosticGate("any-token-value-here"), "UNAVAILABLE");
    } finally {
      if (previous === undefined) delete process.env.EVENT_OS_DIAGNOSTIC_TOKEN;
      else process.env.EVENT_OS_DIAGNOSTIC_TOKEN = previous;
      if (fixtures === undefined) delete process.env.EVENT_OS_ALLOW_FIXTURES;
      else process.env.EVENT_OS_ALLOW_FIXTURES = fixtures;
    }
  });

  it("denies a missing or unequal token and rate-limits a valid token", () => {
    const previous = process.env.EVENT_OS_DIAGNOSTIC_TOKEN;
    const fixtures = process.env.EVENT_OS_ALLOW_FIXTURES;
    process.env.EVENT_OS_DIAGNOSTIC_TOKEN = "s073-unit-diagnostic-token";
    process.env.EVENT_OS_ALLOW_FIXTURES = "1";
    try {
      assert.equal(diagnosticGate(undefined), "DENIED");
      assert.equal(diagnosticGate("wrong-token"), "DENIED");
      assert.equal(diagnosticGate("s073-unit-diagnostic-token"), "OK");
      assert.equal(diagnosticGate("s073-unit-diagnostic-token"), "RATE_LIMITED");
    } finally {
      if (previous === undefined) delete process.env.EVENT_OS_DIAGNOSTIC_TOKEN;
      else process.env.EVENT_OS_DIAGNOSTIC_TOKEN = previous;
      if (fixtures === undefined) delete process.env.EVENT_OS_ALLOW_FIXTURES;
      else process.env.EVENT_OS_ALLOW_FIXTURES = fixtures;
    }
  });
});
