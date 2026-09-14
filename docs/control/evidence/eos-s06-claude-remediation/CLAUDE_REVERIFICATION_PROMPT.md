# Claude re-verification prompt — EOS-S06 DEF-01–DEF-05 remediation

**Status:** Prepared only. Cursor must not open Chrome, must not ask the CEO to authenticate, and must not run this prompt.

**Deployed Event OS:** confirm live SHA equals the remediation application commit before starting.  
**Live origin:** `https://event-os-production-bc8d.up.railway.app`  
**Event:** Alpha One seating Command.  
**EOS-S06:** remains unaccepted regardless of outcome.

## Scope

Re-verify only:

1. **DEF-01** — Every run shows shortened stable ID, full immutable ID affordance, started time (operational timezone), initiating actor or unavailable, Current/Not current, Stale/Fresh as separate concepts, outcome, seated/unseated. When current+stale, explanation must state upstream inputs changed.
2. **DEF-02** — Header, Overview, Review, Publication agree for: no publication; operational only; operational + unpublished WORKING; published successor; superseded history. Never show “No current layout is published” when an operational seating publication exists.
3. **DEF-03** — Studio Tables empty state when no layout tables: what/why/next action; read-only-safe for roles without prepare.
4. **DEF-04** — Event Director and Planner must not see Access / Event Command nav entries; direct routes still refuse.
5. **DEF-05** — Equivalent rule cannot become ACTIVE twice; repeat activation is idempotent / no data changed; authoritative ACTIVE identified; concurrent/double-click safe; materially different rules still allowed; audit truthful; do not delete historical Alpha One ACTIVE duplicates.

Also cover:

- Settlement repetitions **3** and **4**
- One full **successor-layout / adoption** cycle
- Responsive breakpoints **1440 / 768 / 390**
- Manual keyboard focus, 200% zoom, reduced motion
- Expanded pointer cursors on changed surfaces
- Incomplete role/export cells (note only; do not expand into full Packet 8)

## Out of scope

Packet 8 monolith, S076 shards, broad regression, Control Tower, EOS-S06 acceptance, EOS-S07.

## Return

Defect matrix with severity, exact surface, and whether each DEF is cleared, residual, or new. Do not accept EOS-S06.
