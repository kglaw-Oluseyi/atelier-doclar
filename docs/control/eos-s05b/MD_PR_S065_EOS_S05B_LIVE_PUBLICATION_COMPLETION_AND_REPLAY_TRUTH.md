# MD-PR-S065 — EOS-S05B Live Publication Completion and Replay Truth

## 0. Authority

This is the sole authority for MD-PR-S065.

Repository: `kglaw-Oluseyi/atelier-doclar`  
Branch: `main`  
Required starting SHA: `5968f271c4ecfc66733c3ccb0a23edd30e434207`  
Railway: `atelier-doclar` / `production` / `event-os` only  
Live URL: `https://event-os-production-bc8d.up.railway.app`

EOS-S05B remains **not accepted**. EOS-S06 must not start. Claude must not run under this authority.

S064 is accepted as remediation evidence for its narrow purpose: the five baseline mutation-isolation failures now pass unchanged and the complete shared-platform suite is 506/506. Do not reopen or weaken the S064 isolation contract.

The sole remaining blocker is that the live CEO dossier publication/replay control did not reliably present a fresh truthful action result within 30 seconds. One complete live S063 publication/client journey passed in 27.4 seconds, and one later publish durably created publication 7, but repeated focused attempts did not expose a fresh result banner. This authority requires diagnosis before modification. Do not assume the fault is database performance, the application, or Playwright until the evidence identifies the failing stage.

## 1. Baseline and file placement

1. Verify clean worktree and local `HEAD` = `origin/main` = GitHub `main` = `5968f271c4ecfc66733c3ccb0a23edd30e434207`.
2. Verify live Event OS serves that exact SHA and reports alive/ready, POSTGRES, migrations APPLIED, `productionAuthorised:false`, S05A PASSED, S05B PASSED, providers INACTIVE.
3. If this file is in the repository root, move it unchanged to:
   `docs/control/eos-s05b/MD_PR_S065_EOS_S05B_LIVE_PUBLICATION_COMPLETION_AND_REPLAY_TRUTH.md`.
4. Do not inspect or modify another repository, Railway project or service.

## 2. Preserve completed architecture

Do not regress any of the following:

- S063 `RiskDossierCommandService` and `RiskDossierRepository` bounded transaction path;
- no whole-snapshot hydration for dossier publication or client access;
- `FOR UPDATE`, optimistic versions, and one-transaction domain/audit/idempotency writes;
- last-known-good publication remains CURRENT while a successor DRAFT exists;
- Planner assemble/submit, Director approve, CEO publish separation;
- identical publish replay returns the same publication identity and makes no second durable change;
- S064 isolated generic snapshots and 506/506 shared-platform gate;
- current `s05b-eval-v6`, 63 cases and hash `987f4b6d1c4747074d750eb96a37df48e223627fd069003f75462c0769f15e04` unless a genuine evaluation dependency changes.

Do not raise the 30-second action ceiling. Do not hide the problem with a longer Playwright timeout, sleep, broad retry loop, stale-banner match or direct database alteration.

## 3. Reproduce with a clean, deterministic fixture

Create or reuse one uniquely labelled synthetic S065 event/dossier chain. Do not use ambiguous accumulated Alpha records if they prevent deterministic identification of the target edition, publication or action result.

Reach this state through the real UI and real role contexts:

1. Planner assembles a DRAFT and submits it.
2. Planner self-approval is denied.
3. Event Director approves the exact submitted hash.
4. Event Director publish is denied.
5. CEO opens the exact approved edition.

Before each CEO publish attempt capture:

- edition ID, version, status and complete content hash;
- current publication ID/hash/status, if any;
- form action/path and submitted field names excluding secrets;
- a new idempotency key and the expected semantic outcome (`APPLIED` or `REPLAYED`);
- absence of an unconsumed earlier banner/correlation on the exact pathname.

Never print or record the production access token or client link plaintext.

## 4. Stage-by-stage instrumentation

Add temporary development/test instrumentation if necessary, but do not expose secrets or ship noisy production logging. For each failed reproduction, determine the last completed stage:

| Stage | Required evidence |
|---|---|
| Browser submit | one click caused one request; button/form not inert; no hydration race |
| Server action entry | correlation ID, pathname, actor/session/org/event/edition IDs |
| Command begin | expected version/hash and idempotency identity accepted |
| Repository transaction | lock acquired, decision outcome, publication ID, commit/rollback duration |
| Durable reload | exact publication row and action-result payload visible from bounded reads |
| Result write | action result stored with session, actor, org, exact pathname and correlation |
| Redirect | destination contains or resolves the new correlation; redirect not swallowed |
| Render/consume | banner is the new correlation; focus/consume does not erase it before assertion |

Measure server-action, transaction, redirect and settled-render durations independently. “No banner” is not a root cause.

## 5. Mandatory diagnosis branches

### Branch A — request was never submitted

If no request leaves the browser, repair only the real UI cause: disabled/stale control, hydration replacement, overlay, duplicate locator, navigation race, or form identity. Assert exactly one request per click.

### Branch B — command/repository exceeds the budget

If the request enters the command but repository work exceeds 10 seconds, identify the exact query/lock. Preserve bounded queries and add the minimum index/query correction. Do not bypass locking, concurrency, audit or idempotency.

