# CTO security acceptance

## 1. Disposition
`CTO DECISION: ACCEPT WITH EXPIRY`

## 2. Candidate identity
- Tag: `event-os-solver-worker:candidate-bbec476`
- Digest: `sha256:a41f51937a653ed4653bbc687addb3a8f2603799accfec8c0dac0f09aef86e92`
- Source revision: `bbec476f0ca9959d7145853fc45461d10879fc01`

## 3. Exact base digest
`python:3.12.14-slim-trixie@sha256:2fe5997d249a808b8eeea52c58a1dbffbba28754dc11699ef5c029f2d818ce79`

## 4. Scan identity and database freshness
- Scanner: Aqua Security Trivy **0.74.0** (checksum verified: `1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11`)
- Vulnerability DB: Version 2; UpdatedAt `2026-09-17T07:06:17.880292764Z`; DownloadedAt `2026-09-17T10:50:13.089524Z`
- Final scan UTC: `2026-09-17T10:53:30Z`
- Secret scan: 0 findings (`TRIVY_SECRET_FULL.json`)

## 5. Original scan counts
- CRITICAL: 0
- HIGH total findings (package rows): 44
- HIGH fixable: 0
- HIGH unfixed unique CVEs: 8
- Secrets: 0
- Gates recorded in `ANALYSIS_COUNTS.json`: criticalZero=True, fixableHighZero=True, secretsZero=True

## 6. Per-CVE dispositions
| CVE | Disposition |
|---|---|
| CVE-2026-76642 | ACCEPTED — UNREACHABLE |
| CVE-2026-78408 | ACCEPTED — UNREACHABLE |
| CVE-2026-78409 | ACCEPTED — UNREACHABLE |
| CVE-2026-78410 | ACCEPTED — UNREACHABLE |
| CVE-2026-54369 | ACCEPTED — UNREACHABLE |
| CVE-2025-69720 | ACCEPTED — UNREACHABLE |
| CVE-2026-16742 | ACCEPTED — NOT PRESENT |
| CVE-2026-9538 | ACCEPTED — UNREACHABLE |

Full table: `09_CTO_CVE_DISPOSITION.md`.

## 7. Runtime reachability conclusion
Process contract PASS. None of the eight unfixed HIGH CVEs is runtime-reachable from the production supervisor → Python solver child path. No finding classified `REACHABLE — REJECT` or `REJECTED — INSUFFICIENT EVIDENCE`.

## 8. Compensating controls
- Non-root UID/GID 10001
- CapEff = 0
- No published/listening ports (no application ingress)
- Entrypoint `node dist/supervisor.js` only
- Single argv spawn of fixed `/usr/local/bin/python3` + `/app/python/solver_child.py`
- `shell: true` absent
- Clean child env without database credentials
- npm/npx/git/curl/wget/compiler/test fixtures/test hooks absent from runtime image

## 9. Expiry
`2026-10-17T23:59:59Z`

## 10. Mandatory rescan triggers
- before deployment
- immediately before signing/publishing
- any base-image digest change
- any Python, Node, OR-Tools or OS-package change
- any new Trivy database showing a CRITICAL or fixable HIGH
- no later than 17 October 2026

## 11. No ignore / suppress / downgrade
No CVE was ignored, suppressed, severity-downgraded, or removed from scanner output. No vulnerability ignore file was added. Existing Trivy outputs under `scan-final/` were not modified.

## 12. Scope of this acceptance
This is **security acceptance only** and is **not** deployment authorisation. It is not authority to push, deploy, migrate, sign, publish, or access production.

---

Candidate `event-os-solver-worker:candidate-bbec476` at digest `sha256:a41f51937a653ed4653bbc687addb3a8f2603799accfec8c0dac0f09aef86e92` is accepted by the AI CTO for controlled deployment preparation until `2026-10-17T23:59:59Z`, subject to mandatory pre-deployment rescan and all remaining deployment gates. This acceptance is not authority to push, deploy, migrate, sign, publish or access production.

## Closure metadata
- Closure executed (UTC): 2026-09-17T11:11:41Z
- Decision rule applied: Section 12 Accept with expiry (all predicates true)
- Image rebuilt during closure: no
- Code/Dockerfile/dependency changes during closure: no
