"""Real CP-SAT diagnostic models: DIAG_CORE, DIAG_MCS, COUNTERFACTUAL helpers.

Uses OR-Tools assumptions / OnlyEnforceIf literals. Never relaxes table existence,
basic capacity, or eligibility truth.
"""

from __future__ import annotations

import time
from typing import Any, Callable

from ortools.sat.python import cp_model

ProgressCb = Callable[[str, str | None], None]


def _eligible_guests(problem: dict[str, Any]) -> list[int]:
    return sorted(int(g["i"]) for g in problem["guests"] if g.get("eligible", True))


def _table_ids(problem: dict[str, Any]) -> list[int]:
    return sorted(int(t["i"]) for t in problem["tables"])


def _usable(problem: dict[str, Any]) -> dict[int, int]:
    return {int(t["i"]): int(t.get("_usable", t.get("capacity", 0))) for t in problem["tables"]}


def _guest_domains(problem: dict[str, Any]) -> dict[int, list[int]]:
    """Per-guest domains from unit domains (locks/require/forbid already projected)."""
    guest_to_unit = problem["guest_to_unit"]
    unit_domains = problem["unit_domains"]
    out: dict[int, list[int]] = {}
    for g in _eligible_guests(problem):
        u = guest_to_unit.get(g)
        if u is None:
            out[g] = list(_table_ids(problem))
        else:
            out[g] = sorted(unit_domains.get(int(u), set(_table_ids(problem))))
    return out


def _default_relaxable_rules(problem: dict[str, Any], request: dict[str, Any]) -> list[dict[str, Any]]:
    """Derive relaxable rule descriptors from request pairs / diagnostic block."""
    diag = request.get("diagnostic") or {}
    if isinstance(diag.get("relaxableRules"), list) and diag["relaxableRules"]:
        out: list[dict[str, Any]] = []
        for raw in diag["relaxableRules"]:
            ref = str(raw.get("ref") or raw.get("contentHash") or "")
            if not ref:
                continue
            kind = str(raw.get("kind") or "UNKNOWN")
            rule: dict[str, Any] = {
                "ref": ref,
                "kind": kind,
                "priority": int(raw.get("priority") or 30),
            }
            if raw.get("guests") is not None:
                rule["guests"] = [int(g) for g in raw["guests"]]
            if raw.get("tables") is not None:
                rule["tables"] = [int(t) for t in raw["tables"]]
            if raw.get("guestOrUnit") is not None:
                rule["guestOrUnit"] = int(raw["guestOrUnit"])
            if raw.get("guest") is not None:
                rule["guest"] = int(raw["guest"])
            if raw.get("table") is not None:
                rule["table"] = int(raw["table"])
            out.append(rule)
        out.sort(key=lambda r: (-int(r.get("priority", 0)), str(r.get("ref"))))
        return out

    rules: list[dict[str, Any]] = []
    for idx, pair in enumerate(problem.get("together_pairs") or request.get("togetherPairs") or []):
        if len(pair) != 2:
            continue
        rules.append(
            {
                "ref": f"TOGETHER:{int(pair[0])}:{int(pair[1])}",
                "kind": "KEEP_TOGETHER",
                "guests": [int(pair[0]), int(pair[1])],
                "priority": 50,
            }
        )
    for pair in request.get("apartPairs") or []:
        if len(pair) != 2:
            continue
        rules.append(
            {
                "ref": f"APART:{int(pair[0])}:{int(pair[1])}",
                "kind": "KEEP_APART",
                "guests": [int(pair[0]), int(pair[1])],
                "priority": 50,
            }
        )
    for item in request.get("requireTable") or []:
        guest_or_unit = item.get("guestOrUnit", item.get("unit"))
        rules.append(
            {
                "ref": f"REQUIRE:{guest_or_unit}:{','.join(str(t) for t in item.get('tables') or [])}",
                "kind": "REQUIRE_TABLE",
                "guestOrUnit": int(guest_or_unit),
                "tables": [int(t) for t in item.get("tables") or []],
                "priority": 30,
            }
        )
    for item in request.get("forbidTable") or []:
        guest_or_unit = item.get("guestOrUnit", item.get("unit"))
        rules.append(
            {
                "ref": f"FORBID:{guest_or_unit}:{','.join(str(t) for t in item.get('tables') or [])}",
                "kind": "FORBID_TABLE",
                "guestOrUnit": int(guest_or_unit),
                "tables": [int(t) for t in item.get("tables") or []],
                "priority": 30,
            }
        )
    allow_locks = bool((diag.get("lockRelaxationPolicy") or {}).get("allow") or diag.get("allowLockRelaxation"))
    if allow_locks:
        for g in problem["guests"]:
            if g.get("lockedTable") is not None:
                gi = int(g["i"])
                rules.append(
                    {
                        "ref": f"LOCK:{gi}:{int(g['lockedTable'])}",
                        "kind": "LOCK_ASSIGNMENT",
                        "guest": gi,
                        "table": int(g["lockedTable"]),
                        "priority": 100,
                    }
                )
    rules.sort(key=lambda r: (-int(r.get("priority", 0)), str(r.get("ref"))))
    return rules


