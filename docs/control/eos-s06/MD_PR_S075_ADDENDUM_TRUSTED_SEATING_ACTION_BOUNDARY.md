# MD-PR-S075 ADDENDUM — TRUSTED SEATING ACTION BOUNDARY

## Status

**PROPOSED CONSOLIDATED REMEDIATION AUTHORITY — NOT IMPLEMENTATION AUTHORITY UNTIL RATIFIED BY THE MAISON DOCLAR AI CTO**

Parent authority:

`docs/control/eos-s06/MD_PR_S075_EOS_S06_V2_TABLE_IDENTITY_COMPILER_AND_FEASIBILITY_TRUTH.md`

Parent SHA-256, which must remain unchanged:

`faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0`

Related ratified addenda, which remain in force and must not be weakened:

- `MD_PR_S075_ADDENDUM_SOLVER_CLAIM_HONESTY.md`
- `MD_PR_S075_ADDENDUM_CANONICAL_CURRENT_LAYOUT_AUTHORITY.md`

Known application/repository baseline before this addendum:

`f4862f9f9e2b8759e4991436a40a3873f52993c2`

Known live Event OS SHA before this addendum:

`f4862f9f9e2b8759e4991436a40a3873f52993c2`

The deleted third-party Cursor packet is not authority and must not be reconstructed, committed or executed. Its read-only architecture review may be used as diagnostic input only. This document is the sole implementation authority for the trusted Seating action boundary.

---

# 0. Exact objective and ratification

## 0.1 Objective

Replace every client-controlled Seating action scope with one server-derived, canonically loaded and independently authorised event context.

The correction must close the complete boundary in one candidate:

1. route/action scope integrity;
2. canonical event, organisation and client derivation;
3. one applicable assignment rather than privilege union;
4. resource ownership under the trusted scope;
5. required version/hash concurrency preconditions;
6. audit, idempotency, action-result and redirect correlation;
7. fail-closed repository scope;
8. layout-binding lookup inside the command/domain boundary;
9. Verify-as authority;
10. final local and live Section 13 proof.

This is not another symptom patch. Cursor must inventory the whole Seating action surface first, implement one reusable boundary, migrate every Seating action to it, and deploy only once after all local gates pass.

## 0.2 Ratification wording

> I RATIFY MD-PR-S075 ADDENDUM TRUSTED SEATING ACTION BOUNDARY AS THE SOLE NARROW AUTHORITY TO REPLACE CLIENT-CONTROLLED EOS-S06 ACTION SCOPE WITH ONE SERVER-DERIVED, CANONICALLY LOADED AND INDEPENDENTLY AUTHORISED EVENT CONTEXT. CURSOR SHALL EXECUTE PACKETS 1–10 IN ORDER, PRESERVE AND RECONCILE THE EXISTING UNCOMMITTED STUDIO CAS WORK, REMOVE CLIENT AUTHORITY FROM FORMDATA, DERIVE ORGANISATION AND CLIENT FROM THE CANONICAL EVENT, RESOLVE ONE APPLICABLE ASSIGNMENT, RELOAD EVERY RESOURCE UNDER THAT TRUSTED SCOPE, REQUIRE ALL PRESCRIBED VERSION AND HASH PRECONDITIONS, BIND AUDIT IDEMPOTENCY ACTION RESULTS AND REDIRECTS TO ONE CORRELATION AND TRUSTED EVENT, RUN FOCUSED TESTS PER PACKET AND COMPLETE GATES ONCE ON THE CONSOLIDATED CANDIDATE, DEPLOY EVENT OS ONLY ONCE, COMPLETE THE FOUR SECTION 13 JOURNEYS LOCALLY AND LIVE, AND STOP FOR AI CTO REVIEW. CURSOR SHALL NOT USE A FULL PLATFORM SNAPSHOT ON THE ACTION PATH, DEPLOY PARTIAL SECURITY STAGES, MAKE CONCURRENCY PRECONDITIONS OPTIONAL, UNION PRIVILEGES ACROSS ASSIGNMENTS, USE DIRECT SQL, WEAKEN EXISTING DOMAIN OR VALIDATOR RULES, RUN CLAUDE, ACCEPT EOS-S06, DEPLOY CONTROL TOWER, OR START EOS-S07.

## 0.3 Execution discipline

