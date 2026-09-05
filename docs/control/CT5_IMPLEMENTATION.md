# CT5 Implementation — Roadmap, product and slice drill-down

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0006`  
**Native ID:** `CT5`  
**Slice ID:** `MD-CT5`  
**Status:** `IN_REVIEW`  
**Baseline:** `8920007ca62442b5fb1eb4b6fece8d1985e06a98`

DAG plus accessible tables and evidence drill-down. Status remains CT2-derived.

## Routes

`/programme/roadmap`, `/programme/event-os`, `/programme/event-day`, `/programme/academy`, `/programme/marketing`, `/programme/ushering`, `/programme/integration`, `/programme/slices/[sliceId]`, `/programme/commits`, `/programme/evidence`.

## DAG law

Nodes and edges come from slice manifests via `buildRoadmap`. Cycles and missing dependencies are banners plus table flags. The SVG is an overview; the table is the accessible equivalent.

## Open items

`CT5-OI-001` — SVG overview is bounded; table remains authoritative.
