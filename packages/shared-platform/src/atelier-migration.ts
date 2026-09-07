import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { validateS04EPersistedCollections } from "./atelier-persistence.js";
import type { S04EMigrationReceipt } from "./atelier-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04E_MIGRATION_ID = "EOS-S04E-ATELIER-V1" as const;
export const EOS_S04E_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04E_MIGRATION_ID}:additive-empty-collections:preserve-rsvp-forecast-programme-merchandise`)
  .digest("hex");

export type S04EMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S04EMigrationReceipt["createdRecords"];
  receipt?: S04EMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04E_MIGRATION_ID}:${seed}`).digest("hex");
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

export function migrateEosS04E(input: PlatformSnapshot, now: string): S04EMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04EPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s04eMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04E_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  const receipt: S04EMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S04E_MIGRATION_ID,
    checksum: EOS_S04E_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: [],
    notes: [{ code: "NO_CANONICAL_LEDGER_MUTATION", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s04eMigrationReceipts.push(receipt);
  try {
    validateS04EPersistedCollections(snap);
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

export function applyEosS04EToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS04E(snap, now).snapshot;
}

export function rollbackEosS04E(input: PlatformSnapshot, now: string): S04EMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const applied = original.s04eMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04E_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!applied) return { status: "REPLAYED", snapshot: original, created: [] };
  const snap = structuredClone(original);
  snap.eventAteliers = [];
  snap.blueprintGenesises = [];
  snap.atelierChapters = [];
  snap.eventNarrativeEditions = [];
  snap.curatedMediaSets = [];
  snap.approvedAssetEditions = [];
  snap.guestJourneyProjections = [];
  snap.hostMilestoneProjections = [];
  snap.budgetAssuranceProjections = [];
  snap.vendorEnsembleProjections = [];
  snap.contingencyAssuranceProjections = [];
  snap.hostDecisionRequests = [];
  snap.hostDecisionReceipts = [];
  snap.curatedUpdates = [];
  snap.atelierAccessGrants = [];
  snap.magicLinkChallenges = [];
  snap.atelierSessions = [];
  applied.status = "ROLLED_BACK";
  applied.updatedAt = now;
  applied.version += 1;
  return { status: "APPLIED", snapshot: snap, created: [], receipt: applied };
}