- Execute Packets 1–10 in order.
- Automatically continue only when the packet exit gate passes.
- Stop at every stated hard stop.
- Run focused tests after each implementation packet.
- Run complete unit/type/build/browser gates only once after the consolidated correction is stable.
- Do not push or deploy intermediate security stages.
- Do not increase existing action or browser timeouts.
- Do not let a stale banner, loose locator or accumulated fixture satisfy a new action.
- Preserve every first-run failure and correction.

## 0.4 Non-negotiable retained truth

Do not reopen or weaken:

- canonical table-token conversion;
- predicate-specific authoring;
- solver-claim honesty and bounded proof classification;
- independent validation;
- run-reuse identity and historic-run immutability;
- physical/declared capacity truth;
- `s06-eval-v4` identity and 49-case register;
- explicit Seating Layout Binding;
- maker/checker rules;
- last-known-good publication behavior;
- permission-safe export and Auditor disclosure;
- S073 action-settlement targets.

---

# 1. Pre-flight: preserve evidence and establish the complete blast radius

No application edit in this packet.

## 1.1 Baseline and dirty-worktree preservation

1. Fetch without merging.
2. Resolve local HEAD, `origin/main` and GitHub `main`.
3. Require baseline ancestry through `f4862f9f9e2b8759e4991436a40a3873f52993c2`.
4. Record live Event OS SHA and safety/readiness state.
5. Record `git status --short` and `git diff --stat`.
6. Save a reversible patch of every uncommitted tracked change and an inventory/hash of every untracked file. Do not print secrets.
7. Do not discard or overwrite the existing command-layer Studio CAS correction.

The known dirty worktree includes modifications around:

- `apps/event-os/src/server/seating-actions.ts`
- `apps/event-os/src/server/protection-form-action.ts`
- `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx`
- `packages/shared-platform/src/seating-v2-command-service.ts`
- `packages/shared-platform/test/seating-v2-command-path.test.ts`
- Section 13 Playwright helpers/specifications.

Re-resolve the actual list. The list above is evidence, not permission to ignore additional files.

Stop on remote divergence, unexplained tracked changes, secrets in test files, or an inability to preserve the existing work reversibly.

## 1.2 Action inventory generated from the repository

Do not assume a fixed count. Enumerate every exported Seating Server Action and every page/component that renders or binds it.

Include at minimum:

- freeze inputs;
- rule create/activate/withdraw;
- reservation create/activate/withdraw/supersede/release;
- run launch/cancel/adopt;
- Studio/manual preview/apply/assign-unseated/lock/unlock where present;
- plan submit/recall;
- specialist review;
- approval;
- publication;
- export request/retrieval controls;
- layout-binding propose/activate/withdraw;
- S06 evaluation;
- Verify-as.

For every action record:

| Field | Required evidence |
|---|---|
| Renderer | exact server page/component |
| Route scope | source of rendered `eventId` |
| Submitted scope | every FormData authority-like field |
| Actor | where authentication is resolved |
| Assignment | selection and fallback rule |
| Permission | outer and domain guard |
| Resources | IDs accepted and canonical reloads |
| Preconditions | required version/hash/current-pointer checks |
| Audit | event/org/correlation source |
| Idempotency | partition and request-hash source |
| Result | event/org/path/correlation source |
| Redirect | target source |

Search imports rather than assuming the Seating page is the only renderer.

## 1.3 Confirmed architecture findings to verify

Confirm or contradict with exact repository citations:

1. page render uses route `params.eventId`;
2. actions currently accept scope from FormData;
3. canonical event is not consistently loaded on the write path;
4. `organisationId` is accepted instead of derived;
5. `clientId` is absent from mutation scope;
6. assignment fallback can select a client-scoped assignment for another client;
7. command authorization may union multiple assignments;
8. audit/idempotency/result/redirect can use submitted scope;
9. some commands render but do not require version/hash preconditions;
10. scoped stores contain an unscoped fall-through;
11. layout-binding proposal performs an app-layer snapshot lookup;
12. Verify-as does not establish full event authority;
13. authentication may be resolved more than once, producing different correlation IDs.

Do not repeat the lost local incident as proven durable evidence. Its local store no longer exists. Base the remediation on code, reproducible tests and new controlled evidence.

## 1.4 Verify-as decision

Read the accepted Verify-as contract and existing permission catalogue.

Required policy:

- available only when `productionAuthorised:false`, fixtures are enabled, and the explicit Verify-as flag is enabled;
- symbolic roles are allowlisted;
- the current actor must possess an explicit controller authority;
- the bound event must be visible/authorised to that actor;
- System Administrator, Auditor, Planner, Director and Reviewer must not acquire CEO impersonation merely because the feature flag is on;
- production with the flag unset must expose no control and accept no action.

