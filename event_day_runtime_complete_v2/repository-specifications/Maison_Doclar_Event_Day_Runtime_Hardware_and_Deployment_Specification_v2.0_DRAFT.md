**MAISON DOCLAR**

**Event-Day Runtime Hardware and Deployment Specification**

Procurement, sizing, spares and acceptance authority

MD-OS-EDGE-HW-002 \| Version 2.0 \| 5 September 2026

**DRAFT FOR CEO RATIFICATION**

# Procurement position

Procure by verified capability and event tier, not brand familiarity.
Exact models remain candidates until they pass compatibility, heat,
power, radio, throughput, recovery and venue tests. The core must remain
useful without WAN, FaceGate or any single wireless access point.

# 1. Event-tier sizing

| **Tier** | **Operational profile**                  | **Reference capacity**                     | **Hardware posture**                                                          |
|----------|------------------------------------------|--------------------------------------------|-------------------------------------------------------------------------------|
| E1       | ≤300 guests; one principal space         | 25 active staff devices; 10 writes/s burst | One production edge node plus tested cold/warm recovery node; 2 APs           |
| E2       | 301–1,000; multi-zone                    | 75 devices; 30 writes/s burst              | Primary plus recovery node; 3–5 APs; dual UPS paths where possible            |
| E3       | 1,001–3,000; multi-room/high consequence | 150 devices; 75 writes/s burst             | Primary plus hot-ready fenced standby; 6–12 surveyed APs; redundant switching |
| E4       | \>3,000 or exceptional consequence       | Load-modelled                              | Bespoke design, independent network engineer and full venue simulation        |

# 2. Mandatory core bill of materials

| **Component**           | **Minimum capability**                                                                                                                                     | **Quantity principle**                     |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------|
| Primary edge server     | Business-class x86-64; TPM 2.0; secure boot; 32 GB RAM E1/E2, 64 GB E3; encrypted 1 TB enterprise NVMe; dual 1/2.5 GbE; pinned OS/container image          | 1 active                                   |
| Recovery edge server    | Same architecture/image; capacity to restore full event; physically fenced from writing until authorised                                                   | 1                                          |
| Managed firewall/router | VLANs, stateful default-deny rules, DHCP reservations, local DNS/NTP relay, configuration export, dual WAN optional; must operate without cloud controller | 1 + spare/configurable replacement for E3  |
| Managed switch          | VLAN, PoE+/PoE++ budget for APs, link monitoring, local administration; sized with ≥25% port/power headroom                                                | 1; redundant core for E3                   |
| Enterprise APs          | Local/controller-offline operation, WPA3-Enterprise or approved equivalent, client isolation where needed, surveyed roaming, PoE                           | Survey-derived + one spare                 |
| UPS                     | Pure sine preferred; monitored; runtime covering server/router/switch/APs for target period; replaceable batteries                                         | Independent protected paths where feasible |
| Wired command stations  | Encrypted laptop, Ethernet adapter, locally cached UI, privacy screen where needed                                                                         | ≥2                                         |
| Staff tablets/handsets  | Supported browser/PWA, MDM or managed mode, strong device lock, tested battery, no shared uncontrolled profiles                                            | Role plan + 20% spare                      |
| Encrypted backup media  | Hardware-encrypted or approved encrypted SSD; labelled and dual-controlled                                                                                 | 2 rotated                                  |
| Deployment kit          | Cat6 leads, labelled patch cables, spare injectors/PSUs, cable guards, lockable cases, labels, tools, power strips, lighting                               | One controlled kit                         |

# 3. WAN and external-service kit

| **Item**                  | **Requirement**                                                                                                          |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Carrier routers/modems    | At least two independent carrier paths for cloud/external services where justified; external-zone only                   |
| FaceGate appliance/camera | Vendor-supported local processing where possible; external/biometric zone; signed assertion integration; physical bypass |
| Gateway host or service   | Hardened allow-list proxy; validates signatures/audience/event/expiry/replay; no layer-2 bridging                        |
| Venue uplink              | Optional and untrusted; never required for core activation                                                               |
| Remote support path       | Disabled by default; time-bound, approved, logged and terminated after use                                               |

