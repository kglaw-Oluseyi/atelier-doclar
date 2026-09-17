# Milestone 5C — Debian Trixie base migration and vulnerability clearance

## Disposition

**MILESTONE 5C PASS — UNFIXED HIGH ENUMERATED FOR CTO REVIEW**

Acceptance gates:

| Gate | Result |
|---|---|
| CRITICAL = 0 | **PASS** |
| Fixable HIGH = 0 | **PASS** |
| Secrets = 0 | **PASS** |
| Unfixed HIGH enumerated for CTO | **PASS** (8 unique CVEs / 44 package rows) |
| No ignore/suppression/output alteration | **PASS** |
| Image revision = implementation commit | **PASS** |
| Immutable tag (not `latest`) | **PASS** |

## Identities

| Item | Value |
|---|---|
| Implementation commit | `bbec476f0ca9959d7145853fc45461d10879fc01` |
| Product commits | `fd99eea` (Trixie base), `79bda9d` (apt cache), `bbec476` (security upgrades) |
| Image tag | `event-os-solver-worker:candidate-bbec476` |
| Image digest | `sha256:a41f51937a653ed4653bbc687addb3a8f2603799accfec8c0dac0f09aef86e92` |
| Base image | `python:3.12.14-slim-trixie@sha256:2fe5997d249a808b8eeea52c58a1dbffbba28754dc11699ef5c029f2d818ce79` (linux/amd64) |
| Previous Bookworm candidate (superseded) | `candidate-c66df97` @ `sha256:49bddd28…` |

Unchanged: Python **3.12.14**, Node **20.19.0**, OR-Tools **9.15.6755**, queue contracts, application code, security policy gates.

## Image hardening retained

- Non-root `solver` uid/gid **10001**
- Entrypoint `node dist/supervisor.js`
- Production `solver_child.py` present
- No EXPOSE / no ingress
- No npm/npx/git/curl/wget/gcc
- No test fixtures / test-only / `CPSAT_ALLOW_TEST_HOOKS`

## Tests and journey

- M5/M5A architectural + packaging tests: **18/18 pass**
- Final hardened journey on `candidate-bbec476`: run `f0246b70-3d8e-47dd-a538-9883676a9bea` → `READY_FOR_REVIEW` / `OPTIMAL` / sealed / `childInvocations:1` / drain on stop

## Scanner

- Trivy **v0.74.0** (official checksum verified)
- DB: `mirror.gcr.io/aquasec/trivy-db:2` (fresh at scan time)
- Final scan UTC: 2026-09-17T10:53:30Z – 10:53:39Z
- OS detected: Debian **13.6** (trixie)

## Final finding counts

| Severity | Count | Notes |
|---|---|---|
| CRITICAL | **0** | Bookworm SQLite/Perl/zlib criticals cleared |
| HIGH (fixable) | **0** | perl/gzip/sqlite upgrades applied |
| HIGH (unfixed) | 44 rows / **8 CVEs** | enumerated for CTO |
| MEDIUM | 56 | recorded, not blocking |
| LOW | 58 | recorded, not blocking |
| Secrets | **0** | |

## Unfixed HIGH (CTO review)

See `scan-final/HIGH_UNFIXED_BY_CVE.json` and `HIGH_UNFIXED_FOR_CTO.json`.

Unique CVEs:

1. CVE-2026-76642 / CVE-2026-78408 / CVE-2026-78409 / CVE-2026-78410 — util-linux mount/nsenter family (`affected`)
2. CVE-2026-54369 — libacl symlink traversal (`affected`)
3. CVE-2025-69720 — ncurses buffer overflow (`affected`)
4. CVE-2026-16742 — systemd-homed (`affected`)
5. CVE-2026-9538 — perl Archive::Tar DoS (`fix_deferred`)

Compensating controls (all): non-root 10001; no ingress; no npm/toolchain; clean child env; socket guard; no privileged capabilities claimed. These packages are base OS present but outside the supervisor/solver request path.

## Inventory comparison

`inventory/INVENTORY_COMPARISON.md` — Bookworm `candidate-c66df97` → Trixie `candidate-bbec476`:

- dpkg added 14 / removed 29 / version-changed 76
- Python packages: **identical** including `ortools==9.15.6755`

## Claims not made

No push, deploy, Railway access, migrations, signing/publishing, formal qualification, CAP1000 changes, or S06B/S06D/S07 work.
