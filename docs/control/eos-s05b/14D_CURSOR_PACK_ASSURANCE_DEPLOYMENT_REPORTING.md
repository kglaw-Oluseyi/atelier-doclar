# EOS-S05B Detailed Cursor Pack D Assurance Deployment and Reporting

**Status:** Ratification draft — not independently executable

## Unit RPC-44 Provider ports

Implement ports and fixture adapters for object store, scan, OCR, source monitoring and communications outbox. Production defaults inactive unless existing accepted infrastructure applies. Negative adapters live in tests and never production barrels.

## Unit RPC-45 Security tests

Test IDOR, cross-org/event access, forged assignment, object-key leakage, privileged export reuse, unsafe MIME, oversized upload, path/script filenames, markup, prompt injection, stale signed/route access, mass assignment and server-only permissions.

## Unit RPC-46 Concurrency and idempotency

Two-tab tests for policy edit, residual-risk decision, plan activation, incident update and dossier publication. Conflict disables only the affected action. F5 reconciles canonical state. Replay reports no change. One current publication and one applied effect per stable key.

## Unit RPC-47 Evaluation corpus

Implement `s05b-eval-v1` as document 11 requires. Each case executes production functions against isolated synthetic stores and persists case observations. Never pass from case-authored booleans. Add mutation-sensitive negative adapters for fabricated coverage, invented price, trait scoring, authority escalation, cross-scope leakage, silent dispatch and false success.

## Unit RPC-48 Readiness

Expose `s05bEvaluationStatus`, blocked, corpus edition/hash/count, contract/model editions and release-ready. Truth table: no run UNRUN blocked; active RUNNING blocked; old corpus STALE blocked; missing case rows/version mismatch INCOMPATIBLE blocked; any failed/zero-tolerance ERROR/FAILED blocked; only complete current pass unblocks fixture readiness.

## Unit RPC-49 Full automated gates

Run, in order:

```text
focused risk tests
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
focused local Playwright
whole material local journey
```

Record every first-run failure, root cause, correction and rerun. A retry does not erase product evidence.

## Unit RPC-50 Control records

Update only proportionate canonical records: implementation record, build ledger, current state, evidence index, successor register, compatibility/authority registers, roadmap/product manifest and technical debt when genuine. Do not mark accepted. Historic prompts remain historical.

## Unit RPC-51 GitHub parity

Commit focused units with honest messages. Pull/reconcile non-destructively if required. Push normally. Prove local HEAD = origin/main = GitHub main. No force push or history rewrite.

## Unit RPC-52 Railway configuration

List exact required variables before setting them: name, event-os service, secret/non-secret, purpose and owner. Use existing configured credentials normally. Stop for genuinely human-controlled secret values. Never print secrets.

## Unit RPC-53 Deployment

Deploy Event OS only unless Control Tower executable code actually changed. Verify deployment SUCCESS and exact SHA, health/readiness, POSTGRES, migrations APPLIED, production false, adapter states and fail-closed S05B evaluation. Run current CEO fixture corpus if authorised by the implementation prompt, then confirm current PASS.

## Unit RPC-54 Live synthetic smoke

Create uniquely labelled synthetic records only. Exercise policy evidence, applicability/gap, clause review, vendor assessment, continuity/checkpoint, fallback proposal/no external effect, risk Budget scenario, incident and dossier. Verify refresh persistence and one concurrency conflict. Do not use real venue/vendor/client data.

## Unit RPC-55 Evidence package

Return one consolidated report containing:

1. starting/final/application/documentation SHAs;
2. commits and changed files;
3. architecture and migrations;
4. entity/state/invariant delivery;
5. permission/maker-checker matrix;
6. insurance/rule/gap evidence;
7. contract/vendor evidence;
8. continuity/incident evidence;
9. Budget integration and trace;
10. UX/accessibility evidence;
11. security/concurrency/idempotency;
12. evaluation corpus edition/hash/cases/negative controls;
13. all first-run failures;
14. full gates;
15. GitHub parity;
16. Railway deployment/readiness;
17. live smoke;
18. variables/adapters and external effects confirmed inactive;
19. genuine debt;
20. rollback/forward recovery;
21. explicit EOS-S05B not accepted and EOS-S06 not started.

## Completion stop

Stop after the consolidated report for independent AI CTO review. Cursor must not write an acceptance record, increment catalogue count, start EOS-S06, enable production, activate external providers or ask Claude to accept.

