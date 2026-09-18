# EOS-S01 executable contract

Template: EOS_SLICE_BUILD_MASTER_TEMPLATE_v1.0
Template tag: eos-slice-build-template-v1.0
Template checksum: 650eb15c09611823bdc865273d1ab53551b581b6aa90eb9a76472062fea271e4
Instantiation date: 2026-09-18
S01-specific additions: eight-role policy S01-DEC-ACCESS-001, department and workstream domain, Master Event File slots, maker/checker self-completion for an organisation-wide CEO.
Confirmation: no master control was removed. Guest operations and consent records remain excluded by Slice 1 §2.2, not by a later narrowing.

## S01-OBJ

- S01-OBJ-001 Represent more than one client without mixing data.
- S01-OBJ-002 Give every operational screen a reliable organisation and event context.
- S01-OBJ-003 Give each person only the access of an active scoped assignment.
- S01-OBJ-004 Keep CEO reserved authority, including maker/checker self-completion, and exclude impersonation.
- S01-OBJ-005 Record every sensitive change in an append-only audit.
- S01-OBJ-006 Provide a responsive Command Atelier operating environment.
- S01-OBJ-007 Keep productionAuthorised false and use synthetic data only.

## S01-ACT

- S01-ACT-001 CEO
- S01-ACT-002 Event Director
- S01-ACT-003 Planner
- S01-ACT-004 Client Lead
- S01-ACT-005 Department Lead
- S01-ACT-006 System Administrator
- S01-ACT-007 Read-only Auditor
- S01-ACT-008 Risk Governance Reviewer
- S01-ACT-009 Unassigned authenticated staff
- S01-ACT-010 Anonymous caller of the health probes

## S01-CAP

### S01-CAP-001 — Sign in with a synthetic staff identity

1. Capability name: Sign in with a synthetic staff identity
2. Authoritative source citation: Slice 1 §6.4 and §10.1; CEO packet synthetic data
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /sign-in.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: auth.signed_in
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /sign-in
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-002 — Show organisation identity provider unavailable

1. Capability name: Show organisation identity provider unavailable
2. Authoritative source citation: Slice 1 §6.1 and §6.4
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /auth/oidc.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — no session is created
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /auth/oidc
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-003 — Reject an unverified identity callback

1. Capability name: Reject an unverified identity callback
2. Authoritative source citation: Slice 1 §6.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /auth/callback.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — callback does not establish a session
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /auth/callback
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-004 — Sign out and revoke the server session

1. Capability name: Sign out and revoke the server session
2. Authoritative source citation: Slice 1 §6.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Authenticated staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses User menu.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: auth.signed_out
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: User menu
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-005 — Show access pending when no assignment is active

1. Capability name: Show access pending when no assignment is active
2. Authoritative source citation: Slice 1 §10.15
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Unassigned staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /access-pending.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — no business mutation
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /access-pending
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-004
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-006 — Show a safe denial for a suspended identity

1. Capability name: Show a safe denial for a suspended identity
2. Authoritative source citation: Slice 1 §6.4 and S1-A10
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Suspended staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /access-denied.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: auth denial where a session exists
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /access-denied
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-004
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-005
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-007 — View the organisation home

1. Capability name: View the organisation home
2. Authoritative source citation: Slice 1 §10.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Assigned staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-008
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-008 — List clients in scope

1. Capability name: List clients in scope
2. Authoritative source citation: Slice 1 §10.3
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with client.list
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/clients.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/clients
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-007
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-009 — Search and filter clients

1. Capability name: Search and filter clients
2. Authoritative source citation: Slice 1 §10.3
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with client.list
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Client filters.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Client filters
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-007
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-010 — Create a client

1. Capability name: Create a client
2. Authoritative source citation: Slice 1 §10.4 and §12.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or Event Director
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Create client.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: client.created
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Create client
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-011 — View one client

1. Capability name: View one client
2. Authoritative source citation: Slice 1 §10.5
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Scoped client roles
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Client overview.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Client overview
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-012 — Correct a client

1. Capability name: Correct a client
2. Authoritative source citation: Slice 1 §10.4
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with client.update
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Edit client.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: client.updated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Edit client
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-008
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-013 — Archive a client

1. Capability name: Archive a client
2. Authoritative source citation: Slice 1 §5.3 and client.archive
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Archive form.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: client.archived
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Archive form
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-014 — Restore an archived client

1. Capability name: Restore an archived client
2. Authoritative source citation: Slice 1 soft archive; discovery floor restoration
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Restore form.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: client.restored
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Restore form
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-015 — Create an event programme

