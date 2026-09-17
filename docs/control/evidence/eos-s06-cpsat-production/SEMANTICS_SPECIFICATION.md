# Seating semantics specification (P0 — D1–D14 pack defaults)

**Controlling pack:** `02_Seating_Semantics_and_Product_Decisions.docx`
**Rule:** Use pack defaults unless an existing *accepted* product semantic proves a conflict. Conflicts must be recorded; none are asserted closed at registration.

| ID | Decision | Canonical policy |
|----|----------|------------------|
| D1 | Ineligible bridging | Do not bridge HARD together relations through an ineligible guest |
| D2 | Movement | Stage A counts table changes; Stage B counts seat changes |
| D3 | Preference vs movement | Zero tolerance by default; governed event override only |
| D4 | Reservation GUARANTEE | Pins the holder |
| D5 | Reservation HOLD | Withholds the seat unless the holder uses it |
| D6 | Replay vs performance | Adoptable runs use Replay; exploratory may use Performance |
| D7 | Event-day freeze | Physically seated guest becomes dynamically locked |
| D8 | Manual edits | Independently verified; create a new adoption |
| D9 | Hard-rule relaxation | Maker-checker; capacity and table existence never relaxable |
| D10 | Seat order | Protocol seat-order triggers integrated model v2; never invalid two-stage projection |
| D11 | KEEP_TOGETHER | Same table; transitive closure = one atomic unit |
| D12 | KEEP_APART | Declared pairs/cliques must not share a table |
| D13 | Requirements / prohibitions | Intersect across together-unit members; union prohibitions |
| D14 | Eligibility | Eligible guests appear exactly once; ineligible never appear |

Preference bands: LOW=1, MEDIUM=3, HIGH=10, PRINCIPAL=30. Raw operator weights prohibited.

Open before production authority (recorded, not closed): protocol seat-order for principal tables; sensitivity classes / discretion mode; central↔edge handover; retention/erasure; multi-room/multi-session.
