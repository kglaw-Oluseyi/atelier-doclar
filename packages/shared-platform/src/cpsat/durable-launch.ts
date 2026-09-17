/**
 * Milestone 1 — durable CP-SAT seating launch (freeze → enqueue → read → queued cancel).
 * Does not claim, spawn Python, heartbeat, settle, or adopt.
 */
import { randomUUID } from "node:crypto";
import { exactHash } from "../eec-hash.js";
import { PlatformError } from "../errors.js";
import type { PgQueryable, PgTransactor } from "../postgres-schema.js";
import type { SeatingV2CompiledRequest } from "../seating-v2-schemas.js";
import type { SeatingV2InputPackage } from "../seating-v2-state.js";
import {
  CPSAT_ENGINE_ID,
  CPSAT_MODEL_VERSION,
  CPSAT_ORTOOLS_VERSION,
  CPSAT_PYTHON_VERSION,
} from "./contract.js";
import { compileV2ToCpsatRequest, type CpsatSolveRequest } from "./compiler.js";

export const CPSAT_NO_BASELINE_SENTINEL = "NO_BASELINE" as const;
export const CPSAT_ENGINE_EXPECTATION = `${CPSAT_ENGINE_ID}@${CPSAT_ORTOOLS_VERSION}+py${CPSAT_PYTHON_VERSION}` as const;

export type CpsatLaunchPurpose = "PLANNING" | "EVENT_DAY_REPAIR" | "SHADOW" | "QUALIFICATION";
export type CpsatLaunchMode = "REPLAY" | "PERFORMANCE";

export type CpsatFrozenAuthority = {
  eventId: string;
  organisationId: string;
  packageId: string;
  correlationId: string;
  purpose: CpsatLaunchPurpose;
  mode: CpsatLaunchMode;
  layoutId: string;
  layoutVersion: string;
  layoutHash: string;
  rulesEditionId: string;
  rulesHash: string;
  guestEditionId: string;
  guestEditionHash: string;
  objectiveEditionId: string;
  objectiveEditionHash: string;
  baselineAdoptionId: string | null;
  baselinePlanHash: string;
  modelVersion: typeof CPSAT_MODEL_VERSION;
  engineExpectation: typeof CPSAT_ENGINE_EXPECTATION;
  seed: number;
  compiledRequest: CpsatSolveRequest;
  authoredAuthority: SeatingV2CompiledRequest;
  canonicalRequestHash: string;
  closureHash: string;
  indexMapHash: string;
  idempotencyKey: string;
};

export type CpsatSeatingRunSummary = {
  runId: string;
  eventId: string;
  organisationId: string;
  packageId: string | null;
  lifecycle: string;
  resultStatus: string | null;
  freshness: string;
  evidenceGrade: string | null;
  purpose: string;
  mode: string;
  cancelRequested: boolean;
  createdAt: string;
  queuedAt: string | null;
  updatedAt: string;
  leaseOwner: string | null;
  attemptCount: number;
  idempotencyKey: string | null;
  correlationId: string | null;
  modelVersion: string | null;
  layoutHash: string | null;
  rulesHash: string | null;
  guestEditionHash: string | null;
  objectiveEditionHash: string | null;
  baselinePlanHash: string | null;
  requestHash: string;
  duplicateLaunch: boolean;
  progressPhase: string | null;
  startedAt: string | null;
  sealedAt: string | null;
  childInvocationCount: number;
  heartbeatAt: string | null;
};

export type CpsatEnqueueResult = {
  run: CpsatSeatingRunSummary;
  application: "APPLIED" | "REPLAYED";
};

const TERMINAL_LIFECYCLES = new Set([
  "CANCELLED",
  "CLOSED_NO_PLAN",
  "FAILED",
  "READY_FOR_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ADOPTED",
  "SUPERSEDED",
]);

const TERMINAL_PRODUCT = new Set([
  "OPTIMAL",
  "FEASIBLE",
  "INFEASIBLE",
  "SEARCH_INCOMPLETE",
  "TIMED_OUT",
  "INVALID_INPUT",
  "SOLVER_FAULT",
  "CANCELLED",
]);

/** Temporary migration seam — remove during later authority-removal milestone. */
export function solverQueueEnabledNote(): string {
  return "SOLVER_QUEUE_ENABLED is a temporary migration seam; remove during authority-removal milestone.";
}

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function hashCanonicalRequest(request: CpsatSolveRequest): string {
  const { runId: _runId, ...rest } = request;
  return exactHash(rest);
}

