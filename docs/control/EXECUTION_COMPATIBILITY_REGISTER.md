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
