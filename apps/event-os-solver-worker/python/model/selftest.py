#!/usr/bin/env python3
"""Tiny together-pair self-test for the production CP-SAT model.

Runnable as:
  python -m model.selftest
  python python/model/selftest.py
  python -m pytest python/model/selftest.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from model.closure import closure_hash_from_units, recompute_units_from_pairs
from model.solve import solve_request


def tiny_together_request() -> dict:
    guests = [
        {"i": 0, "eligible": True, "attrs": [], "lockedSeat": None, "lockedTable": None},
        {"i": 1, "eligible": True, "attrs": [], "lockedSeat": None, "lockedTable": None},
        {"i": 2, "eligible": True, "attrs": [], "lockedSeat": None, "lockedTable": None},
    ]
    together = [[0, 1]]
    units = recompute_units_from_pairs(guests, together)
    return {
        "contractVersion": "md.seating.solve.request/1",
        "modelVersion": "cpsat-model-v1",
        "runId": "selftest-together-1",
        "mode": "REPLAY",
        "seed": 1,
        "purpose": "QUALIFICATION",
        "tables": [
            {"i": 0, "capacity": 2},
            {"i": 1, "capacity": 2},
        ],
        "seats": [
            {"i": 0, "table": 0, "attrs": []},
            {"i": 1, "table": 0, "attrs": []},
            {"i": 2, "table": 1, "attrs": []},
            {"i": 3, "table": 1, "attrs": []},
        ],
        "guests": guests,
        "togetherPairs": together,
        "units": units,
        "apartPairs": [[0, 2]],
        "requireTable": [],
        "forbidTable": [],
        "reservations": [],
        "preferences": [{"guest": 2, "table": 1, "band": "HIGH"}],
        "baseline": [],
        "limits": {"maxTimeSeconds": 5, "workers": 1, "wallSeconds": 10},
        "movementTolerance": 0,
        "closureHash": closure_hash_from_units(units),
    }


def test_tiny_together_pair_solves():
    req = tiny_together_request()
    out = solve_request(req)
    assert out["result"] in {"OPTIMAL", "FEASIBLE"}, out
    assert out["faultCode"] is None, out
    assert out["assignmentCount"] == 3, out
    by_guest = {a["guest"]: a for a in out["assignments"]}
    assert by_guest[0]["table"] == by_guest[1]["table"], by_guest
    assert by_guest[0]["table"] != by_guest[2]["table"], by_guest
    assert by_guest[2]["table"] == 1, by_guest
    assert out["resources"]["peakRssKb"] >= 0
    assert out["proofState"]["allTiersProven"] in {True, False}
    assert out["engine"]["model"] == "cpsat-model-v1"


def test_closure_hash_mismatch_rejected():
    req = tiny_together_request()
    req["closureHash"] = "0" * 64
    out = solve_request(req)
    assert out["result"] == "INVALID_INPUT"
    assert out["faultCode"] == "CLOSURE_HASH_MISMATCH"


def main() -> int:
    test_tiny_together_pair_solves()
    test_closure_hash_mismatch_rejected()
    print("selftest_ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
