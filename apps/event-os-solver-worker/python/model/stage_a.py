"""Stage A: assign together-units to tables under HARD rules.

Uses sparse unit→table booleans for core units, and exact aggregation of
interchangeable singleton guests into class-count integer variables.
"""

from __future__ import annotations

from typing import Any, Callable

from ortools.sat.python import cp_model


ProgressCb = Callable[[str, str | None], None]


def _guest_has_preference(guest: int, preferences: list[dict[str, Any]]) -> bool:
    return any(int(p["guest"]) == guest for p in preferences)


def _guest_has_baseline(guest: int, baseline_by_guest: dict[int, dict[str, int]]) -> bool:
    return int(guest) in baseline_by_guest


def _guest_is_reservation_holder(guest: int, reservations: list[dict[str, Any]]) -> bool:
    return any(int(r.get("holderGuest", -1)) == int(guest) for r in reservations)


def aggregation_equivalence_key(
    *,
    domain: tuple[int, ...],
    attrs: tuple[str, ...],
) -> tuple[Any, ...]:
    """
    Equivalence key for interchangeable singleton aggregation.

    Guests sharing a key must be interchangeable for Stage A capacity/domain
    decisions. See AGGREGATION_EQUIVALENCE.md for fields that force core
    (non-aggregated) treatment instead of appearing in this key.
    """
    return (domain, attrs)


