# EOS slice build master template v1.0

Placeholders: {{SLICE_ID}} {{SLICE_NAME}} {{AUTHORITATIVE_SOURCES}} {{CAPABILITY_PREFIX}} {{RAILWAY_SERVICE}} {{STARTING_SHA}} {{SLICE_SPECIFIC_REQUIREMENTS}}

This template is the control for every Event OS rebuild slice. An instantiated contract lives under docs/rebuild/{{SLICE_ID_LOWERCASE}}/ and must not modify this file.

## Role

The implementer recovers the genuine approved specification, converts it into an exhaustive executable contract, implements every capability, tests it, commits and pushes to GitHub main, deploys only {{RAILWAY_SERVICE}}, and provides requirement-level technical certification.

The implementer may make engineering decisions inside the approved architecture. The implementer may not narrow the product scope, substitute a smaller wrapper, silently omit a requirement, describe backend-only code as a completed human capability, defer unfinished work as technical debt, or declare the slice accepted.

Cursor certifies technical conformity. The reviewing CTO examines the evidence and recommends. Only the CEO grants final acceptance after browser validation.

## Source authority

Examine {{AUTHORITATIVE_SOURCES}}. Precedence is:

1. explicit CEO-approved product decisions;
2. original approved capability and journey specifications;
3. original acceptance criteria;
4. canonical architecture decisions that change technology without reducing functionality;
5. later remediation that expands or corrects a requirement;
6. implementation reports and previous code only as evidence of what went wrong.

Wrappers, former acceptance declarations, zero-debt claims, old reports, previous source, narrowed tests, and AI CTO interpretations without CEO approval are not authoritative when they reduce scope.

## Numbered categories

Use stable sequential identifiers. Never reuse an identifier.

- {{CAPABILITY_PREFIX}}-OBJ business objectives
- {{CAPABILITY_PREFIX}}-ACT human actors
- {{CAPABILITY_PREFIX}}-CAP capabilities, one independently verifiable outcome each, with all thirty required fields
- {{CAPABILITY_PREFIX}}-RULE business rules
- {{CAPABILITY_PREFIX}}-DATA persistence
- {{CAPABILITY_PREFIX}}-PERM authorization
- {{CAPABILITY_PREFIX}}-AUD audit
- {{CAPABILITY_PREFIX}}-UI screens and interaction
- {{CAPABILITY_PREFIX}}-API routes and actions
- {{CAPABILITY_PREFIX}}-INT integrations
- {{CAPABILITY_PREFIX}}-NFR security, performance, accessibility and reliability
- {{CAPABILITY_PREFIX}}-BLD build units
- {{CAPABILITY_PREFIX}}-TST automated tests
- {{CAPABILITY_PREFIX}}-JRN browser journeys
- {{CAPABILITY_PREFIX}}-ACC acceptance criteria
- {{CAPABILITY_PREFIX}}-DEP deployment and rollback
- {{CAPABILITY_PREFIX}}-DEC approved decisions
- {{CAPABILITY_PREFIX}}-AMB genuine unresolved ambiguities

## Capability completeness

A capability is complete only with a usable frontend or specified system entry, server route or action, domain logic, authorization, validation, durable persistence, a readable result, audit where required, automated tests, deployed availability, and a browser journey ready for human validation.

Backend-only code is incomplete when a human UI is required. UI-only code is incomplete without server behaviour and persistence. Documentation and fixtures are not implementation.

## Technical debt

Technical debt is any approved requirement that is missing, incomplete, disconnected, placeholder-only, fixture-only, schema-only, backend-only when UI is required, UI-only when persistence is required, untested, unaudited where audit is required, inaccessible, not responsive, not deployed, dependent on an undocumented workaround, or falsely marked complete.

Do not use future enhancement, follow-up, out of scope, scaffold, Phase 2, to be wired later, or accepted limitation unless the authoritative specification itself excludes or defers the item, with a citation.

## Traceability

Every contract item maps to source, capability, build unit, files, automated test, browser journey, persistence evidence, audit evidence, deployment evidence, and a status. Permitted statuses are NOT STARTED, IN PROGRESS, IMPLEMENTED, AUTOMATED VERIFIED, DEPLOYED — AWAITING BROWSER VALIDATION, and BLOCKED BY CEO DECISION. Do not use COMPLETE or ACCEPTED.

## Frontend quality gate

Command Atelier visual language. Desktop, tablet and mobile. Persistent navigation. Current organisation, client and event context. Forms, labels, inline validation, server errors, loading, empty and success states. Confirmation for consequential actions. Keyboard operation, visible focus, ARIA, WCAG AA contrast, 44px targets, pointer cursor on controls, no horizontal overflow, no dead buttons, no raw identifiers where a human label exists.

Test 390px, tablet, desktop and wide desktop.

## Backend and persistence

Strict TypeScript, validated inputs, explicit domain types, durable PostgreSQL, transactional mutations, organisation isolation, scoped assignments, central authorization, secure sessions, idempotency, optimistic concurrency, append-only audit, correlation identifiers, structured errors, redaction, explicit migrations, health and readiness, synthetic fixtures, configuration validation, and no secrets in Git.

Do not recreate whole-store hydration. A normal mutation must not rewrite unrelated organisations, events, collections, audit rows or idempotency rows.

## Authorization

Server authorization is authoritative. UI capabilities derive from the same policy. Direct routes, APIs, services, commands and jobs enforce authorization. Refused actions do not mutate business records. The approved role model for the slice is stated in {{SLICE_SPECIFIC_REQUIREMENTS}} and must not be reduced because only some roles can perform an action.

## Automated verification

Domain, validation, authorization, isolation, assignment scope, service, PostgreSQL persistence, transaction rollback, concurrency, idempotency, audit, route, server action, component, navigation, accessibility, responsive rendering, end-to-end browser, migration, health, deployment configuration, and traceability tests.

The mechanical completeness gate fails when a contract identifier has no traceability row, a capability has no build unit, test or browser journey, a required audit event is missing, a permission is unclassified, a route has no authorization, a user-visible action is disconnected, or an item is marked verified without evidence.

## Implementation self-audit

Before commit, answer for every capability whether frontend, reachability, server entry, authorization, validation, persistence, readable state, audit, replay, concurrency, tests and browser journey are present, and whether any placeholder or manual workaround remains.

Search for TODO, FIXME, placeholder, stub, mocked success, fake persistence, disabled or skipped tests, .only, expected failure, unimplemented branch, hard-coded role bypass, fixture-only production behaviour, hidden direct-API workflow, dead UI and legacy imports.

## Commit, push and deployment

Confirm the worktree contains only this slice. Confirm traceability is complete. Confirm approved technical debt is zero. Push to GitHub main without force. Deploy only {{RAILWAY_SERVICE}} in project atelier-doclar, environment production. Keep productionAuthorised false. Do not deploy Control Tower or solver-worker. Verify the deployed SHA, health, readiness, persistence and migrations. Do not expose secrets.

## Certification limits

Do not write that the slice is accepted, complete, production authorised, or CEO approved.

The maximum status is DEPLOYED — READY FOR CTO REVIEW AND BROWSER VALIDATION.

If any contract item is missing, untested, undeployed, or fixture-only where real functionality is required, state that the slice is not ready for CTO review.

## CTO review, browser validation and CEO acceptance

Cursor does not perform the final human browser acceptance and does not create an acceptance record. The CTO reviews the evidence. The CEO grants final acceptance only after browser validation.

{{SLICE_SPECIFIC_REQUIREMENTS}}
