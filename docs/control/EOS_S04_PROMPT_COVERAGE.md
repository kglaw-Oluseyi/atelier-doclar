# EOS-S04 Native Prompt Coverage

**Control ID:** `MD-PR-S014`  
**Milestone:** `EOS-S04-RECON`  
**Product:** `EVENT_OS`  
**Mode:** Analysis / reconciliation only — no implementation  
**Controlling source:** `MDOS/slice4/Maison_Doclar_Slice_4_Cursor_Prompt_Pack_v1.0.docx`  
**Supporting source:** `MDOS/slice4/Maison_Doclar_Slice_4_Implementation_Specification_and_Build_Plan_v1.0.docx`  
**Native range:** S4-01 … S4-62  
**Register range:** MD-PR-0170 … MD-PR-0231  
**Count:** 62 / 62  

Embedded “Ratification draft” wording does not remove B0 programme ratification. Prompt-register titles (`Event OS Slice 4 prompt S4-nn`) are inventory placeholders; **native titles below are controlling**.

Disposition key: **A** implement in EOS-S04 · **B** already satisfied by S01–S03 · **C** adapt/integrate with S01–S03 · **D** defer to later Event OS slice · **E** map to EVENT_DAY · **F** specialist/external gate · **G** production/provider decision — abstraction only · **H** superseded by later ratified decision · **I** requires CEO/AI CTO decision.

No native prompt is “out of scope” without a destination. Seating predicates inside S4-16, arrival-day *triggers*, and credential/check-in facts are noted on the owning prompt; they do not delete that prompt.

## Index

| Native | Register | Title | Disposition |
|--------|----------|-------|-------------|
| S4-01 | `MD-PR-0170` | Entry gate and repository reconnaissance | C |
| S4-02 | `MD-PR-0171` | Slice 4 contracts and decision record | A |
| S4-03 | `MD-PR-0172` | Communications schema foundation | C |
| S4-04 | `MD-PR-0173` | Contact point normalization service | C |
| S4-05 | `MD-PR-0174` | Consent and lawful-contact ledger | C |
| S4-06 | `MD-PR-0175` | Suppression and do-not-contact enforcement | A |
| S4-07 | `MD-PR-0176` | Communication authorization policy | C |
| S4-08 | `MD-PR-0177` | Channel policy and event configuration | A |
| S4-09 | `MD-PR-0178` | Quiet hours and frequency caps | A |
| S4-10 | `MD-PR-0179` | Fallback policy engine | A |
| S4-11 | `MD-PR-0180` | Template model and version lifecycle | A |
| S4-12 | `MD-PR-0181` | Template variable registry | A |
| S4-13 | `MD-PR-0182` | Safe renderer and missing-data policy | A |
| S4-14 | `MD-PR-0183` | Template management API | A |
| S4-15 | `MD-PR-0184` | Template management frontend | A |
| S4-16 | `MD-PR-0185` | Audience query contract | C |
| S4-17 | `MD-PR-0186` | Audience builder backend | C |
| S4-18 | `MD-PR-0187` | Audience builder frontend | A |
| S4-19 | `MD-PR-0188` | Immutable audience snapshots | A |
| S4-20 | `MD-PR-0189` | Campaign aggregate and state machine | A |
| S4-21 | `MD-PR-0190` | Campaign composer API | A |
| S4-22 | `MD-PR-0191` | Campaign composer frontend | A |
| S4-23 | `MD-PR-0192` | Approval workflow backend | C |
| S4-24 | `MD-PR-0193` | Approval inbox frontend | A |
| S4-25 | `MD-PR-0194` | Test-send sandbox | A |
| S4-26 | `MD-PR-0195` | Scheduler and due-campaign claiming | A |
| S4-27 | `MD-PR-0196` | Transactional outbox | A |
| S4-28 | `MD-PR-0197` | Message expansion worker | A |
| S4-29 | `MD-PR-0198` | Delivery attempt and retry engine | A |
| S4-30 | `MD-PR-0199` | Email sandbox adapter | G |
| S4-31 | `MD-PR-0200` | WhatsApp sandbox adapter | G |
| S4-32 | `MD-PR-0201` | SMS sandbox adapter | G |
| S4-33 | `MD-PR-0202` | Webhook authentication and replay defence | G |
| S4-34 | `MD-PR-0203` | Delivery status projection | A |
| S4-35 | `MD-PR-0204` | Delivery operations frontend | A |
| S4-36 | `MD-PR-0205` | Inbound message ingestion | A |
| S4-37 | `MD-PR-0206` | Inbound identity and event resolution | C |
| S4-38 | `MD-PR-0207` | Conversation aggregate | A |
| S4-39 | `MD-PR-0208` | Unmatched inbox backend | A |
| S4-40 | `MD-PR-0209` | Attachments and content safety | A |
| S4-41 | `MD-PR-0210` | Unified inbox frontend | A |
| S4-42 | `MD-PR-0211` | Unmatched inbox frontend | A |
| S4-43 | `MD-PR-0212` | Concierge reply workflow | C |
| S4-44 | `MD-PR-0213` | SLA and escalation engine | A |
| S4-45 | `MD-PR-0214` | Contact correction workflow | C |
| S4-46 | `MD-PR-0215` | Communications dashboard API | A |
| S4-47 | `MD-PR-0216` | Communications dashboard frontend | A |
| S4-48 | `MD-PR-0217` | Guest communication timeline frontend | C |
| S4-49 | `MD-PR-0218` | Event communication settings frontend | A |
| S4-50 | `MD-PR-0219` | Notification centre and deep links | A |
| S4-51 | `MD-PR-0220` | Communication intelligence rules | A |
| S4-52 | `MD-PR-0221` | Intelligence frontend integration | A |
| S4-53 | `MD-PR-0222` | Audit, observability and redaction | C |
| S4-54 | `MD-PR-0223` | Retention, deletion and legal hold | A |
| S4-55 | `MD-PR-0224` | Accessibility and responsive frontend audit | A |
| S4-56 | `MD-PR-0225` | Frontend integration and state consistency | A |
| S4-57 | `MD-PR-0226` | Security and privacy test campaign | A |
| S4-58 | `MD-PR-0227` | Reliability and load qualification | A |
| S4-59 | `MD-PR-0228` | Clean-room Slice 4 acceptance | A |
| S4-60 | `MD-PR-0229` | Staging rehearsal and rollback | H |
| S4-61 | `MD-PR-0230` | Independent audit and defect closure | F |
| S4-62 | `MD-PR-0231` | CEO handover and Slice 4 exit gate | F |

## Disposition totals

| Disposition | Count |
|-------------|------:|
| A | 42 |
| B | 0 |
| C | 13 |
| D | 0 |
| E | 0 |
| F | 2 |
| G | 4 |
| H | 1 |
| I | 0 |
| **Total** | **62** |

## Per-prompt records

### S4-01 — Entry gate and repository reconnaissance

