# EOS-S04 Canonical Scope Reconciliation

**Control ID:** `MD-PR-S014`  
**Milestone:** `EOS-S04-RECON`  
**Product:** `EVENT_OS`  
**Mode:** Analysis / reconciliation only — **no implementation**  
**Reviewed-By input:** ChatGPT / AI CTO (separate later authorisation)  
**Implementation authorised:** **NO**

This document determines what EOS-S04 means. It does not start EOS-S04, change EOS-S04 from `READY`, alter S01–S03 acceptance, sign a protected gate, select a provider, or authorise production communication.

Companion artefacts:

- `docs/control/EOS_S04_PROMPT_COVERAGE.md` — all 62 native prompts
- `docs/control/EOS_S04_HV_FINDING_MAP.md` — HV-EOS-001–005
- `docs/control/EOS_S04_IMPLEMENTATION_PLAN.md` — workstreams, persistence, tests

## 1. Pre-flight (recorded)

| Check | Value |
|-------|-------|
| Repository | `kglaw-Oluseyi/atelier-doclar` |
| Branch | `main` |
| Baseline HEAD | `d8417560d9fe0a73b233c4fb486e0cbb84ff0e73` |
| Worktree at start | clean |
| EOS-S01 / S02 / S03 | `ACCEPTED` / `ACCEPTED` / `ACCEPTED` |
| Accepted count | 3 |
| EOS-S04 | `READY` / technically eligible |
| EOS-S04 implementation authorised | NO |
| Foundation | `IN_REVIEW` |
| `productionAuthorised` | `false` |
| Protected gates | UNSIGNED (`GATE-INDEPENDENT`, `GATE-CEO-PRODUCTION`, `GATE-SPECIALIST-BIOMETRIC`, `GATE-VENUE-REHEARSAL`) |
| MD-PR-S013 / EOS-HV1 | `PASS WITH MINOR REFINEMENTS`; findings = 5 |

Material difference from required baseline: **none**. Work continued.

## 2. Canonical source

| Field | Value |
|-------|-------|
| Controlling pack | `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx` |
| Inventory | `MD-INV-0150` / sha256 `4743ba7986f62e72c248b841218ee0753665aa0410b6bb0a3945fa3972e3a3fd` |
| Supporting spec | `MDOS/slice4/Maison_Doclar_Slice_4_Implementation_Specification_and_Build_Plan_v1.0.docx` (`MD-INV-0151`) |
| Native count | 62 |
| First ID | `S4-01` (`MD-PR-0170`) |
| Last ID | `S4-62` (`MD-PR-0231`) |
| Complete extraction | YES |
| Embedded status | “Ratification draft” — does **not** remove B0 programme ratification |
| Catalogue title | Event OS Slice 4 — Guest communications and concierge |
| Catalogue outcome | Guest communications and concierge |
| Entry criterion | Prior Event OS slice accepted (EOS-S03 `ACCEPTED`) |

Prompt-register titles (`Event OS Slice 4 prompt S4-nn`) are inventory placeholders. Native titles in the pack are controlling.

Pack subtitle: **Event-scoped guest communications, delivery operations and two-way concierge.**  
Safety line: **Sandbox/provider-fake only; no real guest contact.**

## 3. Canonical definition

EOS-S04 is the Event OS communications and concierge domain. Authorised staff plan, approve, sandbox-send and recover guest communications across **channel types** email, WhatsApp and SMS, while every authenticated inbound reply becomes visible, owned and actionable inside an event-scoped conversation.

It is **not** a notes field, a marketing engine, a second guest database, or production messaging.

### Primary capabilities

