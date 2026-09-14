# MD-PR-S075 TRUSTED ACTION BOUNDARY — PACKET 1 FINDING

**Status:** PACKET 1 COMPLETE — PACKET 2 RED-TEST CONTRACT IN PROGRESS
**Addendum:** `docs/control/eos-s06/MD_PR_S075_ADDENDUM_TRUSTED_SEATING_ACTION_BOUNDARY.md`
**Addendum SHA-256:** `a065a7b010c4a7df4f7c4a8b3ba7c6fa196297da597ed62ae1a35d9f5de8637b`
**Parent SHA-256 (unchanged):** `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`
**Canonical-layout addendum SHA-256 (unchanged):** `1451974301041c4632c3c6c7fcf20d715fddabc729ea8bf1eb19cae15186d479`
**Recorded:** 2026-09-13
**Packet 2 recorded:** 2026-09-14

No Seating application or domain implementation was edited in this packet.

The lost local review correlation `f50e2200-c3cc-4e06-962d-d97d22136d4f` is first-run evidence only. Its local store no longer exists and is not treated as durable.

---

## 1. Baseline and dirty-worktree preservation

| Item | Value |
|---|---|
| Local HEAD | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| `origin/main` | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| GitHub `main` | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| Branch | `main...origin/main` (no divergence) |
| Ancestry through `f4862f9` | Yes (HEAD and `origin/main`) |
| Fetch | `git fetch --no-tags origin` (no merge) |
| Live Event OS SHA | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| Live ready | `ready: true`, `persistence: POSTGRES`, `migrationStatus: APPLIED` |
| Live safety | `productionAuthorised: false`, fixtures enabled, S05A/S05B `PASSED`, S05B adapters OBJECT_STORE/SCAN/OCR/SOURCE_MONITOR/COMMUNICATIONS `INACTIVE` |
| Identity adapter | `NON_PRODUCTION_FIXTURE` |

Tracked dirty worktree (re-resolved):

```
 M apps/event-os/e2e/s060-helpers.ts
 M apps/event-os/e2e/s073-provision.ts
 M apps/event-os/e2e/s075-layout-binding.ts
 M apps/event-os/playwright.config.ts
 M apps/event-os/src/app/app/events/[eventId]/seating/page.tsx
 M apps/event-os/src/server/protection-form-action.ts
 M apps/event-os/src/server/seating-actions.ts
 M packages/shared-platform/src/seating-v2-command-service.ts
 M packages/shared-platform/test/seating-v2-command-path.test.ts
```

`git diff --stat`: 9 files, +306 / −49.

Reversible tracked patch (do not print body):

- `/tmp/s075-p1-preflight/tracked.patch`
- SHA-256 `8ad4bb6c10b422f9bbf14c8920947441815b62f139381ee99eea2b18f7fd8efe`

Untracked inventory (SHA-256 of file contents):

| SHA-256 | Path |
|---|---|
| `a5cb1877…99699c` | `apps/event-os/e2e/s075-layout-binding-live.spec.ts` |
| `d22348ee…0e4c6a` | `apps/event-os/e2e/s075-layout-binding-live.ts` |
| `7d7bd284…dd52cb` | `apps/event-os/e2e/s075-section-13-j1-studio.spec.ts` |
| `3132d99a…fdfe88` | `apps/event-os/e2e/s075-section-13-j2-governance.spec.ts` |
| `294ac5ff…7f81ac` | `apps/event-os/e2e/s075-section-13-j3-exports.spec.ts` |
| `2bf3c634…c76390` | `apps/event-os/e2e/s075-section-13-j4-ux.spec.ts` |
| `b88c41b2…efbaf2` | `apps/event-os/e2e/s075-section-13.ts` |
| `a065a7b0…e8637b` | `docs/control/eos-s06/MD_PR_S075_ADDENDUM_TRUSTED_SEATING_ACTION_BOUNDARY.md` |

Secret scan of untracked S075 e2e files: no access-token / Bearer / JWT / password matches. Railway appears only as a **refusal** string in local preflight.

### Existing Studio CAS work to preserve

Uncommitted `packages/shared-platform/src/seating-v2-command-service.ts` already:

- CAS on current working edition / `expectedVersion` / `expectedContentHash`;
- `VERSION_CONFLICT` for stale apply;
- `VALIDATION_FAILED` for occupied target (not `VERSION_CONFLICT`);
- unit coverage in `packages/shared-platform/test/seating-v2-command-path.test.ts`.

Uncommitted seating page / `applySeatingChangeAction` support identity, vacant seats and scoped Apply lock. This packet did not overwrite that work.

---

## 2. Complete Seating Server Action inventory

Import search: every exported Seating Server Action is imported only from `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx` plus its defining module. No other page/component binds these actions.

Shared render facts (all event-scoped forms unless noted):

- **Renderer:** `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx`
- **Route scope:** `params.eventId` (`page.tsx` ~80–92), then `getEvent` / list fallback; `envelopeFields = { organisationId, eventId: event.id, assignmentId }` (`page.tsx` 192)
- **Submitted scope:** hidden `organisationId`, `eventId`, `assignmentId` via `Envelope`; `idempotencyKey`; plus command-specific resource fields
- **Actor:** `runProtectionFormAction` → `requireActor()` (`protection-form-action.ts` 56); `sessionEnvelope` calls `requireActor()` **again** (`seating-actions.ts` 43–44)
- **Assignment:** `sessionEnvelope` selects ACTIVE org+event match, else ACTIVE org-wide (`!item.eventId`) (`seating-actions.ts` 49–55). No `organisationWide` role check. Form `assignmentId` is schema-required then ignored.
- **Audit / idempotency / result / redirect:** command `envelope.eventId` from FormData; `scopePath` = `/app/events/${formData.eventId}/seating` (`seating-actions.ts` 39–41); `writeActionResult` `eventId`/`organisationId` from FormData (`protection-form-action.ts` 103–104, 174–175); `redirect(resultHref(scopePath, correlationId))`

