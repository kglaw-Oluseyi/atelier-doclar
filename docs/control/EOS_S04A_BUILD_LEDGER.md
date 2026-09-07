# EOS-S04A Cumulative Build Ledger

**Slice:** EOS-S04A — Guest Addressing, Relationships & Party Entitlements
**Authorised starting HEAD:** `19973f1a0f1f399c74dec5f47b110f896aab785a`
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`
**Railway / production / providers / later slices:** Event OS in project `atelier-doclar` may be deployed after P07 for frontend visibility only. That deploy is not acceptance, protected-gate approval or production authorisation. Other Railway projects remain untouched.

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

---

## Local / GitHub parity governance

Controlling policy: `docs/control/LOCAL_GITHUB_PARITY_POLICY.md`.

GitHub is the durable source of truth for repository work. A push records and protects implementation evidence. It does not accept EOS-S04A, pass Milestone 1, authorise P03, authorise deployment, authorise production, or sign a protected gate.

EOS-S04A Milestone 1 work-state at the time this policy was established:

| State | EOS-S04A Milestone 1 |
|-------|----------------------|
| Implemented | Yes — P00–P02 and Milestone 1 remediations exist as commits |
| Locally verified | Yes — typecheck, tests, programme validation and `git diff --check` passed locally |
| Pushed | Recorded after the authorised durability push |
| Independently reviewed | Pending ChatGPT review of the pushed evidence |
| Accepted | No |
| Deployed | No |
| Production authorised | No |

---

## EOS-S04A-P03 — Guest services

| Field | Value |
|-------|-------|
| Starting HEAD | `3fa43f096c56b263b5f98f4da01b4d16386cd226` |
| Ending HEAD | `0de24a170929ebb0505a392f24f9a1d818a95850` |
| Commit | `0de24a170929ebb0505a392f24f9a1d818a95850` |
| Files changed | `packages/shared-platform/src/addressing-operations.ts`, `packages/shared-platform/src/addressing-projections.ts`, `packages/shared-platform/src/addressing-schemas.ts`, `packages/shared-platform/src/addressing-fixtures.ts`, `packages/shared-platform/src/guest-operations.ts`, `packages/shared-platform/src/service.ts`, `packages/shared-platform/src/index.ts` |
| Schema / migration | Additive optional `ageBand` on addressing update and `ReconcileCompanionNamesInputSchema`. `SCHEMA_VERSION` remains `1`. Intake now persists structured addressing and computed child readiness. |
| API / permission / transaction / audit | `PlatformService` mutations: `updateGuestAddressing`, `createGuestParty`, `addGuestPartyMember`, `removeGuestPartyMember`, `createGuestRelationship`, `administerCompanionEntitlement`, `nominateCompanion`, `createResponsibleAdultLink`, `reconcileCompanionNames`. Query: `getGuestAddressingWorkspace`. Coupled writes run inside one `mutate()` clone; a thrown error does not replace the store except audited VERSION_CONFLICT / TRANSITION_INVALID. S03 remains sole quantity authority. |
| Frontend | None in this commit. |
| Verification | Covered by the P03–P07 suite below. |
| Failures found | Typecheck unused import / possible undefined party — resolved before commit. |
| Browser evidence | Not applicable |
| Residual limitations | UI remains P06/P07. |
| Brought forward | P04–P07 |
| Railway / production / providers / later slices | Untouched in this commit |

---

## EOS-S04A-P04 — Authority and privacy

| Field | Value |
|-------|-------|
| Starting HEAD | `0de24a170929ebb0505a392f24f9a1d818a95850` |
| Ending HEAD | `165ef73ad9e8fc196ebfbad57cad9a49623aad1b` |
| Commit | `165ef73ad9e8fc196ebfbad57cad9a49623aad1b` |
| Files changed | `packages/shared-platform/src/communications-operations.ts`, `packages/shared-platform/src/rsvp-operations.ts` |
| Schema / migration | None |
| API / permission / transaction / audit | Communications `guest.name` uses `renderGuestSalutation`. RSVP visible name prefers an explicit preferred display name. Directory `getGuest` / `listGuests` already project child and protocol fields in P03. |
| Frontend | None in this commit. |
| Verification | Covered by the P03–P07 suite below. |
| Failures found | None |
| Browser evidence | Not applicable |
| Residual limitations | UI remains P06/P07. |
| Brought forward | P05–P07 |
| Railway / production / providers / later slices | Untouched in this commit |

---

## EOS-S04A-P05 — Backend invariant verification

| Field | Value |
|-------|-------|
| Starting HEAD | `165ef73ad9e8fc196ebfbad57cad9a49623aad1b` |
| Ending HEAD | `c6081fd93009397c951787fd54c56c4a575017dd` |
| Commit | `c6081fd93009397c951787fd54c56c4a575017dd` |
| Files changed | `packages/shared-platform/test/addressing-services.test.ts` |
| Schema / migration | None |
| API / permission / transaction / audit | Tests cover grant/denial, auditor min-necessary projection, cross-event SCOPE_MISMATCH, S03 expansion refusal, planner exception-review denial, exactly-once nomination, unnamed allowance, companionNames reconciliation without fabricating guests, child readiness, VERSION_CONFLICT rollback, and date-of-birth refusal. |
| Frontend | None |
| Verification | `pnpm --filter @maison-doclar/shared-platform test` 152 pass / 0 fail / 0 skip (18 new service tests). |
| Failures found | None remaining |
| Browser evidence | Not applicable |
| Residual limitations | UI remains P06/P07. |
| Brought forward | P06–P07 |
| Railway / production / providers / later slices | Untouched in this commit |

---

## EOS-S04A-P06 — Frontend contracts

| Field | Value |
|-------|-------|
| Starting HEAD | `c6081fd93009397c951787fd54c56c4a575017dd` |
| Ending HEAD | `7bda73d398cc2f88a053226904c8ad33a5fb9eb6` |
| Commit | `7bda73d398cc2f88a053226904c8ad33a5fb9eb6` |
| Files changed | `apps/event-os/src/server/runtime.ts`, `apps/event-os/src/server/guest-scope.ts`, `apps/event-os/src/server/actions.ts`, `apps/event-os/src/app/api/events/[eventId]/guests/[guestId]/addressing/route.ts`, `apps/event-os/test/addressing-display.test.ts` |
| Schema / migration | None |
| API / permission / transaction / audit | Event OS applies missing S04A fixtures on boot. Server actions and `GET`/`PATCH` `/api/events/:eventId/guests/:guestId/addressing` call `PlatformService` only. Permission flags are server-derived. |
| Frontend | Contracts only. |
| Verification | Event OS unit tests 27 pass / 0 fail / 0 skip. |
| Failures found | Incorrect addressing API import depth — resolved before commit. |
| Browser evidence | Not applicable |
| Residual limitations | Visible journey remains P07. |
| Brought forward | P07 |
| Railway / production / providers / later slices | Untouched in this commit |

---

## EOS-S04A-P07 — Guest experience

| Field | Value |
|-------|-------|
| Starting HEAD | `7bda73d398cc2f88a053226904c8ad33a5fb9eb6` |
| Ending HEAD | `5d821de9afc1d48c8772ff3f3cf6f6325dec4cee` |
| Commit | `5d821de9afc1d48c8772ff3f3cf6f6325dec4cee` |
| Files changed | `apps/event-os/src/components/guest-addressing-form.tsx`, `apps/event-os/src/components/guest-intake-form.tsx`, `apps/event-os/src/app/app/events/[eventId]/guests/[guestId]/page.tsx`, `apps/event-os/src/app/app/events/[eventId]/guests/page.tsx`, `apps/event-os/src/app/globals.css`, `apps/event-os/e2e/addressing.spec.ts`, `apps/event-os/e2e/guests.spec.ts` |
| Schema / migration | None |
| API / permission / transaction / audit | UI consumes the typed workspace only. Planner has no confirm control. Material failure states use `role="alert"`. |
| Frontend | Intake and guest-detail addressing workspace: formal/familiar render, blank-title fallback, 360px wrap, `:focus-visible`, 200% zoom coverage in Playwright. |
| Verification | `pnpm typecheck` PASS (7 packages). `pnpm test` PASS: design-system 1, shared-platform 152, programme-domain 155, event-os 27, programme-ingestion 46, programme-tower 42, control-tower 3 (426 pass / 0 fail / 0 skip). `pnpm programme:validate` PASS (84 slices, 0 cycles). `pnpm --filter @maison-doclar/event-os build` PASS. `git diff --check origin/main` clean. |
| Failures found | Existing guest-directory e2e empty-state assertion updated because S04A fixtures are now loaded in Event OS. |
| Browser evidence | Playwright specs `apps/event-os/e2e/addressing.spec.ts` and updated `guests.spec.ts`. Independent Claude-in-Chrome verification is prepared after deploy. |
| Residual limitations | Playwright was not executed in this agent environment after the production build; Claude-in-Chrome remains the independent frontend verifier. |
| Brought forward | Independent Milestone 2 review. P08 remains prohibited. |
| Railway / production / providers / later slices | Deploy of existing project `atelier-doclar` Event OS is authorised after this vertical is pushed, for frontend visibility only. |

---

## Milestone 2 vertical evidence

| State | EOS-S04A P03–P07 |
|-------|------------------|
| Implemented | Yes — services, permissions, projections, tests, Event OS contracts and guest addressing UI |
| Locally verified | Yes — typecheck, 426 tests, programme validation, Event OS production build, `git diff --check` |
| Pushed | Recorded after the authorised durability push |
| Independently reviewed | Pending |
| Accepted | No |
| Deployed | Frontend-visibility deploy of Event OS in `atelier-doclar` only, after push. Not acceptance. |
| Production authorised | No |

### Requirements-to-evidence matrix

| Requirement | Evidence |
|-------------|----------|
| Server org/client/event scope | `requireScopedGuest` / `SCOPE_MISMATCH`; tests for cross-event party and relationship |
| Referential validation | Party, relationship, invitation and S03 authority checks in `addressing-operations.ts` |
| S03 sole quantity authority | `authorisedCompanionAllowance` + expansion test |
| Exactly-once companion materialisation | `nominateCompanion` version + idempotency tests |
| Atomic coupled writes + rollback | `mutate()` clone; VERSION_CONFLICT leaves guest/nomination counts unchanged |
| Optimistic conflict | `expectedVersion` on addressing, party membership, nomination |
| Permission independent of UI | Service `mutate`/`authorizeQuery`; planner confirm and exception-review denied |
| Min-necessary projections | `projectOperationalGuest` / `buildGuestAddressingWorkspace`; auditor test |
| Addressing intake/amendment via shared schemas | Intake `addressingFromIntake`; `UpdateGuestAddressingInputSchema` |
| Safe communications salutation | `templateVariablesFor` + P04 commit |
| S03 `companionNames` reconciliation | `reconcileCompanionNames`; no fabricated guests |
| Correlated audit | Existing `mutate`/`authorizeQuery` audit for success, DENIED, FAILED |
| Accurate migration receipts | Unchanged from Milestone 1 |

### Unresolved items

| Item | Severity | Latest safe remediation |
|------|----------|-------------------------|
| Independent Milestone 2 review | — | After Claude-in-Chrome verification |
| Guest Concierge / Gate-Security system roles (TDR-S04A-001) | LOW | Later authorised slice |
| Programme catalog EOS-S04A id (TDR-S04A-002) | LOW | Programme admin |
| TDR-S04A-011 synthetic cleanup attribution | HIGH | Before client onboarding |
| P10 documentation | — | Operator handbook and current-state update in this P10 commit |

---

## EOS-S04A-P08 — Frontend states, accessibility and responsive hardening

| Field | Value |
|-------|-------|
| Starting HEAD | `1051aeab90671093684c3e5a8eda84b34c5dbb76` |
| Ending HEAD | `feb73cd` |
| Commit | `feb73cd` `fix(event-os): harden EOS-S04A frontend states` |
| Files changed | Event OS guest intake, dossier, directory, party/child/entitlement workspaces, operational-state system, shared-platform party/RA/entitlement projections and `endResponsibleAdultLink` |
| Schema / migration | Additive `EndResponsibleAdultLinkInputSchema` only. `SCHEMA_VERSION` remains `1`. |
| API / permission / transaction / audit | New server actions wrap existing PlatformService mutations. Planner confirmation and exception review remain server-denied. Ending a responsible-adult link is `guest.child.manage`. |
| Frontend | Complete P08 surfaces: intake fields, dossier projections, party lifecycle, responsible-adult picker/end, entitlement administer/nominate, structured directory names, Command Atelier states. |
| Verification | `pnpm typecheck` PASS. `pnpm test` PASS: design-system 3, shared-platform 166, programme-domain 155, event-os 37, programme-ingestion 46, programme-tower 42, control-tower 3 (452 pass / 0 fail). `pnpm programme:validate` PASS. Event OS production build PASS. Focused Playwright: addressing, atelier, s04a-hardening PASS. |
| Failures found | Existing Reason/name locators became ambiguous after workspace expansion; tests tightened. PlatformError `instanceof` failed across the action boundary; classification now duck-types `code`. |
| Browser evidence | `apps/event-os/e2e/s04a-hardening.spec.ts`; 360px, 640px-as-200%, keyboard, reduced motion, axe. |
| Residual limitations | Playwright CSS `zoom` is not identical to browser zoom; 640px used as the 200% layout equivalent. |
| Brought forward | P09 integration, visual evidence, deploy. |
| Railway / production / providers / later slices | Untouched in this commit. `productionAuthorised` remains false. |

---

## EOS-S04A-P09 — Integration, cross-platform E2E and visual evidence

| Field | Value |
|-------|-------|
| Starting HEAD | `feb73cd` |
| Ending HEAD | this P09 commit |
| Commit | this P09 commit `test(event-os): verify EOS-S04A integration and visual evidence` |
| Files changed | P09 integration spec, evidence index, ledger/TDR, party-create adds the creating guest as an explicit member, deployed SHA on health/system |
| Schema / migration | None |
| API / permission / transaction / audit | Creating a party from a dossier now also adds that guest as MEMBER (or PRINCIPAL only when explicitly selected). Health/live and ready expose `deployedSha`. |
| Frontend | No new domain surfaces. Evidence and observability only. |
| Verification | `pnpm typecheck` PASS. `pnpm test` PASS (452). `pnpm programme:validate` PASS. Event OS build PASS. `git diff --check` clean. Playwright: 31 passed in the full run; `zz-communications-hv` failed once after a Next.js memory restart and passed on isolated retry. P08/P09 specs passed in the same full run. |
| Failures found | Party created from a dossier was invisible until the creating guest was explicitly added as a member. Corrected in this commit. |
| Browser evidence | `apps/event-os/e2e/s04a-integration.spec.ts`; index `apps/event-os/e2e/evidence/INDEX.md`; artifacts untracked. |
| Residual limitations | Restart-survival against Railway Postgres is recorded after deploy. Local e2e uses the cleaned file store. |
| Brought forward | TDR-S04A-011; permanent IdP; global real-data cleanup; external providers; P10. |
| Railway / production / providers / later slices | Event OS in project `atelier-doclar` is deployed after this commit is pushed. Control Tower is not deployed. Production operations remain unauthorised. |

---

## EOS-S04A-P10 — Academy delta, operational documentation and handover

| Field | Value |
|-------|-------|
| Starting HEAD | `14f47b19bd723e81c0489e7efe326f2e46b137dd` |
| Ending HEAD | this P10 commit |
| Commit | this P10 commit `docs(control): record EOS-S04A academy and implementation` |
| Files changed | `packages/academy` ACA-S04A contracts; Event OS Academy surface and durable attempt store; operator handbook; human-verification procedure; current-state / TDR / ACADEMY product note |
| Schema / migration | No guest-schema change. Academy attempts persist in Event OS table `event_os_academy_delta` (Postgres) or `data/academy-s04a.json` (local). `SCHEMA_VERSION` remains `1`. |
| API / permission / transaction / audit | Academy enrolment uses existing role keys. Completion never grants permissions or signs gates. |
| Frontend | Command Atelier `/app/academy` and `/app/academy/aca-s04a` with progressive modules, warnings, assessment, retake and evidence. |
| Verification | `pnpm typecheck` PASS (8 packages including academy). `pnpm test` PASS: academy 7, design-system 3, shared-platform 166, programme-domain 155, programme-ingestion 46, event-os 39, programme-tower 42, control-tower 3 (461 pass / 0 fail). `pnpm programme:validate` PASS. Event OS build PASS. Focused Playwright `e2e/academy-s04a.spec.ts` 2 passed. `git diff --check` clean. |
| Residual limitations | TDR-S04A-011, TDR-S04A-012, TDR-S04A-015; permanent IdP unselected; synthetic data present; providers disabled. |
| Brought forward | P11 whole-slice hardening and independent-review package. |
| Railway / production / providers / later slices | Event OS may be deployed after P11. Control Tower is not deployed for documentation-only shared files. Production remains unauthorised. EOS-S04B / S04F / S05 not started. |

---

## EOS-S04A-P11 — Whole-slice hardening and independent-review package

| Field | Value |
|-------|-------|
| Starting HEAD | `750f068fa7c8c8d17aaa7c9a3c25993964406740` |
| Ending HEAD | this P11 commit |
| Commit | this P11 commit `chore(event-os): complete EOS-S04A slice hardening` |
| Files changed | Governed relationship create/amend; final journey spec; whole-slice review record; Claude-in-Chrome prompt; current-state IN_REVIEW |
| Schema / migration | Additive `AdministerRelationshipInputSchema` only. `SCHEMA_VERSION` remains `1`. |
| API / permission / transaction / audit | `administerGuestRelationship` is `guest.relationship.manage`, versioned, audited as `guest.relationship.amended`. |
| Frontend | Declared-relationship workspace on the dossier. |
| Verification | `pnpm typecheck` PASS. `pnpm test` PASS: academy 7, design-system 3, shared-platform 168, programme-domain 155, programme-ingestion 46, event-os 39, programme-tower 42, control-tower 3. `pnpm programme:validate` PASS. Event OS build PASS. `git diff --check` clean. First full E2E: 32 passed / 4 failed (3 fixture-coupling, 1 HV memory-restart). Focused S04A/Academy re-run 10 passed. Second full E2E: 34 passed / 2 failed (`ENOSPC` on local store; HV after memory restart). Isolated integration and HV retries PASS. |
| Failures found | P11 journeys must not mutate fixture Adéṣínà or cycle Ebun entitlement in the shared e2e store. Isolated synthetic guests used instead. Entitlement decline/expire/revoke proven in shared-platform tests. |
| Browser evidence | `apps/event-os/e2e/s04a-final-journeys.spec.ts`; P08/P09 specs remain the visual matrix. |
| Status | IN_REVIEW / not ACCEPTED |
| Residual limitations | TDR-S04A-011, 012, 015; IdP unselected; synthetic data; providers off. |
| Railway / production / providers / later slices | Event OS deployed after this commit is pushed. Control Tower not deployed (runtime unchanged). EOS-S04B / S04F / S05 not started. |

---

## EOS-S04A final-acceptance remediation — concurrency, attention, salutation, prefetch

| Field | Value |
|-------|-------|
| Starting HEAD | `234ab6c2347928900fb91e5b9022bb45b8d49176` |
| Ending HEAD | this remediation commit chain |
| Commits | product remediations plus `docs(control): record EOS-S04A acceptance remediation` |
| Files changed | Shared-platform already-applied / attention / salutation governance; Event OS conflict flash, locked submits, prefetch boot containment; focused tests; control docs |
| Schema / migration | Additive optional `preferredFormalSalutationGovernance` and `salutationDecision`. `SCHEMA_VERSION` remains `1`. |
| API / permission / transaction / audit | Permissions unchanged. Identical replay reuses the existing record with no second audit or idempotency row. Genuine stale different values remain `VERSION_CONFLICT`. Salutation retain/update is audited through the addressing write. |
| Frontend | Visible conflict (never success/neutral); in-progress lock; salutation governance radios; derived guest attention on directory and dossier. |
| Verification | `pnpm typecheck` PASS. `pnpm test` PASS (shared-platform 175, event-os 41). `pnpm programme:validate` PASS. Event OS build PASS. `git diff --check` clean. Focused remediation e2e first run: 4 passed / 3 failed (page-level flash-cookie delete is illegal in a Server Component and crashed the dossier). After moving consume to `refreshGuestRecordAction`: focused 7 passed. First full Event OS e2e: 41 passed / 2 failed, both immediately after Next.js memory restart (P11 intake page missing; P09 `page.goto` timeout). Isolated retry of those two specs: 4 passed. |
| Failures found | First focused run product defect: cookie mutation from the guest page. Fixed by consuming flash only in a server action. Full-suite P11/P09 failures classified as memory-restart infrastructure after isolated green retry. |
| Status | IN_REVIEW / not ACCEPTED |
| Residual limitations | TDR-S04A-011; TDR-S04A-012 pending deployed prefetch classification; TDR-S04A-016/017 close only after deployed evidence; TDR-S04A-015; IdP unselected; synthetic data; providers off. |
| Railway / production / providers / later slices | Event OS deployed after push. Control Tower not deployed. EOS-S04B / S04F / S05 not started. |

---

## EOS-S04A final focused remediation II — RETAIN, recovery, access administration

| Field | Value |
|-------|-------|
| Starting HEAD | `4daec3830672ef41c9e6ee1e1b5a2808f7b6256d` |
| Ending HEAD | this remediation commit chain |
| Commits | `fix(event-os): preserve retained guest salutations`; `fix(event-os): complete conflict recovery`; `fix(event-os): secure access administration`; `docs(control): record final EOS-S04A acceptance remediation` |
| Files changed | Addressing retain invariant and authored-formal display; guest-scoped flash/recovered recovery; Access Administration `assignment.manage`; focused tests; control docs |
| Schema / migration | None. `SCHEMA_VERSION` remains `1`. |
| API / permission / transaction / audit | `getAccessAdministration` requires `assignment.manage`. RETAIN invariant failure rolls back and audits `FAILED`, not `RETAINED`. Grant denial is audited without the attempted assignment. |
| Frontend | Formal preview uses authored preferred salutation whenever present. One-click recovery unlocks forms. Planner/Auditor Access Administration is a controlled FORBIDDEN. System health remains an intentional non-secret readiness projection. |
| Verification | `pnpm typecheck` PASS. `pnpm test` PASS. `pnpm programme:validate` PASS. Event OS build PASS. `git diff --check` clean. First focused e2e: 11 passed / 3 product failures (Access page threw `PlatformError` to the RSC boundary because `instanceof` failed across bundles; recovered cookie hid a later live conflict). After duck-typed denial and live-flash-wins recovery: focused 7 passed. First full Event OS e2e: 48 passed / 2 failed, both immediately after Next.js memory restart (Home heading timeout after sign-in; staff logout sign-in heading). Isolated retry of those two: 2 passed. |
| Failures found | First focused run product defects: Access Administration uncaught denial; recovered cookie suppressed a second conflict. Fixed before commit. Full-suite P11/session failures classified as memory-restart infrastructure after isolated green retry. |
| Status | IN_REVIEW / not ACCEPTED |
| Residual limitations | TDR-S04A-011; TDR-S04A-012 pending origin-log classification; TDR-S04A-016–020 close only after deployed evidence; TDR-S04A-015; IdP unselected; synthetic data; providers off. |
| Railway / production / providers / later slices | Event OS deployed after push. Control Tower not deployed. EOS-S04B / S04F / S05 not started. |
