-- EOS-S01 isolated schema. This migration never reads or writes public or legacy tables.
CREATE SCHEMA IF NOT EXISTS eos_s01;

CREATE TABLE IF NOT EXISTS eos_s01.schema_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eos_s01.organisations (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
  default_timezone text NOT NULL,
  synthetic boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eos_s01.users (
  id uuid PRIMARY KEY,
  external_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  last_authenticated_at timestamptz,
  synthetic boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eos_s01.memberships (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);
CREATE INDEX IF NOT EXISTS memberships_org_idx ON eos_s01.memberships (organisation_id, user_id);

CREATE TABLE IF NOT EXISTS eos_s01.clients (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  code text NOT NULL,
  display_name text NOT NULL,
  legal_name text,
  status text NOT NULL CHECK (status IN ('PROSPECT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code)
);
CREATE INDEX IF NOT EXISTS clients_org_status_idx ON eos_s01.clients (organisation_id, status);

CREATE TABLE IF NOT EXISTS eos_s01.event_programmes (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  client_id uuid NOT NULL REFERENCES eos_s01.clients (id),
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  starts_at timestamptz,
  ends_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programmes_org_client_idx ON eos_s01.event_programmes (organisation_id, client_id);

CREATE TABLE IF NOT EXISTS eos_s01.events (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  client_id uuid NOT NULL REFERENCES eos_s01.clients (id),
  programme_id uuid REFERENCES eos_s01.event_programmes (id),
  code text NOT NULL,
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL,
  venue_summary text,
  phase text NOT NULL CHECK (phase IN ('DISCOVER', 'DESIGN', 'PREPARE', 'READY', 'LIVE', 'CLOSE', 'LEARN')),
  status text NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED', 'ARCHIVED')),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  synthetic boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, code),
  CHECK (ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS events_org_client_idx ON eos_s01.events (organisation_id, client_id, status);

CREATE TABLE IF NOT EXISTS eos_s01.event_phase_history (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  event_id uuid NOT NULL REFERENCES eos_s01.events (id),
  from_phase text,
  to_phase text NOT NULL,
  reason text,
  changed_by_user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phase_history_event_idx ON eos_s01.event_phase_history (event_id, changed_at);

CREATE TABLE IF NOT EXISTS eos_s01.master_event_files (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  client_id uuid NOT NULL REFERENCES eos_s01.clients (id),
  event_id uuid NOT NULL UNIQUE REFERENCES eos_s01.events (id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eos_s01.mef_slots (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  master_event_file_id uuid NOT NULL REFERENCES eos_s01.master_event_files (id),
  slot_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('NOT_COMPOSED', 'DRAFT', 'VERIFIED', 'CONFLICTED')),
  verification_state text NOT NULL CHECK (verification_state IN ('UNVERIFIED', 'HUMAN_VERIFIED')),
  note text,
  updated_by_user_id uuid REFERENCES eos_s01.users (id),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (master_event_file_id, slot_key)
);

CREATE TABLE IF NOT EXISTS eos_s01.departments (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, code)
);
CREATE INDEX IF NOT EXISTS departments_org_idx ON eos_s01.departments (organisation_id, status);

CREATE TABLE IF NOT EXISTS eos_s01.workstreams (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  event_id uuid NOT NULL REFERENCES eos_s01.events (id),
  department_id uuid NOT NULL REFERENCES eos_s01.departments (id),
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  operational_note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);
CREATE INDEX IF NOT EXISTS workstreams_org_event_idx ON eos_s01.workstreams (organisation_id, event_id, department_id);

CREATE TABLE IF NOT EXISTS eos_s01.roles (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  system_role boolean NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  UNIQUE (organisation_id, key)
);

CREATE TABLE IF NOT EXISTS eos_s01.permissions (
  key text PRIMARY KEY,
  description text NOT NULL,
  effect text NOT NULL,
  required_scope text NOT NULL,
  mutates boolean NOT NULL,
  external_effect boolean NOT NULL,
  ceo_reserved boolean NOT NULL,
  technical_only boolean NOT NULL,
  maker_checker boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS eos_s01.role_permissions (
  role_id uuid NOT NULL REFERENCES eos_s01.roles (id),
  permission_key text NOT NULL REFERENCES eos_s01.permissions (key),
  effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS eos_s01.assignments (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  client_id uuid REFERENCES eos_s01.clients (id),
  event_id uuid REFERENCES eos_s01.events (id),
  department_id uuid REFERENCES eos_s01.departments (id),
  workstream_id uuid REFERENCES eos_s01.workstreams (id),
  user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  role_id uuid NOT NULL REFERENCES eos_s01.roles (id),
  scope_kind text NOT NULL CHECK (scope_kind IN ('ORGANISATION', 'CLIENT', 'EVENT', 'WORKSTREAM', 'GOVERNANCE')),
  governance_mandate boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED')),
  granted_by_user_id uuid REFERENCES eos_s01.users (id),
  reason text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_org_user_idx ON eos_s01.assignments (organisation_id, user_id, status);

CREATE TABLE IF NOT EXISTS eos_s01.approval_policies (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  key text NOT NULL,
  action text NOT NULL,
  reserved_to_ceo boolean NOT NULL,
  active boolean NOT NULL,
  UNIQUE (organisation_id, key)
);

CREATE TABLE IF NOT EXISTS eos_s01.approval_requests (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  client_id uuid REFERENCES eos_s01.clients (id),
  event_id uuid REFERENCES eos_s01.events (id),
  kind text NOT NULL CHECK (kind IN ('EVENT_ARCHIVE', 'GOVERNANCE_RULE')),
  status text NOT NULL CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  title text NOT NULL,
  detail text NOT NULL,
  submitted_by_user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  decided_by_user_id uuid REFERENCES eos_s01.users (id),
  decision_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approvals_org_idx ON eos_s01.approval_requests (organisation_id, status);

CREATE TABLE IF NOT EXISTS eos_s01.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  organisation_id uuid REFERENCES eos_s01.organisations (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON eos_s01.sessions (user_id, revoked_at);

CREATE TABLE IF NOT EXISTS eos_s01.audit_events (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SERVICE', 'SYSTEM')),
  actor_user_id uuid,
  service text NOT NULL,
  action text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  organisation_id uuid,
  client_id uuid,
  event_id uuid,
  resource_type text NOT NULL,
  resource_id text,
  correlation_id text NOT NULL,
  reason text,
  before_hash text,
  after_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (octet_length(metadata::text) < 8000)
);
CREATE INDEX IF NOT EXISTS audit_scope_idx ON eos_s01.audit_events (organisation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_action_idx ON eos_s01.audit_events (action, outcome);

CREATE TABLE IF NOT EXISTS eos_s01.idempotency_records (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, actor_user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS eos_s01.audit_exports (
  id uuid PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES eos_s01.organisations (id),
  requested_by_user_id uuid NOT NULL REFERENCES eos_s01.users (id),
  settled_by_user_id uuid REFERENCES eos_s01.users (id),
  status text NOT NULL CHECK (status IN ('REQUESTED', 'SETTLED')),
  filter_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS eos_s01.rate_limits (
  bucket text PRIMARY KEY,
  hits integer NOT NULL,
  window_started_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION eos_s01.reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_no_update ON eos_s01.audit_events;
CREATE TRIGGER audit_no_update
  BEFORE UPDATE OR DELETE ON eos_s01.audit_events
  FOR EACH ROW EXECUTE FUNCTION eos_s01.reject_audit_mutation();

CREATE OR REPLACE FUNCTION eos_s01.enforce_event_lineage() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  client_org uuid;
  programme_org uuid;
  programme_client uuid;
BEGIN
  SELECT organisation_id INTO client_org FROM eos_s01.clients WHERE id = NEW.client_id;
  IF client_org IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'event client organisation lineage mismatch';
  END IF;
  IF NEW.programme_id IS NOT NULL THEN
    SELECT organisation_id, client_id INTO programme_org, programme_client
      FROM eos_s01.event_programmes WHERE id = NEW.programme_id;
    IF programme_org IS DISTINCT FROM NEW.organisation_id OR programme_client IS DISTINCT FROM NEW.client_id THEN
      RAISE EXCEPTION 'event programme lineage mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_lineage ON eos_s01.events;
CREATE TRIGGER events_lineage
  BEFORE INSERT OR UPDATE ON eos_s01.events
  FOR EACH ROW EXECUTE FUNCTION eos_s01.enforce_event_lineage();

CREATE OR REPLACE FUNCTION eos_s01.enforce_programme_lineage() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  client_org uuid;
BEGIN
  SELECT organisation_id INTO client_org FROM eos_s01.clients WHERE id = NEW.client_id;
  IF client_org IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'programme client organisation lineage mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS programmes_lineage ON eos_s01.event_programmes;
CREATE TRIGGER programmes_lineage
  BEFORE INSERT OR UPDATE ON eos_s01.event_programmes
  FOR EACH ROW EXECUTE FUNCTION eos_s01.enforce_programme_lineage();

CREATE OR REPLACE FUNCTION eos_s01.enforce_workstream_lineage() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  department_org uuid;
  department_status text;
  event_org uuid;
BEGIN
  SELECT organisation_id, status INTO department_org, department_status
    FROM eos_s01.departments WHERE id = NEW.department_id;
  SELECT organisation_id INTO event_org FROM eos_s01.events WHERE id = NEW.event_id;
  IF department_org IS DISTINCT FROM NEW.organisation_id OR event_org IS DISTINCT FROM NEW.organisation_id THEN
    RAISE EXCEPTION 'workstream organisation lineage mismatch';
  END IF;
  IF TG_OP = 'INSERT' AND department_status IS DISTINCT FROM 'ACTIVE' THEN
    RAISE EXCEPTION 'inactive department';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workstreams_lineage ON eos_s01.workstreams;
CREATE TRIGGER workstreams_lineage
  BEFORE INSERT OR UPDATE ON eos_s01.workstreams
  FOR EACH ROW EXECUTE FUNCTION eos_s01.enforce_workstream_lineage();
