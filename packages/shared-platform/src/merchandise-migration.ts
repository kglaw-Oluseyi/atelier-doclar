import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { validateS04CPersistedCollections } from "./merchandise-persistence.js";
import type { S04CMigrationReceipt } from "./merchandise-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04C_MIGRATION_ID = "EOS-S04C-MERCHANDISE-COLLECTIONS-V1" as const;
export const EOS_S04C_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04C_MIGRATION_ID}:additive-empty-collections:no-offer-backfill:preserve-guest-rsvp-phase`)
  .digest("hex");
export const EOS_S04C_GUEST_GRANT_MIGRATION_ID = "EOS-S04C-MERCHANDISE-GUEST-GRANTS-V2" as const;
export const EOS_S04C_GUEST_GRANT_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04C_GUEST_GRANT_MIGRATION_ID}:additive-empty-guest-grants:no-rsvp-backfill:preserve-v1`)
  .digest("hex");

export type S04CMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S04CMigrationReceipt["createdRecords"];
  receipt?: S04CMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04C_MIGRATION_ID}:${seed}`).digest("hex");
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

export function migrateEosS04C(input: PlatformSnapshot, now: string): S04CMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04CPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s04cMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04C_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const receipt: S04CMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S04C_MIGRATION_ID,
    checksum: EOS_S04C_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_OFFER_BACKFILL", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s04cMigrationReceipts.push(receipt);
  try {
    validateS04CPersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created: [], receipt };
}

export function rollbackEosS04C(input: PlatformSnapshot, now: string): S04CMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const receipt = original.s04cMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04C_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!receipt) {
    return { status: "FAILED", snapshot: original, created: [], error: { code: "NOT_FOUND", message: "no applied S04C receipt" } };
  }
  if (
    original.merchandiseCollections.length > 0 ||
    original.guestOffers.length > 0 ||
    original.vendorAssignments.length > 0
  ) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "TRANSITION_INVALID", message: "S04C rollback refused because merchandise records exist" },
    };
  }
  const next = structuredClone(original);
  const index = next.s04cMigrationReceipts.findIndex((item) => item.id === receipt.id);
  next.s04cMigrationReceipts[index] = { ...receipt, status: "ROLLED_BACK", version: receipt.version + 1, updatedAt: now };
  validateS04CPersistedCollections(next);
  return { status: "APPLIED", snapshot: next, created: [], receipt: next.s04cMigrationReceipts[index] };
}

export function applyEosS04CToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  const afterV1 = migrateEosS04C(snap, now).snapshot;
  return migrateEosS04CGuestGrants(afterV1, now).snapshot;
}

function deterministicUuidFor(migrationId: string, seed: string): string {
  const hex = createHash("sha256").update(`${migrationId}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateEosS04CGuestGrants(input: PlatformSnapshot, now: string): S04CMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04CPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const v1 = original.s04cMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04C_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!v1) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "TRANSITION_INVALID", message: "S04C V2 requires V1 merchandise collections" },
    };
  }
  const existing = original.s04cMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04C_GUEST_GRANT_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  if (!snap.merchandiseGuestGrants) snap.merchandiseGuestGrants = [];
  if (!snap.merchandiseGuestSessions) snap.merchandiseGuestSessions = [];
  const receipt: S04CMigrationReceipt = {
    id: deterministicUuidFor(EOS_S04C_GUEST_GRANT_MIGRATION_ID, "receipt"),
    migrationId: EOS_S04C_GUEST_GRANT_MIGRATION_ID,
    checksum: EOS_S04C_GUEST_GRANT_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_RSVP_BACKFILL", subjectType: "MIGRATION", subjectId: deterministicUuidFor(EOS_S04C_GUEST_GRANT_MIGRATION_ID, "note") }],
    ...versioned(now),
  };
  snap.s04cMigrationReceipts.push(receipt);
  try {
    validateS04CPersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created: [], receipt };
}
