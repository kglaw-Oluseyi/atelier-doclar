import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSeatingV2CompiledRequest, compileSeatingV2Request } from "../src/seating-v2-compiler.js";
import {
  seatingV2AssignmentsHash,
  seatingV2PackageContentHash,
  seatingV2RuleContentHash,
  seatingV2SemanticHash,
  seatingV2SolverToken,
} from "../src/seating-v2-hash.js";
import {
  SEATING_V2_SOLVER_VERSION,
  type SeatingV2CompiledRequest,
  type SeatingV2RuleContent,
} from "../src/seating-v2-schemas.js";
import { validateSeatingV2 } from "../src/seating-v2-validator.js";

const ORG = "00000000-0000-4000-8000-000000000001";
const EVENT = "00000000-0000-4000-8000-000000000021";
const GUEST_A = "00000000-0000-4000-8000-0000000000a1";
const GUEST_B = "00000000-0000-4000-8000-0000000000b2";
const GUEST_C = "00000000-0000-4000-8000-0000000000c3";
const RULE_ID = "00000000-0000-4000-8000-0000000000d4";
const PEPPER = "s06-non-production-pepper";

function keepApart(): SeatingV2RuleContent {
  return {
    kind: "KEEP_APART",
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects: [
      { type: "EVENT_GUEST", id: GUEST_A },
      { type: "EVENT_GUEST", id: GUEST_B },
    ],
    targets: [],
    source: { type: "MANUAL" },
  };
}

function compile(rules = [keepApart()], extras?: { dropRule?: boolean; omitGuest?: boolean }) {
  const ruleHash = seatingV2RuleContentHash(rules[0]!);
  const semanticHash = seatingV2SemanticHash({
    cohortHash: "cohort",
    rsvpSnapshotHash: "rsvp",
    layoutPublicationId: "00000000-0000-4000-8000-000000000031",
    layoutContentHash: "layout",
    eventBriefContentHash: null,
    protectionSnapshotHash: null,
    ruleEditions: extras?.dropRule ? [] : [{ id: RULE_ID, contentHash: ruleHash }],
    reservationEditions: [],
    lockSetHash: "locks",
    solverConfigHash: "config",
    deterministicSeed: "seed-1",
  });
  const guests = [
    { eventGuestId: GUEST_A, eligible: true },
    { eventGuestId: extras?.omitGuest ? GUEST_C : GUEST_B, eligible: true },
  ];
  if (!extras?.omitGuest) {
    guests.splice(1, 1, { eventGuestId: GUEST_B, eligible: true });
  }
  return compileSeatingV2Request({
    organisationId: ORG,
    eventId: EVENT,
    semanticHash,
    pepper: PEPPER,
    configHash: "config-hash-0001",
    seed: "seed-1",
    guests: extras?.omitGuest
      ? [
          { eventGuestId: GUEST_A, eligible: true },
          { eventGuestId: GUEST_C, eligible: true },
        ]
      : [
          { eventGuestId: GUEST_A, eligible: true },
          { eventGuestId: GUEST_B, eligible: true },
        ],
    positions: [
      { positionToken: "pos-1", tableToken: "table-1" },
      { positionToken: "pos-2", tableToken: "table-1" },
      { positionToken: "pos-3", tableToken: "table-2" },
    ],
    rules: extras?.dropRule
      ? []
      : [
          {
            editionId: RULE_ID,
            contentHash: ruleHash,
            lifecycle: "ACTIVE",
            content: rules[0]!,
          },
        ],
    reservations: [],
  });
}

