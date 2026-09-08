# MD-PR-UX001 — Event OS cross-slice UX quality uplift

**Control ID:** `MD-PR-UX001`  
**Scope:** Accepted EOS-S01–EOS-S05 application surfaces  
**Starting HEAD:** `5298d878d15707c62fcdf6637fa4e20ea24c4dd0`  
**Implementation series:** `061399a` (platform), `53cd61b` (Event OS UX), `4ced1e6` (tests)  
**Accepted Event OS implementation SHA (unchanged acceptance):** `eba137712c65c6f59b77fe2a88a8f4a277228cd9`  
**Catalogue accepted-slice count:** 5 (unchanged)  
**EOS-S06:** not started; `MD-PR-S036` remains a recommendation only and was not consumed

This record is implementation evidence for a UX quality uplift. It is not independent acceptance of any slice.

## Architecture and design decisions

- Reused existing honest-denial (`AtelierOperationalState`) and `authorize()` patterns. Server enforcement is unchanged.
- Identity labels are resolved at read time from records the viewer is already authorised to see. Immutable IDs remain secondary evidence. Missing or out-of-scope records show “Identity unavailable”.
- Layout Submit / Approve / Publish disable from the current projection, with the unmet prerequisite shown nearby. Server checks remain authoritative.
- Ready / Live stay scaffolded. They are explained, not selectable.
- Spatial objects use type labels, line treatments and accessible names. Colour is not the sole distinguisher.
- Capacity phase cards are labelled by programme phase and must not be summed as whole-event people.
- Vendor references: fixture-visible `VR-00000000-…` was a generator using the shared UUID prefix. Existing stored fulfilments are not rewritten. New references use trailing hex.

## Finding dispositions

| ID | Finding | Disposition | Evidence |
|----|---------|-------------|---------|
| F-1 | Access Administration UUID-only presentation | implemented | Ledger now shows person, role, scope and status; assignment ID is secondary |
| F-2 | Audit UUID-only / raw ISO presentation | implemented | Who, action, target, outcome, reason, human time; correlation/resource IDs secondary |
| F-3 | Read-Only Auditor Create event false affordance | implemented | Link hidden; `/app/events/new` FORBIDDEN; API/service still deny `event.create` |
| F-4 | Long layout names dominate hierarchy | implemented | Heading clamp with full `title`; accessible value retained |
| F-5 | Layout Submit/Approve/Publish ignore known prerequisites | implemented | `layout-action-readiness` disables actions and shows reason |
| F-6 | Ready (not yet enabled) selectable | implemented | Removed from select; unavailable copy; server `CAPABILITY_NOT_ENABLED` retained |
| F-7 | Cursor pointer / not-allowed | already satisfied | Existing atelier rules retained and reinforced for disabled `.button` |
| F-8 | Guest directory wrapping, cards, clipped filters | implemented | Desktop nowrap; existing mobile cards; filter overflow visible |
| F-9 | Guest dossier section nav not sticky | implemented | Sticky tabs + scroll-margin so anchors stay reachable |
| F-10 | Event subpages lack return path | implemented | AppShell breadcrumb Events / Event overview when `eventId` is present |
| F-11 | Events list inert phase pill looks like the action | implemented | Explicit Open event target; phase pill is non-interactive |
| F-12 | Repeated historical records without disclosure | implemented | Current approvals/publications/editions first; history in disclosure |
| F-13 | Repeated Ceremony floor layouts lack differentiators | implemented | Version, status, venue, update time, publication state; names unchanged |
| F-14 | My Work “Organisation assignment · ACTIVE” | implemented | Role, scope, client, status, destination |
| F-15 | Apparently duplicated assignment links | implemented | Distinct assignment IDs preserved; same durable id shown once |
| F-16 | “Not a task or alert product” vs work-queue chrome | implemented | Copy now describes the assignment queue truthfully |
| F-17 | Needs attention not navigable | implemented | Home and directory attention link to `?attention=1` |
| F-18 | Layout Studio canvas cramped | implemented | Canvas min-height; collapsible library/inspector |
| F-19 | Spatial objects distinguished by colour alone | implemented | Type labels, dash treatments, accessible `<title>` |
| F-20 | Capacity cards are a near-identical wall | implemented | Grouped phase occupancy labelled by programme phase |
| F-21 | Foundation completeness / doctrine slots as lead copy | implemented | Plain-language readiness; canonical wording secondary |
| F-22 | Loading copy does not name the destination | implemented | Event overview, merchandise, My Work, ACA-S04C labels |
| F-23 | Empty decorative containers / timestamps | implemented | Empty states unchanged; dossier timestamps use `CanonicalTime` |
| F-24 | Merchandise `VR-00000000-000000` / archive scanning | implemented / retained | Generator defect on fixture UUID prefixes; stored history not rewritten; current/history disclosure on publications |

