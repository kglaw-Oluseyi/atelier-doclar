# CAP1000 FROZEN-WORKER RERUN

**Disposition:** PASS  
**Closed:** 2026-09-17T22:05:06Z (UTC)  
**Repo:** `kglaw-Oluseyi/atelier-doclar`  
**Branch / HEAD at enqueue:** `main` / `b08d68b14d0f6b2401b1c0fa983e46231b69de94`  
**Purpose:** One fresh CAP1000 solver qualification against the already-built, already-scanned frozen worker. No redesign, rebuild, redeploy, rescan, threshold change, corpus change, or adoption.

Machine-readable: [`CAP1000_FROZEN_WORKER_REPORT.json`](./CAP1000_FROZEN_WORKER_REPORT.json) · telemetry: [`CAP1000_FROZEN_WORKER_TELEMETRY.jsonl`](./CAP1000_FROZEN_WORKER_TELEMETRY.jsonl)

Prior CAP1000 evidence (`CAP1000_REPORT.json`, `CAP1000_TELEMETRY.jsonl`) was **not** overwritten.

---

## 1. Git identities (preflight)

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `b08d68b14d0f6b2401b1c0fa983e46231b69de94` |
| `origin/main` | `b08d68b14d0f6b2401b1c0fa983e46231b69de94` (equal; not behind) |
| Ancestor `95e500b` | YES |
| `tiers.ts` polarity | `if (a.table !== pref.table) preference += pref.weight;` present |
| Unrelated dirty tree | Preserved; not staged |

---

## 2. Frozen worker identity (Railway, read-only)

