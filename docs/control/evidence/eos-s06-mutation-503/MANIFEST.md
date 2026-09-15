# EOS-S06 — Focused Mutation 503 Investigation and Remediation

**Not acceptance.** EOS-S06 remains unaccepted. CI remains mandatory. EOS-S07 remains unstarted.  
**Prior:** [`../eos-s06-security-remediation-3/MANIFEST.md`](../eos-s06-security-remediation-3/MANIFEST.md)

## Identities

| Role | Value |
|------|-------|
| Start repository/docs HEAD | `926da7a6bf09493639de4cfb952e5fe69183a00a` |
| Start deployed Event OS | `c1be4a2cbb73a1640d0ac8f48212e15db269197f` |
| Start Railway deployment | `8514cb9f-58b4-4e89-9a77-8fbb02240d06` |
| Application commit / ending HEAD | `e4c4a8ff92a00ca4ab8f139ab82ef91157262963` |
| Ending Railway event-os deployment | `5f64c717-0d0f-42f4-b1fa-28fd3f384804` SUCCESS |
| Live origin | `https://event-os-production-bc8d.up.railway.app` |
| Control Tower | **not redeployed** (latest listed SKIPPED) |

## Claude’s 503 report (controlling observations)

Planner mutation actions intermittently returned HTTP 503 and blanked the page:

1. Alpha One — propose seating layout binding: 3/3 POST 503; follow-up RSC GET 503; blank; reload no change.
2. S073 seating — propose layout binding: initial POST 503; follow-up succeeded; draft persisted.
3. S073 seating — create materially different seating rule: 2/2 blanked; network showed POST 503 once alongside 200; reload no new rule.

Overall: 4/6 mutation attempts failed across two events and two action types. Reads/System remained healthy. No observed corruption or duplicate writes.

## Matched Railway / application log evidence (deployment `8514cb9f…`)

Retained HTTP edge logs for `event-os` / production / `8514cb9f…` (`--since 2h` / `3h`):

| Finding | Evidence |
|---------|----------|
| **No HTTP 503** | Status histogram: 200 / 303 / 499 only. Zero `@httpStatus:503`. |
| Seating POSTs | Successful mutations return **303**; RSC/document follow-ups **200**. |
| Client abort | One seating POST **499** (`responseDetails`: client closed before response) at `2026-09-15T01:17:43Z`, during a window that also loaded `seating/error-*.js`. |
| Application settlement | `layout_binding.propose` traces show `TX_BEGIN` → `TX_COMMIT` → `ACTION_RESULT_WRITTEN` → `REDIRECT_EMITTED` → `HTTP_RESPONSE`/`NEXT_REDIRECT` (≈130–170ms). |
| Rule create without active binding | `constraint.create` traces show `TX_BEGIN` → `TX_ROLLBACK` → `ACTION_RESULT_WRITTEN`/`NOT_APPLIED` → `REDIRECT_EMITTED` with `NO_ACTIVE_SEATING_LAYOUT_BINDING` — clean non-commit. |

Live diagnostic (Planner propose against Alpha One during investigation): server POST **303**, follow-up GET **200**, settlement `RENDER_RESULT_FOUND`; one earlier Playwright session still ended on a page snapshot that was only an `alert` (client blank/error path). A subsequent propose settled with banner and no error boundary.

**Conclusion:** Claude’s network “503” is **not corroborated as a Railway edge 5xx** for this deployment. Matching evidence is **application/client recovery failure** after otherwise successful (or cleanly rolled-back) server settlement, plus at least one **client abort (499)**.

## Root cause

**Mixed — primarily application UX/client recovery; not a proven Railway 5xx or Postgres write fault.**

1. **Shared mutation UI gap:** `ProtectionMutationForm` returned validation state or relied on redirect/error boundary. Transport/action failures that throw on the client (including simulated HTTP 503) could leave the operator on a blank/error surface instead of a contained, retryable form result.
2. **Propose/rule forms still used client `IdempotencyField`:** known rem2 hydration/#418 blank-page vector (export already server-minted).
3. **Partial-write path was already sound at the command layer:** idempotent replay after durable commit; TX rollback on business rejection (`NO_ACTIVE_SEATING_LAYOUT_BINDING`).

