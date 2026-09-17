# CP-SAT Milestone 5 — Heuristic retirement, fail-closed authority and secure worker packaging

- **Disposition:** MILESTONE 5 COMPLETE (local frozen candidate; not deployed)
- **Date:** 2026-09-17
- **Starting HEAD:** `40d0fd1c3e1dd3a1bbe083990a7cfc53df050c2e`
- **Product commit:** `5f1f6ee64367cbfcc6e64f8185bae1a80047b63b` (`feat(cpsat): retire heuristic authority and harden worker`)
- **Evidence commit:** this document (`docs(cpsat): freeze deployable worker candidate`)

## Railway observation (carried forward — unresolved)

Before Milestone 5, Event OS was observed with `watchPatterns=[]` and deployment metadata containing `ignoreWatchPatterns:true`. No Railway mutation was performed because Milestone 5 was local-only. Watch patterns have not proven durable as a deployment-control mechanism. A stronger verified control is required before any later GitHub push or Railway deployment.

Railway was not accessed after the Milestone 5 preflight correction authorising local-only work.

## Product outcome

Local deployment candidate where:

1. Every operator seating launch uses the durable PostgreSQL CP-SAT queue after admission.
2. No production runtime path selects or falls back to the heuristic.
3. No production runtime path solves CP-SAT inside the Event OS web process.
4. Historical heuristic evidence and explicit test comparators remain preserved but unreachable from product runtime.
5. Event OS admits launches only when a fresh compatible READY worker exists.
6. Worker unavailability fails closed with required operator wording.
7. Private worker image is reproducible, non-root, dependency-pinned, fixtures excluded.
8. Python child receives no credentials; userspace socket creation is rejected.
9. Production request/compiler/worker reject `testHooks` unless explicit test opt-in.
10. Supervisor drains on SIGTERM/SIGINT (DRAINING, stop claims, stop child).
11. Candidate has image/dependency evidence, SBOM substitutes, licence note; vuln scan recorded as blocker.
12. No Railway service created; nothing deployed.

## Migrations

- `011`–`015` retained
- `016_cpsat_solver_worker_registry` additive: `cpsat_solver_workers`, `cpsat_solver_admission_events`

## Heuristic removal inventory

Updated: `docs/control/evidence/eos-s06-cpsat-production/HEURISTIC_REMOVAL_INVENTORY.md`

## Sole queue authority

- `SeatingV2CommandService.launchRun` always freezes → admits → `enqueueCpsatSeatingRun`
- In-process `solveSeatingV2Compiled` removed from command service
- `SOLVER_QUEUE_ENABLED` ignored (`isSolverQueueEnabled` always true; not a product control)
- `SEATING_ENGINE=heuristic` hard-rejects
- Public barrel no longer exports `solveSeatingV1` or `solveSeatingV2CompiledCpSat`

## Worker registration and admission

- Registry fields: worker ID, image identity/digest, model/contract versions, OR-Tools/Python, arch, feature hash, qualified envelope, lifecycle, concurrency, active jobs, heartbeats, build identity
- Lifecycles: STARTING → READY → DRAINING / UNAVAILABLE
- Admission requires fresh READY compatible worker + per-event/global/qualification depth limits
- Synthetic bootstrap: `registerSyntheticCpsatWorkerForTests` (not a production bypass)

## Backpressure

- Per-event active default 2
- Global queued depth default 50
- Qualification/shadow soft depth default 10 (must not starve planning)
- Fair claim SQL retained (round-robin + priority)
- Queue-busy wording without invented wait estimates

## Production test-hook removal

- `toChildPayload` rejects `testHooks` unless `allowTestHooks`
- Production child rejects `testHooks` unless `CPSAT_ALLOW_TEST_HOOKS=1`
- `.dockerignore` excludes fake/malformed/crash fixtures and spike/test trees
- Dockerfile asserts fixtures absent

## Dependency pinning

- `python/requirements.linux.hashes.txt` with `pip --require-hashes`
- OR-Tools `9.15.6755`
- Evidence copy: `milestone-5/PYTHON_REQUIREMENTS_LINUX_HASHES.txt`

## Image hardening

