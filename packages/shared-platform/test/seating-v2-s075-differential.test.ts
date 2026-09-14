import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { seatingV2AssignmentsHash, seatingV2TableToken } from "../src/seating-v2-hash.js";
import { SEATING_V2_VALIDATOR_VERSION, type SeatingV2Assignment, type SeatingV2CompiledRequest, type SeatingV2RuleContent } from "../src/seating-v2-schemas.js";
import { solveSeatingV2Compiled } from "../src/seating-v2-solver-adapter.js";
import { validateSeatingV2 } from "../src/seating-v2-validator.js";
import { ensureSeatingLayoutBindingForLayout } from "../src/seating-fixtures.js";
import { actor, fixtureService, people } from "./helpers.js";
import {
  S075_DIFFERENTIAL_SAMPLE_COUNT,
  S075_DIFFERENTIAL_SEED,
  assertS075DifferentialAgreement,
  detectS075DifferentialMutation,
  seatingV2ExhaustiveOracle,
  walkRawIdentity,
  type S075DifferentialObservation,
} from "./seating-v2-s075-oracle.js";

const NOW = "2026-09-13T14:00:00.000Z";

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-diff-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-diff-director" });
}
function envelope(
  assignmentId: string,
  key: string,
  row?: { contentHash: string; editionNo?: number; version?: number },
) {
  const base = {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `s075-diff-${key}`,
  };
  if (!row) return base;
  const expectedVersion = row.version ?? row.editionNo;
  if (typeof expectedVersion !== "number") {
    throw new Error("version and content hash are required");
  }
  return { ...base, expectedVersion, expectedContentHash: row.contentHash };
}
function cas(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}
function currentLayout(service: ReturnType<typeof fixtureService>["service"], layoutId: string, asDirector = false) {
  return service.getLayoutSetupWorkspace(asDirector ? director() : planner(), people.orgMaison, people.eventAlphaOne, layoutId).layout;
}

type InstanceSpec = {
  id: string;
  tables: Array<{ label: string; seats: number }>;
  guests: string[];
  rule?: "KEEP_TOGETHER" | "KEEP_APART" | "REQUIRE_TABLE" | "FORBID_TABLE";
  ruleTableIndex?: number;
  reserve?: { guestIndex: number; tableIndex: number; exact: number };
};

const INSTANCES: readonly InstanceSpec[] = [
  { id: "together-feasible", tables: [{ label: "T1", seats: 2 }], guests: ["Ada", "Bisi"], rule: "KEEP_TOGETHER" },
  { id: "apart-feasible", tables: [{ label: "T1", seats: 1 }, { label: "T2", seats: 1 }], guests: ["Ada", "Bisi"], rule: "KEEP_APART" },
  { id: "apart-infeasible", tables: [{ label: "T1", seats: 2 }], guests: ["Ada", "Bisi"], rule: "KEEP_APART" },
  { id: "require-feasible", tables: [{ label: "T1", seats: 2 }, { label: "T2", seats: 2 }], guests: ["Ada", "Bisi"], rule: "REQUIRE_TABLE", ruleTableIndex: 0 },
  { id: "forbid-feasible", tables: [{ label: "T1", seats: 1 }, { label: "T2", seats: 1 }], guests: ["Chika"], rule: "FORBID_TABLE", ruleTableIndex: 0 },
  { id: "forbid-infeasible", tables: [{ label: "T1", seats: 1 }], guests: ["Chika"], rule: "FORBID_TABLE", ruleTableIndex: 0 },
  { id: "reserve-feasible", tables: [{ label: "T1", seats: 2 }, { label: "T2", seats: 2 }], guests: ["Ada", "Bisi"], reserve: { guestIndex: 0, tableIndex: 0, exact: 1 } },
  { id: "capacity-infeasible", tables: [{ label: "T1", seats: 1 }], guests: ["Ada", "Bisi"] },
  { id: "together-infeasible", tables: [{ label: "T1", seats: 1 }, { label: "T2", seats: 1 }], guests: ["Ada", "Bisi"], rule: "KEEP_TOGETHER" },
  { id: "unicode-feasible", tables: [{ label: "T1", seats: 2 }], guests: ["Åsa", "陈伟"] },
  { id: "open-feasible", tables: [{ label: "T1", seats: 3 }], guests: ["Ada", "Bisi"] },
  { id: "require-one", tables: [{ label: "T1", seats: 2 }, { label: "T2", seats: 2 }], guests: ["Dami"], rule: "REQUIRE_TABLE", ruleTableIndex: 1 },
];

