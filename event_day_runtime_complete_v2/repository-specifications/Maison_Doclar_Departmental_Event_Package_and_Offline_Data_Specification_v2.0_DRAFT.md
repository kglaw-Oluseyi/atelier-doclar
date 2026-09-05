**MAISON DOCLAR**

Departmental Event Package and Offline Data Specification

Complete event-scoped projections, activation gates and departmental
operating sufficiency

MD-OS-EDP-002 \| Version 1.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Document authority

This specification defines the complete logical event package supplied
by the cloud Event OS to the local event cell. It is a data contract and
release process, not a convenient database dump. Every included record
must be needed for the current event, attributable to a source revision,
access-controlled, hash-verified and reconcilable.

# 1. Package design laws

- The package is scoped to exactly one organisation and one event.

- The package contains departmental projections, not the cloud database.

- Every projection has a schema, source revision, owner, classification,
  permitted roles, mutation rules and missing-data behaviour.

- Required projections block activation if absent, corrupt, stale or
  incompatible.

- Secrets, general marketing history, unrelated events and unnecessary
  personal data are excluded.

- The package is frozen, hashed and signed; import is atomic and
  produces a comparison report.

- A replacement package cannot silently overwrite local event-day work.

# 2. Package envelope and manifest

| **Object**             | **Mandatory content**                                                                            |
|------------------------|--------------------------------------------------------------------------------------------------|
| Identity               | packageId, organisationId, eventId, venueId, timezone, packageRevision, cloud source revision    |
| Validity               | createdAt, frozenAt, effectiveAt, expiresAt, minimum runtime version                             |
| Integrity              | per-file SHA-256, root hash, signing key ID, algorithm, detached signature                       |
| Capabilities           | enabled and disabled event features, dependency declarations and fallback mode                   |
| Projection descriptors | department, schema version, record count, classification, required flag, permitted roles/actions |
| Policy set             | check-in, access, privacy, biometric, retention, safeguarding, incident and exception versions   |
| People/devices         | event-scoped users, roles, certifications, posts, device profiles and revocations                |
| Import report          | expected/actual counts, hash results, warnings, disabled capabilities and activation blockers    |

