import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exactHash } from "../src/eec-hash.js";
import { PlatformError } from "../src/errors.js";
import { applyS06SeatingLayoutIfMissing } from "../src/seating-fixtures.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { assertSeatingV2CompiledRequest } from "../src/seating-v2-compiler.js";
import { solveSeatingV2Compiled } from "../src/seating-v2-solver-adapter.js";
import { validateSeatingV2 } from "../src/seating-v2-validator.js";
import type { SeatingV2CompiledRequest, SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-13T10:00:00.000Z";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MISSING_TABLE = "00000000-0000-4000-8000-00000000t999";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-director" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key,
  };
}

function positionTableToken(tableObjectId: string): string {
  return exactHash({ table: tableObjectId }).slice(0, 32);
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

function forbidTable(guestIds: string[], tableObjectId: string): SeatingV2RuleContent {
  return {
    kind: "FORBID_TABLE",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id })),
    targets: [{ type: "TABLE", idOrCode: tableObjectId }],
    source: { type: "MANUAL" },
  };
}

function keepApart(guestA: string, guestB: string, domain: SeatingV2RuleContent["specialistDomain"] = "NONE"): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: domain,
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
    reason: "prepare RSVP for S075",
    idempotencyKey: "s075-prepare-rsvp-01",
  });
}

function attendingGuest(service: ReturnType<typeof fixtureService>["service"], givenName: string, key: string) {
  const guest = service.intakeGuest(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    givenName,
    familyName: "S075",
    email: `${givenName.toLowerCase()}.s075@example.test`,
    reason: "S075 attending guest",
    idempotencyKey: `${key}-intake`,
  });
  service.staffEnterRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    guestId: guest.id,
    attendanceIntent: "ATTENDING",
    answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
    reason: "mark attending for S075",
    idempotencyKey: `${key}-rsvp`,
  });
  return guest;
}

async function activate(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
  content: SeatingV2RuleContent,
  key: string,
) {
  const created = await v2.createRule(planner(), envelope(people.assignPlanner, `${key}-create`), content);
  const activated = await v2.activateRule(director(), envelope(people.assignDirector, `${key}-act`), {
    editionId: created.value.id,
  });
  return activated.value;
}

async function compiledForPackage(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
  packageId: string,
): Promise<SeatingV2CompiledRequest> {
  const record = await v2.repository.transaction(async (tx) => {
    const rows = await tx.list<{ packageId: string; compiledRequestJson: unknown }>("compiledRequests", {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
    });
    return rows.find((item) => item.packageId === packageId);
  });
  assert.ok(record);
  return record.compiledRequestJson as SeatingV2CompiledRequest;
}

async function guestToken(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
  packageId: string,
  eventGuestId: string,
): Promise<string> {
  const row = await v2.repository.transaction(async (tx) => {
    const rows = await tx.list<{ packageId: string; eventGuestId: string; solverToken: string }>("packageGuests", {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
    });
    return rows.find((item) => item.packageId === packageId && item.eventGuestId === eventGuestId);
  });
  assert.ok(row);
  return row.solverToken;
}

function explicitWitness(
  request: SeatingV2CompiledRequest,
  tokens: { g1: string; g2: string; g3: string; g4: string },
  t1Token: string,
  t2Token: string,
) {
  const t1 = request.positions.filter((item) => item.tableToken === t1Token);
  const t2 = request.positions.filter((item) => item.tableToken === t2Token);
  assert.ok(t1.length >= 3);
  assert.ok(t2.length >= 1);
  return [
    { guestToken: tokens.g1, state: "SEATED" as const, positionToken: t1[0]!.token, typedReasonCodes: [] },
    { guestToken: tokens.g4, state: "SEATED" as const, positionToken: t1[1]!.token, typedReasonCodes: [] },
    { guestToken: tokens.g3, state: "SEATED" as const, positionToken: t1[2]!.token, typedReasonCodes: [] },
    { guestToken: tokens.g2, state: "SEATED" as const, positionToken: t2[0]!.token, typedReasonCodes: [] },
  ];
}