1. Capability name: Create an event programme
2. Authoritative source citation: Slice 1 §2.1 and §5
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or Event Director
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Client overview.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: programme.created
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Client overview
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-016 — List and filter events

1. Capability name: List and filter events
2. Authoritative source citation: Slice 1 §10.6
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Assigned roles
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/events.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/events
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-006
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-017 — Create an event and its Master Event File

1. Capability name: Create an event and its Master Event File
2. Authoritative source citation: Slice 1 §10.7; foundation architecture MEF
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO, Event Director or Planner
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Create event.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: event.created
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Create event
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-018 — View an event and its phase history

1. Capability name: View an event and its phase history
2. Authoritative source citation: Slice 1 §10.8
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Assigned event roles
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Event overview.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Event overview
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-019 — Edit event facts

1. Capability name: Edit event facts
2. Authoritative source citation: Slice 1 §10.9
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with event.update
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Event settings.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: event.updated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Event settings
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-020 — Transition an enabled phase

1. Capability name: Transition an enabled phase
2. Authoritative source citation: Slice 1 §5.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Event Director, Planner within limits, CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Phase controls.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: event.phase_transition
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Phase controls
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-021 — Block Ready and Live

1. Capability name: Block Ready and Live
2. Authoritative source citation: Slice 1 §5.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Any actor
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Disabled phase control.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: event.phase_transition DENIED
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Disabled phase control
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-022 — Switch event context

1. Capability name: Switch event context
2. Authoritative source citation: Slice 1 §10.10 and S1-A19
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Assigned staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Event list.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — navigation
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Event list
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-008
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-006
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-023 — View the Master Event File

1. Capability name: View the Master Event File
2. Authoritative source citation: Foundation architecture Master Event File
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with mef.view
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses MEF page.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: MEF page
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-024 — Update a Master Event File slot as a person

1. Capability name: Update a Master Event File slot as a person
2. Authoritative source citation: Foundation architecture human authority
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or Event Director
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Slot form.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: mef.slot_updated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Slot form
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-010
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-002
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-025 — Create and deactivate a department

1. Capability name: Create and deactivate a department
2. Authoritative source citation: CEO addendum department domain
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/admin/departments.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: department.created or department.updated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/admin/departments
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-009
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-026 — Create an event workstream

1. Capability name: Create an event workstream
2. Authoritative source citation: CEO addendum workstream lineage
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or Event Director
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Workstreams page.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: workstream.created
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Workstreams page
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-009
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-027 — Operate an assigned workstream

1. Capability name: Operate an assigned workstream
2. Authoritative source citation: CEO addendum Department Lead
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Department Lead in scope
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Workstream note.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: workstream.operated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Workstream note
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-009
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-028 — Invite staff

1. Capability name: Invite staff
2. Authoritative source citation: Slice 1 §10.12
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or System Administrator
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Access.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: user.invited
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Access
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-004
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-029 — Activate, suspend, reinstate or deactivate staff

1. Capability name: Activate, suspend, reinstate or deactivate staff
2. Authoritative source citation: Slice 1 §8.1
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO or System Administrator
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Directory.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: user.status_changed
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Directory
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-005
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-030 — Grant a scoped assignment

1. Capability name: Grant a scoped assignment
2. Authoritative source citation: Slice 1 §7 and CEO addendum
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO, Event Director or System Administrator within limits
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Grant form.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: assignment.granted
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Grant form
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-005
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-004
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-031 — Suspend or revoke an assignment

1. Capability name: Suspend or revoke an assignment
2. Authoritative source citation: Slice 1 §7.2 and J05
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Authorised grantors
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Access history.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: assignment.suspended or assignment.revoked
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Access history
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-005
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-005
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-032 — Inspect access history

1. Capability name: Inspect access history
2. Authoritative source citation: Slice 1 §10.12
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with assignment.view
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Access history.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Access history
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-004
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-033 — View My Work

1. Capability name: View My Work
2. Authoritative source citation: Slice 1 §10.11
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Assigned staff
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/my-work.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/my-work
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-011
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-003
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-034 — Search and filter audit

1. Capability name: Search and filter audit
2. Authoritative source citation: Slice 1 §8.3
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with audit.view
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/admin/audit.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/admin/audit
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-006
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-035 — Request an audit export

1. Capability name: Request an audit export
2. Authoritative source citation: Slice 1 §8.3; Planner may request
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO, Event Director or Planner
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Request export.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: audit.export_requested
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Request export
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-006
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-003
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-036 — Settle an audit export

