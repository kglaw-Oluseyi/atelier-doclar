# EOS-S06 CP-SAT Production Seating Correction Programme — Registration

**Pack title:** Maison Doclar EOS-S06 CP-SAT Production Seating Ratification Pack
**Version:** 1.0
**CEO ratification date:** 16 September 2026 (authority recorded 17 September 2026)
**Repository:** `kglaw-Oluseyi/atelier-doclar` · branch `main`
**Railway project:** `atelier-doclar` · environment `production`
**Controlling archive path:** `docs/control/eos-s06-cpsat/ratification-pack/Maison_Doclar_EOS-S06_CP-SAT_Production_Seating_Ratification_Pack_v1.0.zip`
**Archive SHA-256:** `9d41447846109a55ee95c641686d3aa239188801bfcc5c19d0656e3470870c74`

## Canonical status

**EOS-S06 CP-SAT Production Seating Correction Programme**

| Field | Value |
|-------|-------|
| Programme status | `CEO RATIFIED` |
| Implementation | `IMPLEMENTATION AUTHORISED` |
| Acceptance | `NOT ACCEPTED` |
| Production authority | `PRODUCTION AUTHORITY NOT GRANTED` |
| Real data | `REAL DATA NOT AUTHORISED` |
| `productionAuthorised` | `false` |
| Providers / communications | `INACTIVE` |
| Control Tower | Untouched |

This programme corrects and replaces the seating solver implementation prospectively. It does **not** recreate or revoke accepted EOS-S06 governance history (`MD-PR-S077` and related acceptance records remain controlling for prior acceptance).

## Pack identity verification (17 September 2026)

| Check | Result |
|-------|--------|
| Exact filename | Confirmed |
| Archive SHA-256 | Confirmed `9d41447846109a55ee95c641686d3aa239188801bfcc5c19d0656e3470870c74` |
| ZIP integrity (`unzip -t`) | Pass — no errors |
| Inventory | 11 DOCX + `MANIFEST.json` + `README.md` |
| DOCX vs `MANIFEST.json` | All 11 hashes and byte lengths match |
| Unpacked vs ZIP entries | Byte-identical |
| Secrets / tokens / real consumer PII scan | Clean (DOCX binary numeric false-positives discarded; no credentials or consumer PII in prose) |

Supplied ZIP, DOCX files and `MANIFEST.json` are **not modified**.

## Complete inventory

Registered at `docs/control/eos-s06-cpsat/ratification-pack/`:

| Artefact | SHA-256 |
|----------|---------|
| `Maison_Doclar_EOS-S06_CP-SAT_Production_Seating_Ratification_Pack_v1.0.zip` | `9d41447846109a55ee95c641686d3aa239188801bfcc5c19d0656e3470870c74` |
| `00_EOS_S06_CP_SAT_Ratification_and_Authority.docx` | `25ca4c1f3f0454fa854583e5af6e29221f34ed7468beb837f9ccfd14c0527df5` |
| `01_CP_SAT_Architecture_Decision.docx` | `bb455d01d8ffd64e7a8dce71ccfae60820de1f3a2dc43a5181e770b3b5e4ae13` |
| `02_Seating_Semantics_and_Product_Decisions.docx` | `b7931c44e79139b28fd3586e78e23c2cfc53e5e5d3891962de8783486b909fcd` |
| `03_Canonical_Solver_Contract.docx` | `bed4b80ade15ac9b8acf12da8fab26a80def5554fba2901b8bec8314dd9e8873` |
| `04_CP_SAT_Model_Objectives_and_Statuses.docx` | `20ecb6beec9aa8462a1cc0f26df3b034f3762cac119f512bd0a9c2a62265555e` |
| `05_Solver_Worker_Service_and_Runtime_Operations.docx` | `03254c6f3d4f56939e95827fb7ad781860ffc82f105a361451f1fb135b487e81` |
| `06_Verification_Explainability_Privacy_and_Security.docx` | `914b30f109add9befb2de6271084fa3f10a4f7f5465e6589ae162227d759e8d3` |
| `07_Run_Lifecycle_Persistence_and_Operator_Experience.docx` | `5b687c8ca5e5cd25ad53e2dfaffde69c82094132f1207df880b9b9f3a7dd7590` |
| `08_Qualification_Migration_and_Heuristic_Retirement.docx` | `f23cceb9039bdfcead45e2e5e37e6a25d5acb3c0d5b1bd903c34825dfe49a7a1` |
| `09_Detailed_Cursor_Execution_Programme.docx` | `3642f402857518615d47de4dd1fff00752fcfd0dbedd2a9696194c904abfb554` |
| `10_Acceptance_Assurance_and_Independent_Verification.docx` | `5ef5cee3db6a6cb6939ffc4e6ef1b258d43e0fd7cedb436cebf0051c88919d42` |
| `MANIFEST.json` | bound by archive |
| `README.md` | bound by archive |