# 4. Power and environmental calculation

- Inventory measured watts for edge nodes, switch PoE draw, APs, command
  laptops and gateway.

- Apply at least 25% design headroom and manufacturer derating; define
  target runtime by event risk.

- Test actual runtime under peak PoE and server load, not label
  estimates.

- Confirm generator transfer behaviour, grounding, cable protection,
  ventilation, dust/heat limits and secure physical placement.

- Keep core power separate from decorative production loads where
  practicable.

# 5. Network quantity method

1.  Obtain current floorplans and conduct a physical venue survey.

2.  Map walls, lifts, kitchens, staging, dense crowd zones, entrances,
    command and emergency routes.

3.  Perform spectrum survey at comparable occupancy where possible.

4.  Place APs by measured coverage/capacity, not nominal manufacturer
    range.

5.  Provide a wired command path and test every operational position.

6.  Repeat test with venue AV, security and production radios active.

# 6. Radios and non-data fallback

| **Capability** | **Specification**                                                                                                          |
|----------------|----------------------------------------------------------------------------------------------------------------------------|
| Command radio  | Commercial-grade, locally lawful frequencies/licensing, spare batteries, programmed talk groups and disciplined call signs |
| Earpieces      | Clear acoustic tube for discreet leads; D-ring/C-hook for shared logistics; connector matched to chosen radio              |
| Paper pack     | Numbered check-in exception, incident, request and reconciliation forms; secure clipboards and custody envelopes           |
| Timekeeping    | Visible authorised event clock; server time source; manual timestamp convention                                            |
| Runner system  | Named routes and handover log for total wireless failure                                                                   |

# 7. FaceGate hardware boundary

The FaceGate station is not part of the essential check-in path. Initial
check-in devices must operate without it. The return station needs
camera/illuminator positioning, privacy signage, consent lookup,
operator screen, QR/manual fallback and a physical lane that does not
trap or publicly stigmatise a guest when matching fails.

# 8. Recommended inventory fields

- Asset ID, serial, model, firmware and purchase date

- Owner/custodian, event allocation and configuration baseline

- MAC/certificate/device identity without exposing secret material

- Battery health, PSU, adapters and spare compatibility

- Last patch, last functional test, last restore test and next
  maintenance

- Damage, quarantine, loss and secure disposal status

# 9. Procurement acceptance

| **Test**               | **Pass condition**                                                                |
|------------------------|-----------------------------------------------------------------------------------|
| Offline administration | Router, switch, AP and server remain configurable/operable without vendor cloud   |
| Performance            | Meets chosen tier at ≥1.5× expected device and transaction load                   |
| Power                  | Measured UPS runtime meets target with alarms and clean shutdown                  |
| Recovery               | Replacement/recovery node restores signed package and backup within RTO           |
| Segmentation           | Independent scan proves prohibited zone paths are blocked                         |
| Security               | Supported firmware, changeable credentials, encrypted management and logged admin |
| Venue radio            | Coverage/capacity pass at every operational point                                 |
| FaceGate               | Matcher failure cannot block initial or return manual processing                  |

# 10. Pre-event issue checklist

- Asset count and seal check

- Firmware/image/config versions matched to approved baseline

- Certificates and event-scoped user/device roster installed

- Batteries charged and labelled; spare ratios met

- Package import and count verification witnessed

- UPS load and alarm test passed

- WAN physically removed while core smoke suite runs

- FaceGate disabled/manual path proven before optional enablement

- Configuration exports and encrypted backups held under dual control

# Procurement approval

| **Approval**                        | **Name / signature / date** |
|-------------------------------------|-----------------------------|
| Event tier and sizing               |                             |
| Named models accepted after testing |                             |
| Privacy/security acceptance         |                             |
| Operations acceptance               |                             |
| CEO capital approval                |                             |

**Supersession statement**

This v2.0 document forms part of the complete replacement bundle and
supersedes the corresponding v1.0 document. It must be read with the
Departmental Event Package, Device and Surface, Cursor Programme,
People, Hardware and Validation documents.