export function computeCpsatIdempotencyKey(input: {
  eventId: string;
  purpose: string;
  mode: string;
  layoutHash: string;
  rulesHash: string;
  guestEditionHash: string;
  objectiveEditionHash: string;
  baselinePlanHash: string;
  canonicalRequestHash: string;
  modelVersion: string;
  engineExpectation: string;
}): string {
  return exactHash({
    eventId: input.eventId,
    purpose: input.purpose,
    mode: input.mode,
    layoutHash: input.layoutHash,
    rulesHash: input.rulesHash,
    guestEditionHash: input.guestEditionHash,
    objectiveEditionHash: input.objectiveEditionHash,
    baselinePlanHash: input.baselinePlanHash || CPSAT_NO_BASELINE_SENTINEL,
    canonicalRequestHash: input.canonicalRequestHash,
    modelVersion: input.modelVersion,
    engineExpectation: input.engineExpectation,
  });
}

/**
 * Freeze governed seating authority into an immutable CP-SAT enqueue snapshot.
 * Does not call Python or the heuristic.
 */
export function freezeCpsatSeatingAuthority(input: {
  organisationId: string;
  eventId: string;
  correlationId?: string;
  purpose?: CpsatLaunchPurpose;
  mode?: CpsatLaunchMode;
  package: SeatingV2InputPackage;
  compiled: SeatingV2CompiledRequest;
  /** Active layout must still match the frozen package. */
  activeLayoutContentHash?: string | null;
  rulesEditionId?: string | null;
  rulesHash?: string | null;
  objectiveEditionId?: string | null;
  objectiveEditionHash?: string | null;
  baselineAdoptionId?: string | null;
  baselinePlanHash?: string | null;
  baselineAssignments?: Array<{ guestToken: string; positionToken: string }>;
}): CpsatFrozenAuthority {
  const pkg = input.package;
  if (pkg.organisationId !== input.organisationId || pkg.eventId !== input.eventId) {
    throw new PlatformError("NOT_FOUND", "input package was not found", {
      publicMessage: "The seating package could not be found for this event.",
    });
  }
  if (!pkg.layoutContentHash || !pkg.layoutId) {
    throw new PlatformError("VALIDATION_FAILED", "package lacks layout authority", {
      publicMessage: "Seating layout authority is missing. Bind and freeze a current layout first.",
    });
  }
  if (
    input.activeLayoutContentHash != null &&
    input.activeLayoutContentHash !== "" &&
    input.activeLayoutContentHash !== pkg.layoutContentHash
  ) {
    throw new PlatformError("SEATING_LAYOUT_BINDING_STALE", "layout authority changed after freeze", {
      publicMessage: "Seating layout authority changed. Freeze a new input package before launching.",
    });
  }
  if (!input.compiled?.guests?.length || !input.compiled?.positions?.length) {
    throw new PlatformError("VALIDATION_FAILED", "compiled request incomplete", {
      publicMessage: "The frozen seating package is incomplete and cannot be queued.",
    });
  }

  const purpose = input.purpose ?? "PLANNING";
  const mode = input.mode ?? "REPLAY";
  const provisionalRunId = randomUUID();
  let compiledRequest: CpsatSolveRequest;
  try {
    compiledRequest = compileV2ToCpsatRequest(input.compiled, {
      runId: provisionalRunId,
      mode,
      purpose,
      baseline: input.baselineAssignments,
    });
  } catch (error) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      error instanceof Error ? error.message : "CP-SAT compile failed",
      { publicMessage: "The governed seating request could not be prepared for the queue." },
    );
  }

  const canonicalRequestHash = hashCanonicalRequest(compiledRequest);
  const rulesHash = input.rulesHash ?? pkg.contentHash;
  const rulesEditionId = input.rulesEditionId ?? pkg.id;
  const guestEditionHash = pkg.cohortHash || pkg.rsvpSnapshotHash || pkg.contentHash;
  const guestEditionId = pkg.id;
  const objectiveEditionHash = input.objectiveEditionHash ?? pkg.solverConfigHash;
  const objectiveEditionId = input.objectiveEditionId ?? `objective:${pkg.solverConfigHash.slice(0, 16)}`;
  const baselinePlanHash = input.baselinePlanHash?.trim() || CPSAT_NO_BASELINE_SENTINEL;
  const baselineAdoptionId = input.baselineAdoptionId ?? null;

  const idempotencyKey = computeCpsatIdempotencyKey({
    eventId: input.eventId,
    purpose,
    mode,
    layoutHash: pkg.layoutContentHash,
    rulesHash,
    guestEditionHash,
    objectiveEditionHash,
    baselinePlanHash,
    canonicalRequestHash,
    modelVersion: CPSAT_MODEL_VERSION,
    engineExpectation: CPSAT_ENGINE_EXPECTATION,
  });

  return {
    eventId: input.eventId,
    organisationId: input.organisationId,
    packageId: pkg.id,
    correlationId: input.correlationId ?? randomUUID(),
    purpose,
    mode,
    layoutId: pkg.layoutId,
    layoutVersion: String(pkg.layoutPublicationId ?? pkg.seatingLayoutBindingId ?? "1"),
    layoutHash: pkg.layoutContentHash,
    rulesEditionId,
    rulesHash,
    guestEditionId,
    guestEditionHash,
    objectiveEditionId,
    objectiveEditionHash,
    baselineAdoptionId,
    baselinePlanHash,
    modelVersion: CPSAT_MODEL_VERSION,
    engineExpectation: CPSAT_ENGINE_EXPECTATION,
    seed: compiledRequest.seed,
    compiledRequest,
    authoredAuthority: input.compiled,
    canonicalRequestHash,
    closureHash: compiledRequest.closureHash,
    indexMapHash: compiledRequest.indexMapHash,
    idempotencyKey,
  };
}

