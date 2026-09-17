# Milestone 5B — Worker candidate vulnerability scan (Trivy v0.74.0)

## Disposition

**BLOCKED — CRITICAL VULNERABILITY**

Do not deploy. AI CTO review required for unfixed Debian CRITICAL findings on the remediating candidate.

## Scanned identities

### Initial (M5A frozen candidate — superseded)

| Field | Value |
|---|---|
| Tag | `event-os-solver-worker:candidate-4caaa44` |
| Digest | `sha256:8ce066bcf1987f648b2263f069062ec37e0538ad7f7d2adc3f8968a91a73ff16` |
| Source | `4caaa44eb0be2c2eeb7a7d63ccb23bcedbcc0df3` |
| Scan UTC | 2026-09-17T10:30:35Z |

### Final after remediation (current local candidate — not deployable)

| Field | Value |
|---|---|
| Tag | `event-os-solver-worker:candidate-c66df97` |
| Digest | `sha256:49bddd285f8868aa9ef1f9d5b5087c5191564db2dc8bb9e0952a2f28ae5d4a52` |
| Source | `c66df97629b471c6209d327aed8ffd8057134bc7` |
| Rescan UTC | 2026-09-17T10:35:56Z – 2026-09-17T10:36:05Z |

## Scanner provenance

- Aqua Security Trivy **v0.74.0**
- Host: Darwin arm64
- Official release archive: `trivy_0.74.0_macOS-ARM64.tar.gz`
- Expected SHA-256: `1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11`
- Observed SHA-256: match (verified against `trivy_0.74.0_checksums.txt`)
- Installed only under `/tmp/m5b-trivy-0.74.0` (deleted after evidence capture)
- Details: `TRIVY_SCANNER_PROVENANCE.json`

## Vulnerability database

| Field | Value |
|---|---|
| Source | `mirror.gcr.io/aquasec/trivy-db:2` |
| DB Version | 2 |
| UpdatedAt | 2026-09-17T07:06:17Z |
| NextUpdate | 2026-09-18T07:06:17Z |
| DownloadedAt | 2026-09-17T10:30:14Z |
| Freshness | within supported window |

## Finding counts

### Initial (`candidate-4caaa44`)

| Severity | Count |
|---|---|
| CRITICAL | 6 |
| HIGH | 77 |
| MEDIUM | 114 |
| LOW | 104 |
| UNKNOWN | 1 |

By ecosystem (initial): OS/debian dominant; Node (npm toolchain) CRITICAL/HIGH present; Python MEDIUM/LOW only.

Fixed vs unfixed (initial HIGH/CRITICAL): CRITICAL fixed 1 / unfixed 5; HIGH fixed 22 / unfixed 55.

### Final (`candidate-c66df97`)

| Severity | Count |
|---|---|
| CRITICAL | 5 |
| HIGH | 55 |
| MEDIUM | 105 |
| LOW | 101 |
| UNKNOWN | 1 |

By ecosystem (final): OS/debian only for CRITICAL/HIGH; Node language packages eliminated; Python MEDIUM/LOW only.

Fixed vs unfixed (final HIGH/CRITICAL): CRITICAL fixed 0 / unfixed 5; HIGH fixed 0 / unfixed 55.

## Critical findings (final)

All unfixed in Debian bookworm at scan time:

1. **CVE-2025-7458** — `libsqlite3-0` 3.40.1-2+deb12u2 — SQLite integer overflow — status `affected`
2. **CVE-2026-13221** — `perl-base` 5.36.0-7+deb12u3 — incorrect regex processing — status `affected`
3. **CVE-2026-42496** — `perl-base` — Archive::Tar symlink path traversal — status `fix_deferred` (**archive extraction**)
4. **CVE-2026-8376** — `perl-base` — heap buffer overflow compiling regex (32-bit builds noted) — status `affected`
5. **CVE-2023-45853** — `zlib1g` 1:1.2.13.dfsg-1 — MiniZip integer/heap overflow — status `will_not_fix`

## High findings

- **Initial fixable HIGH:** 22 (npm toolchain + `libpcre2-8-0`) — remediated
- **Final fixable HIGH:** 0
- **Final unfixed HIGH:** 55 (Debian packages; no FixedVersion) — AI CTO review, not automatic sole failure once CRITICAL is addressed

## Secret scan

- Initial: **0** findings
- Final: **0** findings
- Reports: `TRIVY_SECRET_FULL.json`, `TRIVY_SECRET_TABLE.txt` (+ `remediated/`)

## Remediation performed (2 cycles)

1. `2b6af15` / `c66df97` — remove `npm`/`npx`/`corepack` from final runtime after `pg` install (eliminated node-tar CRITICAL and npm transitive HIGH/CRITICAL).
2. Upgrade `libpcre2-8-0` → `10.42-1+deb12u1` (eliminated 3 fixable HIGH arbitrary-code-execution findings).

Not changed: OR-Tools, Python major, Node major, model/contract.

## Acceptance-policy result

| Rule | Result |
|---|---|
| Any CRITICAL | **FAIL** (5 unfixed remain) |
| HIGH with available fix | **PASS** after remediation (0 remain) |
| Embedded secret | **PASS** (0) |
| HIGH unfixed | **CTO review** (55) |
| Unexpected build/dev content | npm removed from final image |

**Deployment decision:** DO NOT DEPLOY. Supersede `candidate-4caaa44`. Hold `candidate-c66df97` pending CTO decision on unfixed Debian CRITICAL (likely base-image strategy).

## Evidence files

- `TRIVY_SCAN_SUMMARY.md` (this file)
- `TRIVY_SCANNER_PROVENANCE.json`
- `TRIVY_DB_IDENTITY.json` / `TRIVY_DB_METADATA.json`
- `IMAGE_IDENTITIES.json`
- `ACCEPTANCE_POLICY_RESULT.json`
- Initial: `TRIVY_VULN_FULL.json`, `TRIVY_HIGH_CRITICAL.*`, `TRIVY_SECRET_*`, `ANALYSIS_COUNTS.json`
- Remediated: `remediated/*`
