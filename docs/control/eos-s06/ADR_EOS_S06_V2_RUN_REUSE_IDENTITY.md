# ADR: EOS-S06 V2 run-reuse identity

**Status:** Accepted for MD-PR-S075 Section 7; does not accept EOS-S06
**Authority:** MD-PR-S075

## Decision

Completed seating-run reuse requires equality of the full tuple:

- package content hash
- semantic hash
- compiled-request hash
- compiler version
- solver version
- solver configuration hash
- validator version
- seed

Those fields are stored on new `seating_v2_runs` rows. Package content hash remains `exactHash({ semanticHash, compiledRequestHash })`. Current compiler version is proven for new packages because `SEATING_V2_CONFIG_HASH` includes `compilerVersion`. Historic packages whose config hash does not match keep `legacy-unknown-compiler`.

## Persistence

Migration `008_seating_truth_v2` is unchanged. Additive `009_seating_v2_run_reuse_identity` copies semantic/compiled hashes from the bound package and backfills compiler/validator identities as explicit legacy/unknown values. It does not stamp the current compiler on old rows. The previous unique replay index is replaced by a partial unique index on the full tuple for `FEASIBLE`, `INFEASIBLE`, `QUEUED` and `RUNNING` only, so `TIMED_OUT`/`CANCELLED`/`ERROR` may create a linked retry.

## Behaviour

An identical current-compatible completed result is `REPLAYED` with `didDataChange: false` and no second solver computation. A changed component creates a new run. Historic raw-table-token / unknown-compiler runs remain immutable and cannot be adopted under `s06-compiler-v2`.
