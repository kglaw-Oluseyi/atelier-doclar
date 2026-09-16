# Implementation Traceability — EOS-S06C

| Family | Pack control | Implementation |
|--------|--------------|----------------|
| SRC | Upload, hash, quarantine | `uploadGuestIntakeSource`, `guest-hv-intake-parse.ts` |
| MAP | Mapping editions | `confirmGuestIntakeMapping`, `autoMapHeaders` |
| VAL | Staging validation | `validateGuestIntake`, `stageCandidates` |
| APR | Maker-checker | `submitGuestIntake` / `approveGuestIntake` + `assertMakerChecker` |
| JOB | Chunks, leases, checkpoints | `advanceGuestIntakePromotion`, chunk size 250 |
| REC | Receipts / outbox | `GuestIntakeReceipt`, `GuestIntakeOutboxEvent` |
| COMP | OperationalGuest sole authority | promote via `buildOperationalGuest` |
| SEC | Permissions / formula defence | `guest.intake.approve|cancel|export`, formula detection |
| UX | Intake command UI | `guests/intake`, `guests/intake/[jobId]` |
| PERF | 1k/2k | `guest-hv-intake-scale.test.ts` |
| CAP | CAP1000 | Quarantine + treatment proposal; product path ready |

ADR: `docs/control/ADR_EOS_S06C_HIGH_VOLUME_GUEST_INTAKE.md`