| Field | Record |
|-------|--------|
| Native ID | S4-01 |
| Prompt-register ID | `MD-PR-0170` |
| Native title | Entry gate and repository reconnaissance |
| Purpose | Prove Slice 3 accepted and map the clean repository before any Slice 4 change. |
| Functional scope | Read-only reconnaissance, quality gates, baseline evidence. No product behaviour change. |
| Data/domain entities | None (inspection only) |
| UI surfaces | None |
| Staff role(s) | Implementer / AI CTO |
| Guest role(s) | None |
| External integrations implied | Existing quality gates |
| Communications channel implied | None |
| Dependencies | EOS-S03 ACCEPTED; clean worktree |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Stop and report if base wrong or Slice 3 not accepted |
| Validation/test expectations | Run existing suites only; do not weaken |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Native path docs/slice-4/ vs programme docs/control/; adapt to docs/control/ |
| Overlap with S01 | Map existing shared-platform and Event OS shell |
| Overlap with S02 | Map guest directory conventions |
| Overlap with S03 | Confirm accepted RSVP/self-service as entry |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-02 — Slice 4 contracts and decision record

| Field | Record |
|-------|--------|
| Native ID | S4-02 |
| Prompt-register ID | `MD-PR-0171` |
| Native title | Slice 4 contracts and decision record |
| Purpose | Freeze bounded-messaging architecture and public contracts. |
| Functional scope | ADR + typed contracts + state diagrams. No runtime or provider calls. |
| Data/domain entities | ChannelPolicy, Template, Audience, Campaign, Message, Conversation, Task (contracts only) |
| UI surfaces | None |
| Staff role(s) | Architecture / communications lead |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | EMAIL / WHATSAPP / SMS as channel types only |
| Dependencies | S4-01 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Native assumes greenfield Event OS; later architecture is controlling |
| Overlap with S01 | Must bind to PlatformStore, Permission, Audit, ApprovalPolicy scaffold |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-03 — Communications schema foundation

| Field | Record |
|-------|--------|
| Native ID | S4-03 |
| Prompt-register ID | `MD-PR-0172` |
| Native title | Communications schema foundation |
| Purpose | Create the event-safe relational foundation for Slice 4. |
| Functional scope | Persist communications entities with event_id, constraints, isolation fixtures. |
| Data/domain entities | ContactPoint projection, Consent, Suppression, Template(+version), Campaign, Audience, Message, Attempt, Inbound, Conversation, Attachment, Approval, Audit |
| UI surfaces | None |
| Staff role(s) | Implementer |
| Guest role(s) | None |
| External integrations implied | PlatformStore / Memory / FileBacked / Postgres contract |
| Communications channel implied | None |
| Dependencies | S4-02 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Two-tenant/two-event isolation, constraint, no RLS weakening |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Native says ORM/migrations; controlling persistence is PlatformStore + later Postgres contract. Contact points and consent already exist in part. |
| Overlap with S01 | Extend ConsentRecord and audit; do not create parallel org/event |
| Overlap with S02 | Do not replace OperationalGuest email/phone as source intake |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-04 — Contact point normalization service

| Field | Record |
|-------|--------|
| Native ID | S4-04 |
| Prompt-register ID | `MD-PR-0173` |
| Native title | Contact point normalization service |
| Purpose | Create canonical email and phone contact handling. |
| Functional scope | Normalized contact points linked to guests without overwriting source intake. |
| Data/domain entities | OperationalGuest.email/phone; proposed ContactPoint projection (preferred channel, verification, validity, source, last-confirmed, correction history) |
| UI surfaces | None (service) |
| Staff role(s) | Guest-data / communications services |
| Guest role(s) | Indirect (their contact data) |
| External integrations implied | None |
| Communications channel implied | Email + phone normalization (E.164 where resolvable) |
| Dependencies | S4-03; EOS-S02 guest fields |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not silently guess country codes or delete superseded values |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Spec ContactPoint vs S02 QualifiedField — extend, do not invent a second master |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Source of truth remains QualifiedField intake values; S04 adds normalized projection |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-05 — Consent and lawful-contact ledger

| Field | Record |
|-------|--------|
| Native ID | S4-05 |
| Prompt-register ID | `MD-PR-0174` |
| Native title | Consent and lawful-contact ledger |
| Purpose | Implement append-only consent evidence. |
| Functional scope | Channel/purpose/status/source/policy/actor/evidence; effective-consent projection; revocations. |
| Data/domain entities | ConsentRecord (extend); CommunicationPermission |
| UI surfaces | None (service) |
| Staff role(s) | Privacy-aware staff |
| Guest role(s) | Consent subject (guest/person) |
| External integrations implied | None |
| Communications channel implied | Per-channel purpose consent |
| Dependencies | S4-03; EOS-S01 ConsentRecord; EOS-S03 RSVP notice |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | S01 consent is person-scoped purpose/status; S04 needs channel+purpose+evidence. Extend schema, keep append-only |
| Overlap with S01 | ConsentRecord already exists — extend purpose/channel evidence, do not replace |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | RSVP acceptance is not blanket marketing consent (native exclusion) |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-06 — Suppression and do-not-contact enforcement

| Field | Record |
|-------|--------|
| Native ID | S4-06 |
| Prompt-register ID | `MD-PR-0175` |
| Native title | Suppression and do-not-contact enforcement |
| Purpose | Create the non-bypassable contact safety gate. |
| Functional scope | Tenant/guest/contact-point/channel/purpose suppressions; single eligibility service. |
| Data/domain entities | SuppressionEntry |
| UI surfaces | None (service); later ops UI |
| Staff role(s) | Privileged release only for override |
| Guest role(s) | Suppressed recipients |
| External integrations implied | None |
| Communications channel implied | All outbound channels |
| Dependencies | S4-05 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Ordinary operators and bulk jobs cannot bypass |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Opt-out must cancel queued-but-unsent jobs; RSVP ≠ opt-in |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-07 — Communication authorization policy

| Field | Record |
|-------|--------|
| Native ID | S4-07 |
| Prompt-register ID | `MD-PR-0176` |
| Native title | Communication authorization policy |
| Purpose | Add server-side permissions and approval boundaries. |
| Functional scope | Capabilities: draft, preview, request approval, approve, schedule, test-send, pause, cancel, view content/contact, resolve inbound, manage templates. Separation of duties. |
| Data/domain entities | Permission, Role, Assignment, ApprovalPolicy |
| UI surfaces | None (policy) |
| Staff role(s) | All comms roles |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-02; EOS-S01 RBAC |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Hidden buttons are not authorization |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Add msg.* keys to PERMISSION_KEYS; do not invent a second authz engine |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-08 — Channel policy and event configuration

| Field | Record |
|-------|--------|
| Native ID | S4-08 |
| Prompt-register ID | `MD-PR-0177` |
| Native title | Channel policy and event configuration |
| Purpose | Make channel use configurable per event. |
| Functional scope | Enabled channels, sender identity, timezone, locale, quiet hours, caps, fallback, reply routing, escalation targets, emergency override. Tenant defaults + event overrides. |
| Data/domain entities | ChannelPolicy |
| UI surfaces | Settings later (S4-49) |
| Staff role(s) | Event Director / Communications Lead |
| Guest role(s) | None |
| External integrations implied | Provider account allow-list (sandbox refs only) |
| Communications channel implied | EMAIL, WHATSAPP, SMS as channel types |
| Dependencies | S4-07 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named escalation/SLA owners required before live dispatch (stop condition in spec) |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not hardcode Lagos rules as global policy; event-specific (S4-D07) |
| Overlap with S01 | Event.timezone already exists; policy consumes it |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-09 — Quiet hours and frequency caps

