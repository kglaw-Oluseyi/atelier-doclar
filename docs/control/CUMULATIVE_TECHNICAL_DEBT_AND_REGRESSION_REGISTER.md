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
| Current status | CLOSED |
| Resolution evidence | P08/P09 Playwright at 360×800 on intake, directory and dossier. Directory transforms to labelled cards. Primary actions remain reachable. Artifacts: `e2e/s04a-hardening.spec.ts`, `e2e/evidence/artifacts/p09-mobile-360-directory.png`, `p09-mobile-360-long-yoruba.png`. |

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
| Current status | CLOSED |
| Resolution evidence | Guest names use `overflow-wrap: break-word; word-break: normal`. 640px layout (200% of 1280) and 360px cards keep long Yorùbá names intact. Tests: `e2e/s04a-hardening.spec.ts`, `test/operational-state.test.ts` directory names. |

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
| Current status | CLOSED |
| Resolution evidence | Fixtures and P09 journey persist Ẹ̀bùnolúwa, Olúfẹ́mi, Ọmọ́tọ́lá, Fọláṣadé with diacritics through intake, directory, dossier and companion materialisation. Artifacts `p09-desktop-titled-adult.png`, `p09-directory-formal-familiar.png`. |

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
| Current status | IN_COVERAGE |
| Resolution evidence | P09 keeps staff-session tests and adds session-expired / assignment-revoked operational states. The original R3-04 anomaly was not reproduced. Watch item remains; tests were not weakened. |

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
| Current status | CLOSED |
| Resolution evidence | P10 records ACA-S04A as a training delta only. `programme/slices/catalog.json` still has no EOS-S04A accepted-slice id. Operator handbook states the omission is intentional. Catalogue acceptance was not invented. |

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
| Current status | CLOSED |
| Resolution evidence | P10 updated `docs/control/CURRENT_STATE.md`: EOS-S04A is implemented / IN_REVIEW and not ACCEPTED. S04B–F remain unstarted. |

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

## Open pre-client blockers

### TDR-S04A-011 — Synthetic cleanup cannot attribute browser-created operational residue

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-011` |
| Source slice | Event OS Postgres concurrency and cleanup hardening |
| Description | Cleanup selects only documents with top-level `nonProductionFixture: true`. Original seed orgs, clients, events, persons, memberships, assignments, MEF and S04A fixture guests are marked. Staff sessions and RSVP guest sessions now inherit that mark from a fixture parent. Browser-created operational guests, companion nominations, unmarked sessions already issued, and all audit/idempotency rows remain unmarked or intentionally excluded. A preview that removes only seed fixtures is not a complete pre-client wipe. |
| Classification | In-slice debt |
| Severity | HIGH |
| Evidence | `classifySyntheticCleanupAttribution`; `packages/shared-platform/test/guest-security.test.ts` (intake guests unmarked); cleanup preview counts |
| Affected surface or contract | `previewSyntheticCleanup` / `applySyntheticCleanup` / Event OS `seed:cleanup` |
| Reason for deferral | Broadening deletion by heuristic (any record under a fixture org, any recent browser session, any guest without a client code) would risk removing the wrong rows. A lineage or scope design is required. |
| Blocking | `BLOCKING` for real client onboarding; `NON_BLOCKING` for successor development and ordinary authorised Event OS work |
| Current owner | Pre-client data classification |
| Required regression coverage | Attribution report distinguishes safely included, intentionally preserved, and not currently attributable counts; no heuristic delete; leftover browser-created guests still visible after seed-fixture cleanup |
| Latest safe remediation milestone | Pre-client onboarding — close before any real client data enters Event OS |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04A-012 — RSC prefetch 503 is not isolated

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-012` |
| Source slice | EOS-S04A-P08 / P09 |
| Description | Authenticated `?_rsc=` prefetch of `/app`, clients, events, my-work, admin and guest directory returned 503 when root-layout `ensureRuntime()` threw during boot. Layout now swallows boot unreadiness so prefetch is not an unexplained 503; boot failure is a controlled `DEPENDENCY_UNAVAILABLE` on `/access-denied`. Planner audit prefetch is a controlled `FORBIDDEN`, not an uncaught throw. Local CEO/Planner/Auditor prefetch is not 503. Close only after a clean deployed reproduction. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | Event OS `ensureRuntime` / `/api/health/ready`; no failing P08/P09 case isolated to RSC prefetch |
| Affected surface or contract | Next.js App Router prefetch against Event OS |
| Reason for deferral | Not a false-success or data-integrity defect; pages fail closed after navigation |
| Blocking | NON_BLOCKING |
| Current owner | Event OS runtime hardening |
| Required regression coverage | Prefetch of guest routes while runtime is down must not leak secrets or show another event's data |
| Latest safe remediation milestone | Later Event OS runtime prompt |
| Current status | RECLASSIFIED — tool/client artefact; not an origin 503 |
| Resolution evidence | Railway HTTP logs for previous Event OS deploy `8bb4dfaa` from `2026-09-07T00:30Z` covering Claude’s verification window: 280×200, 17×303, 3×499, **0×503**. Prefetch burst at `00:38:27` and `00:40:26` returned origin 200 for `/app`, clients, events, my-work, academy, access, system, audit and the guest directory. The three 499s at `00:53:08` on `/app/my-work`, `/app/clients` and `/app/admin/system` are `client has closed the request before the server could send a response` — aborted/superseded navigation, not an application 503. Current deploy `750a558b` / SHA `5c01d18` smoke: unauthenticated `?_rsc=1` 307; CEO/Planner/Auditor `/app`, access and system 200; Planner forged assignment 403; no origin 503. Chrome-monitor 503s are not to be treated as Event OS origin defects. |

