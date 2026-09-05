**MAISON DOCLAR**

**Event-Day Runtime Master Validation, Rehearsal and Release Programme**

Laboratory, venue, rehearsal, pilot and release evidence

MD-OS-EDGE-TST-002 \| Version 2.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Test policy

Passing a desktop demo is insufficient. Release requires evidence that
the core works without WAN, under realistic concurrency, after
device/network/power faults and through deterministic reconciliation.
Tests use synthetic or expressly authorised data. Critical defects block
release; waived evidence is not a pass.

# 1. Evidence standard

| **Field**           | **Required content**                                                   |
|---------------------|------------------------------------------------------------------------|
| Test ID and build   | Immutable commit/image/config/package revisions                        |
| Environment         | Hardware IDs, topology, firmware, venue/room and data set              |
| Preconditions       | Named state and dependencies                                           |
| Steps               | Repeatable procedure and fault injection                               |
| Expected / observed | Objective pass criterion and actual result                             |
| Evidence            | Logs, exported configuration, screenshots/video, hashes and timestamps |
| Disposition         | Pass, fail, blocked or accepted residual risk                          |
| Authority           | Executor, witness, retest and independent acceptance signatures        |

# 2. Critical release suites

| **Prefix** | **Suite**               | **Critical pass condition**                                                                                                                                        |
|------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PKG        | Signed package          | Reject corrupt hash/signature, wrong org/event, expiry, downgrade and incompatible schema; valid import is atomic and count-exact.                                 |
| OFF        | WAN-independent core    | Physically remove every WAN before startup and at peak; all declared core workflows continue with no external DNS/CDN/API dependency.                              |
| TEN        | Scope and permission    | Cross-organisation/event/role requests fail server-side and are audited; client manipulation cannot widen scope.                                                   |
| LED        | Ledger and concurrency  | Duplicate operation IDs are idempotent; stale versions conflict; sequence is unique/monotonic; tamper/update/delete attempts fail.                                 |
| OUT        | Client emergency outbox | Encrypted, bounded, restart-safe and visible; replay yields explicit accepted/duplicate/rejected/quarantined status.                                               |
| NET        | LAN and segmentation    | Core capacity/roaming passes; prohibited zone paths fail; venue/guest network cannot reach core; wired command remains.                                            |
| PWR        | Power resilience        | Measured UPS target met; alarms, safe shutdown and restart preserve committed data.                                                                                |
| SRV        | Server recovery         | Failed node is fenced; approved recovery meets RTO/RPO; no split brain or duplicate sequence.                                                                      |
| FAC        | FaceGate return only    | No assertion can create initial attendance; enrolment follows consented human check-in; return assertion is short-lived/signed and never admits autonomously.      |
| REC        | Cloud reconciliation    | Duplicates, divergent duplicates, missing dependency, stale version, schema/policy mismatch and tamper suspicion classify deterministically; certificate balances. |
| SEC        | Security/privacy        | Identity/device revocation, encryption, secrets, admin separation, retention and incident evidence pass; raw biometric data is isolated.                           |
| FAL        | Paper/radio fallback    | Total digital outage transition, custody, later transcription, dual review and provenance complete without loss.                                                   |

# 3. Detailed FaceGate tests

| **ID** | **Scenario**                                 | **Expected result**                                                   |
|--------|----------------------------------------------|-----------------------------------------------------------------------|
| FAC-01 | Unknown person presented at FaceGate         | No first check-in; refer to staffed check-in/manual process           |
| FAC-02 | Known invitee not initially checked in       | Assertion rejected for re-entry; no attendance mutation               |
| FAC-03 | Initial human check-in, no consent           | No enrolment; manual/QR return remains equivalent                     |
| FAC-04 | Consent recorded before initial attendance   | Enrolment blocked                                                     |
| FAC-05 | Valid enrolment and return match             | Candidate shown; authorised operator still chooses disposition        |
| FAC-06 | Expired/stale/replayed assertion             | Rejected and audited                                                  |
| FAC-07 | Wrong event/audience/issuer/signature        | Rejected before lookup/action                                         |
| FAC-08 | Low confidence or multiple candidates        | REFER; no public disclosure; manual verification                      |
| FAC-09 | Consent revoked after enrolment              | Local deny/revocation prevents use; approved deletion workflow begins |
| FAC-10 | Access revoked/safeguarding flag after exit  | Match does not override current operational restriction               |
| FAC-11 | External network/matcher unavailable         | Core unaffected; manual/QR return works within target time            |
| FAC-12 | Attempt to call attendance API from FaceGate | Denied by network, identity and application permissions               |
| FAC-13 | Spoof/presentation attempt                   | No autonomous admission; refer and record security event per policy   |
| FAC-14 | Cross-event template/assertion               | Rejected; no default template reuse                                   |

# 4. Performance and load profile

- Use at least 1.5× forecast active devices and peak transaction rate
  for the chosen event tier.

- Model simultaneous initial check-ins, lookups, requests, incidents,
  exits/returns, health polling and backups.

- Set and ratify p95/p99 response, queue depth, recovery and error-rate
  targets before test; do not invent them after results.

- Sustain representative peak for at least the longest expected arrival
  wave plus recovery interval.

- Repeat while WAN is absent, one AP is lost and external FaceGate
  traffic is failing.

# 5. Network and venue validation

1.  Static survey and configuration review.

2.  Pre-event spectrum/coverage survey.

