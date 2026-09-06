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
| Verification | `pnpm typecheck` PASS. `pnpm --filter @maison-doclar/shared-platform test` 111 pass / 0 fail / 0 skip (12 new S04A contract tests). `pnpm test` PASS: 1+111+155+25+46+42+3 = 383 pass / 0 fail / 0 skip. `pnpm programme:validate` PASS. Event OS production build not required (no Event OS source change). Historical note: this prompt recorded `git diff --check` as clean; Milestone 1 review found that claim false because of Markdown trailing two-space hard breaks. Corrected in the documentation remediation commit. |
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
| Ending HEAD | `69a6897486101adaf34d9966b2417c47ca5ddd90` |
| Commit | `69a6897486101adaf34d9966b2417c47ca5ddd90` |
| Files changed | `packages/shared-platform/src/store.ts`, `packages/shared-platform/src/postgres-store.ts`, `packages/shared-platform/src/addressing-migration.ts`, `packages/shared-platform/src/addressing-fixtures.ts`, `packages/shared-platform/src/index.ts`, `packages/shared-platform/test/addressing-persistence.test.ts`, `docs/control/EOS_S04A_BUILD_LEDGER.md`, `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` |
| Schema / migration | New snapshot collections: guestParties, guestPartyMembers, guestRelationships, companionEntitlements, companionNominations, responsibleAdultLinks, eventSeries, eventSeriesMembers, addressingReconciliationItems. `migrateEosS04A` backfills HOUSEHOLD parties only from dedicated `guestHouseholds` / `householdId`. As shipped in this commit, rollback cleared the nine new collections. That behaviour is recorded here as historical P02 evidence; Milestone 1 review prohibited it because it can delete legitimate post-migration data. Corrected in the persistence-migration remediation commit. No free-text title parse. No Railway/Postgres production migration. `SCHEMA_VERSION` remained `1`. |
| API / permission / transaction / audit | None (persistence only) |
| Frontend | None |
| Verification | `pnpm typecheck` PASS. `pnpm --filter @maison-doclar/shared-platform test` 116 pass / 0 fail / 0 skip (5 new persistence tests). `pnpm test` PASS: 1+116+155+25+46+42+3 = 388 pass / 0 fail / 0 skip. `pnpm programme:validate` PASS. Event OS production build not required (no Event OS source change). Historical note: this prompt recorded `git diff --check` as clean; Milestone 1 review found that claim false because of Markdown trailing two-space hard breaks. Corrected in the documentation remediation commit. |
| Failures found | None recorded at commit time. Independent Milestone 1 review later found unsafe collection-clearing rollback, missing persist/hydrate validation, a missing S03 entitlement authority fixture, Client Lead / Department Lead S04A grants, and incomplete anomaly handling. Those findings are remediated below; they are not rewritten into this commit. |
| Browser evidence | Not applicable |
| Residual limitations | Services, permissions enforcement, projections and UI remain P03–P07. S04A fixtures are opt-in via `applyS04AFixtures` and are not injected into every bootstrap snapshot. |
| Brought forward | Milestone 1 review. P03 remains prohibited until that review passes. |
| Railway / production / providers / later slices | Untouched |

---

## Schema-version decision

`SCHEMA_VERSION` remains `1`.

Repository convention treats `SCHEMA_VERSION` as the shared record generation number (`z.literal(SCHEMA_VERSION)` on existing guest, event, RSVP and communications records). EOS-S04A is a backward-compatible additive extension: pre-S04A snapshots with missing collections normalise to empty arrays and remain readable. Existing guest and event identifiers are not rewritten. Unsupported record `schemaVersion` values fail explicitly at the S04A persist/hydrate boundary. A generation bump is not required and was not made merely to satisfy review.

---

## Rollback safety

Rollback is safe only when all of the following hold:

* an `APPLIED` typed `s04aMigrationReceipts` journal entry exists for that migration execution;
* every listed created record is absent or still at the recorded optimistic `version`;
* a listed party has not acquired unlisted members or other unsafe dependencies.

If any listed record was subsequently changed, or acquired dependencies that make removal unsafe, rollback refuses and leaves canonical data unchanged. Rollback never clears a whole S04A collection. Pre-existing S04A records and legitimate writes made after migration are retained. The former claim that clearing the nine collections is reversible is withdrawn; that design is prohibited.