async function s074WitnessFixture(prefix: string) {
  const { service, store } = fixtureService();
  prepareSurface(service, store);
  const layout = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
  assert.equal(layout.tables.length, 2);
  assert.ok(layout.tables.every((table) => UUID_RE.test(table.objectId)));
  const t1 = layout.tables[0]!.objectId;
  const t2 = layout.tables[1]!.objectId;
  const g1 = attendingGuest(service, "G1", `${prefix}-g1`);
  const g2 = attendingGuest(service, "G2", `${prefix}-g2`);
  const g3 = attendingGuest(service, "G3", `${prefix}-g3`);
  const g4 = attendingGuest(service, "G4", `${prefix}-g4`);
  const v2 = service.seatingV2Commands();
  await activate(v2, requireTable([g1.id, g4.id], t1), `${prefix}-r1`);
  await activate(v2, keepApart(g1.id, g2.id), `${prefix}-r2`);
  await activate(v2, keepApart(g3.id, g2.id, "SECURITY"), `${prefix}-r3`);
  const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, `${prefix}-freeze`), { seed: `${prefix}-seed` });
  const request = await compiledForPackage(v2, frozen.value.id);
  const tokens = {
    g1: await guestToken(v2, frozen.value.id, g1.id),
    g2: await guestToken(v2, frozen.value.id, g2.id),
    g3: await guestToken(v2, frozen.value.id, g3.id),
    g4: await guestToken(v2, frozen.value.id, g4.id),
  };
  return { v2, frozen, request, tokens, t1, t2, guests: { g1, g2, g3, g4 } };
}

