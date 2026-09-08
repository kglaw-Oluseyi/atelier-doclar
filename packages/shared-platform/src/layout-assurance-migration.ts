import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";
import { validateS05PersistedCollections } from "./venue-persistence.js";
import type { S05MigrationReceipt } from "./venue-schemas.js";

export const EOS_S05_ASSURANCE_MIGRATION_ID = "EOS-S05-VENUE-ASSURANCE-V1" as const;
export const EOS_S05_ASSURANCE_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S05_ASSURANCE_MIGRATION_ID}:additive-assurance-collections:preserve-m1-m2`)
  .digest("hex");

export type S05AssuranceMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S05MigrationReceipt["createdRecords"];
  receipt?: S05MigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S05_ASSURANCE_MIGRATION_ID}:${seed}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateEosS05Assurance(input: PlatformSnapshot, now: string): S05AssuranceMigrationResult {
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
    (item) => item.migrationId === EOS_S05_ASSURANCE_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  snap.layoutFloorPlanAssets = snap.layoutFloorPlanAssets ?? [];
  snap.layoutAssetCalibrations = snap.layoutAssetCalibrations ?? [];
  snap.layoutCapacityStatements = snap.layoutCapacityStatements ?? [];
  snap.layoutValidationRuns = snap.layoutValidationRuns ?? [];
  snap.layoutValidationFindings = snap.layoutValidationFindings ?? [];
  snap.layoutValidationOverrides = snap.layoutValidationOverrides ?? [];
  snap.layoutSnapshots = snap.layoutSnapshots ?? [];
  snap.layoutApprovals = snap.layoutApprovals ?? [];
  snap.layoutPublications = snap.layoutPublications ?? [];
  snap.layoutExportJobs = snap.layoutExportJobs ?? [];
  const receipt: S05MigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S05_ASSURANCE_MIGRATION_ID,
    checksum: EOS_S05_ASSURANCE_MIGRATION_CHECKSUM,
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

export function applyEosS05AssuranceToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS05Assurance(snap, now).snapshot;
}
