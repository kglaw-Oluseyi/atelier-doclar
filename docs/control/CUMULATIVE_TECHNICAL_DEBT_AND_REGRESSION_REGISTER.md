# Cumulative Technical Debt and Regression Register

**Authority:** EOS-S04A implementation authority (George Lawson, CEO)
**Created:** EOS-S04A-P00
**Status:** OPEN — controlled register; not a reopen of EOS-S04
**Production:** `productionAuthorised=false`; protected gates remain UNSIGNED / `NOT_READY`
**Railway / providers / later slices:** Event OS deployment and safe Postgres use inside Railway project `atelier-doclar` follow `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`. Other Railway projects, live providers and later unauthorised slices remain untouched.

## Supersession — deploy-by-default (6 September 2026)

**Former restriction:** Railway / providers / later slices: untouched.

**Status:** SUPERSEDED for `atelier-doclar` Event OS deployment and durable Postgres. Provider activation and other Railway projects remain forbidden.

**Current policy:** `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md`

**Safeguards retained:** Real data, live communications, payments, destructive resets, force-push, and protected-gate signatures remain gated.

This register is the authorised EOS-S04A control-document addition. It records inherited EOS-S04 observations and later non-blocking related debt. It does not reopen EOS-S04, increment accepted-slice count, sign a protected gate, or authorise production.

No deferral is permitted for: security or privacy failure; data corruption; maker/checker bypass; cross-event or cross-household leakage; destructive or uncertain migration; false-success UI; inaccessible primary journeys; server/client authority drift; or failures likely to multiply through later work.

## Entry contract

Every item uses the fields below.

| Field | Meaning |
|-------|---------|
| ID | Stable item identifier |
| Source slice | Slice that first evidenced the item |
| Description | Factual statement |
| Classification | Inherited observation, related observation, or in-slice debt |
| Severity | LOW / MEDIUM / HIGH / CRITICAL |
| Evidence | Record, SHA, or verification path |
| Affected surface or contract | Code, UI, or contract surface |
| Reason for deferral | Why the item is not a current STOP |
| Blocking | `BLOCKING` or `NON_BLOCKING` |
| Current owner | Named owner |
| Required regression coverage | Tests or human checks that must exist before closure |
| Latest safe remediation milestone | Latest slice prompt or review that may close it |
| Current status | OPEN / IN_COVERAGE / CLOSED |
| Resolution evidence | Required when CLOSED |

---

## Inherited EOS-S04 observations

These six items were retained at EOS-S04 formal closure (`CLOSED / ACCEPTED`, classification `PASS WITH OBSERVATIONS`). They remain observations. EOS-S04 is not reopened.

### TDR-S04-001 — Genuine 360px human-verification evidence unavailable

| Field | Value |
|-------|-------|
| ID | `TDR-S04-001` |
| Source slice | EOS-S04 |
| Description | Genuine 360px human-verification evidence was unavailable to the human reviewer during hosted R3 verification. |
| Classification | Inherited observation |
| Severity | MEDIUM |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` (observations retained without blocking closure); closure record `docs/control/Maison_Doclar_EOS-S04_R3_Final_Closure_Record_v1.0.docx`; hosted verification `MD-EOS-S04-R3-05` |
| Affected surface or contract | Event OS guest, communications and directory UI at genuine 360px viewport |
| Reason for deferral | Non-blocking observation at S04 closure; does not corrupt identity or bypass authority |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | Genuine 360px browser behaviour on EOS-S04A primary surfaces (intake, profile, party workspace, entitlements, directory/communications rendering) |
| Latest safe remediation milestone | EOS-S04A-P08 / P09 (frontend hardening and E2E evidence) |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04-002 — Narrow-column character wrapping under 200% zoom

| Field | Value |
|-------|-------|
| ID | `TDR-S04-002` |
| Source slice | EOS-S04 |
| Description | Simulated 2× CSS zoom exposed poor character-by-character wrapping in one narrow value column. |
| Classification | Inherited observation |
| Severity | MEDIUM |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` retained observations; `MD-EOS-S04-R3-05` |
| Affected surface or contract | Narrow definition/value columns; guest and communications detail rendering |
| Reason for deferral | Visual dignity issue; not a false-success or inaccessible-primary-journey failure at S04 closure |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | 200% zoom and narrow-column wrapping tests; long Nigerian and Yorùbá names must wrap by word/phrase, not character |
| Latest safe remediation milestone | EOS-S04A-P08 / P09 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04-003 — Yorùbá diacritics not exercised in final S04 fixture

