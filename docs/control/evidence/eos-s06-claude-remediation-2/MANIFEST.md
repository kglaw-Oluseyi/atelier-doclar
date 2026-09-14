# EOS-S06 — Claude remediation 2 evidence

**Prompt:** Maison Doclar EOS-S06 — Targeted Remediation 2  
**Not acceptance.** EOS-S06 remains unaccepted. CI mandatory. EOS-S07 unstarted.  
**Prior package:** [`../eos-s06-claude-remediation/MANIFEST.md`](../eos-s06-claude-remediation/MANIFEST.md)

## Claude halt (controlling observations)

1. Seven semantically identical ACTIVE `KEEP_APART` rules on Alpha One, hash prefix `434a2ddc58fe`, presented as independently governing/withdrawable.
2. Two equivalent DRAFT records still showing Activate.
3. Export PDF/CEO request: server created `PDF · READY · FULL`, client React minified error **#418**, blank page; reload recovered.

## Duplicate timeline (read-only)

Full semantic hash (all matching rows):

`434a2ddc58fe7e7898fb577e94c9fc00382286040759124b9c6fa7b2e96a087b`

Subjects (identical for every matching edition):

`EVENT_GUEST:00000000-0000-4000-8000-000000000072` + `EVENT_GUEST:00000000-0000-4000-8000-000000000073`

Scope: org `…0001` / event Alpha One `…0021` / KEEP_APART HARD TABLE / domain NONE.

| Lifecycle | Count | Relative to deploy `0ca9ceb` |
|-----------|-------|------------------------------|
| ACTIVE | 7 | **all BEFORE** (`2026-09-12`) |
| DRAFT | 2 | **all BEFORE** |
| WITHDRAWN (same hash) | 14 | BEFORE |

Authoritative survivor (earliest `activatedAt`, then `id`):

`ed40f48d-e0cd-4344-bd4c-2a8099cc9b15` · activated `2026-09-12T19:16:30.587Z` · createdBy planner `…0043` · activatedBy director `…0042`

Redundant ACTIVE IDs (withdraw targets):

- `23c92cab-2af8-4a8e-879c-6175bbaa8dc0`
- `22811aff-7698-4bbd-8659-aa7fda77cfaf`
- `f8f2e306-8acf-40df-8a20-c415d0192bd3`
- `6b675ad8-71ca-4ae2-bb26-07c1729f70fc`
- `61de83d1-2079-4ec2-b2f6-e6b693e64b44`
- `59114f29-614c-4d44-8682-85bb097d38e0`

Equivalent DRAFT IDs:

- `b94a7d8f-d00b-4b32-bf52-06726747c2fc`
- `8f3b8989-b4a0-4cfb-bc85-166e1f5362e1`

Query proof: `created_or_activated_after_0ca9ceb = 0` for this hash.

## Root-cause classification

**`HISTORICAL RESIDUE ONLY`**

No duplicate became ACTIVE through deployed `0ca9ceb4…` command path. Residue predates semantic uniqueness enforcement (live activations on `2026-09-12` via director `seatingV2.activateRule` before the guard).

## Semantic identity / invariant

- Identity: full `seatingV2RuleContentHash` (order-normalised subjects/targets).
- Scope: organisation + event.
- Activate path: `lockEventCurrent` + ACTIVE contentHash check → `REPLAYED` / `ALREADY_ACTIVE`.
- Export path: reuse READY job with same source/hash/format/projection → replay.
- Fixture/direct store writes that force ACTIVE remain possible only outside command path; operational UI no longer presents them as independent authorities.

## Historical-duplicate UI treatment

- Governing list: only authoritative ACTIVE (`duplicateRole=AUTHORITATIVE`) with Withdraw.
- Redundant ACTIVE: Historical disclosure, labelled not separately governing; no Withdraw from Governing.
- Equivalent DRAFT: `ALREADY ACTIVE` copy naming authoritative id; Activate suppressed; server still returns ALREADY_ACTIVE/REPLAYED if forced.

## Export crash

**Root cause:** `IdempotencyField` generated `crypto.randomUUID()` inside `useState` initializer during SSR of client components → server/client HTML mismatch → React hydration error **#418** → blank client tree after redirect.

**Fix:** defer UUID until `useEffect` mount; `suppressHydrationWarning` on the hidden input. Defence: seating `error.tsx` boundary; export list stable string fields + semantic export reuse.

## Focused tests

| Gate | Result |
|------|--------|
| `seating-v2-legacy-duplicate-remediation.test.ts` | 5/5 |
| `seating-v2-command-path.test.ts` (prior activate guards) | 10/10 |
| Playwright `s06-claude-remediation-2.spec.ts` | 6/6 |
| event-os + shared-platform typecheck | pass |

## Remaining Claude scope

See `CLAUDE_CONTINUATION_PROMPT.md`.
