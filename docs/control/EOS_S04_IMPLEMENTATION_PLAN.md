# EOS-S04 Implementation Plan

**Control ID:** `MD-PR-S014`  
**Milestone:** `EOS-S04-RECON`  
**Status:** Plan only — **not authorised to execute**  
**Native coverage:** 62 / 62 (`S4-01`–`S4-62` / `MD-PR-0170`–`MD-PR-0231`)

Do not create 62 micro-commits. Do not collapse the pack into vague buckets. If a later instruction authorises EOS-S04, execute these evidence-derived workstreams inside one governed wrapper, the same way S01–S03 were executed.

Native sequential “one prompt, one commit, stop” remains historical pack law. Programme law after MD-PR-S004–S013 is a single authorised slice wrapper. Workstream grouping is the reconciliation of those two laws.

## Workstream map

| WS | Name | Native IDs | Count |
|----|------|------------|------:|
| WS1 | Entry, contracts, authority | S4-01, S4-02, S4-07 | 3 |
| WS2 | Schema and contact safety | S4-03, S4-04, S4-05, S4-06, S4-08, S4-09, S4-10 | 7 |
| WS3 | Templates and rendering | S4-11, S4-12, S4-13, S4-14, S4-15 | 5 |
| WS4 | Audience | S4-16, S4-17, S4-18, S4-19 | 4 |
| WS5 | Campaign and approval | S4-20, S4-21, S4-22, S4-23, S4-24, S4-25 | 6 |
| WS6 | Outbound execution | S4-26, S4-27, S4-28, S4-29 | 4 |
| WS7 | Adapters and delivery truth | S4-30, S4-31, S4-32, S4-33, S4-34, S4-35 | 6 |
| WS8 | Inbound and concierge | S4-36, S4-37, S4-38, S4-39, S4-40, S4-41, S4-42, S4-43, S4-44 | 9 |
| WS9 | Correction and operator surfaces | S4-45, S4-46, S4-47, S4-48, S4-49, S4-50 | 6 |
| WS10 | Intelligence | S4-51, S4-52 | 2 |
| WS11 | Retention and observability | S4-53, S4-54 | 2 |
| WS12 | Qualification and gates | S4-55, S4-56, S4-57, S4-58, S4-59, S4-60, S4-61, S4-62 | 8 |
| | **Total** | S4-01–S4-62 | **62** |

Unmapped native IDs: **0**.

## WS1 — Entry, contracts, authority

**IDs:** S4-01, S4-02, S4-07  
**Purpose.** Reconnaissance against the accepted tree; freeze communications contracts; extend S01 permissions rather than invent authz.  
**Domain.** ADR + typed contracts + state diagrams; `msg.*` permission keys; separation of duties.  
**Server.** Permission catalogue only. No dispatch.  
**UI.** None.  
**Tests.** Existing gates remain green; contract tests; permission-key exhaustiveness.  
**Persistence.** None yet.  
**Provider.** None.  
**Security risks.** Over-broad `msg.*` grants; hidden-button authz.  
**Exit.** Contracts bind to `PlatformStore` and existing tenancy. Evidence under `docs/control/`, not `docs/slice-4/`.

## WS2 — Schema and contact safety

**IDs:** S4-03, S4-04, S4-05, S4-06, S4-08, S4-09, S4-10  
**Purpose.** Event-safe persistence and the non-bypassable eligibility gate.  
**Domain.** Contact projection, consent extension, suppression, ChannelPolicy, quiet hours, caps, fallback.  
**Server.** Single eligibility service used by every later send path.  
**UI.** None (settings UI is WS9).  
**Tests.** Two-tenant/two-event isolation; consent ≠ RSVP; suppression cannot be bypassed; DST/midnight; no cross-purpose fallback.  
**Persistence.** New PlatformStore collections + ConsentRecord extension. Memory/FileBacked/Postgres **contract** additions. **No Railway. No live migration.**  
**Provider.** Sender allow-list holds sandbox refs only.  
**Security risks.** Parallel ContactPoint master; RLS weakening; guessed country codes.  
**Exit.** No job can be created unless eligibility returns ALLOW with reasons.

## WS3 — Templates and rendering

**IDs:** S4-11, S4-12, S4-13, S4-14, S4-15  
**Purpose.** Governed templates and a safe renderer.  
**Domain.** Template + version + variable registry + content snapshot. Guest-safe occasion variables (HV-EOS-003 hook).  
**Server.** Template APIs with OCC and audit.  
**UI.** Template library/editor/preview (`/communications/templates`).  
**Tests.** Unknown variables rejected; unresolved required facts block send; injection; sensitivity flags; a11y of editor.  
**Persistence.** Template collections.  
**Provider.** None.  
**Security risks.** Template injection; leaking restricted variables; treating MEF doctrine as guest-safe.  
**Exit.** Published versions immutable. Missing required guest-safe facts cannot render for send.

## WS4 — Audience