| Field | Value |
|-------|-------|
| ID | `TDR-S04-003` |
| Source slice | EOS-S04 |
| Description | Yorùbá diacritics were not exercised in the final read-only EOS-S04 fixture. |
| Classification | Inherited observation |
| Severity | MEDIUM |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` retained observations; fixture set in `packages/shared-platform/src/fixtures.ts` uses ASCII display names |
| Affected surface or contract | Guest addressing, directory search, communications salutation, intake persistence |
| Reason for deferral | Coverage gap, not a proven transliteration defect; S04A must not infer titles from names |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | Long Yorùbá names with preserved diacritics in fixtures, domain tests, UI and E2E (for example `Ẹ̀bùnolúwa`, `Olúfẹ́mi`, `Alákíjà`) |
| Latest safe remediation milestone | EOS-S04A-P02 fixtures; proven through P05 / P07 / P09 |
| Current status | IN_COVERAGE |
| Resolution evidence | |

### TDR-S04-004 — Denied self-review HTTP and audit mechanics not isolated

| Field | Value |
|-------|-------|
| ID | `TDR-S04-004` |
| Source slice | EOS-S04 |
| Description | The exact HTTP status and audit mechanics of one denied self-review were not isolated retrospectively. |
| Classification | Inherited observation |
| Severity | MEDIUM |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` retained observations; maker-checker remediation commits `3dbc56006b3acdca6b6ff808bf7e58818417b7f7` and `349e29d80969fbec65b6dd8b9fb8d55a39ac8fdd` |
| Affected surface or contract | Contact-correction review; future title/relationship governed amend; denied-mutation audit |
| Reason for deferral | Hosted maker-checker passed; missing retrospective isolation only |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | Denied self-review HTTP and audit evidence for S04A governed title/relationship amendments and existing correction review |
| Latest safe remediation milestone | EOS-S04A-P04 / P05 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04-005 — Field-level CONFLICTING distinct from correction APPLIED

