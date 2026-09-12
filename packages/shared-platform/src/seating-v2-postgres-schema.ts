import {
  EOS_S06_SEATING_V2_MIGRATION_ID as SEATING_V2_MIGRATION_ID,
  EOS_S06_SEATING_V2_RECEIPT_ID as SEATING_V2_RECEIPT_ID,
  SEATING_V2_ASSIGNMENT_STATES,
  SEATING_V2_HARDNESS,
  SEATING_V2_PLAN_STATUSES,
  SEATING_V2_PREDICATES,
  SEATING_V2_PUBLICATION_STATUSES,
  SEATING_V2_RESERVATION_LIFECYCLES,
  SEATING_V2_RULE_LIFECYCLES,
  SEATING_V2_RULE_OUTCOMES,
  SEATING_V2_RUN_STATUSES,
  SEATING_V2_SCOPES,
  SEATING_V2_SPECIALIST_DOMAINS,
  SEATING_V2_STRUCTURAL_OUTCOMES,
  SEATING_V2_SUBJECT_TYPES,
  SEATING_V2_TARGET_TYPES,
  SEATING_V2_VERDICTS,
} from "./seating-v2-schemas.js";

export const EOS_S06_SEATING_V2_MIGRATION_ID = SEATING_V2_MIGRATION_ID;
export const EOS_S06_SEATING_V2_RECEIPT_ID = SEATING_V2_RECEIPT_ID;

export const SEATING_V2_SQL_TABLES = [
  "seating_v2_rules",
  "seating_v2_rule_editions",
  "seating_v2_rule_subjects",
  "seating_v2_rule_targets",
  "seating_v2_rule_annotations",
  "seating_v2_reservations",
  "seating_v2_reservation_editions",
  "seating_v2_reservation_members",
  "seating_v2_reservation_targets",
  "seating_v2_reservation_annotations",
  "seating_v2_input_packages",
  "seating_v2_package_guests",
  "seating_v2_package_positions",
  "seating_v2_package_rules",
  "seating_v2_package_reservations",
  "seating_v2_compiled_requests",
  "seating_v2_runs",
  "seating_v2_run_assignments",
  "seating_v2_validation_reports",
  "seating_v2_validation_rule_outcomes",
  "seating_v2_validation_structural_outcomes",
  "seating_v2_plan_editions",
  "seating_v2_plan_assignments",
  "seating_v2_plan_authors",
  "seating_v2_manual_previews",
  "seating_v2_manual_decisions",
  "seating_v2_specialist_reviews",
  "seating_v2_operational_approvals",
  "seating_v2_event_current",
  "seating_v2_publications",
  "seating_v2_export_jobs",
  "seating_v2_idempotency_receipts",
  "seating_v2_evaluation_runs",
  "seating_v2_evaluation_case_results",
  "seating_v2_migration_receipts",
] as const;

export type SeatingV2SqlTable = (typeof SEATING_V2_SQL_TABLES)[number];

function sqlIn(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(",");
}

const RULE_LIFECYCLE = sqlIn(SEATING_V2_RULE_LIFECYCLES);
const RESERVATION_LIFECYCLE = sqlIn(SEATING_V2_RESERVATION_LIFECYCLES);
const PREDICATE = sqlIn(SEATING_V2_PREDICATES);
const HARDNESS = sqlIn(SEATING_V2_HARDNESS);
const SCOPE = sqlIn(SEATING_V2_SCOPES);
const SPECIALIST = sqlIn(SEATING_V2_SPECIALIST_DOMAINS);
const SUBJECT = sqlIn(SEATING_V2_SUBJECT_TYPES);
const TARGET = sqlIn(SEATING_V2_TARGET_TYPES);
const ASSIGNMENT = sqlIn(SEATING_V2_ASSIGNMENT_STATES);
const RUN_STATUS = sqlIn(SEATING_V2_RUN_STATUSES);
const PLAN_STATUS = sqlIn(SEATING_V2_PLAN_STATUSES);
const PUBLICATION_STATUS = sqlIn(SEATING_V2_PUBLICATION_STATUSES);
const RULE_OUTCOME = sqlIn(SEATING_V2_RULE_OUTCOMES);
const STRUCTURAL = sqlIn(SEATING_V2_STRUCTURAL_OUTCOMES);
const VERDICT = sqlIn(SEATING_V2_VERDICTS);

