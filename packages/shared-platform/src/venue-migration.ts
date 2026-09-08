import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import type { S05MigrationReceipt } from "./venue-schemas.js";

export const EOS_S05_MIGRATION_ID = "EOS-S05-VENUE-LAYOUT-V1" as const;
export const EOS_S05_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05_MIGRATION_ID}:additive-empty-collections:preserve-guest-rsvp-comms-atelier-language`)
  .digest("hex");

export type S05MigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S05MigrationReceipt["createdRecords"];
  receipt?: S05MigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function versioned(now: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function migrateEosS05(input: PlatformSnapshot, now: string): S05MigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS05PersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s05MigrationReceipts.find(
    (item) => item.migrationId === EOS_S05_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const receipt: S05MigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S05_MIGRATION_ID,
    checksum: EOS_S05_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_CANONICAL_LEDGER_MUTATION", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s05MigrationReceipts.push(receipt);
  try {
    validateS05PersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid migrated snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created: [], receipt };
}

export function applyEosS05ToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS05(snap, now).snapshot;
}

export function rollbackEosS05(input: PlatformSnapshot, now: string): S05MigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const applied = original.s05MigrationReceipts.find(
    (item) => item.migrationId === EOS_S05_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!applied) return { status: "REPLAYED", snapshot: original, created: [] };
  const snap = structuredClone(original);
  snap.venues = [];
  snap.venueFacts = [];
  snap.eventVenues = [];
  snap.eventVenueFacts = [];
  snap.layouts = [];
  snap.layoutRevisions = [];
  snap.layoutEditorLeases = [];
  snap.venueEvidenceAssets = [];
  applied.status = "ROLLED_BACK";
  applied.updatedAt = now;
  applied.version += 1;
  return { status: "APPLIED", snapshot: snap, created: [], receipt: applied };
}
