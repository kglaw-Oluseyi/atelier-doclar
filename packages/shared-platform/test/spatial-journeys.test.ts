import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIXTURE_IDS,
  MemoryPlatformStore,
  PlatformError,
  applySyntheticSnapshot,
  layoutContentHash,
  migrateEosS05Objects,
  type SpatialObject,
} from "../src/index.js";
import { FROZEN_COORDINATE_SYSTEM } from "../src/venue-geometry.js";

const NOW = "2026-09-08T04:00:00.000Z";

function director() {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s05m2-director", now: NOW };
}
function planner() {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s05m2-planner", now: NOW };
}
function auditor() {
  return { personId: FIXTURE_IDS.personAuditor, correlationId: "s05m2-auditor", now: NOW };
}
function otherOrg() {
  return { personId: FIXTURE_IDS.personOtherOrg, correlationId: "s05m2-other", now: NOW };
}
function ceo() {
  return { personId: FIXTURE_IDS.personCeo, correlationId: "s05m2-ceo", now: NOW };
}

function seeded() {
  const store = new MemoryPlatformStore();
  const service = applySyntheticSnapshot(store);
  return { store, service };
}

function blankLayout(service: ReturnType<typeof applySyntheticSnapshot>, name = "Studio floor") {
  const venue = service.createVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    displayName: `Spatial ${name}`,
    reason: "Register spatial test venue",
    idempotencyKey: `spatial-venue-${name}-${Math.random()}`,
  });
  const adopted = service.adoptVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt for spatial tests",
    idempotencyKey: `spatial-adopt-${name}-${Math.random()}`,
  });
  return service.createBlankLayout(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    eventVenueId: adopted.id,
    name,
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create spatial test layout",
    idempotencyKey: `spatial-layout-${name}-${Math.random()}`,
  });
}

function rect(xMm = 1000, yMm = 1000, widthMm = 3000, heightMm = 2000) {
  return { kind: "RECTANGLE" as const, xMm, yMm, widthMm, heightMm };
}

function studio(service: ReturnType<typeof applySyntheticSnapshot>, layoutId: string) {
  return service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layoutId);
}