`requireActor()` mints a **new** `correlationId` on every call (`with-session.ts` 25). Two resolutions per mutation can diverge domain vs action-result correlation.

### 2.1 Exported actions

| Action | File | actionType | Outer permission (command) | Resources accepted | Version/hash today |
|---|---|---|---|---|---|
| `freezeSeatingInputsAction` | `seating-actions.ts` 93 | `seating.input.freeze` | `seating.input.prepare` via `freezePackage` | optional `seed` | none required |
| `createSeatingConstraintAction` | 108 | `seating.constraint.create` | `seating.constraint.manage` | tags, guests, table, reviewDomain | none |
| `activateSeatingRuleAction` | 489 | `seating.rule.activate` | `seating.rule.activate` | `editionId` | none |
| `withdrawSeatingRuleAction` | 503 | `seating.constraint.manage` | `seating.constraint.manage` | `editionId`, reason | none |
| `createReservationBlockAction` | 153 | `seating.reservation.create` | `seating.reservation.manage` | guests, table, counts | none |
| `activateReservationBlockAction` | 188 | `seating.reservation.activate` | same | `blockId` | none |
| `withdrawReservationBlockAction` | 204 | `seating.reservation.withdraw` | same | `blockId`, reason | none |
| `supersedeReservationBlockAction` | 221 | `seating.reservation.supersede` | same | `blockId` + content | none |
| `releaseReservationBlockAction` | 242 | `seating.reservation.release` | same | `blockId`; V1 `expectedVersion` | V1 only |
| `launchSeatingRunAction` | 265 | `seating.run.launch` | `seating.run.execute` | `inputEditionId`, seed | none |
| `cancelSeatingRunAction` | 287 | `seating.run.cancel` | V1 cancel | `runId`, `expectedVersion` | V1 version |
| `adoptSeatingRunAction` | 304 | `seating.run.adopt` | adopt | `runId` | none |
| `applySeatingChangeAction` | 319 | `seating.plan.edit` | `seating.plan.edit` | edition, command, guests, seats | envelope version/hash **if present**; uncommitted CAS on V2 apply |
| `submitSeatingPlanAction` | 367 | `seating.plan.submit` | `seating.plan.submit` | `editionId` | current-hash path in service; form version not mandatory |
| `recallSeatingPlanAction` | 520 | `seating.plan.submit` | recall | `editionId` | form may send version/hash |
| `decideSeatingReviewAction` | 382 | `seating.plan.review` | domain `seating.plan.review.*` | `editionId`, `editionHash`, domain, decision, reason | hash required in V2; **`expectedVersion` not required** |
| `decideSeatingApprovalAction` | 411 | `seating.plan.approve` | `seating.plan.approve` | edition + hash | hash in V2; version not mandatory |
| `publishSeatingPlanAction` | 437 | `seating.plan.publish` | `seating.plan.publish` | edition + hash | hash in V2; version not mandatory |
| `requestSeatingExportAction` | 460 | `seating.export` | `seating.export` | publication/edition, format, projection | none |
| `proposeSeatingLayoutBindingAction` | 534 | `seating.layout_binding.propose` | binding propose | `layoutPublicationId`, reason | **app-layer `store.snapshot()` lookup** (544–551) |
| `activateSeatingLayoutBindingAction` | 570 | `seating.layout_binding.activate` | activate | `bindingId`, `expectedVersion` | version |
| `withdrawSeatingLayoutBindingAction` | 589 | `seating.layout_binding.withdraw` | withdraw | `bindingId`, `expectedVersion` | version |
| `runS06EvaluationAction` | 608 | `seating.evaluate` | `seating.evaluate` | none extra | none |
| `switchSeatingVerifyAsAction` | `seating-verify-as-action.ts` 11 | `seating.verify_as` | **no permission check** | `symbolicRole` + Envelope scope | none |

Studio preview is not a separate Server Action. `applySeatingChangeAction` branches `ASSIGN_UNSEATED` / `applyManual` (MOVE/UNSEAT/LOCK/UNLOCK/SWAP).

Export **retrieval** is not a Seating Server Action. Request is `requestSeatingExportAction`. Layout export GET remains `src/app/api/events/[eventId]/layouts/[layoutId]/exports/[jobId]/route.ts` (not a Seating mutation).

Page bindings (all unbound `(prev, formData)` today — **no `boundEventId`**):

- Evaluate, Verify-as, propose/activate/withdraw binding, freeze, activate/withdraw rule, create/activate/withdraw/supersede/release reservation, launch/adopt/cancel run, Studio apply, submit/recall, review, approve, publish, export.

---

## 3. Confirmed architecture findings