| Field | Record |
|-------|--------|
| Native ID | S4-09 |
| Prompt-register ID | `MD-PR-0178` |
| Native title | Quiet hours and frequency caps |
| Purpose | Implement deterministic send eligibility windows. |
| Functional scope | Allowed send time from event/recipient timezone, quiet hours, priority, rolling caps; machine-readable denial/retry. |
| Data/domain entities | ChannelPolicy; eligibility decision |
| UI surfaces | None (engine) |
| Staff role(s) | Policy authors |
| Guest role(s) | Recipients (timing only) |
| External integrations implied | None |
| Communications channel implied | All outbound |
| Dependencies | S4-08 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | DST, midnight, absent timezone; no silent send outside windows |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-10 — Fallback policy engine

| Field | Record |
|-------|--------|
| Native ID | S4-10 |
| Prompt-register ID | `MD-PR-0179` |
| Native title | Fallback policy engine |
| Purpose | Choose safe channel fallback without duplicate contact. |
| Functional scope | Ordered fallback from consent, suppression, validity, enablement, recent outcome, caps. Persist explanation. |
| Data/domain entities | ChannelPolicy.fallbackRules; Message |
| UI surfaces | None (engine) |
| Staff role(s) | Policy authors |
| Guest role(s) | Recipients |
| External integrations implied | None |
| Communications channel implied | Cross-channel only when purpose+consent permit |
| Dependencies | S4-09 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not fall back across purposes or without consent |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-11 — Template model and version lifecycle

| Field | Record |
|-------|--------|
| Native ID | S4-11 |
| Prompt-register ID | `MD-PR-0180` |
| Native title | Template model and version lifecycle |
| Purpose | Implement governed, versioned message templates. |
| Functional scope | Tenant-global and event-local; draft/review/approved/retired; channel variants; locale; purpose; required variables; immutable published versions. |
| Data/domain entities | MessageTemplate, MessageTemplateVersion |
| UI surfaces | Later S4-15 |
| Staff role(s) | Author / reviewer / publisher |
| Guest role(s) | Indirect (receive rendered content) |
| External integrations implied | None |
| Communications channel implied | Per-channel variants |
| Dependencies | S4-02 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Independent reviewer for approve; no in-place edit of approved versions |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse ApprovalPolicy scaffold for review |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-12 — Template variable registry

| Field | Record |
|-------|--------|
| Native ID | S4-12 |
| Prompt-register ID | `MD-PR-0181` |
| Native title | Template variable registry |
| Purpose | Create a typed registry for merge fields. |
| Functional scope | Allowed variables, source entity, type, sensitivity, formatter, null behaviour, channel availability. |
| Data/domain entities | VariableRegistry; template.variableSchema |
| UI surfaces | Editor picker later |
| Staff role(s) | Template authors |
| Guest role(s) | Guest-safe facts only |
| External integrations implied | Event facts / guest / RSVP projections |
| Communications channel implied | Channel availability flags |
| Dependencies | S4-11 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Sensitive variables flagged in preview/audit |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not permit arbitrary code/SQL/object traversal. Unknown ≠ display as truth (HV-EOS-003) |
| Overlap with S01 | Event startsAt/endsAt/timezone/venueSummary exist; MEF slots are not guest-safe by default |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | RSVP status may be a variable only where purpose permits |
| Overlap with later Event OS | Seating/travel/protocol variables only when those domains publish verified guest-safe facts |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-13 — Safe renderer and missing-data policy

| Field | Record |
|-------|--------|
| Native ID | S4-13 |
| Prompt-register ID | `MD-PR-0182` |
| Native title | Safe renderer and missing-data policy |
| Purpose | Render messages deterministically and safely. |
| Functional scope | Escaped rendering, formatters, length checks, missing-variable errors, preview diagnostics; store template version + input hash. |
| Data/domain entities | MessageContentSnapshot |
| UI surfaces | Preview modes |
| Staff role(s) | Authors / approvers |
| Guest role(s) | Guest-facing rendered text |
| External integrations implied | None |
| Communications channel implied | Channel length/policy checks |
| Dependencies | S4-12 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not send when required data unresolved |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Native hospitality structure Action→Time→Location→Context→Detail is content law, not a new domain |
| Overlap with S01 | Only HUMAN_VERIFIED / approved guest-safe facts; UNVERIFIED must block or omit |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-14 — Template management API

| Field | Record |
|-------|--------|
| Native ID | S4-14 |
| Prompt-register ID | `MD-PR-0183` |
| Native title | Template management API |
| Purpose | Expose governed template operations. |
| Functional scope | Event- and tenant-scoped list/detail/create-version/review/approve/retire; filters, pagination, OCC, audit. |
| Data/domain entities | MessageTemplate(+version) |
| UI surfaces | API |
| Staff role(s) | msg.template.* holders |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-11–S4-13; S4-07 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-15 — Template management frontend

| Field | Record |
|-------|--------|
| Native ID | S4-15 |
| Prompt-register ID | `MD-PR-0184` |
| Native title | Template management frontend |
| Purpose | Build the complete operator template workspace. |
| Functional scope | Library, filters, version history, editor, variable picker, validation, preview, review/approval, empty/loading/error, keyboard, responsive. |
| Data/domain entities | Templates |
| UI surfaces | /communications/templates (+ editor) |
| Staff role(s) | Communications Lead / reviewer |
| Guest role(s) | Preview as guest-safe sample only |
| External integrations implied | None |
| Communications channel implied | Channel preview modes |
| Dependencies | S4-14 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not reduce editor to raw textarea |
| Overlap with S01 | Use accepted design system; restrained/premium/calm (HV-EOS-004 hooks) |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-16 — Audience query contract

| Field | Record |
|-------|--------|
| Native ID | S4-16 |
| Prompt-register ID | `MD-PR-0185` |
| Native title | Audience query contract |
| Purpose | Define safe audience selection primitives. |
| Functional scope | Bounded filter DSL for guest/event/RSVP/seating/tags/segments/eligibility. Counts and exclusions without disallowed fields. |
| Data/domain entities | AudienceDefinition |
| UI surfaces | None (contract) |
| Staff role(s) | Audience authors |
| Guest role(s) | Selected guests (as counts/samples later) |
| External integrations implied | None |
| Communications channel implied | Eligibility by channel |
| Dependencies | S4-06; EOS-S02 directory; EOS-S03 RSVP |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not accept raw SQL. Seating mentioned before seating engine exists. |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Guest lifecycle/identity/attention filters |
| Overlap with S03 | Attendance intent / RSVP status filters |
| Overlap with later Event OS | Seating predicates DEFER to EOS-S06; return UNKNOWN/unavailable, do not invent seating truth |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-17 — Audience builder backend

| Field | Record |
|-------|--------|
| Native ID | S4-17 |
| Prompt-register ID | `MD-PR-0186` |
| Native title | Audience builder backend |
| Purpose | Implement previewable, explainable selection. |
| Functional scope | Validate filters; preview eligible/ineligible counts; authorized sample; exclusion reasons; stable order; pagination. |
| Data/domain entities | AudienceDefinition (preview, not snapshot) |
| UI surfaces | API |
| Staff role(s) | msg.audience.preview |
| Guest role(s) | Privacy-minimized samples |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-16 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not persist campaign audience yet |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-18 — Audience builder frontend

| Field | Record |
|-------|--------|
| Native ID | S4-18 |
| Prompt-register ID | `MD-PR-0187` |
| Native title | Audience builder frontend |
| Purpose | Build a usable audience construction flow. |
| Functional scope | Visual filters, live counts, exclusion breakdown, authorized sample, saved segments, reset/undo, validation, event context, a11y. |
| Data/domain entities | AudienceDefinition |
| UI surfaces | /communications/audiences (+ preview) |
| Staff role(s) | Communications Lead |
| Guest role(s) | Sample rows only if permitted |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-17 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Operators must not need the query language |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-19 — Immutable audience snapshots

