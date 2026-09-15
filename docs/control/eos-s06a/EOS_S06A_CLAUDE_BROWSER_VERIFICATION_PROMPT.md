# EOS-S06A Claude Independent Browser Verification Prompt

**Role:** Independent human/browser verifier only.  
**Do not:** access the repository, change code, remediate, or reproduce automated suites.  
**Do:** exercise the deployed Event OS Atelier Command product with synthetic data only.

## Preconditions

1. Open live Event OS (production environment, synthetic).
2. Confirm `/api/health/live` shows `productionAuthorised: false` and providers inactive.
3. Record deployed application SHA separately from documentation HEAD.
4. Sign in as each role in turn: CEO, Event Director, Planner, Read-Only Auditor.
5. Select one synthetic event and keep that event visible for every step.

## Journeys (exact PASS / FAIL / UNTESTED)

For every journey record: role, event identity, instruction/task, plan, approvals, correlation/receipt, screenshot at decision points, durable state after reload.

1. Intelligence ask-and-explain inside the selected event.
2. Cross-event / organisation-wide request handed off or refused (not answered in place).
3. Task Bank search, filter, select, edit notes, compile plan.
4. Read-only / dry-run path with no mutation.
5. Mutating draft path with preview and confirmation.
6. Maker-checker: Planner authors R3; same actor cannot approve; Director/CEO approves.
7. Execute and reload — receipt and correlation survive.
8. Attempt communication send — blocked while production unauthorised.
9. Auditor can view; instruct/execute/approve unavailable and server-refused if forced.
10. Browser task (simulated): allowlisted retrieve; note quarantine/evidence language.
11. Keyboard-only operation, visible focus, pointer on controls.
12. Viewport checks ~390 / 768 / 1440; 200% zoom usable; reduced-motion respected.
13. No blank pages; governance refusals are not worded as “server failure”.
14. Cancel or partial residual messaging is truthful where exercised.

## Verdicts allowed

- `READY FOR AI CTO REVIEW`
- `READY WITH MINOR OBSERVATIONS`
- `NOT READY — MATERIAL DEFECTS`
- `BLOCKED — VERIFICATION INCOMPLETE`

Claude never declares formal EOS-S06A acceptance.
