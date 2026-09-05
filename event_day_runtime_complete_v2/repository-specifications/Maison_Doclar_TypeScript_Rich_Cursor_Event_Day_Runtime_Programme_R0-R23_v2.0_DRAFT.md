**MAISON DOCLAR**

TypeScript-Rich Cursor Implementation Programme R0–R23

Controlled, sequential implementation authority for Event OS integration

MD-OS-CUR-002 \| Version 1.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# How to use this programme

Give Cursor the complete programme for context, but authorise exactly
one R-numbered prompt in a working branch. Review evidence and the
commit before authorising the next. The words “implement”, “complete”
and “pass” require backend, frontend, data, security, offline behaviour,
tests, evidence and documentation—not a stub, mock-only path or TODO.

# Standing contract applied to every prompt

- Inspect AGENTS.md, repository rules, package manager, architecture,
  tenancy/event scoping, auth, migrations, tests, CI, design system and
  current state before editing.

- Reconcile with the ratified OS blueprint and this bundle; stop and
  report contradictions rather than inventing precedence.

- Preserve user changes and existing architecture unless the prompt
  expressly authorises a migration.

- Use strict TypeScript; no any, unsafe casts, duplicated domain types,
  client-only security or unvalidated boundaries.

- Use Zod or the repository-standard runtime validator at every
  package/API/external boundary; infer TypeScript types from schemas.

- Enforce organisation, event, role, device and package revision
  server-side; include negative cross-tenant/event tests.

- Implement all relevant UI states: loading, empty, validation, denied,
  stale, degraded, offline-to-WAN, offline-to-edge, pending, conflict,
  error and recovery.

- No external runtime asset or service may be required by a declared
  core workflow.

- Add migrations through the repository framework with
  containment/rollback, indexes, constraints and test evidence.

- Add unit, integration, API, end-to-end, accessibility, security,
  offline and failure tests appropriate to the change.

- Use synthetic data. Do not expose secrets or production
  personal/biometric data in code, logs, screenshots or fixtures.

- Update BUILD_LEDGER.md, CURRENT_STATE.md, DECISION_LOG.md,
  traceability and evidence index.

- Run formatter, lint, typecheck, tests, build and relevant browser
  flows; record exact commands and results.

- Create one coherent commit containing the R-ID. Do not continue to the
  next prompt.

- Stop on failing baseline, ambiguous authority, destructive migration,
  missing external approval, untestable acceptance criterion,
  security/privacy regression or need to change canonical law.

# R0 — Repository preflight and supersession

Authorised work: Inventory current OS modules,
check-in/guest/access/seating/staffing/incident/offline/FaceGate code,
database, APIs, routes, tenancy, auth, deployment and tests. Add the v2
controlled documents. Mark v1 pack superseded. Produce gap matrix and
baseline evidence; make no feature implementation.

Prompt-specific acceptance: Repository map; conflict log; dependency
graph; baseline commands; gap register; ADR adoption; evidence index.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R1 — Domain kernel and runtime state machine

Authorised work: Create canonical schemas/types for Scope, RuntimeState,
device classes/capabilities, command receipt, health and authority.
Implement exhaustive legal transitions and evidence-bearing transition
service.

Prompt-specific acceptance: Illegal transitions/role attempts denied;
state history audited; no duplicated enums; unit/property tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R2 — Departmental projection registry

Authorised work: Implement typed registry for all 20 departmental
projections, descriptors, owner/classification/required
flag/roles/mutations/missing behaviour and data dictionary metadata.

Prompt-specific acceptance: Every department registered; exhaustive
compiler checks; no generic untyped record path at runtime; missing
projection behaviour tested.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R3 — Package builder and minimisation

Authorised work: Build consistent cloud snapshot and allow-listed
mappers; deterministic search/device derivatives; prohibited-field and
referential-integrity scans; departmental preview API/UI.

Prompt-specific acceptance: Same input yields same hashes; unrelated
event/marketing/raw biometric/secret data excluded; lead sign-off
workflow.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R4 — Package freeze, manifest, signature and import

