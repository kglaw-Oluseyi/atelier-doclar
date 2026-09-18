# CTO security disposition — production worker digest 276c6858

## 1. Disposition
`CTO DECISION: ACCEPT WITH EXPIRY AND RECORDED CONDITION`

## 2. Image identity
- Tag: `event-os-solver-worker:m6e-worker-8c8d922`
- Digest: `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`
- Live deployment: `57b5c9fb-4538-44ef-ad90-7d731a7db948`, service `32f09234-9295-4a6c-8b8d-952d61d08706` (`event-os-solver-worker`), Railway project `atelier-doclar`

This is the digest genuinely frozen and running in production today. It was never covered by milestone-5c's acceptance, which was written against a different, earlier candidate digest (`sha256:a41f519…92`, tag `candidate-bbec476`) that is not the deployed image.

## 3. Scan identity and database freshness
- Scanner: Aqua Security Trivy **0.74.0** (checksum verified: `1caada5e0e2091909357c7525d3aa76f4b660b13821bc143b190c7483e31cc11`)
- Vulnerability DB: Version 2; UpdatedAt `2026-09-17T07:06:17.880292764Z`; DownloadedAt `2026-09-17T11:23:01.024498Z`
- Vuln scan UTC: `2026-09-18T04:45:22Z`
- Secret scan: 0 findings

## 4. Scan counts
- CRITICAL: 0
- HIGH total findings (package rows): 44
- HIGH fixable: 0
- HIGH unfixed unique CVEs: 8
- Secrets: 0

Identical profile to the previously-accepted candidate — same 8 unique unfixed HIGH CVEs, same 0 CRITICAL, same 0 secrets.

## 5. Per-CVE disposition
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

Full table: `security-closure/09_CVE_REACHABILITY.md`. None of the eight is reachable from the production supervisor → Python solver child path; none is `REACHABLE — REJECT`.

## 6. Runtime identity — code integrity confirmed
`supervisor.js`, `solver_child.py`, and the Node binary hash-match exactly between the scanned digest and the live container. There is no code drift between what was scanned and what is executing. Compensating controls confirmed on live PID 1: non-root UID/GID 10001, CapEff=0, no listening application ports, entrypoint `node dist/supervisor.js` only, single fixed-argv `spawn(python3, [solver_child.py])`, `shell: true` absent, clean child env without database credentials, git/curl/wget/compilers absent.

## 7. Recorded condition — toolchain-absence compensating control does not hold on the live container

This is a genuine finding, not a formality, and it is why this disposition is not a plain ACCEPT:

- The Dockerfile installs then explicitly removes npm/npx/corepack via OCI whiteout layers. A `docker run` of the digest, and Trivy's scan of it, correctly show them **absent** — the composed image is as designed.
- The **live Railway container** for this deployment shows npm/npx/corepack **present and executable** for the `solver` UID, despite no code drift, no volume mount, and no Nixpacks involvement. The best-supported explanation from direct evidence is that Railway's live overlay is not honoring the image's own whiteout layers — file mtimes match the original Node distribution, birth time matches deploy time, and the same anomaly is inferred (not yet directly observed) to apply to the already-accepted candidate digest as well, meaning this is most likely a pre-existing platform characteristic that milestone-5c's image-only check never surfaced, not a new defect introduced by this build.
- This does **not** put npm/npx on the production code path: the supervisor's only spawn is the fixed-argv Python child, contains no reference to npm/npx/corepack, and `shell: true` is absent. None of the 8 accepted CVEs becomes reachable because of this. The finding narrows to exactly one thing — if arbitrary command execution were ever achieved through some other, currently unknown route, the attacker would find a working npm/npx/corepack on PATH rather than the empty toolchain the design intends. That is a secondary, not-currently-reachable exposure, not a live vulnerability.

**Condition attached to this acceptance:** a Railway platform support ticket must be opened asking whether OCI whiteout layers are honored by their runtime overlay, referencing this evidence pack. This is a platform question, not something fixable in this repository's Dockerfile. Until Railway responds, the toolchain-absence compensating control is downgraded from "confirmed absent" to "absent in the image, unconfirmed live" for every service on this platform that relies on the same removal pattern — not just this worker.

## 8. No ignore / suppress / downgrade
No CVE was ignored, suppressed, severity-downgraded, or removed from scanner output. No vulnerability ignore file was added. Raw Trivy outputs under `security-scan-276c6858/scan/` were not modified.

## 9. Expiry
`2026-10-18T23:59:59Z` (30 days from this disposition)

## 10. Mandatory rescan triggers
- before any further deployment
- immediately before signing/publishing
- any base-image digest change
- any Python, Node, OR-Tools, or OS-package change
- any new Trivy database showing a CRITICAL or fixable HIGH
- Railway's response to the whiteout support ticket, whichever direction it points
- no later than 17 October 2026

## 11. Scope of this disposition
This is **security acceptance only** and is **not** deployment authorisation. It does not authorise any push, deploy, migration, signing, publishing, or further production access beyond what is already running. It does not resolve item 7's platform question — it records it as an accepted, bounded, non-reachable condition pending Railway's answer.

---

Digest `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`, as currently frozen and running in production (`event-os-solver-worker`, deployment `57b5c9fb-4538-44ef-ad90-7d731a7db948`), is **accepted by the acting CTO** on the terms above until `2026-10-18T23:59:59Z`, subject to the mandatory rescan triggers and the Railway platform ticket in Section 7. This is not authority to push, deploy, migrate, sign, publish, or access production beyond the current frozen state.

## Closure metadata
- Closure executed (UTC): 2026-09-18T05:15:00Z
- Decision authority: acting CTO, Maison Doclar Event OS seating programme (delegated per GOV-014 handover)
- Evidence basis: `security-scan-276c6858/` (commit `77b151b`) and `ADDENDUM_NPM_DIVERGENCE.md` (commit `bbd2031`), both independently re-verified against raw Trivy/layer/runtime JSON before this disposition was written
- Image rebuilt during this disposition: no
- Code/Dockerfile/dependency changes during this disposition: no
