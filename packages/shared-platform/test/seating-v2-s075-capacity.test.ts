import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PlatformError } from "../src/errors.js";
import { seatingV2TableToken } from "../src/seating-v2-hash.js";
import { snapshotLayoutAdapter } from "../src/seating-adapters.js";
import { seatingV2TableCapacityTruth } from "../src/seating-v2-capacity.js";
import { emptySeatingV2State } from "../src/seating-v2-state.js";
import { buildSeatingV2Workspace } from "../src/seating-v2-workspace.js";
import { SeatingV2TableTokenSchema } from "../src/seating-v2-schemas.js";
import { actor, fixtureService, people } from "./helpers.js";

const NOW = "2026-09-13T13:00:00.000Z";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function planner() {
  return actor(people.personPlanner, { now: NOW, correlationId: "s075-capacity-planner" });
}
function director() {
  return actor(people.personDirector, { now: NOW, correlationId: "s075-capacity-director" });
}

function envelope(assignmentId: string, key: string) {
  return {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `s075-capacity-${key}`,
  };
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

function currentLayout(
  service: ReturnType<typeof fixtureService>["service"],
  layoutId: string,
  actorFn = planner,
) {
  return service.getLayoutSetupWorkspace(actorFn(), people.orgMaison, people.eventAlphaOne, layoutId).layout;
}

type CapacitySpec = {
  label: string;
  declaredCapacity: number;
  physicalSeatCount: number;
};

function publishCapacityLayout(
  service: ReturnType<typeof fixtureService>["service"],
  store: ReturnType<typeof fixtureService>["store"],
  tables: readonly CapacitySpec[],
  prefix: string,
) {
  const snap = store.snapshot();
  const venue =
    snap.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(director(), {
      organisationId: people.orgMaison,
      displayName: "S075 capacity pavilion",
      reason: "Seed capacity layout venue",
      idempotencyKey: `${prefix}-venue`,
    });
  const adopted = service.adoptVenue(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt capacity layout venue",
    idempotencyKey: `${prefix}-adopt`,
  });
  let layout = service.createBlankLayout(planner(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    eventVenueId: adopted.id,
    name: `${prefix} hall`,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create capacity layout",
    idempotencyKey: `${prefix}-layout`,
  });
  for (const [index, table] of tables.entries()) {
    layout = service.applyLayoutCommand(planner(), {
      ...cas(layout),
      reason: `Add ${table.label}`,
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: table.label,
        geometry: { kind: "RECTANGLE", xMm: 1200 + index * 3000, yMm: 1200, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: table.declaredCapacity },
      },
    });
    const created = service
      .getLayoutSetupWorkspace(planner(), people.orgMaison, people.eventAlphaOne, layout.id)
      .objects.find((item) => item.objectType === "TABLE" && item.label === table.label);
    assert.ok(created);
    if (table.physicalSeatCount > 0) {
      layout = service.applyLayoutCommand(planner(), {
        ...cas(layout),
        reason: `Generate ${table.physicalSeatCount} physical seats for ${table.label}`,
        command: {
          kind: "GENERATE_SEATS",
          tableId: created.id,
          seatCount: table.physicalSeatCount,
          confirmDestructive: false,
        },
      });
    }
  }
  service.runLayoutValidation(planner(), { ...cas(currentLayout(service, layout.id)), reason: "Validate capacity layout" });
  const submitted = service.submitLayoutApproval(planner(), {
    ...cas(currentLayout(service, layout.id)),
    reason: "Submit capacity layout",
  });
  service.decideLayoutApproval(director(), {
    ...cas(currentLayout(service, layout.id, director)),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve capacity layout",
  });
  service.publishLayout(director(), { ...cas(currentLayout(service, layout.id, director)), reason: "Publish capacity layout" });
  return {
    layoutId: layout.id,
    published: snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne),
  };
}

function prepareGuests(service: ReturnType<typeof fixtureService>["service"], prefix: string, names: string[]) {
  service.prepareEventRsvp(director(), {
    organisationId: people.orgMaison,
    eventId: people.eventAlphaOne,
    hostDisplayName: "Maison Doclar",
    eventDisplayName: "Alpha One",
    reason: "prepare RSVP for S075 capacity",
    idempotencyKey: `${prefix}-rsvp`,
  });
  return names.map((givenName, index) => {
    const guest = service.intakeGuest(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      givenName,
      familyName: "Capacity",
      email: `${givenName.toLowerCase()}.${prefix}@example.test`,
      reason: "S075 capacity guest",
      idempotencyKey: `${prefix}-g${index}-in`,
    });
    service.staffEnterRsvp(director(), {
      organisationId: people.orgMaison,
      eventId: people.eventAlphaOne,
      guestId: guest.id,
      attendanceIntent: "ATTENDING",
      answers: { attendanceIntent: "ATTENDING", sensitiveConsent: true },
      reason: "mark attending for S075 capacity",
      idempotencyKey: `${prefix}-g${index}-rsvp`,
    });
    return guest;
  });
}

