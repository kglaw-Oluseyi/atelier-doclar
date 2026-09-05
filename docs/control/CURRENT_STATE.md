# Current State

**Updated:** MD-CT2  
**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0003`  
**Native ID:** `CT2`  
**Slice ID:** `MD-CT2`

| Item | State |
|------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Application / UI | ABSENT |
| Auth / Railway / production database | ABSENT |
| Programme-domain package | PRESENT — validation (CT1) + events/snapshots/status (CT2) |
| Validation command | `pnpm programme:validate` |
| Projection command | `pnpm programme:project` |
| Persistence | Domain `ProgrammeStore`. Local adapters `NON_PRODUCTION`. Production DB unselected. |
| MD-B0 | IN_REVIEW |
| MD-CT0 | IN_REVIEW |
| MD-CT1 | IN_REVIEW |
| MD-CT2 | IN_REVIEW |
| MD-CT3–CT9 and product slices | NOT_STARTED (some BLOCKED by open CT0 items when projected) |

No slice is ACCEPTED.
