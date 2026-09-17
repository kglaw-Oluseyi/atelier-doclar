#!/usr/bin/env bash
# Per-child startup inside already-running worker image.
set -euo pipefail
EV="docs/control/evidence/eos-s06-cpsat-production/container-build"
IMG="event-os-solver-worker:cpsat-cp2a"
OUT="$EV/CHILD_STARTUP_IN_RUNNING_WORKER.json"
TMP=$(mktemp -d)
mkdir -p "$EV"

CID=$(docker run -d --platform linux/amd64 --user solver \
  -v "$PWD/apps/event-os-solver-worker/python:/app/python:ro" \
  -e PYTHONPATH=/app/python \
  -e PYTHONUNBUFFERED=1 \
  --entrypoint sleep "$IMG" 3600)
cleanup() { docker rm -f "$CID" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

run_sample() {
  local name="$1"
  docker exec -u solver -e PYTHONPATH=/app/python "$CID" /usr/local/bin/python3 -c '
import json, time, resource, ortools
t0=time.perf_counter()
t1=time.perf_counter()
_ = ortools.__version__
ortools_ms=(time.perf_counter()-t1)*1000
t2=time.perf_counter()
from model import solve, validate, stage_a
model_ms=(time.perf_counter()-t2)*1000
print(json.dumps({
  "ortools_imported_ms": round(ortools_ms,3),
  "model_code_ready_ms": round(model_ms,3),
  "total_from_interpreter_ms": round((time.perf_counter()-t0)*1000,3),
  "ortools": ortools.__version__,
  "peakRssKb": int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss),
}))
' > "$TMP/$name.json"
}

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] worker cid=$CID"
run_sample cold
run_sample warm1
run_sample warm2

python3 - <<PY
import json
from pathlib import Path
samples = {n: json.loads(Path("$TMP", f"{n}.json").read_text()) for n in ("cold","warm1","warm2")}
doc = {
  "measuredAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
  "image": "$IMG",
  "method": "long-lived container; each sample is a new python3 via docker exec (per-child spawn)",
  "clarification": {
    "not_measured_here": "docker create/run per solve",
    "measured_here": "Python + OR-Tools + model import inside already-running worker",
  },
  "samples": samples,
  "warmSpareRules": {
    "oneJobOnly": True,
    "noPriorEventData": True,
    "noDatabaseCredentials": True,
    "exitAfterSettlement": True,
    "replaceWithFreshSpare": True,
  },
}
Path("$OUT").write_text(json.dumps(doc, indent=2)+"\n")
print(json.dumps(samples, indent=2))
print("WROTE", "$OUT")
PY
