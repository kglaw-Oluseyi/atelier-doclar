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
import { loadNonProductionFixtures } from "./bootstrap.js";
import { seededPermissions, seededRoles } from "./catalog.js";
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
  const migrated = applyEosS05ToSnapshot(snap, now);
  const withFixtures = applyS05FixturesIfMissing(migrated);
  if (withFixtures !== snap) store.replace(withFixtures);
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
