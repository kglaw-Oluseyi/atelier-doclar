import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { seatingCorpus600 } from "../src/seating-solver-fixtures.js";
import { defaultSolverConfig, solveSeatingV1 } from "../src/seating-solver-v1.js";
import type { SolverRequest } from "../src/seating-solver-types.js";
import { solveSeatingV2Compiled } from "../src/seating-v2-solver-adapter.js";
import { validateSeatingV2 } from "../src/seating-v2-validator.js";
import type { SeatingV2CompiledRequest, SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-13T12:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-claim-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-claim-director" });
}
function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

function requireTable(guestIds: string[], tableObjectId: string): SeatingV2RuleContent {
  return {
    kind: "REQUIRE_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id })),
    targets: [{ type: "TABLE", idOrCode: tableObjectId }],
    source: { type: "MANUAL" },
  };
}

function keepApart(guestA: string, guestB: string): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: guestA },
      { type: "EVENT_GUEST", id: guestB },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

function prepareSurface(service: ReturnType<typeof fixtureService>["service"], store: ReturnType<typeof fixtureService>["store"]) {
  applyS06SeatingLayoutIfMissing(store, service);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for S075 claim",
    idempotencyKey: "s075-claim-rsvp",
  });
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "Claim",
    email: `${givenName.toLowerCase()}.claim@example.test`,
    reason: "S075 claim guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for S075 claim",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

function v1RequireUnmatched(): SolverRequest {
  return {
    guests: [
      { token: "guest-a", eligible: true, capabilityCodes: [], protocolCodes: [] },
      { token: "guest-b", eligible: true, capabilityCodes: [], protocolCodes: [] },
    ],
    positions: [
      { token: "pos-t2-1", tableToken: "table-two-token-aaaa", zoneCodes: [], capabilityCodes: [] },
      { token: "pos-t2-2", tableToken: "table-two-token-aaaa", zoneCodes: [], capabilityCodes: [] },
    ],
    constraints: [
      {
        id: "require-t1",
        kind: "HARD",
        predicateType: "REQUIRE_TABLE",
        payload: { predicateType: "REQUIRE_TABLE", guestTokens: ["guest-a"], tableTokens: ["table-one-token-bbbb"] },
      },
    ],
    reservations: [],
    config: defaultSolverConfig({ seed: "s075-unseated-required", timeLimitMs: 1_000, alternativeCount: 0 }),
  };
}

function v1RecoverableApart(): SolverRequest {
  return {
    guests: [
      { token: "guest-a", eligible: true, capabilityCodes: [], protocolCodes: [] },
      { token: "guest-b", eligible: true, capabilityCodes: [], protocolCodes: [] },
    ],
    positions: [
      { token: "pos-t1-1", tableToken: "table-one-token-bbbb", zoneCodes: [], capabilityCodes: [] },
      { token: "pos-t1-2", tableToken: "table-one-token-bbbb", zoneCodes: [], capabilityCodes: [] },
      { token: "pos-t2-1", tableToken: "table-two-token-aaaa", zoneCodes: [], capabilityCodes: [] },
    ],
    constraints: [
      {
        id: "apart-ab",
        kind: "HARD",
        predicateType: "KEEP_APART",
        payload: { predicateType: "KEEP_APART", guestTokens: ["guest-a", "guest-b"] },
      },
    ],
    reservations: [],
    config: defaultSolverConfig({ seed: "s075-recover-apart", timeLimitMs: 1_000, alternativeCount: 0 }),
  };
}

describe("S075 solver-claim honesty", () => {
  it("does not claim FEASIBLE when a required subject remains unseated", () => {
    const result = solveSeatingV1(v1RequireUnmatched());
    assert.notEqual(result.status, "FEASIBLE");
    assert.equal(result.assignments.find((item) => item.guestToken === "guest-a")?.state, "UNSEATED");
    assert.ok(result.score.hardViolations > 0);
  });

  it("continues past an invalid together-on-one-table candidate and finds KEEP_APART", () => {
    const result = solveSeatingV1(v1RecoverableApart());
    assert.equal(result.status, "FEASIBLE");
    const seated = result.assignments.filter((item) => item.state === "SEATED");
    assert.equal(seated.length, 2);
    const tableOf = (token: string) => seated.find((item) => item.guestToken === token)?.positionToken?.slice(0, 6);
    assert.notEqual(tableOf("guest-a"), tableOf("guest-b"));
  });

  it("reports TIMED_OUT rather than INFEASIBLE when the time budget ends first", () => {
    const result = solveSeatingV1({
      ...seatingCorpus600(),
      config: defaultSolverConfig({ seed: "s06-corpus-600", timeLimitMs: 50, alternativeCount: 2 }),
    });
    assert.notEqual(result.status, "INFEASIBLE");
    if (result.status !== "FEASIBLE") {
      assert.equal(result.status, "TIMED_OUT");
    }
  });

  it("does not treat an empty compiled request as global INFEASIBLE", () => {
    assert.throws(
      () =>
        solveSeatingV2Compiled({
          guests: [],
          positions: [],
          rules: [],
          reservations: [],
          seed: "empty",
        } as unknown as SeatingV2CompiledRequest),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("seats the four-guest witness and every FEASIBLE claim independently validates", async () => {
    const { service, store } = fixtureService();
    prepareSurface(service, store);
    const layout = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    const t1 = layout.tables[0]!.objectId;
    const g1 = attendingGuest(service, "G1", "s075-claim-g1");
    const g2 = attendingGuest(service, "G2", "s075-claim-g2");
    const g3 = attendingGuest(service, "G3", "s075-claim-g3");
    const g4 = attendingGuest(service, "G4", "s075-claim-g4");
    const v2 = service.seatingV2Commands();
    const create = async (content: SeatingV2RuleContent, key: string) => {
      const draft = await v2.createRule(planner(), envelope(people.assignPlanner, `${key}-c`), content);
      await v2.activateRule(director(), envelope(people.assignDirector, `${key}-a`), { editionId: draft.value.id });
    };
    await create(requireTable([g1.id, g4.id], t1), "s075-claim-r1");
    await create(keepApart(g1.id, g2.id), "s075-claim-r2");
    await create(keepApart(g3.id, g2.id), "s075-claim-r3");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-claim-freeze"), {
      seed: "s075-claim-seed",
    });
    const run = await v2.launchRun(planner(), envelope(people.assignPlanner, "s075-claim-run"), {
      packageId: frozen.value.id,
    });
    assert.equal(run.value.solverClaim, "FEASIBLE");
    assert.equal(run.value.status, "FEASIBLE");
    const compiled = await v2.repository.transaction(async (tx) => {
      const rows = await tx.list<{ packageId: string; compiledRequestJson: unknown }>("compiledRequests", {
        organisationId: people.orgMaison,
        eventId: people.eventAlphaOne,
      });
      return rows.find((item) => item.packageId === frozen.value.id);
    });
    assert.ok(compiled);
    const request = compiled.compiledRequestJson as SeatingV2CompiledRequest;
    const solved = solveSeatingV2Compiled(request);
    assert.equal(solved.solverClaim, "FEASIBLE");
    assert.equal(solved.assignments.filter((item) => item.state === "SEATED").length, 4);
    const report = validateSeatingV2(
      { contentHash: frozen.value.contentHash, compiledRequest: request },
      solved.assignments,
      [],
    );
    assert.equal(report.verdict, "FEASIBLE");
    assert.ok(report.ruleOutcomes.every((item) => item.outcome === "SATISFIED"));
  });
});
