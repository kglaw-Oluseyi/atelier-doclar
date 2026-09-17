/**
 * Durable CP-SAT solver queue / leases / evidence (Checkpoint 2 local product).
 * Migration 011 is already registered; Milestone 1 authority/idempotency columns are additive 012.
 */
export const EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID = "011_cpsat_solver_queue" as const;
export const EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID = "012_cpsat_solver_queue_launch" as const;

export const CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS cpsat_solver_runs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  package_id TEXT,
  priority TEXT NOT NULL DEFAULT 'PLANNING',
  status TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'REPLAY',
  purpose TEXT NOT NULL DEFAULT 'PLANNING',
  seed BIGINT NOT NULL DEFAULT 1,
  request_hash TEXT NOT NULL,
  closure_hash TEXT,
  index_map_hash TEXT,
  lease_owner TEXT,
  lease_epoch BIGINT NOT NULL DEFAULT 0,
  lease_until TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  product_result TEXT,
  stop_reason TEXT,
  freshness TEXT NOT NULL DEFAULT 'FRESH',
  evidence_grade TEXT,
  engine_ortools TEXT,
  engine_python TEXT,
  model_version TEXT,
  fault_code TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  stop_and_keep_best BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS cpsat_solver_runs_claim_idx
  ON cpsat_solver_runs (status, priority, created_at);

CREATE TABLE IF NOT EXISTS cpsat_solver_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS cpsat_solver_index_maps (
  run_id TEXT PRIMARY KEY REFERENCES cpsat_solver_runs(id),
  map_json JSONB NOT NULL,
  map_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cpsat_solver_candidates (
  run_id TEXT PRIMARY KEY REFERENCES cpsat_solver_runs(id),
  sealed BOOLEAN NOT NULL DEFAULT FALSE,
  assignment_hash TEXT,
  assignment_count INTEGER,
  payload JSONB
);

CREATE TABLE IF NOT EXISTS cpsat_solver_assignments (
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  guest_token TEXT NOT NULL,
  position_token TEXT,
  table_token TEXT,
  state TEXT NOT NULL,
  reason_code TEXT,
  PRIMARY KEY (run_id, guest_token)
);

CREATE TABLE IF NOT EXISTS cpsat_solver_explanations (
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  guest_token TEXT NOT NULL,
  code TEXT NOT NULL,
  text TEXT NOT NULL,
  evidence JSONB NOT NULL,
  edition TEXT NOT NULL,
  PRIMARY KEY (run_id, guest_token)
);

CREATE TABLE IF NOT EXISTS cpsat_solver_infeasibility (
  run_id TEXT PRIMARY KEY REFERENCES cpsat_solver_runs(id),
  grade TEXT NOT NULL,
  certificate_type TEXT,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS cpsat_solver_incidents (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES cpsat_solver_runs(id),
  at TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL,
  detail JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS cpsat_solver_adoptions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  event_id TEXT NOT NULL,
  adopted_at TIMESTAMPTZ NOT NULL,
  assignment_hash TEXT NOT NULL,
  maker_actor TEXT NOT NULL,
  checker_actor TEXT NOT NULL,
  holder_epoch BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cpsat_solver_authority_pointers (
  event_id TEXT PRIMARY KEY,
  current_adoption_id TEXT,
  holder TEXT NOT NULL DEFAULT 'CENTRAL',
  holder_epoch BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);
`;

/** Additive Milestone 1 launch columns — never rewrite applied 011. */
export const CPSAT_SOLVER_QUEUE_LAUNCH_POSTGRES_SCHEMA = `
ALTER TABLE cpsat_solver_runs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS layout_id TEXT,
  ADD COLUMN IF NOT EXISTS layout_version TEXT,
  ADD COLUMN IF NOT EXISTS layout_hash TEXT,
  ADD COLUMN IF NOT EXISTS rules_edition_id TEXT,
  ADD COLUMN IF NOT EXISTS rules_hash TEXT,
  ADD COLUMN IF NOT EXISTS guest_edition_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_edition_hash TEXT,
  ADD COLUMN IF NOT EXISTS objective_edition_id TEXT,
  ADD COLUMN IF NOT EXISTS objective_edition_hash TEXT,
  ADD COLUMN IF NOT EXISTS baseline_adoption_id TEXT,
  ADD COLUMN IF NOT EXISTS baseline_plan_hash TEXT,
  ADD COLUMN IF NOT EXISTS request_json JSONB,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS cpsat_solver_runs_event_idempotency_uidx
  ON cpsat_solver_runs (event_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
`;
