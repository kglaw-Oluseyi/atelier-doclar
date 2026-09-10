# EOS-S05B Build Ledger

**Slice ID:** `EOS-S05B`
**Prompt Control ID:** `MD-PR-S054`
**Starting baseline:** `f12798a28f438408527d8811be57389661c86c25`
**Application SHA:** `d7533f3bac1a7d429778f61044862db7fd753f8f`
**Status:** `IMPLEMENTED / NOT ACCEPTED`
**Production:** unauthorised
**Catalogue accepted-slice count:** remains 5
**Implemented range:** `RPC-01`–`RPC-55` implemented; acceptance is not this authority
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`
**Evaluation:** `s05b-eval-v1` — 16 cases; fail-closed when UNRUN

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

Later gate failures, if any, are appended after the local and live runs. Product defects are not erased because a retry later passes.

## Carried debt

No new S05B technical-debt item is manufactured. Inherited carried debt remains: permanent production identity provider unselected; external providers inactive; `TDR-S04A-011` blocking before real-client onboarding only; process-local action-result recall; `TDR-S05-002`; accepted S04/S05/S05A debt. None of that debt authorises production or starts EOS-S06.

## Local gates (recorded after the implementation run)

See the consolidated `MD-PR-S054` report for exact command results, evaluation hash, Playwright, GitHub parity and Railway evidence.
