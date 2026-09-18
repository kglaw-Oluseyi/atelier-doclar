# DB collection mapping report — platform_documents / platform_audit / platform_idempotency

**Recorded:** 2026-09-18T04:40:05.857Z (inventory) / 2026-09-18T04:41:00Z (classification refine)  
**Method:** read-only SQL `COUNT(*)` + `SUM(pg_column_size(...))` via `railway ssh event-os` → `postgres.railway.internal`  
**Scope:** REPORT ONLY — no writes, no schema/code changes, no retention proposal  
**Raw artifacts:**  
- [`DB_COLLECTION_INVENTORY.json`](./DB_COLLECTION_INVENTORY.json)  
- [`DB_COLLECTION_CLASSIFICATION.json`](./DB_COLLECTION_CLASSIFICATION.json)  
- [`DB_COLLECTION_DOCUMENTS_BY_COLLECTION.csv`](./DB_COLLECTION_DOCUMENTS_BY_COLLECTION.csv) (193 rows)  
- [`DB_COLLECTION_IDEMPOTENCY_BY_PREFIX.csv`](./DB_COLLECTION_IDEMPOTENCY_BY_PREFIX.csv)  
- [`DB_COLLECTION_AUDIT_BY_ACTION.csv`](./DB_COLLECTION_AUDIT_BY_ACTION.csv)  
- [`DB_COLLECTION_GROWTH_WEEKLY.csv`](./DB_COLLECTION_GROWTH_WEEKLY.csv)

---

## Snapshot totals (this run)

| Table | Rows | Body bytes | Approx row bytes | Approx MiB |
|---|---:|---:|---:|---:|
| `platform_documents` | 18 499 | 17 021 649 | 19 664 548 | **18.754** |
| `platform_audit` | 14 499 | 10 885 168 | 13 252 175 | **12.638** |
| `platform_idempotency` | 5 590 | 1 505 633 | 2 502 576 | **2.387** |
| **Combined** | **38 588** | | **35 419 299** | **~33.8** |

Approx row bytes = sum of `pg_column_size` over all columns (same discipline as `CAP1000_PRODUCT_INSTALL_COLLECTION_COSTS_NOW.json`).

---

## 1. Per-collection inventory

### 1.1 `platform_documents` — full breakout by `collection`

**193 distinct `collection` values.** Full list sorted by size: CSV above. Top 15:

| Approx MiB | Rows | collection |
|---:|---:|---|
| 5.565 | 3995 | operationalGuests |
| 2.649 | 2150 | guestIntakeCandidates |
| 1.679 | 1858 | rsvpResponses |
| 1.303 | 1852 | rsvpReceipts |
| 1.193 | 505 | layoutRevisions |
| 1.006 | 1987 | staffSessions |
| 0.434 | 427 | budgetLines |
| 0.352 | 395 | layoutCommands |
| 0.302 | 201 | aiEvaluationCaseResults |
| 0.278 | 526 | guestHouseholds |
| 0.261 | 426 | coverageAssessments |
| 0.252 | 188 | layoutValidationFindings |
| 0.225 | 1 | atelierCommandLedgers |
| 0.181 | 62 | budgetScenarioEditions |
| 0.171 | 238 | assignments |

Schema columns present: `collection`, `id`, `organisation_id`, `client_id`, `event_id`, `version`, `body` (jsonb). **No** `created_at` / `updated_at` columns on the table (timestamps only inside some bodies).

### 1.2 `platform_audit`

| Metric | Value |
|---|---|
| Rows | 14 499 |
| Approx MiB | 12.638 |
| Oldest `occurred_at` | 2026-09-06T18:39:55.075Z |
| Newest `occurred_at` | 2026-09-18T03:38:22.005Z |

**Schema columns:** `id`, `occurred_at`, `organisation_id`, `client_id`, `event_id`, `action`, `outcome`, `body`.

