**MAISON DOCLAR**

**Canonical Event-Day Runtime Blueprint**

Local-first, fault-tolerant Event OS execution and cloud reconciliation

MD-OS-EDGE-CAN-002 \| Version 2.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Document control

| **Field**                    | **Controlled value**                                                                                         |
|------------------------------|--------------------------------------------------------------------------------------------------------------|
| Authority                    | CEO (ratification); Event Director (per-event activation and closure)                                        |
| Canonical relationship       | Subordinate to the ratified Event OS blueprint and CEO doctrine; supersedes conflicting edge-runtime notes   |
| Applies to                   | Event OS event-day operations, local event cells, approved external-service gateways and reconciliation      |
| Not authorised by this draft | Production deployment, legal conclusions, biometric processing, vendor purchase or live-event release        |
| Review triggers              | Material architecture, law/policy, identity, biometric, ledger, reconciliation, network or event-tier change |

# Executive decision

Maison Doclar should adopt a temporary event-scoped local execution cell
for every event whose consequence rating makes loss of cloud
connectivity unacceptable. The cell is not a second permanent product:
it is a controlled deployment mode of the Event OS, created from a
signed cloud package, operated locally during the event, sealed at
closure and deterministically reconciled back into the cloud record.

FaceGate is explicitly bounded. Initial admission and attendance
creation are always performed by an authorised human. If policy, lawful
basis, explicit consent and event configuration permit, biometric
enrolment may occur after that initial check-in. On a later return,
FaceGate may provide a signed, short-lived candidate match; the Event OS
and an authorised operator make the re-entry decision.

# 1. Outcome and non-negotiable laws

- Core work must start and continue with the WAN physically
  disconnected.

- One active local service is the event-day write authority; clients
  never merge shared truth independently.

- Every consequential command is atomic with its domain change,
  immutable ledger entry and reconciliation outbox item.

- Organisation and event scope are enforced by the server, not trusted
  from the client.

- Network location does not replace identity, authorisation, encryption
  or audit.

- Unknown health is not green. Degraded operation is visible and owned.

- No last-write-wins for attendance, access, safeguarding, incidents,
  payments, consent or authorisation.

- Paper, radio and controlled transcription remain the final fallback.

# 2. Scope boundary

| **Inside the offline core**                                                                                                                                                                                             | **Outside or isolated**                                                                                                                                        |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Signed package import; local identity and device enrolment; guest lookup; initial human check-in; seating/access; staff assignment; guest requests; incidents; service recovery; command log; local backup; seal/export | Campaigns; general browsing; bulk communications; cloud administration; remote analytics; vendor APIs; venue guest Wi-Fi; FaceGate matcher and biometric store |
| Locally served UI assets and APIs; event-scoped snapshot; append-only ledger; health console                                                                                                                            | Optional services may fail without changing core availability; only approved messages cross the gateway                                                        |

# 3. Authority through the event lifecycle

| **Phase**       | **Authoritative record**       | **Permitted writes**                                                |
|-----------------|--------------------------------|---------------------------------------------------------------------|
| Planning        | Cloud Event OS                 | Normal planning changes                                             |
| Frozen/released | Signed event package           | No silent baseline changes; a replacement package requires approval |
| Active event    | Local edge runtime             | Approved event-day commands only                                    |
| Closing/sealed  | Sealed local ledger            | No normal writes; emergency reopen is exceptional and audited       |
| Reconciliation  | Cloud reconciliation processor | Idempotent apply, explicit reject or quarantine                     |
| Complete        | Cloud Event OS                 | Permanent reconciled record and certificate                         |

# 4. Reference topology

The deployment uses routed security zones. “Bridge” means an
authenticated application gateway—not a layer-2 bridge that joins trust
zones.

| **Zone**          | **Typical assets**                                                                              | **Permitted relationship**                                         |
|-------------------|-------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| Core operations   | Primary edge server, standby/recovery server, command laptops, approved staff tablets, core APs | Local DNS/NTP/API only; deny direct internet by default            |
| External services | FaceGate appliance, carrier routers, vendor connectors                                          | Internet as needed; only signed allow-listed assertions to gateway |
| Management        | Network controller, server administration console, monitoring                                   | Named administrators, separate credentials and devices             |
| Guest/venue       | Venue Wi-Fi and attendee access                                                                 | No route to core; never a fallback SSID for staff operations       |