**IDs:** S4-16, S4-17, S4-18, S4-19  
**Purpose.** Explainable selection and immutable snapshots.  
**Domain.** AudienceDefinition DSL + AudienceSnapshot/Members.  
**Server.** Preview endpoints; snapshot at approval-prepare.  
**UI.** Audience builder.  
**Tests.** No raw SQL; exclusion reasons; pagination; snapshot immutability; seating predicate returns UNKNOWN.  
**Persistence.** Definition + snapshot collections.  
**Provider.** None.  
**Security risks.** Disallowed field exposure in samples; mutating snapshot after approval.  
**Exit.** Approval-time snapshot is the only expansion input.

## WS5 — Campaign and approval

**IDs:** S4-20, S4-21, S4-22, S4-23, S4-24, S4-25  
**Purpose.** Campaign lifecycle, evidence-rich approval, sandbox test-send.  
**Domain.** Campaign, CampaignApproval; SoD via S01 ApprovalPolicy.  
**Server.** Composer + decision APIs; idempotency keys.  
**UI.** Composer + approval inbox.  
**Tests.** Illegal transitions; material edit revokes approval; author cannot self-approve when configured; test-send never uses guest addresses.  
**Persistence.** Campaign + approval collections.  
**Provider.** Test-send uses WS7 fakes only.  
**Security risks.** Approval without snapshot; test-send escape to real addresses.  
**Exit.** No enqueue of guest messages. Test watermark + separate metrics.

## WS6 — Outbound execution

**IDs:** S4-26, S4-27, S4-28, S4-29  
**Purpose.** Durable schedule, outbox, expansion, bounded retry.  
**Domain.** Outbox intents; Message + Attempt; dead-letter.  
**Server.** Workers with leases; deterministic clock. Adapt “same DB transaction” to PlatformStore atomic replace.  
**UI.** None (ops UI in WS7).  
**Tests.** Concurrent claim; lease expiry; no mutable-audience re-query; no retry of permanent/policy failure.  
**Persistence.** Outbox + message + attempt collections.  
**Provider.** Submit port only.  
**Security risks.** Duplicate dispatch; in-process timers as source of truth.  
**Exit.** One idempotency key per logical send. Dispatch flag default off.

## WS7 — Adapters and delivery truth

**IDs:** S4-30, S4-31, S4-32, S4-33, S4-34, S4-35  
**Purpose.** Provider-neutral ports + synthetic adapters + monotonic delivery projection + ops UI.  
**Domain.** ProviderAccount (sandbox), DeliveryEvent, status projection.  
**Server.** Adapter interface; signed synthetic webhooks; no production secrets.  
**UI.** Campaign run + failures.  
**Tests.** Mapping taxonomy; replay/forgery; out-of-order callbacks; no terminal regression; contact masking.  
**Persistence.** Provider sandbox rows + delivery events.  
**Provider impact.** **G:** email/WhatsApp/SMS **channels** exist; vendors unselected. Fakes only.  
**Security risks.** Production credential smuggling; treating click/open as delivered.  
**Exit.** Complete sandbox behaviour without leaving the repository.

## WS8 — Inbound and concierge

**IDs:** S4-36, S4-37, S4-38, S4-39, S4-40, S4-41, S4-42, S4-43, S4-44  
**Purpose.** Two-way concierge: ingest, resolve, own, reply, escalate.  
**Domain.** InboundMessage, ConversationThread, FollowUpTask, Escalation, attachment metadata. Link optional S03 assistance → task.  
**Server.** Inbound pipeline; unmatched actions; reply path with eligibility recheck; SLA engine (event-configured only).  
**UI.** Inbox, workspace, unmatched.  
**Tests.** Idempotent ingest; no name-only match; no silent guest create; every inbound owned; SLA has no global default; one-to-one approval ≠ campaign approval.  
**Persistence.** Thread/inbound/task/escalation/attachment metadata. Local/synthetic blob store.  
**Provider.** Synthetic inbound only. No Cloudinary/Cloudflare.  
**Security risks.** Cross-event inference; active content in attachments; leaking unmatched sender.  
**Exit.** Concierge is an owned human workflow. Chatbot forbidden.

## WS9 — Correction and operator surfaces

**IDs:** S4-45, S4-46, S4-47, S4-48, S4-49, S4-50  
**Purpose.** Correction proposals, dashboard, guest timeline, settings, attention.  
**Domain.** ContactCorrection; metric snapshots; Event OS notifications (not CT notices).  
**Server.** Metrics API; settings publish; notification fan-in.  
**UI.** Overview, settings, guest-detail timeline, notification centre.  
**Tests.** Correction invokes S02 amend + provenance; metrics not computed in browser; event switch clears unsafe state; no RSVP-volatility alert unless later policy.  
**Persistence.** Correction + notification + metric snapshot.  
**Provider.** None.  
**Security risks.** Auto-overwrite of guest master; second alert truth.  
**Exit.** Staff can operate the 18-screen centre without a second guest app.

## WS10 — Intelligence