**JSON body keys actually present:** `actorPersonId`, `actorType`, `action`, `outcome`, `occurredAt`, `organisationId`, `clientId`, `eventId`, `resourceType`, `resourceId`, `service`, `correlationId`, `idempotencyKey`, `metadata`, `reason`, `beforeHash`, `afterHash`, `id`, `schemaVersion`.

**Breakdowns that exist (used):**

| Dimension | Finding |
|---|---|
| `outcome` | Nearly all SUCCESS (see inventory) |
| `action` | Dominated by `guest.intake.created` (3711), `rsvp.response.staff_amended` (3677), `auth.session.issued` (1987) — full list in CSV |
| `body.actorType` | USER 14480; VENDOR_CAPABILITY 7; GUEST_CAPABILITY 6; HOST_CAPABILITY 6 |
| `body.actorPersonId` | Seed-looking UUIDs (`…000041`–`…000048`) dominate; not a production-vs-synthetic discriminator by itself |
| `event_id` null vs set | null: **3403** rows (1.815 MiB body); set: **11096** rows |

There is **no** `synthetic` / `fixture` / `qualification` column on `platform_audit`.

### 1.3 `platform_idempotency`

| Metric | Value |
|---|---|
| Rows | 5 590 |
| Approx MiB | 2.387 |
| Oldest `created_at` | 2026-09-06T20:00:12.308Z |
| Newest `created_at` | 2026-09-18T03:38:22.005Z |

**Schema columns:** `key`, `action`, `hash`, `result_ref`, `created_at`, `body`.

**Prefix breakout** (text before first UUID segment; keys with no UUID → `(no-uuid-in-key)`; bare UUID keys → `(bare-uuid)`):

| Rows | Approx MiB | key_prefix |
|---:|---:|---|
| 2284 | 0.933 | `(bare-uuid)` |
| 2007 | 0.937 | `cap1000-live` |
| 1218 | 0.480 | `(no-uuid-in-key)` — mostly `cap600-live-guest-N-*` (no embedded UUID) |
| 17 | 0.008 | `export-complete:` |
| ≤7 each | | `m6d-ux-*`, `s06c-live-grant-*`, `m6b-live-*`, etc. |

**Refined LIKE buckets** (clearer for capacity):

| Bucket | Rows | Approx bytes |
|---|---:|---:|
| bare-uuid-key | 2213 | 945 757 |
| `cap1000-live-%` | 2007 | 982 833 |
| `cap600-live-%` | 1207 | 499 101 |
| `cap2000-live-%` | **0** | — |
| s06c-% / m6d-% / m6b-% / export-complete: / other | 163 | ~75 k |

No CAP2000 event row exists in `events` today (`CAP2000` count = 0).

---

## 2. Growth signal (last 90 days)

Range for both audit and idempotency is **~12 days** (2026-09-06 → 2026-09-18), entirely inside the 90-day window. Weekly UTC buckets:

### `platform_audit` by week

| Week start (UTC) | Rows |
|---|---:|
| 2026-08-31 | 68 |
| 2026-09-07 | 4 582 |
| 2026-09-14 | 9 849 |

### `platform_idempotency` by week

| Week start (UTC) | Rows |
|---|---:|
| 2026-08-31 | 24 |
| 2026-09-07 | 1 811 |
| 2026-09-14 | 3 755 |

**Accumulation rate (observed):** audit ~1.2k rows/day average over the window, with the latest partial week already at 9.8k; idempotency ~465 rows/day average, latest week 3.8k. This is dominated by capacity/qualification install traffic (see §4), not a long production baseline.

---

## 3. Synthetic vs real — classification reliability

### `platform_documents`