| # | Hypothesis | Verdict | Citation |
|---|---|---|---|
| 1 | Page render uses route `params.eventId` | **Confirmed** | `seating/page.tsx` 80–92, 192 |
| 2 | Actions accept scope from FormData | **Confirmed** | `sessionEnvelope` 47–48; `EnvelopeSchema` requires `organisationId`/`eventId`/`assignmentId` 20–22 |
| 3 | Canonical event not consistently loaded on write | **Confirmed** | write path never `getEvent`; only FormData IDs |
| 4 | `organisationId` accepted instead of derived | **Confirmed** | FormData → envelope |
| 5 | `clientId` absent from mutation scope | **Confirmed** | `EventRecord.clientId` exists (`schemas.ts` 114) but envelope/authorize scope is `{ organisationId, eventId }` only |
| 6 | Assignment fallback can select a client-scoped assignment for another client | **Confirmed** | `assignmentCoversScope`: if `assignment.clientId` and `scope.clientId` is absent, returns `true` (`policy.ts` 74–77). Seating authorize does not pass `clientId`. `sessionEnvelope` org-wide fallback (`!item.eventId`) also ignores client. |
| 7 | Command authorization may union multiple assignments | **Confirmed** | `authorize` collects `matchedRoleKeys` from **every** covering grant (`policy.ts` 118–136). `guard` uses that union, not one assignment. `singleCoveringRoleKey` exists but is unused on the Seating write path. |
| 8 | Audit/idempotency/result/redirect can use submitted scope | **Confirmed** | `mutate` hashes `{ action, envelope, personId }` (`seating-v2-command-service.ts` 183); audit `eventId: envelope.eventId` (220–222); redirect `scopePath(formData)` |
| 9 | Some commands render without version/hash preconditions | **Confirmed** | freeze, create rule/reservation, launch/adopt, activate rule, review (`expectedVersion` unused in `recordSpecialistReview` 1236–1243) |
| 10 | Scoped stores contain unscoped fall-through | **Confirmed** | Memory `assertSeatingV2Scope` allows missing `record.eventId` (`seating-v2-repository.ts` 127–129). Postgres `load`/`list` fall through to unscoped `SELECT` when org+event absent (`postgres-seating-v2-store.ts` 88–93, 111–115) |
| 11 | Layout-binding proposal uses app-layer snapshot | **Confirmed** | `getRuntime().store.snapshot().layoutPublications.find` (`seating-actions.ts` 544–551) |
| 12 | Verify-as does not establish full event authority | **Confirmed** | triple gate only; no event visibility; no controller permission; FormData `eventId` for `scopePath` (`seating-verify-as-action.ts` 12–31) |
| 13 | Authentication resolved more than once / different correlations | **Confirmed** | `requireActor` at action enter and again in `sessionEnvelope`; each call `crypto.randomUUID()` (`with-session.ts` 25) |

---

## 4. Verify-as contract and permission decision

Accepted contract (S070 pack Phase 10; `EOS_S06_ACCEPTED_CONTRACT_MAP.md` §7/§10):

- triple gate: `productionAuthorised === false`, fixtures allowed, explicit flag;
- allowlisted symbolic roles → fixture assignment IDs only;
- not Access Administration;
- production / flag-off removes control and denies POST.

Implemented gate: `seatingVerifyAsAllowed` + `eventOsVerifyAsAvailable` (`seating-verify-as.ts`). Flag `EVENT_OS_VERIFY_AS === "1"`. Allowlist includes `ceo` (`seating-verify-as.ts` 6–12). UI offers Planner/Reviewer/Director/CEO/Auditor (`page.tsx` 268–274). **Admin** is allowlisted in code but not offered in the select.

Addendum Packet 1 required policy **not** met:

- current actor is **not** required to hold an explicit controller authority;
- bound event is **not** re-checked as visible/authorised to that actor;
- `seating.view` is the only seating read gate on the page and is **not** sufficient impersonation authority.

### Controller permission search

| Candidate | Result |
|---|---|
| `support.impersonate` | Catalogue key exists (`constants.ts` 247; `catalog.ts` 45). **CEO is defined as all keys except this.** `authorize` **hard-denies** it for every actor (`policy.ts` 89–91, `IMPERSONATION_FORBIDDEN`). No role grant can succeed. |
| `platform.access.administer` | System Administrator infra only; not a Seating Verify-as controller. |
| `seating.view` | Addendum forbids using it as impersonation authority. |
| Other controller / verify-as key | **None** in `PERMISSION_KEYS`. |

**Decision required before Packet 2:** there is no accepted, grantable controller permission that can authorize Verify-as. Inventing a new permission identifier is prohibited until AI CTO decides. Packet 2 exit (“no ambiguity about assignment or Verify-as authority”) therefore cannot be started.

---

## 5. Rejected hypotheses

- “FormData `eventId` is unused / display-only.” Rejected: it is parse-required and is command, audit, idempotency and redirect authority.
- “Route `params.eventId` is write-path authority.” Rejected: route loads the page; actions do not receive it.
- “Lost local `f50e2200-…` review is durable proof.” Rejected: memory/file store is gone.
- “Only specialist review is in blast radius.” Rejected: 24 event-scoped actions share `sessionEnvelope` / FormData scope (23 seating-actions + Verify-as).
- “`assignmentId` hidden field selects the grant.” Rejected: validated as UUID then ignored; resolver picks event-or-org-wide independently.

---

## 6. Packet 1 exit gate

