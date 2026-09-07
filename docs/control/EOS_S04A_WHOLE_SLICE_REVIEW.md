# EOS-S04A Whole-Slice Independent Review Record

**Slice:** EOS-S04A — Guest Addressing, Relationships and Party Entitlements  
**Repository:** `kglaw-Oluseyi/atelier-doclar` · `main`  
**Recommendation:** **IN_REVIEW / final-acceptance remediation deployed; focused Claude re-verification required.** Do **not** treat this document as ACCEPTED. Cursor must not accept the slice.

## Final-acceptance remediation (Claude whole-slice MAJOR findings)

Claude’s whole-slice verification found two **MAJOR** blocking acceptance defects. They remain blocking until implementation **and** deployed evidence are both present. This remediation implements them; deployed SHA and focused browser evidence are recorded after Event OS deploy.

| ID | Finding | Root cause | Remediation | Acceptance status |
|----|---------|------------|-------------|-------------------|
| TDR-S04A-016 | Stale two-tab amendment: durable truth stayed correct; tab B showed neither success nor error | Server-action conflict used a droppable `?error=` query; same-page redirects lost it; conflict was classified as validation or dropped; a later page-level cookie clear crashed the dossier | Flash cookie + `state=VERSION_CONFLICT`; conflict wins over `ok=`; accessible alert; reload is a server action that consumes flash and unlocks; retry locked until reload | Implemented; close only after deployed two-tab evidence |
| TDR-S04A-017 | Rapid identical Save Amendment: one version increment, field left `CONFLICTING`, no guest attention | Second identical submit hit `VERSION_CONFLICT` and was treated as a competing amendment; attention ignored dietary/accessibility/note/preferredName | Client lock + idempotency key; `alreadyApplied` on fresh snapshot; attention derived from all conflict/pending fields | Implemented; close only after deployed double-submit evidence |

Contract decision (structured addressing, not a redesign):

> A manually supplied preferred formal salutation is explicit authored data and must not be silently recomputed when an honorific or title changes. If the stored salutation still contains a title being removed, the operator must **update** it or **explicitly retain** it. The system does not infer replacement wording. If the salutation contains no detectable former title, no mismatch is invented.

RSC prefetch (`TDR-S04A-012`): root-layout `ensureRuntime()` throw became Next.js `?_rsc=` 503. Layout now fails closed without crashing the shell; `requireActor` maps boot failure to `DEPENDENCY_UNAVAILABLE` and `guardedActor` sends that to `/access-denied`, not a false session expiry. Planner prefetch of `/app/admin/audit` and `/app/admin/access` renders a controlled `FORBIDDEN` instead of throwing. Local CEO/Planner/Auditor prefetch is not an unexplained 503. Classify deployed Chrome-monitor 503s against Railway/Event OS origin logs before treating them as application defects.

## Final focused remediation II (Claude acceptance defects)

Claude’s focused re-verification found three further **blocking acceptance** defects. They remain blocking until implementation **and** deployed evidence are both present.

| ID | Finding | Root cause | Remediation | Acceptance status |
|----|---------|------------|-------------|-------------------|
| TDR-S04A-018 | After `RETAINED`, the formal preview showed `Mr Adérónkẹ́ …` although the authored `Dr Adérónkẹ́ …` was stored | `renderGuestSalutation` used authored preferred formal only when addressing was confirmed; unverified records recomposed from the new honorific. The form could also submit a composed salutation with `RETAIN` | `RETAIN` ignores submitted text and keeps the previous preferred formal byte-for-byte; display uses authored preferred whenever present; service/domain invariant; fail closed + FAILED audit if violated | Implemented; close only after deployed RETAIN/UPDATE evidence |
| TDR-S04A-019 | `Reload the current record` loaded fresh data but left the conflict banner and locked forms until a full browser reload | Recovery redirected to the same canonical URL, so stale `?state=VERSION_CONFLICT` and a global flash could survive; recovered state was not scoped | Recovery action consumes flash, writes a guest-scoped recovered marker, redirects to `?refreshed=1`, then client `replaceState`; live flash still wins for a later conflict | Implemented; close only after deployed one-click recovery evidence |
| TDR-S04A-020 | Planner and Read-Only Auditor saw an enabled organisation-wide Grant assignment form | `/app/admin/access` authorised the catalogue with `assignment.view` (Planner/Auditor have it) and rendered the form whenever `listPersons` succeeded | Route and query require catalogue permission `assignment.manage`; no person/role/assignment catalogue before denial; mutation already required `assignment.manage`; UI renders controlled FORBIDDEN | Implemented; close only after deployed Planner/Auditor denial evidence |

