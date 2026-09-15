/** EOS-S06A Atelier Command — core types (ratified technical contract). */
export const ATELIER_COMMAND_RISK_TIERS = ["R0", "R1", "R2", "R3", "R4", "R5"] as const;
export type AtelierCommandRiskTier = (typeof ATELIER_COMMAND_RISK_TIERS)[number];

export const ATELIER_SESSION_STATUSES = ["OPEN", "CLOSED", "ARCHIVED"] as const;
export type AtelierSessionStatus = (typeof ATELIER_SESSION_STATUSES)[number];

export const ATELIER_INSTRUCTION_STATUSES = [
  "RECEIVED",
  "INTERPRETING",
  "NEEDS_CLARIFICATION",
  "INTERPRETED",
  "REJECTED",
  "SUPERSEDED",
] as const;
export type AtelierInstructionStatus = (typeof ATELIER_INSTRUCTION_STATUSES)[number];

export const ATELIER_PLAN_STATUSES = [
  "DRAFT",
  "VALIDATING",
  "READY",
  "STALE",
  "AWAITING_CONFIRMATION",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "COMPLETED",
  "BLOCKED",
  "REFUSED",
  "CANCELLED",
  "FAILED",
  "SUPERSEDED",
] as const;
export type AtelierPlanStatus = (typeof ATELIER_PLAN_STATUSES)[number];

export const ATELIER_RUN_STATUSES = [
  "QUEUED",
  "EXECUTING",
  "PAUSING",
  "PAUSED",
  "BLOCKED",
  "RECOVERING",
  "COMPLETED",
  "COMPLETED_WITH_RESIDUALS",
  "FAILED",
  "CANCELLED",
] as const;
export type AtelierRunStatus = (typeof ATELIER_RUN_STATUSES)[number];

export const ATELIER_STEP_STATUSES = [
  "PENDING",
  "VALIDATING",
  "AWAITING_CONFIRMATION",
  "AWAITING_APPROVAL",
  "READY",
  "EXECUTING",
  "OUTCOME_UNKNOWN",
  "RECONCILING",
  "SUCCEEDED",
  "REPLAYED",
  "REFUSED",
  "BLOCKED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
  "SUPERSEDED",
] as const;
export type AtelierStepStatus = (typeof ATELIER_STEP_STATUSES)[number];

export const ATELIER_EXECUTION_ROUTES = ["NATIVE", "INTEGRATION", "BROWSER"] as const;
export type AtelierExecutionRoute = (typeof ATELIER_EXECUTION_ROUTES)[number];

export const ATELIER_EXECUTION_MODES = [
  "READ_ONLY",
  "DRAFT_ONLY",
  "CONFIRM_EACH",
  "APPROVED_PLAN",
  "MAKER_CHECKER",
  "EXTERNAL_EFFECT",
  "DRY_RUN",
] as const;
export type AtelierExecutionMode = (typeof ATELIER_EXECUTION_MODES)[number];

export const ATELIER_POLICY_DECISIONS = [
  "ALLOW",
  "ALLOW_WITH_PLAN_CONFIRMATION",
  "REQUIRE_IMMEDIATE_CONFIRMATION",
  "REQUIRE_MAKER_CHECKER",
  "REFUSE",
  "BLOCK_RUNTIME_POSTURE",
  "STALE_REPLAN_REQUIRED",
] as const;
export type AtelierPolicyDecision = (typeof ATELIER_POLICY_DECISIONS)[number];

export const ATELIER_KNOWLEDGE_KINDS = [
  "FACT",
  "REQUIREMENT",
  "PREFERENCE",
  "PRIORITY",
  "CONSTRAINT",
  "ASSUMPTION",
  "DECISION",
  "DEPENDENCY",
  "INVESTMENT",
  "MILESTONE",
  "RISK",
] as const;

export const ATELIER_EPISTEMIC_CLASSES = [
  "CONFIRMED_FACT",
  "CLIENT_STATED",
  "OPERATOR_STATED",
  "DERIVED",
  "ASSUMPTION",
  "FORECAST",
  "RECOMMENDATION",
  "UNKNOWN",
] as const;
export type AtelierEpistemicClass = (typeof ATELIER_EPISTEMIC_CLASSES)[number];

