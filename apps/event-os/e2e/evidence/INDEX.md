# EOS-S04A P09 visual evidence index

**Source:** Command Atelier Event OS frontend  
**Captured:** 6 September 2026  
**Local SHA at capture:** `feb73cd` plus P09 verification commit  
**Artifacts:** untracked under `apps/event-os/e2e/evidence/artifacts/` and Playwright `test-results/` videos  
**Do not commit** screenshots, traces or videos.

| Route | Role | Viewport | Action | Expected | Actual | Result | Artifact path |
|-------|------|----------|--------|----------|--------|--------|---------------|
| `/app/events/:id/guests/new` → dossier | CEO | desktop 1280 | Intake titled Yorùbá adult with honorific, middle names, post-nominals | Structured name persisted; no inferred title | Formal salutation showed Ọmọ́tọ́lá Ọlábọ́dé with supplied Professor title | PASS | `e2e/evidence/artifacts/p09-desktop-titled-adult.png` |
| guest dossier | CEO | desktop | Confirm addressing | Status HOST CONFIRMED; provenance shown | Confirmation recorded; formal/familiar pair visible | PASS | `e2e/evidence/artifacts/p09-desktop-confirmed-addressing.png` |
| `/app/events/:id/guests` | CEO | desktop | Directory render | Familiar primary; confirmed formal column; diacritics intact | Ọmọ́tọ́lá and Professor formal form visible; Adéṣínà blank-title fallback | PASS | `e2e/evidence/artifacts/p09-directory-formal-familiar.png` |
| titled guest dossier | Planner | desktop | Confirm addressing | Confirm control absent; administer remains | Confirm button count 0; planner denial copy visible | PASS | `e2e/evidence/artifacts/p09-planner-confirm-denied.png` |
| Adéṣínà dossier | Planner | desktop | Create INVITATION_PARTY and add Ẹ̀bùnolúwa | Party is not a person; no inferred principal; independent member link | P09 entourage created; no principal inferred; member navigation works | PASS | `e2e/evidence/artifacts/p09-party-entourage.png` |
| new child dossier | Planner | desktop | Intake CHILD without adult | Readiness blocked; no date of birth | BLOCKED MISSING RESPONSIBLE ADULT | PASS | `e2e/evidence/artifacts/p09-child-blocked.png` |
| new child dossier | Planner | desktop | Link Ẹ̀bùnolúwa as responsible adult | Readiness READY FOR EVENT | READY FOR EVENT after valid active link | PASS | `e2e/evidence/artifacts/p09-child-ready.png` |
| Ẹ̀bùnolúwa dossier | CEO | desktop | Inspect unnamed allowance | Unnamed quantity; not a person | `unnamed-allowance` visible; no fabricated guest | PASS | `e2e/evidence/artifacts/p09-unnamed-allowance.png` |
| Ẹ̀bùnolúwa dossier | CEO | desktop | Materialise Fọláṣadé Adékúnlé | Exactly one named companion; unnamed gone | One companion link; materialise control removed | PASS | `e2e/evidence/artifacts/p09-named-companion.png` |
| Ẹ̀bùnolúwa dossier | CEO | desktop | Expand allowance to 4 | Server refuses S03 expansion | Validation state: cannot expand S03 allowance | PASS | `e2e/evidence/artifacts/p09-expansion-refused.png` |
| `/app/admin/audit` | CEO | desktop | Inspect lineage | Append-only addressing confirmation visible | `guest.addressing.confirmed` present | PASS | `e2e/evidence/artifacts/p09-audit-lineage.png` |
| `/app/events/:id/communications` | CEO | desktop | Communications render | Structured names; Command Atelier frame | Communications surface rendered without guessed titles | PASS | `e2e/evidence/artifacts/p09-communications.png` |
| Ẹ̀bùnolúwa dossier | CEO | tablet 768 | Dossier layout | Party and entitlement usable; no clipped primary action | Tablet dossier readable | PASS | `e2e/evidence/artifacts/p09-tablet-dossier.png` |
| guest directory | CEO | 360px | Mobile cards | No document-level horizontal scroll; names wrap by word | Directory cards; Ọmọ́tọ́lá visible | PASS | `e2e/evidence/artifacts/p09-mobile-360-directory.png` |
| titled guest dossier | CEO | 360px | Long Yorùbá name | Wrap by word/phrase; diacritics intact | Long name visible without character-breaking | PASS | `e2e/evidence/artifacts/p09-mobile-360-long-yoruba.png` |
| `/guests/new?demo=loading` | CEO | 360px | Loading state | Explains wait; no false success | Loading operational state | PASS | `e2e/evidence/artifacts/p09-loading-state.png` |
| `/guests?demo=empty` | CEO | 360px | Empty demo | Explains empty; next step | Empty state rendered | PASS | `e2e/evidence/artifacts/p09-empty-demo.png` |
| Adéṣínà `?state=DEPENDENCY_UNAVAILABLE` | CEO | 360px | Safely simulated store failure | Postgres unavailable copy; retry safe; no stack | `postgres_unavailable` state | PASS | `e2e/evidence/artifacts/p09-server-failure.png` |
| Ẹ̀bùnolúwa dossier | CEO | 360px + reduced motion | Keyboard focus | Visible focus; reduced motion | Refresh control focused | PASS | `e2e/evidence/artifacts/p09-keyboard-focus.png` |
| Ẹ̀bùnolúwa dossier | CEO | 360px + reduced motion | Reduced motion | No motion-dependent meaning | Reduced-motion dossier | PASS | `e2e/evidence/artifacts/p09-reduced-motion.png` |
| `/app/events/:id/guests/:id` | unauthenticated | desktop | Direct dossier | Sign-in required; no guest flash | Redirected to sign-in | PASS | `e2e/evidence/artifacts/p09-unauthenticated.png` |
| `/guests/new` | Event Director | desktop | Empty reason / validation | Native required field; server validation summary | Reason focused; validation state shown | PASS | `e2e/evidence/artifacts/p09-validation-error.png` |
| Ẹ̀bùnolúwa dossier | Event Director | desktop | Stale expectedVersion | Conflict; data unchanged; reload required | `conflict` operational state | PASS | `e2e/evidence/artifacts/p09-conflict.png` |
| Adéṣínà dossier | CEO / Planner | desktop | Blank-title adult | Safe fallback; no guessed Mr/Mrs/Dr | Blank — safe fallback copy | PASS | covered in titled/party captures and P08 hardening |
| household party | CEO | desktop | Alákíjà HOUSEHOLD fixture | Party distinct from guest; members independently linked | Visible on Ẹ̀bùnolúwa dossier in P08/P09 | PASS | `e2e/evidence/artifacts/p09-unnamed-allowance.png` |
| primary journey | CEO→Planner→CEO | 1280 video | Full vertical | Short interaction recording | Playwright video recorded | PASS | `test-results/s04a-integration-P09-vertical-journey-with-visual-evidence-chromium/` |

Primary journey video is untracked Playwright output. Screenshots are untracked by `e2e/evidence/.gitignore`.
