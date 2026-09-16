# Claude Independent Verification Prompt — EOS-S06 600-Guest Capacity Qualification

**Do not accept this gate. Do not remediate. No repository access.**

You are verifying Cursor's qualification claim for Event OS seating at production-like scale. Live URL (if provided): `https://event-os-production-bc8d.up.railway.app`. Environment must show `productionAuthorised: false`.

## Identities to confirm separately

- Accepted application SHA: `7f139a556f7c023efa98daccd7bfd29481a05775`
- Qualification repository/docs tip: `5561171261f3c193136a0b3be5dbd504a2ed8f70`
- Do not conflate documentation commits with deployed application identity.

## Approved qualification layout (synthetic only)

63 tables / 600 seats: 42×10 + 18×8 + 3×12. Not a Maison Doclar production default.

## Verify representative human journeys (do not rerun the automated corpus)

1. **Typical 600-guest workbench** — open seating for a synthetic 600-guest event; confirm capacity ledger / eligible ≈ 600; locate guest `Cap043` (or seeded search guest).
2. **Rules / reservations** — open Rules and Reservations views; confirm they render and remain comprehensible at scale.
3. **Run status** — confirm a FEASIBLE run shows seated/unseated truth (600/0 when applicable) and Adopt/publication controls are honest.
4. **Infeasible / contradiction explanation** — confirm the product explains HARD contradiction (e.g. activating KEEP_APART against ACTIVE KEEP_TOGETHER is refused with a clear conflict banner). Do not require both contradictors to be ACTIVE if the product correctly blocks activation.
5. **Successor / stale honesty** — where a successor layout or stale run is visible, confirm stale warning / blocked adopt matches server truth.
6. **Responsive + keyboard** — 360px, 768px, 1280px; Tab reaches a focusable control; no critical/serious axe issues on seating studio at ≥768px.
7. **Zero HARD-violation feasible result** — for a feasible published path, confirm UI does not claim success with HARD violations.
8. **Concurrency / replay (observe, do not load-test)** — where UI exposes replay/idempotent launch, confirm REPLAYED / unchanged identity language is truthful.
9. **Heavy scenario (optional observe)** — if a heavy FEASIBLE run is available, confirm it completes and remains FEASIBLE with zero HARD violations within the 60s product ceiling narrative.
10. **Truthful UI states** — loading, failure, blocked, stale and success states match server truth.

## Seeds and hashes (deterministic corpus — reference only)

| Scenario | Seed | Hash |
|----------|------|------|
| A_LIGHT | `eos-s06-cap-A-light-600-v1` | `e7d546b16cf00fe377faa87c233328d46c982544532988b4536064abafab8de9` |
| B_TYPICAL | `eos-s06-cap-B-typical-600-v1` | `08309644e65bd3f4f927461ac92b09692a5f766a344da5402011452b9692f160` |
| C_HEAVY | `eos-s06-cap-C-heavy-600-v1` | `22c88419a8313f662f3c02aa85e5049137907e8a48aa2feed7bcce8121efb5e4` |
| D_INFEASIBLE | `eos-s06-cap-D-infeasible-600-v1` | `6dc0b80d994c285e0f5949c26db79eff9c240b87bf68c3afd2cb5c9f8ea39e74` |

Report PASS/FAIL per item with screenshots or observable UI text. Do not sign production authorisation. Do not start EOS-S07. Do not close TDR-S06A-001.
