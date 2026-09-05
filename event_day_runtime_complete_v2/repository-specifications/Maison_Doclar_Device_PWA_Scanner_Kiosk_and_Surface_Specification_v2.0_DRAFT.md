**MAISON DOCLAR**

Device, PWA, Scanner, Kiosk and Surface Specification

Provisioned device classes and exact event-day interaction behaviour

MD-OS-DEV-002 \| Version 1.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Executive decision

Maison Doclar should use one shared local API and design system, but not
one unrestricted interface. Managed laptops, tablets, phones, kiosks,
dedicated scanners and isolated FaceGate equipment receive generated
event-scoped device profiles. PWA delivery is appropriate for most staff
surfaces; fixed high-volume scanning and specialist hardware require
dedicated HID scanners or a hardened native/container shell.

# 1. Device creation and trust lifecycle

1.  Register the physical asset, serial/model/OS, custodian and
    supported capabilities.

2.  Security-check and enrol the asset into device management where
    available.

3.  Generate a non-exportable device key pair on the device.

4.  Issue an event-bounded device certificate or possession-bound
    credential.

5.  Assign one device class and a least-privilege capability manifest.

6.  Assign permitted users, posts and event; user authentication remains
    separate.

7.  Include the approved device profile and revocation state in the
    signed package.

8.  At venue admission, verify certificate, event, device state, user,
    role and current time.

9.  Record actorId and deviceId on every command.

10. Revoke locally on loss, transfer, compromise or role change.

11. At closure, expire credentials, account for the asset, export
    required evidence and wipe event data under policy.

# 2. Device classes and delivery model

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Class / device</strong></th>
<th><strong>Purpose and authority</strong></th>
<th><strong>Delivery</strong></th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Command primary/deputy<br />
Managed laptop; wired</td>
<td>Full command, health, incident, degradation, closure; distinct
authority</td>
<td>Responsive local web + installed shell</td>
</tr>
<tr class="even">
<td>Registration fixed<br />
Laptop/tablet + HID 2D scanner</td>
<td>Initial human check-in, companion, credential, exception</td>
<td>Local web/PWA; HID first, camera backup</td>
</tr>
<tr class="odd">
<td>Registration mobile<br />
Managed tablet/phone</td>
<td>Mobile check-in under assigned entrance/zone</td>
<td>PWA or hardened Android shell</td>
</tr>
<tr class="even">
<td>Queue greeter<br />
Compact phone</td>
<td>Lookup, route, flag assistance; no final exception</td>
<td>PWA</td>
</tr>
<tr class="odd">
<td>Protocol<br />
Tablet/phone</td>
<td>Arrival watchlist, verified address/escort/precedence</td>
<td>PWA with restricted data</td>
</tr>
<tr class="even">
<td>Usher<br />
Managed phone</td>
<td>Guest/table/route lookup, requests, haptic alerts, incident
initiate</td>
<td>PWA</td>
</tr>
<tr class="odd">
<td>Department lead<br />
Tablet</td>
<td>Team/posts, readiness, requests, incidents, handover</td>
<td>PWA</td>
</tr>
<tr class="even">
<td>Return entry<br />
Staffed tablet/workstation + scanner</td>
<td>Current attendance/access; FaceGate candidate; human decision</td>
<td>PWA/native shell</td>
</tr>
<tr class="odd">
<td>Self-scan kiosk<br />
Locked tablet/touchscreen + scanner</td>
<td>Find invitation, select assistance, route to staff; no
admission</td>
<td>Kiosk browser/native shell</td>
</tr>
<tr class="even">
<td>Systems/network<br />
Hardened laptop</td>
<td>Local administration, health, evidence, recovery</td>
<td>Separate management client</td>
</tr>
<tr class="odd">
<td>FaceGate gateway<br />
Isolated appliance/service</td>
<td>Signed candidate assertions only</td>
<td>Vendor component + allow-list gateway</td>
</tr>
<tr class="even">
<td>Reconciliation<br />
Hardened laptop</td>
<td>Seal verification, upload, conflict review, certificate</td>
<td>Cloud/local admin web</td>
</tr>
</tbody>
</table>

