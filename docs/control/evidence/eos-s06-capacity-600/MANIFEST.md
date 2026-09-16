# EOS-S06 600-Guest Capacity Qualification Evidence

**Gate:** Pre-Production Gate 1 — EOS-S06 Seating 600-Guest Capacity Qualification  
**Corpus edition:** `eos-s06-capacity-600-v1`  
**Status:** Qualification claim — awaiting independent verification and AI CTO acceptance  
**Date:** 2026-09-16  
**AI CTO profile approval:** 63-table × 8/10/12 synthetic qualification profile APPROVED (not a production default)

## Identity pre-flight

| Field | Value |
|-------|-------|
| Governance baseline | `4963082f1b669d085dc91c85f0d95f6a5fa7e6ee` |
| Repository HEAD before qualification commit | `5f7c519b1492f56df48438add483d618c2f38f01` |
| Qualification evidence commit | `8f10ec25c1075759f30225fb77a46b1ef88a67a6` |
| Accepted Event OS application SHA | `7f139a556f7c023efa98daccd7bfd29481a05775` |
| New deployed application SHA | **None** — no application correction |
| `productionAuthorised` | `false` |
| Providers / communications | `INACTIVE` |
| EOS-S07 | `NOT_STARTED / NOT_AUTHORISED` |
| Control Tower | Untouched |
| TDR-S06A-001 | Remains OPEN (not closed by this gate) |

## Approved realistic integrated layout (qualification-only)

| Kind | Count | Seats/table | Seats |
|------|-------|-------------|-------|
| GENERAL | 42 | 10 | 420 |
| FAMILY | 18 | 8 | 144 |
| HEAD/protocol | 3 | 12 | 36 |
| **Total** | **63** | — | **600** |

Head/protocol tables at 12 seats are ordinary exceptional event tables, not near the schema ceiling (48). This is synthetic capacity-qualification data only.

### Multi-batch governance integrity

Path: `packages/shared-platform/src/seating-capacity-layout-fixture.ts` → `applyCapacity600SeatingLayout`

1. Every batch uses accepted commands: `applyLayoutCommand(CREATE_OBJECT)` → `runLayoutValidation` → `submitLayoutApproval` → `decideLayoutApproval(APPROVED)` → `publishLayout`.
2. Each `submitLayoutApproval` asserts `materialDiffSummary.length <= 800`; validation is not weakened or bypassed. Batch size = 40 (measured first-batch ~759 chars).
3. Two batches for 63 tables (40 + 23). Final CURRENT publication asserts 63 tables and 600 declared seats.
4. Intermediate batch publications are successive CURRENT publications of the same layout; the final CURRENT publication is the complete governing layout (63/600). Intermediate batches are not claimed as the complete Gate 1 profile.
5. Approval / maker-checker (planner submit, director approve/publish), idempotency keys, and concurrency isolation remain on the accepted product path (proven in focused suite).
6. PostgreSQL persist/reopen replay of freeze/launch identity proven in `persists and replays a 600-guest solve through PostgreSQL`.

## Deterministic scenarios

| ID | Seed | Dataset hash | Expected |
|----|------|--------------|----------|
| A_LIGHT | `eos-s06-cap-A-light-600-v1` | `e7d546b16cf00fe377faa87c233328d46c982544532988b4536064abafab8de9` | FEASIBLE |
| B_TYPICAL | `eos-s06-cap-B-typical-600-v1` | `08309644e65bd3f4f927461ac92b09692a5f766a344da5402011452b9692f160` | FEASIBLE |
| C_HEAVY | `eos-s06-cap-C-heavy-600-v1` | `22c88419a8313f662f3c02aa85e5049137907e8a48aa2feed7bcce8121efb5e4` | FEASIBLE |
| D_INFEASIBLE | `eos-s06-cap-D-infeasible-600-v1` | `6dc0b80d994c285e0f5949c26db79eff9c240b87bf68c3afd2cb5c9f8ea39e74` | INFEASIBLE |

## Timing summary (solver, 11 samples: 1 cold + 10 warm) — preserved

| Scenario | Cold ms | p95 ms | Max ms | Hard violations |
|----------|---------|--------|--------|-----------------|
| A_LIGHT | 4417 | 3216 | 3216 | 0 |
| B_TYPICAL | 7177 | 7354 | 7354 | 0 |
| C_HEAVY | 6033 | 6072 | 6072 | 0 |
| D_INFEASIBLE | 1473 | 1459 | 1459 | 3 |

Source: `timing.jsonl` SHA-256 `f614f7291289215601cb7b632dece3d727370bcfd53746091fa549a606e560e5`.  
Targets: p95 ≤ 30s, ceiling 60s — **PASS**.

## Disaggregated concurrency (two 600-guest events)