| Field | Value |
|-------|-------|
| ID | `TDR-S04-005` |
| Source slice | EOS-S04 |
| Description | Field-level `CONFLICTING` remained distinct from correction status `APPLIED`. |
| Classification | Inherited observation |
| Severity | LOW |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` retained observations; `FIELD_QUALITY_STATES` vs `MSG_CORRECTION_STATUSES` in `packages/shared-platform/src/constants.ts` |
| Affected surface or contract | Qualified guest fields; contact-correction lifecycle; addressing amendment |
| Reason for deferral | The distinction is correct domain behaviour; the observation is that operators must not collapse the two states |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | Clear separation of field conflict from correction lifecycle status in contracts, UI copy and tests |
| Latest safe remediation milestone | EOS-S04A-P01 contracts; proven through P05 / P07 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04-006 — Session-restoration anomaly not reproduced after R3-04

| Field | Value |
|-------|-------|
| ID | `TDR-S04-006` |
| Source slice | EOS-S04 |
| Description | An earlier session-restoration anomaly was not reproduced after R3-04; hosted revocation tests passed. |
| Classification | Inherited observation |
| Severity | LOW |
| Evidence | `docs/control/EOS_S04_ACCEPTANCE.md` retained observations; remediation `9c5c2fdbaad115b7e90767734808f3ef22593bfe`; Event OS staff-session tests |
| Affected surface or contract | Staff session issue, revoke and restoration |
| Reason for deferral | Not reproduced; hosted revocation passed; residual watch item only |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A implementation |
| Required regression coverage | Session revocation and restoration behaviour remains covered; no silent session resurrection |
| Latest safe remediation milestone | EOS-S04A-P09 regression; do not weaken R3-04 tests |
| Current status | OPEN |
| Resolution evidence | |

---

## P00 related observations

These are new non-blocking related observations found during EOS-S04A-P00 reconnaissance. They do not interrupt the slice.

### TDR-S04A-001 — Guest Concierge and Gate/Security are role intents, not system roles

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-001` |
| Source slice | EOS-S04A-P00 |
| Description | The ratified pack lists Guest Concierge and Gate/Security role intent. Current `SYSTEM_ROLE_KEYS` are CEO, EVENT_DIRECTOR, CLIENT_LEAD, DEPARTMENT_LEAD, PLANNER, SYSTEM_ADMINISTRATOR, READ_ONLY_AUDITOR. Inventing new system roles would expand assignment, fixture and admin surfaces beyond S04A. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | `packages/shared-platform/src/constants.ts` `SYSTEM_ROLE_KEYS`; slice pack §9.1 |
| Affected surface or contract | Permission catalogue and role grants |
| Reason for deferral | Safe mapping: Planner receives routine capture; Event Director receives protocol confirmation and exception review; Gate/Security remains no-mutation; no new role key |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P01 / P04 |
| Required regression coverage | Permission matrix tests for existing roles only; no Gate/Security mutation path |
| Latest safe remediation milestone | EOS-S04A-P04 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04A-002 — Programme catalog has no EOS-S04A slice identifier

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-002` |
| Source slice | EOS-S04A-P00 |
| Description | `programme/slices/catalog.json` has EOS-S01–S04 and EOS-S05. EOS-S04A is not a catalogue slice. Adding it would change programme validation and accepted-count law. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | `programme/slices/catalog.json`; `docs/control/PROGRAMME_ROADMAP.md` |
| Affected surface or contract | Programme DAG / Control Tower portfolio |
| Reason for deferral | Pack defers programme-manifest updates until after reconciliation; P10 is the authorised documentation prompt |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P10 |
| Required regression coverage | Do not start EOS-S05; do not invent catalogue acceptance |
| Latest safe remediation milestone | EOS-S04A-P10 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04A-003 — CURRENT_STATE still records S04A as unauthorised

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-003` |
| Source slice | EOS-S04A-P00 |
| Description | `docs/control/CURRENT_STATE.md` still states that implementation of EOS-S04A–F is not authorised. That text predates this CEO implementation authority for S04A only. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | `docs/control/CURRENT_STATE.md` at HEAD `19973f1a0f1f399c74dec5f47b110f896aab785a` |
| Affected surface or contract | Control documentation |
| Reason for deferral | Documentary lag; not a repository/HEAD mismatch. Update is authorised at P10, not as a silent status rewrite in P00. |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P10 |
| Required regression coverage | P10 updates current-state without marking the slice ACCEPTED |
| Latest safe remediation milestone | EOS-S04A-P10 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04A-004 — Existing household is a grouping key, not a party or identity

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-004` |
| Source slice | EOS-S04A-P00 |
| Description | EOS-S02 `GuestHousehold` plus `OperationalGuest.householdId` is an explicit event-scoped grouping key. It is not relationship provenance, party membership, invitation or RSVP truth. S04A must add `GuestParty` / membership without collapsing or inferring households from surname, email, phone or address. |
| Classification | Related observation |
| Severity | MEDIUM |
| Evidence | `packages/shared-platform/src/guest-schemas.ts`; `upsertHousehold` in `guest-operations.ts`; EOS-S03 household-respondent entitlement |
| Affected surface or contract | Guest household, party, relationship and RSVP entitlement |
| Reason for deferral | Compatibility design, not a defect. Backfill may create HOUSEHOLD parties only from existing dedicated `householdId` / `guestHouseholds` records. |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P01 / P02 |
| Required regression coverage | Migration does not invent parties from shared contact data; S03 household respondent rules remain |
| Latest safe remediation milestone | EOS-S04A-P02 |
| Current status | IN_COVERAGE |
| Resolution evidence | |

### TDR-S04A-005 — RSVP companion names are free-text, not guests

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-005` |
| Source slice | EOS-S04A-P00 |
| Description | EOS-S03 stores `companionNames` / `companionCount` on RSVP answers. Those strings are not `guestId`s. S04A nomination/materialisation must create or resolve exactly one guest and must not silently duplicate people from free-text names. |
| Classification | Related observation |
| Severity | HIGH |
| Evidence | `RsvpAnswersSchema` in `packages/shared-platform/src/rsvp-schemas.ts`; `companionAllowance` in `rsvp-operations.ts` |
| Affected surface or contract | Companion entitlement, nomination, people counts |
| Reason for deferral | Design constraint for P01–P03; not an existing corruption. Entitlement quantity remains EOS-S03-owned. |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P01 / P03 / P05 |
| Required regression coverage | Unnamed allowance has entitlementId only; materialisation is exactly-once; no people-count inflation |
| Latest safe remediation milestone | EOS-S04A-P05 |
| Current status | CLOSED |
| Resolution evidence | `reconcileCompanionNames` persists free-text `companionNames` as `addressingReconciliationItems` only. `nominateCompanion` materialises exactly one guest under optimistic versioning and idempotency. Unnamed AVAILABLE entitlements carry no `nominatedGuestId`. Tests in `packages/shared-platform/test/addressing-services.test.ts`. |

