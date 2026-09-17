# CP-SAT Milestone 3 — Candidate review, maker-checker adoption and publication

- **Disposition:** MILESTONE 3 COMPLETE (local synthetic proof)
- **Date:** 2026-09-17
- **Starting HEAD:** `300fe687cbd2fe00d9612cfa959405d032dab2be`
- **Implementation ancestor (M2 product):** `bdda1606134e8374139850d1099f33f229c56595`
- **origin/main (unchanged):** `df6d6a616ccf769e86020a94c0f5281002137292`
- **Product commit:** `847369a` (`feat(cpsat): review and adopt sealed seating candidates`)
- **Evidence commit:** this document (`docs(cpsat): record review and adoption milestone`)

## Migrations

- `011_cpsat_solver_queue` (existing)
- `012_cpsat_solver_queue_launch` (existing)
- `013_cpsat_solver_queue_worker` (existing)
- `014_cpsat_solver_review_adoption` (additive: `cpsat_solver_proposals`; adoption supersession / publication columns)

## Required-tier verification (closes M2 observation)

At settlement (`processVerifiedCandidate`) and review-read (`getCpsatCandidateReview`):

- load frozen request / objective edition;
- require `A1_movement` only when baseline exists;
- require `A2_preferences` only when preference rows exist;
- reject missing required tiers and mismatched recomputed values;
- record required/present/recomputed comparison in verification evidence;
- vacuous child-tier omission no longer passes when a tier is required.

Focused unit cases: missing movement; missing preference; both correct; inapplicable absent; value mismatch.

## Synthetic journeys (no new CP-SAT child solve)

Database: ephemeral local `cpsat_m3_*` via `postgresql://…@127.0.0.1:5432/`.

### Journey A — successful adoption

- Synthetic sealed verified candidate inserted (tiny 2-guest fixture)
- Planner/maker submits exact run/candidate/assignment hash → `PENDING_APPROVAL`
- Different Event Director/checker approves → `APPROVED`
- CEO adopts → immutable `cpsat_solver_adoptions` row; authority pointer updated; lifecycle `ADOPTED`
- Prior operational publication preserved until a valid successor supersedes it

### Journey B — maker-checker protection

- Maker submits; same actor attempts approval → `FORBIDDEN`
- Candidate assignments unchanged; prior operational publication remains active

### Journey C — stale protection

- Candidate approved; governed rules hash changes
- Adoption refused; freshness becomes `STALE`; product result remains `FEASIBLE`
- Previous operational pointer remains `CURRENT`

## Maker / checker role identities (synthetic)

| Role | Actor id examples | Permissions used |
|------|-------------------|------------------|
| Planner (maker) | `planner-maker-1`, `journey-maker` | `seating.view`, `seating.plan.submit` |
| Event Director (checker) | `director-checker-1`, `journey-checker` | `seating.view`, `seating.plan.approve` |
| CEO (adopter) | `ceo-adopter-1`, `journey-ceo` | includes `seating.plan.publish` |
| Read-Only Auditor | `auditor-1` | `seating.view` only |

## Focused test commands and results

```text
cd packages/shared-platform
npx tsx --test \
  test/cpsat-required-tiers.test.ts \
  test/cpsat-review-adoption.test.ts \
  test/cpsat-review-adoption-ui.test.ts \
  test/cpsat-worker-settlement.test.ts \
  test/cpsat-operator-lifecycle-ui.test.ts
```

**Result:** 49/49 pass (local run 2026-09-17), including M2 regression.

## Review / adoption contract highlights

- Authoritative store: `cpsat_solver_runs` + sealed candidates + proposals + adoptions + authority pointers
- Seating V2 run row remains projection only; projection updated transactionally
- Reuses S06 permission keys (`seating.view` / `submit` / `approve` / `publish`) and maker≠checker
- Explicit boundary module: `packages/shared-platform/src/cpsat/review-adoption.ts`
- UI: Command Atelier seating `#review` section + `CpsatCandidateReviewPanel`

## Safety

- Synthetic data only
- Local/ephemeral PostgreSQL only (`cpsat_m3_*` created and dropped by tests)
- No production database access
- No Railway access
- No push / no deploy
- `productionAuthorised` unchanged (false)
- No Control Tower / EOS-S06B / S06D / S07 / CAP1000 qualification work
- Unrelated CAP1000 / qualification dirty paths untouched
- No real guest data
- No heuristic fallback

## Remaining (explicitly out of scope)

- Complete infeasibility diagnostics (CORE/MCS/counterfactuals)
- Stop-and-keep-best
- Final heuristic retirement
- Railway worker deployment
- Frozen-candidate qualification
- Claude browser verification
- CP-SAT acceptance
- S06C acceptance
- S06B and S06D remain later work
