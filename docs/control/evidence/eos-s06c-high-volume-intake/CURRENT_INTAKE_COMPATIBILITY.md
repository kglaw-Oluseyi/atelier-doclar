# EOS-S06C — Current Intake Compatibility Map

**Authority date:** 2026-09-16
**Git HEAD at inspection:** `275ff754cd75ef728051564b9b266e103185548f`
**Accepted application SHA:** `71317881384e38671295c3fda32d533c71c3f559`
**Pack archive SHA-256:** `2b104b17dbad3a44dae8947c6250fad11629e0fe91df6c87b39ca8a0c77c74f4`
**Disposition:** No `BLOCKED — SPECIFICATION/PRODUCT CONFLICT`. Pack extends accepted EOS-S02; no parallel guest domain.

| # | Area | Disposition | Notes |
|---|------|-------------|-------|
| 1 | Single-guest creation | REUSE | `PlatformService.intakeGuest` / `GuestIntakeForm` |
| 2 | Guest update | REUSE | `amendGuest` / verified-field rules |
| 3 | CSV/file import | EXTEND | Retain `importGuests` wrapper; supersede HV path with staged jobs; add upload + XLSX |
| 4 | Identity / uniqueness | REUSE | Soft match via `findDuplicateMatches`; no auto-merge |
| 5 | Parties / households / companions / adults | REUSE / OUT OF SCOPE core | Household key on intake; parties/companions/adults via accepted services |
| 6 | Event / org isolation | REUSE | Scope at every job boundary |
| 7 | Guest status / eligibility | REUSE | Lifecycle ACTIVE/WITHDRAWN/ARCHIVED; admission OUT OF SCOPE |
| 8 | Seating / check-in / invitation / comms | REUSE consumers | Emit outbox/staleness; do not write downstream decisions |
| 9 | Audit | EXTEND | Summary lifecycle audits; no per-row audit explosion; no full-snapshot audit clone per guest |
| 10 | Maker-checker | EXTEND | Reuse `assertMakerChecker`; new intake approve permission |
| 11 | Store / Postgres TX | EXTEND | Chunked mutates; document collections |
| 12 | Memory/file-store | REUSE | Memory↔Postgres parity; no separate file-store adapter |
| 13 | Full-snapshot clone (`TDR-S06-006`) | CONFLICT → scoped remediation | Intake progress reads via `viewSnapshot`; broader debt remains OPEN |
| 14 | Idempotency | EXTEND | Platform keys + chunk keys; wire HV path fully |
| 15 | Roles / permissions | EXTEND | Additive approve/cancel/export |
| 16 | Export/download | EXTEND | Correction CSV under `guest.intake.export` |
| 17 | Accessibility / responsive | REUSE | Command Atelier patterns; 360/768/1280 |
| 18 | Synthetic fixtures | REUSE tooling | New S06C corpora; do not resume old CAP1000 installer |
| 19 | CAP600 / partial CAP1000 | OUT OF SCOPE mutate | CAP600 intact; CAP1000 quarantined pending product replace |
| 20 | Migrations | REUSE additive | Document collections + normalizeSnapshot; SQL migration only if required |

## Material scale conflicts addressed by S06C

- Single-mutate promote-all CSV import
- CSV body size cap on legacy import
- Sequential remote `intakeGuest` (CAP1000 installer pattern) — **prohibited**
- Full-clone `authorizeQuery` on hot progress polling

## CAP1000 pre-mutation inspection (read-only)

| Field | Value |
|-------|-------|
| Event ID | `3d212906-529e-4bd8-b13f-b0c2a24e5fba` |
| Label | `INCOMPLETE — INSTALLATION PAUSED — NOT FOR VERIFICATION` |
| Evidence | `docs/control/evidence/eos-s06-capacity-1000/MANIFEST.md` |
| Prior approximate guests | 125/1000 |
| Working-tree installer diff | Present on `capacity-live-install.ts` (idempotency key uniqueness) — **not staged by S06C**; provenance pre-existing |
| Corpus manifest dirty | `frozenAt` timestamp only — **not staged by S06C** |
| Treatment | Quarantine; replace via EOS-S06C product after local proof; do not resume sequential installer |

## Pack vs programme sequencing note

Pack documents embed historical “after EOS-S06B” wording. Controlling programme sequence is `EOS-S06C → EOS-S06B → EOS-S06D → EOS-S07` per `EOS_S06B_S06C_RATIFICATION.md`. Pack product requirements remain controlling for behaviour.
