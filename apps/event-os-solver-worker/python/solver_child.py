#!/usr/bin/env python3
"""
EOS-S06 CP-SAT solver child (production Stage A + Stage B + diagnostics + stop).

- No database credentials
- No guest names / contacts / rule prose
- No network calls
- Receives run-local integer indices only
- stdin: length-prefixed JSON request, then optional stop frames
- fd 3: length-prefixed JSON progress + final response
- Exits after one solve
"""
from __future__ import annotations

import json
import os
import resource
import struct
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable

# Allow `python solver_child.py` and package imports of model/
_PYTHON_ROOT = Path(__file__).resolve().parent
if str(_PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(_PYTHON_ROOT))

FRAME_MAX = 8 * 1024 * 1024
FD_OUT = 3


def read_frame(stream) -> dict[str, Any] | None:
    header = stream.buffer.read(4)
    if not header or len(header) < 4:
        return None
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
    rss = usage.ru_maxrss
    if sys.platform == "darwin":
        return int(rss / 1024)
    return int(rss)


def is_production_request(request: dict[str, Any]) -> bool:
    return bool(request.get("tables") and request.get("seats") and request.get("guests"))


class StopController:
    """Thread-safe stop request + optional CpSolver StopSearch binding."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.stop_requested = False
        self.stop_mode: str | None = None
        self._solver = None

    def bind_solver(self, solver: Any) -> None:
        with self._lock:
            self._solver = solver
            if self.stop_requested and solver is not None:
                try:
                    solver.StopSearch()
                except Exception:  # noqa: BLE001
                    pass

    def request_stop(self, mode: str | None = None) -> None:
        with self._lock:
            self.stop_requested = True
            if mode:
                self.stop_mode = mode
            if self._solver is not None:
                try:
                    self._solver.StopSearch()
                except Exception:  # noqa: BLE001
                    pass


def _stdin_stop_reader(controller: StopController) -> None:
    """Read optional control frames from stdin after the request frame."""
    while True:
        try:
            frame = read_frame(sys.stdin)
        except Exception:  # noqa: BLE001
            return
        if frame is None:
            return
        if frame.get("type") != "stop":
            continue
        mode = frame.get("mode") or frame.get("stopMode") or "CANCEL"
        progress("stop_received", str(mode))
        controller.request_stop(str(mode))


def solve_spike_minimal(request: dict[str, Any], controller: StopController) -> dict[str, Any]:
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
    controller.bind_solver(solver)
    solver.parameters.random_seed = seed
    solver.parameters.max_time_in_seconds = float(request.get("maxTimeSeconds", 2.0))
    solver.parameters.num_search_workers = 1

    if str(mode).lower() == "sleep":
        progress("sleep", "started")
        deadline = time.time() + float(request.get("sleepSeconds", 5.0))
        while time.time() < deadline:
            if controller.stop_requested:
                return {
                    "result": "CANCELLED",
                    "stopReason": "STOP_REQUESTED",
                    "engine": {"ortools": ortools.__version__, "python": sys.version.split()[0]},
                }
            time.sleep(0.05)
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
    if controller.stop_requested and product in {"OPTIMAL", "FEASIBLE"}:
        product = "FEASIBLE"

    out = {
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
    if controller.stop_requested:
        out["stopReason"] = "STOP_REQUESTED"
    return out


def solve(request: dict[str, Any], controller: StopController) -> dict[str, Any]:
    mode = str(request.get("mode", "")).lower()
    if mode == "sleep":
        progress("sleep", "started")
        deadline = time.time() + float(request.get("sleepSeconds", 5.0))
        while time.time() < deadline:
            if controller.stop_requested:
                import ortools

                return {
                    "result": "CANCELLED",
                    "stopReason": "STOP_REQUESTED",
                    "engine": {
                        "ortools": ortools.__version__,
                        "python": sys.version.split()[0],
                        "model": "cpsat-model-v1",
                    },
                    "resources": {"peakRssKb": peak_rss_kb()},
                }
            time.sleep(0.05)
        import ortools

        return {
            "result": "CANCELLED",
            "engine": {
                "ortools": ortools.__version__,
                "python": sys.version.split()[0],
                "model": "cpsat-model-v1",
            },
            "resources": {"peakRssKb": peak_rss_kb()},
        }

    if is_production_request(request):
        from model.solve import solve_request

        return solve_request(request, progress=progress, stop_controller=controller)

    return solve_spike_minimal(request, controller)


def main() -> int:
    for key in list(os.environ):
        if key.upper() in {"DATABASE_URL", "POSTGRES_URL", "RAILWAY_TOKEN"} or "SECRET" in key.upper():
            write_frame({"type": "error", "message": f"forbidden_env_present:{key}"})
            return 2

    try:
        request = read_frame(sys.stdin)
        if request is None:
            write_frame({"type": "error", "message": "invalid_input:empty"})
            return 1
    except Exception as exc:  # noqa: BLE001
        write_frame({"type": "error", "message": f"invalid_input:{type(exc).__name__}"})
        return 1

    controller = StopController()
    reader = threading.Thread(target=_stdin_stop_reader, args=(controller,), daemon=True)
    reader.start()

    progress("accepted", str(request.get("runId")))
    try:
        payload = solve(request, controller)
        if controller.stop_requested and payload.get("result") in {"OPTIMAL", "FEASIBLE"}:
            payload["result"] = "FEASIBLE"
            payload["stopReason"] = "STOP_REQUESTED"
        elif controller.stop_requested and not payload.get("assignments") and not payload.get("assignment"):
            payload["result"] = "CANCELLED"
            payload["stopReason"] = "STOP_REQUESTED"
        write_frame({"type": "final", "ok": True, "payload": payload})
        return 0
    except Exception as exc:  # noqa: BLE001
        write_frame(
            {
                "type": "final",
                "ok": False,
                "payload": {
                    "result": "SOLVER_FAULT",
                    "error": type(exc).__name__,
                    "resources": {"peakRssKb": peak_rss_kb()},
                },
            }
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
