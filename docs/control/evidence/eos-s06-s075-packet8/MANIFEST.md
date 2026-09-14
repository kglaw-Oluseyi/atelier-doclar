# MD-PR-S075 Packet 8 — durable evidence freeze

**Status:** curated for AI CTO commit approval — not committed by this pass alone
**Prompt Control ID:** `MD-PR-S075`
**Milestone:** `EOS-S06` — not accepted — Claude review not started — EOS-S07 not started

## Identities

| Item | Value |
|------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Repository baseline (docs/`HEAD` at execution) | `aa23f5abd87fd3cf6ac4910bd1ac8dbd3a5dbbd2` |
| Deployed Event OS application SHA | `5179ffd0189a9c88f458e5e4d3865cafa4d92627` |
| Live base host | `event-os-production-bc8d.up.railway.app` |
| Persistence / migrations / productionAuthorised | `POSTGRES` / `APPLIED` / `false` |

## Mutation confirmation

| Item | Value |
|------|-------|
| Event OS application changed | NO |
| Event OS redeployed | NO |
| Railway mutated | NO |
| Control Tower touched | NO |
| Provider touched | NO |
| Production authorised | NO |
| EOS-S06 accepted | NO |
| EOS-S07 started | NO |
| Real external communication sent | NO |

## Commands and results

### Packet G (G.1–G.4)

```text
PLAYWRIGHT_LIVE=1
PLAYWRIGHT_EXPECTED_SHA=5179ffd0189a9c88f458e5e4d3865cafa4d92627
PLAYWRIGHT_BASE_URL=https://event-os-production-bc8d.up.railway.app
railway run … pnpm exec playwright test e2e/s075-layout-binding-live.spec.ts
→ 4 passed (5.4m)
```

Evidence: `packet-g-live.jsonl`, `packet-g-run.txt`
Synthetic event: `44e22325-543d-4b5f-bc2d-d41eefedec5c`
Gates recorded: `G.1-deploy-readiness`, `G.1-canonical-authority`, `G.2-clean-state-freeze`, `G.3-ambiguity-probe`, `G.4-section12-reconfirm-complete`

### §8.2 trusted-boundary matrix

```text
railway run … pnpm exec playwright test e2e/s075-packet8-trusted-boundary-live.spec.ts
→ 10 passed (2.4m)
```

Evidence: `trusted-boundary-matrix.jsonl`, `matrix-run6.txt`

| Case | Role | Classification | durationMs | Result |
|------|------|----------------|------------|--------|
| P8-0 | — | readiness preflight (not one of the nine cases) | — | PASS |
| P8-1 | planner | PERMISSION_DENIED | 2121 | PASS |
| P8-2 | planner | NOT_APPLIED | 2075 | PASS |
| P8-3 | director | PERMISSION_DENIED | 839 | PASS |
| P8-4 | planner | PERMISSION_DENIED | 754 | PASS |
| P8-5 | ceo | SUCCESS_READ | 1179 | PASS |
| P8-6 | auditor | NO_PRIVILEGE_UNION | 1506 | PASS |
| P8-7 | admin | PERMISSION_DENIED | 705 | PASS |
| P8-8 | ceo | NOT_FOUND_EQUIV | 866 | PASS |
| P8-9 | ceo | ABSENT | 1013 | PASS |

Nine cases = **P8-1–P8-9**. P8-0 is deploy/readiness preflight only.
Example correlation (P8-1): `65d69630-0a26-4bd2-8322-3e38d78b5c8e`

### Section 13 journeys (timed re-evidence)

```text
PLAYWRIGHT_LIVE=1
PLAYWRIGHT_EXPECTED_SHA=5179ffd0189a9c88f458e5e4d3865cafa4d92627
PLAYWRIGHT_BASE_URL=https://event-os-production-bc8d.up.railway.app
railway run … pnpm exec playwright test \
  e2e/s075-section-13-j1-studio.spec.ts \
  e2e/s075-section-13-j2-governance.spec.ts \
  e2e/s075-section-13-j3-exports.spec.ts \
  e2e/s075-section-13-j4-ux.spec.ts
→ 4 passed (17.0m)  [2026-09-14T15:23:01Z–15:40:02Z UTC]
```

| Journey | Result | Event ID | Markers |
|---------|--------|----------|---------|
| J1 | PASS | `b56e3ea6-7a63-487d-b066-e0ac51201e1d` | `j1-complete` 15:26:48Z |
| J2 | PASS | `da623474-e438-4eaf-ab00-e07bb054cdb6` | `j2-complete` 15:31:30Z |
| J3 | PASS | `0819da38-9370-402c-a1ff-481922e2e6ae` | `j3-complete` 15:35:50Z (`live:true`) |
| J4 | PASS | `3614c5e4-d9ce-49de-8bde-6a6df51336ba` | `j4-complete` 15:40:02Z (five Launch repetitions timed) |

Evidence: `section13-action-timing.jsonl`, `section13-journey-markers.jsonl`, `section13-timing-live.txt`

## Section 13 per-action timing gate

Hard assertion: each material action `durationMs < 30000`, measured from initiation through retries/redirects/settlement until authoritative success or denial. Retries do not reset the action timer.

| Metric | Value |
|--------|-------|
| Instrumented actions | 47 |
| FAIL / ≥30000 ms | 0 |
| Maximum durationMs | **4393** (`J2-006` Submit seating plan) |
| J4 settlement repetitions timed | 5 (`J4-006`…`J4-010`) |

Full per-action rows: `section13-action-timing.jsonl`
Required fields present: `journey`, `actionId`, `actionName`, `role`, `eventId`, `startedAt`, `endedAt`, `durationMs`, `attemptCount`, `expectedClassification`, `actualClassification`, `correlationId`, `beforeHash`, `afterHash`, `result`.

## Package contents

| File | Purpose |
|------|---------|
| `MANIFEST.md` | This freeze record |
| `section13-action-timing.jsonl` | Per-action timing for J1–J4 |
| `section13-journey-markers.jsonl` | Preflight + provision/complete markers (trimmed) |
| `section13-timing-live.txt` | Playwright summary for timed J1–J4 |
| `trusted-boundary-matrix.jsonl` | Final P8-0–P8-9 matrix rows |
| `matrix-run6.txt` | Matrix Playwright summary |
| `packet-g-live.jsonl` | Packet G gate evidence |
| `packet-g-run.txt` | Packet G Playwright summary |

Secrets, credentials, cookies, connection strings and full-snapshot review text are excluded or omitted.