### TDR-S04A-016 — Stale two-tab amendment was silent in the UI

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-016` |
| Source slice | EOS-S04A final-acceptance / Claude whole-slice verification |
| Description | Two tabs opened guest version 3. Tab A saved version 4. Tab B submitted stale version 3. Durable truth stayed correct. Tab B displayed neither success nor error. |
| Classification | Blocking acceptance defect |
| Severity | MAJOR |
| Evidence | Claude whole-slice verification; `amendGuestAction` used droppable `?error=`; Next.js same-page server-action redirects can drop query params. |
| Affected surface or contract | Guest amendment form, addressing and other S04A mutations, Command Atelier operational state |
| Reason for deferral | Not deferred. Implemented in the final-acceptance remediation. Remains blocking until deployed two-tab evidence exists. |
| Blocking | CLOSED — no longer blocking; EOS-S04A accepted |
| Current owner | EOS-S04A final-acceptance remediation |
| Required regression coverage | Stale different-value submit shows conflict alert, no success, rejected values not persisted, reload required, retry locked; API PATCH returns 409 `VERSION_CONFLICT` |
| Latest safe remediation milestone | This remediation + deployed focused verification |
| Current status | CLOSED |
| Resolution evidence | Claude-in-Chrome final focused verification on 2026-09-07 against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`: first and repeated conflict recovery PASS; conflict accessibility and keyboard recovery PASS. Durable truth stayed correct; the stale tab now surfaces the conflict. |

### TDR-S04A-017 — Identical double-submit left a false field conflict

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-017` |
| Source slice | EOS-S04A final-acceptance / Claude whole-slice verification |
| Description | Rapid double-click of Save Amendment produced one version increment, left the field `CONFLICTING`, and did not raise the guest-level attention indicator. |
| Classification | Blocking acceptance defect |
| Severity | MAJOR |
| Evidence | Claude whole-slice verification; second identical submit raced `VERSION_CONFLICT`; attention projection omitted preferredName, dietary, accessibility and operationalNote. |
| Affected surface or contract | Guest amend and other S04A high-risk mutations; directory/dossier attention |
| Reason for deferral | Not deferred. Implemented in the final-acceptance remediation. Remains blocking until deployed double-submit evidence exists. |
| Blocking | CLOSED — no longer blocking; EOS-S04A accepted |
| Current owner | EOS-S04A final-acceptance remediation |
| Required regression coverage | Identical replay is already-applied; one version; no false `CONFLICTING`; no duplicate audit/idempotency; genuine different concurrent values still conflict and raise attention |
| Latest safe remediation milestone | This remediation + deployed focused verification |
| Current status | CLOSED |
| Resolution evidence | Claude-in-Chrome final focused verification on 2026-09-07 against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`: rapid duplicate-submit idempotency PASS. |

