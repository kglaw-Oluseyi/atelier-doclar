# CTO CVE disposition

Deterministic mapping from Sections 6–10. Dispositions restricted to the allowed set.

| CVE | Package | Installed version | Fixed version | Vulnerable capability | Present? | Production reference? | Input reachable? | Controls | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| CVE-2026-76642 | util-linux family (bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux) | 2.41.5-0+deb13u1 / login 1:4.16.0-2+really2.41.5-0+deb13u1 | null (unfixed) | privileged X-mount post-hooks after failed helper | yes (mount/umount binaries + libs) | no | no | UID 10001; CapEff=0; argv-only Python child; no ingress | ACCEPTED — UNREACHABLE |
| CVE-2026-78408 | util-linux family (same package set) | 2.41.5-0+deb13u1 / login 1:4.16.0-2+really2.41.5-0+deb13u1 | null (unfixed) | nsenter --join-cgroup cgroup migration authority leak | yes (nsenter binary + libs) | no | no | UID 10001; CapEff=0; argv-only Python child; no ingress | ACCEPTED — UNREACHABLE |
| CVE-2026-78409 | util-linux family (same package set) | 2.41.5-0+deb13u1 / login 1:4.16.0-2+really2.41.5-0+deb13u1 | null (unfixed) | X-mount.subdir symlink escape | yes (mount tooling + libs) | no | no | UID 10001; CapEff=0; argv-only Python child; no ingress | ACCEPTED — UNREACHABLE |
| CVE-2026-78410 | util-linux family (same package set) | 2.41.5-0+deb13u1 / login 1:4.16.0-2+really2.41.5-0+deb13u1 | null (unfixed) | restricted bind-mount source redirection via X-mount.owner/group/mode | yes (mount tooling + libs) | no | no | UID 10001; CapEff=0; argv-only Python child; no ingress | ACCEPTED — UNREACHABLE |
| CVE-2026-54369 | libacl1 | 2.3.2-2+b1 | null (unfixed) | libacl pathname ACL symlink traversal | yes (library) | no | no | not linked by production closure; getfacl/setfacl absent; no ACL ops | ACCEPTED — UNREACHABLE |
| CVE-2025-69720 | libncursesw6, libtinfo6, ncurses-base, ncurses-bin | 6.5+20250216-2 | null (unfixed) | infocmp stack buffer overflow / ncurses terminal handling | yes (libs + infocmp) | no | no | not linked by production closure; no interactive TTY; infocmp unused | ACCEPTED — UNREACHABLE |
| CVE-2026-16742 | libsystemd0, libudev1 (homed attribution) | 257.13-1~deb13u1 | null (unfixed) | systemd-homed home-record signature verification gap | no (homed/homectl absent) | no | no | source-package libraries only; Node not systemd PID 1 | ACCEPTED — NOT PRESENT |
| CVE-2026-9538 | perl-base | 5.40.1-6+deb13u1 | null (unfixed) | Archive::Tar crafted tar header DoS | perl yes; Archive::Tar module no | no | no | Archive::Tar absent; Perl never invoked; no archive extraction path | ACCEPTED — UNREACHABLE |

REACHABLE count: 0
INSUFFICIENT EVIDENCE count: 0
