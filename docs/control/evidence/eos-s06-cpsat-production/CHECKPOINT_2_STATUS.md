# Checkpoint 2 status — qualification in progress

**HEAD:** `99c79cfef5cde29d32376f77d4581bcc6b13a7f7`  
**Disposition:** `CHECKPOINT 2 — QUALIFICATION IN PROGRESS`

## Cleared blockers

### Blocker 1 — 90s ceiling (CLEARED)
- Before: 92622.144 ms wall (A2 proof ~85s)
- After: aggregation → ~2.5s OPTIMAL
- Closure gate: 5 cold + 5 warm, max **2849.062 ms**, p95 **2849.062 ms**, all &lt; 90000
- Replay assignment hash stable: `5073ab01db68a0b799affeadd7b897a08852f3343172ae92ac2be8ab7300b5a5`
- Evidence: `qualification/B_TYPICAL_BEFORE_AFTER.md`, `B_TYPICAL_CLOSURE_GATE.json`

### Seed overflow
Preserved and contracted (prior commit).

## Remaining mandatory gates (in progress)

| Gate | Status |
|---|---|
| Tiny oracle ≥10k | Shard runner live; shard-0 re-running after expectation fix |
| Medium differential ≥1k | Not started |
| Property ≥1k/property | Not started |
| Verifier mutation ≥90% | Focused suite green; full score matrix pending |
| Planted scale/class matrix | Partial |
| Replay/permutation suite | B_TYPICAL Replay stable; full suite pending |
| Eight-event concurrency | Not started |
| UI/a11y formal axe | Panel prepared; formal gate pending |
| Heuristic inventory | Written (`HEURISTIC_REMOVAL_INVENTORY.md`) |

## Child startup clarification

Inside long-lived worker (`CHILD_STARTUP_IN_RUNNING_WORKER.json`): new Python process import of model package ≈4.0–4.5s with host bind-mount; not docker-create-per-solve. Production baked image should be lower; warm-spare one-job-per-child remains the only allowed optimisation.