def _build_guest_table_vars(
    model: cp_model.CpModel,
    problem: dict[str, Any],
    *,
    require_complete: bool,
) -> tuple[dict[tuple[int, int], Any], dict[int, Any], dict[int, list[int]]]:
    """Simple eligible-guest → table assignment (diagnostic scale)."""
    domains = _guest_domains(problem)
    usable = _usable(problem)
    guests = _eligible_guests(problem)
    x: dict[tuple[int, int], Any] = {}
    seated: dict[int, Any] = {}
    for g in guests:
        seated[g] = model.NewBoolVar(f"diag_seated_g{g}")
        if require_complete:
            model.Add(seated[g] == 1)
        dom = domains.get(g) or []
        for t in dom:
            x[g, t] = model.NewBoolVar(f"diag_g{g}_t{t}")
        if dom:
            model.Add(sum(x[g, t] for t in dom) == seated[g])
        else:
            model.Add(seated[g] == 0)
    for t, cap in usable.items():
        load = [x[g, t] for g in guests if (g, t) in x]
        if load:
            model.Add(sum(load) <= cap)
    return x, seated, domains


def _attach_rule_literal(
    model: cp_model.CpModel,
    problem: dict[str, Any],
    x: dict[tuple[int, int], Any],
    seated: dict[int, Any],
    rule: dict[str, Any],
    lit: Any,
) -> None:
    kind = str(rule.get("kind"))
    guest_to_unit = problem["guest_to_unit"]

    def resolve_guest(v: int) -> int | None:
        # Prefer guest index when eligible; else map unit→first member.
        eligible = set(_eligible_guests(problem))
        if v in eligible:
            return v
        for u in problem["units"]:
            if int(u["i"]) == v and u["members"]:
                return int(u["members"][0])
        return None

    if kind == "KEEP_TOGETHER":
        guests = [resolve_guest(int(g)) for g in rule.get("guests") or []]
        guests = [g for g in guests if g is not None]
        if len(guests) < 2:
            return
        a, b = guests[0], guests[1]
        # Same table when both seated under lit.
        tables = set(t for (g, t) in x if g == a) & set(t for (g, t) in x if g == b)
        for t in tables:
            # lit => (a@t == b@t) when both seated — enforce equal placement:
            # lit => not (a@t and not b@t); lit => not (b@t and not a@t)
            model.AddBoolOr([lit.Not(), x[a, t].Not(), x[b, t]])
            model.AddBoolOr([lit.Not(), x[b, t].Not(), x[a, t]])
        return

    if kind == "KEEP_APART":
        guests = [resolve_guest(int(g)) for g in rule.get("guests") or []]
        guests = [g for g in guests if g is not None]
        if len(guests) < 2:
            return
        a, b = guests[0], guests[1]
        tables = set(t for (g, t) in x if g == a) & set(t for (g, t) in x if g == b)
        for t in tables:
            model.AddBoolOr([lit.Not(), x[a, t].Not(), x[b, t].Not()])
        return

    if kind == "REQUIRE_TABLE":
        g = resolve_guest(int(rule.get("guestOrUnit", rule.get("guest", -1))))
        tables = [int(t) for t in rule.get("tables") or []]
        if g is None or not tables:
            return
        # lit => seated guest at one of required tables
        opts = [x[g, t] for t in tables if (g, t) in x]
        if opts:
            model.AddBoolOr([lit.Not(), *opts])
        else:
            model.Add(lit == 0)  # impossible to enforce
        return

    if kind == "FORBID_TABLE":
        g = resolve_guest(int(rule.get("guestOrUnit", rule.get("guest", -1))))
        tables = [int(t) for t in rule.get("tables") or []]
        if g is None:
            return
        for t in tables:
            if (g, t) in x:
                model.AddBoolOr([lit.Not(), x[g, t].Not()])
        return

    if kind == "LOCK_ASSIGNMENT":
        g = resolve_guest(int(rule.get("guest", -1)))
        t = int(rule.get("table", -1))
        if g is None or (g, t) not in x:
            return
        model.AddBoolOr([lit.Not(), x[g, t]])
        return

    # Unknown kinds: leave literal unconstrained (still counted).
    void = guest_to_unit  # silence unused in some paths
    _ = void


