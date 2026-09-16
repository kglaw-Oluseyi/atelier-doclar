# Recovery and Replay — EOS-S06C

- Lease: 60s renewable on advance; conflicting lease holders are refused.
- Checkpoint: `checkpointChunkIndex` advances only after committed chunks.
- Cancel: sets `cancelRequested`; stops at chunk boundary; may yield `PARTIALLY_COMMITTED` if chunks already settled.
- Replay of completed job: idempotent no-op returning existing receipt (no duplicate guests).
- Stale approval: fingerprint mismatch blocks promotion.
- Browser refresh: job state is durable in platform store; UI reloads from `getGuestIntakeJob`.