3.  Walk test every check-in, return, command, service and emergency
    position.

4.  Capacity run with staff devices and representative crowd
    attenuation.

5.  Interference run with production AV, radios and venue systems.

6.  AP loss and roaming run.

7.  All-wireless-loss wired-command and paper/radio run.

8.  Firewall scan from every zone and configuration-export comparison.

# 6. Power, server and storage faults

| **Fault**                 | **Evidence required**                                                |
|---------------------------|----------------------------------------------------------------------|
| Pull WAN                  | Core transaction trace and dependency log                            |
| Remove one AP/uplink      | Client impact, failover time and operational workaround              |
| Cut mains                 | UPS telemetry, runtime and safe state                                |
| Hard-stop primary process | Transaction recovery, ledger continuity and health alert             |
| Primary host failure      | Fencing proof, recovery approval, RTO/RPO and hash/count comparison  |
| Disk pressure             | Warning thresholds, write protection and recovery                    |
| Clock drift               | Visible degraded state and timestamp treatment                       |
| Restore backup            | Clean host restore, package/revision identity and transaction totals |

# 7. Reconciliation test matrix

| **Case**                              | **Required disposition**                                                   |
|---------------------------------------|----------------------------------------------------------------------------|
| Exact retry                           | DUPLICATE_IDENTICAL; no second effect                                      |
| Same operation ID, different hash     | DIVERGENT_DUPLICATE; quarantine and security review                        |
| Expected version equals cloud version | APPLY                                                                      |
| Expected version stale                | VERSION_CONFLICT; authorised review                                        |
| Dependency absent                     | DEPENDENCY_MISSING; hold until resolved                                    |
| Unknown schema/policy                 | SCHEMA_OR_POLICY_MISMATCH; do not coerce                                   |
| Invalid actor/device authority        | INVALID_AUTHORITY; reject/quarantine per policy                            |
| Broken ledger/hash/signature          | TAMPER_SUSPECT; stop and preserve evidence                                 |
| All processed                         | Certificate counts equal sealed manifest and final cloud revision recorded |

# 8. Human and accessibility tests

- Role-based usability under time pressure, glare, noise and queues

- Keyboard-only and screen-reader checks for command/admin paths

- Colour-independent status and clear unknown/degraded states

- Large-text/reflow and touch-target checks on supported devices

- Respectful biometric decline and failure pathway without public
  disclosure

- Fatigue/shift handover and deputy activation

- Paper legibility, numbering, custody and transcription accuracy

- Guest journey timing for standard, accessibility-assisted and
  exception cases

# 9. Validation stages

| **Stage**        | **Purpose**                                          | **Exit gate**                                  |
|------------------|------------------------------------------------------|------------------------------------------------|
| Component/CI     | Typed contracts, unit, migration and security checks | Green baseline and reproducible build          |
| Integrated lab   | Full topology, synthetic load and injected faults    | All critical suites pass or blocked explicitly |
| Venue survey     | Physical/radio/power/environment suitability         | Signed design and revised BOM                  |
| Dress rehearsal  | People, routes, queues, fallback and command         | Event Director accepts readiness evidence      |
| Shadow event     | System observes or supports without sole reliance    | Thresholds and workload validated              |
| Controlled pilot | Restricted production scope with immediate fallback  | Independent evidence and residual risk         |
| Scaled release   | Approved tiers/configurations only                   | Independent acceptance + CEO signature         |

# 10. Release blockers

- Any path permits FaceGate to create initial attendance or admit
  autonomously

- Core workflow requires WAN, external DNS/CDN or venue Wi-Fi

- Cross-tenant/event access succeeds

- Ledger can be mutated or reconciliation silently overwrites ambiguity

- Split-brain is possible in the approved recovery procedure

- Paper/manual fallback is absent or untested

- Critical accessibility/safety/privacy defect remains

- Biometric legal/privacy/specialist approval is absent where FaceGate
  is enabled

- Evidence cannot be tied to the released commit, image, package and
  configuration

# 11. Test execution register

| **Suite** | **Owner** | **Witness** | **Status** | **Evidence ID** |
|-----------|-----------|-------------|------------|-----------------|
| PKG       |           |             | NOT RUN    |                 |
| OFF       |           |             | NOT RUN    |                 |
| TEN       |           |             | NOT RUN    |                 |
| LED       |           |             | NOT RUN    |                 |
| OUT       |           |             | NOT RUN    |                 |
| NET       |           |             | NOT RUN    |                 |
| PWR       |           |             | NOT RUN    |                 |
| SRV       |           |             | NOT RUN    |                 |
| FAC       |           |             | NOT RUN    |                 |
| REC       |           |             | NOT RUN    |                 |
| SEC       |           |             | NOT RUN    |                 |
| FAL       |           |             | NOT RUN    |                 |

# 12. Final acceptance

| **Gate**                                 | **Decision / signature / date** |
|------------------------------------------|---------------------------------|
| Technical lead recommends                |                                 |
| Event Director rehearsal acceptance      |                                 |
| Privacy/biometric authority (if enabled) |                                 |
| Independent assessor acceptance          |                                 |
| Residual risks accepted                  |                                 |
| CEO production authorisation             |                                 |

**Supersession statement**

This v2.0 document forms part of the complete replacement bundle and
supersedes the corresponding v1.0 document. It must be read with the
Departmental Event Package, Device and Surface, Cursor Programme,
People, Hardware and Validation documents.
