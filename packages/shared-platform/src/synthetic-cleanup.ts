import { randomUUID } from "node:crypto";
import type { PgQueryable } from "./postgres-schema.js";
import { RISK_SQL_TABLES } from "./risk-postgres-schema.js";
import { SYNTHETIC_SEED_ID } from "./synthetic-seed.js";
import { emptySnapshot, type PlatformSnapshot } from "./store.js";

export const SYNTHETIC_CLEANUP_CONFIRMATION = "SYNTHETIC_CLEANUP_CONFIRMED";
export const ACCESS_LIFECYCLE_PROBE_VENDOR_ID = "eos-s04c-lifecycle-probe";

type DocumentCollection = Exclude<keyof PlatformSnapshot, "audit" | "idempotency">;

const DOCUMENT_COLLECTIONS = Object.keys(emptySnapshot()).filter(
  (key) => key !== "audit" && key !== "idempotency",
) as DocumentCollection[];

export interface CleanupCollectionCount {
  collection: string;
  count: number;
}

export interface SyntheticCleanupPreview {
  mode: "PREVIEW" | "EXECUTED";
  destructive: boolean;
  seedId: string;
  collections: CleanupCollectionCount[];
  total: number;
}

function isSyntheticRecord(record: unknown): boolean {
  return Boolean(record && typeof record === "object" && (record as { nonProductionFixture?: boolean }).nonProductionFixture);
}

function collectionCounts(snap: PlatformSnapshot): CleanupCollectionCount[] {
  return DOCUMENT_COLLECTIONS.map((collection) => ({
    collection,
    count: (snap[collection] as unknown[]).filter((item) => isSyntheticRecord(item)).length,
  })).filter((item) => item.count > 0);
}

export const EVENT_OS_CLEANUP_PROJECT_ID = "c1c937b7-2660-4fc2-8257-c08bd6346658";
export const EVENT_OS_CLEANUP_PROJECT_NAME = "atelier-doclar";

const CATALOG_COLLECTIONS = new Set(["roles", "permissions", "rolePermissions"]);

export type CleanupAttributionClass =
  | "SAFELY_INCLUDED"
  | "INTENTIONALLY_PRESERVED"
  | "NOT_CURRENTLY_ATTRIBUTABLE"
  | "REMEDIATION_REQUIRED";

export interface CleanupAttributionReport {
  safelyIncluded: CleanupCollectionCount[];
  intentionallyPreserved: Array<CleanupCollectionCount & { reason: string }>;
  notCurrentlyAttributable: CleanupCollectionCount[];
  remediationRequired: Array<{
    id: string;
    class: "REMEDIATION_REQUIRED";
    reason: string;
    latestSafeMilestone: string;
  }>;
}

export function previewSyntheticCleanup(snap: PlatformSnapshot): SyntheticCleanupPreview {
  const collections = collectionCounts(snap);
  return {
    mode: "PREVIEW",
    destructive: false,
    seedId: SYNTHETIC_SEED_ID,
    collections,
    total: collections.reduce((sum, item) => sum + item.count, 0),
  };
}

export function classifySyntheticCleanupAttribution(snap: PlatformSnapshot): CleanupAttributionReport {
  const safelyIncluded = collectionCounts(snap);
  const notCurrentlyAttributable = DOCUMENT_COLLECTIONS.filter((collection) => !CATALOG_COLLECTIONS.has(collection))
    .map((collection) => ({
      collection,
      count: (snap[collection] as unknown[]).filter((item) => !isSyntheticRecord(item)).length,
    }))
    .filter((item) => item.count > 0);
  const intentionallyPreserved: Array<CleanupCollectionCount & { reason: string }> = [
    { collection: "audit", count: snap.audit.length, reason: "append-only audit is excluded from fixture cleanup" },
    {
      collection: "idempotency",
      count: snap.idempotency.length,
      reason: "idempotency keys are excluded from fixture cleanup",
    },
    ...DOCUMENT_COLLECTIONS.filter((collection) => CATALOG_COLLECTIONS.has(collection)).map((collection) => ({
      collection,
      count: (snap[collection] as unknown[]).length,
      reason: "shared catalogue records are not fixture-marked and are preserved",
    })),
  ].filter((item) => item.count > 0);
  return {
    safelyIncluded,
    intentionallyPreserved,
    notCurrentlyAttributable,
    remediationRequired: [
      {
        id: "TDR-S04A-011",
        class: "REMEDIATION_REQUIRED",
        reason:
          "Browser-created operational residue (unmarked guests, nominations, sessions, and related audit/idempotency) is not attributable from top-level nonProductionFixture alone. Cleanup of original seed fixtures is not a complete pre-client wipe.",
        latestSafeMilestone: "Pre-client onboarding — close before any real client data enters Event OS",
      },
    ],
  };
}

