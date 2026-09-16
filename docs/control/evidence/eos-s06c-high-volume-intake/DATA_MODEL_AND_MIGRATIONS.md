# Data Model and Migrations — EOS-S06C

## Collections (document store)

Additive `PlatformSnapshot` collections (memory + Postgres `platform_documents`):

- `guestIntakeSources`
- `guestIntakeJobs`
- `guestMappingEditions`
- `guestIntakeCandidates`
- `guestPromotionChunks`
- `guestIntakeReceipts`
- `guestIntakeOutboxEvents`

No new SQL table migration required for S06C; guests remain in `operationalGuests`.

## Backward compatibility

- Legacy `importGuests` / canonical-v1 CSV retained.
- Manual `intakeGuest` / `amendGuest` unchanged.
- `normalizeSnapshot` defaults empty arrays for new collections.

## Atomic visibility

Guests may appear during `PROMOTING` while job status shows in progress. `COMPLETED` requires reconciliation receipt.