- Multi-stage Dockerfile; digest-pinned Python slim; Node tarball SHA verified
- Non-root uid 10001; no EXPOSE; HEALTHCHECK NONE; no curl/git in final image
- Labels for source SHA / model / dependency identity

## Child isolation

- argv spawn; absolute allowlisted paths; clean env (+ TMPDIR)
- No DATABASE_URL / Railway / secrets
- Userspace socket guard (not kernel netns claim)
- Drain/self-fence on heartbeat loss

## Worker DB role

Plan only: `milestone-5/WORKER_DB_ROLE_PLAN.md` — not applied.

## Observability

`milestone-5/OBSERVABILITY_ALERTS.md`

## SBOM / licence / vulnerability

| Artefact | Path / status |
|---|---|
| Python hash lock | `milestone-5/PYTHON_REQUIREMENTS_LINUX_HASHES.txt` |
| Node inventory | `milestone-5/NODE_DEPENDENCY_INVENTORY.json` |
| OR-Tools Apache-2.0 | `milestone-5/ORTTOOLS_LICENCE.txt` |
| Vulnerability scan | **BLOCKER** — `milestone-5/VULNERABILITY_SCAN.txt` (no approved scanner) |
| Image signing | Not performed; procedure deferred |

## Frontend fail-closed

- `CpsatWorkerUnavailablePanel` with required title/body/actions
- Queue-busy wording without wait estimates
- No engine selector / heuristic / local / force-run offers

## Focused tests

```text
npx tsx --test test/cpsat-m5-authority-packaging.test.ts
npx tsx --test test/cpsat-operator-lifecycle-ui.test.ts
npx tsx --test test/cpsat-m5-tiny-hardened-journey.test.ts
# plus M1–M4 regressions: durable-launch, worker-settlement, m4 journeys/diagnostics, review-adoption-ui
```

Results (local 2026-09-17): M5 packaging 17/17; tiny hardened journey 1/1 (one real child); M1–M4 focused 51/51.

Real CP-SAT child executions this milestone: **1** (cap 2).

## Candidate identity

- Local HEAD before commits: `40d0fd1c3e1dd3a1bbe083990a7cfc53df050c2e`
- Worker image tag (prior CP2A evidence retained; rebuild required for M5 Dockerfile): see `container-build/IMAGE_IDENTITY.json` + new Dockerfile
- Frozen candidate is **local only** — not pushed, not deployed

## Remaining blockers (explicit)

- Railway worker creation/deployment
- Event OS deployment and migrations 011–016 in production
- Runtime variables/secrets
- Signed-image procedure execution
- Frozen-candidate qualification
- Claude browser verification
- Rollback drill
- CP-SAT acceptance
- S06C acceptance
- Approved vulnerability scanner run
- Stronger verified deployment-control mechanism (watchPatterns not durable)

## Safety

- Synthetic data only
- Local/ephemeral PostgreSQL only
- No production database access
- Railway not accessed after correction; not mutated
- No push / no deploy
- `productionAuthorised` unchanged (false)
- CAP1000/qualification dirty paths untouched
- No Control Tower / S06B / S06D / S07

---

# Milestone 5A closure — production-hook removal and real image proof

- **Disposition:** MILESTONE 5A COMPLETE — VULNERABILITY SCAN BLOCKED
- **Date:** 2026-09-17
- **Original M5 product commit (unchanged):** `5f1f6ee64367cbfcc6e64f8185bae1a80047b63b`
- **Original M5 evidence commit (unchanged):** `9e639a5f89ee3f98d4c19131668a7b733c5302b8`
- **M5A hook-removal commit:** `96e235a` (`fix(cpsat): remove production test-hook paths`)
- **M5A Dockerfile curl-check commit:** `b5010cb`
- **M5A monorepo image-context commit:** `ba4a215`
- **M5A final implementation commit (image source):** `4caaa44eb0be2c2eeb7a7d63ccb23bcedbcc0df3` (`fix(cpsat): bundle worker supervisor for production image`)

## Production hook removal

- `CPSAT_ALLOW_TEST_HOOKS` deleted from production behaviour (Python child + solve path).
- Production request schema sets `testHooks: false` (rejected).
- `toChildPayload` always rejects `testHooks` (no allow option).
- Supervisor does not forward test hooks.
- KEEP_BEST timing preserved via test-only child `apps/event-os-solver-worker/test-only/keep_best_timing_child.py` (outside Docker context; real CP-SAT incumbent only; timing delay only).
- Architectural suite: `packages/shared-platform/test/cpsat-m5a-production-hooks.test.ts` (8/8).

