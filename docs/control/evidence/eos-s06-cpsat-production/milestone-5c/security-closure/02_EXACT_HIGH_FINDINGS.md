# Exact HIGH findings (frozen)

Source: `milestone-5c/scan-final/HIGH_UNFIXED_BY_CVE.json`
Unique CVE count: 8

| CVE | Package(s) | Installed version(s) | Fixed version | Severity | Status | Title |
|---|---|---|---|---|---|---|
| CVE-2026-76642 | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | 1:2.41.5-0+deb13u1, 1:4.16.0-2+really2.41.5-0+deb13u1, 2.41.5-0+deb13u1 | null (unfixed) | HIGH | affected | util-linux: util-linux: failed external mount helper still runs privileged X-mount post-hooks |
| CVE-2026-78408 | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | 1:2.41.5-0+deb13u1, 1:4.16.0-2+really2.41.5-0+deb13u1, 2.41.5-0+deb13u1 | null (unfixed) | HIGH | affected | util-linux: util-linux: nsenter --join-cgroup leaks root cgroup migration authority |
| CVE-2026-78409 | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | 1:2.41.5-0+deb13u1, 1:4.16.0-2+really2.41.5-0+deb13u1, 2.41.5-0+deb13u1 | null (unfixed) | HIGH | affected | util-linux: util-linux: X-mount.subdir detached-tree resolution can escape via intermediate symlinks |
| CVE-2026-78410 | bsdutils, libblkid1, liblastlog2-2, libmount1, libsmartcols1, libuuid1, login, mount, util-linux | 1:2.41.5-0+deb13u1, 1:4.16.0-2+really2.41.5-0+deb13u1, 2.41.5-0+deb13u1 | null (unfixed) | HIGH | affected | util-linux: util-linux: restricted bind mounts do not pin the source, allowing X-mount.owner/group/mode redirection |
| CVE-2026-54369 | libacl1 | 2.3.2-2+b1 | null (unfixed) | HIGH | affected | acl: Symlink traversal privilege escalation via libacl functions |
| CVE-2025-69720 | libncursesw6, libtinfo6, ncurses-base, ncurses-bin | 6.5+20250216-2 | null (unfixed) | HIGH | affected | ncurses: ncurses: Buffer overflow vulnerability may lead to arbitrary code execution. |
| CVE-2026-16742 | libsystemd0, libudev1 | 257.13-1~deb13u1 | null (unfixed) | HIGH | affected | systemd: systemd-homed: Local privilege escalation via missing home-record signature verification |
| CVE-2026-9538 | perl-base | 5.40.1-6+deb13u1 | null (unfixed) | HIGH | fix_deferred | perl-Archive-Tar: perl-Archive-Tar: Denial of Service via crafted tar header with large entry size |
