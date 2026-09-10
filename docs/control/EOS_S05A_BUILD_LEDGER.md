# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S051` (final decision-result focus of MD-PR-S049; prior `MD-PR-S049` / `MD-PR-S047` / `MD-PR-S045` / `MD-PR-S043` / `MD-PR-S041`)
**Starting baseline for MD-PR-S051:** `edb0a019c4dc104678924f0e27f4796a574456ba`
**Application/test SHA:** `50322fa5fdf7b46437dc9d62579e2e2ad918e762`
**Status:** `IMPLEMENTED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `EEC-00`–`EEC-44` implemented; `EEC-45` not Cursor acceptance
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

## Units

| Unit | Title | Status |
|------|-------|--------|
| EEC-00–EEC-10 | Foundation | COMPLETE |
| EEC-11–EEC-14 | Brief, client sign-off, conversion, workbench | COMPLETE |
| EEC-15–EEC-25 | Budget Engine, Studio, client investment | COMPLETE |
| EEC-26–EEC-32 | Calendar roadmap and client timeline | COMPLETE |
| EEC-33–EEC-36 | Fixture AI and change adapters | COMPLETE |
| EEC-37–EEC-38 | Interview corpus and no-repeat orchestration | COMPLETE |
| EEC-39 | Executable evaluation / red-team gate | COMPLETE under `MD-PR-S041` — S040 boolean self-report removed |
| EEC-40 | Event Command | COMPLETE |
| EEC-41–EEC-44 | Assurance evidence | COMPLETE as implementation; Claude deferred |
| EEC-45 | Acceptance | NOT_APPLICABLE |

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Client projection after S040 schema | Implementation defect (S040) | `clientInvestmentProjection` still referenced removed `envelope` | Use `envelopeAction` | Focused tests pass |
| Calendar instantiate assertion | Test defect (S040) | Service returns the edition, not `{ edition, milestones }` | Assert on edition plus workspace milestones | Completion tests pass |
| `pnpm typecheck` unused symbols | Implementation defect (S040) | Replaced interview script left unused locals | Remove dead script and unused import | `tsc` pass |
| Local Playwright sign-in | Environment defect (S040) | Parent-shell access token did not match the fixture server | Run local E2E with the fixture token | Responsive and whole-slice pass |
| Circular import / wrong OnSnap module | Implementation defect (S041) | Completion re-exported projections; harness imported `recordConversationTurnOnSnap` from completion | Import readiness from projections; turns from `eec-s05a-depth` | Focused tests compile |
| Full corpus first runner pass | Implementation defect (S041) | Fatigue case recorded a ninth coverage turn that consumed `fatigue-pause`; budget actions used invalid purpose `WORKING`; stale-price seed left current vendor cards | Request next after eight coverage turns; use `PROTECT_INVESTMENT`; seed then expire cards and evidence | Runner 33/33 PASSED |
| Negative fabricating adapter | Implementation defect (S041) | `SOURCE_QUOTE_EQUALS` only inspected source text, so a mutated assertion still passed | Require the assertion claim to contain the cited text | Fabricating + mutation-sensitivity FAILED as required |
| `pnpm typecheck` | Implementation defect (S041) | Harness omitted Zod `expectedVersion`; Event OS API used one extra `../` | Pass `expectedVersion: 0`; import `../../../server/*` | `tsc` pass |
| `git diff --check` | Implementation defect (S041) | Extra blank line at EOF in `eec-s05a-completion.ts` | Strip trailing blank line | PASS |
| `PLAYWRIGHT_PROD=1` / `next start` | Environment defect (S040) | Production runtime requires `DATABASE_URL` | Use Next.js dev with a larger heap | Local E2E pass |
| Local whole-slice timeout | Tooling defect (S040) | Next.js restarted at the memory threshold; staff nav click after the decide-change banner stayed on Discovery | Direct `/app/command` navigation, 360s timeout, `--max-old-space-size=8192` | Whole-slice 1.1m pass; responsive 18s pass |
| S047 unit `guestCountOverride: 350` | Implementation defect (S047) | Engine consumed only `input.guests` string; numeric 350 never mapped | Parse command → `guestCountOverride` number → engine `guests` string + effective drivers | Focused S047 unit pass |
| S047 eval first corpus | Implementation defect (S047) | New probes used `outcomes` not `ctx.outcomes`; empty UUID strings on `effectiveDrivers` | Use `ctx.outcomes`; omit empty UUID fields | Corpus cases pass |
| S043 `sourceKind` | Implementation defect (S047) | No-brief planning assumption labelled `SCENARIO_OVERRIDE` | Keep `SCENARIO` unless a governing brief override exists | Shared-platform 400/0 |
| S047 Playwright first local | Test/UI defect (S047) | `useState(initial)` hydrated empty; macOS Control+A appended `350360`; two Extract buttons; Unicode minus vs `-`; `#brief-review` hash navigation | Controlled `edited ?? override ?? governing`; Meta+A; `.last()` extract; typographic minus; in-page brief link | Local S047 5/5 |
| S045 batched after S043 | Environment flake (S047) | Save note did not persist after Next.js ECONNRESET; last receipt remained Add participant | Rerun S045 alone | S045 3/3 |
| Live S047 Journey 3 | Implementation defect (S047) | Superseding 350 changed body at version 1; Postgres persist threw; `withDurable` finally replaced redirect with `error.tsx` | Increment superseded edition version | Live S047 5/5 |
| Live S047 Journey 5 | Implementation defect (S047) | Reload still presented success and `AtelierStateFocus` retried for 12s | Focus only when `shouldConsume`; sessionStorage once-key | Live S047 5/5 |

S038/S039 first-run failures remain historical in prior commits and are not reopened.

## Carried debt

| ID | Note |
|----|------|
| TDR-S05A-001 | CLOSED — private object path |
| TDR-S05A-002 | CLOSED — enquiry owner/stage/close |
| TDR-S05A-003 | CLOSED under `MD-PR-S041` — executable corpus/runner, not the S040 boolean self-report |
| TDR-S05A-004 | CLOSED — dedicated client investment route |
| TDR-S05A-005 | CLOSED — configuration-driven Lagos working calendar |

## Final-SHA gates (application/test SHA `5aca600d98430f224849ee18f5075e83c47eafa7`)

| Gate | Result |
|------|--------|
| EOS-S05A focused platform tests (30) | PASS |
| Evaluation/red-team corpus | PASS — fixture runner, zero-tolerance recorded |
| Client token / Brief / Budget / calendar / change / Command / private-object tests | PASS (included in focused + package suites) |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 360 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 80 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Local whole-slice / responsive E2E | PASS — whole-slice 1.1m; responsive 18.3s at 360 / 768 / 1440 / 200% zoom |
| Live whole-slice / responsive E2E | PASS — 2 passed in 46.3s on `https://event-os-production-bc8d.up.railway.app` |

## S041 gates (application/test SHA `0201df901343c35610c6a36308d21b775bb29a32`)

| Gate | Result |
|------|--------|
| Focused evaluation schema/corpus/runner/negative/readiness/authority | 21 pass / 0 fail |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 381 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 80 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Local evaluation Playwright | PASS — 1 passed in 27.8s |
| Live evaluation Playwright | PASS — 1 passed in 25.3s; refresh counts 33/0 |

## Deployment

Event OS only. Control Tower was not deployed (recent Control Tower rows remain `SKIPPED`).

| Field | Value |
|-------|-------|
| Upload deploy | `63178182-b7e1-40ae-8a76-59d138dcc1ea` SUCCESS (superseded by SHA stamp) |
| Live deploy | `42b3f98b-7a4b-431d-9270-41b1286133be` SUCCESS |
| GitHub / live SHA | `eb1463bacb670549fab272f657eddbfbf220f746` |
| `alive` / `ready` | true |
| Persistence / migrations | `POSTGRES` / `APPLIED` |
| `productionAuthorised` | false |
| Layout store / export | READY / READY |
| Interview corpus | `s05a-interview-v2` |
| Evaluation | `UNRUN` (truthful; fixture corpus passed locally; live has no executed run) |
| Evaluation blocked | false |
| Calendar | READY |

Deployment is not acceptance.

## MD-PR-S041 executable evaluation

S040 recorded an evaluation pass by looping family names and calling `evaluateZeroTolerance` with every flag `false`. That path is removed. `MD-PR-S041` is the controlling remediation.

| Field | Value |
|-------|-------|
| Corpus edition / hash | `s05a-eval-v2` / `96f8a35dff8cda413d359eafb05798fc53a63dac6229a466d25e48de69ce9dcd` |
| Contract / orchestrator / provider / projection | `s05a-eval-contract-v1` / `s05a-orchestrator-v2` / `fixture-inactive-v1` / `client-projection-v2` |
| Case count | 33 executable cases; one persisted result per case |
| Local runner | 33 PASSED, 0 failed, 0 errors, zero-tolerance clear |
| Negative controls | All 10 unsafe adapters produce FAILED; mutation-sensitivity fails if they pass |
| Focused evaluation tests | 21 pass |
| Local Playwright | `s05a-evaluation-readiness.spec.ts` 1 passed in 27.8s |
| Upload deploy | `c62fbf4f-b945-4aad-af40-88b066e4059e` SUCCESS (superseded by SHA stamp) |
| Live deploy | `d8e57477-d046-4cc4-8e66-abc841591d4b` SUCCESS |
| GitHub / live application SHA | `0201df901343c35610c6a36308d21b775bb29a32` |
| Live health | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY |
| Live evaluation before CEO run | `UNRUN`, blocked, `s05aReleaseReady` false |
| Live CEO fixture run | `PASSED`; cases passed 33 / failed 0; zero-tolerance clear; persists after refresh |
| Live after run | `s05aEvaluationBlocked` false; `s05aReleaseReady` true |
| Planner / Auditor / Sysadmin | No run form; direct `POST /api/eec-evaluation` denied |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |

## MD-PR-S043 consolidated human-verification remediation

S042 findings are remediated. EOS-S05A remains NOT ACCEPTED. No TDR was manufactured.

| Field | Value |
|-------|-------|
| Controlling pack | `docs/control/eos-s05a/MD_PR_S043_EOS_S05A_CONSOLIDATED_HUMAN_VERIFICATION_REMEDIATION.md` |
| Starting baseline | `30ea2899955f06c8b7a5a5a84b6d2b9a7a352cb1` |
| Corpus edition / hash | `s05a-eval-v3` / `5a7c208aed31aa0b0ef47ae1553370c3d259254468f2eac7e3eb3cff6e21169c` |
| Case count | 37 executable cases |
| Focused S043 unit/integration | PASS (`packages/shared-platform/test/eec-s043-remediation.test.ts`) |
| `pnpm typecheck` | PASS (first run failed: unused `actorHoldsRole`, missing `guestSourceKind`, `workbenchSources` MASK-only inference; corrected) |
| `pnpm --filter @maison-doclar/shared-platform test` | 387 pass / 0 fail (first run 385/1: client interview required CLIENT_TOKEN participation) |
| `pnpm --filter @maison-doclar/event-os test` | 81 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Focused S043 Playwright | PASS — 4/4 after first-run Journey 3/4 failures (issue-access `clientPath` abort; section receipt/scroll). Live first-run Journey 4 failed: save left `section=discovery-consent` after an aborted redirect and jumped to page top; presented-action section now wins over the stale query. |
| S05A regression Playwright | PASS — discovery-foundation, evaluation-readiness, responsive, whole-slice (4/4) |
| Live Event OS deploy (V5 persist) | `76325971-a669-4aa8-bdc3-9c6a467005e3` SUCCESS at `258fb34ad1368b4a537297be534ee931c2225198` |
| Live health before CEO corpus | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY; evaluation `STALE` / blocked |
| Live CEO fixture run | `PASSED`; cases passed 37 / failed 0; zero-tolerance clear; hash `5a7c208aed31aa0b0ef47ae1553370c3d259254468f2eac7e3eb3cff6e21169c`; run `c035ba09-06ec-48f0-bf0a-2445ea12e999` |
| Live after corpus | `s05aEvaluationBlocked` false; `s05aReleaseReady` true |
| Live focused S043 (first run on `258fb34`) | Journeys 1–3 PASS; Journey 4 FAIL (page-top jump / stale consent section). Corrected and rerun locally 4/4. |
| Live Event OS deploy (scroll restore) | `abb88b86-ca24-4479-af4d-57acd937de69` SUCCESS at `6e2cfd8e1eb4242256fa1784a5c78a92087f4422` |
| Live focused S043 (after restore fix) | PASS — 4/4 against `https://event-os-production-bc8d.up.railway.app` |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |

## MD-PR-S045 final truthful-decision remediation

S044 remaining defects are remediated. EOS-S05A remains NOT ACCEPTED. No TDR was manufactured. MD-PR-S044 auditor masking / client isolation / accessibility were not reopened. Staff-reviewed-but-unpublished is not governing Budget truth. Approved unpublished Event Briefs remain the canonical eligible Budget source.

| Field | Value |
|-------|-------|
| Controlling pack | `docs/control/eos-s05a/MD_PR_S045_EOS_S05A_FINAL_TRUTHFUL_DECISION_REMEDIATION.md` |
| Starting baseline | `a795947bd2c3bd2ff16cccaa1fbe26fd5cd6d77d` |
| Application SHA | `e63313de72018840075b853841da97d08ab13a42` |
| Corpus edition / hash | `s05a-eval-v4` / `47c2c5b3b4c1c0df13f863d7f071361a34e2a41fee33c4750210d5dc4a4efa4d` |
| Case count | 41 executable cases |
| Focused S045 unit/integration | PASS after first-run stale-version and maker-permission corrections (`packages/shared-platform/test/eec-s045-remediation.test.ts`) |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 393 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 81 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Focused S045 Playwright | PASS — 3/3 after first-run Journey 2/3 assertion corrections. Live 3/3 first run. |
| Changed-risk S043 Playwright | PASS locally after copy update; Journey 2 first run failed on retired `Extraction completed` wording |
| Live Event OS deploy | `495c5174-d3c2-4986-8ed5-162fb6a256db` SUCCESS at `e63313de72018840075b853841da97d08ab13a42` |
| Live health before CEO corpus | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY; evaluation `STALE` / blocked |
| Live CEO fixture run | `PASSED`; cases passed 41 / failed 0; zero-tolerance clear; hash `47c2c5b3b4c1c0df13f863d7f071361a34e2a41fee33c4750210d5dc4a4efa4d`; run `fe4ef61e-c133-4ea7-b4db-067feed17c00`; completed `2026-09-09T11:55:01.976Z` |
| Live after corpus | `s05aEvaluationBlocked` false; `s05aReleaseReady` true |
| Live focused S045 Playwright | PASS — 3/3 against `https://event-os-production-bc8d.up.railway.app` |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |

## MD-PR-S047 Budget Studio override execution

S046 remaining defects are remediated. EOS-S05A remains NOT ACCEPTED. No TDR was manufactured. A typed Budget Studio override now crosses form → command → immutable assumption → effective driver → BOM → trace → durable result → refresh/reopen. The Event Brief stays 360.

| Field | Value |
|-------|-------|
| Controlling pack | `docs/control/eos-s05a/MD_PR_S047_EOS_S05A_BUDGET_STUDIO_OVERRIDE_EXECUTION_PACK.md` |
| Starting baseline | `5c7d6356b5a618bc315f1b88cc76c844f7d659f1` |
| Application SHA | `abe2e20308990dc3f31e74f799c717903205d1a8` |
| Corpus edition / hash | `s05a-eval-v5` / `bba37d57763b6d383ff08a7306deff44a4bfb82f281321947b3774820b3ddd71` |
| Case count | 44 executable cases |
| Focused S047 unit/integration | PASS after first-run mapping, empty-UUID persist, and S043 `sourceKind` corrections |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 400 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 84 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Focused S047 Playwright | PASS — 5/5 locally after first-run input/locator/trace assertion corrections |
| Changed-risk S045 / S043 Playwright | PASS — S043 4/4 first run; S045 3/3 after a batched Save-note flake |
| Live Event OS deploy (corpus) | `9db99aab-cfcd-4cb9-97ce-153bfd01e220` SUCCESS at `e75ed0ee49c15d8148cd0868e8a1c64d581d8c7f` |
| Live health before CEO corpus | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY; evaluation `STALE` / blocked |
| Live CEO fixture run | `PASSED`; cases passed 44 / failed 0; zero-tolerance clear; hash `bba37d57763b6d383ff08a7306deff44a4bfb82f281321947b3774820b3ddd71`; run `7aa7b7d0-e334-452f-8370-709e9a03457c`; completed `2026-09-09T20:01:14.476Z` |
| Live after corpus | `s05aEvaluationBlocked` false; `s05aReleaseReady` true |
| Live focused S047 (first run on `e75ed0ee`) | Journeys 1, 2, 4 PASS; Journey 3 FAIL (`persisted version conflict` on superseded 350); Journey 5 FAIL (reload re-focused heading) |
| Live Event OS deploy (supersede version + focus once) | `f892dfe6-fe2b-465d-a69d-56b34494d4bc` SUCCESS at `abe2e20308990dc3f31e74f799c717903205d1a8` |
| Live focused S047 (after persist/focus fix) | PASS — 5/5 against `https://event-os-production-bc8d.up.railway.app` |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |

## MD-PR-S049 action-result truth, provenance and focus

S048 remaining defects are remediated. The Budget calculation engine was not reopened. EOS-S05A remains NOT ACCEPTED. No TDR was manufactured.

| Field | Value |
|-------|-------|
| Controlling pack | `docs/control/eos-s05a/MD_PR_S049_EOS_S05A_ACTION_RESULT_TRUTH_AND_FOCUS.md` |
| Starting baseline | `dd959d3fe3eb076b45991b29167557b45b890e68` |
| Application SHA | `315669da798c26219f7b3c7e16a2cb65783fdd90` |
| Feature commit | `8c8db26751c071cd2ed893ab2b95cbf72c35d0c9` |
| Live focus corrections | `bf159b556c1f6ef6e8572775282567834f6e566d`, `315669da798c26219f7b3c7e16a2cb65783fdd90` |
| Corpus edition / hash | `s05a-eval-v6` / `4ee2bac7104bb06330ebb95e08e9600878795f902a05302b5e500571e5c9c454` |
| Case count | 46 executable cases |
| Focused S049 unit/integration | PASS after first-run mutate-effect, generated-time, and client-import corrections |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 403 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 91 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS after first-run client barrel import of `node:crypto` |
| `git diff --check` | PASS |
| Focused S049 Playwright | PASS — 3/3 locally after first-run locator/session/lock assertion corrections |
| Changed-risk S047 Playwright | PASS — Journey 2 + 5 locally (2/2). Full Budget arithmetic journey not rerun. |
| Live Event OS deploy (corpus) | `903c2536-3f5c-42b5-bf2c-75167aa4e1cc` SUCCESS at `8c8db26751c071cd2ed893ab2b95cbf72c35d0c9` |
| Live health before CEO corpus | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY; evaluation `STALE` / blocked |
| Live CEO fixture run | `PASSED`; cases passed 46 / failed 0; zero-tolerance clear; hash `4ee2bac7104bb06330ebb95e08e9600878795f902a05302b5e500571e5c9c454`; run `1ecbeec4-b343-4b1a-9fa4-be9a5eaa822a`; completed `2026-09-09T22:21:10.748Z`; correlation `88594f86-dfec-45bc-8109-947a599bf1ff` |
| Live after corpus | `s05aEvaluationBlocked` false; `s05aReleaseReady` true |
| Live focused S049 (first run on `8c8db26`) | Journeys A and C PASS; Journey B FAIL (heading still focused after F5) |
| Live Event OS deploy (reload must not steal focus) | `ba3d5a2b-9545-44f0-9bc1-fc631d42c4df` SUCCESS at `bf159b556c1f6ef6e8572775282567834f6e566d` |
| Live focused S049 (on `bf159b5`) | Journeys A and C PASS; Journey B FAIL (denial heading inactive — consume blurred first focus) |
| Live Event OS deploy (keep first focus until F5) | `5ddb009c-4462-4c7f-b9d5-de957f39e342` SUCCESS at `315669da798c26219f7b3c7e16a2cb65783fdd90` |
| Live focused S049 (after focus-release fix) | PASS — 3/3 against `https://event-os-production-bc8d.up.railway.app` |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |

## MD-PR-S051 final decision-result focus correction

Maker/checker denial now leaves `document.activeElement` on `#operational-state-title`, not `<body>`. Replay truth, generated timestamps, scoped locks and the evaluation corpus were not reopened. EOS-S05A remains NOT ACCEPTED. No TDR was manufactured.

| Field | Value |
|-------|-------|
| Prompt control | `MD-PR-S051` |
| Starting baseline | `edb0a019c4dc104678924f0e27f4796a574456ba` |
| Application SHA | `50322fa5fdf7b46437dc9d62579e2e2ad918e762` |
| Corpus | unchanged `s05a-eval-v6` / 46/0 / still PASSED and release-ready |
| First-run Playwright | FAIL — after settled hydration `document.activeElement` was `BODY` (first on second denial after F5; then on first denial once the test blurred the leftover calculate focus) |
| Local S051 Playwright | PASS — 3/3 after consume-after-verified-focus and same-document restore |
| Local S049 Journey B | PASS — unchanged assertions |
| `pnpm typecheck` | PASS |
| `pnpm --filter @maison-doclar/shared-platform test` | 403 pass / 0 fail |
| `pnpm --filter @maison-doclar/event-os test` | 93 pass / 0 fail |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | PASS |
| `git diff --check` | PASS |
| Live Event OS deploy | `4ab04e5e-0e53-48b2-8d69-fa431b3bcb5a` SUCCESS at `50322fa5fdf7b46437dc9d62579e2e2ad918e762` |
| Live health | `alive`/`ready` true; `POSTGRES`/`APPLIED`; `productionAuthorised` false; layout READY/READY; evaluation PASSED / not blocked |
| Live focused S051 | PASS — 3/3 against `https://event-os-production-bc8d.up.railway.app` (denial heading focused; F5 does not refocus; second denial focuses again) |
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |
