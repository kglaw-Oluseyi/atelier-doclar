# MD-PR-S073 — Repository Truth Map

**Authority:** `docs/control/eos-s06/MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`  
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`  
**Mapped at local HEAD after authority placement:** `914c8c110f472285593acecf9c9abcfce2ced2fa`  
**Required repository baseline:** `3edd535321016d4d4542839274d37772eb699a52`  
**Live Event OS application SHA (unchanged, not redeployed):** `66e5bc18dad3632fbca4b21da2bdf56afa084cd1`  
**Packet:** 1 — facts only. No Prisma. No proposed Packet 4 design described as current.

---

## Baseline recorded at Packet 1

| Check | Value |
|---|---|
| `git rev-parse 3edd535` | `3edd535321016d4d4542839274d37772eb699a52` |
| Local HEAD before placement | `3edd535321016d4d4542839274d37772eb699a52` |
| `origin/main` / GitHub `main` after authorised fast-forward | `3edd535321016d4d4542839274d37772eb699a52` |
| Worktree before placement | clean except untracked authority file |
| `/api/health/live` | `alive:true`, `deployedSha:66e5bc18dad3632fbca4b21da2bdf56afa084cd1`, `productionAuthorised:false` |
| `/api/health/ready` | `ready:true`, `persistence:POSTGRES`, `migrationStatus:APPLIED`, `productionAuthorised:false` |
| S05A | `PASSED`, not blocked, `s05aReleaseReady:true` |
| S05B | `s05b-eval-v6`, 63/63, hash `987f4b6d1c4747074d750eb96a37df48e223627fd069003f75462c0769f15e04`, `PASSED`, not blocked |
| External adapters | `OBJECT_STORE`, `SCAN`, `OCR`, `SOURCE_MONITOR`, `COMMUNICATIONS` all `INACTIVE` |

Authority file was moved byte-for-byte from the repository root to this directory. Placement hash matched. Placement commit is documentation-only.

---

## 1. Seating form component and hidden command/idempotency fields

There is no standalone seating form module. Forms are declared inline in:

`apps/event-os/src/app/app/events/[eventId]/seating/page.tsx`

| Symbol | File | Role |
|---|---|---|
| `ProtectionMutationForm` | `apps/event-os/src/components/protection-mutation-form.tsx` | Client form; `useActionState(action, …)` |
| `IdempotencyField` | `apps/event-os/src/components/atelier-pending-submit.tsx` | Hidden `name="idempotencyKey"`; value is client `crypto.randomUUID()` |
| `Envelope` | local to `seating/page.tsx` | Hidden scope fields |

Hidden fields present on every seating `ProtectionMutationForm`:

- `organisationId`
- `eventId`
- `assignmentId`
- `idempotencyKey`

Server envelope parse: `EnvelopeSchema` in `apps/event-os/src/server/seating-actions.ts` (`organisationId`, `eventId`, `assignmentId` UUID, `idempotencyKey` length ≥ 12). `sessionEnvelope` resolves `actorAssignmentId` from the active assignment, not from the form `assignmentId`.

Per-form extra hidden fields include `editionId`, `blockId`, `expectedContentHash`, `expectedVersion`, `inputEditionId`, `runId`, `eligibleGuestIds`, `reason`, `editionHash`, `publicationId`, `decision`. Manual edit `command` is a visible `<select name="command">` (`ASSIGN_UNSEATED`, `MOVE`, `SWAP`, `UNSEAT`, `LOCK`, `UNLOCK`), not a hidden field.

Page copy at the Runs panel states that cancellation asks a worker to stop. No worker executor exists in the mapped implementation (see items 11–12).

---

## 2. Next.js server actions

File: `apps/event-os/src/server/seating-actions.ts` (`"use server"`). Every exported seating action delegates to `runProtectionFormAction`.

When `seatingV2ReplacementEnabled()` is true (`EVENT_OS_SEATING_V2_REPLACEMENT !== "0"`), mutating commands call `getRuntime().service.seatingV2Commands()`.

| Exported action | `actionType` | V2 command |
|---|---|---|
| `freezeSeatingInputsAction` | `seating.input.freeze` | `freezePackage` |
| `createSeatingConstraintAction` | `seating.constraint.create` | `createRule` |
| `activateSeatingRuleAction` | `seating.rule.activate` | `activateRule` |
| `withdrawSeatingRuleAction` | `seating.constraint.manage` | `withdrawRule` |
| `createReservationBlockAction` | `seating.reservation.create` | `createReservation` |
| `activateReservationBlockAction` | `seating.reservation.activate` | `activateReservation` |
| `withdrawReservationBlockAction` | `seating.reservation.withdraw` | `withdrawReservation` |
| `supersedeReservationBlockAction` | `seating.reservation.supersede` | `supersedeReservation` |
| `releaseReservationBlockAction` | `seating.reservation.release` | `releaseReservation` |
| `launchSeatingRunAction` | `seating.run.launch` | `launchRun` |
| `adoptSeatingRunAction` | `seating.plan.edit` (via adopt path) | `adoptRun` |
| `applySeatingChangeAction` | `seating.plan.edit` | `assignUnseated` or `applyManual` |
| `submitSeatingPlanAction` | `seating.plan.submit` | `submitPlan` |
| `recallSeatingPlanAction` | `seating.plan.submit` | `recallPlan` |
| `decideSeatingReviewAction` | seating review | `recordSpecialistReview` |
| `decideSeatingApprovalAction` | seating approval | `approvePlan` |
| `publishSeatingPlanAction` | seating publish | `publishPlan` |
| `requestSeatingExportAction` | seating export | `requestExport` |
| `runS06EvaluationAction` | `seating.evaluate` | `runS06EvaluationV2` |

`cancelSeatingRunAction` (`seating.run.cancel`) calls V1 `seatingCommands().cancelSeatingRun`. `SeatingV2CommandService` has no cancel method.

Verify-as: `apps/event-os/src/server/seating-verify-as-action.ts` → `switchSeatingVerifyAsAction` → same wrapper.

Typical mutation sequence:

```
ProtectionMutationForm.useActionState
  → seating action (seating-actions.ts)
  → runProtectionFormAction
      → requireActor / parseEnvelope
      → runDurableProtectionMutation(execute, withDurable)
          → seatingV2Commands().<command>
          → consumeLastMutationEffect()
      → writeTruthfulActionResult → writeActionResult
      → redirect(resultHref(scopePath, correlationId))
  → seating/page.tsx loadPresentedActionResult
  → ActionResultBanner