# 5. Package and activation state machine

Required lifecycle: DRAFT → FROZEN → SIGNED → IMPORTED → VERIFIED →
ARMED → ACTIVE → CLOSING → SEALED → RECONCILING → RECONCILED →
RETAINED/DESTROYED. No state is skipped.

| **Gate**  | **Minimum evidence**                                                                                                               |
|-----------|------------------------------------------------------------------------------------------------------------------------------------|
| SIGN      | Schema and source revision; manifest; per-file SHA-256 hashes; signing identity; issue and expiry; capability list; package counts |
| VERIFY    | Signature; hashes; schema compatibility; correct organisation/event; non-expiry; no downgrade; atomic import and count comparison  |
| ARM       | Device/user roster; local time; backup target; network/UPS health; role permissions; Event Director approval                       |
| ACTIVATE  | Opening checklist, command path, paper fallback, FaceGate mode declaration and unresolved blockers clear                           |
| SEAL      | Writers drained; client outboxes resolved; final sequence and hash; backup/export created; dual control                            |
| RECONCILE | Authenticated upload; idempotent application; conflicts cleared or accepted as residual risk; certificate issued                   |

# 6. Minimum event package

- Manifest and detached signature

- Organisation, event, venue, timezone, package revision and source
  revision

- Event-scoped guest operational projection and identifiers

- Current attendance baseline and check-in eligibility

- Seating, zones, credentials and access rules

- Staff assignments, roles, devices and locally valid credentials

- Operational schedule, critical moments, requests, incidents and
  recovery codes

- Approved policy versions and feature flags

- No marketing history, unrelated events, raw secrets or unnecessary
  personal data

# 7. Local command and ledger model

All UI actions submit typed commands to the local service. The service
validates identity, role, event, aggregate version, current state and
policy; writes the domain projection, immutable ledger and sync outbox
in one database transaction; then returns a stable operation ID and
resulting version.

| **Required field**                 | **Purpose**                                              |
|------------------------------------|----------------------------------------------------------|
| operationId (UUID)                 | Idempotency across retries                               |
| organisationId + eventId           | Hard scope boundary                                      |
| aggregateType + aggregateId        | Conflict and replay unit                                 |
| serverSequence                     | Monotonic event ordering issued only by edge authority   |
| serverTime + clientObservedTime    | Authoritative and diagnostic timing                      |
| actorId + deviceId                 | Accountability                                           |
| commandType + payload hash         | Meaning and tamper evidence                              |
| expectedVersion + resultingVersion | Optimistic concurrency                                   |
| packageRevision + policyVersion    | Doctrine/baseline provenance                             |
| priorEntryHash + entryHash         | Integrity chain; not a substitute for signatures/backups |

# 8. Device disconnection

A device emergency outbox is permitted only for temporary loss of the
local edge API. It must be encrypted, size/time bounded, visibly pending
and restricted to approved command types. On reconnection, every item
receives ACCEPTED, DUPLICATE, REJECTED or QUARANTINED; the UI must never
turn uncertainty into success.

# 9. FaceGate return-entry contract

1.  An authorised operator verifies the guest and records the first
    check-in in the Event OS.

2.  Only after initial check-in, the operator presents an approved
    consent notice and records affirmative consent. Declining cannot
    prejudice service.

3.  Where enabled, a separated biometric component creates an
    event-scoped template with expiry and revocation controls; the
    operational ledger stores references and evidence, not unnecessary
    raw imagery.

4.  When the guest leaves, an authorised operator records exit or
    outside status if the event policy requires it.

5.  On return, FaceGate produces a signed candidate assertion containing
    event, subject candidate, capture/assertion IDs, confidence, device,
    issued and expiry times, and consent/policy references.