`/app/admin/system` remains intentionally visible to authenticated assigned staff. It shows persistence label, deployed SHA, `productionAuthorised`, and the non-secret Railway project name `atelier-doclar`. `system.health.view` remains the privileged health/export permission. No database URL, credential, token or secret environment value is projected.

## Ratified requirements matrix

| Proof | Result | Evidence |
|-------|--------|----------|
| Distinct guest ID per person, child and named companion | PASS | Shared-platform contracts and services; P09/P11 journeys |
| Party/household/entourage is a container, never a person | PASS | Party workspace + `partyIsNotIdentity` |
| Titles optional structured data | PASS | Intake honorific blank option; schemas |
| Titles never inferred | PASS | `inferredTitle: false`; blank-title tests |
| Blank title remains blank | PASS | Adéṣínà fixture and P08/P09/P11 |
| Unnamed entitlement is not a guest | PASS | `unnamed-allowance`; no fabricated ID |
| Unnamed entitlement does not inflate people counts | PASS | Domain tests + P09 |
| Named materialisation is exactly one guest | PASS | Nomination service + P09 |
| Retry does not duplicate | PASS | Idempotent nominate |
| No unnecessary date of birth | PASS | `dateOfBirthForbidden`; intake copy |
| No body measurement | PASS | No field exists |
| No gender inference | PASS | No gender field; Academy warning |
| No private household assumption | PASS | Dedicated household backfill only |
| S03 remains invitation/RSVP/quantity authority | PASS | `authorisedCompanionAllowance` |
| Party membership ≠ invitation or RSVP | PASS | Separate S03 records; Academy + handbook |
| Child not ready without active RA link | PASS | `childReadinessFor`; P08/P09 |
| Cross-event / cross-household fail closed | PASS | 404/403; scope checks |
| Minimum-necessary projections | PASS | Addressing workspace capabilities |
| Mutations permissioned, versioned, atomic, audited | PASS | `PlatformService.mutate` |
| Postgres truth survives restart | PASS | P09 isolated guest after Railway restart |

## P00–P11 commit chain

| Prompt | Commit | Message |
|--------|--------|---------|
| Packs | `4ddc7cd` / `a8b66f5` | Ratified slice and Cursor packs |
| P01 | `e75f94f` | Domain contracts |
| P02 | `69a6897` | Persistence and migrations |
| Remediation | `e1a610b` / `ed3fd4e` / `336a5f4` / `b797ba9` / `c2d1373` | Persistence, fixtures, milestone 1 |
| Authority | `3fa43f0` | P03–P07 continuation |
| P03–P07 | `0de24a1` / `165ef73` / `c6081fd` / `7bda73d` / `5d821de` / `ab1d424` | Services, privacy, tests, frontend, vertical |
| Visual revert | `8d5a80d` | Rejected elevation removed |
| Postgres hardening | `1051aea` | Baseline before P08 |
| P08 | `feb73cd` | Frontend states |
| P09 | `14f47b1` | Integration and visual evidence |
| P10 | `750f068` | Academy delta and handover |
| P11 | this commit | Whole-slice hardening |

Authorised starting HEAD for the slice remains `19973f1`. Required P10/P11 baseline was `14f47b1`.

## Changed-file inventory

GitHub `main` after P11 is the durable inventory. Do not treat this list as a substitute for `git log 14f47b1..HEAD --stat`.

P11 specifically adds:

- `AdministerRelationshipInputSchema` and `administerRelationshipOnSnap` / `PlatformService.administerGuestRelationship`
- Event OS relationship create/amend actions and `guest-relationship-workspace`
- Isolated P11 journey spec (synthetic Bọ́láńlé / Ìyábọ̀; does not mutate fixture Adéṣínà or Ebun entitlement)
- Entitlement decline / expire / revoke service proof
- This review record and the Claude-in-Chrome whole-slice prompt
- Current-state / TDR / ledger IN_REVIEW updates

P10 added `packages/academy`, Event OS `/app/academy`, operator handbook and human-verification procedure.

## Schemas and migrations

`SCHEMA_VERSION` remains `1`. S04A collections are additive. Academy attempts use Event OS `event_os_academy_delta`, not a guest-schema change.

## Routes and server actions

Event OS guest intake, dossier, directory, party, child, entitlement, relationship, Academy `/app/academy/aca-s04a`, health live/ready. Server actions wrap `PlatformService` only.

