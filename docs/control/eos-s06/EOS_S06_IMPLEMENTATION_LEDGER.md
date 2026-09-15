# EOS-S06 Implementation Ledger

**Prompt Control ID:** MD-PR-S077 (acceptance); historical implementation MD-PR-S075 / MD-PR-S073 / MD-PR-S072
**Status:** ACCEPTED — CURRENT PRODUCT GATE GREEN / EXTENDED HISTORICAL REGRESSION RETAINED AS CONTROLLED DEBT (`MD-PR-S077`, 2026-09-15)
**Accepted / deployed application SHA:** `42b0bb3f0976ca2b745a09f3952680afef69a1b9`
**Railway deployment:** `bb0f03d1-81fb-4fba-bf86-206f92a5953d` SUCCESS
**Pre-acceptance repository/docs tip reviewed:** `48cb593813a448c50bb506bd4cbc72e679cfb404`
**Acceptance record:** `docs/control/EOS_S06_ACCEPTANCE.md`

This ledger previously recorded implementation without acceptance. Those dated “NOT ACCEPTED” / “NOT READY FOR CLAUDE” states remain historical and are not rewritten. Formal acceptance is `MD-PR-S077` on 2026-09-15. This acceptance commit does not redeploy Event OS or Control Tower.

## Addendum — 2026-09-15 formal acceptance (`MD-PR-S077`)

| Item | Value |
|---|---|
| Decision authority | ChatGPT / AI CTO |
| Acceptance date | 2026-09-15 |
| Status | ACCEPTED — current product gate green; extended historical regression retained as controlled debt |
| Catalogue accepted-slice count | 6 |
| Persistence | POSTGRES |
| Migrations | APPLIED |
| `productionAuthorised` | false |
| Providers | INACTIVE |
| Control Tower | Not deployed |
| Current-product blocking defects | ZERO |
| CI boundary | Overall programme-validate run `35001426000` not globally green; shard 0 current acceptance PASSED; historical corpus failure retained as `TDR-S06-003` |
| EOS-S06A | RATIFIED / ELIGIBLE / NOT STARTED |
| EOS-S07 | NOT_STARTED / NOT_AUTHORISED |

Historical S072/S073/S075 progress tables below remain dated implementation history.

---

**Historical header (2026-09-13, superseded for status only):**

**Prompt Control ID:** MD-PR-S075 (parents MD-PR-S073 / MD-PR-S072)
**Status:** IMPLEMENTED — NOT ACCEPTED — NOT READY FOR CLAUDE
**Required S072 baseline:** `844f107fc70e1eaa8995e0c7c49c0c42d52b9dd1`
**Deployed application SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Final repository/docs SHA:** `3f5c09b37d683ad7192660a33f596b7e72d75583` (documentation/test only; not redeployed)
**Authority:** MD-PR-S075 remains the ratified parent for table identity, compiler and feasibility truth. The solver-claim honesty addendum was ratified on 2026-09-13 and is the narrow current execution authority for solver-claim correction only. MD-PR-S073 remains the dated settlement/isolation freeze. MD-PR-S072 remains the V2 seating-truth parent. S070/S071 artefacts remain readable as incompatible history.

This ledger does not accept EOS-S06. It does not authorise real data or production operations. It does not create `EOS_S06_ACCEPTANCE.md`.

Historical S072 handoff status **NOT READY FOR CLAUDE** remains dated history. MD-PR-S073 Packet 8 **READY FOR INDEPENDENT HOLDOUT AND CLAUDE** remains dated settlement history. Current readiness is **NOT READY FOR CLAUDE** until MD-PR-S075 Sections 1–14 complete.

## MD-PR-S075 progress

