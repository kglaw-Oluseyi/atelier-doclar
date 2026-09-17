/**
 * Local CP-SAT queue claim / lease helpers (ephemeral PostgreSQL).
 * Checkpoint 2 — no Railway worker deployment.
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
  status = 'RUNNING',
  lease_owner = $1,
  lease_epoch = r.lease_epoch + 1,
  lease_until = NOW() + ($2::text || ' seconds')::interval,
  heartbeat_at = NOW(),
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
  AND status = 'RUNNING'
RETURNING id;
`;

export const CPSAT_FENCED_SETTLE_SQL = `
UPDATE cpsat_solver_runs
SET status = $5,
    product_result = $6,
    stop_reason = $7,
    freshness = $8,
    evidence_grade = $9,
    fault_code = $10,
    lease_owner = NULL,
    lease_until = NULL,
    updated_at = NOW()
WHERE id = $1
  AND lease_owner = $2
  AND lease_epoch = $3
  AND status = 'RUNNING'
RETURNING id;
`;

export function newWorkerLeaseOwner(hostname = "local"): string {
  return `worker:${hostname}:${randomUUID().slice(0, 8)}`;
}

export function fenceToken(owner: string, epoch: number): string {
  return createHash("sha256").update(`${owner}:${epoch}`).digest("hex").slice(0, 32);
}

/** Round-robin fairness: prefer events with fewest active RUNNING rows. */
export const CPSAT_FAIR_CLAIM_SQL = `
WITH active AS (
  SELECT event_id, COUNT(*)::int AS running_count
  FROM cpsat_solver_runs
  WHERE status = 'RUNNING'
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
  status = 'RUNNING',
  lease_owner = $1,
  lease_epoch = r.lease_epoch + 1,
  lease_until = NOW() + ($2::text || ' seconds')::interval,
  heartbeat_at = NOW(),
  updated_at = NOW()
FROM next_run
WHERE r.id = next_run.id
RETURNING r.id, r.event_id, r.priority, r.status, r.lease_epoch, r.request_hash;
`;
