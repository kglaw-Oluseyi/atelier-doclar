# libacl reachability

## Presence
- Package: `libacl1` `2.3.2-2+b1`
- Library: `/usr/lib/x86_64-linux-gnu/libacl.so.1`
- `getfacl` / `setfacl`: ABSENT

## Dynamic linkage of production dependency closure
Same ELF DT_NEEDED closure as ncurses section:

| Binary / library | Links libacl? |
|---|---|
| node | no |
| python3.12 / libpython3.12 | no |
| libortools.so.9 and sampled OR-Tools extensions | no |

## Application / child code search
No production references to `getfacl`, `setfacl`, `acl_get`, `acl_set`, or ACL processing. Solver request path does not control filesystem ACL operations.

## Classification
**PRESENT BUT UNREACHABLE**

Applies to CVE: CVE-2026-54369.
