# Exact HIGH findings — digest sha256:276c6858…788f

Source: Trivy 0.74.0 vuln scan UTC `2026-09-18T04:45:22Z` against  
`ghcr.io/kglaw-oluseyi/atelier-doclar-solver-worker@sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`.

## Summary counts
- CRITICAL: **0**
- HIGH package rows: **44**
- HIGH with FixedVersion: **0**
- HIGH unfixed unique CVE IDs: **8**
- Secrets: **0**

## Unique unfixed HIGH CVEs
1. CVE-2026-76642 — util-linux X-mount post-hooks after failed helper  
2. CVE-2026-78408 — util-linux nsenter --join-cgroup authority leak  
3. CVE-2026-78409 — util-linux X-mount.subdir symlink escape  
4. CVE-2026-78410 — util-linux restricted bind-mount source redirection  
5. CVE-2026-54369 — libacl pathname ACL symlink traversal  
6. CVE-2025-69720 — ncurses infocmp stack buffer overflow  
7. CVE-2026-16742 — systemd-homed home-record signature gap (homed **absent**)  
8. CVE-2026-9538 — perl Archive::Tar crafted header DoS (module **absent**)

Machine-readable rows: [`../scan/ANALYSIS_COUNTS.json`](../scan/ANALYSIS_COUNTS.json), [`../scan/HIGH_UNFIXED_FOR_CTO.json`](../scan/HIGH_UNFIXED_FOR_CTO.json), [`../scan/TRIVY_HIGH_CRITICAL.json`](../scan/TRIVY_HIGH_CRITICAL.json).

Reachability analysis (no disposition): [`09_CVE_REACHABILITY.md`](./09_CVE_REACHABILITY.md).
