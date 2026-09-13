# EOS-S06 Implementation Ledger

**Prompt Control ID:** MD-PR-S075 (parents MD-PR-S073 / MD-PR-S072)
**Status:** IMPLEMENTED — NOT ACCEPTED — NOT READY FOR CLAUDE
**Required S072 baseline:** `844f107fc70e1eaa8995e0c7c49c0c42d52b9dd1`
**Deployed application SHA:** `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3`
**Final repository/docs SHA:** `3f5c09b37d683ad7192660a33f596b7e72d75583` (documentation/test only; not redeployed)
**Authority:** MD-PR-S075 is the sole current execution authority for table identity, compiler and feasibility truth. MD-PR-S073 remains the dated settlement/isolation freeze. MD-PR-S072 remains the V2 seating-truth parent. S070/S071 artefacts remain readable as incompatible history.

This ledger does not accept EOS-S06. It does not authorise real data or production operations. It does not create `EOS_S06_ACCEPTANCE.md`.

Historical S072 handoff status **NOT READY FOR CLAUDE** remains dated history. MD-PR-S073 Packet 8 **READY FOR INDEPENDENT HOLDOUT AND CLAUDE** remains dated settlement history. Current readiness is **NOT READY FOR CLAUDE** until MD-PR-S075 Sections 1–14 complete.

## MD-PR-S075 progress

| Item | Value |
|---|---|
| Authority SHA-256 | `faae89b7bf10ecbe1884c4b375b35ca65b9f516fb3bd2ec89863c3c99d5081c0` |
| Deployed application SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` — not redeployed |
| Sections 1–7 | PASS |
| Section 2 finding | `docs/control/eos-s06/MD_PR_S075_FORENSIC_TABLE_NAMESPACE_FINDING.md` — remains valid |
| Section 7 replay identity | `docs/control/eos-s06/ADR_EOS_S06_V2_RUN_REUSE_IDENTITY.md` — additive `009`; historic compiler ineligible for reuse/adopt |
| Temporary diagnostic tunnel | Closed. Port `55432` none. No `ssh -L`. Homebrew `postgresql@16` left running as a pre-existing machine service. No reconnect unless a later mandated gate genuinely requires read-only verification. |
| Subsequent proof | Repository tests and governed live UI journeys only. Direct database access is not a substitute for required product workflows. |
| Current verdict | NOT READY FOR CLAUDE |

## Freeze

| Item | Value |
|---|---|
| Application / deployed Event OS SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` |
| Repository/docs SHA | `3f5c09b37d683ad7192660a33f596b7e72d75583`; not the live application SHA |
| Railway project / env / service | `atelier-doclar` / `production` / `event-os` |
| Live health SHA | `1ce6e0f286a88dfa358a966ea3c873b2540f5ee3` |
| Persistence | POSTGRES, migrations APPLIED |
| `productionAuthorised` | `false` |
| External providers | INACTIVE |
| Solver | In-process V2 compiled request; solver + validator outside every seating transaction; no queue/worker |
| Evaluation | `s06-eval-v3` / `s06-eval-contract-v2` / 35 cases / hash `e433882ed1a55c4896aaf9fdf524257b870a4e2a450d8ab614bc6763b110035c` / live PASSED |
| Legacy evaluation | `s06-eval-v1` and `s06-eval-v2` STALE/INCOMPATIBLE — not restamped |
| Last-known-good publication | Publication 4 `a6ac23f65f23a10f0dc1deab9464e50791c055e825de3d541fd24a0a34dfbc4d` |
| Temporary diagnostics | Routes 404; `EVENT_OS_DIAGNOSTIC_TOKEN` absent |
| Local execution modes | Production build passed. Production-mode Playwright not executed (`DATABASE_URL` unavailable locally). Isolated development-runtime Playwright: focused S073, S072 and S049 passed. Live production verification passed on deployed application SHA `1ce6e0f`. |
| Control Tower | untouched |

## Sealed holdout

Not accessed, created or inferred. Packet 8 previously authorised independent holdout and Claude; MD-PR-S075 now blocks that start. Cursor has not run Claude.

## Successor

EOS-S07 is not started. `EOS_S06_ACCEPTANCE.md` was not created.
