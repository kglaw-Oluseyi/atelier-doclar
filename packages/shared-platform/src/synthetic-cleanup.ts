import { randomUUID } from "node:crypto";
import type { PgQueryable } from "./postgres-schema.js";
import { SYNTHETIC_SEED_ID } from "./synthetic-seed.js";
import { emptySnapshot, type PlatformSnapshot } from "./store.js";

export const SYNTHETIC_CLEANUP_CONFIRMATION = "SYNTHETIC_CLEANUP_CONFIRMED";

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
