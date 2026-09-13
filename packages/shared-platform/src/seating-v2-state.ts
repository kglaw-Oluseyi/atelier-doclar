import { SEATING_V2_SQL_TABLES, type SeatingV2SqlTable } from "./seating-v2-postgres-schema.js";
import { SEATING_V2_SCHEMA_VERSION } from "./seating-v2-schemas.js";

export const SEATING_V2_PURGE_CONFIRMATION = "CONFIRM_SEATING_V2_SYNTHETIC_PURGE" as const;

export type SeatingV2Rule = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  createdAt: string;
};

export type SeatingV2RuleEdition = {
  id: string;
  ruleId: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  editionNo: number;
  contentHash: string;
  kind: string;
  hardness: string;
  weight: number | null;
  scope: string;
  specialistDomain: string;
  sourceType: string;
  sourceRecordId?: string | null;
  sourceEditionId?: string | null;
  sourceContentHash?: string | null;
  lifecycle: "DRAFT" | "ACTIVE" | "WITHDRAWN" | "SUPERSEDED";
  supersedesEditionId?: string | null;
  createdByPersonId: string;
  createdAt: string;
  activatedByPersonId?: string | null;
  activatedAt?: string | null;
  withdrawnByPersonId?: string | null;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
};

export type SeatingV2RuleSubject = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  ruleEditionId: string;
  subjectType: "EVENT_GUEST" | "GOVERNED_GROUP";
  subjectId: string;
  createdAt: string;
};

export type SeatingV2RuleTarget = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  ruleEditionId: string;
  targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY";
  targetIdOrCode: string;
  createdAt: string;
};

export type SeatingV2RuleAnnotation = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  ruleEditionId: string;
  label: string;
  note: string;
  actorPersonId: string;
  createdAt: string;
};

export type SeatingV2Reservation = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  createdAt: string;
};

export type SeatingV2ReservationEdition = {
  id: string;
  reservationId: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  editionNo: number;
  contentHash: string;
  minCount?: number | null;
  maxCount?: number | null;
  exactCount?: number | null;
  lifecycle: "DRAFT" | "ACTIVE" | "RELEASED" | "WITHDRAWN" | "SUPERSEDED";
  releaseDecision?: string | null;
  sourceType: string;
  sourceRecordId?: string | null;
  sourceEditionId?: string | null;
  sourceContentHash?: string | null;
  supersedesEditionId?: string | null;
  createdByPersonId: string;
  createdAt: string;
  activatedByPersonId?: string | null;
  activatedAt?: string | null;
  releasedByPersonId?: string | null;
  releasedAt?: string | null;
  withdrawnByPersonId?: string | null;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
};

export type SeatingV2ReservationMember = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  reservationEditionId: string;
  eventGuestId: string;
  createdAt: string;
};

export type SeatingV2ReservationTarget = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  reservationEditionId: string;
  targetType: "TABLE" | "ZONE" | "POSITION_CAPABILITY";
  targetIdOrCode: string;
  createdAt: string;
};

export type SeatingV2ReservationAnnotation = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  reservationEditionId: string;
  label: string;
  note: string;
  actorPersonId: string;
  createdAt: string;
};

export type SeatingV2InputPackage = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  semanticHash: string;
  compiledRequestHash: string;
  contentHash: string;
  cohortHash: string;
  rsvpSnapshotHash: string;
  layoutPublicationId: string;
  layoutContentHash: string;
  eventBriefEditionId?: string | null;
  eventBriefContentHash?: string | null;
  protectionSnapshotHash?: string | null;
  lockSetHash: string;
  solverVersion: string;
  solverConfigHash: string;
  deterministicSeed: string;
  frozenByPersonId: string;
  frozenAt: string;
  createdAt: string;
};

export type SeatingV2PackageGuest = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  eventGuestId: string;
  solverToken: string;
  eligibilityCode: string;
  rsvpCode: string;
  createdAt: string;
};

export type SeatingV2PackagePosition = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  layoutTableId: string;
  ordinal: number;
  layoutSeatAnchorId?: string | null;
  positionToken: string;
  zoneCodes: string[];
  capabilityCodes: string[];
  createdAt: string;
};

export type SeatingV2PackageRule = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  ruleEditionId: string;
  ruleContentHash: string;
  compiledPredicateHash: string;
  createdAt: string;
};

export type SeatingV2PackageReservation = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  reservationEditionId: string;
  reservationContentHash: string;
  createdAt: string;
};

export type SeatingV2CompiledRequestRecord = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  contractVersion: string;
  compiledRequestJson: unknown;
  compiledRequestHash: string;
  createdAt: string;
};

