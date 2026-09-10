import { randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { S05B_EVALUATION_CASES, s05bEvaluationCorpusHash, validateS05BEvaluationCorpus } from "./risk-evaluation-corpus.js";
import { detectUnsafeFromObservations, executeS05BCase, type S05BEvaluationAdapters } from "./risk-evaluation-fixtures.js";
import {
  S05B_EVALUATION_CONTRACT_VERSION,
  S05B_EVALUATION_CORPUS_EDITION,
  S05B_EVALUATION_ORCHESTRATOR_VERSION,
  S05B_EVALUATION_PROJECTION_POLICY_VERSION,
  S05B_EVALUATION_PROVIDER_VERSION,
  type RiskObservation,
  type S05BAssertion,
} from "./risk-evaluation-schemas.js";
import { RiskEvaluationCaseResultSchema, RiskEvaluationRunLeaseSchema, RiskEvaluationRunSchema, type RiskEvaluationRun } from "./risk-schemas.js";
import type { PlatformSnapshot } from "./store.js";

function stamp(now: string) {
  return { schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now };
}

export function currentS05BEvaluationVersions() {
  return {
    corpusEdition: S05B_EVALUATION_CORPUS_EDITION,
    corpusHash: s05bEvaluationCorpusHash(),
    orchestratorVersion: S05B_EVALUATION_ORCHESTRATOR_VERSION,
    providerVersion: S05B_EVALUATION_PROVIDER_VERSION,
    projectionPolicyVersion: S05B_EVALUATION_PROJECTION_POLICY_VERSION,
    evaluationContractVersion: S05B_EVALUATION_CONTRACT_VERSION,
  };
}

export function assertionHolds(expected: S05BAssertion, observations: readonly RiskObservation[]): boolean {
  if (expected.kind === "COMMAND_DENIAL") {
    return observations.some((item) => item.kind === "COMMAND_DENIAL" && item.code === expected.code && item.didDataChange === expected.didDataChange);
  }
  if (expected.kind === "RECORD_COUNT") {
    return observations.some(
      (item) =>
        item.kind === "RECORD_COUNT" &&
        item.collection === expected.collection &&
        (expected.eq === undefined || item.count === expected.eq) &&
        (expected.min === undefined || item.count >= expected.min),
    );
  }
  if (expected.kind === "STATE") {
    return observations.some((item) => item.kind === "STATE" && item.state === expected.state);
  }
  if (expected.kind === "EXTERNAL_EFFECT_COUNT") {
    return observations.some((item) => item.kind === "EXTERNAL_EFFECT_COUNT" && item.effect === expected.effect && item.count === expected.count);
  }
  if (expected.kind === "PROJECTION_OMITS") {
    return observations.some((item) => item.kind === "PROJECTION_OMITS" && item.path === expected.path && (expected.forbiddenEmpty ? item.forbiddenValuesFound.length === 0 : true));
  }
  if (expected.kind === "BUDGET_RESULT") {
    return observations.some(
      (item) =>
        item.kind === "BUDGET_RESULT" &&
        (expected.quantifiedMinor === undefined || item.quantifiedMinor === expected.quantifiedMinor) &&
        (expected.unquantifiedMin === undefined || item.unquantified >= expected.unquantifiedMin),
    );
  }
  if (expected.kind === "CONTENT_BYTES") {
    return observations.some((item) => item.kind === "CONTENT_BYTES" && item.mediaType === expected.mediaType && (expected.forbiddenEmpty ? item.forbiddenValuesFound.length === 0 : true));
  }
  if (expected.kind === "INVOCATIONS") {
    return observations.some(
      (item) =>
        item.kind === "INVOCATIONS" &&
        item.action === expected.action &&
        (expected.sameIds ? item.firstResultId === item.secondResultId : true) &&
        item.secondApplication === expected.secondApplication &&
        item.firstGeneratedAt === item.secondGeneratedAt &&
        item.firstRecordCount === item.secondRecordCount,
    );
  }
  if (expected.kind === "UNICODE") {
    return observations.some(
      (item) =>
        item.kind === "UNICODE" &&
        item.stored.includes(expected.requiredSubstring) &&
        item.requiredGlyphsPresent &&
        (expected.storedMustBeNfc ? item.nfcEqual : true) &&
        (expected.inputWasDecomposed ? item.input !== item.stored && item.input.normalize("NFD") === item.input : true),
    );
  }
  if (expected.kind === "CLASSIFICATION") {
    return observations.some((item) => item.kind === "CLASSIFICATION" && item.classification === expected.classification);
  }
  if (expected.kind === "TRANSITION") {
    return observations.some((item) => item.kind === "TRANSITION" && item.to === expected.to && item.allowed === expected.allowed);
  }
  if (expected.kind === "HASH") {
    return observations.some((item) => item.kind === "HASH" && item.name === expected.name && item.matches === expected.matches);
  }
  if (expected.kind === "SCOPE") {
    return observations.some((item) => item.kind === "SCOPE" && item.leaked === expected.leaked);
  }
  return false;
}

export function executeS05BEvaluationOnSnap(
  snap: PlatformSnapshot,
  input: {
    organisationId: string;
    requestedByPersonId: string;
    correlationId: string;
    idempotencyKey: string;
    applicationSha: string;
    now: string;
    adapters?: S05BEvaluationAdapters;
  },
): RiskEvaluationRun {
  validateS05BEvaluationCorpus();
  const versions = currentS05BEvaluationVersions();
  const existing = snap.riskEvaluationRuns.find(
    (item) => item.organisationId === input.organisationId && item.idempotencyKey === input.idempotencyKey && item.corpusHash === versions.corpusHash,
  );
  if (existing && existing.status !== "QUEUED" && existing.status !== "RUNNING") return existing;
  const run = RiskEvaluationRunSchema.parse({
    id: existing?.id ?? randomUUID(),
    organisationId: input.organisationId,
    ...versions,
    applicationSha: input.applicationSha,
    status: "RUNNING",
    caseCount: S05B_EVALUATION_CASES.length,
    passedCount: 0,
    failedCount: 0,
    errorCount: 0,
    zeroToleranceFailed: false,
    requestedByPersonId: input.requestedByPersonId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    version: 1,
    ...stamp(input.now),
  });
  if (!existing) snap.riskEvaluationRuns.push(run);
  else Object.assign(existing, run);
  snap.riskEvaluationRunLeases.push(
    RiskEvaluationRunLeaseSchema.parse({
      id: randomUUID(),
      organisationId: input.organisationId,
      corpusHash: versions.corpusHash,
      runId: run.id,
      status: "ACTIVE",
      acquiredAt: input.now,
      expiresAt: new Date(Date.parse(input.now) + 30 * 60 * 1000).toISOString(),
      version: 1,
      ...stamp(input.now),
    }),
  );
  let passed = 0;
  let failed = 0;
  let errorCount = 0;
  let zeroToleranceFailed = false;
  for (const caseDef of S05B_EVALUATION_CASES) {
    const observations = executeS05BCase(caseDef, input.adapters);
    const adapterHits = detectUnsafeFromObservations(observations);
    const compared = caseDef.expected.map((item) => ({
      kind: item.kind,
      passed: assertionHolds(item, observations),
      detail: JSON.stringify(item).slice(0, 400),
    }));
    const verdict = adapterHits.length || compared.some((item) => !item.passed) ? "FAILED" : compared.length ? "PASSED" : "ERROR";
    if (verdict === "PASSED") passed += 1;
    else if (verdict === "ERROR") errorCount += 1;
    else failed += 1;
    if (adapterHits.length || (verdict === "FAILED" && caseDef.zeroToleranceCategories.length)) zeroToleranceFailed = true;
    snap.riskEvaluationCaseResults.push(
      RiskEvaluationCaseResultSchema.parse({
        id: randomUUID(),
        organisationId: input.organisationId,
        runId: run.id,
        caseId: caseDef.id,
        family: caseDef.family,
        verdict,
        observations: compared,
        diagnosticSummary: compared.map((item) => `${item.kind}:${item.passed ? "pass" : "fail"}`).join("; ") || "no observations",
        zeroToleranceCategories: caseDef.zeroToleranceCategories,
        version: 1,
        ...stamp(input.now),
      }),
    );
  }
  const status = errorCount ? "ERROR" : failed || zeroToleranceFailed ? "FAILED" : "PASSED";
  Object.assign(run, {
    status,
    passedCount: passed,
    failedCount: failed,
    errorCount,
    zeroToleranceFailed,
    completedAt: input.now,
    updatedAt: input.now,
    version: run.version + 1,
  });
  const lease = snap.riskEvaluationRunLeases.find((item) => item.runId === run.id && item.status === "ACTIVE");
  if (lease) {
    lease.status = "RELEASED";
    lease.releasedAt = input.now;
    lease.updatedAt = input.now;
    lease.version += 1;
  }
  return run;
}
