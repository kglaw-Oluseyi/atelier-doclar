# EOS-S06 — Claude remediation 2 evidence

**Prompt:** Maison Doclar EOS-S06 — Targeted Remediation 2  
**Not acceptance.** EOS-S06 remains unaccepted. CI mandatory. EOS-S07 unstarted.  
**Prior package:** [`../eos-s06-claude-remediation/MANIFEST.md`](../eos-s06-claude-remediation/MANIFEST.md)

## Identities

| Role | SHA |
|------|-----|
| Rem 2 start docs HEAD | `8f64fe5…` |
| Rem 2 start deployed Event OS | `0ca9ceb4bc3a9c589f21f4f3b89948f12ea57410` |
| Rem 2 application commit (initial) | `fc839fc955e670066f422593385e7481b80acb62` |
| Rem 2 hot-fix (Date stamp coerce) | *(see ending SHA in final report)* |
| Railway event-os (after initial rem2) | `b4215df8-796a-43cf-912b-c70fafa9f25b` · SUCCESS · `fc839fc…` |

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
- Authoritative survivor selection coerces Postgres `Date` stamps via `ruleLifecycleStamp` before compare (hot-fix after `fc839fc` blanked seating when annotation called `.localeCompare` on Date).

## Historical-duplicate UI treatment

- Governing list: only authoritative ACTIVE (`duplicateRole=AUTHORITATIVE`) with Withdraw.
- Redundant ACTIVE: Historical disclosure, labelled not separately governing; no Withdraw from Governing.
- Equivalent DRAFT: `ALREADY ACTIVE` copy naming authoritative id; Activate suppressed; server still returns ALREADY_ACTIVE/REPLAYED if forced.

## Reconciliation

Reason: `LEGACY_DUPLICATE_RECONCILIATION_AFTER_SEMANTIC_UNIQUENESS_ENFORCEMENT`

### Dry-run

```json
{
  "contentHash": "434a2ddc58fe7e7898fb577e94c9fc00382286040759124b9c6fa7b2e96a087b",
  "authoritativeId": "ed40f48d-e0cd-4344-bd4c-2a8099cc9b15",
  "withdrawActiveIds": [
    "23c92cab-2af8-4a8e-879c-6175bbaa8dc0",
    "22811aff-7698-4bbd-8659-aa7fda77cfaf",
    "f8f2e306-8acf-40df-8a20-c415d0192bd3",
    "6b675ad8-71ca-4ae2-bb26-07c1729f70fc",
    "61de83d1-2079-4ec2-b2f6-e6b693e64b44",
    "59114f29-614c-4d44-8682-85bb097d38e0"
  ],
  "withdrawDraftIds": [
    "b94a7d8f-d00b-4b32-bf52-06726747c2fc",
    "8f3b8989-b4a0-4cfb-bc85-166e1f5362e1"
  ],
  "reason": "LEGACY_DUPLICATE_RECONCILIATION_AFTER_SEMANTIC_UNIQUENESS_ENFORCEMENT",
  "dryRun": true
}
```

### Execute (once, after `fc839fc` healthy)

- Withdrew 6 redundant ACTIVE + 2 DRAFT → `WITHDRAWN` with reason above.
- Remaining ACTIVE: only `ed40f48d-e0cd-4344-bd4c-2a8099cc9b15`.
- `platform_audit`: 8 rows action `seatingV2.reconcileLegacyDuplicateRules` SUCCESS.
- Idempotent re-dry-run: empty withdraw lists.
- Lifecycle counts for hash: ACTIVE 1 · WITHDRAWN 22 (includes prior withdrawals).

No raw deletion. Historical audit rows preserved.

## Export crash

**Root cause:** `IdempotencyField` generated `crypto.randomUUID()` inside `useState` initializer during SSR of client components → server/client HTML mismatch → React hydration error **#418** → blank client tree after redirect.

**Fix:** defer UUID until `useEffect` mount; `suppressHydrationWarning` on the hidden input. Defence: seating `error.tsx` boundary; export list stable string fields + semantic export reuse.

## Post-deploy hot-fix

After `fc839fc` deploy + reconciliation, CEO/Director seating GET returned operational FORBIDDEN because `annotateSemanticRuleDuplicates` → `selectAuthoritativeActiveRule` called `.localeCompare` on Postgres `Date` values. Hot-fix coerces stamps; focused unit test covers Date inputs.

## Focused tests

| Gate | Result |
|------|--------|
| `seating-v2-legacy-duplicate-remediation.test.ts` | 6/6 |
| Playwright `s06-claude-remediation-2.spec.ts` | 6/6 (pre-hot-fix) |
| event-os + shared-platform typecheck | pass |

## Remaining Claude scope

See `CLAUDE_CONTINUATION_PROMPT.md`.