1. Capability name: Settle an audit export
2. Authoritative source citation: CEO addendum Planner cannot settle
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Settle export.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: audit.export_settled
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Settle export
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-006
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-037 — Submit a maker/checker request

1. Capability name: Submit a maker/checker request
2. Authoritative source citation: Slice 1 §7 approval scaffold; CEO addendum
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO, Event Director, Planner or Reviewer
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Approvals.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: approval.submitted
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Approvals
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-005
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-010
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-038 — Decide a maker/checker request, including CEO self-completion

1. Capability name: Decide a maker/checker request, including CEO self-completion
2. Authoritative source citation: CEO addendum S01-DEC-ACCESS-001
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO, or Reviewer for another person's governance rule
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses Approvals.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: approval.decided
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: Approvals
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-005
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-010
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-039 — View system health and release

1. Capability name: View system health and release
2. Authoritative source citation: Slice 1 §10.14 and S1-A24
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Roles with system.health.view
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /app/admin/system.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — read
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /app/admin/system
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-012
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-004
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-040 — Answer liveness and readiness

1. Capability name: Answer liveness and readiness
2. Authoritative source citation: Slice 1 §12.2
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Public minimal probe
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /api/health/live and /api/health/ready.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — probe
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /api/health/live and /api/health/ready
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-012
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-011
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-041 — Refuse a direct API call without a session

1. Capability name: Refuse a direct API call without a session
2. Authoritative source citation: Slice 1 S1-A09
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: Anonymous caller
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses /api/clients and /api/me.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: NOT APPLICABLE — no mutation
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: /api/clients and /api/me
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-005
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-007
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

### S01-CAP-042 — Update organisation identity

1. Capability name: Update organisation identity
2. Authoritative source citation: Slice 1 organisation.manage
3. Business purpose: Deliver this outcome without narrowing the Slice 1 foundation.
4. Permitted actor or system: CEO
5. Required scope: Organisation, and client, event, department or workstream lineage where the permission registry requires it.
6. Preconditions: Active membership unless the capability is public; productionAuthorised remains false; synthetic data only.
7. Trigger: The person uses System page.
8. User input: The fields shown on that surface, or no input for a probe.
9. Validation: Zod is not the only gate. Server checks required reason, dates, timezone, lineage, role and version.
10. Happy path: The action completes and the resulting record is readable in the same session.
11. Alternative paths: Validation returns the person to the form with the message. A disabled Ready or Live control explains that the capability is not yet enabled.
12. Prohibited paths: Cross-organisation access, bare role checks, Auditor mutation, System Administrator business approval, Department Lead outside the assigned workstream, and support.impersonate.
13. Resulting state: The permitted record changes, or the screen explains why it did not.
14. Persisted records: PostgreSQL schema eos_s01 only.
15. Audit event: organisation.updated
16. Idempotency behaviour: Create, phase transition and assignment grant accept an idempotency key. Repeating the same key and payload returns the original result.
17. Concurrency behaviour: Editable records require the displayed version. A stale write returns VERSION_CONFLICT and does not overwrite.
18. UI surface: System page
19. Server entry point: Server action in apps/event-os/src/server/actions.ts and, where listed, the matching route under apps/event-os/src/app/api.
20. Authorization rule: authorize() in packages/foundation/src/policy.ts using PERMISSION_REGISTRY. Denial does not mutate the business record.
21. Error behaviour: Stable codes from Slice 1 §12.3. Cross-scope reads are Not found.
22. Loading behaviour: app/loading.tsx keeps a stable skeleton.
23. Empty-state behaviour: Lists explain why they are empty and show the authorised next action.
24. Accessibility requirements: Labelled controls, visible focus, button names, status not by colour alone, and no serious axe violation on the sign-in and client journeys.
25. Responsive requirements: Usable at 390px, tablet, desktop and wide desktop without horizontal page overflow.
26. Linked data requirements: S01-DATA-001 through S01-DATA-016.
27. Linked build units: S01-BLD-009
28. Linked automated tests: packages/foundation/test/foundation.integration.test.ts and packages/foundation/test/access-boundaries.test.ts
29. Linked browser journey: S01-JRN-001
30. Linked acceptance criteria: S01-ACC-001 through S01-ACC-028 as applicable to this outcome.

## S01-RULE

