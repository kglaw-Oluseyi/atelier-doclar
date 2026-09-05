export {
  CT4_TRACEABILITY,
  CT5_TRACEABILITY,
  CT6_TRACEABILITY,
  CT7_TRACEABILITY,
  CT8_TRACEABILITY,
  CT9_TRACEABILITY,
  FC1_TRACEABILITY,
  LV1_TRACEABILITY,
  CT5_SURFACES,
  CT6_SURFACES,
  CT7_SURFACES,
  CT8_SURFACES,
  CT9_SURFACES,
  LATER_SURFACES,
  TOWER_ROLES,
  SESSION_COOKIE,
  SYNTHETIC_ACCESS_TOKEN,
  SYNTHETIC_SESSION_SECRET,
  type TowerRole,
} from "./constants.js";
export {
  issueSession,
  readSession,
  sessionCookieName,
  isTowerRole,
  SessionError,
  type SessionActor,
  type SessionConfig,
} from "./session.js";
export { classifySurface, buildFreshness, SURFACE_STATES, type SurfaceState, type SurfaceFreshness } from "./surface.js";
export { buildPortfolio, type PortfolioView, type ProductCard, type HorizonItem } from "./portfolio.js";
export { loadCorpusPortfolio, loadCurrentSnapshot, deniedPortfolio, isViewFixture, VIEW_FIXTURES, type ViewFixture } from "./load.js";
export { buildRoadmap, productCodeFromRoute, type RoadmapView } from "./roadmap.js";
export { buildSliceDetail, listEvidence, listCommits } from "./slice-detail.js";
export {
  evaluateApproval,
  appendAudit,
  approvalStillValid,
  buildReleaseCandidate,
  type AuditEntry,
} from "./authority.js";
export {
  answerQuestion,
  buildProgrammeIndex,
  resolveProgrammeIndex,
  isPathAllowlisted,
  requestedPathIsAuthorised,
  RAG_PROVIDER,
  type GroundedAnswer,
} from "./rag.js";
export { ProgrammeIndexCache, programmeSourceFingerprint, getCachedProgrammeIndex } from "./rag-cache.js";
export { MemoryAuditRepository, FileAuditRepository, type AuditRepository } from "./audit-store.js";
export { evaluateRuntimeConfig, RUNTIME_CONFIG_CONTRACT } from "./runtime-config.js";
export {
  buildCharts,
  buildNotifications,
  dedupeNotifications,
  toneForStatus,
  type ChartsView,
} from "./charts.js";
export {
  assessHealth,
  classifyFailure,
  rejectCorruptEvent,
  restoreVerifiedSnapshot,
  roadmapSurvivesOpsFailure,
  type FailureKind,
  type OpsHealth,
} from "./ops.js";
export {
  openLiveRuntime,
  snapshotFromRuntime,
  PostgresAuditRepository,
  PostgresDeliveryJournal,
  type LiveRuntime,
} from "./live-runtime.js";
export type { ControlSnapshot } from "@maison-doclar/programme-domain";
