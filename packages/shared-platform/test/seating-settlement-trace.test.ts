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
import { applyS06SeatingLayoutIfMissing, ensureS06SeatingLayoutBinding } from "../src/seating-fixtures.js";
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

  it("does not hold a seating transaction while the solver runs", async () => {
    clearSettlementTraces();
    const { service, store } = fixtureService();
    applyS06SeatingLayoutIfMissing(store, service);
    await ensureS06SeatingLayoutBinding(store, service);
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
    assert.ok(stages.includes("TX_BEGIN"));
    assert.ok(stages.includes("SOLVER_START"));
    assert.ok(stages.includes("SOLVER_TERMINAL"));
    assert.ok(stages.includes("TX_COMMIT"));
    const intervals = [] as Array<{ begin: number; commit: number }>;
    for (const item of traces) {
      if (item.stage === "TX_BEGIN") intervals.push({ begin: item.wallMs, commit: Number.POSITIVE_INFINITY });
      if (item.stage === "TX_COMMIT" && intervals.length) intervals[intervals.length - 1]!.commit = item.wallMs;
    }
    const solverStart = traces.find((item) => item.stage === "SOLVER_START")!;
    const solverEnd = traces.find((item) => item.stage === "SOLVER_TERMINAL")!;
    assert.equal(
      intervals.some((item) => solverStart.wallMs >= item.begin && solverEnd.wallMs <= item.commit),
      false,
      "solver ran inside an open seating transaction",
    );
  });
});
