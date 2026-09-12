import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearSettlementTraces,
  emitSettlementStage,
  listSettlementTraces,
  runWithSettlementTrace,
  settlementCommandIdFromIdempotency,
  type SeatingSettlementTrace,
} from "../src/seating-settlement-trace.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { actor, fixtureService, people } from "./helpers.js";

const COMMAND = "00000000-0000-4000-8000-000000000073";
const REQUEST = "00000000-0000-4000-8000-000000000074";
const NOW = "2026-09-12T22:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s073-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s073-director" });
}

describe("S073 settlement trace", () => {
  it("uses the form idempotency UUID as commandId and does not invent a second key", () => {
    assert.equal(settlementCommandIdFromIdempotency(COMMAND, REQUEST), COMMAND);
    assert.equal(settlementCommandIdFromIdempotency("short-key", REQUEST), REQUEST);
  });

  it("records identifiers, hashes, enums and durations only", () => {
    clearSettlementTraces();
    let trace: SeatingSettlementTrace | undefined;
    runWithSettlementTrace({ commandId: COMMAND, requestId: REQUEST, commandType: "seating.run.launch" }, () => {
      trace = emitSettlementStage({
        stage: "ACTION_ENTER",
        reasonClass: "SUCCESS",
        durationMs: 12,
      });
    });
    assert.ok(trace);
    const serialized = JSON.stringify(trace);
    assert.equal(/password|cookie|Bearer|secret/i.test(serialized), false);
    assert.match(trace.commandId, /^[0-9a-f-]{36}$/i);
    assert.equal(trace.commandType, "seating.run.launch");
    assert.ok((trace.durationMs ?? 0) >= 0);
  });

  it("proves launch holds the seating transaction across solver start and terminal", async () => {
    clearSettlementTraces();
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    service.prepareEventRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      hostDisplayName: "Maison Doclar",
      eventDisplayName: "Alpha One",
      reason: "prepare RSVP for S073",
      idempotencyKey: "s073-prepare-rsvp",
    });
    const guest = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName: "Trace",
      familyName: "Guest",
      email: "trace.guest@example.test",
      reason: "S073 attending guest",
      idempotencyKey: "s073-intake",
    });
    service.staffEnterRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "mark attending for S073",
      idempotencyKey: "s073-rsvp",
    });
    const v2 = service.seatingV2Commands();
    const pkg = await v2.freezePackage(planner(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      actorAssignmentId: people.assignPlanner,
      idempotencyKey: "s073-trace-freeze",
    }, { seed: "s073-trace" });
    const launched = await runWithSettlementTrace(
      { commandId: COMMAND, requestId: REQUEST, commandType: "seating.run.launch", eventId: people.eventAlphaOne },
      () =>
        v2.launchRun(planner(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          actorAssignmentId: people.assignPlanner,
          idempotencyKey: "s073-trace-launch",
        }, { packageId: pkg.value.id }),
    );
    const traces = listSettlementTraces({ commandId: COMMAND });
    const stages = traces.map((item) => item.stage);
    assert.ok(launched.value.id);
    assert.deepEqual(
      stages.filter((stage) =>
        ["TX_BEGIN", "SOLVER_START", "SOLVER_TERMINAL", "RUN_QUEUED", "TX_COMMIT"].includes(stage),
      ),
      ["TX_BEGIN", "SOLVER_START", "SOLVER_TERMINAL", "RUN_QUEUED", "TX_COMMIT"],
    );
    const begin = traces.find((item) => item.stage === "TX_BEGIN")!;
    const solverStart = traces.find((item) => item.stage === "SOLVER_START")!;
    const solverEnd = traces.find((item) => item.stage === "SOLVER_TERMINAL")!;
    const commit = traces.find((item) => item.stage === "TX_COMMIT")!;
    assert.ok(begin.wallMs <= solverStart.wallMs);
    assert.ok(solverStart.wallMs <= solverEnd.wallMs);
    assert.ok(solverEnd.wallMs <= commit.wallMs);
  });
});
