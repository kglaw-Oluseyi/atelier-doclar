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