| Field | Record |
|-------|--------|
| Native ID | S4-19 |
| Prompt-register ID | `MD-PR-0188` |
| Native title | Immutable audience snapshots |
| Purpose | Freeze recipients at approval time. |
| Functional scope | Store included recipients/contact points/eligibility, exclusion reasons, consent/suppression refs, definition hash. Later source changes do not mutate snapshot; may block send via final safety check. |
| Data/domain entities | AudienceSnapshot, AudienceMember |
| UI surfaces | None (service) |
| Staff role(s) | Approvers (consume) |
| Guest role(s) | Snapshot members |
| External integrations implied | None |
| Communications channel implied | Per-member channel eligibility |
| Dependencies | S4-17 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Snapshot content-hash is the approval boundary |
| Human authority | Do not copy unnecessary personal data |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-20 — Campaign aggregate and state machine

| Field | Record |
|-------|--------|
| Native ID | S4-20 |
| Prompt-register ID | `MD-PR-0189` |
| Native title | Campaign aggregate and state machine |
| Purpose | Implement the campaign lifecycle. |
| Functional scope | draft → awaiting_approval → approved → scheduled → dispatching → paused → completed / cancelled / failed. Legal transitions, reasons, versions, audit. Material edits revoke approval. |
| Data/domain entities | Campaign |
| UI surfaces | Later composer |
| Staff role(s) | Campaign authors / runners |
| Guest role(s) | Audience (not yet contacted) |
| External integrations implied | None |
| Communications channel implied | Campaign channel selection |
| Dependencies | S4-19 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No direct DB state mutation from controllers |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-21 — Campaign composer API

| Field | Record |
|-------|--------|
| Native ID | S4-21 |
| Prompt-register ID | `MD-PR-0190` |
| Native title | Campaign composer API |
| Purpose | Create draft and preview operations. |
| Functional scope | Create/update, channel/template, sender, schedule, audience, preview, test-recipient validation, impact summary. Idempotency + OCC. |
| Data/domain entities | Campaign, AudienceDefinition |
| UI surfaces | API |
| Staff role(s) | msg.campaign.manage |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | Selected channels |
| Dependencies | S4-20 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not enqueue real sends |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-22 — Campaign composer frontend

| Field | Record |
|-------|--------|
| Native ID | S4-22 |
| Prompt-register ID | `MD-PR-0191` |
| Native title | Campaign composer frontend |
| Purpose | Build an end-to-end campaign composition experience. |
| Functional scope | Stepped resumable flow: purpose, channels, template/version, audience, schedule, preview, submit. Event scope, autosave, validation, counts, exclusions, quiet-hour adjustment, destructive warnings. |
| Data/domain entities | Campaign |
| UI surfaces | /communications/campaigns composer |
| Staff role(s) | Communications Lead / author |
| Guest role(s) | Preview samples |
| External integrations implied | None |
| Communications channel implied | Multi-channel preview |
| Dependencies | S4-21 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not hide key consequences behind final submission |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-23 — Approval workflow backend

| Field | Record |
|-------|--------|
| Native ID | S4-23 |
| Prompt-register ID | `MD-PR-0192` |
| Native title | Approval workflow backend |
| Purpose | Implement evidence-rich campaign approval. |
| Functional scope | Freeze preview + snapshot; authorized approver; decision/comment/time/content hash/audience hash; invalidate on material change; reject/resubmit. |
| Data/domain entities | CampaignApproval |
| UI surfaces | API |
| Staff role(s) | msg.campaign.approve (not author where SoD configured) |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-19–S4-21; EOS-S01 ApprovalPolicy |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Authors cannot self-approve where separation is configured |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Extend approval scaffold; role ≠ approval |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-24 — Approval inbox frontend

| Field | Record |
|-------|--------|
| Native ID | S4-24 |
| Prompt-register ID | `MD-PR-0193` |
| Native title | Approval inbox frontend |
| Purpose | Build the approver decision surface. |
| Functional scope | Purpose, content by channel, variable examples, audience/exclusions, schedule, policy warnings, diff, approve/reject/comment; explicit ack of blocking warnings. |
| Data/domain entities | CampaignApproval |
| UI surfaces | /communications/approvals |
| Staff role(s) | Independent approver |
| Guest role(s) | Preview only |
| External integrations implied | None |
| Communications channel implied | Channel content panes |
| Dependencies | S4-23 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Approval is not a context-free button |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-25 — Test-send sandbox

| Field | Record |
|-------|--------|
| Native ID | S4-25 |
| Prompt-register ID | `MD-PR-0194` |
| Native title | Test-send sandbox |
| Purpose | Allow safe test delivery without contacting guests. |
| Functional scope | Allowlisted team directory or provider sandbox; TEST watermark; separate metrics; audit every attempt. |
| Data/domain entities | Message (test), DeliveryAttempt |
| UI surfaces | Composer test action |
| Staff role(s) | msg.campaign test-send holders |
| Guest role(s) | Never guests |
| External integrations implied | Synthetic/local adapter only |
| Communications channel implied | Sandbox channels |
| Dependencies | S4-21; adapters later |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No arbitrary or guest-derived test addresses |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Sandbox/fake only; not a production-provider decision |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-26 — Scheduler and due-campaign claiming

| Field | Record |
|-------|--------|
| Native ID | S4-26 |
| Prompt-register ID | `MD-PR-0195` |
| Native title | Scheduler and due-campaign claiming |
| Purpose | Implement reliable scheduled dispatch. |
| Functional scope | Atomic claim of approved due campaigns; event TZ and quiet-hour recalc; concurrent workers; audit. Deterministic clock tests. |
| Data/domain entities | Campaign (scheduled) |
| UI surfaces | None (worker) |
| Staff role(s) | System + run controllers |
| Guest role(s) | None until expansion |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-20; S4-09 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not use in-process timers as durable scheduler |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-27 — Transactional outbox

| Field | Record |
|-------|--------|
| Native ID | S4-27 |
| Prompt-register ID | `MD-PR-0196` |
| Native title | Transactional outbox |
| Purpose | Make dispatch creation atomic with domain state. |
| Functional scope | Write dispatch intents in same transaction as campaign state; relay claiming, lease expiry, retry, idempotency. |
| Data/domain entities | Outbox / dispatch intent |
| UI surfaces | None |
| Staff role(s) | System |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-26 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not publish directly inside request transactions; adapt to PlatformStore atomic replace semantics |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-28 — Message expansion worker

| Field | Record |
|-------|--------|
| Native ID | S4-28 |
| Prompt-register ID | `MD-PR-0197` |
| Native title | Message expansion worker |
| Purpose | Expand snapshots into immutable messages. |
| Functional scope | Render per member; store hashes/refs; final suppression/consent/address checks; one idempotent dispatch or blocked outcome. |
| Data/domain entities | Message, MessageContentSnapshot, MessageAttempt(planned) |
| UI surfaces | None (worker) |
| Staff role(s) | System |
| Guest role(s) | Snapshot members |
| External integrations implied | None |
| Communications channel implied | Per-member channel |
| Dependencies | S4-19; S4-13; S4-06 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not re-query mutable audience membership |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-29 — Delivery attempt and retry engine

