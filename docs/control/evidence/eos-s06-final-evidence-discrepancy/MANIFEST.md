# EOS-S06 — Final Evidence Discrepancy Correction

## Repository / deploy

| Item | Value |
| --- | --- |
| Docs / repo HEAD | `8246b38b4f9b1b2f18aa1af229d87a92e1848761` |
| Deployed Event OS SHA | `8246b38b4f9b1b2f18aa1af229d87a92e1848761` |
| Prior deployed SHA (pre-correction) | `52eb287fcd1e42ed3f4ab15bee024d0f018999ee` |
| Railway | atelier-doclar / production / event-os only |
| Control Tower | untouched (latest listed SKIPPED) |

## 1. Contradictory pair identities

Content-hash prefixes Claude reported are **edition content hashes**, not edition IDs.

| Hash prefix | Full edition ID | Kind | Lifecycle (final) | Subjects | Scope | Activated |
| --- | --- | --- | --- | --- | --- | --- |
| `90d5a7494b3d` | `e0dc270a-c57d-49fb-8dd9-c62544de3d2b` | KEEP_TOGETHER | **ACTIVE** (preserved) | Adaeze Okeke `4925be20-…` · Bola Adeyemi `63a36891-…` | TABLE HARD | 2026-09-14T14:48:51.493Z |
| `24a80dbb82df` | `44d2bef7-8a05-4904-88f3-07c6fa87f3de` | KEEP_APART | **WITHDRAWN** | same pair | TABLE HARD | 2026-09-15T05:37:21.675Z |

Event: `b4b6fb4f-3555-4467-8e6a-f7aac06c1ac4` (`S075S13-20260914T144613 Seating`) — **not** Alpha One. Prior reconcile script defaulted to Alpha One and therefore missed this pair.

## 2. Reconciliation

- Dry-run planned: preserve `e0dc270a-…` KEEP_TOGETHER; withdraw `44d2bef7-…` KEEP_APART.
- Reason: `VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD`
- Execute: UPDATE lifecycle → WITHDRAWN; platform_audit row written; records retained.
- Final contradictory ACTIVE pairs (global, same event+scope+subjects KEEP_TOGETHER∩KEEP_APART): **0**
- Withdrawn rule remains visible in history (`lifecycle=WITHDRAWN`, reason set).

## 3. Refusal wording

- `operationalStateFromCode("SEATING_HARD_RULE_CONFLICT")` → title **Activation not applied**, kind `conflict`, `dataChanged: no`, next step withdraw/supersede.
- Default / `INTERNAL_ERROR` still → unexpected server failure.
- Test: `apps/event-os/test/s06-hard-rule-conflict-refusal-copy.test.ts`

## 4. Successor fixture root cause

Cursor previously reported Alpha One (`…000021`) propose options after boot seed `ensureEosS06SuccessorLayoutFixture`. Claude inspected S073 event `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b`, which only had `S073-20260912T234215 hall`. Different events — not a missing Alpha One seed.

## 5. Live fixture records created (S073)

| Role | Layout ID | Publication ID | Hash prefix | Tables |
| --- | --- | --- | --- | --- |
| A | `e84e935f-7dad-4f35-ac14-627a83ffe377` | `1a66799c-98a3-42bf-aec3-ba3f3b851860` | `dc84e03a733f` | 2 |
| B | `39e7f51d-b000-4685-9d02-b04253bc8b63` | `d561ad55-69bb-487e-9de7-74f65dc527d0` | `785100a246bd` | 3 |

No ACTIVE binding forced (maker-checker propose/activate remains for Claude). Existing S073 hall CURRENT retained. Idempotent re-run preserved same IDs.

## 6. Eligible selector options after provision (live UI)

1. `EOS-S06 successor layout B · CURRENT publication 1 · hash 785100a246bd · 3 tables`
2. `S073-20260912T234215 hall · CURRENT publication 1 · hash 6d601448ca59 · 1 tables`
3. `Synthetic seating hall · CURRENT publication 1 · hash dc84e03a733f · 2 tables`

## 7. Focused validation

- hard-conflict e2e: pass
- refusal-copy unit: pass
- successor fixture + A→B journey unit: pass
- provision idempotency: pass
- live selector smoke: pass
- typecheck: pass
- `git diff --check`: pass

## 8. Runtime posture

- ready: true
- persistence: POSTGRES
- migrationStatus: APPLIED
- productionAuthorised: false
- providers/adapters: INACTIVE
- Control Tower: untouched
- EOS-S06: **unaccepted**
- EOS-S07: **unstarted**