export const ATELIER_TASK_SOURCE_TYPES = ["CANONICAL", "ORGANISATION", "PERSONAL", "EVENT_INSTANCE"] as const;
export type AtelierTaskSourceType = (typeof ATELIER_TASK_SOURCE_TYPES)[number];

export const ATELIER_TASK_STATUSES = ["DRAFT", "IN_REVIEW", "ACTIVE", "DEPRECATED"] as const;
export type AtelierTaskStatus = (typeof ATELIER_TASK_STATUSES)[number];

export type AtelierScopeSnapshot = {
  organisationId: string;
  eventId: string;
  crossEvent: false;
  eventName?: string;
  organisationName?: string;
};

export type AtelierEntityResolution = {
  kind: string;
  suppliedText: string;
  resolvedId?: string;
  resolution: "EXACT" | "CANDIDATE" | "AMBIGUOUS" | "NOT_FOUND";
};

export type AtelierKnowledgeItem = {
  kind: (typeof ATELIER_KNOWLEDGE_KINDS)[number];
  statement: string;
  evidenceRefs: string[];
  confidence: number;
  epistemicClass: AtelierEpistemicClass;
};

export type AtelierAmbiguity = {
  id: string;
  question: string;
  blocksStepIds: string[];
  material: boolean;
};

export type AtelierInterpretationBody = {
  requestedOutcome: string;
  requestedTarget?: string | null;
  requestedOperation?: string;
  requestedEffectClass?: string;
  matchedCanonicalTask?: string | null;
  supportedPortion?: string | null;
  unsupportedPortion?: string | null;
  refusedPortion?: string | null;
  materialSemanticDifferences?: string[];
  scope: AtelierScopeSnapshot;
  entities: AtelierEntityResolution[];
  knowledge: AtelierKnowledgeItem[];
  ambiguities: AtelierAmbiguity[];
  successCriteria: string[];
  intentType: string;
  confidence: number;
};

