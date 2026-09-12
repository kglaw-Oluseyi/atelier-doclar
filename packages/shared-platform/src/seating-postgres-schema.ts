export const EOS_S06_SEATING_MIGRATION_ID = "007_seating_allocation" as const;
export const EOS_S06_SEATING_RECEIPT_ID = "EOS-S06-SEATING-V1" as const;

export const SEATING_SQL_TABLES = [
  "seating_input_editions",
  "seating_guest_tokens",
  "seating_positions",
  "seating_constraints",
  "seating_reservation_blocks",
  "seating_solver_configs",
  "seating_runs",
  "seating_run_assignments",
  "seating_findings",
  "seating_plan_editions",
  "seating_plan_assignments",
  "seating_manual_decisions",
  "seating_reviews",
  "seating_approvals",
  "seating_publications",
  "seating_export_jobs",
  "seating_evaluation_runs",
  "seating_evaluation_case_results",
  "seating_idempotency_receipts",
  "seating_migration_receipts",
] as const;

export type SeatingSqlTable = (typeof SEATING_SQL_TABLES)[number];

export const SEATING_ALLOCATION_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS seating_input_editions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 0),
  status TEXT NOT NULL CHECK (status IN ('FROZEN','STALE','SUPERSEDED')),
  guest_cohort_hash TEXT NOT NULL,
  rsvp_truth_hash TEXT NOT NULL,
  layout_publication_id TEXT NOT NULL,
  layout_content_hash TEXT NOT NULL,
  event_brief_edition_id TEXT,
  event_brief_content_hash TEXT,
  protection_snapshot_hash TEXT,
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  current BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_input_editions_one_current
  ON seating_input_editions (organisation_id, event_id) WHERE current IS TRUE;
CREATE INDEX IF NOT EXISTS seating_input_editions_hash_idx
  ON seating_input_editions (content_hash);
CREATE INDEX IF NOT EXISTS seating_input_editions_event_idx
  ON seating_input_editions (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_guest_tokens (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  input_edition_id TEXT NOT NULL,
  event_guest_id TEXT NOT NULL,
  solver_token TEXT NOT NULL,
  eligible BOOLEAN NOT NULL,
  eligibility_code TEXT NOT NULL,
  status_code TEXT NOT NULL,
  party_token TEXT,
  capability_codes TEXT[] NOT NULL DEFAULT '{}',
  protocol_codes TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (input_edition_id, event_guest_id),
  UNIQUE (input_edition_id, solver_token)
);

CREATE TABLE IF NOT EXISTS seating_positions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  input_edition_id TEXT NOT NULL,
  layout_object_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  layout_seat_anchor_id TEXT,
  position_token TEXT NOT NULL,
  table_token TEXT NOT NULL,
  zone_codes TEXT[] NOT NULL DEFAULT '{}',
  capability_codes TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (input_edition_id, layout_object_id, ordinal),
  UNIQUE (input_edition_id, position_token)
);

CREATE TABLE IF NOT EXISTS seating_constraints (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('HARD','WEIGHTED','INFORMATION')),
  predicate_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  weight INTEGER,
  authority TEXT NOT NULL,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  disclosure_class TEXT NOT NULL,
  review_domain TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED')),
  version INTEGER NOT NULL CHECK (version >= 0),
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_constraints_event_idx
  ON seating_constraints (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_reservation_blocks (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  eligible_set_code TEXT NOT NULL,
  eligible_guest_ids TEXT[] NOT NULL DEFAULT '{}',
  table_refs TEXT[] NOT NULL DEFAULT '{}',
  zone_refs TEXT[] NOT NULL DEFAULT '{}',
  min_count INTEGER,
  max_count INTEGER,
  exact_count INTEGER,
  priority INTEGER NOT NULL,
  release_state TEXT NOT NULL CHECK (release_state IN ('ACTIVE','RELEASED')),
  version INTEGER NOT NULL CHECK (version >= 0),
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (min_count IS NULL OR min_count >= 0),
  CHECK (max_count IS NULL OR max_count >= 0),
  CHECK (exact_count IS NULL OR exact_count >= 0),
  CHECK (min_count IS NULL OR max_count IS NULL OR min_count <= max_count)
);
CREATE INDEX IF NOT EXISTS seating_reservation_blocks_event_idx
  ON seating_reservation_blocks (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_solver_configs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL,
  objective_order TEXT[] NOT NULL,
  time_limit_ms INTEGER NOT NULL,
  memory_limit_mb INTEGER NOT NULL,
  alternative_count INTEGER NOT NULL,
  materiality_threshold INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','ACCEPTED','SUPERSEDED')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_runs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  input_edition_id TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  config_id TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  seed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','FEASIBLE','INFEASIBLE','TIMED_OUT','ERROR','CANCELLED')),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  attempt INTEGER NOT NULL DEFAULT 0,
  metrics JSONB,
  result_hash TEXT,
  failure_code TEXT,
  version INTEGER NOT NULL CHECK (version >= 0),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_runs_idempotent
  ON seating_runs (organisation_id, event_id, input_hash, config_hash, seed);