| Field | Record |
|-------|--------|
| Native ID | S4-29 |
| Prompt-register ID | `MD-PR-0198` |
| Native title | Delivery attempt and retry engine |
| Purpose | Implement bounded, observable retries. |
| Functional scope | Classify transient/permanent/provider/policy failures; capped exponential backoff+jitter; attempt sequence; dead-letter. |
| Data/domain entities | MessageAttempt, DeliveryEvent |
| UI surfaces | Later ops UI |
| Staff role(s) | Operations |
| Guest role(s) | Recipients (delivery state) |
| External integrations implied | Adapter errors only |
| Communications channel implied | All outbound |
| Dependencies | S4-28 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not retry permanent or policy failures |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-30 — Email sandbox adapter

| Field | Record |
|-------|--------|
| Native ID | S4-30 |
| Prompt-register ID | `MD-PR-0199` |
| Native title | Email sandbox adapter |
| Purpose | Implement the provider-neutral email adapter. |
| Functional scope | Interface, mapping, idempotency key, provider reference, error taxonomy, sandbox fake; attachment/link policy; redact secrets. |
| Data/domain entities | ProviderAccount (sandbox), adapter port |
| UI surfaces | None |
| Staff role(s) | System admin (config later) |
| Guest role(s) | Never real guests |
| External integrations implied | Synthetic email adapter only |
| Communications channel implied | EMAIL |
| Dependencies | S4-29 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | No production credentials or real delivery |
| Provider assumptions | Email channel required; provider (SES/Postmark/SendGrid/Mailgun) NOT selected. Stop at port + fake. |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | G |

### S4-31 — WhatsApp sandbox adapter

| Field | Record |
|-------|--------|
| Native ID | S4-31 |
| Prompt-register ID | `MD-PR-0200` |
| Native title | WhatsApp sandbox adapter |
| Purpose | Implement the provider-neutral WhatsApp adapter. |
| Functional scope | Approved-template identifiers, parameter mapping, conversation-window classification, sandbox fake, status mapping, structured errors. |
| Data/domain entities | ProviderAccount (sandbox) |
| UI surfaces | None |
| Staff role(s) | System admin |
| Guest role(s) | Never real guests |
| External integrations implied | Synthetic WhatsApp adapter only |
| Communications channel implied | WHATSAPP as channel, not Meta Cloud API |
| Dependencies | S4-29 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not bypass template-approval rules |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | WhatsApp is a canonical channel type. Meta/Twilio/360dialog NOT selected. Do not assume availability. |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | G |

### S4-32 — SMS sandbox adapter

| Field | Record |
|-------|--------|
| Native ID | S4-32 |
| Prompt-register ID | `MD-PR-0201` |
| Native title | SMS sandbox adapter |
| Purpose | Implement the provider-neutral SMS adapter. |
| Functional scope | Segment estimation, sender configuration, sandbox fake, status mapping, delivery errors, cost metadata placeholders. |
| Data/domain entities | ProviderAccount (sandbox) |
| UI surfaces | None |
| Staff role(s) | System admin |
| Guest role(s) | Never real guests |
| External integrations implied | Synthetic SMS adapter only |
| Communications channel implied | SMS |
| Dependencies | S4-29 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not silently split over policy limits |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | SMS channel required; Twilio/etc. NOT selected. |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | G |

### S4-33 — Webhook authentication and replay defence

| Field | Record |
|-------|--------|
| Native ID | S4-33 |
| Prompt-register ID | `MD-PR-0202` |
| Native title | Webhook authentication and replay defence |
| Purpose | Secure inbound provider callbacks. |
| Functional scope | Verify signatures/timestamps; raw request hash; reject stale/replay; provider-event idempotency; rotating secrets; mutate only after auth. |
| Data/domain entities | DeliveryEvent (auth gate) |
| UI surfaces | Webhook route (server) |
| Staff role(s) | System |
| Guest role(s) | None |
| External integrations implied | Synthetic signed callbacks only |
| Communications channel implied | All inbound provider events |
| Dependencies | S4-30–S4-32 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not parse or mutate state before authentication succeeds |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Webhook contract is provider-neutral; no production webhook secrets |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | G |

### S4-34 — Delivery status projection

| Field | Record |
|-------|--------|
| Native ID | S4-34 |
| Prompt-register ID | `MD-PR-0203` |
| Native title | Delivery status projection |
| Purpose | Project provider callbacks into message truth. |
| Functional scope | Monotonic accepted/sent/delivered/read/failed/bounced/complained; raw normalized metadata; out-of-order tolerance; idempotent campaign aggregates. |
| Data/domain entities | Message.status, DeliveryEvent, campaign aggregates |
| UI surfaces | Later ops UI |
| Staff role(s) | Operations |
| Guest role(s) | Recipients (status only) |
| External integrations implied | Authenticated adapter events only |
| Communications channel implied | All |
| Dependencies | S4-33 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not regress terminal state due to late callbacks; opened UI/click ≠ delivery proof |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-35 — Delivery operations frontend

| Field | Record |
|-------|--------|
| Native ID | S4-35 |
| Prompt-register ID | `MD-PR-0204` |
| Native title | Delivery operations frontend |
| Purpose | Build delivery monitoring and intervention screens. |
| Functional scope | Run detail, channel/status totals, timeline, searchable outcomes, failure reasons, retry eligibility, pause/cancel, permissioned CSV, live refresh, accessible charts/tables. |
| Data/domain entities | Campaign run, Message |
| UI surfaces | /communications/campaigns/:id/run; /communications/failures |
| Staff role(s) | Communications / operations |
| Guest role(s) | Contact data only if permitted |
| External integrations implied | None |
| Communications channel implied | Per-channel totals |
| Dependencies | S4-34 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-36 — Inbound message ingestion

| Field | Record |
|-------|--------|
| Native ID | S4-36 |
| Prompt-register ID | `MD-PR-0205` |
| Native title | Inbound message ingestion |
| Purpose | Normalize replies from all supported channels. |
| Functional scope | Store authenticated inbound with provider IDs, normalized sender, event hints, content metadata, received time; enqueue resolution; idempotent. |
| Data/domain entities | InboundMessage |
| UI surfaces | None (ingestion) |
| Staff role(s) | System + concierge consumers |
| Guest role(s) | Guest senders (privacy-minimized) |
| External integrations implied | Synthetic inbound only |
| Communications channel implied | EMAIL / WHATSAPP / SMS inbound |
| Dependencies | S4-33 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not log raw sensitive content outside protected storage |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-37 — Inbound identity and event resolution

| Field | Record |
|-------|--------|
| Native ID | S4-37 |
| Prompt-register ID | `MD-PR-0206` |
| Native title | Inbound identity and event resolution |
| Purpose | Resolve replies safely to guest and event context. |
| Functional scope | Match verified contact points, active campaigns, event windows; confidence + evidence; auto-link only above threshold; else unmatched queue. |
| Data/domain entities | InboundMessage.matchStatus; OperationalGuest |
| UI surfaces | Unmatched queue later |
| Staff role(s) | Restricted operators for manual link |
| Guest role(s) | Matched guests |
| External integrations implied | None |
| Communications channel implied | Sender address match |
| Dependencies | S4-36; EOS-S02 matching |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No silent guest creation |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse guest-matching / normalized email-phone; do not guess from name alone |
| Overlap with S03 | May use active invitation/campaign window; do not create guests from inbound |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-38 — Conversation aggregate