def _partition_units(problem: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Split units into core (boolean assignment) and aggregation classes.

    A singleton unit is aggregatable only when it has no material distinguishing
    solver characteristic (see AGGREGATION_EQUIVALENCE.md). Classes are keyed by
    aggregation_equivalence_key(domain, attrs).
    """
    units: list[dict[str, Any]] = problem["units"]
    unit_domains: dict[int, set[int]] = problem["unit_domains"]
    guest_attrs: dict[int, set[str]] = problem.get("guest_attrs") or {}
    locked_seat: dict[int, int] = problem.get("locked_seat") or {}
    locked_table: dict[int, int] = problem.get("locked_table") or {}
    preferences = problem.get("preferences") or []
    reservations = problem.get("reservations") or []
    baseline_by_guest: dict[int, dict[str, int]] = problem.get("baseline_by_guest") or {}
    apart_unit_pairs = problem.get("apart_unit_pairs") or set()

    apart_units: set[int] = set()
    for ua, ub in apart_unit_pairs:
        apart_units.add(int(ua))
        apart_units.add(int(ub))

    core: list[dict[str, Any]] = []
    buckets: dict[tuple[Any, ...], list[dict[str, Any]]] = {}

    for u in units:
        ui = int(u["i"])
        members = [int(m) for m in u["members"]]
        # Multi-member together-units are never aggregated.
        if len(members) != 1:
            core.append(u)
            continue
        g = members[0]
        if (
            g in locked_seat
            or g in locked_table
            or _guest_has_preference(g, preferences)
            or _guest_has_baseline(g, baseline_by_guest)
            or _guest_is_reservation_holder(g, reservations)
            or ui in apart_units
        ):
            core.append(u)
            continue
        domain = tuple(sorted(unit_domains[ui]))
        attrs = tuple(sorted(guest_attrs.get(g, set())))
        key = aggregation_equivalence_key(domain=domain, attrs=attrs)
        buckets.setdefault(key, []).append(u)

    classes: list[dict[str, Any]] = []
    for idx, ((domain, attrs), members_units) in enumerate(
        sorted(buckets.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    ):
        if len(members_units) == 1:
            # No gain — keep as core bool unit.
            core.append(members_units[0])
            continue
        guest_ids = sorted(int(u["members"][0]) for u in members_units)
        classes.append(
            {
                "i": idx,
                "domain": list(domain),
                "attrs": list(attrs),
                "guests": guest_ids,
                "size": len(guest_ids),
                "sourceUnits": [int(u["i"]) for u in members_units],
                "equivalenceKey": ["domain", "attrs"],
            }
        )
    # Stable core order by unit index
    core.sort(key=lambda u: int(u["i"]))
    return core, classes


def build_stage_a(
    problem: dict[str, Any],
    *,
    maximise_seated: bool = False,
) -> tuple[cp_model.CpModel, dict[str, Any]]:
    model = cp_model.CpModel()
    tables: list[dict[str, Any]] = problem["tables"]
    unit_domains: dict[int, set[int]] = problem["unit_domains"]
    apart_unit_pairs = problem["apart_unit_pairs"]
    reservations = problem["reservations"]
    guest_to_unit: dict[int, int] = problem["guest_to_unit"]

    table_ids = [int(t["i"]) for t in tables]
    usable = {int(t["i"]): int(t["_usable"]) for t in tables}

    core_units, agg_classes = _partition_units(problem)
    core_ids = [int(u["i"]) for u in core_units]
    core_size = {int(u["i"]): len(u["members"]) for u in core_units}

    x: dict[tuple[int, int], Any] = {}
    seated: dict[int, Any] = {}
    domain_of: dict[int, list[int]] = {}

    for u in core_units:
        ui = int(u["i"])
        domain = sorted(unit_domains[ui])
        domain_of[ui] = domain
        seated[ui] = model.NewBoolVar(f"seated_u{ui}")
        if not maximise_seated:
            model.Add(seated[ui] == 1)
        for t in domain:
            x[ui, t] = model.NewBoolVar(f"x_u{ui}_t{t}")
        if domain:
            model.Add(sum(x[ui, t] for t in domain) == seated[ui])
        else:
            model.Add(seated[ui] == 0)

    # Class-count integers: n[c,t] guests of class c at table t.
    n: dict[tuple[int, int], Any] = {}
    class_seated: dict[int, Any] = {}
    for c in agg_classes:
        ci = int(c["i"])
        size = int(c["size"])
        domain = list(c["domain"])
        class_seated[ci] = model.NewIntVar(0, size, f"class_seated_{ci}")
        if not maximise_seated:
            model.Add(class_seated[ci] == size)
        for t in domain:
            n[ci, t] = model.NewIntVar(0, size, f"n_c{ci}_t{t}")
        if domain:
            model.Add(sum(n[ci, t] for t in domain) == class_seated[ci])
        else:
            model.Add(class_seated[ci] == 0)

    # Capacity
    holds_by_table: dict[int, list[dict[str, Any]]] = {t: [] for t in table_ids}
    for r in reservations:
        if r["kind"] == "HOLD":
            holds_by_table[r["table"]].append(r)

    for t in table_ids:
        load_terms = [core_size[u] * x[u, t] for u in core_ids if (u, t) in x]
        load_terms.extend(n[ci, t] for ci, tt in n if tt == t)
        unclaimed = []
        for r in holds_by_table[t]:
            holder_u = guest_to_unit.get(r["holderGuest"])
            if holder_u is None or (holder_u, t) not in x:
                unclaimed.append(1)
                continue
            uc = model.NewBoolVar(f"hold_unclaimed_s{r['seat']}_t{t}")
            model.Add(uc + x[holder_u, t] == 1)
            unclaimed.append(uc)
        if load_terms or unclaimed:
            model.Add(sum(load_terms) + sum(unclaimed) <= usable[t])

    # Hall-family on attributes (core + classes).
    # Locked seats are exclusive to their holder unit — they must not count as free
    # supply for other units (prevents Stage A feasible / Stage B DECOMPOSITION_GAP).
    guest_attrs: dict[int, set[str]] = problem.get("guest_attrs") or {}
    seat_attrs: dict[int, set[str]] = problem.get("seat_attrs") or {}
    seats_per_table: dict[int, list[int]] = problem.get("seats_per_table") or {}
    locked_seat: dict[int, int] = problem.get("locked_seat") or {}
    seat_to_guest_lock: dict[int, int] = {int(sid): int(g) for g, sid in locked_seat.items()}
    guest_to_unit_idx: dict[int, int] = problem.get("guest_to_unit") or {}

    free_attr_supply: dict[tuple[int, str], int] = {}
    locked_attr_bonus: dict[tuple[int, int, str], int] = {}  # (unit, table, attr) → count
    all_attrs: set[str] = set()
    for t, seat_ids in seats_per_table.items():
        for sid in seat_ids:
            sid_i = int(sid)
            attrs = seat_attrs.get(sid_i, set())
            for attr in attrs:
                all_attrs.add(attr)
                if sid_i in seat_to_guest_lock:
                    holder = seat_to_guest_lock[sid_i]
                    hu = guest_to_unit_idx.get(holder)
                    if hu is not None:
                        key = (int(hu), int(t), attr)
                        locked_attr_bonus[key] = locked_attr_bonus.get(key, 0) + 1
                else:
                    free_attr_supply[(int(t), attr)] = free_attr_supply.get((int(t), attr), 0) + 1

    core_attr_demand: dict[int, dict[str, int]] = {}
    for u in core_units:
        ui = int(u["i"])
        demand: dict[str, int] = {}
        for m in u["members"]:
            for attr in guest_attrs.get(int(m), set()):
                demand[attr] = demand.get(attr, 0) + 1
                all_attrs.add(attr)
        core_attr_demand[ui] = demand

    for t in table_ids:
        for attr in sorted(all_attrs):
            supply = free_attr_supply.get((t, attr), 0)
            terms = []
            for u in core_ids:
                need = core_attr_demand.get(u, {}).get(attr, 0)
                bonus = locked_attr_bonus.get((u, t, attr), 0)
                # Locked seats only satisfy the holder unit's own demand — never free supply.
                net = max(0, need - bonus)
                if net > 0 and (u, t) in x:
                    terms.append(net * x[u, t])
            for c in agg_classes:
                ci = int(c["i"])
                if attr in c["attrs"] and (ci, t) in n:
                    terms.append(n[ci, t])
            if terms:
                model.Add(sum(terms) <= supply)

    # Apart — core only (aggregated guests excluded from apart by construction).
    for ua, ub in apart_unit_pairs:
        shared = set(domain_of.get(ua, [])) & set(domain_of.get(ub, []))
        for t in shared:
            if (ua, t) in x and (ub, t) in x:
                model.AddBoolOr([x[ua, t].Not(), x[ub, t].Not()])

    # GUARANTEE (core holders only)
    for r in reservations:
        if r["kind"] != "GUARANTEE":
            continue
        hu = guest_to_unit[r["holderGuest"]]
        ht = r["table"]
        if (hu, ht) not in x:
            raise ValueError(f"GUARANTEE table {ht} outside unit {hu} domain")
        if maximise_seated:
            model.Add(x[hu, ht] == seated[hu])
        else:
            model.Add(x[hu, ht] == 1)

    baseline_by_guest: dict[int, dict[str, int]] = problem["baseline_by_guest"]
    unit_baseline_table: dict[int, int | None] = {}
    for u in core_units:
        ui = int(u["i"])
        tables_seen: list[int] = []
        for m in u["members"]:
            b = baseline_by_guest.get(int(m))
            if b is not None:
                tables_seen.append(b["table"])
        unit_baseline_table[ui] = tables_seen[0] if tables_seen else None

    moved_flags: list[Any] = []
    for u in core_ids:
        bt = unit_baseline_table.get(u)
        if bt is None:
            continue
        if (u, bt) not in x:
            moved_flags.append(seated[u])
            continue
        moved = model.NewBoolVar(f"moved_u{u}")
        model.Add(moved <= seated[u])
        model.Add(moved <= x[u, bt].Not())
        model.Add(moved >= seated[u] - x[u, bt])
        moved_flags.append(moved)

    # Aggregated movement: count guests not at baseline table.
    for c in agg_classes:
        ci = int(c["i"])
        for g in c["guests"]:
            b = baseline_by_guest.get(int(g))
            if b is None:
                continue
            bt = b["table"]
            if (ci, bt) not in n:
                moved_flags.append(1)
                continue
            # moved if not placed at bt — approximate with class flow:
            # per-guest movement for aggregated baseline is rare in B_TYPICAL (no baseline).
            # Exact: cannot track per-guest without expanding; skip when no baseline (common).
            pass

    movement_var = model.NewIntVar(0, len(problem["units"]), "a1_movement")
    if moved_flags:
        model.Add(movement_var == sum(moved_flags))
    else:
        model.Add(movement_var == 0)

    # Preferences — only core guests (aggregated have none by construction).
    pref_terms: list[Any] = []
    pref_cap = 0
    unmet_bools = 0
    for p in problem["preferences"]:
        g = p["guest"]
        u = guest_to_unit.get(g)
        if u is None or u not in seated:
            # Aggregated or missing — skip (no prefs on aggregated).
            continue
        t = p["table"]
        w = int(p["weight"])
        if (u, t) not in x:
            if maximise_seated:
                unmet = model.NewBoolVar(f"unmet_g{g}_t{t}")
                model.Add(unmet == seated[u])
                pref_terms.append(w * unmet)
                unmet_bools += 1
            else:
                pref_terms.append(w)
            pref_cap += w
            continue
        unmet = model.NewBoolVar(f"unmet_g{g}_t{t}")
        model.Add(unmet <= seated[u])
        model.Add(unmet <= x[u, t].Not())
        model.Add(unmet >= seated[u] - x[u, t])
        pref_terms.append(w * unmet)
        pref_cap += w
        unmet_bools += 1

    preference_var = model.NewIntVar(0, max(1, pref_cap), "a2_preference")
    if pref_terms:
        model.Add(preference_var == sum(pref_terms))
    else:
        model.Add(preference_var == 0)

    seated_count_var = model.NewIntVar(0, sum(len(u["members"]) for u in problem["units"]), "seated_count")
    seated_expr_terms = [core_size[u] * seated[u] for u in core_ids]
    seated_expr_terms.extend(class_seated[int(c["i"])] for c in agg_classes)
    model.Add(seated_count_var == sum(seated_expr_terms) if seated_expr_terms else 0)

    ctx = {
        "x": x,
        "n": n,
        "seated": seated,
        "class_seated": class_seated,
        "unit_ids": core_ids,
        "table_ids": table_ids,
        "domain_of": domain_of,
        "unit_size": core_size,
        "agg_classes": agg_classes,
        "unit_baseline_table": unit_baseline_table,
        "movement_expr": movement_var,
        "preference_expr": preference_var,
        "seated_count_expr": seated_count_var,
        "maximise_seated": maximise_seated,
        "model_stats": {
            "boolAssignmentVars": len(x),
            "classCountVars": len(n),
            "coreUnits": len(core_ids),
            "aggClasses": len(agg_classes),
            "aggGuests": sum(int(c["size"]) for c in agg_classes),
            "seatedVars": len(seated),
            "movedVars": len(moved_flags),
            "unmetPrefVars": unmet_bools,
            "domainSum": sum(len(d) for d in domain_of.values()) + sum(len(c["domain"]) for c in agg_classes),
            "apartPairs": len(list(apart_unit_pairs)),
            "preferenceTerms": len(problem["preferences"]),
            "tables": len(table_ids),
            "units": len(problem["units"]),
        },
    }
    return model, ctx


def extract_unit_assignment(solver: cp_model.CpSolver, ctx: dict[str, Any]) -> dict[int, int]:
    """unit → table for seated core units (aggregation expanded separately)."""
    out: dict[int, int] = {}
    domain_of: dict[int, list[int]] = ctx.get("domain_of") or {}
    for u in ctx["unit_ids"]:
        if solver.Value(ctx["seated"][u]) != 1:
            continue
        tables = domain_of.get(u) or ctx["table_ids"]
        for t in tables:
            var = ctx["x"].get((u, t))
            if var is not None and solver.Value(var) == 1:
                out[u] = t
                break
    return out


def expand_guest_table_assignment(
    problem: dict[str, Any],
    ctx: dict[str, Any],
    solver: cp_model.CpSolver,
    core_unit_to_table: dict[int, int],
) -> dict[int, int]:
    """Map every seated guest → table, expanding aggregation classes deterministically."""
    out: dict[int, int] = {}
    guest_to_unit = problem["guest_to_unit"]
    # Core units
    for u in problem["units"]:
        ui = int(u["i"])
        if ui not in core_unit_to_table:
            continue
        t = core_unit_to_table[ui]
        for m in u["members"]:
            out[int(m)] = t

    # Aggregated classes: place guests in sorted order onto tables by counts.
    n = ctx.get("n") or {}
    for c in ctx.get("agg_classes") or []:
        ci = int(c["i"])
        guests = list(c["guests"])
        cursor = 0
        for t in c["domain"]:
            var = n.get((ci, t))
            if var is None:
                continue
            count = int(solver.Value(var))
            for _ in range(count):
                out[int(guests[cursor])] = t
                cursor += 1
        if cursor != len(guests) and int(solver.Value(ctx["class_seated"][ci])) == len(guests):
            raise RuntimeError(f"aggregation expansion mismatch class={ci}")
    return out


def guest_table_assignment(
    problem: dict[str, Any],
    unit_to_table: dict[int, int],
) -> dict[int, int]:
    """Legacy helper for maximise path without aggregation expansion."""
    out: dict[int, int] = {}
    for u in problem["units"]:
        ui = int(u["i"])
        if ui not in unit_to_table:
            continue
        t = unit_to_table[ui]
        for m in u["members"]:
            out[int(m)] = t
    return out