export type SeatingV2Run = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  packageHash: string;
  semanticHash?: string;
  compiledRequestHash?: string;
  compilerVersion?: string;
  solverVersion: string;
  solverConfigHash: string;
  validatorVersion?: string;
  deterministicSeed: string;
  status: "QUEUED" | "RUNNING" | "FEASIBLE" | "INFEASIBLE" | "TIMED_OUT" | "CANCELLED" | "ERROR";
  solverClaim?: string | null;
  rawOutputHash?: string | null;
  assignmentsHash?: string | null;
  leaseOwner?: string | null;
  leaseUntil?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  generatedAt?: string | null;
  createdAt: string;
};

export type SeatingV2RunAssignment = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  runId: string;
  guestToken: string;
  state: "SEATED" | "UNSEATED";
  positionToken?: string | null;
  typedReasonCodes: string[];
  createdAt: string;
};

export type SeatingV2ValidationReportRecord = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  packageId: string;
  packageHash: string;
  assignmentsHash: string;
  validatorVersion: string;
  verdict: "FEASIBLE" | "INFEASIBLE";
  reportHash: string;
  producedAt: string;
  createdAt: string;
};

export type SeatingV2ValidationRuleOutcome = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  reportId: string;
  ruleEditionId: string;
  ruleContentHash: string;
  outcome: "SATISFIED" | "VIOLATED" | "NOT_EVALUATED";
  typedReasonCodes: string[];
  affectedGuestTokens: string[];
  createdAt: string;
};

export type SeatingV2ValidationStructuralOutcome = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  reportId: string;
  checkCode: string;
  outcome: "PASSED" | "FAILED";
  typedDetail: string;
  createdAt: string;
};

export type SeatingV2PlanEdition = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  editionNo: number;
  packageId: string;
  packageHash: string;
  sourceRunId?: string | null;
  validationReportId?: string | null;
  validationReportHash?: string | null;
  assignmentsHash: string;
  manualDecisionLogHash: string;
  contentHash: string;
  status: "WORKING" | "SUBMITTED" | "APPROVED" | "RECALLED" | "SUPERSEDED" | "WITHDRAWN";
  successorOfEditionId?: string | null;
  version: number;
  createdByPersonId: string;
  submittedByPersonId?: string | null;
  submittedAt?: string | null;
  createdAt: string;
};

export type SeatingV2PlanAssignment = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  eventGuestId: string;
  state: "SEATED" | "UNSEATED";
  layoutTableId?: string | null;
  logicalPositionId?: string | null;
  lockState: "UNLOCKED" | "LOCKED";
  typedReasonCodes: string[];
  createdAt: string;
};

export type SeatingV2PlanAuthor = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  personId: string;
  contributionType: "CREATE" | "ADOPT" | "MANUAL_EDIT";
  createdAt: string;
};

export type SeatingV2ManualPreview = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  planEditionVersion: number;
  commandHash: string;
  proposedAssignmentsHash: string;
  validationReportId?: string | null;
  validationReportHash?: string | null;
  expiresAt: string;
  createdAt: string;
};

export type SeatingV2ManualDecision = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  resultingEditionId: string;
  previewId?: string | null;
  commandType: string;
  beforeHash: string;
  afterHash: string;
  reasonCode: string;
  reasonText?: string | null;
  actorPersonId: string;
  appliedAt: string;
  createdAt: string;
};

export type SeatingV2SpecialistReview = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  planContentHash: string;
  domain: "SECURITY" | "PROTOCOL" | "ACCESSIBILITY";
  reviewedRuleEditionHashes: string[];
  decision: "APPROVED" | "REJECTED";
  reason: string;
  reviewerPersonId: string;
  recordedAt: string;
  idempotencyHash: string;
  createdAt: string;
};

export type SeatingV2OperationalApproval = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  planEditionId: string;
  planContentHash: string;
  decision: "APPROVED" | "REJECTED";
  reason: string;
  approverPersonId: string;
  recordedAt: string;
  createdAt: string;
};

export type SeatingV2EventCurrent = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  workingEditionId?: string | null;
  submittedEditionId?: string | null;
  currentPublicationId?: string | null;
  version: number;
  createdAt: string;
};

export type SeatingV2Publication = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  publicationNo: number;
  planEditionId: string;
  planContentHash: string;
  packageId: string;
  packageContentHash: string;
  layoutPublicationId: string;
  layoutContentHash: string;
  solverVersion: string;
  solverConfigHash: string;
  approvalId: string;
  publisherPersonId: string;
  status: "CURRENT" | "SUPERSEDED" | "WITHDRAWN";
  supersedesPublicationId?: string | null;
  publishedAt: string;
  createdAt: string;
};