If an existing explicit controller permission exists, reuse it. If none exists, stop for AI CTO decision before inventing a permission identifier. Do not use `seating.view` as sufficient authority to impersonate another role.

## 1.5 Pre-flight record

Create:

`docs/control/eos-s06/MD_PR_S075_TRUSTED_ACTION_BOUNDARY_FINDING.md`

Record the action inventory, confirmed blast radius, Verify-as contract, known dirty-worktree reconciliation and rejected hypotheses.

### Packet 1 exit gate

Complete action inventory; exact code citations; existing changes safely preserved; no product edit; no unresolved conflict with accepted authority except any explicitly reported Verify-as permission decision.

---

# 2. Specify the single trusted boundary and tests before implementation

## 2.1 Authority model

For an event-scoped Seating mutation, the trusted scope is:

```ts
export type TrustedSeatingEventScope = Readonly<{
  organisationId: OrganisationId;
  clientId: ClientId;
  eventId: EventId;
  assignmentId: AssignmentId;
  roleKey: SystemRoleKey;
  scopePath: `/app/events/${string}/seating`;
}>;
```

Every field is server-derived:

- `eventId`: server-rendered route value bound into the Server Action;
- `organisationId` and `clientId`: canonical event record;
- `assignmentId` and `roleKey`: one active assignment that covers that exact event;
- `scopePath`: derived from the canonical event ID.

Bound action arguments provide integrity against simple form-field substitution. They are not authorization. Every call must reload the event and re-authorize because a bound action reference can be replayed after permissions change.

## 2.2 Assignment resolution

Use the accepted scope hierarchy:

1. active exact event-scoped assignment;
2. otherwise active matching-client assignment;
3. otherwise active organisation-scoped assignment only when its active role is explicitly `organisationWide`;
4. otherwise deny without disclosing event existence.

At the highest applicable specificity, authority comes from exactly one assignment—not the union of every assignment the person holds.

Do not choose by privilege strength. Do not select an arbitrary first row. Reuse a canonical existing resolver if it returns the actual governing assignment. If equally specific conflicting assignments remain and the accepted policy cannot select one, fail closed and report `AUTHORITY_AMBIGUOUS` through an existing safe error category rather than inventing combined privilege.

The command/domain service must independently reload the named assignment and verify:

- active status and time window;
- same person;
- same organisation;
- exact event or matching client or legitimately organisation-wide role;
- required permission under that one assignment.

## 2.3 Bounded canonical event load

Add or reuse a bounded repository/service method that loads one event by ID for authorization.

Prohibited:

```ts
runtime.store.snapshot().events.find(...)
```

Required characteristics:

- one bounded event lookup;
- no full platform snapshot;
- organisation/client values taken only from the returned event;
- NOT_FOUND-equivalent denial for absent or invisible events;
- no cross-tenant existence disclosure;
- local memory/file and PostgreSQL implementations follow the same policy.

## 2.4 FormData policy

Remove `organisationId`, `eventId` and `assignmentId` as authority inputs from every Seating command schema and envelope builder.

Keep only non-authority resource references, command input and concurrency/idempotency preconditions.

For defence-in-depth and cached-form transition, reserve the legacy field names:

- absent: normal;
- present and equal to canonical scope: tolerated but ignored;
- present and conflicting: `FORBIDDEN`/`NOT_APPLIED`, denial recorded under the canonical event, redirect to the canonical route;
- never use them to choose the event, organisation, assignment, audit partition, idempotency partition or redirect.

This tripwire may remain as a permanent compatibility guard. It is not authority and creates no planned removal cycle.

## 2.5 Action-runner contract

Resolve authentication once per request and carry the same actor/correlation through:

```ts
type TrustedSeatingActionContext = Readonly<{
  actor: ActorContext;
  event: EventRecord;
  scope: TrustedSeatingEventScope;
  correlationId: CorrelationId;
}>;

type TrustedSeatingActionInput<TParsed> = Readonly<{
  boundEventId: EventId;
  permission: PermissionKey;
  actionType: string;
  formData: FormData;
  parse: (formData: FormData) => ParseResult<TParsed>;
  execute: (
    context: TrustedSeatingActionContext,
    parsed: TParsed,
  ) => Promise<ActionMutationResult>;
}>;
```

Required order:

1. authenticate once;
2. bounded-load canonical event from `boundEventId`;
3. derive organisation/client;
4. resolve and authorize one assignment;
5. evaluate legacy-scope tripwire;
6. parse non-authority inputs;
7. execute domain command using a trusted envelope;
8. write audit/idempotency/result using the same context/correlation;
9. redirect only to the canonical path.

Expected validation stays in-page only where the existing truthful form contract requires it. Authority denial must not leak validation or resource details.

If the canonical event no longer exists, return a generic session-bound NOT_FOUND outcome and navigate to `/app/events`. Do not fabricate organisation/event authority solely to write an event-scoped result.

## 2.6 Idempotency compatibility

Adding derived `clientId` must not accidentally invalidate existing idempotency receipts.

Define one explicit stable request-hash projection. Do not spread an evolving envelope object into the hash.

The projection must retain the exact legacy identity fields that were previously hashed, using their canonical server-derived values. Add `clientId` to authorization scope, not retroactively to historic request identity, unless a separately versioned idempotency contract is authorised.

Prove normal pre/post-remediation requests generate the same request hash when their canonical org/event/assignment and command inputs are the same.

Changed event, assignment, resource, version, content hash, action or idempotency key must not replay another command.

## 2.7 Tests written red first

Add table-driven tests covering the complete action inventory. At minimum:

1. Event A page plus injected Event B scope field;
2. Event B valid resource submitted through Event A-bound action;
3. foreign organisation resource;
4. Client C1 assignment against Client C2 event;
5. exact Event A assignment against Event B;
6. matching-client assignment against its event;
7. legitimately organisation-wide role against an event;
8. non-organisation-wide role stored without event/client scope;
9. narrow event assignment plus broad organisation assignment;
10. equally specific conflicting assignments;
11. revoked/expired assignment replaying a previously rendered action;
12. nonexistent event UUID;
13. audit/event/result/redirect correlation on success;
14. the same correlation on denial;
15. idempotency replay under changed submitted scope;
16. Verify-as actor and event boundaries;
17. no foreign-record existence leakage.

These tests must fail for the intended pre-remediation reason. Do not use an uncommitted throwaway test as the only proof.

### Packet 2 exit gate

One reviewed boundary contract; red tests demonstrate the actual defects; no implementation yet; no ambiguity about assignment or Verify-as authority.

---

# 3. Implement canonical scope and migrate every Seating action

## 3.1 Server-only boundary

Implement a server-only module, preferably:

`apps/event-os/src/server/trusted-seating-action-context.ts`

It must use the bounded event loader and must not import client code or load a full snapshot.

Responsibilities:

- receive the bound route event ID;
- authenticate exactly once;
- load the canonical event;
- derive org/client;
- run the same visibility rule as the read path;
- resolve exactly one applicable assignment;
- authorize with populated org/client/event/resource scope;
- create the immutable trusted envelope and canonical path;
- retain one correlation.

## 3.2 Bound Server Actions

Every event-scoped Seating action takes `boundEventId` as its first bound argument. `useActionState` then receives the resulting `(previousState, formData)` function.

Illustrative shape:

```ts
export async function applySeatingChangeAction(
  boundEventId: EventId,
  previous: ProtectionFormState,
  formData: FormData,
): Promise<ProtectionFormState> {
  return runTrustedSeatingAction({
    boundEventId,
    previous,
    formData,
    permission: "seating.plan.edit",
    actionType: "seating.plan.change.apply",
    parse: parseApplyChange,
    execute: ({ actor, envelope }, command) =>
      runtime.service.seatingV2Commands().applyManual(actor, envelope, command),
  });
}
```

Bind in the server-rendered page after the canonical event is loaded:

```tsx
const actions = {
  applyChange: applySeatingChangeAction.bind(null, event.id),
  submitPlan: submitSeatingPlanAction.bind(null, event.id),
  // every other event-scoped Seating action
} as const;
```

Do not treat binding as authorization. The runner must re-run canonical load and authorization on every invocation.

## 3.3 Shared form lifecycle

If `runProtectionFormAction` must change, make the new trusted-context behavior additive and opt-in. Protection/Dossier behavior must remain unchanged.

Do not let the generic runner reread `eventId`/`organisationId` from FormData after a trusted context exists.

For trusted Seating calls:

- success result event/org/path/correlation comes only from the trusted context;
- replay uses a new action-result correlation but no second durable domain write;
- conflict/denial uses the trusted context;
- unexpected failure exposes only generic public detail and the same correlation;
- redirect uses trusted `scopePath`;
- consume/focus lifecycle remains unchanged.