1. Event-scoped channel policy, consent/permission evaluation and do-not-contact suppression before any job is created.
2. Versioned templates, allow-listed variables and a safe renderer that refuses unresolved required facts.
3. Explainable audience selection and immutable audience snapshots at approval.
4. Campaign lifecycle: draft, approve, schedule, pause, cancel, complete, fail.
5. Transactional outbox, expansion, bounded retry, dead-letter and delivery-truth projection.
6. Provider-neutral adapters with **synthetic/local** implementations only.
7. Inbound ingestion, identity resolution, unmatched queue, attachments metadata, conversation threads.
8. Concierge: owned `FollowUpTask`, SLA/escalation, governed one-to-one reply, service-recovery linkage.
9. Contact-correction **proposals** that invoke EOS-S02 amend — never inferred overwrite.
10. Staff communications centre (18 specified screens), guest timeline on existing guest detail, in-app attention, explainable intelligence that cannot send or approve.

### Explicit exclusions

- Production messages, real guest contact, live sender identities, production provider credentials.
- RSVP form/response ownership (EOS-S03 remains authoritative).
- Marketing automation, CRM, public newsletters, cross-client promotion.
- Venue/layout ownership (EOS-S05), seating engine (EOS-S06), credentials/QR (EOS-S07).
- Check-in, admission, FaceGate, biometrics, Event-Day runtime / offline ledger, usher runtime.
- Academy, Marketing OS.
- Automatic contact correction from bounce, reply signature or inferred identity.
- Autonomous AI send, crisis communication, compensation, VIP treatment or policy decisions.
- Payment, ticketing, travel/hotel **booking**, social publishing, voice calling.
- General-purpose chatbot.
- Permanent cross-event guest profiling.
- Railway mutation, production migration, production IdP.

## 4. Native prompt reconciliation

Full records: `EOS_S04_PROMPT_COVERAGE.md`.

| Disposition | Meaning | Count | Native IDs |
|-------------|---------|------:|------------|
| A | Implement in EOS-S04; not already satisfied | 42 | S4-02, 06, 08–15, 18–22, 24–29, 34–36, 38–42, 44, 46–47, 49–52, 54–59 |
| B | Already satisfied by accepted S01–S03 | 0 | — |
| C | Adapt / integrate with accepted S01–S03 | 13 | S4-01, 03–05, 07, 16–17, 23, 37, 43, 45, 48, 53 |
| D | Defer entire prompt to a later Event OS slice | 0 | Seating **predicates** inside S4-16 defer to EOS-S06 |
| E | Map entire prompt to EVENT_DAY | 0 | Arrival-day **triggers** and live-floor command map to Event-Day |
| F | Specialist / external gate required | 2 | S4-61, S4-62 |
| G | Production / provider decision — abstraction only | 4 | S4-30, S4-31, S4-32, S4-33 |
| H | Superseded by later ratified decision | 1 | S4-60 |
| I | Requires CEO / AI CTO semantic decision | 0 | Recommendations below are bounded, not blockers |
| **Total** | | **62** | S4-01–S4-62 |

Unaccounted native prompts: **0**.

### Unresolved items (bounded recommendations — not disposition I)

| ID | Ambiguity | Recommendation |
|----|-----------|----------------|
| U-01 | Spec `ContactPoint` vs S02 `QualifiedField` email/phone | Keep intake fields as source. Add a normalized ContactPoint **projection** (channel, preferred, verification, validity, source, last-confirmed, history). Do not overwrite intake silently. |
| U-02 | S4-16 seating filters before EOS-S06 | Audience DSL may name a seating predicate that returns `UNKNOWN` / unavailable. Do not invent seating truth. |
| U-03 | S4-44 “guest tier” vs no S02 VIP model | Do not invent VIP/tier. SLA is event-configured only (S4-D07). |
| U-04 | Native `docs/slice-4/` evidence path | Use `docs/control/` if implementation is later authorised. |
| U-05 | Native ORM/migrations vs `PlatformStore` | Extend `PlatformStore` / Memory / FileBacked / `PostgresPlatformStore` contract. No parallel ORM. |
| U-06 | Native 62 sequential micro-commits vs governed wrapper | If authorised, execute as one EOS-S04 wrapper with the workstreams in the plan — same pattern as S01–S03. |
| U-07 | Invitation **delivery** vs S03 invitation **capability** | S04 may send purpose `INVITATION` linked to an issued S03 invitation. It must not mint or replace tokens. |
| U-08 | Guest-safe occasion facts vs raw `EventRecord` / MEF | S04 owns a guest-safe occasion projection. Only verified/approved guest-safe facts render. MEF “doctrine slots” are not guest-safe by default. |
| U-09 | RSVP amendment → staff attention | Machinery can exist in S04 (notifications/intelligence). Whether repeated RSVP change raises attention is **policy**, not a native S04 rule. |
| U-10 | International brief / protocol / travel / seating in concierge pack | Communicate **approved** facts from owning domains when available. Do not own those engines. |

