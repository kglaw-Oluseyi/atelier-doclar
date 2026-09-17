# systemd-homed reachability

## Presence tests
| Probe | Result |
|---|---|
| `systemd-homed` executable | ABSENT |
| `homectl` executable | ABSENT |
| `systemd` PID 1 binary | ABSENT |
| homed unit/service files | ABSENT |
| Running homed process | no (PID 1 during inspection is the ephemeral probe shell / production entrypoint is Node, not systemd) |
| Packages present | `libsystemd0` `257.13-1~deb13u1`, `libudev1` `257.13-1~deb13u1` only |
| Production references | none |
| User-home management / home-record input | none in worker contract |

Note: `mkhomedir_helper` / `pam_mkhomedir.so` exist as PAM helpers; they are not `systemd-homed`, are not PID 1, and are not invoked by the supervisor or Python child.

## Classification
**SOURCE-PACKAGE ATTRIBUTION — NOT PRESENT**

Applies to CVE: CVE-2026-16742.
