# MD-PR-S073 Packet 8 — Freeze and final report

**Headline:** `READY FOR INDEPENDENT HOLDOUT AND CLAUDE`

**Deployed application SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Final repository/docs SHA:** `3f5c09b37d683ad7192660a33f596b7e72d75583` (documentation/test only; not redeployed)
**Authority:** `docs/control/eos-s06/MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`
**Authority SHA-256:** `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff`
**Parent:** ratified MD-PR-S072, SHA-256 `de154b2349f2056275d66dcc11d3ab88f3b283b16d0acd37311ea8ca628f3182`

This report does not accept EOS-S06. It does not create `EOS_S06_ACCEPTANCE.md`. Claude was not run. Control Tower was not deployed. EOS-S07 is not started. Event OS was not redeployed for this documentation/test stamp.

---

## 1. Baseline and parity

Required repository baseline at Packet 1 was `3edd535321016d4d4542839274d37772eb699a52`. Live Event OS before S073 was `66e5bc18dad3632fbca4b21da2bdf56afa084cd1`. Packet 8 local HEAD before this stamp was test-only `0e5f2c49e737b8f5086b5b08830b29cd96f56f0f`, tracking `origin/main`. Live ready SHA equals the application SHA `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`. Persistence POSTGRES, migrations APPLIED, `productionAuthorised:false`.

## 2. Authority placement/hash

Authority file remains at `docs/control/eos-s06/MD_PR_S073_EOS_S06_V2_LIVE_COMMAND_SETTLEMENT_AND_PROCESS_ISOLATION.md`. SHA-256 `9e527f289b71c5d794f472bf271839799a042916985b1eda288028b8709537ff` is unchanged from Packet 1 placement.

## 3. Commits/files by packet

| Packet | Role | SHAs |
|---|---|---|
| 1 | Authority placement, truth map | `914c8c1`, `684d5ea` |
| 2 | Diagnostic instrumentation and Branch B finding | `b1da257`, `b92b880` |
| 3 | ADR + failing outside-TX test | `2e38467` |
| 4–6 | Solver/compile outside TX; test-clock corrections | `9dafb84`, `34d3faa`, `5064e2d`, `8089812`, `0255608` |
| 7 | Remove diagnostics; consume-once Adopt fix; live gates | `d693400`, `caff006`, `1ce6e0f` (deployed) plus test-only `2f97603`, `0e5f2c4` |
| 8 | Timing evidence, ledgers, this report | `3f5c09b` plus SHA-stamp commit |

Application correction that remains deployed: `caff006` consume-once after Adopt, proven live as `1ce6e0f`.

## 4. Repository truth map

Packet 1 map `MD_PR_S073_REPOSITORY_TRUTH_MAP.md` remains the structural record. Launch still prepares, solves and validates outside the persist transaction, then 303s. Diagnostic HTTP routes are retired. Action-result consume-once is now the Adopt lifecycle correction.

## 5. Diagnostic timeline and exact branch finding

Packet 2 on `b1da257` proved Branch B: solver and validator ran inside an open seating transaction. Branch A was not proven (event-loop busy but probe never unavailable ≥5s). Branches C–F were rejected. Finding: `MD_PR_S073_DIAGNOSTIC_FINDING.md`.

## 6. Rejected hypotheses

Worker threads, sibling Node worker, queue/lease/QUEUED architecture, Prisma, shared action-result rewrite, and timeout inflation were rejected. Packet 8 reconfirms: no queue/worker was introduced because the corrected synchronous path met the live bound.

## 7. ADR and chosen correction

`ADR_EOS_S06_V2_COMMAND_EXECUTION_ISOLATION.md`: split transactions around compute. Solver, validator and package compilation run outside every database transaction. Executor option: none.

## 8. Migration/repository/transaction boundaries

No new seating migration. Prepare TX then compute then persist TX. No transaction in the Gate E resample exceeded 2s. Persist TX 532–794ms is above the 300ms target and below the 2s gate.

## 9. Execution isolation/build packaging

One Event OS Node process. Inline solver after prepare commit. Temporary diagnostic surface removed on `d693400`. `EVENT_OS_DIAGNOSTIC_TOKEN` is absent from live Event OS variables. `/api/_diag/event-loop`, `/api/_diag/db-wait` and `/api/s073-diag/settlement` return 404.

## 10. Cancellation/lease/reaper proof

Unchanged cooperative deadline. `QUEUED` / `RUNNING` / lease columns remain unused. Packet 8 did not add a reaper.

## 11. Solver claim versus independent validator/certificates

Solver claim remains evidence. Independent `validateSeatingV2` remains authority. Launch persist writes the validator verdict. Solver time on the five samples was 11–17ms; validation 0–1ms.

## 12. Replay/retry/idempotency truth

Same-command idempotency and semantic run replay remain the only duplicate suppressors. Gate E concurrent other freeze was `REPLAYED`. Publication 3 and 4 replays preserved identity.

## 13. Action-result/redirect correction or proof it was not reopened

Redirect remains after commit and outside `catch`. Packet 7 Gate B was a browser consume-once remount defect, not a wrong `SEATING_VALIDATION_REJECTED`. Correction: `shouldScheduleActionResultConsume` once per correlation (`caff006`). Shared result store was not rewritten.

## 14. UX/focus/polling/accessibility

No seating run-status poller was added. Local S072 overflow/axe journeys passed. S049 action-result/focus journeys passed. Gate B post-Adopt Studio remains a real form POST.

## 15. Evaluation edition/hash/count/mutations/readiness

