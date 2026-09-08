import { z } from "zod";
import {
  LAYOUT_EDITOR_LEASE_TTL_SECONDS,
  MAX_ROUTE_POINTS,
  MAX_SEATS_PER_TABLE,
  MAX_SPATIAL_OBJECTS,
  SCHEMA_VERSION,
  SPATIAL_COMMAND_KINDS,
  SPATIAL_OBJECT_TYPES,
  VENUE_FACT_SOURCE_KINDS,
  VENUE_FACT_VERIFICATION_STATES,
} from "./constants.js";
import { MAX_MILLIDEGREE, MAX_MILLIMETRE } from "./venue-geometry.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  PersonIdSchema,
  UuidSchema,
} from "./schemas.js";

export const SpatialObjectIdSchema = UuidSchema;
export const LayoutCommandIdSchema = UuidSchema;
export const LayoutDraftCursorIdSchema = UuidSchema;
const LayoutIdSchema = UuidSchema;
const MillimetreSchema = z.number().int().min(0).max(MAX_MILLIMETRE);
const PositiveMillimetreSchema = z.number().int().min(1).max(MAX_MILLIMETRE);
const MillidegreeSchema = z.number().int().min(0).max(MAX_MILLIDEGREE);

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
};

const eventLayoutScoped = {
  organisationId: OrganisationIdSchema,
  clientId: ClientIdSchema,
  eventId: EventIdSchema,
  layoutId: LayoutIdSchema,
};

export const SignedMillimetreSchema = z.number().int().min(0).max(MAX_MILLIMETRE);

export const PointMmSchema = z
  .object({
    xMm: SignedMillimetreSchema,
    yMm: SignedMillimetreSchema,
  })
  .strict();

export const RectangleGeometrySchema = z
  .object({
    kind: z.literal("RECTANGLE"),
    xMm: SignedMillimetreSchema,
    yMm: SignedMillimetreSchema,
    widthMm: PositiveMillimetreSchema,
    heightMm: PositiveMillimetreSchema,
  })
  .strict();

export const EllipseGeometrySchema = z
  .object({
    kind: z.literal("ELLIPSE"),
    cxMm: SignedMillimetreSchema,
    cyMm: SignedMillimetreSchema,
    radiusXMm: PositiveMillimetreSchema,
    radiusYMm: PositiveMillimetreSchema,
  })
  .strict();

export const PolylineGeometrySchema = z
  .object({
    kind: z.literal("POLYLINE"),
    points: z.array(PointMmSchema).min(2).max(MAX_ROUTE_POINTS),
    widthMm: PositiveMillimetreSchema,
  })
  .strict();

export const PolygonGeometrySchema = z
  .object({
    kind: z.literal("POLYGON"),
    points: z.array(PointMmSchema).min(3).max(MAX_ROUTE_POINTS),
  })
  .strict();

export const SpatialGeometrySchema = z.discriminatedUnion("kind", [
  RectangleGeometrySchema,
  EllipseGeometrySchema,
  PolylineGeometrySchema,
  PolygonGeometrySchema,
]);

export const ZoneSubtypeSchema = z
  .object({
    category: z.enum(["CEREMONY", "DINING", "RECEPTION", "SERVICE", "CIRCULATION", "HOLDING", "CUSTOM"]),
    customCategory: z.string().trim().max(80).optional(),
    declaredCapacity: z.number().int().min(0).max(100_000).optional(),
    capacitySource: z.enum(VENUE_FACT_SOURCE_KINDS).optional(),
    capacityVerificationState: z.enum(VENUE_FACT_VERIFICATION_STATES).optional(),
    accessNote: z.string().trim().max(400).optional(),
  })
  .strict();

export const TableSubtypeSchema = z
  .object({
    shape: z.enum(["RECTANGLE", "CIRCLE", "OVAL"]),
    declaredCapacity: z.number().int().min(0).max(MAX_SEATS_PER_TABLE),
    seatGenerationCount: z.number().int().min(0).max(MAX_SEATS_PER_TABLE).optional(),
  })
  .strict();