Do **not** claim Railway instability was “fixed” by the application patch. The patch makes the application **handle** lost/failed action responses safely.

## Partial-write analysis

| Path | Transaction | Commit | Audit/result | Client | Idempotency |
|------|-------------|--------|--------------|--------|-------------|
| Propose (happy) | Began | `TX_COMMIT` | Result written; redirect | Should receive 303 + GET | Same key → `REPLAYED`, no second binding |
| Propose (lost response after commit) | Began | Committed | Result written | May see failure/blank | Explicit retry with **same** server-minted key recovers durable truth |
| Rule create without active binding | Began | `TX_ROLLBACK` | `NOT_APPLIED` result + redirect | May blank if client mishandles | No durable rule |
| Rule create success | Began | Commit | Result + redirect | Banner | Same key → `REPLAYED` |
| HTTP 499 / client abort | May complete server-side | Possible | Possible | Client abandoned | Retry must not duplicate (idempotency) |

Invariant preserved: one user action → at most one committed mutation; failure before commit → no data change; after commit → replay recovers truth.

## Correction made

Shared boundary (`ProtectionMutationForm`):

- Catch non-redirect action failures into `status: "failure"` with plain-language summary.
- Preserve attempted values; preserve idempotency key for durable recovery.
- Explicit “Retry this action” (no automatic resubmit).
- Focus moved to the failure summary.
- Client-safe helpers only (no shared-platform barrel import into the client bundle).

Propose + create-rule forms:

- Server-mint `idempotencyKey` on Envelope (same pattern as export rem3).
- Remount keyed by presented correlation after successful navigation.
- `PendingSubmit` for pending lock.

Seating `error.tsx`: clearer recoverable copy + explicit retry/reload without implying silent resubmit.

## Files changed

- `apps/event-os/src/components/protection-mutation-form.tsx`
- `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx`
- `apps/event-os/src/app/app/events/[eventId]/seating/error.tsx`
- `packages/shared-platform/src/risk-form-contract.ts`
- `packages/shared-platform/test/seating-v2-mutation-503-idempotency.test.ts`
- `apps/event-os/test/s06-mutation-recoverable.test.ts`
- `apps/event-os/e2e/s06-mutation-503-recoverable.spec.ts`

## Focused test results

| Gate | Result |
|------|--------|
| `seating-v2-mutation-503-idempotency.test.ts` | 6/6 pass |
| `s06-mutation-recoverable.test.ts` | 4/4 pass |
| Playwright `s06-mutation-503-recoverable.spec.ts` (1 worker, local) | pass (simulated 503; page remains; inline error; form usable; explicit retry) |
| event-os + shared-platform `tsc --noEmit` | pass |
| `git diff --check` | pass |

## Live smoke (post-deploy `e4c4a8f` / `5f64c717…`)

| Check | Result |
|-------|--------|
| Health posture | POSTGRES · APPLIED · `productionAuthorised:false` · adapters INACTIVE |
| Deployed SHA | `e4c4a8ff92a00ca4ab8f139ab82ef91157262963` |
| One layout-binding proposal | pass (banner Succeeded; reload OK; no error boundary) |
| Activate then one distinct rule create | pass (banner Succeeded; seating rules remain after reload) |
| Controlled simulated HTTP 503 on rule form | pass (`protection-mutation-failure-summary` + explicit retry; page usable) |

## Protected files / Control Tower

Protected files untouched: `Untitled`, `MD Academy/Untitled`, `apps/event-os/scripts/s076-shard-runner.sh`, `apps/event-os/scripts/s076-shard-plan.abandoned.json`.  
Control Tower not deployed (SKIPPED listings only).

## Explicit non-acceptance

**EOS-S06 remains unaccepted. EOS-S07 remains unstarted.** CI remains mandatory.

## Remaining Claude verification scope

See [`CLAUDE_CONTINUATION_PROMPT.md`](./CLAUDE_CONTINUATION_PROMPT.md).