## 5. Architectural reconciliation

Existing accepted constructs remain controlling. S04 must not create parallel Organisation, Client, Event, Person, Guest, identity, membership, role, assignment, consent **identity**, or audit stores.

| Construct | Owner today | S04 treatment |
|-----------|-------------|---------------|
| Organisation / Client / Event | shared-platform | Consume. Event timezone/name/`startsAt`/`endsAt`/`venueSummary` are sources, not automatically guest-safe. |
| Person / membership / role / permission / assignment | shared-platform | Extend `PERMISSION_KEYS` with `msg.*`. Server-side only. |
| ApprovalPolicy scaffold | shared-platform | Campaign/template approval consumes it; role ≠ approval. |
| Guest reference / OperationalGuest / household | shared-platform | Audience and identity resolution consume these IDs. |
| Field quality / identityResolution (`UNVERIFIED`, `UNRESOLVED`) | shared-platform | Preserve enums. Presentation labels are not domain renames. |
| ConsentRecord | shared-platform | Extend for channel/purpose evidence; append-only; RSVP ≠ marketing consent. |
| Policy version refs | shared-platform | ChannelPolicy / template / campaign bind versions. |
| Audit + idempotency + `expectedVersion` | shared-platform | All consequential S04 actions use the same laws. |
| RSVP policy / invitation / session / response / exception / assistance | shared-platform | Link only. S03 remains RSVP truth. Assistance note may **open** a concierge task. |
| PlatformStore / Memory / FileBacked / PostgresPlatformStore | shared-platform | Only mutation API. Add collections; do not fork. |
| Scope enforcement | `policy.ts` | Every comms row carries org/event; cross-event explicit and permissioned. |
| Design system / Event OS shell | `@maison-doclar/design-system`, `apps/event-os` | New `/communications/*` routes + guest-detail timeline. No second app. |

**No duplicate domain models.** Spec names (`EventGuest`, `ContactPoint`) map onto `OperationalGuest` + contact projection.

## 6. Communications boundary

S03 issued invitation **capability**. It did not implement production email/SMS delivery. S04 owns communications.

| Topic | Canonical position |
|-------|-------------------|
| What is a communication | One logical `Message` for a purpose, recipient, channel and direction, with immutable content snapshot and append-only attempts/events |
| Intent / purpose | `INVITATION`, `RSVP_ACKNOWLEDGEMENT`, `CONFIRMATION`, `PRE_EVENT_INFO`, `REMINDER`, `ARRIVAL_SUPPORT`, `CONCIERGE`, `SERVICE_RECOVERY`, `DEPARTURE`, `FOLLOW_UP` |
| Template model | Tenant-global or event-local; versioned; published versions immutable |
| Channel abstraction | `EMAIL`, `WHATSAPP`, `SMS` — types, not vendors |
| Dispatch request | Outbox intent created atomically with campaign/reply state; workers submit through adapters |
| Recipient eligibility | Single domain service: suppression → permission/consent → contact usability → policy/quiet hours/caps/sensitivity |
| Delivery state | `PLANNED` … `DEAD_LETTER` / `CANCELLED`; projected only from authenticated provider evidence |
| Retry | Transient only; capped backoff; permanent/policy failures do not retry |
| Idempotency | Approval, enqueue, provider submit, webhook, inbound ingest — one logical effect |
| Provenance / audit | Content hash, template/source versions, actor, reason, correlation |
| Failures / bounce | Visible dead-letter/task; bounce ≠ opt-out; bounce may **propose** correction |
| Suppression / cancel / amend | Opt-out blocks queued-unsent work; material campaign edit revokes approval; content amend = new version |
| Staff vs system | Staff compose/approve/reply. System expands, retries, projects. Intelligence advises only. |
| Guest reply | Canonical: inbound → thread or unmatched queue → `FollowUpTask`. Guest has **no** conversation database (S03 owns signed RSVP/assistance destinations). |
| Attachments | Canonical inbound metadata + quarantine. No Cloudinary/Cloudflare. |
| Multi-channel | Canonical fallback only when purpose+consent+policy permit; no silent duplicate |