| Gate | Result |
|---|---|
| Complete action inventory | **Pass** — 24 Server Actions, sole renderer `seating/page.tsx` |
| Exact code citations | **Pass** — §2–§4 |
| Existing CAS / dirty tree preserved reversibly | **Pass** — `/tmp/s075-p1-preflight/tracked.patch` |
| No product edit | **Pass** |
| Unresolved accepted-authority conflict | **Reported:** Verify-as has no usable controller permission |

**Packet 1 exit gate: PASSED with explicit Verify-as stop.**

Packet 2 continues below. Product/domain implementation remains Packet 3–6. Status remains **NOT READY FOR CLAUDE**.

---

## 7. Packet 2 preflight (worktree preservation)

Re-resolved 2026-09-14 before Packet 2 edits:

| Item | Value |
|---|---|
| Local HEAD | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| `origin/main` | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| GitHub `main` | `f4862f9f9e2b8759e4991436a40a3873f52993c2` |
| Tracked dirty patch SHA-256 | `8ad4bb6c10b422f9bbf14c8920947441815b62f139381ee99eea2b18f7fd8efe` |
| Compare to `/tmp/s075-p1-preflight/tracked.patch` | **Identical** |
| Fresh reversible copy | `/tmp/s075-p2-preflight/tracked.patch` (same hash) |

Untracked files match Packet 1 plus this finding (created in Packet 1, hashed `d3caf77c081cae4b4141c2567bcd6b61ef04d9c8f2021e9acb9c2ad14c0578b0` at Packet 2 start). No unexplained tracked difference. Live Event OS was not re-probed and no Railway tunnel was opened.

---

## 8. AI CTO Verify-as decision (now in force)

Controller permission key (not yet registered — Packet 3 catalogue work):

`seating.fixture_verify_as`

Collision-free catalogue identifier reserved by the existing `PERMISSION_IDS` process. Latest seating ID is `seating.rule.activate` = `…111233`. Next unused UUID:

`11111111-1111-4111-8111-111111111234`

Do not reuse `support.impersonate` (`…111021`). That key remains hard-denied for every actor.

Grant matrix (Packet 3 must implement exactly):

| Role | `seating.fixture_verify_as` |
|---|---|
| CEO | **Grant** — via existing `PERMISSION_KEYS.filter(key !== "support.impersonate")` once the key is appended to `PERMISSION_KEYS` |
| Event Director | **Do not grant** |
| Planner | **Do not grant** |
| Risk Governance Reviewer | **Do not grant** |
| Auditor (`READ_ONLY_AUDITOR`) | **Do not grant** |
| System Administrator | **Do not grant** |

Triple gate unchanged: `productionAuthorised === false` AND fixtures enabled AND `EVENT_OS_VERIFY_AS=1`. If any condition is false, the control is absent and the server action is denied.

### Selected session path: authorised one-way fallback

Preferred dual-identity contract (retain `controllerPersonId` + separate effective fixture identity; revalidate CEO + `seating.fixture_verify_as` on later switches) is **not** selected.

Reason: `StaffSessionActorSchema` is `.strict()` with only `sessionId`, `personId`, `issuedAt`, `expiresAt`. `issueSession` / `readSession` / `authenticateNamedStaff` / `requireStaffSession` bind that payload into every Event OS staff cookie. Adding a controller field would expand the signed-session contract for all sign-in, logout and revocation paths, not an additive Seating-only field.

Authorised fallback now in force:

1. CEO with `seating.fixture_verify_as` and a visible canonical event may switch once to an allowlisted fixture identity.
2. The switch issues a normal staff session for the fixture person only.
3. Business commands receive only that effective identity’s assignments and permissions.
4. A further Verify-as switch is denied until explicit sign-out and CEO reauthentication.
5. Assumed roles must not receive `seating.fixture_verify_as` merely to switch back.
6. Controller identity is never read from FormData, URL or local storage; the pre-switch actor is the authenticated CEO session.
7. Audit records controller person (pre-switch), target symbolic role, canonical event and the single request correlation. Tokens and session material are not recorded.

---

## 9. Trusted boundary specification (Packet 2)

### 9.1 Trusted scope

```ts
type TrustedSeatingEventScope = Readonly<{
  organisationId: OrganisationId;
  clientId: ClientId;
  eventId: EventId;
  assignmentId: AssignmentId;
  roleKey: SystemRoleKey;
  scopePath: `/app/events/${string}/seating`;
}>;
```

Derivation:

| Field | Source |
|---|---|
| `eventId` | Server-rendered route value bound into the Server Action (`boundEventId`). Integrity only — not authorization. |
| canonical event | One bounded load by that ID. No `runtime.store.snapshot().events.find`. Memory/file and PostgreSQL share the policy. |
| `organisationId` / `clientId` | Canonical event record only |
| assignment / `roleKey` | One active covering assignment at highest specificity (below) |
| `scopePath` | `/app/events/${canonicalEvent.id}/seating` |
| audit / idempotency / action result | Canonical organisation + event + one request correlation |
| redirect | Canonical `scopePath` |

Every invocation reloads the event and re-authorizes. A captured bound action may be replayed after permissions change.

Missing canonical event: generic session-bound NOT_FOUND, navigate to `/app/events`. Do not invent an organisation to write an event-scoped result.

### 9.2 Assignment resolution (one grant, no union)

1. Active exact event-scoped assignment.
2. Else active matching-client assignment (`assignment.clientId === event.clientId`, no event id or same event).
3. Else organisation-scoped assignment only when the assignment’s active role has `organisationWide === true`.
4. Else deny without disclosing whether a foreign event exists.

