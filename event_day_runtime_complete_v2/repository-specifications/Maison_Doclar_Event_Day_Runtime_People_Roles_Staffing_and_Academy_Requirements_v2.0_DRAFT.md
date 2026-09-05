**MAISON DOCLAR**

**Event-Day Runtime People, Roles, Staffing and Academy Requirements**

Decision rights, competency, separation of duties and event staffing

MD-OS-EDGE-PEO-002 \| Version 2.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Operating principle

Technology does not remove command responsibility. Each event has one
Event Director, one named technical owner, explicit deputies, documented
handovers and a human decision at every admission, safety, override,
reconciliation and release boundary.

# 1. Role catalogue

| **Role**                   | **Core accountability**                                          | **Must not do alone**                                                |
|----------------------------|------------------------------------------------------------------|----------------------------------------------------------------------|
| CEO                        | Ratify doctrine, risk appetite and production release            | Self-certify independent acceptance                                  |
| Event Director             | Activate/close local authority; operational command; go/no-go    | Change legal/privacy policy or silently waive critical gates         |
| Edge Systems Lead          | Deploy image/package, run server, health, backup and recovery    | Approve own security evidence or reconcile own unexplained conflicts |
| Network Lead               | Survey, VLAN/firewall/AP/power-path readiness                    | Open unapproved internet paths                                       |
| Systems Operator           | Monitor queues/health and execute runbooks                       | Override attendance/access without role authority                    |
| Check-in Lead              | Human identity/eligibility verification and first attendance     | Delegate first admission to FaceGate                                 |
| Check-in Operator          | Authorised initial check-in and optional consent handoff         | Coerce consent or create biometric identity before attendance        |
| Return-Entry Operator      | Evaluate candidate assertion plus current Event OS state         | Treat face match as admission decision                               |
| Biometric/Privacy Steward  | Consent, notices, revocation, retention and incident controls    | Make legal conclusions without qualified authority                   |
| Reconciliation Controller  | Import, classify conflicts, record compensations and certificate | Use last-write-wins or erase local evidence                          |
| Security/Safeguarding Lead | Safety, access and welfare decisions                             | Expose sensitive decisions unnecessarily                             |
| Independent Assessor       | Review test evidence and residual risk                           | Implement the system being independently accepted                    |

# 2. Minimum staffing by tier

| **Role**                  | **E1**                                       | **E2**                          | **E3/E4**                        |
|---------------------------|----------------------------------------------|---------------------------------|----------------------------------|
| Event Director            | 1 + deputy                                   | 1 + deputy                      | 1 + deputy command rotation      |
| Edge Systems Lead         | 1 (may also be Systems Operator if approved) | 1 + 1 operator                  | 1 lead + 2 operators per shift   |
| Network Lead              | On-call after commissioning                  | On-site at peak                 | On-site + relief                 |
| Check-in Lead / operators | 1 / demand model                             | 1 per zone / demand model       | Zone leads + modelled teams      |
| Return-entry / FaceGate   | 1 if enabled                                 | 1 per return lane if enabled    | Dedicated lead and operators     |
| Privacy Steward           | Named/on-call                                | On-site for biometric use       | Dedicated on-site                |
| Reconciliation Controller | Named; post-event                            | 1 separate reviewer             | 2-person control                 |
| Independent Assessor      | Pre-release evidence review                  | Pre-release + rehearsal witness | Full programme and pilot witness |

# 3. RACI for critical decisions

| **Decision**            | **A**                     | **R**                         | **C / evidence**                       |
|-------------------------|---------------------------|-------------------------------|----------------------------------------|
| Package release         | Event Director            | OS planning owner             | Edge Lead; source counts/signature     |
| Cell activation         | Event Director            | Edge + Network Leads          | Check-in Lead; readiness pack          |
| Initial check-in        | Check-in Lead             | Check-in Operator             | Security for exceptions                |
| Biometric enrolment     | Privacy Steward           | Trained enrolment operator    | Guest consent; approved policy         |
| Return entry            | Return-entry Lead         | Return-entry Operator         | Event OS state; security where flagged |
| Primary server recovery | Event Director            | Edge Systems Lead             | Independent second controller          |
| Switch to paper/radio   | Event Director            | Systems Operator + zone leads | Incident record                        |
| Seal local ledger       | Event Director            | Edge Systems Lead             | Reconciliation Controller dual witness |
| Conflict disposition    | Reconciliation Controller | Authorised domain owner       | Security/privacy/finance as relevant   |
| Production release      | CEO                       | Programme owner               | Independent assessor + authorities     |

