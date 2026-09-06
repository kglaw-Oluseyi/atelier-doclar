# EOS-S04A Cumulative Build Ledger

**Slice:** EOS-S04A — Guest Addressing, Relationships & Party Entitlements  
**Authorised starting HEAD:** `19973f1a0f1f399c74dec5f47b110f896aab785a`  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`  
**Railway / production / providers / later slices:** untouched throughout

---

## EOS-S04A-P00 — Controlled reconnaissance

| Field | Value |
|-------|-------|
| Starting HEAD | `19973f1a0f1f399c74dec5f47b110f896aab785a` |
| Ending HEAD | `7d6431bafc65581189e0b2f91c52b992dce44b7c` |
| Commit | `7d6431bafc65581189e0b2f91c52b992dce44b7c` |
| Files changed | `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` |
| Schema / migration | None |
| API / permission / transaction / audit | None |
| Frontend | None |
| Verification | `pnpm typecheck` PASS (7 packages). `pnpm test` PASS: design-system 1, shared-platform 99, programme-domain 155, event-os 25, programme-ingestion 46, programme-tower 42, control-tower 3 (371 pass / 0 fail / 0 skip). `pnpm programme:validate` PASS (84 slices, 0 cycles). |
| Failures found | None |
| Browser evidence | Not applicable |
| Residual limitations | Reconciliation report is in the operator conversation; programme catalog still has no EOS-S04A id (TDR-S04A-002). |
| Brought forward | TDR-S04-001–006; TDR-S04A-001–006 |
| Railway / production / providers / later slices | Untouched |

---

## EOS-S04A-P01 — Domain contracts

| Field | Value |
|-------|-------|
| Starting HEAD | `7d6431bafc65581189e0b2f91c52b992dce44b7c` |
| Ending HEAD | `e75f94f30643cc8e6885c559ed635da3605390f3` |
| Commit | `e75f94f30643cc8e6885c559ed635da3605390f3` |
| Files changed | `packages/shared-platform/src/constants.ts`, `packages/shared-platform/src/addressing-schemas.ts`, `packages/shared-platform/src/addressing.ts`, `packages/shared-platform/src/guest-schemas.ts`, `packages/shared-platform/src/catalog.ts`, `packages/shared-platform/src/index.ts`, `packages/shared-platform/test/addressing-contracts.test.ts`, `docs/control/EOS_S04A_BUILD_LEDGER.md` |
| Schema / migration | New runtime schemas only. No snapshot collections or persistence migration yet. `OperationalGuest` gained optional `addressing`, `ageBand`, `childReadiness`. Existing guest IDs unchanged. |
| API / permission / transaction / audit | Permission keys added to catalogue and role grants. No service mutations, transactions or new audit actions. |
| Frontend | None |
| Verification | `pnpm typecheck` PASS. `pnpm --filter @maison-doclar/shared-platform test` 111 pass / 0 fail / 0 skip (12 new S04A contract tests). `pnpm test` PASS: 1+111+155+25+46+42+3 = 383 pass / 0 fail / 0 skip. `pnpm programme:validate` PASS. `git diff --check` clean. Event OS production build not required (no Event OS source change). |
| Failures found | Typecheck unused import / missing status type / possibly-undefined transition lookup — resolved before commit. |
| Browser evidence | Not applicable |
| Residual limitations | Persistence, services and UI remain P02–P07. Guest Concierge / Gate-Security not added as system roles (TDR-S04A-001). |
| Brought forward | P02 must add collections, compatible household backfill and Yorùbá fixtures. |
| Railway / production / providers / later slices | Untouched |

---

## EOS-S04A-P02 — Persistence, migrations, compatibility and fixtures

| Field | Value |
|-------|-------|
| Starting HEAD | `e75f94f30643cc8e6885c559ed635da3605390f3` |
| Ending HEAD | *(set after commit)* |
| Commit | *(set after commit)* |
| Files changed | `packages/shared-platform/src/store.ts`, `packages/shared-platform/src/postgres-store.ts`, `packages/shared-platform/src/addressing-migration.ts`, `packages/shared-platform/src/addressing-fixtures.ts`, `packages/shared-platform/src/index.ts`, `packages/shared-platform/test/addressing-persistence.test.ts`, `docs/control/EOS_S04A_BUILD_LEDGER.md`, `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` |
| Schema / migration | New snapshot collections: guestParties, guestPartyMembers, guestRelationships, companionEntitlements, companionNominations, responsibleAdultLinks, eventSeries, eventSeriesMembers, addressingReconciliationItems. `migrateEosS04A` backfills HOUSEHOLD parties only from dedicated `guestHouseholds` / `householdId`. Rollback removes new collections and preserves guest/event IDs. No free-text title parse. No Railway/Postgres production migration. |
| API / permission / transaction / audit | None (persistence only) |
| Frontend | None |
| Verification | `pnpm typecheck` PASS. `pnpm --filter @maison-doclar/shared-platform test` 116 pass / 0 fail / 0 skip (5 new persistence tests). `pnpm test` PASS: 1+116+155+25+46+42+3 = 388 pass / 0 fail / 0 skip. `pnpm programme:validate` PASS. `git diff --check` clean. Event OS production build not required (no Event OS source change). |
| Failures found | None |
| Browser evidence | Not applicable |
| Residual limitations | Services, permissions enforcement, projections and UI remain P03–P07. S04A fixtures are opt-in via `applyS04AFixtures` and are not injected into every bootstrap snapshot. |
| Brought forward | Milestone 1 review. P03 services must consume these collections. |
| Railway / production / providers / later slices | Untouched |
