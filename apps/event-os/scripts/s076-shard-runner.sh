#!/usr/bin/env bash
# S076 resource-controlled shard runner — one worker, next-dev fixture contract,
# fresh Playwright webServer per shard (reuseExistingServer:false).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
APP="$ROOT/apps/event-os"
OUT="${S076_SHARD_OUT:-/tmp/s076-shards}"
PLAN="${S076_SHARD_PLAN:-/tmp/s076-shards/shard-plan.json}"
mkdir -p "$OUT"
export EVENT_OS_E2E_HEAP_MB="${EVENT_OS_E2E_HEAP_MB:-4096}"
export CI=1
# Do not set PLAYWRIGHT_PROD — local file-store requires next-dev.
unset PLAYWRIGHT_PROD PLAYWRIGHT_LIVE PLAYWRIGHT_BASE_URL DATABASE_URL || true

cd "$APP"
python3 - <<'PY' "$PLAN" "$OUT"
import json, subprocess, sys, time
from pathlib import Path
plan = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
results = []
# Skip A-shell shards if START_FROM set
start = int(__import__('os').environ.get('S076_START_INDEX', '0'))
end = __import__('os').environ.get('S076_END_INDEX')
end_i = int(end) if end is not None else len(plan)
for shard in plan[start:end_i]:
    name = shard['name']
    files = [f"e2e/{f}" if not f.startswith('e2e/') else f for f in shard['files']]
    log = out / f"shard-{shard['id']:02d}-{name}.txt"
    cmd = ['pnpm','exec','playwright','test',*files,'--workers=1','--reporter=list']
    print(f"=== SHARD {shard['id']} {name} files={len(files)} ===", flush=True)
    t0 = time.time()
    with log.open('w') as fh:
        fh.write(f"CMD: {' '.join(cmd)}\n")
        fh.flush()
        p = subprocess.run(cmd, stdout=fh, stderr=subprocess.STDOUT)
    dur = time.time() - t0
    text = log.read_text(errors='replace')
    # parse summary
    import re
    passed = re.search(r'(\d+) passed', text)
    failed = re.search(r'(\d+) failed', text)
    skipped = re.search(r'(\d+) skipped', text)
    entry = {
        'id': shard['id'],
        'name': name,
        'files': shard['files'],
        'exit': p.returncode,
        'durationSec': round(dur,1),
        'passed': int(passed.group(1)) if passed else 0,
        'failed': int(failed.group(1)) if failed else 0,
        'skipped': int(skipped.group(1)) if skipped else 0,
        'log': str(log),
    }
    results.append(entry)
    print(json.dumps(entry), flush=True)
    Path(out/'shard-results.json').write_text(json.dumps(results, indent=2))
print('DONE', len(results), 'shards')
PY
