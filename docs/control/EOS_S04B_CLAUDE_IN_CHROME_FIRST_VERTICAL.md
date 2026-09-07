# EOS-S04B Claude-in-Chrome — first complete vertical

**Authority:** MD-PR-S018. Claude verifies. Claude does not accept the slice.  
**Railway project:** `atelier-doclar` only. Service: `event-os` only.  
**Production:** `productionAuthorised` remains `false`.  
**Visual language:** Command Atelier (onyx frame, warm ivory working surface, champagne thread).

Confirm the live SHA before scoring:

1. Open `https://event-os-production-bc8d.up.railway.app/api/health/ready`.
2. Record `deployedSha`, `persistence`, `migrationStatus`, `ready`, `productionAuthorised`.
3. Compare `deployedSha` to `origin/main` of `kglaw-Oluseyi/atelier-doclar` after the MD-PR-S018 first-vertical push.
4. If they differ, verdict is `BLOCKED`.

Implementation chain (preceding this closeout):

| Boundary | SHA |
|----------|-----|
| Starting baseline | `40d65fa97fc9f2f0424757b7abd27872c0644f21` |
| Ratification | `bbf75b6c99c664940f5c35a2456b05e956b197f6` |
| Platform | `3eac4d191405df4b35c85a4f9c95695f376fb977` |
| Frontend | `f1142af08069dca8c860ffb9a6098cb5555981f7` |
| Tests | `c6bde2d5b75e1e40ec50036d000fd5f0999060fc` |

## Identities (synthetic only)

Staff access token: Railway variable `EVENT_OS_ACCESS_TOKEN` on service `event-os`. Do not paste the secret into evidence.

| Role | Email |
|------|-------|
| CEO | `ceo@maison-doclar.test` |
| Event Director | `director@maison-doclar.test` |
| Planner | `planner@maison-doclar.test` |
| Auditor | `auditor@maison-doclar.test` |

| Record | ID |
|--------|----|
| Alpha One | `00000000-0000-4000-8000-000000000021` |
| Alpha Two | `00000000-0000-4000-8000-000000000022` |
| Ẹbùnọláúwa Alákíjà | `00000000-0000-4000-8000-000000000072` |
| Presentation reference | `MD-EBUN01A` |

URLs:

- Sign-in: `https://event-os-production-bc8d.up.railway.app/sign-in`
- Programme: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/programme`
- Guest dossier: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000021/guests/00000000-0000-4000-8000-000000000072`
- Alpha Two: `https://event-os-production-bc8d.up.railway.app/app/events/00000000-0000-4000-8000-000000000022/programme`
- Live: `https://event-os-production-bc8d.up.railway.app/api/health/live`

## Evidence format

Save screenshots as `s04b-v-<nn>-<slug>.png`. For each step record: URL, role, exact visible strings, console errors (none expected), and whether the durable record changed.

## Primary journey — CEO

1. Unauthenticated open of the Alpha One programme URL must land on `/sign-in`.
2. Sign in as CEO. Home heading `Home` must appear.
3. Open Alpha One. Click `Programme and arrival`.
4. Expect heading `Programme, routing and perimeter`.
5. Expect `Whole-event attendance is the distinct-person union, never the sum of phase counts.`
6. Expect chronological beads `Church` and `Reception`. Distinct people must be a number, and must not equal a naive sum if both church and reception guests exist.
7. Expect perimeter heading `Perimeter` and SVG `Ordered perimeter checkpoints`.
8. Resolve credential: presentation `MD-EBUN01A`, default/first checkpoint. Click `Resolve credential`.
9. Expect status `Checkpoint outcome AUTHORISED` and `Attendance was not written.`
10. Open Ẹbùnọláúwa dossier. Expect `Phase eligibility and arrival` with Church and a reception/discreet routing note. Household must not be treated as a person.
11. Open Alpha Two programme. Expect `Single ceremony` / `Arrival and ceremony` default simplicity. Do not invent extra hierarchy.

## Role negatives

12. Planner: protected-access checkbox absent; copy `Planner authority cannot grant protected access.` Button `Publish signed package` count 0. Copy `Publishing an access plan requires Event Director or CEO authority.`
13. Auditor: button `Add ceremony` count 0. Copy `Your assignment can view phases but cannot add ceremonies.` Consume may be visible (TDR-S04B-003); publish must not.
14. Sign out. Unauthenticated programme URL returns to sign-in.

## Forged / cross-event

15. As CEO, resolve a forged presentation such as `FORGED-OTHER-EVENT`. Outcome must not be success. Expect `INSUFFICIENT` or `WRONG_EVENT`. Never `AUTHORISED`.
16. Direct URL to another organisation’s event must fail closed (`NOT_FOUND` / sign-in / forbidden). No Alpha One data.

## Two-tab concurrency

17. Tab A and Tab B open Alpha One programme as Director/CEO.
18. In Tab A assign a guest already entitled to Church, or submit a stale phase version if the UI exposes it. Expect validation or conflict, not a second church entitlement.
19. Reload Tab B. Church guest count must not have doubled. One guest remains one person.

## Persistence

20. After a successful `Add checkpoint` or `Register vehicle`, reload. The new row remains.
21. Sign out, sign in as CEO, reopen programme. Durable rows remain. Attendance was still not written.

## Responsive, keyboard, motion, contrast

22. 360px width: primary actions reachable; no document-level horizontal overflow.
23. Tablet ~768px: perimeter and handoff remain legible.
24. Desktop 1440px plus 200% zoom: Command Atelier hierarchy remains; beads/perimeter do not become a spreadsheet.
25. Keyboard: Tab to `Add ceremony`, `Resolve credential`, section tabs. Visible focus. Enabled controls `pointer`; disabled `not-allowed`.
26. Reduced motion: no disorienting motion. Screen-reader: page has one `h1`; perimeter SVG has an accessible name; live/status regions announce resolve outcome.
27. Contrast: ivory surface on onyx frame, champagne thread; status text remains readable.

## Console / runtime

28. No application console errors, stack traces, raw records, credentials or infrastructure secrets.

## Verdict

Use exactly one of:

- `READY` — SHA matches, primary journey and negatives hold, no BLOCKER/MAJOR.
- `NOT READY` — SHA matches but product defects remain.
- `BLOCKED` — SHA mismatch, health not ready, Postgres not durable, or a security/privacy/identity defect.

Do not accept EOS-S04B. Do not start EOS-S04C–F or EOS-S05.