function ruleContent(kind: NonNullable<InstanceSpec["rule"]>, guestIds: string[], tableId?: string): SeatingV2RuleContent {
  const subjects = guestIds.map((id) => ({ type: "EVENT_GUEST" as const, id }));
  const targets = tableId ? [{ type: "TABLE" as const, idOrCode: tableId }] : [];
  return {
    kind,
    hardness: "HARD",
    weight: null,
    scope: "TABLE",
    specialistDomain: "NONE",
    subjects,
    targets,
    source: { type: "MANUAL" },
  };
}

async function buildInstance(spec: InstanceSpec) {
  const { service, store } = fixtureService();
  const snap = store.snapshot();
  const venue =
    snap.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(director(), {
      organisationId: people.orgMaison,
      displayName: "S075 oracle pavilion",
      reason: "Seed oracle layout venue",
      idempotencyKey: `${spec.id}-venue-seed`,
    });
  const adopted = service.adoptVenue(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt oracle venue",
    idempotencyKey: `${spec.id}-adopt-venue`,
  });
  let layout = service.createBlankLayout(planner(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    eventVenueId: adopted.id,
    name: `${spec.id} hall`,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create oracle layout",
    idempotencyKey: `${spec.id}-layout`,
  });
  for (const [index, table] of spec.tables.entries()) {
    layout = service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: `Add ${table.label}`,
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: table.label,
        geometry: { kind: "RECTANGLE", xMm: 1200 + index * 3000, yMm: 1200, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: table.seats },
      },
    });
    const created = service
      .getLayoutSetupWorkspace(planner(), people.orgMaison, people.eventAlphaOne, layout.id)
      .objects.find((item) => item.objectType === "TABLE" && item.label === table.label);
    assert.ok(created);
    layout = service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: `Physical seats for ${table.label}`,
      command: { kind: "GENERATE_SEATS", tableId: created.id, seatCount: table.seats, confirmDestructive: false },
    });
  }
  service.runLayoutValidation(planner(), { ...cas(currentLayout(service, layout.id)), reason: "Validate oracle layout" });
  const submitted = service.submitLayoutApproval(planner(), { ...cas(currentLayout(service, layout.id)), reason: "Submit oracle layout" });
  service.decideLayoutApproval(director(), {
    ...cas(currentLayout(service, layout.id, true)),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve oracle layout",
  });
  service.publishLayout(director(), { ...cas(currentLayout(service, layout.id, true)), reason: "Publish oracle layout" });
  await ensureSeatingLayoutBindingForLayout(service, {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    layoutId: layout.id,
    plannerAssignmentId: people.assignPlanner,
    directorAssignmentId: people.assignDirector,
    idempotencyPrefix: `${spec.id}-bind`,
  });
  const published = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "oracle RSVP",
    idempotencyKey: `${spec.id}-rsvp-prep`,
  });
  const guests = spec.guests.map((givenName, index) => {
    const guest = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName,
      familyName: "Oracle",
      email: `${spec.id}.${index}@example.test`,
      reason: "oracle guest",
      idempotencyKey: `${spec.id}-g${index}-in`,
    });
    service.staffEnterRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "oracle attending",
      idempotencyKey: `${spec.id}-g${index}-rsvp`,
    });
    return guest;
  });
  const v2 = service.seatingV2Commands();
  if (spec.rule) {
    const tableId = spec.ruleTableIndex !== undefined ? published.tables[spec.ruleTableIndex]!.objectId : undefined;
    const created = await v2.createRule(
      planner(),
      envelope(people.assignPlanner, `${spec.id}-rule-c`),
      ruleContent(spec.rule, guests.map((item) => item.id), tableId),
    );
    await v2.activateRule(director(), envelope(people.assignDirector, `${spec.id}-rule-a`, created.value), { editionId: created.value.id });
  }
  if (spec.reserve) {
    const reserved = await v2.createReservation(planner(), envelope(people.assignPlanner, `${spec.id}-res-c`), {
      exact: spec.reserve.exact,
      eligibleMemberIds: [guests[spec.reserve.guestIndex]!.id],
      targets: [{ type: "TABLE", idOrCode: published.tables[spec.reserve.tableIndex]!.objectId }],
    });
    await v2.activateReservation(director(), envelope(people.assignDirector, `${spec.id}-res-a`, reserved.value), { editionId: reserved.value.id });
  }
  const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, `${spec.id}-freeze`), {
    seed: `${S075_DIFFERENTIAL_SEED}:${spec.id}`,
  });
  const compiled = await v2.repository.transaction(async (tx) => {
    const rows = await tx.list<{ packageId: string; compiledRequestJson: SeatingV2CompiledRequest }>("compiledRequests", {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
    });
    return rows.find((item) => item.packageId === frozen.value.id)?.compiledRequestJson;
  });
  assert.ok(compiled);
  return { spec, service, store, published, guests, v2, frozen, compiled };
}

