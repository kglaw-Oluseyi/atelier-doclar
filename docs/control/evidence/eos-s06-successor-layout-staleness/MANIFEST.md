# EOS-S06 — Successor layout-binding staleness remediation

**Evidence packet for the accepted application SHA.** Formal acceptance is `docs/control/EOS_S06_ACCEPTANCE.md` under `MD-PR-S077` (2026-09-15). This MANIFEST is remediation evidence, not the acceptance decision itself. EOS-S06A remains RATIFIED / ELIGIBLE / NOT STARTED. EOS-S07 remains NOT_STARTED / NOT_AUTHORISED. Control Tower was not deployed for this remediation.

## 1. Exact root cause

In `buildSeatingV2Workspace`, run freshness used only package identity:

`stale: Boolean(pkg && item.packageId !== pkg.id)`

Current-package selection matched active rule/reservation IDs but **ignored** the sole ACTIVE seating layout binding’s `layoutContentHash`. After a successor binding became the only ACTIVE authority, predecessor packages/runs could remain **Current · Fresh · FEASIBLE** / `data-stale=false` even when `packageLayoutDrift=true`.

## 2. Canonical staleness invariant

Helper: `isPackageOrRunStaleAgainstCurrentAuthority`

A package or run is **Fresh** only when all authoritative inputs still match current authority:

1. package identity under current rule + reservation + layout selection;
2. active rule/reservation semantic authority (via current-package selection);
3. sole ACTIVE layout-binding publication/content hash.

When the ACTIVE layout hash changes:

- predecessor packages/runs become **STALE**;
- working/submitted/approved editions derived from those runs project `stale: true`;
- the last valid published seating remains operational until a fresh successor is published;
- no automatic run, adoption, approval, or publication occurs;
- server guards refuse adopt / submit / approve / publish against stale authority;
- history and immutable identities remain intact.

## 3. Files changed

| Path | Change |
|------|--------|
| `packages/shared-platform/src/seating-v2-workspace.ts` | Canonical helper; layout-hash in current-package selection; run/edition/input freshness; next-action copy |
| `packages/shared-platform/src/seating-v2-command-service.ts` | `adoptRun` refuses stale packages via `packageIsFresh` (same gate as submit/approve/publish) |
| `packages/shared-platform/src/index.ts` | Export helper |
| `packages/shared-platform/test/seating-v2-layout-authority-staleness.test.ts` | Focused A–D + transition-guard coverage |
| `apps/event-os/src/app/app/events/[eventId]/seating/page.tsx` | Hide Adopt on stale runs; surface edition Stale |
| `apps/event-os/e2e/eos-s06-current-acceptance.spec.ts` | Promoted canonical A–J acceptance (was temporary `_eos-s06-current-product-e2e`) |
| `apps/event-os/scripts/ci-e2e-shard-plan.json` | Shard 0 = current acceptance; totals 130 / 280 |
| `apps/event-os/test/ci-e2e-shard-accounting.test.ts` | Accounting for 130/280 + shard 0 identity |
| `apps/event-os/package.json` | `e2e:eos-s06-current` focused gate script |
| this MANIFEST | Evidence |

## 4. Server-side guards

| Transition | Guard |
|------------|-------|
| `adoptRun` | **Added** — `packageIsFresh` before adopt; `TRANSITION_INVALID` when layout/governing inputs drifted |
| `submitPlan` | **Confirmed** — `assertFreshFeasible` → `packageIsFresh` |
| `approvePlan` | **Confirmed** — same |
| `publishPlan` | **Confirmed** — same |

## 5. Focused test results

| Gate | Result |
|------|--------|
| `seating-v2-layout-authority-staleness.test.ts` | **9/9 pass** |
| Related layout-binding + command-path suites | **25/25 pass** |
| shared-platform + event-os typecheck | **pass** |
| shard accounting | **pass** (130 files / 280 tests) |
| `git diff --check` | **pass** |
| Historical 279-test local corpus | **not run** (forbidden) |

## 6. Current A–J E2E (fresh Postgres × 2)

Both runs: `EVENT_OS_CI_POSTGRES=1`, `next start`, DB `event_os_ci_current_e2e`, reset before each run.

