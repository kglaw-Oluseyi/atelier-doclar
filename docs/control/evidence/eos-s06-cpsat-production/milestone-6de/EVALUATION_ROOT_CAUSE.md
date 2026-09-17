# M6D — Evaluation defect root cause

## Trace

`Run seating evaluation` → `runS06EvaluationAction` → `seatingV2Commands().runS06EvaluationV2` → (pre-fix) `executeS06EvaluationV2()` **outside** DB transaction → `mutate` inserts org-scoped `seating_v2_evaluation_runs` + `platform_audit` → action flash cookie banner → Overview reads `state.evaluationRuns.at(-1)` without `ORDER BY`.

## Why the banner claimed success / “saved”

The protection form action flash is written from the server-action outcome (`didDataChange: true`, seating-specific copy). That flash is cookie/session-transient. It is not the durable Overview projection.

## Why reload could restore a previous summary

1. Evaluation rows lived in **org-scoped** `seating_v2_evaluation_runs` (no `event_id`).
2. Workspace used `.at(-1)` on an unordered org list — nondeterministic “latest”.
3. After M6C cutover, 34 corpus cases returned `ERROR` (retired seating_v2 solver paths), so the durable org corpus status diverged from event CP-SAT truth.
4. Canonical CP-SAT overlay did not replace `workspace.evaluation`.

## Why the ledger looked incomplete

Audit SUCCESS metadata only recorded `{ replayed }` — not status, counts, readiness, or safe failure codes. Correlation was present in `platform_audit.body.correlationId` but easy to miss against the flash correlation.

## Transactional coupling (pre-fix)

Persist + audit shared `mutate`’s seating_v2 transaction, but the **corpus computation** ran before that transaction. Failed cases were still written as FAILED/ERROR runs. No retired legacy CURRENT publications were written by evaluation.

## Fix (M6D)

- Migration `018_cpsat_durable_seating_evaluation`: event-scoped `cpsat_seating_evaluations` (+ cases).
- Canonical event readiness evaluation inside the same PostgreSQL transaction as persist + enriched audit.
- Overview/reload overlay via `loadCanonicalCpsatAuthority` → `latestEvaluation`.
- Zero writes to `seating_v2_evaluation_runs` on the operational path.
