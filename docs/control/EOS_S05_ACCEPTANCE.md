# EOS-S05 Formal Technical Acceptance

**Slice ID:** `EOS-S05`  
**Product:** `EVENT_OS`  
**Prompt Control ID:** `MD-PR-S035`  
**Title:** Venue Registry and Spatial Layout  
**Mode:** Governance / acceptance record only  
**Date:** `2026-09-08`

This record is independent AI CTO technical acceptance of Event OS venue registry and spatial layout. It closes the EOS-S05 implementation, Milestone 1–4 delivery, and the MD-PR-S032–S034 remediation chain. It is not CEO production authorisation, specialist biometric approval, venue rehearsal approval, live guest-communication approval, provider approval, live-event approval, or a production release. It does not authorise real-client operations, real venue-contact data, payments, providers, biometrics, public access, or EOS-S06.

EOS-S05 is a programme-catalogue slice. Catalogue accepted-slice count moves from `4` to `5` (`EOS-S01`–`EOS-S05`). EOS-S04A–F remain accepted non-catalogue successors and do not change this count. Historic `S5-01`–`S5-60` / `MD-PR-0232`–`MD-PR-0291` remain `NOT_EXECUTED` individual prompt runs; their substance was delivered through `MD-PR-S028`–`MD-PR-S034`.

```text
EOS-S05 — Venue Registry and Spatial Layout
Status: ACCEPTED
Acceptance ID: MD-PR-S035
Implementation lineage: MD-PR-S028 / MD-PR-S029 / MD-PR-S030 / MD-PR-S031 / MD-PR-S032 / MD-PR-S033 / MD-PR-S034
Accepted implementation SHA: eba137712c65c6f59b77fe2a88a8f4a277228cd9
Acceptance date: 2026-09-08
```

This is a documentation-only acceptance action. Event OS is not redeployed. Control Tower is not redeployed. Railway variables and Postgres are not mutated. The accepted implementation SHA is already live.

## Identifiers

| Field | Value |
|-------|-------|
| Implementation lineage | `MD-PR-S028` ratification and Milestone 1; `MD-PR-S029` Milestone 2; `MD-PR-S030` Milestone 3; `MD-PR-S031` Milestone 4; `MD-PR-S032` export provenance; `MD-PR-S033` independent-verification remediation; `MD-PR-S034` final traceability and permission-affordance |
| Acceptance Prompt Control ID | `MD-PR-S035` |
| Status | `ACCEPTED` |
| Accepted implementation SHA | `eba137712c65c6f59b77fe2a88a8f4a277228cd9` |
| Acceptance date | `2026-09-08` |
| Reviewer | `ChatGPT / AI CTO` |
| Implementer | Cursor |
| Browser verifier | Claude; final focused verdict `READY` |
| Review result | `PASS` |
| Blocking technical defects | `ZERO` |
| Deployed persistence | `POSTGRES` |
| Migrations | `APPLIED` |
| `productionAuthorised` | `false` |
| Live Event OS | `https://event-os-production-bc8d.up.railway.app` |
| Railway project | `atelier-doclar` only |
| Live deployment at accepted SHA | `ac6b5f2d-8c9c-41dc-ab93-cd3e5c154151` |
| `layoutAssetStore` | `READY` |
| `layoutExport` | `READY` |
| Acceptance evidence ID | `EV-EOS-S05-ACCEPT` |
| Acceptance record | `docs/control/EOS_S05_ACCEPTANCE.md` |
| Visual language | Command Atelier. Decorative champagne `#B89A62` remains non-functional on ivory. Functional light-surface accent is `#8B6E38`. |

The later documentation-only acceptance commit does not replace the accepted implementation SHA.

## Review ruling

**EOS-S05 TECHNICAL IMPLEMENTATION REVIEW: PASS**  
**EOS-S05 IMPLEMENTATION COMPLETE: YES**  
**KNOWN EOS-S05 BLOCKING TECHNICAL DEFECTS: ZERO**  
**EOS-S05 STATUS: ACCEPTED**  
**CATALOGUE ACCEPTED-SLICE COUNT: 5**  
**EOS-S06 IMPLEMENTATION AUTHORISED: NO**  
**PRODUCTION AUTHORISED: NO**