| Item | Value |
|---|---|
| Authority SHA-256 | `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0` — parent file untouched |
| Solver-claim honesty addendum | `docs/control/eos-s06/MD_PR_S075_ADDENDUM_SOLVER_CLAIM_HONESTY.md` — SHA-256 `160d23dea037b8b271c50e7edc7458ab67a8763f8be402d63b9cf8c248357fbb` — RATIFIED and executed 2026-09-13 |
| Deployed application SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` — not redeployed |
| Sections 1–8 | PASS |
| Section 9 | PASS after addendum — 12/12 agreement; mutations detected from observations; smallest seed `s075-oracle-v1:capacity-infeasible` now solver/validator/oracle `INFEASIBLE`/`INFEASIBLE`/`NONE`. Solver runtime `s06-solver-v3`. Validator and oracle unchanged. `s06-eval-v3` hash unchanged `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` |
| Section 10 | PASS — current edition `s06-eval-v4` / contract `s06-eval-contract-v4` / 49 cases / corpus hash `0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369` / config hash `5e05590ee74b527002c9cabad6d45384094c4f4f5d56ec2730e60a72840ac815`. Frozen `s06-eval-v3` remains `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` and is honestly STALE. Live persist on `1ce6e0f` was not restamped. Live corpus not run. |
| Section 11 | PASS after recorded first-run typecheck and V1 `S06-SOL-04` corrections. Focused S075 units 47/47. Typecheck retry PASS. Programme validate `NO_CYCLES`. `git diff --check` clean. Shared-platform retry 636/636. Event OS units 106/106 first run. Event OS `next build` PASS alone. Isolated development-runtime Playwright groups each passed on their own execution. Production-mode and live Playwright were not executed. Not pushed. Not deployed. Section 12 not started. |
| Section 2 finding | `docs/control/eos-s06/MD_PR_S075_FORENSIC_TABLE_NAMESPACE_FINDING.md` — remains valid |
| Section 7 replay identity | `docs/control/eos-s06/ADR_EOS_S06_V2_RUN_REUSE_IDENTITY.md` — additive `009`; historic compiler ineligible for reuse/adopt |
| Section 8 capacity truth | Physical seats authoritative; declared synthesis only at zero physical; freeze `SEAT_CAPACITY_MISMATCH`; Studio reads persisted count |
| Temporary diagnostic tunnel | Closed. Port `55432` none. No `ssh -L`. Homebrew `postgresql@16` left running as a pre-existing machine service. No reconnect unless a later mandated gate genuinely requires read-only verification. |
| Subsequent proof | Repository tests and governed live UI journeys only. Direct database access is not a substitute for required product workflows. |
| Current verdict | NOT READY FOR CLAUDE |

## Section 10 evaluation identity

| Item | Value |
|---|---|
| Current edition | `s06-eval-v4` |
| Current contract | `s06-eval-contract-v4` |
| Honest case count | 49 |
| Ordered register | `S06V2-PATH-01` … `S06V2-PATH-10`, `S06V2-M01` … `S06V2-M20`, `S06V2-PATH-11` … `S06V2-PATH-13`, `S06V2-M21`, `S06V2-M22`, then `S06V4-PATH-01` … `S06V4-PATH-06`, `S06V4-M01` … `S06V4-M08` |
| Preserved v3 cases | 35 unchanged; not restamped |
| New v4 cases | 14 production-chain cases (`REQUIRE_TABLE` one- and two-subject, `FORBID_TABLE`, reservation, four-guest witness, declared-synthetic, missing table, raw UUID, false `FEASIBLE`, incomplete-not-`INFEASIBLE`, validator/compiler reuse split, capacity mismatch, raw-target mutation) |
| Corpus hash | `0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369` |
| Configuration hash | `5e05590ee74b527002c9cabad6d45384094c4f4f5d56ec2730e60a72840ac815` |
| Frozen v3 edition / contract / count / hash | `s06-eval-v3` / `s06-eval-contract-v2` / 35 / `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` |
| Readiness | Persisted v3 `PASSED` is `STALE` / `BLOCKED`. Only current v4 with 49 cases and zero failures is `RELEASE_READY`. |
| Production import ban | Corpus/runner/compiler/solver/package/command-service/index do not import the Section 9 oracle or test-only mutation adapters. |
| Live corpus | Not run. Not pushed. Not deployed. |

## Freeze

| Item | Value |
|---|---|
| Application / deployed Event OS SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` |
| Repository/docs SHA | `3f5c09b37d683ad7192660a33f596b7e72d75583`; not the live application SHA |
| Railway project / env / service | `atelier-doclar` / `production` / `event-os` |
| Live health SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` |
| Persistence | POSTGRES, migrations APPLIED |
| `productionAuthorised` | `false` |
| External providers | INACTIVE |
| Solver | In-process V2 compiled request; runtime `s06-solver-v3`; contract shape remains `eos-s06-solver-v2`; validator `s06-validator-v3`; solver + validator outside every seating transaction; no queue/worker |
| Evaluation | Current repository corpus `s06-eval-v4` / `s06-eval-contract-v4` / 49 cases / hash `0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369` / config `5e05590ee74b527002c9cabad6d45384094c4f4f5d56ec2730e60a72840ac815`. Local focused eval/mutation/schema/readiness PASS. Live persist on `1ce6e0f` remains historic `s06-eval-v3` PASSED and is now honestly STALE. Not redeployed. |
| Legacy evaluation | `s06-eval-v1`, `s06-eval-v2` and `s06-eval-v3` STALE/INCOMPATIBLE — not restamped. Frozen v3 hash remains `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` |
| Last-known-good publication | Publication 4 `a6ac23f65f23a10f0dc1deab9464e50791c055e825de3d541fd24a0a34dfbc4d` |
| Temporary diagnostics | Routes 404; `EVENT_OS_DIAGNOSTIC_TOKEN` absent |
| Local execution modes | Section 11 Event OS production build passed alone. Production-mode Playwright not executed. Isolated development-runtime Playwright: each prescribed S075 and changed-risk S072/S073 group passed on its own execution. Live Playwright not run. Live production verification on deployed SHA `1ce6e0f` remains dated Packet 8 history. |
| Control Tower | untouched |

## Sealed holdout

Not accessed, created or inferred. Packet 8 previously authorised independent holdout and Claude; MD-PR-S075 now blocks that start. Cursor has not run Claude.

## Successor

EOS-S07 is not started. `EOS_S06_ACCEPTANCE.md` was not created.
