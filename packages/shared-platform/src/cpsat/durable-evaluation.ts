/**
 * M6D — event-scoped durable CP-SAT seating evaluation.
 * Operational Overview/reload authority; not the retired org-scoped seating_v2 corpus.
 */
import { createHash, randomUUID } from "node:crypto";
import type { PgQueryable } from "../postgres-schema.js";
import { CPSAT_MODEL_VERSION, CPSAT_REQUEST_CONTRACT } from "./contract.js";
import { findCompatibleReadyWorkers } from "./worker-registry.js";

export const CPSAT_SEATING_EVALUATION_VERSION = "cpsat-seating-eval-v1" as const;
export const CPSAT_SEATING_EVALUATION_CORPUS_EDITION = "cpsat-event-eval-v1" as const;

export const CPSAT_SEATING_EVAL_CASE_IDS = [
  "LAYOUT_BINDING_ACTIVE",
  "NO_LEGACY_CURRENT_PUBLICATION",
  "AUTHORITY_POINTER_CONSISTENT",
  "ADOPTION_STATUS_CURRENT",
  "RUN_ADOPTED_WHEN_CURRENT",
  "ASSIGNMENTS_PRESENT_WHEN_ADOPTED",
  "ASSIGNMENTS_NO_DUPLICATE_GUESTS",
  "ASSIGNMENTS_NO_DUPLICATE_POSITIONS",
  "WORKER_READY",
  "EVIDENCE_GRADE_WHEN_OPTIMAL",
] as const;

export type CpsatSeatingEvalCaseId = (typeof CPSAT_SEATING_EVAL_CASE_IDS)[number];

export type CpsatSeatingEvalCaseStatus = "PASSED" | "FAILED" | "ERROR";
export type CpsatSeatingEvalStatus = "PASSED" | "FAILED" | "ERROR";
export type CpsatSeatingReadinessResult = "RELEASE_READY" | "NOT_RELEASE_READY" | "BLOCKED";

export type CpsatSeatingEvalCaseResult = {
  caseId: CpsatSeatingEvalCaseId;
  status: CpsatSeatingEvalCaseStatus;
  safeFailureCode: string | null;
  detail: Record<string, unknown>;
};

export type CpsatSeatingEvaluationRecord = {
  id: string;
  organisationId: string;
  eventId: string;
  authorityInputHash: string;
  evaluationVersion: string;
  actorPersonId: string;
  actorRoleKey: string;
  status: CpsatSeatingEvalStatus;
  caseCount: number;
  passedCount: number;
  failedCount: number;
  safeFailureCodes: string[];
  readinessResult: CpsatSeatingReadinessResult;
  correlationId: string;
  idempotencyKey: string | null;
  adoptionId: string | null;
  runId: string | null;
  workerReadyCount: number;
  evaluatedAt: string;
  corpusEdition: string;
  cases: CpsatSeatingEvalCaseResult[];
};

export type CpsatSeatingEvaluationFacts = {
  organisationId: string;
  eventId: string;
  layoutBindingActive: boolean;
  layoutBindingCount: number;
  legacyCurrentPublicationCount: number;
  authorityAdoptionId: string | null;
  currentAdoption: {
    id: string;
    runId: string;
    status: string;
    productResult: string | null;
    evidenceGrade: string | null;
    assignmentHash: string;
  } | null;
  adoptedRun: {
    id: string;
    status: string;
    productResult: string | null;
    evidenceGrade: string | null;
  } | null;
  assignments: Array<{
    guestToken: string;
    positionToken: string | null;
    tableToken: string | null;
    state: string;
  }>;
  workerReadyCount: number;
};

function pass(caseId: CpsatSeatingEvalCaseId, detail: Record<string, unknown> = {}): CpsatSeatingEvalCaseResult {
  return { caseId, status: "PASSED", safeFailureCode: null, detail };
}

function fail(
  caseId: CpsatSeatingEvalCaseId,
  safeFailureCode: string,
  detail: Record<string, unknown> = {},
): CpsatSeatingEvalCaseResult {
  return { caseId, status: "FAILED", safeFailureCode, detail };
}