## Permission matrix

CEO / Event Director: confirm, exception review, governed mutation. Planner: administer, no confirm, no S03 expansion, no exception review. Auditor: read-only. Unauthenticated: sign-in. Cross-event: fail closed. Course completion grants none of the above.

## Privacy projections

Addressing workspace with capability filters. Restricted protocol/child fields withheld. Household raw records not exposed.

## Audit actions

Including `guest.addressing.confirmed`, `guest.party.*`, `guest.relationship.created`, `guest.relationship.amended`, `guest.entitlement.*`, child link actions.

## Academy delta

`packages/academy` + Event OS training surface. 80% pass, 90% distinction, retake below 80%. Completion is not authority.

## Operator documentation

`docs/control/EOS_S04A_OPERATOR_HANDBOOK.md`, `EOS_S04A_HUMAN_VERIFICATION.md`, current-state, TDR, ledger.

## Technical verification

Recorded at P11 commit time, before push/deploy:

- `pnpm typecheck` PASS (8 packages including academy)
- `pnpm test` PASS: academy 7, design-system 3, shared-platform 168, programme-domain 155, programme-ingestion 46, event-os 39, programme-tower 42, control-tower 3
- `pnpm programme:validate` PASS (84 slices, 0 cycles)
- Event OS production build PASS
- `git diff --check` clean
- No repository-wide format/lint script is configured; Next.js build lint ran during the Event OS production build

First full Event OS E2E run after P11 relationship work: 32 passed / 4 failed. Three failures were fixture coupling from mutating Adéṣínà and Ebun entitlement (corrected in this commit). `zz-communications-hv` failed once after a Next.js memory restart (same class as P09) and passed on isolated retry.

Focused re-run after isolation: academy 2, hardening 4, integration 2, final journeys 2 — all passed.

Second full Event OS E2E run: 34 passed / 2 failed. S04A hardening, final journeys and Academy passed in-suite. `s04a-integration` failed while the local file store returned `ENOSPC` (disk-full infrastructure; not a product defect) and passed on isolated retry after artifact cleanup. `zz-communications-hv` failed again immediately after a Next.js memory restart and had already passed in isolation.

## E2E / browser evidence

- `apps/event-os/e2e/s04a-hardening.spec.ts` — 360px, 640px-as-200%, keyboard, reduced motion, axe
- `apps/event-os/e2e/s04a-integration.spec.ts` — vertical journey and conflict
- `apps/event-os/e2e/s04a-final-journeys.spec.ts` — governed title and relationship on isolated synthetic guests; Planner confirm hidden; Auditor mutation hidden
- `apps/event-os/e2e/academy-s04a.spec.ts` — assignment, assessment, authority disclaimer
- Playwright CSS `zoom` is not identical to browser zoom; 640px is the 200% layout equivalent
- Screen-reader proof beyond axe/semantics is UNTESTABLE in this automated pack
- Deployed Postgres-backed journeys are verified after Event OS deploy; see Railway section after push

## Railway deployment evidence

Event OS in Railway project `atelier-doclar` is deployed after this commit is pushed. Control Tower is not deployed (runtime unchanged; documentation and Event OS / shared-platform only). Deployment IDs, deployed SHA and health payload are recorded in the conversational return and must match GitHub `main`. `productionAuthorised` remains false. External providers remain inactive.

## Residual risks and items brought forward

- `TDR-S04A-011` blocking before client onboarding
- `TDR-S04A-012` RSC prefetch 503 — **reclassified as a tool/client artefact**. Railway HTTP logs for Claude’s window show 200/303/499 and **no origin 503**; 499s are client-aborted requests.
- `TDR-S04A-016` / `TDR-S04A-017` Claude MAJOR acceptance defects — implemented; close only with deployed evidence
- `TDR-S04A-018` / `TDR-S04A-019` / `TDR-S04A-020` RETAIN display, recovery lock, Access Administration — implemented; close only with deployed evidence
- `TDR-S04A-013` adjacent Auditor controls (in coverage)
- `TDR-S04A-015` physical offline matrix
- Permanent IdP unselected
- Synthetic data present
- External providers inactive
- Guest Concierge / Gate-Security not system roles
- Programme catalogue has no EOS-S04A accepted id (intentional)
- Academy has no standalone app or Railway service

## Acceptance recommendation

**Recommend independent review proceed.** Cursor recommendation is **IN_REVIEW**, not ACCEPTED. Production remains unauthorised. EOS-S04B, EOS-S04F and EOS-S05 were not started.
