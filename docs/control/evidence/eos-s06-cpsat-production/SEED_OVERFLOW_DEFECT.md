# Defect: CPSAT-SEED-OVERFLOW-UINT32

**Classification:** Product / contract defect at the OR-Tools seed boundary — **not** infrastructure noise.

## Failing identity

| Field | Value |
|---|---|
| Defect id | `CPSAT-SEED-OVERFLOW-UINT32` |
| Authoritative authored seed string | `scale-2000` |
| Failing unsigned seed | **`3959095606`** (`0xebfb0136`) |
| Derivation | FNV-1a 32-bit with JS `>>> 0` zero-fill |
| Request seed field (pre-fix) | integer `3959095606` on child JSON |
| Model | `cpsat-model-v1` |
| Contract | `md.seating.solve.request/1` |
| Scale | 2000 guests / 2000 seats / 200 tables (synthetic light together) |
| Observed product fault | `SOLVER_FAULT(CHILD_RESPONSE)` |
| Child final | `ok: false`, `result: SOLVER_FAULT`, `error: TypeError` |
| Exception | OR-Tools `SatParameters.random_seed` rejected non-int32 |
| Peak RSS at fault | ~292032 KiB (debug capture) |
| First observation | qualification shard `scale-2000` before seed fold (exit 1) |

## Root cause

`seedFromCompiled` hashed non-decimal strings with FNV-1a and applied `>>> 0`, producing an **unsigned** 32-bit integer. Values in `(2^31−1, 2^32−1]` are valid uint32 but **illegal** for OR-Tools `random_seed` (signed int32). The Python child invoked:

```text
solver.parameters.random_seed = 3959095606
→ TypeError: incompatible function arguments … Invoked with: …, 3959095606
```

## Affected boundary

TypeScript compiler → framed JSON child payload → Python `prepare_problem` / `_configure_solver` → OR-Tools CP-SAT `SatParameters.random_seed`.

## Correction

1. Canonical wire seed: **signed int32 in `[1, 2147483647]`** (`packages/shared-platform/src/cpsat/seed.ts`).
2. Hash/oversized/negative inputs fold via Euclidean modulo — **never** unsigned bit reinterpretation.
3. `toChildPayload` asserts the wire seed.
4. Python `model.seed.assert_wire_seed` rejects oversized values (`INVALID_INPUT` / `SEED_NOT_INT32`).

Corrected wire seed for `scale-2000`:

`3959095606 % 2147483647 = 1811611959`

## Focused regression

- `packages/shared-platform/test/cpsat-seed.test.ts` (permanent)
- Re-run scale-2000 after fix: **OPTIMAL**, seated 2000/2000, verifier+explanations OK, `elapsedMs: 30358`

## Evidence artefacts

- This file
- `qualification/scale-2000.json` (post-fix success)
- Prior failed shard attempt retained in session log / `CHECKPOINT_2_KNOWN_LIMITATIONS` history
