"""Together-unit closure (D1 / D11) and closure-hash verification."""

from __future__ import annotations

import hashlib
import json
from typing import Any


class ClosureError(ValueError):
    """Invalid together closure or hash mismatch."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class _DSU:
    def __init__(self, items: list[int]):
        self.parent = {i: i for i in items}
        self.rank = {i: 0 for i in items}

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1


def _eligible_indices(guests: list[dict[str, Any]]) -> list[int]:
    out: list[int] = []
    for g in guests:
        i = int(g["i"])
        if bool(g.get("eligible", True)):
            out.append(i)
    return out


def canonical_units(units: list[dict[str, Any]]) -> list[list[int]]:
    """Sort members within each unit; sort units by minimum member."""
    normalised: list[list[int]] = []
    for u in units:
        members = sorted(int(m) for m in u["members"])
        if not members:
            raise ClosureError("EMPTY_UNIT", "together unit has empty members")
        normalised.append(members)
    normalised.sort(key=lambda m: (m[0], m))
    return normalised


def closure_hash_from_units(units: list[dict[str, Any]] | list[list[int]]) -> str:
    if units and isinstance(units[0], dict):
        canon = canonical_units(units)  # type: ignore[arg-type]
    else:
        canon = [sorted(int(m) for m in u) for u in units]  # type: ignore[union-attr]
        canon.sort(key=lambda m: (m[0], m))
    payload = json.dumps(canon, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def recompute_units_from_pairs(
    guests: list[dict[str, Any]],
    together_pairs: list[list[int]],
) -> list[dict[str, Any]]:
    """
    Transitive closure over eligible guests only (D1: do not bridge via ineligible).
    Ineligible guests never appear in units.
    """
    eligible = _eligible_indices(guests)
    eligible_set = set(eligible)
    dsu = _DSU(eligible)

    for pair in together_pairs:
        if len(pair) != 2:
            raise ClosureError("BAD_TOGETHER_PAIR", "togetherPairs entries must be length-2")
        a, b = int(pair[0]), int(pair[1])
        # Ineligible endpoints are ignored (non-bridging); both must be eligible to link.
        if a not in eligible_set or b not in eligible_set:
            continue
        dsu.union(a, b)

    groups: dict[int, list[int]] = {}
    for g in eligible:
        root = dsu.find(g)
        groups.setdefault(root, []).append(g)

    units = [{"i": idx, "members": sorted(members), "domainTables": None} for idx, members in enumerate(sorted(groups.values(), key=lambda m: (min(m), m)))]
    # Re-index sequentially after sort
    for idx, u in enumerate(units):
        u["i"] = idx
    return units


def verify_or_build_units(request: dict[str, Any]) -> list[dict[str, Any]]:
    """
    If togetherPairs present: recompute closure; reject closureHash mismatch.
    Else: trust units but verify members are disjoint and cover all eligible guests.
    """
    guests = list(request.get("guests") or [])
    together_pairs = request.get("togetherPairs")
    units_in = list(request.get("units") or [])
    expected_hash = request.get("closureHash")

    if together_pairs is not None:
        units = recompute_units_from_pairs(guests, list(together_pairs))
        # Preserve domainTables from request units when member-sets match.
        by_members = {tuple(sorted(int(m) for m in u["members"])): u for u in units_in if "members" in u}
        for u in units:
            key = tuple(u["members"])
            src = by_members.get(key)
            if src is not None and src.get("domainTables") is not None:
                u["domainTables"] = list(src["domainTables"])
        got = closure_hash_from_units(units)
        if expected_hash is not None and str(expected_hash).lower() != got.lower():
            raise ClosureError(
                "CLOSURE_HASH_MISMATCH",
                f"closureHash mismatch: expected={expected_hash} recomputed={got}",
            )
        return units

    if not units_in:
        # Singleton units for every eligible guest.
        units = [{"i": idx, "members": [g], "domainTables": None} for idx, g in enumerate(_eligible_indices(guests))]
        for idx, u in enumerate(units):
            u["i"] = idx
        return units

    # Trust units; verify cover + disjoint among eligible.
    eligible = set(_eligible_indices(guests))
    seen: set[int] = set()
    for u in units_in:
        members = [int(m) for m in u["members"]]
        if not members:
            raise ClosureError("EMPTY_UNIT", "unit members empty")
        for m in members:
            if m not in eligible:
                raise ClosureError("INELIGIBLE_IN_UNIT", f"ineligible guest {m} appears in a unit")
            if m in seen:
                raise ClosureError("OVERLAPPING_UNITS", f"guest {m} appears in multiple units")
            seen.add(m)
    missing = eligible - seen
    if missing:
        raise ClosureError("UNITS_DO_NOT_COVER", f"eligible guests missing from units: {sorted(missing)[:20]}")
    if expected_hash is not None:
        got = closure_hash_from_units(units_in)
        if str(expected_hash).lower() != got.lower():
            raise ClosureError(
                "CLOSURE_HASH_MISMATCH",
                f"closureHash mismatch on trusted units: expected={expected_hash} recomputed={got}",
            )
    # Normalise indices
    out = []
    for idx, u in enumerate(sorted(units_in, key=lambda x: (min(int(m) for m in x["members"]),))):
        nu = dict(u)
        nu["i"] = idx
        nu["members"] = sorted(int(m) for m in u["members"])
        out.append(nu)
    return out
