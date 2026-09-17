"""Canonical CP-SAT seed: signed int32 in [1, 2147483647] on the child wire."""

from __future__ import annotations

INT32_MIN = -2147483648
INT32_MAX = 2147483647
POSITIVE_MIN = 1
POSITIVE_MAX = INT32_MAX


class SeedError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def fold_to_positive_int32(n: int) -> int:
    trunc = int(n)
    if POSITIVE_MIN <= trunc <= POSITIVE_MAX:
        return trunc
    mod = POSITIVE_MAX
    x = trunc % mod
    if x < 0:
        x += mod
    return 1 if x == 0 else x


def assert_wire_seed(seed: object) -> int:
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise SeedError("SEED_NOT_INT32", f"seed must be int, got {type(seed).__name__}")
    if seed < POSITIVE_MIN or seed > POSITIVE_MAX:
        raise SeedError(
            "SEED_NOT_INT32",
            f"seed {seed} outside signed int32 positive domain [{POSITIVE_MIN}, {POSITIVE_MAX}]",
        )
    return seed
