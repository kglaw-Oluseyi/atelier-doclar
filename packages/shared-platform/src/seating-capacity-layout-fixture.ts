import assert from "node:assert/strict";
import { FIXTURE_IDS as people } from "./fixtures.js";
import { ensureSeatingLayoutBindingForLayout } from "./seating-fixtures.js";
import type { ActorContext, PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";

function cas(eventId: string, layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: people.orgMaison,
    eventId,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

/**
 * Realistic 600-seat integrated profile (ordinary event ranges).
 * - 42 general round tables × 10
 * - 18 family tables × 8
 * - 3 head/protocol tables × 12 (explicitly justified exceptional capacity)
 * Total: 63 tables, 600 seats.
 *
 * Historical 13×48/24 profile is retained only as a named constant for provenance;
 * it is no longer the principal integrated qualification layout.
 */
export type CapacityTableSpec = { label: string; declaredCapacity: number; kind: "GENERAL" | "FAMILY" | "HEAD" };

export const CAPACITY_REALISTIC_TABLE_SPECS: readonly CapacityTableSpec[] = [
  ...Array.from({ length: 3 }, (_, index) => ({
    label: `H${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 12,
    kind: "HEAD" as const,
  })),
  ...Array.from({ length: 18 }, (_, index) => ({
    label: `F${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 8,
    kind: "FAMILY" as const,
  })),
  ...Array.from({ length: 42 }, (_, index) => ({
    label: `G${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 10,
    kind: "GENERAL" as const,
  })),
];

/** @deprecated Oversized-table profile retained for evidence provenance only; not the principal Gate 1 layout. */
export const CAPACITY_LAYOUT_TABLE_CAPACITIES = [...Array.from({ length: 12 }, () => 48), 24] as const;

export const CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION = {
  totalTables: CAPACITY_REALISTIC_TABLE_SPECS.length,
  totalSeats: CAPACITY_REALISTIC_TABLE_SPECS.reduce((sum, item) => sum + item.declaredCapacity, 0),
  general: { count: 42, seatsPerTable: 10, seats: 420 },
  family: { count: 18, seatsPerTable: 8, seats: 144 },
  head: {
    count: 3,
    seatsPerTable: 12,
    seats: 36,
    justification: "Head/protocol tables at 12 seats are ordinary exceptional wedding/protocol tables, not near the 48-seat schema ceiling.",
  },
  materialDiffStrategy:
    "Publish in governed batches so each submitLayoutApproval materialDiffSummary stays ≤800 characters without weakening validation.",
} as const;

assert.equal(CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION.totalSeats, 600);
assert.equal(CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION.totalTables, 63);

/** First publish batch size: measured “Added TABLE “XX”.” × 40 ≈ 759 chars < 800. */
export const CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE = 40;

function addTables(
  service: PlatformService,
  plannerActor: ActorContext,
  eventId: string,
  layout: { id: string; version: number; currentRevisionNumber: number },
  specs: readonly CapacityTableSpec[],
  startIndex: number,
): { id: string; version: number; currentRevisionNumber: number } {
  let current = layout;
  for (const [offset, table] of specs.entries()) {
    const index = startIndex + offset;
    current = service.applyLayoutCommand(plannerActor, {
      ...cas(eventId, current),
      reason: `Add ${table.kind.toLowerCase()} ${table.label}`,
      command: {
        kind: "CREATE_OBJECT",
        objectType: "TABLE",
        label: table.label,
        geometry: {
          kind: "RECTANGLE",
          xMm: 600 + (index % 9) * 3400,
          yMm: 600 + Math.floor(index / 9) * 2800,
          widthMm: table.declaredCapacity >= 12 ? 2400 : 2000,
          heightMm: table.declaredCapacity >= 12 ? 2400 : 2000,
        },
        subtype: { shape: "RECTANGLE", declaredCapacity: table.declaredCapacity },
      },
    });
  }
  return { id: current.id, version: current.version, currentRevisionNumber: current.currentRevisionNumber };
}

function publishCurrent(
  service: PlatformService,
  plannerActor: ActorContext,
  directorActor: ActorContext,
  eventId: string,
  layoutId: string,
  reason: string,
) {
  const forValidation = service.getLayoutSetupWorkspace(plannerActor, people.orgMaison, eventId, layoutId).layout;
  service.runLayoutValidation(plannerActor, { ...cas(eventId, forValidation), reason: `Validate ${reason}` });
  const current = service.getLayoutSetupWorkspace(plannerActor, people.orgMaison, eventId, layoutId).layout;
  const submitted = service.submitLayoutApproval(plannerActor, { ...cas(eventId, current), reason: `Submit ${reason}` });
  assert.ok(
    submitted.materialDiffSummary.length <= 800,
    `materialDiffSummary length ${submitted.materialDiffSummary.length} exceeds 800 for ${reason}`,
  );
  const approvedLayout = service.getLayoutSetupWorkspace(directorActor, people.orgMaison, eventId, layoutId).layout;
  service.decideLayoutApproval(directorActor, {
    ...cas(eventId, approvedLayout),
    approvalId: submitted.id,
    decision: "APPROVED",
    reason: `Approve ${reason}`,
  });
  const ready = service.getLayoutSetupWorkspace(directorActor, people.orgMaison, eventId, layoutId).layout;
  service.publishLayout(directorActor, { ...cas(eventId, ready), reason: `Publish ${reason}` });
  return {
    layout: service.getLayoutSetupWorkspace(directorActor, people.orgMaison, eventId, layoutId).layout,
    materialDiffSummaryLength: submitted.materialDiffSummary.length,
    materialDiffSummary: submitted.materialDiffSummary,
  };
}

function asLayoutRef(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return { id: layout.id, version: layout.version, currentRevisionNumber: layout.currentRevisionNumber };
}

/**
 * Publish a realistic 600-seat synthetic layout through governed product paths.
 * Uses multi-batch create → validate → submit → approve → publish so each
 * materialDiffSummary remains within the accepted 800-character contract.
 * Declared capacity is used (physical seats not generated) — accepted product
 * path yields DECLARED_SYNTHETIC positions when physical count is zero.
 */
export async function applyCapacity600SeatingLayout(
  service: PlatformService,
  store: PlatformStore,
  eventId: string,
  plannerActor: ActorContext,
  directorActor: ActorContext,
  prefix: string,
  assignmentIds?: { plannerAssignmentId?: string; directorAssignmentId?: string },
) {
  const snap = store.snapshot();
  const venue =
    snap.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(directorActor, {
      organisationId: people.orgMaison,
      displayName: `${prefix} pavilion`,
      reason: "Capacity qualification venue",
      idempotencyKey: `${prefix}-venue`,
    });
  const adopted = service.adoptVenue(directorActor, {
    organisationId: people.orgMaison,
    eventId,
    venueId: venue.id,
    reason: "Adopt capacity qualification venue",
    idempotencyKey: `${prefix}-adopt`,
  });
  let layout: { id: string; version: number; currentRevisionNumber: number } = service.createBlankLayout(plannerActor, {
    organisationId: people.orgMaison,
    eventId,
    eventVenueId: adopted.id,
    name: `${prefix} capacity hall`,
    widthMm: 36000,
    heightMm: 28000,
    reason: "Create realistic capacity qualification layout",
    idempotencyKey: `${prefix}-layout`,
  });

  const batchDiffs: Array<{ batch: number; tableCount: number; materialDiffSummaryLength: number }> = [];
  const batches: CapacityTableSpec[][] = [];
  for (let index = 0; index < CAPACITY_REALISTIC_TABLE_SPECS.length; index += CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE) {
    batches.push([...CAPACITY_REALISTIC_TABLE_SPECS.slice(index, index + CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE)]);
  }

  let startIndex = 0;
  for (const [batchIndex, batch] of batches.entries()) {
    layout = addTables(service, plannerActor, eventId, layout, batch, startIndex);
    const published = publishCurrent(
      service,
      plannerActor,
      directorActor,
      eventId,
      layout.id,
      `${prefix} batch ${batchIndex + 1}`,
    );
    layout = asLayoutRef(published.layout);
    batchDiffs.push({
      batch: batchIndex + 1,
      tableCount: batch.length,
      materialDiffSummaryLength: published.materialDiffSummaryLength,
    });
    startIndex += batch.length;
  }

  const publication = store.snapshot().layoutPublications.find((item) => item.layoutId === layout.id && item.status === "CURRENT");
  assert.ok(publication);
  const workspace = service.getLayoutSetupWorkspace(directorActor, people.orgMaison, eventId, layout.id);
  const tables = workspace.objects.filter((item) => item.objectType === "TABLE" && !item.tombstoned);
  const declaredSeats = tables.reduce((sum, item) => {
    const subtype = item.subtype as { declaredCapacity?: number };
    return sum + (subtype.declaredCapacity ?? 0);
  }, 0);
  assert.equal(tables.length, 63);
  assert.equal(declaredSeats, 600);

  await ensureSeatingLayoutBindingForLayout(service, {
    organisationId: people.orgMaison,
    eventId,
    layoutId: layout.id,
    plannerAssignmentId: assignmentIds?.plannerAssignmentId ?? people.assignPlanner,
    directorAssignmentId: assignmentIds?.directorAssignmentId ?? people.assignDirector,
    idempotencyPrefix: prefix,
  });
  return { layout: workspace.layout, publication, batchDiffs, profile: CAPACITY_REALISTIC_LAYOUT_JUSTIFICATION };
}