## Authority and heuristic retirement

- CEO authorises complete replacement of the heuristic seating engine with production CP-SAT.
- Heuristic is **not** an emergency fallback and must not return authoritative results after authority switch.
- Temporary permitted roles before retirement: migration comparator; historical regression reference; optional hint generator only if benchmarks prove ≥25% median improvement — never determining status, verification or adoption.
- Qualification required through 2,000 synthetic guests before CP-SAT can become authoritative.
- Final authority transfer requires Checkpoint 3 / AI CTO acceptance; `productionAuthorised` remains false thereafter until a separate production decision.

## New Railway service authority

Exactly one additional Railway service is authorised:

| Field | Value |
|-------|-------|
| Name | `event-os-solver-worker` |
| Project | `atelier-doclar` only |
| Environment | `production` only |
| Public domain | None |
| Private HTTP/RPC ingress | None |
| Listening application port | None |
| Job source | PostgreSQL durable queue only (`FOR UPDATE SKIP LOCKED`) |
| Outbound | Existing authorised database + required platform operations only |
| Provider / communications access | None |
| Control Tower dependency | None |

Do **not** create any differently named or additional solver service. Service creation is deferred until the authorised deployment checkpoint; Checkpoint 1 may prove build/runtime without creating the live service unless a reversible build-only proof requires it.

Existing authorised Railway product scope for this programme:

- `event-os`
- `event-os-solver-worker` (authorised; not yet created at registration)

## Implementation boundaries

**In scope:** durable solver runs/queue/leases; TypeScript supervisor; isolated Python OR-Tools child; canonical contracts; independent verifier; explanations; diagnostics; UI; synthetic qualification; shadow; local-edge packaging; evidence.

**Out of scope / not authorised:** real guest/client data; provider activation; communications dispatch; Control Tower mutation; EOS-S06B / EOS-S06D / EOS-S07 implementation; production authorisation; acceptance claims without AI CTO decision; unofficial Node/WASM CP-SAT substitutes.

## Required material checkpoints

| Checkpoint | Stop condition |
|------------|----------------|
| 1 — Architecture proven | Pack/governance committed; worker spike; dependency/licence; framed contract; crash/cancel/isolation; Railway no-ingress proposal; local-edge feasibility. Wait for AI CTO. |
| 2 — Local product complete | Solver, verifier, explanations, diagnostics, UI, 50/600/1000/2000 qualification, chaos, replay, performance — no production worker deploy. |
| 3 — Deployment candidate | Full assurance + exact deploy proposal. Wait for deployment authority. |

## Relationship to related programmes

| Programme | Relationship |
|-----------|--------------|
| EOS-S06 (accepted) | Historical acceptance retained. This programme replaces the defective heuristic solver prospectively and preserves defect evidence. |
| EOS-S06C | Acceptance remains pending focused Claude UX recheck / AI CTO decision. Exact CAP1000 and mixed 1,050 fixtures preserved. |
| Heuristic 1,000-seat qualification | Uncovered genuine product solver defect; superseded as an acceptance route by this CP-SAT correction programme. B_TYPICAL corpus hash `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` remains immutable regression evidence. |
| EOS-S06B | Remains `CEO RATIFIED — PLANNING ONLY`. Implementation not authorised. Blocked behind CP-SAT correction/qualification. |
| EOS-S06D | Remains `CEO RATIFIED — PLANNING ONLY`. Implementation not authorised. |
| EOS-S07 | Remains `NOT_STARTED / NOT_AUTHORISED`. |
| Docs-head / CT0 | Existing blockers remain unresolved / retained. |

## Evidence root

`docs/control/evidence/eos-s06-cpsat-production/` including `legacy-defect-provenance/`.

## Controlling documents

The eleven pack DOCX files are controlling **as a set**. Do not cherry-pick convenient portions.