### TDR-S04A-006 — Communications salutation uses `guest.name` without formal addressing

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-006` |
| Source slice | EOS-S04A-P00 |
| Description | EOS-S04 templates allow `guest.name` and compose it from preferred / given / family name. There is no `preferredFormalSalutation`, no safe no-title fallback contract, and no title field. |
| Classification | Related observation |
| Severity | MEDIUM |
| Evidence | `ALLOWED_TEMPLATE_VARIABLES` and variable fill in `packages/shared-platform/src/communications-operations.ts` |
| Affected surface or contract | Communications templates and guest addressing |
| Reason for deferral | S04A must extend safe addressing without forking communications ownership; implementation belongs in later backend/UI prompts |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P03 / P07 |
| Required regression coverage | Confirmed formal salutation used when present; otherwise safe fallback; never a guessed honorific |
| Latest safe remediation milestone | EOS-S04A-P07 |
| Current status | CLOSED |
| Resolution evidence | `templateVariablesFor` fills `guest.name` from `renderGuestSalutation`. Confirmed preferred formal salutation is used when present; otherwise a safe fallback. Honorifics are never inferred. `guestVisibleName` uses explicit preferred display name when present. |

### TDR-S04A-007 — Collection-clearing S04A rollback is unsafe

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-007` |
| Source slice | EOS-S04A-P02 / Milestone 1 review |
| Description | P02 `rollbackEosS04A` cleared all nine S04A collections. That can delete pre-existing and legitimate post-migration records and is not reversible in the sense previously claimed. |
| Classification | In-slice debt |
| Severity | CRITICAL |
| Evidence | Independent Milestone 1 review of `69a6897486101adaf34d9966b2417c47ca5ddd90`; `packages/shared-platform/src/addressing-migration.ts` as shipped in P02 |
| Affected surface or contract | S04A migration rollback |
| Reason for deferral | Not deferred. Blocking Milestone 1 remediation. |
| Blocking | BLOCKING |
| Current owner | EOS-S04A Milestone 1 remediation |
| Required regression coverage | Migrate-then-rollback restores legacy business data; rollback preserves pre-existing and later legitimate S04A records; modified or dependent created records refuse without partial deletion; collections are never wiped wholesale |
| Latest safe remediation milestone | EOS-S04A Milestone 1 remediation |
| Current status | CLOSED |
| Resolution evidence | Typed `s04aMigrationReceipts` journal and scoped rollback in `e1a610b09b4d5f5cc3c3e60845444fae55d9bb85`. Tests in `packages/shared-platform/test/addressing-persistence.test.ts`. |

### TDR-S04A-008 — S04A collections accepted invalid persisted JSON

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-008` |
| Source slice | EOS-S04A-P02 / Milestone 1 review |
| Description | Memory and Postgres stores rehydrated the nine new S04A collections as raw JSON without applying the shared runtime schemas. Invalid enums, missing event scope, bad versions and prohibited identity fields could enter canonical state. |
| Classification | In-slice debt |
| Severity | CRITICAL |
| Evidence | Independent Milestone 1 review of `69a6897486101adaf34d9966b2417c47ca5ddd90`; `MemoryPlatformStore.replace` and `PostgresPlatformStore.hydrate` as shipped in P02 |
| Affected surface or contract | S04A persist/hydrate boundary |
| Reason for deferral | Not deferred. Blocking Milestone 1 remediation. |
| Blocking | BLOCKING |
| Current owner | EOS-S04A Milestone 1 remediation |
| Required regression coverage | Valid S04A records round-trip; invalid enum, missing eventId, bad schemaVersion, bad version, malformed membership, unnamed nominatedGuestId, materialised nomination without guestId, and extra identity fields fail with `VALIDATION_FAILED` and no partial snapshot |
| Latest safe remediation milestone | EOS-S04A Milestone 1 remediation |
| Current status | CLOSED |
| Resolution evidence | `validateS04APersistedCollections` at memory replace and Postgres replace/hydrate in `e1a610b09b4d5f5cc3c3e60845444fae55d9bb85`. Unknown fields are rejected. |

### TDR-S04A-009 — Server-side S04A permission and projection enforcement is not yet implemented

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-009` |
| Source slice | EOS-S04A Milestone 1 remediation |
| Description | Catalogue grants and denials for EOS-S04A are contract-only. `PlatformService` does not yet enforce S04A permissions or minimum-necessary child/protocol projections. Planner `guest.entitlement.manage` must never authorise entitlement expansion; P03/P04 must enforce EOS-S03 quantity authority server-side. |
| Classification | Related observation |
| Severity | HIGH |
| Evidence | `packages/shared-platform/src/catalog.ts` role matrix; no S04A service mutations exist yet |
| Affected surface or contract | Future S04A services, projections and UI |
| Reason for deferral | No live S04A service path exists. Enforcement belongs in P03/P04/P06, not as a silent catalogue claim of runtime control. |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P03 / P04 / P06 |
| Required regression coverage | Server-side grant and denial tests; auditor child access is a minimum-necessary projection only; entitlement expansion is rejected even when the catalogue grant is present |
| Latest safe remediation milestone | EOS-S04A-P06 |
| Current status | CLOSED |
| Resolution evidence | `PlatformService` enforces S04A permissions on every mutation and workspace query. `getGuest` / `listGuests` project child and protocol fields. Planner confirmation and exception review are denied with audit. Entitlement expansion beyond S03 allowance is rejected even with `guest.entitlement.manage`. Auditor child access is a minimum-necessary projection. |