### TDR-S04A-018 — RETAIN recomposed the formal salutation from the new title

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-018` |
| Source slice | EOS-S04A final focused acceptance remediation II / Claude |
| Description | Guest `6d16f61c-2eaf-4f17-acfd-7896e183848a` version 6: operator submitted `Dr Adérónkẹ́ Concurrency-Test-Q7F3`, chose RETAIN while changing title to `Mr`. Durable `preferredFormalSalutation` stayed `Dr …`. Formal preview showed `Mr Adérónkẹ́ Concurrency-Test-Q7F3`. Audit `2026-09-07T00:39:25.865Z` recorded RETAINED. The append-only audit is preserved. |
| Classification | Blocking acceptance defect |
| Severity | MAJOR |
| Evidence | Claude focused verification; `renderGuestSalutation` used authored preferred formal only when addressing was confirmed; unverified records recomposed from honorific + names. |
| Affected surface or contract | Formal salutation projection, addressing workspace, communications salutation, RETAIN/UPDATE governance |
| Reason for deferral | Not deferred. Implemented in final focused remediation II. Remains blocking until deployed RETAIN/UPDATE evidence exists. |
| Blocking | CLOSED — no longer blocking; EOS-S04A accepted |
| Current owner | EOS-S04A final focused remediation II |
| Required regression coverage | Professor→Dr UPDATED; Dr→Mr RETAINED; Unicode/diacritic and whitespace/punctuation preservation; no-decision refusal; blank title; concurrent title/salutation conflict; API/server-action parity; audit/result agreement; invariant rollback |
| Latest safe remediation milestone | This remediation + deployed focused verification |
| Current status | CLOSED |
| Resolution evidence | Claude-in-Chrome final focused verification on 2026-09-07 against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`: exact RETAIN salutation preservation PASS; exact UPDATE authored salutation PASS; audit/value agreement PASS. Historical append-only audit `2026-09-07T00:39:25.865Z` was not rewritten. |

### TDR-S04A-019 — Conflict recovery left forms locked until a full browser reload

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-019` |
| Source slice | EOS-S04A final focused acceptance remediation II / Claude |
| Description | After a visible conflict, one activation of Reload the current record loaded fresh data but left the stale conflict banner and every mutation form locked (`Reload before retrying`). Only a full browser reload cleared the state. |
| Classification | Blocking acceptance defect |
| Severity | MAJOR |
| Evidence | Claude focused verification; recovery redirected to the same canonical URL so stale `?state=VERSION_CONFLICT` could survive; flash was not guest-scoped; recovered state was not distinguished from a later live conflict. |
| Affected surface or contract | Guest dossier recovery action, conflict banner, mutation form lock |
| Reason for deferral | Not deferred. Implemented in final focused remediation II. Remains blocking until deployed one-click recovery evidence exists. |
| Blocking | CLOSED — no longer blocking; EOS-S04A accepted |
| Current owner | EOS-S04A final focused remediation II |
| Required regression coverage | Conflict→reload unlock; repeat conflict→reload unlock; direct refresh; back/forward; distinct flash across guests/tabs; expired session; keyboard-only; mobile/narrow |
| Latest safe remediation milestone | This remediation + deployed focused verification |
| Current status | CLOSED |
| Resolution evidence | Claude-in-Chrome final focused verification on 2026-09-07 against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`: first and repeated conflict recovery PASS; conflict accessibility and keyboard recovery PASS. |