function compareBuilt(built: Awaited<ReturnType<typeof buildInstance>>) {
  const solved = solveSeatingV2Compiled(built.compiled);
  const report = validateSeatingV2(
    { contentHash: built.frozen.value.contentHash, compiledRequest: built.compiled },
    solved.assignments,
    solved.assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
    NOW,
  );
  const oracle = seatingV2ExhaustiveOracle(built.compiled, built.frozen.value.contentHash, NOW);
  return {
    solved,
    report,
    oracle,
    observations: assertS075DifferentialAgreement({
      specId: built.spec.id,
      seed: built.frozen.value.deterministicSeed,
      request: built.compiled,
      packageContentHash: built.frozen.value.contentHash,
      solverClaim: solved.solverClaim,
      solverAssignments: solved.assignments,
      validatorVerdict: report.verdict,
      oracle,
    }),
  };
}

function observe(name: string, value: unknown, kind: S075DifferentialObservation["kind"] = "mutation"): S075DifferentialObservation {
  return { kind, name, value };
}

describe("S075 differential oracle", () => {
  it("regresses the smallest Section 9 seed as certified INFEASIBLE", async () => {
    const built = await buildInstance(INSTANCES.find((item) => item.id === "capacity-infeasible")!);
    const solved = solveSeatingV2Compiled(built.compiled);
    const report = validateSeatingV2(
      { contentHash: built.frozen.value.contentHash, compiledRequest: built.compiled },
      solved.assignments,
      solved.assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
      NOW,
    );
    const oracle = seatingV2ExhaustiveOracle(built.compiled, built.frozen.value.contentHash, NOW);
    assert.equal(built.frozen.value.deterministicSeed, `${S075_DIFFERENTIAL_SEED}:capacity-infeasible`);
    assert.equal(solved.solverClaim, "INFEASIBLE");
    assert.equal(report.verdict, "INFEASIBLE");
    assert.equal(oracle.kind, "NONE");
    assert.equal(JSON.stringify(solved.assignments).includes("GOVERNED_UNSEATED"), false);
  });

  it("compares the real chain against an independent exhaustive oracle on a documented sample", async () => {
    assert.equal(INSTANCES.length, S075_DIFFERENTIAL_SAMPLE_COUNT);
    const kinds = new Set<string>();
    const oracleKinds = new Set<string>();
    let firstHash = "";
    for (const spec of INSTANCES) {
      const built = await buildInstance(spec);
      assert.equal(walkRawIdentity(built.compiled), false);
      const publishedTokens = new Set(built.published.tables.map((table) => table.tableToken));
      assert.ok(built.compiled.positions.every((item) => publishedTokens.has(item.tableToken)));
      assert.ok(built.published.tables.every((table) => table.tableToken === seatingV2TableToken(table.objectId)));
      const compared = compareBuilt(built);
      kinds.add(spec.rule ?? spec.reserve ? spec.rule ?? "RESERVE" : "OPEN");
      oracleKinds.add(compared.oracle.kind);
      if (spec.id === "open-feasible") {
        const again = solveSeatingV2Compiled(built.compiled);
        assert.equal(again.rawOutputHash, compared.solved.rawOutputHash);
        assert.equal(seatingV2AssignmentsHash(again.assignments), seatingV2AssignmentsHash(compared.solved.assignments));
        firstHash = built.frozen.value.contentHash;
        const replay = await built.v2.freezePackage(planner(), envelope(people.assignPlanner, `${spec.id}-freeze-2`), {
          seed: `${S075_DIFFERENTIAL_SEED}:${spec.id}`,
        });
        assert.equal(replay.application, "REPLAYED");
        assert.equal(replay.value.contentHash, firstHash);
      }
    }
    assert.ok(oracleKinds.has("WITNESS"));
    assert.ok(oracleKinds.has("NONE"));
    assert.ok(kinds.has("KEEP_TOGETHER"));
    assert.ok(kinds.has("KEEP_APART"));
    assert.ok(kinds.has("REQUIRE_TABLE"));
    assert.ok(kinds.has("FORBID_TABLE"));
    assert.ok(kinds.has("RESERVE"));
  });

  it("detects each prescribed mutation from resulting observations", async () => {
    const requireBuilt = await buildInstance(INSTANCES.find((item) => item.id === "require-feasible")!);
    const reserveBuilt = await buildInstance(INSTANCES.find((item) => item.id === "reserve-feasible")!);
    const forbidBuilt = await buildInstance(INSTANCES.find((item) => item.id === "forbid-feasible")!);
    const apartBuilt = await buildInstance(INSTANCES.find((item) => item.id === "apart-feasible")!);
    const openBuilt = await buildInstance(INSTANCES.find((item) => item.id === "open-feasible")!);

    const rawRequest = structuredClone(requireBuilt.compiled);
    rawRequest.rules[0] = { ...rawRequest.rules[0]!, tableTokens: [requireBuilt.published.tables[0]!.objectId] };
    assert.equal(
      detectS075DifferentialMutation([observe("rawIdentityPresent", walkRawIdentity(rawRequest), "compiled")]),
      "RAW_TABLE_IDENTITY",
    );

    const mismatched = structuredClone(requireBuilt.compiled);
    mismatched.rules[0] = { ...mismatched.rules[0]!, tableTokens: ["ab".repeat(16)] };
    const mismatchedTables = new Set(mismatched.positions.map((item) => item.tableToken));
    assert.equal(
      detectS075DifferentialMutation([
        observe("unknownTableTarget", mismatched.rules[0]!.tableTokens.some((token) => !mismatchedTables.has(token)), "compiled"),
      ]),
      "MISSING_OR_MISMATCHED_TABLE_TOKEN",
    );

    const solverWithoutReservation = { ...reserveBuilt.compiled, reservations: [] };
    const reservedSolved = solveSeatingV2Compiled(solverWithoutReservation);
    const reservedReport = validateSeatingV2(
      { contentHash: reserveBuilt.frozen.value.contentHash, compiledRequest: reserveBuilt.compiled },
      reservedSolved.assignments,
      reservedSolved.assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
      NOW,
    );
    const reservationIgnored =
      solverWithoutReservation.reservations.length === 0 &&
      reserveBuilt.compiled.reservations.length > 0 &&
      (reservedReport.verdict === "INFEASIBLE" || reservedSolved.solverClaim === "FEASIBLE");
    assert.equal(detectS075DifferentialMutation([observe("reservationIgnored", reservationIgnored)]), "IGNORED_RESERVATION");

    const silenced: SeatingV2Assignment[] = openBuilt.compiled.guests.map((guest, index) =>
      index === 0
        ? { guestToken: guest.token, state: "UNSEATED", positionToken: null, typedReasonCodes: [] }
        : {
            guestToken: guest.token,
            state: "SEATED",
            positionToken: openBuilt.compiled.positions[index]!.token,
            typedReasonCodes: [],
          },
    );
    const silentReport = validateSeatingV2(
      { contentHash: openBuilt.frozen.value.contentHash, compiledRequest: openBuilt.compiled },
      silenced,
      [],
      NOW,
    );
    assert.equal(silentReport.verdict, "INFEASIBLE");
    assert.equal(
      detectS075DifferentialMutation([
        observe(
          "unseatedRequiredWithoutException",
          silentReport.structuralOutcomes.some((item) => item.checkCode === "UNSEATED_REQUIRED_GUEST" && item.outcome === "FAILED"),
          "solver",
        ),
      ]),
      "SILENT_UNSEATED_REQUIRED",
    );

    const invalidClaim = collectForcedClaim(openBuilt, "FEASIBLE", [
      { guestToken: openBuilt.compiled.guests[0]!.token, state: "UNSEATED", positionToken: null, typedReasonCodes: [] },
    ]);
    assert.equal(detectS075DifferentialMutation(invalidClaim), "INVALID_FEASIBLE_CLAIM");

    const witness = seatingV2ExhaustiveOracle(apartBuilt.compiled, apartBuilt.frozen.value.contentHash, NOW);
    assert.equal(witness.kind, "WITNESS");
    const falseInfeasible = collectForcedClaim(apartBuilt, "INFEASIBLE", witness.witness ?? []);
    assert.equal(detectS075DifferentialMutation(falseInfeasible), "FALSE_INFEASIBLE_CLAIM");

    const forbidOmitted = solveSeatingV2Compiled({ ...forbidBuilt.compiled, rules: [] });
    const forbidTable = forbidBuilt.compiled.rules[0]!.tableTokens[0]!;
    const seatedOnForbidden = forbidOmitted.assignments.some((item) => {
      const table = forbidBuilt.compiled.positions.find((position) => position.token === item.positionToken)?.tableToken;
      return table === forbidTable;
    });
    assert.equal(detectS075DifferentialMutation([observe("forbidTableOmitted", seatedOnForbidden || forbidOmitted.solverClaim === "FEASIBLE")]), "OMITTED_FORBID_TABLE");

    const inverted = structuredClone(apartBuilt.compiled);
    inverted.rules = inverted.rules.map((item) => (item.kind === "KEEP_APART" ? { ...item, kind: "KEEP_TOGETHER" } : item));
    const invertedSolved = solveSeatingV2Compiled(inverted);
    const honest = solveSeatingV2Compiled(apartBuilt.compiled);
    assert.equal(
      detectS075DifferentialMutation([
        observe("keepApartInverted", invertedSolved.rawOutputHash !== honest.rawOutputHash || inverted.rules[0]!.kind !== apartBuilt.compiled.rules[0]!.kind),
      ]),
      "INVERTED_KEEP_APART",
    );

    const drifted = structuredClone(openBuilt.compiled);
    drifted.positions = drifted.positions.map((item) => ({ ...item, tableToken: "cd".repeat(16) }));
    assert.equal(
      detectS075DifferentialMutation([
        observe(
          "positionNamespaceDrift",
          drifted.positions.some((item, index) => item.tableToken !== openBuilt.compiled.positions[index]!.tableToken),
        ),
      ]),
      "POSITION_TOKEN_NAMESPACE_DRIFT",
    );

    assert.equal(
      detectS075DifferentialMutation([
        observe("validatorBypassed", invalidClaim.some((item) => item.name === "validatorBypassed" && item.value === true)),
      ]),
      "TRUSTED_SOLVER_CLAIM",
    );
    const historicValidatorVersion: string = "s06-validator-v2";
    assert.equal(
      detectS075DifferentialMutation([
        observe("validatorVersionDrift", historicValidatorVersion !== SEATING_V2_VALIDATOR_VERSION),
      ]),
      "VALIDATOR_VERSION_REUSE",
    );

    await assert.rejects(
      async () => {
        const { service, store } = fixtureService();
        const venue =
          store.snapshot().venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
          service.createVenue(director(), {
            organisationId: people.orgMaison,
            displayName: "mismatch pavilion",
            reason: "mismatch venue",
            idempotencyKey: "s075-diff-mis-venue",
          });
        const adopted = service.adoptVenue(director(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          venueId: venue.id,
          reason: "adopt mismatch",
          idempotencyKey: "s075-diff-mis-adopt",
        });
        let layout = service.createBlankLayout(planner(), {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          eventVenueId: adopted.id,
          name: "mismatch hall",
          widthMm: 24000,
          heightMm: 18000,
          reason: "mismatch layout",
          idempotencyKey: "s075-diff-mis-layout",
        });
        layout = service.applyLayoutCommand(planner(), {
          ...cas(layout),
          reason: "mismatch table",
          command: {
            kind: "CREATE_OBJECT",
            objectType: "TABLE",
            label: "M1",
            geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
            subtype: { shape: "RECTANGLE", declaredCapacity: 4 },
          },
        });
        const table = service
          .getLayoutSetupWorkspace(planner(), people.orgMaison, people.eventAlphaOne, layout.id)
          .objects.find((item) => item.objectType === "TABLE");
        assert.ok(table);
        layout = service.applyLayoutCommand(planner(), {
          ...cas(layout),
          reason: "two physical",
          command: { kind: "GENERATE_SEATS", tableId: table.id, seatCount: 2, confirmDestructive: false },
        });
        service.runLayoutValidation(planner(), { ...cas(currentLayout(service, layout.id)), reason: "validate mismatch" });
        const submitted = service.submitLayoutApproval(planner(), { ...cas(currentLayout(service, layout.id)), reason: "submit mismatch" });
        service.decideLayoutApproval(director(), {
          ...cas(currentLayout(service, layout.id, true)),
          approvalId: submitted.id,
          decision: "APPROVED",
          reason: "approve mismatch",
        });
        service.publishLayout(director(), { ...cas(currentLayout(service, layout.id, true)), reason: "publish mismatch" });
        await ensureSeatingLayoutBindingForLayout(service, {
          organisationId: people.orgMaison,
          eventId: people.eventAlphaOne,
          layoutId: layout.id,
          plannerAssignmentId: people.assignPlanner,
          directorAssignmentId: people.assignDirector,
          idempotencyPrefix: "s075-diff-mis-bind",
        });
        const published = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
        assert.equal(published.tables[0]!.physicalPositionCount, 2);
        assert.equal(published.tables[0]!.declaredCapacity, 4);
        assert.equal(
          detectS075DifferentialMutation([
            observe(
              "declaredUsedDespitePhysical",
              published.tables[0]!.physicalPositionCount > 0 && published.tables[0]!.declaredCapacity > published.tables[0]!.physicalPositionCount,
            ),
          ]),
          "DECLARED_CAPACITY_OVER_PHYSICAL",
        );
        await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "s075-diff-mis-freeze"));
      },
      (error: unknown) => error instanceof PlatformError && error.code === "SEAT_CAPACITY_MISMATCH",
    );
  });
});

function collectForcedClaim(
  built: Awaited<ReturnType<typeof buildInstance>>,
  claim: "FEASIBLE" | "INFEASIBLE",
  assignments: readonly SeatingV2Assignment[],
): S075DifferentialObservation[] {
  const report = validateSeatingV2(
    { contentHash: built.frozen.value.contentHash, compiledRequest: built.compiled },
    assignments,
    assignments.filter((item) => item.state === "UNSEATED").map((item) => item.guestToken),
    NOW,
  );
  const oracle = seatingV2ExhaustiveOracle(built.compiled, built.frozen.value.contentHash, NOW);
  return [
    { kind: "solver", name: "solverClaim", value: claim },
    { kind: "validator", name: "validatorVerdict", value: report.verdict },
    { kind: "oracle", name: "oracleKind", value: oracle.kind },
    { kind: "solver", name: "invalidFeasibleClaim", value: claim === "FEASIBLE" && report.verdict !== "FEASIBLE" },
    { kind: "solver", name: "falseInfeasibleClaim", value: claim === "INFEASIBLE" && oracle.kind === "WITNESS" },
    { kind: "mutation", name: "validatorBypassed", value: claim === "FEASIBLE" && report.verdict !== "FEASIBLE" },
  ];
}
