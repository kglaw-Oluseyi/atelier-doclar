# MD-PR-S049 — EOS-S05A Action-Result Truth, Provenance and Focus

**Status:** CEO-visible final remediation authority  
**Required GitHub baseline:** `dd959d3fe3eb076b45991b29167557b45b890e68`  
**Current Event OS application SHA:** `abe2e20308990dc3f31e74f799c717903205d1a8`  
**Repository:** `kglaw-Oluseyi/atelier-doclar`, branch `main`  
**Railway:** `atelier-doclar` / `production` / `event-os` only

## 1. Scope

The Budget Studio engine is now functionally correct. Preserve the proven 360→350→340/335 calculation, immutable scenario lineage, durable result retrieval, stale-write protection and unchanged Event Brief.

Remediate four related action-result defects established by MD-PR-S048:

1. an idempotent Budget calculation replay returns the same record/hash but displays `Did data change: Yes`;
2. a stored scenario's displayed `generated` time changes when later scenarios are viewed, indicating render/current time rather than durable result provenance;
3. maker/checker and stale-write result panels leave keyboard focus on `<body>`; contradiction focus was not independently retested, so solve this through the shared result mechanism;
4. after a stale-write rejection, F5 can leave unrelated `Reload before retrying` controls disabled until a full URL navigation.

Do not reopen the Budget engine, discovery, consent, confidentiality, roadmap, change intelligence or evaluation architecture beyond regression tests required by these shared semantics.

## 2. Pre-flight

1. Verify local HEAD, origin/main and GitHub main all equal `dd959d3fe3eb076b45991b29167557b45b890e68`.
2. Verify a clean worktree except this authority document if newly placed at repository root.
3. Trace the canonical action-result schema/store/projection, Budget calculation action, stale-conflict handling, retry-disable logic and focus/receipt components before editing.
4. Reproduce each issue locally with a failing test.
5. Stop for baseline or overlapping-work discrepancy. Do not reset user work.

## 3. One truthful action-result contract

Use or extend the established action-result contract so every operation declares separately:

```ts
type ActionApplication = "APPLIED" | "NOT_APPLIED" | "REPLAYED";

type DurableMutationEffect = {
  application: ActionApplication;
  didDataChange: boolean;
  createdRecordIds: string[];
  updatedRecordIds: string[];
  reusedRecordIds: string[];
  retrySafe: boolean;
};
```

Adapt identifiers to existing branded types. Server/domain outcome is authoritative; React must not infer `didDataChange` from HTTP success, redirect, presence of a result ID or generic success status.

Truth table:

| Outcome | application | didDataChange |
|---|---|---|
| New calculation/scenario persisted | `APPLIED` | `true` |
| Identical idempotent replay, same result | `REPLAYED` | `false` |
| Validation/permission/stale conflict | `NOT_APPLIED` | `false` |
| Read-only retrieval/navigation | `NOT_APPLIED` or distinct read status | `false` |

For Budget replay, display:

```text
Existing calculation reused
No data changed. This request matches the stored scenario and calculation.
```

Do not emit `Succeeded · Did data change: Yes` for a replay. Preserve correlation/idempotency evidence secondarily.

Audit must distinguish original creation from replay. Replay may append an explicit correlated `budget.calculation.replayed` audit event if canonical audit policy permits, but it must not claim another scenario/calculation creation.

## 4. Durable generated time

Every Budget scenario/calculation result must expose a persisted immutable provenance time, for example:

- `calculationGeneratedAt` — when the immutable calculation result was durably created;
- optionally `scenarioCreatedAt` and `scenarioSupersededAt` as separate operational lifecycle facts.

The visible `Generated` value must come from the stored calculation result, not:

- `new Date()` during projection/render;
- the newest scenario on the page;
- page load/action time;
- a shared mutable variable;
- a fallback applied even when a persisted timestamp exists.

Requirements:

- 350 result retains its original generated time after 340/335 successors;
- refresh/reopen retains the same time;
- idempotent replay retains the original time;
- 340/335 successors have their own times;
- superseding a scenario does not alter its calculation-generated time;
- API/UI/audit/export projections use the correct semantic timestamp label;
- if legacy records genuinely lack the field, show `Generation time unavailable for this legacy result` or perform a documented deterministic additive backfill—never substitute current time.

Add persistence/schema migration only if required. It must be additive and replay-safe and must not rewrite calculation amounts, hashes or assumptions.

## 5. Shared focus-after-action mechanism

Implement one reusable focus target mechanism for action results. Do not patch only the contradiction component.

Each action result must carry a stable action scope and result target, equivalent to:

```ts
type ActionResultTarget = {
  actionScope: string;
  subjectId: string;
  targetId: string;
  correlationId: string;
  createdAt: string;
};
```

After a newly completed action or rejection is presented:

1. focus the action's result/error heading with `tabIndex={-1}`;
2. use the exact server-returned target, from a safe allowlisted mapping—not an arbitrary selector from URL input;
3. keep the focused heading visible below sticky navigation;
4. announce concise result once;
5. do not focus `<body>`;
6. do not steal focus again on ordinary refresh/reopen;
7. do not focus an unrelated stale receipt elsewhere on the page;
8. keyboard flow must continue logically from the result.

Apply to at minimum:

- contradiction resolution success;
- Budget calculation new/replayed result;
- maker/checker denial;
- stale-write conflict;
- section-local Discovery save where the shared component is used.

If the existing `sessionStorage shouldConsume` pattern is retained, scope and consume it atomically by correlation ID + route + subject + target. A previously consumed result must not refocus after F5.

## 6. Scope retry locks to the failed action

`Reload before retrying` must apply only to the action/record/version that encountered the stale conflict.

Create or enforce an explicit lock identity:

```ts
type RetryLock = {
  actionScope: string;
  subjectId: string;
  attemptedVersion: number;
  correlationId: string;
};
```

Requirements:

- stale approval of scenario 340 disables only retrying that stale 340 decision;
- unrelated scenario calculations/decisions remain enabled if their own prerequisites are current;
- F5 reloads canonical state and clears the obsolete client retry lock;
- full URL navigation is not required;
- query parameters or a global last-action result cannot disable every form sharing a page;
- a successful new action clears/replaces only its matching lock;
- server permission/version checks remain authoritative even after the UI unlocks;
- disabled controls explain the exact affected record/action;
- disabled controls use `not-allowed`; enabled actions use pointer;
- no stale rejected value is displayed as saved.

Do not solve by enabling all buttons after a timeout. Reconcile against freshly loaded canonical versions.

## 7. Focused automated tests

Add tests proving:

### Replay truth

- first 350 calculation: `APPLIED`, data changed true;
- identical 350 replay: `REPLAYED`, data changed false;
- same result ID/hash/generated time;
- receipt text contains no contradictory `Did data change: Yes`;
- no duplicate creation audit;
- changed 340 input remains a new APPLIED successor.

### Timestamp provenance

- persisted generated time survives refresh/hydration;
- 350 time does not change after 340 and 335 creation;
- replay does not change it;
- projections do not call/current-time fallback for persisted results;
- legacy missing-time behaviour is explicit and deterministic;
- Postgres and memory-store parity.

### Focus

- contradiction success focuses its result once;
- maker/checker denial focuses its denial result once;
- stale conflict focuses its error result once;
- Budget replay focuses the reused-result receipt once;
- active element is not body;
- ordinary F5 does not steal focus;
- unsafe target input cannot select arbitrary DOM elements.

### Retry locks

- stale scenario-340 approval disables only that action;
- unrelated controls remain available;
- F5 with refreshed canonical state clears obsolete lock;
- direct stale server retry still conflicts;
- action/result from another subject does not affect this page;
- multiple forms do not share a global disable state.

## 8. Focused Playwright

Use one synthetic Budget fixture with current brief 360 and existing or freshly created 350/340 successors.

### Journey A — replay truth and time

1. Open the immutable 350 calculation and record result ID/hash/generated time.
2. Submit an identical semantic replay.
3. Assert `No data changed`/`Existing calculation reused`.
4. Assert no `Did data change: Yes` appears in that action result.
5. Assert same result ID/hash/generated time.
6. Create or view a 340/335 successor.
7. Return to 350 after F5 and direct navigation.
8. Assert its generated time, hash and amounts remain identical.

### Journey B — focus

Using normal synthetic actions:

1. trigger a maker/checker denial and assert its heading receives visible focus;
2. trigger a stale-write conflict and assert its error heading receives visible focus;
3. refresh and assert focus is not stolen by the old result;
4. if a fresh unresolved contradiction fixture is readily available from test setup, resolve it and assert its result heading receives focus; do not require another broad discovery journey.

### Journey C — scoped stale lock

1. Hold scenario 340 decision in tab A.
2. supersede it with 335 in tab B.
3. submit stale 340 decision in tab A.
4. assert clean conflict and only the stale 340 retry is disabled.
5. assert an unrelated current control remains available.
6. F5 tab A.
7. assert canonical statuses load and obsolete page-wide disable state is gone.
8. assert stale 340 cannot be approved through direct/server retry.

Run locally and live. Desktop plus keyboard is sufficient; add 360px overflow assertion for the changed result panels. Do not rerun the full Budget arithmetic journey already passed.

## 9. Evaluation corpus and gates

Add executable cases only if needed to cover release invariants:

- replay declares no data change;
- immutable generated time;
- stale lock does not contaminate unrelated actions.

If the corpus changes, issue the next edition/hash and allow the prior PASS to become STALE until genuine complete execution. Do not restamp old results.

Run:

- focused MD-PR-S049 tests;
- changed Budget/action-result tests;
- evaluation/readiness/mutation tests;
- `pnpm typecheck`;
- `pnpm --filter @maison-doclar/shared-platform test`;
- `pnpm --filter @maison-doclar/event-os test`;
- `pnpm programme:validate`;
- `pnpm --filter @maison-doclar/event-os build`;
- `git diff --check`;
- focused Playwright locally;
- only changed-risk regression specs.

Report all first-run failures with root cause and correction.

## 10. Deploy and report

Commit by meaningful boundary, push normally and verify local HEAD = origin/main = GitHub main.

Deploy Event OS only. Do not deploy Control Tower. Verify exact application SHA, alive/ready, POSTGRES, migrations APPLIED, productionAuthorised false, layout stores READY, and current evaluation readiness. If corpus changes, prove fail-closed STALE before the new complete live pass.

Run focused live Playwright. Use synthetic data only. No external provider, communication, payment, booking or biometric action.

Update established EOS-S05A control records proportionally. Do not accept EOS-S05A, increment catalogue count or start EOS-S06.

Return one consolidated report containing:

1. SHAs/commits/files;
2. root cause for each of the four defects;
3. action-result truth table and Budget replay output;
4. persisted generated-time proof;
5. shared focus mechanism and results;
6. scoped retry-lock/F5 evidence;
7. tests and first-run failures;
8. GitHub/Railway/live evidence;
9. evaluation corpus/readiness if changed;
10. remaining debt and rollback;
11. confirmations: Claude not run, EOS-S05A unaccepted, EOS-S06 unstarted, Control Tower not deployed.

Stop for AI CTO review.

End exactly:

`EOS-S05A MD-PR-S049 ACTION-RESULT TRUTH AND FOCUS COMPLETE — READY FOR FINAL AI CTO REVIEW AND TARGETED CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

