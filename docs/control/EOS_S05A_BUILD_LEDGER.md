# EOS-S05A Build Ledger

**Slice ID:** `EOS-S05A`
**Prompt Control ID:** `MD-PR-S043` (human-verification remediation of MD-PR-S042; prior evaluation `MD-PR-S041`)
**Starting baseline for MD-PR-S043:** `30ea2899955f06c8b7a5a5a84b6d2b9a7a352cb1`
**Application/test SHA:** `0201df901343c35610c6a36308d21b775bb29a32`
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
| Control Tower | not deployed |
| Claude / EOS-S06 / acceptance | not run / not started / not accepted |
| `productionAuthorised` | false, unchanged |
