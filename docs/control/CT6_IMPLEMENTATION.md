# CT6 Implementation — Controlled workflows

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0007`  
**Native ID:** `CT6`  
**Slice ID:** `MD-CT6`  
**Status:** `IN_REVIEW`  
**Baseline:** `ef1b6e0041b0e35e34f46953091c232a170c6b6e`

Open items, decisions, gates, release candidates and append-only audit. Control Tower approval attempts are rejected; named external authority is required. Production remains unauthorised.

## Open items

`CT6-OI-001` — historically process-local; MD-FC1 moved audit behind FileAuditRepository / MemoryAuditRepository.

CT6 historical implementation exception: feature commit `a9c263a59b561b81d5a5d822c1698b59815134d6` failed E2E; corrective commit `b087c20679e2f8dce0ec747c9277f05dbd7f5ad9` passed. No slice was skipped. Audit history preserves both commits. Do not rewrite history to pretend CT6 had one commit.

The approve route evaluates authority without reloading the programme snapshot so the first browser attempt cannot hang on corpus compile. Playwright timeout is 90s in CI.