export const SeatSubtypeSchema = z
  .object({
    tableId: SpatialObjectIdSchema,
    sequence: z.number().int().min(1).max(MAX_SEATS_PER_TABLE),
    physicalLabel: NonEmptySchema.max(40),
  })
  .strict();

export const FixtureSubtypeSchema = z
  .object({
    fixtureKind: z.enum(["STAGE", "BAR", "DJ", "CATERING", "SIGNAGE", "POWER", "AV", "DECOR", "CUSTOM"]),
    customKind: z.string().trim().max(80).optional(),
    movable: z.boolean(),
    clearanceMm: MillimetreSchema.optional(),
    safetyImplication: z.literal(false),
  })
  .strict();

export const RouteSubtypeSchema = z
  .object({
    purpose: z.enum(["INGRESS", "EGRESS", "SERVICE", "EMERGENCY", "ACCESSIBLE", "PROCESSIONAL", "CUSTOM"]),
    direction: z.enum(["FORWARD", "BIDIRECTIONAL"]),
    accessibleState: z.enum(["UNKNOWN", "STEP_FREE", "ASSISTED", "NOT_ACCESSIBLE"]),
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    sourceLabel: NonEmptySchema.max(160),
  })
  .strict();

export const GovernedAreaSubtypeSchema = z
  .object({
    sourceKind: z.enum(VENUE_FACT_SOURCE_KINDS),
    authorityLabel: NonEmptySchema.max(160),
    verificationState: z.enum(VENUE_FACT_VERIFICATION_STATES),
    thresholdUnknown: z.boolean(),
    governedLocked: z.boolean(),
    note: z.string().trim().max(400).optional(),
  })
  .strict();

export const AnnotationSubtypeSchema = z
  .object({
    body: NonEmptySchema.max(800),
    tone: z.enum(["NOTE", "WARNING", "INSTRUCTION"]),
  })
  .strict();

export const GroupSubtypeSchema = z
  .object({
    memberIds: z.array(SpatialObjectIdSchema).min(1).max(200),
  })
  .strict();

export const SpatialSubtypeSchema = z.union([
  ZoneSubtypeSchema,
  TableSubtypeSchema,
  SeatSubtypeSchema,
  FixtureSubtypeSchema,
  RouteSubtypeSchema,
  GovernedAreaSubtypeSchema,
  AnnotationSubtypeSchema,
  GroupSubtypeSchema,
]);

export const SpatialObjectSchema = z
  .object({
    id: SpatialObjectIdSchema,
    ...eventLayoutScoped,
    objectType: z.enum(SPATIAL_OBJECT_TYPES),
    label: NonEmptySchema.max(160),
    geometry: SpatialGeometrySchema,
    rotationMillidegree: MillidegreeSchema,
    layer: z.number().int().min(0).max(99),
    zIndex: z.number().int().min(0).max(100_000),
    locked: z.boolean(),
    visible: z.boolean(),
    tombstoned: z.boolean(),
    groupId: SpatialObjectIdSchema.optional(),
    subtype: SpatialSubtypeSchema,
    createdByPersonId: PersonIdSchema,
    updatedByPersonId: PersonIdSchema,
    nonProductionFixture: z.boolean().optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => {
    if (value.objectType === "ZONE") return ZoneSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "TABLE") return TableSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "SEAT") return SeatSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "FIXTURE") return FixtureSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "ROUTE") return RouteSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "SAFE_AREA" || value.objectType === "RESTRICTED_AREA" || value.objectType === "CLEARANCE_AREA") {
      return GovernedAreaSubtypeSchema.safeParse(value.subtype).success;
    }
    if (value.objectType === "ANNOTATION") return AnnotationSubtypeSchema.safeParse(value.subtype).success;
    if (value.objectType === "GROUP") return GroupSubtypeSchema.safeParse(value.subtype).success;
    return false;
  }, "subtype must match object type")
  .refine((value) => {
    if (value.objectType === "ROUTE") return value.geometry.kind === "POLYLINE";
    if (value.objectType === "SEAT") return value.geometry.kind === "RECTANGLE" || value.geometry.kind === "ELLIPSE";
    if (value.objectType === "ANNOTATION") return value.geometry.kind === "RECTANGLE";
    return true;
  }, "geometry kind is not valid for this object type");

