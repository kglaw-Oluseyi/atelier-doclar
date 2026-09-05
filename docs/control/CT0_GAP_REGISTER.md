# CT0 Gap Register

**Slice:** MD-CT0  
Extends B0 gaps. Does not rewrite B0 history.

## Still open from B0

GAP-001 Event-Day v1 pack missing · GAP-003 no application · GAP-005 no existing OS modules for R0 · GAP-006 product machine schemas mostly documentary · GAP-008 Claude inspect-manifest file not located · GAP-009 `AGENTS.md` / `BUILD_LEDGER.md` / `CURRENT_STATE.md` / `DECISION_LOG.md` absent · GAP-011 seed `sourceCommit` still forty zeros (historical example file, not rewritten).

## Closed or reduced by CT0

| ID | Treatment |
|----|-----------|
| GAP-002 / CRQ-016 | Planning outputs created under `docs/control/` and `programme/` |
| GAP-007 / CRQ-008 | Responsibility boundary defined; models not merged |
| GAP-010 / CRQ-009 | Separate-repo language interpreted as logical modules |
| GAP-012 / GAP-013 / CRQ-007 | DAG + mapping; variants remain visible |
| GAP-015 / CRQ-012 | Compatibility register; sources not rewritten |
| GAP-004 / CRQ-002 | MD-PR identity adopted; native IDs not invented |
| GAP-016 | Single-repo rule restated |

## New CT0 gaps

| ID | Gap | Effect |
|----|-----|--------|
| CT0-GAP-001 | No TypeScript project to host CT1 validators | Closed in MD-CT1 by `packages/programme-domain` |
| CT0-GAP-002 | No CI | Reduced in MD-CT1 by `.github/workflows/programme-validate.yml` (validate only; no deploy) |
| CT0-GAP-003 | No auth | `/programme` cannot go live |
| CT0-GAP-004 | Bounded Academy contract not implemented | R17 blocked (OI-CT0-003) |
| CT0-GAP-005 | Event OS S8 mapping is principle-level, not a line-by-line traceability matrix | Later reconciliation slice needed before anyone executes S8 or claims S8 superseded |
| CT0-GAP-006 | `prompts/control-tower/*.md` bodies were **not** extracted | Avoids rewriting the prompt estate; CT1+ must read source programme + compatibility register |
| CT0-GAP-007 | INT-CLOSE has no dedicated historical prompt pack | Planning slice only |

## Broken references still true

Prompts still cite files that do not exist (`AGENTS.md`, ledgers). Compatibility wrapper: create those control files when the first implementation slice is authorised, do not pretend they exist now.
