import { createHash } from "node:crypto";
import { PLATFORM_POSTGRES_SCHEMA, type PgQueryable, type PgTransactor } from "./postgres-schema.js";
import { RISK_PROTECTION_POSTGRES_SCHEMA, RISK_PROTECTION_POSTGRES_SCHEMA_V3, RISK_PROTECTION_POSTGRES_SCHEMA_V4 } from "./risk-postgres-schema.js";
import { SEATING_ALLOCATION_POSTGRES_SCHEMA } from "./seating-postgres-schema.js";
import {
  EOS_S06_SEATING_V2_MIGRATION_ID,
  EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID,
  EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID,
  SEATING_V2_POSTGRES_SCHEMA,
  SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA,
  SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA,
} from "./seating-v2-postgres-schema.js";
import {
  EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID,
  EOS_S06_CPSAT_SOLVER_WORKER_REGISTRY_MIGRATION_ID,
  CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA,
  CPSAT_SOLVER_QUEUE_LAUNCH_POSTGRES_SCHEMA,
  CPSAT_SOLVER_QUEUE_WORKER_POSTGRES_SCHEMA,
  CPSAT_SOLVER_REVIEW_ADOPTION_POSTGRES_SCHEMA,
  CPSAT_SOLVER_DIAGNOSTICS_POSTGRES_SCHEMA,
  CPSAT_SOLVER_WORKER_REGISTRY_POSTGRES_SCHEMA,
} from "./cpsat/postgres-schema.js";

export const PLATFORM_MIGRATION_TABLE = `
CREATE TABLE IF NOT EXISTS platform_schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL,
  checksum TEXT NOT NULL
);
`;

export const PLATFORM_SEED_LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS platform_seed_ledger (
  seed_id TEXT PRIMARY KEY,
  seed_version TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  record_count INTEGER NOT NULL,
  synthetic BOOLEAN NOT NULL DEFAULT TRUE
);
`;

export const PLATFORM_CLEANUP_AUDIT_SCHEMA = `
CREATE TABLE IF NOT EXISTS platform_cleanup_audit (
  id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  seed_id TEXT,
  collections JSONB NOT NULL,
  confirmed BOOLEAN NOT NULL
);
`;

export interface PlatformMigration {
  readonly id: string;
  readonly sql: string;
}

export const PLATFORM_MIGRATIONS: readonly PlatformMigration[] = [
  {
    id: "001_schema_migrations",
    sql: PLATFORM_MIGRATION_TABLE,
  },
  {
    id: "002_platform_core",
    sql: PLATFORM_POSTGRES_SCHEMA,
  },
  {
    id: "003_seed_and_cleanup",
    sql: `${PLATFORM_SEED_LEDGER_SCHEMA}\n${PLATFORM_CLEANUP_AUDIT_SCHEMA}`,
  },
  {
    id: "004_risk_protection_normalized",
    sql: RISK_PROTECTION_POSTGRES_SCHEMA,
  },
  {
    id: "005_risk_dossier_access_grants",
    sql: RISK_PROTECTION_POSTGRES_SCHEMA_V3,
  },
  {
    id: "006_risk_authority_governance_receipts",
    sql: RISK_PROTECTION_POSTGRES_SCHEMA_V4,
  },
  {
    id: "007_seating_allocation",
    sql: SEATING_ALLOCATION_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_SEATING_V2_MIGRATION_ID,
    sql: SEATING_V2_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_SEATING_V2_REPLAY_IDENTITY_MIGRATION_ID,
    sql: SEATING_V2_REPLAY_IDENTITY_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_SEATING_V2_LAYOUT_BINDING_MIGRATION_ID,
    sql: SEATING_V2_LAYOUT_BINDING_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_QUEUE_MIGRATION_ID,
    sql: CPSAT_SOLVER_QUEUE_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_QUEUE_LAUNCH_MIGRATION_ID,
    sql: CPSAT_SOLVER_QUEUE_LAUNCH_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_QUEUE_WORKER_MIGRATION_ID,
    sql: CPSAT_SOLVER_QUEUE_WORKER_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_REVIEW_ADOPTION_MIGRATION_ID,
    sql: CPSAT_SOLVER_REVIEW_ADOPTION_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_DIAGNOSTICS_MIGRATION_ID,
    sql: CPSAT_SOLVER_DIAGNOSTICS_POSTGRES_SCHEMA,
  },
  {
    id: EOS_S06_CPSAT_SOLVER_WORKER_REGISTRY_MIGRATION_ID,
    sql: CPSAT_SOLVER_WORKER_REGISTRY_POSTGRES_SCHEMA,
  },
];

export type MigrationStatus = "APPLIED" | "FAILED" | "PENDING";

export interface MigrationReport {
  status: MigrationStatus;
  applied: string[];
  failedId?: string;
}

export function checksumFor(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

export async function appliedMigrations(client: PgQueryable): Promise<Map<string, string>> {
  try {
    const rows = await client.query<{ id: string; checksum: string }>(
      "SELECT id, checksum FROM platform_schema_migrations",
    );
    return new Map(rows.rows.map((row) => [row.id, row.checksum]));
  } catch {
    return new Map();
  }
}

export async function runPlatformMigrations(client: PgQueryable): Promise<MigrationReport> {
  await client.query(PLATFORM_MIGRATION_TABLE);
  const applied = await appliedMigrations(client);
  const newly: string[] = [];
  for (const migration of PLATFORM_MIGRATIONS) {
    const checksum = checksumFor(migration.sql);
    const existing = applied.get(migration.id);
    if (existing) {
      if (existing !== checksum) {
        throw new Error(`platform migration ${migration.id} checksum mismatch; failing closed`);
      }
      continue;
    }
    const run = async (tx: PgQueryable) => {
      await tx.query(migration.sql);
      await tx.query(
        "INSERT INTO platform_schema_migrations (id, applied_at, checksum) VALUES ($1, $2, $3)",
        [migration.id, new Date().toISOString(), checksum],
      );
    };
    try {
      if (hasTransaction(client)) {
        await client.transaction(run);
      } else {
        await run(client);
      }
      newly.push(migration.id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown migration failure";
      throw new Error(`platform migration ${migration.id} failed closed: ${reason}`);
    }
  }
  return { status: "APPLIED", applied: [...applied.keys(), ...newly] };
}
