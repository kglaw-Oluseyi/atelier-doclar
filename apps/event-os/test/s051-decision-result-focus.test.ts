import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeActionResultTargetId } from "@maison-doclar/shared-platform";
import {
  actionResultScrollBehavior,
  prefersReducedMotion,
  shouldAttemptActionResultFocus,
} from "../src/components/action-result-focus.ts";

describe("EOS-S051 decision-result focus sequencing", () => {
  it("new correlation focuses; stored F5 skips; same-document restore does not skip a live result", () => {
    assert.equal(
      shouldAttemptActionResultFocus({
        active: true,
        correlationId: "11111111-1111-4111-8111-111111111111",
      }),
      "focus",
    );
    assert.equal(
      shouldAttemptActionResultFocus({
        active: true,
        correlationId: "11111111-1111-4111-8111-111111111111",
        alreadyStored: true,
      }),
      "skip",
    );
    assert.equal(
      shouldAttemptActionResultFocus({
        active: true,
        correlationId: "22222222-2222-4222-8222-222222222222",
        alreadyStored: true,
        focusedInDocument: true,
      }),
      "restore",
    );
    assert.equal(shouldAttemptActionResultFocus({ active: true }), "skip");
    assert.equal(
      shouldAttemptActionResultFocus({
        active: false,
        correlationId: "11111111-1111-4111-8111-111111111111",
      }),
      "skip",
    );
    assert.equal(
      shouldAttemptActionResultFocus({
        active: false,
        correlationId: "11111111-1111-4111-8111-111111111111",
        alreadyStored: true,
        focusedInDocument: true,
      }),
      "restore",
    );
  });

  it("unsafe target cannot select arbitrary DOM and reduced motion avoids smooth scrolling", () => {
    assert.equal(safeActionResultTargetId("evil"), "operational-state-title");
    assert.equal(safeActionResultTargetId("#main"), "operational-state-title");
    assert.equal(safeActionResultTargetId("operational-state-title"), "operational-state-title");
    assert.equal(actionResultScrollBehavior(true), "auto");
    assert.equal(actionResultScrollBehavior(false), "smooth");
    assert.equal(prefersReducedMotion(() => true), true);
    assert.equal(prefersReducedMotion(() => false), false);
  });
});
