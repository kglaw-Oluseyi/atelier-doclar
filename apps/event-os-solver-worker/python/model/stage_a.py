"""Stage A: assign together-units to tables under HARD rules."""

from __future__ import annotations

from typing import Any, Callable

from ortools.sat.python import cp_model


ProgressCb = Callable[[str, str | None], None]


def build_stage_a(
    problem: dict[str, Any],
    *,
    maximise_seated: bool = False,
) -> tuple[cp_model.CpModel, dict[str, Any]]:
    """
    Build Stage A CP-SAT model.

    Variables:
      x[u,t] — unit u assigned to table t (bool)
      seated[u] — unit is seated (bool); forced True unless maximise_seated
    """
    model = cp_model.CpModel()
    units: list[dict[str, Any]] = problem["units"]
    tables: list[dict[str, Any]] = problem["tables"]
    unit_domains: dict[int, set[int]] = problem["unit_domains"]
    apart_unit_pairs = problem["apart_unit_pairs"]
    reservations = problem["reservations"]
    guest_to_unit: dict[int, int] = problem["guest_to_unit"]

    table_ids = [int(t["i"]) for t in tables]
    usable = {int(t["i"]): int(t["_usable"]) for t in tables}
    unit_size = {int(u["i"]): len(u["members"]) for u in units}
    unit_ids = [int(u["i"]) for u in units]

    x: dict[tuple[int, int], Any] = {}
    seated: dict[int, Any] = {}

    for u in unit_ids:
        seated[u] = model.NewBoolVar(f"seated_u{u}")
        if not maximise_seated:
            model.Add(seated[u] == 1)
        domain = unit_domains[u]
        for t in table_ids:
            var = model.NewBoolVar(f"x_u{u}_t{t}")
            x[u, t] = var
            if t not in domain:
                model.Add(var == 0)
        # Exactly one table iff seated; else none.
        model.Add(sum(x[u, t] for t in table_ids) == seated[u])

    # Capacity with HOLD withholding.
    # For each table t: sum(size(u)*x[u,t]) + unclaimed_holds(t) <= usable[t]
    holds_by_table: dict[int, list[dict[str, Any]]] = {t: [] for t in table_ids}
    for r in reservations:
        if r["kind"] == "HOLD":
            holds_by_table[r["table"]].append(r)

    for t in table_ids:
        load_terms = [unit_size[u] * x[u, t] for u in unit_ids]
        unclaimed = []
        for r in holds_by_table[t]:
            holder_u = guest_to_unit.get(r["holderGuest"])
            # Seat withheld unless holder unit sits at t.
            if holder_u is None:
                # Holder ineligible → seat permanently withheld.
                unclaimed.append(1)
                continue
            # unclaimed = 1 - x[holder_u, t]  (when holder not at t)
            uc = model.NewBoolVar(f"hold_unclaimed_s{r['seat']}_t{t}")
            model.Add(uc + x[holder_u, t] == 1)
            unclaimed.append(uc)
        model.Add(sum(load_terms) + sum(unclaimed) <= usable[t])

    # Seat-attribute Hall-family projection: for each table and attribute,
    # demand from assigned units cannot exceed supply of seats offering that attr.
    guest_attrs: dict[int, set[str]] = problem.get("guest_attrs") or {}
    seat_attrs: dict[int, set[str]] = problem.get("seat_attrs") or {}
    seats_per_table: dict[int, list[int]] = problem.get("seats_per_table") or {}
    attr_supply: dict[tuple[int, str], int] = {}
    all_attrs: set[str] = set()
    for t, seat_ids in seats_per_table.items():
        for sid in seat_ids:
            for attr in seat_attrs.get(int(sid), set()):
                all_attrs.add(attr)
                attr_supply[(int(t), attr)] = attr_supply.get((int(t), attr), 0) + 1
    unit_attr_demand: dict[int, dict[str, int]] = {}
    for u in units:
        ui = int(u["i"])
        demand: dict[str, int] = {}
        for m in u["members"]:
            for attr in guest_attrs.get(int(m), set()):
                demand[attr] = demand.get(attr, 0) + 1
                all_attrs.add(attr)
        unit_attr_demand[ui] = demand
    for t in table_ids:
        for attr in sorted(all_attrs):
            supply = attr_supply.get((t, attr), 0)
            terms = []
            for u in unit_ids:
                need = unit_attr_demand.get(u, {}).get(attr, 0)
                if need:
                    terms.append(need * x[u, t])
            if terms:
                model.Add(sum(terms) <= supply)

    # Apart pairs
    for ua, ub in apart_unit_pairs:
        for t in table_ids:
            model.AddBoolOr([x[ua, t].Not(), x[ub, t].Not()])

    # GUARANTEE: holder unit must sit at reserved table (when seated / always if not diag).
    for r in reservations:
        if r["kind"] != "GUARANTEE":
            continue
        hu = guest_to_unit[r["holderGuest"]]
        ht = r["table"]
        if maximise_seated:
            model.Add(x[hu, ht] == seated[hu])
        else:
            model.Add(x[hu, ht] == 1)

    # Movement objective helpers: per-unit baseline table (majority / first member with baseline).
    baseline_by_guest: dict[int, dict[str, int]] = problem["baseline_by_guest"]
    unit_baseline_table: dict[int, int | None] = {}
    for u in units:
        ui = int(u["i"])
        tables_seen: list[int] = []
        for m in u["members"]:
            b = baseline_by_guest.get(int(m))
            if b is not None:
                tables_seen.append(b["table"])
        unit_baseline_table[ui] = tables_seen[0] if tables_seen else None

    moved_flags: list[Any] = []
    for u in unit_ids:
        bt = unit_baseline_table[u]
        if bt is None:
            continue
        # moved if seated and not at baseline table
        if (u, bt) not in x:
            moved_flags.append(seated[u])
            continue
        moved = model.NewBoolVar(f"moved_u{u}")
        # moved == seated AND NOT x[u,bt]
        model.Add(moved <= seated[u])
        model.Add(moved <= x[u, bt].Not())
        model.Add(moved >= seated[u] - x[u, bt])
        moved_flags.append(moved)

    movement_var = model.NewIntVar(0, len(unit_ids), "a1_movement")
    if moved_flags:
        model.Add(movement_var == sum(moved_flags))
    else:
        model.Add(movement_var == 0)

    # Preference penalty: unmet guest→table prefs (only for seated guests).
    pref_terms: list[Any] = []
    pref_cap = 0
    for p in problem["preferences"]:
        g = p["guest"]
        u = guest_to_unit.get(g)
        if u is None:
            continue
        t = p["table"]
        w = int(p["weight"])
        if (u, t) not in x:
            continue
        unmet = model.NewBoolVar(f"unmet_g{g}_t{t}")
        model.Add(unmet <= seated[u])
        model.Add(unmet <= x[u, t].Not())
        model.Add(unmet >= seated[u] - x[u, t])
        pref_terms.append(w * unmet)
        pref_cap += w

    preference_var = model.NewIntVar(0, max(1, pref_cap), "a2_preference")
    if pref_terms:
        model.Add(preference_var == sum(pref_terms))
    else:
        model.Add(preference_var == 0)

    seated_count_var = model.NewIntVar(0, sum(unit_size.values()), "seated_count")
    model.Add(seated_count_var == sum(unit_size[u] * seated[u] for u in unit_ids))

    ctx = {
        "x": x,
        "seated": seated,
        "unit_ids": unit_ids,
        "table_ids": table_ids,
        "unit_size": unit_size,
        "unit_baseline_table": unit_baseline_table,
        "movement_expr": movement_var,
        "preference_expr": preference_var,
        "seated_count_expr": seated_count_var,
        "maximise_seated": maximise_seated,
    }
    return model, ctx


def extract_unit_assignment(solver: cp_model.CpSolver, ctx: dict[str, Any]) -> dict[int, int]:
    """unit → table for seated units."""
    out: dict[int, int] = {}
    for u in ctx["unit_ids"]:
        if solver.Value(ctx["seated"][u]) != 1:
            continue
        for t in ctx["table_ids"]:
            if solver.Value(ctx["x"][u, t]) == 1:
                out[u] = t
                break
    return out


def guest_table_assignment(
    problem: dict[str, Any],
    unit_to_table: dict[int, int],
) -> dict[int, int]:
    out: dict[int, int] = {}
    for u in problem["units"]:
        ui = int(u["i"])
        if ui not in unit_to_table:
            continue
        t = unit_to_table[ui]
        for m in u["members"]:
            out[int(m)] = t
    return out