def _extract_assignments(
    solver: cp_model.CpSolver,
    problem: dict[str, Any],
    x: dict[tuple[int, int], Any],
) -> list[dict[str, int]]:
    """Map guest→table to seat indices (first free seat per table, deterministic)."""
    seats_per_table: dict[int, list[int]] = problem.get("seats_per_table") or {}
    guest_table: dict[int, int] = {}
    for (g, t), var in x.items():
        if solver.Value(var) == 1:
            guest_table[int(g)] = int(t)
    # Assign seats in guest order
    used: dict[int, int] = {t: 0 for t in seats_per_table}
    out: list[dict[str, int]] = []
    for g in sorted(guest_table):
        t = guest_table[g]
        seats = sorted(seats_per_table.get(t, []))
        idx = used.get(t, 0)
        if idx >= len(seats):
            continue
        seat = seats[idx]
        used[t] = idx + 1
        out.append({"guest": g, "table": t, "seat": int(seat)})
    return out


def solve_diag_core(
    problem: dict[str, Any],
    request: dict[str, Any],
    *,
    emit: ProgressCb,
    remaining_wall: Callable[[], float],
) -> dict[str, Any]:
    diag = request.get("diagnostic") or {}
    budget = int(diag.get("coreMinimisationBudget") or diag.get("budget") or 24)
    rules = _default_relaxable_rules(problem, request)
    emit("diag_core", f"rules={len(rules)}")

    model = cp_model.CpModel()
    x, seated, _domains = _build_guest_table_vars(model, problem, require_complete=True)
    lit_by_ref: dict[str, Any] = {}
    lit_list: list[Any] = []
    refs: list[str] = []
    for rule in rules:
        ref = str(rule["ref"])
        lit = model.NewBoolVar(f"enf_{ref}")
        lit_by_ref[ref] = lit
        lit_list.append(lit)
        refs.append(ref)
        _attach_rule_literal(model, problem, x, seated, rule, lit)
    model.AddAssumptions(lit_list)

    solver = cp_model.CpSolver()
    from .seed import assert_wire_seed

    solver.parameters.random_seed = assert_wire_seed(int(problem["seed"]))
    solver.parameters.num_search_workers = 1
    solver.parameters.max_time_in_seconds = max(0.05, min(float(problem["max_time_seconds"]), remaining_wall()))

    t0 = time.perf_counter()
    status = solver.Solve(model)
    dt = time.perf_counter() - t0
    if status != cp_model.INFEASIBLE:
        return {
            "result": "FEASIBLE" if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else "SEARCH_INCOMPLETE",
            "nativeStatus": solver.StatusName(status),
            "diagnostics": {
                "purpose": "DIAG_CORE",
                "coreRuleRefs": [],
                "minimality": "NONE",
                "budgetExhausted": False,
                "note": "model_not_infeasible_under_all_assumptions",
            },
            "assignments": _extract_assignments(solver, problem, x) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else [],
            "deterministicSeconds": dt,
        }

    # Sufficient assumption subset — OR-Tools returns literal Index() values, not list positions.
    core_idxs = list(solver.SufficientAssumptionsForInfeasibility())
    idx_to_ref = {lit.Index(): refs[i] for i, lit in enumerate(lit_list)}
    core_refs = [idx_to_ref[i] for i in core_idxs if i in idx_to_ref]

    # Deletion minimisation via genuine re-solves
    working = list(core_refs)
    exhausted = False
    steps = 0
    for ref in list(working):
        if steps >= budget:
            exhausted = True
            break
        steps += 1
        trial = [r for r in working if r != ref]
        m2 = cp_model.CpModel()
        x2, s2, _ = _build_guest_table_vars(m2, problem, require_complete=True)
        lits2 = []
        for rule in rules:
            rref = str(rule["ref"])
            if rref not in trial:
                continue
            lit = m2.NewBoolVar(f"enf2_{rref}")
            lits2.append(lit)
            _attach_rule_literal(m2, problem, x2, s2, rule, lit)
        m2.AddAssumptions(lits2)
        s = cp_model.CpSolver()
        s.parameters.random_seed = assert_wire_seed(int(problem["seed"]) + steps)
        s.parameters.num_search_workers = 1
        s.parameters.max_time_in_seconds = max(0.05, min(2.0, remaining_wall()))
        st = s.Solve(m2)
        if st == cp_model.INFEASIBLE:
            working = trial

    return {
        "result": "INFEASIBLE",
        "nativeStatus": "INFEASIBLE",
        "diagnostics": {
            "purpose": "DIAG_CORE",
            "coreRuleRefs": working,
            "sufficientRefs": core_refs,
            "minimality": "BUDGET_EXHAUSTED" if exhausted else "MINIMAL",
            "budgetExhausted": exhausted,
            "deletionSteps": steps,
        },
        "assignments": [],
        "deterministicSeconds": dt,
        "tiers": [],
    }


