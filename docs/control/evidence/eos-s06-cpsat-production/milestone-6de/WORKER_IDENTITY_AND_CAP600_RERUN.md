# WORKER IDENTITY AND CAP600 RERUN

**Started:** 2026-09-17T21:30:00Z (UTC)  
**Closed:** 2026-09-17T21:42:00Z (UTC)  
**Repo:** `kglaw-Oluseyi/atelier-doclar`  
**Purpose:** Freeze immutable worker digest provenance for the A2 polarity fix (`95e500b`), scan that digest, and re-qualify CAP600 against it. Do not infer provenance from CAP1000/CAP2000 pass results alone.

**Artifact directory:** `worker-identity-artifacts/` (raw command outputs attached in this commit)  
**Scan directory:** `worker-scan/` (Trivy JSON for the frozen digest)

---

## STEP 1 — Live worker identity (Railway)

*Recorded before the Step 3 rebuild. Post-rebuild live identity is in Step 3.*

### Raw `railway status` (2026-09-17, pre-rebuild)

```
Workspace:       George Lawson's Projects
Project:         atelier-doclar
Project ID:      c1c937b7-2660-4fc2-8257-c08bd6346658
Environment:     production
Environment ID:  6d70f804-d3c7-4255-88c3-cc86531251ef

Linked service
solver-worker
    status:        ● Online
    image:         ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-a2fix-737d932
    region:        US West
    deployment ID: 72d5bf0b-293f-4917-b96c-3835ec14ea69
    service ID:    32f09234-9295-4a6c-8b8d-952d61d08706
```

### Railway variables (solver-worker, pre-rebuild)

| Variable | Value |
|---|---|
| `CPSAT_IMAGE_IDENTITY` | `event-os-solver-worker:m6e-a2fix-737d932` |
| `CPSAT_IMAGE_DIGEST` | `sha256:8d959a9e121437cb8c252f4ed31707de5cefe04938fe75f9e789d84ccb6b10ec` |
| `SOURCE_SHA` (service var) | `9b6a23f3e49367962beeef5284033ed37cd7c5d5` |

### Immutable digest (not a tag)

Resolved via local `docker inspect` RepoDigests for
`ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-a2fix-737d932`
(also matches Railway deployment `meta.imageDigest` and `CPSAT_IMAGE_DIGEST`):

```
sha256:8d959a9e121437cb8c252f4ed31707de5cefe04938fe75f9e789d84ccb6b10ec
```

### Image labels (`docker inspect --format='{{json .Config.Labels}}'`)

```json
{
  "md.solver.dependency": "ortools-9.15.6755",
  "md.solver.ingress": "none",
  "md.solver.model": "cpsat-model-v1",
  "org.opencontainers.image.revision": "737d9327955a114a90609a450cc0b5fbbc24eb65",
  "org.opencontainers.image.source": "https://github.com/kglaw-Oluseyi/atelier-doclar"
}
```

**Step 1 status:** COMPLETE.

---

## STEP 2 — Provenance against commit `95e500b`

### Method attempted

1. Image `org.opencontainers.image.revision` = `737d9327955a114a90609a450cc0b5fbbc24eb65`.
2. `git merge-base --is-ancestor 95e500b 737d932` → exit 1 (**95e500b is NOT an ancestor of the labelled revision**).
3. `git show 737d932:packages/shared-platform/src/cpsat/tiers.ts` preference loop is the **buggy** satisfied-sum form.
4. Final image has **no** `/app/vendor` (bundled only). Extracted polarity from `/app/dist/supervisor.js`:

```
17823:    if (a.table !== pref.table) preference += pref.weight;
```

This matches the **fixed** polarity of `95e500b`, not the committed `737d932` tree.

### Conclusion (plain)

**Provenance against a committed tree containing `95e500b` is NOT established.**

- The digest’s OCI revision label points at `737d932`, which predates `95e500b` and still has the buggy `tiers.ts` in git.
- The bundled supervisor contains the fixed polarity, consistent with a **dirty working-tree** platform context at build time — not with `git show 737d932:…/tiers.ts`.
- CAP1000/CAP2000 pass results are **not** used here as proof of committed provenance.