export function authorityInputHashFromFacts(facts: CpsatSeatingEvaluationFacts): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        eventId: facts.eventId,
        layoutBindingActive: facts.layoutBindingActive,
        layoutBindingCount: facts.layoutBindingCount,
        legacyCurrentPublicationCount: facts.legacyCurrentPublicationCount,
        authorityAdoptionId: facts.authorityAdoptionId,
        adoption: facts.currentAdoption,
        run: facts.adoptedRun,
        assignmentCount: facts.assignments.length,
        seated: facts.assignments.filter((a) => a.state === "SEATED").length,
        workerReadyCount: facts.workerReadyCount,
        model: CPSAT_MODEL_VERSION,
        contract: CPSAT_REQUEST_CONTRACT,
        version: CPSAT_SEATING_EVALUATION_VERSION,
      }),
    )
    .digest("hex");
}

export function evaluateCpsatSeatingFacts(facts: CpsatSeatingEvaluationFacts): {
  cases: CpsatSeatingEvalCaseResult[];
  status: CpsatSeatingEvalStatus;
  readinessResult: CpsatSeatingReadinessResult;
  safeFailureCodes: string[];
  passedCount: number;
  failedCount: number;
  authorityInputHash: string;
} {
  const cases: CpsatSeatingEvalCaseResult[] = [];

  cases.push(
    facts.layoutBindingActive
      ? pass("LAYOUT_BINDING_ACTIVE", { count: facts.layoutBindingCount })
      : fail("LAYOUT_BINDING_ACTIVE", "LAYOUT_BINDING_ABSENT", { count: facts.layoutBindingCount }),
  );

  cases.push(
    facts.legacyCurrentPublicationCount === 0
      ? pass("NO_LEGACY_CURRENT_PUBLICATION")
      : fail("NO_LEGACY_CURRENT_PUBLICATION", "LEGACY_CURRENT_PUBLICATION_PRESENT", {
          count: facts.legacyCurrentPublicationCount,
        }),
  );

  const pointerId = facts.authorityAdoptionId;
  const adoption = facts.currentAdoption;
  if (!pointerId && !adoption) {
    cases.push(pass("AUTHORITY_POINTER_CONSISTENT", { state: "EMPTY" }));
  } else if (pointerId && adoption && pointerId === adoption.id) {
    cases.push(pass("AUTHORITY_POINTER_CONSISTENT", { adoptionId: adoption.id }));
  } else {
    cases.push(
      fail("AUTHORITY_POINTER_CONSISTENT", "AUTHORITY_POINTER_MISMATCH", {
        pointerId,
        adoptionId: adoption?.id ?? null,
      }),
    );
  }

  if (!adoption) {
    cases.push(pass("ADOPTION_STATUS_CURRENT", { state: "NO_ADOPTION" }));
    cases.push(pass("RUN_ADOPTED_WHEN_CURRENT", { state: "NO_ADOPTION" }));
    cases.push(pass("ASSIGNMENTS_PRESENT_WHEN_ADOPTED", { state: "NO_ADOPTION" }));
    cases.push(pass("ASSIGNMENTS_NO_DUPLICATE_GUESTS", { state: "NO_ADOPTION" }));
    cases.push(pass("ASSIGNMENTS_NO_DUPLICATE_POSITIONS", { state: "NO_ADOPTION" }));
    cases.push(pass("EVIDENCE_GRADE_WHEN_OPTIMAL", { state: "NO_ADOPTION" }));
  } else {
    cases.push(
      adoption.status === "CURRENT"
        ? pass("ADOPTION_STATUS_CURRENT", { adoptionId: adoption.id })
        : fail("ADOPTION_STATUS_CURRENT", "ADOPTION_NOT_CURRENT", { status: adoption.status }),
    );

    const run = facts.adoptedRun;
    cases.push(
      run && run.id === adoption.runId && run.status === "ADOPTED"
        ? pass("RUN_ADOPTED_WHEN_CURRENT", { runId: run.id })
        : fail("RUN_ADOPTED_WHEN_CURRENT", "RUN_NOT_ADOPTED", {
            runId: adoption.runId,
            status: run?.status ?? null,
          }),
    );

    cases.push(
      facts.assignments.length > 0
        ? pass("ASSIGNMENTS_PRESENT_WHEN_ADOPTED", { count: facts.assignments.length })
        : fail("ASSIGNMENTS_PRESENT_WHEN_ADOPTED", "ASSIGNMENTS_MISSING", { runId: adoption.runId }),
    );

    const guests = facts.assignments.map((a) => a.guestToken);
    const dupGuests = guests.filter((g, i) => guests.indexOf(g) !== i);
    cases.push(
      dupGuests.length === 0
        ? pass("ASSIGNMENTS_NO_DUPLICATE_GUESTS")
        : fail("ASSIGNMENTS_NO_DUPLICATE_GUESTS", "DUPLICATE_GUEST_ASSIGNMENT", { duplicates: [...new Set(dupGuests)] }),
    );

    const positions = facts.assignments
      .filter((a) => a.state === "SEATED" && a.positionToken)
      .map((a) => a.positionToken as string);
    const dupPositions = positions.filter((p, i) => positions.indexOf(p) !== i);
    cases.push(
      dupPositions.length === 0
        ? pass("ASSIGNMENTS_NO_DUPLICATE_POSITIONS")
        : fail("ASSIGNMENTS_NO_DUPLICATE_POSITIONS", "DUPLICATE_POSITION_ASSIGNMENT", {
            duplicates: [...new Set(dupPositions)],
          }),
    );

    const optimal = adoption.productResult === "OPTIMAL" || facts.adoptedRun?.productResult === "OPTIMAL";
    const grade = adoption.evidenceGrade ?? facts.adoptedRun?.evidenceGrade ?? null;
    cases.push(
      !optimal || (grade != null && grade.length > 0)
        ? pass("EVIDENCE_GRADE_WHEN_OPTIMAL", { productResult: adoption.productResult, evidenceGrade: grade })
        : fail("EVIDENCE_GRADE_WHEN_OPTIMAL", "OPTIMAL_WITHOUT_EVIDENCE_GRADE", {
            productResult: adoption.productResult,
          }),
    );
  }

  cases.push(
    facts.workerReadyCount > 0
      ? pass("WORKER_READY", { count: facts.workerReadyCount })
      : fail("WORKER_READY", "NO_READY_WORKER", { count: facts.workerReadyCount }),
  );

  const failed = cases.filter((c) => c.status !== "PASSED");
  const safeFailureCodes = [...new Set(failed.map((c) => c.safeFailureCode).filter(Boolean) as string[])].sort();
  const status: CpsatSeatingEvalStatus = failed.some((c) => c.status === "ERROR")
    ? "ERROR"
    : failed.length > 0
      ? "FAILED"
      : "PASSED";
  const readinessResult: CpsatSeatingReadinessResult =
    status === "PASSED" && facts.layoutBindingActive
      ? facts.currentAdoption
        ? "RELEASE_READY"
        : "NOT_RELEASE_READY"
      : status === "PASSED"
        ? "NOT_RELEASE_READY"
        : "BLOCKED";

  return {
    cases,
    status,
    readinessResult,
    safeFailureCodes,
    passedCount: cases.filter((c) => c.status === "PASSED").length,
    failedCount: failed.length,
    authorityInputHash: authorityInputHashFromFacts(facts),
  };
}

