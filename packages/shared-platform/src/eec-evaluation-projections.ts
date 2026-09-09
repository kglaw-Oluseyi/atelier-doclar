import { currentEvaluationVersions, isExecutableEvaluationRun } from "./eec-evaluation-runner.js";
import {
  S05AEvaluationReadinessSchema,
  type EvaluationCaseVerdict,
  type S05AEvaluationReadiness,
} from "./eec-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";

export interface EvaluationRunSummary {
  id: string;
  status: string;
  corpusEdition: string;
  passedCount?: number;
  failedCount?: number;
  errorCount?: number;
  zeroToleranceFailed: boolean;
  completedAt?: string;
  compatibilityStatus?: string;
}

export interface EvaluationRunProjection {
  id: string;
  status: string;
  corpusEdition: string;
  orchestratorVersion?: string;
  providerVersion?: string;
  projectionPolicyVersion?: string;
  passedCount?: number;
  failedCount?: number;
  errorCount?: number;
  zeroToleranceFailed: boolean;
  zeroToleranceFailures: Array<{ category: string; caseId: string; observationCode: string; summary: string }>;
  caseResults: Array<{
    caseId: string;
    title?: string;
    verdict: EvaluationCaseVerdict | string;
    failureCodes: string[];
    diagnosticSummary: string;
    observations: Array<{
      code: string;
      expectedSummary: string;
      observedSummary: string;
      passed: boolean;
    }>;
  }>;
  correlationId?: string;
  corpusHash?: string;
}

function currentCompatibleRun(snap: PlatformSnapshot, organisationId: string) {
  const versions = currentEvaluationVersions();
  return [...snap.aiEvaluationRuns]
    .filter((item) => item.organisationId === organisationId)
    .reverse()
    .find((item) => {
      if (!isExecutableEvaluationRun(item)) return false;
      if (item.corpusEdition !== versions.corpusEdition) return false;
      if (item.corpusHash !== versions.corpusHash) return false;
      if (item.orchestratorVersion !== versions.orchestratorVersion) return false;
      if (item.providerVersion !== versions.providerVersion) return false;
      if (item.projectionPolicyVersion !== versions.projectionPolicyVersion) return false;
      if (item.evaluationContractVersion !== versions.evaluationContractVersion) return false;
      return true;
    });
}

export function s05aEvaluationReadinessFromSnap(snap: PlatformSnapshot, organisationId: string): S05AEvaluationReadiness {
  const versions = currentEvaluationVersions();
  const latest = [...snap.aiEvaluationRuns].reverse().find((item) => item.organisationId === organisationId);
  const compatible = currentCompatibleRun(snap, organisationId);
  const caseResults = compatible ? snap.aiEvaluationCaseResults.filter((item) => item.runId === compatible.id) : [];
  const base = {
    currentCorpusEdition: versions.corpusEdition,
    currentCorpusHash: versions.corpusHash,
    currentOrchestratorVersion: versions.orchestratorVersion,
    currentProviderVersion: versions.providerVersion,
    currentProjectionPolicyVersion: versions.projectionPolicyVersion,
  };
  if (!latest || !compatible) {
    const stalePass = latest?.status === "PASSED" && Boolean(latest.corpusHash) && latest.corpusHash !== versions.corpusHash;
    const legacyOrIncomplete =
      latest &&
      (latest.compatibilityStatus === "INCOMPATIBLE" ||
        latest.compatibilityStatus === "LEGACY" ||
        !latest.evaluationContractVersion ||
        !snap.aiEvaluationCaseResults.some((item) => item.runId === latest.id));
    const versionMismatch = Boolean(
      latest &&
        latest.status === "PASSED" &&
        latest.corpusHash === versions.corpusHash &&
        (latest.orchestratorVersion !== versions.orchestratorVersion ||
          latest.providerVersion !== versions.providerVersion ||
          latest.projectionPolicyVersion !== versions.projectionPolicyVersion ||
          latest.evaluationContractVersion !== versions.evaluationContractVersion),
    );
    const incompatible = Boolean(latest) && (Boolean(legacyOrIncomplete) || versionMismatch);
    if (stalePass) {
      return S05AEvaluationReadinessSchema.parse({
        ...base,
        status: "STALE",
        blocked: true,
        releaseReady: false,
        blockingReasons: ["The current evaluation corpus has changed. Rerun fixture assurance."],
        lastRunId: latest.id,
        lastRunAt: latest.completedAt ?? latest.updatedAt,
        passedCount: latest.passedCount,
        failedCount: latest.failedCount,
      });
    }
    if (incompatible && latest) {
      return S05AEvaluationReadinessSchema.parse({
        ...base,
        status: "INCOMPATIBLE",
        blocked: true,
        releaseReady: false,
        blockingReasons: ["The prior evaluation pass is incompatible with the current runtime versions."],
        lastRunId: latest.id,
        lastRunAt: latest.completedAt ?? latest.updatedAt,
      });
    }
    return S05AEvaluationReadinessSchema.parse({
      ...base,
      status: "UNRUN",
      blocked: true,
      releaseReady: false,
      blockingReasons: ["The current evaluation corpus has not been run."],
    });
  }
  if (compatible.status === "QUEUED" || compatible.status === "RUNNING") {
    return S05AEvaluationReadinessSchema.parse({
      ...base,
      status: "RUNNING",
      blocked: true,
      releaseReady: false,
      blockingReasons: ["An evaluation run is in progress."],
      lastRunId: compatible.id,
      lastRunAt: compatible.startedAt ?? compatible.updatedAt,
    });
  }
  if (compatible.status === "FAILED" || compatible.status === "CANCELLED" || compatible.zeroToleranceFailed || caseResults.length !== compatible.caseCount) {
    return S05AEvaluationReadinessSchema.parse({
      ...base,
      status: "FAILED",
      blocked: true,
      releaseReady: false,
      blockingReasons:
        caseResults.length !== compatible.caseCount
          ? ["The current evaluation run does not have a case result for every corpus case."]
          : compatible.zeroToleranceFailures?.length
            ? compatible.zeroToleranceFailures.map((item) => (typeof item === "string" ? item : item.summary)).slice(0, 8)
            : ["The current evaluation run failed."],
      lastRunId: compatible.id,
      lastRunAt: compatible.completedAt ?? compatible.updatedAt,
      passedCount: compatible.passedCount,
      failedCount: compatible.failedCount,
    });
  }
  if (compatible.status === "PASSED" && caseResults.length === compatible.caseCount && !compatible.zeroToleranceFailed) {
    return S05AEvaluationReadinessSchema.parse({
      ...base,
      status: "PASSED",
      blocked: false,
      releaseReady: true,
      blockingReasons: [],
      lastRunId: compatible.id,
      lastRunAt: compatible.completedAt ?? compatible.updatedAt,
      passedCount: compatible.passedCount,
      failedCount: compatible.failedCount,
    });
  }
  return S05AEvaluationReadinessSchema.parse({
    ...base,
    status: "UNRUN",
    blocked: true,
    releaseReady: false,
    blockingReasons: ["The current evaluation corpus has not been run."],
  });
}

