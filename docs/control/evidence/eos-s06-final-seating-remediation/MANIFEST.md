# EOS-S06 — Final consolidated seating remediation (evidence)

## Scope
- Repo: `kglaw-Oluseyi/atelier-doclar` · branch `main`
- Railway: `atelier-doclar` / `production` / `event-os` only
- Did not deploy Control Tower; did not accept EOS-S06; did not start EOS-S07
- Protected files untouched: `Untitled`, `MD Academy/Untitled`, `s076-shard-runner.sh`, `s076-shard-plan.abandoned.json`

## Starting identities
- Repository/docs HEAD at task start: see `START_SHA.txt` (was `3e4bb2906f898c9742fa2f455265e155f73269a2`)
- Deployed Event OS at task start: `e4c4a8ff92a00ca4ab8f139ab82ef91157262963`

## 1. HARD-rule contradiction
### Root cause
Activation uniqueness only matched identical `contentHash`. Opposite HARD predicates (`KEEP_TOGETHER` vs `KEEP_APART`) hash differently, so both could become ACTIVE for the same guest pair and scope. Guest-pair order was already normalised in hashes for equivalents, but cross-kind contradiction was not checked.

### Matrix implemented
Explicit pairs only (`HARD_RULE_CONTRADICTION_PAIRS`):
- `KEEP_TOGETHER` ↔ `KEEP_APART` (same normalised guest subject set + scope)
- `REQUIRE_TABLE` ↔ `FORBID_TABLE` (same subjects + same targets)

SOFT / INFORMATIONAL rules are not hard-blocked by this matrix.

### Policy
- Draft may be saved while conflicting with an ACTIVE HARD rule
- Draft UI annotates the conflicting ACTIVE edition
- Activation is refused server-side (`SEATING_HARD_RULE_CONFLICT`); retries and direct server actions cannot bypass
- Action result / seating audit records refused activation as NOT_APPLIED / FAILED
- After governed withdrawal of the older rule, the replacement may activate

### Verification residue reconciliation
Script: `apps/event-os/scripts/reconcile-verification-hard-rule-conflicts.mjs`
- Reason: `VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD`
- Dry-run then execute after deploy
- Preserves earlier ACTIVE `KEEP_TOGETHER`; withdraws conflicting ACTIVE `KEEP_APART`; no deletes

## 2. Layout-binding 503 recovery
### Correction
- `ProtectionMutationForm` always settles “Saving…” on transport failure
- Layout-binding propose wires `recoverProposeSeatingLayoutBindingAction`
- Recovery looks up durable `seatingV2.proposeLayoutBinding` receipt by idempotency key
- Committed → recovered SUCCESS banner: “We temporarily lost the server response…”
- Not committed → inline failure + preserved form + same idempotency key for explicit retry
- No automatic blind resubmission

## 3. Successor layout fixture
- Labels: `Synthetic seating hall` (A) · `EOS-S06 successor layout B` (B)
- Idempotent seed: `ensureEosS06SuccessorLayoutFixture` (+ binding helper)
- Boot seed via `seedSeatingLayout` when fixtures allowed
- Focused automated journey: `e2e/s06-hard-rule-conflict.spec.ts` (successor fixture test)
- Claude browser successor journey left for continuation prompt

### Intended Claude steps
1. Planner opens Alpha One seating `#inputs`
2. Confirm BOUND to Synthetic seating hall (A)
3. Confirm propose options include A and EOS-S06 successor layout B
4. Propose B → Director activates → prior binding SUPERSEDED → freeze/run as needed

## 4. Export #418 disposition
- Ran `remediation2 identical export resubmit reuses READY without React #418` once → **PASS**, no #418/hydration console errors
- Residual #418 finding: **stale / closed** (no export code change)

## 5. Event Director export policy
Canonical `ROLE_PERMISSIONS`:
- EVENT_DIRECTOR: `seating.view`, `seating.rule.activate`, `seating.plan.approve` — **no** `seating.export`
- PLANNER (+ CEO): has `seating.export`
- Disposition: **intentional** — matches accepted matrix; no permission change in this pass

## 6. Focused tests run
- `packages/shared-platform/test/seating-v2-hard-rule-conflicts.test.ts`
- `packages/shared-platform/test/seating-v2-successor-fixture.test.ts`
- `packages/shared-platform/test/seating-v2-mutation-503-idempotency.test.ts` (incl. lookup)
- Playwright (1 worker): `s06-hard-rule-conflict.spec.ts`, `s06-mutation-503-recoverable.spec.ts`
- Identical export replay once (PASS)
- `pnpm typecheck` shared-platform + event-os
- `git diff --check`

## 7. Ending identities
Filled after commit/deploy in `DEPLOYMENT.md`.
