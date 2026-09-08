import { randomUUID } from "node:crypto";
import { MAX_SEATS_PER_TABLE, MAX_SPATIAL_OBJECTS, SCHEMA_VERSION } from "./constants.js";
import { PlatformError } from "./errors.js";
import { requireScopedEvent } from "./programme-operations.js";
import type { PlatformSnapshot } from "./store.js";
import { layoutContentHash, normalizeMillidegree } from "./venue-geometry.js";
import { assertNoVenueGuestIdentity, acquireLayoutLeaseOnSnap } from "./venue-operations.js";
import { LayoutRevisionSchema, LayoutSchema, type Layout, type LayoutRevision } from "./venue-schemas.js";
import {
  ApplyLayoutCommandInputSchema,
  LayoutCommandSchema,
  LayoutDraftCursorSchema,
  SpatialObjectSchema,
  type ApplyLayoutCommandInput,
  type LayoutCommand,
  type LayoutDraftCursor,
  type SpatialCommandBody,
  type SpatialGeometry,
  type SpatialObject,
} from "./spatial-schemas.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, version: 1, createdAt: now, updatedAt: now } as const;
}

function requireLayout(snap: PlatformSnapshot, organisationId: string, eventId: string, layoutId: string): Layout {
  const layout = snap.layouts.find((item) => item.id === layoutId);
  if (!layout || layout.organisationId !== organisationId || layout.eventId !== eventId) {
    throw new PlatformError("NOT_FOUND", "layout was not found");
  }
  return layout;
}

function currentRevision(snap: PlatformSnapshot, layout: Layout): LayoutRevision {
  const revision = snap.layoutRevisions.find((item) => item.id === layout.currentRevisionId);
  if (!revision) throw new PlatformError("INTERNAL_ERROR", "layout revision is missing");
  return revision;
}

export function liveSpatialObjects(revision: LayoutRevision): SpatialObject[] {
  return revision.objects.filter((item) => !item.tombstoned);
}

function draftCursor(snap: PlatformSnapshot, layoutId: string): LayoutDraftCursor | undefined {
  return snap.layoutDraftCursors.find((item) => item.layoutId === layoutId);
}

function ensureDraftCursor(snap: PlatformSnapshot, layout: Layout, now: string): LayoutDraftCursor {
  const existing = draftCursor(snap, layout.id);
  if (existing) return existing;
  const created = LayoutDraftCursorSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    historyCommandIds: [],
    cursor: 0,
    ...stamp(now),
  });
  snap.layoutDraftCursors.push(created);
  return created;
}

function boundingBox(geometry: SpatialGeometry): { minX: number; minY: number; maxX: number; maxY: number } {
  if (geometry.kind === "RECTANGLE") {
    return { minX: geometry.xMm, minY: geometry.yMm, maxX: geometry.xMm + geometry.widthMm, maxY: geometry.yMm + geometry.heightMm };
  }
  if (geometry.kind === "ELLIPSE") {
    return {
      minX: geometry.cxMm - geometry.radiusXMm,
      minY: geometry.cyMm - geometry.radiusYMm,
      maxX: geometry.cxMm + geometry.radiusXMm,
      maxY: geometry.cyMm + geometry.radiusYMm,
    };
  }
  const xs = geometry.points.map((point) => point.xMm);
  const ys = geometry.points.map((point) => point.yMm);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function translateGeometry(geometry: SpatialGeometry, deltaX: number, deltaY: number): SpatialGeometry {
  if (geometry.kind === "RECTANGLE") {
    return { ...geometry, xMm: geometry.xMm + deltaX, yMm: geometry.yMm + deltaY };
  }
  if (geometry.kind === "ELLIPSE") {
    return { ...geometry, cxMm: geometry.cxMm + deltaX, cyMm: geometry.cyMm + deltaY };
  }
  return {
    ...geometry,
    points: geometry.points.map((point) => ({ xMm: point.xMm + deltaX, yMm: point.yMm + deltaY })),
  };
}

function assertInBounds(layout: Layout, geometry: SpatialGeometry, field = "geometry"): void {
  const box = boundingBox(geometry);
  if (box.minX < 0 || box.minY < 0 || box.maxX > layout.bounds.widthMm || box.maxY > layout.bounds.heightMm) {
    throw new PlatformError("VALIDATION_FAILED", "object geometry is outside the layout bounds", {
      field,
      publicMessage: "Objects must stay inside the layout floor. Canonical coordinates are millimetres.",
    });
  }
}

function assertUnlocked(object: SpatialObject, canOverrideGoverned: boolean, action: string): void {
  const governed =
    object.objectType === "SAFE_AREA" || object.objectType === "RESTRICTED_AREA" || object.objectType === "CLEARANCE_AREA";
  const governedLocked = governed && "governedLocked" in object.subtype && object.subtype.governedLocked;
  if (governedLocked && !canOverrideGoverned) {
    throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint", {
      publicMessage: "This governed area is locked. A specialist override is required to weaken it.",
    });
  }
  if (object.locked && !canOverrideGoverned && action !== "SET_LOCK") {
    throw new PlatformError("FORBIDDEN", "this object is locked", {
      publicMessage: "A locked object cannot be edited until it is unlocked.",
    });
  }
}

