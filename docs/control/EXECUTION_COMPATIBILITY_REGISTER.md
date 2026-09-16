# Execution Compatibility Register

**Slice:** MD-CT0  
**Purpose:** Map historical wording to current execution authority without rewriting source documents.

## Programme roles

| Historical wording (leave in source) | Current execution meaning |
|--------------------------------------|---------------------------|
| Claude as programme-lead / build planner / CTO | **Not current.** Successor AI CTO / programme controller is ChatGPT/Codex |
| “Instruction to Claude” / “Claude may recommend interleaving” | Treat as supporting planning history; current controller is the successor AI CTO |
| “Use Claude’s exact inspect/add/modify/migrate/generate/protect manifest” | No standalone manifest file was located (B0 GAP-008). Use actual repository inspection + CT0 `programme/` manifests + this register |
| “Apply the prior Claude handover to every prompt” | Read former Claude handovers as **supporting material only** (successor handover). Do not treat them as executor identity |
| “Cursor or Claude may propose records but cannot approve gates” | **Cursor** cannot approve protected gates. Successor AI CTO also cannot self-approve CEO/independent/specialist/live-event gates |
| `claudeMayApprove: false` in example YAML | Retain as historical config shape; current equivalent is `executorMayApprove: false` at implementation time — do not edit the historical YAML in CT0 |
| CT0 title “Preflight and Claude-plan adoption” | This MD-CT0 instruction **is** the authorised successor preflight. Do not search other repositories for a Claude plan |

## Technology / vendor (not automatically converted)

| Historical wording | Treatment |
|--------------------|-----------|
| Intelligence Specification “calling Claude models via Anthropic API” | Product/vendor assumption (CRQ-013). Not a programme-role assignment. Unresolved. |

## Repository wording

| Historical wording | Current meaning |
|--------------------|-----------------|
| “the Academy repository” | Logical module inside `kglaw-Oluseyi/atelier-doclar` |
| “Marketing OS repository” | Logical module in the same GitHub repository |
| “Ushering repository” | Logical module in the same GitHub repository |
| Clean-slate Event OS / Marketing | Clean **module** in this monorepo, not a new remote |
| Railway staging (S1-37) | Historical preference. Not authority to create Railway resources in CT0 |

## Prompt identity wording

| Historical wording | Current meaning |
|--------------------|-----------------|
| `S10-01` without product | Ambiguous. Use `EVENT_OS \| MD-PR-xxxx \| S10-01BUILD` or `ACADEMY \| MD-PR-xxxx \| S10-01` |
| Academy “prompt 09 of 12” without `G0-09` | Use Prompt Control ID; optional alias `G0-P09[NO_NATIVE_ID]` |

## Executor standing contract (replacement for CT execution)

When a future instruction authorises a CT or product prompt:

1. CEO remains final authority.
2. Successor AI CTO may reconcile and wrap; Cursor executes only the named Prompt Control ID.
3. Inspect **this** repository only.
4. Do not create another GitHub repository.
5. Do not approve protected gates.
6. Do not start the next prompt.
7. Preserve native IDs.
8. Treat RAG as non-authoritative for status.

Historical Claude-role sentences stay in the source files.

## Deploy-by-default compatibility (6 September 2026)

| Historical wording (leave in source) | Current execution meaning |
|--------------------------------------|---------------------------|
| do not push; do not deploy; Railway must remain untouched | **Superseded** for repository `kglaw-Oluseyi/atelier-doclar` and Railway project `atelier-doclar`. See `docs/control/DEPLOYMENT_AND_PRODUCTION_REALISM_POLICY.md` |
| production deployment requires slice acceptance | **Superseded** as a general stop. Acceptance remains a separate record. Deployment is not acceptance and is not production-operations authorisation |
| frontend/backend work must remain local pending routine review | **Superseded**. Verified work is pushed and deployed by default |
| `productionAuthorised: false` | **Retained.** Blocks real operational capabilities only. Does not block deployment, Railway Postgres, synthetic data, or production builds |
| No Railway mutation (historical slice closeouts) | Historical evidence of those slices. Not a current stop for `atelier-doclar` Event OS |