---

## Persistence validation

The nine S04A collections, plus the migration journal, are validated with the shared runtime schemas at the memory `replace` and Postgres `replaceAsync` / `hydrate` boundary. When present, `OperationalGuest.addressing`, `ageBand` and `childReadiness` are validated with the same shared `GuestAddressingSchema`, `AgeBandSchema` and `ChildReadinessSchema` — the store does not duplicate those schemas. Legacy guests that omit the three fields still load. Missing S04A collections still normalise to empty arrays. Valid records round-trip. Invalid records raise `VALIDATION_FAILED` with collection path and issue code only. Unknown fields are rejected (schemas are `.strict()`; persistence does not strip or coerce). A validation failure does not yield a partially hydrated canonical snapshot. Errors do not expose secrets or unrestricted record bodies.

---

## Permission-enforcement status

The catalogue now matches the ratified pack: CEO has governed broad authority; Event Director has operational management, confirmation and exception review; Planner has routine addressing, party, child and entitlement administration and must not confirm protocol-sensitive addressing, review entitlement exceptions, or view restricted protocol notes; Client Lead and Department Lead have no EOS-S04A role; System Administrator has no business authority by default; Gate/Security has no S04A mutation path; Read-only Auditor has read-only minimum-necessary projection contracts, including `guest.child.view`, which does not imply unrestricted child-record or household visibility. Planner `guest.entitlement.manage` never authorises entitlement expansion. Server-side permission and projection enforcement remains P03 / P04 / P06 work. Catalogue grants are not runtime enforcement.

---

## Cross-event enforcement status

Migration now refuses to create membership for a guest/household event mismatch and emits `GUEST_HOUSEHOLD_EVENT_MISMATCH`. A household with no valid same-event members does not produce an empty operational party. Reuse through `legacyHouseholdId` validates organisation, client, event and `HOUSEHOLD` type. Cross-event leakage in live services remains P03+ work; this remediation only corrects the migration contract.

---

## Adéṣínà Ọládàpọ̀ fixture classification

Adéṣínà Ọládàpọ̀ (`00000000-0000-4000-8000-000000000076`) is an unrelated existing `OperationalGuest`. He is not a household-party member, not a nomination, and not a materialised companion.

---

## EOS-S04A-M1R1 — Secure persistence and migration

| Field | Value |
|-------|-------|
| Starting HEAD | `69a6897486101adaf34d9966b2417c47ca5ddd90` |
| Ending HEAD | `e1a610b09b4d5f5cc3c3e60845444fae55d9bb85` |
| Commit | `e1a610b09b4d5f5cc3c3e60845444fae55d9bb85` |
| Files changed | `packages/shared-platform/src/addressing-schemas.ts`, `packages/shared-platform/src/addressing-persistence.ts`, `packages/shared-platform/src/addressing-migration.ts`, `packages/shared-platform/src/addressing-fixtures.ts`, `packages/shared-platform/src/store.ts`, `packages/shared-platform/src/memory-store.ts`, `packages/shared-platform/src/postgres-store.ts`, `packages/shared-platform/src/constants.ts`, `packages/shared-platform/src/index.ts`, `packages/shared-platform/test/addressing-persistence.test.ts` |
| Schema / migration | Added typed `s04aMigrationReceipts` journal. Migration records created ids and versions. Rollback removes only those records and refuses on modification or unsafe dependency. Persist/hydrate validates the nine S04A collections. Anomaly handling added for empty households, event mismatch, missing household, historical membership, reuse-scope mismatch and deterministic-id collision. `SCHEMA_VERSION` remains `1`. The unnamed S04A entitlement now references a real synthetic S03 `RsvpEntitlement`. |
| API / permission / transaction / audit | None |
| Frontend | None |
| Verification | Focused S04A persistence tests PASS. Full suite recorded on the documentation commit. |
| Failures found | Persist-boundary `assert.throws` predicate initially returned undefined; fixed before this commit. |
| Browser evidence | Not applicable |
| Residual limitations | Postgres document replace remains upsert-plus-S04A-delete only for the S04A store collections. Other collections keep pre-existing upsert-only behaviour. Live services remain P03+. |
| Brought forward | Fixture authority and permission narrowing. |
| Railway / production / providers / later slices | Untouched |

---

## EOS-S04A-M1R2 — Fixtures and permissions

