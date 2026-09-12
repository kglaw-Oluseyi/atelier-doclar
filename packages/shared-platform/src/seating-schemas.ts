import { z } from "zod";

const Uuid = z.string().uuid();
const Iso = z.string().min(10);
const Hash = z.string().min(8).max(128);
const Token = z.string().min(4).max(128);

export const SEATING_PLAN_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "SUPERSEDED", "WITHDRAWN"] as const;
export const SEATING_RUN_STATUSES = ["QUEUED", "RUNNING", "FEASIBLE", "INFEASIBLE", "TIMED_OUT", "ERROR", "CANCELLED"] as const;
export const SEATING_PUBLICATION_STATUSES = ["CURRENT", "SUPERSEDED", "WITHDRAWN"] as const;
export const SEATING_REVIEW_DOMAINS = ["PROTOCOL", "ACCESSIBILITY", "SECURITY"] as const;

export const SeatingInputEditionSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    version: z.number().int().min(0),
    status: z.enum(["FROZEN", "STALE", "SUPERSEDED"]),
    guestCohortHash: Hash,
    rsvpTruthHash: Hash,
    layoutPublicationId: Uuid,
    layoutContentHash: Hash,
    eventBriefEditionId: Uuid.optional(),
    eventBriefContentHash: Hash.optional(),
    protectionSnapshotHash: Hash.optional(),
    contentHash: Hash,
    createdBy: Uuid,
    current: z.boolean(),
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingGuestTokenRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    inputEditionId: Uuid,
    eventGuestId: Uuid,
    solverToken: Token,
    eligible: z.boolean(),
    eligibilityCode: z.string().min(1).max(64),
    statusCode: z.string().min(1).max(64),
    partyToken: Token.optional(),
    capabilityCodes: z.array(z.string()),
    protocolCodes: z.array(z.string()),
    version: z.number().int().min(0),
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingPositionRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    inputEditionId: Uuid,
    layoutObjectId: z.string().min(1),
    ordinal: z.number().int().min(1),
    layoutSeatAnchorId: z.string().optional(),
    positionToken: Token,
    tableToken: Token,
    zoneCodes: z.array(z.string()),
    capabilityCodes: z.array(z.string()),
    version: z.number().int().min(0),
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingConstraintRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    editionId: Uuid.optional(),
    kind: z.enum(["HARD", "WEIGHTED", "INFORMATION"]),
    predicateType: z.string().min(1),
    payload: z.record(z.unknown()),
    weight: z.number().int().min(1).optional(),
    authority: z.string().min(1),
    evidenceRefs: z.array(z.string()),
    disclosureClass: z.enum(["OPERATIONAL", "RESTRICTED", "REDACTED"]),
    reviewDomain: z.enum(SEATING_REVIEW_DOMAINS).optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "SUPERSEDED"]),
    version: z.number().int().min(0),
    contentHash: Hash,
    createdBy: Uuid,
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingReservationBlockSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    eligibleSetCode: z.string().min(1).max(64),
    eligibleGuestIds: z.array(Uuid),
    tableRefs: z.array(z.string()),
    zoneRefs: z.array(z.string()),
    minCount: z.number().int().min(0).optional(),
    maxCount: z.number().int().min(0).optional(),
    exactCount: z.number().int().min(0).optional(),
    priority: z.number().int().min(0),
    releaseState: z.enum(["ACTIVE", "RELEASED"]),
    version: z.number().int().min(0),
    contentHash: Hash,
    createdBy: Uuid,
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingSolverConfigRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    algorithm: z.literal("SeatingSolverV1"),
    version: z.string().min(1),
    objectiveOrder: z.array(z.string()).min(7),
    timeLimitMs: z.number().int(),
    memoryLimitMb: z.number().int(),
    alternativeCount: z.number().int(),
    materialityThreshold: z.number().int(),
    contentHash: Hash,
    status: z.enum(["DRAFT", "ACCEPTED", "SUPERSEDED"]),
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingRunRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    inputEditionId: Uuid,
    inputHash: Hash,
    configId: Uuid,
    configHash: Hash,
    solverVersion: z.string(),
    seed: z.string(),
    status: z.enum(SEATING_RUN_STATUSES),
    leaseOwner: z.string().optional(),
    leaseUntil: Iso.optional(),
    attempt: z.number().int().min(0),
    metrics: z.record(z.unknown()).optional(),
    resultHash: Hash.optional(),
    failureCode: z.string().optional(),
    version: z.number().int().min(0),
    createdBy: Uuid,
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingRunAssignmentSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    runId: Uuid,
    guestToken: Token,
    positionToken: Token.optional(),
    state: z.enum(["SEATED", "UNSEATED"]),
    reasonCodes: z.array(z.string()),
    version: z.number().int().min(0),
    createdAt: Iso,
  })
  .strict();

export const SeatingFindingRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    runId: Uuid.optional(),
    planId: Uuid.optional(),
    severity: z.enum(["BLOCKER", "WARNING", "INFO"]),
    ruleRef: z.string().optional(),
    evidenceRefs: z.array(z.string()),
    affectedTokens: z.array(z.string()),
    code: z.string(),
    state: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
    createdAt: Iso,
  })
  .strict();

