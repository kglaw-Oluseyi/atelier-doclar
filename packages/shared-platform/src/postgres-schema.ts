export const PLATFORM_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS platform_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  organisation_id TEXT,
  client_id TEXT,
  event_id TEXT,
  version INTEGER NOT NULL,
  body JSONB NOT NULL,
  PRIMARY KEY (collection, id)
);

CREATE TABLE IF NOT EXISTS platform_audit (
  id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  organisation_id TEXT,
  client_id TEXT,
  event_id TEXT,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  body JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_idempotency (
  key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  hash TEXT NOT NULL,
  result_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  body JSONB NOT NULL
);
`;

export interface PgQueryable {
  query<T extends object = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}
