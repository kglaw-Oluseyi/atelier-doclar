import assert from "node:assert/strict";
import { FIXTURE_IDS as people } from "./fixtures.js";
import { ensureSeatingLayoutBindingForLayout } from "./seating-fixtures.js";
import type { ActorContext, PlatformService } from "./service.js";
import type { PlatformStore } from "./store.js";
import { CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE } from "./seating-capacity-layout-fixture.js";

export type Capacity1000TableSpec = {
  label: string;
  declaredCapacity: number;
  kind: "GENERAL" | "FAMILY" | "HEAD" | "COMPACT" | "INTIMATE";
};

export const CAPACITY_1000_TABLE_SPECS: readonly Capacity1000TableSpec[] = [
  ...Array.from({ length: 5 }, (_, index) => ({
    label: `I${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 4,
    kind: "INTIMATE" as const,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `C${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 6,
    kind: "COMPACT" as const,
  })),
  ...Array.from({ length: 25 }, (_, index) => ({
    label: `F${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 8,
    kind: "FAMILY" as const,
  })),
  ...Array.from({ length: 60 }, (_, index) => ({
    label: `G${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 10,
    kind: "GENERAL" as const,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    label: `H${String(index + 1).padStart(2, "0")}`,
    declaredCapacity: 12,
    kind: "HEAD" as const,
  })),
];

export const CAPACITY_1000_LAYOUT_JUSTIFICATION = {
  totalTables: CAPACITY_1000_TABLE_SPECS.length,
  totalSeats: CAPACITY_1000_TABLE_SPECS.reduce((sum, item) => sum + item.declaredCapacity, 0),
  intimate: { count: 5, seatsPerTable: 4, seats: 20 },
  compact: { count: 10, seatsPerTable: 6, seats: 60 },
  family: { count: 25, seatsPerTable: 8, seats: 200 },
  general: { count: 60, seatsPerTable: 10, seats: 600 },
  head: { count: 10, seatsPerTable: 12, seats: 120 },
  note: "Qualification-only stretch profile; not a production seating default.",
} as const;

assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalSeats, 1000);
assert.equal(CAPACITY_1000_LAYOUT_JUSTIFICATION.totalTables, 110);

function cas(eventId: string, layout: { id: string; version: number; currentRevisionNumber: number }) {
  return {
    organisationId: people.orgMaison,
    eventId,
    layoutId: layout.id,
    expectedVersion: layout.version,
    expectedRevisionNumber: layout.currentRevisionNumber,
  };
}

async function addTables(
  service: PlatformService,
  plannerActor: ActorContext,
  eventId: string,
  layout: { id: string; version: number; currentRevisionNumber: number },
  specs: readonly Capacity1000TableSpec[],
  startIndex: number,
  flush?: () => Promise<void>,
): Promise<{ id: string; version: number; currentRevisionNumber: number }> {
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
          xMm: 400 + (index % 11) * 3000,
          yMm: 400 + Math.floor(index / 11) * 2400,
          widthMm: table.declaredCapacity >= 12 ? 2400 : table.declaredCapacity <= 4 ? 1400 : 2000,
          heightMm: table.declaredCapacity >= 12 ? 2400 : table.declaredCapacity <= 4 ? 1400 : 2000,
        },
        subtype: { shape: "RECTANGLE", declaredCapacity: table.declaredCapacity },
      },
    });
    // Bound PostgresPlatformStore.replace() retention on large hydrated production snapshots.
    if (flush) await flush();
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
  };
}

function asLayoutRef(layout: { id: string; version: number; currentRevisionNumber: number }) {
  return { id: layout.id, version: layout.version, currentRevisionNumber: layout.currentRevisionNumber };
}

export type ApplyCapacity1000SeatingLayoutOptions = {
  plannerAssignmentId?: string;
  directorAssignmentId?: string;
  /** Persist queued PostgresPlatformStore.replace() work after each published batch. */
  flush?: () => Promise<void>;
  onProgress?: (message: string, detail?: { layoutBatch: number; tableCount: number }) => void;
};