### TDR-S04A-020 — Access Administration grant form exposed to Planner and Auditor

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-020` |
| Source slice | EOS-S04A final focused acceptance remediation II / Claude |
| Description | `/app/admin/access` rendered an enabled organisation-wide Grant assignment form for Planner and Read-Only Auditor. Claude did not submit the form. Canonical grant permission is `assignment.manage`; both roles have only `assignment.view`. |
| Classification | Blocking acceptance defect |
| Severity | MAJOR |
| Evidence | Claude focused verification; access page used `listPersons` (`assignment.view`) as the form gate. |
| Affected surface or contract | Access administration route, grant assignment server action and API, person/role/event catalogue |
| Reason for deferral | Not deferred. Implemented in final focused remediation II. Remains blocking until deployed Planner/Auditor denial evidence exists. |
| Blocking | CLOSED — no longer blocking; EOS-S04A accepted |
| Current owner | EOS-S04A final focused remediation II |
| Required regression coverage | Route loader denies unauthorised actors before any catalogue; mutation independently authorises; forged POST fails; Planner/Auditor cannot grant or self-escalate; CEO and Event Director follow `assignment.manage`; System Administrator gains no extra business authority; denial audited without leaking the attempted assignment |
| Latest safe remediation milestone | This remediation + deployed focused verification |
| Current status | CLOSED |
| Resolution evidence | Claude-in-Chrome final focused verification on 2026-09-07 against SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`: Planner and Auditor access-administration denial PASS; CEO access-administration authority PASS. Denial authority and absence of protected content were verified. |

### TDR-S04A-013 — Auditor-visible out-of-scope mutation controls

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-013` |
| Source slice | EOS-S04A-P08 / P09 |
| Description | Auditor P08/P09 checks hide intake, addressing save, party create and companion materialise. Server mutations remain denied. Residual risk is any non-S04A control that still renders for Auditor on adjacent modules. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | `e2e/s04a-hardening.spec.ts` auditor assertions; service denial tests |
| Affected surface or contract | Auditor UI visibility vs server enforcement |
| Reason for deferral | S04A primary mutations are hidden and server-denied. Adjacent-module audit is outside this slice. |
| Blocking | NON_BLOCKING |
| Current owner | Later UI hardening |
| Required regression coverage | Auditor cannot submit S04A mutations via UI or forged POST |
| Latest safe remediation milestone | Later authorised frontend prompt |
| Current status | IN_COVERAGE |
| Resolution evidence | Planner/Auditor S04A mutation controls are absent on the guest dossier; server still refuses. |

### TDR-S04A-014 — Deployed SHA observability

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-014` |
| Source slice | EOS-S04A-P09 |
| Description | Operators needed a non-secret deployed SHA on health and system surfaces to verify Railway parity. |
| Classification | In-slice debt |
| Severity | LOW |
| Evidence | `/api/health/live`, `/api/health/ready`, `/app/admin/system` now expose `deployedSha` from `RAILWAY_GIT_COMMIT_SHA` or `EVENT_OS_GIT_SHA` |
| Affected surface or contract | Event OS readiness and system health |
| Reason for deferral | Not deferred. Closed in P09. |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04A-P09 |
| Required regression coverage | Ready payload includes `deployedSha`; system page shows it |
| Latest safe remediation milestone | EOS-S04A-P09 |
| Current status | CLOSED |
| Resolution evidence | `deployedSha()` on live/ready and the system ledger. |

### TDR-S04A-015 — Incomplete earlier offline testing

| Field | Value |
|-------|-------|
| ID | `TDR-S04A-015` |
| Source slice | EOS-S04A-P08 / P09 |
| Description | Offline / disconnected-client behaviour was not re-run as a dedicated matrix. Postgres-unavailable and readiness states are simulated and classified, but a true offline browser run was not executed here. |
| Classification | Related observation |
| Severity | LOW |
| Evidence | Operational states `DEPENDENCY_UNAVAILABLE` and `CAPABILITY_NOT_ENABLED`; artifact `p09-server-failure.png` |
| Affected surface or contract | Guest pages when the network or store is down |
| Reason for deferral | Simulated failure is covered; a physical offline pass is not required to close P09 |
| Blocking | NON_BLOCKING |
| Current owner | Later hosted verification |
| Required regression coverage | Offline or 503 store failure shows the operational state and does not false-succeed |
| Latest safe remediation milestone | Hosted verification |
| Current status | OPEN |
| Resolution evidence | |

---

## EOS-S04B first-vertical debt

### TDR-S04B-001 — Pack protocol/security/transport/gate roles are not system roles