```

---

## 3. Action wrapper and public error mapping

Sole seating wrapper: `runProtectionFormAction` in `apps/event-os/src/server/protection-form-action.ts`.

Supporting symbols:

| Symbol | File |
|---|---|
| `runDurableProtectionMutation`, `writeTruthfulActionResult` | `apps/event-os/src/server/protection-form-lifecycle.ts` |
| `withDurable`, `getRuntime`, `ensureRuntime` | `apps/event-os/src/server/runtime.ts` |
| `platformErrorFromUnknown`, `validationFormState` | `packages/shared-platform/src/risk-form-contract.ts` |
| `classifyActionError` | `apps/event-os/src/server/operational-state.ts` |

Catch path: `isNextRedirect` rethrows; `VALIDATION_FAILED` returns `validationFormState` without redirect; other errors write a FAILURE action result and redirect. Alternate wrapper `finishAction` in `apps/event-os/src/server/actions.ts` is not used by seating.

---

## 4. `redirect()` and surrounding try / catch / finally

`redirect()` for seating exists only in `runProtectionFormAction`:

- success: after `writeTruthfulActionResult`, still inside `try`
- failure: after FAILURE result write, inside `catch`
- no `finally` in `runProtectionFormAction`
- `isNextRedirect` rethrows `digest` starting with `NEXT_REDIRECT`
- redirect is outside `withDurable`

`withDurable` (`runtime.ts`): `try { return await fn() } finally { await flushRuntime() }`.

`apps/event-os/test/s060-persistence-boundary.test.ts` asserts redirect is not inside the durable wrapper.

---

## 5. Action-result write, storage, retrieval, recall, consume

All Event OS modules. Shared-platform exports durable-mutation-effect types only. No action-result database table.

| Symbol | File |
|---|---|
| `ActionResult`, `buildActionResult`, `signActionResult`, `verifyActionResult`, `rememberActionResult`, `recallActionResult`, `forgetActionResult`, `resolveStoredActionResult`, `presentActionResult`, `resultHref` | `apps/event-os/src/server/action-result.ts` |
| `writeActionResult`, `readActionResult`, `loadPresentedActionResult`, `consumeMatchingActionResult` | `apps/event-os/src/server/action-flash.ts` |
| `consumeActionResultAction` | `apps/event-os/src/server/action-result-actions.ts` |
| `ActionResultBanner`, `ActionResultConsumer` | `apps/event-os/src/components/action-result-banner.tsx`, `action-result-consumer.tsx` |
| `AtelierStateFocus` | `apps/event-os/src/components/atelier-state-focus.tsx` |

Write: `rememberActionResult` (process-local `Map` keyed by `correlationId`) plus HMAC-signed cookie `md_event_os_action_state`, httpOnly, sameSite=lax, maxAge 90s.

Retrieve on seating page: `loadPresentedActionResult({ requestPath, resultId: query.result, actorPersonId, organisationId, eventId })` prefers in-memory recall for `?result=` then cookie; `presentActionResult` enforces session/actor/scope/event guards.

Consume: client `ActionResultConsumer` or `AtelierStateFocus` → `consumeActionResultAction` → `consumeMatchingActionResult` → `forgetActionResult` + cookie clear. Consumed IDs are blocked from re-presentation.

Storage is process-local memory plus cookie. It is not shared across processes or Railway replicas.

---

## 6. Seating V2 command service and repository interfaces

| Symbol | File |
|---|---|
| `SeatingV2Transaction`, `SeatingV2Repository` | `packages/shared-platform/src/seating-v2-repository.ts` |
| `SeatingV2CommandService` | `packages/shared-platform/src/seating-v2-command-service.ts` |
| `PostgresSeatingV2Repository`, `PostgresSeatingV2Transaction` | `packages/shared-platform/src/postgres-seating-v2-store.ts` |
| `MemorySeatingV2Repository`, `MemorySeatingV2Transaction` | `packages/shared-platform/src/memory-seating-v2-store.ts` |

`SeatingV2Repository.transaction(fn)` is the only command boundary. `PlatformService.seatingV2Commands()` constructs `PostgresSeatingV2Repository(this.client)` when the store is `PostgresPlatformStore`, otherwise `MemorySeatingV2Repository`.

All mutating commands go through private `mutate()` which:

1. requires an idempotency key
2. opens `this.repo.transaction`
3. loads/inserts idempotency receipt
4. runs work
5. appends audit
6. emits `appliedMutationEffect` / `replayedMutationEffect`

`solveSeatingV2Compiled` is not exported from `packages/shared-platform/src/index.ts`.

---

## 7. PostgreSQL client, pool and transaction helper

Library in use: `pg` `Pool`. Not postgres.js, not Neon SDK, not Prisma.

Event OS construction: `apps/event-os/src/server/runtime.ts` `postgresRuntime()`:

```ts
const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 8_000 });
```

Transaction helper on the adapted client:

- `pool.connect()`
- `BEGIN`
- `fn(adapt(connected))`
- `COMMIT` or `ROLLBACK`
- `connected.release()` in `finally`

Abstraction: `PgQueryable` / `PgTransactor` in `packages/shared-platform/src/postgres-schema.ts`.

Seating V2: `PostgresSeatingV2Repository.transaction` calls `this.client.transaction(...)` when the client has that method. There is no `withTransaction` symbol in seating V2.

---

## 8. Event / current-row locks and `FOR UPDATE`

Seating V2 Postgres `FOR UPDATE` queries (exactly three):

| Method | SQL target | Used by command service |
|---|---|---|
| `lockEventCurrent` | `seating_v2_event_current … FOR UPDATE` | Yes — `pointCurrent()` then `updateCurrent` |
| `lockOccupiedRunPosition` | `seating_v2_run_assignments … FOR UPDATE` | No call sites outside the store |
| `lockOccupiedPlanPosition` | `seating_v2_plan_assignments … FOR UPDATE` | No call sites outside the store |

`pointCurrent` is used from `persistWorkingEdition`, `submitPlan`, `publishPlan`. Memory store locks are ordinary reads.

No `FOR UPDATE SKIP LOCKED` in seating V2 implementation.

---

## 9. Freeze: upstream reads, canonicalisation, hashing, insert/replay

`SeatingV2CommandService.freezePackage` → `mutate` → `build()` → `buildSeatingV2Package` (`packages/shared-platform/src/seating-v2-package.ts`) — all inside one transaction.

Upstream reads inside the transaction:

- snapshot adapters: `snapshotGuestCohortAdapter`, `snapshotLayoutAdapter`, `snapshotBriefAdapter`, `snapshotProtectionAdapter`
- `tx.list("ruleEditions")` filtered `lifecycle === "ACTIVE"`
- `tx.list("reservationEditions")` filtered `lifecycle === "ACTIVE"`
- `ruleSubjects`, `ruleTargets`, `reservationMembers`, `reservationTargets`

Canonicalisation: `compileSeatingV2Request` in `packages/shared-platform/src/seating-v2-compiler.ts`.

Hashes:

| Hash | Function |
|---|---|
| Config | `SEATING_V2_CONFIG_HASH = exactHash({ solverVersion, timeLimitMs: 10_000, memoryLimitMb: 256 })` |
| Semantic | `seatingV2SemanticHash(...)` |
| Package content | `seatingV2PackageContentHash(semanticHash, compiled.compiledRequestHash)` |

Replay: if an `inputPackages` row already has the same `contentHash`, `freezePackage` returns `{ replayed: true, value: existing }` and does not insert.

Otherwise inserts `inputPackages`, `packageGuests`, `packagePositions`, `packageRules`, `packageReservations`, `compiledRequests`.

---

## 10. Launch: run insert, solver, validator, terminal persistence

`launchRun` is entirely inside `mutate` → one `repo.transaction`.

Sequence:

1. load package; replay existing run matching package hash + solver version + config hash + seed
2. load compiled request
3. `solveSeatingV2Compiled(compiled.request)` — synchronous, same thread
4. `validateSeatingV2(...)` — synchronous, same thread
5. build run with `status: report.verdict` (`FEASIBLE` \| `INFEASIBLE`) and `solverClaim: solved.solverClaim`
6. `startedAt` and `completedAt` set to the same `now`
7. insert `runs`, `runAssignments`, `validationReports`, `validationRuleOutcomes`, `validationStructuralOutcomes`

Solver and validator both execute inside the open database transaction. Commit happens after inserts, idempotency receipt and audit.

---

## 11. Solver timeout, abort, node budget

Adapter: `packages/shared-platform/src/seating-v2-solver-adapter.ts` `solveSeatingV2Compiled` maps V2 compiled JSON to V1 `SolverRequest` and calls `solveSeatingV1` with `timeLimitMs: 10_000`, `memoryLimitMb: 256`.

V1 solver: `packages/shared-platform/src/seating-solver-v1.ts`.

- Deadline is `Date.now() + timeLimitMs`.
- Recursive `visit()` sets `timedOut = true` and returns when `Date.now() > deadline` or heap exceeds the memory limit.
- `limits.nodes` is incremented for metrics. There is no node-budget abort.
- No `worker_threads`, no `AbortSignal`, no `worker.terminate()`.
- Timeout is cooperative early return on the request thread. Stopping the await is the same as stopping the compute only if those checks fire.

V2 run `status` stored by `launchRun` is the validator verdict, not solver `TIMED_OUT`.

---

## 12. Run statuses, leases, recovery

Declared run statuses (`SEATING_V2_RUN_STATUSES` in `seating-v2-schemas.ts`):

`QUEUED`, `RUNNING`, `FEASIBLE`, `INFEASIBLE`, `TIMED_OUT`, `CANCELLED`, `ERROR`

`launchRun` writes only `report.verdict` (`FEASIBLE` \| `INFEASIBLE`). `QUEUED`, `RUNNING`, `TIMED_OUT`, `CANCELLED`, `ERROR` are never assigned by `SeatingV2CommandService`.

Lease columns exist on `seating_v2_runs` (`lease_owner`, `lease_until`) and on the TypeScript run type (`leaseOwner`, `leaseUntil`). `launchRun` does not set them. No claim, heartbeat, reaper or lease-expiry recovery exists.

`cancelSeatingRunAction` does not call V2. Abandoned non-terminal V2 runs cannot be created by the current launch path because the run is inserted only after solver + validator complete.

---

## 13. Independent validator imports and execution placement

`packages/shared-platform/src/seating-v2-validator.ts` imports `exactHash`, `seatingV2AssignmentsHash`, and seating-v2 schemas only. It does not import `seating-solver-v1` or `seating-v2-solver-adapter`.

Enforced by `packages/shared-platform/test/seating-v2-hash-compiler-validator.test.ts` (“does not import the V1 solver from the validator module”).

Command service imports solver and validator independently and calls them sequentially inside `launchRun`. Validator is also called from `revalidate` / `assertFreshFeasible`, `proposeManual`, `adoptRun`, and the evaluation runner. Those paths do not import the solver.

---

## 14. Next.js runtime / build / standalone

`apps/event-os/next.config.ts`:

- `reactStrictMode: true`
- webpack `.js` → `.ts/.tsx/.js` alias
- `serverExternalPackages: ["pg", "@aws-sdk/client-s3"]`
- `transpilePackages` includes `@maison-doclar/shared-platform`
- `experimental.serverActions.bodySizeLimit: "21mb"`
- no `output` key; no `output: "standalone"`

Scripts: `next build`; `next start --port ${PORT:-3020}`. Next `^15.2.4`. No `instrumentation.ts` in the repository. No custom Node server file under `apps/`.

---

## 15. Railway start command and replica topology (visible without change)

Repo-visible facts:

- No `railway.toml`, Dockerfile, nixpacks.toml, Procfile or railpack.toml.
- `docs/control/LIVE_RUNTIME_CONFIGURATION.md` records GitHub-sourced deploys use Railpack with root `package.json` `build` / `start`.
- Root `build` builds control-tower then event-os.
- Root `start` is `pnpm --filter @maison-doclar/control-tower start`.
- Event OS start script is `next start --port ${PORT:-3020}`.
- Railway project `atelier-doclar`, service `event-os`, live URL `https://event-os-production-bc8d.up.railway.app`.
- Event OS service start command in the Railway UI is not encoded in this repository.
- Documented topology: one Event OS replica (`docs/control/EOS_S05_BUILD_LEDGER.md`). Replica count is not encoded in repo config.
- `TDR-S04F-001` records process-local action-result recall as replica-unsafe.