# 3. Departmental projection catalogue

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Code / owner</strong></th>
<th><strong>Contents</strong></th>
<th><strong>Missing behaviour</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>COMMAND<br />
Event Director</td>
<td>Event profile; host intent; outcomes; command structure; decision
rights; master run; critical moments; risk posture; escalation tree;
contingency states; readiness gates</td>
<td>Block activation</td>
</tr>
<tr class="even">
<td>REGISTRATION<br />
Registration Lead</td>
<td>Guest ID; invitation/eligibility; household; companion policy;
invitation/QR token; attendance baseline; check-in exceptions;
credential entitlement</td>
<td>Block initial check-in</td>
</tr>
<tr class="odd">
<td>GUEST_RELATIONS<br />
Guest Relations Lead</td>
<td>Operational preferences; relationship owner; service notes; approved
history needed for this event; contact channel restrictions</td>
<td>Disable personalised service; escalate</td>
</tr>
<tr class="even">
<td>PROTOCOL<br />
Protocol Lead</td>
<td>Verified title/name; precedence; greeting; escort; introductions;
arrival treatment; cultural/protocol source and expiry</td>
<td>Disable unverified treatment or block critical moment</td>
</tr>
<tr class="odd">
<td>SEATING<br />
Seating Lead</td>
<td>Tables, seats, zones, capacity, households, adjacency/separation
constraints, reserved seats, authorised movement rules</td>
<td>Block seating workflow</td>
</tr>
<tr class="even">
<td>ACCESS_SECURITY<br />
Security Lead</td>
<td>Credential status; permitted zones/times; entry/exit state;
restrictions; revocations; safeguarding referral code; security
posts</td>
<td>Block access decisions</td>
</tr>
<tr class="odd">
<td>USHERING<br />
Ushering Lead</td>
<td>Posts; zones; routes; table coverage; call-button/pager map; request
categories; relief plan; handover; escalation</td>
<td>Degraded only with approved paper plan</td>
</tr>
<tr class="even">
<td>FNB<br />
F&amp;B Lead</td>
<td>Service zones; menus/entitlements; allergies/dietary flags; table
plan; timings; supplier/escalation contacts</td>
<td>Disable affected service or block where safety critical</td>
</tr>
<tr class="odd">
<td>TRANSPORT<br />
Transport Lead</td>
<td>Vehicles; drivers; passengers; pickup windows; routes; staging;
contact; exceptions and incidents</td>
<td>Disable transport surface</td>
</tr>
<tr class="even">
<td>ACCOMMODATION<br />
Hospitality Lead</td>
<td>Only necessary booking references; hotel/room operational reference;
arrivals/departures; hospitality contact</td>
<td>Disable accommodation surface</td>
</tr>
<tr class="odd">
<td>PRODUCTION<br />
Production Lead</td>
<td>Run of show; cues; rooms/stages; dependencies; technical contacts;
fallback cues; critical timing</td>
<td>Block critical cue readiness</td>
</tr>
<tr class="even">
<td>SUPPLIERS<br />
Supplier Lead</td>
<td>Approved supplier; responsibilities; arrival/access windows;
readiness; contacts; outstanding evidence</td>
<td>Degraded or block affected dependency</td>
</tr>
<tr class="odd">
<td>STAFFING<br />
Workforce Lead</td>
<td>Staff identity; role; post; supervisor; shift; certification;
briefing; restrictions; device allocation</td>
<td>Block unqualified deployment</td>
</tr>
<tr class="even">
<td>SAFETY_MEDICAL<br />
Safety Lead</td>
<td>Emergency plan; contacts; routes; assembly/medical points; minimally
necessary welfare flags; response authority</td>
<td>Block activation</td>
</tr>
<tr class="odd">
<td>ACCESSIBILITY<br />
Accessibility Lead</td>
<td>Assistance request; route/seating/communication implication;
assigned staff; privacy-minimised instructions</td>
<td>Block affected guest journey</td>
</tr>
<tr class="even">
<td>INCIDENT_RECOVERY<br />
Event Director</td>
<td>Severity model; incident categories; playbooks; service-recovery
authority/options; evidence and notification rules</td>
<td>Block command readiness</td>
</tr>
<tr class="odd">
<td>COMMUNICATIONS<br />
Communications Lead</td>
<td>Offline directory; call signs; radio groups; approved templates;
recipients; authority and fallback</td>
<td>Degraded with radio/paper approval</td>
</tr>
<tr class="even">
<td>FINANCE_APPROVALS<br />
Finance/CEO</td>
<td>Operational limits; approved exception authorities; deposit/payment
status only where admission/service depends on it</td>
<td>Refer; never expose full finance ledger</td>
</tr>
<tr class="odd">
<td>FACEGATE<br />
Privacy Steward</td>
<td>Feature disabled by default; eligible post-check-in enrolments;
consent/revocation references; policy; template reference; assertion
issuers</td>
<td>Disable FaceGate; manual return remains</td>
</tr>
<tr class="even">
<td>SYSTEM_ADMIN<br />
Edge Systems Lead</td>
<td>Users; roles; devices; certificates; revocations; configuration;
thresholds; retention; schemas; trusted keys</td>
<td>Block activation</td>
</tr>
</tbody>
</table>

# 4. Departmental sufficiency rule

A heading match is not evidence of sufficiency. Before release, every
departmental lead reviews a generated package preview showing record
counts, required omissions, access rights, last source change,
unresolved readiness items and the exact offline surfaces that will
consume the projection. The lead signs READY, READY WITH CONDITIONS or
NOT READY; Event Director resolves conditions before activation.

# 5. Cross-department relationships

| **Relationship**       | **Required linkage**                                                                                                         |
|------------------------|------------------------------------------------------------------------------------------------------------------------------|
| Guest journey          | Guest → household/companions → protocol/accessibility → arrival → attendance → seating → service requests → departure/return |
| Staff command          | Staff → competency/certification → role → shift → post → supervisor → device → permissions                                   |
| Operational dependency | Critical moment → department owner → supplier/staff/venue dependencies → readiness evidence → fallback                       |
| Access decision        | Guest → initial attendance → credential/access policy → current restriction/revocation → authorised operator                 |
| Service response       | Request → source/table/guest → category/severity → assigned department/person → acknowledgement → resolution/evidence        |
| Incident               | Observation → severity → commander → actions → notifications → guest/service recovery → closure/review                       |

# 6. Data minimisation and field control

- Store a stable operational ID and only display information a role
  needs.

- Phone lookup should use a normalised number and may display only a
  masked value or suffix to most roles.

