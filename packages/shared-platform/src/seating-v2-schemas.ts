import { z } from "zod";

export const SEATING_V2_SOLVER_CONTRACT = "eos-s06-solver-v2" as const;
export const SEATING_V2_SOLVER_VERSION = "s06-solver-v2" as const;
export const SEATING_V2_VALIDATOR_VERSION = "s06-validator-v3" as const;
export const SEATING_V2_SCHEMA_VERSION = 1 as const;
export const EOS_S06_SEATING_V2_MIGRATION_ID = "008_seating_truth_v2" as const;
export const EOS_S06_SEATING_V2_RECEIPT_ID = "EOS-S06-SEATING-V2" as const;

export const SEATING_V2_PREDICATES = [
  "KEEP_TOGETHER",
  "KEEP_APART",
  "REQUIRE_TABLE",
  "FORBID_TABLE",
  "REQUIRE_ZONE",
  "FORBID_ZONE",
  "REQUIRE_POSITION_CAPABILITY",
  "RESERVE_CAPACITY",
  "LOCK_ASSIGNMENT",
  "PREFER_TOGETHER",
  "PREFER_APART",
  "PREFER_TABLE",
  "PREFER_ZONE",
  "MINIMIZE_CHANGE",
] as const;

export const SEATING_V2_HARD_PREDICATES = [
  "KEEP_TOGETHER",
  "KEEP_APART",
  "REQUIRE_TABLE",
  "FORBID_TABLE",
  "REQUIRE_ZONE",
  "FORBID_ZONE",
  "REQUIRE_POSITION_CAPABILITY",
  "RESERVE_CAPACITY",
  "LOCK_ASSIGNMENT",
] as const;

export const SEATING_V2_HARDNESS = ["HARD", "SOFT", "INFORMATIONAL"] as const;
export const SEATING_V2_SCOPES = ["TABLE", "ZONE", "ADJACENT"] as const;
export const SEATING_V2_SPECIALIST_DOMAINS = ["SECURITY", "PROTOCOL", "ACCESSIBILITY", "NONE"] as const;
export const SEATING_V2_RULE_LIFECYCLES = ["DRAFT", "ACTIVE", "WITHDRAWN", "SUPERSEDED"] as const;
export const SEATING_V2_RESERVATION_LIFECYCLES = ["DRAFT", "ACTIVE", "RELEASED", "WITHDRAWN", "SUPERSEDED"] as const;
export const SEATING_V2_SUBJECT_TYPES = ["EVENT_GUEST", "GOVERNED_GROUP"] as const;
export const SEATING_V2_TARGET_TYPES = ["TABLE", "ZONE", "POSITION_CAPABILITY"] as const;
export const SEATING_V2_ASSIGNMENT_STATES = ["SEATED", "UNSEATED"] as const;
export const SEATING_V2_RUN_STATUSES = ["QUEUED", "RUNNING", "FEASIBLE", "INFEASIBLE", "TIMED_OUT", "CANCELLED", "ERROR"] as const;
export const SEATING_V2_PLAN_STATUSES = ["WORKING", "SUBMITTED", "APPROVED", "RECALLED", "SUPERSEDED", "WITHDRAWN"] as const;
export const SEATING_V2_PUBLICATION_STATUSES = ["CURRENT", "SUPERSEDED", "WITHDRAWN"] as const;
export const SEATING_V2_RULE_OUTCOMES = ["SATISFIED", "VIOLATED", "NOT_EVALUATED"] as const;
export const SEATING_V2_STRUCTURAL_OUTCOMES = ["PASSED", "FAILED"] as const;
export const SEATING_V2_VERDICTS = ["FEASIBLE", "INFEASIBLE"] as const;

export const SEATING_V2_FORBIDDEN_FIELD_NAMES = [
  "name",
  "displayName",
  "legalName",
  "firstName",
  "lastName",
  "givenName",
  "familyName",
  "email",
  "phone",
  "mobile",
  "telephone",
  "address",
  "street",
  "city",
  "postcode",
  "postalCode",
  "contact",
  "note",
  "notes",
  "freeText",
  "prompt",
  "narrative",
  "evidence",
  "privateNote",
  "html",
  "regex",
  "sql",
  "javascript",
  "formula",
  "template",
  "diagnosis",
  "medical",
  "policyNumber",
  "credential",
  "storageKey",
  "objectKey",
] as const;

const Uuid = z.string().uuid();
const Iso = z.string().min(10);
const Hash = z.string().min(16).max(128);
const Token = z.string().min(4).max(128);
const Code = z.string().min(1).max(64);

export const SeatingV2SubjectSchema = z
  .object({
    type: z.enum(SEATING_V2_SUBJECT_TYPES),
    id: Uuid,
  })
  .strict();

export const SeatingV2TargetSchema = z
  .object({
    type: z.enum(SEATING_V2_TARGET_TYPES),
    idOrCode: z.string().min(1).max(128),
  })
  .strict();

export const SeatingV2RuleSourceSchema = z
  .object({
    type: z.string().min(1).max(64),
    recordId: Uuid.optional(),
    editionId: Uuid.optional(),
    contentHash: Hash.optional(),
  })
  .strict();

export const SeatingV2RuleContentSchema = z
  .object({
    kind: z.enum(SEATING_V2_PREDICATES),
    hardness: z.enum(SEATING_V2_HARDNESS),
    weight: z.number().int().min(1).max(10_000).nullable(),
    scope: z.enum(SEATING_V2_SCOPES),
    specialistDomain: z.enum(SEATING_V2_SPECIALIST_DOMAINS),
    subjects: z.array(SeatingV2SubjectSchema).max(64),
    targets: z.array(SeatingV2TargetSchema).max(64),
    source: SeatingV2RuleSourceSchema,
  })
  .strict()
  .refine((value) => (value.hardness === "SOFT" ? value.weight !== null : value.weight === null), "SOFT rules require weight; HARD/INFORMATIONAL must not carry weight");

