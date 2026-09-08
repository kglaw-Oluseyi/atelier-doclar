# EOS-S05 Build Ledger

**Slice ID:** `EOS-S05`  
**Prompt Control ID:** `MD-PR-S028` / `MD-PR-S029` / `MD-PR-S030` / `MD-PR-S031` / `MD-PR-S032` / `MD-PR-S033`
**Starting baseline:** `bb705588e0d4481802658a18d7666e28e3a18fea`
**Milestone 2 starting SHA:** `a7dc4d931f3c01f05354b11e68bc7c4a155e5afb`
**Milestone 3 starting SHA:** `72830730398f6aa1b02183417ca4ac4d32801b10`
**Authority commit:** `cee64f6f69bfc6dace53ffc60d8232e6938653de`
**Platform commit:** `bd65c02e790082ea2d46e1323a848c42446e512a`
**Event OS commit:** `e4ec11712c7f4fb3db0b3f4e6afc4b6ebc02c8b8`
**Milestone 2 platform commit:** `446113bad699849fd9f92d7d37d09d94ac762b8c`
**Milestone 2 Event OS commit:** `82c758978d08e59018f539e399efda2c24733bfb`
**Milestone 3 platform commit:** `d9d5882f856410d5630106443f9936da3ff6dea5`
**Milestone 3 Event OS commit:** `0bec2ef166354d4ad5b55aad9f932f74cb80f2f4`
**Milestone 4 starting SHA:** `41b40d6f4001b1c6913209cbe420b9080f64965d`
**Milestone 4 platform commit:** `ff7b052b258d0859a30c62a7364a0087d214b445`
**Milestone 4 Event OS commit:** `d087843d6c32ab47e94b348f30533c43edf0e270`
**Milestone 4 overflow-fix commit:** `e646a864b00606f7a0e6f7b66d5d62feba826b8f`
**S033 starting SHA:** `c161398e817121057064faf1eafa1294e33e9108`
**S033 platform commit:** `48a8264f65f203c803c6612fd05651505ab36e15`
**S033 Event OS commit:** `933ab993c5bbc8abda1ac2dd9e4debeae9622000`
**Status:** `IN_PROGRESS` — Milestones 1–4 implemented; not accepted
**Production:** unauthorised  
**Next slices:** EOS-S06 not authorised

## Milestone 1 — Authority, venue foundation and spatial contract

Historic traceability: `S5-01`–`S5-13` / `MD-PR-0232`–`MD-PR-0244`. Status of those historic units remains `NOT_EXECUTED`. Their substantive requirements are implemented through this milestone.

| Area | Reuse | Extension | New | Exclusion |
|------|-------|-----------|-----|-----------|
| Organisation / client / event | Core Event OS hierarchy | Venue visibility and adoption checks | — | No Tenant or parallel identity ledger |
| Person / assignment / permission | Existing roles and capability keys | `venue.*` and `layout.*` keys | No new system role | Historic Venue Liaison labels remain descriptions |
| RSVP / forecast / provision | Read adapter only | Typed attendance projection | — | No capacity calculation; no source mutation |
| Persistence | Snapshot + receipts | — | S05 collections + `EOS-S05-VENUE-LAYOUT-V1` | No destructive down-migration |
| Frontend | Command Atelier | Org venues + event venue/layout | Structured setup, not canvas | No Konva truth; no guest placement |
| Assets | None approved | Metadata-only evidence contract | Designed unavailable upload | No fake scanning or signed URLs |

**STOP condition:** none at reconnaissance. Milestone 1 remains closed for reopening without regression evidence.

## Milestone 2 — Typed spatial objects and complete authoring vertical

Historic traceability: `S5-14`–`S5-27` and `S5-31`–`S5-38` / `MD-PR-0245`–`MD-PR-0269` except S5-28–S5-30. Those historic units remain `NOT_EXECUTED`. S5-28–S5-30 binary asset processing stays in Milestone 3 because `TDR-S05-001` is unresolved.