export const SEATING_V2_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS seating_v2_rules (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_v2_rules_event_idx
  ON seating_v2_rules (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_v2_rule_editions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  edition_no INTEGER NOT NULL CHECK (edition_no >= 1),
  content_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (${PREDICATE})),
  hardness TEXT NOT NULL CHECK (hardness IN (${HARDNESS})),
  weight INTEGER,
  scope TEXT NOT NULL CHECK (scope IN (${SCOPE})),
  specialist_domain TEXT NOT NULL CHECK (specialist_domain IN (${SPECIALIST})),
  source_type TEXT NOT NULL,
  source_record_id TEXT,
  source_edition_id TEXT,
  source_content_hash TEXT,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN (${RULE_LIFECYCLE})),
  supersedes_edition_id TEXT,
  created_by_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  activated_by_person_id TEXT,
  activated_at TIMESTAMPTZ,
  withdrawn_by_person_id TEXT,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  CHECK ((hardness = 'SOFT' AND weight IS NOT NULL) OR (hardness <> 'SOFT' AND weight IS NULL)),
  UNIQUE (rule_id, edition_no)
);
CREATE INDEX IF NOT EXISTS seating_v2_rule_editions_event_idx
  ON seating_v2_rule_editions (organisation_id, event_id);
CREATE INDEX IF NOT EXISTS seating_v2_rule_editions_hash_idx
  ON seating_v2_rule_editions (content_hash);

CREATE TABLE IF NOT EXISTS seating_v2_rule_subjects (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  rule_edition_id TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN (${SUBJECT})),
  subject_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (rule_edition_id, subject_type, subject_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_rule_targets (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  rule_edition_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (${TARGET})),
  target_id_or_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (rule_edition_id, target_type, target_id_or_code)
);

