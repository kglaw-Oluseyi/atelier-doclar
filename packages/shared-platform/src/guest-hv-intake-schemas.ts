import { z } from "zod";
import { SCHEMA_VERSION } from "./constants.js";
import { CANONICAL_CSV_COLUMNS } from "./guest-intake.js";
import { ClientIdSchema, EventIdSchema, IsoDatetimeSchema, NonEmptySchema, OrganisationIdSchema, PersonIdSchema, UuidSchema } from "./schemas.js";

export const HV_INTAKE_MAX_BYTES = 8_000_000;
export const HV_INTAKE_MAX_ROWS = 5_000;
export const HV_INTAKE_CHUNK_SIZE = 250;
export const HV_INTAKE_LEASE_MS = 60_000;
export const HV_INTAKE_MAPPING_VERSION = "hv-intake-mapping-v1" as const;

export const HV_INTAKE_JOB_STATUSES = [
  "UPLOADED",
  "PARSING",
  "MAPPING_REQUIRED",
  "VALIDATING",
  "NEEDS_REVIEW",
  "READY_FOR_APPROVAL",
  "SUBMITTED",
  "APPROVED",
  "PROMOTING",
  "COMPLETED",
  "COMPLETED_WITH_EXCEPTIONS",
  "FAILED",
  "PAUSED",
  "CANCELLED",
  "SUPERSEDED",
  "PARTIALLY_COMMITTED",
] as const;

export const HV_INTAKE_ROW_STATUSES = [
  "RAW",
  "PARSED",
  "INVALID",
  "WARNING",
  "DUPLICATE_REVIEW",
  "CONFLICT_REVIEW",
  "READY",
  "PROMOTED",
  "UPDATED",
  "UNCHANGED",
  "SKIPPED",
  "FAILED",
  "EXCLUDED",
] as const;

export const HV_INTAKE_TARGET_FIELDS = [...CANONICAL_CSV_COLUMNS, "IGNORE", "UNMAPPED"] as const;

export const HV_PROPOSED_ACTIONS = ["CREATE", "UPDATE", "UNCHANGED", "SKIP", "EXCLUDE"] as const;

const versioned = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  version: z.number().int().positive(),
  createdAt: IsoDatetimeSchema,
  updatedAt: IsoDatetimeSchema,
};

export const GuestIntakeProgressSchema = z
  .object({
    phase: NonEmptySchema.max(64),
    rowsTotal: z.number().int().nonnegative(),
    rowsParsed: z.number().int().nonnegative(),
    rowsValid: z.number().int().nonnegative(),
    rowsWarning: z.number().int().nonnegative(),
    rowsInvalid: z.number().int().nonnegative(),
    rowsDuplicate: z.number().int().nonnegative(),
    rowsConflict: z.number().int().nonnegative(),
    rowsReady: z.number().int().nonnegative(),
    rowsPromoted: z.number().int().nonnegative(),
    rowsUpdated: z.number().int().nonnegative(),
    rowsUnchanged: z.number().int().nonnegative(),
    rowsSkipped: z.number().int().nonnegative(),
    rowsFailed: z.number().int().nonnegative(),
    chunksCommitted: z.number().int().nonnegative(),
    lastProgressAt: IsoDatetimeSchema,
    startedAt: IsoDatetimeSchema.optional(),
    elapsedMs: z.number().int().nonnegative().optional(),
  })
  .strict();

export const GuestIntakeSourceSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    jobId: UuidSchema,
    filename: NonEmptySchema.max(180),
    contentType: z.enum(["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
    byteSize: z.number().int().nonnegative().max(HV_INTAKE_MAX_BYTES),
    sha256: NonEmptySchema.length(64),
    storageKind: z.literal("INLINE_BASE64"),
    contentBase64: z.string().max(Math.ceil(HV_INTAKE_MAX_BYTES * 1.4)).optional(),
    scanStatus: z.enum(["PENDING", "CLEAN", "REJECTED"]),
    scanNotes: z.string().max(240).optional(),
    retainedUntil: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const GuestMappingColumnSchema = z
  .object({
    sourceHeader: NonEmptySchema.max(120),
    targetField: z.enum(HV_INTAKE_TARGET_FIELDS),
    required: z.boolean(),
  })
  .strict();

export const GuestMappingEditionSchema = z
  .object({
    id: UuidSchema,
    jobId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    mappingVersion: z.literal(HV_INTAKE_MAPPING_VERSION),
    edition: z.number().int().positive(),
    columns: z.array(GuestMappingColumnSchema).max(64),
    confirmed: z.boolean(),
    confirmedByPersonId: PersonIdSchema.optional(),
    confirmedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const GuestIntakeIssueSchema = z
  .object({
    field: NonEmptySchema.max(120),
    code: NonEmptySchema.max(80),
    severity: z.enum(["ERROR", "WARNING"]),
    message: NonEmptySchema.max(240),
  })
  .strict();

export const GuestFieldConflictSchema = z
  .object({
    field: NonEmptySchema.max(80),
    existingQuality: NonEmptySchema.max(40),
    proposedValue: z.string().max(240).optional(),
    requiresApproval: z.boolean(),
  })
  .strict();

export const GuestIntakeCandidateSchema = z
  .object({
    id: UuidSchema,
    jobId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    rowNumber: z.number().int().positive(),
    raw: z.record(z.string().max(2000)),
    normalised: z.record(z.string().max(500)),
    proposedAction: z.enum(HV_PROPOSED_ACTIONS),
    status: z.enum(HV_INTAKE_ROW_STATUSES),
    issues: z.array(GuestIntakeIssueSchema).max(40),
    matchGuestId: UuidSchema.optional(),
    matchKind: z.string().max(40).optional(),
    decision: z.enum(["CREATE", "UPDATE", "KEEP_SEPARATE", "EXCLUDE", "DEFER", "SKIP"]).optional(),
    decidedByPersonId: PersonIdSchema.optional(),
    fieldConflicts: z.array(GuestFieldConflictSchema).max(20),
    promotedGuestId: UuidSchema.optional(),
    promoteIdempotencyKey: NonEmptySchema.max(180),
    schemaVersion: z.literal(SCHEMA_VERSION),
    version: z.number().int().positive(),
    createdAt: IsoDatetimeSchema,
    updatedAt: IsoDatetimeSchema,
  })
  .strict();

export const GuestIntakeJobSchema = z
  .object({
    id: UuidSchema,
    organisationId: OrganisationIdSchema,
    clientId: ClientIdSchema,
    eventId: EventIdSchema,
    name: NonEmptySchema.max(120),
    edition: z.number().int().positive(),
    status: z.enum(HV_INTAKE_JOB_STATUSES),
    sourceId: UuidSchema.optional(),
    mappingEditionId: UuidSchema.optional(),
    reason: NonEmptySchema.max(240),
    clientSourceRef: z.string().max(120).optional(),
    expectedScale: z.number().int().positive().max(HV_INTAKE_MAX_ROWS).optional(),
    createdByPersonId: PersonIdSchema,
    submittedByPersonId: PersonIdSchema.optional(),
    approvedByPersonId: PersonIdSchema.optional(),
    approvedAt: IsoDatetimeSchema.optional(),
    approvalFingerprint: z.string().max(128).optional(),
    sourceHash: z.string().length(64).optional(),
    mappingHash: z.string().max(128).optional(),
    validationHash: z.string().max(128).optional(),
    decisionHash: z.string().max(128).optional(),
    proposedMutationHash: z.string().max(128).optional(),
    leaseOwner: z.string().max(80).optional(),
    leaseExpiresAt: IsoDatetimeSchema.optional(),
    checkpointChunkIndex: z.number().int().min(-1),
    cancelRequested: z.boolean(),
    progress: GuestIntakeProgressSchema,
    guestTotalBefore: z.number().int().nonnegative().optional(),
    guestTotalAfter: z.number().int().nonnegative().optional(),
    failureClass: z.string().max(80).optional(),
    failureMessage: z.string().max(240).optional(),
    ...versioned,
  })
  .strict();

export const GuestPromotionChunkSchema = z
  .object({
    id: UuidSchema,
    jobId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    sequence: z.number().int().nonnegative(),
    rowFrom: z.number().int().positive(),
    rowTo: z.number().int().positive(),
    status: z.enum(["PENDING", "COMMITTED", "FAILED", "ROLLED_BACK"]),
    createdCount: z.number().int().nonnegative(),
    updatedCount: z.number().int().nonnegative(),
    unchangedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    idempotencyKey: NonEmptySchema.max(180),
    committedAt: IsoDatetimeSchema.optional(),
    ...versioned,
  })
  .strict();

export const GuestIntakeReceiptSchema = z
  .object({
    id: UuidSchema,
    jobId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    edition: z.number().int().positive(),
    sourceHash: NonEmptySchema.length(64),
    totals: z
      .object({
        sourceRows: z.number().int().nonnegative(),
        excludedRows: z.number().int().nonnegative(),
        rejectedRows: z.number().int().nonnegative(),
        createdGuests: z.number().int().nonnegative(),
        updatedGuests: z.number().int().nonnegative(),
        unchangedGuests: z.number().int().nonnegative(),
        skippedRows: z.number().int().nonnegative(),
        failedRows: z.number().int().nonnegative(),
        chunksCommitted: z.number().int().nonnegative(),
        guestTotalBefore: z.number().int().nonnegative(),
        guestTotalAfter: z.number().int().nonnegative(),
      })
      .strict(),
    timings: z
      .object({
        machineMs: z.number().int().nonnegative(),
        promoteMs: z.number().int().nonnegative().optional(),
      })
      .strict(),
    createdAt: IsoDatetimeSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const GuestIntakeOutboxEventSchema = z
  .object({
    id: UuidSchema,
    jobId: UuidSchema,
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    type: NonEmptySchema.max(80),
    payloadHash: NonEmptySchema.max(128),
    status: z.enum(["PENDING", "SENT"]),
    createdAt: IsoDatetimeSchema,
    schemaVersion: z.literal(SCHEMA_VERSION),
  })
  .strict();

export const CreateHvIntakeJobInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    name: NonEmptySchema.max(120),
    reason: NonEmptySchema.max(240),
    clientSourceRef: z.string().max(120).optional(),
    expectedScale: z.number().int().positive().max(HV_INTAKE_MAX_ROWS).optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const UploadHvIntakeSourceInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    jobId: UuidSchema,
    filename: NonEmptySchema.max(180),
    contentType: z.enum(["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
    contentBase64: z.string().min(1),
    expectedVersion: z.number().int().positive(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const ConfirmHvMappingInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    jobId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    columns: z.array(GuestMappingColumnSchema).min(1).max(64),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const ApplyHvRowDecisionsInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    jobId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    decisions: z
      .array(
        z
          .object({
            candidateId: UuidSchema,
            decision: z.enum(["CREATE", "UPDATE", "KEEP_SEPARATE", "EXCLUDE", "DEFER", "SKIP"]),
          })
          .strict(),
      )
      .min(1)
      .max(500),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();

export const HvJobActionInputSchema = z
  .object({
    organisationId: OrganisationIdSchema,
    eventId: EventIdSchema,
    jobId: UuidSchema,
    expectedVersion: z.number().int().positive(),
    reason: z.string().max(240).optional(),
    /** CEO-only: allow the submitter to approve when no independent checker is available. */
    governanceOverrideReason: z.string().min(8).max(400).optional(),
    idempotencyKey: z.string().uuid().optional(),
    maxChunks: z.number().int().positive().max(40).optional(),
  })
  .strict();

export type GuestIntakeSource = z.infer<typeof GuestIntakeSourceSchema>;
export type GuestMappingEdition = z.infer<typeof GuestMappingEditionSchema>;
export type GuestIntakeCandidate = z.infer<typeof GuestIntakeCandidateSchema>;
export type GuestIntakeJob = z.infer<typeof GuestIntakeJobSchema>;
export type GuestPromotionChunk = z.infer<typeof GuestPromotionChunkSchema>;
export type GuestIntakeReceipt = z.infer<typeof GuestIntakeReceiptSchema>;
export type GuestIntakeOutboxEvent = z.infer<typeof GuestIntakeOutboxEventSchema>;
export type GuestIntakeProgress = z.infer<typeof GuestIntakeProgressSchema>;
export type CreateHvIntakeJobInput = z.infer<typeof CreateHvIntakeJobInputSchema>;
export type UploadHvIntakeSourceInput = z.infer<typeof UploadHvIntakeSourceInputSchema>;
export type ConfirmHvMappingInput = z.infer<typeof ConfirmHvMappingInputSchema>;
export type ApplyHvRowDecisionsInput = z.infer<typeof ApplyHvRowDecisionsInputSchema>;
export type HvJobActionInput = z.infer<typeof HvJobActionInputSchema>;