At the highest applicable specificity, select exactly one assignment. Do not union permissions. Do not rank by privilege strength or row order. Equally specific conflicting grants: fail closed (`FORBIDDEN` / `VALIDATION_FAILED` through existing codes — do not invent `AUTHORITY_AMBIGUOUS` as a new `PlatformError` code). `singleCoveringRoleKey` is contact-correction specific and is **not** reused as the Seating writer.

The command service independently reloads the named assignment and verifies active window, same person, same organisation, exact event or matching client or legitimate organisation-wide role, and the required permission under that one assignment.

Current `sessionEnvelope` fallback (`ACTIVE && org && !eventId`) is non-compliant: it treats any unscoped assignment as organisation-wide and ignores client.

Current `authorize()` union of `matchedRoleKeys` is non-compliant on the Seating write path.

Current `assignmentCoversScope` is non-compliant when `scope.clientId` is omitted: a client-scoped assignment covers another client’s event.

### 9.3 FormData tripwire

Remove `organisationId`, `eventId`, `assignmentId` as authority from every Seating command schema and envelope builder.

Legacy/injected fields:

| Submitted vs canonical | Outcome |
|---|---|
| absent | normal |
| present and equal | tolerated, ignored |
| present and conflicting | `FORBIDDEN`, `NOT_APPLIED`, audit + result + redirect under the canonical event |

Never use them to choose scope, assignment, audit partition, idempotency partition or redirect.

### 9.4 Runner order

Authenticate once. Carry the same actor/correlation through canonical load, assignment, tripwire, parse, command, domain audit, action result and redirect.

`runProtectionFormAction` changes are additive and opt-in. Protection and Dossier keep reading FormData scope as today.

Idempotency request-hash projection keeps legacy identity fields using **canonical** org/event/assignment values. Do not add `clientId` to historic request identity. Submitted conflicting scope must not create a second partition.

### 9.5 Resources, stores, CAS, layout binding

Reload every listed resource under trusted organisation/event. Foreign IDs → safe NOT_FOUND-equivalent, no existence leak, no foreign audit/idempotency.

Root creates (rule, reservation, freeze) require a canonically loaded event.

Event-scoped collections require organisation **and** event. Organisation-scoped: `evaluationRuns`, `evaluationCaseResults`. Intentionally unscoped: `migrationReceipts` only. Remove event/tenant predicate fall-through (`assertSeatingV2Scope` and Postgres `load`/`list` unscoped `SELECT`).

Concurrency preconditions are mandatory for material mutations listed in addendum §5.2. Absence is `VALIDATION_FAILED` / `NOT_APPLIED`. Preserve existing Studio current-working CAS (version/hash `VERSION_CONFLICT`; occupied `VALIDATION_FAILED`). Exact idempotent replay is detected before the successful command’s version increment is treated as stale. Changed payload under the same key remains `IDEMPOTENCY_CONFLICT`.

Layout-binding proposal: action submits only `layoutPublicationId` and reason. Service reloads and verifies inside the transaction. No app-layer `store.snapshot().layoutPublications.find`.

---

## 10. Packet 2 red-test matrix

Durable tests (not throwaways):

- `packages/shared-platform/test/seating-v2-trusted-action-boundary.test.ts`
- `apps/event-os/test/seating-trusted-action-boundary.test.ts`

They assert the post-remediation contract against current code. Packet 3–6 must make them pass without weakening assertions.

| # | Case | Expected after remediation |
|---|---|---|
| 1 | Event A-bound action + injected Event B field | tripwire `FORBIDDEN` / `NOT_APPLIED`; audit/redirect A |
| 2 | Valid Event B resource through Event A envelope | NOT_FOUND-equivalent; no B mutation |
| 3 | Foreign-organisation resource | NOT_FOUND-equivalent |
| 4 | Client C1 assignment vs Client C2 event | deny |
| 5 | Exact Event A assignment vs Event B | deny |
| 6 | Matching-client assignment vs its event | allow |
| 7 | Organisation-wide CEO vs event | allow |
| 8 | Non-organisation-wide role stored without event/client | deny |
| 9 | Narrow event assignment + broad org assignment | no privilege union; highest specificity only |
| 10 | Equally specific conflicting assignments | fail closed |
| 11 | Revoked/expired assignment replaying captured envelope | deny |
| 12 | Nonexistent event UUID | no Seating root rows; NOT_FOUND-equivalent |
| 13 | Success audit / result / redirect share canonical scope + correlation | one actor resolution |
| 14 | Same truth on denial | canonical scope + same correlation |
| 15 | Idempotency replay with changed submitted scope | canonical partition; no second event write |
| 16 | Verify-as controller + event + triple gate | CEO + `seating.fixture_verify_as` only; one-way fallback |
| 17 | Foreign IDs across scoped collections | fail closed; no unscoped fall-through |
| 18 | Missing required version/hash | `VALIDATION_FAILED` / `NOT_APPLIED`; no CAS bypass |
| 19 | Exact replay after successful version increment | `REPLAYED`; no second write |
| 20 | Protection / Dossier shared-form behaviour | unchanged FormData scope on those slices |

---

## 11. Packet 2 exit gate

Focused red evidence (exit 1, as required):

- `/tmp/s075-p2-evidence/shared-platform-red.txt` — 17 tests, 8 pass, 9 fail
- `/tmp/s075-p2-evidence/event-os-red.txt` — 4 tests, 1 pass, 3 fail

