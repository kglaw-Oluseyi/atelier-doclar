import { createHash, randomUUID } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { exactHash } from "./eec-hash.js";
import type { PgQueryable, PgTransactor } from "./postgres-schema.js";
import { EOS_S05B_PROTECTION_V2_ID, RISK_SQL_TABLES } from "./risk-postgres-schema.js";
import { S05BMigrationReceiptSchema, type S05BMigrationReceipt } from "./risk-schemas.js";
import { PostgresRiskProtectionStore } from "./postgres-risk-store.js";
import { emptySnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S05B_V2_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05B_PROTECTION_V2_ID}:normalized-risk-protection-tables:backfill-from-platform-documents`)
  .digest("hex");

function hasTransaction(client: PgQueryable): client is PgTransactor {
  return typeof (client as PgTransactor).transaction === "function";
}

function asBody<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

export type NormalizedRiskBackfillResult = {
  status: "APPLIED" | "REPLAYED";
  receipt: S05BMigrationReceipt;
  createdRecords: Record<string, number>;
};

export async function backfillNormalizedRiskTables(
  client: PgQueryable,
  now = new Date().toISOString(),
): Promise<NormalizedRiskBackfillResult> {
  const existing = await client.query<{ body: unknown }>("SELECT body FROM risk_migration_receipts");
  const existingReceipt = existing.rows
    .map((row) => asBody<S05BMigrationReceipt>(row.body))
    .find((item) => item.migrationId === EOS_S05B_PROTECTION_V2_ID && item.status === "APPLIED");
  if (existingReceipt) {
    return { status: "REPLAYED", receipt: existingReceipt, createdRecords: existingReceipt.createdRecords };
  }

  const run = async (tx: PgQueryable) => {
    const docs = await tx.query<{ collection: string; body: unknown }>(
      "SELECT collection, body FROM platform_documents WHERE collection LIKE 'risk%' OR collection = 's05bMigrationReceipts'",
    );
    const working = emptySnapshot();
    for (const row of docs.rows) {
      const table = (working as unknown as Record<string, unknown[]>)[row.collection];
      if (!Array.isArray(table)) continue;
      table.push(asBody(row.body));
    }
    const createdRecords: Record<string, number> = {};
    for (const mapping of RISK_SQL_TABLES) {
      const rows = ((working as unknown as Record<string, unknown[]>)[mapping.collection] ?? []) as Array<Record<string, unknown>>;
      createdRecords[mapping.collection] = rows.length;
    }
    const orgId =
      working.organisations[0]?.id ??
      (docs.rows.map((row) => asBody<{ organisationId?: string }>(row.body).organisationId).find(Boolean) as string | undefined);
    const receipt = S05BMigrationReceiptSchema.parse({
      id: randomUUID(),
      organisationId: orgId,
      migrationId: EOS_S05B_PROTECTION_V2_ID,
      checksum: EOS_S05B_V2_MIGRATION_CHECKSUM,
      status: "APPLIED",
      createdRecords,
      schemaVersion: SCHEMA_VERSION,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    working.s05bMigrationReceipts.push(receipt);
    createdRecords.s05bMigrationReceipts = working.s05bMigrationReceipts.length;
    const store = new PostgresRiskProtectionStore(tx);
    await store.persistFromSnapshotAsync(emptySnapshot(), working as PlatformSnapshot);
    return receipt;
  };

  const receipt = hasTransaction(client) ? await client.transaction(run) : await run(client);
  return { status: "APPLIED", receipt, createdRecords: receipt.createdRecords };
}

export function s05bNormalizedMigrationIdentityHash(): string {
  return exactHash({ id: EOS_S05B_PROTECTION_V2_ID, checksum: EOS_S05B_V2_MIGRATION_CHECKSUM });
}
