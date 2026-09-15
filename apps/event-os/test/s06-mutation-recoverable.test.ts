import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { PROTECTION_TRANSPORT_FAILURE_SUMMARY, transportFailureFormState } from "@maison-doclar/shared-platform";

const formPath = fileURLToPath(new URL("../src/components/protection-mutation-form.tsx", import.meta.url));
const seatingPagePath = fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/page.tsx", import.meta.url));
const errorPath = fileURLToPath(new URL("../src/app/app/events/[eventId]/seating/error.tsx", import.meta.url));

describe("EOS-S06 mutation recoverable UI boundary", () => {
  it("ProtectionMutationForm catches non-redirect action failures into a contained failure state", () => {
    const source = readFileSync(formPath, "utf8");
    assert.match(source, /transportFailureFormState/);
    assert.match(source, /protection-mutation-failure-summary/);
    assert.match(source, /protection-mutation-failure-retry/);
    assert.match(source, /preserveIdempotencyKey/);
    assert.match(source, /isNextNavigationError/);
    assert.match(source, /import type \{ ProtectionFormState \}/);
    assert.equal(source.includes('formDataToRecord,\n  safeAttemptedValues,\n  transportFailureFormState'), false);
    assert.equal(/setTimeout\(|location\.reload\(\)/.test(source), false);
  });

  it("propose and rule forms server-mint idempotency keys instead of client IdempotencyField", () => {
    const source = readFileSync(seatingPagePath, "utf8");
    const proposeBlock = source.slice(
      source.indexOf('testId="seating-layout-binding-propose"'),
      source.indexOf('testId="seating-layout-binding-activate"'),
    );
    const ruleBlock = source.slice(
      source.indexOf('testId="seating-constraint-form"'),
      source.indexOf('data-testid="seating-reservations"'),
    );
    assert.match(proposeBlock, /idempotencyKey:\s*crypto\.randomUUID\(\)/);
    assert.match(ruleBlock, /idempotencyKey:\s*crypto\.randomUUID\(\)/);
    assert.equal(/IdempotencyField/.test(proposeBlock), false);
    assert.equal(/IdempotencyField/.test(ruleBlock), false);
  });

  it("seating error boundary keeps an explicit retry/reload surface", () => {
    const source = readFileSync(errorPath, "utf8");
    assert.match(source, /seating-error-boundary/);
    assert.match(source, /seating-error-boundary-retry/);
    assert.match(source, /seating-error-boundary-reload/);
    assert.match(source, /may already have been recorded/);
  });

  it("transportFailureFormState stays operator-safe", () => {
    const state = transportFailureFormState({
      attemptedValues: { name: "Rule", idempotencyKey: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
    });
    assert.equal(state.status, "failure");
    assert.equal(state.summary, PROTECTION_TRANSPORT_FAILURE_SUMMARY);
    assert.equal(/stack|exception|ECONN|postgres|digest/i.test(state.summary ?? ""), false);
    assert.equal(state.preserveIdempotencyKey, true);
  });
});