# 3. PWA requirements

- Install and validate before event day; application shell and approved
  assets are locally available.

- No external fonts, CDN scripts, analytics or internet runtime
  dependency.

- Data comes from the edge API; browser cache is not the system of
  record.

- Display organisation, event, package revision, user, device and post.

- Distinguish WAN loss from local-server loss.

- Use encrypted bounded emergency outbox only for allowed commands and
  show each pending item.

- Do not rely on background sync for guaranteed writes; foreground
  acknowledgements are authoritative.

- Use responsive targets, keyboard operation, screen-reader semantics,
  colour-independent states and sunlight/high-noise usability.

- Updates are pinned per event; no silent service-worker upgrade during
  ACTIVE.

- Lock/wipe event content after closure under policy.

# 4. Scanning channels

| **Channel**              | **Use**                       | **Control**                                                                               |
|--------------------------|-------------------------------|-------------------------------------------------------------------------------------------|
| Dedicated HID 2D scanner | Primary high-volume desk scan | Inputs opaque token like keyboard; paired/fixed; validate length/format/rate              |
| Device camera QR         | Mobile/backup scan            | Use tested library/native capability; permission and torch/focus states; never sole route |
| Manual invitation code   | Damaged/no-camera fallback    | Rate-limited, masked and audited                                                          |
| Name/phone lookup        | No token or assistance        | Cautious matching; additional verification before mutation                                |
| Self-scan                | Queue pre-processing          | Safe result only; operator completes admission                                            |
| NFC credential           | Optional later use            | Explicit supported-device matrix; no untested Web NFC dependency                          |

# 5. Universal scan state machine

READY → SCANNING/SEARCHING → RESULT → CONFIRMING → SUBMITTING → SUCCESS.
Alternative states: NOT_FOUND, MULTIPLE_MATCHES, ALREADY_PROCESSED,
INELIGIBLE, REFER, DENIED, STALE, DEGRADED_LOCAL, LOCAL_SERVER_LOST,
PENDING_OUTBOX, CONFLICT, ERROR and LOCKED. Every state specifies
permitted next actions and safe public wording.

# 6. What each surface shows after a scan

| **Surface**           | **Exact match display**                                                                                                                                 | **Exception display / action**                                                                                                           |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Registration operator | Name; masked secondary identifier; invitation/companion status; current attendance; credential/access summary; table; necessary flags; Confirm Check-in | Not found: retry/manual/lead. Duplicate: current state and permitted correction. Restricted: neutral “Refer to lead”; no public reason.  |
| Queue greeter         | Name; correct entrance/desk; assistance owner; queue instruction                                                                                        | Only safe routing; cannot show restriction details or check in.                                                                          |
| Protocol              | Verified display name/title; protocol category; escort owner; arrival treatment; current arrival state                                                  | Unverified/expired doctrine shown prominently; refer to Protocol Lead.                                                                   |
| Usher                 | Name; table/seat/zone; accessible route; assigned service note; navigation action                                                                       | Ambiguous: ask neutral verification question; restricted data hidden.                                                                    |
| F&B lead              | Name/table; meal entitlement; coded dietary/allergy instruction needed for service                                                                      | Safety-critical uncertainty blocks service and escalates; diagnosis not displayed.                                                       |
| Security/access       | Name/photo only if authorised; attendance; credential zones; current restrictions; verification evidence                                                | No match/revocation/restriction → refer; reason revealed only to authorised role.                                                        |
| Return-entry operator | Name; initial check-in proof; outside/return state; access; consent status; candidate confidence/expiry; verification channels; ADMIT/REFER/DENY        | No initial check-in, stale assertion, low confidence, revoked consent or policy restriction → no biometric decision; manual/QR referral. |
| Self-scan kiosk       | First name or masked confirmation; “Invitation found”; assigned desk/queue; assistance choice                                                           | Neutral “We need a colleague to assist”; prints/displays queue token, never rejection reason.                                            |
| Command               | Aggregate flow, zone/queue, exception class, device and performance telemetry                                                                           | Individual sensitive detail only through authorised drill-down with audit.                                                               |

