# EOS-S05B Independent Claude Verification and Acceptance

**Status:** CEO review draft

## Timing

Run Claude once after Cursor completes and deploys the whole substantial slice, not after every module. Use targeted remediation passes only for changed risks.

## Role strategy

- CEO: full staff journey and no-blind-spots assessment.
- Client: separate private session and dossier journey.
- Event Director/risk reviewer/Planner/Auditor/System Administrator: focused permission and projection deltas only.

CEO visibility does not prove least privilege, so role deltas remain necessary; it does avoid quadrupling the full journey.

## Deployment gate

Claude first verifies exact application SHA, Railway project/service/URL, POSTGRES, migrations, production false, adapter readiness and S05B evaluation status. A mismatch blocks testing.

## Whole-slice journeys

1. Organisation policy/rule creation, independent review and supersession.
2. Event applicability with unknown fact, evidence resolution and gap trace.
3. Certificate expiry/conflict and safe document retrieval.
4. Residual risk maker/checker and same-input reevaluation lineage.
5. Clause legal/commercial review without enforceability claim or payment.
6. Vendor assessment factors, unknowns, manual decision and no sensitive inference.
7. Primary/standby readiness and missed checkpoint without automatic dispatch.
8. Fallback authorisation without booking, payment or reserve movement.
9. Incident chronology, sensitive projection and post-incident proposal.
10. Risk Budget successor with explicit scenario assumptions, trace, replay and governing Budget unchanged.
11. Client/venue dossier approval, publication, permission-safe download and no dispatch.
12. Cross-event/organisation, direct-route and System Administrator denials.
13. Two-tab conflict, refresh persistence, false-success and action-result focus.
14. Human UX: findability, labels, spacing, hierarchy, errors, responsive, keyboard, focus, zoom and cognitive load.

## Evidence standard

Record first-run failures. Distinguish product defect, environment, test harness and browser-tool limitation. Inspect binary exports where authorised. Verify that denied UI actions are also denied directly. Confirm confidential fields cannot be recovered through alternate surfaces, attributes, cached exports or routes.

## UX reporting

Claude should explain the human consequence and recommend the required interaction/technical correction precisely enough for ChatGPT to write a bounded Cursor prompt. It may name components, states, copy and acceptance tests; it should not invent code without repository inspection.

## Verdict

Return `READY`, `NOT READY` or `BLOCKED`. Claude never accepts EOS-S05B. ChatGPT compares Claude evidence, Cursor report and sensitive code, then decides `ACCEPTED`, `REMEDIATION REQUIRED` or `BLOCKED`.

