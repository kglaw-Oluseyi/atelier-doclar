# CAP1000 product-install OOM — root cause and closure

**Recorded:** 2026-09-18T01:05:00Z (initial); **reconciled:** 2026-09-18T03:54:00Z  
**Disposition:** PASS (product-path install closed; solver untouched)  
**Current CAP1000 event:** `29567b2d-fc51-41cc-acb8-4acb726fed17` (flush-every=5 on-box completion)  
**Prior PASS event (flush-25):** `5fc07db4-96c8-4d1a-840f-4534672789d6` (cleaned before flush-5 rerun)  
**Install path:** event-os container → `postgres.railway.internal`

## Phase 0 — Ambiguous 3GB abort

Artifact: [`CAP1000_PRODUCT_INSTALL_PHASE0_ABORT.json`](./CAP1000_PRODUCT_INSTALL_PHASE0_ABORT.json)

| Attempt | Classification | Evidence |
|---|---|---|
| Live Railway, `--max-old-space-size=1024` | **OOM_KILL_HEAP_LIMIT** | [`CAP1000_PRODUCT_INSTALL_LIVE_OOM_1024.log`](./CAP1000_PRODUCT_INSTALL_LIVE_OOM_1024.log): `FATAL ERROR: Reached heap limit`, pnpm exit **134** |
| Combined flush-test + 3GB live retry | **UNDETERMINED** | `/tmp/flush-test2.log` is 15 bytes (`TAP version 13` only); no exit_code/signal/terminal footer. Agent spawn aborted mid-command — **not** proven as OOM, timeout, or success |

## Root cause (two layers)

### Layer A — pending `replace()` queue (prior proof, kept)

`PostgresPlatformStore.replace()` queues full previous/next snapshot clones until `flush()`. Layout/guest batches without flush retain many production-sized clone pairs.

Ephemeral empty-Postgres BEFORE/AFTER (batch flush + guest flush):

| Mode | Peak RSS | Peak heap | Max pending |
|---|---|---|---|
| BEFORE | ~945 MB | ~660 MB | 124 |
| AFTER (flush cadence) | ~525 MB | ~379 MB | 46 |

Artifacts: `CAP1000_PRODUCT_INSTALL_BEFORE.jsonl`, `CAP1000_PRODUCT_INSTALL_AFTER*.jsonl`.

### Layer B — `mutate()` double-clone + full hydrate (this closure)

`PlatformService.mutate` (`service.ts` ~8785):

1. `const snap = this.store.snapshot()` → full `structuredClone` of entire platform state  
2. command mutates `snap`  
3. `this.store.replace(snap)` → clones again inside `replace()` before diffing  

Independent of flush cadence: **every command** pays ~2× in-memory state size.

`PostgresPlatformStore.hydrate()` loads **all** `platform_documents`, `platform_audit`, and `platform_idempotency` unconditionally.

## Phase 1 — Per-collection cost (read-only SQL)

Artifact: [`CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS.json`](./CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS.json) (pre-fix); refreshed [`CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS_NOW.json`](./CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS_NOW.json)

Method: `COUNT(*)` + `SUM(pg_column_size(...))` — **no** in-memory snapshot clone.

| Source | Approx serialized (NOW) | Notes |
|---|---|---|
| platform_documents (all) | **18.697 MiB** | Unscoped in this fix |
| platform_audit | 8.672 MiB | Omitted from installer hydrate |
| platform_idempotency | 2.387 MiB | Prefix-filtered for installer |
| **Grand** | **29.756 MiB** | Still tens of MiB, not GiB |

Largest document collection NOW: `operationalGuests` **3995 rows / 5.565 MiB**.

## Phase 2 — Audit/idempotency read-safety

Artifact: [`CAP1000_PRODUCT_INSTALL_PHASE2_AUDIT_READ_SAFETY.json`](./CAP1000_PRODUCT_INSTALL_PHASE2_AUDIT_READ_SAFETY.json)

**Conclusion: SAFE_TO_SCOPE** for historical audit omit + `cap1000-live-%` idempotency filter.

## Phase 3 — What was scoped (installer-only)

| Behaviour | Default `open()` | CAP1000 installer |
|---|---|---|
| `platform_documents` | full | full (unchanged) |
| `platform_audit` | full hydrate | **omit historical** |
| `platform_idempotency` | full | **`WHERE key LIKE 'cap1000-live-%'`** |

Combined with flush cadence (per-table layout flush; CAP1000 guest flush default 5).

---

## Reconciliation items (2026-09-18)

### ITEM 1 — Why ephemeral ~495.5 MB vs live flush-25 ~2539.6 MB

Artifact: [`CAP1000_PRODUCT_INSTALL_ITEM1_GAP_ANALYSIS.json`](./CAP1000_PRODUCT_INSTALL_ITEM1_GAP_ANALYSIS.json)