export async function applyCapacity1000SeatingLayout(
  service: PlatformService,
  store: PlatformStore,
  eventId: string,
  plannerActor: ActorContext,
  directorActor: ActorContext,
  prefix: string,
  assignmentIds?: ApplyCapacity1000SeatingLayoutOptions,
) {
  const view = store.viewSnapshot();
  const venue =
    view.venues.find((item) => item.organisationId === people.orgMaison && item.status === "ACTIVE") ??
    service.createVenue(directorActor, {
      organisationId: people.orgMaison,
      displayName: `${prefix} stretch pavilion`,
      reason: "Capacity stretch qualification venue",
      idempotencyKey: `${prefix}-venue`,
    });
  const adopted = service.adoptVenue(directorActor, {
    organisationId: people.orgMaison,
    eventId,
    venueId: venue.id,
    reason: "Adopt capacity stretch qualification venue",
    idempotencyKey: `${prefix}-adopt`,
  });
  let layout: { id: string; version: number; currentRevisionNumber: number } = service.createBlankLayout(plannerActor, {
    organisationId: people.orgMaison,
    eventId,
    eventVenueId: adopted.id,
    name: `${prefix} stretch hall`,
    widthMm: 48000,
    heightMm: 36000,
    reason: "Create stretch capacity qualification layout",
    idempotencyKey: `${prefix}-layout`,
  });

  const batchDiffs: Array<{ batch: number; tableCount: number; materialDiffSummaryLength: number }> = [];
  const batches: Capacity1000TableSpec[][] = [];
  for (let index = 0; index < CAPACITY_1000_TABLE_SPECS.length; index += CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE) {
    batches.push([...CAPACITY_1000_TABLE_SPECS.slice(index, index + CAPACITY_LAYOUT_PUBLISH_BATCH_SIZE)]);
  }

  let startIndex = 0;
  for (const [batchIndex, batch] of batches.entries()) {
    assignmentIds?.onProgress?.(`${prefix} layout batch ${batchIndex + 1} tables…`, {
      layoutBatch: batchIndex + 1,
      tableCount: batch.length,
    });
    layout = await addTables(service, plannerActor, eventId, layout, batch, startIndex, assignmentIds?.flush);
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
    if (assignmentIds?.flush) {
      assignmentIds.onProgress?.(`${prefix} layout batch ${batchIndex + 1} flush…`, {
        layoutBatch: batchIndex + 1,
        tableCount: batch.length,
      });
      await assignmentIds.flush();
    }
  }

  const publication = store
    .viewSnapshot()
    .layoutPublications.find((item) => item.layoutId === layout.id && item.status === "CURRENT");
  assert.ok(publication);
  const workspace = service.getLayoutSetupWorkspace(directorActor, people.orgMaison, eventId, layout.id);
  const tables = workspace.objects.filter((item) => item.objectType === "TABLE" && !item.tombstoned);
  const declaredSeats = tables.reduce((sum, item) => {
    const subtype = item.subtype as { declaredCapacity?: number };
    return sum + (subtype.declaredCapacity ?? 0);
  }, 0);
  assert.equal(tables.length, 110);
  assert.equal(declaredSeats, 1000);

  await ensureSeatingLayoutBindingForLayout(service, {
    organisationId: people.orgMaison,
    eventId,
    layoutId: layout.id,
    plannerAssignmentId: assignmentIds?.plannerAssignmentId ?? people.assignPlanner,
    directorAssignmentId: assignmentIds?.directorAssignmentId ?? people.assignDirector,
    idempotencyPrefix: prefix,
  });
  return { layout: workspace.layout, publication, batchDiffs, profile: CAPACITY_1000_LAYOUT_JUSTIFICATION };
}