## Clean image build

- Built from clean detached worktree pinned to `4caaa44…`, not the dirty primary worktree.
- Tag: `event-os-solver-worker:candidate-4caaa44`
- Final image id / digest: `sha256:8ce066bcf1987f648b2263f069062ec37e0538ad7f7d2adc3f8968a91a73ff16`
- Label `org.opencontainers.image.revision` = implementation SHA above.
- Build uses BuildKit named contexts (`worker`, `platform`); supervisor bundled to `dist/supervisor.js`; runtime installs only `pg`.

Evidence: `milestone-5a/image/`

## Dependency pinning

- `pip install --require-hashes` from `python/requirements.linux.hashes.txt`
- OR-Tools exactly `9.15.6755`
- Python `3.12.14`; Node `20.19.0` (tarball SHA verified)
- No unpinned Python deps; no dev/test requirements in final image
- Base: `python:3.12.14-slim-bookworm@sha256:9c47360a2a0355e2da18516d0b1c2126ec22c195d2185e97347c9d98398c5bef`

## Final image inspection

- Non-root `solver` uid/gid `10001`
- No `EXPOSE`; no app listen port; no HTTP server; no git/curl/wget/gcc
- No tests, fake/malformed/crash child, test-only child, qualification fixtures, debug scripts, or `CPSAT_ALLOW_TEST_HOOKS`
- Expected entrypoint `node dist/supervisor.js`; production `solver_child.py` + schemas present
- Writable runtime area `/tmp/solver` only (empty after journey)

## Non-root / no-ingress proof

See `milestone-5a/journey/NO_INGRESS_AND_NONROOT.txt`. Observed only Docker DNS listen (uid 0) and outbound PostgreSQL ESTABLISHED (uid 10001).

## Real hardened journey (one child)

Ephemeral Postgres on private Docker network (`m5a-net`); worker concurrency 1; host driver on `127.0.0.1:55433` only for synthetic enqueue.

1. Migrations applied
2. Worker registered → READY (heartbeat observed)
3. Admit → enqueue → claim → real `solver_child.py` (1 invocation)
4. Outcome `READY_FOR_REVIEW` / product `OPTIMAL` / candidate sealed / lease cleared
5. `docker stop` → `supervisor_drain_begin` → lifecycle `DRAINING` → exit 0
6. No partial lease after settle; `/tmp/solver` empty

Run id: `a871187c-0ba7-49f5-a18b-f1d5ca8b089c`
Evidence: `milestone-5a/journey/HARDENED_JOURNEY.json`

Real tiny CP-SAT child executions this milestone: **1** (cap 2).

## SBOM / licence / vulnerability

| Artefact | Path / status |
|---|---|
| Filesystem inventory | `milestone-5a/sbom/FILESYSTEM_INVENTORY.txt` |
| Python packages | `milestone-5a/sbom/PYTHON_PACKAGE_INVENTORY.json` |
| Node runtime | `milestone-5a/sbom/NODE_PACKAGE_INVENTORY.txt` + inventory JSON |
| Licence (OR-Tools) | `milestone-5a/sbom/ORTTOOLS_LICENCE.txt` |
| Vulnerability scan | **BLOCKER** — `VULNERABILITY SCAN BLOCKED — NO APPROVED SCANNER` (`milestone-5a/sbom/VULNERABILITY_SCAN.txt`) |

## Claims not made

- No Railway deployment / mutation
- No signed image
- No formal qualification
- No production authorisation

## Exact remaining deployment blockers

1. Approved vulnerability scanner run on the candidate image
2. Railway worker creation/deployment using exact candidate source/image identity (not `latest`)
3. Event OS deployment + migrations 011–016 in production
4. Runtime variables/secrets wiring
5. Signed-image procedure execution
6. Frozen-candidate qualification
7. Stronger verified deployment-control mechanism (watchPatterns not durable)
8. Claude browser verification / rollback drill / CP-SAT + S06C acceptance
