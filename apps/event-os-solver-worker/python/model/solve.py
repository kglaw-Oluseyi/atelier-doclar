"""Orchestrate Stage A lexicographic solve + Stage B seat assignment."""

from __future__ import annotations

import resource
import sys
import time
from typing import Any, Callable

import ortools
from ortools.sat.python import cp_model

from .stage_a import build_stage_a, extract_unit_assignment, expand_guest_table_assignment, guest_table_assignment
from .stage_b import solve_stage_b_for_table
from .status import map_native_status, tier_record
from .validate import MODEL_VERSION, RESPONSE_CONTRACT, InvalidInput, prepare_problem

ProgressCb = Callable[[str, str | None], None]


def peak_rss_kb() -> int:
    usage = resource.getrusage(resource.RUSAGE_SELF)
    rss = usage.ru_maxrss
    if sys.platform == "darwin":
        return int(rss / 1024)
    return int(rss)


def _engine() -> dict[str, Any]:
    return {
        "ortools": ortools.__version__,
        "python": sys.version.split()[0],
        "model": MODEL_VERSION,
    }


def _configure_solver(solver: cp_model.CpSolver, problem: dict[str, Any], budget: float) -> None:
    from .seed import assert_wire_seed

    seed = assert_wire_seed(int(problem["seed"]))
    solver.parameters.random_seed = seed
    solver.parameters.num_search_workers = int(problem["workers"])
    solver.parameters.max_time_in_seconds = float(max(0.01, budget))


def _stop_reason(status: int) -> str:
    if status == cp_model.OPTIMAL:
        return "OPTIMAL"
    if status == cp_model.FEASIBLE:
        return "FEASIBLE_INCUMBENT"
    if status == cp_model.INFEASIBLE:
        return "INFEASIBLE"
    if status == cp_model.UNKNOWN:
        return "DETERMINISTIC_BUDGET"
    if status == cp_model.MODEL_INVALID:
        return "MODEL_INVALID"
    return "OTHER"


def _native_name(status: int) -> str:
    return {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
        cp_model.UNKNOWN: "UNKNOWN",
    }.get(status, str(status))


def _final(
    problem: dict[str, Any],
    result: str,
    fault: str | None,
    tiers: list[dict[str, Any]],
    assignments: list[dict[str, int]],
    native_status: int,
    det_spent: float,
    wall0: float,
    diagnostics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "contractVersion": RESPONSE_CONTRACT,
        "modelVersion": MODEL_VERSION,
        "runId": problem.get("runId"),
        "result": result,
        "nativeStatus": _native_name(native_status),
        "faultCode": fault,
        "assignments": assignments,
        "assignmentCount": len(assignments),
        "tiers": tiers,
        "proofState": {
            "allTiersProven": bool(tiers) and all(bool(t.get("proven")) for t in tiers),
            "tiers": {t["tier"]: bool(t.get("proven")) for t in tiers},
        },
        "deterministicSeconds": round(det_spent, 6),
        "wallSeconds": round(time.perf_counter() - wall0, 6),
        "engine": _engine(),
        "resources": {"peakRssKb": peak_rss_kb()},
        "purpose": problem.get("purpose"),
        "mode": problem.get("mode"),
    }
    if diagnostics:
        payload["diagnostics"] = diagnostics
    if problem.get("_model_stats"):
        payload["modelStats"] = problem["_model_stats"]
    if problem.get("_profile"):
        payload["profile"] = problem["_profile"]
    return payload


