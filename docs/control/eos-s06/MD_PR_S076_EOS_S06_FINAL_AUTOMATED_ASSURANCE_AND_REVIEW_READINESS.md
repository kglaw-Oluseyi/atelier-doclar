# MD-PR-S076 — EOS-S06 FINAL AUTOMATED ASSURANCE, SHARD RECOVERY
# AND INDEPENDENT-REVIEW READINESS

You are completing the final non-independent engineering stage of Maison Doclar
EOS-S06 Seating Intelligence.

Work continuously through this entire instruction. Do not stop at routine internal
checkpoints. Stop only at an expressly stated hard stop or when the final consolidated
report is complete.

This prompt does not authorise Cursor to accept EOS-S06.

──────────────────────────────────────────────────────────────────────────────
1. CONTROLLED IDENTITY
──────────────────────────────────────────────────────────────────────────────

Repository:
kglaw-Oluseyi/atelier-doclar

Branch:
main

Current repository/docs HEAD and origin/main:
da5b0f5aedd41df51a4d28a0a2ff3011292a4525

Current deployed Event OS application SHA:
5179ffd0189a9c88f458e5e4d3865cafa4d92627

Current live origin:
https://event-os-production-bc8d.up.railway.app

Current live posture:
POSTGRES / migrations APPLIED / productionAuthorised:false

Expected user-owned untracked files:
- Untitled
- MD Academy/Untitled

These two files must remain untracked, untouched, unstaged and excluded from every
commit, build, deployment and evidence package.

At pre-flight, verify all identities and return the exact worktree state. Preserve
all valid work already completed.

If HEAD, origin/main or deployed SHA differs materially from the identities above,
stop and report before modifying anything.

──────────────────────────────────────────────────────────────────────────────
2. CONTROLLING POSITION
──────────────────────────────────────────────────────────────────────────────

The following non-independent gates have already passed against deployed SHA
5179ffd0189a9c88f458e5e4d3865cafa4d92627:

- Packet G: 4/4 PASS
- §8.2 trusted-boundary matrix:
  - P8-0 readiness preflight PASS
  - P8-1–P8-9 nine-case matrix PASS
- Section 13 live journeys J1–J4 PASS
- Section 13 timed actions: 47/47 PASS
- Maximum Section 13 action duration: 4393 ms
- Application/runtime diff for Packet 8 evidence: zero
- Packet 8 evidence-freeze commit:
  da5b0f5aedd41df51a4d28a0a2ff3011292a4525

Do not repeat Packet G, the §8.2 matrix or the complete Section 13 live journeys
unless this execution changes code that can materially affect them.

The Packet 8 evidence is preserved at:

docs/control/evidence/eos-s06-s075-packet8/

Do not overwrite or restamp that evidence.

──────────────────────────────────────────────────────────────────────────────
3. CURRENT BLOCKERS
──────────────────────────────────────────────────────────────────────────────

A. GitHub Actions

Run:
https://github.com/kglaw-Oluseyi/atelier-doclar/actions/runs/34874554477

The sole validate job failed, but GitHub exposes:

- no step summaries;
- no retrievable log blob;
- no artifacts.

The run must not be represented as proof of a programme or application failure.

Formal GitHub CI green is presently blocked by GitHub billing.

Record the state as:

CI-BLOCKED-EXTERNAL-BILLING

unless a later run becomes available and completes successfully.

CI billing does not prevent readiness for focused independent Claude verification,
but EOS-S06 must not receive formal acceptance until complete GitHub CI succeeds.

B. Local Event OS E2E

The post-fix Event OS E2E run:

- cleared the original DATABASE_URL / next-start failure;
- ran under local next-dev memory pressure;
- completed after approximately 34 minutes with exit 1;
- produced 14 passing tests;
- left other cases failed or skipped.

This monolithic resource-constrained run is not a passing gate, but it must not be
treated as a product failure without isolated reproduction.

