# EOS-S06A Remediation 1 — Deployment Identity Addendum

**Date:** 2026-09-15  
**Prompt:** Remediation 1 Deployment-Identity Correction  
**Claude:** not run

## 1. Complete SHA chain

### Pre-remediation application (last S06A implementation tip before Remediation 1)
`6624e261a2fe89dabf92d4addee6e58205e83096`

### Pre-remediation documentation / smoke tip (Remediation 1 starting docs HEAD)
`20bdb1d82c2cb93da03001c7019e447adaa54c2d`

### Remediation 1 runtime / application commits
| Full SHA | Subject |
|---|---|
| `bb86601a67d4ff6f7a607b5cd1f8d6515c41498e` | fix(eos-s06a): remediate Intelligence, cross-event, risk and audit truth |
| `1358269e7fe8481ae9098a64a79604ee552ae433` | fix(eos-s06a): prefer explain-block Intelligence over send routing |
| `7e8832a00184b7e0d1c0913329cdd824cb8007fa` | fix(eos-s06a): show newest Intelligence answer after successive runs |

### Remediation 1 test-only / documentation-only commits
| Full SHA | Subject |
|---|---|
| `f448248cb92e388cd455fbe8b4e3e7f9b7fab963` | test(eos-s06a): isolate successive Intelligence smoke journeys |
| `d3049a9b258f47a1168376aef2e8c3827f996c1c` | docs(eos-s06a): record remediation 1 live smoke evidence |

### Final Remediation 1 application commit (before this identity correction)
`7e8832a00184b7e0d1c0913329cdd824cb8007fa`

### Stale SHA reported by live health (pre-correction)
`233afaaf8c3ee6eeca96914657f3af6041867c40`  
Subject: `fix(eos-s06): route layout-binding recovery through trusted seating context` (2026-09-15 13:06:17 +0100) — **predates EOS-S06A**.

### Repository / origin at investigation start of this correction
- HEAD: `d3049a9b258f47a1168376aef2e8c3827f996c1c`
- origin/main: `d3049a9b258f47a1168376aef2e8c3827f996c1c`

### Railway deployment `d8b0f112-3bfd-47e5-90f9-d07a7f9f7e28`
- status: SUCCESS (2026-09-15T19:59:46.466Z)
- reason: `deploy` (CLI upload via `railway up`, caller `cursor`)
- `RAILWAY_GIT_COMMIT_SHA` at runtime: **unset**
- `EVENT_OS_GIT_SHA` at runtime: `233afaaf8c3ee6eeca96914657f3af6041867c40`
- `RAILWAY_DEPLOYMENT_ID`: `d8b0f112-3bfd-47e5-90f9-d07a7f9f7e28`
- No GitHub revision in deployment meta (upload/archive deploy)

### Live health before correction
- `/api/health/live` deployedSha: `233afaaf8c3ee6eeca96914657f3af6041867c40`
- `/api/health/ready` deployedSha: `233afaaf8c3ee6eeca96914657f3af6041867c40`
- ready: true · POSTGRES · APPLIED · productionAuthorised: false

## 2. What code was actually running

Independent signals that Remediation 1 **application behaviour** was present on `d8b0f112…` despite the stale SHA field:

1. Live smoke **4/4 PASS** after `d8b0f112` for Intelligence substantive answers, named cross-event refusal, R4 block, audit filter — behaviours that did not exist before Remediation 1.
2. Runtime process env on that deployment: `RAILWAY_DEPLOYMENT_ID=d8b0f112…` with Remediation UI markers reachable.
3. Deployment meta: CLI upload of local workspace that contained Remediation 1 sources at upload time.

Therefore: **the wrong application was NOT deployed; only the identity field was wrong.**

## 3. Root cause

**Combined B + C:**

1. Railway service variable `EVENT_OS_GIT_SHA` was **pinned** to stale `233afaaf8c3ee6eeca96914657f3af6041867c40`.
2. Remediation deploys used `railway up` (upload/archive), which does **not** inject `RAILWAY_GIT_COMMIT_SHA`.
3. `deployedSha()` previously resolved `RAILWAY_GIT_COMMIT_SHA ?? EVENT_OS_GIT_SHA`, so the stale pin was returned as the live application identity.

Not A (wrong source bundle), D (wrong health route), or E (build cache of old bundle) as primary cause.

## 4. Correction

- Build-time embedding via `apps/event-os/scripts/write-build-identity.mjs` (`prebuild`).
- Runtime prefers **build-embedded** full SHA; stale `EVENT_OS_GIT_SHA` cannot override it.
- Health live/ready and System expose:
  - `deployedSha` / `applicationSha` (immutable build identity)
  - `deploymentSourceSha` (Railway Git revision when present)
  - `documentationHead` (optional `EVENT_OS_DOCS_HEAD`, never collapsed into application SHA)
- Update Railway `EVENT_OS_GIT_SHA` to the identity-correction application commit and set `EVENT_OS_DOCS_HEAD` deliberately for documentation HEAD when distinct.

## 5. After correction

Filled after deploy.