def _run_stage_b(
    problem: dict[str, Any],
    guest_to_table: dict[int, int],
    emit: ProgressCb,
    remaining_wall: Callable[[], float],
    det_budget: float,
    det_spent: float,
) -> tuple[list[dict[str, int]], list[dict[str, Any]], str | None]:
    by_table: dict[int, list[int]] = {}
    for g, t in guest_to_table.items():
        by_table.setdefault(t, []).append(g)

    assignments: list[dict[str, int]] = []
    tiers: list[dict[str, Any]] = []
    total_move = 0
    total_pref = 0
    all_move_proven = True
    all_pref_proven = True
    t_wall0 = time.perf_counter()

    emit("stage_b", f"tables={len(by_table)}")
    n_tables = max(1, len(by_table))
    for table, guests in sorted(by_table.items()):
        budget = min(max(0.05, (det_budget - det_spent) / n_tables), remaining_wall())
        status, seat_map, info = solve_stage_b_for_table(
            problem,
            table,
            sorted(guests),
            seed=int(problem["seed"]) + int(table),
            max_time=budget,
            workers=int(problem["workers"]),
            progress=emit,
        )
        # Stage B failure after Stage A ⇒ DECOMPOSITION_GAP (never product INFEASIBLE).
        if status not in {"OPTIMAL", "FEASIBLE"}:
            return [], tiers, "DECOMPOSITION_GAP"

        for g, s in seat_map.items():
            assignments.append({"guest": g, "table": table, "seat": s})
        sm = info.get("seatMovement", {})
        sp = info.get("seatPreference", {})
        total_move += int(sm.get("value") or 0)
        total_pref += int(sp.get("value") or 0)
        all_move_proven = all_move_proven and bool(sm.get("proven"))
        all_pref_proven = all_pref_proven and bool(sp.get("proven"))

    dt = time.perf_counter() - t_wall0
    tiers.append(
        tier_record(
            name="B_seat_movement",
            value=total_move,
            bound=total_move if all_move_proven else None,
            proven=all_move_proven,
            deterministic_seconds=dt,
            wall_seconds=dt,
            stop_reason="OPTIMAL" if all_move_proven else "FEASIBLE_INCUMBENT",
        )
    )
    tiers.append(
        tier_record(
            name="B_seat_preference",
            value=total_pref,
            bound=total_pref if all_pref_proven else None,
            proven=all_pref_proven,
            deterministic_seconds=0.0,
            wall_seconds=dt,
            stop_reason="OPTIMAL" if all_pref_proven else "FEASIBLE_INCUMBENT",
        )
    )
    assignments.sort(key=lambda a: a["guest"])
    return assignments, tiers, None


