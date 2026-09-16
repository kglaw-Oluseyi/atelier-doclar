# Claude Independent Verification — EOS-S06 Gate 1 Live Bridge + CAP1000 Stretch

**Authority:** Resume after live CAP600/CAP1000 installation and Event OS deploy.  
**Preserve:** Your first Gate 1 attempt remains **BLOCKED**. Do not rewrite that history.  
**Do not:** remediate defects; start EOS-S06B or EOS-S07; use real data; request credentials.

Live Event OS: Railway project `atelier-doclar` / production / `event-os`.  
`productionAuthorised` must remain false. Providers/communications inactive.

---

## Part A — Formal Gate 1 CAP600 (ten journeys)

**Fixture (exact):**

| Field | Value |
|-------|-------|
| Name | `[SYNTHETIC QUALIFICATION] Capacity Qualification 600` |
| Code | `CAP600` |
| Immutable event ID | _(filled in post-deploy evidence — use live System Health / Events search)_ |
| Edition | `eos-s06-capacity-600-v1` |
| Evidence commit | `5561171261f3c193136a0b3be5dbd504a2ed8f70` |

**Findability:** Events → search `CAP600` or `capacity` or `600`. Must show synthetic qualification badge. Do not use the audit ledger as the primary discovery path. Do **not** use `EOS-S06-CUR-*`.

**Roles ready:** George Lawson (CEO), Amara Okonkwo (Event Director), James Whitfield (Planner), Priya Nair (Read-Only Auditor).

Complete **all ten** original Gate 1 journeys against this exact event ID. Confirm:

- 63 tables / 600 seats / 600 synthetic guests  
- CEO can open the event  
- Director can perform director-authorised actions; Planner cannot approve/publish  
- Auditor can inspect but cannot mutate  
- Feasible and conflict handling remain truthful  
- Persistence across reload  

**Part A verdict required:** `READY` / `NOT READY` / `BLOCKED` with evidence — for CAP600 Gate 1 only.

---

## Part B — CAP1000 stretch (independent)

**Fixture (exact):**

| Field | Value |
|-------|-------|
| Name | `[SYNTHETIC STRETCH QUALIFICATION] Capacity Stretch 1000` |
| Code | `CAP1000` |
| Immutable event ID | _(filled in post-deploy evidence)_ |
| Edition | `eos-s06-capacity-1000-v1` |

Examine (do not reproduce automated performance suites):

1. Discoverability (`CAP1000`, `1000`, `stretch`, `capacity`)  
2. Exact 110-table / 1,000-seat reconciliation  
3. 1,000 synthetic guests; representative search  
4. Rules/reservations usable at scale  
5. Feasible-result truthfulness  
6. Conflict/infeasibility truthfulness  
7. Persistence/replay clarity  
8. Roles and isolation  
9. Responsive/accessibility usability (360 / 768 / 1280)  
10. Premium-product clarity  

**Part B verdict required:** separate from Part A.

---

## Combined recommendation

State clearly whether CAP600 Gate 1 may proceed to AI CTO acceptance, and whether CAP1000 stretch is acceptable as stretch evidence — **without** allowing either result to conceal the other.

## System Health checks (both parts)

Confirm programme posture shows EOS-S06 ACCEPTED (MD-PR-S077), EOS-S06A ACCEPTED (MD-PR-S079), Gate 1 awaiting independent verification (not accepted), EOS-S06B/S07 NOT_STARTED, `productionAuthorised false`. Confirm Application SHA ≠ evidence commits; CAP600 evidence commit `5561171…` is visible.
