import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildActionResult,
  forgetActionResult,
  presentActionResult,
  recallActionResult,
  rememberActionResult,
  resultHref,
  resultQueryIsSafe,
  storedResultMatchesCorrelation,
  sessionHashFromToken,
  signActionResult,
  verifyActionResult,
} from "../src/server/action-result.ts";

const SECRET = "event-os-session-secret-not-for-production-32";
const SESSION_A = "session-token-actor-a";
const SESSION_B = "session-token-actor-b";
const ACTOR_A = "00000000-0000-4000-8000-000000000011";
const ACTOR_B = "00000000-0000-4000-8000-000000000012";
const EVENT = "00000000-0000-4000-8000-000000000021";
const SCOPE = `/app/events/${EVENT}/forecast`;

function result(input: {
  session?: string;
  actor?: string;
  actionType: string;
  correlationId: string;
  status: "SUCCESS" | "FAILURE";
  code?: "SUCCESS" | "FORBIDDEN" | "VALIDATION_FAILED" | "VERSION_CONFLICT";
  message: string;
}) {
  return buildActionResult({
    sessionHash: sessionHashFromToken(input.session ?? SESSION_A),
    actorPersonId: input.actor ?? ACTOR_A,
    scopePath: SCOPE,
    actionType: input.actionType,
    correlationId: input.correlationId,
    status: input.status,
    code: input.code ?? (input.status === "SUCCESS" ? "SUCCESS" : "FORBIDDEN"),
    message: input.message,
    eventId: EVENT,
  });
}