function isGovernedWeaken(object: SpatialObject, command: SpatialCommandBody): boolean {
  const governed =
    object.objectType === "SAFE_AREA" || object.objectType === "RESTRICTED_AREA" || object.objectType === "CLEARANCE_AREA";
  if (!governed || !("governedLocked" in object.subtype) || !object.subtype.governedLocked) return false;
  return (
    command.kind === "TOMBSTONE" ||
    command.kind === "MOVE" ||
    command.kind === "RESIZE" ||
    command.kind === "SET_VISIBILITY" ||
    (command.kind === "SET_LOCK" && command.locked === false) ||
    command.kind === "UPDATE_PROPERTIES"
  );
}

function persistObjects(
  snap: PlatformSnapshot,
  layout: Layout,
  objects: SpatialObject[],
  actorPersonId: string,
  now: string,
): LayoutRevision {
  if (objects.length > MAX_SPATIAL_OBJECTS) {
    throw new PlatformError("VALIDATION_FAILED", `a layout may contain at most ${MAX_SPATIAL_OBJECTS} objects`);
  }
  const parsed = objects.map((item) => SpatialObjectSchema.parse(item));
  const contentHash = layoutContentHash({
    coordinateSystem: layout.coordinateSystem,
    bounds: layout.bounds,
    objects: parsed,
  });
  const revision = LayoutRevisionSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    revisionNumber: layout.currentRevisionNumber + 1,
    contentHash,
    coordinateSystem: layout.coordinateSystem,
    bounds: layout.bounds,
    objects: parsed,
    createdByPersonId: actorPersonId,
    immutable: true,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  snap.layoutRevisions.push(revision);
  layout.currentRevisionId = revision.id;
  layout.currentRevisionNumber = revision.revisionNumber;
  layout.contentHash = contentHash;
  layout.updatedAt = now;
  layout.version += 1;
  LayoutSchema.parse(layout);
  return revision;
}

function auditCommand(
  snap: PlatformSnapshot,
  layout: Layout,
  kind: LayoutCommand["kind"],
  objectIds: string[],
  previousRevisionId: string,
  result: LayoutRevision,
  actorPersonId: string,
  now: string,
  inverseOf?: string,
): LayoutCommand {
  const command = LayoutCommandSchema.parse({
    id: randomUUID(),
    organisationId: layout.organisationId,
    clientId: layout.clientId,
    eventId: layout.eventId,
    layoutId: layout.id,
    kind,
    objectIds,
    previousRevisionId,
    resultRevisionId: result.id,
    resultRevisionNumber: result.revisionNumber,
    inverseOfCommandId: inverseOf,
    acknowledged: true,
    createdByPersonId: actorPersonId,
    ...stamp(now),
  });
  snap.layoutCommands.push(command);
  return command;
}

