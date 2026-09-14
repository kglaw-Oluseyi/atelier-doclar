# Claude focused verification prompt — EOS-S06 Seating Intelligence

**Audience:** Independent Claude verification (browser).  
**Cursor must not run this prompt and must not pre-fill findings.**  
**This is not acceptance.** Focused Claude verification is permitted only as independent evidence gathering. Formal EOS-S06 acceptance remains prohibited until complete GitHub CI succeeds and the AI CTO completes final review. Claude decides readiness for AI CTO acceptance review only.

## Controlling identities

| Item | Value |
|------|-------|
| Live Event OS | `https://event-os-production-bc8d.up.railway.app` |
| Expected deployed SHA | `5179ffd0189a9c88f458e5e4d3865cafa4d92627` |
| Persistence | POSTGRES / migrations APPLIED |
| `productionAuthorised` | `false` |
| Providers | INACTIVE |
| Packet 8 evidence (immutable) | `docs/control/evidence/eos-s06-s075-packet8/` |

Confirm `/api/health/live` and `/api/health/ready` before journeys. Do not mutate Railway configuration. Do not use real client/guest data.

Use only synthetic fixture identities and staff roles already present in the non-production fixture IdP.

## Required journeys (one coherent browser session where practical)

For each journey record: PASS/FAIL, exact role, event/run/edition identity, visible expected vs actual, screenshot references, a11y/usability notes.

1. Corrected feasible-run adoption  
2. Studio preview and valid apply  
3. Hard-violation rejection with no hidden mutation  
4. Two-tab stale-state/CAS conflict and recovery  
5. Exact-hash seating-plan submission  
6. Reviewer exact event/edition/hash/domain/rule binding  
7. Author, unrelated, stale and cross-event denials  
8. Event Director approval and publication boundary  
9. CEO publication and identical replay  
10. Successor draft preserving last-known-good  
11. JSON/PDF/PNG retrieval and omission rules  
12. Auditor masking, authorised export and privileged-route denial  
13. System Administrator business-action denial  
14. 360, 768 and 1440 layouts  
15. 200% zoom  
16. Reduced motion  
17. Keyboard navigation, focus, ARIA and overflow  
18. Five mutation/settlement repetitions  
19. Runs-tab identity and content consistency  
20. Hard-blocker headline and enumerated-count truth  
21. Clickable-item pointer cursor behaviour  
22. Spacing, findability and overall Command Atelier usability  

## Required closing report

- PASS/FAIL for every journey  
- Material blockers  
- Consolidated non-blocking technical debt  
- Exactly one decision:  
  - `READY FOR AI CTO ACCEPTANCE REVIEW`  
  - or `NOT READY FOR AI CTO ACCEPTANCE REVIEW`

## Explicit non-goals

- Do not accept EOS-S06  
- Do not create `EOS_S06_ACCEPTANCE.md`  
- Do not start EOS-S07  
- Do not activate providers or authorise production  
- Do not weaken permissions, concurrency, masking, audit or trusted boundaries  
