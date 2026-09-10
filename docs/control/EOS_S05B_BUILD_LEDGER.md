# EOS-S05B Build Ledger

**Slice ID:** `EOS-S05B`
**Prompt Control ID:** `MD-PR-S054` then `MD-PR-S055`
**Starting baseline:** `f12798a28f438408527d8811be57389661c86c25`
**MD-PR-S055 baseline:** `505c4399ba4517a972914e67b738372055da612d`
**Application SHA:** `4714ce5259faf235ec39c9eaac6ea7ddc8142495`
**First implementation SHA:** `d7533f3bac1a7d429778f61044862db7fd753f8f`
**Live Event OS deployment:** `28eb49b2-4886-4bb6-89e4-5942685e8fe7`
**Status:** `REMEDIATED` under `MD-PR-S055` — not accepted; Claude not run
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `RPC-01`–`RPC-55` implemented; acceptance is not this authority
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`
**Evaluation:** `s05b-eval-v2` — 52 cases, contract `s05b-eval-contract-v2`; `s05b-eval-v1` PASS is honestly `STALE`

Application SHA, GitHub parity, Railway deployment ID and live smoke results are recorded in the final `MD-PR-S054` consolidated report after push and Event OS deploy.

## Units

| Unit | Title | Status |
|------|-------|--------|
| RPC-01 | Canonical inspection and control records | COMPLETE |
| RPC-02–RPC-10 | Foundations | COMPLETE |
| RPC-11–RPC-25 | Insurance, contract, vendor | COMPLETE |
| RPC-26–RPC-43 | Continuity, budget, Command Atelier | COMPLETE |
| RPC-44–RPC-54 | Ports, eval, gates, deploy, live smoke | COMPLETE as implementation |
| RPC-55 | Consolidated report | COMPLETE as implementation; not acceptance |

## First-run failures

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| `tsc` shared-platform | Implementation defect | `bumpVersion` returned the whole record and overwrote later `status`/`state` fields | Return only `{ version, updatedAt }` | `tsc` pass |
| `tsc` shared-platform | Implementation defect | Unreachable `APPROVED` comparison after status narrowing; unused imports/params | Drop dead comparison; prefix unused actors | `tsc` pass |
| `tsc` Event OS | Implementation defect | Event Protection forms imported `IdempotencyField` without rendering it | Render the field on every mutation form | `tsc` pass |
| Focused `s05b-protection.test.ts` | Implementation defect | `parseRiskEnvelope` applied `.strict()` to whole command payloads, rejecting domain fields | `extractRiskEnvelope` copies envelope keys only; bare envelope still rejects extras | focused tests pass |
| Focused tests | Test defect | Several fixture/test idempotency keys were shorter than 12 characters | Lengthen keys | focused tests pass |
| Negative fabricateCoverage detector | Implementation defect | Detector required the fabricated observation to `passed: true` | Detect the adapter from presence, consistent with other negative controls | detector test pass |
| Inactive scan vs verify | Implementation defect | `UPLOADED` could not move to `VERIFIED` while the scan adapter is inactive | Allow `UPLOADED → VERIFIED` | policy verify path compiles and tests |
| `pnpm --filter @maison-doclar/shared-platform test` | Implementation defect | `risk.catalogue.view/manage` reused permission UUIDs `176`/`177` already assigned to `discovery.confidential.*`, causing `unique_violation` / `VERSION_CONFLICT` on Postgres persist | Reassign S05B permission IDs to `178`–`208` | rerun package tests |
| Focused Playwright `s05b-whole-slice` | Implementation defect | Successful `redirect()` after a Protection mutation was caught as a generic error, so the UI showed `The request could not be completed` instead of `Protection command applied` | Rethrow Next.js `NEXT_REDIRECT` before classifying the catch | policy-create assertion passed on rerun |
| Focused Playwright event workspace | Implementation/test defect | Event hub and staff nav both exposed an accessible name `Protection`, so the test opened organisation Protection Command instead of the event workspace | Rename the event hub link to `Event protection` and target that name | event workspace opened on rerun |
| Focused Playwright reserve assertion | Test defect | Combined regex matched both the action-result banner and the budget copy `Unknowns remain unquantified`, violating Playwright strict mode | Assert the success banner and unquantified copy separately | rerun focused Playwright 2/2 |
| Live dossier/fallback publish | Implementation defect | Shared form envelope sent `expectedVersion=0` before the record version, so `FormData.get` always read 0 and publish/authorise always conflicted | Omit envelope version from transition forms; send only the current record version | live sequential checker publish |

### MD-PR-S055 first-run failures (appended; MD-PR-S054 rows above are not rewritten)

| Command | Classification | Root cause | Correction | Rerun |
|---------|----------------|------------|------------|-------|
| Focused S05B unit tests | Implementation defect | `RISK_BUDGET_MODEL` exceeded 40 characters; Budget `trace` was not mapped to `{op,detail,value}` | Shorten model id to `s05a-protect-investment-v1`; slice/map engine trace | budget adapter pass |
| Focused S05B unit tests | Implementation defect | Protected decisions used CEO assignment with director person | Pass the director assignment for source/rule/vendor/fallback/dossier checker actions | protection + eval cases pass |
| Focused S05B unit tests | Test defect | Several test idempotency keys were shorter than 12 characters | Lengthen keys (`quote-evidence-01`, transition keys) | focused tests pass |
| `s05b-eval-v2` corpus | Test/fixture defect | `POL-02`/`DISC-03` omitted facts/rules needed for publishable dossiers; incident `CONTENT_BYTES` regex treated “has not dispatched help” as a dispatch claim | Add required rule/fact actions; require `\bhas dispatched help\b` without negation | corpus 52/0 |
| `s05b-concurrency.test.ts` | Test defect | `createRuleEditionOnSnap` rejects `eventId`; stale dossier version was the mutated object’s current version | Drop `eventId`; capture `staleVersion` before submit | concurrency pass |
| `pnpm --filter @maison-doclar/shared-platform test` | Implementation defect | V2 migration receipt was `nonProductionFixture: true`, so synthetic cleanup deleted it and `open()` recreated it | Migration receipts are durable, not fixture-marked | 431/0 |
| `pnpm typecheck` | Test defect | Concurrency fixture passed `eventId` into rule create | Remove the field | `tsc` pass |
| Focused Playwright first run | Test defect | Two-tab creates raced so the first tab never saw a result banner; `Dossier` matched the client-dossier link; `Life safety` matched the severity option; `Policy type` matched two labelled selects | Sequential tab submits; `exact: true`; checkbox role; scoped policy-type label; persist both insurer labels after reload | 13 passed / 1 skipped |
| Live Event OS ready after `railway up` | Implementation defect | Backfill of existing synthetic continuity plans violated `risk_continuity_plans_one_current` because every new plan was `current: true` | Demote sibling current rows before insert; unset prior event plans on create | redeploy ready |

Later gate failures, if any, are appended after the local and live runs. Product defects are not erased because a retry later passes.

## Carried debt

No new S05B technical-debt item is manufactured. Inherited carried debt remains: permanent production identity provider unselected; external providers inactive; `TDR-S04A-011` blocking before real-client onboarding only; process-local action-result recall; `TDR-S05-002`; accepted S04/S05/S05A debt. None of that debt authorises production or starts EOS-S06.

## Local gates (MD-PR-S055)

| Gate | Result |
|------|--------|
| `pnpm typecheck` | pass |
| `pnpm --filter @maison-doclar/shared-platform test` | 431/0 |
| `pnpm --filter @maison-doclar/event-os test` | 93/0 |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | pass |
| `git diff --check` | clean |
| Focused S05B Playwright | 13 passed / 1 skipped (omnibus retired) |

`s05b-eval-v2` hash `992c34838aadfe6a962874dbd337fe8e1d157219bd19f9537708cf1b65373961`. See the MD-PR-S055 consolidated report for GitHub parity and Railway evidence.