function recordCommand(
  snap: PlatformSnapshot,
  layout: Layout,
  kind: LayoutCommand["kind"],
  objectIds: string[],
  previousRevisionId: string,
  result: LayoutRevision,
  actorPersonId: string,
  now: string,
): LayoutCommand {
  const cursor = ensureDraftCursor(snap, layout, now);
  cursor.historyCommandIds = cursor.historyCommandIds.slice(0, cursor.cursor);
  const command = auditCommand(snap, layout, kind, objectIds, previousRevisionId, result, actorPersonId, now);
  cursor.historyCommandIds.push(command.id);
  cursor.cursor = cursor.historyCommandIds.length;
  cursor.updatedAt = now;
  cursor.version += 1;
  return command;
}

function nextZ(objects: readonly SpatialObject[]): number {
  return objects.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
}

function defaultLabel(type: SpatialObject["objectType"], objects: readonly SpatialObject[]): string {
  const count = objects.filter((item) => item.objectType === type && !item.tombstoned).length + 1;
  return `${type.replaceAll("_", " ")} ${count}`;
}

function cloneObject(
  source: SpatialObject,
  overrides: Partial<SpatialObject>,
  now: string,
  actorPersonId: string,
): SpatialObject {
  return SpatialObjectSchema.parse({
    ...source,
    ...overrides,
    updatedByPersonId: actorPersonId,
    updatedAt: now,
    version: 1,
    createdAt: overrides.createdAt ?? now,
    createdByPersonId: overrides.createdByPersonId ?? actorPersonId,
  });
}

function generateSeatGeometry(table: SpatialObject, index: number, count: number): SpatialGeometry {
  const geometry = table.geometry;
  if (geometry.kind === "ELLIPSE" || (geometry.kind === "RECTANGLE" && "shape" in table.subtype && table.subtype.shape === "CIRCLE")) {
    const cx = geometry.kind === "ELLIPSE" ? geometry.cxMm : geometry.xMm + Math.round(geometry.widthMm / 2);
    const cy = geometry.kind === "ELLIPSE" ? geometry.cyMm : geometry.yMm + Math.round(geometry.heightMm / 2);
    const rx = geometry.kind === "ELLIPSE" ? geometry.radiusXMm + 700 : Math.round(geometry.widthMm / 2) + 700;
    const ry = geometry.kind === "ELLIPSE" ? geometry.radiusYMm + 700 : Math.round(geometry.heightMm / 2) + 700;
    const angle = (2 * Math.PI * index) / count - Math.PI / 2;
    return {
      kind: "RECTANGLE",
      xMm: Math.max(0, Math.round(cx + rx * Math.cos(angle) - 200)),
      yMm: Math.max(0, Math.round(cy + ry * Math.sin(angle) - 200)),
      widthMm: 400,
      heightMm: 400,
    };
  }
  if (geometry.kind !== "RECTANGLE") {
    throw new PlatformError("VALIDATION_FAILED", "seats can only be generated for rectangular or elliptical tables");
  }
  const perSide = Math.max(1, Math.ceil(count / 4));
  const side = Math.floor(index / perSide);
  const along = index % perSide;
  const t = perSide === 1 ? 0.5 : along / (perSide - 1);
  if (side === 0) {
    return { kind: "RECTANGLE", xMm: geometry.xMm + Math.round(t * geometry.widthMm) - 200, yMm: geometry.yMm - 500, widthMm: 400, heightMm: 400 };
  }
  if (side === 1) {
    return { kind: "RECTANGLE", xMm: geometry.xMm + geometry.widthMm + 100, yMm: geometry.yMm + Math.round(t * geometry.heightMm) - 200, widthMm: 400, heightMm: 400 };
  }
  if (side === 2) {
    return { kind: "RECTANGLE", xMm: geometry.xMm + Math.round((1 - t) * geometry.widthMm) - 200, yMm: geometry.yMm + geometry.heightMm + 100, widthMm: 400, heightMm: 400 };
  }
  return { kind: "RECTANGLE", xMm: geometry.xMm - 500, yMm: geometry.yMm + Math.round((1 - t) * geometry.heightMm) - 200, widthMm: 400, heightMm: 400 };
}

function applyBody(
  objects: SpatialObject[],
  layout: Layout,
  command: SpatialCommandBody,
  now: string,
  actorPersonId: string,
  canOverrideGoverned: boolean,
): { next: SpatialObject[]; touched: string[] } {
  const live = () => objects.filter((item) => !item.tombstoned);
  const byId = (id: string) => {
    const found = objects.find((item) => item.id === id);
    if (!found || found.tombstoned) throw new PlatformError("NOT_FOUND", "spatial object was not found");
    return found;
  };

  if (command.kind === "CREATE_OBJECT") {
    assertInBounds(layout, command.geometry);
    const created = SpatialObjectSchema.parse({
      id: randomUUID(),
      organisationId: layout.organisationId,
      clientId: layout.clientId,
      eventId: layout.eventId,
      layoutId: layout.id,
      objectType: command.objectType,
      label: command.label || defaultLabel(command.objectType, live()),
      geometry: command.geometry,
      rotationMillidegree: normalizeMillidegree(command.rotationMillidegree),
      layer: command.layer,
      zIndex: nextZ(live()),
      locked: false,
      visible: true,
      tombstoned: false,
      subtype: command.subtype,
      createdByPersonId: actorPersonId,
      updatedByPersonId: actorPersonId,
      ...stamp(now),
    });
    return { next: [...objects, created], touched: [created.id] };
  }

  if (command.kind === "UPDATE_PROPERTIES") {
    const target = byId(command.objectId);
    assertUnlocked(target, canOverrideGoverned, command.kind);
    if (isGovernedWeaken(target, command) && !canOverrideGoverned) {
      throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
    }
    const updated = cloneObject(
      target,
      {
        label: command.label ?? target.label,
        subtype: command.subtype ?? target.subtype,
        version: target.version + 1,
        createdAt: target.createdAt,
        createdByPersonId: target.createdByPersonId,
      },
      now,
      actorPersonId,
    );
    return { next: objects.map((item) => (item.id === target.id ? updated : item)), touched: [target.id] };
  }

  if (command.kind === "MOVE") {
    const touched = command.objectIds;
    const next = objects.map((item) => {
      if (!touched.includes(item.id) || item.tombstoned) return item;
      assertUnlocked(item, canOverrideGoverned, command.kind);
      if (isGovernedWeaken(item, command) && !canOverrideGoverned) {
        throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
      }
      const geometry = translateGeometry(item.geometry, command.deltaXMm, command.deltaYMm);
      assertInBounds(layout, geometry);
      return cloneObject(item, { geometry, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
    });
    return { next, touched };
  }

  if (command.kind === "RESIZE") {
    const target = byId(command.objectId);
    assertUnlocked(target, canOverrideGoverned, command.kind);
    if (isGovernedWeaken(target, command) && !canOverrideGoverned) {
      throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
    }
    assertInBounds(layout, command.geometry);
    const updated = cloneObject(
      target,
      { geometry: command.geometry, version: target.version + 1, createdAt: target.createdAt, createdByPersonId: target.createdByPersonId },
      now,
      actorPersonId,
    );
    return { next: objects.map((item) => (item.id === target.id ? updated : item)), touched: [target.id] };
  }

  if (command.kind === "ROTATE") {
    const target = byId(command.objectId);
    assertUnlocked(target, canOverrideGoverned, command.kind);
    const updated = cloneObject(
      target,
      {
        rotationMillidegree: normalizeMillidegree(command.rotationMillidegree),
        version: target.version + 1,
        createdAt: target.createdAt,
        createdByPersonId: target.createdByPersonId,
      },
      now,
      actorPersonId,
    );
    return { next: objects.map((item) => (item.id === target.id ? updated : item)), touched: [target.id] };
  }

  if (command.kind === "TOMBSTONE") {
    const next = objects.map((item) => {
      if (!command.objectIds.includes(item.id) || item.tombstoned) return item;
      assertUnlocked(item, canOverrideGoverned, command.kind);
      if (isGovernedWeaken(item, command) && !canOverrideGoverned) {
        throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
      }
      return cloneObject(item, { tombstoned: true, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
    });
    return { next, touched: command.objectIds };
  }

  if (command.kind === "DUPLICATE") {
    const created: SpatialObject[] = [];
    for (const id of command.objectIds) {
      const source = byId(id);
      const geometry = translateGeometry(source.geometry, command.offsetMm, command.offsetMm);
      assertInBounds(layout, geometry);
      created.push(
        cloneObject(
          source,
          {
            id: randomUUID(),
            label: `${source.label} copy`,
            geometry,
            locked: false,
            groupId: undefined,
            zIndex: nextZ([...live(), ...created]),
            createdAt: now,
            createdByPersonId: actorPersonId,
          },
          now,
          actorPersonId,
        ),
      );
    }
    return { next: [...objects, ...created], touched: created.map((item) => item.id) };
  }

  if (command.kind === "GROUP") {
    const members = command.objectIds.map(byId);
    for (const member of members) assertUnlocked(member, canOverrideGoverned, command.kind);
    const boxes = members.map((item) => boundingBox(item.geometry));
    const geometry: SpatialGeometry = {
      kind: "RECTANGLE",
      xMm: Math.min(...boxes.map((box) => box.minX)),
      yMm: Math.min(...boxes.map((box) => box.minY)),
      widthMm: Math.max(1, Math.max(...boxes.map((box) => box.maxX)) - Math.min(...boxes.map((box) => box.minX))),
      heightMm: Math.max(1, Math.max(...boxes.map((box) => box.maxY)) - Math.min(...boxes.map((box) => box.minY))),
    };
    const group = SpatialObjectSchema.parse({
      id: randomUUID(),
      organisationId: layout.organisationId,
      clientId: layout.clientId,
      eventId: layout.eventId,
      layoutId: layout.id,
      objectType: "GROUP",
      label: command.label,
      geometry,
      rotationMillidegree: 0,
      layer: 0,
      zIndex: nextZ(live()),
      locked: false,
      visible: true,
      tombstoned: false,
      subtype: { memberIds: command.objectIds },
      createdByPersonId: actorPersonId,
      updatedByPersonId: actorPersonId,
      ...stamp(now),
    });
    const next = objects.map((item) =>
      command.objectIds.includes(item.id)
        ? cloneObject(item, { groupId: group.id, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId)
        : item,
    );
    return { next: [...next, group], touched: [group.id, ...command.objectIds] };
  }

  if (command.kind === "UNGROUP") {
    const group = byId(command.groupId);
    if (group.objectType !== "GROUP") throw new PlatformError("VALIDATION_FAILED", "only a group can be ungrouped");
    const memberIds = "memberIds" in group.subtype ? group.subtype.memberIds : [];
    const next = objects.map((item) => {
      if (item.id === group.id) {
        return cloneObject(item, { tombstoned: true, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
      }
      if (memberIds.includes(item.id)) {
        return cloneObject(item, { groupId: undefined, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
      }
      return item;
    });
    return { next, touched: [group.id, ...memberIds] };
  }

  if (command.kind === "REORDER") {
    const target = byId(command.objectId);
    const updated = cloneObject(
      target,
      {
        layer: command.layer ?? target.layer,
        zIndex: command.zIndex ?? target.zIndex,
        version: target.version + 1,
        createdAt: target.createdAt,
        createdByPersonId: target.createdByPersonId,
      },
      now,
      actorPersonId,
    );
    return { next: objects.map((item) => (item.id === target.id ? updated : item)), touched: [target.id] };
  }

  if (command.kind === "SET_VISIBILITY") {
    const next = objects.map((item) => {
      if (!command.objectIds.includes(item.id) || item.tombstoned) return item;
      if (isGovernedWeaken(item, command) && !canOverrideGoverned) {
        throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
      }
      return cloneObject(item, { visible: command.visible, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
    });
    return { next, touched: command.objectIds };
  }

  if (command.kind === "SET_LOCK") {
    const next = objects.map((item) => {
      if (!command.objectIds.includes(item.id) || item.tombstoned) return item;
      if (isGovernedWeaken(item, command) && !canOverrideGoverned) {
        throw new PlatformError("FORBIDDEN", "ordinary planners cannot weaken a governed locked constraint");
      }
      return cloneObject(item, { locked: command.locked, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
    });
    return { next, touched: command.objectIds };
  }

  if (command.kind === "GENERATE_SEATS") {
    const table = byId(command.tableId);
    if (table.objectType !== "TABLE") throw new PlatformError("VALIDATION_FAILED", "seats can only be generated for a table");
    assertUnlocked(table, canOverrideGoverned, command.kind);
    if (command.seatCount > MAX_SEATS_PER_TABLE) {
      throw new PlatformError("VALIDATION_FAILED", `seat generation rejects more than ${MAX_SEATS_PER_TABLE} seats`);
    }
    const existing = objects.filter(
      (item) => item.objectType === "SEAT" && !item.tombstoned && "tableId" in item.subtype && item.subtype.tableId === table.id,
    );
    const materialChange = existing.length > 0 && existing.length !== command.seatCount;
    if (materialChange && !command.confirmDestructive) {
      throw new PlatformError("VALIDATION_FAILED", "regenerating seats would replace existing physical seat identifiers", {
        publicMessage: "Seat count changed. Confirm destructive regeneration to replace physical seat identifiers. Existing IDs are kept when the count is unchanged.",
      });
    }
    const preserve = existing.length === command.seatCount;
    const seats: SpatialObject[] = [];
    for (let index = 0; index < command.seatCount; index += 1) {
      const geometry = generateSeatGeometry(table, index, command.seatCount);
      assertInBounds(layout, geometry);
      const previous = preserve ? existing.find((item) => "sequence" in item.subtype && item.subtype.sequence === index + 1) : undefined;
      seats.push(
        SpatialObjectSchema.parse({
          id: previous?.id ?? randomUUID(),
          organisationId: layout.organisationId,
          clientId: layout.clientId,
          eventId: layout.eventId,
          layoutId: layout.id,
          objectType: "SEAT",
          label: previous?.label ?? `${table.label}-${String(index + 1).padStart(2, "0")}`,
          geometry,
          rotationMillidegree: 0,
          layer: table.layer,
          zIndex: nextZ([...live(), ...seats]),
          locked: false,
          visible: true,
          tombstoned: false,
          subtype: { tableId: table.id, sequence: index + 1, physicalLabel: `${table.label}-${String(index + 1).padStart(2, "0")}` },
          createdByPersonId: previous?.createdByPersonId ?? actorPersonId,
          updatedByPersonId: actorPersonId,
          schemaVersion: SCHEMA_VERSION,
          version: (previous?.version ?? 0) + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        }),
      );
    }
    const replaced = new Set(existing.map((item) => item.id));
    const kept = objects.map((item) => {
      if (!replaced.has(item.id)) return item;
      const nextSeat = seats.find((seat) => seat.id === item.id);
      return nextSeat ?? cloneObject(item, { tombstoned: true, version: item.version + 1, createdAt: item.createdAt, createdByPersonId: item.createdByPersonId }, now, actorPersonId);
    });
    const additions = seats.filter((seat) => !objects.some((item) => item.id === seat.id));
    return { next: [...kept, ...additions], touched: seats.map((item) => item.id) };
  }

  throw new PlatformError("VALIDATION_FAILED", "unsupported spatial command");
}

export type ApplyLayoutCommandResult = {
  id: string;
  layout: Layout;
  objects: SpatialObject[];
  command: LayoutCommand;
  canUndo: boolean;
  canRedo: boolean;
};

export function applyLayoutCommandOnSnap(
  snap: PlatformSnapshot,
  input: ApplyLayoutCommandInput,
  now: string,
  actorPersonId: string,
  canOverrideGoverned: boolean,
): ApplyLayoutCommandResult {
  assertNoVenueGuestIdentity(input);
  assertNoVenueGuestIdentity(input.command);
  ApplyLayoutCommandInputSchema.parse(input);
  requireScopedEvent(snap, input.organisationId, input.eventId);
  const layout = requireLayout(snap, input.organisationId, input.eventId, input.layoutId);
  if (layout.version !== input.expectedVersion || layout.currentRevisionNumber !== input.expectedRevisionNumber) {
    throw new PlatformError("VERSION_CONFLICT", "this layout revision changed while you were editing", {
      publicMessage: "This layout changed while you were editing. Reload before retrying. Rejected values were not saved.",
    });
  }
  acquireLayoutLeaseOnSnap(
    snap,
    { organisationId: input.organisationId, eventId: input.eventId, layoutId: input.layoutId, reason: "Acquire editor lease for spatial command" },
    now,
    actorPersonId,
  );
  const previous = currentRevision(snap, layout);
  const cursor = ensureDraftCursor(snap, layout, now);

  if (input.command.kind === "UNDO") {
    if (cursor.cursor < 1) throw new PlatformError("VALIDATION_FAILED", "nothing to undo");
    const commandId = cursor.historyCommandIds[cursor.cursor - 1];
    const source = snap.layoutCommands.find((item) => item.id === commandId);
    if (!source) throw new PlatformError("INTERNAL_ERROR", "undo source command is missing");
    const prior = snap.layoutRevisions.find((item) => item.id === source.previousRevisionId);
    if (!prior) throw new PlatformError("INTERNAL_ERROR", "undo source revision is missing");
    const revision = persistObjects(snap, layout, prior.objects, actorPersonId, now);
    const recorded = auditCommand(snap, layout, "UNDO", source.objectIds, previous.id, revision, actorPersonId, now, source.id);
    cursor.cursor = Math.max(0, cursor.cursor - 1);
    cursor.updatedAt = now;
    cursor.version += 1;
    return {
      id: layout.id,
      layout,
      objects: liveSpatialObjects(revision),
      command: recorded,
      canUndo: cursor.cursor > 0,
      canRedo: cursor.cursor < cursor.historyCommandIds.length,
    };
  }

  if (input.command.kind === "REDO") {
    if (cursor.cursor >= cursor.historyCommandIds.length) throw new PlatformError("VALIDATION_FAILED", "nothing to redo");
    const commandId = cursor.historyCommandIds[cursor.cursor];
    const source = snap.layoutCommands.find((item) => item.id === commandId);
    if (!source) throw new PlatformError("INTERNAL_ERROR", "redo source command is missing");
    const future = snap.layoutRevisions.find((item) => item.id === source.resultRevisionId);
    if (!future) throw new PlatformError("INTERNAL_ERROR", "redo source revision is missing");
    const revision = persistObjects(snap, layout, future.objects, actorPersonId, now);
    const recorded = auditCommand(snap, layout, "REDO", source.objectIds, previous.id, revision, actorPersonId, now, source.id);
    cursor.cursor += 1;
    cursor.updatedAt = now;
    cursor.version += 1;
    return {
      id: layout.id,
      layout,
      objects: liveSpatialObjects(revision),
      command: recorded,
      canUndo: cursor.cursor > 0,
      canRedo: cursor.cursor < cursor.historyCommandIds.length,
    };
  }

  const applied = applyBody(previous.objects, layout, input.command, now, actorPersonId, canOverrideGoverned);
  const revision = persistObjects(snap, layout, applied.next, actorPersonId, now);
  const recorded = recordCommand(snap, layout, input.command.kind, applied.touched, previous.id, revision, actorPersonId, now);
  return {
    id: layout.id,
    layout,
    objects: liveSpatialObjects(revision),
    command: recorded,
    canUndo: true,
    canRedo: false,
  };
}

export function currentLayoutObjects(snap: PlatformSnapshot, layout: Layout): SpatialObject[] {
  return liveSpatialObjects(currentRevision(snap, layout));
}
