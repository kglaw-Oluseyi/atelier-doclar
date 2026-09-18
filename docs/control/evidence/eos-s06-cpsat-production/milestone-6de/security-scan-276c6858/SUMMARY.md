# Security scan evidence — digest sha256:276c6858…788f

**Purpose:** Scan data and runtime verification for the image currently frozen in production.  
**Not included:** CTO disposition, expiry, ACCEPT/REJECT — reserved for human/CTO review.

## Identity

| Field | Value |
|---|---|
| Digest scanned | `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f` |
| Tag | `event-os-solver-worker:m6e-worker-8c8d922` |
| GHCR ref | `ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker@sha256:276c6858…788f` |
| Railway service | `solver-worker` / `32f09234-9295-4a6c-8b8d-952d61d08706` |
| Deployment | `57b5c9fb-4538-44ef-ad90-7d731a7db948` |
| `CPSAT_IMAGE_DIGEST` (Railway env) | matches scanned digest exactly |
| Pull/reference method | Local Docker image already present; `docker image inspect … --format '{{.Id}}'` **equals** target digest. **No rebuild. No redeploy.** |
| Prior milestone-5c accepted digest (different) | `sha256:a41f51937a653ed4653bbc687addb3a8f2603799accfec8c0dac0f09aef86e92` |

Artifacts: [`IMAGE_IDENTITY.json`](./IMAGE_IDENTITY.json), [`scan/DOCKER_IMAGE_INSPECT.json`](./scan/DOCKER_IMAGE_INSPECT.json).

## Scanner

| Field | Value |
|---|---|
| Trivy | **0.74.0** |
| Archive SHA-256 | `1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11` (checksum verified) |
| Vuln DB | Version **2**; UpdatedAt `2026-09-17T07:06:17.880292764Z`; DownloadedAt `2026-09-17T11:23:01.024498Z` |
| Vuln scan UTC | `2026-09-18T04:45:22Z` |
| Secret findings | **0** |

Artifacts: [`TRIVY_SCANNER_PROVENANCE.json`](./TRIVY_SCANNER_PROVENANCE.json), [`scan/TRIVY_VULN_FULL.json`](./scan/TRIVY_VULN_FULL.json), [`scan/TRIVY_SECRET_FULL.json`](./scan/TRIVY_SECRET_FULL.json).

## Counts

| Metric | Value |
|---|---:|
| CRITICAL | **0** |
| HIGH total findings (package rows) | **44** |
| HIGH fixable | **0** |
| HIGH unfixed unique CVEs | **8** |
| Secrets | **0** |

Unique HIGH unfixed CVEs: `CVE-2026-76642`, `CVE-2026-78408`, `CVE-2026-78409`, `CVE-2026-78410`, `CVE-2026-54369`, `CVE-2025-69720`, `CVE-2026-16742`, `CVE-2026-9538`.

Artifact: [`scan/ANALYSIS_COUNTS.json`](./scan/ANALYSIS_COUNTS.json). Per-CVE reachability (labels only, no disposition): [`security-closure/09_CVE_REACHABILITY.md`](./security-closure/09_CVE_REACHABILITY.md).

## Runtime / compensating controls (verified)

See [`security-closure/03_RUNTIME_PROCESS_CONTRACT.md`](./security-closure/03_RUNTIME_PROCESS_CONTRACT.md).

| Control | Scanned digest image | Live Railway container |
|---|---|---|
| Non-root UID/GID 10001 (PID 1) | Config.User `solver` → 10001 | **Confirmed** Uid/Gid all 10001; CapEff=`0` |
| CapEff = 0 | — | **Confirmed** on `/proc/1` |
| No listening app ports | Config.ExposedPorts null | `/proc/net/tcp` empty; one ESTABLISHED tcp6 (not LISTEN) |
| Entrypoint `node dist/supervisor.js` | **Confirmed** | **Confirmed** `/proc/1/cmdline` |
| Single fixed-argv Python child spawn | **Confirmed** in bundle | Same bundle sha256 |
| `shell: true` absent | **0** matches | **0** matches |
| Clean child env (no DB creds) | `buildCleanEnv()` → PATH/HOME/LANG/PYTHONUNBUFFERED/TMPDIR only | Same bundle |
| npm/npx absent | **ABSENT** from digest image | **PRESENT** (`/usr/local/bin/npm`, `npx`, `corepack`) — divergence vs digest filesystem |
| git/curl/wget/compilers absent | **ABSENT** | **ABSENT** |
| Test fixtures absent | `selftest.py` **present**; dependency `node_modules/*/test*` present | Same |

Supervisor.js and solver_child.py content hashes match between digest image and live container. Node binary sha256 matches. Live overlay additionally contains npm/npx/corepack not present in the immutable digest layers scanned by Trivy.

## Pack layout

```
security-scan-276c6858/
  SUMMARY.md                          (this file)
  IMAGE_IDENTITY.json
  TRIVY_SCANNER_PROVENANCE.json
  scan/
    TRIVY_VULN_FULL.json
    TRIVY_HIGH_CRITICAL.json / .txt
    TRIVY_SECRET_FULL.json / TABLE / log
    TRIVY_DB_METADATA.json
    ANALYSIS_COUNTS.json
    HIGH_UNFIXED_FOR_CTO.json
    DOCKER_IMAGE_INSPECT.json
    SCAN_TIMESTAMPS.txt
  security-closure/
    02_EXACT_HIGH_FINDINGS.md
    03_RUNTIME_PROCESS_CONTRACT.md
    09_CVE_REACHABILITY.md
```