Authorised work: Implement canonical serialization, per-file
hashes/root, signing abstraction, compatibility/expiry/downgrade checks,
staging import, atomic promote and comparison report.

Prompt-specific acceptance:
Corrupt/wrong-scope/expired/downgrade/partial packages rejected without
altering active data; signer keys externalised.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R5 — Local persistence and immutable ledger

Authorised work: Implement local database adapter and atomic command
transaction: domain projection + ledger + sync outbox. Add monotonic
sequence, aggregate versions, payload/prior hashes and compensating
commands.

Prompt-specific acceptance: Concurrency/idempotency/tamper tests;
application role cannot update/delete ledger; restart integrity check.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R6 — Local identity, device registry and certificate enrolment

Authorised work: Implement asset registry, device key/certificate
abstraction, event-bounded assignment, separate user login, revocation,
expiry, custody and device-profile generator.

Prompt-specific acceptance: Lost/expired/wrong-event/wrong-class devices
denied locally; actor and device recorded; admin separation tested.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R7 — PWA shell and pinned local assets

Authorised work: Build locally served installable PWA for supported
staff clients; precache versioned shell; remove CDN/font/analytics
dependencies; pin updates during ACTIVE; implement local/WAN
distinction.

Prompt-specific acceptance: Cold start with WAN removed; no outbound
dependency; supported browser matrix; update/rollback and storage tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R8 — Scan and lookup platform

Authorised work: Implement QR/HID/manual/name/phone/household/table/seat
lookup adapters, safe ranking/masking/rate limits, ScanOutcome and
audit. Camera scanning uses feature detection and approved fallback.

Prompt-specific acceptance:
Exact/ambiguous/not-found/stale/restricted/duplicate results tested;
fuzzy result never performs mutation; HID burst test.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R9 — Initial human check-in surface

Authorised work: Build fixed/mobile registration workflow,
guest/companion verification, credential result, necessary flags,
confirm step, ledger command, receipt and correction/referral.

Prompt-specific acceptance: Face candidate cannot call this command;
duplicates and interrupted responses idempotent; all scan/result/error
states and accessibility pass.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R10 — Greeter, protocol and guest-relations surfaces

Authorised work: Build least-privilege route/arrival/assistance view;
verified protocol treatment; relationship-owner alerts and handoff.

Prompt-specific acceptance: Restricted reasons hidden;
expired/unverified protocol visible; no unauthorised check-in; role and
screen-state E2E tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R11 — Seating, ushering and guest service surfaces

Authorised work: Build guest↔table/seat lookup, route/zone view, request
create/acknowledge/assign/transfer/resolve/reopen, table-call mapping,
relief and haptic cues with non-haptic equivalent.

Prompt-specific acceptance: Versioned seating moves; request chronology;
timer/escalation; event scope; offline and high-noise usability tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R12 — Department lead workspaces

Authorised work: Generate lead surfaces for F&B, transport,
accommodation, production, suppliers, accessibility, safety and security
from typed capabilities—not client-only flags.

Prompt-specific acceptance:
Team/posts/run/readiness/dependencies/requests/incidents/handover
complete; field masking and command permissions tested per role.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R13 — Self-scan kiosk

Authorised work: Implement locked, privacy-clearing arrival
pre-processing: scan, invitation-found safe acknowledgement, assistance
selection, routing/queue token and staff alert.

Prompt-specific acceptance: No
attendance/companion/override/biometric/credential authority; timeout
clears data; enumeration/rate/accessibility tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R14 — Client emergency outbox

Authorised work: Implement encrypted, size/time/command-bounded outbox
only for edge-API loss; visible pending state and explicit
ACCEPTED/DUPLICATE/REJECTED/QUARANTINED replay.

Prompt-specific acceptance: Device restart, AP roam, expiry, overflow,
version conflict and revocation tested; never label pending as
successful.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R15 — FaceGate consented enrolment and return-only gateway

Authorised work: Reconcile existing FaceGate: require prior human
check-in before enrolment; affirmative purpose/version consent; isolated
template reference; signed short-lived assertion verification; operator
ADMIT/REFER/DENY.