| Field | Record |
|-------|--------|
| Native ID | S4-38 |
| Prompt-register ID | `MD-PR-0207` |
| Native title | Conversation aggregate |
| Purpose | Create event-scoped conversation threads. |
| Functional scope | Group inbound/outbound by event, guest/contact, channel policy; assignment, priority, status, SLA clocks, last activity, resolution. Cross-channel links without merging guests. |
| Data/domain entities | ConversationThread |
| UI surfaces | Inbox later |
| Staff role(s) | Concierge / lead |
| Guest role(s) | Thread subject guest |
| External integrations implied | None |
| Communications channel implied | Cross-channel within event+guest |
| Dependencies | S4-36–S4-37 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Conversations not globally visible by default |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Guest signed surfaces remain S03; no guest conversation database |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-39 — Unmatched inbox backend

| Field | Record |
|-------|--------|
| Native ID | S4-39 |
| Prompt-register ID | `MD-PR-0208` |
| Native title | Unmatched inbox backend |
| Purpose | Provide controlled reconciliation operations. |
| Functional scope | Queues/actions: link to guest/event, correction proposal, spam, dismiss, escalate. Reason + audit. Optimistic locking. |
| Data/domain entities | InboundMessage; ContactCorrection (proposal) |
| UI surfaces | API |
| Staff role(s) | msg.inbound.unmatched.* |
| Guest role(s) | Candidates (privacy-minimized) |
| External integrations implied | None |
| Communications channel implied | Inbound channels |
| Dependencies | S4-37 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not create guests silently from inbound |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-40 — Attachments and content safety

| Field | Record |
|-------|--------|
| Native ID | S4-40 |
| Prompt-register ID | `MD-PR-0209` |
| Native title | Attachments and content safety |
| Purpose | Handle inbound files with least privilege. |
| Functional scope | Metadata first; size/type allowlists; quarantine pending scan; signed short-lived access; redact filenames; retention. |
| Data/domain entities | Attachment metadata |
| UI surfaces | Inbox attachment viewer (gated) |
| Staff role(s) | Concierge with attachment permission |
| Guest role(s) | Sender |
| External integrations implied | Local/synthetic object store — NOT Cloudinary/Cloudflare |
| Communications channel implied | Inbound attachments |
| Dependencies | S4-36 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not render active content inline before safety checks |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | No media CDN/provider selected |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-41 — Unified inbox frontend

| Field | Record |
|-------|--------|
| Native ID | S4-41 |
| Prompt-register ID | `MD-PR-0210` |
| Native title | Unified inbox frontend |
| Purpose | Build the primary communications operations workspace. |
| Functional scope | List, filters, SLA/priority, conversation panel, guest/event context drawer, reply composer, assignment, resolution; empty/loading/error/offline; keyboard. |
| Data/domain entities | ConversationThread, FollowUpTask |
| UI surfaces | /communications/inbox (+ workspace) |
| Staff role(s) | Concierge / Communications Lead |
| Guest role(s) | Guest context (guest-safe + role-scoped) |
| External integrations implied | None |
| Communications channel implied | Channel indicators |
| Dependencies | S4-38; S4-43 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not force navigation away to understand guest context |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Context drawer reads directory/guest detail; no second guest DB |
| Overlap with S03 | May show RSVP state; RSVP ≠ admission |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-42 — Unmatched inbox frontend

| Field | Record |
|-------|--------|
| Native ID | S4-42 |
| Prompt-register ID | `MD-PR-0211` |
| Native title | Unmatched inbox frontend |
| Purpose | Build a high-confidence reconciliation workflow. |
| Functional scope | Message evidence, candidate guests/events with reasons, confidence, privacy-minimized details, link/dismiss/escalate; reason for manual link; reversibility. |
| Data/domain entities | Unmatched inbound |
| UI surfaces | /communications/unmatched |
| Staff role(s) | Restricted operator |
| Guest role(s) | Candidates only |
| External integrations implied | None |
| Communications channel implied | Inbound |
| Dependencies | S4-39 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not present a single guessed match as fact |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-43 — Concierge reply workflow

| Field | Record |
|-------|--------|
| Native ID | S4-43 |
| Prompt-register ID | `MD-PR-0212` |
| Native title | Concierge reply workflow |
| Purpose | Enable governed one-to-one operator replies. |
| Functional scope | Draft, channel eligibility, consent/suppression recheck, template/snippet, preview, send authorization, audit, delivery status; escalate before send. |
| Data/domain entities | Message (one-to-one), FollowUpTask, ConversationThread |
| UI surfaces | Inbox reply composer |
| Staff role(s) | Assigned concierge |
| Guest role(s) | Thread guest (receive via sandbox only; no guest conversation DB) |
| External integrations implied | Sandbox adapter |
| Communications channel implied | Eligible reply channel |
| Dependencies | S4-38; S4-06; S4-13 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not reuse bulk-campaign approval where one-to-one policy differs |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | RsvpAssistanceRequest remains RSVP-time capture; a request may open/link a FollowUpTask. Do not reduce concierge to the S03 note field. |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-44 — SLA and escalation engine

| Field | Record |
|-------|--------|
| Native ID | S4-44 |
| Prompt-register ID | `MD-PR-0213` |
| Native title | SLA and escalation engine |
| Purpose | Turn conversation ageing into operational intelligence. |
| Functional scope | First-response and resolution deadlines by event priority, channel, operating hours. Warning/breach/escalation events; assign configured owners idempotently. |
| Data/domain entities | FollowUpTask, CommunicationEscalation |
| UI surfaces | Task queue / inbox indicators |
| Staff role(s) | Owner → lead → Event Director → CEO/client principal where authorised |
| Guest role(s) | None (staff obligation) |
| External integrations implied | None |
| Communications channel implied | Per enquiry class |
| Dependencies | S4-08; S4-38 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No hardcoded Lagos office hours; crisis/compensation/VIP-security/legal require named authority |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Native mentions guest tier; S02 has no VIP/tier model. Do not invent tier. Event-configured SLA only (S4-D07). Family Decision Owner is named-authority config, not a new product. |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Crisis/live-floor escalation is Event-Day command, not S04 ownership |
| Disposition | A |

### S4-45 — Contact correction workflow

| Field | Record |
|-------|--------|
| Native ID | S4-45 |
| Prompt-register ID | `MD-PR-0214` |
| Native title | Contact correction workflow |
| Purpose | Turn delivery failures into reviewed data improvements. |
| Functional scope | Proposals from bounces, invalid numbers, guest replies; authorised review before canonical change; preserve old value and evidence. |
| Data/domain entities | ContactCorrection; OperationalGuest via S02 amend |
| UI surfaces | /communications/contact-corrections |
| Staff role(s) | Guest Data Lead |
| Guest role(s) | Affected guest |
| External integrations implied | None |
| Communications channel implied | Failed channel |
| Dependencies | S4-34; S4-39; EOS-S02 AmendGuest |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not auto-overwrite guest master data; bounce ≠ opt-out |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Approval invokes existing amend/provenance/OCC; future messages only unless governed resend |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-46 — Communications dashboard API

