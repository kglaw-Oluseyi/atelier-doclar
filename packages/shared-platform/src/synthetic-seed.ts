import { applyS04AFixturesIfMissing } from "./addressing-fixtures.js";
import { applyS04BFixturesIfMissing } from "./programme-fixtures.js";
import { applyEosS04BToSnapshot } from "./programme-migration.js";
import { applyS04CFixturesIfMissing } from "./merchandise-fixtures.js";
import { applyEosS04CToSnapshot } from "./merchandise-migration.js";
import { applyS04DFixturesIfMissing } from "./forecast-fixtures.js";
import { applyEosS04DToSnapshot } from "./forecast-migration.js";
import { applyS04EFixturesIfMissing } from "./atelier-fixtures.js";
import { applyEosS04EToSnapshot } from "./atelier-migration.js";
import { applyS04FFixturesIfMissing } from "./language-fixtures.js";
import { applyEosS04FToSnapshot } from "./language-migration.js";
import { applyS05FixturesIfMissing } from "./venue-fixtures.js";
import { applyEosS05ToSnapshot } from "./venue-migration.js";
import { applyEosS05ObjectsToSnapshot } from "./spatial-migration.js";
import { applyEosS05AssuranceToSnapshot } from "./layout-assurance-migration.js";
import { migrateEosS05A, migrateEosS05ADisclosureV5, migrateEosS05AIntelligence, migrateEosS05AIntelligenceV2, migrateEosS05AIntelligenceV3 } from "./eec-migration.js";
import { migrateEosS05B } from "./risk-migration.js";
import { PERMISSION_KEYS } from "./constants.js";
import { migrateEosS05AEvaluationV4 } from "./eec-evaluation-migration.js";
import { loadNonProductionFixtures } from "./bootstrap.js";
import { permissionIdForKey, permissionsForRole, roleKeyForId, seededPermissions, seededRoles } from "./catalog.js";
import type { PgQueryable } from "./postgres-schema.js";
import { PlatformService, type PlatformServiceOptions } from "./service.js";
import type { PlatformSnapshot, PlatformStore } from "./store.js";

export const SYNTHETIC_SEED_ID = "event-os-synthetic-v1";
export const SYNTHETIC_SEED_VERSION = "1";

export interface SeedLedgerRow {
  seedId: string;
  seedVersion: string;
  appliedAt: string;
  recordCount: number;
  synthetic: boolean;
}

export interface SeedApplicationResult {
  applied: boolean;
  replayed: boolean;
  seedId: string;
  seedVersion: string;
  recordCount: number;
}

function countableRecords(snap: PlatformSnapshot): number {
  return (
    snap.organisations.length +
    snap.clients.length +
    snap.events.length +
    snap.persons.length +
    snap.operationalGuests.length
  );
}

export async function readSeedLedger(client: PgQueryable, seedId = SYNTHETIC_SEED_ID): Promise<SeedLedgerRow | undefined> {
  const rows = await client.query<{
    seed_id: string;
    seed_version: string;
    applied_at: string;
    record_count: number;
    synthetic: boolean;
  }>("SELECT seed_id, seed_version, applied_at, record_count, synthetic FROM platform_seed_ledger WHERE seed_id = $1", [
    seedId,
  ]);
  const row = rows.rows[0];
  if (!row) return undefined;
  return {
    seedId: row.seed_id,
    seedVersion: row.seed_version,
    appliedAt: typeof row.applied_at === "string" ? row.applied_at : new Date(row.applied_at).toISOString(),
    recordCount: Number(row.record_count),
    synthetic: Boolean(row.synthetic),
  };
}

export async function recordSeedLedger(
  client: PgQueryable,
  input: { recordCount: number; at?: string; seedId?: string; seedVersion?: string },
): Promise<void> {
  await client.query(
    "INSERT INTO platform_seed_ledger (seed_id, seed_version, applied_at, record_count, synthetic) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (seed_id) DO NOTHING",
    [
      input.seedId ?? SYNTHETIC_SEED_ID,
      input.seedVersion ?? SYNTHETIC_SEED_VERSION,
      input.at ?? new Date().toISOString(),
      input.recordCount,
    ],
  );
}