| # | Case | Result | Exact pre-remediation reason |
|---|---|---|---|
| 16 catalogue | `seating.fixture_verify_as` / `…111234` / CEO-only | **RED** | key absent from `PERMISSION_KEYS` (`false == true`) |
| 16 session | signed session cannot carry `controllerPersonId` | **GREEN** | `StaffSessionActorSchema.strict()` rejects extra field — fallback selected |
| 4–10 oracle | spec function in the test file | **GREEN** | oracle-only; not production |
| 4 | Client C1 assignment vs Client C2 event | **RED** | `createRule` applied; `guard`/`authorize` omit `clientId` |
| 5 | Event A assignment vs Event B | **GREEN** | event-id mismatch already denied |
| 6 | matching-client vs own event | **GREEN** | already allowed |
| 7 | org-wide CEO | **GREEN** | already allowed |
| 8 | unscoped non-`organisationWide` planner | **RED** | `createRule` applied; unscoped assignment treated as covering |
| 9 | narrow + broad no union | **RED** | `activateRule` applied via CEO union despite event-scoped PLANNER |
| 10 | equally specific conflict | **RED** | `createRule` applied; permissions unioned |
| 11 | revoked replay | **GREEN** | inactive assignment already denied |
| 12 | nonexistent event UUID | **RED** | `NO_ACTIVE_SEATING_LAYOUT_BINDING` instead of event `NOT_FOUND` (no canonical load) |
| 1/15 | injected Event B / idempotency partition | **RED** | Event B path uses layout miss, not canonical `FORBIDDEN` tripwire |
| 2/3/17 | foreign IDs + store fall-through | **RED** | `assertSeatingV2Scope` returns true when `eventId` is missing on record or scope (`true !== false`); Postgres unscoped `SELECT` still present |
| 13/14/19 | command correlation + exact replay | **GREEN** at command service | domain mutate already shares `actor.correlationId`; idempotency precedes version bump |
| 18 | missing version/hash CAS | **RED** | `applyManual` without version/hash applied (`Missing expected rejection`) |
| 20 | Protection/Dossier FormData scope | **GREEN** | `scopePathFromForm` / dossier helpers unchanged |
| Event OS 1 | boundEventId / no FormData authority | **RED** | `boundEventId` absent; `sessionEnvelope` reads FormData org/event |
| Event OS 13/14 | one actor + trusted runner | **RED** | no `trustedScope`/`boundEventId` in `runProtectionFormAction`; `sessionEnvelope` still calls `requireActor()` |
| Event OS 16 | Verify-as controller | **RED** | no `seating.fixture_verify_as`; action still uses FormData `eventId` |

Passing cases are already-true fragments of the contract. They must remain passing. Failing cases must not be weakened.

| Gate | Result |
|---|---|
| Verify-as authority unambiguous | **Pass** — `seating.fixture_verify_as` / `…111234` / CEO-only / one-way fallback |
| Boundary contract reviewed | **Pass** — §9 |
| Red tests demonstrate actual defects | **Pass** — 12 failing assertions, intended reasons above |
| No Packets 3–6 implementation | **Pass** |

**Headline:** `NOT READY FOR CLAUDE`

---

## 10. Packet 3–6 completion — remaining `tx.load` classification

Recorded 2026-09-14. Identity loads on the V2 command path go through `requireOwned`. `tx.load` itself remains only inside that helper.

| Site | Collection scope | Trusted org/event | Repository already scopes | Ownership after load | Safe error |
|---|---|---|---|---|---|
| `requireOwned` | Event-scoped seating-v2 identity row | Yes | Yes (`organisation_id` + `event_id`) | Yes | `NOT_FOUND` |
| freeze / `packageInputs` / `boundPublishedTableIds` | Event-scoped `layoutBindings` list; layout publication/revision by id+org+event; guests/RSVP/brief/protection by org+event | Yes | Yes | Binding + publication org/event/hash revalidated | Layout mismatch/stale codes or `NOT_FOUND` |
| `requestExport` | Event-scoped publication or plan edition | Yes | Yes | `requireOwned` | `NOT_FOUND` |
| `retrieveExport` | Event-scoped export job, publication, plan edition; assignments listed under envelope | Yes | Yes | `requireOwned` | `NOT_FOUND` |
| `assertFreshFeasible` / package reload | Event-scoped input package | Yes | Yes | `requireOwned` | `NOT_FOUND` |
| S06 evaluation persist | Organisation-scoped `evaluationRuns` / `evaluationCaseResults` | Org from trusted envelope; not forced to event | Org-only collections remain org-only | N/A (org collection) | Existing evaluation errors |

`policy.ts` is unchanged from origin. Seating assignment resolution lives in `seating-v2-trusted-assignment.ts` and is adopted only by Seating.

V2 mutation path: `this.deps.snapshot()` remains only on `projectWorkspace` (read projection). Event OS seating actions contain no `store.snapshot()`.

---

## 11. Packet 3–6 completion — V1 replacement flag fail-closed

Recorded 2026-09-14.

