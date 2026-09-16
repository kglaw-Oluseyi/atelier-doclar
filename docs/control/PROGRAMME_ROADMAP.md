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
| EVENT_OS | Event OS | `/programme/event-os` | S01–S03 accepted; S04 CLOSED / ACCEPTED; S04A ACCEPTED (not catalogue); S04B ACCEPTED (not catalogue); S04C ACCEPTED (not catalogue); S04D ACCEPTED (not catalogue); S04E ACCEPTED (not catalogue); S04F ACCEPTED (not catalogue); S05 ACCEPTED; S05A ACCEPTED (not catalogue); S05B ACCEPTED (not catalogue); S06 ACCEPTED (catalogue count 6); S06A ACCEPTED; Gate 1 ACCEPTED; S06B/S06C CEO RATIFICATION DRAFT only; S07 NOT_STARTED / NOT_AUTHORISED |
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
| EOS-S05 | ACCEPTED — Venue registry and spatial layout; catalogue slice; SHA `eba137712c65c6f59b77fe2a88a8f4a277228cd9`; `MD-PR-S028`–`MD-PR-S035` |
| EOS-S05A | ACCEPTED — Discovery, Investment & Executive Event Command; not a catalogue slice; SHA `50322fa5fdf7b46437dc9d62579e2e2ad918e762`; `MD-PR-S053` |
| EOS-S05B | ACCEPTED — Risk, Protection & Continuity Command; not a catalogue slice; SHA `84d58dd4590fb7d2087b436d10c0b2ae992b1621`; `MD-PR-S069` |
| EOS-S06 | ACCEPTED — Seating allocation; catalogue slice; accepted/deployed application SHA `42b0bb3f0976ca2b745a09f3952680afef69a1b9`; deployment `bb0f03d1-81fb-4fba-bf86-206f92a5953d`; acceptance `MD-PR-S077` on 2026-09-15; current product gate green; extended historical regression retained as controlled debt (`TDR-S06-003`); historical `IMPLEMENTED / NOT ACCEPTED` and `NOT_STARTED / NOT_AUTHORISED` rows remain dated history |
| EOS-S06A | ACCEPTED — Atelier Command; PASS WITH ONE CONTROLLED MINOR OBSERVATION; accepted application SHA `7f139a556f7c023efa98daccd7bfd29481a05775`; reviewed pre-acceptance tip `8e8a6a02e797a4c9cedceb7748667d1a934cbc1a`; deployment `7023da83-72dc-4f99-91c1-b3d7aa634087`; acceptance `MD-PR-S079` on 2026-09-16; not a catalogue slice; `TDR-S06A-001` OPEN; historical `IMPLEMENTED BUT NOT ACCEPTED` rows remain dated history |
| EOS-S06 Gate 1 | ACCEPTED — PASS WITH CONTROLLED OBSERVATIONS under `MD-PR-S080` on 2026-09-16; exact CAP600 `053fa686-…`; prior Claude BLOCKED attempt preserved; authentication remediation ACCEPTED at application SHA `71317881384e38671295c3fda32d533c71c3f559`; CAP1000 incomplete / outside Gate 1 |
| EOS-S06B | CEO RATIFICATION DRAFT registered under `docs/control/eos-s06b/ratification-pack/` — not ratified, not authorised, not started |
| EOS-S06C | CEO RATIFICATION DRAFT registered under `docs/control/eos-s06c/ratification-pack/` — not ratified, not authorised, not started; CEO planning direction proposes S06C next after MD-PR-S080, subject to explicit sequencing ratification |
| All others | NOT_STARTED, READY, or BLOCKED only by valid Event OS / Event-Day dependencies |

## Now / next / later

| Band | Content |
|------|---------|
| Now | Event OS S01–S06 accepted (catalogue count 6); EOS-S04A–F ACCEPTED (not catalogue); EOS-S05A ACCEPTED (not catalogue); EOS-S05B ACCEPTED (not catalogue); EOS-S06A ACCEPTED; Gate 1 ACCEPTED; auth remediation ACCEPTED at `7131788…`; production unsigned; no real communication or translation provider |
| Next | Do not start EOS-S06B/S06C/S07 without explicit ratification; proposed sequencing prefers EOS-S06C next pending sequencing control; remediate open TDRs before production authorisation; distinguish current-product gates from extended historical regression (`TDR-S06-003`) |
| Later | Event OS S01 after a new authorised instruction; Runtime after Event OS foundations |
| Held | All 693 product/recon prompts except CT0/CT1 wrappers; EOS-S06B/S06C implementation; EOS-S07; production authorisation |
| External | Independent, specialist, venue, CEO gates — unsigned |

## Release rule

Completion of a last product slice (R23, EOS-S12, CT9, INT-CLOSE) means **evidence may be ready for human review**. It does not mean production is authorised.
