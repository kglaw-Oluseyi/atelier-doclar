# EOS-S04E acceptance remediation — edition lineage, staff hydration and host decision authority

**Slice:** `EOS-S04E`  
**Prompt Control ID:** `MD-PR-S024`  
**Status:** `IN_REVIEW / NOT READY`  
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Remediation baseline:** `413e6b988ded27b047f12d885cdcd9bacfe41b0f`  
**EOS-S04F / EOS-S05:** untouched and unauthorised

This record does not accept EOS-S04E. Deployment gate, premium visual quality, staff/host session separation, single-use magic-link exchange, token removal from the URL, replay denial and forged-token non-disclosure remain previously verified and were not reopened.

## Live edition-lineage diagnosis (read-only)

Inspected Alpha One `00000000-0000-4000-8000-000000000021` on Railway Event OS Postgres (`platform_documents`). No manual SQL patch was applied.

| Record | ID | Kind / status | Notes |
|--------|----|---------------|-------|
| Genesis | `00000000-0000-4000-8000-0000000000f7` | BlueprintGenesis `IMPORTED` | Accepted brief. Not a published narrative edition. |
| Seed narrative | `00000000-0000-4000-8000-0000000000f8` | Started `DRAFT`, later `PUBLISHED` v2 | In-place publish during “Reveal the Atelier”. Provenance remained seed text. No `supersedesEditionId`. |
| CLAUDE-S04E-A1 | `058532b3-b214-4682-89f7-42b01edceab6` | `PUBLISHED` v1 | Provenance `CLAUDE-S04E-A1 — staff-published synthetic narrative edition…`. `supersedesEditionId` = seed `…0f8`. Published `2026-09-07T20:21:21.870Z` by the director. |
| Atelier | `00000000-0000-4000-8000-0000000000f6` | `PUBLISHED` v3 | `currentNarrativeEditionId` = CLAUDE `058532b3…`. Revealed `2026-09-07T20:23:18.122Z` (after the Claude publish). |

Sequence: Claude published CLAUDE-S04E-A1 while the seed was still a draft. Staff then revealed the Atelier. `publishEventAtelier` flipped the seed draft **in place** to `PUBLISHED`. Two concurrent published editions then existed. The UI counter counted only `publicationState === "SUPERSEDED"` and showed **0**.

### Classification

**Outcome A, plus a later lifecycle defect.**

At the moment CLAUDE-S04E-A1 was first published, zero earlier **published** editions was truthful. The seed was genesis/draft material, not a prior published edition. The receipt wording “earlier editions preserved” was ambiguous.

After reveal, the seed became a published sibling. It was referenced by `supersedesEditionId` but was not marked `SUPERSEDED`. Content was not deleted. The counter alone must not be read as data loss.

Governed repair: the next staff publication creates a new immutable edition from current published truth (CLAUDE-S04E-A1), marks **all other published** editions for the atelier `SUPERSEDED` (including orphan seed `…0f8` and CLAUDE-S04E-A1), and preserves those records as history. Claude’s edition is not rewritten or deleted.

## Live `canDecide` diagnosis

| Grant | `7aec7573-c34c-47d6-b5be-e4bc9b912fc6` |
|-------|----------------------------------------|
| Person | Principal host `…0000f0` Adérónké Alákíjà |
| Role | `PRINCIPAL_HOST` |
| `canDecide` | **`false`** |
| Status | `ACTIVE` v1 |

No host receipts existed. Seed decision `…000112` “Welcome words” remained `PUBLISHED`.

Root cause:

1. Issue action parsed `canDecide` only as `formData.get("canDecide") === "on"`.
2. The principal form used an unchecked-compatible checkbox with `defaultChecked`, but existing grants never displayed the durable value.
3. There was no renew/re-issue path that preserved the original grant record.
4. Principal Host does **not** override an explicit false in operations (correct). The host projection hid decisions, so the decision journey could not be verified.

Repair: explicit `true`/`false` radios; grant list shows durable `canDecide`; issuing a replacement for the same person supersedes the prior grant without rewriting its body; a governed renew action exists. Claude’s grant `7aec7573…` is preserved as history.

## Staff-editor hydration diagnosis

`event-atelier-workspace.tsx` hydrated Story and Pillars from `workspace.narrative` and hardcoded Atmosphere, Cultural intent, Design direction and Provenance. Host Vision used only the current published edition. After a publish, staff and host could disagree field by field.

## Corrections shipped

### Edition lifecycle

1. Reveal materialises a **new** published narrative copy from a draft. The genesis/draft record is not updated in place.
2. Publishing always creates a new immutable `EventNarrativeEdition`.
3. All other `PUBLISHED` editions for the atelier are marked `SUPERSEDED`.
4. `supersedesEditionId` is set only to the previous **current published** edition.
5. Starting a revision creates a draft prefilled from the current published edition (`currentNarrativeDraftId`). Leftover genesis drafts are not used as the editor source.
6. Hosts see only the current published edition. Staff see history, change summary, identifiers, timestamp and actor.
7. Receipts are conditional:
   - first publication: this is the first published edition;
   - superseding publication: names the exact prior edition preserved;
   - failure never claims history was preserved.

### Staff editor

All edition-owned fields hydrate from one coherent source: the revision draft if present, otherwise the current published edition. The editor shows which edition/draft is being edited. After publication, staff editor and host Vision agree on Story, Pillars, Atmosphere, Cultural intent, Design direction and Provenance. Stale publication uses `expectedAtelierVersion`. Edition-owned fields in this pack are required non-empty; there is no silent fallback to old seed text.

### `canDecide`

Selected `true` persists; unselected remains `false`. Principal Host does not imply decide. Read-only Host can never decide. Server mutation checks the durable grant/session. Renewal creates a new grant and supersedes the prior grant. Revocation removes capability immediately. Stale renewals conflict. Audit records who granted or changed authority and why. No global staff role was created.

### Step-up

Seed “Welcome words” is an ordinary preference (`requiresStepUp: false`). Ordinary reading does not require step-up. The pack’s reserved confirmation is modelled as a staff-publishable decision with `requiresStepUp: true`. Step-up tokens are purpose-scoped, expire, cannot be replayed, and leave data unchanged on failure. The mechanism is an enforced contract test, not a decorative unused control presented as completed evidence.

### Action-result integrity

Publication, access and decision staff actions continue to use the accepted correlation-scoped result mechanism. Process-local recall (`TDR-S04E-001` / `TDR-S04D-004`) remains non-blocking for current single-replica verification. It is blocking only before multi-replica deployment.

## Tests

Workspace `pnpm typecheck`, `pnpm test` (**593 pass / 0 fail**), `pnpm programme:validate` and `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean.

First-run product failures: none in the remediated platform journeys. One new combined journey test failed on the first clock because expired elevation was asserted two hours later, after idle session expiry; the product correctly refused an unavailable session. The test was tightened to 16 minutes (after the 15-minute step-up TTL, inside the 30-minute idle window) and then passed.

ACA-S04E remains registered, routeable as `/app/academy/ACA-S04E` and `/app/academy/aca-s04e`, fail-closed for ineligible users, scored at distinction ≥90 / pass 80–89 / retake below 80, and grants no access, permission, role, decision authority, gate signature or production authority.

## Independent verification

Focused Claude prompt: `docs/control/EOS_S04E_FOCUSED_CLAUDE_VERIFICATION.md`. Claude verifies; Claude does not accept EOS-S04E.
