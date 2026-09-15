# Claude continuation — EOS-S06 after discrepancy correction

Do **not** accept EOS-S06. Do **not** start EOS-S07. Do **not** deploy Control Tower.

## Deployed truth

- Event OS SHA: `8246b38b4f9b1b2f18aa1af229d87a92e1848761`
- Repo/docs HEAD: same
- Railway: atelier-doclar / production / event-os
- Posture: POSTGRES · migrations APPLIED · productionAuthorised:false · providers INACTIVE

## Already done by Cursor (do not redo)

1. HARD conflict guard remains as designed (do not reopen).
2. Remaining ACTIVE contradictory Adaeze/Bola pair reconciled:
   - preserved ACTIVE KEEP_TOGETHER `e0dc270a-c57d-49fb-8dd9-c62544de3d2b` (hash `90d5a7494b3d`)
   - withdrawn KEEP_APART `44d2bef7-8a05-4904-88f3-07c6fa87f3de` (hash `24a80dbb82df`) with reason `VERIFICATION_CONFLICT_RECONCILIATION_AFTER_HARD_RULE_GUARD`
   - contradictory ACTIVE count: **0**
3. Conflict refusal copy now shows **Activation not applied** (not unexpected server failure).
4. S073 event `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b` now has CURRENT Layout A + Layout B eligible for propose.

## Your browser work — successor maker-checker on S073

Open:

`https://event-os-production-bc8d.up.railway.app/app/events/e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b/seating#inputs`

Expected propose options include:

- `Synthetic seating hall` · hash `dc84e03a733f` · 2 tables (**Layout A**)
- `EOS-S06 successor layout B` · hash `785100a246bd` · 3 tables (**Layout B**)
- (also) `S073-20260912T234215 hall` · hash `6d601448ca59` · 1 tables (pre-existing; ignore for the A→B journey)

Journey:

1. If a DRAFT binding exists for the S073 hall, withdraw it (Planner) so the A→B chain is clean.
2. Planner proposes **Synthetic seating hall** (A).
3. Event Director activates A → A becomes authoritative.
4. Planner proposes **EOS-S06 successor layout B** (B).
5. Event Director activates B as successor → B authoritative; A historical/superseded.
6. Confirm replay/history shows the complete maker-checker chain.
7. Spot-check one HARD activation refusal still shows **Activation not applied** / No data changed (not server failure).

## Evidence folder

`docs/control/evidence/eos-s06-final-evidence-discrepancy/`

Stop after reporting browser outcomes. Do not accept EOS-S06.
