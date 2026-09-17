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
