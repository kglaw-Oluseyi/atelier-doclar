# CAP1000 product-install OOM — root cause and closure

**Recorded:** 2026-09-18T01:05:00Z  
**Disposition:** PASS (product-path install closed; solver untouched)  
**Event:** `5fc07db4-96c8-4d1a-840f-4534672789d6`  
**Install path:** event-os container → `postgres.railway.internal` (tunnel attempts failed mid-guest on SSH drop, not OOM)

## Phase 0 — Ambiguous 3GB abort

Artifact: [`CAP1000_PRODUCT_INSTALL_PHASE0_ABORT.json`](./CAP1000_PRODUCT_INSTALL_PHASE0_ABORT.json)

| Attempt | Classification | Evidence |
|---|---|---|
| Live Railway, `--max-old-space-size=1024` | **OOM_KILL_HEAP_LIMIT** | `/tmp` + preserved [`CAP1000_PRODUCT_INSTALL_LIVE_OOM_1024.log`](./CAP1000_PRODUCT_INSTALL_LIVE_OOM_1024.log): `FATAL ERROR: Reached heap limit`, pnpm exit **134** |
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

Artifact: [`CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS.json`](./CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS.json)

Method: `COUNT(*)` + `SUM(pg_column_size(...))` on production via tunnel — **no** in-memory snapshot clone.

| Source | Approx serialized | Share |
|---|---|---|
| platform_documents (all collections) | ~15.1 MiB | 68.4% |
| **platform_audit** | **~5.5 MiB** | **25.0%** (single largest source) |
| platform_idempotency | ~1.4 MiB | 6.6% |

Largest document collection: `operationalGuests` (~4.2 MiB, 19%) — **less than audit**.

**Conclusion:** Scope **audit omit + idempotency prefix filter**. Leave `platform_documents` unscoped. Propose (do not implement) event-filtered `operationalGuests` / `guestIntakeCandidates` only if live proof still OOMs.

## Phase 2 — Audit/idempotency read-safety

Artifact: [`CAP1000_PRODUCT_INSTALL_PHASE2_AUDIT_READ_SAFETY.json`](./CAP1000_PRODUCT_INSTALL_PHASE2_AUDIT_READ_SAFETY.json)

**Conclusion: SAFE_TO_SCOPE**

- Install path only needs `snap.idempotency.find(key === this command’s key)` → prefix `cap1000-live-%` is exact for this installer  
- `writeAudit` append-only; list/export audit APIs not used during install  
- `persistTransactional` **inserts** new audit/idempotency only — never deletes historical rows missing from memory  

## Phase 3 — What was scoped (installer-only)

New entry: `openCapacityInstallPostgresStore` → `PostgresPlatformStore.openForCapacityInstall`

| Behaviour | Default `open()` | CAP1000 installer |
|---|---|---|
| `platform_documents` | full | full (unchanged) |
| `platform_audit` | full hydrate | **omit historical** (session writes still append+persist) |
| `platform_idempotency` | full | **`WHERE key LIKE 'cap1000-live-%'`** |

Combined with existing flush cadence (per-table layout flush when callback supplied; CAP1000 guest flush default 5; live run used `--guest-flush-every 25` for tunnel/on-box duration).

**Isolation:** CAP600 CLI still uses `PostgresPlatformStore.open()`. Event OS `runtime.ts` unchanged. Grep: scoped open only from capacity live-install / oom-diag scripts + tests.

## Memory profiles

| Run | Peak RSS | Peak heap | Outcome |
|---|---|---|---|
| Ephemeral BEFORE | 945 MB | 660 MB | PASS (diag) |
| Ephemeral AFTER (flush) | 525 MB | 379 MB | PASS |
| Live 1024 MB heap (pre-scope) | OOM mid layout.batch 1 | — | FAIL exit 134 |
| Live scoped via tunnel (flush every 5) | ~612 MB before SSH drop @~215 guests | ~515 MB | Tunnel fail, not OOM |
| Live scoped on-box (flush every 25) | **2539.6 MB** | **1675.2 MB** | **PASS** `process.complete` |

Live telemetry: [`CAP1000_PRODUCT_INSTALL_LIVE_SCOPED.jsonl`](./CAP1000_PRODUCT_INSTALL_LIVE_SCOPED.jsonl)

## Live product-path result

- Guests 1000 / tables 110 / seats 1000  
- Layout publications: 2 SUPERSEDED + 1 CURRENT; approvals 3  
- Role grants present (planner/director/CEO/auditor person ids)  
- Verify-only PASS (replay=true); second install PASS (replay=true); single CAP1000 event  
- Solver runs for event: **0**  
- Baseline adoption **CURRENT** unchanged: `3b771ad9-c4c9-401b-87df-0371f9eee840`  
- Frozen worker unchanged: deploy `57b5c9fb-4538-44ef-ad90-7d731a7db948`, image `m6e-worker-8c8d922`, digest `sha256:276c685860981d139f554548ed55f701253530808a0f914de848d1fa08fe788f`  
- No Event OS / worker deploy; no Railway config change  

## OPEN — UNFIXED (governance)

**`platform_audit` / `platform_idempotency` permanent growth**

Repo-wide: no delete path for audit or idempotency rows (only `platform_documents` via synthetic cleanup). Every qualification attempt (PASS, partial, OOM) leaves permanent rows. This is a **retention/governance** decision, not resolved by this task. Do not build deletion under OOM pressure.

## Document scoping proposal (not implemented)

If future installs still pressure memory: consider installer-only event/org filter for `operationalGuests` + `guestIntakeCandidates` (Phase 1 secondary costs). Requires separate authorisation — not done here.
