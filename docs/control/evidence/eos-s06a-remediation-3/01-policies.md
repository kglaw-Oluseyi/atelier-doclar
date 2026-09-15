# EOS-S06A Remediation 3 — policies

## Intent-compatibility

Trusted server module: `intent-integrity.ts` + re-check in `interpreter.ts` and `executeToolStep`.

- Every interpretation records requested outcome/target/operation/effect, matched tool, supported/unsupported/refused portions, and material differences.
- A plan compiles only when the selected tool is semantically compatible.
- Retrieve/read tools cannot satisfy pay/send/submit/external-write intents.
- Real payment / non-allowlisted external write → `UNSUPPORTED_INTENT_REFUSED`, no executable steps, `dataChanged:false`.
- Prompt claims of R0 / already approved are ignored for classification.
- Model output cannot authorise the match.

## Terminal-state model

Plan terminals: COMPLETED, BLOCKED, REFUSED, CANCELLED, SUPERSEDED, FAILED, REJECTED, STALE.
Step terminals: SUCCEEDED, REPLAYED, BLOCKED, REFUSED, CANCELLED, SUPERSEDED, FAILED, SKIPPED.

Once terminal: no Execute UI; server `claimPlanExecution` refuses or returns ALREADY_SETTLED; client status/idempotency cannot reopen.

## Replay / idempotency

- Repeated execute on a settled plan returns `kind=ALREADY_SETTLED`, links `originalCorrelationId`, `dataChanged:false`, no tool re-invocation.
- Step idempotency key: `planId:stepId:toolVersion:inputHash`.
- Concurrent claim: first sets EXECUTING; second gets VERSION_CONFLICT or ALREADY_SETTLED after success.
- Lost-response: OUTCOME_UNKNOWN + idempotency COMMITTED_UNKNOWN; reconcile then ALREADY_SETTLED.

## Approval binding

Confirm/approve bind `makerPersonId`, `checkerPersonId`, `approvalIdentityId` (includes plan id + approvedPlanHash), `approvedAt`.
R3+ requires approval identity; hash mismatch refuses execution.