| Field | Value |
|-------|-------|
| ID | `TDR-S04B-001` |
| Source slice | EOS-S04B |
| Description | The S04B pack names Protocol, Security, Transport and Gate roles. The first vertical maps onto current canonical system roles only. Missing roles fail closed. Gate runtime admission remains Slice 8. |
| Classification | In-slice debt |
| Severity | MEDIUM |
| Evidence | `docs/control/EOS_S04B_RATIFICATION.md`; `packages/shared-platform/src/catalog.ts` |
| Affected surface or contract | Role matrix vs pack named roles |
| Reason for deferral | Inventing system roles would expand authority beyond the current permission model |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04B later prompts / Slice 8 |
| Required regression coverage | Unmapped pack roles continue to fail closed; Planner cannot publish or grant protected access |
| Latest safe remediation milestone | EOS-S04B whole-slice review or Slice 8 |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04B-002 — Offline HMAC uses a non-production key

| Field | Value |
|-------|-------|
| ID | `TDR-S04B-002` |
| Source slice | EOS-S04B |
| Description | Signed offline packages use `s04b-offline-hmac-non-production-v1` / `s04b-offline-v1`. No new Railway secret was introduced. |
| Classification | In-slice debt |
| Severity | HIGH |
| Evidence | `packages/shared-platform/src/constants.ts` `S04B_NON_PRODUCTION_HMAC_KEY` |
| Affected surface or contract | Offline access package authenticity |
| Reason for deferral | Synthetic-only; productionAuthorised remains false; live events are not authorised |
| Blocking | BLOCKING before real event operations |
| Current owner | Production credential owner (George Lawson) before live use |
| Required regression coverage | Production key rotation fails closed on stale keyRef; consume verifies HMAC |
| Latest safe remediation milestone | Protected production gate / live-event approval |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04B-003 — Auditor can consume an offline projection

| Field | Value |
|-------|-------|
| ID | `TDR-S04B-003` |
| Source slice | EOS-S04B |
| Description | `consumeOfflineAccessPackage` is authorised with `programme.view`, so a read-only auditor can mark a projection consumed. Consume does not write attendance or entitlements. |
| Classification | In-slice debt |
| Severity | LOW |
| Evidence | `packages/shared-platform/src/service.ts` `consumeOfflineAccessPackage` |
| Affected surface or contract | Command-handoff consume control |
| Reason for deferral | Consume is not an attendance write; publish remains Director/CEO |
| Blocking | NON_BLOCKING |
| Current owner | EOS-S04B later prompts |
| Required regression coverage | Auditor still cannot publish, add phases or grant protected access |
| Latest safe remediation milestone | EOS-S04B whole-slice review |
| Current status | OPEN |
| Resolution evidence | |

### TDR-S04B-004 — Pack days/zones/exception-review UI is incomplete

| Field | Value |
|-------|-------|
| ID | `TDR-S04B-004` |
| Source slice | EOS-S04B |
| Description | Persistence includes programme days, access zones and access exceptions, but the first vertical UI is phase/route/checkpoint/vehicle/handoff. Exception review is Director/CEO server-side only. |
| Classification | In-slice debt |
| Severity | MEDIUM |
| Evidence | `apps/event-os/src/components/programme-workspace.tsx`; `packages/shared-platform/src/programme-schemas.ts` |
| Affected surface or contract | Multi-day grouping, zone assignment, exception workspace |
| Reason for deferral | First complete vertical authorised; remaining pack prompts are not this milestone |
| Blocking | NON_BLOCKING. Accepted as known first-vertical debt; does not reopen EOS-S04B. |
| Current owner | Later Event OS / successor prompts if required |
| Required regression coverage | Days, zones and restricted exception rationale stay event-scoped and projection-controlled |
| Latest safe remediation milestone | Successor work if separately authorised; not an S04B reopening |
| Current status | OPEN — carried forward |
| Resolution evidence | EOS-S04B accepted 2026-09-07 on the authorised first vertical; remaining pack UI was outside that milestone |

### TDR-S04C-001 — Staff item-and-offer creation journey incomplete