**Step 2 status:** COMPLETE — provenance **cannot** be proven → Step 3 rebuild required.

---

## STEP 3 — Rebuild from clean committed main

### `8c8d922` worker relevance

`git show 8c8d922 --stat` (attached: `worker-identity-artifacts/COMMIT_8c8d922_STAT.txt`):

```
docs(cpsat): CAP2000 evidence hygiene — real event UUID and A2 disclosure
 apps/event-os/scripts/m6e-cap2000-worker-qualify.ts              | 4 ++--
 .../milestone-6de/CAP2000_AUTHORISED_QUALIFICATION.md            | 9 ++++++++-
 .../eos-s06-cpsat-production/milestone-6de/CAP2000_REPORT.json   | 2 +-
 .../milestone-6de/CAP2000_TELEMETRY.jsonl                        | 2 +-
```

**Does not touch worker-vendored platform code.** Rebuild still pins `SOURCE_SHA=8c8d922…` because that is clean `main` HEAD containing `95e500b`.

### Platform context = committed tree

```
git archive HEAD:packages/shared-platform  →  /tmp/m6de-platform-clean
diff -rq /tmp/m6de-platform-clean <(git archive HEAD:packages/shared-platform | tar -x) → empty
sha256(tiers.ts) = 243ffde2bbe963f88e3cf19da4b6443878a006815f3a26fbc5f3413749a83914
  equals git show 95e500b:packages/shared-platform/src/cpsat/tiers.ts
git merge-base --is-ancestor 95e500b 8c8d922 → YES
```

Attached: `worker-identity-artifacts/PLATFORM_CLEAN_PROOF.txt`, `PROVENANCE_ANCESTOR.txt`.

### Build / push (raw)

Full build log: `worker-identity-artifacts/DOCKER_BUILD.log`  
Push log excerpt (tail):

```
m6e-worker-8c8d922: digest: sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f size: 856
```

Full push log: `worker-identity-artifacts/DOCKER_PUSH.log`  
Digest file: `worker-identity-artifacts/NEW_DIGEST.txt`

Build export lines:

```
#36 exporting manifest list sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f done
#36 naming to docker.io/library/event-os-solver-worker:m6e-worker-8c8d922 done
#36 naming to ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-worker-8c8d922 done
```

Platform COPY in build (vendors committed tree into bundle):

```
#23 COPY --from=platform package.json /bundle/vendor/shared-platform/package.json
#24 COPY --from=platform src /bundle/vendor/shared-platform/src
```

### Old vs new identity

| | Old (live before rebuild) | New (rebuild — frozen candidate) |
|---|---|---|
| Tag | `m6e-a2fix-737d932` | `m6e-worker-8c8d922` |
| Digest | `sha256:8d959a9e121437cb8c252f4ed31707de5cefe04938fe75f9e789d84ccb6b10ec` | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| OCI revision label | `737d9327955a114a90609a450cc0b5fbbc24eb65` | `8c8d92241a550348f3ba44192cb07f655ffe6d5d` |
| Railway deployment | `72d5bf0b-293f-4917-b96c-3835ec14ea69` (now REMOVED) | `57b5c9fb-4538-44ef-ad90-7d731a7db948` (SUCCESS) |

### New image labels (raw)

```json
{"md.solver.dependency":"ortools-9.15.6755","md.solver.ingress":"none","md.solver.model":"cpsat-model-v1","org.opencontainers.image.revision":"8c8d92241a550348f3ba44192cb07f655ffe6d5d","org.opencontainers.image.source":"https://github.com/kglaw-Oluseyi/atelier-doclar"}
```

Attached: `worker-identity-artifacts/NEW_IMAGE_LABELS.json`, `NEW_REPO_DIGEST.txt`.

### A2 polarity in new image (raw extract)

```
17823:    if (a.table !== pref.table) preference += pref.weight;
```

Attached: `worker-identity-artifacts/NEW_IMAGE_A2_POLARITY.txt`.

### Post-rebuild Railway (raw)