export function s05aReadinessFromSnap(snap: PlatformSnapshot, organisationId: string) {
  const evaluation = s05aEvaluationReadinessFromSnap(snap, organisationId);
  return {
    interviewCorpusEdition: "s05a-interview-v2",
    evaluationCorpusEdition: evaluation.currentCorpusEdition,
    evaluationStatus: evaluation.status,
    evaluationBlocked: evaluation.blocked,
    releaseReady: evaluation.releaseReady,
    blockingReasons: evaluation.blockingReasons,
    calendarReady: snap.calendarDefinitions.some((item) => item.organisationId === organisationId && item.current),
  };
}

export function projectEvaluationRun(snap: PlatformSnapshot, organisationId: string, runId: string, safe = false): EvaluationRunProjection | undefined {
  const run = snap.aiEvaluationRuns.find((item) => item.id === runId && item.organisationId === organisationId);
  if (!run) return undefined;
  const cases = snap.aiEvaluationCaseResults.filter((item) => item.runId === run.id && item.organisationId === organisationId);
  return {
    id: run.id,
    status: run.status ?? "UNRUN",
    corpusEdition: run.corpusEdition,
    orchestratorVersion: run.orchestratorVersion,
    providerVersion: run.providerVersion,
    projectionPolicyVersion: run.projectionPolicyVersion,
    passedCount: run.passedCount,
    failedCount: run.failedCount,
    errorCount: run.errorCount,
    zeroToleranceFailed: run.zeroToleranceFailed,
    zeroToleranceFailures: (run.zeroToleranceFailures ?? []).map((item) =>
      typeof item === "string"
        ? { category: "FALSE_SUCCESS", caseId: "EVAL-S05A-UNKNOWN", observationCode: "LEGACY", summary: item }
        : item,
    ),
    caseResults: safe
      ? cases.map((item) => ({
          caseId: item.caseId,
          verdict: item.verdict,
          failureCodes: item.failureCodes,
          diagnosticSummary: item.diagnosticSummary,
          observations: [],
        }))
      : cases.map((item) => ({
          caseId: item.caseId,
          verdict: item.verdict,
          failureCodes: item.failureCodes,
          diagnosticSummary: item.diagnosticSummary,
          observations: item.observations.map((observation) => ({
            code: observation.code,
            expectedSummary: observation.expectedSummary,
            observedSummary: observation.observedSummary,
            passed: observation.passed,
          })),
        })),
    correlationId: safe ? undefined : run.correlationId,
    corpusHash: safe ? undefined : run.corpusHash,
  };
}

export function listEvaluationRunSummaries(snap: PlatformSnapshot, organisationId: string): EvaluationRunSummary[] {
  return snap.aiEvaluationRuns
    .filter((item) => item.organisationId === organisationId)
    .slice()
    .reverse()
    .map((item) => ({
      id: item.id,
      status: item.status ?? "UNRUN",
      corpusEdition: item.corpusEdition,
      passedCount: item.passedCount,
      failedCount: item.failedCount,
      errorCount: item.errorCount,
      zeroToleranceFailed: item.zeroToleranceFailed,
      completedAt: item.completedAt ?? item.executedAt,
      compatibilityStatus: item.compatibilityStatus,
    }));
}
