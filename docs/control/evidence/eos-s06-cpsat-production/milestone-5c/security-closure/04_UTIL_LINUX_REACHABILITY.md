# util-linux mount/nsenter family reachability

Inspection method: filesystem presence inside unchanged `event-os-solver-worker:candidate-bbec476` as UID 10001; repository text search under `apps/event-os-solver-worker` production sources. No privileged mount or namespace mutation attempted.

## Executable inventory

| Name | Present? | Absolute path | Owner:mode | setuid/setgid | file caps | UID 10001 can execute | Production reference | In supervisor/Python dependency closure |
|---|---|---|---|---|---|---|---|---|
| mount | yes | `/usr/bin/mount` | root:root `4755` | setuid | none (getcap absent) | yes | no (only unrelated bind-mount comment in cold-start script, not in image) | no |
| umount | yes | `/usr/bin/umount` | root:root `4755` | setuid | none | yes | no | no |
| nsenter | yes | `/usr/bin/nsenter` | root:root `755` | no | none | yes | no | no |
| unshare | yes | `/usr/bin/unshare` | root:root `755` | no | none | yes | no | no |
| setns | no | — | — | — | — | — | no | no |
| findmnt | yes | `/usr/bin/findmnt` | root:root `755` | no | none | yes | no | no |
| lsns | yes | `/usr/bin/lsns` | root:root `755` | no | none | yes | no | no |
| mountpoint | yes | `/usr/bin/mountpoint` | root:root `755` | no | none | yes | no | no |
| su | yes | `/usr/bin/su` | root:root `4755` | setuid | none | yes | no | no |
| runuser | yes | `/usr/sbin/runuser` | root:root `755` | no | none | yes | no | no |

## Controls relevant to classification
- Production spawn argv is fixed Python interpreter + fixed `solver_child.py` only.
- Job input cannot select executable names.
- CapEff = 0 (worker lacks effective privilege to perform privileged mount/namespace operations as an additional capability).
- No application ingress.

## Classification (deterministic)
For every listed executable that is present: **PRESENT BUT UNREACHABLE**

`setns`: **NOT PRESENT**

Applies to CVEs: CVE-2026-76642, CVE-2026-78408, CVE-2026-78409, CVE-2026-78410.
