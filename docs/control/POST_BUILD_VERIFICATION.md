# Post-Build Verification Template

**Slice:** MD-CT0  
**Use:** After a future implementation slice. Not evidence that anything is built now.

## Header

| Field | Value |
|-------|-------|
| Slice ID | |
| Qualified prompt ID | `PRODUCT \| MD-PR-xxxx \| native` |
| Commit | |
| Reviewer | |
| Date | |

## Truth checks

- [ ] Manifest exists and still matches declared outcome
- [ ] Commit contains the slice ID
- [ ] Required checks ran (record exact commands)
- [ ] Browser/accessibility evidence if UI changed
- [ ] Negative permission / tenancy tests if security changed
- [ ] Offline/failure evidence if Event-Day
- [ ] No secrets in repo or screenshots
- [ ] Control records updated (`BUILD_LEDGER` / decision log / evidence index) — create those files in the implementing slice if still absent
- [ ] Status is **not** marked ACCEPTED by Cursor
- [ ] Next prompt **not** started

## Gate reminder

Independent, specialist, venue, Event Director and CEO gates stay unsigned unless the named human authority records them.

## Stale / unknown

If a required source is missing, mark unknown. Do not paint green.
