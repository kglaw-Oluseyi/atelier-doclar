# EOS-S06 Accepted Contract Map

**Prompt Control ID:** MD-PR-S070 V2  
**Baseline SHA:** `75a894dedb6713ba2f3f4dce29e8372fa4160384`  
**Authority placement SHA:** `a4f04c880bfaddfc20bb72c21dccf663f154b7cf`  
**Application / deployed SHA:** `bc06b9624a0a22ed7e65324dd07ded65a54832cd`  
**Purpose:** Concrete file/type/function anchors for S06 adapters. Names adapt to accepted code; meaning is preserved. This is not acceptance.

Programme proof at ratification: `EOS-S05B` ACCEPTED (`docs/control/EOS_S05B_ACCEPTANCE.md`); catalogue accepted-slice count `5`; `EOS-S06` was `NOT_STARTED / NOT_AUTHORISED` until the V2 overlay was ratified.

## 1. Identity and scope

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Organisation | `packages/shared-platform/src/schemas.ts` `Organisation` / `FIXTURE_IDS.orgMaison` | S06 `organisationId` |
| Event | `EventRecord` / `FIXTURE_IDS.eventAlphaOne` | S06 `eventId` |
| Person | `Person` / `FIXTURE_IDS.person*` | Material author, reviewer, approver, publisher |
| Assignment | `Assignment` / `FIXTURE_IDS.assign*` | `SeatingCommandEnvelope.actorAssignmentId` resolved from session, never trusted from form |
| Actor | `packages/shared-platform/src/service.ts` `ActorContext` | `{ personId, correlationId, now?, actorKind? }` |
| Session | `packages/shared-platform/src/session.ts` `issueSession` / `readSession`; `apps/event-os/src/server/with-session.ts` `requireActor` | Fresh `correlationId` per request |
| Canonical guest | `packages/shared-platform/src/guest-schemas.ts` `OperationalGuest` | S06 `event_guest_id`. Party, household and invitation are context only |
| Party (not identity) | `packages/shared-platform/src/addressing-schemas.ts` `GuestParty` / `GuestPartyMember` | Optional `partyToken` context |
| Household (not identity) | `guest-schemas.ts` `GuestHousehold` | Not a guest ledger |
| Invitation (not identity) | `packages/shared-platform/src/rsvp-schemas.ts` `RsvpInvitation` | Access artefact |
| Forbidden parallel ledgers | `packages/shared-platform/src/constants.ts` `FORBIDDEN_PARALLEL_TRUTH` already lists `GuestPlacement`, `GuestSeatAssignment`, `SeatingSolver` | S06 must not invent a second guest/seat identity store. `SeatingSolverV1` is an in-process engine, not a truth ledger |

## 2. RSVP truth versus forecast

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| RSVP truth | `rsvp-schemas.ts` `RsvpResponse` (`attendanceIntent`, `status`) | Eligibility input. `ATTENDING` is eligible; `NOT_SUPPLIED` / unknown remains non-eligible or indeterminate per policy |
| Forecast (not truth) | `forecast-schemas.ts` `ForecastEstimate`; `forecast-model.ts` `classifyAttendanceIntent` | Must not overwrite RSVP |
| Guest loaders | `packages/shared-platform/src/service.ts` `listGuests` / `getGuest` | `GuestCohortAdapter.loadEligibleEventGuests` |

## 3. Spatial layout (S05)

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Downstream contract | `constants.ts` `LAYOUT_DOWNSTREAM_CONTRACT_ID` = `eos-s05-spatial-publication-v1` | Stored on seating input edition |
| CURRENT publication | `layout-assurance-projections.ts` `buildLayoutDownstreamProjection` — `layoutPublications` where `status === "CURRENT"` | `SeatingUpstreamIdentity.layoutPublicationId` + `layoutContentHash` |
| Published objects | Same file — `layoutRevisions[publication.revisionId].objects` | Tables, zones, optional `physicalSeats` |
| Seat anchors | `spatial-schemas.ts` `SeatSubtypeSchema` `{ tableId, sequence, physicalLabel }` | Use when present; otherwise generate `tableId:ordinal` |
| Capacity | `layout-assurance-capacity.ts` `buildCapacityReport`; `MAX_SEATS_PER_TABLE` | Never exceed table capacity |
| Service read | `PlatformService.getLayoutDownstreamProjection`; HTTP `apps/event-os/src/app/api/events/[eventId]/layouts/[layoutId]/publication/current/route.ts` | `LayoutPublicationAdapter.loadCurrentLayout` |
| Draft objects (not authority) | `spatial-operations.ts` `currentLayoutObjects` | Must not bind seating |
| Forbidden mutations | `applyLayoutCommandOnSnap`, `publishLayoutOnSnap`, `acquireLayoutLeaseOnSnap`, `PlatformService.applyLayoutCommand` / `publishLayout` | Seating must not call these |