### TDR-S04A-010 — Embedded OperationalGuest S04A fields were not validated at persist/hydrate

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-010` |
| Source slice | EOS-S04A Milestone 1 review / M1R4 |
| Description | TDR-S04A-008 closed validation of the nine new collections. `OperationalGuest.addressing`, `ageBand` and `childReadiness` could still be persisted or rehydrated as arbitrary JSON. This is blocking P02 persistence remediation, not deferred P03 work. |
| Classification | In-slice debt |
| Severity | CRITICAL |
| Evidence | Independent Milestone 1 residual-risk note after `336a5f4fc33bf9138cabd11a25df76e716b1fff4`; `validateS04APersistedCollections` before M1R4 |
| Affected surface or contract | `operationalGuests` persist/hydrate boundary |
| Reason for deferral | Not deferred. Blocking Milestone 1 persistence remediation. |
| Blocking | BLOCKING |
| Current owner | EOS-S04A Milestone 1 remediation |
| Required regression coverage | Legacy guests without the three fields load; valid Yorùbá addressing round-trips; unsourced title, invalid enum, invalid ageBand, invalid childReadiness and unknown addressing fields fail with path/code only and no partial snapshot |
| Latest safe remediation milestone | EOS-S04A Milestone 1 remediation |
| Current status | CLOSED |
| Resolution evidence | Shared `GuestAddressingSchema` / `AgeBandSchema` / `ChildReadinessSchema` applied to present guest extensions in `validateS04APersistedCollections`. Tests in `packages/shared-platform/test/addressing-persistence.test.ts`. |

---

## Closed items

- `TDR-S04A-007` — unsafe collection-clearing rollback. Closed by Milestone 1 scoped-receipt rollback.
- `TDR-S04A-008` — invalid S04A persistence. Closed by Milestone 1 persist/hydrate schema validation.
- `TDR-S04A-005` — S03 companion names reconciled without fabricating guests. Closed by P03/P05 nomination and reconciliation services.
- `TDR-S04A-006` — communications salutation now uses safe structured addressing. Closed by P07.
- `TDR-S04A-009` — server-side S04A permission and projection enforcement. Closed by P03/P04/P06.
- `TDR-S04A-010` — unvalidated `OperationalGuest` S04A extensions. Closed by Milestone 1 guest persist/hydrate validation.

EOS-S04 remains CLOSED / ACCEPTED and is not reopened.

## Change log

| When | Change |
|------|--------|
| EOS-S04A-P00 | Register established. Entered TDR-S04-001–006 and TDR-S04A-001–006. EOS-S04 not reopened. |
| EOS-S04A-P02 | TDR-S04-003 and TDR-S04A-004 moved to IN_COVERAGE after Yorùbá fixtures and dedicated-household backfill. |
| EOS-S04A Milestone 1 remediation | Entered blocking TDR-S04A-007 and TDR-S04A-008 from independent review and closed them after scoped rollback and persist validation. Entered TDR-S04A-009 for server-side permission and projection enforcement (P03/P04/P06). TDR-S04A-005 retained for P03/P05 companion materialisation. EOS-S04 not reopened. |
| EOS-S04A Milestone 1 M1R4 | Entered blocking TDR-S04A-010 for unvalidated guest addressing/ageBand/childReadiness and closed it after persist/hydrate validation. Not deferred to P03. |
| Local / GitHub parity policy | Recorded `docs/control/LOCAL_GITHUB_PARITY_POLICY.md`. A later authorised push is durability only. It does not accept EOS-S04A, pass Milestone 1, or authorise P03, deployment or production. |
| EOS-S04A-P03–P07 | Closed TDR-S04A-005, TDR-S04A-006 and TDR-S04A-009 after guest services, server-side permission/projection enforcement, companion-name reconciliation and safe communications salutation. EOS-S04 not reopened. EOS-S04A remains not accepted. |