| Field | Value |
|-------|-------|
| ID | `TDR-S04C-001` |
| Source slice | EOS-S04C |
| Description | Claude confirmed the staff merchandise workspace could persist a collection but could not complete item creation, phase applicability, named/cohort targeting with preview, offer issue/amend/withdraw, or empty-collection next actions. This blocked EOS-S04C acceptance. |
| Classification | Blocking acceptance defect |
| Severity | BLOCKER |
| Evidence | Claude whole-slice verification; pre-remediation merchandise workspace |
| Affected surface or contract | Staff merchandise studio |
| Reason for deferral | None. Remediated in the primary-journey batch. |
| Blocking | BLOCKING until focused Claude re-verification of the repaired staff journey |
| Current owner | EOS-S04C focused re-verification |
| Required regression coverage | Create collection → item → preview → issue offer without seeded fixtures; empty collection is not a dead end |
| Latest safe remediation milestone | EOS-S04C primary-journey remediation |
| Current status | REMEDIATED / AWAITING_FOCUSED_REVERIFICATION |
| Resolution evidence | `docs/control/EOS_S04C_PRIMARY_JOURNEY_REMEDIATION.md` |

### TDR-S04C-002 — Merchandise guest access required RSVP invitation

| Field | Value |
|-------|-------|
| ID | `TDR-S04C-002` |
| Source slice | EOS-S04C |
| Description | Claude confirmed private merchandise guest access could only be established by issuing an S03 RSVP invitation. That is a blocking acceptance defect, not a verification inconvenience. |
| Classification | Blocking acceptance defect |
| Severity | BLOCKER |
| Evidence | Claude whole-slice verification; guest merch on `/rsvp` via RSVP capability |
| Affected surface or contract | Merchandise guest grant/session |
| Reason for deferral | None. Remediated in the primary-journey batch. |
| Blocking | BLOCKING until focused Claude re-verification of direct guest-access issuance |
| Current owner | EOS-S04C focused re-verification |
| Required regression coverage | Issue/renew/revoke from merchandise workspace; `/offers` private view; no invitation/RSVP write |
| Latest safe remediation milestone | EOS-S04C primary-journey remediation |
| Current status | REMEDIATED / AWAITING_FOCUSED_REVERIFICATION |
| Resolution evidence | `docs/control/EOS_S04C_PRIMARY_JOURNEY_REMEDIATION.md` |

### TDR-S04C-003 — Vendor access was a dead fixture link

| Field | Value |
|-------|-------|
| ID | `TDR-S04C-003` |
| Source slice | EOS-S04C |
| Description | Claude confirmed vendor portal handoff presented a fixture token as ready instead of an authorised assignment/issue/renew/revoke lifecycle with accurate usability states. |
| Classification | Blocking acceptance defect |
| Severity | BLOCKER |
| Evidence | Claude whole-slice verification; fixture vendor token labelled ready in staff UI |
| Affected surface or contract | Vendor assignment and session |
| Reason for deferral | None. Remediated in the primary-journey batch. |
| Blocking | BLOCKING until focused Claude re-verification of vendor issue/revoke |
| Current owner | EOS-S04C focused re-verification |
| Required regression coverage | Issue usable synthetic vendor link; revoke kills an open session; never label ready unless currently usable |
| Latest safe remediation milestone | EOS-S04C primary-journey remediation |
| Current status | REMEDIATED / AWAITING_FOCUSED_REVERIFICATION |
| Resolution evidence | `docs/control/EOS_S04C_PRIMARY_JOURNEY_REMEDIATION.md` |

---

## Closed items