| Area | Decision |
|------|----------|
| Canvas | Typed SVG projection of persisted objects. Konva was not added so the canvas cannot become a parallel JSON blob. |
| Commands | One `applyLayoutCommand` path for canvas, inspector and keyboard. |
| Objects | Zone, table, seat, fixture, route, safe/restricted/clearance areas, annotation, group. |
| Assets | Binary floor-plan upload remains unavailable. |

## Milestone 3 — Assets, assurance, versioning and immutable publication

Historic traceability: `S5-28`–`S5-30` and `S5-39`–`S5-55`. Those historic units remain `NOT_EXECUTED`. Their substance is implemented through this milestone.

| Area | Decision |
|------|----------|
| Assets | Provider-neutral contracts. Live upload disabled. `CONFIGURATION_REQUIRED`. No simulated scan, signed URL or production upload success. |
| Capacity | Distinct products. Geometric from table declared/design capacity. Operational has owner/source/rationale. Attendance adapter remains read-only. |
| Validation | Engine `EOS-S05-VALIDATION` `1.0.0` bound to exact revision/hash. Material edits stale findings. No certification claim. |
| Snapshots | Immutable named SHA-256 payload. Restore creates a new revision. |
| Approval | Maker/checker on exact hash. Self-approval denied. Sysadmin has no operational approval. |
| Publication | Idempotent CURRENT/SUPERSEDED/WITHDRAWN. No comms, credentials, guests, Event-Day or protected gates. |
| Downstream | Authenticated `eos-s05-spatial-publication-v1`. No guest identity. EOS-S06 not implemented. |
| Migration | Additive `EOS-S05-VENUE-ASSURANCE-V1`. |

## Milestone 4 — Production completion, hardening and slice qualification

Historic units remain `NOT_EXECUTED`. No new collections. No EOS-S06 seating.

| Area | Decision |
|------|----------|
| Storage | Railway S3-compatible bucket wholly inside `atelier-doclar`. Private by default. No public URL. |
| Scan | In-process content-safety: magic/MIME/extension agreement, SVG/PDF active-content rejection, PNG/JPEG clipping. Not a general AV product. |
| Delivery | Authenticated Event OS GET streams. `Cache-Control: private, no-store`. No stored signed URLs. |
| Export | Deterministic PDF/PNG from current publication hash when present, else approved or draft marking. COMPLETED only after durable put. Idempotency includes marking, publication number and projection mask. |
| Health | `layoutAssetStore` READY/UNCONFIGURED/ERROR does not fail overall Postgres readiness. |
| Process topology | One Event OS replica; export fulfill is in-request. Multi-replica would require a shared worker; not deferred as ordinary debt because the deployed topology is single-replica. |

## MD-PR-S033 — Independent-verification remediation

| Area | Decision |
|------|----------|
| Overrides | Durable applicability key. Original record immutable. Same-hash revalidation recognises ACTIVE overrides. Expiry/revocation explicit. |
| Disclosure | Central policy; not every SAFE_AREA or CLEARANCE_AREA is sensitive. Restricted actors cannot reconstruct geometry from partial surfaces. |
| Export | Authority context at request time. Privileged artifacts are not reused for masked actors. |
| Comparison | Existing `diffLayoutObjects` via discoverable GET form. Auditor read-only. |
| Migration | Additive `EOS-S05-OVERRIDE-LINEAGE-V1`. |

## Verification

Workspace `pnpm typecheck`, `pnpm --filter @maison-doclar/shared-platform test` (324), `pnpm --filter @maison-doclar/event-os test` (72), `pnpm programme:validate`, `pnpm --filter @maison-doclar/event-os build`, Event OS Playwright `s05-s033-remediation` (4), and `git diff --check` are recorded in `EOS_S05_IMPLEMENTATION.md`.

Deployment of Event OS to Railway project `atelier-doclar` is implementation evidence only. It is not EOS-S05 acceptance and not production authorisation.