async function compiledPositions(
  v2: ReturnType<ReturnType<typeof fixtureService>["service"]["seatingV2Commands"]>,
  packageId: string,
) {
  return v2.repository.transaction(async (tx) => {
    const rows = await tx.list<{ packageId: string; compiledRequestJson: { positions: Array<{ token: string; tableToken: string }> } }>(
      "compiledRequests",
      { organisationId: people.orgMaison, eventId: people.eventAlphaOne },
    );
    return rows.find((item) => item.packageId === packageId)?.compiledRequestJson.positions ?? [];
  });
}

describe("S075 seating capacity truth", () => {
  it("treats matching physical seats as authoritative and uses the canonical table token", async () => {
    const { service, store } = fixtureService();
    const { published } = publishCapacityLayout(
      service,
      store,
      [{ label: "Physical Four", declaredCapacity: 4, physicalSeatCount: 4 }],
      "phys",
    );
    assert.equal(published.tables.length, 1);
    const table = published.tables[0]!;
    assert.equal(table.positionSource, "PHYSICAL");
    assert.equal(table.physicalPositionCount, 4);
    assert.equal(table.declaredCapacity, 4);
    assert.equal(table.capacity, 4);
    assert.equal(table.mismatch, false);
    assert.equal(table.tableToken, seatingV2TableToken(table.objectId));
    assert.equal(table.seatAnchors.length, 4);
    prepareGuests(service, "phys", ["Ada"]);
    const frozen = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "phys-freeze"));
    assert.equal(frozen.application, "APPLIED");
    const positions = await compiledPositions(service.seatingV2Commands(), frozen.value.id);
    assert.equal(positions.length, 4);
    assert.ok(positions.every((item) => item.tableToken === table.tableToken));
    assert.ok(positions.every((item) => SeatingV2TableTokenSchema.safeParse(item.tableToken).success));
    assert.ok(positions.every((item) => !UUID_RE.test(item.token) && !UUID_RE.test(item.tableToken)));
  });

  it("synthesises declared seats only when a table has zero physical seats", async () => {
    const { service, store } = fixtureService();
    const { published } = publishCapacityLayout(
      service,
      store,
      [{ label: "Declared Six", declaredCapacity: 6, physicalSeatCount: 0 }],
      "synth",
    );
    const table = published.tables[0]!;
    assert.equal(table.positionSource, "DECLARED_SYNTHETIC");
    assert.equal(table.physicalPositionCount, 0);
    assert.equal(table.seatAnchors.length, 0);
    assert.equal(table.capacity, 6);
    assert.equal(table.mismatch, false);
    prepareGuests(service, "synth", ["Bisi"]);
    const first = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "synth-freeze-1"));
    const second = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "synth-freeze-2"), {
      seed: first.value.deterministicSeed,
    });
    assert.equal(second.application, "REPLAYED");
    const positions = await compiledPositions(service.seatingV2Commands(), first.value.id);
    assert.equal(positions.length, 6);
    assert.ok(positions.every((item) => item.tableToken === seatingV2TableToken(table.objectId)));
  });

  it("blocks freeze with SEAT_CAPACITY_MISMATCH and does not create a package", async () => {
    const { service, store } = fixtureService();
    publishCapacityLayout(
      service,
      store,
      [{ label: "Mismatched", declaredCapacity: 8, physicalSeatCount: 4 }],
      "mis",
    );
    const published = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    assert.equal(published.tables[0]!.mismatch, true);
    assert.equal(published.tables[0]!.positionSource, "PHYSICAL");
    assert.equal(published.tables[0]!.capacity, 4);
    prepareGuests(service, "mis", ["Chika"]);
    const v2 = service.seatingV2Commands();
    await assert.rejects(
      () => v2.freezePackage(planner(), envelope(people.assignPlanner, "mis-freeze")),
      (error: unknown) => error instanceof PlatformError && error.code === "SEAT_CAPACITY_MISMATCH",
    );
    const packages = await v2.repository.transaction(async (tx) => tx.list("inputPackages", envelope(people.assignPlanner, "mis-list")));
    assert.equal(packages.length, 0);
    const view = buildSeatingV2Workspace(store.snapshot(), emptySeatingV2State(), people.eventAlphaOne, "PLANNER");
    assert.ok(view.tables.some((item) => item.mismatch));
    assert.ok(view.attention.some((item) => item.kind === "blocker" && /physical seat count/i.test(item.message)));
  });

  it("keeps a zero-capacity table empty beside a usable declared table", async () => {
    const { service, store } = fixtureService();
    const { published } = publishCapacityLayout(
      service,
      store,
      [
        { label: "Empty", declaredCapacity: 0, physicalSeatCount: 0 },
        { label: "Usable", declaredCapacity: 3, physicalSeatCount: 0 },
      ],
      "zero",
    );
    const empty = published.tables.find((item) => item.declaredCapacity === 0)!;
    const usable = published.tables.find((item) => item.declaredCapacity === 3)!;
    assert.equal(empty.positionSource, "DECLARED_SYNTHETIC");
    assert.equal(empty.capacity, 0);
    assert.equal(empty.mismatch, false);
    assert.equal(usable.capacity, 3);
    prepareGuests(service, "zero", ["Dami"]);
    const frozen = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "zero-freeze"));
    const positions = await compiledPositions(service.seatingV2Commands(), frozen.value.id);
    assert.equal(positions.length, 3);
    assert.ok(positions.every((item) => item.tableToken === usable.tableToken));
    assert.equal(positions.filter((item) => item.tableToken === empty.tableToken).length, 0);
  });

  it("compiles mixed physical and declared-synthetic tables through the same namespace", async () => {
    const { service, store } = fixtureService();
    const { published } = publishCapacityLayout(
      service,
      store,
      [
        { label: "Head", declaredCapacity: 4, physicalSeatCount: 4 },
        { label: "Spare", declaredCapacity: 3, physicalSeatCount: 0 },
      ],
      "mix",
    );
    const physical = published.tables.find((item) => item.positionSource === "PHYSICAL")!;
    const synthetic = published.tables.find((item) => item.positionSource === "DECLARED_SYNTHETIC")!;
    assert.equal(physical.capacity + synthetic.capacity, 7);
    prepareGuests(service, "mix", ["Efe"]);
    const frozen = await service.seatingV2Commands().freezePackage(planner(), envelope(people.assignPlanner, "mix-freeze"));
    const positions = await compiledPositions(service.seatingV2Commands(), frozen.value.id);
    assert.equal(positions.length, 7);
    assert.equal(positions.filter((item) => item.tableToken === physical.tableToken).length, 4);
    assert.equal(positions.filter((item) => item.tableToken === synthetic.tableToken).length, 3);
    const auditor = buildSeatingV2Workspace(store.snapshot(), emptySeatingV2State(), people.eventAlphaOne, "AUDITOR");
    assert.ok(auditor.tables.every((item) => !UUID_RE.test(item.id)));
    assert.ok(auditor.tables.some((item) => /physical|declared/i.test(item.label)));
  });

  it("reloads published physical counts and stale-marks a package after a successor table change", async () => {
    const { service, store } = fixtureService();
    const first = publishCapacityLayout(
      service,
      store,
      [{ label: "Reload", declaredCapacity: 4, physicalSeatCount: 4 }],
      "rel",
    );
    assert.equal(first.published.tables[0]!.physicalPositionCount, 4);
    prepareGuests(service, "rel", ["Femi"]);
    const v2 = service.seatingV2Commands();
    const frozen = await v2.freezePackage(planner(), envelope(people.assignPlanner, "rel-freeze-1"));
    service.applyLayoutCommand(planner(), {
      ...cas(currentLayout(service, first.layoutId)),
      reason: "Add successor table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Successor",
        geometry: { kind: "RECTANGLE", xMm: 7200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
        subtype: { shape: "RECTANGLE", declaredCapacity: 2 },
      },
    });
    service.runLayoutValidation(planner(), { ...cas(currentLayout(service, first.layoutId)), reason: "Validate successor" });
    const submitted = service.submitLayoutApproval(planner(), {
      ...cas(currentLayout(service, first.layoutId)),
      reason: "Submit successor",
    });
    service.decideLayoutApproval(director(), {
      ...cas(currentLayout(service, first.layoutId, director)),
      approvalId: submitted.id,
      decision: "APPROVED",
      reason: "Approve successor",
    });
    service.publishLayout(director(), {
      ...cas(currentLayout(service, first.layoutId, director)),
      reason: "Publish successor",
    });
    const freshness = await v2.currentFreshness(envelope(people.assignPlanner, "rel-fresh"), frozen.value.id);
    assert.equal(freshness.fresh, false);
    const next = await v2.freezePackage(planner(), envelope(people.assignPlanner, "rel-freeze-2"));
    assert.notEqual(next.value.id, frozen.value.id);
    const reloaded = snapshotLayoutAdapter(store.snapshot(), people.orgMaison, people.eventAlphaOne);
    assert.equal(reloaded.tables.length, 2);
    assert.equal(
      reloaded.tables.find((item) => item.objectId === first.published.tables[0]!.objectId)?.physicalPositionCount,
      4,
    );
  });

  it("does not invent a default of six seats when declared and physical counts are zero", () => {
    const truth = seatingV2TableCapacityTruth({
      tableObjectId: "00000000-0000-4000-8000-00000000aa10",
      declaredCapacity: 0,
      physicalPositionCount: 0,
    });
    assert.equal(truth.effectiveCapacity, 0);
    assert.equal(truth.positionSource, "DECLARED_SYNTHETIC");
    assert.equal(truth.mismatch, false);
  });
});