Do not rerun the same complete suite under the same next-dev memory conditions.

──────────────────────────────────────────────────────────────────────────────
4. AUTHORITY
──────────────────────────────────────────────────────────────────────────────

Authorised:

1. Preserve this prompt verbatim as the new execution-authority record at:

   docs/control/eos-s06/
   MD_PR_S076_EOS_S06_FINAL_AUTOMATED_ASSURANCE_AND_REVIEW_READINESS.md

2. Diagnose and account for every failed and skipped case from the 34-minute
   Event OS E2E run.

3. Run only unresolved cases in deterministic, resource-controlled shards.

4. Correct test-harness, fixture, process-isolation or CI defects where necessary.

5. If an isolated test proves a genuine EOS-S06 product defect, diagnose all
   related failures first and implement one consolidated correction.

6. Deploy Event OS once only if a genuine application/runtime correction is
   required.

7. Run the smallest complete local and live regression set justified by the
   changed boundary.

8. Update EOS-S06 implementation, build, evidence, traceability, current-state,
   authority, compatibility and technical-debt records.

9. Create and push the final non-independent S06 readiness commit using the
   deployment-control rules in this prompt.

10. Prepare one comprehensive handover for focused independent Claude verification.

Not authorised:

- EOS-S06 acceptance;
- creation of EOS_S06_ACCEPTANCE.md;
- EOS-S07 implementation or planning execution;
- Control Tower deployment;
- real client or guest data;
- real event operations;
- production authorisation;
- provider activation;
- real external communication;
- weakening permissions, concurrency, masking, audit or trusted boundaries;
- destructive migration;
- rewriting immutable historic packages, runs or evidence;
- deletion or modification of either Untitled note;
- repeated monolithic next-dev E2E execution;
- hiding failures through longer timeouts, retries or skipped assertions.

──────────────────────────────────────────────────────────────────────────────
5. PRE-FLIGHT AND FAILURE ACCOUNTING
──────────────────────────────────────────────────────────────────────────────

Before changing code:

1. Verify repository, branch, HEAD, origin/main and deployed SHA.
2. Record git status and confirm only the two expected Untitled notes are untracked.
3. Locate the complete output from the 34-minute Event OS E2E run.
4. Produce a test-accounting table containing every test in that run:
   - test/spec name;
   - PASS, FAIL or SKIPPED;
   - elapsed time where available;
   - exact failure message;
   - process/browser/server state;
   - whether failure occurred before an assertion;
   - preliminary classification.
5. Preserve the 14 valid passing results.
6. Do not classify a test as a product failure solely because:
   - next-dev exited;
   - the browser closed;
   - a worker was killed;
   - memory was exhausted;
   - the server became unavailable;
   - a timeout followed process degradation;
   - an upstream setup test failed and caused dependent skips.

Use these initial classifications:

- PASS
- PRODUCT-ASSERTION-FAILURE
- HARNESS-FAILURE
- FIXTURE-FAILURE
- PROCESS-ISOLATION-FAILURE
- RESOURCE-PRESSURE
- UPSTREAM-DEPENDENCY-SKIP
- NOT-EXECUTED
- UNCLASSIFIED

Resolve every UNCLASSIFIED item before final readiness.

──────────────────────────────────────────────────────────────────────────────
6. RESOURCE-CONTROLLED SHARD RECOVERY
──────────────────────────────────────────────────────────────────────────────

Run only failed, skipped, not-executed and unclassified cases.

Execution rules:

1. Prefer the already-built production application and a controlled production-mode
   local server where the repository contract permits it.
2. Do not use next-dev for the recovery run unless a specific test contract
   genuinely requires development mode.
3. Use one Playwright worker.
4. Use deterministic shards small enough to avoid memory accumulation.
5. Restart the application server and browser context between shards where needed.
6. Use the correct local database/fixture contract.
7. Do not connect to or mutate Railway Postgres merely to satisfy local testing.
8. Do not expose credentials or secret values.
9. Preserve first-run failures.
10. Record every recovery run, command, environment classification and result.