Prompt-specific acceptance: Network/app identity cannot create initial
attendance or admit; replay/expiry/wrong event/low
confidence/revocation/safeguarding/matcher loss/manual fallback tests.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R16 — Command console, health and degradation

Authorised work: Implement
package/server/database/ledger/backup/time/AP/client/power/disk/WAN/gateway/outbox
health. Unknown differs from green; every alert has owner,
acknowledgement, action and closure.

Prompt-specific acceptance: Fault injection drives correct state; WAN
loss does not mark core failed; drill-down is permissioned/audited.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R17 — Staff deployment, shifts and Academy gates

Authorised work: Consume current
certification/briefing/practical/restriction state; block unauthorised
post assignment; implement check-on-post, relief, handover and approved
exception.

Prompt-specific acceptance: Expired/suspended/wrong-role staff denied;
integration is idempotent and event-scoped; offline roster carries
signed status.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R18 — Incidents, safety, service recovery and fallback

Authorised work: Implement incident chronology,
severity/command/actions/notifications/recovery/closure plus explicit
digital→paper/radio activation and controlled transcription provenance.

Prompt-specific acceptance: Safety authority cannot be overridden by
automation; paper entries get unique IDs, dual review and linked
compensating commands.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R19 — Close, drain, seal and encrypted export

Authorised work: Implement closing state, writer/outbox drain,
unresolved-item gate, immutable seal manifest, dual control, encrypted
export and separately verified backup.

Prompt-specific acceptance: Reopen exceptional and audited;
sequence/count/root hashes verified; no normal writes after seal.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R20 — Deterministic cloud reconciliation

Authorised work: Implement authenticated resumable upload, idempotent
processor, dependency/version/authority/schema/tamper conflict classes,
quarantine workbench, compensating decisions and certificate.

Prompt-specific acceptance: No consequential last-write-wins; every
sealed item accounted for; duplicate-identical has no second effect.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R21 — Deployment, configuration, backup and recovery

Authorised work: Provide pinned images, SBOM, non-secret schema, secret
injection, firewall/VLAN examples, migration manifest, health probes,
backup/restore, fencing and manual recovery runbooks.

Prompt-specific acceptance: No automatic failover without
quorum/fencing; clean-host restore and rollback/containment proven;
venue WAN optional.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R22 — Full automated and browser acceptance

Authorised work: Run all critical suites with synthetic tier load, WAN
physically/logically denied, concurrency, AP/server/power simulations,
supported devices, accessibility and security.

Prompt-specific acceptance: Evidence tied to
commit/image/config/package; zero critical failures; flaky/skipped tests
block unless explicitly accepted by authorised reviewer.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# R23 — Evidence pack and release locks

Authorised work: Generate traceability, test results, screenshots,
logs/hashes, threat/residual-risk register, venue/rehearsal/pilot
placeholders and release dashboard. Keep external gates unsigned.

Prompt-specific acceptance: Cursor cannot approve
legal/privacy/biometric authority, venue rehearsal, independent
acceptance, Event Director activation or CEO production release.

| **Required area** | **Instruction**                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Discovery         | Identify existing implementation and exact files; cite findings before edits.                                        |
| Types/data        | Use canonical shared schemas; add constraints/indexes/migration evidence where applicable.                           |
| API/security      | Validate boundaries; enforce scope/role/device server-side; audit consequential actions.                             |
| Frontend          | Complete relevant surfaces and every applicable state; responsive and accessible.                                    |
| Offline/failure   | Prove behaviour with WAN absent and specified local faults; preserve explicit uncertainty.                           |
| Tests             | Unit, integration, API, E2E, negative isolation and failure cases mapped to acceptance IDs.                          |
| Evidence/close    | Commands/results, screenshots where visual, changed-file summary, risks, ledgers, traceability and one commit; STOP. |

# Final rule

Completion of R23 means the build evidence is ready for human review. It
does not mean the system is legally approved, venue-proven,
independently accepted or authorised for production.

# Appendix A — Mandatory TypeScript implementation patterns

