# Prompt Execution Map

**Slice:** MD-CT0  
**Machine file:** `docs/control/PROMPT_EXECUTION_MAP.json`  
**Source estate:** `docs/control/PROMPT_REGISTER.json` (693 prompts)

Do not copy prompt bodies here. Execute only under a new instruction that names `PRODUCT | Prompt Control ID | native ID`.

## Accountability

| Measure | Count |
|---------|------:|
| Prompts mapped | 693 |
| Unique Prompt Control IDs | 693 |
| Unaccounted | **0** |
| READY_AS_WRITTEN | 0 |
| READY_WITH_EXECUTION_WRAPPER | 2 |
| REQUIRES_RECONCILIATION | 85 |
| BLOCKED_BY_DEPENDENCY | 606 |
| SUPERSEDED_BY_LATER_REQUIREMENT | 0 |
| REFERENCE_ONLY | 0 |
| UNKNOWN | 0 |

2 + 85 + 606 = 693.

**PROMPT EXECUTION MAP RECONCILES: YES**

## READY_WITH_EXECUTION_WRAPPER (2)

| Qualified ID | Why wrapper |
|--------------|-------------|
| `FOUNDATION \| MD-PR-0001 \| CT0` | This MD-CT0 instruction |
| `FOUNDATION \| MD-PR-0002 \| CT1` | May proceed after CT0 commit using compatibility register; validator only |

## REQUIRES_RECONCILIATION (85)

- Event OS Slice 8 family (17): `EVENT_OS_S8` / `S8-00BUILD`–`S8-16BUILD` — map into EVENT_DAY; do not double-build.
- Academy positional 09–12 across Gate 0 and Slices 01–16 (68): no located historical native ID; use `MD-PR-xxxx`.

## BLOCKED_BY_DEPENDENCY (606)

All remaining Event OS, Event-Day, Academy, Marketing, Ushering and Event OS/Academy reconciliation prompts, plus CT2–CT9 (depend on prior CT implementation).

## Qualification rule

Never rely on `S10` alone.

Examples:

- `EVENT_OS | MD-PR-0361 | S10-01BUILD`
- `ACADEMY | (see map) | S10-01`

## Execution status

Historical CT0–CT9 plus successor MD-PR-S001–S003 and MD-GR1 remain `IN_REVIEW`. EOS-S01 was executed as successor `MD-PR-S004` and formally accepted under `MD-PR-S007`. EOS-S02 was executed as successor `MD-PR-S008` and formally accepted under `MD-PR-S009`. EOS-S03 was executed as successor `MD-PR-S010` and remains `IN_REVIEW`. MD-GR1 (`MD-PR-S006`) reconciled dependency kinds so Foundation → EOS-S01 is a `PROGRESSION` prerequisite. Accepted count is 2. Production is not authorised.