Reviewer: `ChatGPT / AI CTO`  
Authority basis: Independent technical review PASS; Cursor implementation and live evidence at SHA `eba137712c65c6f59b77fe2a88a8f4a277228cd9`; Claude final focused verdict `READY` on the MD-PR-S034 defects. Claude verified. Claude did not accept. ChatGPT issued the acceptance decision.

## Acceptance coverage

Acceptance covers the complete EOS-S05 venue-registry and spatial-layout vertical at the accepted implementation SHA:

- organisation/client/event-scoped venue registry;
- governed venue facts and event adoption/overrides;
- canonical millimetre geometry and deterministic hashes;
- typed spatial objects and accessible authoring;
- editor lease, CAS and stale-write protection;
- private floor-plan storage and content-safety controls;
- governed calibration;
- distinct capacity products;
- deterministic validation and finding lifecycle;
- immutable snapshots, textual comparison and restore-as-new-version;
- durable governed override lineage;
- exact-hash maker/checker approval;
- immutable current/superseded/withdrawn publication;
- permission-safe published viewer and downstream projection;
- role-consistent spatial masking;
- private, truthful PDF and PNG exports;
- provenance rendered inside export files;
- responsive Command Atelier presentation;
- no guest placement, communications, payments, providers or biometrics;
- append-only correlated audit and truthful failures.

## Independent evidence

### Cursor

Cursor implemented and deployed Event OS only through `MD-PR-S028`–`MD-PR-S034`. Final implementation SHA `eba137712c65c6f59b77fe2a88a8f4a277228cd9` is live on deployment `ac6b5f2d-8c9c-41dc-ab93-cd3e5c154151`. Local gates at S034 included `pnpm typecheck`, shared-platform 329, Event OS unit 72, `pnpm programme:validate`, Event OS build, `git diff --check`, focused Playwright `s05-s034-traceability` 2/2 locally and 2/2 live. Passed S033 behaviour was not reopened.

### Claude

Claude performed independent verification of the changed risks, including the final focused S034 review. Final focused Claude verdict: `READY`. Whole-slice Claude-in-Chrome was not required as a second acceptance gate after the focused remediations. Claude did not accept the slice.

## First-run product failures retained

Material first-run product failures are retained. Each blocking failure was remediated and independently or appropriately verified.

| Failure | Class | Remediation | Verification |
|---------|-------|-------------|--------------|
| Pixel-persistence guard ran after Zod `.strict()` | product | `assertNoPixelPersistence` before `parseStrict` on layout create/update | Milestone 1 focused venue journeys 8/8 |
| Missing capability fallback after `canOverrideConstraint` | product | Venue-registry fallback includes `canOverrideConstraint: false` | Milestone 2 typecheck and spatial journeys |
| Inaccessible keyboard canvas region | product / a11y | Canvas frame `tabIndex={0}` with an accessible name | Milestone 2 Playwright axe |
| Catalogue-role/active-assignment approval defect | product | `isSystemAdministrator` inspects active assignments only | Milestone 3 assurance journeys 11/11 |
| Validation finding persistence-size defect | product | Cap evidence, explanation, recommended action and object-id lists | Milestone 4 focused unit 8/8 |
| 360px hash overflow | product | Wrap hashes/`code`/`dd`; hide shell overflow-x at ≤720px | Live 360/200% rerun after `e646a864` |
| Missing visible export provenance | product | Labelled PDF/PNG provenance lines; complete hash, publication number and timestamp | MD-PR-S032 unit and Playwright |
| Async S3 store passed into synchronous snapshot mutation | product | Binary store is passed into `PlatformService` only for the opt-in fixture store | MD-PR-S032 live export |
| Override lost on same-hash revalidation | product | Durable applicability key; original row immutable; later run recognises ACTIVE overrides | MD-PR-S033 unit and Playwright |
| Restricted spatial leakage across Auditor surfaces | product | One central disclosure policy for studio, viewer, export, comparison and JSON | MD-PR-S033 unit |
| Incorrect masking classification | product | Restricted geometry is explicit; unlocked SAFE/CLEARANCE remain operational | MD-PR-S033 unit |
| Post-publication exports marked DRAFT | product | Marking from publication context; privileged artifacts not reused for masked actors | MD-PR-S033 unit and Playwright |
| Missing snapshot-comparison UI | product | Discoverable GET comparison of existing `diffLayoutObjects` | MD-PR-S033 Playwright |
| Long-name document overflow | product | `overflow-wrap: anywhere` on cards, headings, hashes and correlation identifiers | MD-PR-S033 Playwright |
| Hidden override-decision substance | product | Read-only projection of the immutable override row | MD-PR-S034 unit, local and live Playwright |
| Misleading privileged export links | product | Download enabled only when `getStoredLayoutExport` would allow retrieval | MD-PR-S034 unit, local and live Playwright; Auditor direct GET remains 403 |