export type SeatingV2ExportJob = {
  id: string;
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  sourceType: "EDITION" | "PUBLICATION";
  sourceId: string;
  sourceHash: string;
  publicationNo?: number | null;
  projectionClass: "FULL" | "OPERATIONAL" | "PERMISSION_SAFE" | "DOWNSTREAM";
  format: "PDF" | "PNG" | "JSON";
  status: "PENDING" | "READY" | "FAILED";
  generatedAt?: string | null;
  storageKey?: string | null;
  createdAt: string;
};

export type SeatingV2IdempotencyReceipt = {
  organisationId: string;
  eventId: string;
  schemaVersion: number;
  action: string;
  idempotencyKey: string;
  requestHash: string;
  resultIdentity: string;
  application: "APPLIED" | "REPLAYED" | "NOT_APPLIED";
  createdAt: string;
};

export type SeatingV2EvaluationRun = {
  id: string;
  organisationId: string;
  schemaVersion: number;
  corpusEdition: string;
  corpusHash: string;
  contractVersion: string;
  solverVersion: string;
  configHash: string;
  validatorVersion: string;
  projectionVersion: string;
  status: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "ERROR";
  leaseOwner?: string | null;
  leaseUntil?: string | null;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: string;
};

export type SeatingV2EvaluationCaseResult = {
  id: string;
  organisationId: string;
  schemaVersion: number;
  runId: string;
  caseId: string;
  observations: unknown;
  assertions: unknown;
  status: "PASSED" | "FAILED" | "ERROR";
  createdAt: string;
};

export type SeatingV2MigrationReceipt = {
  migrationId: string;
  checksum: string;
  appliedAt: string;
  counts: Record<string, number>;
};

export type SeatingV2State = {
  rules: SeatingV2Rule[];
  ruleEditions: SeatingV2RuleEdition[];
  ruleSubjects: SeatingV2RuleSubject[];
  ruleTargets: SeatingV2RuleTarget[];
  ruleAnnotations: SeatingV2RuleAnnotation[];
  reservations: SeatingV2Reservation[];
  reservationEditions: SeatingV2ReservationEdition[];
  reservationMembers: SeatingV2ReservationMember[];
  reservationTargets: SeatingV2ReservationTarget[];
  reservationAnnotations: SeatingV2ReservationAnnotation[];
  inputPackages: SeatingV2InputPackage[];
  packageGuests: SeatingV2PackageGuest[];
  packagePositions: SeatingV2PackagePosition[];
  packageRules: SeatingV2PackageRule[];
  packageReservations: SeatingV2PackageReservation[];
  compiledRequests: SeatingV2CompiledRequestRecord[];
  runs: SeatingV2Run[];
  runAssignments: SeatingV2RunAssignment[];
  validationReports: SeatingV2ValidationReportRecord[];
  validationRuleOutcomes: SeatingV2ValidationRuleOutcome[];
  validationStructuralOutcomes: SeatingV2ValidationStructuralOutcome[];
  planEditions: SeatingV2PlanEdition[];
  planAssignments: SeatingV2PlanAssignment[];
  planAuthors: SeatingV2PlanAuthor[];
  manualPreviews: SeatingV2ManualPreview[];
  manualDecisions: SeatingV2ManualDecision[];
  specialistReviews: SeatingV2SpecialistReview[];
  operationalApprovals: SeatingV2OperationalApproval[];
  eventCurrent: SeatingV2EventCurrent[];
  publications: SeatingV2Publication[];
  exportJobs: SeatingV2ExportJob[];
  idempotencyReceipts: SeatingV2IdempotencyReceipt[];
  evaluationRuns: SeatingV2EvaluationRun[];
  evaluationCaseResults: SeatingV2EvaluationCaseResult[];
  migrationReceipts: SeatingV2MigrationReceipt[];
};

export type SeatingV2Collection = keyof SeatingV2State;

export const SEATING_V2_COLLECTIONS: SeatingV2Collection[] = [
  "rules",
  "ruleEditions",
  "ruleSubjects",
  "ruleTargets",
  "ruleAnnotations",
  "reservations",
  "reservationEditions",
  "reservationMembers",
  "reservationTargets",
  "reservationAnnotations",
  "inputPackages",
  "packageGuests",
  "packagePositions",
  "packageRules",
  "packageReservations",
  "compiledRequests",
  "runs",
  "runAssignments",
  "validationReports",
  "validationRuleOutcomes",
  "validationStructuralOutcomes",
  "planEditions",
  "planAssignments",
  "planAuthors",
  "manualPreviews",
  "manualDecisions",
  "specialistReviews",
  "operationalApprovals",
  "eventCurrent",
  "publications",
  "exportJobs",
  "idempotencyReceipts",
  "evaluationRuns",
  "evaluationCaseResults",
  "migrationReceipts",
];