export async function loadCpsatSeatingEvaluationFacts(
  client: PgQueryable,
  input: {
    organisationId: string;
    eventId: string;
    layoutBindingActive: boolean;
    layoutBindingCount: number;
  },
): Promise<CpsatSeatingEvaluationFacts> {
  const legacy = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM seating_v2_publications
     WHERE organisation_id = $1 AND event_id = $2 AND status = 'CURRENT'`,
    [input.organisationId, input.eventId],
  );
  const pointer = await client.query<{ current_adoption_id: string | null }>(
    `SELECT current_adoption_id FROM cpsat_solver_authority_pointers WHERE event_id = $1`,
    [input.eventId],
  );
  const authorityAdoptionId = pointer.rows[0]?.current_adoption_id ?? null;
  let currentAdoption: CpsatSeatingEvaluationFacts["currentAdoption"] = null;
  let adoptedRun: CpsatSeatingEvaluationFacts["adoptedRun"] = null;
  let assignments: CpsatSeatingEvaluationFacts["assignments"] = [];

  if (authorityAdoptionId) {
    const adopt = await client.query<{
      id: string;
      run_id: string;
      status: string;
      product_result: string | null;
      evidence_grade: string | null;
      assignment_hash: string;
    }>(
      `SELECT id, run_id, status, product_result, evidence_grade, assignment_hash
       FROM cpsat_solver_adoptions WHERE id = $1 AND event_id = $2 LIMIT 1`,
      [authorityAdoptionId, input.eventId],
    );
    const row = adopt.rows[0];
    if (row) {
      currentAdoption = {
        id: row.id,
        runId: row.run_id,
        status: row.status,
        productResult: row.product_result,
        evidenceGrade: row.evidence_grade,
        assignmentHash: row.assignment_hash,
      };
      const run = await client.query<{
        id: string;
        status: string;
        product_result: string | null;
        evidence_grade: string | null;
      }>(`SELECT id, status, product_result, evidence_grade FROM cpsat_solver_runs WHERE id = $1 LIMIT 1`, [row.run_id]);
      const runRow = run.rows[0];
      if (runRow) {
        adoptedRun = {
          id: runRow.id,
          status: runRow.status,
          productResult: runRow.product_result,
          evidenceGrade: runRow.evidence_grade,
        };
      }
      const asg = await client.query<{
        guest_token: string;
        position_token: string | null;
        table_token: string | null;
        state: string;
      }>(
        `SELECT guest_token, position_token, table_token, state
         FROM cpsat_solver_assignments WHERE run_id = $1`,
        [row.run_id],
      );
      assignments = asg.rows.map((a) => ({
        guestToken: a.guest_token,
        positionToken: a.position_token,
        tableToken: a.table_token,
        state: a.state,
      }));
    }
  }

  let workerReadyCount = 0;
  try {
    const ready = await findCompatibleReadyWorkers(client, {
      modelVersion: CPSAT_MODEL_VERSION,
      contractVersion: CPSAT_REQUEST_CONTRACT,
    });
    workerReadyCount = ready.length;
  } catch {
    workerReadyCount = 0;
  }

  return {
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutBindingActive: input.layoutBindingActive,
    layoutBindingCount: input.layoutBindingCount,
    legacyCurrentPublicationCount: Number(legacy.rows[0]?.n ?? 0),
    authorityAdoptionId,
    currentAdoption,
    adoptedRun,
    assignments,
    workerReadyCount,
  };
}

export async function persistCpsatSeatingEvaluation(
  client: PgQueryable,
  input: {
    organisationId: string;
    eventId: string;
    actorPersonId: string;
    actorRoleKey: string;
    correlationId: string;
    idempotencyKey?: string | null;
    evaluatedAt: string;
    facts: CpsatSeatingEvaluationFacts;
  },
): Promise<CpsatSeatingEvaluationRecord> {
  if (input.idempotencyKey) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM cpsat_seating_evaluations
       WHERE event_id = $1 AND idempotency_key = $2
       LIMIT 1`,
      [input.eventId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      const loaded = await loadLatestCpsatSeatingEvaluation(client, input.eventId, existing.rows[0].id);
      if (loaded) return loaded;
    }
  }

  const computed = evaluateCpsatSeatingFacts(input.facts);
  const id = randomUUID();
  await client.query(
    `INSERT INTO cpsat_seating_evaluations (
      id, organisation_id, event_id, authority_input_hash, evaluation_version,
      actor_person_id, actor_role_key, status, case_count, passed_count, failed_count,
      safe_failure_codes, readiness_result, correlation_id, idempotency_key,
      adoption_id, run_id, worker_ready_count, evaluated_at, created_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$19
    )`,
    [
      id,
      input.organisationId,
      input.eventId,
      computed.authorityInputHash,
      CPSAT_SEATING_EVALUATION_VERSION,
      input.actorPersonId,
      input.actorRoleKey,
      computed.status,
      computed.cases.length,
      computed.passedCount,
      computed.failedCount,
      JSON.stringify(computed.safeFailureCodes),
      computed.readinessResult,
      input.correlationId,
      input.idempotencyKey ?? null,
      input.facts.currentAdoption?.id ?? null,
      input.facts.currentAdoption?.runId ?? input.facts.adoptedRun?.id ?? null,
      input.facts.workerReadyCount,
      input.evaluatedAt,
    ],
  );

  for (const item of computed.cases) {
    await client.query(
      `INSERT INTO cpsat_seating_evaluation_cases (
        id, evaluation_id, organisation_id, event_id, case_id, status, safe_failure_code, detail, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
      [
        randomUUID(),
        id,
        input.organisationId,
        input.eventId,
        item.caseId,
        item.status,
        item.safeFailureCode,
        JSON.stringify(item.detail),
        input.evaluatedAt,
      ],
    );
  }

  return {
    id,
    organisationId: input.organisationId,
    eventId: input.eventId,
    authorityInputHash: computed.authorityInputHash,
    evaluationVersion: CPSAT_SEATING_EVALUATION_VERSION,
    actorPersonId: input.actorPersonId,
    actorRoleKey: input.actorRoleKey,
    status: computed.status,
    caseCount: computed.cases.length,
    passedCount: computed.passedCount,
    failedCount: computed.failedCount,
    safeFailureCodes: computed.safeFailureCodes,
    readinessResult: computed.readinessResult,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
    adoptionId: input.facts.currentAdoption?.id ?? null,
    runId: input.facts.currentAdoption?.runId ?? input.facts.adoptedRun?.id ?? null,
    workerReadyCount: input.facts.workerReadyCount,
    evaluatedAt: input.evaluatedAt,
    corpusEdition: CPSAT_SEATING_EVALUATION_CORPUS_EDITION,
    cases: computed.cases,
  };
}

export async function loadLatestCpsatSeatingEvaluation(
  client: PgQueryable,
  eventId: string,
  evaluationId?: string,
): Promise<CpsatSeatingEvaluationRecord | null> {
  const head = evaluationId
    ? await client.query<Record<string, unknown>>(
        `SELECT * FROM cpsat_seating_evaluations WHERE event_id = $1 AND id = $2 LIMIT 1`,
        [eventId, evaluationId],
      )
    : await client.query<Record<string, unknown>>(
        `SELECT * FROM cpsat_seating_evaluations
         WHERE event_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [eventId],
      );
  const row = head.rows[0];
  if (!row) return null;
  const cases = await client.query<{
    case_id: string;
    status: CpsatSeatingEvalCaseStatus;
    safe_failure_code: string | null;
    detail: Record<string, unknown> | string;
  }>(
    `SELECT case_id, status, safe_failure_code, detail
     FROM cpsat_seating_evaluation_cases
     WHERE evaluation_id = $1
     ORDER BY case_id ASC`,
    [String(row.id)],
  );
  const safeFailureCodes = Array.isArray(row.safe_failure_codes)
    ? (row.safe_failure_codes as string[])
    : typeof row.safe_failure_codes === "string"
      ? (JSON.parse(row.safe_failure_codes) as string[])
      : [];
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    eventId: String(row.event_id),
    authorityInputHash: String(row.authority_input_hash),
    evaluationVersion: String(row.evaluation_version),
    actorPersonId: String(row.actor_person_id),
    actorRoleKey: String(row.actor_role_key),
    status: row.status as CpsatSeatingEvalStatus,
    caseCount: Number(row.case_count),
    passedCount: Number(row.passed_count),
    failedCount: Number(row.failed_count),
    safeFailureCodes,
    readinessResult: row.readiness_result as CpsatSeatingReadinessResult,
    correlationId: String(row.correlation_id),
    idempotencyKey: row.idempotency_key == null ? null : String(row.idempotency_key),
    adoptionId: row.adoption_id == null ? null : String(row.adoption_id),
    runId: row.run_id == null ? null : String(row.run_id),
    workerReadyCount: Number(row.worker_ready_count ?? 0),
    evaluatedAt: String(row.evaluated_at),
    corpusEdition: CPSAT_SEATING_EVALUATION_CORPUS_EDITION,
    cases: cases.rows.map((item) => ({
      caseId: item.case_id as CpsatSeatingEvalCaseId,
      status: item.status,
      safeFailureCode: item.safe_failure_code,
      detail:
        typeof item.detail === "string"
          ? (JSON.parse(item.detail) as Record<string, unknown>)
          : (item.detail ?? {}),
    })),
  };
}

export async function runAndPersistCpsatSeatingEvaluation(
  client: PgQueryable,
  input: {
    organisationId: string;
    eventId: string;
    actorPersonId: string;
    actorRoleKey: string;
    correlationId: string;
    idempotencyKey?: string | null;
    evaluatedAt: string;
    layoutBindingActive: boolean;
    layoutBindingCount: number;
  },
): Promise<CpsatSeatingEvaluationRecord> {
  const facts = await loadCpsatSeatingEvaluationFacts(client, {
    organisationId: input.organisationId,
    eventId: input.eventId,
    layoutBindingActive: input.layoutBindingActive,
    layoutBindingCount: input.layoutBindingCount,
  });
  return persistCpsatSeatingEvaluation(client, { ...input, facts });
}
