# EOS-S04F Implementation Record

**Slice ID:** `EOS-S04F`  
**Prompt Control ID:** `MD-PR-S026`  
**Status:** `ACCEPTED` on `2026-09-08` at SHA `a4795e83c929bf24591f52c2224eb4b588c23ef3` (`MD-PR-S027`). Historical 2026-09-08 programme language was `IN_REVIEW / NOT READY` after source-supersession remediation.
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)  
**Starting baseline:** `2663f4363ad311f486f05c70e8e8411d5e9830bb`

## Scope delivered

P00–P11: ratification, canonical mapping, language/Unicode contracts, additive migration `EOS-S04F-LANGUAGE-V1`, preference/cultural/translation/assembly services, Command Atelier language workspace, host multilingual edition projection, ACA-S04F, Playwright evidence, and Event OS deploy to Railway project `atelier-doclar`.

EOS-S05 was not started. Control Tower was not a deploy target.

## Product constitution

EOS-S04F owns language preferences, cultural source text, translations, multilingual editions and recipient assembly. It never sends a message, marks delivery, alters RSVP, creates invitation entitlement, changes addressing, changes programme, approves a campaign or invokes a provider.

## Preference and fallback

| Rule | Design |
|------|--------|
| Explicit only | Preference is supplied, event-scoped, correctable and auditable. |
| Unknown | First-class. Missing preference is not stored as English. |
| No inference | Name, surname, title, ethnicity, religion, nationality, address, household, party, phone country code and previous attendance are rejected as inference sources. |
| Terminal fallback | `en-GB` approved content only. Explicit preference is never overwritten. |
| Draft fallback | Forbidden. Unapproved or stale target text cannot enter recipient output. |

## Translation and cultural approval

| Rule | Design |
|------|--------|
| Cultural states | draft, in review, approved, rejected, superseded |
| Translation coverage | not started, partial, complete, approved, stale, superseded |
| Source types | human, machine-suggested, AI-suggested, imported, synthetic fixture |
| Maker/checker | translator/author cannot approve the same consequential record |
| Immutability | approved translations are immutable; correction creates a new edition |
| Stale source | source supersession marks dependent translations stale / review-required |
| Synthetic fixtures | labelled unvalidated; not culturally authoritative |

## Unicode policy

Storage is NFC. Authored display text is never strip-corrected. Accent-insensitive search keys are derived separately. Truncation uses grapheme clusters. Comparison uses NFC equality of authored text.

## Staff authority

| Permission | CEO | Event Director | Planner | Auditor | Sysadmin |
|------------|-----|----------------|---------|---------|----------|
| `language.preference.view` | yes | yes | yes | yes | no |
| `language.preference.manage` | yes | yes | yes | no | no |
| `language.cultural.create` | yes | yes | yes | no | no |
| `language.cultural.review` / `approve` | yes | yes | no | no | no |
| `language.translation.create` | yes | yes | yes | no | no |
| `language.translation.review` / `approve` | yes | yes | no | no | no |
| `language.edition.manage` | yes | yes | yes | no | no |
| `language.edition.publish` | yes | yes | no | no | no |
| `language.assembly.preview` | yes | yes | yes | yes | no |
| `language.glossary.manage` | yes | yes | yes | no | no |
| `language.audit.view` | yes | yes | no | yes | no |

## First-run verification

Workspace `pnpm typecheck` passed. `pnpm test` passed after ordinary language-test fixes. `pnpm programme:validate` passed. `pnpm --filter @maison-doclar/event-os build` passed. `git diff --check` clean.

Language journeys first run: inference was applied to content-work `title`; the check now runs only on preference and assembly, before `parseStrict`. Unicode NFD used an invented string; the test now uses `composed.normalize("NFD")`. Second run: 13/13 language tests passed.

Playwright first run: 0 passed / 2 failed. The German compound appears in both source and target, and two French complete editions share `edition-COMPLETE-fr`. Locators were tightened. Second run: `s04f-vertical` passed; responsive still matched two `[lang="de"]` nodes. Third run: both S04F Playwright specs passed, including host multilingual edition, Academy ACA-S04F, 360/768/720/1440 viewports and axe.

Source-edition supersession, dependent-translation staleness and visible placeholder-set validation were remediating after the first implementation. Formal acceptance is `docs/control/EOS_S04F_ACCEPTANCE.md`. Historical remediation: `docs/control/EOS_S04F_ACCEPTANCE_REMEDIATION.md`. Claude verified; Claude did not accept.

See `docs/control/CUMULATIVE_TECHNICAL_DEBT_AND_REGRESSION_REGISTER.md` items `TDR-S04F-001`–`002` and carried `TDR-S04E-001`–`004` / `TDR-S04D-004`. EOS-S05 remains unauthorised.
