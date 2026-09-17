"""Stage B: per-table seat assignment after Stage A."""

from __future__ import annotations

from typing import Any, Callable

from ortools.sat.python import cp_model


ProgressCb = Callable[[str, str | None], None]


def seat_compatible(guest_attrs: set[str], seat_attrs: set[str]) -> bool:
    """Seat must provide every attribute the guest requires (guest attrs ⊆ seat attrs when guest has attrs)."""
    if not guest_attrs:
        return True
    return guest_attrs.issubset(seat_attrs)


def solve_stage_b_for_table(
    problem: dict[str, Any],
    table: int,
    guests_at_table: list[int],
    *,
    seed: int,
    max_time: float,
    workers: int,
    progress: ProgressCb | None = None,
) -> tuple[str, dict[int, int], dict[str, Any]]:
    """
    Assign seats for one table.
    Returns (product_like_status, guest→seat, tier_info).
    product_like_status: OPTIMAL | FEASIBLE | INFEASIBLE | SEARCH_INCOMPLETE | TIMED_OUT | SOLVER_FAULT
    """
    if not guests_at_table:
        return "OPTIMAL", {}, {
            "seatMovement": {"value": 0, "proven": True},
            "seatPreference": {"value": 0, "proven": True},
        }

    seats = problem["seats_per_table"][table]
    guest_attrs = problem["guest_attrs"]
    seat_attrs = problem["seat_attrs"]
    locked_seat = problem["locked_seat"]
    reservations = [r for r in problem["reservations"] if r["table"] == table]
    baseline = problem["baseline_by_guest"]

    model = cp_model.CpModel()
    y: dict[tuple[int, int], Any] = {}

    for g in guests_at_table:
        eligible_seats = [s for s in seats if seat_compatible(guest_attrs.get(g, set()), seat_attrs.get(s, set()))]
        if g in locked_seat:
            ls = locked_seat[g]
            if ls not in seats:
                return "INFEASIBLE", {}, {"fault": "LOCK_SEAT_WRONG_TABLE"}
            eligible_seats = [ls]
        for r in reservations:
            if r["kind"] == "GUARANTEE" and r["holderGuest"] == g:
                eligible_seats = [r["seat"]] if r["seat"] in eligible_seats or r["seat"] in seats else []
                if r["seat"] in seats:
                    eligible_seats = [r["seat"]]
        if not eligible_seats:
            return "INFEASIBLE", {}, {"fault": "NO_COMPATIBLE_SEAT"}
        for s in seats:
            var = model.NewBoolVar(f"y_g{g}_s{s}")
            y[g, s] = var
            if s not in eligible_seats:
                model.Add(var == 0)
        model.Add(sum(y[g, s] for s in seats) == 1)

    for s in seats:
        # HOLD: only holder may occupy; if holder not at this table, seat stays empty.
        hold = next((r for r in reservations if r["kind"] == "HOLD" and r["seat"] == s), None)
        guarantee = next((r for r in reservations if r["kind"] == "GUARANTEE" and r["seat"] == s), None)
        occupants = [y[g, s] for g in guests_at_table if (g, s) in y]
        if not occupants:
            continue
        if hold is not None:
            holder = hold["holderGuest"]
            if holder in guests_at_table:
                # At most holder; others forbidden already by summing only if we constrain.
                for g in guests_at_table:
                    if g != holder and (g, s) in y:
                        model.Add(y[g, s] == 0)
                model.Add(sum(occupants) <= 1)
            else:
                model.Add(sum(occupants) == 0)
        elif guarantee is not None:
            holder = guarantee["holderGuest"]
            if holder in guests_at_table:
                model.Add(y[holder, s] == 1)
            model.Add(sum(occupants) <= 1)
        else:
            model.Add(sum(occupants) <= 1)

    # Seat movement
    move_flags: list[Any] = []
    forced_moves = 0
    for g in guests_at_table:
        b = baseline.get(g)
        if b is None:
            continue
        bs = b["seat"]
        if (g, bs) not in y:
            forced_moves += 1
            continue
        moved = model.NewBoolVar(f"seat_moved_g{g}")
        model.Add(moved == y[g, bs].Not())
        move_flags.append(moved)

    movement_var = model.NewIntVar(0, len(guests_at_table), "b_seat_movement")
    if move_flags:
        model.Add(movement_var == sum(move_flags) + forced_moves)
    else:
        model.Add(movement_var == forced_moves)

    preference_var = model.NewIntVar(0, 1, "b_seat_preference")
    model.Add(preference_var == 0)

    solver = cp_model.CpSolver()
    solver.parameters.random_seed = seed
    solver.parameters.num_search_workers = workers
    solver.parameters.max_time_in_seconds = max_time

    model.Minimize(movement_var)
    if progress:
        progress("stage_b", f"table={table} guests={len(guests_at_table)} seat_move")
    st1 = solver.Solve(model)
    if st1 not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        name = solver.StatusName(st1)
        if st1 == cp_model.INFEASIBLE:
            return "INFEASIBLE", {}, {"native": name}
        if st1 == cp_model.UNKNOWN:
            return "SEARCH_INCOMPLETE", {}, {"native": name}
        return "SOLVER_FAULT", {}, {"native": name}

    move_val = int(solver.Value(movement_var))
    move_proven = st1 == cp_model.OPTIMAL

    model.Add(movement_var <= move_val)
    model.Minimize(preference_var)
    if progress:
        progress("stage_b", f"table={table} seat_pref")
    st2 = solver.Solve(model)
    if st2 not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return "INFEASIBLE", {}, {"native": solver.StatusName(st2), "phase": "seat_pref"}

    pref_val = int(solver.Value(preference_var))
    assignment: dict[int, int] = {}
    for g in guests_at_table:
        for s in seats:
            if solver.Value(y[g, s]) == 1:
                assignment[g] = s
                break

    overall = "OPTIMAL" if (move_proven and st2 == cp_model.OPTIMAL) else "FEASIBLE"
    return overall, assignment, {
        "seatMovement": {
            "value": move_val,
            "proven": move_proven,
            "bound": int(solver.BestObjectiveBound()) if st2 in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
        },
        "seatPreference": {"value": pref_val, "proven": st2 == cp_model.OPTIMAL},
    }
