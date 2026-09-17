/** CP-SAT Checkpoint 2 public surface. */
export {
  CPSAT_REQUEST_CONTRACT,
  CPSAT_RESPONSE_CONTRACT,
  CPSAT_MODEL_VERSION,
  CPSAT_ENGINE_ID,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_PYTHON_VERSION,
  CPSAT_PRODUCT_RESULTS,
  CPSAT_PREFERENCE_BANDS,
  CPSAT_SHORT_REASON_CODES,
  CPSAT_SHORT_REASON_TEXT,
  CPSAT_EVIDENCE_GRADES,
  CPSAT_CERTIFICATE_TYPES,
  CPSAT_STOP_MODES,
  CPSAT_DIAGNOSTIC_BUDGET_EDITION,
  type CpsatProductResult,
  type CpsatPreferenceBand,
  type CpsatShortReasonCode,
  type CpsatEvidenceGrade,
  type CpsatCertificateType,
  type CpsatStopMode,
  type CpsatCounterfactualResultCode,
} from "./contract.js";
export { buildTogetherUnits, compileV2ToCpsatRequest, type CpsatSolveRequest } from "./compiler.js";
// In-process CP-SAT adapter is intentionally withheld from this barrel.
export { solverRequestToV2Compiled } from "./corpus-bridge.js";
export {
  EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_WORKER_REGISTRY_MIGRATION_ID,
  EOS_S06_CPSAT_CANONICAL_SEATING_CUTOVER_MIGRATION_ID,
  CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA,
  CPSAT_SOLVER_QUEUE_LAUNCH_POSTGRES_SCHEMA,
  CPSAT_SOLVER_QUEUE_WORKER_POSTGRES_SCHEMA,
  CPSAT_SOLVER_REVIEW_ADOPTION_POSTGRES_SCHEMA,
  CPSAT_SOLVER_DIAGNOSTICS_POSTGRES_SCHEMA,
  CPSAT_SOLVER_WORKER_REGISTRY_POSTGRES_SCHEMA,
  CPSAT_CANONICAL_SEATING_CUTOVER_POSTGRES_SCHEMA,
} from "./postgres-schema.js";
export {
  CPSAT_CLAIM_SQL,
  CPSAT_FAIR_CLAIM_SQL,
  CPSAT_HEARTBEAT_SQL,
  CPSAT_FENCED_SETTLE_SQL,
  CPSAT_ACK_QUEUED_CANCEL_SQL,
  CPSAT_REAPER_REQUEUE_SQL,
  CPSAT_REAPER_FAULT_SQL,
  newWorkerLeaseOwner,
  fenceToken,
  CPSAT_PRIORITY_ORDER,
  type CpsatQueuePriority,
} from "./queue.js";
export {
  solverQueueEnabledNote,
  freezeCpsatSeatingAuthority,
  computeCpsatIdempotencyKey,
  enqueueCpsatSeatingRun,
  getCpsatSeatingRun,
  listCpsatSeatingRuns,
  requestCpsatRunCancellation,
  CPSAT_NO_BASELINE_SENTINEL,
  CPSAT_ENGINE_EXPECTATION,
  type CpsatFrozenAuthority,
  type CpsatSeatingRunSummary,
  type CpsatEnqueueResult,
  type CpsatLaunchPurpose,
  type CpsatLaunchMode,
} from "./durable-launch.js";
export {
  admitCpsatSeatingLaunch,
  throwAdmissionRefusal,
  recordCpsatAdmissionEvent,
  WORKER_UNAVAILABLE_PUBLIC_MESSAGE,
  QUEUE_BUSY_PUBLIC_MESSAGE,
  CPSAT_DEFAULT_PER_EVENT_ACTIVE_RUN_LIMIT,
  CPSAT_DEFAULT_GLOBAL_QUEUED_DEPTH_LIMIT,
  type CpsatAdmissionOutcome,
  type CpsatAdmissionLimits,
} from "./admission.js";
export {
  registerCpsatWorker,
  heartbeatCpsatWorker,
  setCpsatWorkerLifecycle,
  getCpsatWorker,
  findCompatibleReadyWorkers,
  workerSupportsCompatibility,
  registerSyntheticCpsatWorkerForTests,
  DEFAULT_WORKER_HEARTBEAT_FRESHNESS_MS,
  type CpsatWorkerRegistration,
  type CpsatWorkerLifecycle,
} from "./worker-registry.js";
export { buildCpsatRunUiModel, productResultCopy, shortReasonText, type CpsatRunUiModel } from "./ui-model.js";
export { buildExplanations, redactExplanationForOrdinaryRole, CPSAT_EXPLANATION_EDITION } from "./explanations.js";
export { verifyExplanations } from "./explanation-verifier.js";
export {
  claimNextCpsatRun,
  heartbeatCpsatRun,
  markCpsatRunRunning,
  fencedSettleCpsatRun,
  acknowledgeQueuedCancellations,
  reapExpiredCpsatLeases,
  projectSeatingV2Lifecycle,
  assertAuthorityProjectionAligned,
  mapLifecycleToProjectionStatus,
  loadClaimedRun,
  observeCancellation,
  incrementChildInvocation,
  updateCpsatProgressPhase,
} from "./worker-lifecycle.js";
export {
  validateChildResponse,
  processVerifiedCandidate,
  sealAndSettleCandidate,
  settleFaultOrTerminal,
  loadReviewableCandidate,
  isCandidateReviewable,
  prepareRunForExecution,
  CPSAT_REVIEWABLE_LIFECYCLES,
} from "./worker-settlement.js";
export { executeClaimedCpsatRun } from "./execute-claimed-run.js";
export { canonicalizeSymmetricAssignments } from "./canonicalize.js";
export {
  recomputeObjectiveTiers,
  tiersMatchChildReport,
  requiredObjectiveTiers,
  verifyRequiredObjectiveTiers,
} from "./tiers.js";
export {
  getCpsatCandidateReview,
  submitCpsatCandidateForApproval,
  decideCpsatCandidateApproval,
  adoptApprovedCpsatCandidate,
  reevaluateCpsatFreshness,
  type CpsatCandidateReviewModel,
  type CpsatGovernanceActor,
  type CpsatGovernedAuthoritySnapshot,
} from "./review-adoption.js";
export {
  loadCanonicalCpsatAuthority,
  applyCanonicalCpsatAuthorityToWorkspace,
  recordCanonicalCutoverRepairReceipt,
  type CanonicalCpsatAuthoritySnapshot,
  type CanonicalCpsatOperationalPublication,
} from "./canonical-workspace.js";
export {
  toCpsatWireSeed,
  assertCpsatWireSeed,
  foldToPositiveInt32,
  fnv1a32Unsigned,
  SEED_OVERFLOW_DEFECT,
  CPSAT_SEED_INT32_MIN,
  CPSAT_SEED_INT32_MAX,
  CPSAT_SEED_POSITIVE_MIN,
  CPSAT_SEED_POSITIVE_MAX,
  CpsatSeedError,
  type CpsatSeedConversion,
} from "./seed.js";
export {
  detectStaticCertificates,
  recheckStaticCertificate,
  certifyOrFault,
  type StaticCertificate,
} from "./diagnostics/certificates.js";
export {
  runDiagCore,
  runDiagMcs,
  runDiagMaxSeat,
  maxSeatOperatorWording,
  listRelaxableRules,
  type FeasibilityProbe,
  type CoreDiagnosticResult,
  type McsDiagnosticResult,
  type MaxSeatDiagnosticResult,
} from "./diagnostics/models.js";
export {
  createRealChildFeasibilityProbe,
  PRODUCTION_FEASIBILITY_PROBE_FACTORY,
} from "./diagnostics/real-child-probe.js";
export { confirmFullModelInfeasibility, isDiagnosticOrRestrictedPurpose } from "./diagnostics/confirmation.js";
export {
  executeCounterfactualWhyNot,
  redactCounterfactualForRole,
  counterfactualCacheKey,
} from "./diagnostics/counterfactual.js";
export { requestCpsatRunStop, recordIncumbentProgress, observeStopRequest } from "./diagnostics/stop-modes.js";
export {
  buildInfeasibilityExperience,
  keepBestSuccessCopy,
  stoppingSafelyCopy,
  cancelConfirmCopy,
  keepBestConfirmCopy,
} from "./diagnostics/experience.js";
export { settleAbnormalInfeasibility } from "./diagnostics/pipeline.js";
export {
  insertCpsatIncident,
  upsertInfeasibilityEvidence,
  loadInfeasibilityEvidence,
  persistCertifiedCertificate,
} from "./diagnostics/persist.js";
