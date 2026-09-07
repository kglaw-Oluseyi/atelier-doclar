import { z } from "zod";
import {
  ACCESS_EXCEPTION_STATUSES,
  ACCESS_ZONE_KINDS,
  ARRIVAL_ROUTE_KINDS,
  ARRIVAL_ROUTE_STATUSES,
  CHECKPOINT_RESOLUTION_OUTCOMES,
  CHECKPOINT_STATUSES,
  CHECKPOINT_TYPES,
  CREDENTIAL_PROJECTION_STATUSES,
  OFFLINE_PACKAGE_STATUSES,
  PHASE_ENTITLEMENT_STATUSES,
  PHASE_ENTITLEMENT_SUBJECT_TYPES,
  PROGRAMME_DAY_STATUSES,
  PROGRAMME_PHASE_STATUSES,
  PROGRAMME_PHASE_TYPES,
  SCHEMA_VERSION,
  VEHICLE_ASSOCIATION_ROLES,
  VEHICLE_CLASSES,
  VEHICLE_STATUSES,
} from "./constants.js";
import {
  ClientIdSchema,
  EventIdSchema,
  IsoDatetimeSchema,
  NonEmptySchema,
  OrganisationIdSchema,
  UuidSchema,
} from "./schemas.js";

export const ProgrammeDayIdSchema = UuidSchema;
export const ProgrammePhaseIdSchema = UuidSchema;
export const PhaseEntitlementIdSchema = UuidSchema;
export const ArrivalRouteIdSchema = UuidSchema;
export const PerimeterCheckpointIdSchema = UuidSchema;
export const AccessZoneIdSchema = UuidSchema;
export const CredentialProjectionIdSchema = UuidSchema;
export const OperationalVehicleIdSchema = UuidSchema;
export const VehicleAssociationIdSchema = UuidSchema;
export const OfflineAccessPackageIdSchema = UuidSchema;
export const AccessExceptionIdSchema = UuidSchema;
export const GuestIdRefSchema = UuidSchema;

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
  nonProductionFixture: z.boolean().optional(),
};

const mutationBase = {
  organisationId: OrganisationIdSchema,
  eventId: EventIdSchema,
  reason: NonEmptySchema,
  idempotencyKey: NonEmptySchema.optional(),
};

export const ProgrammeDaySchema = z
  .object({
    id: ProgrammeDayIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    label: NonEmptySchema.max(120),
    calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    timezone: NonEmptySchema.max(64),
    status: z.enum(PROGRAMME_DAY_STATUSES),
    sequence: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict();

export const ProgrammePhaseSchema = z
  .object({
    id: ProgrammePhaseIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    dayId: ProgrammeDayIdSchema.optional(),
    name: NonEmptySchema.max(160),
    type: z.enum(PROGRAMME_PHASE_TYPES),
    isDefault: z.boolean(),
    status: z.enum(PROGRAMME_PHASE_STATUSES),
    startsAt: IsoDatetimeSchema,
    endsAt: IsoDatetimeSchema,
    timezone: NonEmptySchema.max(64),
    locationLabel: NonEmptySchema.max(200),
    locationGuestSafe: z.string().trim().max(240).optional(),
    locationRestricted: z.string().trim().max(240).optional(),
    capacity: z.number().int().positive().optional(),
    sequence: z.number().int().nonnegative(),
    overlapAcknowledged: z.boolean(),
    overlapAcknowledgementReason: z.string().trim().max(240).optional(),
    ...versioned,
  })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), "phase end must be after start");

