# Perl / Archive::Tar reachability

## Executables
| Name | Result |
|---|---|
| perl | PRESENT — `/usr/bin/perl` mode `755`, UID 10001 executable |
| corelist | ABSENT |
| cpan | ABSENT |
| cpanm | ABSENT |
| ptar | ABSENT |
| ptardiff | ABSENT |
| ptargrep | ABSENT |

## Modules / libraries
- `perl -MArchive::Tar -e …` → `Can't locate Archive/Tar.pm in @INC`
- `find` for `Tar.pm` / `Archive/Tar`: no Archive::Tar module present
- `dpkg`: `perl-base` installed `5.40.1-6+deb13u1`; full `perl` package not installed (`un`)

## Production references
- Worker production TypeScript/Python: no matches for `perl`, `Archive::Tar`, `ptar`, `cpan`, `corelist`
- No `.tar` / `.tar.gz` / `.tgz` archive-processing paths in production solver child
- No runtime archive extraction via Perl

## Classification
**PRESENT BUT UNREACHABLE**

Perl exists as a base OS binary; Archive::Tar module and ptar utilities are absent; production never invokes Perl; no untrusted archive is processed through Archive::Tar.

Applies to CVE: CVE-2026-9538 (status `fix_deferred`).