CREATE TABLE IF NOT EXISTS seating_v2_rule_annotations (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  rule_edition_id TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL,
  actor_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_v2_rule_annotations_edition_idx
  ON seating_v2_rule_annotations (rule_edition_id);

CREATE TABLE IF NOT EXISTS seating_v2_reservations (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_v2_reservations_event_idx
  ON seating_v2_reservations (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_v2_reservation_editions (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  edition_no INTEGER NOT NULL CHECK (edition_no >= 1),
  content_hash TEXT NOT NULL,
  min_count INTEGER,
  max_count INTEGER,
  exact_count INTEGER,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN (${RESERVATION_LIFECYCLE})),
  release_decision TEXT,
  source_type TEXT NOT NULL,
  source_record_id TEXT,
  source_edition_id TEXT,
  source_content_hash TEXT,
  supersedes_edition_id TEXT,
  created_by_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  activated_by_person_id TEXT,
  activated_at TIMESTAMPTZ,
  released_by_person_id TEXT,
  released_at TIMESTAMPTZ,
  withdrawn_by_person_id TEXT,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  CHECK (min_count IS NULL OR min_count >= 0),
  CHECK (max_count IS NULL OR max_count >= 0),
  CHECK (exact_count IS NULL OR exact_count >= 0),
  CHECK (min_count IS NULL OR max_count IS NULL OR min_count <= max_count),
  UNIQUE (reservation_id, edition_no)
);
CREATE INDEX IF NOT EXISTS seating_v2_reservation_editions_event_idx
  ON seating_v2_reservation_editions (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_v2_reservation_members (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  reservation_edition_id TEXT NOT NULL,
  event_guest_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (reservation_edition_id, event_guest_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_reservation_targets (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  reservation_edition_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (${TARGET})),
  target_id_or_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (reservation_edition_id, target_type, target_id_or_code)
);

CREATE TABLE IF NOT EXISTS seating_v2_reservation_annotations (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  reservation_edition_id TEXT NOT NULL,
  label TEXT NOT NULL,
  note TEXT NOT NULL,
  actor_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_input_packages (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  semantic_hash TEXT NOT NULL,
  compiled_request_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  cohort_hash TEXT NOT NULL,
  rsvp_snapshot_hash TEXT NOT NULL,
  layout_publication_id TEXT NOT NULL,
  layout_content_hash TEXT NOT NULL,
  event_brief_edition_id TEXT,
  event_brief_content_hash TEXT,
  protection_snapshot_hash TEXT,
  lock_set_hash TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  solver_config_hash TEXT NOT NULL,
  deterministic_seed TEXT NOT NULL,
  frozen_by_person_id TEXT NOT NULL,
  frozen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organisation_id, event_id, content_hash)
);
CREATE INDEX IF NOT EXISTS seating_v2_input_packages_event_idx
  ON seating_v2_input_packages (organisation_id, event_id);
CREATE INDEX IF NOT EXISTS seating_v2_input_packages_hash_idx
  ON seating_v2_input_packages (content_hash);

CREATE TABLE IF NOT EXISTS seating_v2_package_guests (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  event_guest_id TEXT NOT NULL,
  solver_token TEXT NOT NULL,
  eligibility_code TEXT NOT NULL,
  rsvp_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (package_id, event_guest_id),
  UNIQUE (package_id, solver_token)
);

CREATE TABLE IF NOT EXISTS seating_v2_package_positions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  layout_table_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  layout_seat_anchor_id TEXT,
  position_token TEXT NOT NULL,
  zone_codes TEXT[] NOT NULL DEFAULT '{}',
  capability_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (package_id, layout_table_id, ordinal),
  UNIQUE (package_id, position_token)
);

CREATE TABLE IF NOT EXISTS seating_v2_package_rules (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  rule_edition_id TEXT NOT NULL,
  rule_content_hash TEXT NOT NULL,
  compiled_predicate_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (package_id, rule_edition_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_package_reservations (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  reservation_edition_id TEXT NOT NULL,
  reservation_content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (package_id, reservation_edition_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_compiled_requests (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  compiled_request_json JSONB NOT NULL,
  compiled_request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (package_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_runs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  solver_config_hash TEXT NOT NULL,
  deterministic_seed TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (${RUN_STATUS})),
  solver_claim TEXT,
  raw_output_hash TEXT,
  assignments_hash TEXT,
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_v2_runs_replay
  ON seating_v2_runs (organisation_id, event_id, package_hash, solver_version, solver_config_hash, deterministic_seed);
CREATE INDEX IF NOT EXISTS seating_v2_runs_event_idx
  ON seating_v2_runs (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_v2_run_assignments (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  run_id TEXT NOT NULL,
  guest_token TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (${ASSIGNMENT})),
  position_token TEXT,
  typed_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, guest_token)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_v2_run_assignments_occupied
  ON seating_v2_run_assignments (run_id, position_token)
  WHERE position_token IS NOT NULL AND state = 'SEATED';

CREATE TABLE IF NOT EXISTS seating_v2_validation_reports (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  package_id TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  assignments_hash TEXT NOT NULL,
  validator_version TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN (${VERDICT})),
  report_hash TEXT NOT NULL,
  produced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS seating_v2_validation_reports_package_idx
  ON seating_v2_validation_reports (package_id, report_hash);

CREATE TABLE IF NOT EXISTS seating_v2_validation_rule_outcomes (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  report_id TEXT NOT NULL,
  rule_edition_id TEXT NOT NULL,
  rule_content_hash TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN (${RULE_OUTCOME})),
  typed_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  affected_guest_tokens TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (report_id, rule_edition_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_validation_structural_outcomes (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  report_id TEXT NOT NULL,
  check_code TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN (${STRUCTURAL})),
  typed_detail TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (report_id, check_code)
);

CREATE TABLE IF NOT EXISTS seating_v2_plan_editions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  edition_no INTEGER NOT NULL CHECK (edition_no >= 1),
  package_id TEXT NOT NULL,
  package_hash TEXT NOT NULL,
  source_run_id TEXT,
  validation_report_id TEXT,
  validation_report_hash TEXT,
  assignments_hash TEXT NOT NULL,
  manual_decision_log_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (${PLAN_STATUS})),
  successor_of_edition_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 0),
  created_by_person_id TEXT NOT NULL,
  submitted_by_person_id TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organisation_id, event_id, edition_no)
);
CREATE INDEX IF NOT EXISTS seating_v2_plan_editions_event_idx
  ON seating_v2_plan_editions (organisation_id, event_id);

CREATE TABLE IF NOT EXISTS seating_v2_plan_assignments (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  event_guest_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (${ASSIGNMENT})),
  layout_table_id TEXT,
  logical_position_id TEXT,
  lock_state TEXT NOT NULL CHECK (lock_state IN ('UNLOCKED','LOCKED')),
  typed_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (plan_edition_id, event_guest_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_v2_plan_assignments_occupied
  ON seating_v2_plan_assignments (plan_edition_id, logical_position_id)
  WHERE logical_position_id IS NOT NULL AND state = 'SEATED';

CREATE TABLE IF NOT EXISTS seating_v2_plan_authors (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('CREATE','ADOPT','MANUAL_EDIT')),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (plan_edition_id, person_id, contribution_type)
);

CREATE TABLE IF NOT EXISTS seating_v2_manual_previews (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  plan_edition_version INTEGER NOT NULL,
  command_hash TEXT NOT NULL,
  proposed_assignments_hash TEXT NOT NULL,
  validation_report_id TEXT,
  validation_report_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_manual_decisions (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  resulting_edition_id TEXT NOT NULL,
  preview_id TEXT,
  command_type TEXT NOT NULL,
  before_hash TEXT NOT NULL,
  after_hash TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  reason_text TEXT,
  actor_person_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_specialist_reviews (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  plan_content_hash TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('SECURITY','PROTOCOL','ACCESSIBILITY')),
  reviewed_rule_edition_hashes TEXT[] NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  reason TEXT NOT NULL,
  reviewer_person_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  idempotency_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (plan_edition_id, plan_content_hash, domain)
);

CREATE TABLE IF NOT EXISTS seating_v2_operational_approvals (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  plan_edition_id TEXT NOT NULL,
  plan_content_hash TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  reason TEXT NOT NULL,
  approver_person_id TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_event_current (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  working_edition_id TEXT,
  submitted_edition_id TEXT,
  current_publication_id TEXT,
  version INTEGER NOT NULL CHECK (version >= 0),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organisation_id, event_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_publications (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  publication_no INTEGER NOT NULL CHECK (publication_no >= 1),
  plan_edition_id TEXT NOT NULL,
  plan_content_hash TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_content_hash TEXT NOT NULL,
  layout_publication_id TEXT NOT NULL,
  layout_content_hash TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  solver_config_hash TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  publisher_person_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (${PUBLICATION_STATUS})),
  supersedes_publication_id TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organisation_id, event_id, publication_no)
);
CREATE UNIQUE INDEX IF NOT EXISTS seating_v2_publications_one_current
  ON seating_v2_publications (organisation_id, event_id) WHERE status = 'CURRENT';

CREATE TABLE IF NOT EXISTS seating_v2_export_jobs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  source_type TEXT NOT NULL CHECK (source_type IN ('EDITION','PUBLICATION')),
  source_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  publication_no INTEGER,
  projection_class TEXT NOT NULL CHECK (projection_class IN ('FULL','OPERATIONAL','PERMISSION_SAFE','DOWNSTREAM')),
  format TEXT NOT NULL CHECK (format IN ('PDF','PNG','JSON')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','READY','FAILED')),
  generated_at TIMESTAMPTZ,
  storage_key TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_idempotency_receipts (
  organisation_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  action TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_identity TEXT NOT NULL,
  application TEXT NOT NULL CHECK (application IN ('APPLIED','REPLAYED','NOT_APPLIED')),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organisation_id, event_id, action, idempotency_key)
);

CREATE TABLE IF NOT EXISTS seating_v2_evaluation_runs (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  corpus_edition TEXT NOT NULL,
  corpus_hash TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  solver_version TEXT NOT NULL,
  config_hash TEXT NOT NULL,
  validator_version TEXT NOT NULL,
  projection_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','PASSED','FAILED','ERROR')),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  case_count INTEGER NOT NULL,
  passed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS seating_v2_evaluation_case_results (
  id TEXT PRIMARY KEY,
  organisation_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  run_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  observations JSONB NOT NULL,
  assertions JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASSED','FAILED','ERROR')),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (run_id, case_id)
);

CREATE TABLE IF NOT EXISTS seating_v2_migration_receipts (
  migration_id TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  counts JSONB NOT NULL
);
`;