Current corpus `s06-eval-v3`, 35 cases, hash `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c`, contract `s06-eval-contract-v2`. Live CEO persist on `1ce6e0f`: result `1f99ec13-33e0-48e6-a48b-000a41cfe164`, 17382ms, `dataChanged` Yes. Packet 8 CEO readback: `Last evaluation s06-eval-v3: PASSED · 35 cases`. Prior `s06-eval-v1` / `s06-eval-v2` remain STALE/INCOMPATIBLE and were not restamped. Unauthorised roles cannot run the evaluation.

## 16. Local gates

| Gate | Result |
|---|---|
| Event OS + shared-platform typecheck | PASS |
| `@maison-doclar/shared-platform` unit | 590 pass / 0 fail |
| `@maison-doclar/event-os` unit | 106 pass / 0 fail |
| `pnpm programme:validate` | PASS (`verdict=NO_CYCLES`) |
| Event OS `next build` | PASS (after a first concurrent-`.next` collect failure while Playwright was running; clean rebuild PASS) |
| `git diff --check` | PASS |
| Focused S073 `s073-diagnostic-removed` | PASS |
| Changed-risk S072 `s06-v2-s072` / `s06-studio-editing` / `s06-solver-feasible` | PASS (four login timeouts after a dying local Next worker on the first batched run; isolated rerun 4/4 PASS) |
| Affected action-result `s05a-s049-action-result-truth` | PASS 3/3 on first run |

## 17. Every first-run failure

Preserved, not erased by later passes:

1. S072 TDR-S06-001: live launch unexpected server failure after freeze on `b5132bf` / `0d43a9e` — publication/eval unfinished at S072 handoff.
2. Packet 2: solver inside the seating transaction (Branch B).
3. Packet 6: baseline test-clock / fixture isolation defects. Record: `MD_PR_S073_PACKET_6_BASELINE_TEST_CLOCK_DEFECT.md`.
4. Packet 7 first freeze: server 303 existed; Playwright timed out waiting for `seating-overview`. Client settlement flake, not Branch B.
5. Packet 7 Gate B: after Adopt the Studio form did not emit POST (consume-once remount). Corrected on `caff006`.
6. Packet 7 Gate B test: 360s timeout because `textContent().catch` swallowed an already-rendered rejection banner. Test-only `2f97603` / `0e5f2c4`.
7. Packet 7 Gate E wrapper `otherMs=3429` / `launchMs=5790` on `1ce6e0f`. Scoped internals were launch 3224/3162 and other 3429/3361, both replays. Retained in `MD_PR_S073_PACKET_7_GATE_E_TIMING.md`.
8. Packet 8: first Event OS build collided with a live Playwright `.next` and failed collecting `/api/audit/export`. Clean rebuild PASS.
9. Packet 8: first local Playwright batch 10 passed / 4 failed after the Next worker aborted (`ECONNRESET`). Isolated rerun of the four tests PASS.

## 18. Live remaining-gate evidence

On `1ce6e0f` against `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b`: Gates A–E functional pass; Gate E timings classified and closed; post-Adopt responsiveness pass; hard UNSEAT reject `efce9827-…` left hash `1c04ddc0…` unchanged.

## 19. Two publication/replay sequences

On `1ce6e0f` (no later application change, so not rerun in Packet 8):

| Sequence | Current publication | Hash | Replay |
|---|---|---|---|
| 1 | Publication 3 | `292fb1ea259594a01e7407ea666aa48782a68db7a4244c4488a547e6b8169844` | identity unchanged, no data change |
| 2 | Publication 4 | `a6ac23f65f23a10f0dc1deab9464e50791c055e825de3d541fd24a0a34dfbc4d` | identity unchanged, no data change |

Last-known-good remains visible while a successor is WORKING/DRAFT. Auditor cannot mutate. Admin has no seating business authority.

## 20. Railway deployment/health/providers/production state

Live `/api/health/live`: `alive:true`, SHA `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`, `productionAuthorised:false`.
Live `/api/health/ready`: ready, POSTGRES, APPLIED, fixtures on, S05A PASSED / release-ready, S05B `s05b-eval-v6` 63/63 hash `987f4b6d1c4747074d750eb96a37df48e223627fd069003f75462c0769f15e04` PASSED, adapters OBJECT_STORE/SCAN/OCR/SOURCE_MONITOR/COMMUNICATIONS all INACTIVE. `EVENT_OS_GIT_SHA=1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`. Diagnostic token absent. Control Tower untouched.

## 21. Retained debt and recovery

- Launch still 303s only after solver + validation + persist. Measured live POST max 2931ms. Not converted to a queue.
- Persist TX p95 794ms > 300ms target, < 2s gate.
- Cooperative solver timeout remains in-process.
- TDR-S06-001 (S072 launch 5xx / unfinished live sequences) is closed by S073 live publication/eval on `1ce6e0f`.
- Carried accepted-slice debt (IdP, inactive providers, TDR-S04A-011 before real clients) is unchanged.
- Rollback of the deployed application: redeploy `1ce6e0f` or earlier known-good `d693400` / `66e5bc18` as appropriate. This docs SHA is not an application rollback target.

## 22. Explicit Claude/acceptance/EOS-S07 stop

Claude is not run. EOS-S06 is not accepted. `EOS_S06_ACCEPTANCE.md` was not created. Control Tower is not deployed. EOS-S07 is not started. Production remains unauthorised. Next authorised step is independent holdout and Claude only.

---

EOS-S06 MD-PR-S073 LIVE COMMAND SETTLEMENT AND PROCESS ISOLATION COMPLETE — READY FOR INDEPENDENT HOLDOUT AND CLAUDE ONLY IF EVERY NON-SEALED GATE PASSED — NOT ACCEPTED — EOS-S07 NOT STARTED.