`worker-identity-artifacts/RAILWAY_STATUS_POST_REBUILD.txt`:

```
Project:         atelier-doclar
Project ID:      c1c937b7-2660-4fc2-8257-c08bd6346658
Environment:     production
Environment ID:  6d70f804-d3c7-4255-88c3-cc86531251ef

solver-worker
    status:        ● Online
    image:         ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-worker-8c8d922
    deployment ID: 57b5c9fb-4538-44ef-ad90-7d731a7db948
    service ID:    32f09234-9295-4a6c-8b8d-952d61d08706
```

`worker-identity-artifacts/RAILWAY_WORKER_VARS.txt`:

```
CPSAT_IMAGE_DIGEST=sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f
CPSAT_IMAGE_IDENTITY=event-os-solver-worker:m6e-worker-8c8d922
SOURCE_SHA=8c8d92241a550348f3ba44192cb07f655ffe6d5d
```

**Step 3 status:** COMPLETE — frozen candidate digest  
`sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`  
proven from committed tree containing `95e500b` (via `git archive` of `8c8d922` / HEAD + OCI revision label).

---

## STEP 4 — Vulnerability scan (this digest only)

Convention: Milestone 5B/5C used **Aqua Security Trivy v0.74.0** with HIGH/CRITICAL + secret scanners; same tool used here. Prior scans of other digests do **not** apply.

### Scanner identity

```
Version: 0.74.0
Vulnerability DB:
  Version: 2
  UpdatedAt: 2026-09-17 07:06:17.880292764 +0000 UTC
  NextUpdate: 2026-09-18 07:06:17.880292303 +0000 UTC
  DownloadedAt: 2026-09-17 11:23:01.024498 +0000 UTC
```

Attached: `worker-identity-artifacts/TRIVY_VERSION.txt`, `TRIVY_CONSOLE.log`.

### Target

| Field | Value |
|---|---|
| Image | `ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-worker-8c8d922` |
| Digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| Scanned at | `2026-09-17T21:35:25.302723Z` (counts) / Trivy CreatedAt `2026-09-17T22:35:20.816685+01:00` |

### Counts (`worker-scan/ANALYSIS_COUNTS.json`)

```json
{
  "image": "ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker:m6e-worker-8c8d922",
  "digest": "sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f",
  "scanner": "Aqua Security Trivy v0.74.0",
  "scannedAt": "2026-09-17T21:35:25.302723Z",
  "high": 44,
  "critical": 0,
  "secrets": 0
}
```

### Disposition for THIS digest

- **CRITICAL:** 0  
- **Secrets:** 0  
- **HIGH fixable:** 0  
- **HIGH unfixed:** 44 package rows / **8 unique CVEs** (Debian base; no `FixedVersion`)  

Enumeration: `worker-scan/HIGH_UNFIXED_ENUMERATION.json`  
Full JSON: `worker-scan/TRIVY_HIGH_CRITICAL.json`, `worker-scan/TRIVY_SECRET.json`

Same class of unfixed Debian HIGH findings as Milestone 5C Trixie baseline (8 CVEs / 44 rows) — **explicit CTO-review waiver for unfixed HIGH on digest `sha256:276c6858…` only**; not a carry-forward of a prior digest’s scan.

**Step 4 status:** COMPLETE — scan attached for frozen digest; CRITICAL=0 / secrets=0 / fixable HIGH=0; unfixed HIGH enumerated for CTO review.

---

## STEP 5 — CAP600 rerun against frozen digest

Harness: `apps/event-os/scripts/m6e-cap600-worker-qualify.ts --confirm-synthetic-qualification`  
Env: `CPSAT_IMAGE_DIGEST=sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`  
Corpus: `eos-s06-cap-B-typical-600-v1` / hash `08309644e65bd3f4f927461ac92b09692a5f766a344da5402011452b9692f160`

### Honest disclosure — first attempt was REPLAY (inadmissible)

At `2026-09-17T21:36:40Z` the harness returned:

```
enqueued run=a3d00c6c-27ac-43e4-847b-83e696177ba4 application=REPLAYED
```