| Signal | Reliable? | Notes |
|---|---|---|
| Event `body.code` ∈ {CAP600, CAP1000, CAP2000} | **Yes** for those codes | CAP1000 + CAP600 present; CAP2000 absent |
| Event `body.name` contains `[SYNTHETIC` / `QUALIFICATION` / `Synthetic` | **Yes** for named fixtures | Used by capacity + S06C qualification events |
| Guest email `@cap1000.example.test` / `@cap600.example.test` | **Yes** for operationalGuests | 1000 + 600 rows respectively; also 2103 `@*.example.test` other |
| Explicit synthetic boolean column | **No** | Does not exist |
| Everything else (S07*, WED-01, P8*, unclassified codes) | **No single reliable flag** | Naming conventions vary; many look like programme/test fixtures but are not labeled |

**Verdict:** Partial reliability. Capacity + bracket-named synthetic events are queryable. A large remainder of events (58/`unclassified` by a coarse name/code heuristic) **cannot** be safely labeled synthetic vs genuine Maison Doclar production from schema alone.

### `platform_audit`

| Signal | Reliable? | Notes |
|---|---|---|
| Join `event_id` → `events` synthetic naming/codes | **Partial** | Works only while the event row still exists |
| Orphan `event_id` (event row deleted) | **Historical only** | Proves past activity; cannot re-prove provenance from documents |
| `actorType` / `actorPersonId` | **No** | Seed staff UUIDs used for both fixture and normal product-path writes |
| Explicit synthetic flag | **No** | |

**Verdict:** **No reliable standalone synthetic flag.** Best available signal is event join; after document cleanup, audit rows become orphans with no live event provenance.

### `platform_idempotency`

| Signal | Reliable? | Notes |
|---|---|---|
| Key prefix `cap1000-live-%` / `cap600-live-%` / `cap2000-live-%` | **Yes** | Installer-owned capacity keys |
| Prefixes `s06c-%`, `m6b-%`, `m6d-%` | **Likely fixture** | Convention-based, not a governed flag |
| Bare UUID keys (2213 rows) | **No** | Opaque; no synthetic marker in key or body |

**Verdict:** Capacity-live prefixes are reliable. Bare-UUID majority of non-capacity keys has **no** reliable synthetic/real discriminator.

---

## 4. Cross-reference — fraction tied to synthetic/qualification (best available signals)

### Confidence summary

| Collection | Split confidence | Why |
|---|---|---|
| Idempotency capacity-live prefixes | **High** | Exact key prefix |
| Documents joined to capacity / `[SYNTHETIC…]` / QUALIFICATION events | **Medium–high** for those events; **low** for unclassified | Naming is intentional for capacity/S06C; other events ambiguous |
| Audit joined to living synthetic-named events | **Medium** | Join works; orphans + null-event inflate ambiguity |
| “Real Maison Doclar production” remainder | **Low** | Cannot prove; unclassified may still be programme/test |

### `platform_idempotency` (high confidence on capacity prefixes)

| Class | Rows | % of 5590 | Approx bytes | % bytes |
|---|---:|---:|---:|---:|
| `cap1000-live-%` + `cap600-live-%` | 3 214 | **57.5%** | 1 481 934 | **59.2%** |
| Explicit programme prefixes (s06c/m6b/m6d/export/other-cap) | 85 | 1.5% | ~39 k | ~1.6% |
| bare-uuid + other (no reliable label) | 2 291 | **41.0%** | ~981 k | ~39.2% |

### `platform_documents` (broader event-join heuristic)

| Class | Doc rows | % | Body bytes |
|---|---:|---:|---:|
| capacity (CAP600/CAP1000) | 5 201 | 28.1% | 5 009 301 |
| named_synthetic (name markers) | 4 987 | 27.0% | 5 726 934 |
| m6d | 349 | 1.9% | 315 036 |
| seed_demo (WED/A1/A2/O1/P8/CLAUDE) | 791 | 4.3% | 719 788 |
| null_event_id | 5 085 | 27.5% | 3 374 631 |
| unclassified_possibly_real | 2 086 | 11.3% | 1 875 959 |