Safeguards retained: real client/guest data; live communications; payments; other repositories or Railway projects; force-push; history rewrite; destructive database resets; protected-gate signatures.

## Addendum — 2026-09-07 EOS-S04A acceptance and successor hold

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04A IN_REVIEW / not ACCEPTED | SUPERSEDED by `docs/control/EOS_S04A_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af`. |
| EOS-S04B after EOS-S04A and before EOS-S05 | Sequential recommendation only. The S04B controlled pack remains `DRAFT FOR CEO RATIFICATION — implementation not authorised`. |
| S04B Cursor pack “Railway / no action or deployment” and “Push held” | Historical pack wording. Deploy-by-default remains the current `atelier-doclar` rule **if** S04B is later authorised. It is not itself S04B implementation authority. |
| EOS-S05 technically eligible | Dependency-law eligibility only. Implementation remains `NO`. |
| EOS-S04F RATIFIED / HELD | Retained. Execution remains after EOS-S04E. |

Successor implementation after EOS-S04A requires a separate CEO decision. Cursor must not start EOS-S04B–F or EOS-S05 from this acceptance record.

## Addendum — 2026-09-07 EOS-S04B ratification (`MD-PR-S018`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04B `DRAFT FOR CEO RATIFICATION — implementation not authorised` | SUPERSEDED by `docs/control/EOS_S04B_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`. |
| S04B Cursor pack “Railway / no action or deployment” and “Push held” | SUPERSEDED for this authorised slice by deploy-by-default and the CEO overlay. Push and deploy affected `atelier-doclar` services. Deployment is not acceptance. |
| EOS-S04C–F and EOS-S05 | Retained unauthorised. This overlay does not start them. |
| Slice pack §18 “ratification does not itself authorise implementation” | Historical draft-pack rule. The 2026-09-07 overlay is the separate implementation-authority decision. |

## Addendum — 2026-09-07 EOS-S04B acceptance (`MD-PR-S019`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04B `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` | SUPERSEDED by `docs/control/EOS_S04B_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `f9f218c9d3e357ba82e6c04e7409138267a94396`. |
| EOS-S04B `IN_REVIEW` after accessibility remediation | HISTORICAL. Remediation evidence stands; no further S04B verification is required. |
| Railway restart CLI hang | Tooling limitation. Not an application failure and not an acceptance blocker. |
| EOS-S04C `DRAFT FOR CEO RATIFICATION — implementation not authorised` | RETAINED. Acceptance of S04B does not authorise S04C. |
| S04C Cursor pack “Railway / no action or deployment” and “Push held” | Historical pack wording. Deploy-by-default remains the current `atelier-doclar` rule **if** S04C is later authorised. It is not itself S04C implementation authority. |

Successor implementation after EOS-S04B requires a separate CEO decision. Cursor must not start EOS-S04C–F or EOS-S05 from this acceptance record.

## Addendum — 2026-09-07 EOS-S04C ratification (`MD-PR-S020`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04C `DRAFT FOR CEO RATIFICATION — implementation not authorised` | SUPERSEDED by `docs/control/EOS_S04C_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`. |
| S04C Cursor pack “Railway / no action or deployment” and “Push held” | SUPERSEDED for this authorised slice by deploy-by-default and the CEO overlay. Push and deploy affected `atelier-doclar` services. Deployment is not acceptance. |
| EOS-S04D–F and EOS-S05 | Retained unauthorised. This overlay does not start them. |
| Slice pack §18 “approval of the draft does not itself authorise implementation” | Historical draft-pack rule. The 2026-09-07 overlay is the separate implementation-authority decision. |

## Addendum — 2026-09-07 EOS-S04C acceptance (`MD-PR-S021`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04C `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` | SUPERSEDED by `docs/control/EOS_S04C_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `b378fa4f092e4fa5237894975738e3f22b530d73`. |
| EOS-S04C `IN_REVIEW / NOT READY` after TDR-S04C-001–004 remediations | HISTORICAL. Remediation evidence stands; no further S04C verification is required. |
| Documentation-only acceptance commit | Does not replace the accepted implementation SHA. Event OS is not redeployed. |
| EOS-S04D `DRAFT FOR CEO RATIFICATION — implementation not authorised` | RETAINED. Acceptance of S04C does not authorise S04D. |
| S04D Cursor pack “Railway / no action or deployment” and “Push held” | Historical pack wording. Deploy-by-default remains the current `atelier-doclar` rule **if** S04D is later authorised. It is not itself S04D implementation authority. |
| EOS-S04E–F and EOS-S05 | Retained unauthorised. This acceptance does not start them. |

