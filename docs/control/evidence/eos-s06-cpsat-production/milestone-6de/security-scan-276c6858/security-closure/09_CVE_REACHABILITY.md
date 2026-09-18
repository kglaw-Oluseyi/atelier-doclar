# CVE reachability — digest sha256:276c6858…788f

Reachability labels only: **UNREACHABLE** / **NOT PRESENT** / **REACHABLE**.  
No ACCEPT / REJECT / expiry — CTO disposition is out of scope for this pack.

Production path in scope: supervisor (`node dist/supervisor.js`, UID 10001, CapEff=0) → single argv spawn of `/usr/local/bin/python3` + `/app/python/solver_child.py` with `buildCleanEnv()` (no DB credentials).

| CVE | Package(s) observed | Installed | Fixed | Present in image? | On supervisor→child path? | Label | Reasoning |
|---|---|---|---|---|---|---|---|
| CVE-2026-76642 | util-linux family (bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux) | 2.41.5-0+deb13u1 / login 1:4.16.0-2+really2.41.5-0+deb13u1 | null | yes (mount tooling + libs) | no | **UNREACHABLE** | Requires privileged mount post-hooks / X-mount helpers. Production never invokes `mount`; CapEff=0; no ingress; child is Python solver only. |
| CVE-2026-78408 | util-linux family (same set) | same | null | yes (`nsenter` binary present) | no | **UNREACHABLE** | Requires `nsenter --join-cgroup` as privileged actor. Not called by supervisor or solver_child; CapEff=0. |
| CVE-2026-78409 | util-linux family (same set) | same | null | yes | no | **UNREACHABLE** | X-mount.subdir symlink escape via mount tooling. Mount path unused by production closure. |
| CVE-2026-78410 | util-linux family (same set) | same | null | yes | no | **UNREACHABLE** | Restricted bind-mount / X-mount.owner redirection. Mount path unused; CapEff=0. |
| CVE-2026-54369 | libacl1 | 2.3.2-2+b1 | null | yes (library) | no | **UNREACHABLE** | Pathname ACL symlink traversal in libacl. `getfacl`/`setfacl` absent; production closure does not perform ACL ops on untrusted paths. |
| CVE-2025-69720 | libncursesw6, libtinfo6, ncurses-base, ncurses-bin | 6.5+20250216-2 | null | yes (`infocmp` present) | no | **UNREACHABLE** | Stack overflow in `infocmp`. Supervisor/solver do not invoke ncurses tools; no interactive TTY workload. |
| CVE-2026-16742 | libsystemd0, libudev1 (homed attribution) | 257.13-1~deb13u1 | null | libs yes; **homed/homectl absent** | no | **NOT PRESENT** | CVE is in systemd-homed home-record verification. `homectl` / `systemd-homed` binaries absent; Node is PID 1, not systemd-homed. |
| CVE-2026-9538 | perl-base | 5.40.1-6+deb13u1 | null | perl yes; **Archive::Tar module not loadable** | no | **UNREACHABLE** | DoS via crafted tar in Archive::Tar. Module absent (`perl -MArchive::Tar` fails); Perl never invoked by supervisor→child path. |

**REACHABLE count (this analysis):** 0  
**NOT PRESENT count:** 1 (`CVE-2026-16742`)  
**UNREACHABLE count:** 7  

Full HIGH package-row listing: [`../scan/HIGH_UNFIXED_FOR_CTO.json`](../scan/HIGH_UNFIXED_FOR_CTO.json), [`../scan/TRIVY_HIGH_CRITICAL.txt`](../scan/TRIVY_HIGH_CRITICAL.txt).
