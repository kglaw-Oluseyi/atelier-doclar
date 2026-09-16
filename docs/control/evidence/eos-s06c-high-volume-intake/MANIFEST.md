# EOS-S06C High Volume Guest List Intake — Evidence Manifest

**Control:** Bounded EOS-S06C implementation authority (16 September 2026)
**Starting Git HEAD (implementation):** `275ff754cd75ef728051564b9b266e103185548f`
**Pre-Claude closure starting Git HEAD:** `d3ca6e5a49523233f045d001dda9e7cc65db612c`
**Accepted application SHA (entry):** `71317881384e38671295c3fda32d533c71c3f559`
**Pack archive SHA-256:** `2b104b17dbad3a44dae8947c6250fad11629e0fe91df6c87b39ca8a0c77c74f4`
**Disposition:** Pre-Claude evidence + exact CAP1000 fixture closed — READY FOR CLAUDE — **not accepted**
**Live application SHA:** `04d5607125e6806078a2b496665bf9fe11e57234` (unchanged by this evidence commit)
**Live deployment ID:** `df909000-d78c-46c1-8b9d-798883546691`

## Claim separation (mandatory)

| Claim | Identity | Result |
|-------|----------|--------|
| 50-row intake job qualified | job `a8c6a24d-…` on mixed event `af4a6b7e-…` | COMPLETED 0→50 |
| 1,000-row intake job qualified (throughput) | job `d39e9bde-…` on mixed event `af4a6b7e-…` | COMPLETED 50→1050 |
| Exact CAP1000 event population | event `add41e21-…` / job `28a5370a-…` | COMPLETED 0→1000 |
| Automated assurance | unit/scale + live product scripts | PASS |
| Browser verification (deployed SHA) | `BROWSER_CLOSURE_RESULTS.json` | PASS |

Mixed event authoritative guests = **1,050** = 50 + 1,000. That event is **not** exact CAP1000.

## SHA-256 inventory

Regenerated at evidence freeze — see `EVIDENCE_SHA256.txt`.

| Path | Role |
|------|------|
| `MANIFEST.md` | This file |
| `LIVE_FIXTURE_MANIFEST.json` | Mixed + exact fixture identities |
| `EXACT_CAP1000_FIXTURE.json` | Exact CAP1000 receipt/replay stamp |
| `BROWSER_CLOSURE_RESULTS.json` | Deployed browser verification |
| `RECONCILIATION_RESULTS.json` | Local + live reconciliation |
| `PERFORMANCE_RESULTS.jsonl` | Scale + live timings |
| `CLAUDE_VERIFICATION_PROMPT.md` | Independent browser prompt |
| `KNOWN_LIMITATIONS.md` | Honest gaps |
| `FOCUSED_TEST_RESULTS.txt` | Automated suite + closure regressions |
| `corpora/*.csv` | Deterministic synthetic lists |
| Other pack docs | Compatibility, security, roles, recovery, etc. |

## Protected / unrelated (not staged)

- `Untitled`, `MD Academy/Untitled`
- `apps/event-os/scripts/s076-shard-*`
- `Maison_Doclar_EOS-S06A_Atelier_Command_Execution_Pack_v1.1.zip`
- Dirty `capacity-live-install.ts` / CAP1000 corpus `frozenAt` (pre-existing)

## Milestone boundary

S06B, S06D and S07 were **not** started. `productionAuthorised` remains false. Providers/communications inactive. Control Tower untouched. No application redeploy for this evidence closure.
