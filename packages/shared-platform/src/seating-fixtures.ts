import { FIXTURE_IDS } from "./fixtures.js";
import type { PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";

const NOW = "2026-09-12T07:00:00.000Z";

function director() {
  return { personId: FIXTURE_IDS.personDirector, correlationId: "s06-layout-director", now: NOW, actorKind: "HUMAN" as const };
}

function planner() {
  return { personId: FIXTURE_IDS.personPlanner, correlationId: "s06-layout-planner", now: NOW, actorKind: "HUMAN" as const };
}

function cas(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

/** Additive synthetic CURRENT layout for Alpha One. Never mutates an existing CURRENT publication. */
export function applyS06SeatingLayoutIfMissing(store: PlatformStore, service: PlatformService): void {
  const snap = store.snapshot();
  if (snap.layoutPublications.some((item) => item.eventId === FIXTURE_IDS.eventAlphaOne && item.status === "CURRENT")) return;
  if (!snap.venues.some((item) => item.organisationId === FIXTURE_IDS.orgMaison)) return;
  const venue =
    snap.venues.find((item) => item.organisationId === FIXTURE_IDS.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(director(), {
      organisationId: FIXTURE_IDS.orgMaison,
      displayName: "Synthetic seating pavilion",
      reason: "Seed seating layout fixture",
      idempotencyKey: "s06-seating-venue-seed-01",
    });
  const adopted = service.adoptVenue(director(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    venueId: venue.id,
    reason: "Adopt seating fixture venue",
    idempotencyKey: "s06-seating-adopt-seed-01",
  });
  let layout = service.createBlankLayout(planner(), {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    eventVenueId: adopted.id,
    name: "Synthetic seating hall",
    widthMm: 24000,
    heightMm: 18000,
    reason: "Create seating fixture layout",
    idempotencyKey: "s06-seating-layout-seed-01",
  });
  layout = service.applyLayoutCommand(planner(), {
    ...cas(layout),
    reason: "Add seating fixture table A",
    command: {
      kind: "CREATE_OBJECT",
      objectType: "TABLE",
      label: "Table A",
      geometry: { kind: "RECTANGLE", xMm: 1200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
      subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
    },
  });
  layout = service.applyLayoutCommand(planner(), {
    ...cas(layout),
    reason: "Add seating fixture table B",
    command: {
      kind: "CREATE_OBJECT",
      objectType: "TABLE",
      label: "Table B",
      geometry: { kind: "RECTANGLE", xMm: 4200, yMm: 1200, widthMm: 1800, heightMm: 1800 },
      subtype: { shape: "RECTANGLE", declaredCapacity: 8 },
    },
  });
  service.runLayoutValidation(planner(), { ...cas(layout), reason: "Validate seating fixture layout" });
  const current = service.getLayoutSetupWorkspace(planner(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout;
  const submitted = service.submitLayoutApproval(planner(), { ...cas(current), reason: "Submit seating fixture layout" });
  const approvedLayout = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout;
  service.decideLayoutApproval(director(), {
    ...cas(approvedLayout),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: "Approve seating fixture layout",
  });
  const ready = service.getLayoutSetupWorkspace(director(), FIXTURE_IDS.orgMaison, FIXTURE_IDS.eventAlphaOne, layout.id).layout;
  service.publishLayout(director(), { ...cas(ready), reason: "Publish seating fixture layout" });
}
