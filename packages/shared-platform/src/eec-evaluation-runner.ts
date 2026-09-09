import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import { evaluationCorpusHash, S05A_EVALUATION_CASES, validateEvaluationCorpus } from "./eec-evaluation-corpus.js";
import { buildIsolatedEvaluationHarness, type EvaluationAdapters } from "./eec-evaluation-fixtures.js";
import { categoryForFailedObservation } from "./eec-evaluation-probes.js";
import {
  EVALUATION_CONTRACT_VERSION,
  EVALUATION_CORPUS_EDITION,
  EVALUATION_ORCHESTRATOR_VERSION,
  EVALUATION_PROJECTION_POLICY_VERSION,
  EVALUATION_PROVIDER_VERSION,
  ExecutableAiEvaluationRunSchema,
  AiEvaluationCaseResultSchema,
  AiEvaluationRunLeaseSchema,
  type AiEvaluationCaseResult,
  type AiEvaluationRunLease,
  EvaluationCaseDefinitionSchema,
  type EvaluationCaseDefinition,
  type ExecutableAiEvaluationRun,
  type ZeroToleranceFailure,
} from "./eec-evaluation-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION as typeof SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

export interface EvaluationRunnerInput {
  organisationId: string;
  requestedByPersonId: string;
  correlationId: string;
  idempotencyKey: string;
  applicationSha: string;
  now: string;
  adapters?: EvaluationAdapters;
  cases?: readonly EvaluationCaseDefinition[];
}

export function currentEvaluationVersions() {
  return {
    corpusEdition: EVALUATION_CORPUS_EDITION,
    corpusHash: evaluationCorpusHash(),
    orchestratorVersion: EVALUATION_ORCHESTRATOR_VERSION,
    providerVersion: EVALUATION_PROVIDER_VERSION,
    projectionPolicyVersion: EVALUATION_PROJECTION_POLICY_VERSION,
    evaluationContractVersion: EVALUATION_CONTRACT_VERSION,
  };
}

export function isExecutableEvaluationRun(run: { corpusHash?: string; evaluationContractVersion?: string; compatibilityStatus?: string }): boolean {
  return Boolean(run.corpusHash && run.evaluationContractVersion === EVALUATION_CONTRACT_VERSION && run.compatibilityStatus !== "LEGACY" && run.compatibilityStatus !== "INCOMPATIBLE");
}

function releaseLease(_snap: PlatformSnapshot, lease: AiEvaluationRunLease | undefined, now: string, status: AiEvaluationRunLease["status"]): void {
  if (!lease) return;
  lease.status = status;
  lease.releasedAt = now;
  lease.version += 1;
  lease.updatedAt = now;
}

function findActiveLease(snap: PlatformSnapshot, organisationId: string, corpusHash: string, now: string): AiEvaluationRunLease | undefined {
  return snap.aiEvaluationRunLeases.find((item) => {
    if (item.organisationId !== organisationId || item.corpusHash !== corpusHash) return false;
    if (item.status !== "ACTIVE") return false;
    if (item.expiresAt <= now) {
      item.status = "EXPIRED";
      item.releasedAt = now;
      item.version += 1;
      item.updatedAt = now;
      const run = snap.aiEvaluationRuns.find((row) => row.id === item.runId);
      if (run && (run.status === "QUEUED" || run.status === "RUNNING")) {
        run.status = "FAILED";
        run.completedAt = now;
        run.updatedAt = now;
        run.version += 1;
      }
      return false;
    }
    return true;
  });
}

export function requestS05AEvaluationOnSnap(snap: PlatformSnapshot, input: EvaluationRunnerInput): ExecutableAiEvaluationRun {
  if (input.cases) {
    for (const item of input.cases) EvaluationCaseDefinitionSchema.parse(item);
  } else {
    validateEvaluationCorpus();
  }
  const versions = currentEvaluationVersions();
  const existing = snap.aiEvaluationRuns.find(
    (item) =>
      item.organisationId === input.organisationId &&
      item.idempotencyKey === input.idempotencyKey &&
      item.corpusHash === versions.corpusHash &&
      item.orchestratorVersion === versions.orchestratorVersion &&
      item.providerVersion === versions.providerVersion &&
      item.projectionPolicyVersion === versions.projectionPolicyVersion,
  );
  if (existing && isExecutableEvaluationRun(existing)) {
    return existing as ExecutableAiEvaluationRun;
  }
  const active = findActiveLease(snap, input.organisationId, versions.corpusHash, input.now);
  if (active) {
    const current = snap.aiEvaluationRuns.find((item) => item.id === active.runId);
    if (current && isExecutableEvaluationRun(current)) return current as ExecutableAiEvaluationRun;
  }
  const cases = [...(input.cases ?? S05A_EVALUATION_CASES)].sort((left, right) => left.id.localeCompare(right.id));
  const run: ExecutableAiEvaluationRun = {
    id: randomUUID(),
    organisationId: input.organisationId,
    corpusEdition: versions.corpusEdition,
    corpusHash: versions.corpusHash,
    orchestratorVersion: versions.orchestratorVersion,
    providerVersion: versions.providerVersion,
    projectionPolicyVersion: versions.projectionPolicyVersion,
    evaluationContractVersion: versions.evaluationContractVersion,
    applicationSha: input.applicationSha,
    status: "QUEUED",
    caseCount: cases.length,
    passedCount: 0,
    failedCount: 0,
    errorCount: 0,
    zeroToleranceFailed: false,
    zeroToleranceFailures: [],
    requestedByPersonId: input.requestedByPersonId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    compatibilityStatus: "CURRENT",
    modelVersion: versions.providerVersion,
    metrics: {
      cases: String(cases.length),
      corpusHash: versions.corpusHash,
    },
    version: 1,
    ...stamp(input.now),
  };
  const parsed = ExecutableAiEvaluationRunSchema.parse(run);
  snap.aiEvaluationRuns.push(parsed);
  const lease = AiEvaluationRunLeaseSchema.parse({
    id: randomUUID(),
    organisationId: input.organisationId,
    corpusHash: versions.corpusHash,
    runId: parsed.id,
    status: "ACTIVE",
    acquiredAt: input.now,
    expiresAt: new Date(Date.parse(input.now) + 30 * 60 * 1000).toISOString(),
    version: 1,
    ...stamp(input.now),
  });
  snap.aiEvaluationRunLeases.push(lease);
  return parsed;
}

