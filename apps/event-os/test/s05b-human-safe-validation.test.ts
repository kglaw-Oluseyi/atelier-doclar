import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "@maison-doclar/shared-platform";
import { classifyActionError } from "../src/server/operational-state.ts";
import {
  buildActionResult,
  forgetActionResult,
  presentActionResult,
  rememberActionResult,
  resolveStoredActionResult,
  sessionHashFromToken,
} from "../src/server/action-result.ts";

const ACTOR = "00000000-0000-4000-8000-000000000041";
const PROTECTION = "/app/protection";
const EVENT_PATH = "/app/events/00000000-0000-4000-8000-000000000021/protection";

function result(input: { actionType: string; correlationId: string; scopePath?: string }) {
  return buildActionResult({
    sessionHash: sessionHashFromToken("session-a"),
    actorPersonId: ACTOR,
    scopePath: input.scopePath ?? PROTECTION,
    actionType: input.actionType,
    correlationId: input.correlationId,
    status: "SUCCESS",
    code: "SUCCESS",
    message: "Protection command applied.",
  });
}

describe("EOS-S05B action-result scope and consumption", () => {
  it("does not recall a consumed result after unrelated navigation without a query id", () => {
    const stored = result({
      actionType: "risk.evaluation.run",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    rememberActionResult(stored);
    forgetActionResult(stored.correlationId);
    const recalled = resolveStoredActionResult({
      queryStored: undefined,
      cookie: stored,
      requestPath: PROTECTION,
    });
    assert.equal(recalled, undefined);
    const presented = presentActionResult({
      stored: recalled,
      sessionHash: sessionHashFromToken("session-a"),
      actorPersonId: ACTOR,
      requestPath: PROTECTION,
    });
    assert.equal(presented.view, undefined);
    assert.equal(presented.shouldConsume, false);
  });

  it("does not present a Protection result on an event workspace path without matching scope", () => {
    const stored = result({
      actionType: "risk.policy.create",
      correlationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    const resolved = resolveStoredActionResult({
      cookie: stored,
      requestPath: EVENT_PATH,
    });
    assert.equal(resolved, undefined);
    const crossActor = presentActionResult({
      stored,
      sessionHash: sessionHashFromToken("session-a"),
      actorPersonId: "00000000-0000-4000-8000-000000000042",
      requestPath: PROTECTION,
      resultId: stored.correlationId,
    });
    assert.equal(crossActor.view, undefined);
  });

  it("classifies Zod payloads as expected validation, never raw JSON or a server failure", () => {
    const classified = classifyActionError({
      name: "ZodError",
      issues: [{ path: ["insurerPartyId"], message: "Invalid uuid", code: "invalid_string" }],
    });
    assert.equal(classified.code, "VALIDATION_FAILED");
    assert.equal(classified.kind, "validation");
    assert.doesNotMatch(classified.message, /Invalid uuid|insurerPartyId|\[\{/);
    const leaked = classifyActionError(new Error(JSON.stringify({ issues: [{ path: "insurerPartyId" }] })));
    assert.equal(leaked.code, "INTERNAL_ERROR");
    assert.equal(leaked.message, "The request could not be completed.");
    const validation = classifyActionError(new PlatformError("VALIDATION_FAILED", "Choose an insurer from the governed party register.", { field: "insurerPartyId" }));
    assert.equal(validation.code, "VALIDATION_FAILED");
    assert.doesNotMatch(validation.message, /invalid uuid/i);
  });
});
