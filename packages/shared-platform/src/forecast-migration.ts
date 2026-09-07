import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "./constants.js";
import { FIXTURE_IDS } from "./fixtures.js";
import { validateS04DPersistedCollections } from "./forecast-persistence.js";
import { defaultForecastPolicy, defaultModelParameterSet } from "./forecast-operations.js";
import type { S04DMigrationReceipt } from "./forecast-schemas.js";
import { normalizeSnapshot, type PlatformSnapshot } from "./store.js";

export const EOS_S04D_MIGRATION_ID = "EOS-S04D-FORECAST-PLANNING-V1" as const;
export const EOS_S04D_MIGRATION_CHECKSUM = createHash("sha256")
  .update(`${EOS_S04D_MIGRATION_ID}:additive-empty-collections:seed-provisional-defaults:preserve-rsvp-guest-attendance`)
  .digest("hex");

export type S04DMigrationResult = {
  status: "APPLIED" | "REPLAYED" | "FAILED";
  snapshot: PlatformSnapshot;
  created: S04DMigrationReceipt["createdRecords"];
  receipt?: S04DMigrationReceipt;
  error?: { code: string; message: string };
};

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(`${EOS_S04D_MIGRATION_ID}:${seed}`).digest("hex");
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

export function migrateEosS04D(input: PlatformSnapshot, now: string): S04DMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  try {
    validateS04DPersistedCollections(original);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  const existing = original.s04dMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04D_MIGRATION_ID && item.status === "APPLIED",
  );
  if (existing) {
    return { status: "REPLAYED", snapshot: original, created: existing.createdRecords, receipt: existing };
  }
  const snap = structuredClone(original);
  if (!snap.forecastPolicies) snap.forecastPolicies = [];
  if (!snap.modelParameterSets) snap.modelParameterSets = [];
  const created: S04DMigrationReceipt["createdRecords"] = [];
  const orgId = snap.organisations.find((item) => item.id === FIXTURE_IDS.orgMaison)?.id ?? snap.organisations[0]?.id;
  const ownerId = snap.persons.find((item) => item.id === FIXTURE_IDS.personCeo)?.id ?? snap.persons[0]?.id;
  if (orgId && ownerId) {
    if (!snap.forecastPolicies.some((item) => item.id === defaultForecastPolicy(orgId, now, ownerId).id)) {
      const policy = defaultForecastPolicy(orgId, now, ownerId);
      snap.forecastPolicies.push(policy);
      created.push({ collection: "forecastPolicies", id: policy.id, version: policy.version });
    }
    if (!snap.modelParameterSets.some((item) => item.id === defaultModelParameterSet(orgId, now, ownerId).id)) {
      const parameters = defaultModelParameterSet(orgId, now, ownerId);
      snap.modelParameterSets.push(parameters);
      created.push({ collection: "modelParameterSets", id: parameters.id, version: parameters.version });
    }
  }
  const receipt: S04DMigrationReceipt = {
    id: deterministicUuid("receipt"),
    migrationId: EOS_S04D_MIGRATION_ID,
    checksum: EOS_S04D_MIGRATION_CHECKSUM,
    status: "APPLIED",
    createdRecords: created,
    notes: [{ code: "NO_RSVP_MUTATION", subjectType: "MIGRATION", subjectId: deterministicUuid("note") }],
    ...versioned(now),
  };
  snap.s04dMigrationReceipts.push(receipt);
  try {
    validateS04DPersistedCollections(snap);
  } catch (error) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "VALIDATION_FAILED", message: error instanceof Error ? error.message : "invalid snapshot" },
    };
  }
  return { status: "APPLIED", snapshot: snap, created, receipt };
}

export function rollbackEosS04D(input: PlatformSnapshot, now: string): S04DMigrationResult {
  const original = normalizeSnapshot(structuredClone(input));
  const receipt = original.s04dMigrationReceipts.find(
    (item) => item.migrationId === EOS_S04D_MIGRATION_ID && item.status === "APPLIED",
  );
  if (!receipt) {
    return { status: "FAILED", snapshot: original, created: [], error: { code: "NOT_FOUND", message: "no applied S04D receipt" } };
  }
  if (original.attendanceForecastRuns.length > 0 || original.operationalProvisionRecommendations.length > 0) {
    return {
      status: "FAILED",
      snapshot: original,
      created: [],
      error: { code: "TRANSITION_INVALID", message: "S04D rollback refused because forecast or provision records exist" },
    };
  }
  const next = structuredClone(original);
  const index = next.s04dMigrationReceipts.findIndex((item) => item.id === receipt.id);
  next.s04dMigrationReceipts[index] = { ...receipt, status: "ROLLED_BACK", version: receipt.version + 1, updatedAt: now };
  next.forecastPolicies = [];
  next.modelParameterSets = [];
  validateS04DPersistedCollections(next);
  return { status: "APPLIED", snapshot: next, created: [], receipt: next.s04dMigrationReceipts[index] };
}

export function applyEosS04DToSnapshot(snap: PlatformSnapshot, now: string): PlatformSnapshot {
  return migrateEosS04D(snap, now).snapshot;
}
