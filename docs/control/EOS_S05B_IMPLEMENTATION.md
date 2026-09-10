# EOS-S05B Implementation Record

**Slice ID:** `EOS-S05B`
**Prompt Control ID:** `MD-PR-S054` then `MD-PR-S055`
**Title:** Risk, Protection & Continuity Command
**Status:** `REMEDIATED` under `MD-PR-S055` — not accepted; Claude not run
**Starting baseline:** `f12798a28f438408527d8811be57389661c86c25`
**MD-PR-S055 baseline:** `505c4399ba4517a972914e67b738372055da612d`
**Application SHA:** `6077a752955fa50f145943349b430a8a2a39efae`
**First implementation SHA:** `d7533f3bac1a7d429778f61044862db7fd753f8f`
**Live Event OS deployment:** `1b534bcc-bd9e-45b8-9876-06f23eeb4a3e`
**Catalogue slice:** no — accepted-slice count remains 5
**Production:** unauthorised
**EOS-S06:** `NOT_STARTED / NOT_AUTHORISED`

This record is implementation evidence under `MD-PR-S054`, then architecture and assurance remediation under `MD-PR-S055`. It does not accept EOS-S05B. Independent Claude verification and AI CTO acceptance remain later gates. Do not create `EOS_S05B_ACCEPTANCE.md`.

## MD-PR-S055 remediation findings (do not rewrite the MD-PR-S054 first-run report)

Focused GitHub review of the `MD-PR-S054` surface found material divergence from the ratified corpus. These are controlling defects, not documentation notes:

1. Durable S05B state lived as 31 arrays on `PlatformSnapshot`, persisted as JSONB `platform_documents` rows, with every mutation loading and replacing the whole snapshot.
2. `projectRiskBudgetOnSnap` calculated its own `quantifiedMinor` and did not create an immutable EOS-S05A Budget Intelligence successor.
3. `transitionDossierOnSnap` accepted an arbitrary target status, including `DRAFT → PUBLISHED`, and could collapse approval and publication.
4. `s05b-eval-v1` had 16 cases and omitted mandatory families.
5. Several cases manufactured expected observations instead of probing durable post-action state.
6. Cross-event isolation checked whether another event’s row existed; it did not invoke an unauthorised production read.
7. `detectUnsafeAdapter` read sabotage flags rather than observations.
8. `falseSuccess` returned expected passing observations; the negative-control test then inspected the adapter object.
9. Playwright coverage was two omnibus smokes.
10. Organisation and event Protection UI used predetermined demo values instead of complete authoring and review experiences.

`MD-PR-S055` is the controlling remediation authority at `docs/control/eos-s05b/MD_PR_S055_EOS_S05B_ARCHITECTURE_AND_ASSURANCE_REMEDIATION.md`. Architecture and assurance remediation is implemented locally and is ready for AI CTO review and whole-slice Claude verification. Claude has not been run. EOS-S05B is not accepted. EOS-S06 is not started.

## Authority range

| Range | Status |
|-------|--------|
| Ratified specification (00–13, 15) | RATIFIED — canonical at `docs/control/eos-s05b/` |
| Cursor packs `14A`–`14D` / units `RPC-01`–`RPC-55` | IMPLEMENTED |
| Independent Claude verification | NOT RUN |
| Independent acceptance | NOT GRANTED |
| EOS-S06 | `NOT_STARTED / NOT_AUTHORISED` |

## Compatibility map (RPC-01)

Inspected and reused, not reopened:

- Shared platform persistence: JSONB collections on `PlatformSnapshot`; additive `EOS-S05B-PROTECTION-V1` snapshot migration with receipts.
- Permissions: `PERMISSION_KEYS` + `catalog.ts` `PERMISSION_IDS` / `ROLE_PERMISSIONS`. CEO receives all `risk.*` keys except that System Administrator still has none of the business risk keys.
- Budget Intelligence remains the only budget ledger. Risk creates successor projections/drivers with trace; it does not invent premiums or rewrite the governing scenario.
- Merchandise `vendorAssignments` and S05A `vendorPriceCards` are not the protection roster. S05B `riskRosterAssignments` overlay canonical vendor IDs.
- Object keys: `assertSafeObjectKey` allows `risk/` in addition to layout and discovery prefixes.
- Evaluation: separate `s05b-eval-v1`, never mixed into `s05a-eval-v6`.
- UI: Command Atelier; organisation `/app/protection`; event `/app/events/[eventId]/protection`.

No parallel event, vendor, budget, payment or communications ledgers were created.

## Unit disposition

| Unit | Disposition |
|------|-------------|
| RPC-01 | COMPLETE — inspection, compatibility map, control records |
| RPC-02–RPC-10 | COMPLETE — schemas, permissions, migration, evidence, disclosure, audit, nav |
| RPC-11–RPC-25 | COMPLETE — source/rule, policy, coverage/gaps, clauses, vendor, roster |
| RPC-26–RPC-43 | COMPLETE — continuity, incidents, budget adapter, CEO/event/client UX |
| RPC-44–RPC-54 | COMPLETE as implementation evidence — ports, eval, gates, Event OS deploy, live smoke |
| RPC-55 | COMPLETE as this report’s implementation record; not acceptance |

## Invariants retained

- Unknown facts yield `INDETERMINATE`; expired approved rules yield `STALE`.
- Discovery sources cannot silently become approved rules.
- Maker cannot verify, residual-decide, authorise fallback, or publish their own edition.
- Authorising a fallback plan does not book, pay, or dispatch.
- Escalation intents remain undispatched. Life-safety copy does not claim the platform dispatched help.
- Policy numbers are omitted from unauthorised projections, not masked.
- Scan adapter defaults inactive; `UPLOADED` may move to `VERIFIED` without inventing a clean scan.
- Negative evaluation adapters exist only in test fixtures.

## Production posture

`productionAuthorised` remains false. Synthetic data only. External providers remain inactive. Control Tower is not a deploy target unless its executable code actually changed (it did not).

## MD-PR-S055 execution (does not rewrite the MD-PR-S054 first-run report)

Remediation executed continuously from baseline `505c4399ba4517a972914e67b738372055da612d`.

- Phase A: dedicated `risk_*` tables, `RiskProtectionStore`, forward-only `004_risk_protection_normalized`, backfill receipt `EOS-S05B-PROTECTION-V2`. After V2, S05B collections are skipped in `platform_documents`.
- Phase B: `projectRiskBudgetOnSnap` creates a `PROTECT_INVESTMENT` successor through `calculateBudgetScenarioOnSnap`. Linkage stores successor IDs, copied `quantifiedMinor`, model `s05a-protect-investment-v1`. Unknown exposure stays `"0"`.
- Phase C: enforced dossier `DRAFT → SUBMITTED → APPROVED → PUBLISHED`; exact-hash publication; `assertProtectedHuman` reloads assignment+person.
- Phase D: organisation tabs, event five views, published client dossier with acknowledge/question.
- Phase E: `s05b-eval-v2` / `s05b-eval-contract-v2`, 52 cases, hash `992c34838aadfe6a962874dbd337fe8e1d157219bd19f9537708cf1b65373961`. Observations from durable state. `detectUnsafeFromObservations` does not read sabotage flags. `s05b-eval-v1` PASS is `STALE`.
- Phase F: focused persistence/budget/dossier/transitions/eval/permissions/continuity/concurrency tests; 13 focused Playwright journeys; omnibus smoke retired.

Remaining debt that is not a substitute for the above: in-process `PlatformService.mutate` still clones a working snapshot; Postgres writes changed risk rows only. Policy evidence create-as-`SUBMITTED` remains a pragmatic shortcut vs DRAFT→SUBMITTED→VERIFIED. Source/rule one-current indexes are not as complete as policy/dossier unique current indexes.