export const LayoutCommandSchema = z
  .object({
    id: LayoutCommandIdSchema,
    ...eventLayoutScoped,
    kind: z.enum(SPATIAL_COMMAND_KINDS),
    objectIds: z.array(SpatialObjectIdSchema).max(200),
    previousRevisionId: UuidSchema,
    resultRevisionId: UuidSchema,
    resultRevisionNumber: z.number().int().positive(),
    inverseOfCommandId: LayoutCommandIdSchema.optional(),
    acknowledged: z.literal(true),
    createdByPersonId: PersonIdSchema,
    ...versioned,
  })
  .strict();

export const LayoutDraftCursorSchema = z
  .object({
    id: LayoutDraftCursorIdSchema,
    ...eventLayoutScoped,
    historyCommandIds: z.array(LayoutCommandIdSchema).max(500),
    cursor: z.number().int().min(0).max(500),
    ...versioned,
  })
  .strict()
  .refine((value) => value.cursor <= value.historyCommandIds.length, "cursor cannot pass acknowledged history");

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  layoutId: LayoutIdSchema,
  expectedVersion: z.number().int().positive(),
  expectedRevisionNumber: z.number().int().positive(),
  reason: NonEmptySchema.max(400),
  idempotencyKey: NonEmptySchema.max(120).optional(),
};

export const CreateSpatialObjectCommandSchema = z
  .object({
    kind: z.literal("CREATE_OBJECT"),
    objectType: z.enum(SPATIAL_OBJECT_TYPES),
    label: NonEmptySchema.max(160),
    geometry: SpatialGeometrySchema,
    rotationMillidegree: MillidegreeSchema.default(0),
    layer: z.number().int().min(0).max(99).default(0),
    subtype: SpatialSubtypeSchema,
  })
  .strict();

export const UpdateSpatialPropertiesCommandSchema = z
  .object({
    kind: z.literal("UPDATE_PROPERTIES"),
    objectId: SpatialObjectIdSchema,
    label: NonEmptySchema.max(160).optional(),
    subtype: SpatialSubtypeSchema.optional(),
  })
  .strict();

export const MoveSpatialObjectsCommandSchema = z
  .object({
    kind: z.literal("MOVE"),
    objectIds: z.array(SpatialObjectIdSchema).min(1).max(200),
    deltaXMm: z.number().int().min(-MAX_MILLIMETRE).max(MAX_MILLIMETRE),
    deltaYMm: z.number().int().min(-MAX_MILLIMETRE).max(MAX_MILLIMETRE),
  })
  .strict();

export const ResizeSpatialObjectCommandSchema = z
  .object({
    kind: z.literal("RESIZE"),
    objectId: SpatialObjectIdSchema,
    geometry: SpatialGeometrySchema,
  })
  .strict();

export const RotateSpatialObjectCommandSchema = z
  .object({
    kind: z.literal("ROTATE"),
    objectId: SpatialObjectIdSchema,
    rotationMillidegree: MillidegreeSchema,
  })
  .strict();

export const TombstoneSpatialObjectsCommandSchema = z
  .object({
    kind: z.literal("TOMBSTONE"),
    objectIds: z.array(SpatialObjectIdSchema).min(1).max(200),
  })
  .strict();

export const DuplicateSpatialObjectsCommandSchema = z
  .object({
    kind: z.literal("DUPLICATE"),
    objectIds: z.array(SpatialObjectIdSchema).min(1).max(200),
    offsetMm: z.number().int().min(0).max(10_000).default(500),
  })
  .strict();

export const GroupSpatialObjectsCommandSchema = z
  .object({
    kind: z.literal("GROUP"),
    objectIds: z.array(SpatialObjectIdSchema).min(2).max(200),
    label: NonEmptySchema.max(160).default("Group"),
  })
  .strict();

