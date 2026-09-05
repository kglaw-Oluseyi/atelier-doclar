export const PROGRAMME_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS programme_events (
  position BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  body JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS programme_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  source_event_position BIGINT NOT NULL,
  body JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS programme_audit (
  id TEXT PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT NOT NULL,
  body JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS programme_deliveries (
  delivery_id TEXT PRIMARY KEY,
  seen_at TIMESTAMPTZ NOT NULL
);
`;

export interface PgQueryable {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}