| Field | Value |
|-------|-------|
| Starting HEAD | `e1a610b09b4d5f5cc3c3e60845444fae55d9bb85` |
| Ending HEAD | `ed3fd4e0295956064f5bd03071da49bc7a38b291` |
| Commit | `ed3fd4e0295956064f5bd03071da49bc7a38b291` |
| Files changed | `packages/shared-platform/src/catalog.ts`, `packages/shared-platform/test/addressing-contracts.test.ts`, `packages/shared-platform/test/addressing-fixtures.test.ts` |
| Schema / migration | Fixture-integrity tests traverse S04A entitlement authority to the synthetic S03 record added in the previous commit. Allowance remains 1 and cannot exceed S03 quantity. Adéṣínà remains an unrelated existing guest. |
| API / permission / transaction / audit | Client Lead and Department Lead S04A grants removed. Intended CEO / Event Director / Planner / Auditor / System Administrator mappings retained as catalogue contracts only. |
| Frontend | None |
| Verification | Focused contract and fixture-integrity tests PASS. Full suite recorded on the documentation commit. |
| Failures found | Typecheck rejected untyped permission-key `includes` and an un-narrowed authority union; fixed before this commit. |
| Browser evidence | Not applicable |
| Residual limitations | Server-side permission and projection enforcement remains P03 / P04 / P06. |
| Brought forward | Documentation and register corrections. |
| Railway / production / providers / later slices | Untouched |

---

## EOS-S04A-M1R3 — Milestone evidence correction

| Field | Value |
|-------|-------|
| Starting HEAD | `ed3fd4e0295956064f5bd03071da49bc7a38b291` |
| Ending HEAD | this documentation commit |
| Commit | this documentation commit |
| Files changed | `docs/control/EOS_S04A_BUILD_LEDGER.md`, `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` |
| Schema / migration | None |
| API / permission / transaction / audit | None |
| Frontend | None |
| Verification | `pnpm typecheck` PASS (7 packages). `pnpm test` PASS: design-system 1, shared-platform 132, programme-domain 155, event-os 25, programme-ingestion 46, programme-tower 42, control-tower 3 (404 pass / 0 fail / 0 skip). `pnpm programme:validate` PASS (84 slices, 0 cycles). `git diff --check origin/main...HEAD` expected clean after this whitespace correction. Event OS production build not required (no Event OS source change). |
| Failures found | Historical P00/P02 `git diff --check` clean claims were false; trailing two-space hard breaks in these two Markdown files. Corrected here. |
| Browser evidence | Not applicable |
| Residual limitations | P03, Railway, production, providers and later slices remain untouched. EOS-S04 remains CLOSED / ACCEPTED. |
| Brought forward | Independent Milestone 1 re-review. P03 remains prohibited. |
| Railway / production / providers / later slices | Untouched |

---

## EOS-S04A-M1R4 — Validate embedded guest S04A fields

| Field | Value |
|-------|-------|
| Starting HEAD | `336a5f4fc33bf9138cabd11a25df76e716b1fff4` |
| Ending HEAD | this guest-persistence commit |
| Commit | this guest-persistence commit |
| Files changed | `packages/shared-platform/src/addressing-persistence.ts`, `packages/shared-platform/test/addressing-persistence.test.ts`, `docs/control/EOS_S04A_BUILD_LEDGER.md`, `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` |
| Schema / migration | Persist/hydrate now applies the shared addressing, ageBand and childReadiness schemas to `OperationalGuest` when those fields are present. Legacy guests without the fields remain readable. No schema duplication in the store. |
| API / permission / transaction / audit | None |
| Frontend | None |
| Verification | `pnpm typecheck` PASS (7 packages). `pnpm test` PASS: design-system 1, shared-platform 134, programme-domain 155, event-os 25, programme-ingestion 46, programme-tower 42, control-tower 3 (406 pass / 0 fail / 0 skip). `pnpm programme:validate` PASS (84 slices, 0 cycles). |
| Failures found | None |
| Browser evidence | Not applicable |
| Residual limitations | Full `OperationalGuest` shape outside the three S04A extensions is unchanged. Server-side permission enforcement remains P03 / P04 / P06. |
| Brought forward | Independent Milestone 1 re-review. P03 remains prohibited. |
| Railway / production / providers / later slices | Untouched |