export function assertCleanupProjectScope(
  env: NodeJS.ProcessEnv = process.env,
  options: { execute?: boolean } = {},
): void {
  const projectId = env.RAILWAY_PROJECT_ID ?? "";
  const projectName = env.RAILWAY_PROJECT_NAME ?? "";
  const explicitScope = env.EVENT_OS_CLEANUP_SCOPE ?? "";
  if (projectId && projectId !== EVENT_OS_CLEANUP_PROJECT_ID) {
    throw new Error("Cleanup refused: Railway project is not atelier-doclar.");
  }
  if (projectName && projectName !== EVENT_OS_CLEANUP_PROJECT_NAME) {
    throw new Error("Cleanup refused: Railway project is not atelier-doclar.");
  }
  if (options.execute) {
    if (projectId !== EVENT_OS_CLEANUP_PROJECT_ID && projectName !== EVENT_OS_CLEANUP_PROJECT_NAME) {
      throw new Error("Destructive cleanup can only run on Railway project atelier-doclar.");
    }
    return;
  }
  if (projectId === EVENT_OS_CLEANUP_PROJECT_ID || projectName === EVENT_OS_CLEANUP_PROJECT_NAME) return;
  if (explicitScope === EVENT_OS_CLEANUP_PROJECT_NAME) return;
  if (!env.DATABASE_URL && !projectId && !projectName) return;
  throw new Error("Cleanup preview refused: not bound to Railway project atelier-doclar.");
}

export async function purgeNormalizedRiskTables(client: PgQueryable): Promise<void> {
  for (const mapping of RISK_SQL_TABLES) {
    await client.query(`DELETE FROM ${mapping.table}`);
  }
  await client.query("DELETE FROM risk_idempotency_receipts");
}

export function applySyntheticCleanup(snap: PlatformSnapshot): PlatformSnapshot {
  const next = structuredClone(snap);
  for (const collection of DOCUMENT_COLLECTIONS) {
    (next[collection] as unknown[]) = (next[collection] as unknown[]).filter((item) => !isSyntheticRecord(item));
  }
  return next;
}

export function assertCleanupConfirmation(confirmation: string): void {
  if (confirmation !== SYNTHETIC_CLEANUP_CONFIRMATION) {
    throw new Error("synthetic cleanup requires explicit confirmation SYNTHETIC_CLEANUP_CONFIRMED");
  }
}

export async function cleanupAccessLifecycleProbe(
  client: PgQueryable,
  vendorId = ACCESS_LIFECYCLE_PROBE_VENDOR_ID,
): Promise<{ deletedAssignments: number; deletedSessions: number; deletedUpdates: number }> {
  if (vendorId !== ACCESS_LIFECYCLE_PROBE_VENDOR_ID) {
    throw new Error("cleanupAccessLifecycleProbe only deletes the governed lifecycle probe vendor id");
  }
  const assignments = await client.query<{ id: string; version: number }>(
    "SELECT id, version FROM platform_documents WHERE collection = $1 AND body->>'vendorId' = $2",
    ["vendorAssignments", vendorId],
  );
  let deletedSessions = 0;
  let deletedUpdates = 0;
  for (const row of assignments.rows) {
    const sessions = await client.query(
      "DELETE FROM platform_documents WHERE collection = $1 AND body->>'assignmentId' = $2",
      ["vendorSessions", row.id],
    );
    const updates = await client.query(
      "DELETE FROM platform_documents WHERE collection = $1 AND body->>'assignmentId' = $2",
      ["vendorUpdates", row.id],
    );
    deletedSessions += sessions.rowCount ?? 0;
    deletedUpdates += updates.rowCount ?? 0;
    await client.query("DELETE FROM platform_documents WHERE collection = $1 AND id = $2 AND version = $3", [
      "vendorAssignments",
      row.id,
      row.version,
    ]);
  }
  return { deletedAssignments: assignments.rows.length, deletedSessions, deletedUpdates };
}

export async function recordCleanupAudit(
  client: PgQueryable,
  preview: SyntheticCleanupPreview,
  input: { mode: "PREVIEW" | "EXECUTED"; confirmed: boolean; id?: string; at?: string },
): Promise<void> {
  await client.query(
    "INSERT INTO platform_cleanup_audit (id, occurred_at, mode, seed_id, collections, confirmed) VALUES ($1, $2, $3, $4, $5::jsonb, $6)",
    [
      input.id ?? randomUUID(),
      input.at ?? new Date().toISOString(),
      input.mode,
      preview.seedId,
      JSON.stringify(preview.collections),
      input.confirmed,
    ],
  );
}