CREATE INDEX IF NOT EXISTS seating_runs_event_idx
  ON seating_runs (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_run_assignments (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  guest_token TEXT NOT NULL,
  position_token TEXT,
  state TEXT NOT NULL CHECK (state IN ('SEATED','UNSEATED')),
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, guest_token)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_run_assignments_occupied
  ON seating_run_assignments (run_id, position_token) WHERE position_token IS NOT NULL AND state = 'SEATED';

CREATE TABLE IF NOT EXISTS seating_findings (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  run_id TEXT,
  plan_id TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('BLOCKER','WARNING','INFO')),
  rule_ref TEXT,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  affected_tokens TEXT[] NOT NULL DEFAULT '{}',
  code TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_findings_run_idx ON seating_findings (run_id);
CREATE INDEX IF NOT EXISTS seating_findings_plan_idx ON seating_findings (plan_id);

CREATE TABLE IF NOT EXISTS seating_plan_editions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  source_run_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','SUPERSEDED','WITHDRAWN')),
  content_hash TEXT NOT NULL,
  current_working BOOLEAN NOT NULL,
  material_author_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_plan_editions_one_working
  ON seating_plan_editions (organisation_id, event_id) WHERE current_working IS TRUE;

CREATE TABLE IF NOT EXISTS seating_plan_assignments (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  event_guest_id TEXT NOT NULL,
  table_id TEXT,
  position_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('SEATED','UNSEATED')),
  lock_state TEXT NOT NULL CHECK (lock_state IN ('UNLOCKED','LOCKED')),
  provenance TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (edition_id, event_guest_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_plan_assignments_occupied
  ON seating_plan_assignments (edition_id, position_id) WHERE position_id IS NOT NULL AND state = 'SEATED';

CREATE TABLE IF NOT EXISTS seating_manual_decisions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  command TEXT NOT NULL,
  before_hash TEXT NOT NULL,
  after_hash TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_text TEXT,
  actor_person_id TEXT NOT NULL,
  validation_result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_reviews (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  edition_hash TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('PROTOCOL','ACCESSIBILITY','SECURITY')),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  reviewer_person_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (edition_id, edition_hash, domain)
);

CREATE TABLE IF NOT EXISTS seating_approvals (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  edition_hash TEXT NOT NULL,
  approver_person_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_publications (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  publication_number INTEGER NOT NULL,
  edition_id TEXT NOT NULL,
  edition_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  layout_hash TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  publisher_person_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CURRENT','SUPERSEDED','WITHDRAWN')),
  published_at TIMESTAMPTZ NOT NULL,
  supersedes_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_publications_one_current
  ON seating_publications (organisation_id, event_id) WHERE status = 'CURRENT';

CREATE TABLE IF NOT EXISTS seating_export_jobs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  publication_id TEXT,
  edition_id TEXT,
  format TEXT NOT NULL CHECK (format IN ('PDF','PNG','JSON')),
  projection_class TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','READY','FAILED')),
  generated_at TIMESTAMPTZ,
  object_key TEXT,
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_export_jobs_identity
  ON seating_export_jobs (organisation_id, event_id, COALESCE(publication_id, ''), COALESCE(edition_id, ''), format, projection_class);

CREATE TABLE IF NOT EXISTS seating_evaluation_runs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  corpus_edition TEXT NOT NULL,
  corpus_hash TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  projection_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','PASSED','FAILED','ERROR')),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  case_count INTEGER NOT NULL,
  passed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_evaluation_case_results (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  observations JSONB NOT NULL,
  assertions JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASSED','FAILED','ERROR')),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, case_id)
);

CREATE TABLE IF NOT EXISTS seating_idempotency_receipts (
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_identity TEXT NOT NULL,
  application TEXT NOT NULL CHECK (application IN ('APPLIED','REPLAYED','NOT_APPLIED')),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organisation_id, event_id, action, idempotency_key)
);

CREATE TABLE IF NOT EXISTS seating_migration_receipts (
  migration_id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  counts JSONB NOT NULL
);
`;
