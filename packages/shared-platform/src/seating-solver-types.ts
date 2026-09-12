import { z } from "zod";

export const SEATING_SOLVER_ID = "SeatingSolverV1" as const;
export const SEATING_SOLVER_VERSION = "s06-solver-v1" as const;

export const SEATING_PREDICATE_TYPES = [
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

export const SEATING_CONSTRAINT_KINDS = ["HARD", "WEIGHTED", "INFORMATION"] as const;
export const SEATING_ASSIGNMENT_STATES = ["SEATED", "UNSEATED"] as const;
export const SEATING_SOLVER_STATUSES = ["FEASIBLE", "INFEASIBLE", "TIMED_OUT"] as const;
export const SEATING_REASON_CODES = [
  "LOCKED",
  "HARD_GROUP",
  "HARD_SEPARATION",
  "REQUIRED_CAPABILITY",
  "RESERVATION",
  "PROTOCOL_PRIORITY",
  "ACCESSIBILITY_PRIORITY",
  "WEIGHTED_PREFERENCE",
  "STABILITY",
  "CAPACITY",
  "NO_FEASIBLE_POSITION",
] as const;

export const SEATING_OBJECTIVE_ORDER = [
  "zero_hard_rule_violations",
  "maximize_eligible_seated",
  "satisfy_reservation_commitments",
  "protocol_accessibility_safety_priority",
  "minimize_weighted_preference_cost",
  "minimize_publication_disruption",
  "deterministic_token_tiebreak",
] as const;

export const PROHIBITED_SOLVER_FIELD_NAMES = [
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
  "freeText",
  "prompt",
  "narrative",
  "privateNote",
] as const;

const TokenSchema = z.string().min(4).max(128);
const CodeSchema = z.string().min(1).max(64);

export const SolverGuestTokenSchema = z
  .object({
    token: TokenSchema,
    eligible: z.boolean(),
    partyToken: TokenSchema.optional(),
    capabilityCodes: z.array(CodeSchema).max(32),
    protocolCodes: z.array(CodeSchema).max(32),
  })
  .strict();

export const SolverPositionTokenSchema = z
  .object({
    token: TokenSchema,
    tableToken: TokenSchema,
    zoneCodes: z.array(CodeSchema).max(16),
    capabilityCodes: z.array(CodeSchema).max(32),
  })
  .strict();

const GuestTokensPayload = z.object({ guestTokens: z.array(TokenSchema).min(2).max(64) }).strict();
const GuestTablePayload = z
  .object({ guestTokens: z.array(TokenSchema).min(1).max(64), tableTokens: z.array(TokenSchema).min(1).max(64) })
  .strict();
const GuestZonePayload = z
  .object({ guestTokens: z.array(TokenSchema).min(1).max(64), zoneCodes: z.array(CodeSchema).min(1).max(16) })
  .strict();
const GuestCapabilityPayload = z
  .object({ guestTokens: z.array(TokenSchema).min(1).max(64), capabilityCodes: z.array(CodeSchema).min(1).max(16) })
  .strict();

export const SolverConstraintPayloadSchema = z.discriminatedUnion("predicateType", [
  z.object({ predicateType: z.literal("KEEP_TOGETHER"), ...GuestTokensPayload.shape }).strict(),
  z.object({ predicateType: z.literal("KEEP_APART"), ...GuestTokensPayload.shape }).strict(),
  z.object({ predicateType: z.literal("REQUIRE_TABLE"), ...GuestTablePayload.shape }).strict(),
  z.object({ predicateType: z.literal("FORBID_TABLE"), ...GuestTablePayload.shape }).strict(),
  z.object({ predicateType: z.literal("REQUIRE_ZONE"), ...GuestZonePayload.shape }).strict(),
  z.object({ predicateType: z.literal("FORBID_ZONE"), ...GuestZonePayload.shape }).strict(),
  z.object({ predicateType: z.literal("REQUIRE_POSITION_CAPABILITY"), ...GuestCapabilityPayload.shape }).strict(),
  z.object({ predicateType: z.literal("RESERVE_CAPACITY"), reservationId: TokenSchema }).strict(),
  z.object({ predicateType: z.literal("LOCK_ASSIGNMENT"), guestToken: TokenSchema, positionToken: TokenSchema }).strict(),
  z.object({ predicateType: z.literal("PREFER_TOGETHER"), ...GuestTokensPayload.shape }).strict(),
  z.object({ predicateType: z.literal("PREFER_APART"), ...GuestTokensPayload.shape }).strict(),
  z.object({ predicateType: z.literal("PREFER_TABLE"), ...GuestTablePayload.shape }).strict(),
  z.object({ predicateType: z.literal("PREFER_ZONE"), ...GuestZonePayload.shape }).strict(),
  z
    .object({
      predicateType: z.literal("MINIMIZE_CHANGE"),
      previous: z.array(z.object({ guestToken: TokenSchema, positionToken: TokenSchema }).strict()).max(2000),
    })
    .strict(),
]);

export const SolverConstraintSchema = z
  .object({
    id: TokenSchema,
    kind: z.enum(SEATING_CONSTRAINT_KINDS),
    predicateType: z.enum(SEATING_PREDICATE_TYPES),
    payload: SolverConstraintPayloadSchema,
    weight: z.number().int().min(1).max(10_000).optional(),
    authority: z.enum(["HARD_AUTHORISED", "WEIGHTED", "INFORMATION"]).optional(),
  })
  .strict()
  .refine((value) => value.payload.predicateType === value.predicateType, "predicateType must match payload")
  .refine((value) => (value.kind === "WEIGHTED" ? typeof value.weight === "number" : true), "weighted constraints require weight")
  .refine((value) => (value.kind !== "WEIGHTED" ? value.weight === undefined : true), "hard/information constraints must not carry weight");

export const SolverReservationSchema = z
  .object({
    id: TokenSchema,
    eligibleGuestTokens: z.array(TokenSchema).min(1).max(2000),
    tableTokens: z.array(TokenSchema).max(64).optional(),
    zoneCodes: z.array(CodeSchema).max(16).optional(),
    min: z.number().int().min(0).max(2000).optional(),
    max: z.number().int().min(0).max(2000).optional(),
    exact: z.number().int().min(0).max(2000).optional(),
    priority: z.number().int().min(0).max(10_000),
    released: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.min !== undefined || value.max !== undefined || value.exact !== undefined, "reservation needs min, max or exact")
  .refine((value) => value.exact === undefined || (value.min === undefined && value.max === undefined), "exact cannot combine with min/max")
  .refine((value) => value.min === undefined || value.max === undefined || value.min <= value.max, "reservation min cannot exceed max");

export const SolverConfigSchema = z
  .object({
    algorithm: z.literal(SEATING_SOLVER_ID),
    version: z.literal(SEATING_SOLVER_VERSION),
    objectiveOrder: z.tuple([
      z.literal("zero_hard_rule_violations"),
      z.literal("maximize_eligible_seated"),
      z.literal("satisfy_reservation_commitments"),
      z.literal("protocol_accessibility_safety_priority"),
      z.literal("minimize_weighted_preference_cost"),
      z.literal("minimize_publication_disruption"),
      z.literal("deterministic_token_tiebreak"),
    ]),
    timeLimitMs: z.number().int().min(50).max(20_000),
    memoryLimitMb: z.number().int().min(32).max(1024),
    seed: z.string().min(1).max(128),
    alternativeCount: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    materialityThreshold: z.number().int().min(1).max(2000),
  })
  .strict();

export const SolverRequestSchema = z
  .object({
    guests: z.array(SolverGuestTokenSchema).min(1).max(2000),
    positions: z.array(SolverPositionTokenSchema).min(1).max(4000),
    constraints: z.array(SolverConstraintSchema).max(4000),
    reservations: z.array(SolverReservationSchema).max(256),
    config: SolverConfigSchema,
  })
  .strict();

export type SolverGuestToken = z.infer<typeof SolverGuestTokenSchema>;
export type SolverPositionToken = z.infer<typeof SolverPositionTokenSchema>;
export type SolverConstraint = z.infer<typeof SolverConstraintSchema>;
export type SolverReservation = z.infer<typeof SolverReservationSchema>;
export type SolverConfig = z.infer<typeof SolverConfigSchema>;
export type SolverRequest = z.infer<typeof SolverRequestSchema>;
export type SeatingPredicateType = (typeof SEATING_PREDICATE_TYPES)[number];
export type SeatingReasonCode = (typeof SEATING_REASON_CODES)[number];
export type SeatingSolverStatus = (typeof SEATING_SOLVER_STATUSES)[number];

export type LexicographicScore = {
  hardViolations: number;
  seatedEligible: number;
  reservationCommitments: number;
  protocolPriority: number;
  accessibilityPriority: number;
  safetyPriority: number;
  preferenceCost: number;
  disruption: number;
  tieBreak: string;
};

export type SolverAssignment = {
  guestToken: string;
  positionToken?: string;
  state: "SEATED" | "UNSEATED";
  reasonCodes: SeatingReasonCode[];
};

export type SolverFinding = {
  severity: "BLOCKER" | "WARNING" | "INFO";
  code: SeatingReasonCode | "CONTRADICTION" | "PROHIBITED_FIELD" | "OVER_RESERVATION";
  ruleRef?: string;
  affectedTokens: string[];
  message: string;
};

export type SolverAlternative = {
  assignments: SolverAssignment[];
  score: LexicographicScore;
  resultHash: string;
  differedAssignments: number;
};

export type SolverMetrics = {
  elapsedMs: number;
  heapUsedBytes: number;
  nodes: number;
  components: number;
};

export type SolverResult = {
  status: SeatingSolverStatus;
  assignments: SolverAssignment[];
  findings: SolverFinding[];
  score: LexicographicScore;
  alternatives: SolverAlternative[];
  resultHash: string;
  configHash: string;
  solverVersion: typeof SEATING_SOLVER_VERSION;
  metrics: SolverMetrics;
};

export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
  algorithm: SEATING_SOLVER_ID,
  version: SEATING_SOLVER_VERSION,
  objectiveOrder: [
    "zero_hard_rule_violations",
    "maximize_eligible_seated",
    "satisfy_reservation_commitments",
    "protocol_accessibility_safety_priority",
    "minimize_weighted_preference_cost",
    "minimize_publication_disruption",
    "deterministic_token_tiebreak",
  ],
  timeLimitMs: 10_000,
  memoryLimitMb: 256,
  seed: "s06-default-seed",
  alternativeCount: 2,
  materialityThreshold: 2,
};
