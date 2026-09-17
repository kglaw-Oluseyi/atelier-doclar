# CP-SAT model specification (skeleton)

**Controlling pack:** `04_CP_SAT_Model_Objectives_and_Statuses.docx`

- Stage A: atomic together-units + aggregation classes → tables
- Stage B: seats within each table when seat HARD rules project exactly
- Stage B failure after Stage A ⇒ `SOLVER_FAULT(DECOMPOSITION_GAP)`, never `INFEASIBLE`
- Sequential objectives: movement (A1) → preferences (A2) → Stage B seat movement/preferences → symmetry canonicalisation
- Diagnostics: `DIAG_MAXSEAT`, `DIAG_MCS`, `DIAG_CORE`
