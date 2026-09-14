# EOS-S06 — Consolidated Claude remediation evidence

**Prompt:** Maison Doclar EOS-S06 — Consolidated Claude Remediation Pass (DEF-01–DEF-05)  
**Not acceptance.** EOS-S06 remains **unaccepted**. CI remains mandatory. EOS-S07 remains **unstarted**.  
**Not a substitute for Claude re-verification.** This package records implementation, focused gates and deployment only.

## Controlling findings (Claude)

| ID | Severity | Finding |
|----|----------|---------|
| DEF-01 | MATERIAL | Runs lack visible stable identity |
| DEF-02 | MATERIAL | Publication state contradicts itself |
| DEF-03 | MINOR | Studio Tables lacks an empty state |
| DEF-04 | MINOR | Governance navigation produces role-inappropriate dead ends |
| DEF-05 | MATERIAL | Equivalent duplicate rules can become ACTIVE repeatedly |

No committed in-repo Claude defect report with these IDs was found; the CEO-issued remediation brief remains controlling.

## Identities

| Item | Value |
|------|-------|
| Start HEAD / origin/main | `d9c54518f92ed4731304fadc9ccd49742398afb4` |
| Remediation application commits | `c548372b019b9f24dbe1d9a5ab7fb34f4bdcc5a8` (DEF-01–05) · `0ca9ceb4bc3a9c589f21f4f3b89948f12ea57410` (CanonicalTime Date coerce) |
| Ending HEAD / origin/main / deployed Event OS | `0ca9ceb4bc3a9c589f21f4f3b89948f12ea57410` |
| Prior deployed Event OS | `5179ffd0189a9c88f458e5e4d3865cafa4d92627` |
| Railway event-os deployment | `c9efd641-2d21-4542-853a-a127ff9fe24a` · SUCCESS |
| Repository | `kglaw-Oluseyi/atelier-doclar` · branch `main` |
| Railway | `atelier-doclar` / `production` / `event-os` only |
| Live origin | `https://event-os-production-bc8d.up.railway.app` |

Protected untracked files were not staged: `Untitled`, `MD Academy/Untitled`, `apps/event-os/scripts/s076-shard-runner.sh`, `apps/event-os/scripts/s076-shard-plan.abandoned.json`.

Mistaken Cursor BLOCKED browser-verification report is **not** included as independent human verification.

## Root causes

1. **DEF-01** — Run projection carried id/current/stale/counts, but seating run cards rendered validator copy only; started/actor fields were missing from the operator-facing card.
2. **DEF-02** — Homonym collision: seating **operational publication** vs venue **layout tables**/binding. Attention/inputs language said “No current layout is published” when tables were unbound, contradicting Header/Publication when Publication N was CURRENT.
3. **DEF-03** — Studio Tables was a bare `map` with no empty branch.
4. **DEF-04** — `AppShell` nav listed Access / Event Command / Audit for all staff; pages correctly FORBIDDEN for Director/Planner.
5. **DEF-05** — `activateRule` had no semantic duplicate guard; `seatingV2RuleContentHash` already normalised equivalence, so parallel drafts could both become ACTIVE.

## Implementation mapping

| Finding | Correction |
|---------|------------|
| DEF-01 | Run cards: short id, Current/Not current, Stale/Fresh, outcome, full immutable ID copy, started time (Lagos via CanonicalTime), actor or unavailable, seated/unseated, explicit current+stale explanation |
| DEF-02 | Header, Overview, Review, Publication use “Current operational publication” + working edition; dual-truth copy when Publication N remains operational beside unpublished WORKING; Inputs distinguish venue layout tables from seating publication |
| DEF-03 | `seating-tables-empty` with configured/why/next action; read-only wording when `permissions.prepare` is false |
| DEF-04 | Hide Access / Event Command / Audit nav unless permission allows; retain System; retain direct-route server FORBIDDEN |
| DEF-05 | Transactional `lockEventCurrent` + ACTIVE contentHash check; equivalent activate → `REPLAYED` / `didDataChange:false` returning authoritative edition; audit metadata `reason: ALREADY_ACTIVE`; UI flash “No data changed…”; historical Alpha One ACTIVES untouched |

