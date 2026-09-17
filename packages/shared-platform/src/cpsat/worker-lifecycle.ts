/**
 * Milestone 2 — authoritative CP-SAT claim, heartbeat, projection, reaper, cancel-ack.
 * cpsat_solver_runs is lifecycle authority; seating_v2_runs is operator projection only.
 */
import { randomUUID } from "node:crypto";
import type { PgQueryable, PgTransactor } from "../postgres-schema.js";
import {
  CPSAT_ACK_QUEUED_CANCEL_SQL,
  CPSAT_CLAIM_SQL,
  CPSAT_FAIR_CLAIM_SQL,
  CPSAT_FENCED_SETTLE_SQL,
  CPSAT_HEARTBEAT_SQL,
  CPSAT_REAPER_FAULT_SQL,
  CPSAT_REAPER_REQUEUE_SQL,
  type CpsatClaimableRun,
} from "./queue.js";

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

async function insertRunEvent(
  client: PgQueryable,
  runId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO cpsat_solver_run_events (id, run_id, at, kind, payload) VALUES ($1, $2, NOW(), $3, $4::jsonb)`,
    [randomUUID(), runId, kind, JSON.stringify(payload)],
  );
}

/** Map authoritative lifecycle → seating_v2_runs CHECK-compatible status. */
export function mapLifecycleToProjectionStatus(
  lifecycle: string,
  productResult: string | null,
): "QUEUED" | "RUNNING" | "FEASIBLE" | "INFEASIBLE" | "TIMED_OUT" | "CANCELLED" | "ERROR" {
  switch (lifecycle) {
    case "QUEUED":
      return "QUEUED";
    case "CLAIMED":
    case "RUNNING":
    case "BUILDING":
    case "SEARCHING":
    case "VERIFYING":
    case "EXPLAINING":
    case "PERSISTING":
      return "RUNNING";
    case "READY_FOR_REVIEW":
    case "PENDING_APPROVAL":
    case "APPROVED":
    case "REJECTED":
    case "ADOPTED":
    case "SUPERSEDED":
      return "FEASIBLE";
    case "CANCELLED":
      return "CANCELLED";
    case "CLOSED_NO_PLAN":
      if (productResult === "INFEASIBLE") return "INFEASIBLE";
      if (productResult === "TIMED_OUT") return "TIMED_OUT";
      return "ERROR";
    case "FAILED":
      return "ERROR";
    default:
      if (productResult === "INFEASIBLE") return "INFEASIBLE";
      if (productResult === "TIMED_OUT") return "TIMED_OUT";
      if (productResult === "CANCELLED") return "CANCELLED";
      if (productResult === "OPTIMAL" || productResult === "FEASIBLE") return "FEASIBLE";
      return "ERROR";
  }
}

/**
 * Update seating_v2 projection in the same transaction as an authoritative transition.
 * Missing projection row is tolerated (authoritative-only synthetic tests).
 * Projection write failure must roll back the caller transaction.
 */
export async function projectSeatingV2Lifecycle(
  client: PgQueryable,
  input: {
    runId: string;
    lifecycle: string;
    productResult: string | null;
    leaseOwner: string | null;
    leaseUntil: string | null;
    assignmentsHash?: string | null;
    completed?: boolean;
  },
): Promise<{ projected: boolean; projectionStatus: string }> {
  const projectionStatus = mapLifecycleToProjectionStatus(input.lifecycle, input.productResult);
  const result = await client.query<{ id: string }>(
    `UPDATE seating_v2_runs
     SET status = $2,
         solver_claim = $3,
         lease_owner = $4,
         lease_until = $5::timestamptz,
         assignments_hash = COALESCE($6, assignments_hash),
         started_at = COALESCE(started_at, NOW()),
         completed_at = CASE WHEN $7 THEN NOW() ELSE completed_at END,
         generated_at = CASE WHEN $7 THEN NOW() ELSE generated_at END
     WHERE id = $1
     RETURNING id`,
    [
      input.runId,
      projectionStatus,
      input.productResult,
      input.leaseOwner,
      input.leaseUntil,
      input.assignmentsHash ?? null,
      Boolean(input.completed),
    ],
  );
  return { projected: (result.rowCount ?? 0) > 0, projectionStatus };
}

export async function assertAuthorityProjectionAligned(
  client: PgQueryable,
  runId: string,
): Promise<{ ok: true; lifecycle: string; projectionStatus: string } | { ok: false; reason: string }> {
  const auth = await client.query<Record<string, unknown>>(
    `SELECT id, status, product_result FROM cpsat_solver_runs WHERE id = $1`,
    [runId],
  );
  const row = auth.rows[0];
  if (!row) return { ok: false, reason: "missing_authority" };
  const proj = await client.query<Record<string, unknown>>(
    `SELECT id, status FROM seating_v2_runs WHERE id = $1`,
    [runId],
  );
  if (!proj.rows[0]) {
    // Projection optional only when seating_v2 table has no mirror row.
    return {
      ok: true,
      lifecycle: String(row.status),
      projectionStatus: "(none)",
    };
  }
  const expected = mapLifecycleToProjectionStatus(
    String(row.status),
    row.product_result == null ? null : String(row.product_result),
  );
  const actual = String(proj.rows[0].status);
  if (actual !== expected) {
    return { ok: false, reason: `projection_mismatch expected=${expected} actual=${actual}` };
  }
  return { ok: true, lifecycle: String(row.status), projectionStatus: actual };
}

export type ClaimedRunRow = CpsatClaimableRun & {
  organisationId: string;
  requestJson: unknown;
  authoredAuthorityJson: unknown;
  cancelRequested: boolean;
  attemptCount: number;
  modelVersion: string | null;
  requestHash: string;
  layoutHash: string | null;
  rulesHash: string | null;
  guestEditionHash: string | null;
  objectiveEditionHash: string | null;
  childInvocationCount: number;
};

export async function claimNextCpsatRun(
  client: PgQueryable,
  input: { leaseOwner: string; leaseSeconds: number; fair?: boolean },
): Promise<ClaimedRunRow | null> {
  const work = async (tx: PgQueryable): Promise<ClaimedRunRow | null> => {
    const sql = input.fair === false ? CPSAT_CLAIM_SQL : CPSAT_FAIR_CLAIM_SQL;
    const claimed = await tx.query<{
      id: string;
      event_id: string;
      priority: string;
      status: string;
      lease_epoch: string | number;
      request_hash: string;
    }>(sql, [input.leaseOwner, String(input.leaseSeconds)]);
    const head = claimed.rows[0];
    if (!head) return null;

    await insertRunEvent(tx, head.id, "RUN_CLAIMED", {
      leaseOwner: input.leaseOwner,
      leaseEpoch: Number(head.lease_epoch),
      status: head.status,
    });

    const leaseUntil = await tx.query<{ lease_until: string }>(
      `SELECT lease_until::text AS lease_until FROM cpsat_solver_runs WHERE id = $1`,
      [head.id],
    );
    await projectSeatingV2Lifecycle(tx, {
      runId: head.id,
      lifecycle: "CLAIMED",
      productResult: null,
      leaseOwner: input.leaseOwner,
      leaseUntil: leaseUntil.rows[0]?.lease_until ?? null,
    });

    return loadClaimedRun(tx, head.id);
  };

  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function loadClaimedRun(client: PgQueryable, runId: string): Promise<ClaimedRunRow | null> {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM cpsat_solver_runs WHERE id = $1 LIMIT 1`,
    [runId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    organisationId: String(row.organisation_id),
    priority: String(row.priority) as ClaimedRunRow["priority"],
    status: String(row.status),
    leaseEpoch: Number(row.lease_epoch),
    requestHash: String(row.request_hash),
    requestJson: row.request_json,
    authoredAuthorityJson: row.authored_authority_json,
    cancelRequested: Boolean(row.cancel_requested),
    attemptCount: Number(row.attempt_count ?? 0),
    modelVersion: row.model_version == null ? null : String(row.model_version),
    layoutHash: row.layout_hash == null ? null : String(row.layout_hash),
    rulesHash: row.rules_hash == null ? null : String(row.rules_hash),
    guestEditionHash: row.guest_edition_hash == null ? null : String(row.guest_edition_hash),
    objectiveEditionHash: row.objective_edition_hash == null ? null : String(row.objective_edition_hash),
    childInvocationCount: Number(row.child_invocation_count ?? 0),
  };
}