### Branch C — durable replay succeeds but result delivery fails

If the publication/replay commits within budget but no banner appears, correct the action-result lifecycle:

- write the truthful result after durable verification and before redirect;
- bind it to the exact session, actor, organisation, pathname and fresh correlation;
- rethrow the Next redirect signal;
- do not consume before the new page has rendered/focused the result where applicable;
- do not let an earlier banner satisfy a fresh assertion;
- `APPLIED` must say data changed; `REPLAYED` must say no data changed;
- replay must return the original publication ID/hash/time.

### Branch D — product is correct and test evidence is wrong

If network, durable and rendered evidence proves the product completes correctly within limits, repair the test helper rather than product code. The helper must:

- capture the pre-click correlation;
- click the exact current control once;
- wait for either a different correlation or a structured expected denial/conflict;
- reject a matching stale banner;
- confirm the expected edition/publication identity after canonical reload;
- avoid full-panel `innerText`, broad `.or()` selectors and arbitrary sleeps.

Do not ship an application change merely to accommodate a faulty locator.

## 6. Publication and replay truth table

Prove the following server and UI outcomes:

| Request | Durable outcome | Application result | UI truth |
|---|---|---|---|
| First valid CEO publish | one new CURRENT publication | `APPLIED` | change recorded; data changed yes |
| Identical semantic publish | same publication ID/hash/time | `REPLAYED` | existing publication reused; data changed no |
| Stale version/hash | no change | `NOT_APPLIED` conflict | record changed elsewhere; no false success |
| Director publish | no change | `NOT_APPLIED` forbidden | authority denial |
| Publish while successor DRAFT exists | prior CURRENT remains client-visible | governed result | no blank client dossier |

For all paths, assert no duplicate CURRENT publication, no second success audit for replay, no partial idempotency row, and no 503.

## 7. Automated tests

Add or strengthen the smallest focused coverage necessary:

1. server action writes a new correlation and redirect after successful publish;
2. identical publish produces a fresh truthful replay result linked to the original publication;
3. action-result consume cannot remove the result before first settled render;
4. stale banner cannot satisfy `expectFreshActionSuccess`;
5. one click yields one request;
6. canonical reload proves publication state;
7. last-known-good client projection remains during successor DRAFT;
8. S063 bounded-query guard remains;
9. S064 mutation-isolation tests and the original five tests remain unchanged and passing.

Do not make test-only production branches or hard-code S065 record IDs.

## 8. Required gates

Run:

```bash
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

Required: zero failures. The shared-platform suite must remain fully green.

Run locally, in isolation where needed to avoid known memory pressure:

- S063 dossier performance;
- S063 publication/client journey;
- S063 repository concurrency/replay;
- new S065 focused publication-result test;
- S064 mutation-isolation focused tests;
- S058 human-safe/action-result test only if action-result code changed.

Record every first-run failure honestly.

## 9. Git, deploy and live exit gates

Commit focused changes and push normally. No force-push, destructive reset or history rewrite.

Deploy Event OS only if application/runtime code changed. If diagnosis proves only an E2E helper defect, push the test/control correction and do not redeploy Event OS unnecessarily; verify the existing live SHA remains expected.

On live, use separate Planner, Director, CEO and client contexts. Run this bounded sequence:

1. focused dossier GET under 3 seconds;
2. Planner assemble and submit, each under 10 seconds;
3. Planner self-approve denied;
4. Director approve under 10 seconds;
5. Director publish denied;
6. CEO first publish: one fresh result, correct correlation and canonical publication, under 10 seconds;
7. CEO identical publish: one fresh replay result, same publication ID/hash/time, under 10 seconds;
8. successor DRAFT does not hide last-known-good from a separate client session;
9. issue grant, client open/note, revoke, denied refresh;
10. no individual action exceeds 30 seconds, no 503, no false success.

Run the focused live sequence twice on the final SHA. Both runs must pass without raising timeouts. Cold-start timing may be recorded separately, but a repeated steady-state missing result is a product failure.

## 10. Evaluation

Do not restamp or rerun v6 if only presentation/test plumbing changes and compatibility remains current. If a domain/evaluation dependency changes, advance and run the corpus honestly. Report the exact decision.

## 11. Final report and stop rule

Report:

- starting/final SHAs, commits and changed files;
- exact reproduction and last completed stage;
- product vs test classification with evidence;
- root cause and correction;
- publication/replay IDs, hashes, correlations and timings;
- all local gates and first-run failures;
- two final live-run results;
- GitHub/live parity and Railway deployment ID if deployed;
- readiness, evaluation and provider states;
- rollback/forward recovery;
- Control Tower not deployed;
- Claude not run, EOS-S05B not accepted, EOS-S06 not started.

If either final live run misses a fresh result, exceeds 30 seconds, returns 503, creates duplicate truth, loses last-known-good, or any full gate fails, state **NOT READY FOR CLAUDE** and stop.

Only if all gates pass, end with:

`EOS-S05B MD-PR-S065 LIVE PUBLICATION COMPLETION AND REPLAY TRUTH COMPLETE — READY FOR AI CTO REVIEW AND FINAL FOCUSED CLAUDE VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.`

