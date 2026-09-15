# Claude continuation — EOS-S06 final seating remediation (narrow)

Do **not** restart EOS-S06 verification. Do **not** accept EOS-S06. Do **not** start EOS-S07.
Do **not** deploy Control Tower. Synthetic data only.

Work only against live Event OS after the remediation SHA in `DEPLOYMENT.md`.

## Test only

1. **Contradictory HARD activation blocked**
   - With ACTIVE HARD KEEP_TOGETHER for a guest pair, Planner drafts HARD KEEP_APART for the same pair (guest order may reverse).
   - Draft visibly identifies the conflicting ACTIVE rule.
   - Event Director activation is refused; data unchanged; banner truthful.

2. **Materially different non-conflicting rule allowed**
   - HARD rule for a different guest pair activates normally.

3. **Layout-binding propose no longer stuck after response failure**
   - If a transport/503 failure is observed or simulated, “Saving…” settles.
   - Committed cases recover success; uncommitted cases preserve form + explicit retry; no duplicate draft.

4. **Settlement repetitions 3 and 4** — only if this deployment affected their shared path; otherwise skip.

5. **Prepared successor-layout journey** (fixture ready)
   - Event: Alpha One
   - Layout A: `Synthetic seating hall` (current binding)
   - Layout B: `EOS-S06 successor layout B` (eligible CURRENT)
   - Propose B as Planner → activate as Event Director → confirm SUPERSEDED history and seating freeze/run still coherent
   - Do not fabricate layout geometry.

6. **Any still-incomplete role/export cells** only — Event Director lacking export-request is intentional.

7. Brief responsive/accessibility/pointer regression **on changed surfaces only** (rules conflict note; layout-binding propose recovery).

## Do not
- Broad Packet 8 / monolith / S076 shards
- Delete seating rule records
- Change export permissions
- Touch protected Untitled / s076 shard files