export async function heartbeatCpsatRun(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number; leaseSeconds: number },
): Promise<boolean> {
  const result = await client.query<{ id: string }>(CPSAT_HEARTBEAT_SQL, [
    input.runId,
    input.leaseOwner,
    String(input.leaseSeconds),
    input.leaseEpoch,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function markCpsatRunRunning(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number; phase: string },
): Promise<boolean> {
  const work = async (tx: PgQueryable): Promise<boolean> => {
    const result = await tx.query<{ id: string; lease_until: string }>(
      `UPDATE cpsat_solver_runs
       SET status = 'RUNNING',
           progress_phase = $4,
           updated_at = NOW()
       WHERE id = $1
         AND lease_owner = $2
         AND lease_epoch = $3
         AND status IN ('CLAIMED', 'RUNNING')
       RETURNING id, lease_until::text AS lease_until`,
      [input.runId, input.leaseOwner, input.leaseEpoch, input.phase],
    );
    if ((result.rowCount ?? 0) === 0) return false;
    await insertRunEvent(tx, input.runId, "RUN_RUNNING", { phase: input.phase });
    await projectSeatingV2Lifecycle(tx, {
      runId: input.runId,
      lifecycle: "RUNNING",
      productResult: null,
      leaseOwner: input.leaseOwner,
      leaseUntil: result.rows[0]?.lease_until ?? null,
    });
    return true;
  };
  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function updateCpsatProgressPhase(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number; phase: string },
): Promise<void> {
  await client.query(
    `UPDATE cpsat_solver_runs
     SET progress_phase = $4, updated_at = NOW()
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3 AND status IN ('CLAIMED', 'RUNNING')`,
    [input.runId, input.leaseOwner, input.leaseEpoch, input.phase],
  );
}

export async function observeCancellation(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number },
): Promise<boolean> {
  const result = await client.query<{ id: string; cancel_requested: boolean }>(
    `SELECT id, cancel_requested FROM cpsat_solver_runs
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3 AND status IN ('CLAIMED', 'RUNNING')`,
    [input.runId, input.leaseOwner, input.leaseEpoch],
  );
  const row = result.rows[0];
  if (!row?.cancel_requested) return false;
  await client.query(
    `UPDATE cpsat_solver_runs
     SET cancel_observed_at = COALESCE(cancel_observed_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3`,
    [input.runId, input.leaseOwner, input.leaseEpoch],
  );
  await insertRunEvent(client, input.runId, "CANCELLATION_OBSERVED", {
    leaseOwner: input.leaseOwner,
    leaseEpoch: input.leaseEpoch,
  });
  return true;
}

export async function incrementChildInvocation(
  client: PgQueryable,
  input: { runId: string; leaseOwner: string; leaseEpoch: number },
): Promise<number> {
  const result = await client.query<{ child_invocation_count: number }>(
    `UPDATE cpsat_solver_runs
     SET child_invocation_count = COALESCE(child_invocation_count, 0) + 1, updated_at = NOW()
     WHERE id = $1 AND lease_owner = $2 AND lease_epoch = $3
     RETURNING child_invocation_count`,
    [input.runId, input.leaseOwner, input.leaseEpoch],
  );
  return Number(result.rows[0]?.child_invocation_count ?? 0);
}

export type FencedSettleInput = {
  runId: string;
  leaseOwner: string;
  leaseEpoch: number;
  lifecycle: string;
  productResult: string;
  stopReason: string | null;
  freshness: "CURRENT" | "STALE" | "FRESH";
  evidenceGrade: string | null;
  faultCode: string | null;
  progressPhase?: string | null;
  assignmentsHash?: string | null;
};

export async function fencedSettleCpsatRun(
  client: PgQueryable,
  input: FencedSettleInput,
): Promise<{ settled: boolean; reason?: string }> {
  const work = async (tx: PgQueryable): Promise<{ settled: boolean; reason?: string }> => {
    const result = await tx.query<{ id: string }>(CPSAT_FENCED_SETTLE_SQL, [
      input.runId,
      input.leaseOwner,
      input.leaseEpoch,
      input.lifecycle,
      input.productResult,
      input.stopReason,
      input.freshness,
      input.evidenceGrade,
      input.faultCode,
      input.progressPhase ?? null,
    ]);
    if ((result.rowCount ?? 0) === 0) {
      return { settled: false, reason: "STALE_LEASE_OR_TERMINAL" };
    }
    await insertRunEvent(tx, input.runId, "RUN_SETTLED", {
      lifecycle: input.lifecycle,
      productResult: input.productResult,
      stopReason: input.stopReason,
      freshness: input.freshness,
      evidenceGrade: input.evidenceGrade,
      faultCode: input.faultCode,
    });
    await projectSeatingV2Lifecycle(tx, {
      runId: input.runId,
      lifecycle: input.lifecycle,
      productResult: input.productResult,
      leaseOwner: null,
      leaseUntil: null,
      assignmentsHash: input.assignmentsHash ?? null,
      completed: true,
    });
    return { settled: true };
  };
  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}

export async function acknowledgeQueuedCancellations(
  client: PgQueryable,
  limit = 1,
): Promise<Array<{ id: string; eventId: string; childInvocationCount: number }>> {
  const out: Array<{ id: string; eventId: string; childInvocationCount: number }> = [];
  for (let i = 0; i < limit; i++) {
    const work = async (tx: PgQueryable) => {
      const result = await tx.query<{
        id: string;
        event_id: string;
        status: string;
        child_invocation_count: number;
      }>(CPSAT_ACK_QUEUED_CANCEL_SQL, []);
      const row = result.rows[0];
      if (!row) return null;
      await insertRunEvent(tx, row.id, "RUN_CANCELLED", {
        stopReason: "CANCEL_BEFORE_SPAWN",
        childInvocationCount: Number(row.child_invocation_count ?? 0),
      });
      await projectSeatingV2Lifecycle(tx, {
        runId: row.id,
        lifecycle: "CANCELLED",
        productResult: "CANCELLED",
        leaseOwner: null,
        leaseUntil: null,
        completed: true,
      });
      return {
        id: row.id,
        eventId: row.event_id,
        childInvocationCount: Number(row.child_invocation_count ?? 0),
      };
    };
    const row = hasTransaction(client) ? await client.transaction(work) : await work(client);
    if (!row) break;
    out.push(row);
  }
  return out;
}

export async function reapExpiredCpsatLeases(
  client: PgQueryable,
  options: { limit?: number } = {},
): Promise<{ requeued: string[]; faulted: string[] }> {
  const limit = options.limit ?? 10;
  const work = async (tx: PgQueryable) => {
    const requeued = await tx.query<{ id: string; event_id: string; attempt_count: number; lease_epoch: number }>(
      CPSAT_REAPER_REQUEUE_SQL,
      [limit],
    );
    for (const row of requeued.rows) {
      await insertRunEvent(tx, row.id, "LEASE_REQUEUED", {
        attemptCount: Number(row.attempt_count),
        leaseEpoch: Number(row.lease_epoch),
      });
      await projectSeatingV2Lifecycle(tx, {
        runId: row.id,
        lifecycle: "QUEUED",
        productResult: null,
        leaseOwner: null,
        leaseUntil: null,
      });
    }
    const faulted = await tx.query<{ id: string; event_id: string; attempt_count: number; lease_epoch: number }>(
      CPSAT_REAPER_FAULT_SQL,
      [limit],
    );
    for (const row of faulted.rows) {
      await insertRunEvent(tx, row.id, "LEASE_EXPIRED_FAULT", {
        attemptCount: Number(row.attempt_count),
        leaseEpoch: Number(row.lease_epoch),
      });
      await projectSeatingV2Lifecycle(tx, {
        runId: row.id,
        lifecycle: "FAILED",
        productResult: "SOLVER_FAULT",
        leaseOwner: null,
        leaseUntil: null,
        completed: true,
      });
    }
    return {
      requeued: requeued.rows.map((r) => r.id),
      faulted: faulted.rows.map((r) => r.id),
    };
  };
  if (hasTransaction(client)) return client.transaction(work);
  return work(client);
}