Cadence windows (invitation, T-14 info, T-24 reminder, arrival support) are **event-configured templates/triggers**. Live arrival / credential / floor triggers belong to Event-Day; S04 still owns the message type if an authorised trigger fires.

## 7. Provider / production law

S4-D01: provider-neutral adapters; provider selection is configuration, not domain logic.  
S4-D11 / S4-D12: sandbox only in Slice 4; production activation is a later explicit gate.

**Not assumed:** Twilio, WhatsApp Business / Meta Cloud API, SendGrid, Postmark, Mailgun, AWS SES, Cloudinary, Cloudflare, or any other vendor.

If later authorised, implementation uses synthetic/local adapters sufficient for complete product behaviour. **No live guest communication is authorised by this reconciliation.** Dispatch-capable paths remain feature-flagged / disabled-by-default.

## 8. Concierge definition

Canonical concierge is an **owned human workflow**, not a chatbot and not `RsvpAssistanceRequest.note`.

| Topic | Canonical meaning |
|-------|-------------------|
| Guest-originated types | Authenticated inbound replies; RSVP assistance may open a task; unmatched inbound is owned work |
| Staff-originated | Governed one-to-one reply; service-recovery message; authorised follow-up |
| Lifecycle | Thread: `OPEN` → `WAITING_ON_TEAM` / `WAITING_ON_GUEST` → `ESCALATED` → `RESOLVED` → `CLOSED`. Task: `OPEN` → `ACKNOWLEDGED` → `IN_PROGRESS` → `WAITING` → `RESOLVED` / `CLOSED` / `CANCELLED` |
| Ownership | Named owner/deputy; inbound creates or updates `FollowUpTask` atomically — nothing invisible |
| Priority / SLA | Event-approved acknowledgement and resolution targets. **No invented global numeric default.** Clock starts at authenticated receipt; paused/waiting recorded. |
| Escalation | Operational owner → lead → Event Director → CEO/client principal where authorised. Family guest-experience routes to a named Family Decision Owner. Crisis, compensation, policy exception, restricted VIP/security and legal **always** require named authority. |
| Resolution | Human verifies evidence. Recovery copy cannot claim resolution until the operational outcome is verified. |
| Communication linkage | Thread gathers inbound/outbound; reply is a one-to-one `Message` under reply policy |
| Event / guest linkage | Event-scoped; one guest identity; no cross-event inference |
| Service recovery | Acknowledge → Own → Solve → Follow-up; approved phrasing; no blaming providers to the guest |
| Internal vs guest-visible | Restricted facts stay in controlled fields; not pasted into unstructured guest-visible text. Intelligence pack is role-scoped from current sources, never a copied second database. |
| Human judgement | Unclear facts are escalated, not invented. AI may draft with citations; cannot send/approve. |
| Privacy | Minimum unmatched preview; no broad sender search; attachments quarantined |

Ambiguity: “guest tier” and “international brief” content. Recommendation: event-configured SLA and approved logistics/culture **facts** only; protocol/travel/seating engines stay with their slices.

## 9. Cross-product boundaries

