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
| EVENT_OS | Event OS | `/programme/event-os` | Specified/prompted; no app |
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
| All others | NOT_STARTED, READY, or BLOCKED only by valid Event OS / Event-Day dependencies |

## Now / next / later

| Band | Content |
|------|---------|
| Now | EOS-S03 ACCEPTED; Event OS S01–S03 live-verification milestone is the next controlled action |
| Next | Event OS S01–S03 controlled live deployment and milestone verification; do not start EOS-S04 |
| Later | Event OS S01 after a new authorised instruction; Runtime after Event OS foundations |
| Held | All 693 product/recon prompts except CT0/CT1 wrappers |
| External | Independent, specialist, venue, CEO gates — unsigned |

## Release rule

Completion of a last product slice (R23, EOS-S12, CT9, INT-CLOSE) means **evidence may be ready for human review**. It does not mean production is authorised.