| Milestone | Ephemeral AFTER scoped | Live flush-25 |
|---|---|---|
| after.storeOpen | 152.1 MB | 263.1 MB |
| after.seed | **170.7 MB** | **823.1 MB** |
| before.guests | 353.2 MB | 596.7 MB |
| first guest window (g=25) | — | **2022.3 MB** |
| peak | **495.5 MB** | **2539.6 MB** @ guest 525 |

**Finding (plain):** The gap is **not** explained by the ~30 MiB raw SQL footprint. Live hydrates the full production `platform_documents` graph (Phase 1’s dominant share; `operationalGuests` 5.565 MiB / 3995 rows at query time). Ephemeral never had that corpus (`after.seed` 170.7 vs 823.1 MB). On live, RSS then **grows across the install** during guest mutation windows (596.7 → 2022.3 MB by guest 25 under flush-25) because each `mutate`/`replace` double-clones that production-sized state and the flush queue retains clones. Audit scoping worked (`after.storeOpen` 263 MB); the remaining mass is unscoped documents + clone retention.

**Further scoping:** propose only — installer-only filter for `operationalGuests` (+ `guestIntakeCandidates` 2.641 MiB). Not implemented here; expected new peak not claimed without a measured run.

### ITEM 2 — Flush-every=5 completed on-box

Tunnel flush-5 reached ~612 MB @ ~215/1000 then SSH-dropped (not OOM). Completed on-box:

| Run | guest-flush-every | Peak RSS | Peak heap | Outcome |
|---|---|---|---|---|
| On-box | **25** | 2539.6 MB | 1675.2 MB | PASS (`5fc07db4…`, later cleaned) |
| On-box | **5** | **1506.4 MB** | **1259.0 MB** | **PASS** (`29567b2d…`) |

Telemetry: [`CAP1000_PRODUCT_INSTALL_LIVE_FLUSH5.jsonl`](./CAP1000_PRODUCT_INSTALL_LIVE_FLUSH5.jsonl)

**Finding:** Flush-5 **does** reduce peak vs flush-25 by **1033.2 MB (40.7%)**. Layer A remains a real lever on production-sized state. It does **not** close the gap to ephemeral (~495 MB) — consistent with Item 1 (documents mass dominates each clone).

### ITEM 3 — Actual memory ceiling and headroom

Artifact: [`CAP1000_PRODUCT_INSTALL_MEMORY_CEILING.json`](./CAP1000_PRODUCT_INSTALL_MEMORY_CEILING.json)

| Source | Value |
|---|---|
| `railway metrics -s event-os --memory --json` `limit_mb` | **24576.0 MB** |
| cgroup `/sys/fs/cgroup/memory.max` on event-os | 24000000000 bytes ≈ **22888.2 MiB** |

Authoritative ceiling used for margin: **24576 MB** (Railway metrics API for service `event-os` / `31c25514-…`).

| Peak (flush-5) | Ceiling | Headroom |
|---|---|---|
| 1506.4 MB RSS | 24576 MB | **23069.6 MB (93.87% of ceiling free)** |

### ITEM 4 — `duplicateFixtureCount` semantics

The REPORT field `"duplicateFixtureCount": 1` was **not** sourced from installer code. It was a hand-written count of:

```sql
SELECT id FROM platform_documents
WHERE collection='events' AND body->>'code'='CAP1000';
```

**Meaning:** total CAP1000-coded events in production at report time (= **1**). It means **exactly one CAP1000 fixture exists** (no duplicate), **not** “one duplicate found”. Renamed in REPORT to `cap1000EventCount` with an explicit comment; query recorded alongside.

---

## Memory profiles (updated)

| Run | Peak RSS | Peak heap | Outcome |
|---|---|---|---|
| Ephemeral BEFORE | 945 MB | 660 MB | PASS (diag) |
| Ephemeral AFTER (flush) | 495.5 MB | ~379 MB | PASS |
| Live 1024 MB heap (pre-scope) | OOM mid layout.batch 1 | — | FAIL exit 134 |
| Live scoped tunnel flush-5 | ~612 MB @~215 guests | ~515 MB | Tunnel drop, not OOM |
| Live scoped on-box flush-25 | 2539.6 MB | 1675.2 MB | PASS then cleaned |
| **Live scoped on-box flush-5** | **1506.4 MB** | **1259.0 MB** | **PASS (current)** |

## Live product-path result (current)

- Event `29567b2d-fc51-41cc-acb8-4acb726fed17` — 1000 guests / 110 tables / 1000 seats  
- `cap1000EventCount` = **1** (query above)  
- Frozen worker unchanged: deploy `57b5c9fb-…`, digest `sha256:276c6858…788f`  
- No Event OS / worker deploy; no Railway config change  

## OPEN — UNFIXED (governance)

**`platform_audit` / `platform_idempotency` permanent growth** — no delete path in repo; retention decision required; not resolved here.

## Document scoping proposal (not implemented)

Installer-only event filter for `operationalGuests` (+ `guestIntakeCandidates`) — sizes above; requires separate authorisation and a measured peak before claiming headroom gain.