Do not call `requireActor()` again inside execute or envelope construction.

## 3.4 Trusted envelope

Construct the command envelope from:

- canonical organisation ID;
- canonical client ID for authorization;
- canonical event ID;
- selected assignment ID;
- client-supplied idempotency key;
- required version/hash preconditions.

The domain command service reloads the assignment and authorizes using only that assignment. Passing an assignment ID is not itself authority.

## 3.5 Complete action migration

Migrate every action found in Packet 1. Do not leave a legacy action using submitted scope because its browser control is currently hidden.

For actions with branch-dependent inner permissions—such as HARD-rule activation, specialist domain review or recall—use a safe outer permission to establish basic scope, then retain the stronger command-domain decision. Do not replace the inner decision with a weaker outer guard.

## 3.6 Verify-as

Apply the Packet 1 accepted Verify-as authority:

- bound event;
- canonical reload;
- current actor controller permission;
- explicit environment triple gate;
- allowlisted target symbolic role;
- canonical audit/result/redirect;
- no role switch for an invisible event;
- no availability when the flag is off.

### Packet 3 focused gates

- complete action-inventory boundary table tests;
- trusted-scope unit tests;
- action-result correlation tests;
- Verify-as focused tests;
- Event OS typecheck;
- one valid rule action, one valid Studio action, one denial action in local browser.

### Packet 3 hard stops

- any action still derives authority from FormData;
- any use of full snapshot on the new boundary;
- different correlation IDs across domain audit and action result;
- shared Protection/Dossier behavior changes;
- Verify-as lacks an accepted controller authority.

---

# 4. Enforce resource ownership and fail-closed repository scope

## 4.1 Canonical ownership helper

Create one command-service helper for scoped resources:

```ts
private async requireOwned<T extends {
  organisationId: OrganisationId;
  eventId: EventId;
}>(
  tx: SeatingV2Transaction,
  collection: SeatingV2Collection,
  id: string,
  scope: SeatingV2Scope,
  publicLabel: string,
): Promise<T> {
  const row = await tx.load<T>(collection, id, scope);
  if (!row) {
    throw new PlatformError("NOT_FOUND", `${publicLabel} was not found`);
  }
  if (row.organisationId !== scope.organisationId || row.eventId !== scope.eventId) {
    throw new PlatformError("SCOPE_MISMATCH", `${publicLabel} does not belong to this event`);
  }
  return row;
}
```

Adapt names/types to actual schemas. `SCOPE_MISMATCH` may be used only if it is an existing `PlatformError` code. Otherwise preserve the established safe NOT_FOUND category. Do not add an invalid error code.

Use this for every scoped resource load, while preserving state-machine error categories after successful ownership resolution.

## 4.2 Root-creating commands

Rule creation, reservation creation, freeze and other root writes may proceed only after the trusted context has canonically loaded the event. The command service must not accept arbitrary org/event values from other callers.

If command services remain callable outside Event OS—for evaluation/tests—require a trusted server-composed actor/scope object or independently reload/assert the event through injected dependencies. Do not create a boolean such as `trusted: true` that callers can manufacture.

## 4.3 Fail-closed store scope

Classify collections explicitly:

- event-scoped: require organisation and event;
- organisation-scoped: require organisation;
- intentionally unscoped: only if an accepted contract names one.

Memory and PostgreSQL stores must share the classification. Remove query branches that drop tenant/event predicates when required scope is absent.

Evaluation runs/results that are organisation-scoped must remain valid and must not be forced into event scope.

Tighten scope predicates so a scoped lookup cannot accept a row missing the required organisation/event field.

## 4.4 Adversarial ownership matrix

For each applicable resource type, prove foreign IDs fail safely:

- plan edition;
- run;
- input package;
- compiled request;
- rule edition;
- reservation edition;
- layout binding;
- layout publication;
- specialist review requirement;
- plan publication;
- export source.

Require no foreign existence disclosure, no mutation, no audit under the foreign event, and no idempotency receipt under the foreign event.

### Packet 4 exit gate

All scoped loads are deliberate and fail closed; root writes require a canonical event; org-only evaluation remains functional; focused memory/PostgreSQL tests pass.

---

# 5. Make concurrency preconditions mandatory and reconcile existing CAS work

## 5.1 Preserve and inspect existing work

Review the existing uncommitted CAS implementation before editing. Record what it already does correctly:

- current-working-pointer comparison;
- expected version/hash comparison;
- `VERSION_CONFLICT` for stale state;
- `VALIDATION_FAILED` for occupied/invalid target;
- scoped lock only for the failed Studio Apply control;
- vacant-seat operator projection.

Do not replace correct work merely to match this document’s illustrative shape.

## 5.2 Required preconditions

For these material mutations, absence of required concurrency data is validation failure—not permission to proceed:

| Command | Required precondition |
|---|---|
| Studio apply / assign-unseated / lock / unlock | current working edition ID, version and content hash; preview identity/hash where the accepted preview contract requires it |
| Submit plan | current working edition ID, version and content hash plus current-hash validation |
| Activate/withdraw rule | rule edition ID, version and content hash |
| Activate/withdraw/supersede/release reservation | reservation edition ID, version and content hash |
| Activate/withdraw layout binding | binding ID and version; exact bound publication/hash revalidated |
| Specialist review | plan edition ID, version, exact content hash, exact implicated requirement/domain |
| Approval | edition ID, version and exact approved hash |
| Publication | edition ID, version and exact approved hash |
| Recall | retain existing version/hash safeguards |

Idempotent replay must be detected using its exact stored request identity before a mutation’s own successful version increment is mistaken for a stale retry. A different payload under the same key remains `IDEMPOTENCY_CONFLICT`.

## 5.3 Submit/validation reconciliation

The current-hash validation selector remains authoritative:

- choose validation matching the current revision content hash;
- timestamp order may display history but cannot override hash identity;
- Submit requires that matching validation, correct working pointer, version and content hash;
- missing/mismatched preconditions are not silently tolerated;
- no fixture-clock comparison determines authority.

Stop if mandatory version/hash enforcement conflicts with accepted publication or validation identity in a way this rule does not resolve.

## 5.4 Two-tab proof

Required exact sequence:

1. Tabs A and B load the same working edition/version/hash.
2. Tab A applies one valid vacant MOVE.
3. Tab B submits its stale edition/version/hash and receives `VERSION_CONFLICT`.
4. Only Tab B’s Studio Apply control locks.
5. Freeze and unrelated permitted controls remain usable.
6. Tab B reloads canonical URL without the result query.
7. Tab B shows Tab A’s durable successor edition/hash.
8. Tab B performs a new valid vacant MOVE and succeeds.
9. An occupied-seat target returns `VALIDATION_FAILED`, not `VERSION_CONFLICT`.

Every step requires one POST, fresh result, matching correlation where applicable and durable reload.

### Packet 5 exit gate

Mandatory preconditions cannot be removed to bypass CAS; exact two-tab unit and isolated browser journeys pass; existing current-hash submit behavior remains correct.

---

# 6. Move duplicated authority decisions behind the domain boundary

## 6.1 Layout-binding proposal

Remove app-layer full-snapshot/filter logic from layout-binding proposal.

The action submits only the governed `layoutPublicationId` and reason. The command service, under the trusted scope and transaction, reloads and verifies:

- same organisation/event;
- publication is CURRENT for its lineage;
- exact publication/content hash;
- layout lineage;
- no conflicting active binding;
- maker/checker and permission.

The action must not derive `layoutId` or content hash from a snapshot and pass them as truth.

## 6.2 Shared read/write authority

Where read and write paths select assignments or visibility differently, converge them on one pure policy decision without changing other slices.

The shared primitive may be additive, but only Seating adopts it under this authority. Protection, Risk and Dossier must retain existing behavior unless a separate authority is issued.

## 6.3 No foreign-key or orphan-data expansion

Do not add event foreign keys, inspect production tables through a new tunnel, delete or repair orphan rows, or amend append-only audits under this pack.

Record possible historic orphan reconciliation as retained debt for a separately authorised read-only investigation. It is not required to correct the forward action boundary.

### Packet 6 exit gate

No app-layer snapshot authority remains; memory/PostgreSQL domain behavior agrees; unrelated slices unchanged; focused binding and performance tests pass.

---

# 7. Credit-efficient consolidated local gate

## 7.1 Focused progression

During Packets 3–6 use this escalation only:

1. smallest new unit test;
2. containing test file;
3. one isolated browser journey;
4. changed-risk group.

Do not run complete suites after every edit.

## 7.2 Consolidated full gates

After all implementation packets are stable, run once on the same candidate worktree:

- TypeScript typecheck;
- complete shared-platform unit suite;
- complete Event OS unit suite;
- `pnpm programme:validate`;
- Event OS production build;
- `git diff --check`;
- focused S075 table identity, oracle, replay, capacity, evaluation-v4 and layout-binding suites;
- action-result/focus regression;
- permission and assignment regression;
- relevant S05 downstream-layout regression.

Run browser journeys in four isolated local groups with a fresh development server/file-store per group:

1. Studio/concurrency;
2. Reviewer → Director → CEO;
3. Exports/roles;
4. UX/accessibility/settlement.

Report them separately. Do not describe them as one combined-suite pass.

Production-mode local Playwright may remain not executed when `DATABASE_URL` is unavailable; production build must still pass. Never connect local defaults to Railway.

## 7.3 Environment guard

Each local browser command must explicitly unset live-only variables and assert loopback base URL before sign-in. Terminate its own Playwright/Next process group afterward. Do not terminate unrelated machine services.

## 7.4 Test-helper policy

One reviewed settlement helper may:

- submit exactly one scoped mutation form;
- observe exactly one mutation POST;
- follow `location` or `x-action-redirect`;
- require a new result UUID;
- require matching banner correlation;
- reload canonical state for durability.

Route/page authorization denials must use a separate helper that proves denial view, absence of protected content/forms, no mutation POST and no durable change. Do not require an action-result banner for a GET-level denial.

No `.first()`, `.last()`, `nth()` or loose state regex may select authority-bearing records.

## 7.5 Helper disposition and commits

Review all untracked Section 13 and Packet G helpers.

Commit only deterministic helpers/specs that:

- contain no secret, cookie, token or private connection detail;
- use uniquely labelled synthetic records;
- have explicit local/live modes;
- cannot reach Railway under local defaults;
- avoid transient hard-coded live UUIDs;
- require fresh correlation and exact resource identity;
- are repeat-safe.

Delete obsolete/ad-hoc helpers after preserving their results in evidence.

Commit coherent phases only after their focused tests pass. Before the final candidate:

1. worktree clean;
2. fetch;
3. confirm candidate is a descendant of `origin/main`;
4. fast-forward push only;
5. local HEAD = `origin/main` = GitHub `main`.

### Packet 7 hard stops

- unexplained full-gate failure;
- any test needs a security/domain assertion weakened;
- any local browser run reaches Railway;
- dirty worktree or remote divergence;
- memory pressure is misreported as a combined pass.

---

# 8. One Event OS-only deployment and live trusted-boundary proof

## 8.1 Deploy once

Set `EVENT_OS_GIT_SHA` to the exact consolidated application candidate without printing secrets. Deploy only:

`atelier-doclar / production / event-os`

Do not deploy Control Tower. Do not deploy a later documentation-only SHA.

Verify:

- deployment SUCCESS;
- exact deployed SHA;
- alive/ready;
- POSTGRES/APPLIED;
- `productionAuthorised:false`;
- providers INACTIVE;
- S05A/S05B unchanged;
- current S06 v4 compatibility before any optional rerun.

## 8.2 Live adversarial scope matrix

Using synthetic fixtures and separate authenticated contexts, prove:

1. Event A-bound form with injected Event B/foreign organisation/foreign assignment fields is denied or ignored according to the tripwire contract; audit/result/redirect remain A.
2. Valid Event B resource IDs through Event A-bound action are NOT_FOUND-equivalent with no existence leakage.
3. client-scoped assignment for Client C1 cannot mutate Client C2 event.
4. event-scoped assignment cannot mutate another event.
5. legitimately organisation-wide CEO authority works where accepted.
6. narrow event assignment plus broad assignment does not union privileges.
7. revoked/expired assignment cannot replay a captured action.
8. nonexistent event cannot create root Seating rows.
9. Verify-as is unavailable on production when its flag is off.

Do not expose or paste access tokens. Do not use direct SQL.

## 8.3 Live action/result integrity

For a success, replay, validation rejection, stale conflict, permission denial and route-level denial, prove the appropriate lifecycle:

- one actor resolution;
- command/audit/action result share the expected correlation where a mutation action result exists;
- canonical organisation/event partition;
- canonical redirect;
- no stale banner;
- durable state matches `didDataChange`.

## 8.4 Final Section 13 journeys

Complete locally and live on the final SHA:

1. Studio and exact two-tab CAS sequence;
2. Reviewer → Director → CEO exact-hash governance and publication/replay;
3. JSON/PDF/PNG retrieval, omission and role boundaries;
4. responsive/accessibility, five settlement repetitions, Runs identity and hard-blocker headline.