- S01-RULE-001 Default deny.
- S01-RULE-002 Client code is unique inside one organisation.
- S01-RULE-003 An event cannot reference a client or programme from another organisation.
- S01-RULE-004 Phase edges follow Slice 1 §5.2. Ready and Live are disabled.
- S01-RULE-005 Archived clients and events are read only until restored by the CEO.
- S01-RULE-006 CEO assignments must be organisation-wide.
- S01-RULE-007 Department Lead assignments require organisation, event, department and workstream, all active and in lineage.
- S01-RULE-008 System Administrator cannot grant CEO, Event Director or System Administrator.
- S01-RULE-009 Auditor receives no mutation permission even if a future grant is inserted.
- S01-RULE-010 A person other than an organisation-wide CEO cannot decide their own maker/checker request.
- S01-RULE-011 support.impersonate is denied to every role.

## S01-DATA

- S01-DATA-001 organisations
- S01-DATA-002 memberships
- S01-DATA-003 users
- S01-DATA-004 clients
- S01-DATA-005 event_programmes
- S01-DATA-006 events
- S01-DATA-007 event_phase_history
- S01-DATA-008 master_event_files and mef_slots
- S01-DATA-009 departments
- S01-DATA-010 workstreams
- S01-DATA-011 roles, permissions and role_permissions
- S01-DATA-012 assignments
- S01-DATA-013 approval_policies and approval_requests
- S01-DATA-014 sessions
- S01-DATA-015 audit_events append-only
- S01-DATA-016 idempotency_records, audit_exports and rate_limits

## S01-PERM

Every key in PERMISSION_REGISTRY is S01-PERM-001. S01-PERM-002 is the eight-role evaluation in policy.ts. S01-PERM-003 is the Department Lead lineage rule. S01-PERM-004 is CEO self-completion. S01-PERM-005 is the impersonation denial.

## S01-AUD

- S01-AUD-001 Authentication, client, event, phase, assignment, approval, export and department mutations write audit in the same transaction as the successful change.
- S01-AUD-002 Denial of a consequential action writes DENIED and does not commit the business change.
- S01-AUD-003 Audit rows cannot be updated or deleted.
- S01-AUD-004 Metadata is redacted and size-limited.

## S01-UI

- S01-UI-001 Command Atelier shell, onyx navigation, ivory workspace, champagne accent.
- S01-UI-002 Routes listed in Slice 1 §9.2 plus departments, approvals, Master Event File and workstreams.
- S01-UI-003 Loading, empty, denied, error, conflict, archived and success states.
- S01-UI-004 390px, tablet, desktop and wide desktop. Minimum 44px targets. Pointer cursor on controls.

## S01-API

- S01-API-001 GET /api/health/live
- S01-API-002 GET /api/health/ready
- S01-API-003 GET /api/me
- S01-API-004 GET and POST /api/clients
- S01-API-005 Server actions in apps/event-os/src/server/actions.ts for every mutation above.

## S01-INT

- S01-INT-001 OIDC boundary. Without an issuer the person sees provider unavailable. No live provider is enabled.
- S01-INT-002 PostgreSQL schema eos_s01. Legacy public tables are not migrated.

## S01-NFR

- S01-NFR-001 Server authorization is authoritative.
- S01-NFR-002 HttpOnly session cookie, HMAC bound, 30 minute idle and 12 hour absolute lifetime.
- S01-NFR-003 Security headers: frame denial, nosniff, referrer policy.
- S01-NFR-004 productionAuthorised is the constant false.
- S01-NFR-005 No secret in the repository.

## S01-BLD

- S01-BLD-001 Monorepo, strict TypeScript, lockfile.
- S01-BLD-002 SQL migration 001_foundation in schema eos_s01.
- S01-BLD-003 Permission registry and authorize().
- S01-BLD-004 Sessions and synthetic sign-in.
- S01-BLD-005 Assignment and maker/checker services.
- S01-BLD-006 Audit, redaction and export.
- S01-BLD-007 Command Atelier shell. Tokens reconstructed from the approved atelier values, not copied CSS rules.
- S01-BLD-008 Navigation and event context.
- S01-BLD-009 Client and programme experience.
- S01-BLD-010 Event, phase and Master Event File experience.
- S01-BLD-011 Department, workstream, access and My Work.
- S01-BLD-012 Health, readiness and Railway Dockerfile.

## S01-TST

- S01-TST-001 packages/foundation/test/foundation.integration.test.ts
- S01-TST-002 packages/foundation/test/access-boundaries.test.ts
- S01-TST-003 scripts/verify-slice-contract.ts
- S01-TST-004 apps/event-os/e2e/s01-sign-in.spec.ts

## S01-JRN