Successor implementation after EOS-S04C requires a separate CEO decision. Cursor must not start EOS-S04D–F or EOS-S05 from this acceptance record.

## Addendum — 2026-09-07 EOS-S04D ratification (`MD-PR-S022`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04D `DRAFT / IMPLEMENTATION NOT AUTHORISED` | SUPERSEDED by `docs/control/EOS_S04D_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`. |
| S04D Cursor pack wording that holds routine commits, pushes or Railway deployment | SUPERSEDED for this authorised slice by deploy-by-default and the CEO overlay. Push and deploy Event OS in `atelier-doclar`. Deployment is not acceptance. |
| EOS-S04E–F and EOS-S05 | Retained unauthorised. This overlay does not start them. |
| Control Tower | Compatibility-only unless a ratified contract requires a genuine change. Not a deploy target for this slice. |

## Addendum — 2026-09-07 EOS-S04D acceptance (`MD-PR-S023`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04D `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` | SUPERSEDED by `docs/control/EOS_S04D_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `64683a853ead39c62caeb2d2e9f26bcb9d1dca21`. |
| EOS-S04D `IN_REVIEW / NOT READY` after action-result / ACA-S04D / labelling remediation | HISTORICAL. Remediation evidence stands; no further S04D verification is required. |
| Documentation-only acceptance commit | Does not replace the accepted implementation SHA. Event OS is not redeployed. |
| EOS-S04E `DRAFT FOR CEO RATIFICATION — implementation not authorised` | RETAINED. Acceptance of S04D does not authorise S04E. |
| S04E Cursor pack “Railway / no action or deployment” and “Push held” | Historical pack wording. Deploy-by-default remains the current `atelier-doclar` rule **if** S04E is later authorised. It is not itself S04E implementation authority. |
| EOS-S04F and EOS-S05 | Retained unauthorised / HELD. This acceptance does not start them. |

Successor implementation after EOS-S04D requires a separate CEO decision. Cursor must not start EOS-S04E–F or EOS-S05 from this acceptance record.

## Addendum — 2026-09-07 EOS-S04E ratification (`MD-PR-S024`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04E `DRAFT FOR CEO RATIFICATION — implementation not authorised` | SUPERSEDED by `docs/control/EOS_S04E_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`. |
| S04E Cursor pack wording that holds routine commits, pushes or Railway deployment | SUPERSEDED for this authorised slice by deploy-by-default and the CEO overlay. Push and deploy Event OS in `atelier-doclar`. Deployment is not acceptance. |
| EOS-S04F and EOS-S05 | Retained unauthorised / HELD. This overlay does not start them. |
| Control Tower | Compatibility-only unless a ratified contract requires a genuine change. Not a deploy target for this slice. |

## Addendum — 2026-09-07 EOS-S04E acceptance remediation

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04E `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` | SUPERSEDED for current programme language by `IN_REVIEW / NOT READY` after independent review blocked edition lineage, staff hydration and host `canDecide`. Implementation authority for the remediation remains. The slice is not accepted. |
| “0 earlier editions preserved” as proof of data loss | Rejected. Live diagnosis is Outcome A plus a later in-place reveal publish. See `docs/control/EOS_S04E_ACCEPTANCE_REMEDIATION.md`. |

## Addendum — 2026-09-07 EOS-S04E acceptance (`MD-PR-S025`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04E `IN_REVIEW / NOT READY` | SUPERSEDED by `docs/control/EOS_S04E_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `05b91bb62dcc20357666bef4ff9bfa1d0cef11b2`. |
| EOS-S04F programme line `RATIFIED / NOT_STARTED` | Requirements artefact only. Packs still say `CEO REVIEW / NOT YET RATIFIED` and `HELD — NOT IMPLEMENTATION AUTHORITY`. Acceptance of S04E does not start S04F. |
| EOS-S04F Cursor pack “No push or deployment in P00–P11” | Historical pack hold. Deploy-by-default remains the current `atelier-doclar` rule **if** S04F is later authorised. It is not itself S04F implementation authority. |