function rowToSummary(row: Record<string, unknown>, duplicateLaunch = false): CpsatSeatingRunSummary {
  return {
    runId: String(row.id),
    eventId: String(row.event_id),
    organisationId: String(row.organisation_id),
    packageId: row.package_id == null ? null : String(row.package_id),
    lifecycle: String(row.status),
    resultStatus: row.product_result == null ? null : String(row.product_result),
    freshness: String(row.freshness ?? "CURRENT"),
    evidenceGrade: row.evidence_grade == null ? null : String(row.evidence_grade),
    purpose: String(row.purpose ?? "PLANNING"),
    mode: String(row.mode ?? "REPLAY"),
    cancelRequested: Boolean(row.cancel_requested),
    createdAt: String(row.created_at),
    queuedAt: row.queued_at == null ? null : String(row.queued_at),
    updatedAt: String(row.updated_at),
    leaseOwner: row.lease_owner == null ? null : String(row.lease_owner),
    attemptCount: Number(row.attempt_count ?? 0),
    idempotencyKey: row.idempotency_key == null ? null : String(row.idempotency_key),
    correlationId: row.correlation_id == null ? null : String(row.correlation_id),
    modelVersion: row.model_version == null ? null : String(row.model_version),
    layoutHash: row.layout_hash == null ? null : String(row.layout_hash),
    rulesHash: row.rules_hash == null ? null : String(row.rules_hash),
    guestEditionHash: row.guest_edition_hash == null ? null : String(row.guest_edition_hash),
    objectiveEditionHash: row.objective_edition_hash == null ? null : String(row.objective_edition_hash),
    baselinePlanHash: row.baseline_plan_hash == null ? null : String(row.baseline_plan_hash),
    requestHash: String(row.request_hash),
    duplicateLaunch,
    progressPhase: row.progress_phase == null ? null : String(row.progress_phase),
    startedAt: row.started_at == null ? null : String(row.started_at),
    sealedAt: row.sealed_at == null ? null : String(row.sealed_at),
    childInvocationCount: Number(row.child_invocation_count ?? 0),
    heartbeatAt: row.heartbeat_at == null ? null : String(row.heartbeat_at),
  };
}

async function loadRunByIdempotency(
  client: PgQueryable,
  eventId: string,
  idempotencyKey: string,
): Promise<CpsatSeatingRunSummary | null> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_runs WHERE event_id = $1 AND idempotency_key = $2 LIMIT 1`,
    [eventId, idempotencyKey],
  );
  const row = result.rows[0];
  return row ? rowToSummary(row, true) : null;
}

async function insertRunEvent(
  client: PgQueryable,
  runId: string,
  kind: string,
  payload: Record<string, unknown>,
  at: string,
): Promise<void> {
  await client.query(
    `INSERT INTO cpsat_solver_run_events (id, run_id, at, kind, payload) VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [randomUUID(), runId, at, kind, JSON.stringify(payload)],
  );
}

/**
 * Authorised durable enqueue. Never solves, never assigns a lease owner.
 */