export const PhaseEntitlementSchema = z
  .object({
    id: PhaseEntitlementIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    phaseId: ProgrammePhaseIdSchema,
    subjectType: z.enum(PHASE_ENTITLEMENT_SUBJECT_TYPES),
    subjectId: UuidSchema,
    routeId: ArrivalRouteIdSchema.optional(),
    zoneIds: z.array(AccessZoneIdSchema).max(16).default([]),
    status: z.enum(PHASE_ENTITLEMENT_STATUSES),
    protectedAccess: z.boolean(),
    fastTrackRouting: z.boolean(),
    validFrom: IsoDatetimeSchema.optional(),
    validUntil: IsoDatetimeSchema.optional(),
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict()
  .refine((value) => value.subjectType !== "GUEST" || Boolean(value.subjectId), "guest entitlement requires guestId");

export const ArrivalRouteSchema = z
  .object({
    id: ArrivalRouteIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    phaseId: ProgrammePhaseIdSchema.optional(),
    name: NonEmptySchema.max(120),
    kind: z.enum(ARRIVAL_ROUTE_KINDS),
    status: z.enum(ARRIVAL_ROUTE_STATUSES),
    checkpointIds: z.array(PerimeterCheckpointIdSchema).max(24),
    guestFacingCode: z.string().trim().max(16).optional(),
    discreetMarker: z.string().trim().max(8).optional(),
    hostApprovedVipLanguage: z.boolean(),
    securityClassification: z.enum(["STAFF", "RESTRICTED"]),
    ...versioned,
  })
  .strict();

export const PerimeterCheckpointSchema = z
  .object({
    id: PerimeterCheckpointIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    phaseId: ProgrammePhaseIdSchema.optional(),
    name: NonEmptySchema.max(120),
    type: z.enum(CHECKPOINT_TYPES),
    status: z.enum(CHECKPOINT_STATUSES),
    sharedPerimeter: z.boolean(),
    verificationRequired: z.boolean(),
    sequence: z.number().int().nonnegative(),
    ...versioned,
  })
  .strict();

export const AccessZoneSchema = z
  .object({
    id: AccessZoneIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    phaseId: ProgrammePhaseIdSchema,
    name: NonEmptySchema.max(120),
    kind: z.enum(ACCESS_ZONE_KINDS),
    protected: z.boolean(),
    ...versioned,
  })
  .strict();

export const CredentialProjectionSchema = z
  .object({
    id: CredentialProjectionIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    subjectType: z.enum(PHASE_ENTITLEMENT_SUBJECT_TYPES),
    subjectId: UuidSchema,
    presentationReference: NonEmptySchema.max(24),
    payloadDigest: NonEmptySchema.max(64),
    entitlementIds: z.array(PhaseEntitlementIdSchema).max(32),
    status: z.enum(CREDENTIAL_PROJECTION_STATUSES),
    ...versioned,
  })
  .strict();

export const OperationalVehicleSchema = z
  .object({
    id: OperationalVehicleIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    plate: NonEmptySchema.max(16),
    vehicleClass: z.enum(VEHICLE_CLASSES),
    colour: z.string().trim().max(40).optional(),
    make: z.string().trim().max(40).optional(),
    assignedRouteId: ArrivalRouteIdSchema.optional(),
    assignedParkingCheckpointId: PerimeterCheckpointIdSchema.optional(),
    status: z.enum(VEHICLE_STATUSES),
    ...versioned,
  })
  .strict();

export const VehicleAssociationSchema = z
  .object({
    id: VehicleAssociationIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    vehicleId: OperationalVehicleIdSchema,
    guestId: GuestIdRefSchema,
    role: z.enum(VEHICLE_ASSOCIATION_ROLES),
    dutyStartsAt: IsoDatetimeSchema.optional(),
    dutyEndsAt: IsoDatetimeSchema.optional(),
    status: z.enum(["ACTIVE", "ENDED"]),
    reason: NonEmptySchema,
    ...versioned,
  })
  .strict();

export const OfflineAccessPackageSchema = z
  .object({
    id: OfflineAccessPackageIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    packageVersion: z.number().int().positive(),
    status: z.enum(OFFLINE_PACKAGE_STATUSES),
    generatedAt: IsoDatetimeSchema,
    validUntil: IsoDatetimeSchema,
    checksum: NonEmptySchema.max(64),
    hmacSignature: NonEmptySchema.max(128),
    keyRef: NonEmptySchema.max(40),
    supersededPackageId: OfflineAccessPackageIdSchema.optional(),
    body: z
      .object({
        phaseIds: z.array(ProgrammePhaseIdSchema).max(32),
        checkpointIds: z.array(PerimeterCheckpointIdSchema).max(64),
        credentialDigests: z.array(z.string().max(64)).max(5_000),
        routeCodes: z.array(z.string().max(16)).max(64),
        policy: z
          .object({
            staleFailsClosed: z.literal(true),
            attendanceWriter: z.literal("SLICE_8_ONLY"),
            fastTrackDoesNotSkipVerification: z.literal(true),
          })
          .strict(),
      })
      .strict(),
    ...versioned,
  })
  .strict();

export const AccessExceptionSchema = z
  .object({
    id: AccessExceptionIdSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    phaseId: ProgrammePhaseIdSchema.optional(),
    checkpointId: PerimeterCheckpointIdSchema.optional(),
    guestId: GuestIdRefSchema.optional(),
    status: z.enum(ACCESS_EXCEPTION_STATUSES),
    rationale: NonEmptySchema.max(400),
    restricted: z.boolean(),
    ...versioned,
  })
  .strict();

export const S04B_CANONICAL_COLLECTIONS = [
  "programmeDays",
  "programmePhases",
  "phaseEntitlements",
  "arrivalRoutes",
  "perimeterCheckpoints",
  "accessZones",
  "credentialProjections",
  "operationalVehicles",
  "vehicleAssociations",
  "offlineAccessPackages",
  "accessExceptions",
] as const;

export type S04BCanonicalCollection = (typeof S04B_CANONICAL_COLLECTIONS)[number];
export const S04BCanonicalCollectionSchema = z.enum(S04B_CANONICAL_COLLECTIONS);

export const S04BCreatedRecordRefSchema = z
  .object({
    collection: S04BCanonicalCollectionSchema,
    id: UuidSchema,
    version: z.number().int().positive(),
  })
  .strict();

export const S04BMigrationReceiptSchema = z
  .object({
    id: UuidSchema,
    migrationId: NonEmptySchema.max(80),
    checksum: NonEmptySchema.max(64),
    status: z.enum(["APPLIED", "ROLLED_BACK"]),
    createdRecords: z.array(S04BCreatedRecordRefSchema).max(10_000),
    notes: z
      .array(
        z
          .object({
            code: NonEmptySchema.max(80),
            subjectType: z.enum(["EVENT", "PHASE", "MIGRATION"]),
            subjectId: UuidSchema.optional(),
          })
          .strict(),
      )
      .max(10_000),
    ...versioned,
  })
  .strict();

export const CreateProgrammePhaseInputSchema = z
  .object({
    ...mutationBase,
    name: NonEmptySchema.max(160),
    type: z.enum(PROGRAMME_PHASE_TYPES),
    startsAt: IsoDatetimeSchema,
    endsAt: IsoDatetimeSchema,
    timezone: NonEmptySchema.max(64).optional(),
    locationLabel: NonEmptySchema.max(200),
    locationGuestSafe: z.string().trim().max(240).optional(),
    overlapAcknowledged: z.boolean().optional(),
    overlapAcknowledgementReason: z.string().trim().max(240).optional(),
    expectedProgrammeVersion: z.number().int().positive().optional(),
  })
  .strict();

export const AssignPhaseEntitlementInputSchema = z
  .object({
    ...mutationBase,
    phaseId: ProgrammePhaseIdSchema,
    guestId: GuestIdRefSchema,
    routeId: ArrivalRouteIdSchema.optional(),
    protectedAccess: z.boolean().optional(),
    fastTrackRouting: z.boolean().optional(),
    expectedPhaseVersion: z.number().int().positive(),
  })
  .strict();

export const CreateCheckpointInputSchema = z
  .object({
    ...mutationBase,
    name: NonEmptySchema.max(120),
    type: z.enum(CHECKPOINT_TYPES),
    phaseId: ProgrammePhaseIdSchema.optional(),
    sharedPerimeter: z.boolean().optional(),
    verificationRequired: z.boolean().optional(),
  })
  .strict();

export const CreateArrivalRouteInputSchema = z
  .object({
    ...mutationBase,
    name: NonEmptySchema.max(120),
    kind: z.enum(ARRIVAL_ROUTE_KINDS),
    phaseId: ProgrammePhaseIdSchema.optional(),
    checkpointIds: z.array(PerimeterCheckpointIdSchema).max(24),
    guestFacingCode: z.string().trim().max(16).optional(),
    discreetMarker: z.string().trim().max(8).optional(),
    hostApprovedVipLanguage: z.boolean().optional(),
  })
  .strict();

export const CreateVehicleInputSchema = z
  .object({
    ...mutationBase,
    plate: NonEmptySchema.max(16),
    vehicleClass: z.enum(VEHICLE_CLASSES),
    colour: z.string().trim().max(40).optional(),
    assignedRouteId: ArrivalRouteIdSchema.optional(),
    assignedParkingCheckpointId: PerimeterCheckpointIdSchema.optional(),
    driverGuestId: GuestIdRefSchema.optional(),
  })
  .strict();

export const PublishOfflinePackageInputSchema = z
  .object({
    ...mutationBase,
    validUntil: IsoDatetimeSchema,
    expectedHeadVersion: z.number().int().positive().optional(),
  })
  .strict();

export const ConsumeOfflinePackageInputSchema = z
  .object({
    ...mutationBase,
    packageId: OfflineAccessPackageIdSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const ResolveCheckpointInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    checkpointId: PerimeterCheckpointIdSchema,
    presentationReference: NonEmptySchema.max(24),
  })
  .strict();

export const RaiseAccessExceptionInputSchema = z
  .object({
    ...mutationBase,
    phaseId: ProgrammePhaseIdSchema.optional(),
    checkpointId: PerimeterCheckpointIdSchema.optional(),
    guestId: GuestIdRefSchema.optional(),
    rationale: NonEmptySchema.max(400),
    restricted: z.boolean().optional(),
  })
  .strict();

export const CheckpointResolutionOutcomeSchema = z.enum(CHECKPOINT_RESOLUTION_OUTCOMES);

export type ProgrammeDay = z.infer<typeof ProgrammeDaySchema>;
export type ProgrammePhase = z.infer<typeof ProgrammePhaseSchema>;
export type PhaseEntitlement = z.infer<typeof PhaseEntitlementSchema>;
export type ArrivalRoute = z.infer<typeof ArrivalRouteSchema>;
export type PerimeterCheckpoint = z.infer<typeof PerimeterCheckpointSchema>;
export type AccessZone = z.infer<typeof AccessZoneSchema>;
export type CredentialProjection = z.infer<typeof CredentialProjectionSchema>;
export type OperationalVehicle = z.infer<typeof OperationalVehicleSchema>;
export type VehicleAssociation = z.infer<typeof VehicleAssociationSchema>;
export type OfflineAccessPackage = z.infer<typeof OfflineAccessPackageSchema>;
export type AccessException = z.infer<typeof AccessExceptionSchema>;
export type S04BMigrationReceipt = z.infer<typeof S04BMigrationReceiptSchema>;
export type CreateProgrammePhaseInput = z.infer<typeof CreateProgrammePhaseInputSchema>;
export type AssignPhaseEntitlementInput = z.infer<typeof AssignPhaseEntitlementInputSchema>;
export type CreateCheckpointInput = z.infer<typeof CreateCheckpointInputSchema>;
export type CreateArrivalRouteInput = z.infer<typeof CreateArrivalRouteInputSchema>;
export type CreateVehicleInput = z.infer<typeof CreateVehicleInputSchema>;
export type PublishOfflinePackageInput = z.infer<typeof PublishOfflinePackageInputSchema>;
export type ConsumeOfflinePackageInput = z.infer<typeof ConsumeOfflinePackageInputSchema>;
export type ResolveCheckpointInput = z.infer<typeof ResolveCheckpointInputSchema>;
export type RaiseAccessExceptionInput = z.infer<typeof RaiseAccessExceptionInputSchema>;
export type CheckpointResolutionOutcome = z.infer<typeof CheckpointResolutionOutcomeSchema>;
