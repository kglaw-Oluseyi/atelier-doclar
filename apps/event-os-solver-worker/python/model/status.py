"""Product status mapping for CP-SAT native outcomes."""

from __future__ import annotations

from typing import Any

PRODUCT_STATUSES = frozenset(
    {
        "OPTIMAL",
        "FEASIBLE",
        "INFEASIBLE",
        "SEARCH_INCOMPLETE",
        "TIMED_OUT",
        "INVALID_INPUT",
        "SOLVER_FAULT",
        "CANCELLED",
    }
)


def map_native_status(
    *,
    native: Any,
    has_incumbent: bool,
    all_tiers_proven: bool,
    wall_hit: bool,
    deterministic_exhausted: bool,
    fault_code: str | None = None,
) -> tuple[str, str | None]:
    """Map CP-SAT / product conditions → product result (+ optional fault code)."""
    from ortools.sat.python import cp_model

    if fault_code:
        return "SOLVER_FAULT", fault_code

    if native == cp_model.INFEASIBLE:
        return "INFEASIBLE", None
    if native == cp_model.MODEL_INVALID:
        return "INVALID_INPUT", None

    if has_incumbent:
        if all_tiers_proven and native == cp_model.OPTIMAL:
            return "OPTIMAL", None
        return "FEASIBLE", None

    if wall_hit:
        return "TIMED_OUT", None
    if deterministic_exhausted or native == cp_model.UNKNOWN:
        return "SEARCH_INCOMPLETE", None
    return "SOLVER_FAULT", "UNEXPECTED_STATUS"


def tier_record(
    *,
    name: str,
    value: int | None,
    bound: int | None,
    proven: bool,
    deterministic_seconds: float,
    wall_seconds: float,
    stop_reason: str,
) -> dict[str, Any]:
    return {
        "tier": name,
        "value": value,
        "bound": bound,
        "proven": proven,
        "deterministicSeconds": round(deterministic_seconds, 6),
        "wallSeconds": round(wall_seconds, 6),
        "stopReason": stop_reason,
    }
