# Synthetic cleanup atomicity fix

**Date:** 2026-09-18  
**Scope:** `apps/event-os/scripts/synthetic-cleanup.ts` `--execute` path only.  
**Constraint:** No production `--execute`. Proof against ephemeral local Postgres only.  
**Out of scope:** Ad-hoc SQL outside this script; solver/worker/thresholds/corpora; S06B/S06C/S07; Railway config.

## What was broken

The `--execute` path previously ran three separate, non-atomic database operations:

1. `purgeNormalizedRiskTables(client)` — raw client; each `DELETE` auto-commits individually; not wrapped in any transaction spanning the whole execute path.
2. `store.replace(applySyntheticCleanup(...)); await store.flush()` — internally transactional via `persistTransactional` → `client.transaction(run)`, but a **separate** transaction/connection from steps 1 and 3.
3. `recordCleanupAudit(..., { mode: "EXECUTED", confirmed: true })` — issued only **after** step 2 had already committed.

If the process died between step 2 committing and step 3 completing, synthetic records could be permanently deleted with **no** corresponding `EXECUTED` row in `platform_cleanup_audit` (“governed execution without receipt”).

Independent verification already showed production `platform_cleanup_audit` had exactly one row (`PREVIEW`, `confirmed=false`) — the EXECUTED path had never completed successfully in production — so this latent defect had not yet caused an incident through this script, but it was real and must be closed before reliance.

## Pattern implemented (and why)

**True all-or-nothing atomicity** — not the PENDING/EXECUTING marker fallback.

Mechanism:

- Net-new, opt-in `PostgresPlatformStore.replaceAndPersistForSyntheticCleanup(next, { beforePersist, afterPersist })`.
- Opens **one** `client.transaction()` and, on that same `tx`:
  - `beforePersist` → `purgeNormalizedRiskTables(tx)`
  - `persistDiff(tx, …)` → platform_documents / platform_idempotency deletion diff
  - `afterPersist` → `recordCleanupAudit(tx, …, { mode: "EXECUTED", confirmed: true })`
- On any throw: `ROLLBACK` + `hydrate()` restores in-memory state.
- Default `replace()` / `flush()` / `persistTransactional()` unchanged (same isolation discipline as `openForCapacityInstall`).

Script entry: `executeSyntheticCleanupAtomically(store, preview)` — called only from `apps/event-os/scripts/synthetic-cleanup.ts` after existing gates (`assertCleanupProjectScope`, `assertCleanupConfirmation`). Provenance / scope / confirmation gates are unchanged.

## Isolation grep proof

```text
=== callers of replaceAndPersistForSyntheticCleanup ===
packages/shared-platform/src/postgres-store.ts:707:  async replaceAndPersistForSyntheticCleanup(
packages/shared-platform/src/postgres-store.ts:715:      throw new Error("replaceAndPersistForSyntheticCleanup requires a transactional Pg client");
packages/shared-platform/src/synthetic-cleanup.ts:220:  await store.replaceAndPersistForSyntheticCleanup(cleaned, {
packages/shared-platform/test/synthetic-cleanup-atomicity.test.ts:116:        store.replaceAndPersistForSyntheticCleanup(cleaned, {

=== callers of executeSyntheticCleanupAtomically ===
apps/event-os/scripts/synthetic-cleanup.ts:18:  executeSyntheticCleanupAtomically,
apps/event-os/scripts/synthetic-cleanup.ts:117:  await executeSyntheticCleanupAtomically(store, preview);
packages/shared-platform/src/synthetic-cleanup.ts:215:export async function executeSyntheticCleanupAtomically(
packages/shared-platform/src/index.ts:852:  executeSyntheticCleanupAtomically,
packages/shared-platform/test/synthetic-cleanup-atomicity.test.ts:16:  …
packages/shared-platform/test/persistence-integration.test.ts:16:  …
```

No `PlatformService` or other general-service caller reaches the new API. Only the cleanup script (plus tests) invokes `executeSyntheticCleanupAtomically`.

## Ephemeral Postgres proof

Command (local Postgres; database created/dropped by the suite):

```bash
cd packages/shared-platform && pnpm exec tsx --test test/synthetic-cleanup-atomicity.test.ts
```

Captured output (2026-09-18):

```text
TAP version 13
# Subtest: synthetic cleanup atomicity (ephemeral Postgres)
    # Subtest: rolls back deletes and leaves no EXECUTED audit when afterPersist throws
    ok 1 - rolls back deletes and leaves no EXECUTED audit when afterPersist throws
      ---
      duration_ms: 582.385333
      ...
    # Subtest: commits deletes and EXECUTED audit together on the success path
    ok 2 - commits deletes and EXECUTED audit together on the success path
      ---
      duration_ms: 157.223708
      ...
    1..2
ok 1 - synthetic cleanup atomicity (ephemeral Postgres)
  ---
  duration_ms: 873.766708
  type: 'suite'
  ...
1..1
# tests 2
# suites 1
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1347.404208
```

### Rollback case

Injects a throw inside `afterPersist` **after** risk purge + document deletes have run inside the transaction, **before** the EXECUTED audit write would succeed. Direct SQL afterward confirms:

- Mid-tx synthetic `platform_documents` count was `0` (deletes ran).
- Post-rollback count equals pre-tx count (full restore).
- No new `EXECUTED` / `confirmed=true` audit row.
- In-memory snapshot rehydrated to pre-cleanup synthetic totals.

### Success case

`executeSyntheticCleanupAtomically` end-to-end: synthetic documents gone, at least one `EXECUTED`/`confirmed=true` audit row present, in-memory preview total `0`.

## Files

| File | Role |
|------|------|
| `packages/shared-platform/src/postgres-store.ts` | `replaceAndPersistForSyntheticCleanup` (opt-in) |
| `packages/shared-platform/src/synthetic-cleanup.ts` | `executeSyntheticCleanupAtomically` |
| `packages/shared-platform/src/index.ts` | export |
| `apps/event-os/scripts/synthetic-cleanup.ts` | `--execute` wires to atomic helper |
| `packages/shared-platform/test/synthetic-cleanup-atomicity.test.ts` | ephemeral Postgres rollback + success |
| `packages/shared-platform/test/persistence-integration.test.ts` | existing cleanup test uses atomic API |