| Domain | S04 may | S04 must not |
|--------|---------|--------------|
| Event-Day | Receive authorised triggers; send guest-safe arrival/support copy | Own runtime, offline ledger, usher runtime, check-in, admission |
| FaceGate / biometrics | Nothing | Process, store, or communicate biometric payload; `GATE-SPECIALIST-BIOMETRIC` unsigned |
| Seating (EOS-S06) | Mention seating in copy **when** S06 publishes verified guest-safe assignments; audience predicate = UNKNOWN until then | Own allocation |
| Venue (EOS-S05) | Use approved venue/arrival facts as variables | Own venue registry / layout |
| Travel / accommodation | Communicate approved logistics | Booking engines |
| Protocol / culture | Communicate approved brief outcomes | Decision engines; no stereotypes |
| Credentials / QR (EOS-S07) | Communicate that a credential exists only if later authorised and guest-safe | Issue or scan credentials |
| Academy / Marketing | None | Campaigns, curricula, growth automation |
| Ushering | None | Usher runtime |
| Control Tower | Do not treat CT notices as comms truth | Second alert store |

Event OS communicates **controlled truth**. It does not silently become the owning domain for every system it mentions.

## 10. Experience architecture (flows only — do not build)

### Staff

```
prepare ChannelPolicy + approved template
        → choose eligible audience (preview counts / exclusions)
        → review verified / guest-safe context (unresolved facts block send)
        → request approval (snapshot + content hash freeze)
        → approver decide
        → test-send to allowlisted sandbox only
        → schedule / queue via non-production adapter
        → inspect delivery status, failures, dead letters
        → inspect guest communication timeline
        → inbound: matched thread or unmatched queue
        → assign owner, acknowledge under SLA
        → draft / preview / authorised reply
        → resolve or escalate
        → correction proposal if contact is wrong
```

### Guest

```
receive / open communication (sandbox only until production authority)
        → understand occasion from guest-safe facts only
        → respond (RSVP surface remains S03) or reply on channel
        → request assistance (S03 capture may open S04 task)
        → see only guest-safe information
        → RSVP never presented as admission or check-in
```

Unknown must not appear as truth. Internal/private event information remains hidden.

## 11. Proposed S04 domain additions

Owner package: `@maison-doclar/shared-platform` for aggregates and policy; `apps/event-os` for staff UI and server actions. Aggregate boundary: communications domain. IDs: opaque UUIDs. Scope: `organisationId` + `eventId` on event-owned rows; tenant-owned templates explicit. Versions + `expectedVersion`. Provenance and immutable audit on consequential actions. Lifecycle per native enums. Deletion/retention: configurable; legal-hold mechanism; production retention policy later. Consent/policy: evaluate before job creation. External-provider identifiers: adapter references only, no production account IDs required. Public/private: guest sees rendered guest-safe content; staff see role-scoped operational records.

Proposed collections (names may be repo-native): `channelPolicies`, `communicationPermissions`, `suppressionEntries`, `messageTemplates`, `messageTemplateVersions`, `audienceDefinitions`, `audienceSnapshots`, `audienceMembers`, `campaigns`, `campaignApprovals`, `messages`, `messageContentSnapshots`, `messageAttempts`, `deliveryEvents`, `providerAccounts` (sandbox), `outboxIntents`, `conversationThreads`, `inboundMessages`, `followUpTasks`, `contactCorrections`, `communicationEscalations`, `communicationNotifications`, `communicationIntelligenceAlerts`.

Consent extends existing `consents`. Contact projection extends guest records; it does not replace them.

Required laws (unchanged): server-side scope; least privilege; no client-only authority; no silent loss; idempotent consequential actions; immutable consequential audit; no last-write-wins; human authority; unknown ≠ healthy; no production communication without production authority.

## 12. Programme state after this reconciliation

| Measure | Value |
|---------|-------|
| EOS-S01 / S02 / S03 | ACCEPTED |
| Accepted count | 3 |
| EOS-S04 | READY |
| EOS-S04 implementation authorised | NO |
| Foundation | IN_REVIEW |
| Protected gates | UNSIGNED |
| `productionAuthorised` | false |
| Railway mutation | NO |

This reconciliation is sufficient for a **separate** AI CTO implementation-authorisation decision. It does not itself authorise implementation.