function applyS04BLayer(store: PlatformStore, now = "2026-09-07T10:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS04BToSnapshot(snap, now);
  const withFixtures = applyS04BFixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

function applyS04CLayer(store: PlatformStore, now = "2026-09-07T12:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS04CToSnapshot(snap, now);
  const withFixtures = applyS04CFixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

function applyS04DLayer(store: PlatformStore, now = "2026-09-07T16:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS04DToSnapshot(snap, now);
  const withFixtures = applyS04DFixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

function applyS04ELayer(store: PlatformStore, now = "2026-09-07T18:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS04EToSnapshot(snap, now);
  const withFixtures = applyS04EFixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

function applyS04FLayer(store: PlatformStore, now = "2026-09-07T20:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS04FToSnapshot(snap, now);
  const withFixtures = applyS04FFixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

function applyS05Layer(store: PlatformStore, now = "2026-09-08T02:00:00.000Z"): void {
  const snap = store.snapshot();
  const migrated = applyEosS05AssuranceToSnapshot(
    applyEosS05ObjectsToSnapshot(applyEosS05ToSnapshot(snap, now), now),
    now,
  );
  const withFixtures = applyS05FixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
}

export function ensureEosS05ACollections(store: PlatformStore, now = "2026-09-08T22:00:00.000Z"): void {
  const snap = store.snapshot();
  const discovery = migrateEosS05A(snap, now);
  const intelligence = migrateEosS05AIntelligence(discovery.snapshot, now);
  const depth = migrateEosS05AIntelligenceV2(intelligence.snapshot, now);
  const completion = migrateEosS05AIntelligenceV3(depth.snapshot, now);
  const evaluation = migrateEosS05AEvaluationV4(completion.snapshot, now);
  const disclosure = migrateEosS05ADisclosureV5(evaluation.snapshot, now);
  if (
    discovery.status === "APPLIED" ||
    intelligence.status === "APPLIED" ||
    depth.status === "APPLIED" ||
    completion.status === "APPLIED" ||
    evaluation.status === "APPLIED" ||
    disclosure.status === "APPLIED"
  ) {
    store.replace(disclosure.snapshot);
  }
}

function applyS05ALayer(store: PlatformStore, now = "2026-09-08T22:00:00.000Z"): void {
  ensureEosS05ACollections(store, now);
}

export function ensureEosS05BCollections(store: PlatformStore, now = "2026-09-10T09:00:00.000Z"): void {
  const result = migrateEosS05B(store.snapshot(), now);
  if (result.status === "APPLIED") store.replace(result.snapshot);
}

function applyS05BLayer(store: PlatformStore, now = "2026-09-10T09:00:00.000Z"): void {
  ensureEosS05BCollections(store, now);
}

/** Replay-safe: insert missing catalogue rows only. Never rewrite accepted permission bodies. */
export function ensureMissingCatalogueRecords(store: PlatformStore): void {
  const snap = store.snapshot();
  const permissionIds = new Set(snap.permissions.map((item) => item.id));
  const roleIds = new Set(snap.roles.map((item) => item.id));
  let changed = false;
  for (const permission of seededPermissions()) {
    if (permissionIds.has(permission.id)) continue;
    snap.permissions.push(permission);
    changed = true;
  }
  for (const role of seededRoles()) {
    if (roleIds.has(role.id)) continue;
    snap.roles.push(role);
    changed = true;
  }
  const existingGrants = new Set(snap.rolePermissions.map((item) => `${item.roleId}:${item.permissionId}`));
  const s043Keys = ["discovery.confidential.reveal", "discovery.confidential.grant"] as const;
  for (const role of snap.roles) {
    const key = roleKeyForId(role.id);
    if (!key) continue;
    const allowed = new Set(permissionsForRole(key));
    for (const permissionKey of s043Keys) {
      if (!allowed.has(permissionKey)) continue;
      const permissionId = permissionIdForKey(permissionKey);
      const grantKey = `${role.id}:${permissionId}`;
      if (existingGrants.has(grantKey)) continue;
      snap.rolePermissions.push({
        roleId: role.id,
        permissionId,
        effect: "ALLOW",
        createdAt: role.updatedAt,
      });
      existingGrants.add(grantKey);
      changed = true;
    }
  }
  const s05bKeys = PERMISSION_KEYS.filter((key) => key.startsWith("risk."));
  for (const role of snap.roles) {
    const key = roleKeyForId(role.id);
    if (!key) continue;
    const allowed = new Set(permissionsForRole(key));
    for (const permissionKey of s05bKeys) {
      if (!allowed.has(permissionKey)) continue;
      const permissionId = permissionIdForKey(permissionKey);
      const grantKey = `${role.id}:${permissionId}`;
      if (existingGrants.has(grantKey)) continue;
      snap.rolePermissions.push({
        roleId: role.id,
        permissionId,
        effect: "ALLOW",
        createdAt: role.updatedAt,
      });
      existingGrants.add(grantKey);
      changed = true;
    }
  }
  if (changed) store.replace(snap);
}

export function applySyntheticSnapshot(store: PlatformStore, options: PlatformServiceOptions = {}): PlatformService {
  const service =
    store.snapshot().organisations.length > 0 ? new PlatformService(store, options) : loadNonProductionFixtures(store, options);
  const snap = store.snapshot();
  const withAddressing = applyS04AFixturesIfMissing(snap);
  if (withAddressing !== snap) store.replace(withAddressing);
  applyS04BLayer(store);
  applyS04CLayer(store);
  applyS04DLayer(store);
  applyS04ELayer(store);
  applyS04FLayer(store);
  applyS05Layer(store);
  applyS05ALayer(store);
  applyS05BLayer(store);
  return service;
}

export async function applySyntheticSeedIfNeeded(
  store: PlatformStore,
  client: PgQueryable,
  options: PlatformServiceOptions = {},
): Promise<{ service: PlatformService; seed: SeedApplicationResult }> {
  const existing = await readSeedLedger(client);
  if (existing?.seedVersion === SYNTHETIC_SEED_VERSION) {
    const service = new PlatformService(store, options);
    ensureMissingCatalogueRecords(store);
    applyS04BLayer(store);
    applyS04CLayer(store);
    applyS04DLayer(store);
    applyS04ELayer(store);
    applyS04FLayer(store);
    applyS05Layer(store);
  applyS05ALayer(store);
  applyS05BLayer(store);
    return {
      service,
      seed: {
        applied: false,
        replayed: true,
        seedId: existing.seedId,
        seedVersion: existing.seedVersion,
        recordCount: existing.recordCount,
      },
    };
  }
  const empty = store.snapshot().organisations.length === 0;
  const service = empty ? loadNonProductionFixtures(store, options) : new PlatformService(store, options);
  const snap = store.snapshot();
  const withAddressing = applyS04AFixturesIfMissing(snap);
  if (withAddressing !== snap) store.replace(withAddressing);
  applyS04BLayer(store);
  applyS04CLayer(store);
  applyS04DLayer(store);
  applyS04ELayer(store);
  applyS04FLayer(store);
  applyS05Layer(store);
  applyS05ALayer(store);
  applyS05BLayer(store);
  const durable = store as { flush?: () => Promise<void> };
  if (typeof durable.flush === "function") await durable.flush();
  const recordCount = countableRecords(store.snapshot());
  await recordSeedLedger(client, { recordCount });
  return {
    service,
    seed: {
      applied: empty || withAddressing !== snap,
      replayed: false,
      seedId: SYNTHETIC_SEED_ID,
      seedVersion: SYNTHETIC_SEED_VERSION,
      recordCount,
    },
  };
}