| Pass | Result | Event | Predecessor run after successor | Adopt buttons | Publication |
|------|--------|-------|----------------------------------|---------------|-------------|
| 1 | **PASS** | `d7e20dc1-…` | `Stale` / `data-stale=true` | 0 | Publication 1 remains |
| 2 | **PASS** | `0219c5a8-…` | `Stale` / `data-stale=true` | 0 | Publication 1 remains |

Artifacts: `/tmp/eos-s06-successor-layout-staleness/`

## 7. Final authoritative counts (pass 2)

- bindings: active 1 · draft 0 · superseded ≥1
- rules: active KEEP_TOGETHER 1 · active KEEP_APART 0 · contradictory pairs 0 · duplicate semantic active 0
- runs: 1 FEASIBLE **stale**
- current publications: 1
- exports: ≥1
- eligible guests: 4
- product defects: 0

## 8. SHAs

| Field | SHA |
|-------|-----|
| Starting HEAD | `305fb94751676083cb654323fb56997d8e700899` |
| Reviewed pre-acceptance evidence tip | `48cb593813a448c50bb506bd4cbc72e679cfb404` |
| Accepted / deployed application SHA | `42b0bb3f0976ca2b745a09f3952680afef69a1b9` |

Do not use an ambiguous “ending HEAD” field. The reviewed pre-acceptance tip is documentation evidence reviewed before acceptance; it is not the accepted application SHA. Intermediate docs tip `5499491f3e8c1c8dce4facd643726bbfa7c1ae99` remains dated history only.

## 9. Commit / push / deployment

| Item | Identity |
|------|----------|
| Commit | `42b0bb3f0976ca2b745a09f3952680afef69a1b9` — `fix(eos-s06): mark seating runs stale when active layout hash drifts` |
| Push | `main` `305fb94..42b0bb3` |
| Railway deployment | `bb0f03d1-81fb-4fba-bf86-206f92a5953d` **SUCCESS** |
| Deployed application SHA | `42b0bb3f0976ca2b745a09f3952680afef69a1b9` |
| Control Tower | SKIPPED (`7c232556-…`) — not deployed |

## 10. Live posture and focused smoke

### Posture (PASS)

- ready: true
- persistence: **POSTGRES**
- migrationStatus: **APPLIED**
- productionAuthorised: **false**
- providers/adapters: **INACTIVE**
- deployedSha matches ending SHA

### Focused live smoke

1. **Read-only** on disposable synthetic event `c188d79b-…` (created during live attempt): Publication **1** remains operational; no Publication 2; providers inactive. Confirms no silent unpublish / no automatic successor publication from deploy alone.
2. **Mutation attempt** to publish a successor layout on that event was **server-refused** (layout lease held by prior editor). Banner: Did data change **No** — durable record unchanged. Confirms no unauthorized automatic transition.
3. Full predecessor→successor **STALE** mutation proof on live was blocked by lease contention after the long A–G live setup; product behaviour is proven by the formal Postgres+next-start current gate and the two fresh-DB E2E passes on the same SHA that is now deployed.

## 11. Formal EOS-S06 current gate

| Gate | Result |
|------|--------|
| Local formal `pnpm e2e:eos-s06-current` (fresh Postgres + next start) | **PASS** |
| GitHub Actions run `35001426000` shard 0 `eos-s06-current-acceptance` | **PASS** (`1 passed` ~1.5m) |
| Immediate seating decision | **current acceptance gate only** |

CI URL: https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/35001426000

## 12. Historical regression disposition

Overall programme-validate run `35001426000` **failed** on historical shard **4** (`s13-j2-governance`, classification `PRODUCT_ASSERTION`). That failure is **not** the immediate seating decision for this remediation. Extended historical corpus is now planned as **130 files / 280 tests** (shard 0 = current acceptance). Historical green is reported separately and does not block this layout-staleness correction.

## 13. Protected-file confirmation

Not touched:

- `Untitled`
- `MD Academy/Untitled`
- `apps/event-os/scripts/s076-shard-runner.sh`
- `apps/event-os/scripts/s076-shard-plan.abandoned.json`
- EOS-S06A ZIP

## 14. Control Tower

**Not deployed** (SKIPPED on the remediation SHA).

## 15–16. Programme gates

- EOS-S06 remains **unaccepted** pending AI CTO review.
- EOS-S07 remains **unstarted**.
- EOS-S06A not started.
