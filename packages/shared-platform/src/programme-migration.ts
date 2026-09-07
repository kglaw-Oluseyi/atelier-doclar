import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { buildDefaultProgrammePhase } from "./programme-operations.js";
import { validateS04BPersistedCollections } from "./programme-persistence.js";
import type { S04BCanonicalCollection, S04BMigrationReceipt } from "./programme-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04B_MIGRATION_ID = "EOS-S04B-DEFAULT-PHASE-V1" as const;
export const EOS_S04B_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04B_MIGRATION_ID}:one-default-phase-per-event:preserve-eventId`)
  .digest("hex");

export type S04BMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: Array<{ collection: S04BCanonicalCollection; id: string; version: number }>;
  receipt?: S04BMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04B_MIGRATION_ID}:${seed}`).digest("hex");
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

export function migrateEosS04B(input: PlatformSnapshot, now: string): S04BMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04BPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s04bMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04B_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const created: S04BMigrationResult["created"] = [];
  for (const event of snap.events) {
    const hasDefault = snap.programmePhases.some(
      (item) => item.eventId === event.id && item.isDefault && item.status !== "CANCELLED",
    );
    if (hasDefault) continue;
    const phaseId = deterministicUuid(`phase:${event.id}`);
    if (snap.programmePhases.some((item) => item.id === phaseId)) {
      return {
        status: "FAILED",
        snapshot: original,
        created: [],
        error: { code: "VALIDATION_FAILED", message: "default phase identifier collided" },
      };
    }
    const phase = buildDefaultProgrammePhase(event, now, phaseId);
    snap.programmePhases.push(phase);
    created.push({ collection: "programmePhases", id: phase.id, version: phase.version });
  }
  const receipt: S04BMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S04B_MIGRATION_ID,
    checksum: EOS_S04B_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: created,
    notes: created.map((item) => ({ code: "DEFAULT_PHASE_CREATED", subjectType: "PHASE" as const, subjectId: item.id })),
    ...versioned(now),
  };
  snap.s04bMigrationReceipts.push(receipt);
  try {
    validateS04BPersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "migration did not validate" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function rollbackEosS04B(input: PlatformSnapshot, now: string): S04BMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const receipt = original.s04bMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04B_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!receipt) {
    return { status: "FAILED", snapshot: original, created: [], error: { code: "NOT_FOUND", message: "no applied S04B receipt" } };
  }
  const createdIds = new Set(receipt.createdRecords.map((item) => item.id));
  const migratedEvents = new Set(
    original.programmePhases.filter((item) => createdIds.has(item.id)).map((item) => item.eventId),
  );
  const laterWork =
    original.phaseEntitlements.some((item) => migratedEvents.has(item.eventId)) ||
    original.programmePhases.some((item) => migratedEvents.has(item.eventId) && !createdIds.has(item.id));
  if (laterWork) {
    return {
      status: "FAILED",
      snapshot: original,
      created: receipt.createdRecords,
      receipt,
      error: { code: "VALIDATION_FAILED", message: "rollback refused because later programme records exist" },
    };
  }
  const next = structuredClone(original);
  next.programmePhases = next.programmePhases.filter((item) => !createdIds.has(item.id));
  const index = next.s04bMigrationReceipts.findIndex((item) => item.id === receipt.id);
  if (index >= 0) {
    next.s04bMigrationReceipts[index] = { ...receipt, status: "ROLLED_BACK", version: receipt.version + 1, updatedAt: now };
  }
  validateS04BPersistedCollections(next);
  return { status: "APPLIED", snapshot: next, created: [], receipt: next.s04bMigrationReceipts[index] };
}

export function applyEosS04BToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  const migrated = migrateEosS04B(snap, now);
  if (migrated.status === "FAILED" || migrated.status === "REPLAYED") return snap;
  return migrated.snapshot;
}
