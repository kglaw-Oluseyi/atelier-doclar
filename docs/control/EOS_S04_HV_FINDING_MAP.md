# EOS-S04 Human-Verification Finding Map

**Control ID:** `MD-PR-S014`  
**Milestone:** `EOS-S04-RECON`  
**Source findings:** `docs/control/EVENT_OS_S01_S03_HUMAN_VERIFICATION.md` (`MD-PR-S013` / EOS-HV1)  
**Ruling preserved:** PASS WITH MINOR REFINEMENTS; findings = 5; not technical debt; not S03 reopening; not automatic S04 scope.

Each finding is assessed independently. S04 is not assigned work merely because it is next.

## HV-EOS-001

| Field | Value |
|-------|-------|
| Finding | Operator-facing Event overview language: “Foundation completeness…”, “doctrine slots”, “operational truth” |
| Category | UX / operator-facing wording |
| Severity | LOW |
| BELONGS TO S04 | **NO** |

**Rationale.** The language lives on the S01 Event overview / Master Event File composition surface. Native S04 builds a **communications** overview (`S4-46` / `S4-47`) and does not own MEF slot presentation. Assigning this to S04 because it is next would mix control-plane doctrine UX with guest communications.

**Proposed treatment.** Later authorised Event OS **operator-presentation** refinement on the existing event overview. Preserve canonical MEF slot states and verification enums. Improve labels and hierarchy only. Do not invent a new slice. Do not weaken “unknown ≠ operational truth”.

**S04 alignment:** NO

## HV-EOS-002

| Field | Value |
|-------|-------|
| Finding | Operator terminology `UNRESOLVED` / `UNVERIFIED` reads as system-state language |
| Category | UX / operator-facing terminology |
| Severity | LOW |
| BELONGS TO S04 | **PARTIAL** |

**Rationale.** Those strings are canonical shared-platform enums (`IDENTITY_RESOLUTION_STATES`, `FIELD_QUALITY_STATES`, `VERIFICATION_STATES`). S01/S02 own the domain. S04 inbox, unmatched reconciliation and guest timeline **may display** them. Native S04 does not redefine guest identity or field quality.

**Proposed treatment.** Preserve domain enums. If S04 surfaces show these states, use presentation labels only. Do not rename enums for luxury tone. A later operator-language pass may do the same on the directory.

**S04 alignment:** PARTIAL

## HV-EOS-003

| Field | Value |
|-------|-------|
| Finding | Guest RSVP lacks sufficient verified occasion context (date/time, venue/arrival, dress where applicable) |
| Category | GUEST EXPERIENCE / CONTENT |
| Severity | MEDIUM |
| BELONGS TO S04 | **PARTIAL** |

**Rationale.** Native S04 already requires:

- approved event facts / document versions as template variables (`S4-12`, spec §6);
- safe renderer that must not send or invent unresolved required data (`S4-13`);
- hospitality structure Action → Time → Location → Context → Detail (S4-D10);
- cadence purposes `PRE_EVENT_INFO`, `REMINDER`, `ARRIVAL_SUPPORT` with arrival, dress and briefing only when approved;
- concierge intelligence pack drawn from current verified sources, never a second database.

S03 remains RSVP truth and owns the guest RSVP page. Event already stores `startsAt`, `endsAt`, `timezone`, optional `venueSummary`. Those fields are **not** automatically guest-safe: MEF slots start `UNVERIFIED`, and dress/arrival guidance have no first-class verified model today.

**Proposed treatment.** If S04 is later authorised, implement a **guest-safe occasion context projection** in shared-platform:

- expose only confirmed/verified guest-safe facts;
- omit unknown — never render “undefined”, guessed venue, or internal doctrine;
- hide private/internal event information;
- let S03 RSVP **consume** the same projection without rewriting RSVP state;
- use the same projection for invitation/pre-event templates.

Do not assume every field always displays. Do not reopen EOS-S03 acceptance.

**S04 alignment:** PARTIAL

## HV-EOS-004

| Field | Value |
|-------|-------|
| Finding | Guest-facing RSVP feels functional rather than distinctly Maison Doclar |
| Category | VISUAL EXPERIENCE |
| Severity | LOW |
| BELONGS TO S04 | **PARTIAL** |

**Rationale.** Canonical S04 guest-facing hooks are **communications**, not a rewrite of S03 RSVP chrome:

- template content law: Clear, Considered, Calm, Personal (S4-D10, `S4-11`–`S4-15`);
- guest-safe rendered messages and previews (`S4-13`, `S4-22`, `S4-25`);
- guest communication timeline is staff-side (`S4-48`);
- spec: guest signed surfaces remain Slice 3 destinations linked from messages.

S04 therefore owns guest **message** tone and preview quality. It does not own a full guest visual-identity programme for the RSVP page. “Luxury” means restrained, premium, calm, accessible, mobile-first, performant, clear hierarchy, privacy-aware — not decorative excess.

**Proposed treatment.** If authorised, apply the design system and S4-D10 to templates, previews and any guest-visible communication artefact. A later small authorised refinement may apply the same visual language to the S03 RSVP page without changing RSVP behaviour.

**S04 alignment:** PARTIAL

## HV-EOS-005

| Field | Value |
|-------|-------|
| Finding | Repeated RSVP amendment (NOT SUPPLIED → ATTENDING → UNCERTAIN) did not raise extra staff attention |
| Category | WORKFLOW / OPERATIONAL ATTENTION |
| Severity | LOW / DESIGN DECISION REQUIRED |
| BELONGS TO S04 | **POLICY-ONLY** |

**Rationale.** EOS-HV1 recorded this as **not a defect**. Native S04 defines:

- response-change **communications** (purpose `RSVP_ACKNOWLEDGEMENT` after durable submit/amend);
- follow-up / SLA / escalation for **inbound concierge tasks** (`S4-44`);
- staff attention via notification centre (`S4-50`) and intelligence rules (`S4-51`);
- exceptions remain S03 (`RsvpException`).

It does **not** define “N RSVP amendments raise an alert”. S4-51 rules cover approval ageing, reachable audience, exclusions, quiet hours, bounce clusters, reply backlog, SLA risk, contact-data deterioration — not RSVP volatility. S4-D07 forbids invented global numeric defaults.

Whether attention depends on VIP, deadline, event impact, or amendment count is a **policy decision**. Do not invent alerts.

**Proposed treatment.** Keep S03 `attentionRequired` semantics as-is. If S04 is authorised, provide notification/intelligence **machinery**. Do not enable an RSVP-volatility rule unless CEO/AI CTO later names the conditions. Prefer quiet operations over noisy alerting.

**S04 alignment:** POLICY-ONLY

## Summary

| Finding | Belongs to S04 | Alignment |
|---------|----------------|-----------|
| HV-EOS-001 | NO | NO |
| HV-EOS-002 | PARTIAL | PARTIAL |
| HV-EOS-003 | PARTIAL | PARTIAL |
| HV-EOS-004 | PARTIAL | PARTIAL |
| HV-EOS-005 | POLICY-ONLY | POLICY-ONLY |

None of these findings reopen EOS-S01–S03 acceptance or authorise EOS-S04 implementation.
