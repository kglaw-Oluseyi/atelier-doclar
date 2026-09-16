# Validation Results — MD-PR-S080 Governance Finalisation

**Control ID:** `MD-PR-S080`
**Date:** `2026-09-16`
**Starting HEAD:** `b6a452cde5e4b51a49d13aa47b7b89672fcffffa`

## Programme validator

| Check | Result |
|-------|--------|
| Command | `pnpm programme:validate` |
| Verdict | `PROGRAMME VALIDATION PASS` |
| Cycles | `0` (`NO_CYCLES`) |
| Slices / records | `84` / `84` |
| Exit | `0` |

## CT0 historical validator (retained failure)

| Check | Result |
|-------|--------|
| Command | `python3 docs/control/tools/validate_ct0.py` |
| Verdict | `CT0 VALIDATION FAIL` (expected / retained) |
| Errors | EOS-S01…EOS-S04 illegally ACCEPTED |
| Exit | `1` |
| Disposition | `docs/control/evidence/eos-s06-s080-governance-prep/CT0_HISTORICAL_VALIDATOR_FAILURE_DISPOSITION.md` |

Failure preserved. Not deleted. Not claimed as PASS.

## S06D archive / manifest

| Check | Result |
|-------|--------|
| Archive SHA-256 | `c06d2597d5e11acc8ba4ce5da69f0e963df8b478503716cf15855de364ec967b` (exact match) |
| ZIP integrity (`unzip -t`) | PASS |
| MANIFEST document hashes | PASS (9 DOCX) |
| Unpacked byte-identical to ZIP | PASS |

## `git diff --check`

| Check | Result |
|-------|--------|
| Command | `git diff --check` |
| Result | PASS (exit 0; no whitespace errors reported) |

## JSON validation

| File | Result |
|------|--------|
| `docs/control/SUCCESSOR_PROMPT_REGISTER.json` | PASS |
| `docs/control/eos-s06d/ratification-pack/MANIFEST.json` | PASS |

## Secret / PII scans

Scoped to new/changed governance documents for this finalisation:

| Scan | Matches |
|------|--------:|
| Credential / token patterns | `0` |
| Consumer-email / obvious PII patterns | `0` |

## Protected / unrelated file verification

This task did **not** stage or modify:

| Path | Notes |
|------|-------|
| `Untitled` | Untouched |
| `MD Academy/Untitled` | Untouched |
| `apps/event-os/scripts/s076-shard-runner.sh` | Untouched |
| `apps/event-os/scripts/s076-shard-plan.abandoned.json` | Untouched |
| `Maison_Doclar_EOS-S06A_Atelier_Command_Execution_Pack_v1.1.zip` | Untouched |
| EOS-S06B / EOS-S06C / EOS-S06D pack ZIP/DOCX/`MANIFEST.json` | Untouched (archive SHA-256 unchanged) |
| `packages/shared-platform/src/capacity-live-install.ts` | Pre-existing dirty state retained; not staged |
| `docs/control/evidence/eos-s06-capacity-1000/corpus-manifest.json` | Pre-existing dirty state retained; not staged |

## Live identity probe (read-only)

| Field | Value |
|-------|-------|
| `ready` | `true` |
| `applicationSha` | `71317881384e38671295c3fda32d533c71c3f559` |
| `deploymentSourceSha` | `b6a452cde5e4b51a49d13aa47b7b89672fcffffa` |
| `documentationHead` | `0a0be803f123e8326fb893db1e3562c724b70dd0` |
| `productionAuthorised` | `false` |

Documentation-head mismatch remains `UNRESOLVED` / `OWNER REVIEW`.

## Open debts

`TDR-S06A-001`, `TDR-S06-002`, `TDR-S06-003`, `TDR-S06-004`, `TDR-S06-005`, `TDR-S06-006`, `TDR-S06-007`, `TDR-S06-008` — all remain **OPEN** (count: **8**).

## Task claim

Governance finalisation programme gate: **PASS**.
CT0 historical validator: **FAIL retained** (dispositioned; not hidden).
Overall task honesty: do **not** claim CT0 PASS or docs-head resolution.