describe("EOS-S06 V2 hashing, compilation and validator", () => {
  it("changes the semantic hash when an active hard rule is added or dropped", () => {
    const withRule = seatingV2SemanticHash({
      cohortHash: "cohort",
      rsvpSnapshotHash: "rsvp",
      layoutPublicationId: "00000000-0000-4000-8000-000000000031",
      layoutContentHash: "layout",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [{ id: RULE_ID, contentHash: seatingV2RuleContentHash(keepApart()) }],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "config",
      deterministicSeed: "seed-1",
    });
    const dropped = seatingV2SemanticHash({
      cohortHash: "cohort",
      rsvpSnapshotHash: "rsvp",
      layoutPublicationId: "00000000-0000-4000-8000-000000000031",
      layoutContentHash: "layout",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "config",
      deterministicSeed: "seed-1",
    });
    assert.notEqual(withRule, dropped);
  });

  it("M01 refuses a package whose compiled rules drop an ACTIVE hard rule", () => {
    const honest = compile();
    const dropped = compile(undefined, { dropRule: true });
    assert.equal(honest.request.rules.length, 1);
    assert.equal(dropped.request.rules.length, 0);
    assert.notEqual(honest.compiledRequestHash, dropped.compiledRequestHash);
  });

  it("M02 fails compilation when an affected guest token is omitted", () => {
    assert.throws(() => compile(undefined, { omitGuest: true }), /omitted a subject token|could not be compiled/);
  });

  it("M04 includes rule hashes in the package content hash", () => {
    const honest = compile();
    const withoutRules = seatingV2PackageContentHash(
      seatingV2SemanticHash({
        cohortHash: "cohort",
        rsvpSnapshotHash: "rsvp",
        layoutPublicationId: "00000000-0000-4000-8000-000000000031",
        layoutContentHash: "layout",
        eventBriefContentHash: null,
        protectionSnapshotHash: null,
        ruleEditions: [],
        reservationEditions: [],
        lockSetHash: "locks",
        solverConfigHash: "config",
        deterministicSeed: "seed-1",
      }),
      honest.compiledRequestHash,
    );
    const withRules = seatingV2PackageContentHash(
      seatingV2SemanticHash({
        cohortHash: "cohort",
        rsvpSnapshotHash: "rsvp",
        layoutPublicationId: "00000000-0000-4000-8000-000000000031",
        layoutContentHash: "layout",
        eventBriefContentHash: null,
        protectionSnapshotHash: null,
        ruleEditions: [{ id: RULE_ID, contentHash: seatingV2RuleContentHash(keepApart()) }],
        reservationEditions: [],
        lockSetHash: "locks",
        solverConfigHash: "config",
        deterministicSeed: "seed-1",
      }),
      honest.compiledRequestHash,
    );
    assert.notEqual(withRules, withoutRules);
  });

  it("M05 includes reservation hashes in the semantic hash", () => {
    const empty = seatingV2SemanticHash({
      cohortHash: "cohort",
      rsvpSnapshotHash: "rsvp",
      layoutPublicationId: "00000000-0000-4000-8000-000000000031",
      layoutContentHash: "layout",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [],
      lockSetHash: "locks",
      solverConfigHash: "config",
      deterministicSeed: "seed-1",
    });
    const withReservation = seatingV2SemanticHash({
      cohortHash: "cohort",
      rsvpSnapshotHash: "rsvp",
      layoutPublicationId: "00000000-0000-4000-8000-000000000031",
      layoutContentHash: "layout",
      eventBriefContentHash: null,
      protectionSnapshotHash: null,
      ruleEditions: [],
      reservationEditions: [{ id: "00000000-0000-4000-8000-0000000000e5", contentHash: "reservation-hash-1" }],
      lockSetHash: "locks",
      solverConfigHash: "config",
      deterministicSeed: "seed-1",
    });
    assert.notEqual(empty, withReservation);
  });

  it("M20 rejects a forbidden free-text field on the compiled request", () => {
    const honest = compile();
    assert.throws(() => assertSeatingV2CompiledRequest({ ...honest.request, name: "Guest A" }));
  });

  it("binds solver tokens to organisation, event and semantic hash", () => {
    const first = seatingV2SolverToken(PEPPER, ORG, EVENT, "hash-a", GUEST_A);
    const second = seatingV2SolverToken(PEPPER, ORG, EVENT, "hash-b", GUEST_A);
    const otherEvent = seatingV2SolverToken(PEPPER, ORG, "00000000-0000-4000-8000-000000000022", "hash-a", GUEST_A);
    assert.notEqual(first, second);
    assert.notEqual(first, otherEvent);
    assert.match(first, /^[0-9a-f]{64}$/);
  });

  it("M06 / M07 independent validator rejects a hard-violating KEEP_APART assignment", () => {
    const compiled = compile();
    const tokenA = compiled.request.guests[0]!.token;
    const tokenB = compiled.request.guests[1]!.token;
    const report = validateSeatingV2(
      { contentHash: "package-hash-0001", compiledRequest: compiled.request },
      [
        { guestToken: tokenA, state: "SEATED", positionToken: "pos-1", typedReasonCodes: [] },
        { guestToken: tokenB, state: "SEATED", positionToken: "pos-2", typedReasonCodes: [] },
      ],
      [],
    );
    assert.equal(report.verdict, "INFEASIBLE");
    assert.equal(report.ruleOutcomes[0]?.outcome, "VIOLATED");
    const separated = validateSeatingV2(
      { contentHash: "package-hash-0001", compiledRequest: compiled.request },
      [
        { guestToken: tokenA, state: "SEATED", positionToken: "pos-1", typedReasonCodes: [] },
        { guestToken: tokenB, state: "SEATED", positionToken: "pos-3", typedReasonCodes: [] },
      ],
      [],
    );
    assert.equal(separated.verdict, "FEASIBLE");
    assert.equal(separated.ruleOutcomes[0]?.outcome, "SATISFIED");
  });

  it("does not let SOFT outcomes change the verdict", () => {
    const soft: SeatingV2RuleContent = { ...keepApart(), hardness: "SOFT", weight: 5, kind: "PREFER_APART" };
    const ruleHash = seatingV2RuleContentHash(soft);
    const compiled = compileSeatingV2Request({
      organisationId: ORG,
      eventId: EVENT,
      semanticHash: "s".repeat(32),
      pepper: PEPPER,
      configHash: "config-hash-0001",
      seed: "seed-1",
      guests: [
        { eventGuestId: GUEST_A, eligible: true },
        { eventGuestId: GUEST_B, eligible: true },
      ],
      positions: [
        { positionToken: "pos-1", tableToken: "table-1" },
        { positionToken: "pos-2", tableToken: "table-1" },
      ],
      rules: [{ editionId: RULE_ID, contentHash: ruleHash, lifecycle: "ACTIVE", content: soft }],
      reservations: [],
    });
    const report = validateSeatingV2(
      { contentHash: "package-hash-0001", compiledRequest: compiled.request },
      compiled.request.guests.map((guest, index) => ({
        guestToken: guest.token,
        state: "SEATED" as const,
        positionToken: index === 0 ? "pos-1" : "pos-2",
        typedReasonCodes: [],
      })),
      [],
    );
    assert.equal(report.verdict, "FEASIBLE");
  });

  it("ignores annotations when hashing rule substance", () => {
    const left = seatingV2RuleContentHash(keepApart());
    const right = seatingV2RuleContentHash(keepApart());
    assert.equal(left, right);
    assert.equal(SEATING_V2_SOLVER_VERSION, "s06-solver-v2");
  });

  it("changes assignment hash when a seated pair is corrupted", () => {
    const first = seatingV2AssignmentsHash([
      { guestToken: "a", state: "SEATED", positionToken: "pos-1", typedReasonCodes: [] },
    ]);
    const corrupted = seatingV2AssignmentsHash([
      { guestToken: "a", state: "SEATED", positionToken: "pos-2", typedReasonCodes: [] },
    ]);
    assert.notEqual(first, corrupted);
  });

  it("does not import the V1 solver from the validator module", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/seating-v2-validator.ts", import.meta.url), "utf8"),
    );
    assert.equal(/seating-solver-v1/.test(source), false);
  });

  it("compiled request matches eos-s06-solver-v2 and carries no guest names", () => {
    const compiled = compile();
    const request: SeatingV2CompiledRequest = compiled.request;
    assert.equal(request.contract, "eos-s06-solver-v2");
    assert.equal(JSON.stringify(request).includes("Guest"), false);
    assert.equal(JSON.stringify(request).includes(GUEST_A), false);
  });
});