## Addendum — 2026-09-07 EOS-S04F ratification (`MD-PR-S026`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04F `HELD / CEO REVIEW / NOT IMPLEMENTATION AUTHORITY` | SUPERSEDED by `docs/control/EOS_S04F_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`. P00–P11 released. |
| EOS-S04F Cursor pack wording that holds routine commits, pushes or Railway deployment | SUPERSEDED for this authorised slice by deploy-by-default and the CEO overlay. Push and deploy Event OS in `atelier-doclar`. Deployment is not acceptance. |
| EOS-S05 | Retained unauthorised. This overlay does not start it. |
| Control Tower | Compatibility-only unless a ratified contract requires a genuine change. Not a deploy target for this slice. |

## Addendum — 2026-09-08 EOS-S04F acceptance (`MD-PR-S027`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S04F `IN_REVIEW / NOT READY` | SUPERSEDED by `docs/control/EOS_S04F_ACCEPTANCE.md`. Status is `ACCEPTED` at SHA `a4795e83c929bf24591f52c2224eb4b588c23ef3`. |
| EOS-S05 catalogue `dependsOn: EOS-S04` / technically eligible | Dependency-law eligibility only. Historical `MDOS/slice5` packs remain `RATIFICATION DRAFT`. Implementation remains `NO`. |
| B0 inventory `PROGRAMME_AUTHORITY_RATIFIED_UNLESS_EXPRESSLY_EXCEPTED` for Slice 5 | Not a CEO implementation overlay. Not authority to execute S5-01 or P00. |
| Deploy-by-default (6 September 2026) | Remains the `atelier-doclar` rule **if** S05 is later authorised. It is not itself S05 implementation authority. |

## Addendum — 2026-09-08 EOS-S05 ratification (`MD-PR-S028`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S05 implementation remains `NO` / historic packs `RATIFICATION DRAFT` | SUPERSEDED by `docs/control/EOS_S05_RATIFICATION.md`. Status is `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS` for Milestone 1 only. Filenames remain historical evidence. |
| Historic instruction to run sixty prompts `S5-01`–`S5-60` individually | SUPERSEDED as execution model. Those IDs remain `NOT_EXECUTED` traceability units. Milestone 1 implements S5-01–S5-13 substantively. |
| EOS-S05 catalogue slice / accepted-slice count | Catalogue slice yes. Accepted-slice count remains 4 until independent acceptance. This prompt does not accept EOS-S05. |
| EOS-S06 and later slices | Remain unauthorised. |
| Deploy-by-default (6 September 2026) | Controlling for verified Event OS work on `atelier-doclar`. Deployment is not acceptance and not production authorisation. |

## Addendum — 2026-09-08 EOS-S05 Milestone 2 (`MD-PR-S029`)

Milestone 2 is authorised on the Milestone 1 contracts. Historic S5-14–S5-27 and S5-31–S5-38 are implemented substantively. S5-28–S5-30 remain Milestone 3. Milestone 1 is not reopened. EOS-S05 is not accepted. EOS-S06 remains unauthorised.

## Addendum — 2026-09-08 EOS-S05 Milestone 3 (`MD-PR-S030`)

Milestone 3 is authorised on the Milestone 1–2 contracts. Historic S5-28–S5-30 and S5-39–S5-55 are implemented substantively and remain `NOT_EXECUTED` as individual prompt runs. Live binary upload stayed disabled in Milestone 3; `TDR-S05-001` was blocking until Milestone 4. Milestones 1–2 are not reopened. EOS-S05 is not accepted. Production remains unauthorised.

## Addendum — 2026-09-08 EOS-S05 Milestone 4 (`MD-PR-S031`)

Milestone 4 is authorised on the Milestone 1–3 contracts. Historic S5-01–S5-60 and `MD-PR-0232`–`0291` remain `NOT_EXECUTED` as individual prompt runs. The floor-plan production pipeline is bound inside `atelier-doclar`. `TDR-S05-001` is closed. Venue evidence remains metadata-only. Milestones 1–3 are not reopened. EOS-S05 is not accepted. EOS-S06 remains unauthorised. Production remains unauthorised.

