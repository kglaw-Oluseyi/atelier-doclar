# EOS-S06 — Final CI Runtime Correction

**Not acceptance.** EOS-S06 remains unaccepted pending complete green CI and AI CTO review. EOS-S07 remains unstarted.

## 1. Final root cause (harness) — closed

**HARNESS/RESOURCE.** Formal CI previously ran Event OS Playwright against `next-dev`. Even a single-test shard (`s13-j1-studio`) hit next-dev’s memory threshold (~80s) and restarted → `ERR_CONNECTION_REFUSED`. Sharding alone cannot fix next-dev memory behaviour on GitHub-hosted runners.

## 2. Invalid prior runs (not product-attributable)

| Run | Classification |
|-----|----------------|
| `34966947067` | RESOURCE-CONSTRAINED / INVALID — 279-test monolith vs one next-dev; memory cascade; cancelled |
| `34975914044` | RESOURCE-CONSTRAINED / INVALID — sharded next-dev; shard 0 alone OOM-restarted |

## 3. Production-mode CI architecture

- Workflow **production build** reused.
- Event OS browser corpus: **`next start` only** (never `next-dev` in formal CI).
- Ephemeral GitHub Actions **Postgres 16** service (`ci`/`ci`/`event_os_ci`).
- `DATABASE_URL` points only at that service.
- `ci-postgres-reset.ts`: `DROP SCHEMA public CASCADE` → migrate via `PostgresPlatformStore.open` → `applySyntheticSeedIfNeeded` + seating layout fixtures.
- `EVENT_OS_ALLOW_FIXTURES=1` for synthetic seed only; **no** general production file-store bypass; file-store still refused under production NODE_ENV without DATABASE_URL.
- `productionAuthorised` remains hard-false.
- 17 deterministic shards; DB reset + fresh `next start` per shard; workers=1; retries=0; heap 2048; hard timeouts; failure classification (`PRODUCT_ASSERTION` / `MEMORY` / `TRANSPORT` / `DATABASE` / `SERVER_STARTUP`); artifacts uploaded on failure.

## 4. Ephemeral Postgres isolation

- Service container health-checked; credentials only on the runner.
- Reset script refuses Railway/remote hosts and requires `EVENT_OS_CI_POSTGRES=1`.
- Never uses Railway/production Postgres.

## 5. Accounting

`scripts/ci-e2e-shard-plan.json`: **129 files / 279 tests**, each exactly once (`test/ci-e2e-shard-accounting.test.ts`).

## 6. Files changed (harness packet)

- `.github/workflows/programme-validate.yml`
- `apps/event-os/playwright.config.ts`
- `apps/event-os/scripts/ci-e2e-run-shards.mjs`
- `apps/event-os/scripts/ci-e2e-lifecycle-check.mjs`
- `apps/event-os/scripts/ci-postgres-reset.ts`
- `apps/event-os/scripts/ci-e2e-shard-plan.json`
- `apps/event-os/e2e/s060-helpers.ts` / `s075-section-13.ts` (CI Postgres persistence acceptance)
- `apps/event-os/package.json`
- `apps/event-os/test/ci-e2e-shard-accounting.test.ts`
- this MANIFEST

## 7. Bounded local validation (harness)

| Gate | Result |
|------|--------|
| typecheck | pass |
| shard accounting | pass |
| disposable Postgres migrate+seed | pass (`event_os_ci_e2e`) |
| lifecycle next start up/down | pass |
| representative Postgres+next-start shard (`ux001-authority`, 2 tests) | pass |
| `git diff --check` | pass |
| Full 279 suite locally | **not run** |

## 8. Formal CI after harness push

| Field | Value |
|-------|-------|
| Ending HEAD | `f82de1d1155fec946c2a7a1327077be647e85c24` |
| Push | `main` `dd3e18b…f82de1d` |
| Event OS / Control Tower deploy | **none** (deployedSha remained `233afaa…`; CT SKIPPED) |
| Formal CI run | `34984069580` — https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/34984069580 |
| Conclusion | **failure** (not green) |
| Artifact | `10402684947` (Playwright failure snapshot independently inspected) |

### Steps

All steps through Bootstrap ephemeral CI Postgres **success**.
Event OS browser tests (sharded Postgres + next start) **failed** on shard 0.
Artifacts uploaded.

## 9. Artifact-derived reclassification (run `34984069580`)

**Run `34984069580` did not demonstrate a product defect.**

Independent inspection of the failed page snapshot proves:

| Fact | Evidence on failed page |
|------|-------------------------|
| Run exists | `c1b4c163…` present |
| Outcome | `FEASIBLE` |
| Seated / Unseated | `Seated 4` / `Unseated 0` |
| Adopt control | accessible button **Adopt run** present |
| Capacity | one table with 8 physical seats |
| Eligible guests | four guests eligible |
| Hard blockers | `0` |

Event OS **successfully seated all four guests**. The correct feasible run and **Adopt run** control were both present.

### Stale assertion (root cause)

`freezeLaunchAdopt()` in `e2e/s075-section-13.ts` used a wording-coupled locator:

```text
getByTestId('seating-run-card').filter({ hasText: /Validator FEASIBLE/ })
  .filter({ has: getByRole('button', { name: 'Adopt run' }) })
```

Expected count **1**, received **0** (30s).

The run card actually renders copy of the form:

```text
Run … · Not current · Fresh · FEASIBLE
```

and exposes the durable contract:

- `data-testid="seating-run-card"`
- `data-outcome="FEASIBLE"`
- accessible button named `Adopt run`

### Classification

| Field | Value |
|-------|-------|
| Class | **FIXTURE/TEST CONTRACT DEFECT** |
| Product defect | **NO** |
| Application/runtime change required | **NO** |
| Harness (Postgres + next start) | healthy enough to reach a clean assertion |

Initial CI classification label `PRODUCT_ASSERTION` reflected Playwright’s assertion failure surface only; it is **not** a product/runtime defect after artifact review.

## 10. Test-only correction (this packet)

Replace the wording-coupled `/Validator FEASIBLE/` locator with the semantic contract:

- `seating-run-card` with `data-outcome="FEASIBLE"`
- require accessible button `Adopt run`
- retain exact count `1`
- retain `Seated 4` / `Unseated 0`
- retain immutable run-ID assertion
- retain adopt + post-adoption Studio assertion

Do **not** restore obsolete “Validator FEASIBLE” UI wording. Do **not** change solver, validator, persistence, projection, permissions or seating UI.

Related e2e copy assertions that still required the obsolete `Validator …` visible prefix are aligned to the same semantic/`FEASIBLE` contract (test-only).

## 11. Local validation (test-only correction)

| Gate | Result |
|------|--------|
| Focused DEF-01 contract (`test/s06-claude-remediation-copy.test.ts`) | pass |
| Shard 0 `s13-j1-studio` (Postgres + next start) | pass (~26s) |
| DB reset + shard 0 again | pass (~27s) |
| event-os typecheck | pass |
| `git diff --check` | pass |

No product/runtime files changed.

## 12. Commit / push / deploy / CI (test-only packet)

| Field | Value |
|-------|-------|
| Ending HEAD | _(filled after commit)_ |
| Event OS watchPatterns during push | `/__CONTROLLED_DEPLOY_ONLY__/**` then restored to `[]` |
| Event OS / Control Tower deploy | **none** (deployedSha must remain `233afaa…`) |
| Formal CI | single `programme-validate` trigger after push |

EOS-S06 remains unaccepted pending complete green CI and AI CTO review. EOS-S07 remains unstarted.
