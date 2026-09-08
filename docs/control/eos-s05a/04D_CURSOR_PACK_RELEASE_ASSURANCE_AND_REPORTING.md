# EOS-S05A — Detailed Cursor Prompt Pack
## Volume D — Integration, Assurance, Deployment and Handover
Status: CEO REVIEW DRAFT — NOT IMPLEMENTATION AUTHORITY
Prompts: EEC-41–EEC-45
Inheritance: every global law and code convention in Volume A applies.

# EEC-41 — Accepted-domain integration and staleness adapters
## Objective
Prove EOS-S05A uses accepted truth without owning it.
Implement read-only adapters and explicit approved-proposal adapters for Client/Event, RSVP/invitation, forecast/provision, programme/arrival, communications, Private Atelier, language/editions and venue/layout. Each adapter declares consumed version/hash, projection permission, possible staleness output and prohibited writes.
Do not add seating/placement. Do not sum phase counts. Do not dispatch communications. Do not alter approved editions. Map a changed source to a proposed downstream action or stale marker, never silent mutation.
Add contract tests at each boundary and a dependency diagram in control docs.

# EEC-42 — Security, privacy and abuse assurance
## Objective
Attack the complete trust boundary.
Test unauthenticated, expired session, inactive assignment, cross-org/client/event/engagement IDs, mass assignment, hidden-control bypass, direct server action/API, stale CAS, idempotency replay, approval substitution, System Administrator business action, source/export leakage, object-key leakage, prompt injection and malicious markup.
Test sensitivity projections for family, cultural/religious, accessibility/health, security, financial and confidential surprise information. Ensure logs/action results do not contain raw sensitive transcripts or secrets.
Test rate/size limits for transcript segments, AI jobs, rule ASTs, budget lines, dependency graphs and exports. Product failures must be action-scoped and truthful.

# EEC-43 — End-to-end functional and UX journeys
## Objective
Prove the complete material experience before live deployment.
Build Playwright journeys using synthetic records:
- staff-led interview → assertions → conflict → brief publication;
- client-led interview → pause/resume → correction/confirmation;
- engagement conversion without duplicate Event;
- brief → BOM → calculation → scenario → recommendation approval;
- lower-spend/HOLD recommendation;
- short-lead roadmap → decision → critical path;
- message-derived change → impact → governed rebaseline;
- CEO Executive Event Command;
- Planner author/no self-approval;
- Event Director checker;
- Auditor/client/System Administrator permission negatives.
For changed pages run automated accessibility plus manual-style assertions at 360px, tablet, desktop and 200% zoom. Verify pointer/not-allowed/text cursors, focus, reduced motion and no document-level horizontal scroll.
Do not make screenshots the sole evidence of server authority or durable persistence.

# EEC-44 — Full gates, Railway deployment and live smoke
## Objective
Release only a clean, reproducible build.
## Gates
Run and report first attempt:

```typescript
pnpm typecheck
pnpm --filter @maison-doclar/shared-platform test
pnpm --filter @maison-doclar/event-os test
pnpm programme:validate
pnpm --filter @maison-doclar/event-os build
git diff --check
```

Also run focused property/evaluation/security/E2E suites, additive migration twice, Postgres hydration/restart and representative large BOM/roadmap performance tests.
## Push/deploy
Commit by meaningful engineering boundary, push normally, verify local HEAD = origin/main = GitHub main. Deploy Event OS only to Railway atelier-doclar/production/event-os. Do not redeploy Control Tower unless its executable code changed. Verify exact deployed SHA, alive/ready, POSTGRES, migrations APPLIED, productionAuthorised false, existing layout asset/export readiness and AI provider state explicitly inactive/fixture as designed.
Run live synthetic smoke for interview persistence, brief publication, deterministic budget, roadmap, change impact and role denial. No real data or external side effect.

# EEC-45 — Consolidated implementation evidence package
## Objective
Return one reviewable report without self-acceptance.
Include:
- starting/final SHA, commits, files and migrations;
- EEC-00–45 disposition;
- domain/ADR deviations with rationale;
- exact TypeScript/schema/service/projection contracts implemented;
- Budget Engine taxonomy, rule DSL, calculation trace and scenario evidence;
- deterministic replay and money/currency tests;
- AI provider state, evaluation metrics and zero-tolerance outcomes;
- role/scope/maker-checker/IDOR/concurrency/idempotency evidence;
- frontend responsive/keyboard/focus/reduced-motion/accessibility evidence;
- first-run failures, root causes and corrections;
- full gate results;
- GitHub parity;
- Railway deployment/readiness/live smoke;
- remaining debt and rollback/forward recovery.
Do not claim acceptance. Do not start EOS-S06.
End exactly:
EOS-S05A IMPLEMENTATION COMPLETE — READY FOR AI CTO REVIEW AND INDEPENDENT HUMAN VERIFICATION — NOT ACCEPTED — EOS-S06 NOT STARTED.

# Master release wrapper — MD-PR-S037
When George approves the pack, the AI CTO will issue a wrapper containing:
- exact then-current baseline SHA;
- confirmation that documents 00–03, 02A and 05 plus Volumes A–D are controlling;
- the authorised prompt range/milestone batch;
- deploy-by-default instruction;
- any provider variables and whether George must supply them;
- the required milestone stop.
Cursor must not execute from these draft volumes until that wrapper is visible to George and explicitly approved.