# 7. Search behaviour

- Exact QR/token first; exact invitation code next; exact/normalised
  name before fuzzy name.

- Phone search should normally accept the final four digits plus another
  verifier.

- Preserve Yoruba and other diacritics in display while maintaining
  controlled normalised tokens.

- Never auto-select an ambiguous fuzzy match.

- Mask guest list results according to role and proximity risk.

- Record scan/lookup channel and final verification method.

- Rate-limit broad searches and audit repeated enumeration behaviour.

- A search result is not permission to perform the next action.

# 8. Feedback, haptics and alerts

| **Cue**                    | **Visual**                                                     | **Haptic/audio**                          |
|----------------------------|----------------------------------------------------------------|-------------------------------------------|
| Successful local receipt   | Green confirmation plus operation/reference ID                 | One short vibration; optional soft tone   |
| Warning/referral           | Amber; reason category and next action                         | Two pulses                                |
| Urgent assignment/incident | Red, persistent, owner/timer                                   | Three pulses plus radio/escalation policy |
| Local server lost          | Distinct offline-to-edge banner; pending actions count         | One long vibration                        |
| WAN lost only              | Small external-services degraded indicator; core remains ready | No disruptive cue                         |
| Scan failure               | Camera framing/torch/retry and manual options                  | No error vibration loop                   |

# 9. Self-scanner boundary

- A kiosk may identify an invitation, create an arrival signal, select
  assistance and issue a routing/queue token.

- It may not create initial attendance, resolve duplicates, add
  companions, disclose sensitive restrictions, enrol biometrics
  unattended or issue unrestricted credentials.

- A privacy screen, short inactivity timeout, automatic clearing and
  staff line of sight are mandatory.

- The kiosk remains optional; staffed processing is always available.

# 10. Department lead surface

| **Panel**        | **Contents**                                                              |
|------------------|---------------------------------------------------------------------------|
| Header           | Event, zone, device, user, package revision, local/WAN state              |
| People           | Team, post, shift, check-on-post, relief, certification exception         |
| Work             | Department run sheet, tasks, requests, owners, SLA/priority and handover  |
| Readiness        | Required evidence, known unknowns, dependencies and conditional approvals |
| Incidents        | Open incidents, actions, command direction and communications             |
| Guest operations | Only authorised departmental guest view and scan/search                   |
| Fallback         | Paper/radio activation, forms used and later transcription queue          |

# 11. Device/profile generator outputs

- DeviceProfile JSON and signed assignment

- Allowed routes, components, commands and fields

- Offline projection subset and search indexes

- Authentication/certificate configuration

- Feature flags, alert/haptic patterns and timeout rules

- Post/zone/default filter

- Printer/scanner/camera capability configuration

- Health heartbeat and support metadata

- Revocation and expiry

- Printable device label and custody sheet

# 12. Device acceptance matrix

| **Capability**         | **Must be proved**                                                  |
|------------------------|---------------------------------------------------------------------|
| Cold start without WAN | App shell and local login reach edge server                         |
| Camera/HID scan        | Supported formats, lighting, duplicates and rapid consecutive scans |
| Battery/thermal        | Full shift plus headroom under screen/camera/network load           |
| Roaming                | No silent command loss across AP transitions                        |
| Lock/revocation        | Lost device loses access within event target                        |
| Outbox                 | Encrypted, bounded, visible and deterministically submitted         |
| Accessibility          | Keyboard/screen reader/large text/contrast/touch                    |
| Kiosk privacy          | No previous guest data after timeout/reset                          |
| Update control         | Pinned version; rollback/containment                                |
| Wipe/closure           | Event data removed or retained only as policy permits               |

# Ratification

| **Decision**                 | **Name / signature / date** |
|------------------------------|-----------------------------|
| Device classes approved      |                             |
| PWA/native boundary approved |                             |
| Scan surfaces approved       |                             |
| Self-scan limits approved    |                             |
| CEO ratification             |                             |
