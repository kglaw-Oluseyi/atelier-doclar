# Programme Roadmap

**Slice:** MD-CT0  
**Authority:** CEO-ratified corpus + successor AI CTO reconciliation + CT0 DAG decisions  
**Status source:** Evidence-derived projections in `programme/slices/state-projection.json`  
**Declaration source:** `programme/slices/catalog.json`

Percent complete is not used. Unknown is not healthy. Documented ≠ implemented. Prompted ≠ accepted.

## Products (7)

| Code | Name | Route | Implementation reality |
|------|------|-------|------------------------|
| FOUNDATION | Shared Foundation / Control Tower | `/programme` | Control Tower implemented; Foundation closeout IN_REVIEW; production unsigned |
| EVENT_OS | Event OS | `/programme/event-os` | S01–S03 accepted; S04 CLOSED / ACCEPTED; S04A ACCEPTED (not catalogue); S04B ACCEPTED (not catalogue); S04C ACCEPTED (not catalogue); S04D ACCEPTED (not catalogue); S04E ACCEPTED (not catalogue); S04F ACCEPTED (not catalogue); S05 not authorised |
| EVENT_DAY | Event-Day Runtime | `/programme/event-day` | Specs + contracts; no app |
| ACADEMY | Academy | `/programme/academy` | Specified/prompted; no app |
| MARKETING | Marketing OS | `/programme/marketing` | Specified/prompted; no app |
| USHERING | Premium Ushering | `/programme/ushering` | Doctrine + one recon prompt |
| INTEGRATION | Cross-System Integration | `/programme/integration` | Documentary contracts only |

Seed JSON product **order** (Academy before Event-Day) is a historical display variant. CT0 executive critical path places Event-Day foundations before Academy. Both remain recorded; the DAG is authoritative (`PROGRAMME_DEPENDENCIES.md`).

## Phases

| ID | Title | Critical path? |
|----|-------|----------------|
| PH-FOUNDATION | Shared Foundation | Yes |
| PH-EVENT-OS-FOUNDATIONS | Event OS foundations / control plane | Yes |
| PH-EVENT-DAY-FOUNDATIONS | Event-Day Runtime foundations | Yes |
| PH-USHERING | Premium Ushering | Yes |
| PH-ACADEMY | Academy | Yes |
| PH-MARKETING | Marketing OS | Yes |
| PH-INTEGRATION | Cross-system integration | Yes |
| PH-VALIDATION | Validation / release hardening | Yes |
| PH-EVENT-DAY-OPERATIONS | Runtime operations (R8–R21) | Supporting |
| PH-EVENT-OS-OPERATIONS | Later Event OS (S09–S12, recon) | Supporting |

## Planning slices (81)

Foundation 12 (MD-B0, MD-CT0–CT9, MD-FC1) · Event OS 13 (S01–S12 + recon) · Event-Day 24 (R00–R23) · Academy 18 (G0 + S01–S16 + recon) · Marketing 12 (M00–M11) · Ushering 1 · Integration 1.

Each slice has canonical references. No slice is `ACCEPTED`.

| Slice | Projection now |
|-------|----------------|
| MD-B0 | IN_REVIEW — commit `f7abb431be9a15ab730b3fdd16baa8e83776c170`, no named CEO acceptance |
| MD-CT0 | IN_REVIEW — planning commit present; no named acceptance |
| MD-CT1 | IN_REVIEW — validator implemented; no named acceptance |
| MD-CT2 | IN_REVIEW — events/snapshots/status implemented; no named acceptance |
| MD-CT3 | IN_REVIEW — repository/CI ingestion implemented; no named acceptance |
| MD-CT4 | IN_REVIEW — Control Tower shell and executive portfolio; no named acceptance |
| MD-CT5 | IN_REVIEW — roadmap and drill-down implemented; no named acceptance |
| MD-CT6 | IN_REVIEW — controlled workflows implemented; gates unsigned |
| MD-CT7 | IN_REVIEW — grounded assistant implemented; no named acceptance |
| MD-CT8 | IN_REVIEW — charts and freshness implemented; unknown ≠ green |
| MD-CT9 | IN_REVIEW — operations evidence pack; production unsigned |
| MD-FC1 | IN_REVIEW — Foundation closeout; production unsigned |
| MD-LV1 | IN_REVIEW — live deployment; production unsigned |
| MD-HV1 | IN_REVIEW — CEO human live verification PASS; not accepted |
| MD-GR1 | IN_REVIEW — dependency semantics reconciled; Foundation unaccepted |
| EOS-S01 | ACCEPTED — shared platform foundation; technical acceptance recorded; production unsigned |
| EOS-S02 | ACCEPTED — guest intake and operational directory; technical acceptance recorded; production unsigned |
| EOS-S03 | ACCEPTED — RSVP and guest self-service; technical acceptance recorded; production unsigned |
| EOS-S04 | CLOSED / ACCEPTED — guest communications and concierge; `PASS WITH OBSERVATIONS`; hosted verification `MD-EOS-S04-R3-05`; production unsigned |
| EOS-S04A | ACCEPTED — guest addressing, relationships and party entitlements; not a catalogue slice; SHA `8f1957d2353db539449d9bcce62f9e4d71eb31af` |
| EOS-S04B | ACCEPTED — multi-phase events, arrival routing and perimeter access; not a catalogue slice; SHA `f9f218c9d3e357ba82e6c04e7409138267a94396` |
| EOS-S04C | ACCEPTED — Aso-Ebi, Aso-Oke & Event Merchandise Coordination; not a catalogue slice; SHA `b378fa4f092e4fa5237894975738e3f22b530d73` |
| EOS-S04D | ACCEPTED — Attendance Forecasting & Planning Intelligence; not a catalogue slice; SHA `64683a853ead39c62caeb2d2e9f26bcb9d1dca21`; `MD-PR-S022` / `MD-PR-S023` |
| EOS-S04E | ACCEPTED — Event Blueprint, Journey & Host Experience; not a catalogue slice; SHA `05b91bb62dcc20357666bef4ff9bfa1d0cef11b2`; `MD-PR-S024` / `MD-PR-S025` |
| EOS-S04F | ACCEPTED — Language, Cultural Text & Multilingual Editions; not a catalogue slice; SHA `a4795e83c929bf24591f52c2224eb4b588c23ef3`; `MD-PR-S026` / `MD-PR-S027` |
| EOS-S05 | IN_PROGRESS — Venue registry and spatial layout; catalogue slice; Milestones 1–4 implemented; not accepted |
| All others | NOT_STARTED, READY, or BLOCKED only by valid Event OS / Event-Day dependencies |

## Now / next / later

| Band | Content |
|------|---------|
| Now | Event OS S01–S03 accepted; EOS-S04 CLOSED / ACCEPTED; EOS-S04A–F ACCEPTED (S04A–F are not catalogue slices); EOS-S05 Milestones 1–4 implemented and not accepted; production unsigned; no real communication or translation provider |
| Next | Independent AI CTO review of complete EOS-S05, then one Claude-in-Chrome whole-slice verification batch; do not start EOS-S06 without a separate CEO overlay |
| Later | Event OS S01 after a new authorised instruction; Runtime after Event OS foundations |
| Held | All 693 product/recon prompts except CT0/CT1 wrappers; EOS-S06 |
| External | Independent, specialist, venue, CEO gates — unsigned |

## Release rule

Completion of a last product slice (R23, EOS-S12, CT9, INT-CLOSE) means **evidence may be ready for human review**. It does not mean production is authorised.
