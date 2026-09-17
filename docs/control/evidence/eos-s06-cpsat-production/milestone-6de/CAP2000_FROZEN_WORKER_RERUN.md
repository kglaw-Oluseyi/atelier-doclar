# CAP2000 FROZEN-WORKER RERUN — STRESS/CONTAINMENT

**Disposition:** PASS — STRESS/CONTAINMENT  
**Closed:** 2026-09-17T22:11:14Z (UTC)  
**Repo:** `kglaw-Oluseyi/atelier-doclar`  
**Branch / HEAD at enqueue:** `main` / `a136f94176a8b51a0f748d566b716f93b16ea1bc`  
**Purpose:** One fresh authorised CAP2000 stress/containment qualification against the same frozen worker used by the successful CAP1000 frozen-worker rerun. No rebuild, redeploy, corpus change, adoption, or A2 claim.

Machine-readable: [`CAP2000_FROZEN_WORKER_REPORT.json`](./CAP2000_FROZEN_WORKER_REPORT.json) · telemetry: [`CAP2000_FROZEN_WORKER_TELEMETRY.jsonl`](./CAP2000_FROZEN_WORKER_TELEMETRY.jsonl)

Prior CAP2000 evidence (`CAP2000_REPORT.json`, `CAP2000_TELEMETRY.jsonl`, `CAP2000_AUTHORISED_QUALIFICATION.md`) was **not** overwritten.

---

## A2 limitation (explicit)

> CAP2000 proves stress, scale and containment. It does not exercise A2_preferences because this corpus contains zero preferences.

`required.preferences = false`. Preference count = 0. A2 polarity evidence remains CAP1000 frozen-worker PASS only.

---

## 1. CAP1000 precondition

| Check | Result |
|---|---|
| CAP1000 frozen-worker commit on `origin/main` | `a136f94` — `test(cpsat): qualify CAP1000 on frozen worker` |
| CAP1000 report disposition | `PASS` |
| CAP1000 digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |

## 2. Git identities (preflight)

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD = `origin/main` | `a136f94176a8b51a0f748d566b716f93b16ea1bc` |
| Overlapping dirty CAP2000 paths | none |

## 3. Frozen worker identity

| Field | Value |
|---|---|
| Service ID | `32f09234-9295-4a6c-8b8d-952d61d08706` |
| Deployment ID | `57b5c9fb-4538-44ef-ad90-7d731a7db948` |
| Status | SUCCESS / Online |
| Image | `event-os-solver-worker:m6e-worker-8c8d922` |
| Digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| `SOURCE_SHA` | `8c8d92241a550348f3ba44192cb07f655ffe6d5d` |
| READY worker | exactly 1 — `worker:6515380f7ebc:1ec6b6ae` |
| Concurrency | 1 |
| Pre-enqueue queue/lease | empty |

## 4. Freshness / APPLIED

| Field | Value |
|---|---|
| New event ID | `18d89806-b708-4459-827c-de544987d4a5` |
| New run ID | `1acbef3c-fe9e-4d02-9829-3a79fa964b0e` |
| Application | **APPLIED** |
| Prior authorised CAP2000 (untouched) | event `22c2befc-…` / run `4c7c4f5e-…` → still `READY_FOR_REVIEW` |
| Inadmissible prior (untouched, not reused) | event `92909476-…` / run `384950a6-…` |

## 5. Corpus

| Field | Value |
|---|---|
| Seed | `scale-2000` |
| Guests | 2000 |
| Preferences | 0 |
| `compiledRequestHash` | `2cc7617db7c62fd6d042500e2040cef07ec48b5dea87a12388180f20d0d5ad11` |
| `configHash` | `7403c97b4d487fa1ed7805a1b23cd1d3a47e491c692648e49abc1df0daf220e0` |
| Matches prior authorised corpus | yes |

## 6. Result

| Gate | Value |
|---|---|
| Lifecycle | `READY_FOR_REVIEW` |
| `productResult` | `OPTIMAL` |
| `evidenceGrade` | `OPTIMAL_PROOF` |
| `stopReason` | `VERIFIED_SEALED` |
| Child invocations / attempts | 1 / 1 |
| Seated / unique guests / unique positions | 2000 / 2000 / 2000 |
| Candidate sealed | yes |
| Candidate adopted | no |

## 7. Performance

| Timing | ms |
|---|---|
| Queue | 5972 |
| Claim latency | 8000 |
| Solve wall (started→sealed) | 3000 |
| Total harness wall | 23542 |
| Typical ≤60s / hard ≤180s | met |

## 8. Containment

- Queue empty; lease cleared; worker READY afterward.
- Baseline `3b771ad9-…` remains `CURRENT` with assignment hash  
  `cbaffd8eb266fc34316d0f82ba935a852e2effeb7c06d029c17921c2d3b46f3d` (byte-identical).
- No automatic retry.
- `productionAuthorised` remained `false`.
- No production publication changed; no provider activated.
- Qualification-only; cannot auto-adopt.

## 9. Run-to-digest binding

**Method: CORRELATED FROM WORKER REGISTRY + RAILWAY DEPLOYMENT + TIMESTAMPS**  
(Same classification as CAP1000 frozen-worker; digest not a durable column on the run row.)

| Element | Value |
|---|---|
| Started | `2026-09-17T22:11:01.387Z` |
| Sealed | `2026-09-17T22:11:04.280Z` |
| Claimer | `worker:6515380f7ebc:1ec6b6ae` |
| Registry image | `event-os-solver-worker:m6e-worker-8c8d922` |
| Railway deployment | `57b5c9fb-4538-44ef-ad90-7d731a7db948` |
| Digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| `SOURCE_SHA` | `8c8d92241a550348f3ba44192cb07f655ffe6d5d` |

### Durable run events

```
RUN_QUEUED  2026-09-17T22:10:53.734Z
RUN_CLAIMED 2026-09-17T22:11:01.387Z  leaseOwner=worker:6515380f7ebc:1ec6b6ae
RUN_RUNNING 2026-09-17T22:11:01.873Z
RUN_SETTLED 2026-09-17T22:11:04.280Z  READY_FOR_REVIEW / OPTIMAL
```

### Railway worker log line

```
event="job_finished" runId="1acbef3c-fe9e-4d02-9829-3a79fa964b0e" workerId="worker:6515380f7ebc:1ec6b6ae" outcome="READY_FOR_REVIEW" settled=true childInvocations=1
```

## 10. Files created

- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_RERUN.md`
- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_REPORT.json`
- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP2000_FROZEN_WORKER_TELEMETRY.jsonl`
- `apps/event-os/scripts/m6e-cap2000-worker-qualify.ts` (harness adjusted for frozen-worker evidence paths + fresh UUID)

## 11. Safety

No product/solver/verifier/worker code change beyond harness · no rebuild/redeploy · no Railway var change · no corpus/threshold/preference change · no historical row mutation · no adoption · no OOM investigation · S06B/C/S07 not started