export const UngroupSpatialObjectsCommandSchema = z
  .object({
    kind: z.literal("UNGROUP"),
    groupId: SpatialObjectIdSchema,
  })
  .strict();

export const ReorderSpatialObjectCommandSchema = z
  .object({
    kind: z.literal("REORDER"),
    objectId: SpatialObjectIdSchema,
    layer: z.number().int().min(0).max(99).optional(),
    zIndex: z.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export const SetSpatialVisibilityCommandSchema = z
  .object({
    kind: z.literal("SET_VISIBILITY"),
    objectIds: z.array(SpatialObjectIdSchema).min(1).max(200),
    visible: z.boolean(),
  })
  .strict();

export const SetSpatialLockCommandSchema = z
  .object({
    kind: z.literal("SET_LOCK"),
    objectIds: z.array(SpatialObjectIdSchema).min(1).max(200),
    locked: z.boolean(),
  })
  .strict();

export const GenerateSeatsCommandSchema = z
  .object({
    kind: z.literal("GENERATE_SEATS"),
    tableId: SpatialObjectIdSchema,
    seatCount: z.number().int().min(1).max(MAX_SEATS_PER_TABLE),
    confirmDestructive: z.boolean().default(false),
  })
  .strict();

export const UndoRedoCommandSchema = z
  .object({
    kind: z.enum(["UNDO", "REDO"]),
  })
  .strict();

export const SpatialCommandBodySchema = z.discriminatedUnion("kind", [
  CreateSpatialObjectCommandSchema,
  UpdateSpatialPropertiesCommandSchema,
  MoveSpatialObjectsCommandSchema,
  ResizeSpatialObjectCommandSchema,
  RotateSpatialObjectCommandSchema,
  TombstoneSpatialObjectsCommandSchema,
  DuplicateSpatialObjectsCommandSchema,
  GroupSpatialObjectsCommandSchema,
  UngroupSpatialObjectsCommandSchema,
  ReorderSpatialObjectCommandSchema,
  SetSpatialVisibilityCommandSchema,
  SetSpatialLockCommandSchema,
  GenerateSeatsCommandSchema,
  UndoRedoCommandSchema,
]);

export const ApplyLayoutCommandInputSchema = z
  .object({
    ...mutationBase,
    command: SpatialCommandBodySchema,
  })
  .strict();

export const RenewLayoutLeaseInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    layoutId: LayoutIdSchema,
    reason: NonEmptySchema.max(400),
    idempotencyKey: NonEmptySchema.max(120).optional(),
  })
  .strict();

export const ReplayPendingLayoutCommandsInputSchema = z
  .object({
    ...mutationBase,
    commands: z.array(SpatialCommandBodySchema).min(1).max(20),
    discardLocal: z.boolean().default(false),
  })
  .strict();

export const LAYOUT_LEASE_TTL_SECONDS = LAYOUT_EDITOR_LEASE_TTL_SECONDS;
export const SPATIAL_OBJECT_LIMIT = MAX_SPATIAL_OBJECTS;

export type SpatialObject = z.infer<typeof SpatialObjectSchema>;
export type SpatialGeometry = z.infer<typeof SpatialGeometrySchema>;
export type LayoutCommand = z.infer<typeof LayoutCommandSchema>;
export type LayoutDraftCursor = z.infer<typeof LayoutDraftCursorSchema>;
export type SpatialCommandBody = z.infer<typeof SpatialCommandBodySchema>;
export type ApplyLayoutCommandInput = z.infer<typeof ApplyLayoutCommandInputSchema>;
export type RenewLayoutLeaseInput = z.infer<typeof RenewLayoutLeaseInputSchema>;
export type ReplayPendingLayoutCommandsInput = z.infer<typeof ReplayPendingLayoutCommandsInputSchema>;
export type SpatialObjectType = (typeof SPATIAL_OBJECT_TYPES)[number];
export type SpatialCommandKind = (typeof SPATIAL_COMMAND_KINDS)[number];