That run was originally sealed `2026-09-17T18:56:55Z` on worker identity `event-os-solver-worker:m6b-9746b17` (pre-A2-fix). Report falsely attributed current digest while `application=REPLAYED`.  
Raw log: `worker-identity-artifacts/CAP600_REPLAY_FALSE_ATTRIBUTION.log`

### Idempotency release (raw)

```
UPDATE cpsat_solver_runs
SET idempotency_key = idempotency_key || '-superseded-for-worker-identity-rerun-' || id
WHERE id='a3d00c6c-27ac-43e4-847b-83e696177ba4' AND status='READY_FOR_REVIEW'
RETURNING id, left(idempotency_key,90);

 a3d00c6c-… | 9ccc87657ba9eb43c766d85a48229f5d87801b800a58bb97817def56e4cc4ec1-superseded-for-worker-ide
```

### Fresh APPLIED solve (admissible)

Raw log: `worker-identity-artifacts/CAP600_FRESH_RUN.log`

```
[M6E-CAP600] preflight OK worker=worker:6515380f7ebc:1ec6b6ae image=event-os-solver-worker:m6e-worker-8c8d922
[M6E-CAP600] frozen package=0a9fcbeb-… application=REPLAYED   ← freeze package replay only
[M6E-CAP600] enqueued run=9ff7594d-8957-4b36-80d0-1502e804f1c4 application=APPLIED
[M6E-CAP600] poll status=READY_FOR_REVIEW phase=sealed product=OPTIMAL
```

Canonical report: `CAP600_REPORT.json`

| Field | Value |
|---|---|
| Disposition | **PASS** |
| runId | `9ff7594d-8957-4b36-80d0-1502e804f1c4` |
| Worker digest | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| imageIdentity | `event-os-solver-worker:m6e-worker-8c8d922` |
| productResult | `OPTIMAL` |
| evidenceGrade | `OPTIMAL_PROOF` |
| Seated | 600/600 (unique guests/positions) |
| Enqueue application | **APPLIED** (not REPLAYED) |
| Freeze application | REPLAYED (package freeze only; disclosed) |
| attemptCount / childInvocationCount | 1 / 1 |
| Solve wall (DB sealed−started) | ≈2617 ms |
| Containment | lease cleared, queue empty, not adopted, baseline `92909476-…` unchanged |
| at | `2026-09-17T21:38:45.873Z` |

DB CSV (both runs): `worker-identity-artifacts/CAP600_RUNS_DB.csv`

```
9ff7594d-…,READY_FOR_REVIEW,OPTIMAL,OPTIMAL_PROOF,1,1,<fresh idem key>,t,2026-09-17 21:38:36.623+00,2026-09-17 21:38:39.654404+00,2026-09-17 21:38:42.271274+00
a3d00c6c-…,…,…,…,…,…,<…-superseded-for-worker-ide>,t,2026-09-17 18:56:47.372+00,… (original m6b solve; superseded)
```

Telemetry: `CAP600_TELEMETRY.jsonl` (includes release note + fresh poll lines).

**Step 5 status:** COMPLETE — CAP600 **PASS** on frozen digest via fresh APPLIED run `9ff7594d-…`. Prior REPLAY of `a3d00c6c-…` disclosed and rejected as attribution.

---

## STEP 6 — CAP1000 / CAP2000 rerun decision

| Prior run | Commit | Recorded worker tag | Recorded digest |
|---|---|---|---|
| CAP1000 | `149ea74` | `event-os-solver-worker:m6e-a2fix-737d932` | **none** (tag only; live digest at that time was `sha256:8d959a9e…`) |
| CAP2000 | `f673774` / `8c8d922` | `event-os-solver-worker:m6e-a2fix-737d932` | **none** (same) |

Frozen digest now is **`sha256:276c6858…`** — different image identity from the CAP1000/CAP2000 runs.

### Why no rerun (Step 6 “same source” clause)

Step 2/3 could not tie those runs to digest `276c6858…` by digest equality. Rerun is **not** required because Step 3 rebuild used the **same committed A2-fixed source** those runs already exercised in the worker bundle:

1. Rebuild platform context = `git archive` of `8c8d922` (= HEAD), which **contains** `95e500b` (`merge-base --is-ancestor` YES).
2. `tiers.ts` sha256 in that archive equals `git show 95e500b:…/tiers.ts`.
3. Step 2 already extracted the **same fixed polarity** from the prior image’s `/app/dist/supervisor.js` (`if (a.table !== pref.table) preference += pref.weight`) — i.e. CAP1000/CAP2000 already ran against an image that contained the A2 fix in the bundle (even though OCI revision falsely said `737d932`).
4. CAP1000 (`149ea74`) exercised A2 under load (24 preferences, OPTIMAL_PROOF).
5. CAP2000 has **zero preferences** (scale/containment only; does not re-prove A2).

**Explicit non-claim:** This file does **not** assert that CAP1000/CAP2000 ran on digest `sha256:276c6858…`. It asserts Step 6’s same-source exception applies, so those scales are not re-executed by default.

**Step 6 status:** COMPLETE — **no CAP1000/CAP2000 rerun**.

---

## STEP 7 — Summary table

| Railway deployment ID | Image digest | Provenance method | Scan result / waiver | CAP600 result | CAP1000/CAP2000 rerun? |
|---|---|---|---|---|---|
| `57b5c9fb-4538-44ef-ad90-7d731a7db948` (current SUCCESS) | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` | Step 2 failed (OCI rev `737d932` predates `95e500b`; dirty-tree bundle). Step 3 rebuild from `git archive HEAD:packages/shared-platform` @ `8c8d922` (contains `95e500b`); OCI rev label = `8c8d922…`; polarity extract matches fix. | Trivy 0.74.0 on **this** digest: CRITICAL=0, secrets=0, fixable HIGH=0, unfixed HIGH=44 rows / 8 CVEs — CTO-review waiver (M5C-class Debian base), see `worker-scan/` | **PASS** run `9ff7594d-8957-4b36-80d0-1502e804f1c4` APPLIED; OPTIMAL / OPTIMAL_PROOF; 600/600; digest pinned. Prior REPLAY of `a3d00c6c-…` disclosed & superseded. | **No** — rebuild used committed tree containing `95e500b` (same A2-fixed source already in prior CAP1000/CAP2000 worker bundle); CAP1000 already exercised A2; CAP2000 is zero-pref. Digests differ; that non-identity is disclosed, not papered over. |

### Pre-rebuild reference (superseded for qualification)

| Railway deployment ID | Image digest | Notes |
|---|---|---|
| `72d5bf0b-293f-4917-b96c-3835ec14ea69` (REMOVED) | `sha256:8d959a9e121437cb8c252f4ed31707de5cefe04938fe75f9e789d84ccb6b10ec` | Tag `m6e-a2fix-737d932`; committed provenance **not** established (Step 2). |

---

## Attached artifacts (this commit)

```
milestone-6de/
  WORKER_IDENTITY_AND_CAP600_RERUN.md          ← this file
  CAP600_REPORT.json                           ← fresh APPLIED PASS on frozen digest
  CAP600_TELEMETRY.jsonl
  worker-scan/
    ANALYSIS_COUNTS.json
    TRIVY_HIGH_CRITICAL.json
    TRIVY_SECRET.json
    HIGH_UNFIXED_ENUMERATION.json
  worker-identity-artifacts/
    DOCKER_BUILD.log
    DOCKER_PUSH.log
    NEW_DIGEST.txt
    NEW_IMAGE_LABELS.json
    NEW_REPO_DIGEST.txt
    NEW_IMAGE_A2_POLARITY.txt
    PLATFORM_CLEAN_PROOF.txt
    PROVENANCE_ANCESTOR.txt
    COMMIT_8c8d922_STAT.txt
    RAILWAY_STATUS_POST_REBUILD.txt
    RAILWAY_WORKER_VARS.txt
    TRIVY_VERSION.txt
    TRIVY_CONSOLE.log
    CAP600_REPLAY_FALSE_ATTRIBUTION.log
    CAP600_FRESH_RUN.log
    CAP600_RUNS_DB.csv
```