This map does not change Railway topology.

---

## 16. Current S06 evaluation edition, contract, hash, readiness

Source: `packages/shared-platform/src/seating-evaluation-v2-schemas.ts`.

| Constant | Value |
|---|---|
| Corpus edition | `s06-eval-v3` |
| Contract | `s06-eval-contract-v2` |
| Projection | `seating-projection-v2` |
| Case count | 35 (`S06_V2_CASE_IDS`) |
| Solver version | `s06-solver-v2` |
| Validator version | `s06-validator-v3` |

`s06V2CorpusHash()` = `exactHash({ edition, contract, solver, validator, projection, cases })`.

`seatingV2EvalReadiness()` returns `RELEASE_READY` only when status is `PASSED`, edition is `s06-eval-v3`, case count is 35, and `failedCount === 0`. Otherwise `BLOCKED`.

UI action: `runS06EvaluationAction` → `runS06EvaluationV2`. Evaluation compute (`executeS06EvaluationV2`) runs before the persist transaction in `SeatingV2CommandService.runS06EvaluationV2`.

---

## 17. Remaining-gates Playwright helper and fresh-result logic

Spec: `apps/event-os/e2e/s06-v2-s072-live-remaining.spec.ts` (`CURSOR-S06V2-S072 remaining live gates`), skipped unless `PLAYWRIGHT_LIVE=1`.