| Event | eventId | runId | solverDurationMs | totalWallClockMs | status | seated |
|-------|---------|-------|------------------|------------------|--------|--------|
| alpha | `00000000-0000-4000-8000-000000000021` | `4e29da0f-675a-4571-b1d2-7cfafa47af5a` | 10389 | 10389 | FEASIBLE | 600 |
| beta | `36320fcb-0f14-489f-aeb3-9866a040bac5` | `d3c52252-ecd0-46b0-ae94-81316b876906` | 10381 | 10381 | FEASIBLE | 600 |

Combined wall: 10431 ms. Cross-event leakage: false. Under 30s each / under 60s ceiling: true.  
Source: `concurrency-timing.jsonl` SHA-256 `827d28f79b4b1affa529be94ae78a63c7d4e2a142cb250308857f3b5f6925e48`.

## Focused suite (clean completion after stop-loss)

Command: `NODE_OPTIONS='--max-old-space-size=8192' pnpm exec tsx --test test/seating-capacity-600-qualification.test.ts`  
Exit: **0** · **15 passed / 0 failed** · ~934856 ms  
Interrupted prior run wrote only `TAP version 13` and did **not** corrupt `timing.jsonl` or other authoritative evidence.

Typecheck: `pnpm typecheck` exit **0** (recorded before final suite; no runtime product files changed afterward).

## Browser evidence — RETAINED (5/5)

| Condition | Proof |
|-----------|-------|
| Approved 63-table fixture | Seed/manifest `layoutProfile: realistic-63-table-8-10-12`; fixture mtime before run |
| Complete Gate 1 suite | Spec contains exactly 5 tests; all passed |
| Ephemeral PostgreSQL | `EVENT_OS_CI_POSTGRES=1`, local `event_os_cap600`, `next start` |
| Identity / posture | Evidence rows: `persistence=POSTGRES`, `productionAuthorised=false`, `deployedSha/gitSha=7f139a55…` |
| Viewports / a11y / timings | 360/768/1280; keyboard focus; axe serious=0 at 768 & 1280; ordinary ops <5s |
| No post-run invalidating change | browser.spec/global-setup/seed/fixture mtimes all ≤ evidence last timestamp `2026-09-16T11:02:54.378Z` |

SHA-256: `2cdfed1ab4f92be93d644f94efecbac36286e7e87694f15b849d3482cce3dfab`

Ordinary-op samples (ms): goto-studio 1620; goto-inputs-search 92; goto-rules 1253; viewport-360 1089; viewport-768 127; viewport-1280 239; goto-inputs-reload 1599 — all withinBudget.

Infeasible explanation: governed rule-activate conflict (KEEP_APART refused while KEEP_TOGETHER ACTIVE) — product-truthful; solver never receives both ACTIVE HARD contradictors.

## Heavy-scenario provenance

See `HEAVY_SCENARIO_PROVENANCE.md` (first-run TIMED_OUT preserved; adjusted C_HEAVY remains heavy).

## Secret / token / PII scans

Fixtures, scripts, e2e, and evidence scanned: **0** secret/token matches; **0** real-PII / consumer-email matches.  
`git diff --check`: exit **0**.

## Evidence file hashes (pre-commit freeze)

| File | SHA-256 |
|------|---------|
| timing.jsonl | `f614f7291289215601cb7b632dece3d727370bcfd53746091fa549a606e560e5` |
| concurrency-timing.jsonl | `827d28f79b4b1affa529be94ae78a63c7d4e2a142cb250308857f3b5f6925e48` |
| browser/browser-action-timing.jsonl | `2cdfed1ab4f92be93d644f94efecbac36286e7e87694f15b849d3482cce3dfab` |
| HEAVY_SCENARIO_PROVENANCE.md | `5a6efc46c14f98176eee688d602d404a81069f4b40fdefec87d26d12bb50beba` |
| seating-capacity-corpus.ts | `ab0bee4e4345053faff7b9d755ff286d2f2e2ee8d4cb3ae605d5a81226ba3ba9` |
| seating-capacity-layout-fixture.ts | `afada4407c8833f5a632d6dd27b6804afdee3f6c5abda1a044df0c75fb852668` |

(Manifest / test-results / Claude prompt hashes update with this finalisation commit.)

## Deployment / watch-pattern truth

Documentation/test-only qualification push uses Event OS `watchPatterns` guard `/__CONTROLLED_DEPLOY_ONLY__/**`, then restore to `[]`.  
Repository push ≠ application source change. Any configuration-maintenance rebuild after restore is reported separately; accepted application SHA must remain `7f139a556f7c023efa98daccd7bfd29481a05775`.

## Rollback

Remove capacity qualification artefacts under `packages/shared-platform/src/seating-capacity-*`, related tests/scripts, `apps/event-os` capacity e2e/seed/playwright wiring, and `docs/control/evidence/eos-s06-capacity-600/`. No migration or production data touched.

## Cross references

- Successor-layout staleness: `packages/shared-platform/test/seating-v2-layout-authority-staleness.test.ts`
- Accepted product baseline: `docs/control/EOS_S06_ACCEPTANCE.md`, `docs/control/EOS_S06A_ACCEPTANCE.md`
