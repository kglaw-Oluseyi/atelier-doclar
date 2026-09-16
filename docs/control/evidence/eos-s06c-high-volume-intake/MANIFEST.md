# EOS-S06C High Volume Guest List Intake — Evidence Manifest

**Control:** Bounded EOS-S06C implementation authority (16 September 2026)
**Starting Git HEAD:** `275ff754cd75ef728051564b9b266e103185548f`
**Accepted application SHA (entry):** `71317881384e38671295c3fda32d533c71c3f559`
**Pack archive SHA-256:** `2b104b17dbad3a44dae8947c6250fad11629e0fe91df6c87b39ca8a0c77c74f4`
**Disposition:** Implementation complete for independent verification — **not accepted**

## SHA-256 inventory

Computed at evidence freeze; regenerate with `shasum -a 256` on commit stamp if needed.

| Path | Role |
|------|------|
| `MANIFEST.md` | This file |
| `CURRENT_INTAKE_COMPATIBILITY.md` | Phase 0 compatibility map |
| `IMPLEMENTATION_TRACEABILITY.md` | Pack requirement → code map |
| `DATA_MODEL_AND_MIGRATIONS.md` | Collections and migration posture |
| `SECURITY_AND_FILE_SAFETY.md` | File/privacy controls |
| `ROLE_AND_APPROVAL_MATRIX.md` | Maker-checker / roles |
| `CORPUS_MANIFEST.json` | Synthetic corpus seeds/hashes |
| `corpora/*.csv` | Deterministic synthetic lists |
| `PERFORMANCE_RESULTS.jsonl` | Scale timings |
| `CONCURRENCY_RESULTS.jsonl` | Isolation notes |
| `RECOVERY_AND_REPLAY.md` | Resume/replay |
| `RECONCILIATION_RESULTS.json` | 50/600/1000/2000 totals |
| `FOCUSED_TEST_RESULTS.txt` | Automated suite output |
| `KNOWN_LIMITATIONS.md` | Honest gaps |
| `CLAUDE_VERIFICATION_PROMPT.md` | Independent browser prompt |
| `CAP1000_TREATMENT_PROPOSAL.md` | Old partial fixture disposition |

## Protected / unrelated (not staged)

- `Untitled`, `MD Academy/Untitled`
- `apps/event-os/scripts/s076-shard-*`
- `Maison_Doclar_EOS-S06A_Atelier_Command_Execution_Pack_v1.1.zip`
- Dirty `capacity-live-install.ts` / CAP1000 corpus `frozenAt` (pre-existing)

## Milestone boundary

S06B, S06D and S07 were **not** started. `productionAuthorised` remains false. Providers/communications inactive.
