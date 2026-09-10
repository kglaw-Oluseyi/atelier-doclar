import { currentS05BEvaluationVersions } from "./risk-evaluation-runner.js";
import { S05B_EVALUATION_CASES } from "./risk-evaluation-corpus.js";
import type { PlatformSnapshot } from "./store.js";

export type S05BEvaluationReadiness = {
  evaluationStatus: "UNRUN" | "RUNNING" | "STALE" | "INCOMPATIBLE" | "FAILED" | "ERROR" | "PASSED";
  evaluationBlocked: boolean;
  releaseReady: boolean;
  blockingReasons: string[];
  corpusEdition: string;
  corpusHash: string;
  caseCount: number;
  lastRunId?: string;
};

export function s05bEvaluationReadinessFromSnap(snap: PlatformSnapshot, organisationId: string): S05BEvaluationReadiness {
  const versions = currentS05BEvaluationVersions();
  const latest = [...snap.riskEvaluationRuns].reverse().find((item) => item.organisationId === organisationId);
  const base = {
    corpusEdition: versions.corpusEdition,
    corpusHash: versions.corpusHash,
    caseCount: S05B_EVALUATION_CASES.length,
    lastRunId: latest?.id,
  };
  if (!latest) {
    return { ...base, evaluationStatus: "UNRUN", evaluationBlocked: true, releaseReady: false, blockingReasons: ["no current evaluation run"] };
  }
  if (latest.status === "RUNNING" || latest.status === "QUEUED") {
    return { ...base, evaluationStatus: "RUNNING", evaluationBlocked: true, releaseReady: false, blockingReasons: ["evaluation is running"] };
  }
  if (latest.corpusHash !== versions.corpusHash || latest.corpusEdition !== versions.corpusEdition) {
    return { ...base, evaluationStatus: "STALE", evaluationBlocked: true, releaseReady: false, blockingReasons: ["corpus edition or hash changed"] };
  }
  const rows = snap.riskEvaluationCaseResults.filter((item) => item.runId === latest.id);
  if (rows.length !== S05B_EVALUATION_CASES.length || latest.evaluationContractVersion !== versions.evaluationContractVersion) {
    return { ...base, evaluationStatus: "INCOMPATIBLE", evaluationBlocked: true, releaseReady: false, blockingReasons: ["missing case rows or contract mismatch"] };
  }
  if (latest.status === "ERROR" || latest.errorCount > 0) {
    return { ...base, evaluationStatus: "ERROR", evaluationBlocked: true, releaseReady: false, blockingReasons: ["evaluation error"] };
  }
  if (latest.status === "FAILED" || latest.failedCount > 0 || latest.zeroToleranceFailed) {
    return { ...base, evaluationStatus: "FAILED", evaluationBlocked: true, releaseReady: false, blockingReasons: ["failed or zero-tolerance case"] };
  }
  if (latest.status === "PASSED" && latest.passedCount === S05B_EVALUATION_CASES.length) {
    return { ...base, evaluationStatus: "PASSED", evaluationBlocked: false, releaseReady: true, blockingReasons: [] };
  }
  return { ...base, evaluationStatus: "INCOMPATIBLE", evaluationBlocked: true, releaseReady: false, blockingReasons: ["run is not a complete current pass"] };
}