## 4. Event Brief (S05A) and Protection (S05B)

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Current brief | `eec-intelligence-schemas.ts` `EventBriefEdition`; `eec-intelligence.ts` requires `status === "PUBLISHED" && current` | Optional `eventBriefEditionId` + `eventBriefContentHash` |
| Protection snapshot | `risk-schemas.ts` `RiskApplicabilitySnapshot.contentHash`; `risk-policy-operations.ts` `evaluateApplicabilityOnSnap`; `risk-projections.ts` `eventProtectionProjection` | Optional `protectionSnapshotHash` |
| Dossier workspace | `risk-dossier-repository.ts` `RiskDossierWorkspace` | Event-scoped protection facts only; not a seating ledger |

## 5. Persistence pattern S06 must follow

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Latest SQL migration | `packages/shared-platform/src/migrations.ts` `006_risk_authority_governance_receipts` | Next additive migration is `007_seating_allocation` |
| Checksum lock | `migrations.ts` `checksumFor` / `runPlatformMigrations` — applied checksums are immutable | Do not edit `001`–`006` |
| Normalized tables (template) | `risk-repository.ts` `RiskProtectionRepository` / `RiskTransaction`; `postgres-risk-store.ts`; `memory-risk-store.ts` | `SeatingRepository.transaction` with one DB transaction per material command |
| No snapshot arrays | `store.ts` `PlatformSnapshot` has no `seating*` keys | Annex A2: no `seating*` arrays inside `PlatformSnapshot` |
| Delete-by-absence | `postgres-store.ts` snapshot persist deletes IDs absent from next snapshot | Forbidden for seating authoritative tables |
| Fixture purge | `synthetic-cleanup.ts` `applySyntheticCleanup` / `purgeNormalizedRiskTables` | Explicit seating purge; never deletion by absence |
| Domain receipts | `venue-migration.ts`, `risk-migration.ts` receipt journals | `seating_migration_receipts` |

## 6. Commands, idempotency, audit

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Application | `durable-mutation-effect.ts` `ActionApplication` = `APPLIED` \| `REPLAYED` \| `NOT_APPLIED` | Annex B3 `SeatingCommandResult` |
| `didDataChange` | Same file — `REPLAYED` / `NOT_APPLIED` always `false` | Preserve |
| Platform mutate | `service.ts` private `mutate` — idempotency → authorize → run → audit → `store.replace` | Seating uses dedicated repository transactions, same effect contract |
| Idempotency | `PlatformSnapshot.idempotency`; risk `RiskTransaction.insertIdempotency` | `seating_idempotency_receipts` unique scope+action+key |
| Audit | `schemas.ts` `AuditEventSchema`; `AUDIT_OUTCOMES` | Append-only; seating commands audit after assignment reload |
| Event OS actions | `apps/event-os/src/server/actions.ts` `finishAction` / `withDurable`; `protection-form-action.ts` `runProtectionFormAction` | Thin parsers; no success before durable reload |
| Action result UX | `action-result.ts`, `action-flash.ts`, `action-result-banner.tsx` | Fresh `?result=` correlation; no old banner |
| Conflict | `VERSION_CONFLICT` → `mutationLocked` + `conflict-reload` | Annex H conflict copy |

