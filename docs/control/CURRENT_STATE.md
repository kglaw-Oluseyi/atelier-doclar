# Current State

**Updated:** MD-CT3  
**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0004`  
**Native ID:** `CT3`  
**Slice ID:** `MD-CT3`

| Item | State |
|------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Application / UI | ABSENT |
| Auth / Railway / production database | ABSENT |
| Programme-domain package | PRESENT — validation (CT1) + events/snapshots/status (CT2) |
| Ingestion package | PRESENT — GitHub webhook verification, allow-list, commit/CI ingest, synthetic reconcile (CT3) |
| Live GitHub HTTP client | ABSENT (`CT3-OI-001`) |
| HTTP webhook route | ABSENT (`CT3-OI-002`) |
| Validation command | `pnpm programme:validate` |
| Projection command | `pnpm programme:project` |
| Ingest verify | `pnpm programme:ingest:verify` |
| Reconcile | `pnpm programme:reconcile` (synthetic; `--live` disabled) |
| Persistence | Domain `ProgrammeStore`. Local adapters `NON_PRODUCTION`. Production DB unselected. |
| MD-B0 | IN_REVIEW |
| MD-CT0 | IN_REVIEW |
| MD-CT1 | IN_REVIEW |
| MD-CT2 | IN_REVIEW |
| MD-CT3 | IN_REVIEW |
| MD-CT4–CT9 and product slices | NOT_STARTED (some BLOCKED by open CT0 items when projected) |

No slice is ACCEPTED.