6.  The Event OS gateway checks signature, issuer, audience,
    nonce/replay, event, expiry, initial attendance, consent, access
    entitlement, revocation and safeguarding state.

7.  An authorised re-entry operator sees candidate plus current
    operational facts and records ADMIT, REFER or DENY with reason.
    FaceGate itself cannot admit, deny or write attendance.

8.  QR, name/phone lookup and supervised manual verification remain
    available when biometrics are declined, uncertain or unavailable.

| **FaceGate must never**                 | **Required control**                                         |
|-----------------------------------------|--------------------------------------------------------------|
| Perform first check-in                  | Reject assertion when no human initial attendance exists     |
| Auto-open a gate or mark admitted       | Operator decision token required for re-entry ledger command |
| Become mandatory                        | Equivalent non-biometric return path                         |
| Reuse identity across events by default | Event-scoped template and explicit policy                    |
| Remain active after consent revocation  | Near-real-time revocation and local deny cache               |
| Send raw templates into the core ledger | Separated biometric store; reference-only audit              |

# 10. Reconciliation protocol

9.  Close normal work and resolve device outboxes.

10. Seal ledger with event ID, first/final sequence, counts, Merkle or
    manifest root, hashes and dual-control signatures.

11. Create encrypted reconciliation bundle and a separately stored
    backup.

12. Upload through authenticated resumable transport; server verifies
    package, schema, signature, scope and hashes.

13. Process operations idempotently by operation ID and expected
    aggregate version.

14. Classify every item as duplicate-identical, applicable,
    dependency-missing, version-conflict, divergent-duplicate,
    invalid-authority, schema/policy mismatch or tamper-suspect.

15. Quarantine ambiguity for a Reconciliation Controller; never
    overwrite silently.

16. Issue a reconciliation certificate tying imported counts,
    rejected/quarantined counts and final cloud revision to the sealed
    bundle.

17. Retain or securely destroy local data only after policy gates and
    evidence are satisfied.

# 11. Security, privacy and safety

- TLS on every zone crossing and encrypted local storage/backups

- Device certificates or equivalent possession-bound enrolment plus
  named users

- Short local credential lifetime bounded by the event; revocation list
  included in the package

- No shared administrator accounts; emergency access is time-limited and
  reviewed

- Firewall default deny, management isolation, protected switch ports
  and logged configuration export

- Data minimisation, purpose limitation, approved retention,
  access/export/deletion workflows

- Biometric DPIA/legal review and specialist approval remain release
  blockers

- Secure boot/TPM where feasible, signed images, pinned dependencies and
  SBOM

- Logs redact sensitive payloads while preserving accountability

- Safety decisions and human welfare override digital convenience

# 12. Health and operator experience

| **Signal**       | **Green requires**                                       | **Degraded/blocked response**                        |
|------------------|----------------------------------------------------------|------------------------------------------------------|
| Package          | Verified, correct revision, unexpired                    | Block activation                                     |
| Server/database  | Single active writer, healthy storage/transactions       | Move to documented recovery; prevent split brain     |
| Ledger/outbox    | Sequence continuous, hash valid, queues within threshold | Stop affected writes or quarantine                   |
| Time             | Approved source and drift within event threshold         | Flag timestamps; correct under control               |
| Network          | Expected core clients/APs reachable; wired command path  | Reposition/fail over AP; use cable or paper fallback |
| Power            | UPS healthy with tested runtime                          | Shed noncritical loads; controlled shutdown          |
| External gateway | Signed assertions and revocation current                 | Disable FaceGate; manual return workflow             |
| Backup           | Recent verified backup and available restore target      | Create/verify before continuing at risk              |

# 13. Failure response matrix

