import { FIXTURE_IDS } from "./fixtures.js";
import type { PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";
import type { SeatingV2LayoutBinding } from "./seating-v2-state.js";

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

const FIXTURE_BINDING_ID = "00000000-0000-4000-8000-00000000b075";

function syntheticHallPublication(store: PlatformStore) {
  const hall = store.snapshot().layouts.find(
    (item) => item.eventId === FIXTURE_IDS.eventAlphaOne && item.name === "Synthetic seating hall",
  );
  if (!hall) return undefined;
  const publication = store
    .snapshot()
    .layoutPublications.find((item) => item.layoutId === hall.id && item.status === "CURRENT");
  if (!publication) return undefined;
  return { hall, publication };
}

/** Memory-only fixture seed of the Synthetic seating hall binding. Does not select first/latest. */
export function seedS06SeatingLayoutBindingIfMissing(store: PlatformStore, service: PlatformService): void {
  const nominated = syntheticHallPublication(store);
  if (!nominated) return;
  const repo = service.seatingV2Commands().repository as { backingStore?: { collection(name: "layoutBindings"): SeatingV2LayoutBinding[] } };
  const rows = repo.backingStore?.collection("layoutBindings");
  if (!rows) return;
  if (
    rows.some(
      (item) =>
        item.state === "ACTIVE" &&
        item.layoutId === nominated.hall.id &&
        item.layoutPublicationId === nominated.publication.id &&
        item.layoutContentHash === nominated.publication.contentHash,
    )
  ) {
    return;
  }
  rows.push({
    id: FIXTURE_BINDING_ID,
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    layoutId: nominated.hall.id,
    layoutPublicationId: nominated.publication.id,
    layoutContentHash: nominated.publication.contentHash,
    state: "ACTIVE",
    version: 1,
    proposedByPersonId: FIXTURE_IDS.personPlanner,
    proposedAt: NOW,
    activatedByPersonId: FIXTURE_IDS.personDirector,
    activatedAt: NOW,
    reason: "Seed the nominated Synthetic seating hall publication for fixture seating.",
    schemaVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

export async function ensureSeatingLayoutBindingForLayout(
  service: PlatformService,
  input: {
    organisationId: string;
    eventId: string;
    layoutId: string;
    plannerAssignmentId: string;
    directorAssignmentId: string;
    idempotencyPrefix: string;
  },
): Promise<SeatingV2LayoutBinding> {
  const workspace = service.getLayoutSetupWorkspace(planner(), input.organisationId, input.eventId, input.layoutId);
  const publication = workspace.assurance.publications.find(
    (item) => item.layoutId === input.layoutId && item.status === "CURRENT",
  );
  if (!publication) {
    throw new Error("A current publication for the nominated layout is required before a seating layout binding can be activated.");
  }
  const v2 = service.seatingV2Commands();
  const existing = (
    await v2.repository.transaction(async (tx) =>
      tx.list<SeatingV2LayoutBinding>("layoutBindings", {
        organisationId: input.organisationId,
        eventId: input.eventId,
      }),
    )
  ).find(
    (item) =>
      item.state === "ACTIVE" &&
      item.layoutId === input.layoutId &&
      item.layoutPublicationId === publication.id &&
      item.layoutContentHash === publication.contentHash,
  );
  if (existing) return existing;
  const envelope = (assignmentId: string, key: string) => ({
    organisationId: input.organisationId,
    eventId: input.eventId,
    actorAssignmentId: assignmentId,
    idempotencyKey: key.length >= 12 ? key : `${input.idempotencyPrefix}-${key}`,
  });
  const proposed = await v2.proposeLayoutBinding(planner(), envelope(input.plannerAssignmentId, `${input.idempotencyPrefix}-propose`), {
    layoutId: input.layoutId,
    layoutPublicationId: publication.id,
    layoutContentHash: publication.contentHash,
    reason: "Activate the nominated current layout publication for Seating Command.",
  });
  const activated = await v2.activateLayoutBinding(
    director(),
    envelope(input.directorAssignmentId, `${input.idempotencyPrefix}-activate`),
    { bindingId: proposed.value.id, expectedVersion: proposed.value.version },
  );
  return activated.value;
}

export async function ensureS06SeatingLayoutBinding(store: PlatformStore, service: PlatformService): Promise<SeatingV2LayoutBinding | undefined> {
  const hall = store.snapshot().layouts.find(
    (item) => item.eventId === FIXTURE_IDS.eventAlphaOne && item.name === "Synthetic seating hall",
  );
  if (!hall) return undefined;
  return ensureSeatingLayoutBindingForLayout(service, {
    organisationId: FIXTURE_IDS.orgMaison,
    eventId: FIXTURE_IDS.eventAlphaOne,
    layoutId: hall.id,
    plannerAssignmentId: FIXTURE_IDS.assignPlanner,
    directorAssignmentId: FIXTURE_IDS.assignDirector,
    idempotencyPrefix: "s06-seating-binding",
  });
}