describe("EOS-S05 Milestone 2 spatial authoring", () => {
  it("applies the additive objects migration without clearing Milestone 1 collections", () => {
    const { store } = seeded();
    const snap = store.snapshot();
    const replay = migrateEosS05Objects(snap, NOW);
    assert.equal(replay.status, "REPLAYED");
    assert.ok(snap.venues.length >= 1);
    assert.ok(Array.isArray(snap.layoutCommands));
    assert.ok(Array.isArray(snap.layoutDraftCursors));
  });

  it("creates typed objects, rejects guest placement and pixel persistence, and keeps hashes deterministic", () => {
    const { service } = seeded();
    const layout = blankLayout(service);
    const createdLayout = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Create dining zone",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "ZONE",
        label: "Dining",
        geometry: rect(),
        subtype: { category: "DINING" },
      },
    });
    const created = studio(service, layout.id);
    assert.equal(created.objects.length, 1);
    assert.equal(created.objects[0]?.objectType, "ZONE");
    const again = layoutContentHash({
      coordinateSystem: FROZEN_COORDINATE_SYSTEM,
      bounds: createdLayout.bounds,
      objects: created.objects,
    });
    assert.equal(createdLayout.contentHash, again);
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: createdLayout.version,
          expectedRevisionNumber: createdLayout.currentRevisionNumber,
          reason: "Reject guest",
          command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "Bad", geometry: rect(), subtype: { category: "CUSTOM" }, guestId: "x" },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: createdLayout.version,
          expectedRevisionNumber: createdLayout.currentRevisionNumber,
          reason: "Reject pixels",
          screenX: 12,
          command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "Px", geometry: rect(), subtype: { category: "CUSTOM" } },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
  });

  it("rejects NaN, overflow, out-of-bounds geometry and auditor mutation", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "Bounds");
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          reason: "NaN",
          command: {
            kind: "CREATE_OBJECT",
            objectType: "ZONE",
            label: "NaN",
            geometry: { kind: "RECTANGLE", xMm: Number.NaN, yMm: 1, widthMm: 1, heightMm: 1 },
            subtype: { category: "CUSTOM" },
          },
        }),
      (error: unknown) => error instanceof PlatformError,
    );
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          reason: "Overflow floor",
          command: {
            kind: "CREATE_OBJECT",
            objectType: "ZONE",
            label: "Overflow",
            geometry: rect(20000, 1000, 8000, 2000),
            subtype: { category: "CUSTOM" },
          },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED",
    );
    assert.throws(
      () =>
        service.applyLayoutCommand(auditor(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          reason: "Auditor cannot author",
          command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "No", geometry: rect(), subtype: { category: "CUSTOM" } },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
  });

  it("moves, resizes, rotates, duplicates, groups and tombstones through one command path", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "Commands");
    const zone = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Create zone",
      command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "A", geometry: rect(), subtype: { category: "CEREMONY" } },
    });
    const table = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: zone.version,
      expectedRevisionNumber: zone.currentRevisionNumber,
      reason: "Create table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "T1",
        geometry: rect(5000, 4000, 1800, 1800),
        subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
      },
    });
    const ids = studio(service, layout.id).objects.map((item: SpatialObject) => item.id);
    const moved = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: table.version,
      expectedRevisionNumber: table.currentRevisionNumber,
      reason: "Move both",
      command: { kind: "MOVE", objectIds: ids, deltaXMm: 200, deltaYMm: 0 },
    });
    const t1 = studio(service, layout.id).objects.find((item: SpatialObject) => item.label === "T1");
    assert.equal(t1?.geometry.kind === "RECTANGLE" && t1.geometry.xMm, 5200);
    const grouped = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: moved.version,
      expectedRevisionNumber: moved.currentRevisionNumber,
      reason: "Group",
      command: { kind: "GROUP", objectIds: ids, label: "Set" },
    });
    assert.ok(studio(service, layout.id).objects.some((item: SpatialObject) => item.objectType === "GROUP"));
    const undone = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: grouped.version,
      expectedRevisionNumber: grouped.currentRevisionNumber,
      reason: "Undo group",
      command: { kind: "UNDO" },
    });
    assert.equal(studio(service, layout.id).objects.some((item: SpatialObject) => item.objectType === "GROUP"), false);
    const redone = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: undone.version,
      expectedRevisionNumber: undone.currentRevisionNumber,
      reason: "Redo group",
      command: { kind: "REDO" },
    });
    assert.ok(studio(service, redone.id).objects.some((item: SpatialObject) => item.objectType === "GROUP"));
  });

  it("generates deterministic physical seats and warns before destructive regeneration", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "Seats");
    const table = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Table",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: "Head",
        geometry: rect(4000, 4000, 2400, 2400),
        subtype: { shape: "CIRCLE", declaredCapacity: 8 },
      },
    });
    const tableId = studio(service, layout.id).objects[0]!.id;
    const first = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: table.version,
      expectedRevisionNumber: table.currentRevisionNumber,
      reason: "Seats",
      command: { kind: "GENERATE_SEATS", tableId, seatCount: 4, confirmDestructive: false },
    });
    const seats = studio(service, layout.id).objects.filter((item: SpatialObject) => item.objectType === "SEAT");
    assert.equal(seats.length, 4);
    assert.ok(seats.every((item: SpatialObject) => "tableId" in item.subtype && !("guestId" in item)));
    const ids = seats.map((item: SpatialObject) => item.id).sort();
    const again = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: first.version,
      expectedRevisionNumber: first.currentRevisionNumber,
      reason: "Preserve seats",
      command: { kind: "GENERATE_SEATS", tableId, seatCount: 4, confirmDestructive: false },
    });
    assert.deepEqual(
      studio(service, layout.id).objects.filter((item: SpatialObject) => item.objectType === "SEAT").map((item: SpatialObject) => item.id).sort(),
      ids,
    );
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: again.version,
          expectedRevisionNumber: again.currentRevisionNumber,
          reason: "Destructive without confirm",
          command: { kind: "GENERATE_SEATS", tableId, seatCount: 6, confirmDestructive: false },
        }),
      (error: unknown) => error instanceof PlatformError && /destructive/.test(error.publicMessage ?? error.message),
    );
  });

  it("denies planner weakening of a governed locked area and isolates organisations", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "Governed");
    const created = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Locked fire lane",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "RESTRICTED_AREA",
        label: "Fire lane",
        geometry: rect(2000, 2000, 2000, 800),
        subtype: {
          sourceKind: "QUALIFIED_AUTHORITY",
          authorityLabel: "Synthetic fire note",
          verificationState: "UNVERIFIED",
          thresholdUnknown: true,
          governedLocked: true,
        },
      },
    });
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: created.version,
          expectedRevisionNumber: created.currentRevisionNumber,
          reason: "Weaken",
          command: { kind: "TOMBSTONE", objectIds: [studio(service, layout.id).objects[0]!.id] },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const otherLayout = service.listVenues(otherOrg(), FIXTURE_IDS.orgOther);
    assert.ok(Array.isArray(otherLayout));
    assert.throws(
      () =>
        service.applyLayoutCommand(otherOrg(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: created.version,
          expectedRevisionNumber: created.currentRevisionNumber,
          reason: "Cross org",
          command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "Spy", geometry: rect(), subtype: { category: "CUSTOM" } },
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN"),
    );
  });

  it("replays identical commands and rejects stale revisions without false success", () => {
    const { service } = seeded();
    const layout = blankLayout(service, "Concurrency");
    const key = `spatial-idem-${Date.now()}`;
    const first = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Idempotent create",
      idempotencyKey: key,
      command: { kind: "CREATE_OBJECT", objectType: "FIXTURE", label: "Bar", geometry: rect(2000, 2000, 1200, 800), subtype: { fixtureKind: "BAR", movable: true, safetyImplication: false } },
    });
    const replay = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Idempotent create",
      idempotencyKey: key,
      command: { kind: "CREATE_OBJECT", objectType: "FIXTURE", label: "Bar", geometry: rect(2000, 2000, 1200, 800), subtype: { fixtureKind: "BAR", movable: true, safetyImplication: false } },
    });
    assert.equal(replay.id, first.id);
    assert.equal(studio(service, layout.id).objects.length, 1);
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: layout.version,
          expectedRevisionNumber: layout.currentRevisionNumber,
          reason: "Stale",
          command: { kind: "MOVE", objectIds: [studio(service, layout.id).objects[0]!.id], deltaXMm: 100, deltaYMm: 0 },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "VERSION_CONFLICT",
    );
    const workspace = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id);
    assert.equal(workspace.objects.length, 1);
    assert.equal(workspace.binaryBackgroundAvailable, false);
  });

  it("resizes, rotates, locks, hides and preserves objects across setup updates and hydrate", () => {
    const { store, service } = seeded();
    const layout = blankLayout(service, "Transform");
    const created = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: layout.version,
      expectedRevisionNumber: layout.currentRevisionNumber,
      reason: "Create fixture",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "FIXTURE",
        label: "Stage",
        geometry: rect(2000, 2000, 2000, 1200),
        subtype: { fixtureKind: "STAGE", movable: true, safetyImplication: false },
      },
    });
    const objectId = studio(service, layout.id).objects[0]!.id;
    const resized = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: created.version,
      expectedRevisionNumber: created.currentRevisionNumber,
      reason: "Resize",
      command: { kind: "RESIZE", objectId, geometry: rect(2000, 2000, 2400, 1400) },
    });
    const rotated = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: resized.version,
      expectedRevisionNumber: resized.currentRevisionNumber,
      reason: "Rotate",
      command: { kind: "ROTATE", objectId, rotationMillidegree: 45_000 },
    });
    const locked = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: rotated.version,
      expectedRevisionNumber: rotated.currentRevisionNumber,
      reason: "Lock",
      command: { kind: "SET_LOCK", objectIds: [objectId], locked: true },
    });
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: layout.id,
          expectedVersion: locked.version,
          expectedRevisionNumber: locked.currentRevisionNumber,
          reason: "Move locked",
          command: { kind: "MOVE", objectIds: [objectId], deltaXMm: 100, deltaYMm: 0 },
        }),
      (error: unknown) => error instanceof PlatformError && error.code === "FORBIDDEN",
    );
    const hidden = service.applyLayoutCommand(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: locked.version,
      expectedRevisionNumber: locked.currentRevisionNumber,
      reason: "Hide",
      command: { kind: "SET_VISIBILITY", objectIds: [objectId], visible: false },
    });
    const setup = service.updateLayoutSetup(planner(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: layout.id,
      expectedVersion: hidden.version,
      expectedRevisionNumber: hidden.currentRevisionNumber,
      name: "Transform floor",
      reason: "Rename without dropping objects",
    });
    assert.equal(studio(service, layout.id).objects.length, 1);
    const cloned = structuredClone(store.snapshot());
    store.replace(JSON.parse(JSON.stringify(cloned)));
    const hydrated = studio(service, layout.id);
    assert.equal(hydrated.objects[0]?.rotationMillidegree, 45_000);
    assert.equal(hydrated.objects[0]?.visible, false);
    assert.equal(hydrated.layout.contentHash, setup.contentHash);
    assert.equal(hydrated.binaryBackgroundAvailable, false);
  });

  it("isolates events, expires leases, and lets directors override governed locks they hold", () => {
    const { service } = seeded();
    const alpha = blankLayout(service, "Alpha isolate");
    const venue = service.createVenue(ceo(), {
      organisationId: FIXTURE_IDS.orgMaison,
      displayName: "Spatial Two",
      reason: "Second event venue",
      idempotencyKey: `spatial-venue-two-${Math.random()}`,
    });
    const adopted = service.adoptVenue(ceo(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaTwo,
      venueId: venue.id,
      reason: "Adopt into Alpha Two",
      idempotencyKey: `spatial-adopt-two-${Math.random()}`,
    });
    const two = service.createBlankLayout(ceo(), {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaTwo,
      eventVenueId: adopted.id,
      name: "Two floor",
      widthMm: 24000,
      heightMm: 18000,
      reason: "Create Alpha Two layout",
      idempotencyKey: `spatial-layout-two-${Math.random()}`,
    });
    assert.throws(
      () =>
        service.applyLayoutCommand(planner(), {
          organisationId: FIXTURE_IDS.orgMaison,
          eventId: FIXTURE_IDS.eventAlphaOne,
          layoutId: two.id,
          expectedVersion: two.version,
          expectedRevisionNumber: two.currentRevisionNumber,
          reason: "Cross event",
          command: { kind: "CREATE_OBJECT", objectType: "ZONE", label: "Spy", geometry: rect(), subtype: { category: "CUSTOM" } },
        }),
      (error: unknown) => error instanceof PlatformError && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN"),
    );
    const later = { personId: FIXTURE_IDS.personDirector, correlationId: "s05m2-lease-expiry", now: "2026-09-08T04:31:00.000Z" };
    const afterExpiry = service.applyLayoutCommand(later, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: alpha.id,
      expectedVersion: alpha.version,
      expectedRevisionNumber: alpha.currentRevisionNumber,
      reason: "Take expired lease",
      command: {
        kind: "CREATE_OBJECT",
        objectType: "RESTRICTED_AREA",
        label: "Director lock",
        geometry: rect(2000, 2000, 2000, 800),
        subtype: {
          sourceKind: "QUALIFIED_AUTHORITY",
          authorityLabel: "Synthetic fire note",
          verificationState: "UNVERIFIED",
          thresholdUnknown: true,
          governedLocked: true,
        },
      },
    });
    const restrictedId = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, alpha.id).objects[0]!.id;
    const overridden = service.applyLayoutCommand(later, {
      organisationId: FIXTURE_IDS.orgMaison,
      eventId: FIXTURE_IDS.eventAlphaOne,
      layoutId: alpha.id,
      expectedVersion: afterExpiry.version,
      expectedRevisionNumber: afterExpiry.currentRevisionNumber,
      reason: "Director override tombstone",
      command: { kind: "TOMBSTONE", objectIds: [restrictedId] },
    });
    assert.equal(
      service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, alpha.id).objects.length,
      0,
    );
    assert.ok(overridden.currentRevisionNumber > afterExpiry.currentRevisionNumber);
  });
});