- `TDR-S04A-007` — unsafe collection-clearing rollback. Closed by Milestone 1 scoped-receipt rollback.
- `TDR-S04A-008` — invalid S04A persistence. Closed by Milestone 1 persist/hydrate schema validation.
- `TDR-S04A-005` — S03 companion names reconciled without fabricating guests. Closed by P03/P05 nomination and reconciliation services.
- `TDR-S04A-006` — communications salutation now uses safe structured addressing. Closed by P07.
- `TDR-S04A-009` — server-side S04A permission and projection enforcement. Closed by P03/P04/P06.
- `TDR-S04A-010` — unvalidated `OperationalGuest` S04A extensions. Closed by Milestone 1 guest persist/hydrate validation.
- `TDR-S04-001` — 360px primary-surface evidence. Closed by P08/P09 Playwright and artifacts.
- `TDR-S04-002` — character-by-character wrapping. Closed by word-level name CSS and 640px/360px tests.
- `TDR-S04-003` — Yorùbá diacritics. Closed by fixtures plus P09 intake/directory/companion evidence.
- `TDR-S04A-014` — deployed SHA observability. Closed by health and system surfaces.
- `TDR-S04A-002` — programme catalogue has no EOS-S04A id. Closed by P10 documentation: omission is intentional; catalogue acceptance was not invented.
- `TDR-S04A-003` — CURRENT_STATE S04A authorisation lag. Closed by P10 current-state update (IN_REVIEW, not ACCEPTED). Later 2026-09-07 acceptance is recorded in `docs/control/EOS_S04A_ACCEPTANCE.md` without rewriting that P10 close.
- `TDR-S04A-016` — stale two-tab amendment silence. Closed by final-acceptance remediation plus 2026-09-07 Claude focused evidence.
- `TDR-S04A-017` — identical double-submit false conflict. Closed by final-acceptance remediation plus 2026-09-07 Claude focused evidence.
- `TDR-S04A-018` — RETAIN display corruption. Closed by focused remediation II plus 2026-09-07 Claude focused evidence.
- `TDR-S04A-019` — conflict recovery lock. Closed by focused remediation II plus 2026-09-07 Claude focused evidence.
- `TDR-S04A-020` — Access Administration exposure. Closed by focused remediation II plus 2026-09-07 Claude focused evidence.

EOS-S04 remains CLOSED / ACCEPTED and is not reopened. EOS-S04A is ACCEPTED and is not reopened. EOS-S04B is ACCEPTED and is not reopened.

## Final acceptance observations (2026-09-07)

These do not reopen EOS-S04A and do not create new blocking IDs.

1. Claude could not resize below 1054px in the final focused session. Earlier P08/P09 Playwright evidence already covered 360px, tablet and 200%-equivalent layouts.
2. Admin-denial alert focus semantics were not separately repeated in the final session. Denial authority and absence of protected content were verified.
3. One intake automation attempt did not retain typed names, did not reproduce on two subsequent attempts, and is classified as an unconfirmed automation-timing observation.
4. Claude’s RSC “503” readings were a monitoring artefact, not an application defect (`TDR-S04A-012`).

## Change log