## Current Railway deployment and health

| Check | Result |
|-------|--------|
| Deployment | `ac6b5f2d-8c9c-41dc-ab93-cd3e5c154151` `SUCCESS` |
| Deployed SHA exactly `eba137712c65c6f59b77fe2a88a8f4a277228cd9` | `PASS` |
| Persistence `POSTGRES` | `PASS` |
| Migrations `APPLIED` | `PASS` |
| `productionAuthorised: false` | `PASS` |
| `layoutAssetStore: READY` | `PASS` |
| `layoutExport: READY` | `PASS` |
| Event OS redeployed for this acceptance | `NO` |
| Control Tower redeployed for this acceptance | `NO` |

## Retained production safeguards

- `productionAuthorised` remains `false`.
- Fixture identity remains `NON_PRODUCTION_FIXTURE`. Permanent production identity provider remains unselected.
- Synthetic data controls remain active.
- No real client, venue-contact, host, guest, vendor or staff operational data.
- No guest seating allocation, seating solver or EOS-S06 implementation.
- No communications, payments, providers or biometrics.
- Private object storage; authenticated Event OS delivery; `Cache-Control: private, no-store`.
- In-process floor-plan content-safety is not represented as general antivirus.
- Compile-time `LAYOUT_ASSET_PROVIDER_CONFIGURED` remains `false`; runtime Event OS env binding is authoritative.
- Protected programme gates remain unsigned.

## Remaining non-blocking items

| Item | Disposition |
|------|-------------|
| `TDR-S05-002` | Venue-fact evidence attachments remain metadata-only. OPEN / NON_BLOCKING. |
| In-process content-safety | Not a general antivirus product. |
| Compile-time asset flag | Remains false while runtime binding is authoritative. |
| Carried EOS-S04 technical debt | `TDR-S04F-001`–`002`, `TDR-S04E-001`–`004`, `TDR-S04D-004`, `TDR-S04A-011` and earlier carried items remain unchanged and do not reopen EOS-S01–S04 or S04A–F. |
| Permanent production identity provider | Unselected. |
| Synthetic data controls | Remain active. |

### Acceptance observation — override rationale labels

The override decision UI presents the complete rationale within the Evidence display rather than separate Reason and Evidence labels. No rationale is lost and the durable record remains reviewable. This is a non-blocking presentation observation. No new technical-debt ID is created.

## Historical decisions preserved

These remain dated history and are not rewritten:

| Date | Record | Historical status |
|------|--------|-------------------|
| 2026-09-08 | `docs/control/EOS_S05_RATIFICATION.md` | `RATIFIED / IMPLEMENTATION AUTHORISED / IN_PROGRESS`; independent acceptance not granted by that overlay |
| 2026-09-08 | `docs/control/EOS_S05_IMPLEMENTATION.md` | Implementation and remediation evidence; not itself the acceptance decision |
| Historic `MDOS/slice5` filenames | `RATIFICATION DRAFT` retained | Historical evidence |
| Historic `S5-01`–`S5-60` / `MD-PR-0232`–`MD-PR-0291` | `NOT_EXECUTED` | Substance delivered through S028–S034 |

## What this is not

- CEO production authorisation (`productionAuthorised` remains `false`)
- Real-client, real-venue or live operational authorisation
- EOS-S06 implementation authority
- Signing of any protected production gate
- Execution of historic `S5-01`–`S5-60` as individual prompt runs
- Mutation of Event OS or Control Tower application code
- Redeployment of Event OS or Control Tower
- Mutation of Railway variables or Postgres
- A change to the accepted status of EOS-S01–S04 or EOS-S04A–F

## Successor authority — EOS-S06

**Outcome: implementation is not authorised.**

EOS-S06 remains `NOT_STARTED / NOT_AUTHORISED`. Acceptance of EOS-S05 satisfies the catalogue sequencing condition that EOS-S06 follows accepted EOS-S05. It does **not** release EOS-S06.

Recommended next Prompt Control ID: `MD-PR-S036`. This recommendation is not implementation authority.