describe("S075 legacy raw-target shape is rejected", () => {
  it("rejects a compiled request that still carries a raw layout UUID in tableTokens", async () => {
    const { request, t1 } = await s074WitnessFixture("s075-legacy");
    const compiled = request.rules.find((rule) => rule.kind === "REQUIRE_TABLE");
    assert.ok(compiled);
    assert.deepEqual(compiled.tableTokens, [positionTableToken(t1)]);
    const legacy = structuredClone(request);
    const legacyRule = legacy.rules.find((rule) => rule.kind === "REQUIRE_TABLE");
    assert.ok(legacyRule);
    legacyRule.tableTokens = [t1];
    assert.throws(
      () => assertSeatingV2CompiledRequest(legacy),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });
});

describe("S075 corrected compiler contract", () => {
  it("compiled REQUIRE_TABLE targets resolve to position tokens and the witness is FEASIBLE", async () => {
    const { request, tokens, t1, t2, frozen } = await s074WitnessFixture("s075-fix-witness");
    const compiled = request.rules.find((rule) => rule.kind === "REQUIRE_TABLE");
    assert.ok(compiled);
    assert.deepEqual(compiled.tableTokens, [positionTableToken(t1)]);
    assert.equal(compiled.tableTokens.some((token) => UUID_RE.test(token)), false);
    const assignments = explicitWitness(request, tokens, positionTableToken(t1), positionTableToken(t2));
    const report = validateSeatingV2({ contentHash: frozen.value.contentHash, compiledRequest: request }, assignments, []);
    assert.equal(report.verdict, "FEASIBLE");
    assert.ok(report.ruleOutcomes.every((item) => item.outcome === "SATISFIED"));
  });

  it("production solver seats all four and the independent validator agrees", async () => {
    const { request, frozen } = await s074WitnessFixture("s075-fix-solver");
    const solved = solveSeatingV2Compiled(request);
    assert.equal(solved.solverClaim, "FEASIBLE");
    assert.equal(solved.assignments.filter((item) => item.state === "SEATED").length, 4);
    const report = validateSeatingV2({ contentHash: frozen.value.contentHash, compiledRequest: request }, solved.assignments, []);
    assert.equal(report.verdict, "FEASIBLE");
    assert.ok(report.ruleOutcomes.every((item) => item.outcome === "SATISFIED"));
  });

  it("REQUIRE_TABLE missing published table fails before run creation", async () => {
    const { service, store } = fixtureService();
    prepareSurface(service, store);
    const guest = attendingGuest(service, "Miss", "s075-missing-g");
    const v2 = service.seatingV2Commands();
    await activate(v2, requireTable([guest.id], MISSING_TABLE), "s075-missing");
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-missing-freeze"), { seed: "s075-missing" }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("FORBID_TABLE excludes the compiled table token", async () => {
    const { service, store } = fixtureService();
    prepareSurface(service, store);
    const layout = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    const t1 = layout.tables[0]!.objectId;
    const guest = attendingGuest(service, "Forb", "s075-forbid-g");
    const v2 = service.seatingV2Commands();
    await activate(v2, forbidTable([guest.id], t1), "s075-forbid");
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-forbid-freeze"), { seed: "s075-forbid" });
    const request = await compiledForPackage(v2, frozen.value.id);
    const compiled = request.rules.find((rule) => rule.kind === "FORBID_TABLE");
    assert.ok(compiled);
    assert.deepEqual(compiled.tableTokens, [positionTableToken(t1)]);
    const solved = solveSeatingV2Compiled(request);
    const token = await guestToken(v2, frozen.value.id, guest.id);
    const seated = solved.assignments.find((item) => item.guestToken === token);
    const table = request.positions.find((item) => item.token === seated?.positionToken)?.tableToken;
    assert.notEqual(table, positionTableToken(t1));
  });

  it("table-targeted reservation compiles the canonical token and is enforced", async () => {
    const { service, store } = fixtureService();
    prepareSurface(service, store);
    const layout = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    const t1 = layout.tables[0]!.objectId;
    const guest = attendingGuest(service, "Resv", "s075-resv-g");
    const v2 = service.seatingV2Commands();
    const draft = await v2.createReservation(planner(), envelope(people.assignPlanner, "s075-resv-create"), {
      exact: 1,
      eligibleMemberIds: [guest.id],
      targets: [{ type: "TABLE", idOrCode: t1 }],
    });
    await v2.activateReservation(director(), envelope(people.assignDirector, "s075-resv-act"), { editionId: draft.value.id });
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-resv-freeze"), { seed: "s075-resv" });
    const request = await compiledForPackage(v2, frozen.value.id);
    assert.equal(request.reservations.length, 1);
    assert.deepEqual(request.reservations[0]!.tableTokens, [positionTableToken(t1)]);
  });

  it("reservation target missing from the published layout fails before run", async () => {
    const { service, store } = fixtureService();
    prepareSurface(service, store);
    const guest = attendingGuest(service, "Rmiss", "s075-resv-miss-g");
    const v2 = service.seatingV2Commands();
    const draft = await v2.createReservation(planner(), envelope(people.assignPlanner, "s075-resv-miss-create"), {
      exact: 1,
      eligibleMemberIds: [guest.id],
      targets: [{ type: "TABLE", idOrCode: MISSING_TABLE }],
    });
    await v2.activateReservation(director(), envelope(people.assignDirector, "s075-resv-miss-act"), { editionId: draft.value.id });
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "s075-resv-miss-freeze"), { seed: "s075-resv-miss" }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("raw layout UUIDs are absent from the compiled solver request, including nested arrays", async () => {
    const { request, t1 } = await s074WitnessFixture("s075-raw");
    const serialised = JSON.stringify(request);
    assert.equal(serialised.includes(t1), false);
    assert.equal(
      JSON.stringify(request.rules.flatMap((rule) => rule.tableTokens)).includes(t1),
      false,
    );
  });

  it("distinct table object IDs produce distinct stable tokens and the same ID is stable", () => {
    const a = "00000000-0000-4000-8000-00000000aaaa";
    const b = "00000000-0000-4000-8000-00000000bbbb";
    assert.notEqual(positionTableToken(a), positionTableToken(b));
    assert.equal(positionTableToken(a), positionTableToken(a));
    assert.equal(positionTableToken(a).length, 32);
  });
});