| Item | Evidence |
|---|---|
| Flag | `EVENT_OS_SEATING_V2_REPLACEMENT` via `seatingV2ReplacementEnabled()` |
| Default | **On** — enabled whenever the env var is unset or any value other than `"0"` |
| Current Event OS process value | **Unset** (default on). Not set in `apps/event-os` Playwright/`playwright.config.ts` env. No secrets involved. |
| Accepted rollback (MD-PR-S072 §17.9) | Flag off preserves **reading** legacy publication / historic V1 rows. It does **not** authorise reactivating legacy write routes. §17.8 retires legacy write routes; direct POSTs deny. |
| Mutation branches formerly gated by the flag | freeze, create constraint/reservation, release reservation, launch/adopt run, apply change, submit, review, approve, publish, export — previously fell through to `seatingCommands()` when off |
| Always-V1 write (retired) | `cancelSeatingRunAction` previously always called V1 `cancelSeatingRun`; now fail-closed (`CAPABILITY_NOT_ENABLED`) |
| V2-only actions (already) | activate/withdraw/supersede reservation, rule activate/withdraw, recall, layout binding, S06 evaluation — now also call `requireSeatingV2Writable()` before write |
| Flag off behaviour | `requireSeatingV2Writable()` → `CAPABILITY_NOT_ENABLED` → action runner `NOT_APPLIED`; no `seatingCommands()` mutation; no durable write |
| Historic read | Page may still label/read last-known-good via `projectCurrentPublication` / V1 `projectWorkspace` when V2 has no CURRENT publication or flag is off |
| Retained debt | V2 `projectWorkspace` still uses one full platform snapshot for **read projection** only — not an action-boundary hard stop unless Section 13 shows a live settlement problem |
| Obsolete V1 writer | `SeatingCommandService.freezeSeatingInputs` still hydrates `deps.snapshot()`; left unreworked; unreachable from Event OS seating actions |

---

## 12. Packet 7 consolidated local gate (in progress)

Recorded 2026-09-14.

### Closed so far

| Gate | Result |
|---|---|
| Shared-platform + Event OS typecheck | PASS |
| `git diff --check` | PASS |
| Shared-platform unit suite | **673/673 PASS** |
| Event OS unit suite | **125/125 PASS** (includes file-backed seating V2 + non-production store path) |
| `pnpm programme:validate` | PASS |
| Event OS production build | PASS |
| Focused S075 / trusted-boundary / replacement / S051 focus | PASS |
| V1 replacement fail-closed unit | PASS |
| Checkpoint j2 LKG → j3 / j4 | **J3_J4_PASS** |

### First-run failure preserved (shared-platform)

Mandatory `expectedVersion` / `expectedContentHash` after Packet 5 broke older S075/eval fixtures that called activate/submit/publish without CAS. Corrected via `envelope(..., row?)` helpers and publish-after-approve version `submitted.version + 1`. Evidence: `/tmp/s075-p7-shared-platform-unit.txt` (first run) → `/tmp/s075-p7-shared-platform-unit2.txt` (green).

### Section 13 browser groups

| Group | Result |
|---|---|
| j1 Studio/concurrency (first) | FAIL — next-dev `ECONNRESET` aborted Director sign-in (`/tmp/s075-p7-evidence/j1-first-run-econnreset.txt`) |
| j1 retry | FAIL — Activate POST `status=200` no redirect (`/tmp/s075-p7-evidence/j1-first-run-activate-cas-gap.txt`) |
| Root cause (retry) | Rule Activate/Withdraw envelopes omitted Packet 5 CAS fields → `VALIDATION_FAILED` → in-page validation return (no action-result redirect) |
| Fix applied | V2 workspace projects `contentHash`/`editionNo` on constraints; seating page Activate/Withdraw submit them (parity with reservations) |
| j1 after CAS fix | FAIL — progressed past Activate/freeze/two-tab conflict; Apply button missing after mid-run ECONNRESET (`/tmp/s075-p7-evidence/j1-casfix-apply-button-after-econnreset.txt`) |
| j1 clean retry | FAIL — Launch settlement `page.goto` timeout after redirect; host is 8GiB while e2e forced 16GiB Node heap (`/tmp/s075-p7-evidence/j1-launch-goto-timeout-16g-heap.txt`) |
| Harness fix | `playwright.config.ts` default e2e heap capped to 4096 MiB; override via `EVENT_OS_E2E_HEAP_MB` |
| j1 under 8192 / 4096 | FAIL — next-dev memory-threshold restart (`/tmp/s075-p7-evidence/j1-memory-threshold-restart-*.txt`); host `hw.memsize` = 8GiB |
| j2 / j3 / j4 | Checkpointed **J2_PASS** then **J3_J4_PASS** on j2 LKG (see recovery § below) |

### Packet 7 recovery — small-run baseline + j1 split (2026-09-14)

#### Small-run baseline (`e2e/s075-rule-form.spec.ts` + Alpha One seating path)

| Metric | Value |
|---|---|
| Smoke result | **PASS** (13.6s); no Next restart |
| RSS after boot | ~803–925 MiB (listener on :3020) |
| RSS after sign-in | ~893 MiB |
| RSS after first Seating render | ~725 MiB |
| Peak RSS | ~893 MiB |
| Heap cap | 4096 MiB (`EVENT_OS_E2E_HEAP_MB`) |
| Evidence | `/tmp/s075-p7-evidence/smoke-rss-summary.json`, `smoke-rule-form-rss.txt` |

Local short Seating runtime is **healthy**. Do not blame a globally broken next-dev.

#### Isolated j1a / j1b