A suggested grouping is:

- authentication and shell;
- guest/event fixture setup;
- seating Studio and authoring;
- solver/package/run lifecycle;
- governance/publication/replay;
- exports and role boundaries;
- responsive/accessibility/UX;
- remaining unrelated Event OS regression cases.

Adjust group boundaries based on actual dependencies, but do not return to one
memory-heavy monolithic run.

For each recovered test, record:

- original result;
- isolated/sharded result;
- shard identity;
- environment/server mode;
- duration;
- final classification;
- whether application code changed;
- evidence location.

──────────────────────────────────────────────────────────────────────────────
7. DECISION BRANCH
──────────────────────────────────────────────────────────────────────────────

BRANCH A — RESOURCE/HARNESS RECOVERY

Use this branch if every unresolved test passes in isolation or deterministic shards
without an application/runtime correction.

Then:

1. Classify the monolithic run as:
   RESOURCE-CONSTRAINED / SHARD-RECOVERED
2. Do not change or redeploy Event OS.
3. Preserve deployed SHA 5179ffd0189a9c88f458e5e4d3865cafa4d92627.
4. Do not repeat Packet G, the matrix or Section 13.
5. Continue directly to documentation and final readiness.

BRANCH B — GENUINE PRODUCT DEFECT

Use this branch only if an assertion or behaviour failure reproduces in a clean
isolated shard.

Then:

1. Diagnose all related isolated failures before modifying application code.
2. Identify the common root cause and affected contracts.
3. Record the defect in the technical-debt/build record.
4. Implement one consolidated correction.
5. Add or preserve focused regression coverage.
6. Run:
   - affected unit tests;
   - affected integration tests;
   - affected E2E shard;
   - neighbouring security/concurrency/role-boundary tests;
   - typecheck;
   - relevant builds.
7. Deploy Event OS once after the consolidated candidate passes locally.
8. Verify the exact new deployed SHA and health/readiness state.
9. Re-run only the live Packet G, matrix or Section 13 cases materially affected
   by the correction.
10. Create a new evidence package without editing the immutable S075 evidence.

Do not deploy intermediate attempts.

If the genuine correction expands beyond EOS-S06 seating or its shared-platform
contracts, stop for AI CTO review.

──────────────────────────────────────────────────────────────────────────────
8. VALIDATION
──────────────────────────────────────────────────────────────────────────────

Run the smallest sufficient validation during diagnosis.

Before final readiness, require:

- pnpm install --frozen-lockfile
- pnpm typecheck
- pnpm test
- pnpm programme:validate
- pnpm programme:project
- pnpm programme:ingest:verify
- pnpm programme:reconcile
- pnpm --filter @maison-doclar/control-tower build
- pnpm --filter @maison-doclar/event-os build
- complete accounting of the Event OS E2E suite through:
  - preserved valid passes; and
  - passing deterministic recovery shards
- git diff --check

Do not rerun tests already covered by immutable, attributable evidence unless the
candidate changes their relevant boundary.

GitHub CI:

- If billing becomes available, run the normal workflow and require SUCCESS.
- If billing remains unavailable, record:
  CI-BLOCKED-EXTERNAL-BILLING
- Do not create empty commits merely to trigger CI.
- Do not describe billing blockage as a software failure.
- Do not accept EOS-S06 without later CI success.

──────────────────────────────────────────────────────────────────────────────
9. DOCUMENTATION AND DURABLE EVIDENCE
──────────────────────────────────────────────────────────────────────────────

Create a durable S076 evidence package under:

docs/control/evidence/eos-s06-s076-final-assurance/

Include:

1. MANIFEST.md
2. original monolithic-run accounting
3. shard plan
4. shard commands and results
5. final test-accounting matrix
6. first-run failure register
7. environment/resource classification
8. application-change statement
9. deployed-SHA statement
10. validation summary
11. CI billing status
12. remaining blockers
13. Claude handover/readiness matrix