- Sensitive welfare, security and protocol details use coded flags with
  role-gated reveal.

- Do not include raw biometric images or templates in general
  projections or the ledger.

- Do not use marketing consent as event-entry authority or vice versa.

- Every field has classification, purpose, source, retention and
  reconciliation treatment in the data dictionary.

# 7. Package build pipeline

1.  Create a consistent cloud read snapshot.

2.  Build each projection through an allow-listed mapper.

3.  Validate schema, referential integrity, business rules and
    departmental completeness.

4.  Generate derived search indexes, route maps and device
    configurations deterministically.

5.  Run privacy minimisation and prohibited-field scans.

6.  Present departmental previews and capture sign-offs.

7.  Freeze package revision and capability set.

8.  Generate manifest, counts and hashes; sign through approved key
    service.

9.  Transfer over authenticated channel or controlled encrypted media.

10. Import to staging; verify identity, signature, hashes, schema,
    expiry and counts.

11. Run offline smoke suite and operator/device reconciliation.

12. Event Director arms and activates the package.

# 8. Search indexes included

| **Index**         | **Rules**                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------|
| QR/invitation     | Opaque event-scoped token; never personal data in the QR payload                           |
| Name              | Normalised exact and cautious fuzzy tokens; preserve canonical display and diacritics      |
| Phone             | Normalised full value restricted; suffix search for authorised roles; rate limit and audit |
| Household/group   | Group membership and companion policy; no silent bulk check-in                             |
| Table/seat        | Bidirectional guest ↔ place index with current version                                     |
| Vehicle/hotel     | Only when operationally required and role-authorised                                       |
| Credential/access | Opaque credential token to current event access record                                     |

# 9. Local mutations by department

| **Class**         | **Examples**                                                  | **Reconciliation**                          |
|-------------------|---------------------------------------------------------------|---------------------------------------------|
| Attendance/access | Initial check-in, exit, return, referral, authorised override | Strict versions; no last-write-wins         |
| Seating           | Seat/table reassignment                                       | Constraint validation; conflict review      |
| Requests          | Create, acknowledge, assign, transfer, resolve, reopen        | Append history; idempotent operations       |
| Staffing          | Check-on-post, relief, reassignment                           | Certification and authority enforced        |
| Incidents         | Open, severity, action, handover, close                       | Immutable incident chronology               |
| Readiness         | Evidence, exception, approval, state                          | Authority and effective-time checks         |
| Consent           | Affirm, decline, revoke                                       | Separate purpose/version; deletion workflow |
| Corrections       | Compensating command with reason                              | Never edit accepted ledger entries          |

# 10. Change after package freeze

A cloud change after freeze becomes a controlled delta proposal. Before
activation it may generate a fully replacement signed package. During
ACTIVE state, only an allow-listed signed delta type may be considered,
and only when the local runtime proves base revision, dependencies, no
incompatible local mutations and authorised acceptance. Otherwise the
change is entered locally through an authorised event-day command and
later reconciled.

# 11. Import and activation acceptance

- All mandatory projections present and hash-valid

- All foreign references resolve or appear in an approved exception list

- Departmental sign-offs current

- No user/device whose role or certificate has expired

- All UI routes and search indexes can be served with WAN removed

- Counts match preview and manifest

- Policy/schema/runtime compatibility passes

- FaceGate stays disabled unless its separate gates pass

- Paper extracts and custody controls created

- Activation record includes Event Director, device and time

# Appendix A — Required data dictionary columns

| **Column group** | **Columns**                                                                    |
|------------------|--------------------------------------------------------------------------------|
| Identity         | projection, entity, field, stable identifier                                   |
| Meaning          | definition, allowed values, null meaning, example                              |
| Governance       | owner, source system, purpose, classification, lawful/policy basis             |
| Access           | read roles, write command, masking, export permission                          |
| Lifecycle        | package required flag, default, validation, versioning, retention, deletion    |
| Runtime          | surface consumers, offline index, missing/stale behaviour, reconciliation rule |
| Traceability     | doctrine ID, API/schema reference, test IDs, change ticket                     |

# Ratification

| **Decision**                  | **Name / signature / date** |
|-------------------------------|-----------------------------|
| Package laws approved         |                             |
| Department catalogue approved |                             |
| Department leads consulted    |                             |
| Data minimisation approved    |                             |
| CEO ratification              |                             |