## 7. Permissions and roles

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Keys | `constants.ts` `PERMISSION_KEYS` | Add `seating.*` after `risk.dossier.client_access.manage` |
| IDs | `catalog.ts` `PERMISSION_IDS` — latest `…111212` | New IDs from `…111213` |
| Role grants | `catalog.ts` `ROLE_PERMISSIONS` | Planner authors; specialists review; Director approves; CEO publishes; Auditor read-only; System Administrator none |
| CEO filter | `CEO` = all keys except `support.impersonate` | New seating keys automatically granted to CEO unless excluded |
| System Administrator | `policy.ts` `authorize` + `isSystemAdministratorRole`; role grants are infra-only | No seating operational authority |
| Existing specialist | `SYSTEM_ROLE_KEYS` includes `RISK_GOVERNANCE_REVIEWER` / `FIXTURE_IDS.personRiskReviewer` | Domain seating review uses new permissions; do not reuse risk review as seating approval |
| Fixtures | `fixtures.ts` `FIXTURE_IDS` | Verify-as allowlist maps symbolic roles → these assignment IDs only |

## 8. Privacy, hashing, peppers

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Canonical hash | `eec-hash.ts` `exactHash` / `canonicalJson` / `nfc` | Input, plan, run, publication and evaluation hashes |
| HMAC peppers | `rsvp-access.ts` invitation pepper; `session.ts` session secret; `risk-dossier-access.ts` `hashDossierAccessToken` | Solver tokens: HMAC with existing server-held pepper + event context. Raw HMAC inputs/pepper never logged |
| Prohibited downstream keys | `layout-assurance-projections.ts` `assertNoProhibitedDownstreamKeys`; `constants.ts` `PROHIBITED_DOWNSTREAM_KEYS` | Solver request must reject names, email, phone, address, free text |

## 9. Evaluation pattern

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Cases cannot write `passed` | `risk-evaluation-schemas.ts` refine `!JSON.stringify(value).includes('"passed":')` | `s06-eval-v1` must copy this refine |
| Observe then assert | `risk-evaluation-runner.ts` `executeS05BEvaluationOnSnap` / `assertionHolds` | Persist observations, then evaluate |
| Isolated harness | `risk-evaluation-fixtures.ts` `executeS05BCase` | Real production functions on isolated stores |
| Lease | S05A/S05B evaluation leases (30 minutes) | `seating_evaluation_runs.lease` |
| Mutation adapters | S05B test-only adapters, not production barrels | Annex I `S06-MUT-01`–`06` |

## 10. UI and routes

| Meaning | Accepted anchor | Mapping |
|---|---|---|
| Canonical route | Does not exist. Venue/layout copy currently says seating is unavailable | Implement `/app/events/[eventId]/seating` |
| Shell | `apps/event-os/src/components/shell.tsx` `AppShell` | Event breadcrumb + Seating Command |
| Tabs | `atelier-section-tabs.tsx` `AtelierSectionTabs` | Overview→Inputs→Rules→Reservations→Runs→Studio→Review→Publication |
| Header | `atelier-page-header.tsx` `AtelierPageHeader` | Human labels first |
| Permissions helpers | `venue-scope.ts`, `protection-scope.ts` | New `seating-scope.ts` |
| Export jobs | `requestLayoutExportAction` + `api/.../exports/[jobId]/route.ts` | `requestSeatingExport` PDF/PNG/JSON |
| No verify-as today | Tests use `e2e/login.ts` `loginAs` | Phase 10 adds triple-gated Verify-as, not Access Administration |
| Playwright helpers | `e2e/s060-helpers.ts` `expectFreshActionSuccess` | Annex J must use fresh correlations |
| Viewports | `e2e/s05-responsive-a11y.spec.ts` 360/768/1440, `zoom=2`, `reducedMotion` | Mandatory for seating |

## 11. Workers and leases

No general job queue exists. Durable concurrency is lease + run row (`venue-operations.ts` layout lease; S05A/S05B evaluation leases). Seating runs use `QUEUED→RUNNING→terminal` with lease recovery that creates a new attempt, never rewriting a terminal outcome.

## 12. Baseline gate record (Phase 0, before product work)

| Gate | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `@maison-doclar/shared-platform` unit | 512 pass / 0 fail |
| `@maison-doclar/event-os` unit | 102 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| `@maison-doclar/event-os` build | PASS |
| `git diff --check` | PASS |

No baseline product failure was recorded. First-run product failures, if any, begin after this map.
