# EOS-S06 — Seating Allocation

## CEO Ratification Overlay and Fixed Product Decisions — V2

**Status:** DRAFT FOR CEO RATIFICATION — NOT IMPLEMENTATION AUTHORITY  
**Required repository baseline:** `75a894dedb6713ba2f3f4dce29e8372fa4160384`  
**Supersedes if ratified:** `EOS_S06_RATIFICATION_OVERLAY_AND_DECISIONS.md`  
**Companion authority:** `MD_PR_S070_V2_EOS_S06_SEATING_ALLOCATION_EXECUTABLE_IMPLEMENTATION_PACK.md`  
**Normative annex:** `EOS_S06_V2_TECHNICAL_CONTRACT_AND_ACCEPTANCE_ANNEX.md`

## 1. Why V2 exists

The first overlay and S070 draft correctly described the desired outcome and safety boundaries, but delegated too many implementation decisions to Cursor. V2 removes that discretion. It fixes the domain model, persistence model, solver strategy, commands, role boundaries, UI information architecture, publication semantics, evaluation register and live journeys before implementation begins.

The historical Slice 6 specification remains requirements evidence. The historical 17-prompt Cursor pack and both V1 drafts are not execution authority.

## 2. Fixed outcome

Event OS will provide an event-scoped Seating Command workspace that transforms governed guest eligibility, current RSVP truth, the current published spatial layout, approved Event Brief facts and current Protection constraints into an explainable seating plan.

The system must support feasibility assessment, deterministic allocation, explicit unseated outcomes, alternatives, reservation blocks, manual edits, specialist review, independent operational approval, immutable publication and permission-safe downstream consumption.

It must never mutate upstream truth, infer protected traits, silently relax hard constraints, contact guests, issue credentials, check guests in, book or pay vendors, or claim an external action occurred.

## 3. Fixed architecture decisions

### D1 — Persistence

All new S06 truth is stored in normalized Postgres tables from the first production-capable implementation. Production commands use bounded repositories and one database transaction per material command. Platform-wide snapshot mutation is prohibited. JSONB may appear only inside typed columns for bounded payloads such as coded predicates or metrics; it is not a substitute for entity tables.

### D2 — Identity and upstream truth

S06 consumes existing canonical organisation, client, event, person, assignment and event-guest identities. It creates no second identity or guest ledger. Household, party and invitation records are context—not guest identity. Attendance forecasts are not RSVP truth.

### D3 — Spatial contract

S05 owns geometry, table identity, zones and capacity. S06 binds only to a CURRENT S05 publication. It cannot modify layout records. Where explicit seat anchors do not exist, S06 generates deterministic logical positions `tableId:ordinal`, without coordinates and without implying that the layout contains drawn chairs.

### D4 — Solver implementation

The first implementation is a deterministic TypeScript constraint engine inside the shared platform package, behind `SeatingSolverV1`. It uses deterministic constraint propagation plus bounded branch-and-bound allocation with stable ordering. It is not generative AI and has no network, database or filesystem access.

Cursor may use an established, license-compatible local optimisation library only if a pre-code spike proves that the pure TypeScript engine cannot meet the fixed 600-guest performance gate. Adding a native runtime, Python process, new Railway service, external API, paid provider or secret is a hard stop requiring new CEO authority.

### D5 — Objective order

Objectives are lexicographic and fixed:

1. zero hard-rule violations;
2. maximize eligible seated guests;
3. satisfy exact/minimum reservation commitments;
4. satisfy protocol, accessibility and safety priorities in that order when equally hard-authorised;
5. minimize weighted preference cost;
6. minimize disruption from the current publication;
7. deterministic tie-break by opaque guest token then position token.

No lower objective may trade away a higher objective. A capacity or rule impossibility returns `INFEASIBLE` and/or explicit `UNSEATED` records.

### D6 — Sensitive data

Names and staff-facing labels stay in a projection layer outside the solver. Solver tokens are event-specific and non-correlatable across events. Free text is never a solver predicate. Protected characteristics are never inferred. An explicit accessibility/safety need may be encoded only as a purpose-bound capability code with source evidence, authorised classification and restricted projection.

### D7 — Authority separation

Capabilities attach to existing assignments. The synthetic default journey is:

1. Planner/Seating Lead prepares, runs and edits;
2. assigned specialist reviewers decide only implicated protocol/accessibility/security reviews;
3. Event Director independently approves the exact plan hash;
4. CEO independently publishes the approved hash.

The publisher must be distinct from both material author and final operational approver. Auditor is read-only. System Administrator has no operational seating authority.

### D8 — Draft and publication

Working editions and publications are independent. Creating or editing a draft never changes the CURRENT publication. Failed approval or publication never removes the last-known-good publication. Identical publication replays the same publication identity, number, hash and timestamp with `didDataChange:false`.

### D9 — User experience

The canonical route is `/app/events/[eventId]/seating` with Overview, Inputs, Rules, Reservations, Runs, Studio, Review and Publication tabs. Desktop, tablet, 360px mobile, 200% zoom, reduced motion and keyboard-only workflows are designed in the same implementation as backend commands.

The primary interface uses human labels; IDs and hashes are secondary provenance. Each screen states current truth, unknowns, blockers, authority, next action and consequences. Dragging always has an equivalent form/keyboard command.

### D10 — Verification role switching

A `Verify as` control may exist only when `productionAuthorised:false`, the fixture identity adapter is active and an explicit non-secret verification flag is enabled. It switches only among allowlisted synthetic assignments, creates a fresh signed session, records an audit event, accepts no arbitrary ID and disappears under production authorisation. It is not real-user impersonation.

### D11 — Evaluation

Cursor implements an observation-derived, persisted, fail-closed `s06-eval-v1` corpus with the cases enumerated in the annex. Tests cannot set their own pass result. Mutation controls must prove detection of silent hard-rule relaxation, identity leakage, fabricated assignments, auto-approval, cross-event leakage, overwritten publication and false success.

### D12 — Independent boundary

Cursor may implement, test, deploy Event OS and run the visible synthetic corpus. Cursor may not create or inspect the sealed holdout, run Claude, accept EOS-S06 or start EOS-S07. Code/config/corpus changes after freeze invalidate any independent result.

## 4. Execution model

MD-PR-S070 V2 is one continuous authority with internal phase gates. Cursor commits coherent phases and continues without routine human pauses. It stops only for a defined hard stop or after the complete final report.

No phase may be declared complete from file presence alone. Each phase requires executable domain evidence, UI evidence where relevant, persistence after reload and the named regression gates.

## 5. V1 cleanup

During the initial documentation placement commit, Cursor must:

1. locate the two exact unratified V1 files;
2. verify they are the V1 drafts;
3. delete only those files from the working tree;
4. place V2 and its annex unchanged under `docs/control/eos-s06/`;
5. record that Git history retains V1 but V1 is superseded and non-authoritative;
6. make no application change until baseline and ratification are verified.

## 6. Ratification wording

> I RATIFY EOS-S06 V2 OVERLAY D1–D12, THE EOS-S06 V2 TECHNICAL CONTRACT AND ACCEPTANCE ANNEX, AND MD-PR-S070 V2 AS THE SOLE IMPLEMENTATION AUTHORITY FROM BASELINE `75a894dedb6713ba2f3f4dce29e8372fa4160384`. CURSOR MAY EXECUTE ITS PHASES CONTINUOUSLY, SUBJECT TO ITS HARD STOPS. THIS DOES NOT ACCEPT EOS-S06, AUTHORISE REAL DATA OR PRODUCTION OPERATIONS, RUN CLAUDE, OR START EOS-S07.