export const SeatingPlanEditionSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    sourceRunId: Uuid.optional(),
    version: z.number().int().min(0),
    status: z.enum(SEATING_PLAN_STATUSES),
    contentHash: Hash,
    currentWorking: z.boolean(),
    materialAuthorPersonId: Uuid,
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingPlanAssignmentSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    editionId: Uuid,
    eventGuestId: Uuid,
    tableId: z.string().optional(),
    positionId: z.string().optional(),
    state: z.enum(["SEATED", "UNSEATED"]),
    lockState: z.enum(["UNLOCKED", "LOCKED"]),
    provenance: z.enum(["SOLVER", "MANUAL", "LOCK", "RESERVATION"]),
    version: z.number().int().min(0),
    createdAt: Iso,
  })
  .strict();

export const SeatingManualDecisionSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    editionId: Uuid,
    command: z.string(),
    beforeHash: Hash,
    afterHash: Hash,
    reasonCode: z.string(),
    reasonText: z.string().optional(),
    actorPersonId: Uuid,
    validationResult: z.enum(["ACCEPTED", "REJECTED"]),
    createdAt: Iso,
  })
  .strict();

export const SeatingReviewRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    editionId: Uuid,
    editionHash: Hash,
    domain: z.enum(SEATING_REVIEW_DOMAINS),
    decision: z.enum(["APPROVED", "REJECTED"]),
    reviewerPersonId: Uuid,
    reason: z.string().min(1),
    createdAt: Iso,
  })
  .strict();

export const SeatingApprovalRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    editionId: Uuid,
    editionHash: Hash,
    approverPersonId: Uuid,
    decision: z.enum(["APPROVED", "REJECTED"]),
    createdAt: Iso,
  })
  .strict();

export const SeatingPublicationRecordSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    publicationNumber: z.number().int().min(1),
    editionId: Uuid,
    editionHash: Hash,
    inputHash: Hash,
    layoutHash: Hash,
    configHash: Hash,
    publisherPersonId: Uuid,
    status: z.enum(SEATING_PUBLICATION_STATUSES),
    publishedAt: Iso,
    supersedesId: Uuid.optional(),
    version: z.number().int().min(0),
  })
  .strict();

export const SeatingExportJobSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    eventId: Uuid,
    publicationId: Uuid.optional(),
    editionId: Uuid.optional(),
    format: z.enum(["PDF", "PNG", "JSON"]),
    projectionClass: z.enum(["PLANNER", "DIRECTOR", "CEO", "AUDITOR", "DOWNSTREAM"]),
    status: z.enum(["PENDING", "READY", "FAILED"]),
    generatedAt: Iso.optional(),
    objectKey: z.string().optional(),
    version: z.number().int().min(0),
    createdAt: Iso,
  })
  .strict();

export const SeatingEvaluationRunSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    corpusEdition: z.string(),
    corpusHash: Hash,
    contractVersion: z.string(),
    solverVersion: z.string(),
    configHash: Hash,
    projectionVersion: z.string(),
    status: z.enum(["QUEUED", "RUNNING", "PASSED", "FAILED", "ERROR"]),
    leaseOwner: z.string().optional(),
    leaseUntil: Iso.optional(),
    caseCount: z.number().int(),
    passedCount: z.number().int(),
    failedCount: z.number().int(),
    createdBy: Uuid,
    createdAt: Iso,
    updatedAt: Iso,
  })
  .strict();

export const SeatingEvaluationCaseResultSchema = z
  .object({
    id: Uuid,
    organisationId: Uuid,
    runId: Uuid,
    caseId: z.string(),
    observations: z.array(z.record(z.unknown())),
    assertions: z.array(z.record(z.unknown())),
    status: z.enum(["PASSED", "FAILED", "ERROR"]),
    createdAt: Iso,
  })
  .strict()
  .refine((value) => !JSON.stringify(value.assertions).includes('"passed":'), "cases cannot supply their own pass booleans");

export const SeatingIdempotencyReceiptSchema = z
  .object({
    organisationId: Uuid,
    eventId: Uuid,
    action: z.string(),
    idempotencyKey: z.string().min(12),
    requestHash: Hash,
    resultIdentity: z.string(),
    application: z.enum(["APPLIED", "REPLAYED", "NOT_APPLIED"]),
    createdAt: Iso,
  })
  .strict();

export const SeatingMigrationReceiptSchema = z
  .object({
    migrationId: z.string(),
    checksum: Hash,
    appliedAt: Iso,
    counts: z.record(z.number()),
  })
  .strict();

