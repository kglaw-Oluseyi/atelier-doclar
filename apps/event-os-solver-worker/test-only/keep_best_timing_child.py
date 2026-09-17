#!/usr/bin/env python3
"""
TEST-ONLY keep-best timing child — NOT included in the production Docker image.

Delays after the first real CP-SAT incumbent progress event so KEEP_BEST stop can land.
Does not fabricate assignments or responses. Timing delay only.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

_PYTHON_ROOT = Path(__file__).resolve().parents[1] / "python"
if str(_PYTHON_ROOT) not in sys.path:
    sys.path.insert(0, str(_PYTHON_ROOT))

_DELAY_MS = float(os.environ.get("CPSAT_TEST_ONLY_CONTINUE_AFTER_INCUMBENT_MS", "1200"))

import solver_child  # noqa: E402

_original_progress = solver_child.progress
_hit = {"done": False}


def _progress_with_timing_delay(phase: str, detail: str | None = None) -> None:
    _original_progress(phase, detail)
    if phase == "incumbent" and not _hit["done"]:
        _hit["done"] = True
        time.sleep(max(0.0, _DELAY_MS) / 1000.0)


solver_child.progress = _progress_with_timing_delay  # type: ignore[assignment]

if __name__ == "__main__":
    raise SystemExit(solver_child.main())