**IDs:** S4-51, S4-52  
**Purpose.** Explainable recommendations at the decision point.  
**Domain.** Versioned rules + alert records.  
**Server.** Deterministic rule evaluation.  
**UI.** Panels on dashboard/composer/approval/delivery/inbox.  
**Tests.** Cannot send/approve/edit; evidence + rule version required; no opaque score.  
**Persistence.** Intelligence alert collection.  
**Provider.** None.  
**Security risks.** Autonomous action creep.  
**Exit.** Advise and explain only.

## WS11 — Retention and observability

**IDs:** S4-53, S4-54  
**Purpose.** Diagnosable communications without leaking secrets; lifecycle control.  
**Domain.** Extended AuditEvent; retention/legal-hold flags.  
**Server.** Redacted logs/metrics; privileged-read audit.  
**UI.** `/communications/audit`.  
**Tests.** No body/credential/full-contact logs; hold blocks deletion; audit retained.  
**Persistence.** Audit already exists; add hold/retention metadata.  
**Provider.** None.  
**Security risks.** Indefinite content; erasing required audit.  
**Exit.** Mechanism complete on synthetic data. Production retention policy remains later authority.

## WS12 — Qualification and gates

**IDs:** S4-55, S4-56, S4-57, S4-58, S4-59, S4-60, S4-61, S4-62  
**Purpose.** Prove the product; do not self-sign gates; do not deploy.  
**Domain.** None new.  
**Server.** Kill switch for dispatch.  
**UI.** A11y/responsive audit of all S04 screens.  
**Tests.** See verification matrix.  
**Persistence.** Clean-room uses fixtures, not Railway Postgres.  
**Provider.** Fakes only.  
**Security risks.** Self-acceptance; staging deploy; real contact.  
**Exit.**

- S4-55–S4-59: technical qualification (A), adapted to PlatformStore fixtures.
- S4-60: **H** — local/synthetic rehearsal + kill switch only. No Railway.
- S4-61: **F** — independent reviewer; `GATE-INDEPENDENT` stays unsigned.
- S4-62: **F** — CEO/delegated handover pack; Cursor cannot accept; do not start EOS-S05.

## Persistence assessment

| Question | Answer |
|----------|--------|
| New persisted entities required? | **YES** (WS2–WS11 collections) |
| Existing PlatformStore sufficient as port? | **YES** — extend snapshot collections; do not fork |
| Memory / FileBacked non-production? | Extend the same way S02/S03 did |
| PostgresPlatformStore contract? | Document schema additions; implement behind the same port if authorised |
| Migration required later? | **YES** (contract/schema additions when authorised) |
| Railway / Postgres mutation now? | **NO** |
| Production migration authority? | **NO** |

Do not perform migrations. Do not connect Railway Postgres. Do not mutate databases.

## Test strategy (when authorised)

No test may send a real external communication.

| Layer | Must cover |
|-------|------------|
| Unit / domain | Eligibility, renderer, campaign transitions, SLA clocks, fallback, snapshot immutability |
| Permissions / tenancy / event scope / guest isolation | IDOR, concealment as NOT_FOUND, unmatched privacy |
| Idempotency / concurrency | Approval, outbox, provider submit, webhooks, inbound, OCC |
| Audit | Privileged read, send, correction, suppression release |
| Communication lifecycle | Draft → approve → expand → submit → deliver/fail/retry/dead-letter/cancel |
| Failed delivery / retry / suppression | Permanent vs transient; opt-out of queued-unsent |
| Guest-safe rendering | Unverified/unknown omitted; no internal doctrine; RSVP ≠ admission |
| Concierge | Ownership atomicity, escalation ladder, one-to-one vs campaign policy |
| Privacy / invalid access | Masking, export leakage, attachment quarantine |
| A11y / responsive / mobile | All 18 screens; keyboard; 360px inbox/composer |
| Staff browser journey | Template → audience → compose → approve → test-send → monitor → inbox → resolve |
| Guest browser journey | Open sandbox artefact / S03 RSVP consuming guest-safe occasion projection; no conversation DB |
| S01–S03 regression | Directory, RSVP, invitations, assistance, MEF unchanged in behaviour |
| Control Tower regression | Programme status, gates, notices unchanged |

## Human live milestone recommendation

**YES** — after technical acceptance, a human live checkpoint is justified.

Journey/risk coherence: S04 introduces the first Event OS path that can **look** like contact with a guest. Automated tests cannot judge whether occasion context, tone, approval consequences, unmatched confidence and SLA attention are usable and calm.

**Smallest meaningful human journey (synthetic only):**

1. Staff open verification event → communications overview.
2. Select an approved template and an evidence-backed audience of fixture guests.
3. Preview guest-safe occasion facts; confirm unknown fields are omitted.
4. Obtain approval; perform a watermarked **test-send** to an allowlisted team/sandbox sink (not a guest).
5. Inspect delivery truth on the run page and on one guest timeline.
6. Inject one synthetic inbound; assign; reply; resolve.

Do not schedule or deploy this now. Mobile human verification remains a distinct concern (EOS-HV1 was NOT ASSESSED).

## What this plan is not

- Implementation authority
- Provider selection
- Production communication
- S04 status change to `IN_PROGRESS`
- Foundation mass acceptance
- Signing of any protected gate