| Field | Record |
|-------|--------|
| Native ID | S4-46 |
| Prompt-register ID | `MD-PR-0215` |
| Native title | Communications dashboard API |
| Purpose | Provide bounded operational summaries. |
| Functional scope | Event-scoped campaign, delivery, response, unresolved, SLA, suppression metrics; freshness; drill-through IDs; privacy/role filters. |
| Data/domain entities | CommunicationMetricSnapshot |
| UI surfaces | API |
| Staff role(s) | msg.analytics.view |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | Aggregates by channel |
| Dependencies | S4-34; S4-44 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not calculate authoritative metrics in the browser |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-47 — Communications dashboard frontend

| Field | Record |
|-------|--------|
| Native ID | S4-47 |
| Prompt-register ID | `MD-PR-0216` |
| Native title | Communications dashboard frontend |
| Purpose | Build an actionable event communications overview. |
| Functional scope | Next scheduled sends, approvals needed, delivery health, replies requiring action, SLA breaches, suppression trends, data-quality alerts. Cards drill to queues; non-chart equivalents. |
| Data/domain entities | Metrics projection |
| UI surfaces | /communications (overview) |
| Staff role(s) | Communications Lead / Event Director |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | Channel health |
| Dependencies | S4-46 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not make the dashboard decorative |
| Overlap with S01 | This is NOT the Event overview / MEF surface (HV-EOS-001 stays off this slice) |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-48 — Guest communication timeline frontend

| Field | Record |
|-------|--------|
| Native ID | S4-48 |
| Prompt-register ID | `MD-PR-0217` |
| Native title | Guest communication timeline frontend |
| Purpose | Embed communications into guest operations. |
| Functional scope | Event-scoped timeline on guest detail: campaigns, one-to-one, delivery outcomes, consent/suppression, conversations; permission-aware redaction. |
| Data/domain entities | Message, Conversation, Consent, Suppression |
| UI surfaces | Existing guest detail + timeline panel |
| Staff role(s) | Directory / concierge |
| Guest role(s) | Subject guest only |
| External integrations implied | None |
| Communications channel implied | All recorded channels |
| Dependencies | S4-34; S4-38; EOS-S02 guest detail |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No other-event communications without cross-event authority |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Extend guest detail; do not create a parallel guest app |
| Overlap with S03 | Show RSVP-linked communications; preserve RSVP ≠ admission |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-49 — Event communication settings frontend

| Field | Record |
|-------|--------|
| Native ID | S4-49 |
| Prompt-register ID | `MD-PR-0218` |
| Native title | Event communication settings frontend |
| Purpose | Build safe event configuration. |
| Functional scope | Channels, sender identity, timezone, locale, quiet hours, caps, fallback, reply routing, SLA, escalation. Inherited values, validation, change impact, audit history. |
| Data/domain entities | ChannelPolicy |
| UI surfaces | /communications/settings |
| Staff role(s) | Event Director / Communications Lead |
| Guest role(s) | None |
| External integrations implied | Sandbox sender refs only |
| Communications channel implied | Enabled channels |
| Dependencies | S4-08 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Unsafe configuration requires warnings and permission |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-50 — Notification centre and deep links

| Field | Record |
|-------|--------|
| Native ID | S4-50 |
| Prompt-register ID | `MD-PR-0219` |
| Native title | Notification centre and deep links |
| Purpose | Surface work requiring human attention. |
| Functional scope | Approval, failure, dead-letter, unmatched, SLA, correction notifications; role-aware deep links; read state; event context. |
| Data/domain entities | In-app notification records (Event OS, not CT notices) |
| UI surfaces | Notification centre + deep links into comms queues |
| Staff role(s) | Role-filtered staff |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-23; S4-35; S4-39; S4-44 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Do not invent RSVP-volatility alerts unless a later policy names the conditions |
| Overlap with S01 | Do not create a second inconsistent alert truth with Control Tower notices |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | RSVP amendment attention is NOT auto-defined here (HV-EOS-005 policy) |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-51 — Communication intelligence rules

| Field | Record |
|-------|--------|
| Native ID | S4-51 |
| Prompt-register ID | `MD-PR-0220` |
| Native title | Communication intelligence rules |
| Purpose | Generate explainable recommendations and alerts. |
| Functional scope | Versioned rules: approval ageing, low reachable audience, high exclusion, quiet-hour conflict, abnormal failure/bounce, reply backlog, SLA risk, contact-data deterioration. Persist evidence, severity, confidence, recommended action. |
| Data/domain entities | Intelligence alert records |
| UI surfaces | Later panels |
| Staff role(s) | Decision-point operators |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-46; S4-44 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Intelligence never sends, approves, or edits data |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | AI cannot update MEF or guest truth |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-52 — Intelligence frontend integration

| Field | Record |
|-------|--------|
| Native ID | S4-52 |
| Prompt-register ID | `MD-PR-0221` |
| Native title | Intelligence frontend integration |
| Purpose | Present recommendations at the decision point. |
| Functional scope | Explainable panels on dashboard, composer, approval, delivery, inbox. Evidence, rule/version, scope, recommended action, acknowledge/resolve/escalate, audit. |
| Data/domain entities | Intelligence alerts |
| UI surfaces | Embedded on S4-22/24/35/41/47 |
| Staff role(s) | Same as host screens |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-51 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | No opaque scores without meaning or action |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-53 — Audit, observability and redaction

| Field | Record |
|-------|--------|
| Native ID | S4-53 |
| Prompt-register ID | `MD-PR-0222` |
| Native title | Audit, observability and redaction |
| Purpose | Make communications diagnosable without leaking secrets. |
| Functional scope | Structured logs/traces/metrics across API, scheduler, outbox, workers, adapters, webhooks; safe correlation; audit privileged reads and state decisions; redaction tests. |
| Data/domain entities | AuditEvent (extend), telemetry |
| UI surfaces | /communications/audit |
| Staff role(s) | Auditor / admin |
| Guest role(s) | Masked |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | EOS-S01 audit; all S04 workers |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not log message bodies, credentials, or full contact values by default |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Extend shared audit; do not replace |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | C |

### S4-54 — Retention, deletion and legal hold

| Field | Record |
|-------|--------|
| Native ID | S4-54 |
| Prompt-register ID | `MD-PR-0223` |
| Native title | Retention, deletion and legal hold |
| Purpose | Implement lifecycle control for communication data. |
| Functional scope | Configurable retention by content, delivery metadata, inbound attachments, audit; legal hold; anonymization/deletion; referential integrity. |
| Data/domain entities | Retention policy refs; legal hold flags |
| UI surfaces | Admin/settings (limited) |
| Staff role(s) | Privacy / admin + legal authority for hold |
| Guest role(s) | Data subjects |
| External integrations implied | None |
| Communications channel implied | Stored content |
| Dependencies | S4-03; S4-40 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not erase required audit; do not keep content indefinitely by accident |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production retention/legal policy is a later authority; implement mechanism on synthetic data only |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Legal hold production use is specialist; mechanism is in-scope |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-55 — Accessibility and responsive frontend audit

| Field | Record |
|-------|--------|
| Native ID | S4-55 |
| Prompt-register ID | `MD-PR-0224` |
| Native title | Accessibility and responsive frontend audit |
| Purpose | Prove the entire Slice 4 UI is operable. |
| Functional scope | All S04 screens desktop/tablet/mobile; keyboard, focus, labels, errors, contrast, zoom, reduced motion, loading/empty/error/offline, SR names. Fix critical/high. |
| Data/domain entities | None new |
| UI surfaces | All S04 screens |
| Staff role(s) | All operator roles |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-15,18,22,24,35,41,42,47–50,52 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Do not declare acceptance from screenshots alone |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Design-system tokens; mobile-first already required |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-56 — Frontend integration and state consistency

