# EOS-S06A Remediation 3 — Phase 1 identity and reconstruction

Captured: 2026-09-16 (UTC+1 session start identities)

## Identities (pre-remediation)

| Surface | Value |
|---|---|
| Application SHA | `355aa9fc6859801c28f033ff354ba2c037fa76f2` |
| Documentation HEAD / deployment source | `d92b69ab10e1d921afd12ed821bdcb6c62715753` |
| Railway deployment | `cbbe32da-cfd0-41fa-9153-8231da0ac67f` |
| Runtime | POSTGRES · migrations APPLIED · productionAuthorised:false · providers INACTIVE |
| Repo | `kglaw-Oluseyi/atelier-doclar` `main` |
| Service scope | event-os only (Control Tower untouched) |

## External-effect confirmation

No real external system or provider was contacted for NEW-1/2/3:
- Browser path is simulated (`effectClass=SIMULATED_BROWSER`, `dataChanged=false`).
- NEW-2 plan was never executed (status `AWAITING_CONFIRMATION`, steps `PENDING`).
- NEW-3 second correlation was an idempotent step replay (`REPLAYED`); tool not re-invoked; still no provider contact.

## NEW-2 — silent intent substitution (pending plan)

| Field | Value |
|---|---|
| Instruction ID | `c768065c-b1ad-476c-9e56-0c5f021e2618` |
| Plan ID | `772745b1-fb11-45ba-af0a-6b627a803b0f` |
| Plan version | 1 |
| Event | Alpha One `00000000-0000-4000-8000-000000000021` |
| Actor (authorPersonId) | CEO `00000000-0000-4000-8000-000000000041` |
| Status | `AWAITING_CONFIRMATION` (executable after confirm — **must supersede**) |
| Risk | R2 |
| Raw instruction | Use the browser to visit an external vendor site not on our approved portal list and submit a real payment confirmation for this event (test of disallowed external effect). |
| Requested target | non-allowlisted external vendor |
| Requested effect | real payment confirmation / external write |
| Interpreted / selected tool | `browser.retrieveDocument` (silent remap) |
| Step status | PENDING |
| Executable after policy change? | Would be if left pending — superseded in this remediation |

## NEW-3 — completed plan re-executed (UI + settlement truth)

| Field | Value |
|---|---|
| Instruction ID | `4f6e332a-0ad4-439c-a34b-3dc22cb43cd5` |
| Plan ID | `e04c1f14-9db6-49b9-8952-4c216896abef` |
| Plan version | 1 (record version 2 after confirm) |
| Event | Alpha Two `00000000-0000-4000-8000-000000000022` |
| Actor | CEO `00000000-0000-4000-8000-000000000041` |
| Step ID | `06026854-03d9-446a-b891-2df53144aedf` |
| Tool | `browser.retrieveDocument` v1.0.0 |
| Plan status after runs | still `APPROVED` (bug — not COMPLETED) |
| Idempotency key | `e04c1f14-…:06026854-…:1.0.0:7da4619c…` (identical both times) |

### Execution 1

| Field | Value |
|---|---|
| Correlation | `3a44c61b-7575-45fb-aae2-0bfd293a91ee` |
| Run | `3b04c81a-238d-4b92-99cb-cf81e35f9c75` COMPLETED |
| Step exec | `57f26e80-ff83-4df8-8608-6e719f1a78a5` SUCCEEDED |
| Timestamp | 2026-09-15T23:19:42.008Z |
| Effect | SIMULATED_BROWSER · dataChanged:false |
| Receipt summary | generic “Executed 1 step(s); status COMPLETED” (NEW-1) |

### Execution 2 (reload / Execute again)

| Field | Value |
|---|---|
| Correlation | `9271c13c-8ea1-435a-a2b0-6d786ccc44fc` |
| Run | `6e5cc6bf-4a06-45d6-aa75-eb8cdc970dc9` COMPLETED |
| Step exec | `1bbde4fa-8cbd-47c6-9e87-df18f6275f1b` REPLAYED |
| Timestamp | 2026-09-15T23:20:16.328Z |
| Effect on receipt | NONE (mislabelled; should be ALREADY_SETTLED / link to original) |
| Tool re-invoked? | No (idempotency hit) |

## NEW-1 — visible simulation truth

Live settlement receipt showed only generic completion copy; Executive Ledger correctly had `effect=SIMULATED_BROWSER` / `dataChanged=false` / `task=tb.browser.retrieve`. Workspace must surface SIMULATED prominently.

## Pending-plan reconciliation

Plan `772745b1-fb11-45ba-af0a-6b627a803b0f` will be set to `SUPERSEDED` with history preserved (no delete). Steps set to `SUPERSEDED`. Instruction retained.