Positive patterns retained: Command Atelier language, boundary sentences, honest FORBIDDEN, maker/checker, spatial masking, no false success.

## Auditor Event-create investigation

Canonical catalog: Auditor lacks `event.create`. Planner also lacks it. CEO and Event Director have it. `PlatformService.createEvent` continues to require `event.create`. UI now hides the affordance and replaces the form with the established FORBIDDEN state. Automated proof covers navigation, direct page access and API/service invocation.

## First-run failures

| Gate | Classification | Root cause | Correction |
|------|----------------|------------|------------|
| `ux001-authority` Prepare-phase unit test | Test expectation error | PREPARE may still return to DESIGN; only READY is scaffolded | Assert selectable `DESIGN` and unavailable `READY` |
| `pnpm typecheck` RSVP form | Implementation defect | Mechanical `eventName` rewrite duplicated `eventId` on `PrepareRsvpForm` | Removed the duplicate attribute |
| `pnpm typecheck` identity helper | Implementation defect | `Role.key` is an unconstrained string | Resolve labels via `roleKeyForId` |
| `ux001-responsive` 200% zoom journey | Environment / harness | Next.js e2e server restarted under memory pressure during `page.goto` | Avoid a cold reload after the previous compiled journey |
| `ux001-responsive` 200% zoom follow-up | Test defect | At 640×360 the staff sidebar is not the visible navigation | Use the primary mobile nav |
| `ux001-responsive` assignment-queue copy | Test defect | `/assignment queue/i` matched both eyebrow and lede | Assert the unique lede |
| `s05-assurance-vertical` after ECONNRESET | Environment / harness | Next.js aborted and restarted; `layout-studio` never painted | Isolated rerun of `s05-assurance-vertical.spec.ts:25` passed after moving readiness helper to `src/lib/` so the client workspace is not treated as a server module |
| `guests` intake after foundation suite | Environment / harness | Form remained on `Creating record…` until the 5s heading assertion timed out | Isolated `guests.spec.ts:5` passed; guest create and amendment remain functional |

A passing rerun does not erase this record. Isolated S05 assurance and guest intake then passed. No product defect was found.

## Automated gates

| Gate | Result |
|------|--------|
| `pnpm --filter @maison-doclar/shared-platform test` | 330 pass |
| `pnpm --filter @maison-doclar/event-os test` | 80 pass |
| `pnpm typecheck` | pass |
| `pnpm programme:validate` | PASS |
| `pnpm --filter @maison-doclar/event-os build` | pass |
| `git diff --check` | clean |
| `e2e/ux001-authority.spec.ts` | 2 pass |
| `e2e/ux001-responsive.spec.ts` | 2 pass |
| isolated `s05-assurance-vertical.spec.ts:25` | pass after helper move |
| `e2e/foundation.spec.ts` | 4 pass |
| `e2e/guests.spec.ts` first run | 2 pass / 1 fail (intake timeout after foundation) |
| isolated `e2e/guests.spec.ts:5` | pass |

## Rollback and forward recovery

- Rollback Event OS to the last accepted live SHA `eba137712c65c6f59b77fe2a88a8f4a277228cd9` or the starting HEAD `5298d878d15707c62fcdf6637fa4e20ea24c4dd0` if the UX series must be withdrawn.
- Do not force-push. Recover forward with a revert commit on `main` if the deployed SHA is unsafe.
- Control Tower was not changed and must not be redeployed for this control ID.
- EOS-S05 acceptance SHA remains `eba137712c65c6f59b77fe2a88a8f4a277228cd9`.

## Remaining limitations

- Host Atelier still does not expose staff identity.
- Historic stored merchandise vendor references keep their original prefix formula.
- Exact hashes remain fully visible in layout forensic surfaces (`studio-hash`, export jobs).
- EOS-S06 / seating allocation is not started.