Do not approve or publish a known-invalid plan.

## 8.5 Evaluation

Run the unchanged `s06-eval-v4` once on the final deployed application SHA if the existing pass is not application-SHA-bound. Do not change its edition, contract, 49-case register, corpus hash or configuration hash merely because the application changed.

Require 49 persisted, zero failed, zero-tolerance clear and durable release-ready state after reload. Planner, Reviewer, Director, Auditor and Administrator remain unable to run it.

### Packet 8 exit gate

All trusted-boundary adversarial cases and all four Section 13 journeys pass locally and live on one final SHA. No action exceeds 30 seconds. No 5xx, false success, cross-scope write, correlation divergence, stale banner or silent conflict remains.

Otherwise stop before documentation freeze.

---

# 9. Documentation and recovery

Update the appropriate S06 implementation/build/current-state/evidence/authority/compatibility/traceability/debt records. Do not create acceptance.

Record:

- parent and addendum hashes;
- baseline, application, deployed and docs SHAs;
- full action inventory;
- trusted-boundary contract;
- canonical event/org/client derivation;
- assignment resolution and privilege-union removal;
- resource ownership matrix;
- required concurrency preconditions;
- audit/idempotency/result/redirect correlation;
- Verify-as treatment;
- no-full-snapshot proof;
- local and live gates;
- every first-run failure;
- helper disposition;
- retained orphan/FK investigation debt;
- rollback and forward recovery;
- explicit independent-verification stop.

Rollback:

- redeploy the exact previous Event OS application SHA `f4862f9f9e2b8759e4991436a40a3873f52993c2` if required;
- document that rollback restores the known client-controlled action-scope defects;
- do not down-migrate or rewrite durable history.

Forward recovery is the trusted-boundary candidate and canonical governed workflows—not SQL repair.

### Packet 9 exit gate

Control records agree; worktree clean; local/origin/GitHub parity exact; live remains on application SHA; no acceptance record; final evidence identifies every remaining NOT VERIFIED item.

---

# 10. Final report and stop

Report in this order:

1. starting/application/deployed/docs SHAs and parity;
2. parent/addendum paths and SHA-256;
3. complete action inventory;
4. confirmed root cause and blast radius;
5. files and commits by packet;
6. trusted route/event/org/client contract;
7. assignment-resolution and privilege-union treatment;
8. FormData authority removal/tripwire;
9. resource ownership and fail-closed stores;
10. mandatory concurrency/version/hash matrix;
11. audit/idempotency/action-result/redirect correlation;
12. Verify-as posture;
13. app-layer snapshot removal and performance;
14. focused and complete local gates;
15. every first-run failure;
16. Railway deployment and safety state;
17. live adversarial scope matrix;
18. four completed Section 13 journeys;
19. evaluation-v4 final-SHA evidence;
20. helper disposition;
21. retained debt;
22. rollback/forward recovery;
23. explicit Claude/acceptance/EOS-S07 stop.

Headline only if every non-independent gate passes:

`READY FOR FOCUSED INDEPENDENT CLAUDE RE-VERIFICATION`

Otherwise:

`NOT READY FOR CLAUDE`

End exactly:

`EOS-S06 MD-PR-S075 TRUSTED SEATING ACTION BOUNDARY REMEDIATION COMPLETE — READY FOR FOCUSED INDEPENDENT CLAUDE RE-VERIFICATION ONLY IF EVERY NON-INDEPENDENT GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.`

---

# Global prohibited shortcuts and hard stops

Cursor must not:

- trust FormData for organisation, client, event, assignment, audit partition, idempotency partition or redirect;
- treat a bound Server Action argument as authorization;
- use a full platform snapshot on an event-scoped mutation path;
- authorize from the union of multiple assignments;
- allow removal of required version/hash fields to bypass concurrency checks;
- choose an arbitrary assignment or resource by array/database order;
- alter applied migrations or add schema work not authorised here;
- inspect or repair production data through direct SQL;
- alter append-only audit history;
- special-case fixture identities;
- weaken maker/checker, table binding, solver, validator, oracle, capacity, replay, publication or disclosure rules;
- restamp evaluation history;
- deploy intermediate security stages;
- repeatedly run complete gates after small edits;
- increase timeouts;
- allow an old banner or route-level denial to satisfy a mutation result;
- commit access tokens, cookies, secrets, private URLs or transient live identifiers;
- deploy Control Tower;
- run Claude;
- accept EOS-S06;
- start EOS-S07.