- S01-JRN-001 CEO signs in, creates a client and event, and inspects audit.
- S01-JRN-002 Event Director edits facts and moves Discover to Design. Ready stays disabled.
- S01-JRN-003 Planner updates permitted facts and cannot settle an export.
- S01-JRN-004 System Administrator invites or maps a user, grants a scoped assignment, views health, and cannot grant CEO.
- S01-JRN-005 Revocation or suspension denies the next protected action.
- S01-JRN-006 Switching events shows the newly selected event and announces it.
- S01-JRN-007 A manipulated client or event id returns Not found.
- S01-JRN-008 Two sessions editing one client: the stale version is rejected.
- S01-JRN-009 Department Lead saves the assigned workstream note and cannot open another organisation's event.
- S01-JRN-010 Organisation-wide CEO submits and approves one archive or governance request.
- S01-JRN-011 Health and readiness respond without secrets.

## S01-ACC

- S01-ACC-001 preserves Slice 1 acceptance S1-A01.
- S01-ACC-002 preserves Slice 1 acceptance S1-A02.
- S01-ACC-003 preserves Slice 1 acceptance S1-A03.
- S01-ACC-004 preserves Slice 1 acceptance S1-A04.
- S01-ACC-005 preserves Slice 1 acceptance S1-A05.
- S01-ACC-006 preserves Slice 1 acceptance S1-A06.
- S01-ACC-007 preserves Slice 1 acceptance S1-A07.
- S01-ACC-008 preserves Slice 1 acceptance S1-A08.
- S01-ACC-009 preserves Slice 1 acceptance S1-A09.
- S01-ACC-010 preserves Slice 1 acceptance S1-A10.
- S01-ACC-011 preserves Slice 1 acceptance S1-A11.
- S01-ACC-012 preserves Slice 1 acceptance S1-A12.
- S01-ACC-013 preserves Slice 1 acceptance S1-A13.
- S01-ACC-014 preserves Slice 1 acceptance S1-A14.
- S01-ACC-015 preserves Slice 1 acceptance S1-A15.
- S01-ACC-016 preserves Slice 1 acceptance S1-A16.
- S01-ACC-017 preserves Slice 1 acceptance S1-A17.
- S01-ACC-018 preserves Slice 1 acceptance S1-A18.
- S01-ACC-019 preserves Slice 1 acceptance S1-A19.
- S01-ACC-020 preserves Slice 1 acceptance S1-A20.
- S01-ACC-021 preserves Slice 1 acceptance S1-A21.
- S01-ACC-022 preserves Slice 1 acceptance S1-A22.
- S01-ACC-023 preserves Slice 1 acceptance S1-A23.
- S01-ACC-024 preserves Slice 1 acceptance S1-A24.
- S01-ACC-025 preserves Slice 1 acceptance S1-A25.
- S01-ACC-026 preserves Slice 1 acceptance S1-A26.
- S01-ACC-027 preserves Slice 1 acceptance S1-A27.
- S01-ACC-028 preserves Slice 1 acceptance S1-A28.

## S01-DEP

- S01-DEP-001 Deploy only the Event OS service in Railway project atelier-doclar, environment production.
- S01-DEP-002 Run eos_s01 migrations. Do not alter legacy public tables.
- S01-DEP-003 Keep productionAuthorised false.
- S01-DEP-004 Do not deploy Control Tower or solver-worker.
- S01-DEP-005 Health check /api/health/live.
- S01-DEP-006 Rollback is the recorded legacy deployment 6bd04814-19f8-4ec3-b625-31c558fbfe5f if this deployment cannot be restored.

## S01-DEC

- S01-DEC-001 SQL migrations replace Prisma. The logical model in Slice 1 §5 remains.
- S01-DEC-002 The application path is apps/event-os rather than apps/web, matching the Railway service.
- S01-DEC-003 Synthetic fixture sign-in is allowed only while productionAuthorised is false and EVENT_OS_ALLOW_FIXTURES=1. This is required by the CEO rebuild packet because the Railway environment is named production but is not authorised for real data.
- S01-DEC-004 Visual tokens reuse the approved Command Atelier values: onyx #11100F, ivory #F5F0E8, champagne #B89A62, functional accent #8B6E38. No legacy CSS rule was copied.
- S01-DEC-ACCESS-001 Eight-role policy from the CEO addendum, including a real Department Lead domain and CEO maker/checker self-completion.

## S01-AMB

No unresolved product ambiguity remains. Guest records and consent are excluded by Slice 1 §2.2. Attention alerts are explicitly not pretended, per §10.11.

Approved S01 technical debt: none. This contract does not defer an included requirement.