## Addendum — 2026-09-08 EOS-S05 export provenance (`MD-PR-S032`)

`MD-PR-S032` authorises a bounded correction of visible PDF/PNG provenance only. It does not reopen Milestones 1–3, accept EOS-S05, start EOS-S06 or authorise production. Claude-in-Chrome remains deferred.

## Addendum — 2026-09-08 EOS-S05 consolidated remediation (`MD-PR-S033`)

`MD-PR-S033` authorises Cursor to implement and deploy the independent-verification defects only. It does not accept EOS-S05, start EOS-S06 or authorise production. Whole-slice Claude-in-Chrome is not rerun.

## Addendum — 2026-09-08 EOS-S05 final traceability (`MD-PR-S034`)

`MD-PR-S034` authorises Cursor to implement and deploy the override decision-record and export-affordance defects only. It does not accept EOS-S05, start EOS-S06, reopen passed S033 behaviour, or authorise production. Whole-slice Claude-in-Chrome is not rerun.

## Addendum — 2026-09-08 EOS-S05 independent acceptance (`MD-PR-S035`)

`MD-PR-S035` authorises a documentation-only acceptance record. It does not change Event OS or Control Tower application code, redeploy either service, start EOS-S06, or authorise production. Recommended next control ID `MD-PR-S036` is not implementation authority.

## Addendum — 2026-09-08 EOS-S05A ratification (`MD-PR-S037`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S05A `CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY` | SUPERSEDED by `docs/control/EOS_S05A_RATIFICATION.md`. Status is `RATIFIED / FOUNDATION MILESTONE A AUTHORISED / NOT ACCEPTED`. |
| Document 00: Cursor must not implement; no repository or deployment change | SUPERSEDED for canonical documentation and `EEC-00`–`EEC-10` only. Later units remain unreleased. |
| Document 02A `CEO REVIEW / ADDITIVE RATIFICATION REQUIRED` | SUPERSEDED. 02A is ratified. Budget Studio implementation remains inside unreleased `EEC-15`–`EEC-25`. |
| Volumes 04A–04D draft hold / execute only after wrapper approval | SUPERSEDED by this CEO wrapper for Foundation Milestone A. `EEC-11`–`EEC-45` remain ratified but unreleased. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains Seating Allocation and `NOT_STARTED / NOT_AUTHORISED`. `MD-PR-S036` is not consumed. |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S05A is a non-catalogue insert. |
| Control Tower | Compatibility-only. Not a deploy target for this prompt. |
| Deploy-by-default (6 September 2026) | Documentation commit does not deploy. Event OS may be deployed once after completed Milestone A application work if Event OS/shared runtime or migrations changed. Deployment is not acceptance. |

## Addendum — 2026-09-08 EOS-S05A whole-slice implementation (`MD-PR-S038`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| `EEC-11`–`EEC-45` ratified but unreleased | SUPERSEDED by S038 scaffolds, then S039 product-depth remediation. Units remain PARTIAL / NOT ACCEPTED. |
| Foundation Milestone A consent using caller `mode` | SUPERSEDED. Durable session mode is authoritative after CREATE. |
| TDR-S05A-001 / TDR-S05A-002 | CLOSED. Private source objects and opportunity owner/update/close surfaces exist. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. `MD-PR-S036` is not consumed. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target. |
| Claude-in-Chrome | Deferred until independent whole-slice verification after Event OS deployment. |

## Addendum — 2026-09-09 EOS-S05A product-depth remediation (`MD-PR-S039`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| `EEC-11`–`EEC-45` complete under `MD-PR-S038` | SUPERSEDED. Independent review found scaffolds. S039 deepens behaviour. Units remain PARTIAL / NOT ACCEPTED. |
| Hardcoded NGN current prices in cost rules | SUPERSEDED. Rules use `PRICE_REF`. Synthetic evidence is labelled and cannot yield `COMPLETE`. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target. |
| Claude-in-Chrome | Not run. Still deferred. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |

## Addendum — 2026-09-09 EOS-S05A final product-completion (`MD-PR-S040`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| `EEC-11`–`EEC-45` PARTIAL after `MD-PR-S039` | SUPERSEDED for implementation units. S040 completes remaining product gaps. EOS-S05A remains NOT ACCEPTED. |
| TDR-S05A-003 / 004 / 005 | CLOSED. Evaluation corpus, client investment route and calendar placement exist. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target. |
| Claude-in-Chrome | Not run. Still deferred. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |

## Addendum — 2026-09-09 EOS-S05A consolidated human-verification remediation (`MD-PR-S043`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| MD-PR-S042 Auditor confidentiality / extraction false success / bundled client consent | SUPERSEDED by `MD-PR-S043` product remediation. Findings remain recorded; disposition is implemented, not accepted. |
| Evaluation corpus `s05a-eval-v2` / 33 cases | SUPERSEDED as the current executable edition. Current edition is `s05a-eval-v3` / 37 cases / hash `5a7c208aed31aa0b0ef47ae1553370c3d259254468f2eac7e3eb3cff6e21169c`. Prior PASSED runs are STALE until a genuine live CEO rerun. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target for this run. |
| Claude-in-Chrome | Not run. Still deferred. Ready for focused Claude re-verification after AI CTO review. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-09 EOS-S05A final truthful-decision remediation (`MD-PR-S045`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| MD-PR-S044 extraction receipt false success / relative contradiction choice / Budget prefill from non-governing brief | SUPERSEDED by `MD-PR-S045` product remediation. Findings remain recorded; disposition is implemented, not accepted. |
| Evaluation corpus `s05a-eval-v3` / 37 cases | SUPERSEDED as the current executable edition. Current edition is `s05a-eval-v4` / 41 cases / hash `47c2c5b3b4c1c0df13f863d7f071361a34e2a41fee33c4750210d5dc4a4efa4d`. Prior PASSED runs are STALE and were not restamped. |
| Approved unpublished Event Brief | RETAINED as canonical eligible Budget source together with `PUBLISHED`. Not broadened to WORKING or SUBMITTED. |
| Staff-reviewed-but-unpublished guest count | RETAINED as not governing Budget truth. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target for this run. |
| Claude-in-Chrome | Not run. Ready for narrow Claude re-verification after AI CTO review. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-09 EOS-S05A Budget Studio override execution (`MD-PR-S047`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| MD-PR-S046 typed 350/340 discarded / missing-record redirect / contradiction focus to body | SUPERSEDED by `MD-PR-S047` product remediation. Findings remain recorded; disposition is implemented, not accepted. |
| Evaluation corpus `s05a-eval-v4` / 41 cases | SUPERSEDED as the current executable edition. Current edition is `s05a-eval-v5` / 44 cases / hash `bba37d57763b6d383ff08a7306deff44a4bfb82f281321947b3774820b3ddd71`. Prior PASSED runs are STALE and were not restamped. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target for this run. |
| Claude-in-Chrome | Not run. Ready for focused Claude verification after AI CTO review. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-09 EOS-S05A action-result truth and focus (`MD-PR-S049`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| MD-PR-S048 replay `Did data change: Yes` / drifting generated time / focus on `<body>` / global F5 retry lock | SUPERSEDED by `MD-PR-S049` product remediation. Findings remain recorded; disposition is implemented, not accepted. |
| Evaluation corpus `s05a-eval-v5` / 44 cases | SUPERSEDED as the current executable edition. Current edition is `s05a-eval-v6` / 46 cases / hash `4ee2bac7104bb06330ebb95e08e9600878795f902a05302b5e500571e5c9c454`. Prior PASSED run `7aa7b7d0-e334-452f-8370-709e9a03457c` is STALE and was not restamped. |
| Budget calculation engine 360→350→340/335 | RETAINED. Not reopened. Event Brief remains 360. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target for this run. |
| Claude-in-Chrome | Not run. Ready for targeted Claude verification after AI CTO review. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-10 EOS-S05A final decision-result focus (`MD-PR-S051`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| MD-PR-S049 denial heading visible but `document.activeElement` remains `<body>` | SUPERSEDED by `MD-PR-S051` focus sequencing. Findings remain recorded; disposition is implemented, not accepted. |
| Evaluation corpus `s05a-eval-v6` / 46 cases | RETAINED. No corpus change. Prior PASSED run remains current. |
| Budget calculation engine / replay / generated time / scoped locks | RETAINED. Not reopened. |
| Catalogue accepted-slice count | RETAINED at 5. |
| Control Tower | Compatibility-only. Not a deploy target for this run. |
| Claude-in-Chrome | Not run. Ready for one-action Claude verification. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-10 EOS-S05A independent acceptance (`MD-PR-S053`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S05A IMPLEMENTED / NOT ACCEPTED | SUPERSEDED. Current programme status is `ACCEPTED` under `MD-PR-S053`. Historic not-accepted rows remain dated history. |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S05A is not a catalogue-numbered slice. |
| Evaluation corpus `s05a-eval-v6` / 46 cases | RETAINED. Current PASSED run remains current. |
| EOS-S05B | PLANNING DIRECTION ONLY. Not implementation authority. Not started. |
| Control Tower | Compatibility-only. Not a deploy target for this documentation-only record. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-10 EOS-S05B implementation (`MD-PR-S054`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S05B PLANNING DIRECTION ONLY | SUPERSEDED for implementation authority only. Current programme status is `IMPLEMENTED / NOT ACCEPTED` under `MD-PR-S054`. Historic planning-direction rows remain dated history. |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S05B is not a catalogue-numbered slice. |
| Evaluation corpus `s05b-eval-v1` | NEW. Separate from retained `s05a-eval-v6`. Fail-closed when unrun. |
| Control Tower | Compatibility-only. Not a deploy target unless executable code changed. It did not. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-11 EOS-S05B independent acceptance (`MD-PR-S069`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S05B IMPLEMENTED / NOT ACCEPTED | SUPERSEDED. Current programme status is `ACCEPTED` under `MD-PR-S069`. Historic not-accepted rows remain dated history. |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S05B is not a catalogue-numbered slice. |
| Evaluation corpus `s05b-eval-v6` / 63 cases | RETAINED. Current PASSED run remains current. |
| Control Tower | Compatibility-only. Not a deploy target for this documentation-only record. |
| EOS-S06 / `MD-PR-S036` | RETAINED. EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |

## Addendum — 2026-09-12 EOS-S06 V2 controlled seating truth replacement (`MD-PR-S072`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S06 / `MD-PR-S036` `NOT_STARTED / NOT_AUTHORISED` | SUPERSEDED for implementation authority only. MD-PR-S072 authorises replacement of the defective seating decision spine. Historic unauthorised rows remain dated history. EOS-S06 is not accepted. |
| MD-PR-S070 V2 + MD-PR-S071 as sole S06 implementation authority | SUPERSEDED for the seating decision spine. MD-PR-S072 is the sole execution authority. S070/S071 artefacts remain readable as incompatible history. |
| `s06-eval-v1` PASSED | STALE/INCOMPATIBLE. Do not restamp. Successor evaluation is `s06-eval-v2`. |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S06 is not a catalogue-accepted slice. |
| Control Tower | Compatibility-only. Not a deploy target unless executable code changed under amended authority. |
| `productionAuthorised` | RETAINED false. Not changed. |
| EOS-S07 | RETAINED not started. |

## Addendum — 2026-09-13 EOS-S06 live settlement and process isolation (`MD-PR-S073`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| S072 handoff NOT READY FOR CLAUDE | PRESERVED as dated history. Live publication/replay and live eval persist were unfinished on `0d43a9e`. |
| MD-PR-S072 as sole S06 execution authority | SUPERSEDED only for live settlement/isolation. MD-PR-S073 is the sole authority for that remaining failure. MD-PR-S072 remains the V2 seating-truth parent. |
| `s06-eval-v2` as current corpus | STALE after validator/case contract change. Current corpus is `s06-eval-v3` (35 cases). Do not restamp v1/v2. |
| Queue/worker required for `<3s` launch acknowledgement | REJECTED. Synchronous launch on `1ce6e0f` met the live bound (POST max 2931ms; solver 11–17ms). |
| Catalogue accepted-slice count | RETAINED at 5. EOS-S06 is not a catalogue-accepted slice. |
| `productionAuthorised` | RETAINED false. Not changed. |
| Control Tower | Compatibility-only. Not deployed. |
| EOS-S07 | RETAINED not started. |

## Addendum — 2026-09-13 EOS-S06 evaluation v4 (`MD-PR-S075` Section 10)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| `s06-eval-v3` as current corpus | STALE after table-identity, solver-claim honesty and capacity-truth change. Do not restamp. Frozen hash remains `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c`. |
| Current corpus | `s06-eval-v4` / `s06-eval-contract-v4` / 49 cases / hash `0e1a6b403fdc85268e3eb9d154a496ac94c0017714445a677ac285f20df51369`. |
| Live `s06-eval-v3` PASSED on `1ce6e0f` | Immutable history. Honestly STALE against current v4. Not restamped. Not redeployed. Live v4 persist waits for Section 12. |
| Readiness | Fail-closed: persisted v3 `PASSED` is `BLOCKED`. Only current compatible v4 with 49 cases and zero failures is `RELEASE_READY`. |

## Addendum — 2026-09-15 EOS-S06 formal technical acceptance (`MD-PR-S077`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S06 `IMPLEMENTED / NOT ACCEPTED` / `NOT READY FOR CLAUDE` | SUPERSEDED for programme status only. Formal acceptance is `MD-PR-S077` on 2026-09-15. Historical NOT ACCEPTED rows remain dated history. |
| Catalogue accepted-slice count retained at 5 | SUPERSEDED. EOS-S06 is a catalogue-accepted slice. Count is **6**. |
| Overall programme-validate run `35001426000` green | REJECTED. Run is not globally green. Current-product shard 0 passed. Extended historical regression retained as `TDR-S06-003` and must not be represented as green, deleted, or silently waived. |
| EOS-S06A execution started by acceptance | REJECTED. EOS-S06A is RATIFIED / ELIGIBLE / NOT STARTED. |
| EOS-S07 authorised | RETAINED false. `NOT_STARTED / NOT_AUTHORISED`. |
| `productionAuthorised` | RETAINED false. Not changed. |
| Control Tower deploy for acceptance | REJECTED. Compatibility-only; not deployed. |
| Accepted application SHA vs docs tip | Accepted/deployed application SHA is `42b0bb3f0976ca2b745a09f3952680afef69a1b9`. Reviewed pre-acceptance tip is `48cb593813a448c50bb506bd4cbc72e679cfb404`. Do not conflate. |

## Addendum — 2026-09-16 EOS-S06A formal technical acceptance (`MD-PR-S079`)

| Historical / pack wording | Current execution meaning |
|---------------------------|---------------------------|
| EOS-S06A `IMPLEMENTED BUT NOT ACCEPTED` / pending verification | SUPERSEDED for programme status only. Formal acceptance is `MD-PR-S079` on 2026-09-16 — PASS WITH ONE CONTROLLED MINOR OBSERVATION. Historical NOT ACCEPTED rows remain dated history. |
| EOS-S06A execution started by EOS-S06 acceptance | REJECTED. EOS-S06A execution was authorised under `MD-PR-S078` and is now ACCEPTED under `MD-PR-S079`. |
| EOS-S06A acceptance equals production authorisation | REJECTED. `productionAuthorised` remains false. Pre-production gates remain unsigned. `TDR-S06A-001` must be corrected before production authorisation. |
| Real provider / communication activation | REJECTED. Providers and communications remain INACTIVE. Browser-assisted execution remains simulated. |
| EOS-S07 authorised by EOS-S06A acceptance | REJECTED. `NOT_STARTED / NOT_AUTHORISED`. |
| Control Tower deploy for acceptance | REJECTED. Compatibility-only; not deployed / untouched. |
| Accepted application SHA vs reviewed tip vs acceptance commit | Accepted application SHA is `7f139a556f7c023efa98daccd7bfd29481a05775`. Reviewed pre-acceptance documentation/evidence tip is `8e8a6a02e797a4c9cedceb7748667d1a934cbc1a`. Acceptance governance commit is separate. Do not conflate. |