export type SeatingInputEdition = z.infer<typeof SeatingInputEditionSchema>;
export type SeatingGuestTokenRecord = z.infer<typeof SeatingGuestTokenRecordSchema>;
export type SeatingPositionRecord = z.infer<typeof SeatingPositionRecordSchema>;
export type SeatingConstraintRecord = z.infer<typeof SeatingConstraintRecordSchema>;
export type SeatingReservationBlock = z.infer<typeof SeatingReservationBlockSchema>;
export type SeatingSolverConfigRecord = z.infer<typeof SeatingSolverConfigRecordSchema>;
export type SeatingRunRecord = z.infer<typeof SeatingRunRecordSchema>;
export type SeatingRunAssignment = z.infer<typeof SeatingRunAssignmentSchema>;
export type SeatingFindingRecord = z.infer<typeof SeatingFindingRecordSchema>;
export type SeatingPlanEdition = z.infer<typeof SeatingPlanEditionSchema>;
export type SeatingPlanAssignment = z.infer<typeof SeatingPlanAssignmentSchema>;
export type SeatingManualDecision = z.infer<typeof SeatingManualDecisionSchema>;
export type SeatingReviewRecord = z.infer<typeof SeatingReviewRecordSchema>;
export type SeatingApprovalRecord = z.infer<typeof SeatingApprovalRecordSchema>;
export type SeatingPublicationRecord = z.infer<typeof SeatingPublicationRecordSchema>;
export type SeatingExportJob = z.infer<typeof SeatingExportJobSchema>;
export type SeatingEvaluationRun = z.infer<typeof SeatingEvaluationRunSchema>;
export type SeatingEvaluationCaseResult = z.infer<typeof SeatingEvaluationCaseResultSchema>;
export type SeatingIdempotencyReceipt = z.infer<typeof SeatingIdempotencyReceiptSchema>;
export type SeatingMigrationReceipt = z.infer<typeof SeatingMigrationReceiptSchema>;

export type SeatingCollection =
  | "inputEditions"
  | "guestTokens"
  | "positions"
  | "constraints"
  | "reservationBlocks"
  | "solverConfigs"
  | "runs"
  | "runAssignments"
  | "findings"
  | "planEditions"
  | "planAssignments"
  | "manualDecisions"
  | "reviews"
  | "approvals"
  | "publications"
  | "exportJobs"
  | "evaluationRuns"
  | "evaluationCaseResults"
  | "idempotencyReceipts"
  | "migrationReceipts";

export type SeatingState = {
  inputEditions: SeatingInputEdition[];
  guestTokens: SeatingGuestTokenRecord[];
  positions: SeatingPositionRecord[];
  constraints: SeatingConstraintRecord[];
  reservationBlocks: SeatingReservationBlock[];
  solverConfigs: SeatingSolverConfigRecord[];
  runs: SeatingRunRecord[];
  runAssignments: SeatingRunAssignment[];
  findings: SeatingFindingRecord[];
  planEditions: SeatingPlanEdition[];
  planAssignments: SeatingPlanAssignment[];
  manualDecisions: SeatingManualDecision[];
  reviews: SeatingReviewRecord[];
  approvals: SeatingApprovalRecord[];
  publications: SeatingPublicationRecord[];
  exportJobs: SeatingExportJob[];
  evaluationRuns: SeatingEvaluationRun[];
  evaluationCaseResults: SeatingEvaluationCaseResult[];
  idempotencyReceipts: SeatingIdempotencyReceipt[];
  migrationReceipts: SeatingMigrationReceipt[];
};

export const SEATING_COLLECTIONS: SeatingCollection[] = [
  "inputEditions",
  "guestTokens",
  "positions",
  "constraints",
  "reservationBlocks",
  "solverConfigs",
  "runs",
  "runAssignments",
  "findings",
  "planEditions",
  "planAssignments",
  "manualDecisions",
  "reviews",
  "approvals",
  "publications",
  "exportJobs",
  "evaluationRuns",
  "evaluationCaseResults",
  "idempotencyReceipts",
  "migrationReceipts",
];

export function emptySeatingState(): SeatingState {
  return {
    inputEditions: [],
    guestTokens: [],
    positions: [],
    constraints: [],
    reservationBlocks: [],
    solverConfigs: [],
    runs: [],
    runAssignments: [],
    findings: [],
    planEditions: [],
    planAssignments: [],
    manualDecisions: [],
    reviews: [],
    approvals: [],
    publications: [],
    exportJobs: [],
    evaluationRuns: [],
    evaluationCaseResults: [],
    idempotencyReceipts: [],
    migrationReceipts: [],
  };
}

export const SEATING_TABLE_FOR_COLLECTION: Record<SeatingCollection, string> = {
  inputEditions: "seating_input_editions",
  guestTokens: "seating_guest_tokens",
  positions: "seating_positions",
  constraints: "seating_constraints",
  reservationBlocks: "seating_reservation_blocks",
  solverConfigs: "seating_solver_configs",
  runs: "seating_runs",
  runAssignments: "seating_run_assignments",
  findings: "seating_findings",
  planEditions: "seating_plan_editions",
  planAssignments: "seating_plan_assignments",
  manualDecisions: "seating_manual_decisions",
  reviews: "seating_reviews",
  approvals: "seating_approvals",
  publications: "seating_publications",
  exportJobs: "seating_export_jobs",
  evaluationRuns: "seating_evaluation_runs",
  evaluationCaseResults: "seating_evaluation_case_results",
  idempotencyReceipts: "seating_idempotency_receipts",
  migrationReceipts: "seating_migration_receipts",
};
