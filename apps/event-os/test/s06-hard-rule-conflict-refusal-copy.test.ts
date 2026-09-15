import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError, safeActionResultTargetId } from "@maison-doclar/shared-platform";
import {
  classifyActionError,
  operationalStateFromCode,
} from "../src/server/operational-state.ts";
import {
  shouldAttemptActionResultFocus,
} from "../src/components/action-result-focus.ts";

describe("EOS-S06 HARD-rule conflict refusal copy", () => {
  it("renders controlled business wording for CONFLICTING_ACTIVE_HARD_RULE / SEATING_HARD_RULE_CONFLICT", () => {
    const detail =
      "This KEEP_APART draft contradicts ACTIVE HARD KEEP_TOGETHER edition e0dc270a-c57d-49fb-8dd9-c62544de3d2b. Withdraw or supersede the conflicting governing rule before activating the replacement.";
    const view = operationalStateFromCode("SEATING_HARD_RULE_CONFLICT", detail);

    assert.equal(view.kind, "conflict");
    assert.equal(view.title, "Activation not applied");
    assert.equal(view.dataChanged, "no");
    assert.match(view.whatHappened, /contradict|ACTIVE|Withdraw or supersede/i);
    assert.match(view.nextStep, /Withdraw or supersede/i);
    assert.doesNotMatch(view.title, /unexpected server failure/i);
    assert.doesNotMatch(view.whatHappened, /unexpected server failure/i);
    assert.doesNotMatch(view.nextStep ?? "", /unexpected server failure/i);
    assert.ok(view.title.trim().length > 0);
    assert.ok(view.whatHappened.trim().length > 0);

    const classified = classifyActionError(
      new PlatformError("SEATING_HARD_RULE_CONFLICT", "conflicting active hard rule", {
        publicMessage: detail,
      }),
    );
    assert.equal(classified.kind, "conflict");
    assert.equal(classified.code, "SEATING_HARD_RULE_CONFLICT");
    assert.doesNotMatch(classified.message, /unexpected server failure/i);

    const focus = shouldAttemptActionResultFocus({
      active: true,
      correlationId: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(focus, "focus");
    assert.equal(safeActionResultTargetId("operational-state-title"), "operational-state-title");
  });

  it("reserves unexpected server failure for genuine technical faults", () => {
    const internal = operationalStateFromCode("INTERNAL_ERROR", "boom");
    assert.equal(internal.kind, "server_failure");
    assert.match(internal.whatHappened, /unexpected server failure/i);

    const unknown = operationalStateFromCode("NOT_A_REAL_CODE" as never, "mystery");
    assert.equal(unknown.kind, "server_failure");
    assert.match(unknown.whatHappened, /unexpected server failure/i);
    assert.notEqual(unknown.title, "Activation not applied");
  });
});