describe("EOS-S04D action-result lifecycle", () => {
  it("1. a denial cannot label an unrelated later success", () => {
    const denial = result({
      actionType: "forecast.override.propose",
      correlationId: "11111111-1111-4111-8111-111111111111",
      status: "FAILURE",
      message: "You do not have permission to perform this action.",
    });
    const success = result({
      actionType: "provision.propose",
      correlationId: "22222222-2222-4222-8222-222222222222",
      status: "SUCCESS",
      message: "The operational provision recommendation was proposed. It is not attendance truth.",
    });
    const presented = presentActionResult({
      stored: success,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: success.correlationId,
      eventId: EVENT,
    });
    assert.equal(presented.view?.kind, "success");
    assert.equal(presented.actionType, "provision.propose");
    assert.notEqual(presented.actionType, denial.actionType);
    assert.match(presented.view?.message ?? "", /provision/);
    assert.doesNotMatch(presented.view?.message ?? "", /permission/i);
    assert.equal(presented.view?.resultStatus, "SUCCESS");
  });

  it("2. a denial cannot label a related later success", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "forecast.override.decide",
        correlationId: "33333333-3333-4333-8333-333333333333",
        status: "SUCCESS",
        message: "The forecast override was decided. History was not rewritten.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "33333333-3333-4333-8333-333333333333",
      eventId: EVENT,
    });
    assert.equal(presented.view?.kind, "success");
    assert.equal(presented.actionType, "forecast.override.decide");
  });

  it("3. a success cannot hide a later denial", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "forecast.host.approve",
        correlationId: "44444444-4444-4444-8444-444444444444",
        status: "FAILURE",
        message: "You do not have permission to perform this action.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "44444444-4444-4444-8444-444444444444",
      eventId: EVENT,
    });
    assert.equal(presented.view?.kind, "forbidden");
    assert.equal(presented.view?.resultStatus, "FAILURE");
    assert.notEqual(presented.view?.kind, "success");
  });

  it("4. a validation failure is replaced by a corrected success", () => {
    const presented = presentActionResult({
      stored: result({
        actionType: "provision.propose",
        correlationId: "55555555-5555-4555-8555-555555555555",
        status: "SUCCESS",
        message: "The operational provision recommendation was proposed. It is not attendance truth.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "55555555-5555-4555-8555-555555555555",
      eventId: EVENT,
    });
    assert.equal(presented.view?.kind, "success");
  });

  it("5. a version conflict stays locked until reload, then a later success can present", () => {
    const conflict = result({
      actionType: "guest.amend",
      correlationId: "66666666-6666-4666-8666-666666666666",
      status: "FAILURE",
      code: "VERSION_CONFLICT",
      message: "This record changed while you were editing. Reload before saving.",
    });
    const locked = presentActionResult({
      stored: conflict,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: conflict.correlationId,
      eventId: EVENT,
    });
    assert.equal(locked.mutationLocked, true);
    assert.equal(locked.shouldConsume, false);
    assert.equal(locked.view?.kind, "conflict");
    const afterReload = presentActionResult({
      stored: undefined,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: conflict.correlationId,
      eventId: EVENT,
    });
    assert.equal(afterReload.view, undefined);
    const success = presentActionResult({
      stored: result({
        actionType: "guest.amend",
        correlationId: "77777777-7777-4777-8777-777777777777",
        status: "SUCCESS",
        message: "The guest amendment was recorded.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "77777777-7777-4777-8777-777777777777",
      eventId: EVENT,
    });
    assert.equal(success.view?.kind, "success");
    assert.equal(success.mutationLocked, false);
  });

  it("6. actor A denial cannot transfer to actor B after sign-out", () => {
    const denial = result({
      actionType: "forecast.override.propose",
      correlationId: "88888888-8888-4888-8888-888888888888",
      status: "FAILURE",
      message: "You do not have permission to perform this action.",
    });
    const leaked = presentActionResult({
      stored: denial,
      sessionHash: sessionHashFromToken(SESSION_B),
      actorPersonId: ACTOR_B,
      requestPath: SCOPE,
      resultId: denial.correlationId,
      eventId: EVENT,
    });
    assert.equal(leaked.view, undefined);
    const success = presentActionResult({
      stored: result({
        session: SESSION_B,
        actor: ACTOR_B,
        actionType: "provision.propose",
        correlationId: "99999999-9999-4999-8999-999999999999",
        status: "SUCCESS",
        message: "The operational provision recommendation was proposed. It is not attendance truth.",
      }),
      sessionHash: sessionHashFromToken(SESSION_B),
      actorPersonId: ACTOR_B,
      requestPath: SCOPE,
      resultId: "99999999-9999-4999-8999-999999999999",
      eventId: EVENT,
    });
    assert.equal(success.view?.kind, "success");
  });

  it("7. two tabs completing different actions only show the matching correlation", () => {
    const tabB = result({
      actionType: "provision.propose",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "SUCCESS",
      message: "The operational provision recommendation was proposed. It is not attendance truth.",
    });
    const tabA = presentActionResult({
      stored: tabB,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      eventId: EVENT,
    });
    assert.equal(tabA.view, undefined);
    const shown = presentActionResult({
      stored: tabB,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: tabB.correlationId,
      eventId: EVENT,
    });
    assert.equal(shown.actionType, "provision.propose");
  });

  it("8. refresh or back navigation after consumption does not resurrect a banner", () => {
    const consumed = presentActionResult({
      stored: undefined,
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      eventId: EVENT,
    });
    assert.equal(consumed.view, undefined);
    const withoutResultId = presentActionResult({
      stored: result({
        actionType: "provision.propose",
        correlationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        status: "SUCCESS",
        message: "The operational provision recommendation was proposed. It is not attendance truth.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      eventId: EVENT,
    });
    assert.equal(withoutResultId.view, undefined);
  });

  it("9. UI correlation id is the same identifier bound on the result", () => {
    const correlationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const presented = presentActionResult({
      stored: result({
        actionType: "forecast.run",
        correlationId,
        status: "SUCCESS",
        message: "The attendance forecast was recorded. RSVP and guest records were not changed.",
      }),
      sessionHash: sessionHashFromToken(SESSION_A),
      actorPersonId: ACTOR_A,
      requestPath: SCOPE,
      resultId: correlationId,
      eventId: EVENT,
    });
    assert.equal(presented.correlationId, correlationId);
    assert.equal(presented.view?.correlationId, correlationId);
  });

  it("10. result cookies and query strings refuse secrets and raw records", () => {
    assert.equal(resultQueryIsSafe("result=dddddddd-dddd-4ddd-8ddd-dddddddddddd"), true);
    assert.equal(resultQueryIsSafe("ok=forecast-run&error=secret"), false);
    assert.throws(() =>
      buildActionResult({
        sessionHash: sessionHashFromToken(SESSION_A),
        actorPersonId: ACTOR_A,
        scopePath: SCOPE,
        actionType: "forecast.run",
        correlationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        status: "SUCCESS",
        code: "SUCCESS",
        message: "token=super-secret password dump",
        eventId: EVENT,
      }),
    );
    const signed = signActionResult(
      result({
        actionType: "forecast.run",
        correlationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        status: "SUCCESS",
        message: "The attendance forecast was recorded. RSVP and guest records were not changed.",
      }),
      SECRET,
    );
    assert.equal(verifyActionResult(signed, "wrong-secret"), undefined);
    assert.equal(verifyActionResult(signed, SECRET)?.actionType, "forecast.run");
    assert.equal(resultHref(SCOPE, "ffffffff-ffff-4fff-8fff-ffffffffffff").includes("ok="), false);
    assert.match(resultHref(SCOPE, "ffffffff-ffff-4fff-8fff-ffffffffffff"), /result=ffffffff-ffff-4fff-8fff-ffffffffffff/);
    assert.match(
      resultHref(SCOPE, "ffffffff-ffff-4fff-8fff-ffffffffffff", { section: "discovery-evidence" }),
      /#discovery-evidence$/,
    );
  });

  it("11. consume is bound to the presented correlation id", () => {
    const current = result({
      actionType: "provision.propose",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "SUCCESS",
      message: "The operational provision recommendation was proposed. It is not attendance truth.",
    });
    assert.equal(storedResultMatchesCorrelation(current, current.correlationId), true);
    assert.equal(storedResultMatchesCorrelation(current, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), false);
    assert.equal(storedResultMatchesCorrelation(undefined, current.correlationId), false);
    rememberActionResult(current);
    assert.equal(recallActionResult(current.correlationId)?.actionType, "provision.propose");
    assert.equal(recallActionResult("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), undefined);
    forgetActionResult(current.correlationId);
    assert.equal(recallActionResult(current.correlationId), undefined);
  });
});