These patterns are normative shapes, not blind copy-and-paste
instructions. Cursor must adapt imports and infrastructure to the
repository discovered in R0 while preserving the security and domain
invariants.

## A1. Scope and capability guard

type RequestContext = Readonly\<{  
organisationId: OrganisationId; eventId: EventId;  
packageRevision: PackageRevision; actorId: UserId; deviceId: DeviceId;  
roles: readonly RoleCode\[\]; capabilities:
ReadonlySet\<DeviceCapability\>;  
}\>;  
  
function requireScope(ctx: RequestContext, input: Scope): void {  
if (ctx.organisationId !== input.organisationId \|\| ctx.eventId !==
input.eventId)  
throw new ForbiddenError("SCOPE_MISMATCH");  
if (ctx.packageRevision !== input.packageRevision)  
throw new ConflictError("PACKAGE_REVISION_MISMATCH");  
}  
function requireCapability(ctx: RequestContext, value:
DeviceCapability): void {  
if (!ctx.capabilities.has(value)) throw new
ForbiddenError("DEVICE_CAPABILITY_DENIED");  
}

## A2. Atomic command handler

async function executeCommand\<C extends LedgerCommand\>(ctx:
RequestContext, raw: unknown): Promise\<CommandReceipt\> {  
const command = LedgerCommandSchema.parse(raw);  
requireScope(ctx, command.scope);  
return db.transaction(async tx =\> {  
const duplicate = await
tx.ledger.findByOperationId(command.operationId);  
if (duplicate) return identicalHash(duplicate, command) ?
duplicateReceipt(duplicate) : quarantineDivergent(command);  
const aggregate = await tx.aggregate.lock(command.aggregateType,
command.aggregateId);  
if (aggregate.version !== command.expectedVersion) throw new
VersionConflictError();  
authorizeCommand(ctx, command, aggregate);  
const result = applyDomainCommand(aggregate, command);  
const sequence = await tx.eventSequence.next(command.scope);  
const entry = buildHashedLedgerEntry(command, result, sequence);  
await tx.aggregate.save(result);  
await tx.ledger.append(entry);  
await tx.syncOutbox.enqueue(entry.operationId);  
return acceptedReceipt(entry);  
});  
}

## A3. Exhaustive device profile generation

const DEVICE_PROFILES = {  
REGISTRATION_FIXED: { routes: \["/registration"\], capabilities:
\["GUEST_SEARCH","QR_SCAN","INITIAL_CHECK_IN"\] },  
QUEUE_GREETER: { routes: \["/arrival"\], capabilities:
\["GUEST_SEARCH"\] },  
USHER: { routes: \["/usher"\], capabilities:
\["GUEST_SEARCH","SEATING_READ","REQUEST_CREATE"\] },  
RETURN_ENTRY: { routes: \["/return"\], capabilities:
\["GUEST_SEARCH","RETURN_DECISION"\] },  
SELF_SCAN_KIOSK: { routes: \["/kiosk"\], capabilities: \["QR_SCAN"\]
},  
FACEGATE_GATEWAY: { routes: \[\], capabilities:
\["FACE_CANDIDATE_SUBMIT"\] }  
} satisfies Record\<DeviceClass, Readonly\<{ routes: readonly
string\[\]; capabilities: readonly DeviceCapability\[\] }\>\>;  
// Production must enumerate every DeviceClass; no permissive default
branch.

## A4. Scan outcome as a discriminated union

type ScanOutcome =  
\| { kind: "EXACT_MATCH"; match: SafeGuestMatch }  
\| { kind: "MULTIPLE_MATCHES"; matches: readonly SafeGuestMatch\[\];
referralCode: string }  
\| { kind: "NOT_FOUND"; safeMessage: string; referralCode: string }  
\| { kind: "ALREADY_CHECKED_IN"; match: SafeGuestMatch;
permittedActions: readonly Action\[\] }  
\| { kind: "INELIGIBLE"; safeMessage: string; referralCode: string }  
\| { kind: "STALE_OR_UNVERIFIED"; safeMessage: string; referralCode:
string };  
  