| Spec | Result |
|---|---|
| `e2e/s075-section-13-j1a-plan-integrity.spec.ts` | **FAIL ×2** — Next restart at S073 provision `Save layout` → layout URL (`s073-provision.ts:201`); never reached Seating Command |
| `e2e/s075-section-13-j1b-concurrency.spec.ts` | Not run unchanged — same provision path as j1a |
| Long combined j1 | Still recorded as first-run cumulative failure; **not re-run** |

#### Classification

**Cumulative `next dev` tooling pressure during multi-route provision (layout studio compile), not the retained Seating `projectWorkspace` snapshot.**

- Restart transition is layout create during provision, **before** any Seating page render or seating mutation.
- Therefore `projectWorkspace` full-snapshot read remains **retained performance debt**, not elevated to a hard stop.
- Do **not** replace the read projection on this evidence.
- Do **not** raise heap/timeouts for compiler OOM.

#### Checkpointed P1–P5 (2026-09-14) — **PASS**

Split provision across fresh `next dev` processes sharing one OS-temp file store + manifest (`EVENT_OS_NON_PRODUCTION_STORE_PATH`, `EVENT_OS_CHECKPOINT_MANIFEST`).

| Phase | Result | Notes |
|---|---|---|
| P1 event + grants | PASS | Fresh server |
| P1-guests | PASS | CEO prepares RSVP; planner marks ATTENDING |
| P1-venue | PASS | |
| P2 layout | PASS | **No** memory-threshold restart at Save layout |
| P3 binding / freeze / adopt | PASS | Required file-backed seating V2 persistence |
| P4 j1a | PASS | Hard UNSEAT → NOT_APPLIED; hash unchanged |
| P5 j1b | PASS | Two-tab CAS; successor edition recorded |

**Product fixes kept for checkpoint durability/CAS UX (not read-projection):**

1. `FileBackedSeatingV2Repository` — non-production seating V2 state persists beside the platform JSON store (bindings/plans survived server restarts).
2. Studio Apply `PendingSubmit` lock only while `?result=` is present — sticky VERSION_CONFLICT cookie no longer blocks Apply after a canonical reload.

Evidence: `/tmp/s075-p7-evidence/p1-p5-pass-20260914T085353Z/` (`checkpoint-summary-9.json`, `manifest-9.json`, runner log, dual stores).

#### Checkpointed j2 (2026-09-14) — **PASS**

`EVENT_OS_CHECKPOINT_MODE=j2` (P1–P3 foundation + j2-prep / j2-reviewer / j2-publish), fresh `next dev` per phase.

| Phase | Result |
|---|---|
| P1 → P3 | PASS (same as P1–P5 foundation) |
| j2-prep | PASS — SECURITY rule, freeze/launch/adopt, submit (Submit envelope CAS fields added) |
| j2-reviewer | PASS — specialist review + cross-event tamper refused (FORBIDDEN / not applied) |
| j2-publish | PASS — director approve; CEO publish Publication 1; LKG draft hash recorded |

Additional product fix: Submit seating plan Envelope now sends `expectedVersion` / `expectedContentHash` (Packet 5 CAS parity).

Evidence: `/tmp/s075-p7-evidence/j2-pass-latest/` (`checkpoint-summary.json` verdict `J2_PASS`, manifest with `j2PublicationBadge` / `j2LkgDraftHash`, dual stores).

#### Checkpointed j3 / j4 on j2 LKG (2026-09-14) — **PASS**

`EVENT_OS_CHECKPOINT_MODE=j3-j4` with `EVENT_OS_CHECKPOINT_LKG_DIR` pointing at the j2 evidence directory. Fresh `next dev` per phase; seating-v2 store migrated to `schemaVersion: 1` + explicit `platformStorePath` before boot.

| Phase | Result |
|---|---|
| j3 prerequisites | PASS — exact event/org, Publication 1 badge, layout hash prefix, LKG draft hash, no stale `result` query |
| j3 exports | PASS — JSON/PDF/PNG `READY · PERMISSION_SAFE`; durable `sourceHash` = publication plan hash; side-effect collection counts unchanged |
| j3 roles | PASS — Auditor read-only (sees authorised export list, no request form); privileged export route denied; Director cannot publish; System Admin has no seating authority |
| j4 UX / a11y | PASS — 360/768/1440, 200% zoom, reduced motion, keyboard/ARIA, no document overflow, hash wrap |
| j4 settlement | PASS — five consecutive publish-replay settlements (no successor editions); F5 does not resurrect consumed results; Runs tab current card; hard-blocker headline matches overview |

File-backed seating V2 focused unit suite (`apps/event-os/test/file-seating-v2-store.test.ts`): restart persistence, atomic write/rollback, single-writer lock (+ stale PID reclaim), corrupt/truncated fail-closed, platform identity drift fail-closed, sibling-store cleanup isolation — **8/8 PASS**.

Evidence: `/tmp/s075-p7-evidence/j3-j4-pass-latest/` (verdict `J3_J4_PASS`).

Deleted obsolete ad-hoc diagnostics: `s075-section-13-two-tab-diagnostic.spec.ts`, `s075-section-13-binding-banner-diagnostic.spec.ts`. Checkpoint runner refuses Railway/`PLAYWRIGHT_LIVE`; manifests and stores are OS-temp only; generated stores ignored in `.gitignore`.

Original long-j1 memory failures remain preserved. Rule Activate/Withdraw and Submit CAS product fixes remain.

**Verdict: NOT READY FOR CLAUDE** (Packet 7 gates + candidate SHA pending review; no deploy).