def solve_request(
    request: dict[str, Any],
    *,
    progress: ProgressCb | None = None,
    wall_deadline: float | None = None,
    stop_controller: Any | None = None,
) -> dict[str, Any]:
    """Run production Stage A + Stage B solve (or diagnostic purposes)."""

    def emit(phase: str, detail: str | None = None) -> None:
        if progress:
            progress(phase, detail)

    wall0 = time.perf_counter()
    wall_limit = float((request.get("limits") or {}).get("wallSeconds", 60))
    if wall_deadline is None:
        wall_deadline = wall0 + wall_limit

    def remaining_wall() -> float:
        return max(0.01, wall_deadline - time.perf_counter())

    def wall_hit() -> bool:
        return time.perf_counter() >= wall_deadline

    try:
        problem = prepare_problem(request)
    except InvalidInput as exc:
        return {
            "contractVersion": RESPONSE_CONTRACT,
            "modelVersion": MODEL_VERSION,
            "runId": request.get("runId"),
            "result": "INVALID_INPUT",
            "faultCode": exc.code,
            "error": exc.message,
            "engine": _engine(),
            "resources": {"peakRssKb": peak_rss_kb()},
            "tiers": [],
            "assignments": [],
            "proofState": {"allTiersProven": False, "tiers": {}},
        }

    # Preserve raw together/apart for diagnostic rule derivation.
    problem["together_pairs"] = list(request.get("togetherPairs") or [])

    purpose = str(problem.get("purpose") or request.get("purpose") or "PLANNING")
    known = {
        "PLANNING",
        "QUALIFICATION",
        "EVENT_DAY_REPAIR",
        "SHADOW",
        "COUNTERFACTUAL",
        "DIAG_CORE",
        "DIAG_MCS",
        "DIAG_MAXSEAT",
    }
    if purpose.startswith("DIAG_") and purpose not in known:
        return {
            "contractVersion": RESPONSE_CONTRACT,
            "modelVersion": MODEL_VERSION,
            "runId": request.get("runId"),
            "result": "INVALID_INPUT",
            "faultCode": "UNKNOWN_DIAGNOSTIC_PURPOSE",
            "error": f"unknown diagnostic purpose {purpose}",
            "engine": _engine(),
            "resources": {"peakRssKb": peak_rss_kb()},
            "tiers": [],
            "assignments": [],
            "proofState": {"allTiersProven": False, "tiers": {}},
        }

    # Counterfactual: force unit onto table before any model build.
    if purpose == "COUNTERFACTUAL" or request.get("counterfactual"):
        from .diagnostic_models import apply_counterfactual_force

        problem = apply_counterfactual_force(request, problem)
        purpose = "PLANNING" if purpose == "COUNTERFACTUAL" else purpose
        problem["purpose"] = purpose

    if purpose == "DIAG_CORE":
        from .diagnostic_models import solve_diag_core

        emit("diag", "DIAG_CORE")
        raw = solve_diag_core(problem, request, emit=emit, remaining_wall=remaining_wall)
        return _final(
            problem,
            raw.get("result", "SOLVER_FAULT"),
            None,
            raw.get("tiers") or [],
            raw.get("assignments") or [],
            cp_model.INFEASIBLE if raw.get("result") == "INFEASIBLE" else cp_model.UNKNOWN,
            float(raw.get("deterministicSeconds") or 0.0),
            wall0,
            diagnostics=raw.get("diagnostics"),
        )

    if purpose == "DIAG_MCS":
        from .diagnostic_models import solve_diag_mcs

        emit("diag", "DIAG_MCS")
        raw = solve_diag_mcs(problem, request, emit=emit, remaining_wall=remaining_wall)
        native = {
            "OPTIMAL": cp_model.OPTIMAL,
            "FEASIBLE": cp_model.FEASIBLE,
            "INFEASIBLE": cp_model.INFEASIBLE,
        }.get(str(raw.get("result")), cp_model.UNKNOWN)
        return _final(
            problem,
            raw.get("result", "SOLVER_FAULT"),
            None,
            raw.get("tiers") or [],
            raw.get("assignments") or [],
            native,
            float(raw.get("deterministicSeconds") or 0.0),
            wall0,
            diagnostics=raw.get("diagnostics"),
        )

    maximise = purpose == "DIAG_MAXSEAT"
    det_budget = float(problem["max_time_seconds"])
    det_spent = 0.0
    tiers: list[dict[str, Any]] = []

    emit("model_build", f"units={len(problem['units'])} tables={len(problem['tables'])}")
    t_build0 = time.perf_counter()
    model, ctx = build_stage_a(problem, maximise_seated=maximise)
    build_seconds = time.perf_counter() - t_build0
    solver = cp_model.CpSolver()
    if stop_controller is not None and hasattr(stop_controller, "bind_solver"):
        stop_controller.bind_solver(solver)
    model_stats = dict(ctx.get("model_stats") or {})
    try:
        proto = model.Proto()
        model_stats["protoVariables"] = len(proto.variables)
        model_stats["protoConstraints"] = len(proto.constraints)
    except Exception:  # noqa: BLE001
        pass
    model_stats["buildSeconds"] = round(build_seconds, 6)
    problem["_model_stats"] = model_stats
    profile: dict[str, Any] = {"buildSeconds": build_seconds}
    problem["_profile"] = profile

    # Incumbent capture for KEEP_BEST (complete Stage-A unit→table assignment).
    incumbent: dict[str, Any] = {"unit_to_table": None, "solutions": 0}

    class _IncumbentCb(cp_model.CpSolverSolutionCallback):
        def on_solution_callback(self) -> None:  # noqa: N802
            from .stage_a import extract_unit_assignment

            incumbent["solutions"] = int(incumbent["solutions"]) + 1
            try:
                incumbent["unit_to_table"] = extract_unit_assignment(self, ctx)
            except Exception:  # noqa: BLE001
                pass
            if progress:
                progress("incumbent", f"solutions={incumbent['solutions']}")

    def _solve_with_stop(mdl: cp_model.CpModel) -> int:
        # Continuation hook for tests: delay after first incumbent so stop can land.
        cont = (request.get("testHooks") or {}).get("continueAfterIncumbentMs")
        if cont:

            class _DelayCb(_IncumbentCb):
                def __init__(self) -> None:
                    cp_model.CpSolverSolutionCallback.__init__(self)
                    self._hit = False

                def on_solution_callback(self) -> None:  # noqa: N802
                    super().on_solution_callback()
                    if not self._hit:
                        self._hit = True
                        time.sleep(float(cont) / 1000.0)

            return solver.Solve(mdl, _DelayCb())
        return solver.Solve(mdl, _IncumbentCb())

    if maximise:
        model.Maximize(ctx["seated_count_expr"])
        budget = min(det_budget - det_spent, remaining_wall())
        _configure_solver(solver, problem, budget)
        emit("search", "DIAG_MAXSEAT")
        t0 = time.perf_counter()
        status = _solve_with_stop(model)
        dt = time.perf_counter() - t0
        det_spent += dt
        proven = status == cp_model.OPTIMAL
        value = int(solver.ObjectiveValue()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None
        tiers.append(
            tier_record(
                name="DIAG_MAXSEAT",
                value=value,
                bound=int(solver.BestObjectiveBound()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
                proven=proven,
                deterministic_seconds=dt,
                wall_seconds=time.perf_counter() - wall0,
                stop_reason=_stop_reason(status),
            )
        )
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            result, fault = map_native_status(
                native=status,
                has_incumbent=False,
                all_tiers_proven=False,
                wall_hit=wall_hit(),
                deterministic_exhausted=det_spent >= det_budget,
            )
            return _final(problem, result, fault, tiers, [], status, det_spent, wall0)

        unit_to_table = extract_unit_assignment(solver, ctx)
        guest_to_table = expand_guest_table_assignment(problem, ctx, solver, unit_to_table)
        assign_payload, b_tiers, b_fault = _run_stage_b(
            problem, guest_to_table, emit, remaining_wall, det_budget, det_spent
        )
        tiers.extend(b_tiers)
        if b_fault:
            return _final(problem, "SOLVER_FAULT", b_fault, tiers, [], status, det_spent, wall0)
        all_proven = proven and all(bool(t.get("proven")) for t in b_tiers)
        result = "OPTIMAL" if all_proven else "FEASIBLE"
        return _final(
            problem,
            result,
            None,
            tiers,
            assign_payload,
            status,
            det_spent,
            wall0,
            diagnostics={"maxSeated": value},
        )

    # Capture A1 incumbent assignment before A2 may overwrite solver state unsuccessfully.
    model.Minimize(ctx["movement_expr"])
    budget = min(det_budget - det_spent, remaining_wall())
    _configure_solver(solver, problem, budget)
    emit("search", "A1_movement")
    t0 = time.perf_counter()
    status = _solve_with_stop(model)
    dt = time.perf_counter() - t0
    det_spent += dt
    profile["a1Seconds"] = dt
    profile["a1Status"] = _native_name(status)
    profile["a1Objective"] = int(solver.ObjectiveValue()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None
    profile["a1Bound"] = int(solver.BestObjectiveBound()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None
    try:
        profile["a1Branches"] = int(solver.NumBranches())
        profile["a1Conflicts"] = int(solver.NumConflicts())
    except Exception:  # noqa: BLE001
        pass

    stopped = bool(stop_controller and getattr(stop_controller, "stop_requested", False))
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # KEEP_BEST may have an incumbent via callback even if native status is UNKNOWN.
        if stopped and incumbent.get("unit_to_table"):
            status = cp_model.FEASIBLE
        else:
            tiers.append(
                tier_record(
                    name="A1_movement",
                    value=None,
                    bound=None,
                    proven=False,
                    deterministic_seconds=dt,
                    wall_seconds=time.perf_counter() - wall0,
                    stop_reason="STOP_REQUESTED" if stopped else _stop_reason(status),
                )
            )
            result, fault = map_native_status(
                native=status,
                has_incumbent=False,
                all_tiers_proven=False,
                wall_hit=wall_hit(),
                deterministic_exhausted=det_spent >= det_budget or status == cp_model.UNKNOWN,
            )
            if stopped:
                result = "CANCELLED"
            out = _final(problem, result, fault, tiers, [], status, det_spent, wall0)
            if stopped:
                out["stopReason"] = "STOP_REQUESTED"
            return out

    a1_val = int(solver.ObjectiveValue()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0
    a1_proven = status == cp_model.OPTIMAL and not stopped
    a1_unit_to_table = incumbent.get("unit_to_table") or extract_unit_assignment(solver, ctx)
    tiers.append(
        tier_record(
            name="A1_movement",
            value=a1_val,
            bound=int(solver.BestObjectiveBound()) if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else a1_val,
            proven=a1_proven,
            deterministic_seconds=dt,
            wall_seconds=time.perf_counter() - wall0,
            stop_reason="STOP_REQUESTED" if stopped else _stop_reason(status),
        )
    )

    if stopped:
        guest_to_table = expand_guest_table_assignment(problem, ctx, solver, a1_unit_to_table)
        assign_payload, b_tiers, b_fault = _run_stage_b(
            problem, guest_to_table, emit, remaining_wall, det_budget, det_spent
        )
        tiers.extend(b_tiers)
        if b_fault or not assign_payload:
            out = _final(problem, "CANCELLED", b_fault, tiers, [], status, det_spent, wall0)
            out["stopReason"] = "STOP_REQUESTED"
            return out
        out = _final(problem, "FEASIBLE", None, tiers, assign_payload, status, det_spent, wall0)
        out["stopReason"] = "STOP_REQUESTED"
        return out

    # Fix within movement tolerance → A2 preferences.
    tol = int(problem["movement_tolerance"])
    model.Add(ctx["movement_expr"] <= a1_val + tol)
    domain_of = ctx.get("domain_of") or {}
    for u in ctx["unit_ids"]:
        for t in domain_of.get(u, ctx["table_ids"]):
            var = ctx["x"].get((u, t))
            if var is not None:
                model.AddHint(var, solver.Value(var))
        model.AddHint(ctx["seated"][u], solver.Value(ctx["seated"][u]))

    model.Minimize(ctx["preference_expr"])
    budget = min(det_budget - det_spent, remaining_wall())
    _configure_solver(solver, problem, budget)
    emit("search", "A2_preferences")
    t0 = time.perf_counter()
    status2 = _solve_with_stop(model)
    dt2 = time.perf_counter() - t0
    det_spent += dt2
    profile["a2Seconds"] = dt2
    profile["a2Status"] = _native_name(status2)
    profile["a2Objective"] = int(solver.ObjectiveValue()) if status2 in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None
    profile["a2Bound"] = int(solver.BestObjectiveBound()) if status2 in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None
    try:
        profile["a2Branches"] = int(solver.NumBranches())
        profile["a2Conflicts"] = int(solver.NumConflicts())
    except Exception:  # noqa: BLE001
        pass

    if status2 not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        tiers.append(
            tier_record(
                name="A2_preferences",
                value=None,
                bound=None,
                proven=False,
                deterministic_seconds=dt2,
                wall_seconds=time.perf_counter() - wall0,
                stop_reason=_stop_reason(status2),
            )
        )
        guest_to_table = expand_guest_table_assignment(problem, ctx, solver, a1_unit_to_table)
        assign_payload, b_tiers, b_fault = _run_stage_b(
            problem, guest_to_table, emit, remaining_wall, det_budget, det_spent
        )
        tiers.extend(b_tiers)
        if b_fault:
            return _final(problem, "SOLVER_FAULT", b_fault, tiers, [], status2, det_spent, wall0)
        return _final(problem, "FEASIBLE", None, tiers, assign_payload, status2, det_spent, wall0)

    a2_val = int(solver.ObjectiveValue())
    a2_proven = status2 == cp_model.OPTIMAL
    tiers.append(
        tier_record(
            name="A2_preferences",
            value=a2_val,
            bound=int(solver.BestObjectiveBound()),
            proven=a2_proven,
            deterministic_seconds=dt2,
            wall_seconds=time.perf_counter() - wall0,
            stop_reason=_stop_reason(status2),
        )
    )

    unit_to_table = extract_unit_assignment(solver, ctx)
    guest_to_table = expand_guest_table_assignment(problem, ctx, solver, unit_to_table)
    assign_payload, b_tiers, b_fault = _run_stage_b(
        problem, guest_to_table, emit, remaining_wall, det_budget, det_spent
    )
    tiers.extend(b_tiers)
    if b_fault:
        return _final(problem, "SOLVER_FAULT", b_fault, tiers, [], status2, det_spent, wall0)

    all_proven = a1_proven and a2_proven and all(bool(t.get("proven")) for t in b_tiers)
    result = "OPTIMAL" if all_proven else "FEASIBLE"
    return _final(problem, result, None, tiers, assign_payload, status2, det_spent, wall0)