## DEF-02 before/after language matrix

| Scenario | Before (defect) | After |
|----------|-----------------|-------|
| No seating publication | Mixed / layout language bleed | “No current operational publication” consistently |
| Operational publication only | Header OK; other surfaces could contradict via layout empty copy | “Current operational publication: Publication N” |
| Operational + newer unpublished WORKING | Contradictory “no layout published” possible | Dual truth: Publication N operational · WORKING / unpublished · remains until successor published |
| Published successor | Publication N becomes CURRENT | Successor is operational publication; prior in History |
| Superseded history | History list | Unchanged History article; CURRENT called out separately |

## DEF-05 semantic identity and concurrency

- **Identity:** `seatingV2RuleContentHash(content)` (order-normalised subjects/targets).
- **Scope:** organisation + event; one ACTIVE edition per contentHash.
- **Concurrency:** `tx.lockEventCurrent(..., FOR_UPDATE)` before activate; memory repository serialises transactions.
- **Outcome:** first activate `APPLIED`; equivalent later activate `REPLAYED` with authoritative ACTIVE id; draft remains DRAFT; `didDataChange: false`.
- **Audit:** `seatingV2.activateRule` SUCCESS with `metadata.replayed` and `metadata.reason = ALREADY_ACTIVE` when duplicate.
- **Legacy:** existing multi-ACTIVE Alpha One rows preserved; no withdraw/supersede of historical synthetics in this pass.

## DEF-04 policy decision

**Hide** Access and Event Command (and Audit when lacking audit read) for roles without the corresponding permission. **Retain** direct-route server refusal. Not accepted as visible dead-end technical debt.

## Focused test results

| Gate | Result |
|------|--------|
| `packages/shared-platform` `seating-v2-command-path.test.ts` | 10/10 pass (includes first/repeat/concurrent/materially-different activate + full publish cycle) |
| `apps/event-os` `test/s06-claude-remediation-copy.test.ts` | 4/4 pass |
| Playwright `s06-claude-remediation.spec.ts` + `s06-publication.spec.ts` + `s06-v2-s072.spec.ts` | 18/18 pass · 1 worker |
| Viewports 390 / 768 / 1440 | pass |
| Axe / 200% zoom / reduced-motion / pointer (changed surfaces) | pass |
| Typecheck shared-platform + event-os | pass |

Not run: Packet 8, 257-test monolith, S076 shards, broad legacy regression, authenticated Claude verification.

## Focused live smoke (post-deploy)

Against `https://event-os-production-bc8d.up.railway.app` at SHA `0ca9ceb4…`:

| Check | Result |
|-------|--------|
| DEF-01 runs identity | pass |
| DEF-02 publication dual truth | pass |
| DEF-03 tables empty/populated | pass |
| DEF-05 | covered by unit concurrency/idempotency gates; no destructive live duplicate activation against Alpha One |

First deploy of `c548372` crashed seating pages when Postgres `Date` values reached `CanonicalTime` exact-time details; fixed in `0ca9ceb` and redeployed.

## Remaining manual re-verification scope

Prepared for later Claude session (do not execute from this remediation pass):

- DEF-01–DEF-05 on deployed SHA
- Settlement repetitions 3 and 4
- Full successor-layout/adoption cycle
- Manual keyboard/focus/zoom/reduced-motion
- Incomplete role/export cells

Prompt path: `docs/control/evidence/eos-s06-claude-remediation/CLAUDE_REVERIFICATION_PROMPT.md`

## Explicit non-acceptance

**EOS-S06 remains unaccepted.** This remediation does not create an acceptance record and does not start EOS-S07.
