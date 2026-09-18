/**
 * Installer-only Postgres hydrate scoping for CAP1000 product-path installs.
 *
 * Does NOT change PostgresPlatformStore.open() / default hydrate behaviour.
 * Reachable only from capacity live-install CLI / diagnosis scripts.
 */
import type { PgQueryable } from "./postgres-schema.js";
import { PostgresPlatformStore } from "./postgres-store.js";

export type CapacityInstallHydrateScope = {
  /**
   * SQL LIKE pattern for platform_idempotency.key (e.g. `cap1000-live-%`).
   * Exact replay detection remains for keys matching this pattern only.
   */
  idempotencyKeyLike: string;
  /** Skip loading historical platform_audit rows into memory at open. */
  omitHistoricalAudit: true;
};

/** CAP1000 live installer key prefix (event id is appended after create). */
export const CAP1000_LIVE_IDEMPOTENCY_KEY_LIKE = "cap1000-live-%";

/**
 * Open a PostgresPlatformStore with installer-scoped hydrate.
 * Default `PostgresPlatformStore.open` is unchanged for Event OS / CAP600.
 */
export async function openCapacityInstallPostgresStore(
  client: PgQueryable,
  scope: CapacityInstallHydrateScope,
): Promise<PostgresPlatformStore> {
  return PostgresPlatformStore.openForCapacityInstall(client, scope);
}
