import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PlatformError } from "@maison-doclar/shared-platform";
import { classifyActionError } from "../src/server/operational-state.ts";
import { runDurableProtectionMutation, writeTruthfulActionResult } from "../src/server/protection-form-lifecycle.ts";

const formActionPath = fileURLToPath(new URL("../src/server/protection-form-action.ts", import.meta.url));

describe("MD-PR-S060 persistence/redirect boundary", () => {
  it("does not call redirect inside withDurable in runProtectionFormAction", () => {
    const source = readFileSync(formActionPath, "utf8");
    assert.match(source, /writeTruthfulActionResult/);
    assert.match(source, /runDurableProtectionMutation|verifyDurableResult/);
    assert.equal(/return await withDurable\([\s\S]*redirect\(/.test(source), false);
  });

  it("maps a stale Budget version to VERSION_CONFLICT, never HTTP 503", () => {
    const classified = classifyActionError(new PlatformError("VERSION_CONFLICT", "stale Budget hash/version is NOT_APPLIED"));
    assert.equal(classified.code, "VERSION_CONFLICT");
    assert.equal(classified.kind, "conflict");
    assert.equal(/503|service unavailable/i.test(classified.message), false);
  });

  it("finishes durable work before a truthful action-result write", async () => {
    const order: string[] = [];
    const outcome = await runDurableProtectionMutation(async () => {
      order.push("mutate");
      return { id: "edition-1", application: "APPLIED" as const, didDataChange: true };
    });
    order.push("after-durable");
    await writeTruthfulActionResult({
      status: "SUCCESS",
      code: "SUCCESS",
      application: outcome.application,
      didDataChange: outcome.didDataChange,
    });
    order.push("written");
    assert.deepEqual(order, ["mutate", "after-durable", "written"]);
    assert.equal(outcome.verified, true);
  });
});
