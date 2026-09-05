# Backup and restore

**Slice:** MD-CT9  
**Prompt Control ID:** `MD-PR-0010`

The CT2 `ProgrammeStore` remains the persistence contract. Local adapters are `NON_PRODUCTION`. Production database is unselected.

## Verified snapshot

`ProgrammeEngine.snapshot` writes an immutable projection plus view. `reconstructFromSnapshot` replays to the recorded event position. Corrections append; they do not mutate the stored snapshot.

## Strategy

1. Take a named snapshot after a successful `programme:validate` / `programme:project`.
2. Keep the snapshot id and source event position in the evidence index.
3. Restore by id and position. Do not rewrite historical events.

This is not a hosted backup product. Railway/object-store backup remains unselected.