export const SeatingV2CompiledGuestSchema = z
  .object({
    token: Token,
    eligible: z.boolean(),
    groupTokens: z.array(Token).max(16),
    capabilityCodes: z.array(Code).max(32),
  })
  .strict();

export const SeatingV2CompiledPositionSchema = z
  .object({
    token: Token,
    tableToken: Token,
    zoneCodes: z.array(Code).max(16),
    capabilityCodes: z.array(Code).max(32),
  })
  .strict();

export const SeatingV2CompiledRuleSchema = z
  .object({
    contentHash: Hash,
    kind: z.enum(SEATING_V2_PREDICATES),
    hardness: z.enum(SEATING_V2_HARDNESS),
    weight: z.number().int().min(1).max(10_000).nullable(),
    scope: z.enum(SEATING_V2_SCOPES),
    subjectTokens: z.array(Token).max(64),
    tableTokens: z.array(Token).max(64),
    zoneCodes: z.array(Code).max(16),
    capabilityCodes: z.array(Code).max(16),
    positionToken: Token.nullable(),
  })
  .strict();

export const SeatingV2CompiledReservationSchema = z
  .object({
    contentHash: Hash,
    eligibleGuestTokens: z.array(Token).max(2000),
    tableTokens: z.array(Token).max(64),
    zoneCodes: z.array(Code).max(16),
    min: z.number().int().min(0).max(2000).nullable(),
    max: z.number().int().min(0).max(2000).nullable(),
    exact: z.number().int().min(0).max(2000).nullable(),
  })
  .strict();

export const SeatingV2CompiledRequestSchema = z
  .object({
    contract: z.literal(SEATING_V2_SOLVER_CONTRACT),
    version: z.literal(SEATING_V2_SOLVER_VERSION),
    configHash: Hash,
    seed: z.string().min(1).max(128),
    guests: z.array(SeatingV2CompiledGuestSchema).max(2000),
    positions: z.array(SeatingV2CompiledPositionSchema).max(4000),
    rules: z.array(SeatingV2CompiledRuleSchema).max(4000),
    reservations: z.array(SeatingV2CompiledReservationSchema).max(256),
  })
  .strict();

export const SeatingV2AssignmentSchema = z
  .object({
    guestToken: Token,
    state: z.enum(SEATING_V2_ASSIGNMENT_STATES),
    positionToken: Token.nullable(),
    typedReasonCodes: z.array(Code).max(16),
  })
  .strict();

export const SeatingV2RuleOutcomeSchema = z
  .object({
    ruleContentHash: Hash,
    outcome: z.enum(SEATING_V2_RULE_OUTCOMES),
    typedReasonCodes: z.array(Code).max(16),
    affectedGuestTokens: z.array(Token).max(64),
  })
  .strict();

export const SeatingV2StructuralOutcomeSchema = z
  .object({
    checkCode: Code,
    outcome: z.enum(SEATING_V2_STRUCTURAL_OUTCOMES),
    typedDetail: z.string().min(1).max(240),
  })
  .strict();

export const SeatingV2ValidationReportSchema = z
  .object({
    validatorVersion: z.literal(SEATING_V2_VALIDATOR_VERSION),
    packageContentHash: Hash,
    assignmentsHash: Hash,
    verdict: z.enum(SEATING_V2_VERDICTS),
    reportHash: Hash,
    producedAt: Iso,
    ruleOutcomes: z.array(SeatingV2RuleOutcomeSchema),
    structuralOutcomes: z.array(SeatingV2StructuralOutcomeSchema),
  })
  .strict();

export const SeatingV2PackageIdentitySchema = z
  .object({
    organisationId: Uuid,
    eventId: Uuid,
    semanticHash: Hash,
    compiledRequestHash: Hash,
    contentHash: Hash,
    cohortHash: Hash,
    rsvpSnapshotHash: Hash,
    layoutPublicationId: Uuid,
    layoutContentHash: Hash,
    eventBriefContentHash: Hash.nullable(),
    protectionSnapshotHash: Hash.nullable(),
    lockSetHash: Hash,
    solverVersion: z.literal(SEATING_V2_SOLVER_VERSION),
    solverConfigHash: Hash,
    deterministicSeed: z.string().min(1).max(128),
  })
  .strict();

export type SeatingV2Subject = z.infer<typeof SeatingV2SubjectSchema>;
export type SeatingV2Target = z.infer<typeof SeatingV2TargetSchema>;
export type SeatingV2RuleContent = z.infer<typeof SeatingV2RuleContentSchema>;
export type SeatingV2CompiledRequest = z.infer<typeof SeatingV2CompiledRequestSchema>;
export type SeatingV2Assignment = z.infer<typeof SeatingV2AssignmentSchema>;
export type SeatingV2ValidationReport = z.infer<typeof SeatingV2ValidationReportSchema>;
export type SeatingV2PackageIdentity = z.infer<typeof SeatingV2PackageIdentitySchema>;
export type SeatingV2CompiledRule = z.infer<typeof SeatingV2CompiledRuleSchema>;
export type SeatingV2CompiledReservation = z.infer<typeof SeatingV2CompiledReservationSchema>;
export type SeatingV2RuleOutcome = z.infer<typeof SeatingV2RuleOutcomeSchema>;
export type SeatingV2StructuralOutcome = z.infer<typeof SeatingV2StructuralOutcomeSchema>;

export function isHardPredicate(kind: string): boolean {
  return (SEATING_V2_HARD_PREDICATES as readonly string[]).includes(kind);
}