| **Failure**               | **Core behaviour**                         | **Operator action**                                                                    |
|---------------------------|--------------------------------------------|----------------------------------------------------------------------------------------|
| Venue internet/cloud loss | No impact to core LAN transactions         | Confirm isolation; record start/end; pause only external services                      |
| One AP loss               | Clients roam or move to wired/alternate AP | Declare dead zone and reposition staff                                                 |
| All wireless loss         | Wired command stations remain              | Switch mobile teams to radio/paper and controlled runners                              |
| Primary edge failure      | No automatic dual writer                   | Fence failed node; activate tested recovery from last durable state under dual control |
| Client lost/stolen        | Revoke device and user locally             | Security incident; rotate credentials where required                                   |
| FaceGate unavailable      | Return entry remains operational           | Use QR/manual lookup; record degraded mode                                             |
| Power interruption        | UPS maintains or allows safe shutdown      | Start power runbook; preserve server/switch/APs first                                  |
| Ledger integrity alert    | Consequential writes stop or isolate       | Preserve evidence; activate incident command                                           |
| Total digital loss        | Paper/radio mode                           | Timestamp, sign and later transcribe with provenance                                   |

# 14. Deployment and repository integration

The repository pack delivered with this blueprint contains
TypeScript/Zod contracts, migration reference, environment-safe example
configuration, ADRs, security and reconciliation specifications,
runbook, acceptance catalogue and Cursor programme E0–E11. Cursor must
inspect the actual OS repository and adapt these contracts to its
existing conventions; the reference migration is not authorised to run
unchanged.

| **Repository path**          | **Use**                                                          |
|------------------------------|------------------------------------------------------------------|
| docs/canonical               | Adopt as controlled subordinate blueprint                        |
| docs/architecture + security | Architecture review and threat boundary                          |
| docs/specifications          | Domain/ledger/package implementation                             |
| docs/integrations            | FaceGate return-only contract                                    |
| docs/reconciliation          | Cloud import and conflict handling                               |
| contracts/\*.ts              | Typed shared contract starting point                             |
| db/migrations                | Reference schema; convert through repository migration framework |
| config                       | Non-secret configuration shape                                   |
| prompts                      | Execute E0–E11 one prompt at a time                              |
| tests                        | Acceptance source and evidence catalogue                         |

# 15. Release sequence

18. Ratify architecture and FaceGate boundary.

19. Run E0 repository preflight; reconcile contradictions before code.

20. Complete E1–E7 core local runtime and prove WAN-independent
    operation.

21. Complete E8 only after privacy/biometric authority permits
    development and testing.

22. Complete E9–E10 reconciliation and deployment/recovery.

23. Execute the Master Test Programme in lab, venue rehearsal and
    controlled pilot.

24. Independent assessor reviews evidence and unresolved risks.

25. CEO signs production release for a stated event tier and
    configuration.

# 16. External standards and interpretation

The blueprint uses zero-trust and segmentation principles: trust is not
granted merely because a device is on a local network, and
communications cross explicit policy enforcement points. It also uses
trusted device-onboarding principles and controlled software-update
practices. These sources inform engineering controls; they do not
certify this implementation.

| **Source**                                                                            | **Use**                                                                                                                 |
|---------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| NIST SP 800-207, Zero Trust Architecture                                              | Identity/device-centric access; no implicit network trust — https://csrc.nist.gov/pubs/sp/800/207/final                 |
| NIST SP 1800-36, Trusted IoT Device Network-Layer Onboarding and Lifecycle Management | Device onboarding and lifecycle control — https://www.nccoe.nist.gov/publication/1800-36/VolA/index.html                |
| NIST SP 800-40 Rev. 4, Guide to Enterprise Patch Management Planning                  | Governed update/patch planning — https://csrc.nist.gov/pubs/sp/800/40/r4/final                                          |
| OWASP ASVS                                                                            | Application security verification reference — https://owasp.org/www-project-application-security-verification-standard/ |

# CEO ratification

| **Decision**                                         | **Name / signature / date** |
|------------------------------------------------------|-----------------------------|
| Architecture approved                                |                             |
| FaceGate return-entry boundary approved              |                             |
| External legal/privacy/specialist gates acknowledged |                             |
| Authorised event tiers                               |                             |
| Conditions or exceptions                             |                             |

**Supersession statement**

This v2.0 document forms part of the complete replacement bundle and
supersedes the corresponding v1.0 document. It must be read with the
Departmental Event Package, Device and Surface, Cursor Programme,
People, Hardware and Validation documents.
