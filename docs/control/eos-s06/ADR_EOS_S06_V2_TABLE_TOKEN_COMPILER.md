# ADR — EOS-S06 V2 canonical table-token compiler

**Status:** Accepted for MD-PR-S075 implementation; does not accept EOS-S06
**Parent:** `ADR_EOS_S06_V2_COMMAND_EXECUTION_ISOLATION.md`
**Authority:** MD-PR-S075

## Decision

Solver-facing table identity is produced by exactly one function, `seatingV2TableToken()`, which preserves the existing position-token algorithm `exactHash({ table: objectId }).slice(0, 32)`.

Durable authoring identity remains the published layout `objectId`. Conversion happens once while compiling against the bound published layout. Raw layout UUIDs, guest IDs and free text do not enter the compiled solver request.

Compiler contract identity is `s06-compiler-v2`. It is included in `SEATING_V2_CONFIG_HASH` so new packages differ from the historic raw-target package beginning `bad17b83dc9f`. The solver runtime version remains `s06-solver-v2`; the independent validator remains `s06-validator-v3`. Historic packages, runs and INFEASIBLE reports stay immutable.

Unresolved TABLE targets fail with `VALIDATION_FAILED` before run creation. They cannot become solver INFEASIBLE.
