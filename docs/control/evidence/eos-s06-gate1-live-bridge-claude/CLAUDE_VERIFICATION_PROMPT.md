# Claude Independent Verification — EOS-S06 Gate 1 CAP600 (Stage 1 release)

**Authority:** Resume independent Gate 1 verification against the live CAP600 fixture only.  
**Preserve:** Your earlier Gate 1 **BLOCKED** verdict remains valid evidence. Do not rewrite that history.  
**Ignore:** The mistaken live `EOS-S06-CUR-*` seating fixture is not the Gate 1 qualification corpus.  
**Do not:** remediate defects; inspect or verify CAP1000; reproduce automated suites; start EOS-S06B or EOS-S07; use real data; request credentials.

Live Event OS: Railway project `atelier-doclar` / production / `event-os`.  
Live application SHA: `0a0be803f123e8326fb893db1e3562c724b70dd0`  
`productionAuthorised` must remain false. Providers/communications inactive. Control Tower untouched.

---

## CAP600 fixture (exact — confirm before testing)

| Field | Value |
|-------|-------|
| Name | `[SYNTHETIC QUALIFICATION] Capacity Qualification 600` |
| Code | `CAP600` |
| Immutable event ID | `053fa686-124e-49b3-b8a8-d0497c0a1668` |
| Guests | 600 synthetic |
| Tables | 63 |
| Seats | 600 |
| Target mix | **42×10 · 18×8 · 3×12** |
| Edition | `eos-s06-capacity-600-v1` |
| Evidence commit | `5561171261f3c193136a0b3be5dbd504a2ed8f70` |

**Findability:** Events → search `CAP600` or `capacity` or `600`. Must show synthetic qualification badge. Do not use the audit ledger as the primary discovery path. Do **not** use `EOS-S06-CUR-*`. Do **not** use CAP1000.

**Roles ready:** George Lawson (CEO), Amara Okonkwo (Event Director), James Whitfield (Planner), Priya Nair (Read-Only Auditor).

---

## CAP1000 — out of scope

CAP1000 event `3d212906-529e-4bd8-b13f-b0c2a24e5fba` is:

**`INCOMPLETE — INSTALLATION PAUSED — NOT FOR VERIFICATION`**

Do not inspect, open for qualification, or include it in your verdict.

---

## Required work

1. Confirm fixture identity (exact event ID, 600/63/600, synthetic label) before testing.  
2. Resume at **Journey 1**.  
3. Complete **all ten** original Gate 1 journeys against this exact CAP600 event ID.  
4. Confirm Director can perform director-authorised actions; Planner cannot approve/publish; Auditor can inspect but cannot mutate.  
5. Confirm feasible and conflict handling remain truthful; persistence across reload.  
6. Confirm System Health programme posture shows EOS-S06 ACCEPTED (MD-PR-S077), EOS-S06A ACCEPTED (MD-PR-S079), Gate 1 awaiting independent verification (not accepted), EOS-S06B/S07 NOT_STARTED, `productionAuthorised false`.

**Do not remediate.** Return one of: `PASS`, `PASS WITH CONTROLLED OBSERVATIONS`, `FAIL`, or `BLOCKED`.