export async function enqueueCpsatSeatingRun(
  client: PgQueryable,
  frozen: CpsatFrozenAuthority,
  options: { priority?: string; actorPersonId: string } = { actorPersonId: "unknown" },
): Promise<CpsatEnqueueResult> {
  const now = new Date().toISOString();
  const runId = frozen.compiledRequest.runId || randomUUID();
  const requestWithId: CpsatSolveRequest = { ...frozen.compiledRequest, runId };
  const priority = options.priority ?? frozen.purpose;

  const work = async (tx: PgQueryable): Promise<CpsatEnqueueResult> => {
    const existing = await loadRunByIdempotency(tx, frozen.eventId, frozen.idempotencyKey);
    if (existing) {
      if (existing.eventId !== frozen.eventId) {
        throw new PlatformError("FORBIDDEN", "idempotency collision across events", {
          publicMessage: "This seating run could not be launched.",
        });
      }
      await insertRunEvent(
        tx,
        existing.runId,
        "IDEMPOTENT_LAUNCH_RETURNED",
        {
          actorPersonId: options.actorPersonId,
          eventId: frozen.eventId,
          runId: existing.runId,
          idempotencyKey: frozen.idempotencyKey,
          layoutHash: frozen.layoutHash,
          rulesHash: frozen.rulesHash,
          guestEditionHash: frozen.guestEditionHash,
          objectiveEditionHash: frozen.objectiveEditionHash,
          requestHash: frozen.canonicalRequestHash,
        },
        now,
      );
      return { run: existing, application: "REPLAYED" };
    }

    try {
      await tx.query(
        `INSERT INTO cpsat_solver_runs (
          id, event_id, organisation_id, package_id, priority, status, mode, purpose, seed,
          request_hash, closure_hash, index_map_hash,
          lease_owner, lease_epoch, lease_until, heartbeat_at,
          created_at, updated_at, queued_at,
          product_result, stop_reason, freshness, evidence_grade,
          engine_ortools, engine_python, model_version, fault_code,
          cancel_requested, stop_and_keep_best,
          idempotency_key, correlation_id,
          layout_id, layout_version, layout_hash,
          rules_edition_id, rules_hash,
          guest_edition_id, guest_edition_hash,
          objective_edition_id, objective_edition_hash,
          baseline_adoption_id, baseline_plan_hash,
          request_json, attempt_count, authored_authority_json
        ) VALUES (
          $1,$2,$3,$4,$5,'QUEUED',$6,$7,$8,
          $9,$10,$11,
          NULL,0,NULL,NULL,
          $12,$12,$12,
          NULL,NULL,'CURRENT',NULL,
          $13,$14,$15,NULL,
          FALSE,FALSE,
          $16,$17,
          $18,$19,$20,
          $21,$22,
          $23,$24,
          $25,$26,
          $27,$28,
          $29::jsonb,0,$30::jsonb
        )`,
        [
          runId,
          frozen.eventId,
          frozen.organisationId,
          frozen.packageId,
          priority,
          frozen.mode,
          frozen.purpose,
          frozen.seed,
          frozen.canonicalRequestHash,
          frozen.closureHash,
          frozen.indexMapHash,
          now,
          CPSAT_ORTOOLS_VERSION,
          CPSAT_PYTHON_VERSION,
          CPSAT_MODEL_VERSION,
          frozen.idempotencyKey,
          frozen.correlationId,
          frozen.layoutId,
          frozen.layoutVersion,
          frozen.layoutHash,
          frozen.rulesEditionId,
          frozen.rulesHash,
          frozen.guestEditionId,
          frozen.guestEditionHash,
          frozen.objectiveEditionId,
          frozen.objectiveEditionHash,
          frozen.baselineAdoptionId,
          frozen.baselinePlanHash,
          JSON.stringify(requestWithId),
          JSON.stringify(frozen.authoredAuthority),
        ],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unique|duplicate|23505/i.test(message)) {
        const raced = await loadRunByIdempotency(tx, frozen.eventId, frozen.idempotencyKey);
        if (raced) return { run: raced, application: "REPLAYED" };
      }
      throw error;
    }

    await insertRunEvent(
      tx,
      runId,
      "RUN_QUEUED",
      {
        actorPersonId: options.actorPersonId,
        eventId: frozen.eventId,
        runId,
        action: "cpsat.run.queued",
        layoutHash: frozen.layoutHash,
        rulesHash: frozen.rulesHash,
        guestEditionHash: frozen.guestEditionHash,
        objectiveEditionHash: frozen.objectiveEditionHash,
        baselinePlanHash: frozen.baselinePlanHash,
        requestHash: frozen.canonicalRequestHash,
        idempotencyKey: frozen.idempotencyKey,
      },
      now,
    );

    const inserted = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2`,
      [runId, frozen.eventId],
    );
    const row = inserted.rows[0];
    if (!row) {
      throw new PlatformError("INTERNAL_ERROR", "queued run missing after insert", {
        publicMessage: "The seating run could not be stored.",
      });
    }
    return { run: rowToSummary(row, false), application: "APPLIED" };
  };

  if (hasTransaction(client)) {
    return client.transaction(work);
  }
  return work(client);
}

export async function getCpsatSeatingRun(
  client: PgQueryable,
  eventId: string,
  runId: string,
): Promise<CpsatSeatingRunSummary> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2 LIMIT 1`,
    [runId, eventId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new PlatformError("NOT_FOUND", "run was not found", {
      publicMessage: "That seating run could not be found for this event.",
    });
  }
  return rowToSummary(row);
}

export async function listCpsatSeatingRuns(
  client: PgQueryable,
  eventId: string,
  options: { limit?: number; cursorCreatedAt?: string; cursorId?: string } = {},
): Promise<{ runs: CpsatSeatingRunSummary[]; nextCursor: { createdAt: string; id: string } | null }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const values: unknown[] = [eventId, limit + 1];
  let sql = `SELECT * FROM cpsat_solver_runs WHERE event_id = $1`;
  if (options.cursorCreatedAt && options.cursorId) {
    values.push(options.cursorCreatedAt, options.cursorId);
    sql += ` AND (created_at, id) < ($3::timestamptz, $4)`;
  }
  sql += ` ORDER BY created_at DESC, id DESC LIMIT $2`;
  const result = await client.query<Record<string, unknown>>(sql, values);
  const rows = result.rows.map((row) => rowToSummary(row));
  const page = rows.slice(0, limit);
  const overflow = rows[limit];
  return {
    runs: page,
    nextCursor: overflow ? { createdAt: overflow.createdAt, id: overflow.runId } : null,
  };
}