| When | Change |
|------|--------|
| EOS-S04A-P00 | Register established. Entered TDR-S04-001–006 and TDR-S04A-001–006. EOS-S04 not reopened. |
| EOS-S04A-P02 | TDR-S04-003 and TDR-S04A-004 moved to IN_COVERAGE after Yorùbá fixtures and dedicated-household backfill. |
| EOS-S04A Milestone 1 remediation | Entered blocking TDR-S04A-007 and TDR-S04A-008 from independent review and closed them after scoped rollback and persist validation. Entered TDR-S04A-009 for server-side permission and projection enforcement (P03/P04/P06). TDR-S04A-005 retained for P03/P05 companion materialisation. EOS-S04 not reopened. |
| EOS-S04A Milestone 1 M1R4 | Entered blocking TDR-S04A-010 for unvalidated guest addressing/ageBand/childReadiness and closed it after persist/hydrate validation. Not deferred to P03. |
| Local / GitHub parity policy | Recorded `docs/control/LOCAL_GITHUB_PARITY_POLICY.md`. A later authorised push is durability only. It does not accept EOS-S04A, pass Milestone 1, or authorise P03, deployment or production. |
| EOS-S04A-P03–P07 | Closed TDR-S04A-005, TDR-S04A-006 and TDR-S04A-009 after guest services, server-side permission/projection enforcement, companion-name reconciliation and safe communications salutation. EOS-S04 not reopened. EOS-S04A remains not accepted. |
| Event OS Postgres concurrency and cleanup hardening | Entered blocking pre-client TDR-S04A-011: fixture-mark cleanup does not attribute browser-created operational residue. Staff/RSVP sessions now inherit fixture lineage. EOS-S04 not reopened. |
| EOS-S04A-P08–P09 | Closed TDR-S04-001, TDR-S04-002, TDR-S04-003 and TDR-S04A-014 after frontend hardening, integration evidence and deployed-SHA observability. TDR-S04-006 moved to IN_COVERAGE. Entered TDR-S04A-012, TDR-S04A-013 and TDR-S04A-015 as non-blocking carry-forwards. TDR-S04A-011 remains blocking before client onboarding. EOS-S04 not reopened. EOS-S04A remains not accepted. |
| EOS-S04A-P10 | Academy delta ACA-S04A and operator handover. Closed TDR-S04A-002 and TDR-S04A-003. TDR-S04A-011 remains blocking before client onboarding. EOS-S04A remains not accepted. |
| EOS-S04A-P11 | Whole-slice hardening and independent-review package. EOS-S04A set to IN_REVIEW / not ACCEPTED. TDR-S04A-011 remains blocking before client onboarding. EOS-S04B / S04F / S05 not started. |
| EOS-S04A final-acceptance remediation | Entered blocking TDR-S04A-016 and TDR-S04A-017 from Claude’s MAJOR findings. Implemented visible conflict, identical-replay idempotency, derived attention, explicit salutation retain/update, and local RSC-prefetch containment. TDR-S04A-012 moved to IN_COVERAGE pending deployed prefetch classification. EOS-S04A remains IN_REVIEW / not ACCEPTED. |
| EOS-S04A final focused remediation II | Entered blocking TDR-S04A-018, TDR-S04A-019 and TDR-S04A-020 from Claude’s focused findings. Implemented RETAIN exact-value preservation and display, one-click conflict recovery, and `assignment.manage` Access Administration. TDR-S04A-012 reclassified as a tool/client artefact after Railway HTTP-log correlation (0 origin 503; 499 client-abort). TDR-S04A-011 remains blocking before client onboarding. EOS-S04A remains IN_REVIEW / not ACCEPTED. |
| EOS-S04A formal technical acceptance 2026-09-07 | ChatGPT accepted EOS-S04A at SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af` after Claude-in-Chrome focused verification (zero BLOCKER, zero MAJOR). Closed TDR-S04A-016–020. TDR-S04A-011 remains blocking before real client onboarding and is not blocking successor development. TDR-S04A-015, permanent IdP, synthetic-data cleanup, inactive providers and local Next.js E2E memory pressure remain carried forward. EOS-S04A is ACCEPTED. Catalogue accepted-slice count remains 4. Historical closeout text that S04B–F remain unauthorised is superseded for S04B only by MD-PR-S018. |
| EOS-S04B ratification MD-PR-S018 2026-09-07 | George Lawson ratifies the EOS-S04B Cursor prompt pack and authorises implementation. Status RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS. TDR-S04A-011 remains blocking before real client onboarding and is not blocking S04B. EOS-S04C–F and EOS-S05 remain unauthorised. Production remains unauthorised. |
| EOS-S04B first complete vertical 2026-09-07 | Implemented event-scoped phases, arrival routing, checkpoints, credential resolution, vehicles and signed Slice 8 projections. Entered TDR-S04B-001–004. Historical status: IN_PROGRESS / not ACCEPTED. Control Tower not redeployed. EOS-S04C–F and EOS-S05 not started. |
| EOS-S04B accessibility/responsive remediation 2026-09-07 | Functional champagne `#8B6E38` on light surfaces; Playwright 360/768/1440/200% evidence. Historical status: IN_REVIEW. |
| EOS-S04B formal technical acceptance 2026-09-07 | ChatGPT accepted EOS-S04B at SHA `f9f218c9d3e357ba82e6c04e7409138267a94396`. No further S04B verification required. TDR-S04B-001–004 remain carried forward and do not reopen the slice. Catalogue accepted-slice count remains 4. EOS-S04C–F and EOS-S05 remain unauthorised. Production remains unauthorised. |
| EOS-S04C ratification MD-PR-S020 2026-09-07 | George Lawson ratifies the EOS-S04C packs and authorises P00–P11. Status RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS. EOS-S04D–F and EOS-S05 remain unauthorised. Production remains unauthorised. |
| EOS-S04C primary-journey remediation 2026-09-07 | Entered blocking TDR-S04C-001–003 from Claude’s whole-slice findings. Remediated staff creation, merchandise-only guest grants, and vendor assignment/session lifecycle. Status IN_REVIEW / NOT READY. EOS-S04D–F and EOS-S05 not started. |
