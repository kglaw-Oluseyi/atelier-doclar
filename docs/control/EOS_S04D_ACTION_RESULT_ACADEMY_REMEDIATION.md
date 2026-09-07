# EOS-S04D action-result integrity and ACA-S04D delivery remediation

**Slice:** `EOS-S04D`  
**Status:** `IN_REVIEW / NOT READY`  
**Starting baseline:** `0814f0e27f7500dbcedbe25c7ccfd7280b4adf06`  
**Catalogue slice:** no  
**Production:** unauthorised (`productionAuthorised` remains false)

This record does not accept EOS-S04D. Forecast arithmetic, RSVP/forecast/provision separation, parameter immutability, maker/checker, concurrency, host projection, calibration, role projections and no-side-effect guarantees were not reopened.

## Defects remediated

1. Stale action-result banners after a later successful write.
2. ACA-S04D unpublished on the deployed Academy (canonical ID 404; index linked only the lowercase slug).
3. Phase occupancy wording that mixed eligible headcount with forecast centre.

## Action-result lifecycle

Shared cookie `md_event_os_action_state` previously stored unsigned `{code,message}` failure flashes. Success redirects used `?ok=` and did not overwrite the cookie. Pages merged `query.state ?? flash.code` and `operationalStateFromQuery` preferred platform error `state` over `ok`. A later success therefore still rendered the earlier FORBIDDEN banner.

The shared boundary is now a signed, single-slot `ActionResult`:

- bound to session hash, actor person id, route scope, action type, correlation id, status, creation time
- written only after the durable outcome is known
- success and failure are mutually exclusive
- consumed once from a server action (`consumeActionResultAction`) that matches the presented correlation ID, never by deleting cookies in an RSC
- an in-flight consume from action A cannot clear the later result of action B
- a short-lived in-process recall covers the Next.js server-action redirect render that can miss the newly set cookie; presentation still requires matching actor, session, scope and correlation ID
- URL carries only `result=<uuid>` (plus non-secret extras such as academy outcome/percent)
- sign-in, sign-out and session API clear the cookie
- a mismatched session, actor, scope or correlation id presents nothing
- `VERSION_CONFLICT` stays locked until the existing reload server action consumes it

## ACA-S04D delivery

Course content remains compiled in `@maison-doclar/academy`. Postgres stores learner attempts and now an additive catalogue receipt `event_os_academy_catalogue` (insert on conflict update version/title; no duplicate rows).

Root cause of live not-found: App Router folder `aca-s04d` did not serve canonical `/app/academy/ACA-S04D`. The catalogue now exposes href `/app/academy/ACA-S04D`, a `[courseId]` route resolves id or slug, and the index lists versioned ACA-S04A/C/D for every assigned synthetic role.

Eligible roles: CEO, Event Director, Planner, Auditor, Client Lead, Department Lead, System Administrator (via existing assignment paths). Unassigned identities remain FORBIDDEN. Completion still grants no operational permission.

## Church membership

S04D seed church entitlements remain Ẹ̀bùnolúwa `...072`, Olúfẹ́mi `...073`, Adéṣínà `...076` (3). Reception remains 4. Whole-event attendance is the distinct-guest union and is not the sum of phase totals.

If live durable church eligible is 4, retain that membership. The likely fourth guest is Tómiwà `...074` from accepted S04B verification residue, not a seed rewrite. Record it under `TDR-S04A-011` / `TDR-S04D-002`. The UI now labels **Eligible people (distinct guest IDs)** separately from **Forecast centre (people)**.

## Historical closeout (not acceptance)

Written while the slice was `IN_REVIEW / NOT READY`. Independent focused Claude verification is `docs/control/EOS_S04D_FOCUSED_CLAUDE_VERIFICATION.md`.

Formal technical acceptance on `2026-09-07` closed the three remediated findings and is recorded in `docs/control/EOS_S04D_ACCEPTANCE.md` (`MD-PR-S023`, SHA `64683a853ead39c62caeb2d2e9f26bcb9d1dca21`). This remediation record is retained as dated evidence and is not rewritten.
