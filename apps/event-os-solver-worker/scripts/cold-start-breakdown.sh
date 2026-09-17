#!/usr/bin/env bash
# Container cold-start breakdown (Checkpoint 2 observation).
# Expected ≤3 min. Does not deploy Railway.
set -euo pipefail
EV="docs/control/evidence/eos-s06-cpsat-production/container-build"
IMG="event-os-solver-worker:cpsat-cp2a"
OUT="$EV/COLD_START_BREAKDOWN.json"
mkdir -p "$EV"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] START cold-start breakdown"

# 1) docker run overhead to echo (container+process start only)
T0=$(python3 -c 'import time; print(time.perf_counter())')
docker run --rm --platform linux/amd64 --entrypoint /bin/echo "$IMG" ok >/dev/null
T1=$(python3 -c 'import time; print(time.perf_counter())')
DOCKER_ECHO_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")

# 2) python -c pass
T0=$(python3 -c 'import time; print(time.perf_counter())')
docker run --rm --platform linux/amd64 --entrypoint /usr/local/bin/python3 "$IMG" -c 'pass' >/dev/null
T1=$(python3 -c 'import time; print(time.perf_counter())')
PYTHON_PASS_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")

# 3) python import ortools
T0=$(python3 -c 'import time; print(time.perf_counter())')
docker run --rm --platform linux/amd64 --entrypoint /usr/local/bin/python3 "$IMG" -c 'import ortools; print(ortools.__version__)' >/tmp/ortools_ver.txt
T1=$(python3 -c 'import time; print(time.perf_counter())')
ORTOOLS_IMPORT_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")
ORTOOLS_VER=$(cat /tmp/ortools_ver.txt | tr -d '\r')

# 4) python import model.solve via bind-mount of current tree (image may predate model/)
T0=$(python3 -c 'import time; print(time.perf_counter())')
docker run --rm --platform linux/amd64 \
  -v "$PWD/apps/event-os-solver-worker/python:/app/python:ro" \
  --entrypoint /usr/local/bin/python3 \
  -e PYTHONPATH=/app/python "$IMG" -c 'from model import solve; print("ok")' >/dev/null
T1=$(python3 -c 'import time; print(time.perf_counter())')
MODEL_IMPORT_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")

# 5) host child only (no docker) for comparison
HOST_PY="apps/event-os-solver-worker/.venv/bin/python"
T0=$(python3 -c 'import time; print(time.perf_counter())')
PYTHONPATH=apps/event-os-solver-worker/python "$HOST_PY" -c 'pass'
T1=$(python3 -c 'import time; print(time.perf_counter())')
HOST_PYTHON_PASS_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")
T0=$(python3 -c 'import time; print(time.perf_counter())')
PYTHONPATH=apps/event-os-solver-worker/python "$HOST_PY" -c 'import ortools; print(ortools.__version__)' >/tmp/host_ortools.txt
T1=$(python3 -c 'import time; print(time.perf_counter())')
HOST_ORTOOLS_MS=$(python3 -c "print(round(($T1-$T0)*1000,3))")

python3 - <<PY
import json
from pathlib import Path
doc = {
  "measuredAt": __import__("datetime").datetime.utcnow().isoformat()+"Z",
  "image": "$IMG",
  "note": "Each docker row includes full container launch. Prior spike coldMs≈5256 included container+Node supervisor+Python child.",
  "breakdownMs": {
    "docker_echo_only": float("$DOCKER_ECHO_MS"),
    "docker_python_pass": float("$PYTHON_PASS_MS"),
    "docker_ortools_import": float("$ORTOOLS_IMPORT_MS"),
    "docker_model_solve_import": float("$MODEL_IMPORT_MS"),
    "host_python_pass": float("$HOST_PYTHON_PASS_MS"),
    "host_ortools_import": float("$HOST_ORTOOLS_MS"),
  },
  "derived": {
    "approx_docker_overhead_vs_python_pass": float("$DOCKER_ECHO_MS"),
    "approx_ortools_import_inside_container_extra_vs_python_pass": float("$ORTOOLS_IMPORT_MS") - float("$PYTHON_PASS_MS"),
    "host_vs_container_ortools_delta": float("$ORTOOLS_IMPORT_MS") - float("$HOST_ORTOOLS_MS"),
  },
  "ortoolsVersion": "$ORTOOLS_VER".strip(),
  "warmSpareGuidance": {
    "allowed": "pre-imported idle child reserved for next single job, then exit",
    "forbidden": "long-lived Python process owning multiple jobs",
    "isolation": "one-job-per-child preserved",
  },
  "priorSpike": {"coldMs": 5256, "warmP50Ms": 4960, "source": "IN_CONTAINER_SPIKE.txt"},
}
Path("$OUT").write_text(json.dumps(doc, indent=2) + "\n")
print(json.dumps(doc["breakdownMs"], indent=2))
print("WROTE", "$OUT")
PY
