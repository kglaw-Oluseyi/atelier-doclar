# Claude continuation — layout-binding Stage A

Do **not** accept EOS-S06. Do **not** start EOS-S07. Do **not** deploy Control Tower.

## Deployed truth

- Event OS SHA: `a32d4f7e436badcb1dff7d6f364b57b80a3aabe7`
- Event: `e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b` (`S073-20260912T234215 Seating`)

## Already fixed

Maker-checker mismatch: older DRAFT no longer hides the Planner proposal. One pending DRAFT per event. Activation form is bound to the displayed proposal (binding ID + publication hash).

## Your Stage A (Event Director)

Open:

`https://event-os-production-bc8d.up.railway.app/app/events/e1c2c63c-6015-4d55-8a34-1eb94eb1ce2b/seating#inputs`

Confirm activation review shows exactly:

- Binding: `adae3f65-dd64-48bc-ba24-676998b7975c` (short `adae3f65`)
- Layout: `Synthetic seating hall`
- Hash: `dc84e03a733f`
- Status: DRAFT
- Current authoritative: none

Then activate Stage A as Event Director (not the Planner).

## After A is ACTIVE

1. Planner proposes Layout B: `EOS-S06 successor layout B` · hash `785100a246bd`
2. Director must see B as the pending proposal with A as current authoritative
3. Activate B → B ACTIVE, A SUPERSEDED
4. Confirm history/replay shows maker, checker, targets and transitions

Refuse activation if the displayed proposal and form target disagree. Stop after reporting outcomes.
