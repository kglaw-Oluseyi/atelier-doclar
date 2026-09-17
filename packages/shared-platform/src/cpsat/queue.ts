/**
 * Local CP-SAT queue claim / lease helpers (ephemeral PostgreSQL).
 * Milestone 2 — claim, heartbeat, fenced settle, and lease reaper SQL.
 */
import { createHash, randomUUID } from "node:crypto";

export const CPSAT_PRIORITY_ORDER = ["EVENT_DAY_REPAIR", "PLANNING", "SHADOW", "QUALIFICATION"] as const;
export type CpsatQueuePriority = (typeof CPSAT_PRIORITY_ORDER)[number];

export type CpsatClaimableRun = {
  id: string;
  eventId: string;
  priority: CpsatQueuePriority;
  status: string;
  leaseEpoch: number;
  requestHash: string;
};

/** Claim SQL using FOR UPDATE SKIP LOCKED with priority + FIFO within priority. */
export const CPSAT_CLAIM_SQL = `
WITH next_run AS (
  SELECT id
  FROM cpsat_solver_runs
  WHERE status = 'QUEUED'
    AND cancel_requested = FALSE
  ORDER BY
    CASE priority
      WHEN 'EVENT_DAY_REPAIR' THEN 0
      WHEN 'PLANNING' THEN 1
      WHEN 'SHADOW' THEN 2
      WHEN 'QUALIFICATION' THEN 3
      ELSE 9
    END,
    created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE cpsat_solver_runs AS r
SET
  status = 'CLAIMED',
  lease_owner = $1,
  lease_epoch = r.lease_epoch + 1,
  lease_until = NOW() + ($2::text || ' seconds')::interval,
  heartbeat_at = NOW(),
  attempt_count = COALESCE(r.attempt_count, 0) + 1,
  progress_phase = 'validating request',
  started_at = COALESCE(r.started_at, NOW()),
  updated_at = NOW()
FROM next_run
WHERE r.id = next_run.id
RETURNING r.id, r.event_id, r.priority, r.status, r.lease_epoch, r.request_hash;
`;

export const CPSAT_HEARTBEAT_SQL = `
UPDATE cpsat_solver_runs
SET heartbeat_at = NOW(),
    lease_until = NOW() + ($3::text || ' seconds')::interval,
    updated_at = NOW()
WHERE id = $1
  AND lease_owner = $2
  AND lease_epoch = $4
  AND status IN ('CLAIMED', 'RUNNING')
RETURNING id;
`;

export const CPSAT_FENCED_SETTLE_SQL = `
UPDATE cpsat_solver_runs
SET status = $4,
    product_result = $5,
    stop_reason = $6,
    freshness = $7,
    evidence_grade = $8,
    fault_code = $9,
    lease_owner = NULL,
    lease_until = NULL,
    progress_phase = COALESCE($10, progress_phase),
    sealed_at = CASE WHEN $4 = 'READY_FOR_REVIEW' THEN NOW() ELSE sealed_at END,
    updated_at = NOW()
WHERE id = $1
  AND lease_owner = $2
  AND lease_epoch = $3
  AND status IN ('CLAIMED', 'RUNNING')
RETURNING id;
`;