Helper: `settleSeatingMutation` in `apps/event-os/e2e/s060-helpers.ts`.

Exact fresh-result rules:

1. Default timeout 30_000 ms.
2. Poll until `protection-validation-summary` exists **or** URL `?result=` is a UUID **and** `result !== previousResult`.
3. Then require `seating-overview` visible and `action-result-banner` visible.
4. Remaining-gates local `timedAction` captures `previousResult` before click, calls `settleSeatingMutation`, requires banner success copy, and requires the new correlation ≠ previous correlation.

`expectFreshResultQuery` is the lower-level UUID poll (`value !== previousResult`). `clickAndProveFreshResult` additionally waits for exactly one Next-action POST and asserts `action-result-correlation` equals the URL result; remaining-gates uses `settleSeatingMutation`, not that helper.

The suite does not accept an old banner, empty alert, or appeared-after-reload as settlement.

---

## Packet 1.4 — retained regression tests

No production behaviour was edited for these tests.

| Required fact | Retained evidence |
|---|---|
| Unchanged recall successor retains recalled material content hash | `packages/shared-platform/test/seating-v2-hash-compiler-validator.test.ts` — “excludes recall lineage from the shared plan content hash”; eval case `S06V2-PATH-11` observation `recallHashPreserved` |
| Unseated required guest is a hard structural violation | same validator test — `UNSEATED_REQUIRED_GUEST` / `FAILED`; eval `S06V2-PATH-12` `unseatedRequiredFailed`; validator `seating-v2-validator.ts` |
| HARD relation with unseated required subject is not `SATISFIED` | same validator test — `ruleOutcomes[0].outcome === "VIOLATED"`; eval `unseatedRuleNotSatisfied` |
| Only ACTIVE reservations enter a new package | `buildSeatingV2Package` filters `lifecycle === "ACTIVE"`; `packages/shared-platform/test/seating-v2-command-path.test.ts` — “withdrawn reservation leaves the next freeze and capacity ledger”; eval `S06V2-PATH-13` |
| Adopt unavailable without a current independent `FEASIBLE` report | `adoptRun` throws unless `run.status === "FEASIBLE"` then revalidates; workspace `validatorVerdict` is set only when `report.validatorVersion === SEATING_V2_VALIDATOR_VERSION`; page shows Adopt only when `run.validatorVerdict === "FEASIBLE"`; eval `S06V2-PATH-12` `adoptDenied` |
| Previous published plan remains available during successor work | workspace `currentPublication` is independent of `workingEdition`; page copy “Publication ${n} remains the operational seating.”; live remaining-gates and `s06-v2-s072-live.spec.ts` publication sequences |

---

## Cross-cutting facts relevant to later packets

These are observations, not correction decisions.

1. Launch holds one `pg` transaction across solver CPU and validator CPU.
2. Action results are cookie + in-process memory. They are not durable across process restart or replica boundary.
3. Redirect already rethrows the Next sentinel and occurs after durable mutation + result write.
4. No isolated executor, queue claim, lease, or genuine `worker.terminate()` exists.
5. Run statuses `QUEUED` / `RUNNING` are schema-only.
6. V2 cancel is not implemented; the cancel action calls V1.
7. `instrumentation.ts` does not exist. There is no custom server to start a dispatcher.
8. Next standalone output is not configured.

Packet 1 did not change runtime code.