Do not include:

- secrets;
- credentials;
- cookies;
- database connection strings;
- full private snapshots;
- unnecessary raw output;
- the two Untitled notes.

Update, where applicable:

- docs/control/EVIDENCE_INDEX.md
- EOS-S06 implementation ledger
- EOS-S06 build ledger
- current-state record
- programme roadmap
- prompt execution map/register
- requirements traceability
- compatibility register
- technical-debt register

Do not manufacture acceptance evidence.

Do not change the accepted status of EOS-S06.

──────────────────────────────────────────────────────────────────────────────
10. CLAUDE HANDOVER
──────────────────────────────────────────────────────────────────────────────

Prepare one focused, comprehensive Claude verification prompt.

Claude must independently verify the visible product rather than repeat Cursor’s
internal implementation checks.

The Claude prompt must cover, in one coherent browser session where practical:

1. corrected feasible-run adoption;
2. Studio preview and valid apply;
3. hard-violation rejection with no hidden mutation;
4. two-tab stale-state/CAS conflict and recovery;
5. exact-hash seating-plan submission;
6. Reviewer exact event/edition/hash/domain/rule binding;
7. author, unrelated, stale and cross-event denials;
8. Event Director approval and publication boundary;
9. CEO publication and identical replay;
10. successor draft preserving last-known-good;
11. JSON/PDF/PNG retrieval and omission rules;
12. Auditor masking, authorised export and privileged-route denial;
13. System Administrator business-action denial;
14. 360, 768 and 1440 layouts;
15. 200% zoom;
16. reduced motion;
17. keyboard navigation, focus, ARIA and overflow;
18. five mutation/settlement repetitions;
19. Runs-tab identity and content consistency;
20. hard-blocker headline and enumerated-count truth;
21. clickable-item pointer cursor behaviour;
22. spacing, findability and overall Command Atelier usability.

Claude must report:

- PASS/FAIL for every journey;
- exact role used;
- event/run/edition identity;
- visible expected and actual result;
- screenshots/evidence references;
- accessibility and usability observations;
- material blockers;
- consolidated non-blocking technical debt;
- one final decision:
  READY FOR AI CTO ACCEPTANCE REVIEW
  or
  NOT READY FOR AI CTO ACCEPTANCE REVIEW

Cursor must not run Claude and must not pre-fill Claude’s findings.

──────────────────────────────────────────────────────────────────────────────
11. COMMIT AND PUSH DISCIPLINE
──────────────────────────────────────────────────────────────────────────────

Create the final candidate only after all locally executable gates pass.

If Branch A applies and the commit contains only tests, harness, evidence and
documentation:

1. Confirm Event OS currently has watchPatterns [].
2. Temporarily apply:
   /__CONTROLLED_DEPLOY_ONLY__/**
3. Confirm the guard creates no deployment.
4. Commit and push the final S076 candidate.
5. Confirm no Event OS or Control Tower deployment occurred.
6. After the GitHub push event has settled, restore Event OS watchPatterns to [].
7. Confirm restoration creates no deployment.

If Branch B applies and an Event OS deployment is intentionally required:

1. Do not use the non-matching guard to suppress the authorised final deployment.
2. Push only the single consolidated runtime candidate.
3. Allow or initiate one Event OS deployment.
4. Verify health, readiness and exact deployed SHA.
5. Do not deploy Control Tower.
6. Do not perform a second deployment merely for documentation.
7. Protect any later documentation-only push with the temporary guard.

Use clear, truthful commit messages.

Do not include either Untitled note.

Do not amend or rewrite already-pushed history.

──────────────────────────────────────────────────────────────────────────────
12. FINAL GATE
──────────────────────────────────────────────────────────────────────────────

Return:

READY FOR FOCUSED INDEPENDENT CLAUDE RE-VERIFICATION

only if:

- all tests are accounted for;
- all unresolved E2E cases pass in deterministic shards;
- no unclassified failure remains;
- all locally executable validation gates pass;
- Packet 8 evidence remains valid or affected cases were correctly re-evidenced;
- no material product blocker remains;
- application and deployed identities are truthful;
- Claude’s complete verification prompt is ready;
- GitHub billing is the only permitted external CI blocker.

Return:

NOT READY FOR CLAUDE

if any product, security, concurrency, evidence-integrity or unexplained test blocker
remains.

A billing-blocked GitHub workflow alone does not require NOT READY FOR CLAUDE, but
must remain an explicit blocker to final EOS-S06 acceptance.

──────────────────────────────────────────────────────────────────────────────
13. REQUIRED FINAL REPORT
──────────────────────────────────────────────────────────────────────────────

Return one consolidated report with:

A. Identity
- repository;
- branch;
- starting and ending HEAD;
- origin/main;
- starting and final deployed Event OS SHA;
- worktree status.

B. Authority
- S076 authority-file path and hash;
- confirmation that S075 evidence was not altered.

C. Original run accounting
- total passed, failed, skipped and not executed;
- exact failure classifications.

D. Shard recovery
- every shard;
- commands;
- server mode;
- results;
- test counts and durations.

E. Product-defect decision
- Branch A or Branch B;
- root cause;
- application files changed;
- deployment decision.

F. Complete test accounting
- every Event OS E2E test accounted for;
- zero unresolved/unclassified tests.

G. Validation
- every command;
- result;
- test count;
- first-run failures retained.

H. Packet 8 validity
- Packet G;
- §8.2 matrix;
- Section 13;
- per-action timing;
- whether any evidence required reopening.

I. CI
- GitHub run status;
- billing state;
- CI URL if available;
- explicit acceptance blocker.

J. Claude handover
- prompt path;
- journey coverage;
- readiness decision.

K. Mutation statement
- Event OS application changed: YES/NO
- Event OS deployed: YES/NO
- Railway configuration mutated: YES/NO
- Railway deployment created: YES/NO
- Control Tower touched/deployed: NO/NO
- Provider touched: NO
- Production authorised: NO
- Real external communication sent: NO
- EOS-S06 accepted: NO
- EOS-S07 started: NO
- Untitled notes touched/staged: NO/NO

L. Commit/push
- commit SHA;
- committed files;
- local HEAD;
- origin/main;
- final watchPatterns;
- worktree state.

M. Remaining blockers
Separate:
- blockers to Claude;
- blockers to formal EOS-S06 acceptance;
- retained non-blocking technical debt.

End with exactly one:

EOS-S06 FINAL NON-INDEPENDENT ASSURANCE COMPLETE — READY FOR FOCUSED
INDEPENDENT CLAUDE RE-VERIFICATION — EOS-S06 NOT ACCEPTED — GITHUB CI
GREEN STILL REQUIRED FOR ACCEPTANCE — EOS-S07 NOT STARTED.

or:

EOS-S06 FINAL NON-INDEPENDENT ASSURANCE INCOMPLETE — NOT READY FOR CLAUDE —
EOS-S06 NOT ACCEPTED — EOS-S07 NOT STARTED.

──────────────────────────────────────────────────────────────────────────────
14. HARD STOPS
──────────────────────────────────────────────────────────────────────────────

Stop and report only if:

- repository or deployed identity differs materially;
- user-owned Untitled notes would be affected;
- an isolated product failure requires work outside EOS-S06 authority;
- destructive migration or historic-record rewriting is required;
- a permission, masking, ownership, concurrency or audit boundary would be weakened;
- production becomes authorised;
- real data or external providers appear;
- Control Tower deployment becomes necessary;
- complete test accounting cannot be achieved;
- an unresolved test continues to fail without a diagnosed classification.

Otherwise continue through the complete prompt without waiting for intermediate
approval.
