#!/usr/bin/env python3
"""
EOS-S06 CP-SAT solver child (Checkpoint 1 spike / stub+minimal CP-SAT).

- No database credentials
- No guest names / contacts / rule prose
- No network calls
- Receives run-local integer indices only
- stdin: length-prefixed JSON request
- fd 3: length-prefixed JSON progress + final response
- Exits after one solve
"""
from __future__ import annotations

import json
import os
import resource
import struct
import sys
import time
from typing import Any

FRAME_MAX = 8 * 1024 * 1024
FD_OUT = 3


def read_frame(stream) -> dict[str, Any]:
    header = stream.buffer.read(4)
    if not header or len(header) < 4:
        raise SystemExit("truncated_header")
    (length,) = struct.unpack(">I", header)
    if length > FRAME_MAX:
        raise SystemExit("frame_too_large")
    body = stream.buffer.read(length)
    if len(body) != length:
        raise SystemExit("truncated_body")
    return json.loads(body.decode("utf-8"))


def write_frame(payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    if len(body) > FRAME_MAX:
        raise SystemExit("response_too_large")
    os.write(FD_OUT, struct.pack(">I", len(body)))
    os.write(FD_OUT, body)


def progress(phase: str, detail: str | None = None) -> None:
    msg: dict[str, Any] = {"type": "progress", "phase": phase}
    if detail is not None:
        msg["detail"] = detail
    write_frame(msg)


def peak_rss_kb() -> int:
    usage = resource.getrusage(resource.RUSAGE_SELF)
    # macOS returns bytes; Linux returns kilobytes
    rss = usage.ru_maxrss
    if sys.platform == "darwin":
        return int(rss / 1024)
    return int(rss)


def solve_minimal(request: dict[str, Any]) -> dict[str, Any]:
    """Minimal CP-SAT proof: assign each unit index to a table index under capacity."""
    from ortools.sat.python import cp_model
    import ortools

    mode = request.get("mode", "feasibility")
    units = int(request.get("unitCount", 2))
    tables = int(request.get("tableCount", 2))
    capacity = int(request.get("capacity", 2))
    seed = int(request.get("seed", 1))

    progress("model_build", f"units={units} tables={tables}")
    model = cp_model.CpModel()
    x = {}
    for u in range(units):
        for t in range(tables):
            x[u, t] = model.NewBoolVar(f"u{u}_t{t}")
        model.Add(sum(x[u, t] for t in range(tables)) == 1)
    for t in range(tables):
        model.Add(sum(x[u, t] for u in range(units)) <= capacity)

    solver = cp_model.CpSolver()
    solver.parameters.random_seed = seed
    solver.parameters.max_time_in_seconds = float(request.get("maxTimeSeconds", 2.0))
    solver.parameters.num_search_workers = 1

    if mode == "sleep":
        # Used by cancellation spike
        progress("sleep", "started")
        time.sleep(float(request.get("sleepSeconds", 5.0)))
        return {
            "result": "CANCELLED",
            "engine": {"ortools": ortools.__version__, "python": sys.version.split()[0]},
        }

    progress("search", "started")
    t0 = time.perf_counter()
    status = solver.Solve(model)
    elapsed = time.perf_counter() - t0
    name = solver.StatusName(status)
    progress("search", f"status={name}")

    assignment = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for u in range(units):
            for t in range(tables):
                if solver.Value(x[u, t]) == 1:
                    assignment.append({"unit": u, "table": t})

    product = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "INVALID_INPUT",
        cp_model.UNKNOWN: "SEARCH_INCOMPLETE",
    }.get(status, "SOLVER_FAULT")

    return {
        "result": product,
        "nativeStatus": name,
        "assignment": assignment,
        "deterministicSeconds": elapsed,
        "engine": {
            "ortools": ortools.__version__,
            "python": sys.version.split()[0],
            "model": "cpsat-spike-v0",
        },
        "resources": {"peakRssKb": peak_rss_kb()},
        "requestEcho": {
            "runId": request.get("runId"),
            "unitCount": units,
            "tableCount": tables,
        },
    }


def main() -> int:
    # Refuse network-ish env leakage for spike visibility
    for key in list(os.environ):
        if key.upper() in {"DATABASE_URL", "POSTGRES_URL", "RAILWAY_TOKEN"} or "SECRET" in key.upper():
            # Child must not carry secrets; supervisor should have stripped them.
            # Do not print values.
            write_frame({"type": "error", "message": f"forbidden_env_present:{key}"})
            return 2

    try:
        request = read_frame(sys.stdin)
    except Exception as exc:  # noqa: BLE001
        write_frame({"type": "error", "message": f"invalid_input:{type(exc).__name__}"})
        return 1

    progress("accepted", str(request.get("runId")))
    try:
        payload = solve_minimal(request)
        write_frame({"type": "final", "ok": True, "payload": payload})
        return 0
    except Exception as exc:  # noqa: BLE001
        write_frame({"type": "final", "ok": False, "payload": {"result": "SOLVER_FAULT", "error": type(exc).__name__}})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
