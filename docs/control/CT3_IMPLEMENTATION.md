# CT3 Implementation — Repository and CI ingestion

**Product:** FOUNDATION  
**Prompt Control ID:** `MD-PR-0004`  
**Native ID:** `CT3`  
**Slice ID:** `MD-CT3`  
**Status:** `IN_REVIEW`  
**Baseline:** `0f5257636479bf84851cb5b350cf76b1db0d70ab`

This slice implements the trusted ingestion boundary that converts GitHub repository and CI evidence into validated CT2 programme events. It does not implement `/programme`, HTTP application routing, a live GitHub client, Railway, or a production database.

## Package

Provider transport lives in `@maison-doclar/programme-ingestion`. The CT2 domain remains provider-independent.

| Item | Path |
|------|------|
| Allow-list | `packages/programme-ingestion/src/allowlist.ts` |
| Webhook HMAC | `packages/programme-ingestion/src/webhook.ts` |
| Inbound schemas | `packages/programme-ingestion/src/inbound.ts` |
| Linkage | `packages/programme-ingestion/src/linkage.ts` |
| Provider interface | `packages/programme-ingestion/src/provider.ts` |
| GitHub adapter | `packages/programme-ingestion/src/github-adapter.ts` |
| Synthetic provider | `packages/programme-ingestion/src/synthetic-provider.ts` |
| Translator | `packages/programme-ingestion/src/translator.ts` |
| Ingestion service | `packages/programme-ingestion/src/ingest.ts` |
| Ledger / unlinked | `packages/programme-ingestion/src/ledger.ts` |
| Freshness | `packages/programme-ingestion/src/freshness.ts` |

Direction: **GitHub adapter → validated ingestion → CT2 events → projection → status**.

## Trust boundary

Repository/CI data is external evidence. Admission requires source, repository, ref, schema, signature (webhooks), replay, idempotency, linkage and CT2 event-schema validation.

Hard-bound source: `kglaw-Oluseyi/atelier-doclar` on `main`. Payload fields are not trusted unless they match that context.

## Webhook security

GitHub `X-Hub-Signature-256` (`sha256=` + HMAC-SHA256 of the **raw** body). Comparison is constant-time and rejects length mismatch before `timingSafeEqual`. Missing, malformed and invalid signatures are permanent rejections. Delivery identity (`X-GitHub-Delivery`) is remembered; repeats do not append events.

No HTTP server is created. CT4 may wire `IngestionService.handleWebhook`. Secrets are never logged or committed. Tests use synthetic secrets only.

## Event mapping

| Evidence | CT2 events |
|----------|------------|
| Linked commit | `COMMIT_LINKED`, `EVIDENCE_ATTACHED`, `SLICE_IMPLEMENTATION_OBSERVED`, optional `REVIEW_REQUESTED` |
| Metadata conflict on a known slice | `OPEN_ITEM_CREATED` (non-blocking) |
| Trusted workflow `completed` + `success` | `EVIDENCE_ATTACHED`, `CHECK_RECORDED` PASS |
| Trusted workflow `completed` + `failure`/`timed_out` | `CHECK_RECORDED` FAIL |
| queued / in_progress / cancelled / skipped / neutral / action_required | ledger only — not success |
| Unlinked / unknown slice / unknown commit / unrecognised workflow | visible quarantine; no silent drop |

`ACCEPTANCE_RECORDED` is never emitted. A CEO-authored commit is not CEO acceptance.

## CI success law

A run contributes successful check evidence only when the repository is authorised, the commit is recognised and slice-linked, the workflow is `programme-validate`, the run is `completed`, and the conclusion is explicitly `success`.

**CI configured ≠ CI observed PASS.**

## Reconciliation

`pnpm programme:reconcile` is a deterministic callable service. It compares provider evidence to the ingestion ledger, appends **new** events for missed items, and never mutates historical CT2 events. It is safe to repeat. Live mode (`--live`) is disabled.

## Freshness

`source`, `lastSuccessfulIngestion`, `lastAttemptedIngestion`, `lastReconciliation`, `latestObservedCommit`, `latestObservedCi`, `state` (`UNKNOWN` \| `FRESH` \| `STALE` \| `ERROR`). Unknown ≠ healthy.

## Failures

Permanent: invalid/missing/malformed signature, unauthorised repository/ref, unsupported event, malformed payload.  
Transient: provider unavailable, rate limited, reconciliation incomplete.

## Commands

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm programme:validate
pnpm programme:project
pnpm programme:ingest:verify
pnpm programme:reconcile
```

## Open items

Carried: `CT1-OI-001` · `CT1-OI-002` · `CT1-OI-003` · `CT2-OI-001` · `CT2-OI-002`  
New: `CT3-OI-001` · `CT3-OI-002`