| Field | Record |
|-------|--------|
| Native ID | S4-56 |
| Prompt-register ID | `MD-PR-0225` |
| Native title | Frontend integration and state consistency |
| Purpose | Prove the 18-screen operator journey works as one product. |
| Functional scope | E2E: templates, audience, composer, approval, test send, scheduling, monitoring, inbox, unmatched, concierge reply, guest timeline, settings, notifications, intelligence. Event switch resets unsafe state; deep links preserve scope. |
| Data/domain entities | All S04 aggregates |
| UI surfaces | All 18 spec screens |
| Staff role(s) | Full operator journey |
| Guest role(s) | None (staff E2E; guest receive only via sandbox fixtures) |
| External integrations implied | Fakes |
| Communications channel implied | All |
| Dependencies | Prior UI prompts |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Do not use mocked backend for final acceptance |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Event switch must clear unsafe composer/inbox state |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-57 — Security and privacy test campaign

| Field | Record |
|-------|--------|
| Native ID | S4-57 |
| Prompt-register ID | `MD-PR-0226` |
| Native title | Security and privacy test campaign |
| Purpose | Attack Slice 4 trust boundaries. |
| Functional scope | IDOR, cross-event/tenant, privilege escalation, template injection, webhook forgery/replay, export leakage, attachment abuse, rate limits, secrets, audit completeness, contact masking. |
| Data/domain entities | None new |
| UI surfaces | None |
| Staff role(s) | Adversarial tests |
| Guest role(s) | Synthetic only |
| External integrations implied | Forged synthetic webhooks |
| Communications channel implied | All |
| Dependencies | All S04 APIs |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Do not waive unresolved high-severity findings |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-58 — Reliability and load qualification

| Field | Record |
|-------|--------|
| Native ID | S4-58 |
| Prompt-register ID | `MD-PR-0227` |
| Native title | Reliability and load qualification |
| Purpose | Prove bounded operation under realistic peak load. |
| Functional scope | Load-test preview, expansion, dispatch, callbacks, inbox with synthetic data; backpressure, leases, retry storms, duplicate callbacks, recovery objectives. |
| Data/domain entities | None new |
| UI surfaces | None |
| Staff role(s) | Implementer |
| Guest role(s) | Synthetic |
| External integrations implied | Fakes only |
| Communications channel implied | All |
| Dependencies | Workers + APIs |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Do not contact external production providers |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-59 — Clean-room Slice 4 acceptance

| Field | Record |
|-------|--------|
| Native ID | S4-59 |
| Prompt-register ID | `MD-PR-0228` |
| Native title | Clean-room Slice 4 acceptance |
| Purpose | Run the canonical acceptance suite from zero. |
| Functional scope | Clean environment, migrations/seeds, quality gates, full sandbox event scenario, evidence mapped to every S04 acceptance criterion. |
| Data/domain entities | None new |
| UI surfaces | Full sandbox scenario |
| Staff role(s) | Technical reviewer |
| Guest role(s) | Synthetic fixtures only |
| External integrations implied | Fakes |
| Communications channel implied | Sandbox |
| Dependencies | All prior |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Cursor cannot self-accept the slice |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Adapt migrations/seeds to PlatformStore fixtures; no developer-machine or manual DB repair |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | A |

### S4-60 — Staging rehearsal and rollback

| Field | Record |
|-------|--------|
| Native ID | S4-60 |
| Prompt-register ID | `MD-PR-0229` |
| Native title | Staging rehearsal and rollback |
| Purpose | Rehearse release without production contact. |
| Functional scope | Native: deploy to staging with fakes, migrate, smoke/E2E/observability, rollback, kill switches. |
| Data/domain entities | None new |
| UI surfaces | None |
| Staff role(s) | Operations (native) |
| Guest role(s) | None |
| External integrations implied | Native assumes staging host |
| Communications channel implied | Sandbox |
| Dependencies | S4-59 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | Named human authority for approval, send, correction, privileged release |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No staging guest contact |
| Production implications | If S04 is later authorised: local/synthetic rehearsal + dispatch kill-switch only. No Railway. No production credentials. |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | Later programme (MD-PR-S004–S013 wrappers, Railway ADR, production law) forbids Railway mutation and production deploy in Event OS slices. Native staging deploy is superseded. |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Same treatment as historical S3-49 |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | H |

### S4-61 — Independent audit and defect closure

| Field | Record |
|-------|--------|
| Native ID | S4-61 |
| Prompt-register ID | `MD-PR-0230` |
| Native title | Independent audit and defect closure |
| Purpose | Have a fresh pass challenge completeness. |
| Functional scope | Review architecture, contracts, permissions, scoping, UX, tests, runbooks vs spec. Log defects; close blockers/highs with rerun evidence. |
| Data/domain entities | None new |
| UI surfaces | None |
| Staff role(s) | Independent reviewer |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-59 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | GATE-INDEPENDENT remains unsigned; do not self-certify unresolved exceptions |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | Production delivery not authorised; feature-flag/disabled-by-default dispatch |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Protected gate law unchanged |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | None as owner |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | F |

### S4-62 — CEO handover and Slice 4 exit gate

| Field | Record |
|-------|--------|
| Native ID | S4-62 |
| Prompt-register ID | `MD-PR-0231` |
| Native title | CEO handover and Slice 4 exit gate |
| Purpose | Package the accepted slice for ratification. |
| Functional scope | Operator/admin guides, architecture/data-flow, permissions matrix, alert catalogue, test index, known limits, demo script, rollback/runbook, signed exit checklist. Accepted commit is only Slice 5 entry. |
| Data/domain entities | Documentation / evidence pack |
| UI surfaces | None (handover) |
| Staff role(s) | CEO or delegated architecture/acceptance authority |
| Guest role(s) | None |
| External integrations implied | None |
| Communications channel implied | None |
| Dependencies | S4-59–S4-61 |
| Security/privacy | Server-side scope, least privilege, no client-only authority, synthetic/sandbox only |
| Audit/provenance | Immutable consequential audit; correlation IDs; no secret/body logging by default |
| Idempotency | Idempotent consequential actions; optimistic concurrency on mutable records |
| Human authority | CEO/delegated acceptance only; Cursor cannot accept. Do not begin EOS-S05 or enable real guest contact. |
| Validation/test expectations | Positive/negative/permission/event-isolation/idempotency/failure-path; no real delivery |
| Live-event implications | No live guest contact; sandbox/provider-fake only |
| Production implications | S4-D12: production activation is a later explicit gate — not this prompt |
| Provider assumptions | Provider-neutral; no Twilio/SendGrid/WhatsApp Business/SES binding |
| Conflicts/ambiguities | None material |
| Overlap with S01 | Reuse org/event/person/assignment/audit/scope; do not fork |
| Overlap with S02 | Reuse operational guest/household/contact fields; do not fork |
| Overlap with S03 | Link RSVP/invitation/assistance; do not rewrite RSVP truth |
| Overlap with later Event OS | EOS-S05 entry only after acceptance |
| Overlap with Event-Day | Do not own check-in, credentials, FaceGate, or event-day ledger |
| Disposition | F |

## Coverage attestation

- Native prompts extracted: 62
- Native prompts recorded: 62
- Register IDs MD-PR-0170–MD-PR-0231: 62
- Unaccounted native prompts: 0
- Implementation authorised by this document: **NO**
