export {
  CT1_TRACEABILITY,
  CT2_TRACEABILITY,
  CALCULATION_VERSION,
  LOCAL_STORE_PRODUCTION_STATUS,
  PRODUCTION_STORE_STATUS,
  type StoreProductionStatus,
  PRODUCT_CODES,
  WORK_STATUSES,
  GATE_STATUSES,
  SLICE_ID_PATTERN,
  COMMIT_SHA_PATTERN,
} from "./constants.js";
export {
  type EntityType,
  type ProgrammeValidationError,
  type ValidationErrorCode,
  formatCyclePath,
  formatError,
} from "./errors.js";
export {
  ApprovalSchema,
  CatalogFileSchema,
  CheckSchema,
  CommitRefSchema,
  CommitShaSchema,
  DecisionSchema,
  DependencySchema,
  EvidenceRefSchema,
  GateSchema,
  IsoDatetimeSchema,
  OpenItemSchema,
  PhaseSchema,
  ProductCodeSchema,
  ProductSchema,
  ProgrammeSnapshotSchema,
  SliceIdSchema,
  SliceManifestSchema,
  SliceRecordSchema,
  TimelineEventSchema,
  type Approval,
  type Check,
  type CommitRef,
  type Decision,
  type Dependency,
  type EvidenceRef,
  type Gate,
  type OpenItem,
  type Phase,
  type Product,
  type ProductCode,
  type ProgrammeSnapshot,
  type SliceManifest,
  type SliceRecord,
  type TimelineEvent,
  type WorkStatus,
} from "./schemas.js";
export {
  assertMappingConsistency,
  emptyOperationalState,
  projectSliceRecord,
  type OperationalState,
} from "./mapping.js";
export { collectDependencies, detectCycles } from "./dag.js";
export { loadProgrammeCorpus, resolveProgrammeRoot } from "./load.js";
export { normalizeProgramme, stableJson } from "./normalize.js";
export {
  validateLoadedProgramme,
  validateProgramme,
  validateProgrammeCorpus,
  type ProgrammeValidationResult,
} from "./validate.js";
export { ProgrammeEventError } from "./event-errors.js";
export {
  PROGRAMME_EVENT_TYPES,
  parseProgrammeEvent,
  eventsEquivalent,
  type ProgrammeEvent,
} from "./events.js";
export {
  MemoryProgrammeStore,
  FilesystemProgrammeStore,
  PERSISTENCE_CONTRACT,
  type ProgrammeStore,
  type AppendResult,
  type StoredSnapshot,
} from "./store.js";
export { PostgresProgrammeStore, MemoryPg } from "./postgres-store.js";
export { PROGRAMME_POSTGRES_SCHEMA, type PgQueryable } from "./postgres-schema.js";
export { applyEvent, createInitialProjection, replay, replayFrom } from "./projector.js";
export {
  calculateAllStatuses,
  calculateSliceStatus,
  acceptanceSatisfied,
} from "./status.js";
export { calculateOutstandingWork, calculatePercentage } from "./outstanding.js";
export { generateControlSnapshot, projectSliceRecords } from "./snapshot.js";
export { ProgrammeEngine, createEngine } from "./engine.js";
export { corpusSeedEvents, loadCorpusBaseline, CORPUS_SEED_TIME, CT3_SEED_TIME } from "./seed.js";
export type {
  ControlSnapshot,
  DeclarationBaseline,
  OutstandingWork,
  ProgrammeProjection,
  SliceFacts,
  SliceWeights,
} from "./projection-types.js";
