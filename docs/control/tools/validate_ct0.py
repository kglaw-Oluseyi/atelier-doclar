#!/usr/bin/env python3
"""CT0 control-artefact validator. Not product implementation."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


preg = json.loads((ROOT / "docs/control/PROMPT_REGISTER.json").read_text())
emap = json.loads((ROOT / "docs/control/PROMPT_EXECUTION_MAP.json").read_text())
catalog = json.loads((ROOT / "programme/slices/catalog.json").read_text())
state = json.loads((ROOT / "programme/slices/state-projection.json").read_text())
cycles = json.loads((ROOT / "programme/schema/dependency-cycle-report.json").read_text())
schema = json.loads((ROOT / "claude handover/roadmap_control_tower_addendum/schema/slice-manifest.schema.json").read_text())

reg_ids = [p["prompt_control_id"] for p in preg["prompts"]]
map_ids = [p["prompt_control_id"] for p in emap["prompts"]]
if len(reg_ids) != 693:
    err(f"prompt register count {len(reg_ids)} != 693")
if len(map_ids) != 693:
    err(f"execution map count {len(map_ids)} != 693")
if len(set(reg_ids)) != 693:
    err("duplicate Prompt Control IDs in register")
if len(set(map_ids)) != 693:
    err("duplicate Prompt Control IDs in map")
if set(reg_ids) != set(map_ids):
    err("map IDs do not match register IDs")

by = emap["accounting"]["by_compatibility_status"]
if sum(by.values()) != 693:
    err(f"status counts {sum(by.values())} != 693")
if emap["accounting"]["unaccounted"] != 0:
    err("unaccounted prompts != 0")

id_re = re.compile(schema["properties"]["id"]["pattern"])
required = schema["required"]
products = set(schema["properties"]["product"]["enum"])
seen_slices = set()
for s in catalog["slices"]:
    for f in required:
        if f not in s:
            err(f"{s.get('id')} missing {f}")
    if not id_re.match(s["id"]):
        err(f"invalid slice id {s['id']}")
    if s["product"] not in products:
        err(f"{s['id']} bad product")
    if not s["canonicalRefs"]:
        err(f"{s['id']} empty canonicalRefs")
    if s["id"] in seen_slices:
        err(f"duplicate slice {s['id']}")
    seen_slices.add(s["id"])

for s in catalog["slices"]:
    for d in s["dependsOn"]:
        if d not in seen_slices:
            err(f"{s['id']} depends on unknown {d}")

if cycles["cycle_count"] != 0:
    err(f"cycles present: {cycles['cycles']}")

for rec in state["records"]:
    if rec["status"] == "ACCEPTED":
        err(f"{rec['id']} illegally ACCEPTED")
    if rec["id"] not in seen_slices:
        err(f"state for unknown slice {rec['id']}")

for p in emap["prompts"]:
    path = ROOT / p["source_path"]
    if not path.exists():
        err(f"missing source path {p['source_path']}")
    if "maison-doclar-optimus" in json.dumps(p).lower():
        err("unrelated repo reference in map record")

# CT1 authorised a validator workspace. Still forbid application/runtime scaffold.
for forbidden in ["next.config.ts", "next.config.js", "Dockerfile"]:
    if (ROOT / forbidden).exists():
        err(f"unexpected application file {forbidden}")

if errors:
    print("CT0 VALIDATION FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("CT0 VALIDATION PASS")
print(f"prompts={len(map_ids)} slices={len(catalog['slices'])} cycles={cycles['cycle_count']}")
