"""Aggregation equivalence, expansion, and mutation tests."""

from __future__ import annotations

import copy

import pytest

from model.stage_a import (
    _partition_units,
    aggregation_equivalence_key,
    build_stage_a,
    expand_guest_table_assignment,
    extract_unit_assignment,
)
from model.solve import solve_request
from model.closure import closure_hash_from_units, recompute_units_from_pairs


def _base_problem(n_guests: int = 6):
    guests = [
        {"i": i, "eligible": True, "attrs": [], "lockedSeat": None, "lockedTable": None}
        for i in range(n_guests)
    ]
    tables = [{"i": t, "capacity": 3, "_usable": 3} for t in range(3)]
    seats = []
    sid = 0
    seats_per_table = {}
    for t in range(3):
        seats_per_table[t] = []
        for _ in range(3):
            seats.append({"i": sid, "table": t, "attrs": []})
            seats_per_table[t].append(sid)
            sid += 1
    units = [{"i": i, "members": [i], "domainTables": [0, 1, 2]} for i in range(n_guests)]
    guest_to_unit = {i: i for i in range(n_guests)}
    return {
        "units": units,
        "unit_domains": {i: {0, 1, 2} for i in range(n_guests)},
        "guest_attrs": {i: set() for i in range(n_guests)},
        "locked_seat": {},
        "locked_table": {},
        "preferences": [],
        "reservations": [],
        "baseline_by_guest": {},
        "apart_unit_pairs": set(),
        "guest_to_unit": guest_to_unit,
        "tables": tables,
        "seats": seats,
        "seats_per_table": seats_per_table,
        "seat_attrs": {s["i"]: set() for s in seats},
        "guests": guests,
    }


def test_equivalence_key_domain_and_attrs():
    assert aggregation_equivalence_key(domain=(0, 1), attrs=("A",)) == ((0, 1), ("A",))
    assert aggregation_equivalence_key(domain=(0, 1), attrs=("A",)) != aggregation_equivalence_key(
        domain=(0, 1), attrs=("B",)
    )


def test_identical_singletons_aggregate():
    problem = _base_problem(6)
    core, classes = _partition_units(problem)
    assert len(classes) == 1
    assert classes[0]["size"] == 6
    assert core == []


@pytest.mark.parametrize(
    "mutate",
    [
        "lock_seat",
        "lock_table",
        "preference",
        "baseline",
        "reservation",
        "apart",
        "attrs",
        "domain",
        "together",
    ],
)
def test_single_material_difference_forces_separate_core(mutate: str):
    problem = _base_problem(4)
    # Mutate guest 0 only
    if mutate == "lock_seat":
        problem["locked_seat"][0] = 0
    elif mutate == "lock_table":
        problem["locked_table"][0] = 1
    elif mutate == "preference":
        problem["preferences"] = [{"guest": 0, "table": 1, "band": "HIGH", "weight": 10}]
    elif mutate == "baseline":
        problem["baseline_by_guest"][0] = {"table": 0, "seat": 0}
    elif mutate == "reservation":
        problem["reservations"] = [{"kind": "GUARANTEE", "seat": 0, "holderGuest": 0, "table": 0}]
    elif mutate == "apart":
        problem["apart_unit_pairs"] = {(0, 1)}
    elif mutate == "attrs":
        problem["guest_attrs"][0] = {"A11Y_WHEELCHAIR"}
    elif mutate == "domain":
        problem["unit_domains"][0] = {0, 1}  # others still {0,1,2}
    elif mutate == "together":
        problem["units"][0] = {"i": 0, "members": [0, 1], "domainTables": [0, 1, 2]}
        problem["units"][1] = {"i": 1, "members": [0, 1], "domainTables": [0, 1, 2]}
        # simplify: mark unit 0 as multi-member and drop unit 1 duplicate carefully
        problem["units"] = [
            {"i": 0, "members": [0, 1], "domainTables": [0, 1, 2]},
            {"i": 2, "members": [2], "domainTables": [0, 1, 2]},
            {"i": 3, "members": [3], "domainTables": [0, 1, 2]},
        ]
        problem["guest_to_unit"] = {0: 0, 1: 0, 2: 2, 3: 3}
        problem["unit_domains"] = {0: {0, 1, 2}, 2: {0, 1, 2}, 3: {0, 1, 2}}

    core, classes = _partition_units(problem)
    core_guests = set()
    for u in core:
        core_guests.update(int(m) for m in u["members"])
    if mutate == "together":
        assert 0 in core_guests and 1 in core_guests
    elif mutate in {"attrs", "domain"}:
        # Different key → guest 0 alone cannot join the class of 1,2,3;
        # singleton class of size 1 stays core.
        assert 0 in core_guests
        assert any(0 not in c["guests"] or c["size"] == 1 for c in classes) or 0 in core_guests
    else:
        assert 0 in core_guests


def test_mutation_omitting_preference_check_would_aggregate_wrongly():
    """Survivor check: if preference exclusion were removed, guest 0 would aggregate."""
    problem = _base_problem(4)
    problem["preferences"] = [{"guest": 0, "table": 1, "band": "HIGH", "weight": 10}]
    core, classes = _partition_units(problem)
    assert any(0 in [int(m) for m in u["members"]] for u in core)
    # Simulate broken key that only checks domain/attrs without preference exclusion:
    broken_buckets = {}
    for u in problem["units"]:
        g = int(u["members"][0])
        key = (tuple(sorted(problem["unit_domains"][int(u["i"])])), tuple(sorted(problem["guest_attrs"][g])))
        broken_buckets.setdefault(key, []).append(g)
    # Broken path would put all 4 including preferred guest 0 in one bucket
    assert len(next(iter(broken_buckets.values()))) == 4
    # Correct path must not
    assert not any(c["size"] == 4 for c in classes)


def test_expansion_deterministic_and_complete():
    guests = [{"i": i, "eligible": True, "attrs": [], "lockedSeat": None, "lockedTable": None} for i in range(4)]
    together = []
    units = recompute_units_from_pairs(guests, together)
    for u in units:
        u["domainTables"] = [0, 1]
    req = {
        "contractVersion": "md.seating.solve.request/1",
        "modelVersion": "cpsat-model-v1",
        "runId": "agg-expand",
        "mode": "REPLAY",
        "seed": 3,
        "purpose": "QUALIFICATION",
        "tables": [{"i": 0, "capacity": 2}, {"i": 1, "capacity": 2}],
        "seats": [
            {"i": 0, "table": 0, "attrs": []},
            {"i": 1, "table": 0, "attrs": []},
            {"i": 2, "table": 1, "attrs": []},
            {"i": 3, "table": 1, "attrs": []},
        ],
        "guests": guests,
        "togetherPairs": [],
        "units": units,
        "apartPairs": [],
        "requireTable": [],
        "forbidTable": [],
        "reservations": [],
        "preferences": [],
        "baseline": [],
        "limits": {"maxTimeSeconds": 5, "workers": 1, "wallSeconds": 10},
        "movementTolerance": 0,
        "closureHash": closure_hash_from_units(units),
    }
    a = solve_request(req)
    b = solve_request(req)
    assert a["result"] in {"OPTIMAL", "FEASIBLE"}
    assert a["assignmentCount"] == 4
    guests_a = sorted((x["guest"], x["table"], x["seat"]) for x in a["assignments"])
    guests_b = sorted((x["guest"], x["table"], x["seat"]) for x in b["assignments"])
    assert guests_a == guests_b
    assert len({x["guest"] for x in a["assignments"]}) == 4
    assert len({x["seat"] for x in a["assignments"]}) == 4
