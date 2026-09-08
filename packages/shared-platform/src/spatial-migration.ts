import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import type { S05MigrationReceipt } from "./venue-schemas.js";

export const EOS_S05_OBJECTS_MIGRATION_ID = "EOS-S05-VENUE-OBJECTS-V1" as const;
export const EOS_S05_OBJECTS_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05_OBJECTS_MIGRATION_ID}:additive-typed-objects:preserve-m1-venues-and-blank-layouts`)
  .digest("hex");

export type S05ObjectsMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S05MigrationReceipt["createdRecords"];
  receipt?: S05MigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05_OBJECTS_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateEosS05Objects(input: PlatformSnapshot, now: string): S05ObjectsMigrationResult {
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
    (item) => item.migrationId === EOS_S05_OBJECTS_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  snap.layoutCommands = snap.layoutCommands ?? [];
  snap.layoutDraftCursors = snap.layoutDraftCursors ?? [];
  const receipt: S05MigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S05_OBJECTS_MIGRATION_ID,
    checksum: EOS_S05_OBJECTS_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_PRIOR_SLICE_MUTATION", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    createdAt: now,
    updatedAt: now,
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

export function applyEosS05ObjectsToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS05Objects(snap, now).snapshot;
}
