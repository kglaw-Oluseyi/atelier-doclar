import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { validateS04FPersistedCollections } from "./language-persistence.js";
import type { S04FMigrationReceipt } from "./language-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04F_MIGRATION_ID = "EOS-S04F-LANGUAGE-V1" as const;
export const EOS_S04F_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04F_MIGRATION_ID}:additive-empty-collections:preserve-guest-rsvp-comms-atelier`)
  .digest("hex");

export type S04FMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S04FMigrationReceipt["createdRecords"];
  receipt?: S04FMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04F_MIGRATION_ID}:${seed}`).digest("hex");
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

export function migrateEosS04F(input: PlatformSnapshot, now: string): S04FMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04FPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s04fMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04F_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const receipt: S04FMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S04F_MIGRATION_ID,
    checksum: EOS_S04F_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_CANONICAL_LEDGER_MUTATION", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s04fMigrationReceipts.push(receipt);
  try {
    validateS04FPersistedCollections(snap);
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

export function applyEosS04FToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS04F(snap, now).snapshot;
}

export function rollbackEosS04F(input: PlatformSnapshot, now: string): S04FMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const applied = original.s04fMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04F_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!applied) return { status: "REPLAYED", snapshot: original, created: [] };
  const snap = structuredClone(original);
  snap.languageProfiles = [];
  snap.languagePreferenceHistories = [];
  snap.culturalSourceTexts = [];
  snap.contentWorks = [];
  snap.contentEditions = [];
  snap.contentBlocks = [];
  snap.translationLinks = [];
  snap.terminologyEntries = [];
  snap.reviewAssignments = [];
  snap.recipientEditionRules = [];
  snap.recipientAssemblies = [];
  snap.languageCoverageSnapshots = [];
  applied.status = "ROLLED_BACK";
  applied.updatedAt = now;
  applied.version += 1;
  return { status: "APPLIED", snapshot: snap, created: [], receipt: applied };
}