/** Collections required to project the seating command workspace. Heavy blobs stay off this path. */
export const SEATING_V2_WORKSPACE_COLLECTIONS: SeatingV2Collection[] = [
  "ruleEditions",
  "ruleSubjects",
  "ruleTargets",
  "reservationEditions",
  "reservationMembers",
  "reservationTargets",
  "inputPackages",
  "packagePositions",
  "packageRules",
  "packageReservations",
  "runs",
  "runAssignments",
  "validationReports",
  "validationRuleOutcomes",
  "validationStructuralOutcomes",
  "planEditions",
  "planAssignments",
  "manualDecisions",
  "specialistReviews",
  "operationalApprovals",
  "eventCurrent",
  "publications",
  "exportJobs",
  "evaluationRuns",
];

export const IMMUTABLE_SEATING_V2_COLLECTIONS = [
  "ruleEditions",
  "reservationEditions",
  "inputPackages",
  "compiledRequests",
  "runs",
  "validationReports",
  "publications",
] as const satisfies readonly SeatingV2Collection[];

export const SEATING_V2_TABLE_FOR_COLLECTION: Record<SeatingV2Collection, SeatingV2SqlTable> = {
  rules: "seating_v2_rules",
  ruleEditions: "seating_v2_rule_editions",
  ruleSubjects: "seating_v2_rule_subjects",
  ruleTargets: "seating_v2_rule_targets",
  ruleAnnotations: "seating_v2_rule_annotations",
  reservations: "seating_v2_reservations",
  reservationEditions: "seating_v2_reservation_editions",
  reservationMembers: "seating_v2_reservation_members",
  reservationTargets: "seating_v2_reservation_targets",
  reservationAnnotations: "seating_v2_reservation_annotations",
  inputPackages: "seating_v2_input_packages",
  packageGuests: "seating_v2_package_guests",
  packagePositions: "seating_v2_package_positions",
  packageRules: "seating_v2_package_rules",
  packageReservations: "seating_v2_package_reservations",
  compiledRequests: "seating_v2_compiled_requests",
  runs: "seating_v2_runs",
  runAssignments: "seating_v2_run_assignments",
  validationReports: "seating_v2_validation_reports",
  validationRuleOutcomes: "seating_v2_validation_rule_outcomes",
  validationStructuralOutcomes: "seating_v2_validation_structural_outcomes",
  planEditions: "seating_v2_plan_editions",
  planAssignments: "seating_v2_plan_assignments",
  planAuthors: "seating_v2_plan_authors",
  manualPreviews: "seating_v2_manual_previews",
  manualDecisions: "seating_v2_manual_decisions",
  specialistReviews: "seating_v2_specialist_reviews",
  operationalApprovals: "seating_v2_operational_approvals",
  eventCurrent: "seating_v2_event_current",
  publications: "seating_v2_publications",
  exportJobs: "seating_v2_export_jobs",
  idempotencyReceipts: "seating_v2_idempotency_receipts",
  evaluationRuns: "seating_v2_evaluation_runs",
  evaluationCaseResults: "seating_v2_evaluation_case_results",
  migrationReceipts: "seating_v2_migration_receipts",
};

export function emptySeatingV2State(): SeatingV2State {
  return {
    rules: [],
    ruleEditions: [],
    ruleSubjects: [],
    ruleTargets: [],
    ruleAnnotations: [],
    reservations: [],
    reservationEditions: [],
    reservationMembers: [],
    reservationTargets: [],
    reservationAnnotations: [],
    inputPackages: [],
    packageGuests: [],
    packagePositions: [],
    packageRules: [],
    packageReservations: [],
    compiledRequests: [],
    runs: [],
    runAssignments: [],
    validationReports: [],
    validationRuleOutcomes: [],
    validationStructuralOutcomes: [],
    planEditions: [],
    planAssignments: [],
    planAuthors: [],
    manualPreviews: [],
    manualDecisions: [],
    specialistReviews: [],
    operationalApprovals: [],
    eventCurrent: [],
    publications: [],
    exportJobs: [],
    idempotencyReceipts: [],
    evaluationRuns: [],
    evaluationCaseResults: [],
    migrationReceipts: [],
  };
}

export function defaultSeatingV2SchemaVersion(): number {
  return SEATING_V2_SCHEMA_VERSION;
}

export function seatingV2TableNames(): readonly SeatingV2SqlTable[] {
  return SEATING_V2_SQL_TABLES;
}
