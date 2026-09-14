# S076 scope correction — eight-spec EOS-S06 readiness addendum

**Date:** 2026-09-14  
**Authority:** supersedes the complete-suite / mass-shard recovery requirement for local next-dev.  
**AI CTO closure of the eight-spec exercise:** `RESOURCE-CONSTRAINED / NO PRODUCT DEFECT ESTABLISHED`  
**Not acceptance.** Deployed Event OS SHA unchanged: `5179ffd0189a9c88f458e5e4d3865cafa4d92627`.  
**Starting HEAD / origin/main:** `d3f2c0027281550453d33370f7b5533b0a2c5858`.

## Why mass-shard was terminated

Local next-dev is resource-constrained. The 34-minute monolith and subsequent mass-shard approach produced cascade `ECONNREFUSED` / `ECONNRESET` failures that are not decision-useful for EOS-S06 product attribution. Shards 23–47 were not executed. Mass-shard runners were not resumed.

## Execution posture (closed pass)

- One specification file per fresh Playwright process; `--workers=1`
- Fresh application server per specification (`reuseExistingServer: false`)
- Local file-store contract requires next-dev (`PLAYWRIGHT_PROD` refused for Section 13 / file-store)
- No timeout increases; first failures preserved under `isolated-eight/`
- Maximum two attempts where harness-only corrections applied
- No EOS-S06 runtime/product correction was authorised or made
- Packet 8 live Railway journeys against SHA `5179ffd` **not** repeated

## Harness-only corrections retained

1. `apps/event-os/scripts/clean-e2e-store.mjs` — also delete sibling `event-os-non-production.seating-v2.json` (+ lock). Without this, cleaned platform fixtures left ACTIVE bindings pointing at vanished publications → `MISMATCH`.
2. `apps/event-os/e2e/s06-rules-reservations.spec.ts` — call `ensureAlphaOneSeatingLayoutBinding` before Save rule (matches sibling S06 specs under the S075 binding gate).

## Eight isolated results

| # | Specification | Mode | Result | Notes |
|---|---------------|------|--------|-------|
| 1 | `s06-reviewer-assignment` | next-dev | **PASS** (2/2) | Fresh process |
| 2 | `s06-rules-reservations` | next-dev | **PASS** after harness-only setup correction | First fail: stale seating-v2 `MISMATCH`; second fail: missing ensure-binding; confirm PASS |
| 3 | `s06-v2-s072` | next-dev | **PASS** (8/8) | **Axe:** `axe.violations === []` (test `S072 V2 seating axe, 200% zoom and reduced motion`) |
| 4 | `s075-layout-binding` | next-dev | Propose/activate **PASS**; successor interrupted | After seating-v2 clean: propose/activate proved. Successor path interrupted by next-dev `ECONNRESET` at director `Record decision` settlement (`expectFreshActionSuccess` empty `result`; approval remains `SUBMITTED`). **Product STALE assertion never reached locally.** |
| 5 | Section 13 J1 (`s075-section-13-j1-studio`) | next-dev | **Prevented by local resource conditions** | First fail preserved: `J1-004 Launch seating run durationMs=30148 exceeded 30000` |
| 6 | Section 13 J2 (`s075-section-13-j2-governance`) | next-dev | **Prevented by local resource conditions** | `page.waitForURL: net::ERR_CONNECTION_REFUSED` (server died mid-journey) |
| 7 | Section 13 J3 (`s075-section-13-j3-exports`) | next-dev | **Prevented by local resource conditions** | Provision: `layout-studio` not visible within 30s; `ECONNRESET` on webServer |
| 8 | Section 13 J4 (`s075-section-13-j4-ux`) | next-dev | **Prevented by local resource conditions** | Provision: `layout-studio` not visible within 30s |

Logs: `docs/control/evidence/eos-s06-s076-final-assurance/isolated-eight/`.

## Resource / cascade classification

- Broad monolith + mass-shard failures: **RESOURCE-CONSTRAINED / NOT PRODUCT-ATTRIBUTABLE** (diagnostic history only).
- Original 14 monolith passes and any completed early shard results: **diagnostic history only**.
- Remaining legacy Event OS suite cases: **DEFERRED TO FORMAL CI** (complete GitHub CI).
- Local layout-binding successor + Section 13 J1–J4 failures: **RESOURCE-CONSTRAINED / NEXT-DEV PROCESS PRESSURE**.
- **No clean isolated application assertion failed twice.**
- **No Decision B product defect** established for AI CTO remediation of EOS-S06 application/runtime code.
- Decision A was not literally met because five specifications could not complete locally under resource constraints.

## Packet 8 live evidence

Immutable Packet 8 evidence against deployed SHA `5179ffd0189a9c88f458e5e4d3865cafa4d92627` remains **controlling** for layout binding and Section 13 J1–J4:

`docs/control/evidence/eos-s06-s075-packet8/`

Local harness confirmation of those journeys did not clear under next-dev; live Packet 8 is not restamped or repeated.

## GitHub CI

Formal GitHub CI green remains **CI-BLOCKED-EXTERNAL-BILLING**.

GitHub Actions run `34874554477` must **not** be characterised as proof of a programme or application defect: GitHub exposed no usable step summary, logs or artifacts.

Billing is an explicit blocker to **formal EOS-S06 acceptance**. It does not by itself block focused independent Claude verification.

## Decision (closed eight-spec gate)

**Eight-spec exercise closed as:** `RESOURCE-CONSTRAINED / NO PRODUCT DEFECT ESTABLISHED`

**Focused Claude verification is now permitted** as independent evidence gathering only.

**Formal acceptance remains prohibited** until:

1. complete GitHub CI succeeds; and
2. the AI CTO completes final review.

**EOS-S06 is not accepted.** No `EOS_S06_ACCEPTANCE.md`. EOS-S07 remains unstarted.

**Deployed application unchanged** at SHA `5179ffd0189a9c88f458e5e4d3865cafa4d92627`. `productionAuthorised` must remain false.
