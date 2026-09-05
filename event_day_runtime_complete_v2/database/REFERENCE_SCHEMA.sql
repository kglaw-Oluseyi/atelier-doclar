-- Reference only: adapt to the Event OS migration framework after R0 discovery.
CREATE TABLE edge_device_profile (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL, event_id uuid NOT NULL,
  asset_id text NOT NULL, device_class text NOT NULL, capabilities jsonb NOT NULL,
  certificate_thumbprint text NOT NULL, config_version text NOT NULL,
  issued_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz,
  UNIQUE (organisation_id, event_id, asset_id)
);
CREATE TABLE edge_ledger (
  operation_id uuid PRIMARY KEY, organisation_id uuid NOT NULL, event_id uuid NOT NULL,
  server_sequence bigint NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
  actor_id uuid NOT NULL, device_id uuid NOT NULL, command_type text NOT NULL,
  expected_version integer NOT NULL, resulting_version integer NOT NULL,
  payload jsonb NOT NULL, payload_hash char(64) NOT NULL, prior_entry_hash char(64), entry_hash char(64) NOT NULL,
  package_revision text NOT NULL, policy_version text NOT NULL,
  client_observed_at timestamptz NOT NULL, server_accepted_at timestamptz NOT NULL,
  UNIQUE (organisation_id, event_id, server_sequence)
);
CREATE TABLE edge_sync_outbox (
  operation_id uuid PRIMARY KEY REFERENCES edge_ledger(operation_id),
  state text NOT NULL CHECK (state IN ('PENDING','UPLOADED','APPLIED','REJECTED','QUARANTINED')),
  attempts integer NOT NULL DEFAULT 0, last_attempt_at timestamptz, cloud_evidence_id uuid
);
CREATE TABLE edge_scan_audit (
  id uuid PRIMARY KEY, organisation_id uuid NOT NULL, event_id uuid NOT NULL,
  device_id uuid NOT NULL, operator_id uuid, channel text NOT NULL, outcome_kind text NOT NULL,
  guest_id uuid, occurred_at timestamptz NOT NULL, operation_id uuid
);
CREATE TABLE face_candidate_nonce (
  assertion_id uuid PRIMARY KEY, organisation_id uuid NOT NULL, event_id uuid NOT NULL,
  nonce_hash char(64) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz
);
-- Production migrations must add tenant/event RLS or repository-equivalent server-enforced scoping,
-- append-only DB privileges/triggers, indexes, retention and rollback/containment evidence.