const ACTIVE_CANCELLABLE = new Set(["QUEUED", "CLAIMED", "RUNNING"]);

export async function requestCpsatRunCancellation(
  client: PgQueryable,
  input: { eventId: string; runId: string; actorPersonId: string },
): Promise<CpsatSeatingRunSummary> {
  const now = new Date().toISOString();
  const work = async (tx: PgQueryable): Promise<CpsatSeatingRunSummary> => {
    const locked = await tx.query<Record<string, unknown>>(
      `SELECT * FROM cpsat_solver_runs WHERE id = $1 AND event_id = $2 FOR UPDATE`,
      [input.runId, input.eventId],
    );
    const row = locked.rows[0];
    if (!row) {
      throw new PlatformError("NOT_FOUND", "run was not found", {
        publicMessage: "That seating run could not be found for this event.",
      });
    }
    const lifecycle = String(row.status);
    const product = row.product_result == null ? null : String(row.product_result);
    if (TERMINAL_LIFECYCLES.has(lifecycle) || (product && TERMINAL_PRODUCT.has(product) && !ACTIVE_CANCELLABLE.has(lifecycle))) {
      throw new PlatformError("VALIDATION_FAILED", "terminal run cannot be cancelled", {
        publicMessage: "This seating run can no longer be cancelled.",
      });
    }
    if (!ACTIVE_CANCELLABLE.has(lifecycle)) {
      throw new PlatformError("VALIDATION_FAILED", "run is not cancellable in current lifecycle", {
        publicMessage: "Cancellation is only available while the run is queued or executing.",
      });
    }
    if (Boolean(row.cancel_requested)) {
      return rowToSummary(row);
    }
    await tx.query(
      `UPDATE cpsat_solver_runs
       SET cancel_requested = TRUE, updated_at = $3
       WHERE id = $1 AND event_id = $2 AND status = ANY($4::text[])`,
      [input.runId, input.eventId, now, [...ACTIVE_CANCELLABLE]],
    );
    await insertRunEvent(
      tx,
      input.runId,
      "CANCELLATION_REQUESTED",
      {
        actorPersonId: input.actorPersonId,
        eventId: input.eventId,
        runId: input.runId,
        action: "cpsat.run.cancel_requested",
        lifecycle,
      },
      now,
    );
    return getCpsatSeatingRun(tx, input.eventId, input.runId);
  };

  if (hasTransaction(client)) {
    return client.transaction(work);
  }
  return work(client);
}
