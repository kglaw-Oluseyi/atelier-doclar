import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { seedFoundation } from "./seed";

const MIGRATION_ID = "001_foundation";

export async function migrate(connectionString = process.env.DATABASE_URL): Promise<void> {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "../migrations/001_foundation.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS eos_s01");
    await client.query(sql);
    const existing = await client.query<{ checksum: string }>(
      "SELECT checksum FROM eos_s01.schema_migrations WHERE id = $1",
      [MIGRATION_ID],
    );
    const current = existing.rows[0];
    if (current && current.checksum !== checksum) {
      throw new Error(`migration ${MIGRATION_ID} drifted`);
    }
    if (!current) {
      await client.query("INSERT INTO eos_s01.schema_migrations (id, checksum) VALUES ($1, $2)", [
        MIGRATION_ID,
        checksum,
      ]);
    }
  } finally {
    await client.end();
  }
  await seedFoundation();
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  migrate()
    .then(() => {
      console.log(
        JSON.stringify({ migration: MIGRATION_ID, schema: "eos_s01", result: "APPLIED" }),
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