export type AtelierCommandSession = {
  id: string;
  organisationId: string;
  eventId: string;
  createdByAssignmentId: string;
  title: string;
  status: AtelierSessionStatus;
  scopeSnapshot: AtelierScopeSnapshot;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type AtelierInstruction = {
  id: string;
  sessionId: string;
  organisationId: string;
  eventId: string;
  sequence: number;
  authorAssignmentId: string;
  authorPersonId: string;
  rawText: string;
  attachmentRefs: string[];
  status: AtelierInstructionStatus;
  supersedesInstructionId?: string;
  taskInvocationId?: string;
  createdAt: string;
  version: number;
};

export type AtelierInterpretationRecord = {
  id: string;
  instructionId: string;
  organisationId: string;
  eventId: string;
  modelInvocationId: string;
  body: AtelierInterpretationBody;
  createdAt: string;
};

export type AtelierPlanStep = {
  id: string;
  planId: string;
  ordinal: number;
  dependsOnStepIds: string[];
  toolName: string;
  toolVersion: string;
  executionRoute: AtelierExecutionRoute;
  input: Record<string, unknown>;
  targetRefs: string[];
  riskTier: AtelierCommandRiskTier;
  confirmationMode: AtelierExecutionMode;
  approvalRequirement: boolean;
  preconditions: string[];
  expectedEvidence: string[];
  compensationPolicy: string;
  status: AtelierStepStatus;
};

export type AtelierPlan = {
  id: string;
  instructionId: string;
  organisationId: string;
  eventId: string;
  planVersion: number;
  scopeSnapshot: AtelierScopeSnapshot;
  policyVersion: string;
  riskSummary: AtelierCommandRiskTier;
  estimatedCost: number;
  estimatedDurationMs: number;
  status: AtelierPlanStatus;
  approvedPlanHash?: string;
  /** Bound at confirm/approve — required for R3+ re-execution refusal. */
  makerPersonId?: string;
  checkerPersonId?: string;
  approvalIdentityId?: string;
  approvedAt?: string;
  /** First authoritative settlement correlation for this plan version. */
  settlementCorrelationId?: string;
  settlementReceiptId?: string;
  settledAt?: string;
  dryRun: boolean;
  createdAt: string;
  version: number;
};

export type AtelierRun = {
  id: string;
  planId: string;
  organisationId: string;
  eventId: string;
  initiatedByAssignmentId: string;
  initiatedByPersonId: string;
  agentIdentityId: string;
  modelPolicySnapshot: string;
  status: AtelierRunStatus;
  startedAt?: string;
  endedAt?: string;
  costBudget: number;
  actualCost: number;
  lastHeartbeatAt?: string;
  pauseReason?: string;
  completionSummary?: string;
  version: number;
};

export type AtelierIntelligenceResultPayload = {
  instruction: string;
  eventId: string;
  eventName?: string;
  organisationId: string;
  intent: string;
  domain?: string;
  answer: string;
  supportingFacts: string[];
  assumptions: string[];
  recommendations: string[];
  limitations: string[];
  risksOrBlockers?: string[];
  provenance?: string[];
  availability?: string;
  interpreterPosture: "FIXTURE";
  providersActive: boolean;
  productionAuthorised: boolean;
  businessDataChanged?: false;
  dataChanged: false;
  commandRecordSaved?: true;
  completedAt: string;
};

export type AtelierStepExecution = {
  id: string;
  runId: string;
  stepId: string;
  organisationId: string;
  eventId: string;
  attempt: number;
  commandId: string;
  idempotencyKey: string;
  correlationId: string;
  effectiveCapability: string[];
  scopeSnapshot: AtelierScopeSnapshot;
  inputHash: string;
  beforeStateHash?: string;
  afterStateHash?: string;
  status: AtelierStepStatus;
  resultRef?: string;
  resultSummary?: string;
  resultPayload?: AtelierIntelligenceResultPayload | Record<string, unknown>;
  errorClass?: string;
  startedAt?: string;
  endedAt?: string;
};

export type AtelierConfirmation = {
  id: string;
  runId: string;
  stepId: string;
  organisationId: string;
  eventId: string;
  requestedFromAssignmentId: string;
  confirmationTextHash: string;
  effectSummary: string;
  status: "PENDING" | "CONFIRMED" | "DENIED" | "EXPIRED";
  expiresAt: string;
  respondedAt?: string;
  responseActorId?: string;
  responsePersonId?: string;
};

export type AtelierBrowserRun = {
  id: string;
  runId: string;
  stepId: string;
  organisationId: string;
  eventId: string;
  executorPolicyVersion: string;
  allowedDomains: string[];
  credentialBindingRef: string;
  containerRef: string;
  status: "QUEUED" | "RUNNING" | "PAUSED" | "BLOCKED" | "COMPLETED" | "FAILED" | "CANCELLED" | "DESTROYED";
  startedAt?: string;
  endedAt?: string;
  takeoverActorId?: string;
  terminationReason?: string;
  simulation: true;
};

export type AtelierBrowserAction = {
  id: string;
  browserRunId: string;
  organisationId: string;
  eventId: string;
  ordinal: number;
  batchId: string;
  actionType: string;
  targetDescriptor: string;
  url: string;
  result: string;
  screenshotRef?: string;
  confirmationId?: string;
  promptInjectionSignal?: boolean;
  createdAt: string;
};

export type AtelierModelInvocation = {
  id: string;
  organisationId: string;
  eventId: string;
  purpose: string;
  provider: "FIXTURE" | "INACTIVE";
  model: string;
  policyClass: string;
  inputTokenCount: number;
  outputTokenCount: number;
  cost: number;
  latencyMs: number;
  cacheUsage: number;
  status: "SUCCEEDED" | "REFUSED" | "FAILED";
  createdAt: string;
};

export type AtelierTaskDefinition = {
  id: string;
  version: number;
  name: string;
  description: string;
  outcome: string;
  domain: string;
  eventPhases: string[];
  allowedRoles: string[];
  requiredCapabilities: string[];
  riskTier: AtelierCommandRiskTier;
  executionMode: AtelierExecutionMode;
  inputSchema: Record<string, unknown>;
  defaultInstruction: string;
  planTemplate: Array<{
    toolName: string;
    toolVersion: string;
    riskTier: AtelierCommandRiskTier;
    confirmationMode: AtelierExecutionMode;
    approvalRequirement: boolean;
    executionRoute: AtelierExecutionRoute;
    inputDefaults?: Record<string, unknown>;
  }>;
  requiredApprovals: string[];
  preconditions: string[];
  successCriteria: string[];
  evidenceRequirements: string[];
  recoveryPolicy: string;
  browserPolicy?: { allowedDomains: string[]; consequentialConfirmation: boolean };
  sourceType: AtelierTaskSourceType;
  status: AtelierTaskStatus;
  authoredBy: string;
  approvedBy: string;
  createdAt: string;
};

export type AtelierTaskInvocation = {
  id: string;
  taskDefinitionId: string;
  taskVersion: number;
  organisationId: string;
  eventId: string;
  invokedByAssignmentId: string;
  invokedByPersonId: string;
  operatorEdits: Record<string, unknown>;
  compiledPlanId?: string;
  riskSnapshot: AtelierCommandRiskTier;
  status: "DRAFT" | "COMPILED" | "EXECUTED" | "CANCELLED";
  createdAt: string;
};

export type AtelierCommandReceipt = {
  id: string;
  organisationId: string;
  eventId: string;
  sessionId: string;
  instructionId?: string;
  planId?: string;
  runId?: string;
  correlationId: string;
  kind: string;
  summary: string;
  changedRecordIds: string[];
  unchangedReasons: string[];
  evidenceRefs: string[];
  createdAt: string;
  /** Substantive Intelligence answer — must not be replaced by the generic run summary. */
  intelligenceResult?: AtelierIntelligenceResultPayload;
  effectClass?: "NONE" | "READ" | "DRAFT" | "MUTATION" | "EXTERNAL_BLOCKED" | "SIMULATED_BROWSER" | "REFUSED" | "ALREADY_SETTLED";
  dataChanged?: boolean;
  taskDefinitionId?: string;
  taskVersion?: number;
  riskSummary?: string;
  /** When kind is REPLAY_RECEIPT / ALREADY_SETTLED — link to first settlement. */
  originalCorrelationId?: string;
  originalSettlementAt?: string;
  settlementStatus?: "EXECUTED" | "REPLAYED" | "ALREADY_SETTLED" | "REFUSED";
  simulated?: boolean;
  originalRequestedIntent?: string;
  actualAction?: string;
};

export type AtelierCommandLedger = {
  sessions: AtelierCommandSession[];
  instructions: AtelierInstruction[];
  interpretations: AtelierInterpretationRecord[];
  plans: AtelierPlan[];
  planSteps: AtelierPlanStep[];
  runs: AtelierRun[];
  stepExecutions: AtelierStepExecution[];
  confirmations: AtelierConfirmation[];
  browserRuns: AtelierBrowserRun[];
  browserActions: AtelierBrowserAction[];
  modelInvocations: AtelierModelInvocation[];
  taskInvocations: AtelierTaskInvocation[];
  receipts: AtelierCommandReceipt[];
  idempotencyReceipts: Array<{
    idempotencyKey: string;
    organisationId: string;
    eventId: string;
    commandId: string;
    resultRef: string;
    status: string;
    createdAt: string;
  }>;
};

export function emptyAtelierCommandLedger(): AtelierCommandLedger {
  return {
    sessions: [],
    instructions: [],
    interpretations: [],
    plans: [],
    planSteps: [],
    runs: [],
    stepExecutions: [],
    confirmations: [],
    browserRuns: [],
    browserActions: [],
    modelInvocations: [],
    taskInvocations: [],
    receipts: [],
    idempotencyReceipts: [],
  };
}

export type AtelierCommandLedgerDocument = AtelierCommandLedger & { id: string; version: number };

export const ATELIER_COMMAND_LEDGER_ID = "eos-s06a-atelier-command-ledger" as const;

export function emptyAtelierCommandLedgerDocument(): AtelierCommandLedgerDocument {
  return { id: ATELIER_COMMAND_LEDGER_ID, version: 1, ...emptyAtelierCommandLedger() };
}