function renderOutcome(value: ScanOutcome): ReactNode {  
switch (value.kind) { /\* explicit surface for every case \*/ }  
return assertNever(value);  
}

## A5. FaceGate return-only invariant

async function decideReturn(ctx: RequestContext, raw: unknown):
Promise\<CommandReceipt\> {  
requireCapability(ctx, "RETURN_DECISION");  
const input = ReturnDecisionSchema.parse(raw);  
const attendance = await attendanceRepo.require(input.scope,
input.guestId);  
if (!attendance.initialHumanCheckInAt) throw new
ForbiddenError("NO_INITIAL_HUMAN_CHECK_IN");  
if (input.assertionId) {  
const assertion = await
verifyAndConsumeCandidateAssertion(input.assertionId);  
requireCurrentConsent(assertion.consentRecordId);  
requireSameEvent(assertion.scope, input.scope);  
}  
// The signed-in operator chooses ADMIT, REFER or DENY. A candidate
assertion never calls this itself.  
return executeReturnDecision(ctx, input);  
}

## A6. Bounded outbox state

type PendingCommand = Readonly\<{ operationId: UUID; encryptedPayload:
Uint8Array;  
createdAt: Instant; expiresAt: Instant; attemptCount: number; state:
"PENDING"\|"SUBMITTING"\|"REJECTED"\|"QUARANTINED" }\>;  
// Enforce maximum bytes, maximum items, permitted command types and
explicit operator-visible state.  
// Browser background sync may improve delivery but must never be the
guarantee of delivery.

## A7. Reconciliation result

type ReconciliationDisposition =  
\| { kind: "APPLIED"; cloudVersion: number }  
\| { kind: "DUPLICATE_IDENTICAL"; cloudVersion: number }  
\| { kind: "QUARANTINED"; conflict:
"DIVERGENT_DUPLICATE"\|"DEPENDENCY_MISSING"\|"VERSION_CONFLICT"\|"INVALID_AUTHORITY"\|"SCHEMA_OR_POLICY_MISMATCH"\|"TAMPER_SUSPECT"
};  
// There is intentionally no LAST_WRITE_WINS disposition.

# Appendix B — Required file-level completion report

At the end of every R prompt, Cursor must return this report and stop.

- Prompt ID and authorised scope

- Repository baseline and pre-existing failures

- Files inspected and reason

- Files added/changed and reason

- Schema/migration and containment or rollback

- API and permission changes

- Frontend routes/components and all implemented states

- Offline/failure behaviour proved

- Tests added, exact commands and results

- Browser evidence and screenshots where relevant

- Security/privacy/accessibility review

- Traceability, ledgers and documentation updated

- Residual risks, blockers and external authority required

- Commit hash and clean/dirty worktree statement

- Explicit statement: next prompt not started

# Appendix C — Prohibited Cursor shortcuts

- Do not replace real persistence with in-memory maps or browser
  localStorage.

- Do not add TODO, placeholder, mock-only, happy-path-only or disabled
  test and call the prompt complete.

- Do not trust organisationId, eventId, role, deviceId or package
  revision supplied only by the client.

- Do not create parallel duplicate domain types instead of using the
  canonical contract.

- Do not introduce external CDNs or runtime internet dependencies into
  core surfaces.

- Do not resolve an ambiguous guest search automatically.

- Do not let a QR scan, kiosk or FaceGate assertion create attendance
  without the authorised human workflow.

- Do not implement automatic failover unless fencing/quorum prevents
  split brain and tests prove it.

- Do not use last-write-wins for consequential reconciliation.

- Do not weaken tests, lint, type safety, CSP, authentication or tenancy
  to make a build pass.

- Do not invent legal approval, venue evidence, biometric authority,
  independent acceptance or CEO release.

# Appendix D — Definition of done

A prompt is complete only when its observable production behaviour,
security boundary, data change, user surface, degraded behaviour, tests,
evidence, documentation and commit all satisfy the prompt. “Implemented
but untested”, “backend only”, “UI shell”, “works online”, “requires
later hardening” and “will be connected in a future slice” are failures
unless the prompt expressly states that result.
