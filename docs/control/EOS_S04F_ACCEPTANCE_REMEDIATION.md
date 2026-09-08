# EOS-S04F acceptance remediation — source supersession, translation staleness and placeholder validation

**Slice:** `EOS-S04F`  
**Prompt Control ID:** `MD-PR-S026`  
**Status:** historical `IN_REVIEW / NOT READY` on 2026-09-08; superseded for current programme language by `docs/control/EOS_S04F_ACCEPTANCE.md`
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Remediation baseline:** `50c451e76f44855efe9a691290e064e42f785007`  
**EOS-S05:** untouched and unauthorised

This record does not accept EOS-S04F. Passed preference/no-inference, cultural provenance, maker/checker, partial/complete coverage, deterministic fallback, Unicode integrity, injection safety, recipient assembly/no dispatch, roles, host Playwright, responsive/accessibility Playwright and ACA-S04F were not reopened.

## Defects remediating

The first implementation created a new approved source in one step and recorded the same actor as author and approver. Approved source text could not be revised through a staff draft/review path. Placeholder checks existed on the server only; staff could not see expected, detected, missing, unknown or duplicated tokens before save.

## Source-edition lifecycle

Approved source editions are never edited in place. Authorised staff inspect the current approved source in Command Atelier (`#language-source`), start a revision prefilled from that exact text, edit source text and purpose/context, preserve required placeholders, and save a new `DRAFT` or immediately `IN_REVIEW` edition.

The author cannot approve that edition. A different person with `language.edition.publish` (CEO or Event Director) approves. The new edition becomes current (`work.primaryEditionId` / `currentEditionId`). The previous approved source is marked `SUPERSEDED` and remains in history. Planner may draft and submit. Auditor is read-only. System Administrator has no language authority.

Hidden controls are not enforcement. Permission checks remain on the service mutation.

## Staleness propagation

On source approval, inside the same mutation:

1. Translation links to the superseded source are marked `stale` / `reviewStatus: STALE` (already-stale links are skipped; no duplicate records).
2. Dependent editions keep their approved body and approval history. `coverageStatus` becomes `STALE` and `reviewRequired` becomes true. Edition `status` is not rewritten from `APPROVED` to a draft.
3. Ready recipient assemblies for that work become `SUPERSEDED`.
4. The coverage snapshot is recalculated. Complete coverage may become partial or not ready.

Stale translations cannot be selected as current target content and cannot be newly assembled. Re-review must use the new current source. Correction creates a new target edition. No automatic translation is created. No provider is called. No dispatch occurs.

Statuses remain distinct: stale-because-source-changed, draft, rejected, superseded, and missing approved target.

New assembly for an affected preference uses the current approved `en-GB` fallback when permitted and records `STALE_TRANSLATION` or `MISSING_APPROVED_TARGET`. Explicit preference is unchanged. If no approved fallback exists, assembly fails closed. Prior assemblies stay historical.

## Placeholder algorithm

Token: `{{Name}}` where Name is `[A-Za-z][A-Za-z0-9_]*`.  
Escape: `\{{Name}}` is not a placeholder and renders as literal `{{Name}}`.  
Comparison is multiset equality: names and occurrence counts must match; language-specific order may change. Extra copies of a name that appears once in the source are `duplicated`. Values are HTML-escaped and cannot execute markup or script.

The translation editor shows expected and detected tokens, names missing/unknown/duplicated entries, and states that data was not changed. Server validation runs before save, review, approval and assembly. Validation failure focuses `#placeholder-validation` and preserves the operator draft.

## Concurrency

Source approval does not treat a later stale `expectedVersion` as a silent already-applied success. Identical replay with the same idempotency key returns the durable edition. A competing open revision or a stale approval without that key surfaces `VERSION_CONFLICT`. Repeated staleness propagation does not create duplicate stale-link records.

## Tests

Focused cases in `packages/shared-platform/test/language-lineage.test.ts` cover the twenty required points. Playwright `apps/event-os/e2e/s04f-lineage.spec.ts` covers source revision, planner self-approval denial, director approval, translation staleness, fallback assembly, placeholder inspector states and two-tab conflict.

Workspace `pnpm typecheck` passed. `pnpm test` **614 pass / 0 fail**. `pnpm programme:validate` passed. `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean.

First-run failures (ordinary, then fixed):

1. `language-lineage.test.ts` could not import `renderPlaceholders` until it was exported from the platform barrel.
2. Stale source approval did not throw because `decideSourceEdition` treated any already-approved edition as already-applied after `VERSION_CONFLICT`. The already-applied hook was removed; same-key idempotency still replays.
3. A brief attempt to gate all `mutate` conflict-replay broke two S04A amendment-replay tests. That global change was reverted.
4. Playwright `s04f-lineage` failed three times on locators (`selectOption` regex label; `getByLabel("Guest")` matching source text containing `guestName`; `textarea[name=exactText]` colliding with the cultural form). Fourth run passed.

## Independent verification

Focused Claude prompt: `docs/control/EOS_S04F_FOCUSED_CLAUDE_VERIFICATION.md`. Claude verifies; Claude does not accept EOS-S04F.
