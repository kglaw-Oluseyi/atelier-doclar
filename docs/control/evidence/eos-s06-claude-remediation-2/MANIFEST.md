# EOS-S06 — Claude remediation 2 evidence

**Prompt:** Maison Doclar EOS-S06 — Targeted Remediation 2  
**Not acceptance.** EOS-S06 remains unaccepted. CI mandatory. EOS-S07 unstarted.  
**Prior package:** [`../eos-s06-claude-remediation/MANIFEST.md`](../eos-s06-claude-remediation/MANIFEST.md)

## Identities

| Role | SHA / ID |
|------|----------|
| Rem 2 start docs HEAD | `8f64fe5…` |
| Rem 2 start deployed Event OS | `0ca9ceb4bc3a9c589f21f4f3b89948f12ea57410` |
| Rem 2 application commits | `fc839fc…` (UI/guard/reconcile/export idempotency) · `40c609c…` (Date stamp coerce) · `af3902f…` (CanonicalTime Intl defer) · `9497f54…` (details-in-`<p>` hydration) |
| Ending HEAD / deployed Event OS | `9497f543ebfb7289170a3acc4d1ab69f20281692` |
| Railway event-os deployments | `b4215df8-…` (`fc839fc`) · `c70c404b-…` (`40c609c`) · `07a5df48-…` (`af3902f`) · `f8a3c9a1-3361-4ae7-9c1f-e808d17aa725` (`9497f54`) SUCCESS |
| Control Tower | **not redeployed** (latest listed SKIPPED; untouched this pass) |

## Claude halt (controlling observations)

1. Seven semantically identical ACTIVE `KEEP_APART` rules on Alpha One, hash prefix `434a2ddc58fe`, presented as independently governing/withdrawable.
2. Two equivalent DRAFT records still showing Activate.
3. Export PDF/CEO request: server created `PDF · READY · FULL`, client React minified error **#418**, blank page; reload recovered.

## Duplicate timeline (read-only)

Full semantic hash (Claude KEEP_APART set):

`434a2ddc58fe7e7898fb577e94c9fc00382286040759124b9c6fa7b2e96a087b`

Subjects (identical):

`EVENT_GUEST:…0072` + `EVENT_GUEST:…0073`

Scope: org `…0001` / event Alpha One `…0021` / KEEP_APART HARD TABLE / domain NONE.

| Lifecycle (pre-reconcile) | Count | Relative to deploy `0ca9ceb` |
|---------------------------|-------|------------------------------|
| ACTIVE | 7 | **all BEFORE** (`2026-09-12`) |
| DRAFT | 2 | **all BEFORE** |

Authoritative survivor: `ed40f48d-e0cd-4344-bd4c-2a8099cc9b15` (earliest `activatedAt`, then `id`).

Query proof: `created_or_activated_after_0ca9ceb = 0` for this hash.

Additional Alpha One multi-ACTIVE residue (same historical window, reconciled in pass 2):

- `139d4b0f…` (4 ACTIVE)
- `2e8f84c6…` (4 ACTIVE + 4 equivalent DRAFT)
- `c4f363a9…` (2 ACTIVE)

## Root-cause classification

**`HISTORICAL RESIDUE ONLY`**

No duplicate became ACTIVE through deployed `0ca9ceb4…` (or later rem2) command path.

## Semantic identity / invariant

- Identity: full `seatingV2RuleContentHash` (order-normalised subjects/targets).
- Scope: organisation + event.
- Activate: `lockEventCurrent` + ACTIVE contentHash → `REPLAYED` / `ALREADY_ACTIVE`.
- Survivor selection: earliest `activatedAt ?? createdAt`, then `id`, via `ruleLifecycleStamp` (Postgres `Date`-safe).
- Export: reuse READY job with same source/hash/format/projection.
- UI: annotate AUTHORITATIVE / REDUNDANT_HISTORICAL / ALREADY_ACTIVE_DRAFT.

## Historical-duplicate UI treatment

- Governing: ACTIVE excluding `REDUNDANT_HISTORICAL`; Withdraw only there.
- Redundant ACTIVE: Historical list; “not separately governing”; no Governing Withdraw.
- Equivalent DRAFT: `ALREADY ACTIVE`; Activate suppressed; server still protected.

## Reconciliation

Reason: `LEGACY_DUPLICATE_RECONCILIATION_AFTER_SEMANTIC_UNIQUENESS_ENFORCEMENT`

1. Dry-run + execute for KEEP_APART hash `434a2ddc…` → 6 ACTIVE + 2 DRAFT withdrawn; 1 ACTIVE survivor `ed40f48d…`; 8 audit rows.
2. Dry-run + execute `--all` for remaining multi-ACTIVE hashes → 11 further withdrawals; `multiActiveRemaining: []`; idempotent re-dry-run `planCount: 0`.

No raw deletion. Prior audit preserved. Withdrawal reason recorded on editions + `platform_audit`.

## Export / hydration crash

| Layer | Cause | Fix |
|-------|-------|-----|
| Primary (Claude #418 + blank) | `IdempotencyField` UUID in `useState` during SSR | Defer key until mount; omit field until ready |
| Secondary | Postgres `Date` in duplicate annotation `.localeCompare` crashed workspace → false FORBIDDEN | `ruleLifecycleStamp` |
| Tertiary | `CanonicalTime` `<details>` nested under `<p>` (invalid HTML hoist → #418 on seating load) | Span-only exact-time toggle + `<div>` wrapper |
| Defence | Intl defer to mount; seating `error.tsx`; export READY reuse |

Live smoke after `9497f54`: load/export **no #418**; publication remains visible; PDF·READY persists across reload; export count stable (reuse).

## Focused tests

| Gate | Result |
|------|--------|
| `seating-v2-legacy-duplicate-remediation.test.ts` | 6/6 |
| Playwright `s06-claude-remediation-2.spec.ts` (excl. axe flake on contrast) | 5/5 |
| shared-platform typecheck | pass |
| `git diff --check` | pass |

## Remaining Claude scope

See `CLAUDE_CONTINUATION_PROMPT.md`.
