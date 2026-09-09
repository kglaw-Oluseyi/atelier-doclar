import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedActionResultTarget,
  retryLockApplies,
  safeActionResultTargetId,
} from "@maison-doclar/shared-platform";
import {
  actionResultFocusStorageKey,
  shouldReleaseActionResultFocus,
  shouldRequestActionResultFocus,
  shouldStealActionResultFocus,
} from "../src/components/action-result-focus.ts";
import {
  buildActionResult,
  presentActionResult,
  sessionHashFromToken,
} from "../src/server/action-result.ts";

const SECRET_SESSION = "session-token-actor-a";
const ACTOR = "00000000-0000-4000-8000-000000000011";
const ENGAGEMENT = "00000000-0000-4000-8000-000000000031";
const SCENARIO_340 = "00000000-0000-4000-8000-000000000041";
const SCENARIO_OTHER = "00000000-0000-4000-8000-000000000042";
const SCOPE = `/app/discovery/${ENGAGEMENT}`;

function result(input: {
  actionType: string;
  correlationId: string;
  status: "SUCCESS" | "FAILURE";
  code?: "SUCCESS" | "FORBIDDEN" | "VALIDATION_FAILED" | "VERSION_CONFLICT";
  message: string;
  application?: "APPLIED" | "NOT_APPLIED" | "REPLAYED";
  didDataChange?: boolean;
  reusedRecordIds?: string[];
  subjectId?: string;
  targetId?: string;
  attemptedVersion?: number;
}) {
  return buildActionResult({
    sessionHash: sessionHashFromToken(SECRET_SESSION),
    actorPersonId: ACTOR,
    scopePath: SCOPE,
    actionType: input.actionType,
    correlationId: input.correlationId,
    status: input.status,
    code: input.code ?? (input.status === "SUCCESS" ? "SUCCESS" : "FORBIDDEN"),
    message: input.message,
    application: input.application,
    didDataChange: input.didDataChange,
    reusedRecordIds: input.reusedRecordIds,
    subjectId: input.subjectId,
    targetId: input.targetId,
    attemptedVersion: input.attemptedVersion,
  });
}