/** Round-robin fairness: prefer events with fewest active RUNNING/CLAIMED rows. */
export const CPSAT_FAIR_CLAIM_SQL = `
WITH active AS (
  SELECT event_id, COUNT(*)::int AS running_count
  FROM cpsat_solver_runs
  WHERE status IN ('CLAIMED', 'RUNNING')
  GROUP BY event_id
),
next_run AS (
  SELECT r.id
  FROM cpsat_solver_runs r
  LEFT JOIN active a ON a.event_id = r.event_id
  WHERE r.status = 'QUEUED'
    AND r.cancel_requested = FALSE
  ORDER BY
    COALESCE(a.running_count, 0) ASC,
    CASE r.priority
      WHEN 'EVENT_DAY_REPAIR' THEN 0
      WHEN 'PLANNING' THEN 1
      WHEN 'SHADOW' THEN 2
      WHEN 'QUALIFICATION' THEN 3
      ELSE 9
    END,
    r.created_at ASC
  FOR UPDATE OF r SKIP LOCKED
  LIMIT 1
)
UPDATE cpsat_solver_runs AS r
SET
  status = 'CLAIMED',
  lease_owner = $1,
  lease_epoch = r.lease_epoch + 1,
  lease_until = NOW() + ($2::text || ' seconds')::interval,
  heartbeat_at = NOW(),
  attempt_count = COALESCE(r.attempt_count, 0) + 1,
  progress_phase = 'validating request',
  started_at = COALESCE(r.started_at, NOW()),
  updated_at = NOW()
FROM next_run
WHERE r.id = next_run.id
RETURNING r.id, r.event_id, r.priority, r.status, r.lease_epoch, r.request_hash;
`;

/** Acknowledge queued cancellation without spawning a child. */
export const CPSAT_ACK_QUEUED_CANCEL_SQL = `
WITH next_run AS (
  SELECT id
  FROM cpsat_solver_runs
  WHERE status = 'QUEUED'
    AND cancel_requested = TRUE
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE cpsat_solver_runs AS r
SET
  status = 'CANCELLED',
  product_result = 'CANCELLED',
  stop_reason = 'CANCEL_BEFORE_SPAWN',
  cancel_observed_at = NOW(),
  lease_owner = NULL,
  lease_until = NULL,
  progress_phase = 'cancelled',
  updated_at = NOW()
FROM next_run
WHERE r.id = next_run.id
RETURNING r.id, r.event_id, r.status, r.child_invocation_count;
`;

/** Reaper: reclaim expired CLAIMED/RUNNING leases within retry budget. */
export const CPSAT_REAPER_REQUEUE_SQL = `
WITH expired AS (
  SELECT id
  FROM cpsat_solver_runs
  WHERE status IN ('CLAIMED', 'RUNNING')
    AND lease_until IS NOT NULL
    AND lease_until < NOW()
    AND COALESCE(attempt_count, 0) < COALESCE(max_attempts, 2)
  ORDER BY lease_until ASC
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
UPDATE cpsat_solver_runs AS r
SET
  status = 'QUEUED',
  lease_owner = NULL,
  lease_until = NULL,
  progress_phase = 'requeued',
  updated_at = NOW()
FROM expired
WHERE r.id = expired.id
RETURNING r.id, r.event_id, r.attempt_count, r.lease_epoch;
`;

/** Reaper: settle expired leases that exhausted retries as typed fault. */
export const CPSAT_REAPER_FAULT_SQL = `
WITH expired AS (
  SELECT id
  FROM cpsat_solver_runs
  WHERE status IN ('CLAIMED', 'RUNNING')
    AND lease_until IS NOT NULL
    AND lease_until < NOW()
    AND COALESCE(attempt_count, 0) >= COALESCE(max_attempts, 2)
  ORDER BY lease_until ASC
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
UPDATE cpsat_solver_runs AS r
SET
  status = 'FAILED',
  product_result = 'SOLVER_FAULT',
  fault_code = 'SOLVER_FAULT(LEASE_EXPIRED)',
  stop_reason = 'LEASE_EXPIRED',
  lease_owner = NULL,
  lease_until = NULL,
  progress_phase = 'fault',
  updated_at = NOW()
FROM expired
WHERE r.id = expired.id
RETURNING r.id, r.event_id, r.attempt_count, r.lease_epoch;
`;

export function newWorkerLeaseOwner(hostname = "local"): string {
  return `worker:${hostname}:${randomUUID().slice(0, 8)}`;
}

export function fenceToken(owner: string, epoch: number): string {
  return createHash("sha256").update(`${owner}:${epoch}`).digest("hex").slice(0, 32);
}