def solve_diag_mcs(
    problem: dict[str, Any],
    request: dict[str, Any],
    *,
    emit: ProgressCb,
    remaining_wall: Callable[[], float],
) -> dict[str, Any]:
    rules = _default_relaxable_rules(problem, request)
    emit("diag_mcs", f"rules={len(rules)}")
    model = cp_model.CpModel()
    x, seated, _ = _build_guest_table_vars(model, problem, require_complete=True)
    lits: list[Any] = []
    refs: list[str] = []
    weights: list[int] = []
    for i, rule in enumerate(rules):
        ref = str(rule["ref"])
        lit = model.NewBoolVar(f"mcs_{ref}")
        lits.append(lit)
        refs.append(ref)
        weights.append(int(rule.get("priority", 30)) * 1000 + (len(rules) - i))  # priority + stable index
        _attach_rule_literal(model, problem, x, seated, rule, lit)
    if lits:
        model.Maximize(sum(w * lit for w, lit in zip(weights, lits)))

    solver = cp_model.CpSolver()
    from .seed import assert_wire_seed

    solver.parameters.random_seed = assert_wire_seed(int(problem["seed"]))
    solver.parameters.num_search_workers = 1
    solver.parameters.max_time_in_seconds = max(0.05, min(float(problem["max_time_seconds"]), remaining_wall()))
    t0 = time.perf_counter()
    status = solver.Solve(model)
    dt = time.perf_counter() - t0
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "result": "INFEASIBLE" if status == cp_model.INFEASIBLE else "SEARCH_INCOMPLETE",
            "nativeStatus": solver.StatusName(status),
            "diagnostics": {
                "purpose": "DIAG_MCS",
                "relaxedRuleRefs": refs,
                "enforcedRuleRefs": [],
                "provenOptimal": False,
            },
            "assignments": [],
            "deterministicSeconds": dt,
        }

    enforced = [refs[i] for i, lit in enumerate(lits) if solver.Value(lit) == 1]
    relaxed = [refs[i] for i, lit in enumerate(lits) if solver.Value(lit) == 0]
    assignments = _extract_assignments(solver, problem, x)
    return {
        "result": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
        "nativeStatus": solver.StatusName(status),
        "assignments": assignments,
        "diagnostics": {
            "purpose": "DIAG_MCS",
            "relaxedRuleRefs": relaxed,
            "enforcedRuleRefs": enforced,
            "objectiveValue": int(solver.ObjectiveValue()),
            "bestBound": int(solver.BestObjectiveBound()),
            "provenOptimal": status == cp_model.OPTIMAL,
            "diagnosticOnly": True,
        },
        "deterministicSeconds": dt,
        "tiers": [],
    }


def apply_counterfactual_force(request: dict[str, Any], problem: dict[str, Any]) -> dict[str, Any]:
    """Force a guest's unit onto a target table by intersecting unit domains."""
    cf = request.get("counterfactual") or request.get("diagnostic") or {}
    guest = cf.get("guestIndex")
    table = cf.get("tableIndex")
    if guest is None or table is None:
        return problem
    guest_i = int(guest)
    table_i = int(table)
    guest_to_unit = problem["guest_to_unit"]
    unit = guest_to_unit.get(guest_i)
    if unit is None:
        return problem
    unit_domains = dict(problem["unit_domains"])
    unit_domains[int(unit)] = {table_i} & set(unit_domains.get(int(unit), set()))
    problem = {**problem, "unit_domains": unit_domains}
    return problem