describe("EOS-S049 action-result truth, focus and scoped retry locks", () => {
  it("replay does not present Did data change Yes", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "budget.calculate",
        correlationId: "11111111-1111-4111-8111-111111111111",
        status: "SUCCESS",
        application: "REPLAYED",
        didDataChange: false,
        reusedRecordIds: ["22222222-2222-4222-8222-222222222222"],
        message: "No data changed. This request matches the stored scenario and calculation.",
        subjectId: ENGAGEMENT,
        targetId: "operational-state-title",
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(presented.view?.dataChanged, "no");
    assert.equal(presented.application, "REPLAYED");
    assert.match(presented.view?.title ?? "", /Existing calculation reused/);
    assert.match(presented.view?.whatHappened ?? "", /No data changed/);
    assert.doesNotMatch(`${presented.view?.title} ${presented.view?.whatHappened}`, /Did data change: Yes/);
    assert.notEqual(presented.view?.dataChanged, "yes");
  });

  it("new calculation remains APPLIED with data change", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "budget.calculate",
        correlationId: "33333333-3333-4333-8333-333333333333",
        status: "SUCCESS",
        application: "APPLIED",
        didDataChange: true,
        message: "The budget scenario was calculated.",
        subjectId: ENGAGEMENT,
        targetId: "operational-state-title",
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: "33333333-3333-4333-8333-333333333333",
    });
    assert.equal(presented.application, "APPLIED");
    assert.equal(presented.view?.dataChanged, "yes");
  });

  it("maker/checker denial and stale conflict focus the allowlisted heading once", () => {
    const denial = presentActionResult({
      stored: result({
        actionType: "budget.decide",
        correlationId: "44444444-4444-4444-8444-444444444444",
        status: "FAILURE",
        code: "FORBIDDEN",
        message: "The author cannot approve this scenario.",
        application: "NOT_APPLIED",
        didDataChange: false,
        subjectId: SCENARIO_340,
        targetId: "operational-state-title",
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: "44444444-4444-4444-8444-444444444444",
    });
    assert.equal(denial.view?.kind, "forbidden");
    assert.equal(denial.view?.dataChanged, "no");
    assert.equal(denial.shouldConsume, true);
    assert.equal(denial.focusTargetId, "operational-state-title");
    assert.equal(denial.mutationLocked, false);
    const conflict = presentActionResult({
      stored: result({
        actionType: "budget.decide",
        correlationId: "55555555-5555-4555-8555-555555555555",
        status: "FAILURE",
        code: "VERSION_CONFLICT",
        message: "stale budget scenario",
        application: "NOT_APPLIED",
        didDataChange: false,
        subjectId: SCENARIO_340,
        targetId: "operational-state-title",
        attemptedVersion: 1,
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: "55555555-5555-4555-8555-555555555555",
    });
    assert.equal(conflict.view?.kind, "conflict");
    assert.equal(conflict.shouldConsume, true);
    assert.equal(conflict.focusTargetId, "operational-state-title");
    assert.equal(conflict.retryLock?.subjectId, SCENARIO_340);
    assert.equal(conflict.retryLock?.actionScope, "budget.decide");
    assert.equal(conflict.mutationLocked, false);
  });

  it("unsafe target input cannot select arbitrary DOM elements", () => {
    assert.equal(isAllowedActionResultTarget("evil"), false);
    assert.equal(isAllowedActionResultTarget("document.body"), false);
    assert.equal(safeActionResultTargetId("evil"), "operational-state-title");
    assert.equal(safeActionResultTargetId("operational-state-title"), "operational-state-title");
    const presented = presentActionResult({
      stored: result({
        actionType: "budget.calculate",
        correlationId: "66666666-6666-4666-8666-666666666666",
        status: "SUCCESS",
        application: "REPLAYED",
        didDataChange: false,
        message: "No data changed. This request matches the stored scenario and calculation.",
        subjectId: ENGAGEMENT,
        targetId: "evil",
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: "66666666-6666-4666-8666-666666666666",
    });
    assert.equal(presented.focusTargetId, "operational-state-title");
    assert.notEqual(presented.focusTargetId, "evil");
  });

  it("stale 340 lock does not disable unrelated actions or another subject", () => {
    const lock = {
      actionScope: "budget.decide",
      subjectId: SCENARIO_340,
      attemptedVersion: 1,
      correlationId: "77777777-7777-4777-8777-777777777777",
    };
    assert.equal(retryLockApplies(lock, { actionScope: "budget.decide", subjectId: SCENARIO_340, attemptedVersion: 1 }), true);
    assert.equal(retryLockApplies(lock, { actionScope: "budget.calculate", subjectId: ENGAGEMENT }), false);
    assert.equal(retryLockApplies(lock, { actionScope: "budget.decide", subjectId: SCENARIO_OTHER, attemptedVersion: 1 }), false);
    assert.equal(retryLockApplies(lock, { actionScope: "brief.decide", subjectId: ENGAGEMENT }), false);
    const presented = presentActionResult({
      stored: result({
        actionType: "budget.decide",
        correlationId: lock.correlationId,
        status: "FAILURE",
        code: "VERSION_CONFLICT",
        message: "stale budget scenario",
        subjectId: SCENARIO_340,
        attemptedVersion: 1,
        targetId: "operational-state-title",
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: lock.correlationId,
    });
    assert.equal(presented.mutationLocked, false);
    assert.equal(retryLockApplies(presented.retryLock, { actionScope: "budget.decide", subjectId: SCENARIO_340, attemptedVersion: 1 }), true);
    assert.equal(retryLockApplies(presented.retryLock, { actionScope: "budget.calculate", subjectId: ENGAGEMENT }), false);
    const afterConsume = presentActionResult({
      stored: undefined,
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: SCOPE,
      resultId: lock.correlationId,
    });
    assert.equal(afterConsume.retryLock, undefined);
    assert.equal(afterConsume.mutationLocked, false);
    assert.equal(afterConsume.shouldConsume, false);
  });

  it("consumed or refreshed results must not steal heading focus", () => {
    const conflict = {
      shouldConsume: true,
      viewKind: "conflict",
      focusOnSuccess: true,
    };
    assert.equal(shouldRequestActionResultFocus(conflict), true);
    assert.equal(shouldRequestActionResultFocus({ ...conflict, shouldConsume: false }), false);
    assert.equal(shouldStealActionResultFocus({ active: true, navigationType: "navigate" }), true);
    assert.equal(shouldStealActionResultFocus({ active: true, navigationType: "reload" }), false);
    assert.equal(shouldStealActionResultFocus({ active: true, alreadyPresented: true }), false);
    assert.equal(shouldReleaseActionResultFocus({ navigationType: "navigate" }), false);
    assert.equal(shouldReleaseActionResultFocus({ navigationType: "reload" }), true);
    const first = actionResultFocusStorageKey({
      pathname: "/app/discovery/engagement",
      targetId: "operational-state-title",
      onceKey: "corr:budget.calculate:subject:operational-state-title",
    });
    const afterHash = actionResultFocusStorageKey({
      pathname: "/app/discovery/engagement",
      targetId: "operational-state-title",
      onceKey: "corr:budget.calculate:subject:operational-state-title",
    });
    assert.equal(first, afterHash);
    assert.doesNotMatch(first ?? "", /#/);
  });

  it("action result from another subject does not affect this page", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "budget.decide",
        correlationId: "88888888-8888-4888-8888-888888888888",
        status: "FAILURE",
        code: "VERSION_CONFLICT",
        message: "stale budget scenario",
        subjectId: SCENARIO_OTHER,
        attemptedVersion: 2,
      }),
      sessionHash: sessionHashFromToken(SECRET_SESSION),
      actorPersonId: ACTOR,
      requestPath: `/app/discovery/${ENGAGEMENT}`,
      resultId: "88888888-8888-4888-8888-888888888888",
    });
    assert.equal(retryLockApplies(presented.retryLock, { actionScope: "budget.decide", subjectId: SCENARIO_340, attemptedVersion: 1 }), false);
  });
});