export async function executeS05AEvaluationOnSnap(
  snap: PlatformSnapshot,
  input: EvaluationRunnerInput & { runId?: string },
): Promise<ExecutableAiEvaluationRun> {
  const versions = currentEvaluationVersions();
  const run =
    (input.runId
      ? snap.aiEvaluationRuns.find((item) => item.id === input.runId)
      : requestS05AEvaluationOnSnap(snap, input)) ?? requestS05AEvaluationOnSnap(snap, input);
  const lease = findActiveLease(snap, input.organisationId, versions.corpusHash, input.now) ?? snap.aiEvaluationRunLeases.find((item) => item.runId === run.id);
  run.status = "RUNNING";
  run.startedAt = run.startedAt ?? input.now;
  run.updatedAt = input.now;
  run.version += 1;
  const cases = [...(input.cases ?? S05A_EVALUATION_CASES)].sort((left, right) => left.id.localeCompare(right.id));
  const zeroToleranceFailures: ZeroToleranceFailure[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let errorCount = 0;
  try {
    for (const caseDef of cases) {
      const startedAt = input.now;
      const harness = buildIsolatedEvaluationHarness(caseDef, input.adapters, input.now);
      const inputHash = harness.snapshotHash();
      let verdict: AiEvaluationCaseResult["verdict"] = "PASSED";
      let diagnosticSummary = "All expected observations were produced from isolated fixture state.";
      const observations = [];
      const failureCodes: string[] = [];
      const caseZero: ZeroToleranceFailure[] = [];
      try {
        for (const action of caseDef.actions) {
          await harness.execute(action);
        }
        for (const expected of caseDef.expected) {
          const observed = harness.observe(expected);
          observations.push(observed);
          if (!observed.passed) {
            verdict = "FAILED";
            failureCodes.push(observed.code);
            const category = categoryForFailedObservation(observed) ?? caseDef.zeroToleranceCategories[0];
            if (category) {
              const failure = {
                category,
                caseId: caseDef.id,
                observationCode: observed.code,
                summary: observed.observedSummary,
              };
              caseZero.push(failure);
              zeroToleranceFailures.push(failure);
            }
          }
        }
        if (verdict === "FAILED") diagnosticSummary = failureCodes.join(", ").slice(0, 400);
      } catch (error) {
        verdict = "ERROR";
        errorCount += 1;
        diagnosticSummary = error instanceof Error ? error.message.slice(0, 400) : "unexpected evaluation error";
        failureCodes.push("CASE_ERROR");
      }
      if (verdict === "PASSED") passedCount += 1;
      else if (verdict === "FAILED") failedCount += 1;
      const result = AiEvaluationCaseResultSchema.parse({
        id: randomUUID(),
        organisationId: input.organisationId,
        runId: run.id,
        caseId: caseDef.id,
        caseHash: caseDef.contentHash,
        family: caseDef.family,
        verdict,
        observations,
        failureCodes,
        zeroToleranceFailures: caseZero,
        diagnosticSummary,
        inputSnapshotHash: inputHash,
        outputSnapshotHash: harness.snapshotHash(),
        startedAt,
        completedAt: input.now,
        version: 1,
        ...stamp(input.now),
      });
      snap.aiEvaluationCaseResults.push(result);
    }
    run.passedCount = passedCount;
    run.failedCount = failedCount;
    run.errorCount = errorCount;
    run.zeroToleranceFailures = zeroToleranceFailures;
    run.zeroToleranceFailed = zeroToleranceFailures.length > 0 || failedCount > 0 || errorCount > 0;
    run.status = run.zeroToleranceFailed ? "FAILED" : passedCount === cases.length ? "PASSED" : "FAILED";
    run.completedAt = input.now;
    run.updatedAt = input.now;
    run.version += 1;
    run.metrics = {
      ...run.metrics,
      passed: String(passedCount),
      failed: String(failedCount),
      errors: String(errorCount),
      corpusHash: versions.corpusHash,
    };
    releaseLease(snap, lease, input.now, "RELEASED");
    return ExecutableAiEvaluationRunSchema.parse(run);
  } catch (error) {
    run.status = "FAILED";
    run.errorCount = errorCount + 1;
    run.zeroToleranceFailed = true;
    run.completedAt = input.now;
    run.updatedAt = input.now;
    run.version += 1;
    run.metrics = {
      ...run.metrics,
      error: error instanceof Error ? error.message.slice(0, 80) : "evaluation failed",
    };
    releaseLease(snap, lease, input.now, "RELEASED");
    return run as ExecutableAiEvaluationRun;
  }
}

export function evaluationIdempotencyBinding(input: {
  organisationId: string;
  corpusHash: string;
  orchestratorVersion: string;
  providerVersion: string;
  projectionPolicyVersion: string;
  idempotencyKey: string;
}): string {
  return exactHash(input);
}
