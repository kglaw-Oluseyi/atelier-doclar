import {
  ProgrammeEventError,
  createEngine,
  loadCorpusBaseline,
  MemoryProgrammeStore,
  corpusSeedEvents,
  CORPUS_SEED_TIME,
  parseProgrammeEvent,
  type ControlSnapshot,
  type ProgrammeProjection,
} from "@maison-doclar/programme-domain";
import { buildReleaseCandidate } from "./authority.js";
import { buildRoadmap } from "./roadmap.js";
import { answerQuestion } from "./rag.js";

export const OPS_PROVIDER = {
  monitoring: "in-process",
  backup: "verified-snapshot-restore",
  productionHosting: "INTENDED_RAILWAY",
  railwayProject: "atelier-doclar",
  productionAuthorised: false,
} as const;

export type FailureKind =
  | "github-unavailable"
  | "ci-unavailable"
  | "rag-unavailable"
  | "stale-snapshot"
  | "corrupt-event"
  | "inaccessible-evidence"
  | "permission-failure"
  | "partial-data"
  | "restore";

export interface OpsHealth {
  controlTower: "OK" | "DEGRADED" | "ERROR";
  applicationAlive: true;
  eventOsImpliedFailed: false;
  eventDayImpliedFailed: false;
  github: "UNKNOWN" | "UNAVAILABLE" | "SYNTHETIC" | "AVAILABLE";
  githubIngestion: "AVAILABLE" | "SYNTHETIC" | "UNAVAILABLE" | "UNCONFIGURED";
  webhook: "CONFIGURED" | "UNCONFIGURED";
  persistence: "AVAILABLE" | "LOCAL_ONLY" | "UNAVAILABLE";
  programmeData: "AVAILABLE" | "UNAVAILABLE";
  ci: "UNKNOWN" | "UNAVAILABLE" | "FRESH" | "STALE";
  rag: "AVAILABLE" | "UNAVAILABLE" | "DEGRADED";
  snapshot: "PRESENT" | "STALE" | "INVALID";
  productionAuthorised: false;
  implementationComplete: true;
  productionApproved: false;
  unsignedProtectedGates: string[];
  recovery: string;
  ready: boolean;
}

export function assessHealth(input: {
  snapshot: ControlSnapshot;
  github?: "UNKNOWN" | "UNAVAILABLE" | "SYNTHETIC" | "AVAILABLE";
  githubIngestion?: OpsHealth["githubIngestion"];
  webhook?: "CONFIGURED" | "UNCONFIGURED";
  persistence?: OpsHealth["persistence"];
  programmeData?: "AVAILABLE" | "UNAVAILABLE";
  ci?: "UNKNOWN" | "UNAVAILABLE" | "FRESH" | "STALE";
  ragUnavailable?: boolean;
  stale?: boolean;
  invalid?: boolean;
  partial?: boolean;
  productionReady?: boolean;
}): OpsHealth {
  const github = input.github ?? "UNKNOWN";
  const ci = input.ci ?? "UNKNOWN";
  const rag = input.ragUnavailable ? "UNAVAILABLE" : "AVAILABLE";
  const snapshot = input.invalid ? "INVALID" : input.stale ? "STALE" : "PRESENT";
  const programmeData = input.programmeData ?? (input.snapshot.slices.length > 0 ? "AVAILABLE" : "UNAVAILABLE");
  const persistence = input.persistence ?? "LOCAL_ONLY";
  const webhook = input.webhook ?? "UNCONFIGURED";
  const githubIngestion = input.githubIngestion ?? (github === "UNAVAILABLE" ? "UNAVAILABLE" : "SYNTHETIC");
  const unsigned = input.snapshot.gates.filter((gate) => gate.status !== "APPROVED").map((gate) => gate.id);
  const candidate = buildReleaseCandidate({
    accepted: Object.values(input.snapshot.statuses).filter((status) => status === "ACCEPTED").length,
    unsignedGates: unsigned.length,
    blockingItems: input.snapshot.openItems.filter((item) => item.blocker && item.status === "OPEN").length,
  });
  const degraded =
    github === "UNAVAILABLE" ||
    ci === "UNAVAILABLE" ||
    rag === "UNAVAILABLE" ||
    snapshot !== "PRESENT" ||
    programmeData === "UNAVAILABLE" ||
    input.partial === true ||
    !candidate.productionAuthorised;
  const ready = input.productionReady === true && !input.invalid && programmeData === "AVAILABLE" && persistence !== "UNAVAILABLE";
  return {
    controlTower: input.invalid ? "ERROR" : degraded ? "DEGRADED" : "OK",
    applicationAlive: true,
    eventOsImpliedFailed: false,
    eventDayImpliedFailed: false,
    github,
    githubIngestion,
    webhook,
    persistence,
    programmeData,
    ci,
    rag,
    snapshot,
    productionAuthorised: false,
    implementationComplete: true,
    productionApproved: false,
    unsignedProtectedGates: unsigned,
    recovery: "Restore the last verified snapshot with reconstructFromSnapshot and re-run programme:project.",
    ready,
  };
}

export function classifyFailure(kind: FailureKind, snapshot: ControlSnapshot): OpsHealth {
  const base = { snapshot };
  if (kind === "github-unavailable") return assessHealth({ ...base, github: "UNAVAILABLE" });
  if (kind === "ci-unavailable") return assessHealth({ ...base, ci: "UNAVAILABLE" });
  if (kind === "rag-unavailable") return assessHealth({ ...base, ragUnavailable: true });
  if (kind === "stale-snapshot") return assessHealth({ ...base, stale: true });
  if (kind === "corrupt-event" || kind === "inaccessible-evidence") return assessHealth({ ...base, invalid: true });
  if (kind === "permission-failure") return assessHealth({ ...base, partial: true });
  if (kind === "partial-data") return assessHealth({ ...base, partial: true });
  return assessHealth(base);
}

export function rejectCorruptEvent(input: unknown): { rejected: true; code: string } {
  try {
    parseProgrammeEvent(input);
    return { rejected: true, code: "UNEXPECTED_ACCEPT" };
  } catch (error) {
    if (error instanceof ProgrammeEventError) return { rejected: true, code: error.code };
    return { rejected: true, code: "INVALID" };
  }
}

export function restoreVerifiedSnapshot(): {
  restored: ProgrammeProjection;
  matchesVerifiedPosition: boolean;
} {
  const { baseline } = loadCorpusBaseline();
  const store = new MemoryProgrammeStore();
  const engine = createEngine(store, baseline, CORPUS_SEED_TIME);
  for (const event of corpusSeedEvents()) engine.append(event);
  const snap = engine.snapshot({ snapshotId: "SNAP-CT9-VERIFIED", generatedAt: CORPUS_SEED_TIME, source: "ops-test" });
  const restored = engine.reconstructFromSnapshot("SNAP-CT9-VERIFIED", snap.sourceEventPosition);
  return {
    restored,
    matchesVerifiedPosition: restored.eventPosition === snap.sourceEventPosition,
  };
}

export function roadmapSurvivesOpsFailure(snapshot: ControlSnapshot): boolean {
  const rag = answerQuestion({ question: "roadmap", role: "reader", snapshot, unavailable: true });
  const roadmap = buildRoadmap(snapshot);
  return rag.state === "degraded" && roadmap.nodes.length > 0 && roadmap.cycles.length === 0;
}