# 4. Competency requirements

| **Role family**       | **Required demonstrated competence**                                                                                          |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------|
| All operational users | Event scope; login/device security; degraded-state UI; incident reporting; paper fallback; privacy and accessibility          |
| Check-in              | Identity/eligibility verification; duplicate avoidance; initial attendance; exception referral; respectful consent separation |
| Return entry          | Candidate-vs-decision distinction; confidence limits; liveness/spoof caution; manual/QR fallback; non-discrimination          |
| Technical             | Linux/container/database operations; VLAN/firewall; PKI/secrets; restore; ledger integrity; safe evidence capture             |
| Command               | Go/no-go; incident command; degradation thresholds; human welfare; communications; closure                                    |
| Reconciliation        | Idempotency, aggregate versions, conflict classes, compensating actions, evidence chain                                       |
| Assessors             | Test independence, evidence sufficiency, accessibility/security review and residual-risk articulation                         |

# 5. Academy implications

- Create a mandatory Event-Day Local Operations module for every
  deployed role.

- Provide role-specific learning paths for command, technical, check-in,
  return entry, privacy and reconciliation.

- Require practical sign-off, not only multiple-choice completion.

- Critical questions must include: initial check-in cannot be biometric;
  FaceGate cannot admit; venue Wi-Fi loss must not stop core work;
  ambiguous reconciliation cannot be silently overwritten.

- Certification has an expiry, event-tier scope and suspension mechanism
  visible to the Event OS.

- Deployment is blocked when role, event briefing, practical authority
  or certification is absent unless an approved exception exists.

# 6. Shift and handover design

- No critical role operates an entire long event without named relief.

- Handover records package revision, server/backup state, queue depth,
  incidents, temporary approvals, device losses and FaceGate status.

- Outgoing and incoming holders sign; command acknowledges.

- Administrator credentials are personal and not handed over; role
  assignment changes instead.

- Fatigue, hydration, meals and acoustic earpiece hygiene are
  operational controls.

# 7. Incident command

| **Severity** | **Example**                                                              | **Authority / response**                                                                               |
|--------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| S1 Critical  | Safety threat; ledger integrity; suspected biometric breach; split brain | Event Director command; stop affected capability; preserve evidence; CEO/security/privacy notification |
| S2 Major     | Primary node loss; broad LAN failure; large queue                        | Activate recovery/fallback; timed updates; post-event review                                           |
| S3 Moderate  | AP dead zone; single device loss; FaceGate unavailable                   | Contain locally; manual path; record and close                                                         |
| S4 Minor     | Noncritical UI or equipment defect                                       | Log, work around and schedule repair                                                                   |

# 8. Pre-event personnel gates

- Named roster and deputies approved

- Identity, role and device bound in package

- Academy certification and event briefing current

- Role practical observed and passed

- Contact tree, call signs and escalation rehearsed

- Venue walk-through and post assignments complete

- Paper fallback and transcription custody practised

- External contractors sign confidentiality/security obligations

- Known accessibility and welfare arrangements in place

# 9. Post-event duties

1.  Account for people, devices, paper records and removable media.

2.  Resolve or quarantine every client outbox item.

3.  Seal the ledger with dual control.

4.  Conduct reconciliation with domain-owner referrals.

5.  Complete privacy/security/operational incident actions.

6.  Revoke event credentials and return/quarantine assets.

7.  Run hot debrief, then evidence-based after-action review.

8.  Raise doctrine, Academy and OS change proposals with owners and
    deadlines.

# Personnel authorisation

| **Decision**                   | **Name / signature / date** |
|--------------------------------|-----------------------------|
| Role structure approved        |                             |
| Minimum staffing approved      |                             |
| Academy prerequisites approved |                             |
| Event-specific roster approved |                             |
| CEO ratification               |                             |

**Supersession statement**

This v2.0 document forms part of the complete replacement bundle and
supersedes the corresponding v1.0 document. It must be read with the
Departmental Event Package, Device and Surface, Cursor Programme,
People, Hardware and Validation documents.