| Field | Expected | Observed |
|---|---|---|
| Project | `atelier-doclar` | `atelier-doclar` |
| Environment | `production` | `production` |
| Service | `solver-worker` | `solver-worker` ● Online / SUCCESS |
| Service ID | `32f09234-9295-4a6c-8b8d-952d61d08706` | match |
| Deployment ID | `57b5c9fb-4538-44ef-ad90-7d731a7db948` | match |
| Image identity | `event-os-solver-worker:m6e-worker-8c8d922` | match (Railway + registry) |
| Immutable digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` | match (`CPSAT_IMAGE_DIGEST`) |
| `SOURCE_SHA` | `8c8d92241a550348f3ba44192cb07f655ffe6d5d` | match |
| READY workers | exactly 1 | `worker:6515380f7ebc:1ec6b6ae` |
| Concurrency | 1 | 1 |
| Heartbeat | current | current |
| Active/queued/leased runs before enqueue | 0 | 0 |

No Railway variables, image, or deployment were changed.

---

## 3. Freshness / APPLIED proof

| Field | Value |
|---|---|
| New event ID | `e1376606-8c7e-4891-9fc4-28ad2c67eb12` |
| New run ID | `35e40c93-cc74-483b-8c57-dc02846d288b` |
| Enqueue application | **APPLIED** (not REPLAYED) |
| Prior CAP1000 event (untouched) | `add41e21-9618-44f9-896a-fecd54badca5` |
| Prior CAP1000 run (untouched) | `96aa065d-6318-44ea-87b0-60f33ada020b` → still `READY_FOR_REVIEW` |
| Historical idempotency keys | not released / not suffixed / not modified |

Path: durable enqueue of locked B_TYPICAL corpus (product layout-install OOM path avoided; same CP-SAT child path).

---

## 4. Corpus lock (pre-enqueue asserts)

| Assert | Result |
|---|---|
| Corpus hash | `13125f90267e3a78207c02f292d3f948afe22b23e60b58b0ef474f5f2b3d0668` |
| Guests | 1000 |
| Preferences | 24 |
| `required.preferences` | `true` (A2 applicable) |
| `required.movement` | `false` (corpus has no baseline) |

---

## 5. CAP1000 result

| Gate | Value |
|---|---|
| Lifecycle | `READY_FOR_REVIEW` |
| `productResult` | `OPTIMAL` |
| `evidenceGrade` | `OPTIMAL_PROOF` |
| `stopReason` | `VERIFIED_SEALED` |
| `childInvocationCount` | 1 |
| `attemptCount` | 1 |
| Seated / unique guests / unique positions | 1000 / 1000 / 1000 |
| Candidate sealed | yes |
| Candidate adopted | no |

---

## 6. A2 reported vs recomputed

| Source | A2 integer |
|---|---|
| Child / candidate `preference_tier` (reported) | **0** |
| Settlement `tierVerification.recomputed.preference` | **0** |
| Independently recomputed TypeScript A2 (`recomputeObjectiveTiers`) | **0** |
| `A2_preferences` present | yes |
| `TIER_MISMATCH` | none |

---

## 7. Performance

| Timing | ms |
|---|---|
| Queue enqueue | 2819 |
| Claim latency | 5000 |
| Solve wall (observed started→sealed) | 5000 |
| Total wall (harness) | 19873 |
| Ratified typical target | ≤30000 (met) |
| Hard ceiling / stop-loss | 90000 (not hit) |

---

## 8. Containment

- Queue empty after settlement; lease cleared.
- Worker remains READY (`worker:6515380f7ebc:1ec6b6ae`).
- Baseline adoption `3b771ad9-…` remains `CURRENT` with assignment hash  
  `cbaffd8eb266fc34316d0f82ba935a852e2effeb7c06d029c17921c2d3b46f3d` (byte-identical before/after).
- No automatic retry (`attemptCount=1`, `childInvocationCount=1`).
- No CAP2000; no product-path OOM investigation; S06B/C/S07 untouched.

---

## 9. Run-to-digest binding

**Method: CORRELATED FROM WORKER REGISTRY + RAILWAY DEPLOYMENT + TIMESTAMPS**  
(Not DURABLY RECORDED on the run row — digest is not a column on `cpsat_solver_runs`.)

| Element | Value |
|---|---|
| Run started | `2026-09-17T22:04:54.311Z` |
| Run sealed | `2026-09-17T22:04:59.292Z` |
| Claimer (`RUN_CLAIMED.leaseOwner`) | `worker:6515380f7ebc:1ec6b6ae` |
| Registry `image_identity` during interval | `event-os-solver-worker:m6e-worker-8c8d922` |
| Railway deployment ID | `57b5c9fb-4538-44ef-ad90-7d731a7db948` |
| Railway image tag | `event-os-solver-worker:m6e-worker-8c8d922` |
| Immutable digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| `SOURCE_SHA` | `8c8d92241a550348f3ba44192cb07f655ffe6d5d` |

### Durable run events

```
RUN_QUEUED  2026-09-17T22:04:49.322Z    event e1376606-…
RUN_CLAIMED 2026-09-17T22:04:54.311Z    leaseOwner=worker:6515380f7ebc:1ec6b6ae
RUN_RUNNING 2026-09-17T22:04:54.444Z
RUN_SETTLED 2026-09-17T22:04:59.292Z    READY_FOR_REVIEW / OPTIMAL / OPTIMAL_PROOF
```

### Railway worker log lines (run ID)

```
2026-09-17T21:34:42.352Z workerId="worker:6515380f7ebc:1ec6b6ae" concurrency=1 imageIdentity="event-os-solver-worker:m6e-worker-8c8d922"
2026-09-17T22:05:13.102Z event="job_finished" runId="35e40c93-cc74-483b-8c57-dc02846d288b" workerId="worker:6515380f7ebc:1ec6b6ae" outcome="READY_FOR_REVIEW" settled=true childInvocations=1
```

An environment variable alone is **not** treated as proof.

---

## 10. Files created or modified

**Created**

- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP1000_FROZEN_WORKER_RERUN.md`
- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP1000_FROZEN_WORKER_REPORT.json`
- `docs/control/evidence/eos-s06-cpsat-production/milestone-6de/CAP1000_FROZEN_WORKER_TELEMETRY.jsonl`
- `apps/event-os/scripts/m6e-cap1000-worker-qualify.ts` (qualification harness for this rerun)

**Not modified**

- Prior `CAP1000_REPORT.json` / `CAP1000_TELEMETRY.jsonl`
- Solver / verifier / `tiers.ts` / Python / worker image / Railway vars
- Frozen corpus, thresholds, historical run rows

---

## 11. Safety confirmations

- No worker rebuild or redeploy.
- No Event OS redeploy.
- No adoption of the sealed candidate.
- No CAP2000.
- Historical rows immutable for this task.
