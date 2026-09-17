# ncurses reachability

## Packages / files present
- `libncursesw6` `6.5+20250216-2`
- `libtinfo6` `6.5+20250216-2`
- `ncurses-base` `6.5+20250216-2`
- `ncurses-bin` `6.5+20250216-2` (includes `/usr/bin/infocmp`, `tic`, `tput`)
- terminfo database under `/usr/share/terminfo`

## Dynamic linkage of production dependency closure
ELF DT_NEEDED inspection (Python-parsed; `ldd` on amd64 Node under qemu segfaulted, so ELF parse used):

| Binary / library | Links libncurses / libtinfo? |
|---|---|
| `/usr/local/bin/node` | no |
| `/usr/local/bin/python3.12` | no |
| `/usr/local/lib/libpython3.12.so.1.0` | no |
| `ortools/.libs/libortools.so.9` | no |
| `ortools/sat/python/cp_model_helper…so` | no |
| `ortools/constraint_solver/_pywrapcp.so` | no |

Optional unused stdlib extension (not imported by production child):
- `/usr/local/lib/python3.12/lib-dynload/_curses…so` links `libncursesw` / `libtinfo` — not referenced by `/app/python` production sources.

## Terminal / input
- Worker is non-interactive (`not a tty` during inspection; production entrypoint has no TTY requirement)
- Production code does not accept untrusted terminfo databases or terminal-escape driven ncurses input
- Production sources do not reference `infocmp`, `curses`, or `terminfo`

## Classification
**PRESENT BUT UNREACHABLE**

CVE-2025-69720 description targets `infocmp` buffer overflow; `infocmp` is present but not invoked by the production process contract.

Applies to CVE: CVE-2025-69720.