**Do not read `unclassified_possibly_real` as proven production.** Many remaining event codes look like S07*/seating programme fixtures without a synthetic name token.

### `platform_audit` (broader event-join heuristic)

| Class | Audit rows | % of 14499 | Body bytes |
|---|---:|---:|---:|
| orphan_deleted_or_missing_event | 4 319 | **29.8%** | 3 623 939 |
| capacity (living CAP600/CAP1000) | 3 425 | 23.6% | 2 827 833 |
| null_event | 3 403 | 23.5% | 1 903 530 |
| unclassified_possibly_real | 1 832 | 12.6% | 1 382 332 |
| seed_demo | 1 150 | 7.9% | 851 970 |
| m6d | 210 | 1.4% | 169 966 |
| named_synthetic (living) | 160 | 1.1% | 125 598 |

Of the **4319** orphan audit rows, **4307** (`99.7%`) reference the five known cleaned CAP1000 event ids (see §5). Remaining **12** orphan audit rows reference other missing event ids — evidence of additional historical event removal beyond the five CAP1000 manifests, but without identifying manifests in-repo for those 12.

---

## 5. Deletion honesty check — were all deletions receipted?

### What the database itself records

| Source | Finding |
|---|---|
| `platform_cleanup_audit` | **1 row only**, `mode=PREVIEW`, `confirmed=false`, `occurred_at=2026-09-06T19:13:58Z` |
| `synthetic-cleanup.ts` EXECUTED | **No EXECUTED receipt exists in production** |

So the governed `synthetic-cleanup.ts --execute --confirm SYNTHETIC_CLEANUP_CONFIRMED` path has **not** been used to delete production data (or at least never wrote an EXECUTED audit row).

### Evidence-pack manifests (repo docs, not DB)

| Event id | Manifest | Path |
|---|---|---|
| `3d212906-…` | `CAP1000_PRODUCT_INSTALL_CLEANUP_MANIFEST.json` | Ad-hoc gated SQL (not synthetic-cleanup.ts) |
| `2a103d69-…` | `…_CLEANUP_MANIFEST_2a103d69.json` | Ad-hoc gated SQL |
| `1cfd0884-…` | `…_CLEANUP_MANIFEST_1cfd0884-….json` | Ad-hoc gated SQL |
| `5fc07db4-…` | `…_CLEANUP_MANIFEST_5fc07db4-….json` | Ad-hoc on-box SQL; explicitly **not** governed path |

### Undocumented deletion found

| Event id | Evidence | Manifest? |
|---|---|---|
| `05b8f727-99bc-4cda-a791-cf180ac62aa1` | Agent terminal 85067: `DELETED { docs: 1536, idem: 864 }` before flush-25 install of `5fc07db4…`; orphan audit still **988** rows for this `event_id`; docs/idem for it now **0** | **No** repo cleanup manifest |

### Anomalies

- Orphan audit total 4319 − known-five cleaned CAP1000 orphans 4307 = **12** additional orphan audit rows → other event ids were removed from `platform_documents` at some point without a matching in-repo CAP1000 cleanup manifest (and without `platform_cleanup_audit` EXECUTED).
- `platform_audit` / `platform_idempotency` were **not** deleted by these cleanups (orphaned audit mass remains; cleaned events’ `cap1000-live-*` idempotency keys were deleted in the ad-hoc scripts).

### Plain answer

**No — not every deletion was fully receipted through the governed mechanism.**  
`synthetic-cleanup.ts` EXECUTED was never receipted in DB. Multiple CAP1000 document/idempotency deletions used ad-hoc SQL; four have evidence-pack manifests; **at least one (`05b8f727…`) has no manifest**; **12 residual orphan audit event ids** indicate further undocumented document-side removals. This report does not invent manifests for those gaps.

---

## Explicit non-goals (this deliverable)

- No retention / cleanup / deletion design or recommendation.  
- No application or schema changes.  
- No solver / worker / Railway / S06B–S07 work.
