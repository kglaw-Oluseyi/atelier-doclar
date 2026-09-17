/**
 * Durable CP-SAT solver queue / leases / evidence (Checkpoint 2 local product).
 * Migration 011 is already registered; Milestone 1 authority/idempotency columns are additive 012.
 */
export const EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID = "011_cpsat_solver_queue" as const;
export const EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID = "012_cpsat_solver_queue_launch" as const;
export const EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID = "013_cpsat_solver_queue_worker" as const;
export const EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID = "014_cpsat_solver_review_adoption" as const;
export const EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID = "015_cpsat_solver_diagnostics" as const;

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

/** Additive Milestone 2 worker progress / seal / authority snapshot columns. */
export const CPSAT_SOLVER_QUEUE_WORKER_POSTGRES_SCHEMA = `
ALTER TABLE cpsat_solver_runs
  ADD COLUMN IF NOT EXISTS progress_phase TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS child_invocation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS authored_authority_json JSONB,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 2;

ALTER TABLE cpsat_solver_candidates
  ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_result TEXT,
  ADD COLUMN IF NOT EXISTS movement_tier INTEGER,
  ADD COLUMN IF NOT EXISTS preference_tier INTEGER,
  ADD COLUMN IF NOT EXISTS verification_payload JSONB;

CREATE INDEX IF NOT EXISTS cpsat_solver_runs_lease_reaper_idx
  ON cpsat_solver_runs (status, lease_until)
  WHERE status IN ('CLAIMED', 'RUNNING') AND lease_until IS NOT NULL;
`;

/**
 * Milestone 3 — maker-checker proposals + immutable adoption / supersession columns.
 * Reuses S06 permission semantics; cpsat_solver_runs remains lifecycle authority.
 */
export const CPSAT_SOLVER_REVIEW_ADOPTION_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS cpsat_solver_proposals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  candidate_id TEXT NOT NULL,
  assignment_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  maker_actor TEXT NOT NULL,
  maker_at TIMESTAMPTZ NOT NULL,
  checker_actor TEXT,
  checker_at TIMESTAMPTZ,
  decision TEXT,
  rejection_reason TEXT,
  layout_hash TEXT NOT NULL,
  rules_hash TEXT NOT NULL,
  guest_edition_hash TEXT NOT NULL,
  objective_edition_hash TEXT NOT NULL,
  baseline_plan_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cpsat_solver_proposals_active_uidx
  ON cpsat_solver_proposals (run_id, assignment_hash)
  WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX IF NOT EXISTS cpsat_solver_proposals_event_idx
  ON cpsat_solver_proposals (event_id, created_at DESC);

ALTER TABLE cpsat_solver_adoptions
  ADD COLUMN IF NOT EXISTS organisation_id TEXT,
  ADD COLUMN IF NOT EXISTS candidate_id TEXT,
  ADD COLUMN IF NOT EXISTS proposal_id TEXT,
  ADD COLUMN IF NOT EXISTS approval_id TEXT,
  ADD COLUMN IF NOT EXISTS adopting_actor TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_adoption_id TEXT,
  ADD COLUMN IF NOT EXISTS freshness_at_adoption TEXT,
  ADD COLUMN IF NOT EXISTS product_result TEXT,
  ADD COLUMN IF NOT EXISTS evidence_grade TEXT,
  ADD COLUMN IF NOT EXISTS layout_hash TEXT,
  ADD COLUMN IF NOT EXISTS rules_hash TEXT,
  ADD COLUMN IF NOT EXISTS guest_edition_hash TEXT,
  ADD COLUMN IF NOT EXISTS objective_edition_hash TEXT,
  ADD COLUMN IF NOT EXISTS baseline_plan_hash TEXT;

CREATE INDEX IF NOT EXISTS cpsat_solver_adoptions_event_idx
  ON cpsat_solver_adoptions (event_id, adopted_at DESC);
`;

/**
 * Milestone 4 — stop modes, progress observability, infeasibility evidence,
 * confirmation re-solve, and counterfactual persistence.
 * Additive only; never rewrite 011–014.
 */
export const CPSAT_SOLVER_DIAGNOSTICS_POSTGRES_SCHEMA = `
ALTER TABLE cpsat_solver_runs
  ADD COLUMN IF NOT EXISTS stop_mode TEXT,
  ADD COLUMN IF NOT EXISTS stop_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stop_observed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incumbent_present BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS solutions_found INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier TEXT,
  ADD COLUMN IF NOT EXISTS best_objective_value BIGINT,
  ADD COLUMN IF NOT EXISTS best_objective_bound BIGINT,
  ADD COLUMN IF NOT EXISTS objective_gap BIGINT,
  ADD COLUMN IF NOT EXISTS deterministic_ms_used BIGINT,
  ADD COLUMN IF NOT EXISTS wall_ms_used BIGINT,
  ADD COLUMN IF NOT EXISTS diagnostic_phase TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_seed BIGINT,
  ADD COLUMN IF NOT EXISTS confirmation_request_hash TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_response_hash TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_result TEXT,
  ADD COLUMN IF NOT EXISTS parent_run_id TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_class TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cpsat_solver_infeasibility
  ADD COLUMN IF NOT EXISTS layer TEXT,
  ADD COLUMN IF NOT EXISTS certificate_type_v2 TEXT,
  ADD COLUMN IF NOT EXISTS evidence_grade TEXT,
  ADD COLUMN IF NOT EXISTS certificate_payload JSONB,
  ADD COLUMN IF NOT EXISTS typescript_check TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_seed BIGINT,
  ADD COLUMN IF NOT EXISTS confirmation_result TEXT,
  ADD COLUMN IF NOT EXISTS core_rule_refs JSONB,
  ADD COLUMN IF NOT EXISTS core_minimality TEXT,
  ADD COLUMN IF NOT EXISTS correction_rule_refs JSONB,
  ADD COLUMN IF NOT EXISTS correction_optimality TEXT,
  ADD COLUMN IF NOT EXISTS max_seat_count INTEGER,
  ADD COLUMN IF NOT EXISTS eligible_total INTEGER,
  ADD COLUMN IF NOT EXISTS diagnostic_assignment_hash TEXT,
  ADD COLUMN IF NOT EXISTS diagnostic_only BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS budget_exhausted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unseated_unit_refs JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS cpsat_solver_counterfactuals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES cpsat_solver_runs(id),
  candidate_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  guest_token TEXT NOT NULL,
  unit_ref TEXT,
  table_token TEXT NOT NULL,
  actor_person_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  result_code TEXT NOT NULL,
  tier_deltas JSONB,
  conflict_refs JSONB,
  authority_layout_hash TEXT NOT NULL,
  authority_rules_hash TEXT NOT NULL,
  authority_guest_hash TEXT NOT NULL,
  authority_objective_hash TEXT NOT NULL,
  candidate_assignment_hash TEXT NOT NULL,
  engine_build TEXT NOT NULL,
  diagnostic_budget_edition TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  request_hash TEXT,
  response_hash TEXT,
  stale BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  diagnostic_only BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS cpsat_solver_counterfactuals_cache_uidx
  ON cpsat_solver_counterfactuals (cache_key);

CREATE INDEX IF NOT EXISTS cpsat_solver_counterfactuals_run_idx
  ON cpsat_solver_counterfactuals (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS cpsat_solver_runs_stop_mode_idx
  ON cpsat_solver_runs (status, stop_mode)
  WHERE stop_mode IS NOT NULL;
`;
